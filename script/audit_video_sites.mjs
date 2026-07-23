import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.BROWSER_MONITOR_CHROME_BINARY;
const outputPath = resolve(process.env.BROWSER_MONITOR_AUDIT_OUTPUT || join(root, "output/browser-audit/exact-video-sites.json"));
assert.ok(chromeBinary && existsSync(chromeBinary), "Set BROWSER_MONITOR_CHROME_BINARY to Chrome for Testing.");

const allSites = [
  { key: "youtube", name: "YouTube", url: "https://www.youtube.com/watch?v=SElZABp5M3U", waitMS: 14_000 },
  { key: "rutube", name: "Rutube", url: "https://rutube.ru/video/8c316f529b44d17d4c8a03c9b23cc7c5/", waitMS: 14_000 },
  { key: "lordfilm", name: "Lordfilm — Silo", url: "https://lordfilm-baza.info/2914-silo.html", waitMS: 16_000 },
  { key: "lordfilm-bigbang", name: "Lordfilm — The Big Bang Theory", url: "https://bigbangtheory-lordfilm.ru/", waitMS: 18_000 }
];
const requestedSite = process.env.BROWSER_MONITOR_AUDIT_SITE || "";
const sites = requestedSite ? allSites.filter((site) => site.key === requestedSite) : allSites;

const profile = mkdtempSync(join(tmpdir(), "browser-monitor-exact-ad-audit-"));
const devToolsPortPath = join(profile, "DevToolsActivePort");
let chrome;
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function poll(description, check, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch { /* Targets are eventually consistent while Chrome starts. */ }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([new Promise((resolvePromise) => process.once("exit", resolvePromise)), wait(2_000)]);
  if (process.exitCode === null && process.signalCode === null) process.kill("SIGKILL");
}

async function openSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  return socket;
}

function createSession(target, site, index) {
  const socketPromise = openSocket(target.webSocketDebuggerUrl);
  const requests = new Map();
  const blocked = [];
  const responses = [];
  const consoleMessages = [];
  const contexts = new Map();
  const startedAt = Date.now();
  let messageID = index * 10_000;
  const pending = new Map();
  let socket;

  const ready = socketPromise.then((value) => {
    socket = value;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      if (message.method === "Network.requestWillBeSent") {
        const p = message.params;
        requests.set(p.requestId, {
          url: p.request.url,
          method: p.request.method,
          type: p.type,
          frameId: p.frameId,
          documentURL: p.documentURL,
          initiatorType: p.initiator?.type,
          atMS: Date.now() - startedAt
        });
      }
      if (message.method === "Network.responseReceived") {
        const p = message.params;
        if (["Media", "XHR", "Fetch", "Script", "Document"].includes(p.type)) {
          responses.push({ url: p.response.url, status: p.response.status, mimeType: p.response.mimeType, type: p.type, atMS: Date.now() - startedAt });
        }
      }
      if (message.method === "Network.loadingFailed" && message.params.errorText === "net::ERR_BLOCKED_BY_CLIENT") {
        const request = requests.get(message.params.requestId) || {};
        blocked.push({
          ...request,
          type: message.params.type || request.type || "Other",
          errorText: message.params.errorText,
          blockedReason: message.params.blockedReason || null,
          failedAtMS: Date.now() - startedAt
        });
      }
      if (message.method === "Runtime.consoleAPICalled") {
        consoleMessages.push({ type: message.params.type, values: message.params.args.map((arg) => arg.value ?? arg.description).slice(0, 4), atMS: Date.now() - startedAt });
      }
      if (message.method === "Runtime.executionContextCreated") {
        contexts.set(message.params.context.id, message.params.context);
      }
      if (message.method === "Runtime.executionContextDestroyed") contexts.delete(message.params.executionContextId);
    });
    return value;
  });

  async function command(method, params = {}, timeout = 45_000) {
    await ready;
    return new Promise((resolvePromise, reject) => {
      const id = ++messageID;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${site.name}: ${method} timed out`));
      }, timeout);
      pending.set(id, { resolve: resolvePromise, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ready, command, blocked, responses, consoleMessages, contexts, close: () => socket?.close() };
}

async function evaluate(session, expression) {
  const result = await session.command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  return result.result.value;
}

async function evaluateContext(session, contextId, expression) {
  const result = await session.command("Runtime.evaluate", { expression, contextId, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  return result.result.value;
}

async function probeChildContexts(session) {
  const results = [];
  for (const context of session.contexts.values()) {
    if (!context.auxData?.isDefault || !/^https?:/.test(context.origin || "")) continue;
    try {
      results.push({
        contextId: context.id,
        origin: context.origin,
        frameId: context.auxData?.frameId,
        state: await evaluateContext(session, context.id, pageProbe)
      });
    } catch { /* A frame can disappear while it is being inspected. */ }
  }
  return results;
}

async function extensionEvaluate(devToolsPort, extensionID, expression) {
  const response = await fetch(`http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionID}/statistics.html`)}`, { method: "PUT" });
  assert.ok(response.ok, "Could not open extension diagnostics page");
  const target = await response.json();
  const session = createSession(target, { name: "Extension diagnostics" }, 90);
  await session.command("Runtime.enable");
  const value = await poll("extension diagnostics runtime", async () => {
    try { return await evaluate(session, expression); } catch { return null; }
  }, 15_000);
  session.close();
  await fetch(`http://127.0.0.1:${devToolsPort}/json/close/${target.id}`);
  return value;
}

