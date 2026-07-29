import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../page-guard.js", import.meta.url), "utf8");
const context = vm.createContext({ URL, URLSearchParams });
vm.runInContext(source, context);
const guard = context.BrowserMonitorPageGuard;

const player = {
  hostname: "embed.example",
  pathname: "/catalog/item",
  duration: 2_400,
  width: 960,
  height: 540,
  videoCount: 1,
  playerHint: true,
  title: "Example Show — Episode 4"
};

const scenarios = [
  ["01 native long-form video", { ...player }, true],
  ["02 Video.js-style player", { ...player, pathname: "/video-js" }, true],
  ["03 JW Player-style player", { ...player, pathname: "/jw" }, true],
  ["04 Plyr-style player", { ...player, pathname: "/plyr" }, true],
  ["05 Shaka/MSE-style player", { ...player, pathname: "/shaka" }, true],
  ["06 DASH-style player", { ...player, pathname: "/dash" }, true],
  ["07 HLS-style player", { ...player, pathname: "/hls" }, true],
  ["08 player with auxiliary/ad video elements", { ...player, videoCount: 5 }, true],
  ["09 known Vimeo embed", { ...player, hostname: "player.vimeo.com", pathname: "/video/42" }, true],
  ["10 known Rutube embed", { ...player, hostname: "rutube.ru", pathname: "/play/embed/42" }, true],
  ["11 structured TVEpisode metadata", { ...player, playerHint: false, structuredTypes: ["TVEpisode"] }, true],
  ["12 episodic title without known wrapper", { ...player, playerHint: false, title: "Series S02E03" }, true],
  ["13 movie path without known wrapper", { ...player, playerHint: false, pathname: "/movie/42", title: "Feature" }, true],
  ["14 short trailer", { ...player, duration: 90 }, false],
  ["15 tiny background video", { ...player, width: 240, height: 135 }, false],
  ["16 explicit advertisement", { ...player, advertisement: true }, false],
  ["17 social feed video", { ...player, hostname: "twitter.com", pathname: "/status/42" }, false],
  ["18 generic multi-video feed", { ...player, pathname: "/feed", playerHint: false, videoCount: 8, title: "News" }, false],
  ["19 generic long video without media signals", { ...player, pathname: "/article", playerHint: false, title: "News" }, false],
  ["20 completed/invalid zero-duration media", { ...player, duration: Number.NaN }, false]
];

for (const [name, input, supported] of scenarios) {
  test(name, () => assert.equal(guard.classifyLongFormMedia(input).supported, supported));
}

test("episode query values produce separate local identities", () => {
  const first = guard.mediaIdentitySource("api.example", "Example Show", "/embed/movie/332", "?season=1&episode=1&session=secret");
  const second = guard.mediaIdentitySource("api.example", "Example Show", "/embed/movie/332", "?season=1&episode=2&session=secret");
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /session|secret/);
});

test("tracking and verification query parameters do not alter identity", () => {
  const first = guard.mediaIdentitySource("api.example", "Example Show", "/embed/movie/332", "?episode=1&utm_source=mail");
  const second = guard.mediaIdentitySource("api.example", "Example Show", "/embed/movie/332", "?episode=1&token=private");
  assert.equal(first, second);
});

test("YouTube video query values produce separate local identities", () => {
  const first = guard.mediaIdentitySource("www.youtube.com", "Stale YouTube title", "/watch", "?v=video-one&utm_source=mail");
  const second = guard.mediaIdentitySource("www.youtube.com", "Stale YouTube title", "/watch", "?v=video-two");
  assert.notEqual(first, second);
  assert.match(first, /v=video one/);
  assert.doesNotMatch(first, /utm_source|mail/);
});
