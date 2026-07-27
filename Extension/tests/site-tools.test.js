import test from "node:test";
import assert from "node:assert/strict";
import {
  appendRedirectStep,
  duplicateTabGroups,
  normalizedDuplicateURL,
  normalizeRedirectHistory,
  sanitizeCleanupSites
} from "../site-tools.js";

test("duplicate URLs ignore fragments, tracking parameters, query order and trailing slash", () => {
  assert.equal(
    normalizedDuplicateURL("https://Example.com/article/?b=2&utm_source=x&a=1#part"),
    "https://example.com/article?a=1&b=2"
  );
  const groups = duplicateTabGroups([
    { id: 1, url: "https://example.com/article?a=1&utm_medium=x" },
    { id: 2, url: "https://example.com/article/?a=1#comments" },
    { id: 3, url: "chrome://settings" }
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].tabs.map((tab) => tab.id), [1, 2]);
});

test("cleanup sites are normalized and bounded", () => {
  assert.deepEqual(sanitizeCleanupSites(["www.example.com", "shop.example.com", "bad value"]), ["example.com"]);
  assert.deepEqual(sanitizeCleanupSites(["login.example.co.uk", "www.example.co.uk"]), ["example.co.uk"]);
});

test("redirect history keeps compact unique domain chains for 30 days", () => {
  const now = Date.UTC(2026, 6, 27);
  let steps = appendRedirectStep([], "https://start.example/path");
  steps = appendRedirectStep(steps, "https://start.example/again");
  steps = appendRedirectStep(steps, "https://ads.example.net/go");
  assert.deepEqual(steps, ["start.example", "example.net"]);
  assert.deepEqual(normalizeRedirectHistory({
    entries: [
      { createdAt: now, steps },
      { createdAt: now - 31 * 86400000, steps }
    ]
  }, now).entries, [{ createdAt: now, steps }]);
});
