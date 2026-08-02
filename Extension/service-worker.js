import { assessTab } from "./scoring.js";
import { cookieExportFilename, serializeCookies } from "./cookies.js";
import { compileFilterList } from "./filter-parser.js";
import {
  DEFAULT_LINK_SAFETY_SETTINGS,
  evaluateLinkSafety,
  normalizeLinkSafetySettings,
  parseURLParts,
  sanitizeLinkSafetyDomains
} from "./link-safety.js";
import {
  normalizeBlockingStatistics,
  recordBlockingEvent,
  summarizeBlockingStatistics
} from "./statistics.js";
import {
  recordActivitySample,
  summarizeActivityStatistics
} from "./activity-statistics.js";
import { CRYPTO_MINING_RULES } from "./rules/cryptomining-rules.js";
import {
  CONTENT_BLOCKER_RULESET_IDS,
  activeTemporaryPauses,
  allowlistRules,
  contentBlockingSnapshot,
  customBlockRules,
  normalizeSiteDomain,
  temporaryPauseRules
} from "./blocker.js";
import {
  appendRedirectStep,
  normalizeRedirectHistory,
  registrableSite,
  sanitizeCleanupSites
} from "./site-tools.js";

const ALARM_NAME = "collect-browser-snapshot";
const CUSTOM_FILTER_FIRST_RULE_ID = 630_000;
const CUSTOM_FILTER_RULE_LIMIT = 500;
const CUSTOM_FILTER_COSMETIC_LIMIT = 500;
const CUSTOM_FILTER_MAX_BYTES = 1_048_576;
const BLOCKING_STATISTICS_KEY = "blockingStatistics";
const ACTIVITY_STATISTICS_KEY = "siteActivityStatistics";
const SITE_DATA_CLEANUP_KEY = "siteDataCleanupSites";
const REDIRECT_HISTORY_KEY = "redirectHistory";
const CONTINUE_WATCHING_KEY = "continueWatching";
const SPONSOR_CACHE_KEY = "sponsorSegmentCache";
const SPONSOR_CACHE_LIMIT = 80;
const SPONSOR_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;
const CONTINUE_WATCHING_LIMIT = 100;
const CONTINUE_WATCHING_TTL_MS = 90 * 24 * 60 * 60 * 1_000;
const CRYPTO_GUARD_COPY_TTL_MS = 5 * 60 * 1_000;
const DEFAULT_PROTECTION_SETTINGS = {
  cookieBannerBlockingEnabled: false,
  newsletterBlockingEnabled: false,
  surveyBlockingEnabled: false,
  notificationPromptBlockingEnabled: false,
  autoplayBlockingEnabled: false,
  floatingVideoBlockingEnabled: false,
  videoAdProtectionEnabled: true,
  sponsorSegmentSkippingEnabled: true,
  adFilterEnabled: true,
  privacyFilterEnabled: true,
  cosmeticFilteringEnabled: true,
  cryptominingProtectionEnabled: true,
  socialWidgetBlockingEnabled: false,
  antiAdblockMessageBlockingEnabled: false,
  regionalRussianFilteringEnabled: true,
  imageSwapEnabled: false,
  imageSwapTheme: "landscape",
  searchProtectionEnabled: true,
  customFilterListURLs: [],
  customFilterListRefreshRequestedAt: null,
  allowlistedSites: [],
  customCosmeticFilters: [],
  customBlockedDomains: [],
  updatedAt: new Date(0).toISOString()
};

const DEFAULT_HISTORY_PRIVACY_SETTINGS = {
  enabled: false,
  domains: [],
  updatedAt: new Date(0).toISOString()
};

const PROTECTION_BOOLEAN_KEYS = [
  "cookieBannerBlockingEnabled", "newsletterBlockingEnabled", "surveyBlockingEnabled",
  "notificationPromptBlockingEnabled", "autoplayBlockingEnabled", "floatingVideoBlockingEnabled",
  "videoAdProtectionEnabled", "sponsorSegmentSkippingEnabled",
  "adFilterEnabled", "privacyFilterEnabled", "cosmeticFilteringEnabled",
  "cryptominingProtectionEnabled", "socialWidgetBlockingEnabled",
  "antiAdblockMessageBlockingEnabled", "regionalRussianFilteringEnabled", "imageSwapEnabled",
  "searchProtectionEnabled"
];

let contentBlockingEnabledCached = true;
let pendingBlockingEvents = [];
let blockingStatisticsTimer = null;
let blockingStatisticsWrite = Promise.resolve();
let activityStatisticsWrite = Promise.resolve();
let continueWatchingWrite = Promise.resolve();
let cryptoGuardCopy = null;
const privacySessions = new Map();
const lastTabOrigins = new Map();
const redirectRequests = new Map();
let redirectHistoryWrite = Promise.resolve();
const BLOCKING_STATISTICS_FLUSH_DELAY_MS = 2_000;
const BLOCKING_STATISTICS_BATCH_SIZE = 500;

chrome.storage.local.get({ contentBlockingEnabled: true }).then(({ contentBlockingEnabled }) => {
  contentBlockingEnabledCached = contentBlockingEnabled !== false;
}).catch(() => {});

