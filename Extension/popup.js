import { browserLanguage, localizeDocument, translate } from "./localization.js";
import { duplicateTabGroups } from "./site-tools.js";

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
const cleanupSiteButton = document.querySelector("#cleanup-site-button");
const privacyReceiptButton = document.querySelector("#privacy-receipt-button");
const privacyReceipt = document.querySelector("#privacy-receipt");
const privacyReceiptDomain = document.querySelector("#privacy-receipt-domain");
const privacyReceiptState = document.querySelector("#privacy-receipt-state");
const receiptBlocked = document.querySelector("#receipt-blocked");
const receiptThirdParty = document.querySelector("#receipt-third-party");
const receiptCookies = document.querySelector("#receipt-cookies");
const receiptStorage = document.querySelector("#receipt-storage");
const receiptDomains = document.querySelector("#receipt-domains");
const receiptDetailsButton = document.querySelector("#receipt-details-button");
const siteActionStatus = document.querySelector("#site-action-status");
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
const watchHistoryButton = document.querySelector("#watch-history-button");
const duplicateTabsButton = document.querySelector("#duplicate-tabs-button");
const toolStrip = document.querySelector("#tool-strip");
const previousTools = document.querySelector("#previous-tools");
const nextTools = document.querySelector("#next-tools");
const watchHistoryView = document.querySelector("#watch-history-view");
const watchHistoryList = document.querySelector("#watch-history-list");
const closeWatchHistory = document.querySelector("#close-watch-history");
const tabActivityView = document.querySelector("#tab-activity-view");
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
const duplicatesPanel = document.querySelector("#duplicates-panel");
const closeDuplicates = document.querySelector("#close-duplicates");
const duplicatesList = document.querySelector("#duplicates-list");
const duplicatesCount = document.querySelector("#duplicates-count");
const closeAllDuplicates = document.querySelector("#close-all-duplicates");

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
let siteActionStatusTimer = null;
let currentDuplicateGroups = [];
let toolDrag = null;
let suppressToolClick = false;
let toolSnapTimer = null;
let toolPageAnimationUntil = 0;
let toolScrollAnimationFrame = 0;
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

function formatMediaTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

function hostname(url) {
  try { return new URL(url).hostname; } catch { return t("currentSite"); }
}

async function ensureDetachedPopupWindow(options = {}) {
  const { focused = false } = options;
  const popupURL = chrome.runtime.getURL("popup.html");
  const existingTabs = await chrome.tabs.query({ url: popupURL }).catch(() => []);
  const existing = existingTabs.find((tab) => typeof tab.windowId === "number");
  if (existing) {
    if (focused) await chrome.windows.update(existing.windowId, { focused: true }).catch(() => null);
    return existing.windowId;
  }
  const window = await chrome.windows.create({
    url: popupURL,
    type: "popup",
    width: 420,
    height: 600,
    focused
  });
  return window.id;
}

function refocusDetachedPopupWhenClosed(childWindowId, popupWindowId) {
  if (typeof childWindowId !== "number" || typeof popupWindowId !== "number") return;
  const onRemoved = async (closedWindowId) => {
    if (closedWindowId !== childWindowId) return;
    chrome.windows.onRemoved.removeListener(onRemoved);
    const popupWindow = await chrome.windows.get(popupWindowId).catch(() => null);
    if (popupWindow) await chrome.windows.update(popupWindowId, { focused: true }).catch(() => null);
  };
  chrome.windows.onRemoved.addListener(onRemoved);
}

async function openExtensionWindow(url, options) {
  const popupWindowId = await ensureDetachedPopupWindow().catch(() => null);
  try {
    const childWindow = await chrome.windows.create({ url, type: "popup", ...options });
    refocusDetachedPopupWhenClosed(childWindow?.id, popupWindowId);
    return childWindow;
  } catch {
    return chrome.tabs.create({ url });
  }
}

function closePanels() {
  tabDetailPanel.hidden = true;
  cookiesPanel.hidden = true;
  duplicatesPanel.hidden = true;
}

