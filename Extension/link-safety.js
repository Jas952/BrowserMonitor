const COMMON_PUBLIC_SUFFIXES = new Set([
  "com", "org", "net", "edu", "gov", "mil", "int", "io", "ai", "app", "dev", "co", "me", "tv", "gg",
  "ru", "рф", "su", "by", "ua", "kz", "uz", "uk", "de", "fr", "it", "es", "nl", "se", "no", "fi", "pl",
  "br", "in", "jp", "cn", "au", "ca", "us",
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.jp", "com.br", "com.tr",
  "github.io", "pages.dev", "vercel.app", "appspot.com", "firebaseapp.com", "web.app", "netlify.app"
]);

const URL_SHORTENERS = new Set([
  "bit.ly", "buff.ly", "cutt.ly", "goo.gl", "is.gd", "lnkd.in", "ow.ly", "rebrand.ly", "shorturl.at",
  "t.co", "tiny.cc", "tinyurl.com", "trib.al", "u.to", "vk.cc"
]);

const SOCIAL_SOURCE_DOMAINS = new Set([
  "x.com", "twitter.com", "reddit.com", "telegram.org", "web.telegram.org", "facebook.com", "instagram.com",
  "tiktok.com", "linkedin.com", "vk.com", "ok.ru"
]);

const BRAND_DOMAINS = new Map([
  ["apple", "apple.com"],
  ["binance", "binance.com"],
  ["coinbase", "coinbase.com"],
  ["discord", "discord.com"],
  ["facebook", "facebook.com"],
  ["github", "github.com"],
  ["google", "google.com"],
  ["instagram", "instagram.com"],
  ["linkedin", "linkedin.com"],
  ["metamask", "metamask.io"],
  ["microsoft", "microsoft.com"],
  ["opensea", "opensea.io"],
  ["paypal", "paypal.com"],
  ["steam", "steampowered.com"],
  ["telegram", "telegram.org"],
  ["twitter", "twitter.com"],
  ["youtube", "youtube.com"]
]);

const SUSPICIOUS_WORDS = [
  "airdrop", "bonus", "claim", "connect", "free", "gift", "giveaway", "login", "prize", "promo",
  "reward", "security-check", "signin", "support", "token", "verify", "wallet", "withdraw"
];

const REDIRECT_PARAMETERS = new Set(["continue", "dest", "destination", "next", "redirect", "redirect_uri", "return", "target", "to", "url"]);

export const DEFAULT_LINK_SAFETY_SETTINGS = {
  enabled: true,
  warnShorteners: true,
  warnLookalikes: true,
  warnPunycode: true,
  warnRedirects: true,
  warnUnknownFromSocial: true,
  updatedAt: new Date(0).toISOString()
};

export function normalizeLinkSafetySettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const settings = { ...DEFAULT_LINK_SAFETY_SETTINGS };
  for (const key of ["enabled", "warnShorteners", "warnLookalikes", "warnPunycode", "warnRedirects", "warnUnknownFromSocial"]) {
    if (typeof source[key] === "boolean") settings[key] = source[key];
  }
  const updatedAt = Date.parse(source.updatedAt ?? "");
  settings.updatedAt = Number.isFinite(updatedAt) ? new Date(updatedAt).toISOString() : new Date().toISOString();
  return settings;
}

export function sanitizeLinkSafetyDomains(values, limit = 500) {
  const domains = [];
  for (const value of Array.isArray(values) ? values : []) {
    const parsed = parseURLParts(String(value).trim());
    const domain = parsed?.registrableDomain ?? "";
    if (!domain || domains.includes(domain)) continue;
    domains.push(domain);
    if (domains.length >= limit) break;
  }
  return domains.sort();
}

function rawHostnameFromURL(value) {
  const trimmed = String(value ?? "").trim();
  const match = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#[\]@]+|(?:[^/?#@]*@)?\[[^\]]+\])/i);
  if (!match) return "";
  return match[1].replace(/^.*@/, "").replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function isIPAddress(hostname) {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return hostname.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }
  return /^[a-f0-9:]+$/i.test(hostname) && hostname.includes(":");
}

function publicSuffixFor(labels) {
  for (let length = Math.min(labels.length, 3); length >= 1; length -= 1) {
    const suffix = labels.slice(-length).join(".");
    if (COMMON_PUBLIC_SUFFIXES.has(suffix)) return suffix;
  }
  return labels.at(-1) ?? "";
}

export function parseURLParts(value) {
  let url;
  const rawValue = String(value ?? "").trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawValue) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(rawValue)) return null;
  const normalizedValue = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
  try {
    url = new URL(normalizedValue);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253) return null;
  const rawHostname = rawHostnameFromURL(normalizedValue);
  const labels = hostname.split(".").filter(Boolean);
  const suffix = isIPAddress(hostname) ? "" : publicSuffixFor(labels);
  const suffixLength = suffix ? suffix.split(".").length : 0;
  const registrableDomain = isIPAddress(hostname)
    ? hostname
    : labels.length > suffixLength
      ? labels.slice(-(suffixLength + 1)).join(".")
      : hostname;
  const subdomain = hostname === registrableDomain
    ? ""
    : hostname.slice(0, Math.max(0, hostname.length - registrableDomain.length - 1));
  return {
    href: url.href,
    protocol: url.protocol,
    hostname,
    rawHostname,
    subdomain,
    registrableDomain,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    port: url.port,
    searchParams: url.searchParams
  };
}

function hasMixedLatinCyrillic(value) {
  return /[a-z]/i.test(value) && /[\u0400-\u04ff]/.test(value);
}

function skeleton(value) {
  return value
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z0-9]/g, "");
}

