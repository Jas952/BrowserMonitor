import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../core/content.js", import.meta.url), "utf8");

test("Yandex ad cleanup does not hide broad search-page containers", () => {
  assert.equal(source.includes('[data-fast-name*="direct" i]'), false);
  assert.equal(source.includes('[data-zone-name*="direct" i]'), false);
  assert.equal(source.includes('[class*="Direct" i]'), false);
  assert.match(source, /li\.serp-item:has\(> \.Organic_withAdvLabel\)/);
  assert.match(source, /li\.serp-item:has\(\.AdvRsyaOrganic\)/);
  assert.match(source, /div\.Root\[id\*="OrganicBase__"\]/);
  assert.match(source, /li:has\(> div\.Root\[id\*="OrganicBase__"\]\)/);
  assert.match(source, /li\.serp-item:has\(a\[href\*="yabs\.yandex\.ru\/count\/" i\]\)/);
  assert.match(source, /function scanYandexAdCards\(\)/);
  assert.match(source, /card\.style\.setProperty\("display", "none", "important"\)/);
  assert.match(source, /function restoreYandexAdCard\(card, originalDisplay\)/);
  assert.match(source, /attributes: protectionSettings\.adFilterEnabled && isYandexSearchPage\(\)/);
  assert.match(source, /isYandexSearchPage\(\) \? YANDEX_AD_MARKER_SELECTOR : ""/);
  assert.match(source, /aside:has\(a\[href\*="yabs\.yandex" i\]\)/);
  assert.match(source, /div:has\(> a\[href\*="direct\.yandex" i\]\)/);
});

test("regional cosmetic filtering hides current Yandex RSYA cards", () => {
  const regionalCss = readFileSync(new URL("../rules/ruadlist-cosmetic.css", import.meta.url), "utf8");
  assert.match(regionalCss, /^\.AdvRsyaOrganic,div\.Root\[id\*="OrganicBase__"\],/);
  assert.match(regionalCss, /li:has\(> div\.Root\[id\*="OrganicBase__"\]\)/);
  assert.match(regionalCss, /li\.serp-item:has\(> \.Organic_withAdvLabel\)/);
});

test("Continue Watching notice opens the saved page and reapplies the saved position", () => {
  assert.match(source, /url: saved\?\.url \|\| location\.href/);
  assert.match(source, /continueWatchingResumeURL\(url, position\)/);
  assert.match(source, /parsed\.searchParams\.set\("t", `\$\{Math\.max\(0, Math\.floor\(position\)\)\}s`\)/);
  assert.match(source, /restoreContinueWatchingPosition\(video, position\)/);
  assert.match(source, /for \(const delay of \[250, 1_000, 2_500, 5_000\]\)/);
  assert.match(source, /Math\.abs\(Number\(video\.currentTime\) - position\) <= 2/);
});

test("startup recap is a one-minute in-page card with both actions", () => {
  assert.match(source, /browser-monitor-startup-recap/);
  assert.match(source, /kind: "openStartupTabs"/);
  assert.match(source, /kind: "openStartupVideo"/);
  assert.match(source, /remaining = 60_000/);
});

test("subscription cosmetics do not hide empty video player placeholders", () => {
  assert.match(source, /filter\(safeSubscriptionCosmeticSelector\)/);
  assert.match(source, /!== "#movie_video:empty"/);
});
