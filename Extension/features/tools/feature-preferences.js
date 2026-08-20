export const DEFAULT_FEATURE_PREFERENCES = Object.freeze({
  activityRetentionDays: 90,
  activityExcludedSites: [],
  activityReferenceHours: 8,
  ecoDefaultLevel: "limit",
  cryptoGuardEnabled: true,
  continueWatchingEnabled: true,
  continueWatchingRetentionDays: 90,
  blockingJournalEnabled: false,
  trackingCleanerEnabled: true
});

function domains(values, limit = 500) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value).trim().toLowerCase().replace(/^\*\./, "").replace(/^www\./, ""))
    .filter((value) => value && value.length <= 253 && /^[a-z0-9.-]+$/.test(value)))]
    .slice(0, limit);
}

export function normalizeFeaturePreferences(input = {}) {
  return {
    activityRetentionDays: [7, 30, 90].includes(Number(input.activityRetentionDays))
      ? Number(input.activityRetentionDays) : DEFAULT_FEATURE_PREFERENCES.activityRetentionDays,
    activityExcludedSites: domains(input.activityExcludedSites),
    activityReferenceHours: Math.min(24, Math.max(1, Number(input.activityReferenceHours) || 8)),
    ecoDefaultLevel: ["pause", "limit", "deep"].includes(input.ecoDefaultLevel)
      ? input.ecoDefaultLevel : DEFAULT_FEATURE_PREFERENCES.ecoDefaultLevel,
    cryptoGuardEnabled: input.cryptoGuardEnabled !== false,
    continueWatchingEnabled: input.continueWatchingEnabled !== false,
    continueWatchingRetentionDays: [7, 30, 90].includes(Number(input.continueWatchingRetentionDays))
      ? Number(input.continueWatchingRetentionDays) : DEFAULT_FEATURE_PREFERENCES.continueWatchingRetentionDays,
    blockingJournalEnabled: input.blockingJournalEnabled === true,
    trackingCleanerEnabled: input.trackingCleanerEnabled !== false
  };
}

export function siteIsExcluded(domain, exclusions) {
  const normalized = String(domain ?? "").toLowerCase().replace(/^www\./, "");
  return domains(exclusions).some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}
