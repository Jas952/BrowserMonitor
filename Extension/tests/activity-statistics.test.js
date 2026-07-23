import assert from "node:assert/strict";
import test from "node:test";
import { recordActivitySample, summarizeActivityStatistics } from "../activity-statistics.js";

test("activity statistics separate active, video and reading time", () => {
  const now = new Date("2026-07-23T14:00:00");
  let data = recordActivitySample({}, { visit: true, activeSeconds: 15, videoSeconds: 15 }, "youtube.com", now);
  data = recordActivitySample(data, { activeSeconds: 15, readingSeconds: 10 }, "example.com", now);
  const summary = summarizeActivityStatistics(data, "day", now);
  assert.equal(summary.totals.visits, 1);
  assert.equal(summary.totals.activeSeconds, 30);
  assert.equal(summary.totals.videoSeconds, 15);
  assert.equal(summary.totals.readingSeconds, 10);
  assert.equal(summary.sites[0].domain, "youtube.com");
});

test("activity sample duration is bounded and invalid domains are ignored", () => {
  const now = new Date("2026-07-23T14:00:00");
  const data = recordActivitySample({}, { visit: true, activeSeconds: 500, videoSeconds: 500 }, "example.com", now);
  assert.equal(summarizeActivityStatistics(data, "day", now).totals.activeSeconds, 30);
  assert.deepEqual(recordActivitySample({}, { activeSeconds: 10 }, "not a domain", now), { version: 1, days: {} });
});

test("reality counter uses day, week and actual monthly work hours", () => {
  const now = new Date("2026-07-23T14:00:00");
  const data = {
    version: 1,
    days: {
      "2026-07-23": {
        sites: {
          "example.com": { visits: 1, activeSeconds: 8 * 3600, videoSeconds: 0, readingSeconds: 0 }
        }
      }
    }
  };
  const day = summarizeActivityStatistics(data, "day", now);
  const week = summarizeActivityStatistics(data, "week", now);
  const month = summarizeActivityStatistics(data, "month", now);
  assert.deepEqual([day.humor.workHours, week.humor.workHours, month.humor.workHours], [8, 40, 184]);
  assert.deepEqual([day.humor.workdayPercent, week.humor.workdayPercent, month.humor.workdayPercent], [100, 20, 4]);
});