const pageProbe = `(() => {
  const roots = [document];
  for (let i = 0; i < roots.length && roots.length < 40; i += 1) {
    for (const el of roots[i].querySelectorAll('*')) {
      if (el.shadowRoot && !roots.includes(el.shadowRoot)) roots.push(el.shadowRoot);
      if (roots.length >= 40) break;
    }
  }
  const visible = (el) => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 2 && r.height > 2;
  };
  const describe = (el) => ({
    tag: el.tagName, id: el.id || '', className: typeof el.className === 'string' ? el.className.slice(0, 180) : '',
    text: (el.innerText || el.getAttribute?.('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 180),
    rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; })()
  });
  const videos = roots.flatMap((root, rootIndex) => [...root.querySelectorAll('video')].map((v) => ({
    rootIndex, currentTime: Math.round(v.currentTime * 100) / 100,
    duration: Number.isFinite(v.duration) ? Math.round(v.duration * 100) / 100 : null,
    paused: v.paused, muted: v.muted, readyState: v.readyState, networkState: v.networkState,
    width: v.videoWidth, height: v.videoHeight, src: (v.currentSrc || v.src || '').slice(0, 500)
  })));
  const selector = [
    '#player-ads','#masthead-ad','.video-ads','.ytp-ad-overlay-container','ytd-ad-slot-renderer','ytd-display-ad-renderer',
    '.ima-ad-container','.videoAdUi','[id^="adfox_"]','[class*="adfox-module" i]','[class*="vast-ad" i]',
    '[class*="vpaid-ad" i]','[data-ad-state="playing"]','[data-ad-slot]','[data-ad-client]',
    'iframe[src*="ad" i]','[class*="advert" i]','[id*="advert" i]','[class~="banner"]'
  ].join(',');
  const candidates = roots.flatMap((root, rootIndex) => [...root.querySelectorAll(selector)].slice(0, 80).map((el) => ({
    rootIndex, visible: visible(el), hiddenByBrowserMonitor: el.classList.contains('browser-monitor-hidden-video-ad'), ...describe(el)
  })));
  return {
    href: location.href, title: document.title, readyState: document.readyState, visibilityState: document.visibilityState,
    h1: document.querySelector('h1')?.innerText?.trim().slice(0, 300) || '',
    videos, candidates,
    youtubeAdShowing: Boolean(document.querySelector('.html5-video-player.ad-showing')),
    youtubeSkipButtonVisible: [...document.querySelectorAll('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button')].some(visible),
    protectionMounted: Boolean(document.querySelector('#browser-monitor-protection-style')),
    frames: [...document.querySelectorAll('iframe')].slice(0, 40).map((frame) => ({ src: frame.src, title: frame.title, name: frame.name, visible: visible(frame), ...describe(frame) })),
    linksWithAdWords: [...document.querySelectorAll('a')].filter((a) => /реклам|advert|casino|казино|ставк|bet/i.test((a.innerText || '') + ' ' + (a.href || ''))).slice(0, 20).map(describe)
  };
})()`;

