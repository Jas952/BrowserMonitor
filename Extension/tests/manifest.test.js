import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("manifest is valid Manifest V3 JSON", () => {
  const manifestURL = new URL("../manifest.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestURL, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Browser Monitor");
  assert.equal(manifest.version, "1.0.1");
  assert.ok(!("key" in manifest));
  assert.equal(manifest.background.type, "module");
  assert.ok(!manifest.permissions.includes("nativeMessaging"));
  assert.ok(manifest.permissions.includes("declarativeNetRequest"));
  assert.ok(!manifest.permissions.includes("declarativeNetRequestFeedback"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(manifest.permissions.includes("webRequest"));
  assert.ok(!manifest.permissions.includes("cookies"));
  assert.ok(!manifest.permissions.includes("downloads"));
  assert.ok(!manifest.permissions.includes("clipboardWrite"));
  assert.deepEqual(manifest.optional_permissions, ["clipboardWrite", "cookies", "downloads", "history"]);
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.permissions.includes("favicon"));
  for (const permission of ["bookmarks", "sidePanel", "tabGroups"]) {
    assert.ok(!manifest.permissions.includes(permission), `${permission} is no longer needed`);
  }
  assert.ok(!("side_panel" in manifest));
  for (const path of ["activity.html", "activity.css", "activity-page.js", "activity-statistics.js", "feedback.html", "feedback.css", "feedback.js"]) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`);
  }
  assert.deepEqual(
    manifest.declarative_net_request.rule_resources.map((ruleset) => ruleset.id),
    ["easylist", "easyprivacy", "ruadlist"]
  );
  assert.deepEqual(Object.keys(manifest.icons), ["16", "32", "48", "128"]);
  assert.ok(Object.values(manifest.icons).every((path) => existsSync(new URL(`../${path}`, import.meta.url))));
  assert.deepEqual(Object.keys(manifest.action.default_icon), ["16", "32"]);
  assert.deepEqual(manifest.options_ui, { page: "options.html", open_in_tab: true });
  for (const path of [
    "link-safety.js",
    "link-warning.html",
    "link-warning.css",
    "link-warning.js",
    "rules/easylist-cookie-cosmetic.css",
    "rules/ruadlist-network.json",
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
  assert.match(popupHTML, /id="header-statistics-button"/);
  assert.match(popupHTML, /id="header-activity-button"/);
  assert.doesNotMatch(popupHTML, /id="activity-button"|id="activity-tab-button"/);
  assert.match(popupHTML, /id="feedback-button"/);
  assert.doesNotMatch(popupHTML, /id="report-site-button"/);
  assert.match(popupHTML, /class="footer-icon-button"/);
  assert.match(popupHTML, /id="extension-toggle"/);
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
  assert.match(popupCSS, /\.tool-button\s*\{[^}]*flex:\s*1 1 0/s);
  assert.match(popupCSS, /\.eco-button\s*\{[^}]*width:\s*52px/s);
  assert.match(popupCSS, /\.protection-detail\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
  assert.match(popupCSS, /\.app-header\s*\{[^}]*padding:\s*20px 30px 17px 20px/s);
  assert.doesNotMatch(serviceWorker, /sendNativeMessage/, "One-shot native messaging leaks host processes in Chrome");
  assert.doesNotMatch(serviceWorker, /onRuleMatchedDebug|recentBlockedResources/);
  assert.match(popupJS, /kind: "playActivationAnimation"/);
  assert.match(popupJS, /chrome\.scripting\.executeScript/);
  const contentScript = readFileSync(new URL("../content.js", import.meta.url), "utf8");
  assert.doesNotMatch(serviceWorker, /Browser Workspace/);
  assert.match(serviceWorker, /browser-monitor-allowlist-site/);
  assert.match(serviceWorker, /Exclude this site from blocking/);
  assert.match(serviceWorker, /useContextTarget: true/);
  assert.match(contentScript, /selectorForCurrentSite/);
  assert.match(contentScript, /contextMenuTarget/);
  assert.match(contentScript, /browser-monitor-activation-overlay/);
  assert.match(contentScript, /__browserMonitorContentLoaded/);
  assert.match(contentScript, /Protection and analysis are active/);
  assert.match(contentScript, /pathLength="1"/);
  assert.match(contentScript, /ytd-ad-slot-renderer/);
  assert.match(contentScript, /\.html5-video-player\.ad-showing/);
  assert.match(contentScript, /YOUTUBE_SKIP_SELECTOR/);
  assert.match(contentScript, /getSponsorSegments/);
  assert.match(contentScript, /videoProtectionRoots/);
  assert.match(
    contentScript,
    /if \(new URL\(href\)\.origin === location\.origin\) return false;/,
    "Link Safety must not replace same-origin SPA navigation"
  );
  assert.match(contentScript, /VIDEO_ACTIVE_POLL_MS = 2_500/);
  assert.match(contentScript, /VIDEO_HIDDEN_POLL_MS = 15_000/);
  assert.match(contentScript, /new MutationObserver\(scheduleEcoModeScan\)/);
  assert.doesNotMatch(contentScript, /const hasVideo = queryVideoRoots\("video"\)\.length > 0/);
  assert.match(serviceWorker, /BLOCKING_STATISTICS_FLUSH_DELAY_MS = 2_000/);
  assert.match(serviceWorker, /BLOCKING_STATISTICS_BATCH_SIZE = 500/);
  assert.match(serviceWorker, /displayActionCountAsBadgeText:\s*Boolean\(enabled\)/);
  assert.match(serviceWorker, /const previous = await extensionEnabledStorage\(\)/);
  assert.match(popupHTML, /id="statistics-button"/);
  assert.match(popupJS, /statistics\.html/);
  assert.match(popupJS, /activity\.html/);
  assert.match(popupJS, /feedback\.html/);
  assert.match(popupJS, /type: "site"/);
  assert.doesNotMatch(popupJS, /activityButton|activityTabButton|reportSiteButton/);
  assert.doesNotMatch(popupJS, /workspace\.html|sidePanel/);
  assert.doesNotMatch(contentScript, /class="check"|draw-check/);
});

test("options page exposes separate settings panels without reports", () => {
  const html = readFileSync(new URL("../options.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../options.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../options.js", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

  for (const section of ["general", "protection", "privacy", "appearance", "rules", "data"]) {
    assert.match(html, new RegExp(`id="${section}"`));
    assert.match(html, new RegExp(`data-section-target="${section}"`));
  }
  assert.match(html, /data-i18n="filterListsGroup"/);
  assert.match(html, /data-i18n="pageCleanupGroup"/);
  assert.match(html, /data-i18n="sectionPrivacyTools"/);
  for (const premiumControl of [
    "cookieBannerBlockingEnabled", "newsletterBlockingEnabled", "surveyBlockingEnabled",
    "notificationPromptBlockingEnabled", "floatingVideoBlockingEnabled", "videoAdProtectionEnabled",
    "sponsorSegmentSkippingEnabled", "imageSwapEnabled"
  ]) {
    assert.match(html, new RegExp(`data-setting="${premiumControl}"`));
  }
  assert.match(html, /value="custom"/);
  assert.match(html, /id="image-file-input"/);
  assert.match(html, /id="export-settings"/);
  assert.match(html, /data-link-safety-setting="enabled"/);
  assert.match(html, /id="linkSafetyAllowedDomains"/);
  assert.match(html, /id="linkSafetyBlockedDomains"/);
  assert.match(html, /id="historyPrivacyEnabled"/);
  assert.match(html, /id="historyPrivacyDomains"/);
  assert.match(script, /permissions\.request\(\{ permissions: \["history"\]/);
  assert.match(script, /kind: "setLinkSafetySettings"/);
  assert.match(script, /kind: "setHistoryPrivacySettings"/);
  assert.match(script, /sectionAliases/);
  assert.match(script, /aria-controls/);
  assert.match(script, /enhanceSettingControls/);
  assert.match(script, /aria-labelledby/);
  assert.match(script, /aria-describedby/);
  assert.match(script, /role", "switch"/);
  assert.match(script, /linkSafetyAllowedDomains/);
  assert.match(serviceWorker, /kind === "evaluateLinkSafety"/);
  assert.match(serviceWorker, /allowLinkSafetyDomain/);
  assert.match(serviceWorker, /blockLinkSafetyDomain/);
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

test("blocking statistics use a dedicated localized window", () => {
  const html = readFileSync(new URL("../statistics.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../statistics.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../statistics-page.js", import.meta.url), "utf8");
  assert.match(html, /id="today-total"/);
  assert.match(html, /id="seven-day-total"/);
  assert.match(html, /id="top-sites"/);
  assert.match(html, /id="blocked-resources"/);
  assert.match(script, /changes\.blockingStatistics/);
  assert.match(script, /kind: "getBlockingStatistics"/);
  assert.match(css, /grid-template-columns:\s*1fr 1fr/);
});

test("link warning page exposes continue and allow-domain actions", () => {
  const html = readFileSync(new URL("../link-warning.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../link-warning.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../link-warning.js", import.meta.url), "utf8");
  const buildScript = readFileSync(new URL("../../script/build_release.mjs", import.meta.url), "utf8");

  assert.match(html, /id="continue-button"/);
  assert.match(html, /id="allow-button"/);
  assert.match(html, /id="destination-domain"/);
  assert.match(script, /allowLinkSafetyDomain/);
  assert.match(script, /action === "block"/);
  assert.match(script, /Последняя проверка перед переходом :\)/);
  assert.match(css, /\.warning-panel/);
  assert.match(buildScript, /"link-warning\.html"/);
});

test("activity and feedback surfaces are bilingual and privacy explicit", () => {
  const activity = readFileSync(new URL("../activity-page.js", import.meta.url), "utf8");
  const feedbackHTML = readFileSync(new URL("../feedback.html", import.meta.url), "utf8");
  const feedback = readFileSync(new URL("../feedback.js", import.meta.url), "utf8");
  assert.match(activity, /en:\s*\{/);
  assert.match(activity, /ru:\s*\{/);
  assert.match(activity, /Site activity/);
  assert.match(activity, /Аналитика посещений/);
  assert.match(feedbackHTML, /type="email"/);
  assert.match(feedbackHTML, /value="site"/);
  assert.match(feedbackHTML, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(feedback, /github\.com\/Jas952\/BrowserMonitor\/issues\/new/);
  assert.match(feedback, /MAX_OUTBOX_BYTES = 6 \* 1024 \* 1024/);
  assert.match(feedback, /Nothing is sent silently/);
  assert.match(feedback, /kind: "getContentBlockingState"/);
  assert.match(feedback, /kind: "getBrowserProtectionSettings"/);
  assert.match(feedback, /Site filter report/);
  assert.match(feedback, /feedbackEmail/);
});
