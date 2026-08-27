import { browserLanguage, localizeDocument, translate } from "../../core/localization.js";
import { withTimeout } from "../../core/async-utils.js";
import { bookmarkStructureIssues, duplicateGroups as duplicateTabGroups } from "../../features/tools/browser-health.js";
import { videoResumeURL } from "../../features/tools/startup-recap.js";
import { visibleTabGroupKey } from "../../features/tools/tab-organizer.js";

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
const headerStatisticsButton = document.querySelector("#header-statistics-button");
const feedbackButton = document.querySelector("#feedback-button");
const watchHistoryButton = document.querySelector("#watch-history-button");
const duplicateTabsButton = document.querySelector("#duplicate-tabs-button");
const siteResetButton = document.querySelector("#site-reset-button");
const reviewButton = document.querySelector("#review-button");
const toolStrip = document.querySelector("#tool-strip");
const previousTools = document.querySelector("#previous-tools");
const nextTools = document.querySelector("#next-tools");
const watchHistoryView = document.querySelector("#watch-history-view");
const watchHistoryList = document.querySelector("#watch-history-list");
const closeWatchHistory = document.querySelector("#close-watch-history");
const recentTabsButton = document.querySelector("#recent-tabs-button");
const clearRecentTabsButton = document.querySelector("#clear-recent-tabs");
const autoGroupTabsButton = document.querySelector("#auto-group-tabs");
const tabActionStatus = document.querySelector("#tab-action-status");
const recentTabsView = document.querySelector("#recent-tabs-view");
const recentTabsList = document.querySelector("#recent-tabs-list");
const closeRecentTabs = document.querySelector("#close-recent-tabs");
const tabActivityView = document.querySelector("#tab-activity-view");
const previousTabs = document.querySelector("#previous-tabs");
const nextTabs = document.querySelector("#next-tabs");
const tabPageLabel = document.querySelector("#tab-page-label");
const tabDetailPanel = document.querySelector("#tab-detail-panel");
const closeTabDetail = document.querySelector("#close-tab-detail");
const tabDetailHost = document.querySelector("#tab-detail-host");
const tabDetailScore = document.querySelector("#tab-detail-score");
const indicatorGrid = document.querySelector("#indicator-grid");
const tabDetailDot = document.querySelector("#tab-detail-dot");
const tabDetailName = document.querySelector("#tab-detail-name");
const tabDetailState = document.querySelector("#tab-detail-state");
const metricGrid = document.querySelector("#metric-grid");
const tabDetailReasons = document.querySelector("#tab-detail-reasons");
const tabDetailRecommendation = document.querySelector("#tab-detail-recommendation");
const detailEcoButton = document.querySelector("#detail-eco-button");
const metricRecentTab = document.querySelector("#metric-recent-tab");
const metricTotalTab = document.querySelector("#metric-total-tab");
const backgroundTimelineList = document.querySelector("#background-timeline-list");
const ecoDuration = document.querySelector("#eco-duration");
const ecoPreview = document.querySelector("#eco-preview");
const ecoRestoreStatus = document.querySelector("#eco-restore-status");
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
const openCookieHistory = document.querySelector("#open-cookie-history");
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
const siteResetPanel = document.querySelector("#site-reset-panel");
const closeSiteReset = document.querySelector("#close-site-reset");
const siteResetHost = document.querySelector("#site-reset-host");
const siteResetPending = document.querySelector("#site-reset-pending");
const siteResetSchedule = document.querySelector("#site-reset-schedule");
const applySiteReset = document.querySelector("#apply-site-reset");
const siteResetStatus = document.querySelector("#site-reset-status");
const reviewPanel = document.querySelector("#review-panel");
const closeReview = document.querySelector("#close-review");
const reviewCount = document.querySelector("#review-count");
const reviewTabsTab = document.querySelector("#review-tabs-tab");
const reviewBookmarksTab = document.querySelector("#review-bookmarks-tab");
const staleReviewView = document.querySelector("#stale-review-view");
const bookmarkReviewView = document.querySelector("#bookmark-review-view");
const staleAge = document.querySelector("#stale-age");
const refreshStale = document.querySelector("#refresh-stale");
const staleList = document.querySelector("#stale-list");
const selectStale = document.querySelector("#select-stale");
const closeStale = document.querySelector("#close-stale");
const saveStale = document.querySelector("#save-stale");
const scanBookmarks = document.querySelector("#scan-bookmarks");
const bookmarkList = document.querySelector("#bookmark-list");
const reviewStatus = document.querySelector("#review-status");

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
let currentStaleTabs = [];
let staleRiskById = new Map();
let metricMode = "recent";
let toolDrag = null;
let suppressToolClick = false;
let toolSnapTimer = null;
let toolPageAnimationUntil = 0;
let toolScrollAnimationFrame = 0;
let toolNavigationAnimationFrame = 0;
let toolPageOffsets = null;
let toolTargetPage = 0;
let watchThumbnailObserver = null;
let watchThumbnailEntries = new WeakMap();
let tabGroupRefreshTimer = null;
let lastTabGroupStateSignature = "";
let refreshGeneration = 0;
const t = (key, values) => translate(language, key, values);
const POPUP_REQUEST_TIMEOUT_MS = 2_500;
const POPUP_SNAPSHOT_REUSE_MS = 15_000;
const popupRequest = (message, label = message?.kind ?? "Popup request") => withTimeout(
  chrome.runtime.sendMessage(message),
  POPUP_REQUEST_TIMEOUT_MS,
  label
);

function emptySnapshot() {
  return {
    extensionEnabled: extensionToggle.checked,
    monitoringEnabled: true,
    tabs: []
  };
}

function renderLoadFailure() {
  renderSnapshot(emptySnapshot());
  summary.textContent = t("dataUnavailable");
  hostStatus.textContent = t("refreshToRetry");
  siteControlDetail.textContent = t("internalUnavailable");
  siteControlAction.textContent = "";
  ruleCount.textContent = "—";
  const empty = list.querySelector(".empty");
  if (empty) empty.textContent = t("refreshToRetry");
}

async function ensureOptionalPermission(permission, promptKey) {
  const permissions = [permission];
  if (await chrome.permissions.contains({ permissions }).catch(() => false)) return true;
  if (!confirm(t(promptKey))) return false;
  return chrome.permissions.request({ permissions }).catch(() => false);
}
const performanceTextKeys = new Map([
  ["Long main-thread blocks", "reasonLongBlocks"],
  ["Frequent style and layout recalculation", "reasonLayout"],
    ["Visible layout instability", "reasonLayoutShift"],
    ["High network resource volume", "reasonNetwork"],
    ["High resource count", "reasonResourceCount"],
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

function formatObservationTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 60) return t("durationSeconds", { count: total });
  return t("durationMinutes", { count: Math.max(1, Math.round(total / 60)) });
}

function hostname(url) {
  try { return new URL(url).hostname; } catch { return t("currentSite"); }
}

function localFaviconURL(url) {
  return chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
}

async function openExtensionTab(url) {
  const target = new URL(url);
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => {
    try {
      const current = new URL(tab.url);
      return current.origin === target.origin && current.pathname === target.pathname;
    } catch {
      return false;
    }
  });
  if (!existing?.id) return chrome.tabs.create({ url, active: true });
  const tab = await chrome.tabs.update(existing.id, { url, active: true });
  if (typeof existing.windowId === "number") {
    await chrome.windows.update(existing.windowId, { focused: true }).catch(() => null);
  }
  return tab;
}

function closePanels() {
  tabDetailPanel.hidden = true;
  cookiesPanel.hidden = true;
  duplicatesPanel.hidden = true;
  siteResetPanel.hidden = true;
  reviewPanel.hidden = true;
}