async function refreshSiteDataCleanup() {
  const state = await chrome.runtime.sendMessage({
    kind: "getSiteDataCleanupState",
    tabId: activeTab?.id,
    url: activeTab?.url
  }).catch(() => ({}));
  cleanupSiteButton.disabled = !activeTab || !state.site;
  cleanupSiteButton.setAttribute("aria-pressed", String(state.enabled === true));
}

function renderDuplicateGroups(groups) {
  currentDuplicateGroups = groups;
  const duplicateCount = groups.reduce((total, group) => total + group.tabs.length - 1, 0);
  duplicatesCount.textContent = formatNumber(duplicateCount);
  closeAllDuplicates.disabled = duplicateCount === 0;
  duplicatesList.replaceChildren();
  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("noDuplicateTabs");
    duplicatesList.append(empty);
    return;
  }
  for (const group of groups) {
    const item = document.createElement("article");
    item.className = "duplicate-group";
    const title = document.createElement("strong");
    title.textContent = group.tabs.find((tab) => tab.title)?.title || hostname(group.url);
    title.title = group.url;
    const detail = document.createElement("span");
    detail.textContent = t("duplicateCopies", { count: group.tabs.length });
    item.append(title, detail);
    duplicatesList.append(item);
  }
}

async function openDuplicateTabs() {
  closePanels();
  duplicatesPanel.hidden = false;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  renderDuplicateGroups(duplicateTabGroups(tabs));
}

async function closeDuplicateTabs() {
  const ids = [];
  for (const group of currentDuplicateGroups) {
    const keeper = group.tabs.find((tab) => tab.active) ?? group.tabs[0];
    ids.push(...group.tabs.filter((tab) => tab.id !== keeper.id).map((tab) => tab.id));
  }
  if (ids.length) await chrome.tabs.remove(ids);
  await openDuplicateTabs();
  await refresh();
}

function orderedToolButtons() {
  return [...toolStrip.querySelectorAll(".tool-button[data-tool-id]")];
}

const TOOLS_PER_PAGE = 4;

function toolPageTargets() {
  const buttons = orderedToolButtons();
  const pageCount = Math.max(1, Math.ceil(buttons.length / TOOLS_PER_PAGE));
  const maxScroll = Math.max(0, toolStrip.scrollWidth - toolStrip.clientWidth);
  const origin = buttons[0]?.offsetLeft ?? 0;
  return Array.from(
    { length: pageCount },
    (_, index) => Math.min((buttons[index * TOOLS_PER_PAGE]?.offsetLeft ?? origin) - origin, maxScroll)
  );
}

function nearestToolPage() {
  const targets = toolPageTargets();
  return targets.reduce(
    (nearest, target, index) => Math.abs(target - toolStrip.scrollLeft) < Math.abs(targets[nearest] - toolStrip.scrollLeft) ? index : nearest,
    0
  );
}

function updateToolNavigation() {
  const page = nearestToolPage();
  const lastPage = toolPageTargets().length - 1;
  previousTools.disabled = page <= 0;
  nextTools.disabled = page >= lastPage;
}

function scrollToToolPage(page, behavior = "smooth") {
  const targets = toolPageTargets();
  const target = targets[Math.max(0, Math.min(page, targets.length - 1))] ?? 0;
  clearTimeout(toolSnapTimer);
  cancelAnimationFrame(toolScrollAnimationFrame);
  if (behavior !== "smooth") {
    toolPageAnimationUntil = 0;
    toolStrip.scrollTo({ left: target, behavior });
    updateToolNavigation();
    return;
  }
  const start = toolStrip.scrollLeft;
  const delta = target - start;
  const duration = 360;
  const started = performance.now();
  toolPageAnimationUntil = Date.now() + duration + 80;
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    toolStrip.scrollLeft = start + delta * eased;
    if (progress < 1) {
      toolScrollAnimationFrame = requestAnimationFrame(step);
    } else {
      toolScrollAnimationFrame = 0;
      toolStrip.scrollLeft = target;
      updateToolNavigation();
    }
  };
  toolScrollAnimationFrame = requestAnimationFrame(step);
}

