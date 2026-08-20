const SESSION_TTL_MS = 12 * 60 * 60 * 1_000;
const SESSION_LIMIT = 100;

function safeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number), 1_000_000) : 0;
}

function normalizeDomainCounts(values, limit) {
  return new Map((Array.isArray(values) ? values : [])
    .map(([domain, count]) => [String(domain ?? "").toLowerCase(), safeCount(count)])
    .filter(([domain, count]) => domain && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain) && count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit));
}

export function normalizePrivacySessions(input, now = Date.now()) {
  const sessions = new Map();
  const source = input?.version === 1 && input.sessions && typeof input.sessions === "object"
    ? input.sessions
    : {};
  for (const [rawTabId, value] of Object.entries(source)) {
    const tabId = Number(rawTabId);
    const startedAt = Number(value?.startedAt);
    const site = String(value?.site ?? "").toLowerCase();
    if (!Number.isInteger(tabId) || tabId < 0 || !site || site.length > 253
        || !/^[a-z0-9.-]+$/i.test(site) || !Number.isFinite(startedAt)
        || startedAt > now || now - startedAt > SESSION_TTL_MS) continue;
    sessions.set(tabId, {
      site,
      startedAt,
      totalRequests: safeCount(value.totalRequests),
      allowedRequests: safeCount(value.allowedRequests),
      unknownRequests: safeCount(value.unknownRequests),
      thirdPartyRequests: safeCount(value.thirdPartyRequests),
      blockedRequests: safeCount(value.blockedRequests),
      thirdPartyDomains: normalizeDomainCounts(value.thirdPartyDomains, 80),
      blockedDomains: normalizeDomainCounts(value.blockedDomains, 150)
    });
  }
  return new Map([...sessions.entries()]
    .sort((left, right) => right[1].startedAt - left[1].startedAt)
    .slice(0, SESSION_LIMIT));
}

export function serializePrivacySessions(sessions, now = Date.now()) {
  const normalized = normalizePrivacySessions({
    version: 1,
    sessions: Object.fromEntries([...sessions.entries()].map(([tabId, session]) => [String(tabId), {
      ...session,
      thirdPartyDomains: [...session.thirdPartyDomains.entries()],
      blockedDomains: [...session.blockedDomains.entries()]
    }]))
  }, now);
  return {
    version: 1,
    sessions: Object.fromEntries([...normalized.entries()].map(([tabId, session]) => [String(tabId), {
      site: session.site,
      startedAt: session.startedAt,
      totalRequests: session.totalRequests,
      allowedRequests: session.allowedRequests,
      unknownRequests: session.unknownRequests,
      thirdPartyRequests: session.thirdPartyRequests,
      blockedRequests: session.blockedRequests,
      thirdPartyDomains: [...session.thirdPartyDomains.entries()],
      blockedDomains: [...session.blockedDomains.entries()]
    }]))
  };
}

export const PRIVACY_SESSION_TTL_MS = SESSION_TTL_MS;