async function refreshSiteDataCleanup() {
  const state = await popupRequest({
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
    const choices = document.createElement("div");
    choices.className = "duplicate-choices";
    group.tabs.forEach((tab, index) => {
      const choice = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `duplicate-keeper-${groups.indexOf(group)}`;
      radio.value = String(tab.id);
      radio.checked = tab.active || (!group.tabs.some((entry) => entry.active) && index === 0);
      const copy = document.createElement("span");
      copy.textContent = `${tab.active ? t("duplicateActive") : t("duplicateKeep")} · ${new Date(tab.lastAccessed || Date.now()).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}`;
      choice.append(radio, copy);
      choices.append(choice);
    });
    item.append(title, detail, choices);
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
    const groupIndex = currentDuplicateGroups.indexOf(group);
    const keeperId = Number(duplicatesList.querySelector(`input[name="duplicate-keeper-${groupIndex}"]:checked`)?.value);
    const keeper = group.tabs.find((tab) => tab.id === keeperId) ?? group.tabs[0];
    ids.push(...group.tabs.filter((tab) => tab.id !== keeper.id).map((tab) => tab.id));
  }
  if (ids.length) await chrome.tabs.remove(ids);
  await openDuplicateTabs();
  await refresh();
}

function selectedResetCategories() {
  return [...siteResetPanel.querySelectorAll('.reset-categories input[type="checkbox"]:checked')]
    .map((input) => input.value);
}

async function openSiteReset() {
  if (!activeTab?.url || !/^https?:/i.test(activeTab.url)) return;
  closePanels();
  siteResetPanel.hidden = false;
  siteResetHost.textContent = hostname(activeTab.url);
  siteResetStatus.textContent = "";
  const pending = await chrome.runtime.sendMessage({ kind: "getPendingSiteResets", tabId: activeTab.id }).catch(() => ({ resets: [] }));
  siteResetPending.textContent = formatNumber(pending.resets?.length ?? 0);
}

async function applySiteResetSelection() {
  if (!activeTab?.id || !activeTab.url) return;
  const categories = selectedResetCategories();
  if (!categories.length) {
    siteResetStatus.textContent = t("siteResetChooseCategory");
    return;
  }
  const permission = await ensureOptionalPermission("browsingData", "browsingDataPermissionPrompt");
  if (!permission) {
    siteResetStatus.textContent = t("permissionRequired");
    return;
  }
  const origin = new URL(activeTab.url).origin;
  const schedule = siteResetSchedule.value;
  if (!confirm(t(schedule === "now" ? "siteResetConfirmNow" : "siteResetConfirmSchedule", { site: hostname(activeTab.url) }))) return;
  applySiteReset.disabled = true;
  const response = schedule === "now"
    ? await chrome.runtime.sendMessage({ kind: "resetSiteData", origin, categories }).catch(() => ({ ok: false }))
    : await chrome.runtime.sendMessage({
      kind: "scheduleSiteReset",
      tabId: activeTab.id,
      origin,
      categories,
      delayMinutes: schedule === "close" ? 0 : Number(schedule)
    }).catch(() => ({ ok: false }));
  applySiteReset.disabled = false;
  if (schedule === "now" && Array.isArray(response.results)) {
    siteResetStatus.textContent = response.results.map((result) => `${t(`siteResetResult_${result.category}`)}: ${t(result.ok ? "siteResetResultDone" : "siteResetResultFailed")}`).join(" · ");
  } else {
    siteResetStatus.textContent = response.ok ? t("siteResetScheduled") : t("siteResetFailed");
  }
  if (response.ok && schedule !== "now") siteResetPending.textContent = formatNumber(response.pendingCount ?? 1);
}

function reviewEmpty(target, key) {
  const empty = document.createElement("div");
  empty.className = "review-empty";
  empty.textContent = t(key);
  target.replaceChildren(empty);
}

function selectedStaleTabIds() {
  const ids = [...staleList.querySelectorAll("input[data-tab-id]:checked")].map((input) => Number(input.dataset.tabId));
  closeStale.disabled = ids.length === 0;
  saveStale.disabled = ids.length === 0;
  return ids;
}

async function loadStaleTabs() {
  const cutoff = Date.now() - Number(staleAge.value) * 86_400_000;
  currentStaleTabs = (await chrome.tabs.query({ currentWindow: true }))
    .filter((tab) => tab.id && !tab.active && !tab.pinned && !tab.audible && /^https?:/i.test(tab.url ?? "") && Number(tab.lastAccessed) > 0 && tab.lastAccessed < cutoff)
    .sort((left, right) => left.lastAccessed - right.lastAccessed);
  const riskEntries = await Promise.all(currentStaleTabs.map(async (tab) => [tab.id, await chrome.tabs.sendMessage(tab.id, { kind: "getPageRiskState" }).catch(() => ({ unsavedForm: false, activeMedia: false }))]));
  staleRiskById = new Map(riskEntries);
  reviewCount.textContent = formatNumber(currentStaleTabs.length);
  reviewStatus.textContent = currentStaleTabs.length ? "" : t("staleEmpty");
  if (!currentStaleTabs.length) {
    reviewEmpty(staleList, "staleEmpty");
    selectedStaleTabIds();
    return;
  }
  staleList.replaceChildren(...currentStaleTabs.map((tab) => {
    const row = document.createElement("label");
    row.className = "review-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.tabId = String(tab.id);
    input.addEventListener("change", selectedStaleTabIds);
    const text = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = tab.title || hostname(tab.url);
    const url = document.createElement("small");
    url.textContent = tab.url;
    text.append(title, url);
    const badge = document.createElement("span");
    badge.className = "review-badge";
    badge.textContent = t("staleDays", { count: Math.max(1, Math.floor((Date.now() - tab.lastAccessed) / 86_400_000)) });
    const risk = staleRiskById.get(tab.id);
    if (risk?.unsavedForm || risk?.activeMedia) {
      badge.textContent += ` · ${t(risk.unsavedForm ? "staleUnsaved" : "staleMedia")}`;
      row.classList.add("warning");
    }
    row.append(input, text, badge);
    return row;
  }));
  selectedStaleTabIds();
}

function flattenBookmarks(nodes, result = []) {
  for (const node of nodes ?? []) {
    if (node.url) result.push(node);
    if (node.children) flattenBookmarks(node.children, result);
  }
  return result;
}

async function runBookmarkReview() {
  scanBookmarks.disabled = true;
  scanBookmarks.setAttribute("aria-busy", "true");
  scanBookmarks.textContent = t("bookmarkChecking");
  reviewCount.textContent = "0";
  reviewEmpty(bookmarkList, "bookmarkStartScan");
  reviewStatus.textContent = "";
  try {
    const permission = await ensureOptionalPermission("bookmarks", "bookmarksPermissionPrompt");
    if (!permission) {
      reviewStatus.textContent = t("permissionRequired");
      return;
    }
    const bookmarks = flattenBookmarks(await chrome.bookmarks.getTree());
    const issues = bookmarkStructureIssues(bookmarks);
    reviewCount.textContent = formatNumber(issues.length);
    reviewStatus.textContent = t(issues.length ? "bookmarkIssuesFound" : "bookmarkHealthy", { count: issues.length || bookmarks.length });
    if (!issues.length) return reviewEmpty(bookmarkList, "bookmarkNoIssues");
    bookmarkList.replaceChildren(...issues.map(({ bookmark, type }) => {
      const row = document.createElement("div");
      row.className = "review-row";
      const marker = document.createElement("span");
      marker.textContent = type === "duplicate" ? "=" : "!";
      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = bookmark.title || bookmark.url;
      const url = document.createElement("small");
      url.textContent = bookmark.url;
      text.append(title, url);
      const badge = document.createElement("span");
      badge.className = "review-badge";
      badge.textContent = t(type === "duplicate" ? "bookmarkDuplicate" : "bookmarkInvalid");
      row.append(marker, text, badge);
      return row;
    }));
  } catch {
    reviewCount.textContent = "0";
    reviewStatus.textContent = t("bookmarkScanFailed");
    reviewEmpty(bookmarkList, "bookmarkStartScan");
  } finally {
    scanBookmarks.disabled = false;
    scanBookmarks.removeAttribute("aria-busy");
    const granted = await chrome.permissions.contains({ permissions: ["bookmarks"] }).catch(() => false);
    scanBookmarks.textContent = t(granted ? "scanBookmarksAgain" : "scanBookmarks");
  }
}

async function updateBookmarkScanAction() {
  const granted = await chrome.permissions.contains({ permissions: ["bookmarks"] }).catch(() => false);
  scanBookmarks.textContent = t(granted ? "scanBookmarksAgain" : "scanBookmarks");
}

function selectReviewView(name) {
  const tabsSelected = name === "tabs";
  reviewTabsTab.setAttribute("aria-selected", String(tabsSelected));
  reviewBookmarksTab.setAttribute("aria-selected", String(!tabsSelected));
  staleReviewView.hidden = !tabsSelected;
  bookmarkReviewView.hidden = tabsSelected;
  reviewStatus.textContent = "";
  if (tabsSelected) void loadStaleTabs();
  else {
    reviewCount.textContent = "0";
    if (!bookmarkList.children.length) reviewEmpty(bookmarkList, "bookmarkStartScan");
    void updateBookmarkScanAction();
  }
}

async function openReview() {
  closePanels();
  reviewPanel.hidden = false;
  selectReviewView("tabs");
}

function orderedToolButtons() {
  return [...toolStrip.querySelectorAll(".tool-button[data-tool-id]")];
}

const TOOLS_PER_PAGE = 4;

function toolPageTargets() {
  if (toolPageOffsets) return toolPageOffsets;
  const buttons = orderedToolButtons();
  const pageCount = Math.max(1, Math.ceil(buttons.length / TOOLS_PER_PAGE));
  const maxScroll = Math.max(0, toolStrip.scrollWidth - toolStrip.clientWidth);
  const origin = buttons[0]?.offsetLeft ?? 0;
  toolPageOffsets = Array.from(
    { length: pageCount },
    (_, index) => Math.min((buttons[index * TOOLS_PER_PAGE]?.offsetLeft ?? origin) - origin, maxScroll)
  );
  return toolPageOffsets;
}

function nearestToolPage() {
  const targets = toolPageTargets();
  return targets.reduce(
    (nearest, target, index) => Math.abs(target - toolStrip.scrollLeft) < Math.abs(targets[nearest] - toolStrip.scrollLeft) ? index : nearest,
    0
  );
}

function updateToolNavigation(page = nearestToolPage()) {
  const lastPage = toolPageTargets().length - 1;
  previousTools.disabled = page <= 0;
  nextTools.disabled = page >= lastPage;
}

function scrollToToolPage(page, behavior = "smooth") {
  const targets = toolPageTargets();
  toolTargetPage = Math.max(0, Math.min(page, targets.length - 1));
  const target = targets[toolTargetPage] ?? 0;
  clearTimeout(toolSnapTimer);
  cancelAnimationFrame(toolScrollAnimationFrame);
  updateToolNavigation(toolTargetPage);
  if (behavior !== "smooth") {
    toolPageAnimationUntil = 0;
    toolStrip.scrollTo({ left: target, behavior });
    toolStrip.classList.remove("programmatic-scroll");
    return;
  }
  const start = toolStrip.scrollLeft;
  const delta = target - start;
  if (Math.abs(delta) < 1) {
    toolPageAnimationUntil = 0;
    toolStrip.scrollLeft = target;
    toolStrip.classList.remove("programmatic-scroll");
    return;
  }
  const duration = 220;
  const started = performance.now();
  toolPageAnimationUntil = Date.now() + duration + 80;
  toolStrip.classList.add("programmatic-scroll");
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    toolStrip.scrollLeft = start + delta * eased;
    if (progress < 1) {
      toolScrollAnimationFrame = requestAnimationFrame(step);
    } else {
      toolScrollAnimationFrame = 0;
      toolStrip.scrollLeft = target;
      toolPageAnimationUntil = 0;
      toolStrip.classList.remove("programmatic-scroll");
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
  toolPageOffsets = null;
  toolTargetPage = nearestToolPage();
  updateToolNavigation(toolTargetPage);
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
  watchThumbnailObserver?.disconnect();
  watchHistoryView.hidden = true;
  tabActivityView.hidden = false;
  watchHistoryButton.classList.remove("active");
  watchHistoryButton.setAttribute("aria-pressed", "false");
}

function closeRecentTabsView() {
  recentTabsView.hidden = true;
  tabActivityView.hidden = false;
  recentTabsButton.classList.remove("active");
  recentTabsButton.setAttribute("aria-pressed", "false");
}

function renderRecentTabs(tabs = []) {
  recentTabsList.replaceChildren();
  clearRecentTabsButton.disabled = tabs.length === 0;
  if (!tabs.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("recentTabsEmpty");
    recentTabsList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const tab of tabs) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "recent-tab-item";
    item.title = tab.title;
    const icon = document.createElement("img");
    icon.className = "recent-tab-favicon";
    icon.alt = "";
    icon.src = tab.faviconURL || localFaviconURL(tab.url);
    const copy = document.createElement("span");
    copy.className = "recent-tab-copy";
    const title = document.createElement("strong");
    title.textContent = tab.title;
    const host = document.createElement("small");
    host.textContent = hostname(tab.url);
    copy.append(title, host);
    item.append(icon, copy);
    item.addEventListener("click", async () => {
      await chrome.tabs.create({ url: tab.url, active: true });
      window.close();
    });
    fragment.append(item);
  }
  recentTabsList.append(fragment);
}

async function openRecentTabsView() {
  closeWatchHistoryView();
  tabActivityView.hidden = true;
  recentTabsView.hidden = false;
  recentTabsButton.classList.add("active");
  recentTabsButton.setAttribute("aria-pressed", "true");
  recentTabsList.replaceChildren();
  const loading = document.createElement("div");
  loading.className = "empty";
  loading.textContent = t("recentTabsLoading");
  recentTabsList.append(loading);
  const result = await chrome.runtime.sendMessage({ kind: "getRecentClosedTabs" }).catch(() => ({ tabs: [] }));
  if (!recentTabsView.hidden) renderRecentTabs(result?.tabs ?? []);
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

async function loadWatchThumbnail(preview, entry) {
  if (!preview?.isConnected || !entry?.thumbnailURL || preview.dataset.loading === "true") return;
  preview.dataset.loading = "true";
  try {
    const result = await withTimeout(
      chrome.runtime.sendMessage({ kind: "getThumbnailImage", url: entry.thumbnailURL }),
      6_000,
      "Video thumbnail"
    );
    const mime = String(result?.image?.mime || "");
    const base64 = String(result?.image?.base64 || "");
    if (!/^image\/(?:avif|gif|jpe?g|png|webp)$/i.test(mime) || !/^[a-z0-9+/=]+$/i.test(base64) || !preview.isConnected) return;
    const image = document.createElement("img");
    image.className = "watch-thumbnail";
    image.alt = "";
    image.src = `data:${mime};base64,${base64}`;
    preview.replaceChildren(image);
    preview.dataset.loaded = "true";
  } catch {
    preview.dataset.failed = "true";
  } finally {
    delete preview.dataset.loading;
  }
}

function observeWatchThumbnail(preview, entry) {
  if (!entry.thumbnailURL) return;
  watchThumbnailEntries.set(preview, entry);
  if (!("IntersectionObserver" in globalThis)) {
    void loadWatchThumbnail(preview, entry);
    return;
  }
  if (!watchThumbnailObserver) {
    watchThumbnailObserver = new IntersectionObserver((observations) => {
      for (const observation of observations) {
        if (!observation.isIntersecting) continue;
        watchThumbnailObserver.unobserve(observation.target);
        void loadWatchThumbnail(observation.target, watchThumbnailEntries.get(observation.target));
      }
    }, { root: watchHistoryList, rootMargin: "80px 0px" });
  }
  watchThumbnailObserver.observe(preview);
}

function renderWatchHistory(entries = []) {
  watchThumbnailObserver?.disconnect();
  watchThumbnailEntries = new WeakMap();
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

    const preview = document.createElement("span");
    preview.className = "watch-preview";
    const kind = document.createElement("span");
    kind.className = "watch-kind";
    kind.innerHTML = watchHistoryIcon(entry.mediaType);
    preview.append(kind);
    observeWatchThumbnail(preview, entry);

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
    if (entry.removedParameters?.length) meta.textContent += ` · ${t("watchHistoryCleaned", { parameters: entry.removedParameters.join(", ") })}`;
    copy.append(site, title, meta);

    const time = document.createElement("span");
    time.className = "watch-time";
    time.textContent = formatMediaTime(entry.position);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "watch-remove";
    remove.setAttribute("aria-label", t("watchHistoryRemove"));
    remove.textContent = "×";
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      await chrome.runtime.sendMessage({ kind: "removeContinueWatchingEntry", identity: entry.identity });
      await openWatchHistoryView();
    });
    item.append(preview, copy, time, remove);
    item.addEventListener("click", async () => {
      await chrome.tabs.create({ url: videoResumeURL(entry.url, entry.position), active: true });
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
  const state = protectionActive ? t("receiptProtected") : t("receiptPaused");
  const observedSeconds = Math.max(0, (Date.now() - Number(receipt?.startedAt ?? Date.now())) / 1_000);
  privacyReceiptState.textContent = `${state} · ${t("receiptObserved", { duration: formatObservationTime(observedSeconds) })}`;
  privacyReceiptState.classList.toggle("warning", !protectionActive);
  receiptBlocked.textContent = formatNumber(receipt?.blockedRequests);
  const totalRequests = Math.max(0, Number(receipt?.totalRequests) || 0);
  const thirdPartyRequests = Math.max(0, Number(receipt?.thirdPartyRequests) || 0);
  receiptThirdParty.textContent = `${totalRequests ? Math.round(thirdPartyRequests / totalRequests * 100) : 0}%`;
  receiptCookies.textContent = formatNumber(receipt?.firstPartyCookies);
  receiptStorage.textContent = formatNumber((receipt?.localStorageKeys ?? 0) + (receipt?.sessionStorageKeys ?? 0));
  const domains = (receipt?.thirdPartyDomains ?? []).map((entry) => `${entry.domain} ×${formatNumber(entry.count)}`);
  receiptDomains.textContent = domains.length
    ? t("receiptDomains", {
      count: formatNumber(domains.length),
      requests: formatNumber(thirdPartyRequests),
      domains: domains.join(" · ")
    })
    : t("receiptNoDomains");
}

async function refreshPrivacyReceipt() {
  if (privacyReceipt.hidden || !activeTab) return;
  privacyReceiptState.textContent = t("receiptCollecting");
  try {
    const receipt = await popupRequest({
      kind: "getSitePrivacyReceipt",
      tabId: activeTab.id,
      url: activeTab.url
    });
    renderPrivacyReceipt(receipt);
  } catch {
    privacyReceiptState.textContent = t("internalUnavailable");
  }
}

function renderSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tabs)) throw new TypeError("Invalid Browser Monitor snapshot");
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
  hostStatus.textContent = t("extensionVersion", { version: chrome.runtime.getManifest().version });
  if (snapshot.stale || snapshot.error) summary.textContent = t("dataTemporarilyUnavailable");

  list.replaceChildren();
  autoGroupTabsButton.disabled = snapshot.tabs.length === 0 || !activeTab?.windowId;
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

  const hasNamedGroups = snapshot.tabs.some((tab) => visibleTabGroupKey(tab));
  const displayTabs = hasNamedGroups ? [...snapshot.tabs] : snapshot.tabs;
  if (hasNamedGroups) {
    const windowOrder = new Map();
    for (const tab of snapshot.tabs) {
      if (!windowOrder.has(tab.windowId)) windowOrder.set(tab.windowId, windowOrder.size);
    }
    displayTabs.sort((left, right) => (windowOrder.get(left.windowId) - windowOrder.get(right.windowId))
      || (Number(left.tabIndex) - Number(right.tabIndex)));
  }
  const pageCount = Math.max(1, Math.ceil(displayTabs.length / MAX_VISIBLE_TABS));
  tabPage = Math.min(tabPage, pageCount - 1);
  const pageStart = tabPage * MAX_VISIBLE_TABS;
  const visibleTabs = displayTabs.slice(pageStart, pageStart + MAX_VISIBLE_TABS);
  const groupCounts = new Map();
  for (const tab of displayTabs) {
    const key = visibleTabGroupKey(tab);
    if (!key) continue;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }

  const createTabRow = (tab) => {
    const row = document.createElement("div");
    row.className = `tab ${tab.severity}`;
    row.dataset.tabId = String(tab.tabId);
    row.classList.toggle("pinned", tab.pinned === true);

    const dot = document.createElement("span");
    dot.className = "dot";

    const icon = document.createElement("img");
    icon.className = "activity-tab-favicon";
    icon.alt = "";
    icon.src = localFaviconURL(tab.url);

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
    text.draggable = !tab.pinned;
    if (!tab.pinned) {
      text.title = t("dragTabToGroup");
      text.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-browser-monitor-tab", String(tab.tabId));
        event.dataTransfer.setData("text/plain", String(tab.tabId));
        row.classList.add("dragging");
      });
      text.addEventListener("dragend", () => row.classList.remove("dragging"));
    }

    const score = document.createElement("div");
    score.className = `load-state ${tab.severity}`;
    score.textContent = t(`severity${tab.severity[0].toUpperCase()}${tab.severity.slice(1)}`);

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = `tab-pin-button${tab.pinned ? " pinned" : ""}`;
    pinButton.title = t(tab.pinned ? "unpinTab" : "pinTab");
    pinButton.setAttribute("aria-label", pinButton.title);
    if (tab.pinned) {
      pinButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 6 0-.8 5 3.3 3.3v1.2h-5v5L11 20v-6.5H6.5v-1.2L9.8 9 9 4Z"/></svg>';
    } else {
      pinButton.textContent = "Pin";
    }
    pinButton.addEventListener("click", async () => {
      pinButton.disabled = true;
      tabActionStatus.textContent = t(tab.pinned ? "unpinningTab" : "pinningTab");
      try {
        const updated = await popupRequest({
          kind: "setTabPinned",
          tabId: tab.tabId,
          pinned: !tab.pinned
        }, "Pin tab");
        if (updated?.error) throw new Error(updated.error);
        applyTabGroupState(updated.groupState);
        tabActionStatus.textContent = t(tab.pinned ? "tabUnpinned" : "tabPinned");
      } catch {
        pinButton.disabled = false;
        tabActionStatus.textContent = t("tabPinFailed");
      }
    });

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
    row.append(dot, icon, text, score, pinButton, ecoButton);
    return row;
  };

  const buckets = [];
  const bucketByKey = new Map();
  for (const tab of visibleTabs) {
    const key = visibleTabGroupKey(tab);
    if (!key) {
      buckets.push({ key: null, tabs: [tab] });
      continue;
    }
    let bucket = bucketByKey.get(key);
    if (!bucket) {
      bucket = { key, groupId: Number(tab.groupId), tabs: [], title: tab.groupTitle.trim(), color: tab.groupColor };
      bucketByKey.set(key, bucket);
      buckets.push(bucket);
    }
    bucket.tabs.push(tab);
  }

  for (const bucket of buckets) {
    if (!bucket.key) {
      list.append(createTabRow(bucket.tabs[0]));
      continue;
    }
    const folder = document.createElement("details");
    folder.className = "tab-folder";
    folder.dataset.color = "accent";
    folder.open = true;
    const heading = document.createElement("summary");
    heading.className = "tab-folder-heading";
    heading.draggable = true;
    heading.title = t("dragTabGroup");
    const folderIcon = document.createElement("span");
    folderIcon.className = "tab-folder-icon";
    folderIcon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l1.5 2h10v9h-17v-11Z"/></svg>';
    const folderTitle = document.createElement("strong");
    folderTitle.textContent = bucket.title;
    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "tab-folder-rename";
    renameButton.title = t("renameTabGroup");
    renameButton.setAttribute("aria-label", renameButton.title);
    renameButton.draggable = false;
    renameButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16-.8 3.8L8 19l10-10-3-3L5 16Z"/><path d="m13.5 7.5 3 3"/></svg>';
    const ungroupButton = document.createElement("button");
    ungroupButton.type = "button";
    ungroupButton.className = "tab-folder-ungroup";
    ungroupButton.title = t("ungroupTabGroup");
    ungroupButton.setAttribute("aria-label", ungroupButton.title);
    ungroupButton.draggable = false;
    ungroupButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l1.5 2h10v9h-17v-11Z"/><path d="M8 14h8"/></svg>';
    const folderCount = document.createElement("span");
    folderCount.className = "tab-folder-count";
    folderCount.textContent = String(groupCounts.get(bucket.key) ?? bucket.tabs.length);
    heading.append(folderIcon, folderTitle, renameButton, ungroupButton, folderCount);
    for (const actionButton of [renameButton, ungroupButton]) {
      actionButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      actionButton.addEventListener("mousedown", (event) => event.stopPropagation());
    }
    const body = document.createElement("div");
    body.className = "tab-folder-body";
    body.replaceChildren(...bucket.tabs.map(createTabRow));
    const clearFolderDropState = () => folder.classList.remove("drag-over", "group-drop-before", "group-drop-after");
    heading.addEventListener("dragstart", (event) => {
      if (event.target.closest("button, input")) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-browser-monitor-group", String(bucket.groupId));
      event.dataTransfer.setData("text/plain", String(bucket.groupId));
      folder.classList.add("group-dragging");
    });
    heading.addEventListener("dragend", () => {
      folder.classList.remove("group-dragging");
      list.querySelectorAll(".tab-folder").forEach((candidate) => candidate.classList.remove("group-drop-before", "group-drop-after"));
    });
    const acceptDraggedTab = async (event) => {
      event.preventDefault();
      clearFolderDropState();
      const tabId = Number(event.dataTransfer.getData("application/x-browser-monitor-tab") || event.dataTransfer.getData("text/plain"));
      if (!Number.isInteger(tabId) || bucket.tabs.some((tab) => tab.tabId === tabId)) return;
      tabActionStatus.textContent = t("movingTab");
      try {
        const updated = await popupRequest({ kind: "moveTabToGroup", tabId, groupId: bucket.groupId }, "Move tab to group");
        if (updated?.error) throw new Error(updated.error);
        applyTabGroupState(updated.groupState);
        tabActionStatus.textContent = t("tabMoved");
      } catch {
        tabActionStatus.textContent = t("tabMoveFailed");
      }
    };
    const acceptDraggedGroup = async (event) => {
      event.preventDefault();
      const sourceGroupId = Number(event.dataTransfer.getData("application/x-browser-monitor-group") || event.dataTransfer.getData("text/plain"));
      const placement = folder.classList.contains("group-drop-after") ? "after" : "before";
      clearFolderDropState();
      if (!Number.isInteger(sourceGroupId) || sourceGroupId === bucket.groupId) return;
      tabActionStatus.textContent = t("movingTabGroup");
      try {
        const updated = await popupRequest({
          kind: "moveTabGroup",
          groupId: sourceGroupId,
          targetGroupId: bucket.groupId,
          placement
        }, "Move tab group");
        if (updated?.error) throw new Error(updated.error);
        applyTabGroupState(updated.groupState);
        tabActionStatus.textContent = t("tabGroupMoved");
      } catch {
        tabActionStatus.textContent = t("tabGroupMoveFailed");
      }
    };
    folder.addEventListener("dragover", (event) => {
      const types = Array.from(event.dataTransfer.types || []);
      if (types.includes("application/x-browser-monitor-group")) {
        const sourceGroupId = Number(event.dataTransfer.getData("application/x-browser-monitor-group"));
        if (sourceGroupId === bucket.groupId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const placement = event.clientY < folder.getBoundingClientRect().top + folder.getBoundingClientRect().height / 2
          ? "group-drop-before"
          : "group-drop-after";
        folder.classList.remove("group-drop-before", "group-drop-after", "drag-over");
        folder.classList.add(placement);
        return;
      }
      if (!types.includes("application/x-browser-monitor-tab")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      folder.classList.remove("group-drop-before", "group-drop-after");
      folder.classList.add("drag-over");
    });
    folder.addEventListener("dragleave", (event) => {
      if (!folder.contains(event.relatedTarget)) clearFolderDropState();
    });
    folder.addEventListener("drop", (event) => {
      const types = Array.from(event.dataTransfer.types || []);
      if (types.includes("application/x-browser-monitor-group")) void acceptDraggedGroup(event);
      else if (types.includes("application/x-browser-monitor-tab")) void acceptDraggedTab(event);
    });
    renameButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (heading.querySelector(".tab-folder-name-input")) return;
      const input = document.createElement("input");
      input.className = "tab-folder-name-input";
      input.value = bucket.title;
      input.maxLength = 80;
      input.setAttribute("aria-label", t("tabGroupName"));
      folderTitle.replaceWith(input);
      input.focus();
      input.select();
      let finished = false;
      const finishRename = async (save) => {
        if (finished) return;
        finished = true;
        const nextTitle = input.value.trim();
        if (!save || !nextTitle || nextTitle === bucket.title) {
          input.replaceWith(folderTitle);
          return;
        }
        tabActionStatus.textContent = t("renamingTabGroup");
        try {
          const updated = await popupRequest({ kind: "renameTabGroup", groupId: bucket.groupId, title: nextTitle }, "Rename tab group");
          if (updated?.error) throw new Error(updated.error);
          applyTabGroupState(updated.groupState);
          tabActionStatus.textContent = t("tabGroupRenamed");
        } catch {
          input.replaceWith(folderTitle);
          tabActionStatus.textContent = t("tabGroupRenameFailed");
        }
      };
      input.addEventListener("click", (inputEvent) => inputEvent.stopPropagation());
      input.addEventListener("keydown", (inputEvent) => {
        inputEvent.stopPropagation();
        if (inputEvent.key === "Enter") {
          inputEvent.preventDefault();
          void finishRename(true);
        } else if (inputEvent.key === "Escape") {
          inputEvent.preventDefault();
          void finishRename(false);
        }
      });
      input.addEventListener("blur", () => void finishRename(true));
    });
    ungroupButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      ungroupButton.disabled = true;
      tabActionStatus.textContent = t("ungroupingTabGroup");
      try {
        const updated = await popupRequest({ kind: "ungroupTabGroup", groupId: bucket.groupId }, "Dissolve tab group");
        if (updated?.error) throw new Error(updated.error);
        applyTabGroupState(updated.groupState);
        tabActionStatus.textContent = t("tabGroupUngrouped");
      } catch {
        ungroupButton.disabled = false;
        tabActionStatus.textContent = t("tabGroupUngroupFailed");
      }
    });
    folder.append(heading, body);
    list.append(folder);
  }

  if (pageCount > 1) {
    tabsCount.hidden = true;
    moreTabs.hidden = false;
    previousTabs.disabled = tabPage === 0;
    nextTabs.disabled = tabPage === pageCount - 1;
    tabPageLabel.textContent = `${tabPage + 1} / ${pageCount}`;
  }
}

