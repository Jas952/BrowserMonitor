import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("manifest is valid Manifest V3 JSON", () => {
  const manifestURL = new URL("../manifest.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(manifestURL, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Browser Monitor");
  assert.equal(manifest.version, "1.1.3");
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
  assert.deepEqual(manifest.optional_permissions, ["browsingData", "clipboardWrite", "cookies", "downloads", "history"]);
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.permissions.includes("favicon"));
  for (const permission of ["bookmarks", "sidePanel", "tabGroups"]) {
    assert.ok(!manifest.permissions.includes(permission), `${permission} is no longer needed`);
  }
  assert.ok(!("side_panel" in manifest));
  for (const path of [
    "features/analytics/activity/activity.html",
    "features/analytics/activity/activity.css",
    "features/analytics/activity/activity-page.js",
    "features/analytics/activity-statistics.js",
    "features/feedback/feedback.html",
    "features/feedback/feedback.css",
    "features/feedback/feedback.js"
  ]) {
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} is missing`);
  }
  assert.deepEqual(
    manifest.declarative_net_request.rule_resources.map((ruleset) => ruleset.id),
    ["easylist", "easyprivacy", "ruadlist"]
  );
  assert.deepEqual(Object.keys(manifest.icons), ["16", "32", "48", "128"]);
  assert.ok(Object.values(manifest.icons).every((path) => existsSync(new URL(`../${path}`, import.meta.url))));
  assert.deepEqual(Object.keys(manifest.action.default_icon), ["16", "32"]);
  assert.deepEqual(manifest.action.default_icon, {
    "16": "icons/browser-monitor-toolbar-16.png",
    "32": "icons/browser-monitor-toolbar-32.png"
  });
  assert.ok(Object.values(manifest.action.default_icon).every((path) => existsSync(new URL(`../${path}`, import.meta.url))));
  assert.deepEqual(manifest.options_ui, { page: "ui/options/options.html", open_in_tab: true });
  assert.deepEqual(manifest.content_scripts[0].js, ["features/security/page-guard.js", "core/content.js"]);
  assert.ok(existsSync(new URL("../features/security/page-guard.js", import.meta.url)));
  assert.deepEqual(manifest.content_scripts[1].js, ["features/security/page-guard.js", "features/tools/video-resume-frame.js"]);
  assert.equal(manifest.content_scripts[1].all_frames, true);
  assert.ok(existsSync(new URL("../features/tools/video-resume-frame.js", import.meta.url)));
  const frameResume = readFileSync(new URL("../features/tools/video-resume-frame.js", import.meta.url), "utf8");
  assert.match(frameResume, /window === window\.top/);
  assert.match(frameResume, /pagehide/);
  assert.match(frameResume, /seeked/);
  assert.match(frameResume, /visibilitychange/);
  assert.match(frameResume, /document\.addEventListener\("play"/);
  assert.match(frameResume, /trackedVideos\.get\(video\)\?\.source === source/);
  assert.match(frameResume, /force: true/);
  assert.match(frameResume, /getContinueWatchingPosition/);
  assert.match(frameResume, /setContinueWatchingPosition/);
  assert.deepEqual(manifest.content_scripts[2].js, ["features/security/crypto-guard-main.js"]);
  assert.equal(manifest.content_scripts[2].world, "MAIN");
  assert.ok(existsSync(new URL("../features/security/crypto-guard-main.js", import.meta.url)));
  for (const path of [
    "features/security/link-safety.js",
    "features/security/link-warning/link-warning.html",
    "features/security/link-warning/link-warning.css",
    "features/security/link-warning/link-warning.js",
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
  assert.ok(existsSync(new URL("../icons/browser-monitor-shield-48.png", import.meta.url)));
  for (const theme of ["landscape", "ocean", "minimal"]) {
    assert.ok(existsSync(new URL(`../images/image-swap-${theme}.svg`, import.meta.url)));
  }
});

test("standalone extension pages use the exact shield header asset", () => {
  for (const page of [
    "features/analytics/activity/activity.html",
    "features/analytics/statistics/statistics.html",
    "features/tools/receipt-details/receipt-details.html",
    "ui/options/options.html",
    "features/feedback/feedback.html"
  ]) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /src="(?:\.\.\/)+icons\/browser-monitor-shield-48\.png"/);
  }
});

test("popup UI is localized and reserves stable control widths", () => {
  const popupHTML = readFileSync(new URL("../ui/popup/popup.html", import.meta.url), "utf8");
  const popupCSS = readFileSync(new URL("../ui/popup/popup.css", import.meta.url), "utf8");
  const popupJS = readFileSync(new URL("../ui/popup/popup.js", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../core/service-worker.js", import.meta.url), "utf8");
  const localization = readFileSync(new URL("../core/localization.js", import.meta.url), "utf8");

  assert.match(localization, /ru:\s*\{/);
  assert.match(localization, /en:\s*\{/);
  assert.match(localization, /filtersCount:\s*"\{network\} \+ \{cosmetic\} фильтров"/);
  assert.match(popupHTML, /<link rel="stylesheet" href="popup\.css">/);
  assert.match(popupHTML, /data-i18n="appName"/);
  assert.match(popupHTML, /id="settings-button"/);
  assert.match(popupHTML, /id="header-statistics-button"/);
  assert.match(popupHTML, /id="header-activity-button"/);
  assert.doesNotMatch(popupHTML, /id="activity-button"|id="activity-tab-button"/);
  assert.match(popupHTML, /id="feedback-button"/);
  assert.match(popupHTML, /id="privacy-receipt-button"/);
  assert.match(popupHTML, /id="watch-history-button"/);
  assert.match(popupHTML, /id="tool-strip"[^>]*tabindex="0"/);
  assert.match(popupHTML, /id="previous-tools"/);
  assert.match(popupHTML, /id="next-tools"/);
  assert.match(popupHTML, /aria-roledescription="carousel"/);
  assert.doesNotMatch(popupHTML, /id="tool-scroll-track"|id="tool-scroll-thumb"/);
  assert.match(popupHTML, /id="watch-history-view"/);
  assert.match(popupHTML, /id="close-watch-history"/);
  assert.match(popupHTML, /id="privacy-receipt"/);
  assert.match(popupHTML, /id="site-action-status"/);
  assert.match(popupHTML, /aria-controls="privacy-receipt"/);
  assert.doesNotMatch(popupHTML, /id="report-site-button"/);
  assert.match(popupHTML, /class="footer-icon-button"/);
  assert.match(popupHTML, /id="extension-toggle"[^>]*checked/);
  assert.match(popupHTML, /id="blocker-toggle"[^>]*checked/);
  assert.match(popupHTML, /class="brand-icon"/);
  assert.doesNotMatch(popupHTML, />MACCLEANER</);
  assert.match(popupHTML, /class="tool-button"/);
  assert.match(popupHTML, /id="cookies-panel"/);
  assert.match(popupHTML, /id="tab-detail-panel"/);
  assert.match(popupHTML, /id="previous-tabs"/);
  assert.doesNotMatch(popupHTML, /id="blocked-today"/);
  assert.match(popupJS, /chrome\.permissions\.request\(\{ permissions: \["cookies"\]/);
  assert.match(popupJS, /const MAX_VISIBLE_TABS = 4;/);
  assert.match(popupJS, /kind: "getSitePrivacyReceipt"/);
  assert.match(popupJS, /kind: "getContinueWatchingList"/);
  assert.match(popupJS, /toolStrip\.addEventListener\("wheel"/);
  assert.match(popupJS, /const TOOLS_PER_PAGE = 4/);
  assert.match(popupJS, /scrollToToolPage/);
  assert.match(popupJS, /openExtensionTab/);
  assert.match(popupJS, /openExtensionWindow/);
  assert.match(popupJS, /extensionWindowOpens = new Map\(\)/);
  assert.match(popupJS, /extensionWindowOpens\.get\(key\)/);
  assert.match(popupJS, /finally\(\(\) =>/);
  assert.match(popupJS, /current\.pathname === target\.pathname/);
  assert.match(popupJS, /matches\.slice\(1\)/);
  assert.match(popupJS, /tabId: existing\.id/);
  assert.match(popupJS, /owner\?\.type !== "popup"/);
  assert.match(popupJS, /target\.pathname\.endsWith\("\/popup\.html"\)/);
  assert.doesNotMatch(popupJS, /ensureDetachedPopupWindow|refocusDetachedPopupWhenClosed/);
  assert.doesNotMatch(popupJS, /getURL\("popup\.html"\)/);
  assert.match(popupJS, /requestAnimationFrame\(step\)/);
  assert.match(popupJS, /previousTools\.addEventListener\("click"/);
  assert.match(popupJS, /nextTools\.addEventListener\("click"/);
  assert.match(popupJS, /animateToolShift/);
  assert.match(popupJS, /--tool-drag-x/);
  assert.doesNotMatch(popupJS, /toolScrollTrack|updateToolScrollIndicator/);
  assert.doesNotMatch(popupJS, /setTimeout\(\(\) => document\.body\.classList\.remove\("preload"\)/);
  assert.match(popupJS, /chrome\.tabs\.create\(\{ url: entry\.url, active: true \}\)/);
  assert.match(popupJS, /sitePausedNotice/);
  assert.match(popupCSS, /body\s*\{[^}]*width:\s*420px[^}]*height:\s*600px[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(popupCSS, /main\s*\{[^}]*overflow:\s*auto/s);
  assert.match(popupCSS, /#site-control-action\s*\{[^}]*width:\s*78px/s);
  assert.match(popupCSS, /\.tool-strip\s*\{[^}]*overflow-x:\s*auto[^}]*scrollbar-width:\s*none/s);
  assert.match(popupCSS, /\.utility-section\s*\{[^}]*padding:\s*9px 16px/s);
  assert.match(popupCSS, /\.tool-strip\s*\{[^}]*min-height:\s*40px[^}]*padding:\s*4px 0/s);
  assert.match(popupCSS, /\.tool-button\s*\{[^}]*flex:\s*0 0 calc\(\(100% - 15px\) \/ 4\)/s);
  assert.match(popupCSS, /\.tool-button:nth-of-type\(4n \+ 1\)/);
  assert.match(popupCSS, /\.tool-carousel:hover \.tool-nav/);
  assert.match(popupCSS, /\.tool-nav\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(popupCSS, /\.tool-nav svg\s*\{[^}]*stroke-width:\s*1\.35/s);
  assert.match(popupCSS, /\.tool-button\.dragging\s*\{[^}]*scale\(1\.06\)/s);
  assert.match(popupCSS, /\.site-actions:hover[^}]*background:\s*var\(--panel\)/s);
  assert.match(popupCSS, /\.tool-strip\.reordering \.tool-button:not\(\.dragging\)\s*\{[^}]*260ms/s);
  assert.doesNotMatch(popupHTML, /id="utilities-title"/);
  assert.match(popupHTML, /id="previous-tools"[^>]*>\s*<svg/s);
  assert.match(popupHTML, /id="next-tools"[^>]*>\s*<svg/s);
  assert.match(popupCSS, /\.duplicates-list\s*\{[^}]*flex:\s*1[^}]*overflow-y:\s*auto/s);
  assert.match(popupCSS, /\.eco-button\s*\{[^}]*width:\s*52px/s);
  assert.match(popupCSS, /\.protection-detail\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
  assert.match(popupCSS, /\.app-header\s*\{[^}]*padding:\s*20px 30px 17px 20px/s);
  assert.match(popupCSS, /\.app-header\s*\{[^}]*gap:\s*8px/s);
  assert.match(popupCSS, /\.brand-icon\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/s);
  assert.doesNotMatch(popupCSS, /\.brand-icon\s*\{[^}]*(?:opacity|filter):/s);
  assert.match(
    popupCSS,
    /\.preload \.toggle-control input\s*\{[^}]*visibility:\s*hidden/s,
    "Toggle state must stay hidden until popup initialization finishes"
  );
  assert.doesNotMatch(serviceWorker, /sendNativeMessage/, "One-shot native messaging leaks host processes in Chrome");
  assert.doesNotMatch(serviceWorker, /onRuleMatchedDebug|recentBlockedResources/);
  assert.match(popupJS, /kind: "playActivationAnimation"/);
  assert.match(popupJS, /chrome\.scripting\.executeScript/);
  const contentScript = readFileSync(new URL("../core/content.js", import.meta.url), "utf8");
  assert.doesNotMatch(serviceWorker, /Browser Workspace/);
  assert.match(serviceWorker, /browser-monitor-allowlist-site/);
  assert.match(serviceWorker, /Exclude this site from blocking/);
  assert.match(serviceWorker, /useContextTarget: true/);
  assert.match(contentScript, /selectorForCurrentSite/);
  assert.match(contentScript, /handleCryptoCopy/);
  assert.match(contentScript, /initializeContinueWatching/);
  assert.match(contentScript, /h1\.ytd-watch-metadata yt-formatted-string/);
  assert.match(contentScript, /yt-navigate-finish/);
  assert.match(contentScript, /configureSearchProtection/);
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
  assert.match(serviceWorker, /chrome\.webRequest\.onBeforeRequest/);
  assert.match(serviceWorker, /getSitePrivacyReceipt/);
  assert.match(serviceWorker, /verifyCryptoGuardPaste/);
  assert.match(serviceWorker, /CONTINUE_WATCHING_KEY/);
  assert.match(serviceWorker, /getContinueWatchingList/);
  assert.match(serviceWorker, /mediaType/);
  assert.match(serviceWorker, /displayActionCountAsBadgeText:\s*false/);
  assert.match(serviceWorker, /chrome\.action\.setBadgeText\(\{ text: "" \}\)/);
  assert.doesNotMatch(serviceWorker, /setBadgeBackgroundColor/);
  assert.match(serviceWorker, /const previous = await extensionEnabledStorage\(\)/);
  assert.match(popupHTML, /id="statistics-button"/);
  assert.match(popupJS, /statistics\.html/);
  assert.match(popupJS, /activity\.html/);
  assert.match(popupJS, /feedback\.html/);
  assert.match(popupJS, /openExtensionWindow\(feedbackURL, \{ width: 580, height: 740 \}\)/);
  assert.match(popupJS, /type: "site"/);
  assert.doesNotMatch(popupJS, /activityButton|activityTabButton|reportSiteButton/);
  assert.doesNotMatch(popupJS, /workspace\.html|sidePanel/);
  assert.doesNotMatch(contentScript, /class="check"|draw-check/);
});

test("options page exposes separate settings panels without reports", () => {
  const html = readFileSync(new URL("../ui/options/options.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../ui/options/options.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../ui/options/options.js", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../core/service-worker.js", import.meta.url), "utf8");

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
  assert.match(html, /data-i18n="cryptoGuardTitle"/);
  assert.match(html, /data-i18n="continueWatchingTitle"/);
  assert.doesNotMatch(html, /id="cryptoGuardEnabled"/);
  assert.match(script, /permissions\.request\(\{ permissions: \["history"\]/);
  assert.match(script, /kind: "setLinkSafetySettings"/);
  assert.match(script, /kind: "setHistoryPrivacySettings"/);
  assert.match(script, /sectionAliases/);
  assert.match(script, /aria-controls/);
  assert.match(script, /enhanceSettingControls/);
  assert.match(script, /aria-labelledby/);
  assert.doesNotMatch(script, /chrome\.windows\.create/);
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

test("blocking statistics use a dedicated localized page", () => {
  const html = readFileSync(new URL("../features/analytics/statistics/statistics.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../features/analytics/statistics/statistics.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../features/analytics/statistics/statistics-page.js", import.meta.url), "utf8");
  assert.match(html, /id="today-total"/);
  assert.match(html, /id="seven-day-total"/);
  assert.match(html, /id="top-sites"/);
  assert.match(html, /id="blocked-resources"/);
  assert.match(script, /changes\.blockingStatistics/);
  assert.match(script, /kind: "getBlockingStatistics"/);
  assert.match(css, /grid-template-columns:\s*1fr 1fr/);
});

test("link warning page exposes compact safe-first actions", () => {
  const html = readFileSync(new URL("../features/security/link-warning/link-warning.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../features/security/link-warning/link-warning.css", import.meta.url), "utf8");
  const script = readFileSync(new URL("../features/security/link-warning/link-warning.js", import.meta.url), "utf8");
  const buildScript = readFileSync(new URL("../../script/build_release.mjs", import.meta.url), "utf8");

  assert.match(html, /id="continue-button"/);
  assert.match(html, /id="allow-button"/);
  assert.match(html, /id="destination-domain"/);
  assert.doesNotMatch(html, /id="source-domain"/);
  assert.doesNotMatch(html, /Browser Monitor<\/span>/);
  assert.doesNotMatch(html, /id="warning-risk"/);
  assert.doesNotMatch(html, /id="reason-list"/);
  assert.match(html, /class="primary" type="button">Go back/);
  assert.match(script, /allowLinkSafetyDomain/);
  assert.match(script, /action === "block"/);
  assert.match(script, /isRussian/);
  assert.match(script, /Не вводите пароль, seed-фразу/);
  assert.match(css, /\.warning-panel/);
  assert.match(css, /\.signal svg/);
  assert.match(buildScript, /"features"/);
  assert.match(buildScript, /runtimeDirectories/);
  assert.match(buildScript, /module is missing from the package/);
});

test("activity and feedback surfaces are bilingual and privacy explicit", () => {
  const activity = readFileSync(new URL("../features/analytics/activity/activity-page.js", import.meta.url), "utf8");
  const feedbackHTML = readFileSync(new URL("../features/feedback/feedback.html", import.meta.url), "utf8");
  const feedback = readFileSync(new URL("../features/feedback/feedback.js", import.meta.url), "utf8");
  assert.match(activity, /en:\s*\{/);
  assert.match(activity, /ru:\s*\{/);
  assert.match(activity, /Site activity/);
  assert.match(activity, /Аналитика посещений/);
  assert.match(feedbackHTML, /type="email"/);
  assert.match(feedbackHTML, /value="site"/);
  assert.match(feedbackHTML, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(feedback, /FEEDBACK_RECIPIENT_EMAIL/);
  assert.match(feedback, /FEEDBACK_ENDPOINT_URL/);
  assert.match(feedback, /sendFeedbackRequest/);
  assert.match(feedback, /fetch\(FEEDBACK_ENDPOINT_URL/);
  assert.doesNotMatch(feedback, /mailto:/);
  assert.doesNotMatch(feedback, /github\.com\/Jas952\/BrowserMonitor\/issues\/new/);
  assert.match(feedback, /MAX_OUTBOX_BYTES = 6 \* 1024 \* 1024/);
  assert.match(feedback, /feedback endpoint/);
  assert.match(feedback, /Request sent/);
  assert.match(feedback, /kind: "getContentBlockingState"/);
  assert.match(feedback, /kind: "getBrowserProtectionSettings"/);
  assert.match(feedback, /Site filter report/);
  assert.match(feedback, /feedbackEmail/);
});
