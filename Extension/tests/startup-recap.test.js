import assert from "node:assert/strict";
import test from "node:test";
import {
  mostRecentClosedWindow,
  sanitizeStartupRecap,
  sanitizeStartupTabs,
  videoResumeURL
} from "../features/tools/startup-recap.js";

test("startup recap selects the newest closed window", () => {
  const result = mostRecentClosedWindow([
    { lastModified: 20, window: { tabs: [{ url: "https://old.example" }] } },
    { lastModified: 40, window: { tabs: [{ url: "https://new.example" }] } },
    { lastModified: 60, tab: { url: "https://single.example" } }
  ]);
  assert.equal(result.window.tabs[0].url, "https://new.example");
});

test("startup recap keeps unique web tabs not already restored", () => {
  const tabs = sanitizeStartupTabs([
    { title: " First   tab ", url: "https://first.example/path" },
    { title: "Duplicate", url: "https://first.example/path" },
    { title: "Already open", url: "https://open.example/" },
    { title: "Restricted", url: "chrome://settings" }
  ], ["https://open.example/"]);
  assert.deepEqual(tabs, [{ title: "First tab", url: "https://first.example/path", faviconURL: "" }]);
});

test("startup recap expires and sanitizes its video card", () => {
  const now = Date.now();
  assert.equal(sanitizeStartupRecap({ createdAt: now - 180_000 }, now), null);
  const recap = sanitizeStartupRecap({
    id: "recap",
    createdAt: now,
    language: "ru",
    tabs: [],
    video: {
      title: " Last   video ",
      url: "https://video.example/watch?id=1",
      thumbnailURL: "javascript:alert(1)",
      position: 125,
      time: "2:05"
    }
  }, now);
  assert.equal(recap.video.title, "Last video");
  assert.equal(recap.video.thumbnailURL, "");
});

test("YouTube startup resume carries the saved timestamp", () => {
  const result = new URL(videoResumeURL("https://www.youtube.com/watch?v=abc123", 125.8));
  assert.equal(result.searchParams.get("t"), "125s");
  assert.equal(videoResumeURL("javascript:alert(1)", 125), "");
});
