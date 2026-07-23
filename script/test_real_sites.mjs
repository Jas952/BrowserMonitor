import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.BROWSER_MONITOR_CHROME_BINARY;
assert.ok(
  chromeBinary && existsSync(chromeBinary),
  "Set BROWSER_MONITOR_CHROME_BINARY to a Chrome for Testing or Chromium executable."
);

const sites = [
  { name: "D3ward blocker test", url: "https://d3ward.github.io/toolz/adblock.html" },
  { name: "TechRadar", url: "https://www.techradar.com/" },
  { name: "Tom's Hardware", url: "https://www.tomshardware.com/" },
  { name: "YouTube sponsor sample", url: "https://www.youtube.com/watch?v=SElZABp5M3U" },
  { name: "Rutube video", url: "https://rutube.ru/video/8c316f529b44d17d4c8a03c9b23cc7c5/" }
];
const profile = mkdtempSync(join(tmpdir(), "browser-monitor-real-sites-"));
const devToolsPortPath = join(profile, "DevToolsActivePort");
let chrome;

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function poll(description, check, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Chrome targets are eventually consistent while the profile starts.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => process.once("exit", resolvePromise)),
    wait(2_000)
  ]);
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

async function evaluateTarget(target, expression, id = 7) {
  const socket = await openSocket(target.webSocketDebuggerUrl);
  const result = await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error("Extension evaluation timed out")), 15_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timer);
      if (message.error || message.result?.exceptionDetails) {
        reject(new Error(message.error?.message ?? message.result.exceptionDetails.text));
      } else {
        resolvePromise(message.result.result.value);
      }
    });
    socket.send(JSON.stringify({
      id,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true }
    }));
  });
  socket.close();
  return result;
}

async function enableCookieBannerProtection(devToolsPort, extensionId) {
  const popupURL = `chrome-extension://${extensionId}/popup.html`;
  const targetResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(popupURL)}`,
    { method: "PUT" }
  );
  assert.ok(targetResponse.ok, "Chrome could not open the Browser Monitor control page");
  const target = await targetResponse.json();
  await poll("Browser Monitor control page", async () => (
    await evaluateTarget(target, "typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function'") ? true : null
  ), 15_000);
  const result = await evaluateTarget(target, `chrome.runtime.sendMessage({
    kind: "setBrowserProtectionSettings",
    settings: { cookieBannerBlockingEnabled: true, updatedAt: new Date().toISOString() }
  })`);
  await fetch(`http://127.0.0.1:${devToolsPort}/json/close/${target.id}`);
  assert.equal(result?.ok, true, result?.error ?? "Cookie protection could not be enabled");
}

async function auditSite(devToolsPort, site, index) {
  const targetResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" }
  );
  assert.ok(targetResponse.ok, `Chrome could not create the ${site.name} tab`);
  const target = await targetResponse.json();
  const socket = await openSocket(target.webSocketDebuggerUrl);
  const requests = new Map();
  const blocked = [];
  let messageId = index * 100;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: resolvePending, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolvePending(message.result);
      return;
    }
    if (message.method === "Network.requestWillBeSent") {
      requests.set(message.params.requestId, message.params.request.url);
    }
    if (message.method === "Network.loadingFailed") {
      const { requestId, blockedReason, errorText, type } = message.params;
      if (errorText === "net::ERR_BLOCKED_BY_CLIENT") {
        blocked.push({ url: requests.get(requestId) ?? "unknown", blockedReason, errorText, type });
      }
    }
  });

  const command = (method, params = {}, timeout = 45_000) => new Promise((resolvePromise, reject) => {
    const id = ++messageId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${site.name}: ${method} timed out`));
    }, timeout);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await command("Network.enable");
  await command("Page.enable");
  await command("Page.navigate", { url: site.url });
  await wait(10_000);
  const pageState = await command("Runtime.evaluate", {
    expression: `(() => {
      const roots = [document];
      for (let index = 0; index < roots.length && roots.length < 30; index += 1) {
        for (const element of roots[index].querySelectorAll('*')) {
          if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot);
          if (roots.length >= 30) break;
        }
      }
      return ({
      href: location.href,
      title: document.title,
      readyState: document.readyState,
      visibleAdCandidates: [...document.querySelectorAll(
        '[data-ad-slot], [data-ad-client], iframe[id^="google_ads"], #player-ads, #masthead-ad, ytd-ad-slot-renderer, ytd-display-ad-renderer'
      )].filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      }).slice(0, 20).map((element) => element.id || element.className || element.tagName),
      cookieBannerVisible: [...document.querySelectorAll(
        '#onetrust-banner-sdk, #CybotCookiebotDialog, .qc-cmp2-container, .fc-consent-root, .didomi-popup-container'
      )].some((element) => getComputedStyle(element).display !== 'none'),
      youtubeProtectionMounted: location.hostname.endsWith('youtube.com')
        ? (document.querySelector('#browser-monitor-protection-style')?.textContent || '').includes('ytd-ad-slot-renderer')
        : null,
      videoProtectionMounted: (document.querySelector('#browser-monitor-protection-style')?.textContent || '').includes('.ima-ad-container'),
      videoElementsIncludingOpenShadowRoots: roots.reduce((total, root) => total + root.querySelectorAll('video').length, 0),
      hiddenVideoAdCandidates: roots.flatMap((root) => [...root.querySelectorAll('.browser-monitor-hidden-video-ad')]).length
      });
    })()`,
    returnByValue: true
  });
  socket.close();
  await fetch(`http://127.0.0.1:${devToolsPort}/json/close/${target.id}`);

  const blockedHosts = {};
  for (const entry of blocked) {
    let host = "unknown";
    try { host = new URL(entry.url).hostname; } catch { /* Keep unknown. */ }
    blockedHosts[host] = (blockedHosts[host] ?? 0) + 1;
  }
  const topBlockedHosts = Object.entries(blockedHosts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([host, count]) => ({ host, count }));

  return {
    name: site.name,
    requestedURL: site.url,
    ...pageState.result.value,
    blockedRequestCount: blocked.length,
    topBlockedHosts
  };
}