function applyTabGroupState(groupState) {
  if (!latestSnapshot || !Array.isArray(groupState?.tabs)) throw new TypeError("Invalid tab group state");
  if (latestSnapshot.monitoringActive === false) return;
  const signature = JSON.stringify(groupState.tabs.map((tab) => [
    tab.tabId,
    tab.windowId,
    tab.tabIndex,
    tab.groupId,
    tab.groupTitle,
    tab.groupColor,
    tab.groupCollapsed,
    tab.pinned,
    tab.title,
    tab.url,
    tab.active,
    tab.audible
  ]));
  if (signature === lastTabGroupStateSignature) return;
  lastTabGroupStateSignature = signature;
  const groupTabs = new Map(groupState.tabs.map((tab) => [Number(tab.tabId), tab]));
  const mergedTabs = latestSnapshot.tabs
    .filter((tab) => groupTabs.has(Number(tab.tabId)))
    .map((tab) => ({ ...tab, ...groupTabs.get(Number(tab.tabId)) }));
  const existingIds = new Set(mergedTabs.map((tab) => Number(tab.tabId)));
  for (const tab of groupState.tabs) {
    if (existingIds.has(Number(tab.tabId))) continue;
    mergedTabs.push({
      ...tab,
      severity: "normal",
      score: 0,
      reasons: [],
      metrics: {},
      recentMetrics: null,
      recentAssessment: { severity: "normal", score: 0, reasons: [] },
      visibility: tab.active ? "visible" : "unavailable",
      measuredAt: groupState.generatedAt,
      ecoModeEnabled: false,
      ecoModeLevel: null,
      ecoRestoreStatus: null,
      sponsorBlockStatus: null
    });
  }
  renderSnapshot({ ...latestSnapshot, generatedAt: groupState.generatedAt, tabs: mergedTabs });
}

