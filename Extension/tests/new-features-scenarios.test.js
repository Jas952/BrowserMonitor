import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../features/security/page-guard.js", import.meta.url), "utf8");
const context = vm.createContext({ URL });
vm.runInContext(source, context);
const guard = context.BrowserMonitorPageGuard;

const longVideo = {
  duration: 2_400,
  width: 960,
  height: 540,
  videoCount: 1,
  playerHint: true,
  title: "Example Show — Episode 4"
};

const scenarios = [
  ["01 · X timeline video is rejected", () => {
    assert.deepEqual({ ...guard.classifyLongFormMedia({ ...longVideo, hostname: "x.com", pathname: "/user/status/1" }) },
      { supported: false, reason: "social-feed" });
  }],
  ["02 · legacy Twitter timeline video is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "twitter.com", pathname: "/user/status/1" }).supported, false);
  }],
  ["03 · Instagram reel is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "instagram.com", pathname: "/reel/abc" }).reason, "social-feed");
  }],
  ["04 · TikTok video is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "tiktok.com", pathname: "/@user/video/1" }).supported, false);
  }],
  ["05 · Reddit feed video is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "reddit.com", pathname: "/r/videos/comments/1" }).supported, false);
  }],
  ["06 · short YouTube clip is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "youtube.com", pathname: "/watch", duration: 90 }).reason, "short");
  }],
  ["07 · tiny background player is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "youtube.com", pathname: "/watch", width: 240, height: 135 }).reason, "small-player");
  }],
  ["08 · YouTube watch page is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "youtube.com", pathname: "/watch" }).supported, true);
  }],
  ["09 · Rutube video page is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "rutube.ru", pathname: "/video/abc" }).reason, "known-video-site");
  }],
  ["10 · Vimeo player is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "player.vimeo.com", pathname: "/video/123" }).supported, true);
  }],
  ["11 · generic movie path with large player is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "cinema.example", pathname: "/movie/example-show" }).supported, true);
  }],
  ["12 · structured TV episode is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({
      ...longVideo,
      hostname: "stream.example",
      pathname: "/catalog/item-7",
      playerHint: false,
      structuredTypes: ["TVEpisode"]
    }).supported, true);
  }],
  ["13 · long generic JW-style player is accepted", () => {
    assert.equal(guard.classifyLongFormMedia({
      ...longVideo,
      hostname: "mirror.example",
      pathname: "/catalog/42",
      title: "Evening feature"
    }).reason, "long-form-player");
  }],
  ["14 · multi-video feed without film signals is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({
      ...longVideo,
      hostname: "portal.example",
      pathname: "/feed",
      videoCount: 8,
      playerHint: false
    }).reason, "video-feed");
  }],
  ["15 · advertising video is rejected", () => {
    assert.equal(guard.classifyLongFormMedia({ ...longVideo, hostname: "cinema.example", pathname: "/movie/1", advertisement: true }).reason, "advertisement");
  }],
  ["16 · episodic title can confirm a medium-length player", () => {
    assert.equal(guard.classifyLongFormMedia({
      ...longVideo,
      hostname: "catalog.example",
      pathname: "/item/42",
      duration: 360,
      playerHint: false,
      title: "Example Show S02E03"
    }).supported, true);
  }],
  ["17 · media identity is scoped to the site", () => {
    assert.notEqual(
      guard.mediaIdentitySource("cinema-one.example", "Example Show — Episode 4"),
      guard.mediaIdentitySource("cinema-two.example", "Example Show — Episode 4")
    );
  }],
  ["18 · Crypto Guard removes bidirectional and zero-width marks", () => {
    const address = "0x52908400098527886E0F7030069857D2E4169EE7";
    assert.equal(guard.detectWalletAddress(`\u202E${address}\u200B`).value, address);
  }],
  ["19 · ambiguous copy with two wallet addresses is ignored", () => {
    const first = "0x52908400098527886E0F7030069857D2E4169EE7";
    const second = "0xde709f2102306220921060314715629080e2fb77";
    assert.equal(guard.findWalletAddress(`${first} ${second}`), null);
  }],
  ["20 · Google redirect is unwrapped before search-result assessment", () => {
    assert.equal(
      guard.unwrapSearchURL("https://www.google.com/url?url=https%3A%2F%2Fexample.com%2Fmovie", "google.com"),
      "https://example.com/movie"
    );
  }]
];

for (const [name, run] of scenarios) test(name, run);
