const allResourceTypes = [
  "script", "image", "stylesheet", "font", "media", "xmlhttprequest",
  "sub_frame", "ping", "websocket", "object", "other"
];

const resourceTypeMap = new Map([
  ["script", "script"], ["image", "image"], ["stylesheet", "stylesheet"],
  ["font", "font"], ["media", "media"], ["xmlhttprequest", "xmlhttprequest"],
  ["xhr", "xmlhttprequest"], ["subdocument", "sub_frame"], ["ping", "ping"],
  ["websocket", "websocket"], ["object", "object"], ["other", "other"]
]);

const unsupportedOptions = new Set([
  "badfilter", "csp", "document", "elemhide", "genericblock", "generichide",
  "header", "match-case", "method", "permissions", "popup", "redirect",
  "redirect-rule", "removeparam", "replace", "rewrite", "sitekey"
]);

function splitPatternAndOptions(line) {
  const marker = line.lastIndexOf("$");
  if (marker < 0) return [line, []];
  const suffix = line.slice(marker + 1);
  if (!/^[~\w-]+(?:=[^,]+)?(?:,[~\w-]+(?:=[^,]+)?)*$/.test(suffix)) return [line, []];
  return [line.slice(0, marker), suffix.split(",")];
}

function validDomain(domain) {
  return /^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain);
}

export function convertABPNetworkRule(line, id, priority = 1) {
  if (!line || line.startsWith("!") || line.startsWith("[") || line.startsWith("@@")) return null;
  if (line.includes("##") || line.includes("#@#") || line.includes("#?#") || line.includes("#$#")) return null;

  const [pattern, options] = splitPatternAndOptions(line);
  if (!pattern || pattern.length > 1_000 || (pattern.startsWith("/") && pattern.endsWith("/"))) return null;

  const includedTypes = new Set();
  const excludedTypes = new Set();
  const initiatorDomains = [];
  const excludedInitiatorDomains = [];
  let domainType;

  for (const rawOption of options) {
    const [rawName, value] = rawOption.split("=", 2);
    const negated = rawName.startsWith("~");
    const name = negated ? rawName.slice(1) : rawName;
    if (unsupportedOptions.has(name) || name === "denyallow") return null;
    if (name === "third-party") {
      domainType = negated ? "firstParty" : "thirdParty";
      continue;
    }
    if (name === "first-party") {
      domainType = negated ? "thirdParty" : "firstParty";
      continue;
    }
    if (name === "domain" && value) {
      for (const candidate of value.split("|")) {
        const excluded = candidate.startsWith("~");
        const domain = excluded ? candidate.slice(1) : candidate;
        if (!validDomain(domain)) continue;
        (excluded ? excludedInitiatorDomains : initiatorDomains).push(domain.replace(/^\*\./, ""));
      }
      continue;
    }
    const resourceType = resourceTypeMap.get(name);
    if (resourceType) {
      (negated ? excludedTypes : includedTypes).add(resourceType);
      continue;
    }
    if (name) return null;
  }

  const condition = { urlFilter: pattern, excludedResourceTypes: ["main_frame"] };
  if (includedTypes.size > 0) {
    condition.resourceTypes = [...includedTypes].filter((type) => !excludedTypes.has(type));
    delete condition.excludedResourceTypes;
    if (condition.resourceTypes.length === 0) return null;
  } else if (excludedTypes.size > 0) {
    condition.resourceTypes = allResourceTypes.filter((type) => !excludedTypes.has(type));
    delete condition.excludedResourceTypes;
    if (condition.resourceTypes.length === 0) return null;
  }
  if (domainType) condition.domainType = domainType;
  if (initiatorDomains.length > 0) condition.initiatorDomains = [...new Set(initiatorDomains)];
  if (excludedInitiatorDomains.length > 0) {
    condition.excludedInitiatorDomains = [...new Set(excludedInitiatorDomains)];
  }
  return { id, priority, action: { type: "block" }, condition };
}

export function genericCosmeticSelectors(text, limit = Number.POSITIVE_INFINITY) {
  const selectors = new Set();
  for (const line of text.split(/\r?\n/)) {
    const marker = line.indexOf("##");
    if (marker !== 0) continue;
    const selector = line.slice(2).trim();
    if (!selector || selector.length > 800) continue;
    if (/^\+js\(|:-abp-|:has-text\(|:matches-css|:xpath\(/.test(selector)) continue;
    selectors.add(selector);
    if (selectors.size >= limit) break;
  }
  return [...selectors];
}

export function filterListMetadata(text) {
  const expires = text.match(/^! Expires:\s*(\d+)\s*(hour|hours|day|days)/im);
  const amount = Number(expires?.[1] ?? 24);
  const hours = expires?.[2]?.toLowerCase().startsWith("day") ? amount * 24 : amount;
  return {
    title: text.match(/^! Title:\s*(.+)$/im)?.[1]?.trim() ?? "Custom filter list",
    version: text.match(/^! Version:\s*(.+)$/im)?.[1]?.trim() ?? "unknown",
    expiresHours: Math.min(Math.max(Number.isFinite(hours) ? hours : 24, 6), 168)
  };
}

export function compileFilterList(text, {
  firstRuleId = 630_000,
  networkLimit = 500,
  cosmeticLimit = 500,
  priority = 12_000
} = {}) {
  const networkRules = [];
  const signatures = new Set();
  for (const line of text.split(/\r?\n/)) {
    const rule = convertABPNetworkRule(line.trim(), firstRuleId + networkRules.length, priority);
    if (!rule) continue;
    const signature = JSON.stringify([rule.condition, rule.action]);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    networkRules.push(rule);
    if (networkRules.length >= networkLimit) break;
  }
  return {
    ...filterListMetadata(text),
    networkRules,
    cosmeticSelectors: genericCosmeticSelectors(text, cosmeticLimit)
  };
}