async function capture(session, path) {
  await session.command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const result = await session.command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(result.data, "base64"));
}

async function auditSite(devToolsPort, site, index) {
  const response = await fetch(`http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  assert.ok(response.ok, `Could not open ${site.name}`);
  const target = await response.json();
  const session = createSession(target, site, index);
  await session.command("Network.enable");
  await session.command("Page.enable");
  await session.command("Runtime.enable");
  await session.command("Page.navigate", { url: site.url });
  await wait(site.waitMS);

  await evaluate(session, `(() => {
    const buttons = [...document.querySelectorAll('button,tp-yt-paper-button')];
    const consent = buttons.find((button) => /reject all|accept all|отклонить|принять все/i.test(button.innerText || button.getAttribute('aria-label') || ''));
    if (consent) { consent.click(); return true; }
    return false;
  })()`).catch(() => false);
  await wait(2_000);

  const before = await evaluate(session, pageProbe);
  const childContextsBefore = await probeChildContexts(session);
  const timeline = [];
  for (let sample = 0; sample < 6; sample += 1) {
    const state = await evaluate(session, `(() => {
      const v = document.querySelector('video.html5-main-video,#movie_player video,video');
      if (v && v.paused) { v.muted = true; v.play().catch(() => {}); }
      return { at: ${sample * 1500}, currentTime: v ? Math.round(v.currentTime * 100) / 100 : null,
        duration: v && Number.isFinite(v.duration) ? Math.round(v.duration * 100) / 100 : null,
        paused: v?.paused ?? null, adShowing: Boolean(document.querySelector('.html5-video-player.ad-showing')),
        skipVisible: [...document.querySelectorAll('.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button')].some((el) => el.getClientRects().length > 0) };
    })()`);
    timeline.push(state);
    await wait(1_500);
  }

  let sponsorSkipTest = null;
  if (site.key === "youtube") {
    const cache = await extensionEvaluate(devToolsPort, globalThis.extensionID, `(async () => (await chrome.storage.local.get('sponsorSegmentCache')).sponsorSegmentCache?.SElZABp5M3U || null)()`);
    if (cache?.segments?.length) {
      const segment = cache.segments[0];
      sponsorSkipTest = await evaluate(session, `(async () => {
        const v = document.querySelector('video.html5-main-video,#movie_player video,video');
        if (!v) return { error: 'video element not found' };
        const before = ${JSON.stringify(segment.start + 0.2)};
        v.currentTime = before;
        v.dispatchEvent(new Event('timeupdate'));
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { segment: ${JSON.stringify(segment)}, injectedTime: before, resultingTime: Math.round(v.currentTime * 100) / 100,
          skipped: v.currentTime >= ${JSON.stringify(segment.end)} };
      })()`);
      sponsorSkipTest.cache = cache;
    } else sponsorSkipTest = { error: "SponsorBlock returned no cached segments", cache };
  }

  if (site.key.startsWith("lordfilm")) {
    await evaluate(session, `(() => {
      const candidate = [...document.querySelectorAll('button,[role="button"],.play,iframe')].find((el) => /play|смотреть|воспроизвести/i.test(el.innerText || el.getAttribute('aria-label') || el.title || ''));
      candidate?.click(); return Boolean(candidate);
    })()`).catch(() => false);
    await wait(4_000);
    if (site.key === "lordfilm") {
      await evaluate(session, `(() => {
        const candidate = [...document.querySelectorAll('button,a,div,span')].find((el) => /^\\s*запасной плеер\\s*$/i.test(el.innerText || ''));
        candidate?.click(); return Boolean(candidate);
      })()`).catch(() => false);
      await wait(6_000);
    }
    for (const child of childContextsBefore.filter((entry) => entry.state?.href !== before.href)) {
      await evaluateContext(session, child.contextId, `(() => {
        const nodes = [...document.querySelectorAll('button,[role="button"],.play,.jw-icon-playback,.vjs-big-play-button')];
        const candidate = nodes.find((el) => /play|смотреть|воспроизвести/i.test(el.innerText || el.getAttribute('aria-label') || el.title || '')) || nodes[0];
        candidate?.click(); return Boolean(candidate);
      })()`).catch(() => false);
    }
    await wait(4_000);
  }

  const after = await evaluate(session, pageProbe);
  const childContextsAfter = await probeChildContexts(session);
  if (site.key === "lordfilm") {
    await evaluate(session, "document.querySelector('#myframe')?.scrollIntoView({block:'center'}); true").catch(() => false);
    await wait(500);
  }
  const screenshotPath = join(dirname(outputPath), `${site.key}-exact-audit.png`);
  await capture(session, screenshotPath);
  const targetsAfter = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const relatedTargets = targetsAfter.filter((entry) => entry.type === "page" && entry.id !== target.id && !entry.url.startsWith("chrome-extension://") && entry.url !== "about:blank")
    .map((entry) => ({ title: entry.title, url: entry.url }));
  session.close();
  await fetch(`http://127.0.0.1:${devToolsPort}/json/close/${target.id}`);

  return {
    key: site.key, name: site.name, requestedURL: site.url,
    testedAt: new Date().toISOString(), before, childContextsBefore, timeline, sponsorSkipTest, after, childContextsAfter,
    blockedRequests: session.blocked,
    mediaResponses: session.responses.filter((entry) => entry.type === "Media" || /video|audio|mpegurl|dash|mp4|webm/i.test(entry.mimeType || "")).slice(0, 100),
    relatedTargets, screenshotPath
  };
}

try {
  chrome = spawn(chromeBinary, [
    `--user-data-dir=${profile}`,
    `--load-extension=${join(root, "Extension")}`,
    `--disable-extensions-except=${join(root, "Extension")}`,
    ...(process.env.BROWSER_MONITOR_AUDIT_HEADFUL === "1" ? [] : ["--headless=new"]),
    "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
    "--autoplay-policy=no-user-gesture-required", "--disable-site-isolation-trials",
    "--remote-debugging-port=0", "--window-size=1440,1000", "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const devToolsPort = await poll("Chrome DevTools port", () => {
    if (!existsSync(devToolsPortPath)) return null;
    return Number.parseInt(readFileSync(devToolsPortPath, "utf8").split("\n")[0], 10);
  });
  const extensionTarget = await poll("Browser Monitor service worker", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "service_worker" && target.url.endsWith("/service-worker.js"));
  });
  globalThis.extensionID = new URL(extensionTarget.url).hostname;

  const results = [];
  for (const [index, site] of sites.entries()) {
    try {
      const result = await auditSite(devToolsPort, site, index + 1);
      results.push(result);
      if (site.key === "lordfilm") {
        const playerURL = result.after?.frames?.find((frame) => /^https?:/.test(frame.src || ""))?.src;
        if (playerURL) {
          results.push(await auditSite(devToolsPort, {
            key: "lordfilm-player",
            name: "Lordfilm embedded player",
            url: playerURL,
            waitMS: 16_000
          }, 20));
        }
      }
    }
    catch (error) { results.push({ key: site.key, name: site.name, requestedURL: site.url, error: error?.stack || String(error) }); }
  }
  const diagnostics = await extensionEvaluate(devToolsPort, globalThis.extensionID, `(async () => ({
    statistics: await chrome.runtime.sendMessage({ kind: 'getBlockingStatistics' }),
    sponsorCache: (await chrome.storage.local.get('sponsorSegmentCache')).sponsorSegmentCache || {},
    enabledRulesets: await chrome.declarativeNetRequest.getEnabledRulesets()
  }))()`);
  const report = { testedAt: new Date().toISOString(), chromeBinary, isolatedProfile: true, extensionID: globalThis.extensionID, results, diagnostics };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, results: results.map((result) => ({ key: result.key, title: result.after?.title, blocked: result.blockedRequests?.length, videos: result.after?.videos?.length, sponsorSkipTest: result.sponsorSkipTest, error: result.error })) }, null, 2));
} finally {
  await stopProcess(chrome);
  rmSync(profile, { recursive: true, force: true });
}
