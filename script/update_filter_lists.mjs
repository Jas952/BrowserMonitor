import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertABPNetworkRule,
  filterListMetadata,
  genericCosmeticSelectors
} from "../Extension/filter-parser.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDirectory = join(root, "Extension/rules");
const sources = [
  {
    id: "easylist",
    url: "https://easylist.to/easylist/easylist.txt",
    limit: 19_500,
    output: "easylist-network.json"
  },
  {
    id: "easyprivacy",
    url: "https://easylist.to/easylist/easyprivacy.txt",
    limit: 9_500,
    output: "easyprivacy-network.json"
  },
  {
    id: "ruadlist_network",
    url: "https://easylist-downloads.adblockplus.org/ruadlist.txt",
    limit: 1_000,
    output: "ruadlist-network.json"
  }
];
const optionalCosmeticSources = [
  {
    id: "easylist_cookie",
    url: "https://secure.fanboy.co.nz/fanboy-cookiemonster.txt",
    output: "easylist-cookie-cosmetic.css"
  },
  {
    id: "ruadlist",
    url: "https://easylist-downloads.adblockplus.org/ruadlist.txt",
    output: "ruadlist-cosmetic.css"
  },
  {
    id: "fanboy_social",
    url: "https://easylist.to/easylist/fanboy-social.txt",
    output: "fanboy-social-cosmetic.css"
  },
  {
    id: "antiadblock",
    url: "https://easylist-downloads.adblockplus.org/antiadblockfilters.txt",
    output: "antiadblock-cosmetic.css"
  }
];
const cryptominingSource = {
  id: "nocoin",
  url: "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt",
  limit: 500,
  output: "cryptomining-rules.js"
};

async function readSource(source) {
  const localOverride = process.env[`BROWSER_MONITOR_${source.id.toUpperCase()}_PATH`];
  if (localOverride) return readFileSync(localOverride, "utf8");
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
  return response.text();
}

mkdirSync(rulesDirectory, { recursive: true });
const metadata = {
  generatedAt: new Date().toISOString(),
  networkRuleCount: 0,
  cosmeticRuleCount: 0,
  optionalCosmeticRuleCounts: {},
  cryptominingRuleCount: 0,
  sources: []
};
let easyListText = "";

for (const source of sources) {
  const text = await readSource(source);
  if (source.id === "easylist") easyListText = text;
  const rules = [];
  const signatures = new Set();
  for (const line of text.split(/\r?\n/)) {
    const rule = convertABPNetworkRule(line.trim(), rules.length + 1);
    if (!rule) continue;
    const signature = JSON.stringify([rule.condition, rule.action]);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    rules.push(rule);
    if (rules.length >= source.limit) break;
  }
  writeFileSync(join(rulesDirectory, source.output), JSON.stringify(rules));
  metadata.networkRuleCount += rules.length;
  metadata.sources.push({ id: source.id, version: filterListMetadata(text).version, ruleCount: rules.length });
}

const selectors = genericCosmeticSelectors(easyListText);
const cosmeticCSS = selectors.map((selector) => `${selector}{display:none!important}`).join("\n");
writeFileSync(join(rulesDirectory, "easylist-cosmetic.css"), cosmeticCSS);
metadata.cosmeticRuleCount = selectors.length;

for (const source of optionalCosmeticSources) {
  const text = await readSource(source);
  const optionalSelectors = genericCosmeticSelectors(text);
  writeFileSync(
    join(rulesDirectory, source.output),
    optionalSelectors.map((selector) => `${selector}{display:none!important}`).join("\n")
  );
  metadata.optionalCosmeticRuleCounts[source.id] = optionalSelectors.length;
  metadata.sources.push({
    id: source.id,
    version: filterListMetadata(text).version,
    cosmeticRuleCount: optionalSelectors.length
  });
}

const cryptominingText = await readSource(cryptominingSource);
const cryptominingRules = [];
const cryptominingSignatures = new Set();
for (const line of cryptominingText.split(/\r?\n/)) {
  const rule = convertABPNetworkRule(line.trim(), 620_000 + cryptominingRules.length);
  if (!rule) continue;
  const signature = JSON.stringify([rule.condition, rule.action]);
  if (cryptominingSignatures.has(signature)) continue;
  cryptominingSignatures.add(signature);
  rule.priority = 15_000;
  cryptominingRules.push(rule);
  if (cryptominingRules.length >= cryptominingSource.limit) break;
}
writeFileSync(
  join(rulesDirectory, cryptominingSource.output),
  `export const CRYPTO_MINING_RULES = ${JSON.stringify(cryptominingRules)};\n`
);
metadata.cryptominingRuleCount = cryptominingRules.length;
metadata.sources.push({
  id: cryptominingSource.id,
  version: filterListMetadata(cryptominingText).version,
  ruleCount: cryptominingRules.length
});

writeFileSync(
  join(root, "Extension/blocker-metadata.js"),
  `export const CONTENT_BLOCKER_METADATA = ${JSON.stringify(metadata, null, 2)};\n`
);
writeFileSync(join(rulesDirectory, "ATTRIBUTION.md"), `# Filter list attribution

Network and cosmetic filters are derived from EasyList, EasyPrivacy, EasyList Cookie List,
RU AdList, Fanboy's Social Blocking List, Adblock Warning Removal List, and NoCoin.

- Source: https://easylist.to/
- Authors: The EasyList authors
- Licence: GPL-3.0-or-later or CC-BY-SA-3.0-or-later
- NoCoin source: https://github.com/hoshsadiq/adblock-nocoin-list
- NoCoin licence: MIT
- Generated: ${metadata.generatedAt}

Run \`node script/update_filter_lists.mjs\` to refresh the packaged rules.
`);

console.log(JSON.stringify(metadata, null, 2));