function showTabDetails(tab) {
  detailedTabId = tab.tabId;
  cookiesPanel.hidden = true;
  tabDetailPanel.hidden = false;
  tabDetailHost.textContent = hostname(tab.url);
  tabDetailName.textContent = tab.title || t("untitled");
  tabDetailScore.textContent = t(`severity${tab.severity[0].toUpperCase()}${tab.severity.slice(1)}`);
  tabDetailDot.className = `dot ${tab.severity}`;
  tabDetailDot.style.background = "";
  const backgroundDuration = Math.max(0, Number(tab.metrics?.backgroundDurationSeconds) || 0);
  const visibility = tab.active
    ? t("activeTab")
    : tab.visibility === "hidden"
      ? backgroundDuration >= 60
        ? t("backgroundFor", { duration: formatObservationTime(backgroundDuration) })
        : t("recentlyBackground")
      : t("visibleTab");
  const confidence = t(tab.measurementConfidence === "full"
    ? "measurementFull"
    : tab.measurementConfidence === "unavailable"
      ? "measurementUnavailable"
      : "measurementPartial");
  tabDetailState.textContent = `${visibility} · ${t(`severity${tab.severity[0].toUpperCase()}${tab.severity.slice(1)}`)} · ${confidence}`;
  tabDetailRecommendation.textContent = localizePerformanceText(tab.recommendation || t("noActionNeeded"));
  detailEcoButton.textContent = tab.ecoModeEnabled ? t("resumeNormalTab") : t("pauseThisTab");
  const metrics = metricMode === "recent" && tab.recentMetrics ? { ...tab.metrics, ...tab.recentMetrics } : (tab.metrics ?? {});
  metricRecentTab.setAttribute("aria-selected", String(metricMode === "recent"));
  metricTotalTab.setAttribute("aria-selected", String(metricMode === "total"));
  const indicatorLabels = {
    processor: t("indicatorProcessor"),
    network: t("indicatorNetwork"),
    stability: t("indicatorStability"),
    background: t("indicatorBackground")
  };
  indicatorGrid.replaceChildren(...Object.entries(indicatorLabels).map(([key, label]) => {
    const state = tab.indicators?.[key] ?? "normal";
    const card = document.createElement("div");
    card.className = `indicator-card ${state}`;
    const dot = document.createElement("i");
    const copy = document.createElement("span");
    copy.textContent = label;
    const value = document.createElement("strong");
    value.textContent = t(`severity${state[0].toUpperCase()}${state.slice(1)}`);
    card.append(dot, copy, value);
    return card;
  }));
  const values = [
    [t("metricLongFrames"), formatNumber(metrics.longFrameCount)],
    [t("metricBlocking"), `${Math.round(metrics.blockingDurationMS ?? 0)} ms`],
    [t("metricLayout"), `${Math.round(metrics.forcedStyleAndLayoutDurationMS ?? 0)}ms · ${(Number(metrics.layoutShiftScore) || 0).toFixed(2)}`],
    [t("metricResources"), formatNumber(metrics.resourceCount)],
    [t("metricTransferred"), formatBytes(metrics.transferBytes)],
    [t("metricBackground"), formatNumber(metrics.backgroundEventCount)],
    [t("metricMedia"), formatNumber(metrics.mediaElementCount)],
    [t("metricSample"), formatObservationTime(metrics.sampleDurationSeconds)]
  ];
  if (tab.sponsorBlockStatus) {
    values.push([t("sponsorStatus"), t(`sponsorStatus_${tab.sponsorBlockStatus}`)]);
  }
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

  const timeline = tab.recentMetrics?.timeline ?? [];
  backgroundTimelineList.replaceChildren(...timeline.filter((entry) => entry.background).slice(-20).reverse().map((entry) => {
    const item = document.createElement("li");
    const detail = entry.type === "request" ? formatBytes(entry.bytes) : entry.type === "long-frame" ? `${Math.round(entry.durationMS || 0)} ms` : (Number(entry.value) || 0).toFixed(3);
    item.textContent = `${new Date(entry.at).toLocaleTimeString(language === "ru" ? "ru-RU" : "en-US")} · ${t(`timeline_${entry.type}`)} · ${detail}`;
    return item;
  }));
  if (!backgroundTimelineList.children.length) {
    const item = document.createElement("li");
    item.textContent = t("backgroundTimelineEmpty");
    backgroundTimelineList.append(item);
  }

  const selectedLevel = document.querySelector('input[name="eco-level"]:checked')?.value ?? "limit";
  ecoPreview.textContent = t(`ecoPreview_${selectedLevel}`) + (tab.score >= 45 && !tab.ecoModeEnabled ? ` · ${t("ecoRecommended")}` : "");
  ecoRestoreStatus.textContent = tab.ecoModeEnabled
    ? t("ecoStatusActive", { level: t(`ecoLevel_${tab.ecoModeLevel ?? "limit"}`) })
    : tab.ecoRestoreStatus === "restoring" ? t("ecoStatusRestoring") : tab.ecoRestoreStatus === "restored" ? t("ecoStatusRestored") : "";

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
    const domainCell = document.createElement("td");
    domainCell.textContent = cookie.domain;
    domainCell.title = cookie.domain;

    const identityCell = document.createElement("td");
    const identity = document.createElement("div");
    identity.className = "cookie-identity";
    const name = document.createElement("span");
    name.className = "cookie-name";
    name.textContent = cookie.name || t("cookieUnnamed");
    name.title = cookie.name || t("cookieUnnamed");
    const maskedValue = document.createElement("button");
    maskedValue.className = "cookie-value-toggle";
    maskedValue.type = "button";
    maskedValue.textContent = cookie.value ? "••••••" : "—";
    maskedValue.disabled = !cookie.value;
    maskedValue.title = cookie.value ? t("cookieRevealValue") : t("cookieEmptyValue");
    maskedValue.setAttribute("aria-label", maskedValue.title);
    maskedValue.setAttribute("aria-pressed", "false");
    maskedValue.addEventListener("click", () => {
      const revealing = maskedValue.getAttribute("aria-pressed") !== "true";
      maskedValue.textContent = revealing ? cookie.value : "••••••";
      maskedValue.classList.toggle("revealed", revealing);
      maskedValue.setAttribute("aria-pressed", String(revealing));
      maskedValue.title = t(revealing ? "cookieHideValue" : "cookieRevealValue");
      maskedValue.setAttribute("aria-label", maskedValue.title);
    });
    identity.append(name, maskedValue);
    identityCell.append(identity);

    const flagsCell = document.createElement("td");
    const flagLabels = [
      cookie.secure ? "Secure" : "",
      cookie.httpOnly ? "HttpOnly" : t("cookieScriptAccessibleShort"),
      cookie.session ? t("cookieSession") : t("cookiePersistent"),
      cookie.sameSite === "unspecified" ? t("cookieSameSiteMissing") : `SameSite: ${formatCookieSameSite(cookie.sameSite)}`,
      cookie.partitionKey ? t("cookiePartitioned") : "",
      !cookie.session && Number(cookie.expirationDate) - Date.now() / 1_000 > 400 * 24 * 60 * 60 ? t("cookieLongLived") : ""
    ].filter(Boolean);
    const flags = document.createElement("span");
    flags.className = "cookie-flags-text";
    flags.textContent = flagLabels.join(", ") || "—";
    flags.title = `${flags.textContent} · ${formatCookieExpiry(cookie)}`;
    flagsCell.append(flags);
    row.append(domainCell, identityCell, flagsCell);
    return row;
  }));
  cookiesEmpty.hidden = currentCookies.length !== 0;
  cookiePageLabel.textContent = `${cookiePage + 1} / ${pageCount}`;
  previousCookies.disabled = cookiePage === 0;
  nextCookies.disabled = cookiePage === pageCount - 1;
}