function sanitizedStringList(values, { limit, maximumLength, transform = (value) => value } = {}) {
  const result = [];
  for (const rawValue of Array.isArray(values) ? values : []) {
    const value = transform(String(rawValue).trim());
    if (!value || value.length > maximumLength || result.includes(value)) continue;
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function sanitizeProtectionSettings(input, base = DEFAULT_PROTECTION_SETTINGS) {
  const source = input && typeof input === "object" ? input : {};
  const result = { ...DEFAULT_PROTECTION_SETTINGS, ...base };
  for (const key of PROTECTION_BOOLEAN_KEYS) {
    if (typeof source[key] === "boolean") result[key] = source[key];
  }
  result.imageSwapTheme = ["landscape", "ocean", "minimal", "custom"].includes(source.imageSwapTheme)
    ? source.imageSwapTheme
    : result.imageSwapTheme;
  result.allowlistedSites = sanitizedStringList(source.allowlistedSites ?? result.allowlistedSites, {
    limit: 2_000,
    maximumLength: 253,
    transform: normalizeSiteDomain
  });
  result.customBlockedDomains = sanitizedStringList(source.customBlockedDomains ?? result.customBlockedDomains, {
    limit: 1_000,
    maximumLength: 253,
    transform: normalizeSiteDomain
  });
  result.customCosmeticFilters = sanitizedStringList(source.customCosmeticFilters ?? result.customCosmeticFilters, {
    limit: 200,
    maximumLength: 500
  });
  result.customFilterListURLs = normalizedSubscriptionURLs(source.customFilterListURLs ?? result.customFilterListURLs);
  const refreshTime = Date.parse(source.customFilterListRefreshRequestedAt ?? "");
  result.customFilterListRefreshRequestedAt = Number.isFinite(refreshTime)
    ? new Date(refreshTime).toISOString()
    : null;
  const updatedTime = Date.parse(source.updatedAt ?? "");
  result.updatedAt = Number.isFinite(updatedTime) ? new Date(updatedTime).toISOString() : new Date().toISOString();
  return result;
}

async function blockerStorage() {
  return chrome.storage.local.get({
    contentBlockingEnabled: true,
    contentBlockingUpdatedAt: new Date(0).toISOString(),
    allowlistedSites: [],
    temporarySitePauses: {},
    customFilterRuleCount: 0,
    filterSubscriptions: []
  });
}

async function protectionSettingsStorage() {
  const { browserProtectionSettings } = await chrome.storage.local.get({
    browserProtectionSettings: DEFAULT_PROTECTION_SETTINGS
  });
  return sanitizeProtectionSettings(browserProtectionSettings);
}

async function extensionEnabledStorage() {
  const { extensionEnabled } = await chrome.storage.local.get({ extensionEnabled: true });
  return extensionEnabled !== false;
}

async function setExtensionEnabled(enabled) {
  const previous = await extensionEnabledStorage();
  const blocker = await blockerStorage();
  contentBlockingEnabledCached = Boolean(enabled) && blocker.contentBlockingEnabled;
  try {
    await chrome.storage.local.set({
      extensionEnabled: Boolean(enabled),
      extensionEnabledUpdatedAt: new Date().toISOString()
    });
    await disableActionCount();
    await applyProtectionConfiguration(await protectionSettingsStorage());
    await syncCosmeticFilteringForAllTabs();
    return await collectSnapshot();
  } catch (error) {
    contentBlockingEnabledCached = previous && blocker.contentBlockingEnabled;
    await chrome.storage.local.set({
      extensionEnabled: previous,
      extensionEnabledUpdatedAt: new Date().toISOString()
    }).catch(() => {});
    await disableActionCount().catch(() => {});
    throw error;
  }
}

async function linkSafetyStorage() {
  const stored = await chrome.storage.local.get({
    linkSafetySettings: DEFAULT_LINK_SAFETY_SETTINGS,
    linkSafetyAllowedDomains: [],
    linkSafetyBlockedDomains: []
  });
  return {
    settings: normalizeLinkSafetySettings(stored.linkSafetySettings),
    allowedDomains: sanitizeLinkSafetyDomains(stored.linkSafetyAllowedDomains),
    blockedDomains: sanitizeLinkSafetyDomains(stored.linkSafetyBlockedDomains)
  };
}

function normalizeHistoryPrivacySettings(input = DEFAULT_HISTORY_PRIVACY_SETTINGS) {
  const source = input && typeof input === "object" ? input : {};
  const updatedAt = Date.parse(source.updatedAt ?? "");
  return {
    enabled: source.enabled === true,
    domains: sanitizeLinkSafetyDomains(source.domains ?? [], 500),
    updatedAt: Number.isFinite(updatedAt) ? new Date(updatedAt).toISOString() : new Date().toISOString()
  };
}

async function historyPrivacyStorage() {
  const { historyPrivacySettings } = await chrome.storage.local.get({
    historyPrivacySettings: DEFAULT_HISTORY_PRIVACY_SETTINGS
  });
  return normalizeHistoryPrivacySettings(historyPrivacySettings);
}

async function setHistoryPrivacySettings(partial = {}) {
  const current = await historyPrivacyStorage();
  const next = normalizeHistoryPrivacySettings({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString()
  });
  await chrome.storage.local.set({ historyPrivacySettings: next });
  if (next.enabled) await purgeHistoryPrivacyDomains(next.domains);
  await notifyHistoryPrivacyDomainsForAllTabs(next);
  return next;
}

async function historyPermissionGranted() {
  return chrome.permissions.contains({ permissions: ["history"] }).catch(() => false);
}

async function purgeHistoryPrivacyDomain(domain) {
  const normalized = sanitizeLinkSafetyDomains([domain])[0];
  if (!normalized || !await historyPermissionGranted()) return { ok: false, deleted: 0, permissionRequired: true };
  const results = await chrome.history.search({
    text: normalized.split(".")[0],
    startTime: 0,
    maxResults: 1_000
  });
  let deleted = 0;
  for (const item of results) {
    const parsed = parseURLParts(item.url);
    if (parsed?.registrableDomain !== normalized) continue;
    await chrome.history.deleteUrl({ url: item.url });
    deleted += 1;
  }
  return { ok: true, deleted };
}

async function purgeHistoryPrivacyDomains(domains) {
  let deleted = 0;
  let permissionRequired = false;
  for (const domain of sanitizeLinkSafetyDomains(domains)) {
    const result = await purgeHistoryPrivacyDomain(domain);
    deleted += result.deleted ?? 0;
    permissionRequired ||= Boolean(result.permissionRequired);
  }
  return { ok: !permissionRequired, deleted, permissionRequired };
}

async function addHistoryPrivacyDomain(domain) {
  const normalized = sanitizeLinkSafetyDomains([domain])[0];
  if (!normalized) throw new Error("The domain could not be identified");
  const current = await historyPrivacyStorage();
  const next = await setHistoryPrivacySettings({
    ...current,
    domains: [...new Set([...current.domains, normalized])].sort()
  });
  return { ok: true, settings: next };
}

async function notifyHistoryPrivacyDomainsForTab(tabId, settings = null) {
  const state = settings ?? await historyPrivacyStorage();
  try {
    await chrome.tabs.sendMessage(tabId, {
      kind: "setHistoryPrivacyDomains",
      enabled: state.enabled,
      domains: state.domains
    });
  } catch {
    // Pages without the content script are ignored.
  }
}

async function notifyHistoryPrivacyDomainsForAllTabs(settings = null) {
  const state = settings ?? await historyPrivacyStorage();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs
    .filter((tab) => typeof tab.id === "number" && /^https?:/.test(tab.url ?? ""))
    .map((tab) => notifyHistoryPrivacyDomainsForTab(tab.id, state)));
}

async function setLinkSafetySettings(partial) {
  const current = await linkSafetyStorage();
  const nextSettings = normalizeLinkSafetySettings({
    ...current.settings,
    ...(partial?.settings ?? {}),
    updatedAt: new Date().toISOString()
  });
  const nextAllowed = partial?.allowedDomains
    ? sanitizeLinkSafetyDomains(partial.allowedDomains)
    : current.allowedDomains;
  const nextBlocked = partial?.blockedDomains
    ? sanitizeLinkSafetyDomains(partial.blockedDomains)
    : current.blockedDomains;
  await chrome.storage.local.set({
    linkSafetySettings: nextSettings,
    linkSafetyAllowedDomains: nextAllowed,
    linkSafetyBlockedDomains: nextBlocked
  });
  return { settings: nextSettings, allowedDomains: nextAllowed, blockedDomains: nextBlocked };
}

function linkWarningURL(result, targetUrl, sourceUrl = "") {
  const parameters = new URLSearchParams({
    url: targetUrl,
    risk: result.risk,
    action: result.action,
    domain: result.registrableDomain ?? "",
    source: sourceUrl
  });
  for (const reason of result.reasons.slice(0, 8)) {
    parameters.append("reason", reason.message);
  }
  return chrome.runtime.getURL(`link-warning.html?${parameters.toString()}`);
}

async function evaluateLinkSafetyForNavigation(message, sender) {
  if (!await extensionEnabledStorage()) return { action: "allow", url: message.url };
  const targetUrl = String(message.url ?? "");
  const sourceUrl = String(message.sourceUrl ?? sender?.url ?? "");
  const target = parseURLParts(targetUrl);
  if (!target) return { action: "allow", url: targetUrl };
  const state = await linkSafetyStorage();
  const result = evaluateLinkSafety(target.href, {
    ...state,
    sourceUrl
  });
  if (!["warn", "block"].includes(result.action)) return { ...result, warningUrl: "" };
  enqueueBlockingEvent({
    type: "link",
    site: parseURLParts(sourceUrl)?.registrableDomain ?? "unknown",
    resource: result.registrableDomain ?? target.hostname
  });
  return {
    ...result,
    warningUrl: linkWarningURL(result, target.href, sourceUrl)
  };
}

async function allowLinkSafetyDomain(domain) {
  const parsed = parseURLParts(domain);
  const registrableDomain = parsed?.registrableDomain ?? "";
  if (!registrableDomain) throw new Error("The domain could not be identified");
  const state = await linkSafetyStorage();
  const allowedDomains = [...new Set([...state.allowedDomains, registrableDomain])].sort().slice(0, 500);
  const blockedDomains = state.blockedDomains.filter((value) => value !== registrableDomain);
  await chrome.storage.local.set({ linkSafetyAllowedDomains: allowedDomains, linkSafetyBlockedDomains: blockedDomains });
  return { ok: true, domain: registrableDomain, allowedDomains, blockedDomains };
}

async function blockLinkSafetyDomain(domain) {
  const parsed = parseURLParts(domain);
  const registrableDomain = parsed?.registrableDomain ?? "";
  if (!registrableDomain) throw new Error("The domain could not be identified");
  const state = await linkSafetyStorage();
  const blockedDomains = [...new Set([...state.blockedDomains, registrableDomain])].sort().slice(0, 500);
  const allowedDomains = state.allowedDomains.filter((value) => value !== registrableDomain);
  await chrome.storage.local.set({ linkSafetyAllowedDomains: allowedDomains, linkSafetyBlockedDomains: blockedDomains });
  return { ok: true, domain: registrableDomain, allowedDomains, blockedDomains };
}

function hostnameFromURL(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return /^[a-z0-9.-]+$/i.test(hostname) ? hostname : "";
  } catch {
    return "";
  }
}

function registrableDomainFromURL(value) {
  return parseURLParts(value)?.registrableDomain ?? hostnameFromURL(value);
}

function privacySession(tabId, site, { reset = false } = {}) {
  if (!Number.isInteger(tabId) || tabId < 0 || !site) return null;
  const current = privacySessions.get(tabId);
  if (!reset && current?.site === site) return current;
  const next = {
    site,
    startedAt: Date.now(),
    thirdPartyRequests: 0,
    blockedRequests: 0,
    thirdPartyDomains: new Map(),
    blockedDomains: new Map()
  };
  privacySessions.set(tabId, next);
  return next;
}

function recordPrivacyRequest(details) {
  if (!Number.isInteger(details.tabId) || details.tabId < 0 || !/^https?:/i.test(details.url ?? "")) return;
  const resourceDomain = registrableDomainFromURL(details.url);
  if (!resourceDomain) return;
  if (details.type === "main_frame") {
    privacySession(details.tabId, resourceDomain, { reset: true });
    return;
  }
  const sourceURL = details.initiator || details.documentUrl || "";
  const site = registrableDomainFromURL(sourceURL) || privacySessions.get(details.tabId)?.site;
  const session = privacySession(details.tabId, site);
  if (!session || resourceDomain === session.site) return;
  session.thirdPartyRequests += 1;
  session.thirdPartyDomains.set(
    resourceDomain,
    (session.thirdPartyDomains.get(resourceDomain) ?? 0) + 1
  );
  if (session.thirdPartyDomains.size > 80) {
    const leastUsed = [...session.thirdPartyDomains.entries()]
      .sort((left, right) => left[1] - right[1])
      .slice(0, session.thirdPartyDomains.size - 80);
    for (const [domain] of leastUsed) session.thirdPartyDomains.delete(domain);
  }
}

function recordPrivacyBlock(tabId, pageURL, resourceDomain) {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  const site = registrableDomainFromURL(pageURL) || privacySessions.get(tabId)?.site;
  const session = privacySession(tabId, site);
  if (session) {
    session.blockedRequests += 1;
    if (resourceDomain) {
      session.blockedDomains.set(
        resourceDomain,
        (session.blockedDomains.get(resourceDomain) ?? 0) + 1
      );
      if (session.blockedDomains.size > 150) {
        const leastUsed = [...session.blockedDomains.entries()]
          .sort((left, right) => left[1] - right[1])
          .slice(0, session.blockedDomains.size - 150);
        for (const [domain] of leastUsed) session.blockedDomains.delete(domain);
      }
    }
  }
}

