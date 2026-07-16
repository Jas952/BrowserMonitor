import { assessTab } from "./scoring.js";
import { cookieExportFilename, serializeCookies } from "./cookies.js";
import { compileFilterList } from "./filter-parser.js";
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

const ALARM_NAME = "collect-browser-snapshot";
const CUSTOM_FILTER_FIRST_RULE_ID = 630_000;
const CUSTOM_FILTER_RULE_LIMIT = 500;
const CUSTOM_FILTER_COSMETIC_LIMIT = 500;
const CUSTOM_FILTER_MAX_BYTES = 1_048_576;
const DEFAULT_PROTECTION_SETTINGS = {
  cookieBannerBlockingEnabled: false,
  newsletterBlockingEnabled: false,
  surveyBlockingEnabled: false,
  notificationPromptBlockingEnabled: false,
  autoplayBlockingEnabled: false,
  floatingVideoBlockingEnabled: false,
  adFilterEnabled: true,
  privacyFilterEnabled: true,
  cosmeticFilteringEnabled: true,
  cryptominingProtectionEnabled: true,
  socialWidgetBlockingEnabled: false,
  antiAdblockMessageBlockingEnabled: false,
  regionalRussianFilteringEnabled: false,
  imageSwapEnabled: false,
  imageSwapTheme: "landscape",
  customFilterListURLs: [],
  customFilterListRefreshRequestedAt: null,
  allowlistedSites: [],
  customCosmeticFilters: [],
  customBlockedDomains: [],
  updatedAt: new Date(0).toISOString()
};

const PROTECTION_BOOLEAN_KEYS = [
  "cookieBannerBlockingEnabled", "newsletterBlockingEnabled", "surveyBlockingEnabled",
  "notificationPromptBlockingEnabled", "autoplayBlockingEnabled", "floatingVideoBlockingEnabled",
  "adFilterEnabled", "privacyFilterEnabled", "cosmeticFilteringEnabled",
  "cryptominingProtectionEnabled", "socialWidgetBlockingEnabled",
  "antiAdblockMessageBlockingEnabled", "regionalRussianFilteringEnabled", "imageSwapEnabled"
];

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

async function setupContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: "browser-monitor-block-element",
    title: "Block this element",
    contexts: ["page", "image", "video", "frame", "selection", "link"]
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
  const installedRules = await installCustomSubscriptionRules(
    blocker.contentBlockingEnabled ? candidateRules : []
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
  const enabledRulesets = blocker.contentBlockingEnabled
    ? [
        settings.adFilterEnabled ? "easylist" : null,
        settings.privacyFilterEnabled ? "easyprivacy" : null
      ].filter(Boolean)
    : [];
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledRulesets,
    disableRulesetIds: CONTENT_BLOCKER_RULESET_IDS.filter((id) => !enabledRulesets.includes(id))
  });
  await installAllowlistRules(settings.allowlistedSites ?? []);
  await installCustomBlockRules(settings.customBlockedDomains ?? []);
  await installTemporaryPauseRules(activeTemporaryPauses(blocker.temporarySitePauses));
  await installCryptominingRules(
    blocker.contentBlockingEnabled && settings.cryptominingProtectionEnabled
  );
  await refreshCustomFilterSubscriptions(settings, { reinstall: true });
  await chrome.storage.local.set({ allowlistedSites: settings.allowlistedSites ?? [] });
  await syncCosmeticFilteringForAllTabs();
}

