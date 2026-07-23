import assert from "node:assert/strict";
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.BROWSER_MONITOR_CHROME_BINARY;
assert.ok(
  existsSync(chromeBinary),
  "Set BROWSER_MONITOR_CHROME_BINARY to a Chrome for Testing or Chromium executable."
);
const profile = mkdtempSync(join(tmpdir(), "browser-monitor-chrome-"));
let extensionId;
const devToolsPortPath = join(profile, "DevToolsActivePort");
const port = 18765;
const screenshotPath = process.env.BROWSER_MONITOR_SCREENSHOT_PATH;
const animationScreenshotPath = process.env.BROWSER_MONITOR_ANIMATION_SCREENSHOT_PATH;
const statisticsScreenshotPath = process.env.BROWSER_MONITOR_STATISTICS_SCREENSHOT_PATH;
const headless = process.env.BROWSER_MONITOR_HEADLESS === "1";
let server;
let chrome;
let chromeError = "";
let serverError = "";
let devToolsPort;

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function stopProcess(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => process.once("exit", resolvePromise)),
    wait(2_000)
  ]);
  if (process.exitCode === null && process.signalCode === null) process.kill("SIGKILL");
}

async function poll(description, check, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Chrome targets and extension storage are eventually consistent during startup.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function inspectTestPage(devToolsPort) {
  const target = await poll("heavy page DevTools target", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((candidate) => candidate.type === "page" && candidate.url.includes("heavy-page.html"));
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const id = 1;
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out inspecting the heavy page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id,
      method: "Runtime.evaluate",
      params: {
        expression: `(() => {
          const adProbe = document.querySelector("#ad-container-banner");
          return ({
          href: location.href,
          ecoStylePresent: Boolean(document.querySelector("#browser-monitor-eco-style")),
          animationStates: document.getAnimations().map((animation) => animation.playState),
          successfulPingCount: window.__successfulPingCount ?? 0,
          pictureInPictureActive: Boolean(document.pictureInPictureElement),
          adProbeDisplay: adProbe ? getComputedStyle(adProbe).display : "replaced",
          imageSwapCount: document.querySelectorAll(".browser-monitor-image-swap").length,
          cookieBannerDisplay: getComputedStyle(document.querySelector("#onetrust-banner-sdk")).display,
          headingDisplay: getComputedStyle(document.querySelector("h1")).display
          });
        })()`,
        returnByValue: true
      }
    }));
  });
  socket.close();
  if (response.error || response.result?.exceptionDetails) {
    throw new Error(response.error?.message ?? response.result.exceptionDetails.text);
  }
  return response.result.result.value;
}

async function evaluateTestPage(devToolsPort, expression) {
  const target = await poll("heavy page DevTools target", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((candidate) => candidate.type === "page" && candidate.url.includes("heavy-page.html"));
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out evaluating the heavy page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 3) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 3,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true, userGesture: true }
    }));
  });
  socket.close();
  if (response.error || response.result?.exceptionDetails) {
    throw new Error(response.error?.message ?? response.result.exceptionDetails.text);
  }
  return response.result.result.value;
}

async function evaluateExtension(devToolsPort, expression, { userGesture = false } = {}) {
  const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "service_worker" && candidate.url.includes(`${extensionId}/service-worker.js`)
  );
  if (!target) return { error: "extension service worker target not found" };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out inspecting extension state")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 91) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 91,
      method: "Runtime.evaluate",
      params: {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture
      }
    }));
  });
  socket.close();
  return response.result?.result?.value ?? response;
}

async function inspectExtensionState(devToolsPort) {
  return evaluateExtension(devToolsPort, "chrome.storage.local.get(null)");
}

async function evaluateExtensionPage(devToolsPort, expression, { userGesture = false, pagePath = "popup.html" } = {}) {
  const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "page" && candidate.url.includes(`${extensionId}/${pagePath}`)
  );
  if (!target) return { error: "extension test page target not found" };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out evaluating extension page")), 15_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 92) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 92,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true, userGesture }
    }));
  });
  socket.close();
  return response.result?.result?.value ?? response;
}

