import { getDomain, getPublicSuffix } from "tldts";
import { remove as removeConfusables } from "confusables";
import { toUnicode } from "punycode/";

export function registrableDomain(hostname) {
  return getDomain(String(hostname ?? ""), { allowPrivateDomains: true }) ?? "";
}

export function publicSuffix(hostname) {
  return getPublicSuffix(String(hostname ?? ""), { allowPrivateDomains: true }) ?? "";
}

export function confusableSkeleton(value) {
  return removeConfusables(String(value ?? "")).normalize("NFKC").toLowerCase();
}

export function unicodeHostname(value) {
  try { return toUnicode(String(value ?? "")); } catch { return String(value ?? ""); }
}
