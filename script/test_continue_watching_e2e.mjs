import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.BROWSER_MONITOR_CHROME_BINARY;
const screenshotPath = resolve(
  process.env.BROWSER_MONITOR_CONTINUE_WATCHING_SCREENSHOT_PATH
    || join(root, "output/screenshots/continue-watching-notice.png")
);
const port = 18766;
const profile = mkdtempSync(join(tmpdir(), "browser-monitor-continue-watching-"));
const devToolsPortPath = join(profile, "DevToolsActivePort");
let chrome;
let server;

assert.ok(chromeBinary && existsSync(chromeBinary), "Set BROWSER_MONITOR_CHROME_BINARY to Chrome for Testing.");

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function poll(description, check, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Chrome targets and content scripts are eventually consistent.
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

async function sessionFor(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  let nextID = 0;
  const command = (method, params = {}) => new Promise((resolvePromise, rejectPromise) => {
    const id = ++nextID;
    const timer = setTimeout(() => rejectPromise(new Error(`${method} timed out`)), 10_000);
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener("message", listener);
      clearTimeout(timer);
      if (message.error) rejectPromise(new Error(message.error.message));
      else resolvePromise(message.result);
    };
    socket.addEventListener("message", listener);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  return { socket, command, evaluate };
}

try {
  server = spawn(process.env.BROWSER_MONITOR_PYTHON_BINARY ?? "python3", [
    "-m", "http.server", String(port),
    "--bind", "127.0.0.1",
    "--directory", join(root, "TestFixtures")
  ], { stdio: ["ignore", "ignore", "pipe"] });
  await poll("fixture server", async () => (await fetch(`http://127.0.0.1:${port}/movie/player/`)).ok, 5_000);

  chrome = spawn(chromeBinary, [
    `--user-data-dir=${profile}`,
    `--load-extension=${join(root, "Extension")}`,
    `--disable-extensions-except=${join(root, "Extension")}`,
    "--host-resolver-rules=MAP cinema.test 127.0.0.1",
    `--unsafely-treat-insecure-origin-as-secure=http://cinema.test:${port}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--window-size=1280,800",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const devToolsPort = await poll("Chrome DevTools port", () => {
    if (!existsSync(devToolsPortPath)) return null;
    return Number.parseInt(readFileSync(devToolsPortPath, "utf8").split("\n")[0], 10);
  });
  const workerTarget = await poll("Browser Monitor service worker", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "service_worker" && target.url.endsWith("/service-worker.js"));
  });
  const extensionID = new URL(workerTarget.url).hostname;
  const extensionPageResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionID}/popup.html`)}`,
    { method: "PUT" }
  );
  assert.ok(extensionPageResponse.ok, "Chrome could not open the extension setup page.");
  const extensionPageTarget = await poll("extension setup page", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) =>
      target.type === "page" && target.url.includes(`${extensionID}/popup.html`)
    );
  });
  const extensionPage = await sessionFor(extensionPageTarget);
  const mediaURL = `http://cinema.test:${port}/movie/player/?episode=4`;
  const identity = createHash("sha256")
    .update("media:cinema.test:example show episode 4:/movie/player/?episode=4")
    .digest("hex");
  await extensionPage.evaluate(`(async () => {
    const identity = ${JSON.stringify(identity)};
    await chrome.storage.local.set({
      linkSafetyAllowedDomains: ["cinema.test"],
      uiPreferences: { language: "ru", theme: "system" },
      continueWatching: {
        version: 1,
        entries: {
          [identity]: { position: 754, duration: 2400, updatedAt: Date.now() }
        }
      }
    });
    return identity;
  })()`);
  assert.match(identity, /^[a-f0-9]{64}$/);
  const seededPosition = await extensionPage.evaluate(
    `chrome.runtime.sendMessage({ kind: "getContinueWatchingPosition", identity: ${JSON.stringify(identity)} })`
  );
  assert.equal(seededPosition.position, 754);

  const pageResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(mediaURL)}`,
    { method: "PUT" }
  );
  assert.ok(pageResponse.ok, "Chrome could not open the Continue Watching fixture.");
  const pageTarget = await poll("Continue Watching page", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "page" && target.url.includes("cinema.test"));
  });
  const page = await sessionFor(pageTarget);
  const contentReady = await poll("Continue Watching content script", async () => {
    return extensionPage.evaluate(`chrome.tabs.query({}).then((tabs) => {
      const tab = tabs.find((candidate) => (candidate.url || "").includes("cinema.test"));
      return tab ? chrome.tabs.sendMessage(tab.id, { kind: "getMetrics" }).catch(() => null) : null;
    })`);
  });
  assert.equal(contentReady.available, true);
  await page.evaluate(`(() => {
    const video = document.querySelector("video");
    video.dispatchEvent(new Event("loadedmetadata", { bubbles: true }));
    return true;
  })()`);
  let lastObservedState = {};
  let restored;
  try {
    restored = await poll("Continue Watching notification", async () => {
      const state = await page.evaluate(`(() => {
        const video = document.querySelector("video");
        const host = document.querySelector('[data-browser-monitor-notice="continue-watching"]');
        const rect = video?.getBoundingClientRect();
        return {
          href: location.href,
          secureContext: window.isSecureContext,
          subtleAvailable: Boolean(globalThis.crypto?.subtle),
          documentTitle: document.title,
          currentTime: video?.currentTime,
          duration: video?.duration,
          readyState: video?.readyState,
          rect: rect ? { width: rect.width, height: rect.height } : null,
          title: host?.dataset.browserMonitorMediaTitle,
          time: host?.dataset.browserMonitorMediaTime,
          link: host?.shadowRoot?.querySelector("a")?.href,
          goLabel: host?.shadowRoot?.querySelector(".go")?.textContent,
          closeLabel: host?.shadowRoot?.querySelector(".close")?.getAttribute("aria-label")
        };
      })()`);
      lastObservedState = state;
      return state.title ? state : null;
    });
  } catch (error) {
    throw new Error(`${error.message}: ${JSON.stringify(lastObservedState)}`);
  }
  assert.equal(restored.title, "Example Show — Episode 4 | Watch online");
  assert.equal(restored.time, "12:34");
  assert.equal(restored.link, mediaURL);
  assert.equal(restored.goLabel, "Перейти к плееру");
  assert.equal(restored.closeLabel, "Закрыть");

  await wait(5_000);
  assert.equal(
    await page.evaluate(`Boolean(document.querySelector('[data-browser-monitor-notice="continue-watching"]'))`),
    true,
    "Notification disappeared before the user closed it."
  );
  await page.command("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await page.command("Page.bringToFront");
  const screenshot = await page.command("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const action = await page.evaluate(`(() => {
    const host = document.querySelector('[data-browser-monitor-notice="continue-watching"]');
    const video = document.querySelector("video");
    host.shadowRoot.querySelector(".go").click();
    const focused = document.activeElement === video;
    host.shadowRoot.querySelector(".close").click();
    return { focused, closed: !document.querySelector('[data-browser-monitor-notice="continue-watching"]') };
  })()`);
  assert.deepEqual(action, { focused: true, closed: true });

  const episodeFiveIdentity = createHash("sha256")
    .update("media:cinema.test:example show episode 5:/movie/player/?episode=5")
    .digest("hex");
  await page.evaluate(`document.querySelector("video").currentTime = 0`);
  await wait(250);
  await extensionPage.evaluate(`chrome.storage.local.set({
    continueWatching: {
      version: 1,
      entries: {
        ${JSON.stringify(identity)}: { position: 754, duration: 2400, updatedAt: Date.now() },
        ${JSON.stringify(episodeFiveIdentity)}: { position: 300, duration: 2400, updatedAt: Date.now() }
      }
    }
  })`);
  await page.evaluate(`(() => {
    history.pushState({}, "", "/movie/player/?episode=5");
    document.title = "Example Show — Episode 5 | Watch online";
    document.querySelector("meta[property='og:title']").content = document.title;
    document.querySelector("h1").textContent = "Example Show — Episode 5";
    const video = document.querySelector("video");
    video.dispatchEvent(new Event("play", { bubbles: true }));
    video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    return true;
  })()`);
  const episodeFiveRestored = await poll("Episode 5 position", async () => {
    return page.evaluate(`(() => {
      const video = document.querySelector("video");
      const host = document.querySelector('[data-browser-monitor-notice="continue-watching"]');
      return host?.dataset.browserMonitorMediaTime === "5:00"
        ? { position: video.currentTime, time: host.dataset.browserMonitorMediaTime }
        : null;
    })()`);
  });

  await page.evaluate(`document.querySelector("video").currentTime = 0`);
  await wait(250);
  await extensionPage.evaluate(`chrome.storage.local.set({
    continueWatching: {
      version: 1,
      entries: {
        ${JSON.stringify(identity)}: { position: 754, duration: 2400, updatedAt: Date.now() },
        ${JSON.stringify(episodeFiveIdentity)}: { position: 300, duration: 2400, updatedAt: Date.now() }
      }
    }
  })`);
  await page.evaluate(`(() => {
    history.pushState({}, "", "/movie/player/?episode=4");
    document.title = "Example Show — Episode 4 | Watch online";
    document.querySelector("meta[property='og:title']").content = document.title;
    document.querySelector("h1").textContent = "Example Show — Episode 4";
    const video = document.querySelector("video");
    video.dispatchEvent(new Event("play", { bubbles: true }));
    video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    return true;
  })()`);
  const episodeFourRestored = await poll("Episode 4 after switching back", async () => {
    return page.evaluate(`(() => {
      const video = document.querySelector("video");
      const host = document.querySelector('[data-browser-monitor-notice="continue-watching"]');
      return host?.dataset.browserMonitorMediaTime === "12:34"
        ? { position: video.currentTime, time: host.dataset.browserMonitorMediaTime }
        : null;
    })()`);
  });
  assert.equal(episodeFourRestored.time, "12:34");
  page.socket.close();
  extensionPage.socket.close();

  console.log(JSON.stringify({
    ok: true,
    identityIsHashed: true,
    restoredAt: restored.time,
    title: restored.title,
    persistentUntilClosed: true,
    reusablePlayerEpisodeSwitch: true,
    secondEpisodeRestoredAt: episodeFiveRestored.time,
    firstEpisodeRestoredAfterSwitch: episodeFourRestored.time,
    goToPlayerFocusedVideo: action.focused,
    closeRemovedNotification: action.closed,
    screenshotPath
  }));
} finally {
  await Promise.all([stopProcess(chrome), stopProcess(server)]);
  rmSync(profile, { recursive: true, force: true });
}
