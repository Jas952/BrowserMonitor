const $ = (selector) => document.querySelector(selector);
let period = "day";
let refreshTimer = null;
let language = "en";
const COPY = {
  en: {
    title: "Site activity", subtitle: "Active time only · data stays on this device", periods: ["Day", "Week", "Month"],
    active: "Active time", average: "Average visit", averageDetail: "per active visit",
    video: "Video watching", videoDetail: "excluding background and ad videos", reading: "Reading", readingDetail: "pages with substantial text",
    chart: "Activity trend", chartDetail: "Active time, video and reading by day", legend: '<i class="all"></i>total <i class="video"></i>video <i class="read"></i>reading',
    sites: "Top sites", sitesDetail: "Sorted by active time", headings: ["Site", "Total visits", "Period", "Time", "Average", "Video", "Reading"],
    empty: "Statistics will appear after active site use.", reality: "Reality check", realityDetail: "A little honest arithmetic",
    workday: (hours) => `of a ${hours}-hour work period`, focus: "Focus blocks lost", coffee: "Coffee breaks", films: "Feature films",
    quiet: "The internet is behaving so far.", busy: "That was enough time for a long meeting. Maybe two.", full: "The internet has worked a full shift. The question is: for whom?",
    privacy: "Only a focused, visible tab with recent interaction is counted. Domains and daily counters are kept for 90 days — without full URLs or page titles.",
    clear: "Clear statistics", confirm: "Clear all locally stored site activity?", visits: "active visits", sitesCount: "sites", second: "sec", minute: "min", hour: "h",
    periodLabel:"Period", metricsLabel:"Summary metrics", chartAria:"Activity chart"
  },
  ru: {
    title: "Аналитика посещений", subtitle: "Только активное время · данные остаются на устройстве", periods: ["День", "Неделя", "Месяц"],
    active: "Активное время", average: "Среднее посещение", averageDetail: "на один активный визит",
    video: "Просмотр видео", videoDetail: "без фоновых и рекламных роликов", reading: "Чтение", readingDetail: "страницы с содержательным текстом",
    chart: "Динамика активности", chartDetail: "Активное время, видео и чтение по дням", legend: '<i class="all"></i>всего <i class="video"></i>видео <i class="read"></i>чтение',
    sites: "ТОП сайтов", sitesDetail: "Сортировка по активному времени", headings: ["Сайт", "Всего визитов", "За период", "Время", "Среднее", "Видео", "Чтение"],
    empty: "Статистика появится после активного использования сайтов.", reality: "Счётчик реальности", realityDetail: "Немного честной арифметики",
    workday: (hours) => `от ${hours}-часового рабочего периода`, focus: "Помодоро потеряно", coffee: "Кофе-брейков", films: "Полнометражек",
    quiet: "Пока интернет ведёт себя прилично.", busy: "Уже можно было провести большое совещание. Даже два.", full: "Интернет официально отработал полную смену. Вопрос: за кого?",
    privacy: "Считается только видимая вкладка в фокусе и недавнее взаимодействие. Хранятся домены и дневные счётчики за 90 дней — без URL и заголовков страниц.",
    clear: "Очистить статистику", confirm: "Очистить всю статистику посещений?", visits: "активных посещений", sitesCount: "сайтов", second:"сек", minute:"мин", hour:"ч",
    periodLabel:"Период", metricsLabel:"Основные показатели", chartAria:"График активности"
  }
};
const copy = () => COPY[language];

function applyLanguage() {
  const c = copy();
  document.documentElement.lang = language;
  document.title = `Browser Monitor — ${c.title}`;
  $("#activity-title").textContent = c.title; $("#activity-subtitle").textContent = c.subtitle;
  document.querySelectorAll("[data-period]").forEach((button, index) => { button.textContent = c.periods[index]; });
  $("#active-label").textContent = c.active; $("#average-label").textContent = c.average; $("#average-detail").textContent = c.averageDetail;
  $("#video-label").textContent = c.video; $("#video-detail").textContent = c.videoDetail; $("#reading-label").textContent = c.reading; $("#reading-detail").textContent = c.readingDetail;
  $("#chart-title").textContent = c.chart; $("#chart-detail").textContent = c.chartDetail; $("#chart-legend").innerHTML = c.legend;
  $("#sites-title").textContent = c.sites; $("#sites-detail").textContent = c.sitesDetail;
  [...$("#site-headings").children].forEach((cell, index) => { cell.textContent = c.headings[index]; });
  $("#empty-state").textContent = c.empty; $("#reality-title").textContent = c.reality; $("#reality-detail").textContent = c.realityDetail;
  $("#focus-label").textContent = c.focus; $("#coffee-label").textContent = c.coffee; $("#films-label").textContent = c.films;
  $("#privacy-note").textContent = c.privacy; $("#clear-activity").textContent = c.clear;
  $(".periods").ariaLabel = c.periodLabel; $(".metrics").ariaLabel = c.metricsLabel; $("#activity-chart").ariaLabel = c.chartAria;
}