try {
  chrome = spawn(chromeBinary, [
    `--user-data-dir=${profile}`,
    `--load-extension=${join(root, "Extension")}`,
    `--disable-extensions-except=${join(root, "Extension")}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--remote-debugging-port=0",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const devToolsPort = await poll("Chrome DevTools port", () => {
    if (!existsSync(devToolsPortPath)) return null;
    return Number.parseInt(readFileSync(devToolsPortPath, "utf8").split("\n")[0], 10);
  });
  const extensionTarget = await poll("Browser Monitor service worker", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "service_worker" && target.url.endsWith("/service-worker.js"));
  });
  const extensionId = new URL(extensionTarget.url).hostname;
  await enableCookieBannerProtection(devToolsPort, extensionId);

  const results = [];
  for (const [index, site] of sites.entries()) {
    try {
      results.push(await auditSite(devToolsPort, site, index + 1));
    } catch (error) {
      results.push({
        name: site.name,
        requestedURL: site.url,
        error: error?.message ?? String(error)
      });
    }
  }
  const diagnosticsResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionId}/statistics.html`)}`,
    { method: "PUT" }
  );
  assert.ok(diagnosticsResponse.ok, "Chrome could not open blocking statistics diagnostics");
  const diagnosticsTarget = await diagnosticsResponse.json();
  const diagnostics = await poll("blocking and SponsorBlock diagnostics", async () => {
    const value = await evaluateTarget(diagnosticsTarget, `(async () => ({
      summary: await chrome.runtime.sendMessage({ kind: "getBlockingStatistics" }),
      cache: (await chrome.storage.local.get("sponsorSegmentCache")).sponsorSegmentCache || {}
    }))()`);
    return value?.summary?.today?.total > 0 ? value : null;
  });
  assert.ok(
    results.filter((result) => result.blockedRequestCount > 0).length >= 2,
    "Fewer than two audited public sites produced confirmed blocked requests"
  );
  assert.ok(diagnostics.summary.topSites.length > 0, "Top sites were not recorded in realtime statistics");
  assert.ok(diagnostics.summary.resources.length > 0, "Blocked resources were not recorded in realtime statistics");
  const sponsorSample = diagnostics.cache.SElZABp5M3U;
  assert.ok(sponsorSample, "YouTube SponsorBlock lookup was not cached");
  assert.ok(Array.isArray(sponsorSample.segments) && sponsorSample.segments.length > 0, "Known SponsorBlock sample returned no segments");
  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    results,
    statistics: diagnostics.summary,
    sponsorBlockSampleSegments: sponsorSample.segments.length
  }, null, 2));
} finally {
  await stopProcess(chrome);
  rmSync(profile, { recursive: true, force: true });
}
