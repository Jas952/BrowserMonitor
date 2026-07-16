import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, translate } from "../localization.js";

test("English and Russian settings copy is complete for core controls", () => {
  const keys = [
    "masterProtection", "easyList", "easyPrivacy", "cookieBanners", "newsletters",
    "surveys", "notificationPrompts", "floatingVideo", "imageSwap", "customImages",
    "interfaceTheme", "siteExceptions", "blockedDomains", "cosmeticRules",
    "filterSubscriptions", "backup",
    "sectionGeneral", "sectionGeneralDescription", "sectionFilters",
    "sectionFiltersDescription", "sectionPageElements", "sectionPageElementsDescription"
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
