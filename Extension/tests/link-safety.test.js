import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLinkSafety,
  parseURLParts,
  sanitizeLinkSafetyDomains
} from "../link-safety.js";

test("parseURLParts separates path users from real domains", () => {
  const twitterUser = parseURLParts("https://twitter.com/some_user");
  assert.equal(twitterUser.registrableDomain, "twitter.com");
  assert.equal(twitterUser.pathname, "/some_user");

  const bait = parseURLParts("https://twitter.com.bad-site.com/path");
  assert.equal(bait.registrableDomain, "bad-site.com");
  assert.equal(bait.subdomain, "twitter.com");

  const paypalBait = parseURLParts("https://paypal.com.security-check.example.com");
  assert.equal(paypalBait.registrableDomain, "example.com");
  assert.equal(paypalBait.subdomain, "paypal.com.security-check");
});

test("parseURLParts handles common multi-label public suffixes", () => {
  assert.equal(parseURLParts("https://store.example.co.uk/path").registrableDomain, "example.co.uk");
  assert.equal(parseURLParts("https://docs.project.github.io").registrableDomain, "project.github.io");
  assert.equal(parseURLParts("https://demo.pages.dev").registrableDomain, "demo.pages.dev");
  assert.equal(parseURLParts("https://product.vercel.app").registrableDomain, "product.vercel.app");
  assert.equal(parseURLParts("https://service.appspot.com").registrableDomain, "service.appspot.com");
});

test("evaluateLinkSafety warns for brand bait in a subdomain", () => {
  const result = evaluateLinkSafety("https://paypal.com.security-check.example.com/login", {
    sourceUrl: "https://twitter.com/post/123"
  });
  assert.equal(result.action, "warn");
  assert.equal(result.registrableDomain, "example.com");
  assert.ok(result.reasons.some((reason) => reason.code === "brand-in-subdomain"));
  assert.ok(result.reasons.some((reason) => reason.code === "suspicious-word"));
});

test("evaluateLinkSafety warns for punycode, IP addresses, and redirect parameters", () => {
  assert.equal(evaluateLinkSafety("https://xn--80ak6aa92e.com").action, "warn");
  assert.ok(evaluateLinkSafety("https://127.0.0.1/login").reasons.some((reason) => reason.code === "ip-address"));
  assert.ok(evaluateLinkSafety("https://example.com/go?url=https%3A%2F%2Fbad-site.com").reasons.some((reason) => reason.code === "redirect-param"));
});

test("evaluateLinkSafety respects allowed domains and blocked domains", () => {
  assert.equal(evaluateLinkSafety("https://paypal.com.security-check.example.com/login", {
    allowedDomains: ["example.com"]
  }).action, "allow");

  const blocked = evaluateLinkSafety("https://known-domain.com", {
    blockedDomains: ["known-domain.com"]
  });
  assert.equal(blocked.action, "block");
  assert.equal(blocked.risk, "blocked");
  assert.ok(blocked.reasons.some((reason) => reason.code === "blocked-domain"));
});

test("sanitizeLinkSafetyDomains stores registrable domains only", () => {
  assert.deepEqual(sanitizeLinkSafetyDomains([
    "https://sub.example.co.uk/path",
    "example.co.uk",
    "javascript:alert(1)",
    "https://twitter.com.bad-site.com"
  ]), ["bad-site.com", "example.co.uk"]);
});
