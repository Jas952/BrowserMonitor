import { browserLanguage, localizeDocument, translate } from "../../../core/localization.js";

const todayTotal = document.querySelector("#today-total");
const sevenDayTotal = document.querySelector("#seven-day-total");
const networkTotal = document.querySelector("#network-total");
const videoTotal = document.querySelector("#video-total");
const blockedShare = document.querySelector("#blocked-share");
const todayBreakdown = document.querySelector("#today-breakdown");
const chart = document.querySelector("#activity-chart");
const topSites = document.querySelector("#top-sites");
const blockedResources = document.querySelector("#blocked-resources");
const topSitesEmpty = document.querySelector("#top-sites-empty");
const resourcesEmpty = document.querySelector("#resources-empty");
const siteCount = document.querySelector("#site-count");
const resourceCount = document.querySelector("#resource-count");
const updatedAt = document.querySelector("#updated-at");
const clearStatistics = document.querySelector("#clear-statistics");
const blockingSources = document.querySelector("#blocking-sources");
const blockingCategories = document.querySelector("#blocking-categories");
const journalRows = document.querySelector("#journal-rows");
let currentSite = null;

let language = "en";
let refreshTimer = null;
const t = (key, values) => translate(language, key, values);
const number = (value) => new Intl.NumberFormat(language).format(value ?? 0);

function renderList(target, entries) {
  target.replaceChildren(...entries.map((entry, index) => {
    const row = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "entry-name";
    name.textContent = entry.name;
    name.title = entry.name;
    const count = document.createElement("span");
    count.className = "entry-count";
    count.textContent = number(entry.count);
    row.append(rank, name, count);
    return row;
  }));
}

function render(summary) {
  const today = summary.today ?? { total: 0, types: { network: 0, sponsor: 0, video: 0 } };
  todayTotal.textContent = number(today.total);
  sevenDayTotal.textContent = number(summary.sevenDayTotal);
  networkTotal.textContent = number(today.types.network);
  videoTotal.textContent = number(today.types.video + today.types.sponsor);
  blockedShare.textContent = `${number(summary.blockedShare)}%`;
  todayBreakdown.textContent = t("statisticsBreakdown", { network: number(today.types.network), video: number(today.types.video), sponsor: number(today.types.sponsor) });
  updatedAt.textContent = summary.updatedAt
    ? new Date(summary.updatedAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : t("waitingForBlocks");

  const maximum = Math.max(1, ...summary.days.map((day) => day.total));
  const dateFormatter = new Intl.DateTimeFormat(language, { weekday: "short" });
  chart.replaceChildren(...summary.days.map((day) => {
    const column = document.createElement("div");
    column.className = "day-column";
    const track = document.createElement("div");
    track.className = "bar-track";
    track.title = `${day.key}: ${number(day.total)}`;
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = number(day.total);
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.style.height = `${Math.max(day.total ? 7 : 2, day.total / maximum * 100)}%`;
    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = dateFormatter.format(new Date(`${day.key}T12:00:00`));
    track.append(bar, value);
    column.append(track, label);
    return column;
  }));

  renderList(topSites, summary.topSites);
  renderList(blockedResources, summary.resources);
  renderList(blockingSources, summary.sources ?? []);
  renderList(blockingCategories, summary.categories ?? []);
  topSites.hidden = summary.topSites.length === 0;
  blockedResources.hidden = summary.resources.length === 0;
  topSitesEmpty.hidden = summary.topSites.length > 0;
  resourcesEmpty.hidden = summary.resources.length > 0;
  siteCount.textContent = number(summary.topSites.length);
  resourceCount.textContent = number(summary.resources.length);
}

async function refreshJournal() {
  const result = await chrome.runtime.sendMessage({ kind: "getBlockingJournal" });
  journalRows.replaceChildren(...(result.entries ?? []).slice(0, 200).map((entry) => {
    const row = document.createElement("tr");
    for (const value of [new Date(entry.createdAt).toLocaleTimeString(language), entry.site, entry.resource, entry.source, entry.category]) {
      const cell = document.createElement("td"); cell.textContent = value || "—"; row.append(cell);
    }
    return row;
  }));
}

async function refreshDiagnosis() {
  const tabs = await chrome.tabs.query({});
  currentSite = tabs
    .filter((tab) => tab.id && /^https?:/i.test(tab.url ?? ""))
    .sort((left, right) => Number(right.lastAccessed ?? 0) - Number(left.lastAccessed ?? 0))[0] ?? null;
  if (!currentSite?.url?.startsWith("http")) return;
  const [state, settings] = await Promise.all([
    chrome.runtime.sendMessage({ kind: "getContentBlockingState", url: currentSite.url, tabId: currentSite.id }),
    chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" })
  ]);
  document.querySelector("#diagnosis-signals").replaceChildren(...[
    ["EasyList", state.enabled && settings.adFilterEnabled],
    ["EasyPrivacy", state.enabled && settings.privacyFilterEnabled],
    ["Cosmetic filters", state.enabled && settings.cosmeticFilteringEnabled],
    ["Custom rules", state.enabled && Number(state.additionalRuleCount) > 0]
  ].map(([label, active]) => {
    const badge = document.createElement("span"); badge.className = active ? "active" : ""; badge.textContent = `${label}: ${active ? "on" : "off"}`; return badge;
  }));
}

async function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = null;
  render(await chrome.runtime.sendMessage({ kind: "getBlockingStatistics" }));
  await Promise.all([refreshJournal(), refreshDiagnosis()]);
}

function scheduleRefresh() {
  if (!refreshTimer) refreshTimer = setTimeout(() => refresh().catch(() => {}), 80);
}

clearStatistics.addEventListener("click", async () => {
  if (!confirm(t("clearStatisticsConfirm"))) return;
  clearStatistics.disabled = true;
  try {
    await chrome.runtime.sendMessage({ kind: "clearBlockingStatistics" });
    await refresh();
  } finally {
    clearStatistics.disabled = false;
  }
});
document.querySelector("#refresh-journal").addEventListener("click", refreshJournal);
document.querySelector("#clear-journal").addEventListener("click", async () => { await chrome.runtime.sendMessage({ kind: "clearBlockingJournal" }); await refreshJournal(); });
document.querySelector("#bypass-once").addEventListener("click", async () => {
  if (!currentSite?.url) return;
  const domain = new URL(currentSite.url).hostname;
  await chrome.runtime.sendMessage({ kind: "bypassSiteOnce", domain });
  await chrome.tabs.reload(currentSite.id);
  document.querySelector("#diagnosis-status").textContent = t("bypassApplied");
});
document.querySelector("#exclude-site").addEventListener("click", async () => {
  if (!currentSite?.url) return;
  const domain = new URL(currentSite.url).hostname;
  await chrome.runtime.sendMessage({ kind: "setSiteAllowlisted", domain, url: currentSite.url, allowlisted: true });
  document.querySelector("#diagnosis-status").textContent = t("siteExcluded");
  await refreshDiagnosis();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.blockingStatistics) scheduleRefresh();
});

const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });
language = uiPreferences.language || browserLanguage();
localizeDocument(language);
document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
await refresh();
