const TRACKING_KEYS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "mc_cid", "mc_eid",
  "igshid", "vero_id", "ref_src", "ref_url", "spm", "scm", "mkt_tok"
]);

export function cleanTrackingURL(rawURL) {
  try {
    const url = new URL(String(rawURL));
    if (!/^https?:$/.test(url.protocol)) return { url: String(rawURL), removed: [] };
    const removed = [];
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || TRACKING_KEYS.has(key.toLowerCase())) {
        removed.push(key);
        url.searchParams.delete(key);
      }
    }
    url.hash = url.hash.startsWith("#:~:text=") ? "" : url.hash;
    return { url: url.href, removed: [...new Set(removed)].sort() };
  } catch {
    return { url: String(rawURL), removed: [] };
  }
}

export function sanitizeStoredMediaURL(rawURL) {
  const cleaned = cleanTrackingURL(rawURL);
  try {
    const url = new URL(cleaned.url);
    url.username = "";
    url.password = "";
    url.hash = "";
    const sensitive = /^(?:token|session|auth|authorization|signature|sig|key|expires)$/i;
    for (const key of [...url.searchParams.keys()]) {
      if (sensitive.test(key)) {
        cleaned.removed.push(key);
        url.searchParams.delete(key);
      }
    }
    return { url: url.href.slice(0, 2_048), removed: [...new Set(cleaned.removed)].sort() };
  } catch {
    return { url: "", removed: cleaned.removed };
  }
}

export function repairStoredMediaURL(rawURL, thumbnailURL = "") {
  const sanitized = sanitizeStoredMediaURL(rawURL);
  try {
    const url = new URL(sanitized.url);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "youtube.com" || (url.pathname === "/watch" && url.searchParams.get("v"))) {
      return sanitized;
    }
    const thumbnail = new URL(String(thumbnailURL ?? ""));
    const thumbnailHost = thumbnail.hostname.toLowerCase().replace(/^www\./, "");
    if (!["i.ytimg.com", "img.youtube.com"].includes(thumbnailHost)) return sanitized;
    const videoID = thumbnail.pathname.match(/\/vi(?:_webp)?\/([a-z0-9_-]{6,20})(?:\/|$)/i)?.[1];
    if (!videoID) return sanitized;
    const repaired = new URL("https://www.youtube.com/watch");
    repaired.searchParams.set("v", videoID);
    return { ...sanitized, url: repaired.href };
  } catch {
    return sanitized;
  }
}

export function preferredMediaPageURL(reportedURL, fallbackURL, { topFrame = true } = {}) {
  const first = topFrame ? reportedURL : fallbackURL;
  const second = topFrame ? fallbackURL : reportedURL;
  return sanitizeStoredMediaURL(first).url || sanitizeStoredMediaURL(second).url;
}
