import assert from "node:assert/strict";
import test from "node:test";
import { cookieExportFilename, serializeCookies } from "../cookies.js";

const cookies = [
  {
    domain: ".example.com",
    expirationDate: 1_800_000_000.9,
    hostOnly: false,
    httpOnly: true,
    name: "session",
    path: "/",
    secure: true,
    value: "secret"
  },
  {
    domain: "example.com",
    hostOnly: true,
    httpOnly: false,
    name: "theme",
    path: "/account",
    secure: false,
    value: "dark"
  }
];

test("cookies export in Netscape format with HttpOnly compatibility", () => {
  const output = serializeCookies(cookies, "netscape");
  assert.match(output, /^# Netscape HTTP Cookie File/m);
  assert.match(output, /#HttpOnly_\.example\.com\tTRUE\t\/\tTRUE\t1800000000\tsession\tsecret/);
  assert.match(output, /example\.com\tFALSE\t\/account\tFALSE\t0\ttheme\tdark/);
});

test("cookies export as deterministic JSON", () => {
  const parsed = JSON.parse(serializeCookies(cookies, "json"));
  assert.deepEqual(parsed.map((cookie) => cookie.name), ["session", "theme"]);
});

test("cookie export filenames are safe", () => {
  assert.equal(cookieExportFilename({ hostname: "Sub.Example.com", format: "netscape" }), "sub.example.com-cookies.txt");
  assert.equal(cookieExportFilename({ all: true, format: "json" }), "all-cookies.json");
});
