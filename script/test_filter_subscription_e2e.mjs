import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.BROWSER_MONITOR_CHROME_BINARY;
assert.ok(chromeBinary && existsSync(chromeBinary), "Set BROWSER_MONITOR_CHROME_BINARY");

let extensionId;
const subscriptionURL = "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt";
const profile = mkdtempSync(join(tmpdir(), "browser-monitor-subscription-"));
const devToolsPortPath = join(profile, "DevToolsActivePort");
let chrome;

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function poll(description, check, timeout = 25_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Startup and atomic storage updates are eventually consistent.
    }
    await wait(300);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function evaluateTarget(target, expression) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, rejectPromise) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", rejectPromise, { once: true });
  });
  const response = await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => rejectPromise(new Error("DevTools evaluation timed out")), 15_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timeout);
      resolvePromise(message);
    });
    socket.send(JSON.stringify({
      id: 1,
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

async function stopProcess(process) {
  if (!process || process.exitCode !== null || process.signalCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => process.once("exit", resolvePromise)),
    wait(2_000)
  ]);
  if (process.exitCode === null && process.signalCode === null) process.kill("SIGKILL");
}

try {
  chrome = spawn(chromeBinary, [
    `--user-data-dir=${profile}`,
    `--load-extension=${join(root, "Extension")}`,
    `--disable-extensions-except=${join(root, "Extension")}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--remote-debugging-port=0",
    "about:blank"
  ], { stdio: "ignore" });

  const devToolsPort = await poll("Chrome DevTools port", () => {
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
  const popupResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(`chrome-extension://${extensionId}/popup.html`)}`,
    { method: "PUT" }
  );
  assert.ok(popupResponse.ok, "Chrome could not open the extension page");
  const popupTarget = await poll("extension page", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "page" && target.url.includes(`${extensionId}/popup.html`));
  });

  const webPageResponse = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent("https://example.com/")}`,
    { method: "PUT" }
  );
  assert.ok(webPageResponse.ok, "Chrome could not open a diagnostic web page");
  const webTarget = await poll("diagnostic web page", async () => {
    const targets = await (await fetch(`http://127.0.0.1:${devToolsPort}/json/list`)).json();
    return targets.find((target) => target.type === "page" && target.url.startsWith("https://example.com"));
  });
  const requestResult = await evaluateTarget(webTarget, `new Promise((resolve) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => resolve("timeout"), 3_000);
    script.onload = () => { clearTimeout(timeout); resolve("loaded"); };
    script.onerror = () => { clearTimeout(timeout); resolve("blocked"); };
    script.src = "https://adnxs.com/banner.js?browser-monitor=" + Date.now();
    document.documentElement.append(script);
  })`);
  assert.equal(requestResult, "blocked", "The diagnostic request was not blocked");

  const configured = await evaluateTarget(popupTarget, `chrome.runtime.sendMessage({
    kind: "setBrowserProtectionSettings",
    settings: {
      customFilterListURLs: [${JSON.stringify(subscriptionURL)}],
      customFilterListRefreshRequestedAt: new Date().toISOString()
    }
  })`);
  assert.equal(configured.ok, true, configured.error);

  const installed = await poll("downloaded filter rules", async () => {
    const result = await evaluateTarget(popupTarget, `(async () => ({
      storage: await chrome.storage.local.get(["filterSubscriptions"]),
      rules: await chrome.declarativeNetRequest.getDynamicRules()
    }))()`);
    const status = result.storage.filterSubscriptions?.find((entry) => entry.url === subscriptionURL);
    const rules = result.rules.filter((rule) => rule.id >= 630_000 && rule.id < 630_500);
    return status && !status.error && rules.length > 0 ? { status, rules } : null;
  });
  assert.ok(installed.rules.length <= 500);
  assert.equal(installed.status.networkRuleCount, installed.rules.length);
  assert.ok(installed.rules.every((rule) => rule.action.type === "block"));

  const cleared = await evaluateTarget(popupTarget, `chrome.runtime.sendMessage({
    kind: "setBrowserProtectionSettings",
    settings: { customFilterListURLs: [], customFilterListRefreshRequestedAt: new Date().toISOString() }
  })`);
  assert.equal(cleared.ok, true, cleared.error);
  await poll("subscription rule cleanup", async () => {
    const rules = await evaluateTarget(popupTarget, "chrome.declarativeNetRequest.getDynamicRules()");
    return rules.every((rule) => rule.id < 630_000 || rule.id >= 630_500);
  });

  console.log(JSON.stringify({
    ok: true,
    title: installed.status.title,
    networkRuleCount: installed.rules.length,
    cosmeticRuleCount: installed.status.cosmeticRuleCount,
    advertisingRequestBlocked: true,
    removedAfterDisable: true
  }));
} finally {
  await stopProcess(chrome);
  rmSync(profile, { recursive: true, force: true });
}
