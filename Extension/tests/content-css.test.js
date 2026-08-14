import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../core/content.js", import.meta.url), "utf8");

test("Yandex ad cleanup does not hide broad search-page containers", () => {
  assert.equal(source.includes('[data-fast-name*="direct" i]'), false);
  assert.equal(source.includes('[data-zone-name*="direct" i]'), false);
  assert.equal(source.includes('[class*="Direct" i]'), false);
  assert.match(source, /aside:has\(a\[href\*="yabs\.yandex" i\]\)/);
  assert.match(source, /div:has\(> a\[href\*="direct\.yandex" i\]\)/);
});

test("Continue Watching notice opens the saved page and reapplies the saved position", () => {
  assert.match(source, /url: saved\?\.url \|\| location\.href/);
  assert.match(source, /continueWatchingResumeURL\(url, position\)/);
  assert.match(source, /parsed\.searchParams\.set\("t", `\$\{Math\.max\(0, Math\.floor\(position\)\)\}s`\)/);
  assert.match(source, /restoreContinueWatchingPosition\(video, position\)/);
});

test("subscription cosmetics do not hide empty video player placeholders", () => {
  assert.match(source, /filter\(safeSubscriptionCosmeticSelector\)/);
  assert.match(source, /!== "#movie_video:empty"/);
});
