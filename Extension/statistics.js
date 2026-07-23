const HISTORY_DAYS = 7;
const SITE_LIMIT_PER_DAY = 120;
const RESOURCE_LIMIT_PER_DAY = 240;
const EVENT_TYPES = new Set(["network", "sponsor", "video", "link"]);

function dateFrom(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export function localDayKey(value = new Date()) {
  const date = dateFrom(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeName(value, fallback = "unknown") {
  const name = String(value ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!name || name.length > 253 || !/^[a-z0-9._:-]+$/i.test(name)) return fallback;
  return name;
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 1_000_000) : 0;
}

function normalizedCounts(input, limit) {
  return Object.fromEntries(
    Object.entries(input && typeof input === "object" ? input : {})
      .map(([name, count]) => [safeName(name), safeCount(count)])
      .filter(([name, count]) => name !== "unknown" && count > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
  );
}

function normalizedDay(input = {}) {
  const types = { network: 0, sponsor: 0, video: 0, link: 0 };
  for (const type of Object.keys(types)) types[type] = safeCount(input.types?.[type]);
  const total = Math.max(safeCount(input.total), Object.values(types).reduce((sum, count) => sum + count, 0));
  return {
    total,
    types,
    sites: normalizedCounts(input.sites, SITE_LIMIT_PER_DAY),
    resources: normalizedCounts(input.resources, RESOURCE_LIMIT_PER_DAY),
    updatedAt: Number.isFinite(Date.parse(input.updatedAt ?? "")) ? input.updatedAt : null
  };
}

export function normalizeBlockingStatistics(input, now = new Date()) {
  const today = dateFrom(now);
  const accepted = new Set();
  for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    accepted.add(localDayKey(date));
  }
  const days = {};
  for (const [key, day] of Object.entries(input?.days ?? {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && accepted.has(key)) days[key] = normalizedDay(day);
  }
  return { version: 1, days };
}

function incrementBounded(map, name, amount, limit) {
  const normalized = safeName(name);
  if (normalized === "unknown") return;
  map[normalized] = safeCount(map[normalized]) + amount;
  const entries = Object.entries(map);
  if (entries.length <= limit) return;
  entries.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  for (const [key] of entries.slice(limit)) delete map[key];
}

export function recordBlockingEvent(input, event, now = new Date()) {
  const date = dateFrom(now);
  const newestStoredKey = Object.keys(input?.days ?? {})
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort()
    .at(-1);
  const normalizationDate = newestStoredKey && newestStoredKey > localDayKey(date)
    ? new Date(`${newestStoredKey}T12:00:00`)
    : date;
  const statistics = normalizeBlockingStatistics(input, normalizationDate);
  const key = localDayKey(date);
  const day = normalizedDay(statistics.days[key]);
  const type = EVENT_TYPES.has(event?.type) ? event.type : "network";
  const amount = Math.max(1, Math.min(safeCount(event?.count) || 1, 100));
  day.total += amount;
  day.types[type] += amount;
  incrementBounded(day.sites, event?.site, amount, SITE_LIMIT_PER_DAY);
  incrementBounded(day.resources, event?.resource, amount, RESOURCE_LIMIT_PER_DAY);
  day.updatedAt = date.toISOString();
  statistics.days[key] = day;
  return statistics;
}

function aggregateMaps(days, key) {
  const result = {};
  for (const day of days) {
    for (const [name, count] of Object.entries(day[key])) result[name] = (result[name] ?? 0) + count;
  }
  return Object.entries(result)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }));
}

export function summarizeBlockingStatistics(input, now = new Date()) {
  const statistics = normalizeBlockingStatistics(input, now);
  const days = [];
  const current = dateFrom(now);
  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(current);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDayKey(date);
    days.push({ key, ...normalizedDay(statistics.days[key]) });
  }
  const today = days.at(-1);
  return {
    today,
    sevenDayTotal: days.reduce((sum, day) => sum + day.total, 0),
    days: days.map(({ key, total, types }) => ({ key, total, types })),
    topSites: aggregateMaps(days, "sites").slice(0, 12),
    resources: aggregateMaps(days, "resources").slice(0, 40),
    updatedAt: today.updatedAt
  };
}
