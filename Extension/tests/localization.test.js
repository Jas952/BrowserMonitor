import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, translate } from "../core/localization.js";

test("English and Russian settings copy is complete for core controls", () => {
  const keys = [
    "masterProtection", "easyList", "easyPrivacy", "cookieBanners", "newsletters",
    "surveys", "notificationPrompts", "floatingVideo", "videoAdProtection", "sponsorSkipping",
    "imageSwap", "customImages", "statisticsTitle", "blockedToday", "blockedSevenDays",
    "topBlockedSites", "blockedResources", "statisticsPrivacy",
    "interfaceTheme", "siteExceptions", "blockedDomains", "cosmeticRules",
    "filterSubscriptions", "backup",
    "sectionGeneral", "sectionGeneralDescription", "sectionFilters",
    "sectionFiltersDescription", "sectionPageElements", "sectionPageElementsDescription",
    "extensionEnabled", "extensionPaused", "sectionLinkSafety", "sectionHistoryPrivacy",
    "historyPrivacyEnabled", "historyPrivacyDomains", "purgeHistoryPrivacy",
    "navProtectionCenter", "navPrivacyTools", "sectionProtectionCenter", "sectionPrivacyTools",
    "filterListsGroup", "pageCleanupGroup",
    "cookieHistoryOpen", "cookieHistoryTitle", "cookieHistoryDescription", "cookieHistoryPrivacy",
    "cookieHistoryTime", "cookieHistoryEvent", "cookieHistoryEmpty", "cookieHistorySessionNote",
    "cookieBrowserScope", "cookieBrowserExportTitle", "cookieBrowserExportDescription",
    "cookieAccessTitle", "cookieAccessDescription", "cookieGrantAccess", "cookieScriptAccessibleShort"
  ];
  for (const key of keys) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("ru", key), key);
    assert.notEqual(translate("en", key), translate("ru", key));
  }
});

test("localization falls back safely and interpolates values", () => {
  assert.equal(normalizeLanguage("de"), "en");
  assert.equal(translate("en", "imageCount", { count: 3 }), "3 local image(s)");
  assert.equal(translate("ru", "imageCount", { count: 3 }), "Локальных изображений: 3");
});

test("every feature map item has complete English and Russian detail copy", () => {
  const detailKeys = [
    "featureNetworkDetail", "featureNetworkFact",
    "featureCleanupDetail", "featureCleanupFact",
    "featureVideoDetail", "featureVideoFact",
    "featureCryptoDetail", "featureCryptoFact",
    "featureLinksDetail", "featureLinksFact",
    "featureHistoryDetail", "featureHistoryFact",
    "featureAnalysisDetail", "featureAnalysisFact",
    "featureEcoDetail", "featureEcoPauseDetail", "featureEcoLimitDetail", "featureEcoDeepDetail", "featureEcoFact",
    "featureWatchingDetail", "featureWatchingFact",
    "featureToolsDetail", "featureToolsFact",
    "featureAppearanceDetail", "featureAppearanceFact",
    "featureRulesDetail", "featureRulesFact",
    "featureDataDetail", "featureDataFact"
  ];

  for (const key of detailKeys) {
    const english = translate("en", key);
    const russian = translate("ru", key);
    assert.notEqual(english, key, `Missing English copy for ${key}`);
    assert.notEqual(russian, key, `Missing Russian copy for ${key}`);
    assert.ok(english.trim().length >= 24, `English copy is too short for ${key}`);
    assert.ok(russian.trim().length >= 24, `Russian copy is too short for ${key}`);
  }
});