function updateToolLayout() {
  toolStrip.style.setProperty("--tool-tail-space", "0px");
  void toolStrip.offsetWidth;
  const buttons = orderedToolButtons();
  const pageCount = Math.max(1, Math.ceil(buttons.length / TOOLS_PER_PAGE));
  const origin = buttons[0]?.offsetLeft ?? 0;
  const lastPageStart = (buttons[(pageCount - 1) * TOOLS_PER_PAGE]?.offsetLeft ?? origin) - origin;
  const tailSpace = Math.max(0, lastPageStart + toolStrip.clientWidth - toolStrip.scrollWidth);
  toolStrip.style.setProperty("--tool-tail-space", `${tailSpace}px`);
  updateToolNavigation();
}

function scheduleToolSnap() {
  clearTimeout(toolSnapTimer);
  toolSnapTimer = setTimeout(() => scrollToToolPage(nearestToolPage()), 110);
}

async function loadToolOrder() {
  const { toolOrder = [] } = await chrome.storage.local.get({ toolOrder: [] });
  const byId = new Map(orderedToolButtons().map((button) => [button.dataset.toolId, button]));
  for (const id of toolOrder) {
    const button = byId.get(id);
    if (button) toolStrip.insertBefore(button, pipStatus);
  }
  updateToolLayout();
}

function persistToolOrder() {
  return chrome.storage.local.set({ toolOrder: orderedToolButtons().map((button) => button.dataset.toolId) });
}

function toolLayoutLeft(button) {
  return toolStrip.getBoundingClientRect().left + button.offsetLeft - toolStrip.scrollLeft;
}

function animateToolShift(previousPositions, draggedButton) {
  for (const button of orderedToolButtons()) {
    if (button === draggedButton || !previousPositions.has(button)) continue;
    const delta = previousPositions.get(button) - toolLayoutLeft(button);
    if (Math.abs(delta) < 1) continue;
    button.style.transition = "none";
    button.style.transform = `translateX(${delta}px)`;
    requestAnimationFrame(() => {
      button.style.transition = "";
      button.style.transform = "";
    });
  }
}

toolStrip.addEventListener("pointerdown", (event) => {
  const button = event.target.closest(".tool-button[data-tool-id]");
  if (!button || event.button !== 0) return;
  const bounds = button.getBoundingClientRect();
  toolDrag = {
    button,
    pointerId: event.pointerId,
    startX: event.clientX,
    grabOffsetX: event.clientX - bounds.left,
    layoutLeft: toolLayoutLeft(button),
    moved: false
  };
  button.setPointerCapture(event.pointerId);
});

toolStrip.addEventListener("pointermove", (event) => {
  if (!toolDrag || toolDrag.pointerId !== event.pointerId) return;
  if (!toolDrag.moved && Math.abs(event.clientX - toolDrag.startX) < 5) return;
  toolDrag.moved = true;
  toolStrip.classList.add("reordering");
  toolDrag.button.classList.add("dragging");
  const desiredLeft = event.clientX - toolDrag.grabOffsetX;
  toolDrag.button.style.setProperty("--tool-drag-x", `${desiredLeft - toolDrag.layoutLeft}px`);
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tool-button[data-tool-id]");
  if (target && target !== toolDrag.button && target.parentElement === toolStrip) {
    const previousPositions = new Map(orderedToolButtons().map((button) => [button, toolLayoutLeft(button)]));
    const before = event.clientX < target.getBoundingClientRect().left + target.offsetWidth / 2;
    toolStrip.insertBefore(toolDrag.button, before ? target : target.nextSibling);
    toolDrag.layoutLeft = toolLayoutLeft(toolDrag.button);
    toolDrag.button.style.setProperty("--tool-drag-x", `${desiredLeft - toolDrag.layoutLeft}px`);
    animateToolShift(previousPositions, toolDrag.button);
  }
  const bounds = toolStrip.getBoundingClientRect();
  if (event.clientX < bounds.left + 24) toolStrip.scrollLeft -= 18;
  if (event.clientX > bounds.right - 24) toolStrip.scrollLeft += 18;
});