function formatCookieExpiry(cookie) {
  if (cookie.session || !Number.isFinite(Number(cookie.expirationDate))) return t("cookieSessionHint");
  const expires = new Date(Number(cookie.expirationDate) * 1_000);
  return t("cookieExpires", { date: expires.toLocaleDateString(language) });
}

function formatCookieSameSite(value) {
  return ({ no_restriction:"None", lax:"Lax", strict:"Strict" })[value] ?? String(value || "—");
}

async function openCookies() {
  tabDetailPanel.hidden = true;
  cookiesPanel.hidden = false;
  const granted = await ensureOptionalPermission("cookies", "cookiesPermissionPrompt");
  if (!granted) {
    cookieStatus.textContent = t("permissionRequired");
    return;
  }
  cookiePage = 0;
  cookieStatus.textContent = t("readingCookies");
  const state = await chrome.runtime.sendMessage({ kind: "getCookieState", url: activeTab?.url, all: false });
  currentCookies = state.cookies ?? [];
  cookiesHost.textContent = state.hostname ?? hostname(activeTab?.url);
  cookiesCount.textContent = currentCookies.length;
  renderCookiePage();
  cookieStatus.textContent = state.error ?? t("cookieWarning");
}

async function requestCookieExport({ all = false, saveAs = false, copy = false } = {}) {
  const permission = copy ? "clipboardWrite" : "downloads";
  const granted = await ensureOptionalPermission(permission, copy ? "clipboardWritePermissionPrompt" : "downloadsPermissionPrompt");
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
  [activeTab] = await withTimeout(
    chrome.tabs.query({ active: true, currentWindow: true }),
    POPUP_REQUEST_TIMEOUT_MS,
    "Active tab"
  );
  if (!activeTab || !/^https?:\/\//.test(activeTab.url ?? "")) activeTab = null;
  cookiesButton.disabled = !activeTab;
  blockElementButton.disabled = !activeTab;
}

async function refreshProtection() {
  try {
    const state = await popupRequest({
      kind: "getContentBlockingState",
      tabId: activeTab?.id,
      url: activeTab?.url
    });
    if (state?.error) throw new Error(state.error);
    renderProtection(state);
  } catch {
    renderProtection({ enabled: extensionToggle.checked, contentBlockingConfigured: blockerToggle.checked });
  }
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
    const state = await popupRequest({
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
    toolStrip.prepend(state.mediaElementCount > 0 || state.active ? pipButton : cookiesButton);
    updateToolLayout();
  } catch {
    pipButton.disabled = true;
    pipStatus.textContent = t("reloadAfterInstall");
  }
}

async function refresh({ cachedFirst = false } = {}) {
  const generation = ++refreshGeneration;
  refreshButton.disabled = true;
  let initialSnapshotRendered = false;
  let cachedSnapshotIsFresh = false;
  const refreshCurrentState = async () => {
    try {
      const snapshot = await popupRequest({ kind: "collectNow" }, "Tab snapshot");
      if (generation === refreshGeneration) renderSnapshot(snapshot);
    } catch {
      if (!initialSnapshotRendered && !latestSnapshot) renderLoadFailure();
    }
    await Promise.allSettled([
      refreshProtection(),
      refreshPictureInPictureState(),
      refreshPrivacyReceipt(),
      refreshSiteDataCleanup()
    ]);
  };

  try {
    try {
      await refreshActiveTab();
    } catch {
      activeTab = null;
      cookiesButton.disabled = true;
      blockElementButton.disabled = true;
    }

    if (cachedFirst) {
      const [storedResult, groupResult] = await Promise.allSettled([
        chrome.storage.local.get({ latestSnapshot: null }),
        popupRequest({ kind: "getTabGroupState" }, "Current tab state")
      ]);
      const cachedSnapshot = storedResult.status === "fulfilled" ? storedResult.value.latestSnapshot : null;
      if (cachedSnapshot && Array.isArray(cachedSnapshot.tabs)) {
        renderSnapshot(cachedSnapshot);
        initialSnapshotRendered = true;
        if (groupResult.status === "fulfilled" && !groupResult.value?.error) {
          applyTabGroupState(groupResult.value);
          cachedSnapshotIsFresh = latestSnapshot.tabs.length > 0
            && Date.now() - Date.parse(cachedSnapshot.generatedAt) <= POPUP_SNAPSHOT_REUSE_MS;
        }
      }
    }

    if (initialSnapshotRendered) {
      if (cachedSnapshotIsFresh) {
        void Promise.allSettled([
          refreshProtection(),
          refreshPictureInPictureState(),
          refreshPrivacyReceipt(),
          refreshSiteDataCleanup()
        ]).finally(() => {
          if (generation === refreshGeneration) refreshButton.disabled = false;
        });
        return;
      }
      setTimeout(() => {
        void refreshCurrentState().finally(() => {
          if (generation === refreshGeneration) refreshButton.disabled = false;
        });
      }, 150);
      return;
    }

    await refreshCurrentState();
  } finally {
    if (!initialSnapshotRendered && generation === refreshGeneration) refreshButton.disabled = false;
  }
}

function scheduleTabGroupRefresh() {
  if (!latestSnapshot) return;
  clearTimeout(tabGroupRefreshTimer);
  tabGroupRefreshTimer = setTimeout(async () => {
    try {
      const groupState = await popupRequest({ kind: "getTabGroupState" }, "Sync Chrome tab groups");
      if (groupState?.error) throw new Error(groupState.error);
      applyTabGroupState(groupState);
    } catch {
      // The regular Refresh action remains available if Chrome closes the popup mid-sync.
    }
  }, 120);
}

for (const event of [chrome.tabGroups?.onCreated, chrome.tabGroups?.onUpdated, chrome.tabGroups?.onMoved, chrome.tabGroups?.onRemoved]) {
  event?.addListener(scheduleTabGroupRefresh);
}
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (Object.prototype.hasOwnProperty.call(changeInfo, "groupId")) scheduleTabGroupRefresh();
});
chrome.tabs.onMoved.addListener(scheduleTabGroupRefresh);
chrome.tabs.onAttached.addListener(scheduleTabGroupRefresh);
chrome.tabs.onDetached.addListener(scheduleTabGroupRefresh);

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
        files: ["features/security/crypto-guard-main.js"],
        world: "MAIN"
      });
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["features/security/page-guard.js", "core/content.js"]
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
    const granted = await ensureOptionalPermission("browsingData", "browsingDataPermissionPrompt");
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
  await openExtensionTab(chrome.runtime.getURL(`features/tools/receipt-details/receipt-details.html?tabId=${activeTab.id}`));
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
closeSiteReset.addEventListener("click", closePanels);
closeReview.addEventListener("click", closePanels);
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
    const level = document.querySelector('input[name="eco-level"]:checked')?.value ?? "limit";
    if (!tab.ecoModeEnabled && level === "deep") {
      const risk = await chrome.tabs.sendMessage(tab.tabId, { kind: "getPageRiskState" }).catch(() => ({}));
      const prompt = risk.unsavedForm || risk.activeMedia ? t("ecoDeepRiskConfirm") : t("ecoDeepConfirm");
      if (!confirm(prompt)) return;
    }
    const updated = await chrome.runtime.sendMessage({
      kind: "setEcoMode",
      tabId: tab.tabId,
      enabled: !tab.ecoModeEnabled,
      level,
      durationMinutes: Number(ecoDuration.value)
    });
    renderSnapshot(updated);
    const updatedTab = updated.tabs.find((candidate) => candidate.tabId === detailedTabId);
    if (updatedTab) showTabDetails(updatedTab);
  } finally {
    detailEcoButton.disabled = false;
  }
});