function domainWithoutSuffix(domain) {
  const labels = domain.split(".");
  const suffix = publicSuffixFor(labels);
  const suffixLength = suffix ? suffix.split(".").length : 1;
  return labels.slice(0, Math.max(1, labels.length - suffixLength)).join(".");
}

function nestedRedirectURL(parts) {
  for (const [name, value] of parts.searchParams.entries()) {
    if (!REDIRECT_PARAMETERS.has(name.toLowerCase())) continue;
    try {
      const nested = new URL(value);
      if (["http:", "https:"].includes(nested.protocol)) return nested.href;
    } catch {
      // Non-URL redirect values are ignored.
    }
  }
  return "";
}

function addReason(reasons, severity, code, message) {
  reasons.push({ severity, code, message });
}

export function evaluateLinkSafety(url, options = {}) {
  const settings = normalizeLinkSafetySettings(options.settings ?? DEFAULT_LINK_SAFETY_SETTINGS);
  const allowedDomains = new Set(sanitizeLinkSafetyDomains(options.allowedDomains ?? []));
  const blockedDomains = new Set(sanitizeLinkSafetyDomains(options.blockedDomains ?? []));
  const parts = parseURLParts(url);
  if (!parts) return { action: "allow", risk: "none", score: 0, reasons: [], url: "" };
  const reasons = [];
  const registrableDomain = parts.registrableDomain;
  const source = parseURLParts(options.sourceUrl ?? "");
  const sourceDomain = source?.registrableDomain ?? "";

  if (!settings.enabled || allowedDomains.has(registrableDomain)) {
    return { action: "allow", risk: "none", score: 0, reasons, url: parts.href, registrableDomain };
  }

  if (blockedDomains.has(registrableDomain)) {
    addReason(reasons, "high", "blocked-domain", "This domain is on your blocked list.");
    return {
      action: "block",
      risk: "blocked",
      score: 100,
      reasons,
      url: parts.href,
      hostname: parts.hostname,
      registrableDomain,
      sourceDomain
    };
  }

  if (isIPAddress(parts.hostname)) {
    addReason(reasons, "high", "ip-address", "The link uses an IP address instead of a normal domain.");
  }

  if (settings.warnPunycode && parts.hostname.split(".").some((label) => label.startsWith("xn--"))) {
    addReason(reasons, "high", "punycode", "The domain uses punycode, which can hide lookalike characters.");
  }

  if (settings.warnPunycode && hasMixedLatinCyrillic(parts.rawHostname || parts.hostname)) {
    addReason(reasons, "high", "mixed-alphabet", "The domain mixes Latin and Cyrillic characters.");
  }

  if (settings.warnShorteners && URL_SHORTENERS.has(registrableDomain)) {
    addReason(reasons, "medium", "shortener", "The link uses a URL shortener, so the destination is hidden.");
  }

  if (settings.warnRedirects && nestedRedirectURL(parts)) {
    addReason(reasons, "medium", "redirect-param", "The link contains a nested redirect URL.");
  }

  if (parts.port && !["80", "443"].includes(parts.port)) {
    addReason(reasons, "medium", "non-standard-port", "The link uses a non-standard network port.");
  }

  const registrableBase = skeleton(domainWithoutSuffix(registrableDomain));
  const fullHostSkeleton = skeleton(parts.hostname);
  const subdomainSkeleton = skeleton(parts.subdomain);
  if (settings.warnLookalikes) {
    for (const [brand, officialDomain] of BRAND_DOMAINS) {
      if (registrableDomain === officialDomain || registrableDomain.endsWith(`.${officialDomain}`)) continue;
      if (subdomainSkeleton.includes(brand) || (fullHostSkeleton.includes(brand) && registrableDomain !== officialDomain)) {
        addReason(reasons, "high", "brand-in-subdomain", `The hostname mentions ${officialDomain}, but the real domain is ${registrableDomain}.`);
        break;
      }
      if (registrableBase.includes(brand) && registrableDomain !== officialDomain) {
        addReason(reasons, "medium", "brand-lookalike", `The domain looks similar to ${officialDomain}.`);
        break;
      }
    }
  }

  const searchable = `${parts.hostname} ${parts.pathname}`.toLowerCase();
  const matchedWord = SUSPICIOUS_WORDS.find((word) => searchable.includes(word));
  if (matchedWord) {
    addReason(reasons, "medium", "suspicious-word", `The address contains a risky keyword: ${matchedWord}.`);
  }

  if (parts.subdomain.split(".").filter(Boolean).length >= 4) {
    addReason(reasons, "low", "many-subdomains", "The hostname has many nested subdomains.");
  }

  if ((parts.hostname.match(/-/g) ?? []).length >= 3) {
    addReason(reasons, "low", "many-hyphens", "The domain contains many hyphens.");
  }

  if (settings.warnUnknownFromSocial
      && sourceDomain
      && sourceDomain !== registrableDomain
      && SOCIAL_SOURCE_DOMAINS.has(sourceDomain)
      && !SOCIAL_SOURCE_DOMAINS.has(registrableDomain)
      && reasons.length > 0) {
    addReason(reasons, "low", "social-source", "The link leaves a social site for a domain with risk signals.");
  }

  const score = reasons.reduce((total, reason) => total + (
    reason.severity === "high" ? 70 : reason.severity === "medium" ? 35 : 10
  ), 0);
  const risk = score >= 70 ? "high" : score >= 35 ? "medium" : score > 0 ? "low" : "none";
  return {
    action: score >= 35 ? "warn" : "allow",
    risk,
    score,
    reasons,
    url: parts.href,
    hostname: parts.hostname,
    registrableDomain,
    sourceDomain,
    nestedRedirectURL: nestedRedirectURL(parts)
  };
}