async function finishToolReorder(event) {
  if (!toolDrag || toolDrag.pointerId !== event.pointerId) return;
  if (toolDrag.button.hasPointerCapture(event.pointerId)) {
    toolDrag.button.releasePointerCapture(event.pointerId);
  }
  suppressToolClick = toolDrag.moved;
  const droppedButton = toolDrag.button;
  toolDrag.button.classList.remove("dragging");
  toolStrip.classList.remove("reordering");
  toolDrag.button.style.removeProperty("--tool-drag-x");
  if (toolDrag.moved) {
    await persistToolOrder();
    updateToolLayout();
    const index = orderedToolButtons().indexOf(droppedButton);
    scrollToToolPage(Math.floor(index / TOOLS_PER_PAGE));
  }
  toolDrag = null;
  setTimeout(() => { suppressToolClick = false; }, 0);
}
toolStrip.addEventListener("pointerup", finishToolReorder);
toolStrip.addEventListener("pointercancel", finishToolReorder);

toolStrip.addEventListener("click", (event) => {
  if (suppressToolClick) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

function closeWatchHistoryView() {
  watchHistoryView.hidden = true;
  tabActivityView.hidden = false;
  watchHistoryButton.classList.remove("active");
  watchHistoryButton.setAttribute("aria-pressed", "false");
}

function watchHistoryIcon(mediaType) {
  if (mediaType === "episode") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m9 9 6 3-6 3V9Z"/></svg>';
  }
  if (mediaType === "movie") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v13H5zM5 10h14M8 6l2 4M13 6l2 4"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg>';
}

function renderWatchHistory(entries = []) {
  watchHistoryList.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("watchHistoryEmpty");
    watchHistoryList.append(empty);
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "watch-history-item";
    item.dataset.mediaType = entry.mediaType;
    item.title = t("watchHistoryOpen", { site: entry.site });

    const kind = document.createElement("span");
    kind.className = "watch-kind";
    kind.innerHTML = watchHistoryIcon(entry.mediaType);

    const copy = document.createElement("span");
    copy.className = "watch-copy";
    const site = document.createElement("span");
    site.className = "watch-site";
    site.textContent = entry.site;
    const title = document.createElement("span");
    title.className = "watch-title";
    title.textContent = entry.title || t("watchHistoryUntitled");
    const meta = document.createElement("span");
    meta.className = "watch-meta";
    const typeLabel = t(entry.mediaType === "episode"
      ? "watchHistoryEpisode"
      : entry.mediaType === "movie"
        ? "watchHistoryMovie"
        : "watchHistoryVideo");
    meta.textContent = [typeLabel, entry.episode].filter(Boolean).join(" · ");
    copy.append(site, title, meta);

    const time = document.createElement("span");
    time.className = "watch-time";
    time.textContent = formatMediaTime(entry.position);
    item.append(kind, copy, time);
    item.addEventListener("click", async () => {
      await chrome.tabs.create({ url: entry.url, active: true });
      window.close();
    });
    watchHistoryList.append(item);
  }
}

async function openWatchHistoryView() {
  tabActivityView.hidden = true;
  watchHistoryView.hidden = false;
  watchHistoryButton.classList.add("active");
  watchHistoryButton.setAttribute("aria-pressed", "true");
  watchHistoryList.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "empty";
  loading.textContent = t("watchHistoryLoading");
  watchHistoryList.append(loading);
  const result = await chrome.runtime.sendMessage({ kind: "getContinueWatchingList" }).catch(() => ({ entries: [] }));
  if (!watchHistoryView.hidden) renderWatchHistory(result?.entries ?? []);
}

