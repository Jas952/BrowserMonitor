import assert from "node:assert/strict";
import test from "node:test";
import {
  compileFilterList,
  convertABPNetworkRule,
  filterListMetadata,
  genericCosmeticSelectors
} from "../filter-parser.js";

const fixture = `[Adblock Plus 2.0]
! Title: Personal Protection
! Version: 42
! Expires: 2 days
||tracker.example^$third-party,script
||pixel.example^
@@||allowed.example^
example.com##.domain-only
##.generic-ad
##.generic-ad
##+js(abort-current-script)
||redirect.example^$redirect=noop.js`;

test("safe filter compiler keeps only supported blocking and generic cosmetic rules", () => {
  const compiled = compileFilterList(fixture, { firstRuleId: 630_000 });
  assert.equal(compiled.title, "Personal Protection");
  assert.equal(compiled.version, "42");
  assert.equal(compiled.expiresHours, 48);
  assert.deepEqual(compiled.networkRules.map((rule) => rule.id), [630_000, 630_001]);
  assert.ok(compiled.networkRules.every((rule) => rule.action.type === "block"));
  assert.deepEqual(compiled.cosmeticSelectors, [".generic-ad"]);
});

test("remote lists cannot add allow or redirect rules", () => {
  assert.equal(convertABPNetworkRule("@@||allowed.example^", 1), null);
  assert.equal(convertABPNetworkRule("||redirect.example^$redirect=noop.js", 1), null);
});

test("compiler bounds network and cosmetic output", () => {
  const text = Array.from({ length: 20 }, (_, index) => `||host-${index}.example^\n##.item-${index}`).join("\n");
  const compiled = compileFilterList(text, { networkLimit: 5, cosmeticLimit: 4 });
  assert.equal(compiled.networkRules.length, 5);
  assert.equal(compiled.cosmeticSelectors.length, 4);
});

test("metadata and selector helpers provide conservative defaults", () => {
  assert.deepEqual(filterListMetadata(""), {
    title: "Custom filter list",
    version: "unknown",
    expiresHours: 24
  });
  assert.deepEqual(genericCosmeticSelectors("site.test##.scoped\n##.global"), [".global"]);
});
