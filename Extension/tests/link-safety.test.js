import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TRUSTED_DOMAINS,
  evaluateLinkSafety,
  parseURLParts,
  sanitizeLinkSafetyDomains,
  sanitizeLinkSafetyTrustedHosts
} from "../features/security/link-safety.js";

test("built-in trusted domains cover common official services", () => {
  assert.ok(DEFAULT_TRUSTED_DOMAINS.length >= 45);
  assert.deepEqual(DEFAULT_TRUSTED_DOMAINS, [...new Set(DEFAULT_TRUSTED_DOMAINS)].sort());
  for (const domain of [
    "apple.com", "cloudflare.com", "github.com", "google.com", "microsoftonline.com",
    "proton.me", "sberbank.ru", "telegram.org", "x.com", "yandex.ru"
  ]) {
    assert.ok(DEFAULT_TRUSTED_DOMAINS.includes(domain), `${domain} should be pre-trusted`);
  }
});

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

test("evaluateLinkSafety follows bounded nested redirect parameters", () => {
  const destination = "https://bad-site.com/login";
  const middle = `https://redirect.test/go?target=${encodeURIComponent(destination)}`;
  const outer = `https://example.com/out?url=${encodeURIComponent(middle)}`;
  const result = evaluateLinkSafety(outer);

  assert.equal(result.action, "warn");
  assert.equal(result.redirectDepth, 2);
  assert.equal(result.nestedRedirectURL, destination);
});

test("evaluateLinkSafety allows same-site redirects on known official domains", () => {
  const result = evaluateLinkSafety("https://accounts.google.com/SignOutOptions?continue=https%3A%2F%2Fmail.google.com%2Fmail");
  assert.equal(result.action, "allow");
  assert.equal(result.reasons.length, 0);

  const external = evaluateLinkSafety("https://accounts.google.com/continue?url=https%3A%2F%2Fexample.net%2Flogin");
  assert.equal(external.action, "warn");
  assert.ok(external.reasons.some((reason) => reason.code === "redirect-param"));
});

test("pre-trusted services remain protected against lookalikes and external redirects", () => {
  assert.equal(evaluateLinkSafety("https://online.sberbank.ru/login").action, "allow");
  assert.equal(evaluateLinkSafety("https://login.microsoftonline.com/common/oauth2").action, "allow");

  const lookalike = evaluateLinkSafety("https://sberbank-login.example.com");
  assert.equal(lookalike.action, "warn");
  assert.ok(lookalike.reasons.some((reason) => reason.code === "brand-in-subdomain"));

  const external = evaluateLinkSafety("https://login.microsoftonline.com/continue?url=https%3A%2F%2Fexample.net");
  assert.equal(external.action, "warn");
  assert.ok(external.reasons.some((reason) => reason.code === "redirect-param"));
});

test("trusted hosts are precise and include their child hosts", () => {
  const options = { allowedDomains: ["accounts.google.com"] };
  assert.equal(evaluateLinkSafety("https://accounts.google.com/continue?url=https%3A%2F%2Fexample.net", options).action, "allow");
  assert.equal(evaluateLinkSafety("https://child.accounts.google.com/continue?url=https%3A%2F%2Fexample.net", options).action, "allow");
  assert.equal(evaluateLinkSafety("https://mail.google.com/continue?url=https%3A%2F%2Fexample.net", options).action, "warn");
});

test("evaluateLinkSafety stops redirect cycles", () => {
  const result = evaluateLinkSafety("https://example.com/out?url=https%3A%2F%2Fexample.com%2Fout");
  assert.equal(result.redirectDepth, 1);
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

  const explicitBlockWins = evaluateLinkSafety("https://accounts.google.com", {
    allowedDomains: ["accounts.google.com"],
    blockedDomains: ["google.com"]
  });
  assert.equal(explicitBlockWins.action, "block");
});

test("sanitizeLinkSafetyDomains stores registrable domains only", () => {
  assert.deepEqual(sanitizeLinkSafetyDomains([
    "https://sub.example.co.uk/path",
    "example.co.uk",
    "javascript:alert(1)",
    "https://twitter.com.bad-site.com"
  ]), ["bad-site.com", "example.co.uk"]);
});

test("sanitizeLinkSafetyTrustedHosts preserves precise subdomains", () => {
  assert.deepEqual(sanitizeLinkSafetyTrustedHosts([
    "https://accounts.google.com/path",
    "accounts.google.com",
    "https://mail.google.com"
  ]), ["accounts.google.com", "mail.google.com"]);
});
