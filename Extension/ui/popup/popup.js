import { browserLanguage, localizeDocument, translate } from "../../core/localization.js";
import { withTimeout } from "../../core/async-utils.js";
import { bookmarkStructureIssues, duplicateGroups as duplicateTabGroups } from "../../features/tools/browser-health.js";

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
const t = (key, values) => translate(language, key, values);
const POPUP_REQUEST_TIMEOUT_MS = 2_500;
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
    item.append(kind, copy, time, remove);
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
  hostStatus.textContent = t("extensionOnly");
  if (snapshot.stale || snapshot.error) summary.textContent = t("dataTemporarilyUnavailable");

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
    score.className = `load-state ${tab.severity}`;
    score.textContent = t(`severity${tab.severity[0].toUpperCase()}${tab.severity.slice(1)}`);

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
    updateToolNavigation();
  } catch {
    pipButton.disabled = true;
    pipStatus.textContent = t("reloadAfterInstall");
  }
}

async function refresh() {
  refreshButton.disabled = true;
  try {
    try {
      await refreshActiveTab();
    } catch {
      activeTab = null;
      cookiesButton.disabled = true;
      blockElementButton.disabled = true;
    }
    try {
      renderSnapshot(await popupRequest({ kind: "collectNow" }, "Tab snapshot"));
    } catch {
      renderLoadFailure();
    }
    await Promise.allSettled([
      refreshProtection(),
      refreshPictureInPictureState(),
      refreshPrivacyReceipt(),
      refreshSiteDataCleanup()
    ]);
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
    await refresh();
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
