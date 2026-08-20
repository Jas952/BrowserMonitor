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