function showSiteActionStatus(message) {
  clearTimeout(siteActionStatusTimer);
  siteActionStatus.textContent = message;
  siteActionStatus.hidden = false;
  siteActionStatusTimer = setTimeout(() => {
    siteActionStatus.hidden = true;
  }, 3_500);
}

function renderPrivacyReceipt(receipt) {
  privacyReceiptDomain.textContent = receipt?.domain || latestBlockerState?.domain || t("currentSite");
  const protectionActive = receipt?.protectionActive === true;
  privacyReceiptState.textContent = protectionActive ? t("receiptProtected") : t("receiptPaused");
  privacyReceiptState.classList.toggle("warning", !protectionActive);
  receiptBlocked.textContent = formatNumber(receipt?.blockedRequests);
  receiptThirdParty.textContent = formatNumber(receipt?.thirdPartyDomains?.length);
  receiptCookies.textContent = formatNumber(receipt?.firstPartyCookies);
  receiptStorage.textContent = formatNumber((receipt?.localStorageKeys ?? 0) + (receipt?.sessionStorageKeys ?? 0));
  const domains = (receipt?.thirdPartyDomains ?? []).map((entry) => entry.domain);
  receiptDomains.textContent = domains.length
    ? t("receiptDomains", { domains: domains.join(" · ") })
    : t("receiptNoDomains");
}

async function refreshPrivacyReceipt() {
  if (privacyReceipt.hidden || !activeTab) return;
  privacyReceiptState.textContent = t("receiptCollecting");
  const receipt = await chrome.runtime.sendMessage({
    kind: "getSitePrivacyReceipt",
    tabId: activeTab.id,
    url: activeTab.url
  });
  renderPrivacyReceipt(receipt);
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
  tabsCount.hidden = false;
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
    tabsCount.hidden = true;
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
  privacyReceiptButton.disabled = !domain;
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
  const paused = Boolean(state.sitePausedUntil);
  pauseSiteButton.setAttribute("aria-pressed", String(paused));
  pauseSiteButton.title = paused ? t("resumeProtection") : t("pause10");
  pauseSiteButton.setAttribute("aria-label", paused ? t("resumeProtection") : t("pause10"));
  if (!domain) {
    privacyReceipt.hidden = true;
    privacyReceiptButton.setAttribute("aria-expanded", "false");
  }
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
    await Promise.all([refreshProtection(), refreshPictureInPictureState(), refreshPrivacyReceipt(), refreshSiteDataCleanup()]);
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
        files: ["crypto-guard-main.js"],
        world: "MAIN"
      });
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["page-guard.js", "content.js"]
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
  if (!privacyReceipt.hidden) await refreshPrivacyReceipt();
});

pauseSiteButton.addEventListener("click", async () => {
  if (!latestBlockerState?.domain) return;
  const wasPaused = Boolean(latestBlockerState.sitePausedUntil);
  pauseSiteButton.disabled = true;
  const state = await chrome.runtime.sendMessage({
    kind: "setSiteTemporarilyPaused",
    domain: latestBlockerState.domain,
    durationMinutes: latestBlockerState.sitePausedUntil ? 0 : 10,
    tabId: activeTab?.id,
    url: activeTab?.url
  });
  renderProtection(state);
  privacyReceipt.hidden = true;
  privacyReceiptButton.setAttribute("aria-expanded", "false");
  showSiteActionStatus(wasPaused ? t("siteProtectionResumed") : t("sitePausedNotice"));
});

cleanupSiteButton.addEventListener("click", async () => {
  if (!activeTab) return;
  const enabling = cleanupSiteButton.getAttribute("aria-pressed") !== "true";
  if (enabling) {
    const granted = await chrome.permissions.request({ permissions: ["browsingData"] });
    if (!granted) {
      showSiteActionStatus(t("cleanupPermissionDenied"));
      return;
    }
  }
  cleanupSiteButton.disabled = true;
  const state = await chrome.runtime.sendMessage({
    kind: "setSiteDataCleanup",
    tabId: activeTab.id,
    url: activeTab.url,
    enabled: enabling
  });
  cleanupSiteButton.setAttribute("aria-pressed", String(state.enabled === true));
  cleanupSiteButton.disabled = false;
  showSiteActionStatus(state.enabled ? t("cleanupSiteDataEnabled") : t("cleanupSiteDataDisabled"));
});