async function captureStatisticsPage(devToolsPort, path) {
  const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "page" && candidate.url.includes(`${extensionId}/statistics.html`)
  );
  assert.ok(target, "Statistics page target not found for screenshot");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  let id = 110;
  const command = (method, params = {}) => new Promise((resolvePromise, rejectPromise) => {
    const currentID = ++id;
    const timeout = setTimeout(() => rejectPromise(new Error(`Timed out running ${method}`)), 5_000);
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== currentID) return;
      socket.removeEventListener("message", listener);
      clearTimeout(timeout);
      if (message.error) rejectPromise(new Error(message.error.message));
      else resolvePromise(message.result);
    };
    socket.addEventListener("message", listener);
    socket.send(JSON.stringify({ id: currentID, method, params }));
  });
  await command("Emulation.setDeviceMetricsOverride", { width: 860, height: 680, deviceScaleFactor: 1, mobile: false });
  await command("Page.bringToFront");
  await wait(300);
  const screenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true });
  socket.close();
  assert.ok(screenshot.data, "Chrome returned no statistics screenshot data");
  writeFileSync(path, Buffer.from(screenshot.data, "base64"));
}

async function captureExtensionPage(devToolsPort, path) {
  const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "page" && candidate.url.includes(`${extensionId}/popup.html`)
  );
  assert.ok(target, "Extension page target not found for screenshot");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out focusing extension page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 94) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({ id: 94, method: "Page.bringToFront" }));
  });
  await wait(300);
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out capturing extension page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 93) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 93,
      method: "Page.captureScreenshot",
      params: {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 420, height: 600, scale: 1 }
      }
    }));
  });
  socket.close();
  assert.ok(response.result?.data, "Chrome returned no screenshot data");
  writeFileSync(path, Buffer.from(response.result.data, "base64"));
}

async function captureTestPage(devToolsPort, path) {
  const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const target = targets.find((candidate) =>
    candidate.type === "page" && candidate.url.includes("heavy-page.html")
  );
  assert.ok(target, "Test page target not found for screenshot");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out focusing test page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 96) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({ id: 96, method: "Page.bringToFront" }));
  });
  await wait(1_180);
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("Timed out capturing test page")), 5_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 97) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 97,
      method: "Page.captureScreenshot",
      params: { format: "png", fromSurface: true, captureBeyondViewport: false }
    }));
  });
  socket.close();
  assert.ok(response.result?.data, "Chrome returned no activation screenshot data");
  writeFileSync(path, Buffer.from(response.result.data, "base64"));
}

