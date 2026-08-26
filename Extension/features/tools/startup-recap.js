const MAX_STARTUP_TABS = 12;
const RECAP_TTL_MS = 2 * 60 * 1000;

function safeWebURL(value) {
  try {
    const parsed = new URL(String(value ?? ""));
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    parsed.username = "";
    parsed.password = "";
    return parsed.href.slice(0, 2_048);
  } catch {
    return "";
  }
}

function safeImageURL(value) {
  const source = String(value ?? "");
  if (/^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(source)) {
    return source.length <= 32_768 ? source : "";
  }
  return safeWebURL(source);
}

export function sanitizeStartupTabs(tabs, currentlyOpenURLs = [], limit = MAX_STARTUP_TABS) {
  const open = new Set((Array.isArray(currentlyOpenURLs) ? currentlyOpenURLs : [])
    .map(safeWebURL)
    .filter(Boolean));
  const seen = new Set();
  return (Array.isArray(tabs) ? tabs : []).flatMap((tab) => {
    const url = safeWebURL(tab?.url);
    if (!url || open.has(url) || seen.has(url)) return [];
    seen.add(url);
    const title = String(tab?.title ?? "").replace(/\s+/g, " ").trim().slice(0, 140)
      || new URL(url).hostname;
    return [{ title, url, faviconURL: safeImageURL(tab?.favIconUrl || tab?.faviconURL) }];
  }).slice(0, Math.max(1, Math.min(MAX_STARTUP_TABS, Number(limit) || MAX_STARTUP_TABS)));
}

export function mostRecentClosedWindow(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((entry) => entry?.window && Array.isArray(entry.window.tabs))
    .sort((left, right) => Number(right.lastModified) - Number(left.lastModified))[0] ?? null;
}

export function sanitizeStartupRecap(input, now = Date.now()) {
  const createdAt = Number(input?.createdAt);
  if (!Number.isFinite(createdAt) || now - createdAt > RECAP_TTL_MS) return null;
  const tabs = sanitizeStartupTabs(input?.tabs);
  const video = input?.video && typeof input.video === "object" ? {
    title: String(input.video.title ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
    url: safeWebURL(input.video.url),
    thumbnailURL: safeImageURL(input.video.thumbnailURL),
    position: Math.max(0, Number(input.video.position) || 0),
    time: String(input.video.time ?? "").slice(0, 20)
  } : null;
  const validVideo = video?.title && video.url && video.position >= 10 ? video : null;
  if (!tabs.length && !validVideo) return null;
  return {
    id: String(input?.id ?? "").slice(0, 80),
    createdAt,
    language: input?.language === "ru" ? "ru" : "en",
    targetTabId: Number.isInteger(input?.targetTabId) ? input.targetTabId : null,
    claimOnNextTab: input?.claimOnNextTab === true,
    claimAfter: Number.isFinite(Number(input?.claimAfter)) ? Number(input.claimAfter) : 0,
    tabs,
    video: validVideo
  };
}

export function videoResumeURL(url, position) {
  const safe = safeWebURL(url);
  if (!safe) return "";
  const parsed = new URL(safe);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const seconds = Math.max(0, Math.floor(Number(position) || 0));
  if ((host === "youtube.com" || host === "youtu.be") && seconds > 0) {
    parsed.searchParams.set("t", `${seconds}s`);
  }
  return parsed.href;
}

export function continueWatchingDisposition(position, duration, completed = false) {
  const current = Number(position);
  const total = Number(duration);
  if (completed || (Number.isFinite(current) && Number.isFinite(total) && current >= total - 20)) return "remove";
  if (Number.isFinite(current) && Number.isFinite(total) && total >= 120 && current >= 10) return "store";
  return "ignore";
}

export { MAX_STARTUP_TABS, RECAP_TTL_MS, safeImageURL, safeWebURL };
