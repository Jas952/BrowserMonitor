import { CONTENT_BLOCKER_METADATA } from "./blocker-metadata.js";

export const CONTENT_BLOCKER_RULESET_IDS = ["easylist", "easyprivacy", "ruadlist"];
export const CONTENT_BLOCKER_RULE_COUNT = CONTENT_BLOCKER_METADATA.networkRuleCount;
export const CONTENT_BLOCKER_COSMETIC_RULE_COUNT = CONTENT_BLOCKER_METADATA.cosmeticRuleCount;

export function normalizeSiteDomain(value) {
  if (!value) return "";
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!hostname
        || hostname.length > 253
        || !/^[a-z0-9.-]+$/i.test(hostname)
        || hostname.startsWith(".")
        || hostname.endsWith(".")
        || hostname.includes("..")) return "";
    return hostname;
  } catch {
    return "";
  }
}

export function allowlistRules(domains, firstRuleId = 500_000, limit = 2_000) {
  return [...new Set(domains.map(normalizeSiteDomain).filter(Boolean))]
    .sort()
    .slice(0, limit)
    .map((domain, index) => ({
      id: firstRuleId + index,
      priority: 30_000,
      action: { type: "allowAllRequests" },
      condition: {
        requestDomains: [domain],
        resourceTypes: ["main_frame"]
      }
    }));
}

export function customBlockRules(domains, firstRuleId = 600_000, limit = 1_000) {
  return [...new Set(domains.map(normalizeSiteDomain).filter(Boolean))]
    .sort()
    .slice(0, limit)
    .map((domain, index) => ({
      id: firstRuleId + index,
      priority: 20_000,
      action: { type: "block" },
      condition: { requestDomains: [domain] }
    }));
}

export function activeTemporaryPauses(pauses = {}, now = Date.now(), limit = 500) {
  const active = {};
  for (const [value, expiry] of Object.entries(pauses ?? {})) {
    const domain = normalizeSiteDomain(value);
    const expiryTime = Date.parse(expiry);
    if (!domain || !Number.isFinite(expiryTime) || expiryTime <= now) continue;
    if (!active[domain] || Date.parse(active[domain]) < expiryTime) active[domain] = new Date(expiryTime).toISOString();
  }
  return Object.fromEntries(Object.entries(active).sort(([left], [right]) => left.localeCompare(right)).slice(0, limit));
}

export function temporaryPauseRules(pauses, firstRuleId = 610_000) {
  return allowlistRules(Object.keys(pauses ?? {}), firstRuleId);
}

export function contentBlockingSnapshot(enabled, updatedAt, statistics = {}) {
  return {
    enabled: Boolean(enabled),
    updatedAt,
    ruleCount: CONTENT_BLOCKER_RULE_COUNT + (statistics.additionalRuleCount ?? 0),
    cosmeticRuleCount: CONTENT_BLOCKER_COSMETIC_RULE_COUNT
  };
}

export function chooseLatestBoolean(local, remote) {
  const localTime = Date.parse(local.updatedAt ?? "");
  const remoteTime = Date.parse(remote.updatedAt ?? "");
  if (Number.isFinite(remoteTime) && (!Number.isFinite(localTime) || remoteTime > localTime)) {
    return { enabled: Boolean(remote.enabled), updatedAt: remote.updatedAt };
  }
  return { enabled: Boolean(local.enabled), updatedAt: local.updatedAt };
}