for (const button of [metricRecentTab, metricTotalTab]) button.addEventListener("click", () => {
  metricMode = button === metricRecentTab ? "recent" : "total";
  const tab = latestSnapshot?.tabs.find((candidate) => candidate.tabId === detailedTabId);
  if (tab) showTabDetails(tab);
});
document.querySelectorAll('input[name="eco-level"]').forEach((input) => input.addEventListener("change", () => {
  const tab = latestSnapshot?.tabs.find((candidate) => candidate.tabId === detailedTabId);
  if (tab) showTabDetails(tab);
}));

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
openCookieHistory.addEventListener("click", () => openExtensionTab(chrome.runtime.getURL("features/tools/cookie-history/cookie-history.html")));

refreshButton.addEventListener("click", refresh);
settingsButton.addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
});
async function openActivityPage() {
  await openExtensionTab(chrome.runtime.getURL("features/analytics/activity/activity.html"));
}
headerActivityButton.addEventListener("click", openActivityPage);
async function openStatisticsPage() {
  await openExtensionTab(chrome.runtime.getURL("features/analytics/statistics/statistics.html"));
}

headerStatisticsButton.addEventListener("click", openStatisticsPage);
siteResetButton.addEventListener("click", openSiteReset);
applySiteReset.addEventListener("click", applySiteResetSelection);
reviewButton.addEventListener("click", openReview);
reviewTabsTab.addEventListener("click", () => selectReviewView("tabs"));
reviewBookmarksTab.addEventListener("click", () => selectReviewView("bookmarks"));
staleAge.addEventListener("change", loadStaleTabs);
refreshStale.addEventListener("click", loadStaleTabs);
selectStale.addEventListener("click", () => {
  staleList.querySelectorAll("input[data-tab-id]").forEach((input) => { input.checked = true; });
  selectedStaleTabIds();
});
closeStale.addEventListener("click", async () => {
  const ids = selectedStaleTabIds();
  const risky = ids.filter((id) => staleRiskById.get(id)?.unsavedForm || staleRiskById.get(id)?.activeMedia).length;
  if (!ids.length || !confirm(t(risky ? "closeStaleRiskConfirm" : "closeStaleConfirm", { count: ids.length, risky }))) return;
  await chrome.tabs.remove(ids);
  reviewStatus.textContent = t("staleClosed", { count: ids.length });
  await loadStaleTabs();
  await refresh();
});
saveStale.addEventListener("click", async () => {
  const ids = selectedStaleTabIds();
  if (!ids.length) return;
  const permission = await ensureOptionalPermission("bookmarks", "bookmarksPermissionPrompt");
  if (!permission) return;
  const folder = await chrome.bookmarks.create({ title: `Browser Monitor — ${new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")}` });
  for (const id of ids) {
    const tab = currentStaleTabs.find((entry) => entry.id === id);
    if (tab?.url) await chrome.bookmarks.create({ parentId: folder.id, title: tab.title || hostname(tab.url), url: tab.url });
  }
  reviewStatus.textContent = t("staleSaved", { count: ids.length });
});
scanBookmarks.addEventListener("click", runBookmarkReview);
watchHistoryButton.addEventListener("click", () => {
  closeRecentTabsView();
  if (watchHistoryView.hidden) void openWatchHistoryView();
  else closeWatchHistoryView();
});
closeWatchHistory.addEventListener("click", closeWatchHistoryView);
recentTabsButton.addEventListener("click", () => {
  if (recentTabsView.hidden) void openRecentTabsView();
  else closeRecentTabsView();
});
autoGroupTabsButton.addEventListener("click", async () => {
  autoGroupTabsButton.disabled = true;
  tabActionStatus.textContent = t("groupingTabs");
  try {
    const result = await popupRequest({
      kind: "organizeCurrentWindowTabs",
      windowId: activeTab?.windowId,
      language
    }, "Group tabs");
    if (result?.error || !result?.snapshot) throw new Error(result?.error || "Tabs could not be grouped");
    tabPage = 0;
    renderSnapshot(result.snapshot);
    autoGroupTabsButton.classList.add("active");
    tabActionStatus.textContent = result.groupedTabCount
      ? t("tabsGrouped", { tabs: result.groupedTabCount, groups: result.groupCount })
      : t("noTabsToGroup");
    setTimeout(() => autoGroupTabsButton.classList.remove("active"), 1_200);
  } catch {
    tabActionStatus.textContent = t("tabGroupingFailed");
  } finally {
    autoGroupTabsButton.disabled = !latestSnapshot?.tabs?.length || !activeTab?.windowId;
  }
});
closeRecentTabs.addEventListener("click", closeRecentTabsView);
clearRecentTabsButton.addEventListener("click", async () => {
  clearRecentTabsButton.disabled = true;
  const result = await chrome.runtime.sendMessage({ kind: "clearRecentClosedTabs" }).catch(() => ({ ok: false }));
  if (result?.ok && !recentTabsView.hidden) renderRecentTabs([]);
  else if (!result?.ok) clearRecentTabsButton.disabled = false;
});
function scrollToolsWithWheel(event) {
  if (toolStrip.scrollWidth <= toolStrip.clientWidth) return;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  event.preventDefault();
  if (Math.abs(event.deltaY) < 2 || Date.now() < toolPageAnimationUntil) return;
  scrollToToolPage(toolTargetPage + Math.sign(event.deltaY));
}

