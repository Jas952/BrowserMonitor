import { browserLanguage, localizeDocument, translate } from "./localization.js";

const extensionToggle = document.querySelector("#extension-toggle");
const summary = document.querySelector("#summary");
const list = document.querySelector("#tab-list");
const tabsCount = document.querySelector("#tabs-count");
const moreTabs = document.querySelector("#more-tabs");
const hostStatus = document.querySelector("#host-status");
const refreshButton = document.querySelector("#refresh-button");
const blockerToggle = document.querySelector("#blocker-toggle");
const protectionTitle = document.querySelector("#protection-title");
const ruleCount = document.querySelector("#rule-count");
const siteToggle = document.querySelector("#site-toggle");
const siteControlTitle = document.querySelector("#site-control-title");
const siteControlDetail = document.querySelector("#site-control-detail");
const siteControlAction = document.querySelector("#site-control-action");
const pauseSiteButton = document.querySelector("#pause-site-button");
const exceptions = document.querySelector("#exceptions");
const exceptionCount = document.querySelector("#exception-count");
const exceptionList = document.querySelector("#exception-list");
const pipButton = document.querySelector("#pip-button");
const pipStatus = document.querySelector("#pip-status");
const cookiesButton = document.querySelector("#cookies-button");
const blockElementButton = document.querySelector("#block-element-button");
const statisticsButton = document.querySelector("#statistics-button");
const headerStatisticsButton = document.querySelector("#header-statistics-button");
const feedbackButton = document.querySelector("#feedback-button");
const previousTabs = document.querySelector("#previous-tabs");
const nextTabs = document.querySelector("#next-tabs");
const tabPageLabel = document.querySelector("#tab-page-label");
const tabDetailPanel = document.querySelector("#tab-detail-panel");
const closeTabDetail = document.querySelector("#close-tab-detail");
const tabDetailHost = document.querySelector("#tab-detail-host");
const tabDetailScore = document.querySelector("#tab-detail-score");
const tabDetailDot = document.querySelector("#tab-detail-dot");
const tabDetailName = document.querySelector("#tab-detail-name");
const tabDetailState = document.querySelector("#tab-detail-state");
const metricGrid = document.querySelector("#metric-grid");
const tabDetailReasons = document.querySelector("#tab-detail-reasons");
const tabDetailRecommendation = document.querySelector("#tab-detail-recommendation");
const detailEcoButton = document.querySelector("#detail-eco-button");
const cookiesPanel = document.querySelector("#cookies-panel");
const closeCookies = document.querySelector("#close-cookies");
const cookiesHost = document.querySelector("#cookies-host");
const cookiesCount = document.querySelector("#cookies-count");
const cookieTable = document.querySelector("#cookie-table");
const cookiesEmpty = document.querySelector("#cookies-empty");
const cookieFormat = document.querySelector("#cookie-format");
const exportCookies = document.querySelector("#export-cookies");
const saveAsCookies = document.querySelector("#save-as-cookies");
const copyCookies = document.querySelector("#copy-cookies");
const exportAllCookies = document.querySelector("#export-all-cookies");
const previousCookies = document.querySelector("#previous-cookies");
const nextCookies = document.querySelector("#next-cookies");
const cookiePageLabel = document.querySelector("#cookie-page-label");
const cookieStatus = document.querySelector("#cookie-status");
const settingsButton = document.querySelector("#settings-button");
const headerActivityButton = document.querySelector("#header-activity-button");