function normalizedContinueWatching(input) {
  const now = Date.now();
  const entries = Object.entries(input?.entries ?? {}).flatMap(([identity, entry]) => {
    const updatedAt = Number(entry?.updatedAt);
    const position = Number(entry?.position);
    const duration = Number(entry?.duration);
    if (!/^[a-f0-9]{64}$/.test(identity) || !Number.isFinite(updatedAt)
        || now - updatedAt > CONTINUE_WATCHING_TTL_MS
        || !Number.isFinite(position) || position <= 0
        || !Number.isFinite(duration) || duration < 120) return [];
    const title = String(entry?.title ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    const episode = String(entry?.episode ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const site = String(entry?.site ?? "").toLowerCase().replace(/^www\./, "").slice(0, 253);
    const mediaType = ["episode", "movie", "video"].includes(entry?.mediaType)
      ? entry.mediaType
      : "video";
    let url = "";
    try {
      const parsed = new URL(String(entry?.url ?? ""));
      if (["http:", "https:"].includes(parsed.protocol)) {
        parsed.username = "";
        parsed.password = "";
        parsed.hash = "";
        for (const key of [...parsed.searchParams.keys()]) {
          if (/^(?:utm_.+|token|session|auth|authorization|signature|sig|key|expires)$/i.test(key)) {
            parsed.searchParams.delete(key);
          }
        }
        url = parsed.href.slice(0, 2_048);
      }
    } catch {}
    return [[identity, { position, duration, updatedAt, title, episode, site, mediaType, url }]];
  }).sort((left, right) => right[1].updatedAt - left[1].updatedAt).slice(0, CONTINUE_WATCHING_LIMIT);
  return { version: 2, entries: Object.fromEntries(entries) };
}

async function getContinueWatchingPosition(identity) {
  if (!/^[a-f0-9]{64}$/.test(String(identity ?? ""))) return {};
  await continueWatchingWrite;
  const stored = await chrome.storage.local.get({ [CONTINUE_WATCHING_KEY]: { version: 2, entries: {} } });
  return normalizedContinueWatching(stored[CONTINUE_WATCHING_KEY]).entries[identity] ?? {};
}

async function getContinueWatchingList() {
  await continueWatchingWrite;
  const stored = await chrome.storage.local.get({ [CONTINUE_WATCHING_KEY]: { version: 2, entries: {} } });
  return Object.entries(normalizedContinueWatching(stored[CONTINUE_WATCHING_KEY]).entries)
    .map(([identity, entry]) => ({ identity, ...entry }))
    .filter((entry) => entry.url && entry.site);
}

function setContinueWatchingPosition({
  identity, position, duration, completed, title, episode, mediaType, pageURL
}) {
  if (!/^[a-f0-9]{64}$/.test(String(identity ?? ""))) return Promise.resolve({ ok: false });
  continueWatchingWrite = continueWatchingWrite.then(async () => {
    const stored = await chrome.storage.local.get({ [CONTINUE_WATCHING_KEY]: { version: 2, entries: {} } });
    const normalized = normalizedContinueWatching(stored[CONTINUE_WATCHING_KEY]);
    if (completed || !Number.isFinite(position) || position < 10 || position >= duration - 20) {
      delete normalized.entries[identity];
    } else if (Number.isFinite(duration) && duration >= 120) {
      let site = "";
      try { site = new URL(pageURL).hostname.replace(/^www\./, ""); } catch {}
      normalized.entries[identity] = {
        position: Math.round(position * 10) / 10,
        duration: Math.round(duration * 10) / 10,
        updatedAt: Date.now(),
        title,
        episode,
        mediaType,
        site,
        url: pageURL
      };
    }
    await chrome.storage.local.set({ [CONTINUE_WATCHING_KEY]: normalizedContinueWatching(normalized) });
  }).catch(() => {});
  return continueWatchingWrite.then(() => ({ ok: true }));
}

async function sitePrivacyReceipt(tabId, url) {
  const site = registrableDomainFromURL(url);
  const session = privacySessions.get(tabId);
  const relevantSession = session?.site === site ? session : null;
  const [signals, protection] = await Promise.all([
    Number.isInteger(tabId)
      ? chrome.tabs.sendMessage(tabId, { kind: "getPagePrivacySignals" }).catch(() => ({}))
      : Promise.resolve({}),
    contentBlockingState(url).catch(() => ({})),
    flushBlockingEvents()
  ]);
  const stored = await chrome.storage.local.get({ [BLOCKING_STATISTICS_KEY]: { version: 1, days: {} } });
  const summary = summarizeBlockingStatistics(stored[BLOCKING_STATISTICS_KEY]);
  const blockedToday = Object.entries(summary.today?.sites ?? {}).reduce((total, [domain, count]) => {
    return domain === site || domain.endsWith(`.${site}`) ? total + count : total;
  }, 0);
  return {
    domain: site,
    startedAt: relevantSession?.startedAt ?? Date.now(),
    thirdPartyRequests: relevantSession?.thirdPartyRequests ?? 0,
    blockedRequests: relevantSession?.blockedRequests ?? 0,
    blockedToday,
    thirdPartyDomains: [...(relevantSession?.thirdPartyDomains ?? new Map()).entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 100)
      .map(([domain, count]) => ({ domain, count })),
    blockedDomains: [...(relevantSession?.blockedDomains ?? new Map()).entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 100)
      .map(([domain, count]) => ({ domain, count })),
    firstPartyCookies: Number(signals?.firstPartyCookies) || 0,
    localStorageKeys: Number(signals?.localStorageKeys) || 0,
    sessionStorageKeys: Number(signals?.sessionStorageKeys) || 0,
    notificationPermission: String(signals?.notificationPermission ?? "unknown"),
    secureContext: signals?.secureContext === true,
    protectionActive: protection?.enabled !== false && !protection?.siteAllowlisted && !protection?.sitePausedUntil,
    localOnly: true
  };
}

function enqueueBlockingEvent(event) {
  pendingBlockingEvents.push(event);
  if (pendingBlockingEvents.length >= BLOCKING_STATISTICS_BATCH_SIZE) {
    void flushBlockingEvents();
    return;
  }
  if (!blockingStatisticsTimer) {
    blockingStatisticsTimer = setTimeout(
      () => void flushBlockingEvents(),
      BLOCKING_STATISTICS_FLUSH_DELAY_MS
    );
  }
}

function flushBlockingEvents() {
  clearTimeout(blockingStatisticsTimer);
  blockingStatisticsTimer = null;
  const events = pendingBlockingEvents.splice(0);
  if (events.length === 0) return blockingStatisticsWrite;
  blockingStatisticsWrite = blockingStatisticsWrite.then(async () => {
    const stored = await chrome.storage.local.get({ [BLOCKING_STATISTICS_KEY]: { version: 1, days: {} } });
    let statistics = normalizeBlockingStatistics(stored[BLOCKING_STATISTICS_KEY]);
    for (const event of events) statistics = recordBlockingEvent(statistics, event);
    await chrome.storage.local.set({ [BLOCKING_STATISTICS_KEY]: statistics });
  }).catch(() => {});
  return blockingStatisticsWrite;
}

async function recordObservedNetworkBlock(details) {
  if (!contentBlockingEnabledCached || details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  const resource = hostnameFromURL(details.url);
  if (!resource || resource.endsWith(".ajay.app")) return;
  let site = hostnameFromURL(details.initiator) || hostnameFromURL(details.documentUrl);
  if (!site && Number.isInteger(details.tabId) && details.tabId >= 0) {
    try {
      site = hostnameFromURL((await chrome.tabs.get(details.tabId)).url);
    } catch {
      // A request may finish after its tab has closed.
    }
  }
  if (!site) return;
  recordPrivacyBlock(details.tabId, details.initiator || details.documentUrl || "", resource);
  enqueueBlockingEvent({ type: "network", site, resource });
}

function validYouTubeVideoID(value) {
  const videoID = String(value ?? "");
  return /^[A-Za-z0-9_-]{11}$/.test(videoID) ? videoID : "";
}

async function sponsorHashPrefix(videoID) {
  const bytes = new TextEncoder().encode(videoID);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest.slice(0, 2)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeSponsorSegments(payload, videoID) {
  const matching = Array.isArray(payload)
    ? payload.find((entry) => entry?.videoID === videoID)?.segments
    : null;
  if (!Array.isArray(matching)) return [];
  return matching.flatMap((entry) => {
    const start = Number(entry?.segment?.[0]);
    const end = Number(entry?.segment?.[1]);
    const category = ["sponsor", "selfpromo"].includes(entry?.category) ? entry.category : null;
    if (!category || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return [];
    return [{
      start: Math.round(start * 100) / 100,
      end: Math.round(end * 100) / 100,
      category,
      uuid: String(entry.UUID ?? `${category}:${start}:${end}`).slice(0, 100)
    }];
  }).slice(0, 30);
}

async function getSponsorSegments(videoID) {
  const normalizedID = validYouTubeVideoID(videoID);
  if (!normalizedID) return [];
  const settings = await protectionSettingsStorage();
  if (!settings.sponsorSegmentSkippingEnabled) return [];
  const now = Date.now();
  const stored = await chrome.storage.local.get({ [SPONSOR_CACHE_KEY]: {} });
  const cache = stored[SPONSOR_CACHE_KEY] && typeof stored[SPONSOR_CACHE_KEY] === "object"
    ? stored[SPONSOR_CACHE_KEY]
    : {};
  if (Array.isArray(cache[normalizedID]?.segments)
      && now - Date.parse(cache[normalizedID].updatedAt ?? "") < SPONSOR_CACHE_TTL_MS) {
    return cache[normalizedID].segments;
  }

  const prefix = await sponsorHashPrefix(normalizedID);
  const categories = encodeURIComponent(JSON.stringify(["sponsor", "selfpromo"]));
  const actions = encodeURIComponent(JSON.stringify(["skip"]));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  let segments = [];
  try {
    const response = await fetch(
      `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${categories}&actionTypes=${actions}`,
      { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal }
    );
    if (response.status !== 404) {
      if (!response.ok) throw new Error(`SponsorBlock HTTP ${response.status}`);
      segments = sanitizeSponsorSegments(await response.json(), normalizedID);
    }
  } finally {
    clearTimeout(timeout);
  }
  cache[normalizedID] = { segments, updatedAt: new Date(now).toISOString() };
  const compactCache = Object.fromEntries(
    Object.entries(cache)
      .sort((left, right) => Date.parse(right[1]?.updatedAt ?? "") - Date.parse(left[1]?.updatedAt ?? ""))
      .slice(0, SPONSOR_CACHE_LIMIT)
  );
  await chrome.storage.local.set({ [SPONSOR_CACHE_KEY]: compactCache });
  return segments;
}

function senderIsYouTube(sender) {
  return ["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostnameFromURL(sender?.url));
}

async function setupContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "browser-monitor-block-element",
    title: "Block selected element",
    contexts: ["page", "image", "video", "frame", "selection", "link"]
  });
  chrome.contextMenus.create({
    id: "browser-monitor-allowlist-site",
    title: "Exclude this site from blocking",
    contexts: ["page", "image", "video", "frame", "selection", "link"]
  });
  chrome.contextMenus.create({
    id: "browser-monitor-block-link-domain",
    title: "Block this domain in Link Safety",
    contexts: ["page", "link"]
  });
  chrome.contextMenus.create({
    id: "browser-monitor-hide-history-domain",
    title: "Hide this site from browser history",
    contexts: ["page", "link"]
  });
}

async function installAllowlistRules(domains) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current
    .filter((rule) => rule.id >= 500_000 && rule.id < 600_000)
    .map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: allowlistRules(domains)
  });
}

