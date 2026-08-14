export const COOKIE_EXPORT_FORMATS = ["netscape", "json"];

function sortedCookies(cookies) {
  return [...cookies].sort((left, right) =>
    left.domain.localeCompare(right.domain)
    || left.path.localeCompare(right.path)
    || left.name.localeCompare(right.name)
  );
}

export function serializeCookies(cookies, format = "netscape") {
  if (!COOKIE_EXPORT_FORMATS.includes(format)) {
    throw new Error(`Unsupported cookie export format: ${format}`);
  }
  const sorted = sortedCookies(cookies);
  if (format === "json") return JSON.stringify(sorted, null, 2) + "\n";

  const lines = sorted.map((cookie) => {
    const domain = cookie.httpOnly ? `#HttpOnly_${cookie.domain}` : cookie.domain;
    const includeSubdomains = cookie.hostOnly ? "FALSE" : "TRUE";
    const expires = Math.max(0, Math.floor(cookie.expirationDate ?? 0));
    return [
      domain,
      includeSubdomains,
      cookie.path || "/",
      cookie.secure ? "TRUE" : "FALSE",
      expires,
      cookie.name,
      cookie.value
    ].join("\t");
  });
  return [
    "# Netscape HTTP Cookie File",
    "# Exported locally by Browser Monitor. Keep this file private.",
    ...lines,
    ""
  ].join("\n");
}

export function cookieExportFilename({ hostname = "cookies", format = "netscape", all = false } = {}) {
  const safeHost = (all ? "all" : hostname)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cookies";
  return format === "json" ? `${safeHost}-cookies.json` : `${safeHost}-cookies.txt`;
}
