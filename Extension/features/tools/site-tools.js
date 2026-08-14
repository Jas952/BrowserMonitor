const TRACKING_PARAMETERS = new Set([
  "fbclid", "gclid", "yclid", "mc_cid", "mc_eid", "ref", "ref_src"
]);
const COMMON_TWO_LEVEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "com.au", "net.au", "org.au",
  "co.jp", "co.nz", "com.br", "com.cn", "com.mx", "com.tr", "co.in"
]);

export function registrableSite(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const labels = hostname.split(".").filter(Boolean);
    if (labels.length > 2 && COMMON_TWO_LEVEL_SUFFIXES.has(labels.slice(-2).join("."))) {
      return labels.slice(-3).join(".");
    }
    return labels.length > 2 ? labels.slice(-2).join(".") : hostname;
  } catch {
    return "";
  }
}

export function normalizedDuplicateURL(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return "";
  }
}

export function duplicateTabGroups(tabs) {
  const groups = new Map();
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    const key = normalizedDuplicateURL(tab?.url);
    if (!key || !Number.isInteger(tab?.id)) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tab);
  }
  return [...groups.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([url, matches]) => ({ url, tabs: matches }))
    .sort((left, right) => right.tabs.length - left.tabs.length || left.url.localeCompare(right.url));
}

export function sanitizeCleanupSites(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => registrableSite(`https://${String(value).trim()}`))
    .filter(Boolean))]
    .slice(0, 500);
}

export function appendRedirectStep(steps, value) {
  const site = registrableSite(value);
  const result = Array.isArray(steps) ? [...steps] : [];
  if (site && result.at(-1) !== site) result.push(site);
  return result.slice(-12);
}

export function normalizeRedirectHistory(value, now = Date.now()) {
  const cutoff = now - 30 * 24 * 60 * 60 * 1_000;
  const entries = Array.isArray(value?.entries) ? value.entries : [];
  return {
    version: 1,
    entries: entries
      .filter((entry) => Number(entry?.createdAt) >= cutoff)
      .map((entry) => ({
        createdAt: Number(entry.createdAt),
        steps: (Array.isArray(entry.steps) ? entry.steps : []).map(String).filter(Boolean).slice(0, 12)
      }))
      .filter((entry) => entry.steps.length > 1)
      .slice(0, 100)
  };
}
