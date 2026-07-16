import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CRYPTO_MINING_RULES } from "../rules/cryptomining-rules.js";
import {
  CONTENT_BLOCKER_COSMETIC_RULE_COUNT,
  CONTENT_BLOCKER_RULE_COUNT,
  activeTemporaryPauses,
  allowlistRules,
  chooseLatestBoolean,
  contentBlockingSnapshot,
  customBlockRules,
  normalizeSiteDomain,
  temporaryPauseRules
} from "../blocker.js";

test("static blocker metadata matches the packaged rules", () => {
  const easyList = JSON.parse(readFileSync(new URL("../rules/easylist-network.json", import.meta.url)));
  const easyPrivacy = JSON.parse(readFileSync(new URL("../rules/easyprivacy-network.json", import.meta.url)));
  const rules = [...easyList, ...easyPrivacy];
  const cosmeticCSS = readFileSync(new URL("../rules/easylist-cosmetic.css", import.meta.url), "utf8");
  assert.equal(rules.length, CONTENT_BLOCKER_RULE_COUNT);
  assert.equal(cosmeticCSS.split("\n").length, CONTENT_BLOCKER_COSMETIC_RULE_COUNT);
  assert.ok(rules.every((rule) => rule.action.type === "block" && !rule.condition.resourceTypes?.includes("main_frame")));
  assert.deepEqual(contentBlockingSnapshot(true, "2026-07-14T12:00:00Z"), {
    enabled: true,
    updatedAt: "2026-07-14T12:00:00Z",
    ruleCount: rules.length,
    cosmeticRuleCount: CONTENT_BLOCKER_COSMETIC_RULE_COUNT
  });
});

test("site exceptions create high-priority allow rules", () => {
  assert.equal(normalizeSiteDomain("https://www.example.com/page"), "example.com");
  assert.equal(normalizeSiteDomain("bad domain"), "");
  assert.equal(normalizeSiteDomain("https://example..com"), "");
  const rules = allowlistRules(["example.com", "https://www.example.com/", "news.example.org"]);
  assert.equal(rules.length, 2);
  assert.ok(rules.every((rule) => rule.action.type === "allowAllRequests" && rule.priority === 30_000));
});

test("newest blocker preference wins", () => {
  const selected = chooseLatestBoolean(
    { enabled: true, updatedAt: "2026-07-14T12:00:00Z" },
    { enabled: false, updatedAt: "2026-07-14T12:01:00Z" }
  );
  assert.equal(selected.enabled, false);
});

test("custom blocked domains create bounded dynamic rules", () => {
  const rules = customBlockRules([
    "https://www.tracker.example/path",
    "tracker.example",
    "ads.example"
  ]);
  assert.deepEqual(rules.map((rule) => rule.condition.requestDomains[0]), ["ads.example", "tracker.example"]);
  assert.ok(rules.every((rule) => rule.action.type === "block" && rule.priority === 20_000));
  assert.deepEqual(rules.map((rule) => rule.id), [600_000, 600_001]);
});

test("temporary pauses keep only active normalized sites", () => {
  const pauses = activeTemporaryPauses({
    "https://www.Example.com/path": "2026-07-14T12:10:00Z",
    "expired.example": "2026-07-14T11:59:00Z",
    "invalid domain": "2026-07-14T12:20:00Z"
  }, Date.parse("2026-07-14T12:00:00Z"));
  assert.deepEqual(pauses, { "example.com": "2026-07-14T12:10:00.000Z" });
  const rules = temporaryPauseRules(pauses);
  assert.deepEqual(rules.map((rule) => rule.id), [610_000]);
  assert.equal(rules[0].action.type, "allowAllRequests");
});

test("dynamic rules stay inside the reserved Chrome budget", () => {
  const domains = Array.from({ length: 2_500 }, (_, index) => `site-${index}.example`);
  const customDomains = Array.from({ length: 1_200 }, (_, index) => `tracker-${index}.example`);
  const pauses = Object.fromEntries(
    Array.from({ length: 600 }, (_, index) => [
      `paused-${index}.example`,
      "2030-01-01T00:00:00Z"
    ])
  );
  const allowRules = allowlistRules(domains);
  const customRules = customBlockRules(customDomains);
  const pauseRules = temporaryPauseRules(activeTemporaryPauses(pauses, Date.parse("2026-07-14T00:00:00Z")));

  assert.equal(allowRules.length, 2_000);
  assert.equal(customRules.length, 1_000);
  assert.equal(pauseRules.length, 500);
  assert.ok(CRYPTO_MINING_RULES.length <= 500);
  const customSubscriptionReserve = 500;
  assert.ok(
    allowRules.length
      + customRules.length
      + pauseRules.length
      + CRYPTO_MINING_RULES.length
      + customSubscriptionReserve
      <= 4_500
  );
  assert.ok(allowRules[0].priority > customRules[0].priority);
  assert.ok(allowRules[0].priority > CRYPTO_MINING_RULES[0].priority);
});
