import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("manifest is valid Manifest V3 JSON", () => {
  const manifestURL = new URL("../manifest.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestURL, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Browser Monitor");
  assert.equal(manifest.version, "1.0.0");
  assert.ok(!("key" in manifest));
  assert.equal(manifest.background.type, "module");
  assert.ok(!manifest.permissions.includes("nativeMessaging"));
  assert.ok(manifest.permissions.includes("declarativeNetRequest"));
  assert.ok(!manifest.permissions.includes("declarativeNetRequestFeedback"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(!manifest.permissions.includes("cookies"));
  assert.ok(!manifest.permissions.includes("downloads"));
  assert.ok(!manifest.permissions.includes("clipboardWrite"));
  assert.deepEqual(manifest.optional_permissions, ["clipboardWrite", "cookies", "downloads"]);
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.deepEqual(
    manifest.declarative_net_request.rule_resources.map((ruleset) => ruleset.id),
    ["easylist", "easyprivacy"]
  );
  assert.deepEqual(Object.keys(manifest.icons), ["16", "32", "48", "128"]);
  assert.ok(Object.values(manifest.icons).every((path) => existsSync(new URL(`../${path}`, import.meta.url))));
  assert.deepEqual(Object.keys(manifest.action.default_icon), ["16", "32"]);
  assert.deepEqual(manifest.options_ui, { page: "options.html", open_in_tab: true });
  for (const path of [
    "rules/ruadlist-cosmetic.css",
    "rules/fanboy-social-cosmetic.css",
    "rules/antiadblock-cosmetic.css",
    "rules/cryptomining-rules.js"
  ]) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`);
  }
  assert.deepEqual(
    manifest.web_accessible_resources[0].resources,
    ["images/image-swap-*.svg", "icons/browser-monitor-core.svg"]
  );
  assert.ok(existsSync(new URL("../icons/browser-monitor-core.svg", import.meta.url)));
  for (const theme of ["landscape", "ocean", "minimal"]) {
    assert.ok(existsSync(new URL(`../images/image-swap-${theme}.svg`, import.meta.url)));
  }
});

test("popup UI is localized and reserves stable control widths", () => {
  const popupHTML = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
  const popupCSS = readFileSync(new URL("../popup.css", import.meta.url), "utf8");
  const popupJS = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const localization = readFileSync(new URL("../localization.js", import.meta.url), "utf8");

  assert.match(localization, /ru:\s*\{/);
  assert.match(localization, /en:\s*\{/);
  assert.match(localization, /filtersCount:\s*"\{network\} \+ \{cosmetic\} фильтров"/);
  assert.match(popupHTML, /data-i18n="appName"/);
  assert.match(popupHTML, /id="settings-button"/);
  assert.match(popupHTML, /class="brand-icon"/);
  assert.doesNotMatch(popupHTML, />MACCLEANER</);
  assert.match(popupHTML, /class="tool-button"/);
  assert.match(popupHTML, /id="cookies-panel"/);
  assert.match(popupHTML, /id="tab-detail-panel"/);
  assert.match(popupHTML, /id="previous-tabs"/);
  assert.doesNotMatch(popupHTML, /id="blocked-today"/);
  assert.match(popupJS, /chrome\.permissions\.request\(\{ permissions: \["cookies"\]/);
  assert.match(popupJS, /const MAX_VISIBLE_TABS = 4;/);
  assert.match(popupCSS, /body\s*\{[^}]*width:\s*420px[^}]*height:\s*600px[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(popupCSS, /main\s*\{[^}]*overflow:\s*auto/s);
  assert.match(popupCSS, /#site-control-action\s*\{[^}]*width:\s*78px/s);
  assert.match(popupCSS, /\.tool-button\s*\{[^}]*width:\s*66px/s);
  assert.match(popupCSS, /\.eco-button\s*\{[^}]*width:\s*52px/s);
  assert.match(popupCSS, /\.protection-detail\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
  assert.match(popupCSS, /\.app-header\s*\{[^}]*padding:\s*20px 30px 17px 20px/s);
  assert.doesNotMatch(serviceWorker, /sendNativeMessage/, "One-shot native messaging leaks host processes in Chrome");
  assert.doesNotMatch(serviceWorker, /onRuleMatchedDebug|recentBlockedResources/);
  assert.match(popupJS, /kind: "playActivationAnimation"/);
  assert.match(popupJS, /chrome\.scripting\.executeScript/);
  const contentScript = readFileSync(new URL("../content.js", import.meta.url), "utf8");
  assert.match(contentScript, /browser-monitor-activation-overlay/);
  assert.match(contentScript, /__browserMonitorContentLoaded/);
  assert.match(contentScript, /Protection and analysis are active/);
  assert.match(contentScript, /pathLength="1"/);
  assert.doesNotMatch(contentScript, /class="check"|draw-check/);
});

test("options page exposes separate settings panels without reports", () => {
  const html = readFileSync(new URL("../options.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../options.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../options.js", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

  for (const section of ["general", "filters", "page-elements", "appearance", "rules", "data"]) {
    assert.match(html, new RegExp(`id="${section}"`));
    assert.match(html, new RegExp(`data-section-target="${section}"`));
  }
  for (const premiumControl of [
    "cookieBannerBlockingEnabled", "newsletterBlockingEnabled", "surveyBlockingEnabled",
    "notificationPromptBlockingEnabled", "floatingVideoBlockingEnabled", "imageSwapEnabled"
  ]) {
    assert.match(html, new RegExp(`data-setting="${premiumControl}"`));
  }
  assert.match(html, /value="custom"/);
  assert.match(html, /id="image-file-input"/);
  assert.match(html, /id="export-settings"/);
  assert.doesNotMatch(html, /id="analytics"|id="analytics-tab-list"|id="history-chart"/);
  assert.doesNotMatch(html, /id="resource-list"|id="clear-resources"/);
  assert.doesNotMatch(html, /vpnTitle|vpnDescription|vpn-card/);
  assert.match(html, /id="import-settings"/);
  assert.match(html, /data-theme-value="solarized"/);
  assert.match(html, /data-theme-value="forest"/);
  assert.doesNotMatch(html, /<iframe/i);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(script, /localizeDocument/);
  assert.match(script, /showSection/);
  assert.doesNotMatch(script, /IntersectionObserver|renderAnalytics|analyticsHistory/);
  assert.doesNotMatch(serviceWorker, /connectNative|nativePort|nativeHostConnected/);
});
