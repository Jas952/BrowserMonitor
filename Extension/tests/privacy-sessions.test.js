import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePrivacySessions,
  PRIVACY_SESSION_TTL_MS,
  serializePrivacySessions
} from "../features/tools/privacy-sessions.js";

test("privacy sessions survive a storage round trip", () => {
  const now = 2_000_000_000_000;
  const original = new Map([[42, {
    site: "example.com",
    startedAt: now - 60_000,
    totalRequests: 14,
    allowedRequests: 6,
    unknownRequests: 1,
    thirdPartyRequests: 7,
    blockedRequests: 3,
    thirdPartyDomains: new Map([["tracker.test", 7]]),
    blockedDomains: new Map([["ads.test", 3]])
  }]]);

  const restored = normalizePrivacySessions(serializePrivacySessions(original, now), now);
  assert.equal(restored.get(42).totalRequests, 14);
  assert.equal(restored.get(42).allowedRequests, 6);
  assert.equal(restored.get(42).unknownRequests, 1);
  assert.equal(restored.get(42).thirdPartyRequests, 7);
  assert.deepEqual([...restored.get(42).blockedDomains.entries()], [["ads.test", 3]]);
});

test("privacy sessions discard expired and malformed entries", () => {
  const now = 2_000_000_000_000;
  const restored = normalizePrivacySessions({
    version: 1,
    sessions: {
      1: { site: "old.test", startedAt: now - PRIVACY_SESSION_TTL_MS - 1 },
      nope: { site: "example.com", startedAt: now },
      2: { site: "bad domain", startedAt: now },
      3: { site: "fresh.test", startedAt: now, thirdPartyDomains: [["cdn.test", 2]] }
    }
  }, now);

  assert.deepEqual([...restored.keys()], [3]);
  assert.deepEqual([...restored.get(3).thirdPartyDomains.entries()], [["cdn.test", 2]]);
});