async function syncCosmeticFilteringForTab(tabId, url) {
  if (!/^https?:\/\//.test(url ?? "")) return;
  const state = await blockerStorage();
  const settings = await protectionSettingsStorage();
  const domain = normalizeSiteDomain(url);
  const activePauses = activeTemporaryPauses(state.temporarySitePauses);
  const shouldApply = state.contentBlockingEnabled
    && settings.cosmeticFilteringEnabled
    && !state.allowlistedSites.includes(domain)
    && !activePauses[domain];
  const styles = [
    ["rules/easylist-cosmetic.css", true],
    ["rules/ruadlist-cosmetic.css", settings.regionalRussianFilteringEnabled],
    ["rules/fanboy-social-cosmetic.css", settings.socialWidgetBlockingEnabled],
    ["rules/antiadblock-cosmetic.css", settings.antiAdblockMessageBlockingEnabled]
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
    if (shouldApply && selected) {
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
  const state = await blockerStorage();
  const settings = await protectionSettingsStorage();
  const domain = normalizeSiteDomain(url);
  const activePauses = activeTemporaryPauses(state.temporarySitePauses);
  return {
    ...contentBlockingSnapshot(
      state.contentBlockingEnabled,
      state.contentBlockingUpdatedAt,
      {
        ...state,
        additionalRuleCount: state.contentBlockingEnabled && settings.cryptominingProtectionEnabled
          ? CRYPTO_MINING_RULES.length + (state.customFilterRuleCount ?? 0)
          : (state.customFilterRuleCount ?? 0)
      }
    ),
    domain,
    siteAllowlisted: domain ? state.allowlistedSites.includes(domain) : false,
    sitePausedUntil: domain ? (activePauses[domain] ?? null) : null,
    allowlistedSites: state.allowlistedSites
  };
}

async function applyContentBlocking(enabled, updatedAt = new Date().toISOString()) {
  await chrome.storage.local.set({
    contentBlockingEnabled: Boolean(enabled),
    contentBlockingUpdatedAt: updatedAt
  });
  await applyProtectionConfiguration(await protectionSettingsStorage());
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
  const state = await chrome.storage.local.get({
    monitoringEnabled: true,
    monitoringUpdatedAt: now,
    ecoTabs: {}
  });
  const blocker = await blockerStorage();
  const protectionSettings = await protectionSettingsStorage();
  const allTabs = await chrome.tabs.query({});
  const supportedTabs = allTabs.filter((tab) => /^https?:\/\//.test(tab.url || tab.pendingUrl || ""));
  const reports = state.monitoringEnabled
    ? await Promise.all(supportedTabs.map((tab) => readTab(tab, state.ecoTabs)))
    : [];
  reports.sort((left, right) => right.score - left.score);

  const snapshot = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    browser: "Google Chrome",
    monitoringEnabled: state.monitoringEnabled,
    monitoringUpdatedAt: state.monitoringUpdatedAt,
    contentBlocking: contentBlockingSnapshot(
      blocker.contentBlockingEnabled,
      blocker.contentBlockingUpdatedAt,
      {
        ...blocker,
        additionalRuleCount: blocker.contentBlockingEnabled && protectionSettings.cryptominingProtectionEnabled
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

async function configureActionCount() {
  await chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: true
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#536b78" });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get([
    "monitoringEnabled",
    "monitoringUpdatedAt",
    "contentBlockingEnabled",
    "contentBlockingUpdatedAt",
    "browserProtectionSettings"
  ]);
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
  await configureActionCount();
  await applyProtectionConfiguration(sanitizedInitialProtectionSettings);
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  await setupContextMenus();
  await collectSnapshot();
});

chrome.runtime.onStartup.addListener(async () => {
  await configureActionCount();
  await applyProtectionConfiguration(await protectionSettingsStorage());
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
  if (info.menuItemId !== "browser-monitor-block-element" || typeof tab?.id !== "number") return;
  chrome.tabs.sendMessage(tab.id, { kind: "startElementPicker" }).catch(() => {});
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await syncCosmeticFilteringForTab(tabId, tab.url);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      blockerStorage(),
      chrome.storage.local.get({ monitoringEnabled: true })
    ]).then(([blocker, state]) => sendResponse({
      contentBlockingEnabled: blocker.contentBlockingEnabled,
      monitoringEnabled: state.monitoringEnabled
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
        monitoringEnabled: payload.monitoringEnabled !== false,
        monitoringUpdatedAt: new Date().toISOString()
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
        temporarySitePauses: {},
        monitoringEnabled: true,
        monitoringUpdatedAt: new Date().toISOString(),
        filterSubscriptions: [],
        customFilterSubscriptionCache: {},
        customFilterSubscriptionURLs: [],
        customSubscriptionCosmeticFilters: []
      });
      await applyContentBlocking(true);
      await applyProtectionConfiguration(browserProtectionSettings);
      sendResponse({ ok: true });
    }).catch((error) => sendResponse({ ok: false, error: error?.message ?? "Defaults could not be restored" }));
    return true;
  }
  if (message?.kind === "addCustomCosmeticFilter") {
    const selector = String(message.selector ?? "").trim();
    if (!selector || selector.length > 500) {
      sendResponse({ ok: false, error: "The selected element could not be saved" });
      return false;
    }
    protectionSettingsStorage()
      .then(async (current) => {
        const customCosmeticFilters = [...new Set([
          ...(current.customCosmeticFilters ?? []),
          selector
        ])].slice(-200);
        const browserProtectionSettings = {
          ...current,
          customCosmeticFilters,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({ browserProtectionSettings });
        sendResponse({ ok: true, selector });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message ?? "The filter could not be saved" }));
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