privacyReceiptButton.addEventListener("click", async () => {
  const opening = privacyReceipt.hidden;
  privacyReceipt.hidden = !opening;
  privacyReceiptButton.setAttribute("aria-expanded", String(opening));
  if (opening) await refreshPrivacyReceipt();
});

receiptDetailsButton.addEventListener("click", async () => {
  if (!activeTab) return;
  await openExtensionWindow(chrome.runtime.getURL(`receipt-details.html?tabId=${activeTab.id}`), {
    width: 580,
    height: 600
  });
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
closeDuplicates.addEventListener("click", closePanels);
duplicateTabsButton.addEventListener("click", openDuplicateTabs);
closeAllDuplicates.addEventListener("click", closeDuplicateTabs);
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
settingsButton.addEventListener("click", async () => {
  await ensureDetachedPopupWindow().catch(() => null);
  await chrome.runtime.openOptionsPage();
});
async function openActivityWindow() {
  await openExtensionWindow(chrome.runtime.getURL("activity.html"), {
    width: 1120,
    height: 760
  });
}
headerActivityButton.addEventListener("click", openActivityWindow);
async function openStatisticsWindow() {
  await openExtensionWindow(chrome.runtime.getURL("statistics.html"), {
    width: 860,
    height: 680
  });
}

statisticsButton.addEventListener("click", openStatisticsWindow);
headerStatisticsButton.addEventListener("click", openStatisticsWindow);
watchHistoryButton.addEventListener("click", () => {
  if (watchHistoryView.hidden) void openWatchHistoryView();
  else closeWatchHistoryView();
});
closeWatchHistory.addEventListener("click", closeWatchHistoryView);
function scrollToolsWithWheel(event) {
  if (toolStrip.scrollWidth <= toolStrip.clientWidth) return;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  event.preventDefault();
  if (Math.abs(event.deltaY) < 2 || Date.now() < toolPageAnimationUntil) return;
  scrollToToolPage(nearestToolPage() + Math.sign(event.deltaY));
}

toolStrip.addEventListener("wheel", scrollToolsWithWheel, { passive: false });
toolStrip.addEventListener("scroll", () => {
  updateToolNavigation();
  if (!toolDrag?.moved && Date.now() >= toolPageAnimationUntil) scheduleToolSnap();
}, { passive: true });
previousTools.addEventListener("click", () => scrollToToolPage(nearestToolPage() - 1));
nextTools.addEventListener("click", () => scrollToToolPage(nearestToolPage() + 1));
toolStrip.addEventListener("keydown", (event) => {
  if (event.target !== toolStrip || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  scrollToToolPage(nearestToolPage() + (event.key === "ArrowRight" ? 1 : -1));
});
window.addEventListener("resize", () => {
  const currentPage = nearestToolPage();
  updateToolLayout();
  scrollToToolPage(currentPage, "auto");
});
feedbackButton.addEventListener("click", async () => {
  const params = activeTab
    ? new URLSearchParams({ type: "site", url: activeTab.url, title: activeTab.title || "" })
    : new URLSearchParams();
  const query = params.toString();
  const feedbackURL = chrome.runtime.getURL(`feedback.html${query ? `?${query}` : ""}`);
  await openExtensionWindow(feedbackURL, { width: 580, height: 740 });
});

async function bootstrap() {
  const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });
  language = uiPreferences.language || browserLanguage();
  localizeDocument(language);
  document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
  await loadToolOrder();
  await refresh();
  updateToolLayout();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.body.classList.remove("preload");
}

bootstrap();