let activeTab = null;
let latestSnapshot = null;
let latestBlockerState = null;
const MAX_VISIBLE_TABS = 4;
const COOKIES_PER_PAGE = 8;
let tabPage = 0;
let cookiePage = 0;
let currentCookies = [];
let detailedTabId = null;
let language = "en";
const t = (key, values) => translate(language, key, values);
const performanceTextKeys = new Map([
  ["Long main-thread blocks", "reasonLongBlocks"],
  ["Frequent style and layout recalculation", "reasonLayout"],
  ["High network resource volume", "reasonNetwork"],
  ["Activity continues in the background", "reasonBackground"],
  ["Active media elements on the page", "reasonMedia"],
  ["No significant load sources detected", "noSignificantLoad"],
  ["This tab can remain open.", "recommendationNormal"],
  ["Keep an eye on this tab, especially in the background.", "recommendationNoticeable"],
  ["Pause media or reload this tab.", "recommendationHeavy"],
  ["Close this tab if you do not need it right now.", "recommendationCritical"]
]);
const localizePerformanceText = (value) => performanceTextKeys.has(value) ? t(performanceTextKeys.get(value)) : value;

function formatNumber(value) {
  return new Intl.NumberFormat(language).format(value ?? 0);
}

function formatBytes(value) {
  if (!value) return "0 KB";
  if (value < 1_000_000) return `${Math.round(value / 1_000)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function hostname(url) {
  try { return new URL(url).hostname; } catch { return t("currentSite"); }
}

function closePanels() {
  tabDetailPanel.hidden = true;
  cookiesPanel.hidden = true;
}

function renderSnapshot(snapshot) {
  latestSnapshot = snapshot;
  extensionToggle.checked = snapshot.extensionEnabled !== false;
  const heavyCount = snapshot.tabs.filter((tab) => tab.severity === "heavy" || tab.severity === "critical").length;
  const tabsLabel = snapshot.tabs.length === 1
    ? t("tabsCountOne")
    : t("tabsCountMany", { count: snapshot.tabs.length });
  const attentionLabel = heavyCount === 1
    ? t("attentionOne")
    : t("attentionMany", { count: heavyCount });
  summary.textContent = snapshot.extensionEnabled === false
    ? t("extensionPaused")
    : snapshot.monitoringEnabled
    ? t("tabsSummary", { tabs: tabsLabel, attention: attentionLabel })
    : t("analysisPaused");
  tabsCount.textContent = snapshot.tabs.length;
  hostStatus.textContent = t("extensionOnly");

  list.replaceChildren();
  moreTabs.hidden = true;
  if (snapshot.tabs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = snapshot.monitoringEnabled
      ? t("openRegularPage")
      : t("turnAnalysisOn");
    list.append(empty);
    return;
  }

  const pageCount = Math.max(1, Math.ceil(snapshot.tabs.length / MAX_VISIBLE_TABS));
  tabPage = Math.min(tabPage, pageCount - 1);
  const pageStart = tabPage * MAX_VISIBLE_TABS;
  const visibleTabs = snapshot.tabs.slice(pageStart, pageStart + MAX_VISIBLE_TABS);
  for (const tab of visibleTabs) {
    const row = document.createElement("div");
    row.className = `tab ${tab.severity}`;

    const dot = document.createElement("span");
    dot.className = "dot";

    const text = document.createElement("button");
    text.type = "button";
    text.className = "tab-copy";
    text.title = "Open detailed tab analytics";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = tab.title || t("untitled");
    const reason = document.createElement("div");
    reason.className = "reason";
    reason.textContent = localizePerformanceText(tab.reasons?.[0] ?? t("noSignificantLoad"));
    text.append(title, reason);
    text.addEventListener("click", () => showTabDetails(tab));

    const score = document.createElement("div");
    score.className = "score";
    score.textContent = tab.score;

    const ecoButton = document.createElement("button");
    ecoButton.className = `eco-button${tab.ecoModeEnabled ? " active" : ""}`;
    ecoButton.textContent = tab.ecoModeEnabled ? t("resumeTab") : t("pauseTab");
    ecoButton.title = tab.ecoModeEnabled
      ? t("restoreTabActivity")
      : t("pauseTabActivity");
    ecoButton.addEventListener("click", async () => {
      ecoButton.disabled = true;
      const updated = await chrome.runtime.sendMessage({
        kind: "setEcoMode",
        tabId: tab.tabId,
        enabled: !tab.ecoModeEnabled
      });
      renderSnapshot(updated);
    });
    row.append(dot, text, score, ecoButton);
    list.append(row);
  }

  if (pageCount > 1) {
    moreTabs.hidden = false;
    previousTabs.disabled = tabPage === 0;
    nextTabs.disabled = tabPage === pageCount - 1;
    tabPageLabel.textContent = `${tabPage + 1} / ${pageCount}`;
  }
}

function showTabDetails(tab) {
  detailedTabId = tab.tabId;
  cookiesPanel.hidden = true;
  tabDetailPanel.hidden = false;
  tabDetailHost.textContent = hostname(tab.url);
  tabDetailName.textContent = tab.title || t("untitled");
  tabDetailScore.textContent = tab.score;
  tabDetailDot.className = `dot ${tab.severity}`;
  tabDetailDot.style.background = "";
  const visibility = tab.active ? t("activeTab") : (tab.visibility === "hidden" ? t("backgroundTab") : t("visibleTab"));
  tabDetailState.textContent = `${visibility} · ${t(`severity${tab.severity[0].toUpperCase()}${tab.severity.slice(1)}`)}`;
  tabDetailRecommendation.textContent = localizePerformanceText(tab.recommendation || t("noActionNeeded"));
  detailEcoButton.textContent = tab.ecoModeEnabled ? t("resumeNormalTab") : t("pauseThisTab");

  const metrics = tab.metrics ?? {};
  const values = [
    [t("metricLongFrames"), formatNumber(metrics.longFrameCount)],
    [t("metricBlocking"), `${Math.round(metrics.blockingDurationMS ?? 0)} ms`],
    [t("metricLayout"), `${Math.round(metrics.forcedStyleAndLayoutDurationMS ?? 0)} ms`],
    [t("metricResources"), formatNumber(metrics.resourceCount)],
    [t("metricTransferred"), formatBytes(metrics.transferBytes)],
    [t("metricBackground"), formatNumber(metrics.backgroundEventCount)],
    [t("metricMedia"), formatNumber(metrics.mediaElementCount)],
    [t("metricSample"), `${Math.round(metrics.sampleDurationSeconds ?? 0)} s`]
  ];
  metricGrid.replaceChildren(...values.map(([label, value]) => {
    const card = document.createElement("div");
    card.className = "metric-card";
    const caption = document.createElement("span");
    caption.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    card.append(caption, strong);
    return card;
  }));

  const reasons = tab.reasons?.length ? tab.reasons : [t("noSignificantLoad")];
  tabDetailReasons.replaceChildren(...reasons.slice(0, 4).map((reason) => {
    const item = document.createElement("li");
    item.textContent = localizePerformanceText(reason);
    return item;
  }));
}

function renderCookiePage() {
  const pageCount = Math.max(1, Math.ceil(currentCookies.length / COOKIES_PER_PAGE));
  cookiePage = Math.min(cookiePage, pageCount - 1);
  const visible = currentCookies.slice(cookiePage * COOKIES_PER_PAGE, (cookiePage + 1) * COOKIES_PER_PAGE);
  cookieTable.replaceChildren(...visible.map((cookie) => {
    const row = document.createElement("tr");
    const values = [
      cookie.domain,
      cookie.name,
      cookie.value,
      `${cookie.secure ? "S" : "—"}${cookie.httpOnly ? " H" : ""}`
    ];
    row.append(...values.map((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      cell.title = value;
      return cell;
    }));
    return row;
  }));
  cookiesEmpty.hidden = currentCookies.length !== 0;
  cookiePageLabel.textContent = `${cookiePage + 1} / ${pageCount}`;
  previousCookies.disabled = cookiePage === 0;
  nextCookies.disabled = cookiePage === pageCount - 1;
}

async function openCookies() {
  tabDetailPanel.hidden = true;
  cookiesPanel.hidden = false;
  const granted = await chrome.permissions.request({ permissions: ["cookies"] }).catch(() => false);
  if (!granted) {
    cookieStatus.textContent = t("permissionRequired");
    return;
  }
  cookiePage = 0;
  cookieStatus.textContent = t("readingCookies");
  const state = await chrome.runtime.sendMessage({
    kind: "getCookieState",
    url: activeTab?.url,
    all: false
  });
  currentCookies = state.cookies ?? [];
  cookiesHost.textContent = state.hostname ?? hostname(activeTab?.url);
  cookiesCount.textContent = currentCookies.length;
  renderCookiePage();
  cookieStatus.textContent = state.error ?? t("cookieWarning");
}

async function requestCookieExport({ all = false, saveAs = false, copy = false } = {}) {
  const permission = copy ? "clipboardWrite" : "downloads";
  const granted = await chrome.permissions.request({ permissions: [permission] }).catch(() => false);
  if (!granted) {
    cookieStatus.textContent = t("permissionRequired");
    return;
  }
  const format = cookieFormat.value;
  cookieStatus.textContent = copy ? t("preparingCopy") : t("preparingExport");
  if (copy) {
    const payload = await chrome.runtime.sendMessage({
      kind: "getCookieExportText", url: activeTab?.url, all, format
    });
    if (payload.error) {
      cookieStatus.textContent = payload.error;
      return;
    }
    await navigator.clipboard.writeText(payload.text);
    cookieStatus.textContent = t("cookiesCopied", { count: payload.cookies.length });
    return;
  }
  const result = await chrome.runtime.sendMessage({
    kind: "downloadCookies", url: activeTab?.url, all, format, saveAs
  });
  cookieStatus.textContent = result.ok
    ? t("cookiesExported", { count: result.count, filename: result.filename })
    : (result.error ?? t("cookieExportFailed"));
}

function renderExceptions(sites) {
  exceptionList.replaceChildren();
  exceptionCount.textContent = sites.length;
  exceptions.hidden = sites.length === 0;
  for (const domain of sites) {
    const row = document.createElement("div");
    row.className = "exception-row";
    const label = document.createElement("span");
    label.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = t("remove");
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      const state = await chrome.runtime.sendMessage({
        kind: "setSiteAllowlisted",
        domain,
        allowlisted: false,
        tabId: activeTab?.id,
        url: activeTab?.url
      });
      renderProtection(state);
    });
    row.append(label, remove);
    exceptionList.append(row);
  }
}

function renderProtection(state) {
  latestBlockerState = state;
  const enabled = state?.enabled !== false;
  blockerToggle.checked = state?.contentBlockingConfigured ?? enabled;
  protectionTitle.textContent = enabled ? t("protectionOn") : t("protectionOff");
  const networkRules = formatNumber(state?.ruleCount);
  const cosmeticRules = formatNumber(state?.cosmeticRuleCount);
  ruleCount.textContent = t("filtersCount", { network: networkRules, cosmetic: cosmeticRules });

  const domain = state?.domain;
  siteToggle.disabled = !enabled || !domain;
  pauseSiteButton.disabled = !enabled || !domain || state.siteAllowlisted;
  siteControlTitle.textContent = domain || t("currentSite");
  if (!domain) {
    siteControlDetail.textContent = t("internalUnavailable");
    siteControlAction.textContent = "";
  } else if (state.siteAllowlisted) {
    siteControlDetail.textContent = t("allowedHere");
    siteControlAction.textContent = t("protectSite");
  } else {
    siteControlDetail.textContent = state.sitePausedUntil
      ? t("pausedUntil", { time: new Date(state.sitePausedUntil).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) })
      : t("protectionActiveHere");
    siteControlAction.textContent = t("excludeSite");
  }
  pauseSiteButton.textContent = state.sitePausedUntil ? t("resume") : t("pause10");
  renderExceptions(state?.allowlistedSites ?? []);
}

async function refreshActiveTab() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !/^https?:\/\//.test(activeTab.url ?? "")) activeTab = null;
  cookiesButton.disabled = !activeTab;
  blockElementButton.disabled = !activeTab;
}

async function refreshProtection() {
  const state = await chrome.runtime.sendMessage({
    kind: "getContentBlockingState",
    tabId: activeTab?.id,
    url: activeTab?.url
  });
  renderProtection(state);
}

async function refreshPictureInPictureState() {
  if (!activeTab) {
    pipButton.disabled = true;
    pipButton.classList.remove("active");
    pipButton.setAttribute("aria-pressed", "false");
    pipStatus.textContent = t("internalUnavailable");
    return;
  }
  try {
    const state = await chrome.runtime.sendMessage({
      kind: "getPictureInPictureState",
      tabId: activeTab.id
    });
    pipButton.disabled = state.mediaElementCount === 0 && !state.active;
    pipButton.classList.toggle("active", state.active);
    pipButton.setAttribute("aria-pressed", String(state.active));
    pipStatus.textContent = state.active
      ? t("pictureInPictureActive")
      : (state.mediaElementCount > 0
          ? (state.mediaElementCount === 1 ? t("videoFoundOne") : t("videoFoundMany", { count: state.mediaElementCount }))
          : t("noVideoFound"));
  } catch {
    pipButton.disabled = true;
    pipStatus.textContent = t("reloadAfterInstall");
  }
}

async function refresh() {
  refreshButton.disabled = true;
  try {
    await refreshActiveTab();
    const snapshot = await chrome.runtime.sendMessage({ kind: "collectNow" });
    renderSnapshot(snapshot);
    await Promise.all([refreshProtection(), refreshPictureInPictureState()]);
  } finally {
    refreshButton.disabled = false;
  }
}

async function playActivationAnimationInActiveTab() {
  if (typeof activeTab?.id !== "number" || !/^https?:/.test(activeTab.url ?? "")) return false;
  const message = { kind: "playActivationAnimation" };
  try {
    const result = await chrome.tabs.sendMessage(activeTab.id, message);
    return result?.ok === true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content.js"]
      });
      const result = await chrome.tabs.sendMessage(activeTab.id, message);
      return result?.ok === true;
    } catch {
      return false;
    }
  }
}

extensionToggle.addEventListener("change", async () => {
  const enabled = extensionToggle.checked;
  extensionToggle.disabled = true;
  try {
    const snapshot = await chrome.runtime.sendMessage({ kind: "setExtensionEnabled", enabled });
    if (!snapshot || snapshot.error) throw new Error(snapshot?.error || "Extension state is unavailable");
    renderSnapshot(snapshot);
    if (enabled) await playActivationAnimationInActiveTab();
  } catch {
    extensionToggle.checked = !enabled;
    await refresh().catch(() => {});
  } finally {
    extensionToggle.disabled = false;
  }
});

blockerToggle.addEventListener("change", async () => {
  blockerToggle.disabled = true;
  try {
    await chrome.runtime.sendMessage({
      kind: "setContentBlocking",
      enabled: blockerToggle.checked
    });
    await refreshProtection();
  } finally {
    blockerToggle.disabled = false;
  }
});

siteToggle.addEventListener("click", async () => {
  if (!latestBlockerState?.domain) return;
  siteToggle.disabled = true;
  const state = await chrome.runtime.sendMessage({
    kind: "setSiteAllowlisted",
    domain: latestBlockerState.domain,
    allowlisted: !latestBlockerState.siteAllowlisted,
    tabId: activeTab?.id,
    url: activeTab?.url
  });
  renderProtection(state);
});

pauseSiteButton.addEventListener("click", async () => {
  if (!latestBlockerState?.domain) return;
  pauseSiteButton.disabled = true;
  const state = await chrome.runtime.sendMessage({
    kind: "setSiteTemporarilyPaused",
    domain: latestBlockerState.domain,
    durationMinutes: latestBlockerState.sitePausedUntil ? 0 : 10,
    tabId: activeTab?.id,
    url: activeTab?.url
  });
  renderProtection(state);
});

pipButton.addEventListener("click", async () => {
  if (!activeTab) return;
  pipButton.disabled = true;
  pipStatus.textContent = t("openingPiP");
  const result = await chrome.runtime.sendMessage({
    kind: "togglePictureInPicture",
    tabId: activeTab.id
  });
  pipStatus.textContent = result.message;
  pipButton.classList.toggle("active", result.active);
  pipButton.setAttribute("aria-pressed", String(result.active));
  pipButton.disabled = false;
});

previousTabs.addEventListener("click", () => {
  if (tabPage === 0 || !latestSnapshot) return;
  tabPage -= 1;
  renderSnapshot(latestSnapshot);
});

nextTabs.addEventListener("click", () => {
  if (!latestSnapshot) return;
  const pageCount = Math.ceil(latestSnapshot.tabs.length / MAX_VISIBLE_TABS);
  if (tabPage >= pageCount - 1) return;
  tabPage += 1;
  renderSnapshot(latestSnapshot);
});

closeTabDetail.addEventListener("click", closePanels);
closeCookies.addEventListener("click", closePanels);
cookiesButton.addEventListener("click", openCookies);
blockElementButton.addEventListener("click", async () => {
  if (!activeTab) return;
  const result = await chrome.tabs.sendMessage(activeTab.id, { kind: "startElementPicker" });
  if (result?.ok) window.close();
});

detailEcoButton.addEventListener("click", async () => {
  const tab = latestSnapshot?.tabs.find((candidate) => candidate.tabId === detailedTabId);
  if (!tab) return;
  detailEcoButton.disabled = true;
  try {
    const updated = await chrome.runtime.sendMessage({
      kind: "setEcoMode",
      tabId: tab.tabId,
      enabled: !tab.ecoModeEnabled
    });
    renderSnapshot(updated);
    const updatedTab = updated.tabs.find((candidate) => candidate.tabId === detailedTabId);
    if (updatedTab) showTabDetails(updatedTab);
  } finally {
    detailEcoButton.disabled = false;
  }
});

previousCookies.addEventListener("click", () => {
  if (cookiePage === 0) return;
  cookiePage -= 1;
  renderCookiePage();
});

nextCookies.addEventListener("click", () => {
  if ((cookiePage + 1) * COOKIES_PER_PAGE >= currentCookies.length) return;
  cookiePage += 1;
  renderCookiePage();
});

exportCookies.addEventListener("click", () => requestCookieExport());
saveAsCookies.addEventListener("click", () => requestCookieExport({ saveAs: true }));
copyCookies.addEventListener("click", () => requestCookieExport({ copy: true }));
exportAllCookies.addEventListener("click", () => {
  const approved = confirm(
    t("exportAllConfirm")
  );
  if (approved) requestCookieExport({ all: true, saveAs: true });
});

refreshButton.addEventListener("click", refresh);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
async function openActivityWindow() {
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL("activity.html"),
      type: "popup",
      width: 1120,
      height: 760
    });
  } catch {
    await chrome.tabs.create({ url: chrome.runtime.getURL("activity.html") });
  }
}
headerActivityButton.addEventListener("click", openActivityWindow);
async function openStatisticsWindow() {
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL("statistics.html"),
      type: "popup",
      width: 860,
      height: 680
    });
  } catch {
    await chrome.tabs.create({ url: chrome.runtime.getURL("statistics.html") });
  }
}

statisticsButton.addEventListener("click", openStatisticsWindow);
headerStatisticsButton.addEventListener("click", openStatisticsWindow);
feedbackButton.addEventListener("click", async () => {
  const params = activeTab
    ? new URLSearchParams({ type: "site", url: activeTab.url, title: activeTab.title || "" })
    : new URLSearchParams();
  const query = params.toString();
  const feedbackURL = chrome.runtime.getURL(`feedback.html${query ? `?${query}` : ""}`);
  try {
    await chrome.windows.create({ url: feedbackURL, type: "popup", width: 580, height: 740 });
  } catch {
    await chrome.tabs.create({ url: feedbackURL });
  }
});

async function bootstrap() {
  const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });
  language = uiPreferences.language || browserLanguage();
  localizeDocument(language);
  document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
  await refresh();
}

bootstrap();