try {
  server = spawn(process.env.BROWSER_MONITOR_PYTHON_BINARY ?? "python3", [
    "-m", "http.server", String(port),
    "--directory", join(root, "TestFixtures")
  ], { stdio: ["ignore", "ignore", "pipe"] });
  server.stderr.on("data", (chunk) => {
    serverError = (serverError + chunk.toString()).slice(-8_000);
  });
  await poll("test HTTP server", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/heavy-page.html`);
    return response.ok;
  }, 5_000);

  chrome = spawn(chromeBinary, [
    `--user-data-dir=${profile}`,
    `--load-extension=${join(root, "Extension")}`,
    `--disable-extensions-except=${join(root, "Extension")}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--remote-debugging-port=0",
    "--enable-logging=stderr",
    ...(headless ? ["--headless=new"] : []),
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chrome.stderr.on("data", (chunk) => {
    chromeError = (chromeError + chunk.toString()).slice(-3_000);
  });

  devToolsPort = await poll("Chrome DevTools port", () => {
    if (!existsSync(devToolsPortPath)) return null;
    return Number.parseInt(readFileSync(devToolsPortPath, "utf8").split("\n")[0], 10);
  });
  extensionId = await poll("extension service worker", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    const worker = targets.find((target) =>
      target.type === "service_worker" && target.url.endsWith("/service-worker.js")
    );
    return worker ? new URL(worker.url).hostname : null;
  });
  const testURL = `http://127.0.0.1:${port}/heavy-page.html`;
  const cryptominingRules = await poll("cryptomining DNR rules", async () => {
    const rules = await evaluateExtension(
      devToolsPort,
      "chrome.declarativeNetRequest.getDynamicRules()"
    );
    const selected = Array.isArray(rules)
      ? rules.filter((rule) => rule.id >= 620_000 && rule.id < 620_500)
      : [];
    return selected.length === 297 ? selected : null;
  });
  assert.ok(cryptominingRules.every((rule) => rule.action.type === "block"));
  const targetResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(testURL)}`,
    { method: "PUT" }
  );
  assert.ok(targetResponse.ok, `Chrome could not open the test tab: ${targetResponse.status}`);
  const extensionPageResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionId}/popup.html`)}`,
    { method: "PUT" }
  );
  assert.ok(extensionPageResponse.ok, "Chrome could not open the extension test page");
  await evaluateExtensionPage(
    devToolsPort,
    `chrome.tabs.query({}).then((tabs) => {
      const tab = tabs.find((candidate) => (candidate.url || candidate.pendingUrl || "").includes("heavy-page.html"));
      return chrome.tabs.update(tab.id, { active: true });
    })`
  );
  await poll("content script after extension startup", async () => {
    const metrics = await evaluateExtensionPage(
      devToolsPort,
      `chrome.tabs.query({}).then((tabs) => {
        const tab = tabs.find((candidate) => (candidate.url || candidate.pendingUrl || "").includes("heavy-page.html"));
        return tab ? chrome.tabs.sendMessage(tab.id, { kind: "getMetrics" }).catch(() => null) : null;
      })`
    );
    return metrics?.available ? metrics : null;
  });
  const activationResult = await evaluateExtensionPage(
    devToolsPort,
    `chrome.tabs.query({}).then((tabs) => {
      const tab = tabs.find((candidate) => (candidate.url || candidate.pendingUrl || "").includes("heavy-page.html"));
      return chrome.tabs.sendMessage(tab.id, { kind: "playActivationAnimation" });
    })`
  );
  assert.equal(activationResult?.ok, true);
  assert.equal(
    await evaluateTestPage(devToolsPort, `Boolean(document.querySelector("#browser-monitor-activation-overlay"))`),
    true,
    "Activation overlay was not mounted in the active tab"
  );
  if (animationScreenshotPath) {
    await captureTestPage(devToolsPort, animationScreenshotPath);
  }
  const initial = await poll("extension snapshot", async () => {
    const snapshot = await evaluateExtensionPage(
      devToolsPort,
      `chrome.runtime.sendMessage({ kind: "collectNow" })`
    );
    if (!snapshot) return null;
    const tab = snapshot.tabs.find((candidate) => candidate.url.includes("heavy-page.html"));
    return tab?.metrics.sampleDurationSeconds >= 4 ? { snapshot, tab } : null;
  });
  assert.equal(initial.snapshot.monitoringEnabled, true);
  assert.equal(initial.tab.ecoModeEnabled, false);
  assert.ok(initial.tab.score >= 15, `Heavy fixture received an unexpectedly low score: ${initial.tab.score}`);
  assert.ok(initial.tab.reasons.length > 0);
  assert.equal(initial.snapshot.contentBlocking.enabled, true);
  assert.equal(initial.snapshot.contentBlocking.ruleCount, 30_297);
  await poll("popup UI render", async () => {
    const state = await evaluateExtensionPage(devToolsPort, `({
      title: document.querySelector("#protection-title")?.textContent,
      tabCount: document.querySelectorAll(".tab").length
    })`);
    return state.title && state.tabCount > 0 ? state : null;
  });
  const popupGeometry = await evaluateExtensionPage(devToolsPort, `(async () => {
    const measure = () => {
      const rect = (selector) => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return { x: value.x, y: value.y, width: value.width, height: value.height };
      };
      return {
        monitoring: rect("#monitoring-toggle"),
        blocker: rect("#blocker-toggle"),
        siteAction: rect("#site-control-action"),
        pip: rect("#pip-button"),
        cookies: rect("#cookies-button"),
        block: rect("#block-element-button"),
        statistics: rect("#statistics-button"),
        tools: rect(".utility-section"),
        footer: rect("footer"),
        body: {
          width: document.body.clientWidth,
          height: document.body.clientHeight,
          scrollHeight: document.body.scrollHeight
        },
        tabListOverflow: getComputedStyle(document.querySelector("#tab-list")).overflowY,
        ecoWidths: [...document.querySelectorAll(".eco-button")].map((button) => button.getBoundingClientRect().width)
      };
    };
    const toggle = document.querySelector("#blocker-toggle");
    const before = measure();
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const off = measure();
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { before, off, restored: measure() };
  })()`);
  assert.deepEqual(popupGeometry.off.blocker, popupGeometry.before.blocker, "Protection switch moved when its label changed");
  assert.deepEqual(popupGeometry.restored.blocker, popupGeometry.before.blocker, "Protection switch did not return to stable geometry");
  assert.equal(popupGeometry.before.monitoring.x, popupGeometry.before.blocker.x, "Header and protection switches are not vertically aligned");
  assert.equal(popupGeometry.before.monitoring.width, popupGeometry.before.blocker.width, "Switch widths differ");
  assert.equal(popupGeometry.before.siteAction.width, 78, "Site action does not reserve stable label width");
  assert.equal(popupGeometry.before.pip.width, popupGeometry.before.cookies.width, "Tool buttons are not equal-width");
  assert.equal(popupGeometry.before.pip.width, popupGeometry.before.block.width, "Tool buttons are not aligned");
  assert.equal(popupGeometry.before.pip.width, popupGeometry.before.statistics.width, "Statistics tool is not aligned");
  assert.ok(popupGeometry.before.ecoWidths.every((width) => width === 52), "Eco controls do not have stable widths");
  assert.deepEqual(popupGeometry.before.body, { width: 420, height: 600, scrollHeight: 600 });
  assert.equal(popupGeometry.before.tabListOverflow, "hidden", "Tab list still has an internal scrollbar");
  assert.ok(popupGeometry.before.tools.y >= 0 && popupGeometry.before.tools.y + popupGeometry.before.tools.height <= 600);
  assert.ok(popupGeometry.before.footer.y + popupGeometry.before.footer.height <= 600);
  const paginationFit = await evaluateExtensionPage(devToolsPort, `(() => {
    const list = document.querySelector("#tab-list");
    const pagination = document.querySelector("#more-tabs");
    const source = list.querySelector(".tab");
    const clones = [];
    while (list.querySelectorAll(".tab").length < 4) {
      const clone = source.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      list.append(clone);
      clones.push(clone);
    }
    const wasHidden = pagination.hidden;
    pagination.hidden = false;
    const rows = [...list.querySelectorAll(".tab")].slice(0, 4);
    const paginationTop = pagination.getBoundingClientRect().top;
    const lastRowBottom = rows.at(-1).getBoundingClientRect().bottom;
    const result = {
      rowCount: rows.length,
      paginationTop,
      lastRowBottom,
      fullyVisible: rows.every((row) => row.getBoundingClientRect().bottom <= paginationTop)
    };
    clones.forEach((clone) => clone.remove());
    pagination.hidden = wasHidden;
    return result;
  })()`);
  assert.equal(paginationFit.rowCount, 4, "Popup pagination probe did not render four rows");
  assert.ok(
    paginationFit.fullyVisible,
    `Last tab row overlaps pagination (${paginationFit.lastRowBottom} > ${paginationFit.paginationTop})`
  );
  const detailGeometry = await evaluateExtensionPage(devToolsPort, `(() => {
    document.querySelector(".tab-copy").click();
    const panel = document.querySelector("#tab-detail-panel");
    const result = {
      hidden: panel.hidden,
      width: panel.getBoundingClientRect().width,
      height: panel.getBoundingClientRect().height,
      metricCount: document.querySelectorAll("#metric-grid .metric-card").length,
      title: document.querySelector("#tab-detail-name").textContent
    };
    document.querySelector("#close-tab-detail").click();
    return result;
  })()`);
  assert.deepEqual(
    { hidden: detailGeometry.hidden, width: detailGeometry.width, height: detailGeometry.height, metricCount: detailGeometry.metricCount },
    { hidden: false, width: 420, height: 600, metricCount: 8 }
  );
  assert.ok(detailGeometry.title.length > 0, "Detailed analytics has no tab title");

  const blockedRequestResult = await evaluateTestPage(devToolsPort, `new Promise((resolve) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => resolve("timeout"), 3_000);
    script.onload = () => { clearTimeout(timeout); resolve("loaded"); };
    script.onerror = () => { clearTimeout(timeout); resolve("blocked"); };
    script.src = "https://adnxs.com/browser-monitor-e2e-" + Date.now() + ".js";
    document.body.append(script);
  })`);
  assert.equal(blockedRequestResult, "blocked", "A real advertising request was not blocked");
  const blockingStatistics = await poll("realtime blocking statistics", async () => {
    const summary = await evaluateExtensionPage(devToolsPort, `chrome.runtime.sendMessage({ kind: "getBlockingStatistics" })`);
    return summary?.today?.types?.network > 0
      && summary.topSites.some((entry) => entry.name === "127.0.0.1")
      && summary.resources.some((entry) => entry.name === "adnxs.com")
      ? summary
      : null;
  });
  assert.ok(blockingStatistics.today.total >= blockingStatistics.today.types.network);
  await poll("recognized video-ad fixture", async () => {
    const state = await inspectExtensionState(devToolsPort);
    const today = Object.values(state.blockingStatistics?.days ?? {}).at(-1);
    return today?.types?.video > 0 ? today : null;
  });
  const statisticsPageResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionId}/statistics.html`)}`,
    { method: "PUT" }
  );
  assert.ok(statisticsPageResponse.ok, "Chrome could not open the statistics window");
  const statisticsGeometry = await poll("statistics window render", async () => {
    const state = await evaluateExtensionPage(devToolsPort, `({
      today: document.querySelector("#today-total")?.textContent,
      sevenDays: document.querySelector("#seven-day-total")?.textContent,
      sites: document.querySelectorAll("#top-sites li").length,
      resources: document.querySelectorAll("#blocked-resources li").length,
      body: { width: document.body.clientWidth, height: document.body.clientHeight },
      overflow: getComputedStyle(document.querySelector("main")).overflow
    })`, { pagePath: "statistics.html" });
    return Number.parseInt(state.today, 10) > 0 && state.sites > 0 && state.resources > 0 ? state : null;
  });
  assert.ok(Number.parseInt(statisticsGeometry.sevenDays, 10) >= Number.parseInt(statisticsGeometry.today, 10));
  if (statisticsScreenshotPath) await captureStatisticsPage(devToolsPort, statisticsScreenshotPath);
  assert.equal((await inspectTestPage(devToolsPort)).adProbeDisplay, "none", "Cosmetic filtering was not applied");
  await evaluateExtensionPage(devToolsPort, `chrome.runtime.sendMessage({
    kind: "setBrowserProtectionSettings",
    settings: {
      cookieBannerBlockingEnabled: true,
      newsletterBlockingEnabled: false,
      surveyBlockingEnabled: false,
      notificationPromptBlockingEnabled: true,
      autoplayBlockingEnabled: false,
      floatingVideoBlockingEnabled: false,
      updatedAt: new Date().toISOString()
    }
  })`);
  await poll("cookie banner protection", async () => (
    (await inspectTestPage(devToolsPort)).cookieBannerDisplay === "none"
  ));
  assert.equal(
    (await inspectTestPage(devToolsPort)).cookieBannerDisplay,
    "none",
    "Native cookie-banner setting was not applied in the page"
  );
  const pickerStarted = await evaluateExtensionPage(
    devToolsPort,
    `chrome.tabs.sendMessage(${initial.tab.tabId}, { kind: "startElementPicker" })`
  );
  assert.equal(pickerStarted.ok, true, "Element picker did not start");
  assert.equal(
    await evaluateTestPage(devToolsPort, "Boolean(document.querySelector('#browser-monitor-picker-tooltip'))"),
    true,
    "Element picker hint was not rendered"
  );
  await evaluateTestPage(devToolsPort, `(() => {
    const heading = document.querySelector("h1");
    heading.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    heading.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  })()`);
  await poll("manual cosmetic filter", async () => {
    const settings = await evaluateExtensionPage(
      devToolsPort,
      `chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" })`
    );
    return settings.customCosmeticFilters?.includes("h1") ? settings : null;
  });
  await poll("manually hidden page element", async () => (
    (await inspectTestPage(devToolsPort)).headingDisplay === "none"
  ));

  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setBrowserProtectionSettings",
      settings: {
        imageSwapEnabled: true,
        imageSwapTheme: "ocean",
        updatedAt: new Date().toISOString()
      }
    })`
  );
  await poll("local image swap", async () => (
    (await inspectTestPage(devToolsPort)).imageSwapCount === 1
  ));
  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setBrowserProtectionSettings",
      settings: {
        imageSwapEnabled: false,
        updatedAt: new Date().toISOString()
      }
    })`
  );
  await poll("image swap restoration", async () => (
    (await inspectTestPage(devToolsPort)).imageSwapCount === 0
  ));

  const temporarilyPausedState = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setSiteTemporarilyPaused",
      domain: "127.0.0.1",
      durationMinutes: 10,
      tabId: ${initial.tab.tabId},
      url: ${JSON.stringify(testURL)}
    })`
  );
  assert.ok(temporarilyPausedState.sitePausedUntil, "Temporary site pause did not get an expiry");
  await poll("temporary site pause", async () => (
    (await inspectTestPage(devToolsPort)).adProbeDisplay === "block"
  ));
  const resumedSiteState = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setSiteTemporarilyPaused",
      domain: "127.0.0.1",
      durationMinutes: 0,
      tabId: ${initial.tab.tabId},
      url: ${JSON.stringify(testURL)}
    })`
  );
  assert.equal(resumedSiteState.sitePausedUntil, null);
  await poll("protection after temporary pause", async () => (
    (await inspectTestPage(devToolsPort)).adProbeDisplay === "none"
  ));

  const allowlistedState = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setSiteAllowlisted",
      domain: "127.0.0.1",
      allowlisted: true,
      tabId: ${initial.tab.tabId},
      url: ${JSON.stringify(testURL)}
    })`
  );
  assert.equal(allowlistedState.siteAllowlisted, true);
  assert.equal((await inspectTestPage(devToolsPort)).adProbeDisplay, "block", "Site exception did not remove cosmetic filtering");
  const protectedAgainState = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setSiteAllowlisted",
      domain: "127.0.0.1",
      allowlisted: false,
      tabId: ${initial.tab.tabId},
      url: ${JSON.stringify(testURL)}
    })`
  );
  assert.equal(protectedAgainState.siteAllowlisted, false);
  assert.equal((await inspectTestPage(devToolsPort)).adProbeDisplay, "none", "Protection was not restored after removing the exception");
  const enabledRulesets = await evaluateExtension(
    devToolsPort,
    "chrome.declarativeNetRequest.getEnabledRulesets()"
  );
  assert.deepEqual(enabledRulesets.sort(), ["easylist", "easyprivacy", "ruadlist"]);
  const blockedAdProbe = await evaluateExtension(
    devToolsPort,
    `chrome.declarativeNetRequest.testMatchOutcome({
      url: "https://adnxs.com/banner.js",
      initiator: "https://example.com",
      type: "script"
    })`
  );
  assert.ok(
    blockedAdProbe.matchedRules?.some((rule) => ["easylist", "easyprivacy", "ruadlist"].includes(rule.rulesetId)),
    "A known ad request did not match the packaged blocking rules"
  );

  const settingsBeforeFilterTest = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" })`
  );
  const filterConfiguration = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setBrowserProtectionSettings",
      settings: {
        adFilterEnabled: false,
        privacyFilterEnabled: true,
        cosmeticFilteringEnabled: false,
        customBlockedDomains: ["custom-block.example"]
      }
    })`
  );
  assert.equal(filterConfiguration.ok, true, filterConfiguration.error);
  assert.deepEqual(
    await evaluateExtension(devToolsPort, "chrome.declarativeNetRequest.getEnabledRulesets()"),
    ["easyprivacy"]
  );
  const customDynamicRules = await evaluateExtension(devToolsPort, "chrome.declarativeNetRequest.getDynamicRules()");
  assert.ok(
    customDynamicRules.some((rule) => rule.id === 600_000 && rule.condition.requestDomains?.includes("custom-block.example")),
    "Custom blocked domain was not compiled into a dynamic rule"
  );
  const subscriptionURL = "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt";
  const subscriptionConfiguration = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setBrowserProtectionSettings",
      settings: {
        customFilterListURLs: [${JSON.stringify("https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt")}],
        customFilterListRefreshRequestedAt: new Date().toISOString()
      }
    })`
  );
  assert.equal(subscriptionConfiguration.ok, true, subscriptionConfiguration.error);
  const subscriptionState = await poll("custom filter subscription", async () => {
    const state = await inspectExtensionState(devToolsPort);
    const status = state.filterSubscriptions?.find((entry) => entry.url === subscriptionURL);
    const rules = await evaluateExtension(devToolsPort, "chrome.declarativeNetRequest.getDynamicRules()");
    const subscriptionRules = Array.isArray(rules)
      ? rules.filter((rule) => rule.id >= 630_000 && rule.id < 630_500)
      : [];
    return status && !status.error && subscriptionRules.length > 0
      ? { status, subscriptionRules }
      : null;
  }, 20_000);
  assert.ok(subscriptionState.subscriptionRules.length <= 500);
  assert.equal(subscriptionState.status.networkRuleCount, subscriptionState.subscriptionRules.length);
  assert.ok(subscriptionState.status.title.length > 0);
  const restoredFilterConfiguration = await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({
      kind: "setBrowserProtectionSettings",
      settings: ${JSON.stringify(settingsBeforeFilterTest)}
    })`
  );
  assert.equal(restoredFilterConfiguration.ok, true, restoredFilterConfiguration.error);
  await poll("custom subscription rule cleanup", async () => {
    const rules = await evaluateExtension(devToolsPort, "chrome.declarativeNetRequest.getDynamicRules()");
    return Array.isArray(rules)
      && rules.every((rule) => rule.id < 630_000 || rule.id >= 630_500);
  });

  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({ kind: "setContentBlocking", enabled: false })`
  );
  assert.ok((await evaluateExtension(
    devToolsPort,
    "chrome.declarativeNetRequest.getEnabledRulesets()"
  )).every((ruleset) => !["easylist", "easyprivacy", "ruadlist"].includes(ruleset)));
  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({ kind: "setContentBlocking", enabled: true })`
  );
  const targetsBeforeEcoMode = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
  const heavyTarget = targetsBeforeEcoMode.find((candidate) => candidate.url === testURL);
  assert.ok(heavyTarget, "Heavy page target disappeared before Eco Mode test");
  await fetch(`http://127.0.0.1:${devToolsPort}/json/activate/${heavyTarget.id}`);

  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({ kind: "setEcoMode", tabId: ${initial.tab.tabId}, enabled: true })`
  );
  const enabled = await poll("Eco Mode enable acknowledgement", async () => {
    const snapshot = (await inspectExtensionState(devToolsPort)).latestSnapshot;
    const tab = snapshot?.tabs.find((candidate) => candidate.tabId === initial.tab.tabId);
    return tab?.ecoModeEnabled === true ? tab : null;
  });
  assert.equal(enabled.ecoModeEnabled, true);
  const ecoStateBeforeWait = await inspectTestPage(devToolsPort);
  assert.equal(ecoStateBeforeWait.href, testURL, "Eco Mode closed or replaced the tab");
  assert.equal(ecoStateBeforeWait.ecoStylePresent, true);
  assert.ok(ecoStateBeforeWait.animationStates.length > 0, "The fixture animation was not detected");
  assert.ok(ecoStateBeforeWait.animationStates.every((state) => state === "paused"));
  await wait(1_000);
  const ecoStateAfterWait = await inspectTestPage(devToolsPort);
  assert.ok(
    ecoStateAfterWait.successfulPingCount <= ecoStateBeforeWait.successfulPingCount + 1,
    "Background requests continued while Eco Mode was enabled"
  );

  await evaluateExtensionPage(
    devToolsPort,
    `chrome.runtime.sendMessage({ kind: "setEcoMode", tabId: ${initial.tab.tabId}, enabled: false })`
  );
  const restored = await poll("Eco Mode restore acknowledgement", async () => {
    const snapshot = (await inspectExtensionState(devToolsPort)).latestSnapshot;
    const tab = snapshot?.tabs.find((candidate) => candidate.tabId === initial.tab.tabId);
    return tab?.ecoModeEnabled === false ? tab : null;
  });
  assert.equal(restored.ecoModeEnabled, false);
  const restoredStateBeforeWait = await inspectTestPage(devToolsPort);
  assert.equal(restoredStateBeforeWait.href, testURL, "The tab did not remain open after restore");
  assert.equal(restoredStateBeforeWait.ecoStylePresent, false);
  assert.ok(restoredStateBeforeWait.animationStates.some((state) => state === "running"));
  await wait(1_000);
  const restoredStateAfterWait = await inspectTestPage(devToolsPort);
  assert.ok(
    restoredStateAfterWait.successfulPingCount > restoredStateBeforeWait.successfulPingCount,
    "Background requests did not resume after Eco Mode was disabled"
  );

  if (!headless) {
    const pipResult = await evaluateExtensionPage(
      devToolsPort,
      `chrome.runtime.sendMessage({ kind: "togglePictureInPicture", tabId: ${initial.tab.tabId} })`,
      { userGesture: true }
    );
    assert.equal(pipResult.ok, true, pipResult.message);
    assert.equal(pipResult.active, true);
    assert.equal((await inspectTestPage(devToolsPort)).pictureInPictureActive, true);
    const pipCloseResult = await evaluateExtensionPage(
      devToolsPort,
      `chrome.runtime.sendMessage({ kind: "togglePictureInPicture", tabId: ${initial.tab.tabId} })`,
      { userGesture: true }
    );
    assert.equal(pipCloseResult.active, false);
  }

  if (screenshotPath) {
    await fetch(`http://127.0.0.1:${devToolsPort}/json/activate/${heavyTarget.id}`);
    await evaluateExtensionPage(devToolsPort, "location.reload(); true");
    await poll("popup refresh for screenshots", async () => {
      const state = await evaluateExtensionPage(devToolsPort, `({
        cookiesEnabled: !document.querySelector("#cookies-button").disabled,
        tabCount: document.querySelectorAll(".tab").length
      })`);
      return state.cookiesEnabled && state.tabCount > 0 ? state : null;
    }, 5_000);
    await captureExtensionPage(devToolsPort, screenshotPath);
    await evaluateExtensionPage(devToolsPort, `document.querySelector(".tab-copy").click(); true`);
    await captureExtensionPage(devToolsPort, screenshotPath.replace(/\.png$/i, "-details.png"));
    await evaluateExtensionPage(devToolsPort, `(() => {
      document.querySelector("#close-tab-detail").click();
      document.querySelector("#cookies-button").click();
      return true;
    })()`);
    await poll("cookie table render", async () => {
      const state = await evaluateExtensionPage(devToolsPort, `({
        hidden: document.querySelector("#cookies-panel").hidden,
        rows: document.querySelectorAll("#cookie-table tr").length
      })`);
      return !state.hidden && state.rows > 0 ? state : null;
    }, 5_000);
    await captureExtensionPage(devToolsPort, screenshotPath.replace(/\.png$/i, "-cookies.png"));
  }

  console.log(JSON.stringify({
    ok: true,
    tabId: initial.tab.tabId,
    score: restored.score,
    ecoModeEnabled: restored.ecoModeEnabled,
    contentBlockerToggled: true,
    blockedRequestBlocked: true,
    realtimeStatisticsVerified: true,
    videoAdFixtureRecognized: true,
    cosmeticFilteringToggledWithException: true,
    temporarySitePauseRestored: true,
    localImageSwapRestored: true,
    customFilterSubscriptionInstalledAndRemoved: true,
    activationAnimationMounted: true,
    popupLayoutStable: true,
    pictureInPictureOpenedAndClosed: headless ? "skipped-headless" : true,
    tabRemainedOpen: true,
    animationsPausedAndRestored: true,
    backgroundRequestsBlockedAndRestored: true
  }));
} catch (error) {
  if (devToolsPort) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
      console.error("DevTools targets:\n" + JSON.stringify(targets.map(({ type, title, url }) => ({ type, title, url })), null, 2));
      console.error("Extension state:\n" + JSON.stringify(await inspectExtensionState(devToolsPort), null, 2));
      console.error("Extension tabs:\n" + JSON.stringify(await evaluateExtension(
        devToolsPort,
        "chrome.tabs.query({})"
      ), null, 2));
      console.error("Dynamic DNR count:\n" + JSON.stringify(await evaluateExtension(
        devToolsPort,
        "chrome.declarativeNetRequest.getDynamicRules().then((rules) => rules.length)"
      ), null, 2));
    } catch {
      // Chrome may have exited before diagnostics are collected.
    }
  }
  console.error("Chrome stderr:\n" + chromeError);
  console.error("Server stderr:\n" + serverError.slice(-2_000));
  throw error;
} finally {
  await Promise.all([stopProcess(chrome), stopProcess(server)]);
  rmSync(profile, { recursive: true, force: true });
}