async function installCustomBlockRules(domains) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current
    .filter((rule) => rule.id >= 600_000 && rule.id < 601_000)
    .map((rule) => rule.id);
  const addRules = customBlockRules(domains ?? []);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function installTemporaryPauseRules(pauses) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current
    .filter((rule) => rule.id >= 610_000 && rule.id < 611_000)
    .map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: temporaryPauseRules(pauses)
  });
}

async function installCryptominingRules(enabled) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current
    .filter((rule) => rule.id >= 620_000 && rule.id < 620_500)
    .map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: enabled ? CRYPTO_MINING_RULES : []
  });
}

function normalizedSubscriptionURLs(values) {
  const urls = [];
  for (const value of values ?? []) {
    try {
      const url = new URL(String(value).trim());
      if (url.protocol !== "https:" || !url.hostname || url.href.length > 2_048) continue;
      url.hash = "";
      if (!urls.includes(url.href)) urls.push(url.href);
    } catch {
      // Invalid and non-HTTPS subscriptions are ignored.
    }
    if (urls.length >= 2) break;
  }
  return urls;
}

async function readLimitedResponseText(response) {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > CUSTOM_FILTER_MAX_BYTES) throw new Error("Filter list is larger than 1 MB");
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > CUSTOM_FILTER_MAX_BYTES) throw new Error("Filter list is larger than 1 MB");
    return new TextDecoder().decode(buffer);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > CUSTOM_FILTER_MAX_BYTES) {
      await reader.cancel();
      throw new Error("Filter list is larger than 1 MB");
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

async function fetchFilterSubscription(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.url.startsWith("https://")) throw new Error("Filter list redirected to a non-HTTPS address");
    const text = await readLimitedResponseText(response);
    if (!text.includes("[Adblock")) throw new Error("The response is not an AdBlock filter list");
    return compileFilterList(text, {
      firstRuleId: 0,
      networkLimit: CUSTOM_FILTER_RULE_LIMIT,
      cosmeticLimit: CUSTOM_FILTER_COSMETIC_LIMIT,
      priority: 12_000
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function addValidDynamicRuleBatch(rules) {
  if (rules.length === 0) return [];
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
    return rules;
  } catch {
    if (rules.length === 1) return [];
    const midpoint = Math.ceil(rules.length / 2);
    return [
      ...await addValidDynamicRuleBatch(rules.slice(0, midpoint)),
      ...await addValidDynamicRuleBatch(rules.slice(midpoint))
    ];
  }
}

async function installCustomSubscriptionRules(rules) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current
    .filter((rule) => rule.id >= CUSTOM_FILTER_FIRST_RULE_ID
      && rule.id < CUSTOM_FILTER_FIRST_RULE_ID + CUSTOM_FILTER_RULE_LIMIT)
    .map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
  return addValidDynamicRuleBatch(rules);
}

async function refreshCustomFilterSubscriptions(settings, { force = false, reinstall = false } = {}) {
  const urls = normalizedSubscriptionURLs(settings.customFilterListURLs);
  const state = await chrome.storage.local.get({
    customFilterSubscriptionCache: {},
    customFilterSubscriptionURLs: [],
    customFilterListRefreshHandledAt: new Date(0).toISOString(),
    filterSubscriptions: []
  });
  const requestTime = Date.parse(settings.customFilterListRefreshRequestedAt ?? "");
  const handledTime = Date.parse(state.customFilterListRefreshHandledAt ?? "");
  const urlsChanged = JSON.stringify(urls) !== JSON.stringify(state.customFilterSubscriptionURLs);
  const refreshRequested = Number.isFinite(requestTime)
    && (!Number.isFinite(handledTime) || requestTime > handledTime);
  const now = Date.now();
  const cache = Object.fromEntries(
    Object.entries(state.customFilterSubscriptionCache).filter(([url]) => urls.includes(url))
  );
  let didRefresh = force || urlsChanged || refreshRequested;

  for (const url of urls) {
    const previous = cache[url];
    const due = force || urlsChanged || refreshRequested
      || !previous
      || Date.parse(previous.nextUpdateAt ?? "") <= now;
    if (!due) continue;
    didRefresh = true;
    try {
      const compiled = await fetchFilterSubscription(url);
      const updatedAt = new Date().toISOString();
      cache[url] = {
        title: compiled.title,
        version: compiled.version,
        updatedAt,
        nextUpdateAt: new Date(now + compiled.expiresHours * 3_600_000).toISOString(),
        networkRules: compiled.networkRules.map(({ action, condition, priority }) => ({ action, condition, priority })),
        cosmeticSelectors: compiled.cosmeticSelectors,
        error: null
      };
    } catch (error) {
      cache[url] = {
        ...(previous ?? {
          title: new URL(url).hostname,
          version: "unknown",
          networkRules: [],
          cosmeticSelectors: []
        }),
        nextUpdateAt: new Date(now + 3_600_000).toISOString(),
        error: error?.name === "AbortError" ? "Update timed out" : (error?.message ?? "Update failed")
      };
    }
  }

  if (!didRefresh && !reinstall) return state.filterSubscriptions;

  let remainingNetworkRules = CUSTOM_FILTER_RULE_LIMIT;
  let remainingCosmeticRules = CUSTOM_FILTER_COSMETIC_LIMIT;
  const candidateRules = [];
  const cosmeticSelectors = [];
  const statuses = [];
  for (const url of urls) {
    const entry = cache[url];
    if (!entry) continue;
    const selectedNetworkRules = (entry.networkRules ?? []).slice(0, remainingNetworkRules);
    const selectedCosmeticRules = (entry.cosmeticSelectors ?? []).slice(0, remainingCosmeticRules);
    for (const rule of selectedNetworkRules) {
      candidateRules.push({
        id: CUSTOM_FILTER_FIRST_RULE_ID + candidateRules.length,
        priority: rule.priority ?? 12_000,
        action: rule.action,
        condition: rule.condition
      });
    }
    cosmeticSelectors.push(...selectedCosmeticRules);
    remainingNetworkRules -= selectedNetworkRules.length;
    remainingCosmeticRules -= selectedCosmeticRules.length;
    statuses.push({
      url,
      title: entry.title,
      version: entry.version,
      updatedAt: entry.updatedAt ?? null,
      nextUpdateAt: entry.nextUpdateAt ?? null,
      networkRuleCount: selectedNetworkRules.length,
      cosmeticRuleCount: selectedCosmeticRules.length,
      error: entry.error ?? null
    });
  }

  const blocker = await blockerStorage();
  const extensionEnabled = await extensionEnabledStorage();
  const installedRules = await installCustomSubscriptionRules(
    extensionEnabled && blocker.contentBlockingEnabled ? candidateRules : []
  );
  await chrome.storage.local.set({
    customFilterSubscriptionCache: cache,
    customFilterSubscriptionURLs: urls,
    customFilterListRefreshHandledAt: Number.isFinite(requestTime)
      ? new Date(requestTime).toISOString()
      : state.customFilterListRefreshHandledAt,
    customFilterRuleCount: installedRules.length,
    customSubscriptionCosmeticFilters: cosmeticSelectors,
    filterSubscriptions: statuses
  });
  return statuses;
}

async function cleanupTemporaryPauses() {
  const state = await blockerStorage();
  const temporarySitePauses = activeTemporaryPauses(state.temporarySitePauses);
  if (JSON.stringify(temporarySitePauses) !== JSON.stringify(state.temporarySitePauses)) {
    await chrome.storage.local.set({ temporarySitePauses });
  }
  await installTemporaryPauseRules(temporarySitePauses);
  return temporarySitePauses;
}

async function applyProtectionConfiguration(settings) {
  const blocker = await blockerStorage();
  const extensionEnabled = await extensionEnabledStorage();
  const effectiveContentBlockingEnabled = extensionEnabled && blocker.contentBlockingEnabled;
  const enabledRulesets = effectiveContentBlockingEnabled
    ? [
        settings.adFilterEnabled ? "easylist" : null,
        settings.privacyFilterEnabled ? "easyprivacy" : null,
        settings.adFilterEnabled && settings.regionalRussianFilteringEnabled ? "ruadlist" : null
      ].filter(Boolean)
    : [];
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledRulesets,
    disableRulesetIds: CONTENT_BLOCKER_RULESET_IDS.filter((id) => !enabledRulesets.includes(id))
  });
  await installAllowlistRules(settings.allowlistedSites ?? []);
  await installCustomBlockRules(effectiveContentBlockingEnabled ? (settings.customBlockedDomains ?? []) : []);
  await installTemporaryPauseRules(effectiveContentBlockingEnabled ? activeTemporaryPauses(blocker.temporarySitePauses) : {});
  await installCryptominingRules(
    effectiveContentBlockingEnabled && settings.cryptominingProtectionEnabled
  );
  await refreshCustomFilterSubscriptions(settings, { reinstall: true });
  await chrome.storage.local.set({ allowlistedSites: settings.allowlistedSites ?? [] });
  await syncCosmeticFilteringForAllTabs();
}

async function syncCosmeticFilteringForTab(tabId, url) {
  if (!/^https?:\/\//.test(url ?? "")) return;
  const extensionEnabled = await extensionEnabledStorage();
  const state = await blockerStorage();
  const settings = await protectionSettingsStorage();
  const domain = normalizeSiteDomain(url);
  const activePauses = activeTemporaryPauses(state.temporarySitePauses);
  const siteProtectionActive = extensionEnabled
    && state.contentBlockingEnabled
    && !state.allowlistedSites.includes(domain)
    && !activePauses[domain];
  const styles = [
    ["rules/easylist-cosmetic.css", siteProtectionActive && settings.cosmeticFilteringEnabled],
    ["rules/easylist-cookie-cosmetic.css", siteProtectionActive && settings.cookieBannerBlockingEnabled],
    ["rules/ruadlist-cosmetic.css", siteProtectionActive && settings.cosmeticFilteringEnabled && settings.regionalRussianFilteringEnabled],
    ["rules/fanboy-social-cosmetic.css", siteProtectionActive && settings.cosmeticFilteringEnabled && settings.socialWidgetBlockingEnabled],
    ["rules/antiadblock-cosmetic.css", siteProtectionActive && settings.cosmeticFilteringEnabled && settings.antiAdblockMessageBlockingEnabled]
  ];
  for (const [file, selected] of styles) {
    const injection = {
      target: { tabId, allFrames: true },
      files: [file],
      origin: "USER"
    };
    try {
      await chrome.scripting.removeCSS(injection);
    } catch {
      // The stylesheet is absent on first load.
    }
    if (selected) {
      try {
        await chrome.scripting.insertCSS(injection);
      } catch {
        // Restricted frames and tabs transitioning between documents are ignored.
      }
    }
  }
}

async function syncCosmeticFilteringForAllTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => syncCosmeticFilteringForTab(tab.id, tab.url)));
}

