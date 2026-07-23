const RETENTION_DAYS = 90;
const SITE_LIMIT_PER_DAY = 300;
const MAX_SAMPLE_SECONDS = 30;

function validDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export function localActivityDayKey(value = new Date()) {
  const date = validDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function safeDomain(value) {
  const domain = String(value ?? "").trim().toLowerCase().replace(/^www\./, "");
  return domain && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain) ? domain : "";
}

function safeCount(value, maximum = 100_000_000) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number), maximum) : 0;
}

function normalizedSite(value = {}) {
  return {
    visits: safeCount(value.visits, 1_000_000),
    activeSeconds: safeCount(value.activeSeconds),
    videoSeconds: safeCount(value.videoSeconds),
    readingSeconds: safeCount(value.readingSeconds)
  };
}

function acceptedDayKeys(now) {
  const keys = new Set();
  const current = validDate(now);
  current.setHours(12, 0, 0, 0);
  for (let offset = 0; offset < RETENTION_DAYS; offset += 1) {
    const date = new Date(current);
    date.setDate(date.getDate() - offset);
    keys.add(localActivityDayKey(date));
  }
  return keys;
}

export function normalizeActivityStatistics(input, now = new Date()) {
  const accepted = acceptedDayKeys(now);
  const days = {};
  for (const [key, value] of Object.entries(input?.days ?? {})) {
    if (!accepted.has(key)) continue;
    const sites = Object.fromEntries(
      Object.entries(value?.sites ?? {})
        .map(([domain, site]) => [safeDomain(domain), normalizedSite(site)])
        .filter(([domain, site]) => domain && Object.values(site).some(Boolean))
        .sort((left, right) => right[1].activeSeconds - left[1].activeSeconds)
        .slice(0, SITE_LIMIT_PER_DAY)
    );
    days[key] = { sites };
  }
  return { version: 1, days };
}

export function recordActivitySample(input, sample, domain, now = new Date()) {
  const date = validDate(now);
  const statistics = normalizeActivityStatistics(input, date);
  const key = localActivityDayKey(date);
  const day = statistics.days[key] ?? { sites: {} };
  const normalizedDomain = safeDomain(domain);
  if (!normalizedDomain) return statistics;
  const site = normalizedSite(day.sites[normalizedDomain]);
  const activeSeconds = Math.min(safeCount(sample?.activeSeconds), MAX_SAMPLE_SECONDS);
  const videoSeconds = Math.min(safeCount(sample?.videoSeconds), activeSeconds);
  const readingSeconds = Math.min(safeCount(sample?.readingSeconds), Math.max(0, activeSeconds - videoSeconds));
  site.visits += sample?.visit ? 1 : 0;
  site.activeSeconds += activeSeconds;
  site.videoSeconds += videoSeconds;
  site.readingSeconds += readingSeconds;
  day.sites[normalizedDomain] = site;
  statistics.days[key] = day;
  return normalizeActivityStatistics(statistics, date);
}

function periodStart(period, now) {
  const date = validDate(now);
  date.setHours(0, 0, 0, 0);
  if (period === "week") {
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);
  } else if (period === "month") {
    date.setDate(1);
  }
  return date;
}

function sumSite(target, site) {
  target.visits += site.visits;
  target.activeSeconds += site.activeSeconds;
  target.videoSeconds += site.videoSeconds;
  target.readingSeconds += site.readingSeconds;
}

function workHoursForPeriod(period, now) {
  if (period === "day") return 8;
  if (period === "week") return 40;
  const date = validDate(now);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let weekdays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month, day, 12).getDay();
    if (weekday !== 0 && weekday !== 6) weekdays += 1;
  }
  return weekdays * 8;
}

export function summarizeActivityStatistics(input, period = "day", now = new Date()) {
  const statistics = normalizeActivityStatistics(input, now);
  const selectedPeriod = ["day", "week", "month"].includes(period) ? period : "day";
  const start = periodStart(selectedPeriod, now);
  const totalSites = {};
  const periodSites = {};
  const chart = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = validDate(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localActivityDayKey(date);
    const totals = { activeSeconds: 0, videoSeconds: 0, readingSeconds: 0 };
    for (const site of Object.values(statistics.days[key]?.sites ?? {})) {
      totals.activeSeconds += site.activeSeconds;
      totals.videoSeconds += site.videoSeconds;
      totals.readingSeconds += site.readingSeconds;
    }
    chart.push({ key, ...totals });
  }
  for (const [key, day] of Object.entries(statistics.days)) {
    const inPeriod = new Date(`${key}T12:00:00`) >= start;
    for (const [domain, site] of Object.entries(day.sites)) {
      totalSites[domain] ??= normalizedSite();
      sumSite(totalSites[domain], site);
      if (inPeriod) {
        periodSites[domain] ??= normalizedSite();
        sumSite(periodSites[domain], site);
      }
    }
  }
  const sites = Object.entries(periodSites).map(([domain, site]) => ({
    domain,
    ...site,
    totalVisits: totalSites[domain]?.visits ?? site.visits,
    averageVisitSeconds: site.visits ? Math.round(site.activeSeconds / site.visits) : 0
  })).sort((left, right) => right.activeSeconds - left.activeSeconds || right.visits - left.visits);
  const totals = normalizedSite();
  for (const site of Object.values(periodSites)) sumSite(totals, site);
  return {
    period: selectedPeriod,
    totals: { ...totals, averageVisitSeconds: totals.visits ? Math.round(totals.activeSeconds / totals.visits) : 0 },
    sites,
    chart: selectedPeriod === "day" ? chart.slice(-1) : selectedPeriod === "week" ? chart.slice(-7) : chart,
    humor: {
      workHours: workHoursForPeriod(selectedPeriod, now),
      workdayPercent: Math.round(totals.activeSeconds / (workHoursForPeriod(selectedPeriod, now) * 3600) * 100),
      focusBlocks: Math.round(totals.activeSeconds / (25 * 60) * 10) / 10,
      coffeeBreaks: Math.round(totals.activeSeconds / (15 * 60) * 10) / 10,
      featureFilms: Math.round(totals.activeSeconds / (110 * 60) * 10) / 10
    }
  };
}

export const ACTIVITY_RETENTION_DAYS = RETENTION_DAYS;
