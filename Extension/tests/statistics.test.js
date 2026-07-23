import assert from "node:assert/strict";
import test from "node:test";
import {
  localDayKey,
  normalizeBlockingStatistics,
  recordBlockingEvent,
  summarizeBlockingStatistics
} from "../statistics.js";

test("blocking statistics aggregate today, seven days, sites, and resources", () => {
  const now = new Date(2026, 6, 22, 12, 0, 0);
  let statistics = recordBlockingEvent({}, {
    type: "network",
    site: "www.example.com",
    resource: "ads.example.net"
  }, now);
  statistics = recordBlockingEvent(statistics, {
    type: "sponsor",
    site: "youtube.com",
    resource: "sponsor-segment",
    count: 2
  }, now);
  const yesterday = new Date(2026, 6, 21, 12, 0, 0);
  statistics = recordBlockingEvent(statistics, {
    type: "video",
    site: "rutube.ru",
    resource: "video-ad"
  }, yesterday);
  statistics = recordBlockingEvent(statistics, {
    type: "link",
    site: "twitter.com",
    resource: "example.com"
  }, yesterday);

  const summary = summarizeBlockingStatistics(statistics, now);
  assert.equal(summary.today.total, 3);
  assert.equal(summary.today.types.sponsor, 2);
  assert.equal(summary.sevenDayTotal, 5);
  assert.equal(summary.days.at(-2).types.link, 1);
  assert.deepEqual(summary.topSites.slice(0, 3), [
    { name: "youtube.com", count: 2 },
    { name: "example.com", count: 1 },
    { name: "rutube.ru", count: 1 }
  ]);
  assert.deepEqual(summary.resources[0], { name: "sponsor-segment", count: 2 });
});

test("blocking statistics retain only the local seven-day window", () => {
  const now = new Date(2026, 6, 22, 12, 0, 0);
  const oldKey = localDayKey(new Date(2026, 6, 10, 12, 0, 0));
  const recentKey = localDayKey(new Date(2026, 6, 20, 12, 0, 0));
  const normalized = normalizeBlockingStatistics({
    days: {
      [oldKey]: { total: 99 },
      [recentKey]: { total: 4, sites: { "news.example": 4 } }
    }
  }, now);
  assert.ok(!(oldKey in normalized.days));
  assert.equal(normalized.days[recentKey].total, 4);
});