async function setSiteAllowlisted(domain, allowlisted) {
  const normalized = normalizeSiteDomain(domain);
  if (!normalized) throw new Error("The current site could not be identified");
  const state = await blockerStorage();
  const sites = new Set(state.allowlistedSites);
  if (allowlisted) sites.add(normalized);
  else sites.delete(normalized);
  const temporarySitePauses = { ...state.temporarySitePauses };
  if (allowlisted) delete temporarySitePauses[normalized];
  const allowlistedSites = [...sites].sort();
  const settings = await protectionSettingsStorage();
  const browserProtectionSettings = {
    ...settings,
    allowlistedSites,
    updatedAt: new Date().toISOString()
  };
  await chrome.storage.local.set({ allowlistedSites, browserProtectionSettings, temporarySitePauses });
  await installAllowlistRules(allowlistedSites);
  await installTemporaryPauseRules(temporarySitePauses);
  await syncCosmeticFilteringForAllTabs();
  return { domain: normalized, allowlisted };
}

async function setSiteTemporarilyPaused(domain, durationMinutes) {
  const normalized = normalizeSiteDomain(domain);
  if (!normalized) throw new Error("The current site could not be identified");
  const state = await blockerStorage();
  const temporarySitePauses = activeTemporaryPauses(state.temporarySitePauses);
  if (durationMinutes > 0) {
    const boundedMinutes = Math.min(Math.max(Number(durationMinutes) || 10, 1), 1_440);
    temporarySitePauses[normalized] = new Date(Date.now() + boundedMinutes * 60_000).toISOString();
  } else {
    delete temporarySitePauses[normalized];
  }
  await chrome.storage.local.set({ temporarySitePauses });
  await installTemporaryPauseRules(temporarySitePauses);
  await syncCosmeticFilteringForAllTabs();
  return temporarySitePauses[normalized] ?? null;
}

async function contentBlockingState(url) {
  const extensionEnabled = await extensionEnabledStorage();
  const state = await blockerStorage();
  const settings = await protectionSettingsStorage();
  const domain = normalizeSiteDomain(url);
  const activePauses = activeTemporaryPauses(state.temporarySitePauses);
  return {
    ...contentBlockingSnapshot(
      extensionEnabled && state.contentBlockingEnabled,
      state.contentBlockingUpdatedAt,
      {
        ...state,
        additionalRuleCount: state.contentBlockingEnabled && settings.cryptominingProtectionEnabled
          ? CRYPTO_MINING_RULES.length + (state.customFilterRuleCount ?? 0)
          : (state.customFilterRuleCount ?? 0)
      }
    ),
    extensionEnabled,
    contentBlockingConfigured: state.contentBlockingEnabled,
    domain,
    siteAllowlisted: domain ? state.allowlistedSites.includes(domain) : false,
    sitePausedUntil: domain ? (activePauses[domain] ?? null) : null,
    allowlistedSites: state.allowlistedSites
  };
}

async function applyContentBlocking(enabled, updatedAt = new Date().toISOString()) {
  const extensionEnabled = await extensionEnabledStorage();
  contentBlockingEnabledCached = extensionEnabled && Boolean(enabled);
  await chrome.storage.local.set({
    contentBlockingEnabled: Boolean(enabled),
    contentBlockingUpdatedAt: updatedAt
  });
  await applyProtectionConfiguration(await protectionSettingsStorage());
  await disableActionCount();
  const state = await blockerStorage();
  return contentBlockingSnapshot(enabled, updatedAt, state);
}

async function pictureInPictureState(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => ({
      active: Boolean(document.pictureInPictureElement),
      mediaElementCount: document.querySelectorAll("video").length
    })
  });
  return {
    active: results.some(({ result }) => result?.active),
    mediaElementCount: results.reduce((total, { result }) => total + (result?.mediaElementCount ?? 0), 0)
  };
}

async function togglePictureInPicture(tabId) {
  const frames = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const videos = Array.from(document.querySelectorAll("video"));
      const candidate = videos
        .filter((video) => !video.disablePictureInPicture && video.readyState > 0)
        .map((video) => ({
          area: video.getBoundingClientRect().width * video.getBoundingClientRect().height,
          playing: !video.paused && !video.ended
        }))
        .sort((left, right) => Number(right.playing) - Number(left.playing) || right.area - left.area)[0];
      return {
        active: Boolean(document.pictureInPictureElement),
        candidate: candidate ?? null,
        videoCount: videos.length
      };
    }
  });

  const activeFrame = frames.find(({ result }) => result?.active);
  if (activeFrame) {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [activeFrame.frameId] },
      func: async () => {
        await document.exitPictureInPicture();
      }
    });
    return { ok: true, active: false, message: "Picture-in-Picture closed" };
  }

  const candidateFrame = frames
    .filter(({ result }) => result?.candidate)
    .sort((left, right) =>
      Number(right.result.candidate.playing) - Number(left.result.candidate.playing)
      || right.result.candidate.area - left.result.candidate.area
    )[0];
  if (!candidateFrame) {
    const videoCount = frames.reduce((total, { result }) => total + (result?.videoCount ?? 0), 0);
    return {
      ok: false,
      active: false,
      message: videoCount > 0
        ? "The video is not ready or the site disabled Picture-in-Picture"
        : "No video was found on the current page"
    };
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [candidateFrame.frameId] },
      func: async () => {
        const videos = Array.from(document.querySelectorAll("video"))
          .filter((video) => !video.disablePictureInPicture && video.readyState > 0)
          .sort((left, right) => {
            const leftPlaying = !left.paused && !left.ended;
            const rightPlaying = !right.paused && !right.ended;
            if (leftPlaying !== rightPlaying) return Number(rightPlaying) - Number(leftPlaying);
            const leftRect = left.getBoundingClientRect();
            const rightRect = right.getBoundingClientRect();
            return rightRect.width * rightRect.height - leftRect.width * leftRect.height;
          });
        const video = videos[0];
        if (!video) return { ok: false, message: "No compatible video was found" };
        await video.requestPictureInPicture();
        return {
          ok: true,
          active: true,
          paused: video.paused,
          message: video.paused ? "Picture-in-Picture opened; start video playback" : "Video is playing in Picture-in-Picture"
        };
      }
    });
    return result ?? { ok: false, active: false, message: "Chrome did not open Picture-in-Picture" };
  } catch (error) {
    return {
      ok: false,
      active: false,
      message: error?.message?.includes("user activation")
        ? "Start playback on the page and try again"
        : (error?.message ?? "Chrome did not open Picture-in-Picture")
    };
  }
}

async function readCookies(url, all = false) {
  if (!all && !/^https?:\/\//.test(url ?? "")) {
    throw new Error("Cookies are unavailable on this page");
  }
  const cookies = await chrome.cookies.getAll(all ? {} : { url });
  cookies.sort((left, right) =>
    left.domain.localeCompare(right.domain)
    || left.path.localeCompare(right.path)
    || left.name.localeCompare(right.name)
  );
  return {
    cookies,
    hostname: all ? "All browser cookies" : new URL(url).hostname,
    all
  };
}

async function cookieExportPayload(url, all, format) {
  const state = await readCookies(url, all);
  return {
    ...state,
    format,
    text: serializeCookies(state.cookies, format),
    filename: cookieExportFilename({ hostname: state.hostname, format, all })
  };
}