function duration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} ${copy().second}`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} ${copy().minute}`;
  const hours = seconds / 3600;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} ${copy().hour}`;
}

function number(value) {
  return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 1 }).format(value ?? 0);
}

function favicon(domain) {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(`https://${domain}`)}&size=32`;
}

function renderChart(days) {
  const maximum = Math.max(1, ...days.map((day) => day.activeSeconds));
  $("#activity-chart").style.setProperty("--columns", days.length);
  $("#activity-chart").replaceChildren(...days.map((day) => {
    const column = document.createElement("div");
    column.className = "chart-day";
    const track = document.createElement("div");
    track.className = "bar-track";
    track.title = `${day.key}: ${duration(day.activeSeconds)}`;
    for (const [className, value] of [["bar-total", day.activeSeconds], ["bar-video", day.videoSeconds], ["bar-read", day.readingSeconds]]) {
      const bar = document.createElement("i");
      bar.className = className;
      bar.style.height = `${Math.max(value ? 3 : 1, value / maximum * 100)}%`;
      track.append(bar);
    }
    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = days.length > 10 ? day.key.slice(8) : new Date(`${day.key}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short" });
    column.append(track, label);
    return column;
  }));
}

function renderSites(sites) {
  $("#site-rows").replaceChildren(...sites.slice(0, 100).map((site) => {
    const row = document.createElement("tr");
    const domain = document.createElement("td");
    domain.title = site.domain;
    const wrapper = document.createElement("span");
    wrapper.className = "site";
    const icon = document.createElement("img");
    icon.src = favicon(site.domain);
    icon.alt = "";
    const label = document.createElement("span");
    label.textContent = site.domain;
    wrapper.append(icon, label);
    domain.append(wrapper);
    for (const value of [site.totalVisits, site.visits, duration(site.activeSeconds), duration(site.averageVisitSeconds), duration(site.videoSeconds), duration(site.readingSeconds)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    row.prepend(domain);
    return row;
  }));
  $("#empty-state").hidden = sites.length > 0;
  $("#site-count").textContent = `${number(sites.length)} ${copy().sitesCount}`;
}

function render(summary) {
  const { totals, humor } = summary;
  $("#active-time").textContent = duration(totals.activeSeconds);
  $("#active-detail").textContent = `${number(totals.visits)} ${copy().visits}`;
  $("#average-time").textContent = duration(totals.averageVisitSeconds);
  $("#video-time").textContent = duration(totals.videoSeconds);
  $("#reading-time").textContent = duration(totals.readingSeconds);
  $("#workday-percent").textContent = `${number(humor.workdayPercent)}%`;
  $("#workday-detail").textContent = copy().workday(humor.workHours);
  $("#focus-blocks").textContent = number(humor.focusBlocks);
  $("#coffee-breaks").textContent = number(humor.coffeeBreaks);
  $("#feature-films").textContent = number(humor.featureFilms);
  $("#reality-note").textContent = totals.activeSeconds >= 8 * 3600
    ? copy().full
    : totals.activeSeconds >= 2 * 3600
      ? copy().busy
      : copy().quiet;
  renderChart(summary.chart);
  renderSites(summary.sites);
}

async function refresh() {
  render(await chrome.runtime.sendMessage({ kind: "getSiteActivityStatistics", period }));
}

function selectPeriod(button) {
  period = button.dataset.period;
  for (const candidate of document.querySelectorAll("[data-period]")) candidate.setAttribute("aria-selected", String(candidate === button));
  refresh().catch(() => {});
}

for (const button of document.querySelectorAll("[data-period]")) {
  button.addEventListener("click", () => selectPeriod(button));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = [...document.querySelectorAll("[data-period]")];
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(tabs.indexOf(button) + direction + tabs.length) % tabs.length];
    next.focus();
    selectPeriod(next);
  });
}

$("#clear-activity").addEventListener("click", async () => {
  if (!confirm(copy().confirm)) return;
  await chrome.runtime.sendMessage({ kind: "clearSiteActivityStatistics" });
  await refresh();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.siteActivityStatistics || refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refresh().catch(() => {});
  }, 150);
});

const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });
language = uiPreferences.language === "ru" ? "ru" : "en";
document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
applyLanguage();
await refresh();
