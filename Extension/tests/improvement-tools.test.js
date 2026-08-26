import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanTrackingURL,
  preferredMediaPageURL,
  repairStoredMediaURL,
  sanitizeStoredMediaURL
} from "../features/security/clean-link.js";
import { bookmarkStructureIssues, duplicateGroups } from "../features/tools/browser-health.js";
import { normalizeFeaturePreferences, siteIsExcluded } from "../features/tools/feature-preferences.js";
import { mediaSite, sameMediaSite } from "../features/tools/site-tools.js";

test("tracking cleaner removes known parameters without changing useful query values", () => {
  const result = cleanTrackingURL("https://example.com/watch?id=42&utm_source=test&fbclid=abc#part");
  assert.equal(result.url, "https://example.com/watch?id=42#part");
  assert.deepEqual(result.removed.sort(), ["fbclid", "utm_source"]);
});

test("stored media URLs exclude credentials and sensitive query values", () => {
  const result = sanitizeStoredMediaURL("https://user:pass@example.com/video?id=7&token=secret&utm_campaign=x#chapter");
  assert.equal(result.url, "https://example.com/video?id=7");
  assert.deepEqual(result.removed.sort(), ["token", "utm_campaign"]);
});

test("YouTube media URLs keep the video ID and repair legacy homepage records", () => {
  const current = sanitizeStoredMediaURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=test");
  assert.equal(current.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  const repaired = repairStoredMediaURL(
    "https://www.youtube.com/",
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  );
  assert.equal(repaired.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  const spaURL = preferredMediaPageURL(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/",
    { topFrame: true }
  );
  assert.equal(spaURL, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
});

test("browser review chooses one keeper and reports bookmark structure issues", () => {
  const groups = duplicateGroups([
    { id: 1, url: "https://example.com/a?utm_source=x", active: false, lastAccessed: 10 },
    { id: 2, url: "https://example.com/a", active: true, lastAccessed: 5 }
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].tabs[0].id, 2);

  const issues = bookmarkStructureIssues([
    { id: "1", url: "https://example.com/a", title: "A" },
    { id: "2", url: "https://example.com/a#fragment", title: "A copy" },
    { id: "3", url: "not a URL", title: "Invalid" }
  ]);
  assert.equal(issues.filter((issue) => issue.type === "duplicate").length, 1);
  assert.equal(issues.filter((issue) => issue.type === "invalid").length, 1);
});

test("feature preferences are bounded and exclusions match subdomains", () => {
  const preferences = normalizeFeaturePreferences({
    activityRetentionDays: 1,
    activityReferenceHours: 100,
    activityExcludedSites: ["Example.COM", "bad value", "example.com"],
    ecoDefaultLevel: "invalid",
    continueWatchingRetentionDays: 30,
    cryptoGuardEnabled: false,
    continueWatchingEnabled: false
  });
  assert.equal(preferences.activityRetentionDays, 90);
  assert.equal(preferences.activityReferenceHours, 24);
  assert.deepEqual(preferences.activityExcludedSites, ["example.com"]);
  assert.equal(preferences.ecoDefaultLevel, "limit");
  assert.equal(preferences.cryptoGuardEnabled, false);
  assert.equal(preferences.continueWatchingEnabled, false);
  assert.equal(siteIsExcluded("news.example.com", preferences.activityExcludedSites), true);
});

test("Continue Watching reminders stay on their media site", () => {
  assert.equal(mediaSite("https://youtu.be/dQw4w9WgXcQ"), "youtube.com");
  assert.equal(sameMediaSite(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/"
  ), true);
  assert.equal(sameMediaSite(
    "https://rutube.ru/video/example/",
    "https://studio.rutube.ru/"
  ), true);
  assert.equal(sameMediaSite(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://x.com/home"
  ), false);
});