async function downloadCookies(url, all, format, saveAs) {
  const payload = await cookieExportPayload(url, all, format);
  const downloadId = await chrome.downloads.download({
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(payload.text)}`,
    filename: payload.filename,
    conflictAction: "uniquify",
    saveAs: Boolean(saveAs)
  });
  return { ok: true, downloadId, count: payload.cookies.length, filename: payload.filename };
}

function unavailableMetrics(tab) {
  return {
    sampleDurationSeconds: 0,
    longFrameCount: 0,
    blockingDurationMS: 0,
    forcedStyleAndLayoutDurationMS: 0,
    resourceCount: 0,
    transferBytes: 0,
    layoutShiftScore: 0,
    backgroundEventCount: 0,
    mediaElementCount: 0,
    visibility: tab.active ? "visible" : "unavailable"
  };
}

async function readTab(tab, ecoTabs) {
  let metrics = unavailableMetrics(tab);
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { kind: "getMetrics" });
    if (response?.available) metrics = response;
  } catch {
    // Restricted, discarded, and pre-installation tabs may not have a content script.
  }

  const assessment = assessTab(metrics, tab);
  return {
    tabId: tab.id,
    title: tab.title ?? "",
    url: tab.url || tab.pendingUrl || "",
    active: Boolean(tab.active),
    audible: Boolean(tab.audible),
    visibility: metrics.visibility,
    metrics: {
      sampleDurationSeconds: metrics.sampleDurationSeconds,
      longFrameCount: metrics.longFrameCount,
      blockingDurationMS: metrics.blockingDurationMS,
      forcedStyleAndLayoutDurationMS: metrics.forcedStyleAndLayoutDurationMS,
      resourceCount: metrics.resourceCount,
      transferBytes: metrics.transferBytes,
      layoutShiftScore: metrics.layoutShiftScore,
      backgroundEventCount: metrics.backgroundEventCount,
      mediaElementCount: metrics.mediaElementCount
    },
    ...assessment,
    measuredAt: new Date().toISOString(),
    ecoModeEnabled: Boolean(ecoTabs[String(tab.id)])
  };
}

async function ecoStorage() {
  return chrome.storage.local.get({
    ecoTabs: {},
    ecoOriginalMuted: {},
    ecoRuleIds: {},
    ecoCommandVersions: {},
    nextEcoRuleId: 100_000
  });
}

async function ensureEcoRule(tabId, state) {
  const key = String(tabId);
  let ruleId = state.ecoRuleIds[key];
  if (!ruleId) {
    ruleId = state.nextEcoRuleId;
    state.nextEcoRuleId += 1;
    state.ecoRuleIds[key] = ruleId;
  }

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [{
      id: ruleId,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: "|http",
        tabIds: [tabId],
        resourceTypes: ["media", "xmlhttprequest", "websocket", "ping"]
      }
    }]
  });
}

async function applyEcoMode(tabId, enabled, requestedAt = new Date().toISOString()) {
  const key = String(tabId);
  const state = await ecoStorage();
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    const ruleId = state.ecoRuleIds[key];
    if (ruleId) {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
    }
    delete state.ecoTabs[key];
    delete state.ecoOriginalMuted[key];
    delete state.ecoRuleIds[key];
    delete state.ecoCommandVersions[key];
    await chrome.storage.local.set(state);
    return;
  }

  if (enabled) {
    if (!(key in state.ecoOriginalMuted)) {
      state.ecoOriginalMuted[key] = Boolean(tab.mutedInfo?.muted);
    }
    state.ecoTabs[key] = true;
    state.ecoCommandVersions[key] = requestedAt;
    await ensureEcoRule(tabId, state);
    await chrome.tabs.update(tabId, { muted: true });
    try {
      await chrome.tabs.sendMessage(tabId, { kind: "setEcoMode", enabled: true });
    } catch {
      // A discarded tab applies Eco Mode when its content script starts again.
    }
    if (!tab.active) {
      try {
        await chrome.tabs.discard(tabId);
      } catch {
        // Chrome may reject discard for a tab transitioning between states.
      }
    }
  } else {
    const ruleId = state.ecoRuleIds[key];
    if (ruleId) {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
    }
    try {
      await chrome.tabs.sendMessage(tabId, { kind: "setEcoMode", enabled: false });
    } catch {
      // Restoring a discarded tab completes when Chrome reloads it.
    }
    await chrome.tabs.update(tabId, { muted: Boolean(state.ecoOriginalMuted[key]) });
    delete state.ecoTabs[key];
    delete state.ecoOriginalMuted[key];
    delete state.ecoRuleIds[key];
    state.ecoCommandVersions[key] = requestedAt;
  }

  await chrome.storage.local.set(state);
}

export async function collectSnapshot() {
  const now = new Date().toISOString();
  const extensionEnabled = await extensionEnabledStorage();
  const state = await chrome.storage.local.get({
    monitoringEnabled: true,
    monitoringUpdatedAt: now,
    ecoTabs: {}
  });
  const blocker = await blockerStorage();
  const protectionSettings = await protectionSettingsStorage();
  const allTabs = await chrome.tabs.query({});
  const supportedTabs = allTabs.filter((tab) => /^https?:\/\//.test(tab.url || tab.pendingUrl || ""));
  const reports = extensionEnabled && state.monitoringEnabled
    ? await Promise.all(supportedTabs.map((tab) => readTab(tab, state.ecoTabs)))
    : [];
  reports.sort((left, right) => right.score - left.score);

  const snapshot = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    browser: "Google Chrome",
    extensionEnabled,
    monitoringEnabled: state.monitoringEnabled,
    monitoringActive: extensionEnabled && state.monitoringEnabled,
    monitoringUpdatedAt: state.monitoringUpdatedAt,
    contentBlocking: contentBlockingSnapshot(
      extensionEnabled && blocker.contentBlockingEnabled,
      blocker.contentBlockingUpdatedAt,
      {
        ...blocker,
        additionalRuleCount: extensionEnabled && blocker.contentBlockingEnabled && protectionSettings.cryptominingProtectionEnabled
          ? CRYPTO_MINING_RULES.length + (blocker.customFilterRuleCount ?? 0)
          : (blocker.customFilterRuleCount ?? 0)
      }
    ),
    protectionSettings: {
      ...protectionSettings,
      allowlistedSites: blocker.allowlistedSites
    },
    filterSubscriptions: blocker.filterSubscriptions ?? [],
    tabs: reports
  };
  await chrome.storage.local.set({ latestSnapshot: snapshot });
  return snapshot;
}

async function disableActionCount() {
  await chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: false
  });
  await chrome.action.setBadgeText({ text: "" });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get([
    "extensionEnabled",
    "extensionEnabledUpdatedAt",
    "monitoringEnabled",
    "monitoringUpdatedAt",
    "contentBlockingEnabled",
    "contentBlockingUpdatedAt",
    "browserProtectionSettings"
  ]);
  if (typeof current.extensionEnabled !== "boolean" || !current.extensionEnabledUpdatedAt) {
    await chrome.storage.local.set({
      extensionEnabled: true,
      extensionEnabledUpdatedAt: new Date().toISOString()
    });
  }
  const blocker = await blockerStorage();
  const initialProtectionSettings = {
    ...DEFAULT_PROTECTION_SETTINGS,
    ...(current.browserProtectionSettings ?? {}),
    allowlistedSites: current.browserProtectionSettings?.allowlistedSites ?? blocker.allowlistedSites
  };
  const sanitizedInitialProtectionSettings = sanitizeProtectionSettings(initialProtectionSettings);
  await chrome.storage.local.set({
    browserProtectionSettings: sanitizedInitialProtectionSettings,
    allowlistedSites: sanitizedInitialProtectionSettings.allowlistedSites
  });
  if (typeof current.monitoringEnabled !== "boolean" || !current.monitoringUpdatedAt) {
    await chrome.storage.local.set({
      monitoringEnabled: true,
      monitoringUpdatedAt: new Date().toISOString()
    });
  }
  if (typeof current.contentBlockingEnabled !== "boolean" || !current.contentBlockingUpdatedAt) {
    await applyContentBlocking(true);
  } else {
    await applyContentBlocking(current.contentBlockingEnabled, current.contentBlockingUpdatedAt);
  }
  await disableActionCount();
  await applyProtectionConfiguration(sanitizedInitialProtectionSettings);
  await notifyHistoryPrivacyDomainsForAllTabs();
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  await setupContextMenus();
  await collectSnapshot();
});

chrome.runtime.onStartup.addListener(async () => {
  contentBlockingEnabledCached = await extensionEnabledStorage() && (await blockerStorage()).contentBlockingEnabled;
  await disableActionCount();
  await applyProtectionConfiguration(await protectionSettingsStorage());
  await notifyHistoryPrivacyDomainsForAllTabs();
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  await setupContextMenus();
  await collectSnapshot();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanupTemporaryPauses()
      .then(() => protectionSettingsStorage())
      .then((settings) => refreshCustomFilterSubscriptions(settings))
      .then(() => syncCosmeticFilteringForAllTabs())
      .then(() => collectSnapshot())
      .catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  privacySessions.delete(tabId);
  const closedOrigin = lastTabOrigins.get(tabId);
  lastTabOrigins.delete(tabId);
  redirectRequests.delete(tabId);
  if (closedOrigin) {
    const site = registrableSite(closedOrigin);
    const stored = await chrome.storage.local.get({ [SITE_DATA_CLEANUP_KEY]: [] });
    const cleanupSites = sanitizeCleanupSites(stored[SITE_DATA_CLEANUP_KEY]);
    if (site && cleanupSites.includes(site) && await chrome.permissions.contains({ permissions: ["browsingData"] })) {
      const remainingTabs = await chrome.tabs.query({});
      const siteStillOpen = remainingTabs.some((tab) => registrableSite(tab.url) === site);
      if (!siteStillOpen) {
        await chrome.browsingData.remove(
          { origins: [closedOrigin] },
          {
            cacheStorage: true,
            cookies: true,
            fileSystems: true,
            indexedDB: true,
            localStorage: true,
            serviceWorkers: true,
            webSQL: true
          }
        ).catch(() => {});
      }
    }
  }
  const state = await ecoStorage();
  const key = String(tabId);
  const ruleId = state.ecoRuleIds[key];
  if (ruleId) {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
  delete state.ecoTabs[key];
  delete state.ecoOriginalMuted[key];
  delete state.ecoRuleIds[key];
  delete state.ecoCommandVersions[key];
  await chrome.storage.local.set(state);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "browser-monitor-block-element" && typeof tab?.id === "number") {
    chrome.tabs.sendMessage(
      tab.id,
      { kind: "startElementPicker", useContextTarget: true },
      Number.isInteger(info.frameId) ? { frameId: info.frameId } : undefined
    ).catch(() => {});
    return;
  }
  const pageURL = info.pageUrl || tab?.url || "";
  if (info.menuItemId === "browser-monitor-allowlist-site" && typeof tab?.id === "number") {
    setSiteAllowlisted(pageURL, true)
      .then(() => chrome.tabs.reload(tab.id))
      .catch(() => {});
    return;
  }
  const targetURL = info.linkUrl || pageURL;
  if (info.menuItemId === "browser-monitor-block-link-domain") {
    blockLinkSafetyDomain(targetURL).catch(() => {});
    return;
  }
  if (info.menuItemId === "browser-monitor-hide-history-domain") {
    addHistoryPrivacyDomain(targetURL).catch(() => {});
    return;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && /^https?:\/\//.test(changeInfo.url)) {
    try { lastTabOrigins.set(tabId, new URL(changeInfo.url).origin); } catch {}
    const result = await evaluateLinkSafetyForNavigation({ url: changeInfo.url, sourceUrl: "" }, { url: "" });
    if (["warn", "block"].includes(result.action) && result.warningUrl && !changeInfo.url.startsWith(chrome.runtime.getURL(""))) {
      await chrome.tabs.update(tabId, { url: result.warningUrl }).catch(() => {});
      return;
    }
    const historySettings = await historyPrivacyStorage();
    if (historySettings.enabled) {
      const domain = parseURLParts(changeInfo.url)?.registrableDomain;
      if (domain && historySettings.domains.includes(domain)) purgeHistoryPrivacyDomain(domain).catch(() => {});
    }
  }
  if (changeInfo.status === "complete") {
    await syncCosmeticFilteringForTab(tabId, tab.url);
    await notifyHistoryPrivacyDomainsForTab(tabId).catch(() => {});
  }
});

chrome.webRequest.onErrorOccurred.addListener((details) => {
  void recordObservedNetworkBlock(details);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onBeforeRequest.addListener((details) => {
  recordPrivacyRequest(details);
  if (details.type === "main_frame" && details.tabId >= 0 && /^https?:/i.test(details.url)) {
    try { lastTabOrigins.set(details.tabId, new URL(details.url).origin); } catch {}
    const current = redirectRequests.get(details.tabId);
    const steps = current?.requestId === details.requestId ? current.steps : [];
    redirectRequests.set(details.tabId, {
      requestId: details.requestId,
      createdAt: Date.now(),
      steps: appendRedirectStep(steps, details.url)
    });
  }
}, { urls: ["<all_urls>"] });

chrome.webRequest.onBeforeRedirect.addListener((details) => {
  if (details.type !== "main_frame" || details.tabId < 0) return;
  const current = redirectRequests.get(details.tabId) ?? {
    requestId: details.requestId,
    createdAt: Date.now(),
    steps: []
  };
  current.steps = appendRedirectStep(appendRedirectStep(current.steps, details.url), details.redirectUrl);
  redirectRequests.set(details.tabId, current);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.type !== "main_frame" || details.tabId < 0) return;
  const current = redirectRequests.get(details.tabId);
  if (!current || current.requestId !== details.requestId) return;
  current.steps = appendRedirectStep(current.steps, details.url);
  redirectRequests.delete(details.tabId);
  if (current.steps.length < 2) return;
  redirectHistoryWrite = redirectHistoryWrite.then(async () => {
    const stored = await chrome.storage.local.get({ [REDIRECT_HISTORY_KEY]: { version: 1, entries: [] } });
    const history = normalizeRedirectHistory(stored[REDIRECT_HISTORY_KEY]);
    history.entries.unshift({ createdAt: current.createdAt, steps: current.steps });
    await chrome.storage.local.set({ [REDIRECT_HISTORY_KEY]: normalizeRedirectHistory(history) });
  }).catch(() => {});
}, { urls: ["<all_urls>"] });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.kind === "rememberCryptoGuardCopy") {
    const fingerprint = String(message.fingerprint ?? "");
    const family = String(message.family ?? "").slice(0, 40);
    if (/^[a-f0-9]{64}$/.test(fingerprint) && family) {
      cryptoGuardCopy = {
        fingerprint,
        family,
        expiresAt: Date.now() + CRYPTO_GUARD_COPY_TTL_MS
      };
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false });
    }
    return false;
  }
  if (message?.kind === "verifyCryptoGuardPaste") {
    const fingerprint = String(message.fingerprint ?? "");
    const family = String(message.family ?? "").slice(0, 40);
    if (!cryptoGuardCopy || cryptoGuardCopy.expiresAt <= Date.now()) {
      cryptoGuardCopy = null;
      sendResponse({ known: false, matches: true });
    } else {
      sendResponse({
        known: cryptoGuardCopy.family === family,
        matches: cryptoGuardCopy.family !== family || cryptoGuardCopy.fingerprint === fingerprint
      });
    }
    return false;
  }
  if (message?.kind === "getContinueWatchingPosition") {
    getContinueWatchingPosition(String(message.identity ?? ""))
      .then(sendResponse)
      .catch(() => sendResponse({}));
    return true;
  }
  if (message?.kind === "getContinueWatchingList") {
    getContinueWatchingList()
      .then((entries) => sendResponse({ entries }))
      .catch(() => sendResponse({ entries: [] }));
    return true;
  }
  if (message?.kind === "setContinueWatchingPosition") {
    setContinueWatchingPosition({
      identity: String(message.identity ?? ""),
      position: Number(message.position),
      duration: Number(message.duration),
      completed: message.completed === true,
      title: String(message.title ?? ""),
      episode: String(message.episode ?? ""),
      mediaType: String(message.mediaType ?? ""),
      pageURL: String(sender.tab?.url ?? message.pageURL ?? "")
    }).then(sendResponse).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.kind === "getSitePrivacyReceipt") {
    sitePrivacyReceipt(Number(message.tabId), String(message.url ?? ""))
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error?.message ?? "Privacy receipt is unavailable" }));
    return true;
  }
  if (message?.kind === "recordSiteActivity" && sender?.tab && /^https?:/i.test(sender.url ?? "")) {
    const domain = hostnameFromURL(sender.url);
    activityStatisticsWrite = activityStatisticsWrite.then(async () => {
      const stored = await chrome.storage.local.get({ [ACTIVITY_STATISTICS_KEY]: { version: 1, days: {} } });
      const updated = recordActivitySample(stored[ACTIVITY_STATISTICS_KEY], message, domain);
      await chrome.storage.local.set({ [ACTIVITY_STATISTICS_KEY]: updated });
    });
    activityStatisticsWrite.then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.kind === "getSiteActivityStatistics") {
    activityStatisticsWrite.then(async () => {
      const stored = await chrome.storage.local.get({ [ACTIVITY_STATISTICS_KEY]: { version: 1, days: {} } });
      sendResponse(summarizeActivityStatistics(stored[ACTIVITY_STATISTICS_KEY], message.period));
    });
    return true;
  }
  if (message?.kind === "getSiteDataCleanupState") {
    if (Number.isInteger(message.tabId)) {
      try { lastTabOrigins.set(message.tabId, new URL(message.url).origin); } catch {}
    }
    chrome.storage.local.get({ [SITE_DATA_CLEANUP_KEY]: [] }).then((stored) => {
      const sites = sanitizeCleanupSites(stored[SITE_DATA_CLEANUP_KEY]);
      const site = registrableSite(message.url);
      sendResponse({ site, enabled: Boolean(site && sites.includes(site)), sites });
    });
    return true;
  }
  if (message?.kind === "setSiteDataCleanup") {
    if (Number.isInteger(message.tabId)) {
      try { lastTabOrigins.set(message.tabId, new URL(message.url).origin); } catch {}
    }
    chrome.storage.local.get({ [SITE_DATA_CLEANUP_KEY]: [] }).then(async (stored) => {
      const sites = sanitizeCleanupSites(stored[SITE_DATA_CLEANUP_KEY]);
      const site = registrableSite(message.url);
      if (!site) throw new Error("Site is unavailable");
      const next = message.enabled
        ? sanitizeCleanupSites([...sites, site])
        : sites.filter((candidate) => candidate !== site);
      await chrome.storage.local.set({ [SITE_DATA_CLEANUP_KEY]: next });
      sendResponse({ site, enabled: next.includes(site), sites: next });
    }).catch((error) => sendResponse({ error: error?.message ?? "Cleanup policy could not be changed" }));
    return true;
  }
  if (message?.kind === "getRedirectHistory") {
    redirectHistoryWrite.then(async () => {
      const stored = await chrome.storage.local.get({ [REDIRECT_HISTORY_KEY]: { version: 1, entries: [] } });
      sendResponse(normalizeRedirectHistory(stored[REDIRECT_HISTORY_KEY]));
    });
    return true;
  }
  if (message?.kind === "clearRedirectHistory") {
    redirectHistoryWrite = redirectHistoryWrite.then(() => chrome.storage.local.set({
      [REDIRECT_HISTORY_KEY]: { version: 1, entries: [] }
    }));
    redirectHistoryWrite.then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.kind === "clearSiteActivityStatistics") {
    activityStatisticsWrite = activityStatisticsWrite.then(() => chrome.storage.local.set({
      [ACTIVITY_STATISTICS_KEY]: { version: 1, days: {} }
    }));
    activityStatisticsWrite.then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.kind === "getBlockingStatistics") {
    flushBlockingEvents().then(async () => {
      const stored = await chrome.storage.local.get({ [BLOCKING_STATISTICS_KEY]: { version: 1, days: {} } });
      sendResponse(summarizeBlockingStatistics(stored[BLOCKING_STATISTICS_KEY]));
    });
    return true;
  }
  if (message?.kind === "clearBlockingStatistics") {
    pendingBlockingEvents = [];
    clearTimeout(blockingStatisticsTimer);
    blockingStatisticsTimer = null;
    blockingStatisticsWrite = blockingStatisticsWrite.then(() => chrome.storage.local.set({
      [BLOCKING_STATISTICS_KEY]: { version: 1, days: {} }
    }));
    blockingStatisticsWrite.then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.kind === "getSponsorSegments") {
    if (!senderIsYouTube(sender)) {
      sendResponse({ segments: [] });
      return false;
    }
    getSponsorSegments(message.videoId)
      .then((segments) => sendResponse({ segments }))
      .catch(() => sendResponse({ segments: [] }));
    return true;
  }
  if (message?.kind === "recordSponsorSegmentSkip" && senderIsYouTube(sender)) {
    recordPrivacyBlock(sender.tab?.id, sender.url);
    enqueueBlockingEvent({
      type: "sponsor",
      site: "youtube.com",
      resource: message.category === "selfpromo" ? "youtube:self-promotion" : "youtube:sponsor"
    });
    sendResponse({ ok: true });
    return false;
  }
  if (message?.kind === "recordVideoAdAction" && sender?.tab && /^https?:/.test(sender.url ?? "")) {
    const site = hostnameFromURL(sender.url);
    if (site) {
      recordPrivacyBlock(sender.tab.id, sender.url);
      enqueueBlockingEvent({ type: "video", site, resource: `${site}:video-ad` });
    }
    sendResponse({ ok: true });
    return false;
  }
  if (message?.kind === "evaluateLinkSafety") {
    evaluateLinkSafetyForNavigation(message, sender)
      .then(sendResponse)
      .catch(() => sendResponse({ action: "allow", url: message.url }));
    return true;
  }
  if (message?.kind === "navigateWarning") {
    if (message.target && message.target !== "_self") {
      chrome.tabs.create({ url: message.url }).catch(() => {});
    } else {
      chrome.tabs.update(sender.tab?.id, { url: message.url }).catch(() => {});
    }
    sendResponse({ ok: true });
    return false;
  }
  if (message?.kind === "setExtensionEnabled") {
    setExtensionEnabled(Boolean(message.enabled))
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error?.message ?? "Extension state could not be changed" }));
    return true;
  }
  if (message?.kind === "getLinkSafetySettings") {
    linkSafetyStorage().then(sendResponse).catch((error) => {
      sendResponse({ error: error?.message ?? "Link Safety settings are unavailable" });
    });
    return true;
  }
  if (message?.kind === "setLinkSafetySettings") {
    setLinkSafetySettings(message)
      .then((state) => sendResponse({ ok: true, ...state }))
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "Link Safety settings could not be saved" }));
    return true;
  }
  if (message?.kind === "allowLinkSafetyDomain") {
    allowLinkSafetyDomain(message.domain)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The domain could not be allowed" }));
    return true;
  }
  if (message?.kind === "blockLinkSafetyDomain") {
    blockLinkSafetyDomain(message.domain)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The domain could not be blocked" }));
    return true;
  }
  if (message?.kind === "getHistoryPrivacySettings") {
    historyPrivacyStorage().then(sendResponse).catch((error) => {
      sendResponse({ error: error?.message ?? "History privacy settings are unavailable" });
    });
    return true;
  }
  if (message?.kind === "setHistoryPrivacySettings") {
    setHistoryPrivacySettings(message.settings ?? {})
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "History privacy settings could not be saved" }));
    return true;
  }
  if (message?.kind === "addHistoryPrivacyDomain") {
    addHistoryPrivacyDomain(message.domain)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The domain could not be added" }));
    return true;
  }
  if (message?.kind === "purgeHistoryPrivacyDomains") {
    historyPrivacyStorage()
      .then((settings) => purgeHistoryPrivacyDomains(settings.domains))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "History could not be cleaned" }));
    return true;
  }
  if (message?.kind === "collectNow") {
    collectSnapshot().then(sendResponse);
    return true;
  }
  if (message?.kind === "setMonitoring") {
    chrome.storage.local
      .set({
        monitoringEnabled: Boolean(message.enabled),
        monitoringUpdatedAt: new Date().toISOString()
      })
      .then(() => collectSnapshot())
      .then(sendResponse);
    return true;
  }
  if (message?.kind === "setEcoMode") {
    applyEcoMode(message.tabId, Boolean(message.enabled))
      .then(() => collectSnapshot())
      .then(sendResponse);
    return true;
  }
  if (message?.kind === "setContentBlocking") {
    applyContentBlocking(Boolean(message.enabled))
      .then(() => collectSnapshot())
      .then(sendResponse);
    return true;
  }
  if (message?.kind === "getContentBlockingState") {
    contentBlockingState(message.url).then(sendResponse).catch((error) => {
      sendResponse({ error: error?.message ?? "Protection state is unavailable" });
    });
    return true;
  }
  if (message?.kind === "setSiteAllowlisted") {
    setSiteAllowlisted(message.domain, Boolean(message.allowlisted))
      .then(() => contentBlockingState(message.url))
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error?.message ?? "The site exception could not be changed" }));
    return true;
  }
  if (message?.kind === "setSiteTemporarilyPaused") {
    setSiteTemporarilyPaused(message.domain, Number(message.durationMinutes))
      .then(() => contentBlockingState(message.url))
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error?.message ?? "The temporary pause could not be changed" }));
    return true;
  }
  if (message?.kind === "getPictureInPictureState") {
    pictureInPictureState(message.tabId).then(sendResponse).catch((error) => {
      sendResponse({ active: false, mediaElementCount: 0, error: error?.message });
    });
    return true;
  }
  if (message?.kind === "togglePictureInPicture") {
    togglePictureInPicture(message.tabId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, active: false, message: error?.message ?? "Picture-in-Picture is unavailable" });
    });
    return true;
  }
  if (message?.kind === "getCookieState") {
    readCookies(message.url, Boolean(message.all)).then(sendResponse).catch((error) => {
      sendResponse({ cookies: [], error: error?.message ?? "Cookies are unavailable" });
    });
    return true;
  }
  if (message?.kind === "getBrowserProtectionSettings") {
    protectionSettingsStorage().then(sendResponse);
    return true;
  }
  if (message?.kind === "setBrowserProtectionSettings") {
    protectionSettingsStorage()
      .then((current) => sanitizeProtectionSettings({
        ...current,
        ...(message.settings ?? {}),
        updatedAt: message.settings?.updatedAt ?? new Date().toISOString()
      }, current))
      .then(async (browserProtectionSettings) => {
        await chrome.storage.local.set({
          browserProtectionSettings,
          allowlistedSites: browserProtectionSettings.allowlistedSites
        });
        await applyProtectionConfiguration(browserProtectionSettings);
        sendResponse({ ok: true, settings: browserProtectionSettings });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "Settings could not be applied" }));
    return true;
  }
  if (message?.kind === "getOptionsState") {
    Promise.all([
      extensionEnabledStorage(),
      blockerStorage(),
      chrome.storage.local.get({ monitoringEnabled: true }),
      linkSafetyStorage(),
      historyPrivacyStorage()
    ]).then(([extensionEnabled, blocker, state, linkSafety, historyPrivacy]) => sendResponse({
      extensionEnabled,
      contentBlockingEnabled: blocker.contentBlockingEnabled,
      monitoringEnabled: state.monitoringEnabled,
      linkSafety,
      historyPrivacy
    })).catch((error) => sendResponse({ error: error?.message ?? "Settings state is unavailable" }));
    return true;
  }
  if (message?.kind === "replaceOptionsSettings") {
    Promise.resolve().then(async () => {
      const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
      const browserProtectionSettings = sanitizeProtectionSettings({
        ...(payload.protectionSettings ?? {}),
        updatedAt: new Date().toISOString()
      });
      await chrome.storage.local.set({
        browserProtectionSettings,
        allowlistedSites: browserProtectionSettings.allowlistedSites,
        extensionEnabled: payload.extensionEnabled !== false,
        extensionEnabledUpdatedAt: new Date().toISOString(),
        monitoringEnabled: payload.monitoringEnabled !== false,
        monitoringUpdatedAt: new Date().toISOString(),
        linkSafetySettings: normalizeLinkSafetySettings(payload.linkSafety?.settings),
        linkSafetyAllowedDomains: sanitizeLinkSafetyDomains(payload.linkSafety?.allowedDomains),
        linkSafetyBlockedDomains: sanitizeLinkSafetyDomains(payload.linkSafety?.blockedDomains),
        historyPrivacySettings: normalizeHistoryPrivacySettings(payload.historyPrivacy)
      });
      await applyContentBlocking(payload.contentBlockingEnabled !== false);
      await applyProtectionConfiguration(browserProtectionSettings);
      sendResponse({ ok: true });
    }).catch((error) => sendResponse({ ok: false, error: error?.message ?? "Backup could not be restored" }));
    return true;
  }
  if (message?.kind === "resetOptionsSettings") {
    Promise.resolve().then(async () => {
      const browserProtectionSettings = sanitizeProtectionSettings({ updatedAt: new Date().toISOString() });
      await chrome.storage.local.set({
        browserProtectionSettings,
        allowlistedSites: [],
        extensionEnabled: true,
        extensionEnabledUpdatedAt: new Date().toISOString(),
        temporarySitePauses: {},
        monitoringEnabled: true,
        monitoringUpdatedAt: new Date().toISOString(),
        filterSubscriptions: [],
        customFilterSubscriptionCache: {},
        customFilterSubscriptionURLs: [],
        customSubscriptionCosmeticFilters: [],
        linkSafetySettings: normalizeLinkSafetySettings({ updatedAt: new Date().toISOString() }),
        linkSafetyAllowedDomains: [],
        linkSafetyBlockedDomains: [],
        historyPrivacySettings: normalizeHistoryPrivacySettings({ updatedAt: new Date().toISOString() })
      });
      await applyContentBlocking(true);
      await applyProtectionConfiguration(browserProtectionSettings);
      sendResponse({ ok: true });
    }).catch((error) => sendResponse({ ok: false, error: error?.message ?? "Defaults could not be restored" }));
    return true;
  }
  if (message?.kind === "addCustomCosmeticFilter") {
    const selector = String(message.selector ?? "").trim();
    const domain = normalizeSiteDomain(sender?.url);
    const storedSelector = domain ? `${domain}##${selector}` : "";
    if (!selector || !domain || storedSelector.length > 500) {
      sendResponse({ ok: false, error: "The selected element could not be saved" });
      return false;
    }
    protectionSettingsStorage()
      .then(async (current) => {
        const customCosmeticFilters = [...new Set([
          ...(current.customCosmeticFilters ?? []),
          storedSelector
        ])].slice(-200);
        const browserProtectionSettings = {
          ...current,
          customCosmeticFilters,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ browserProtectionSettings });
        await syncCosmeticFilteringForAllTabs();
        sendResponse({ ok: true, selector: storedSelector });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The filter could not be saved" }));
    return true;
  }
  if (message?.kind === "removeCustomCosmeticFilter") {
    const selector = String(message.selector ?? "").trim();
    protectionSettingsStorage()
      .then(async (current) => {
        const customCosmeticFilters = (current.customCosmeticFilters ?? []).filter((value) => value !== selector);
        const browserProtectionSettings = {
          ...current,
          customCosmeticFilters,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ browserProtectionSettings });
        await syncCosmeticFilteringForAllTabs();
        sendResponse({ ok: true, selector });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The filter could not be removed" }));
    return true;
  }
  if (message?.kind === "clearCustomCosmeticFilters") {
    protectionSettingsStorage()
      .then(async (current) => {
        const browserProtectionSettings = {
          ...current,
          customCosmeticFilters: [],
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ browserProtectionSettings });
        await syncCosmeticFilteringForAllTabs();
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The filters could not be removed" }));
    return true;
  }
  if (message?.kind === "getCookieExportText") {
    cookieExportPayload(message.url, Boolean(message.all), message.format)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error?.message ?? "Cookies could not be prepared" }));
    return true;
  }
  if (message?.kind === "downloadCookies") {
    downloadCookies(message.url, Boolean(message.all), message.format, Boolean(message.saveAs))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "Cookie export failed" }));
    return true;
  }
  if (message?.kind === "getEcoMode") {
    const tabId = sender.tab?.id;
    if (typeof tabId !== "number") {
      sendResponse({ enabled: false });
      return false;
    }
    chrome.storage.local.get({ ecoTabs: {} }).then(({ ecoTabs }) => {
      sendResponse({ enabled: Boolean(ecoTabs[String(tabId)]) });
    });
    return true;
  }
  return false;
});
