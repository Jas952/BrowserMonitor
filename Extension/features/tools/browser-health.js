export function canonicalTabURL(rawURL) {
  try {
    const url = new URL(rawURL);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return "";
  }
}

export function duplicateGroups(tabs) {
  const groups = new Map();
  for (const tab of tabs ?? []) {
    const url = canonicalTabURL(tab.url ?? tab.pendingUrl);
    if (!url || !Number.isInteger(tab.id)) continue;
    if (!groups.has(url)) groups.set(url, []);
    groups.get(url).push(tab);
  }
  return [...groups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([url, entries]) => ({ url, tabs: entries.sort((a, b) => Number(b.active) - Number(a.active) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0)) }));
}

export function bookmarkStructureIssues(bookmarks) {
  const seen = new Map();
  const issues = [];
  for (const bookmark of bookmarks ?? []) {
    const normalized = canonicalTabURL(bookmark.url);
    if (!normalized) {
      issues.push({ bookmark, type: "invalid" });
      continue;
    }
    if (seen.has(normalized)) issues.push({ bookmark, type: "duplicate", duplicateOf: seen.get(normalized) });
    else seen.set(normalized, bookmark.id);
  }
  return issues;
}