toolStrip.addEventListener("wheel", scrollToolsWithWheel, { passive: false });
toolStrip.addEventListener("scroll", () => {
  if (Date.now() < toolPageAnimationUntil || toolNavigationAnimationFrame) return;
  toolNavigationAnimationFrame = requestAnimationFrame(() => {
    toolNavigationAnimationFrame = 0;
    toolTargetPage = nearestToolPage();
    updateToolNavigation(toolTargetPage);
    if (!toolDrag?.moved) scheduleToolSnap();
  });
}, { passive: true });
previousTools.addEventListener("click", () => scrollToToolPage(toolTargetPage - 1));
nextTools.addEventListener("click", () => scrollToToolPage(toolTargetPage + 1));
toolStrip.addEventListener("keydown", (event) => {
  if (event.target !== toolStrip || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  scrollToToolPage(toolTargetPage + (event.key === "ArrowRight" ? 1 : -1));
});
window.addEventListener("resize", () => {
  const currentPage = toolTargetPage;
  toolPageOffsets = null;
  updateToolLayout();
  scrollToToolPage(currentPage, "auto");
});
feedbackButton.addEventListener("click", async () => {
  const params = activeTab
    ? new URLSearchParams({ type: "site", url: activeTab.url, title: activeTab.title || "" })
    : new URLSearchParams();
  const query = params.toString();
  const feedbackURL = chrome.runtime.getURL(`features/feedback/feedback.html${query ? `?${query}` : ""}`);
  await openExtensionTab(feedbackURL);
});

async function bootstrap() {
  try {
    const { uiPreferences } = await withTimeout(
      chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } }),
      POPUP_REQUEST_TIMEOUT_MS,
      "UI preferences"
    );
    language = uiPreferences.language || browserLanguage();
    localizeDocument(language);
    document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
    await withTimeout(loadToolOrder(), POPUP_REQUEST_TIMEOUT_MS, "Tool layout");
    await refresh({ cachedFirst: true });
  } catch {
    language = browserLanguage();
    localizeDocument(language);
    renderLoadFailure();
  } finally {
    updateToolLayout();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.body.classList.remove("preload");
  }
}

bootstrap();
