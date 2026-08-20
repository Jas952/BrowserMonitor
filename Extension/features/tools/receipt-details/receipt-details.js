import { browserLanguage, localizeDocument, translate } from "../../../core/localization.js";

const detailsDomain = document.querySelector("#details-domain");
const blockedCount = document.querySelector("#blocked-count");
const blockedResources = document.querySelector("#blocked-resources");
const blockedEmpty = document.querySelector("#blocked-empty");
const thirdPartyCount = document.querySelector("#third-party-count");
const thirdPartyConnections = document.querySelector("#third-party-connections");
const thirdPartyEmpty = document.querySelector("#third-party-empty");
const allowedTotal = document.querySelector("#allowed-total");
const blockedTotal = document.querySelector("#blocked-total");
const unknownTotal = document.querySelector("#unknown-total");

let language = "en";
const t = (key, values) => translate(language, key, values);

function domainCategory(domain) {
  const value = String(domain ?? "").toLowerCase();
  if (/(^|[.-])(ads?|adservice|doubleclick|marketing|promo)([.-]|$)/.test(value)) return "ads";
  if (/(analytics|metrics|telemetry|segment|amplitude|clarity|hotjar)/.test(value)) return "analytics";
  if (/(youtube|vimeo|rutube|video|stream|media)/.test(value)) return "video";
  if (/(facebook|instagram|twitter|tiktok|reddit|linkedin|vk\.com)/.test(value)) return "social";
  if (/(cdn|cloudfront|fastly|akamai|static|assets|img)/.test(value)) return "cdn";
  return "other";
}

function renderList(listElement, emptyElement, countElement, data) {
  const items = Array.isArray(data) ? data : [];
  countElement.textContent = items.length;
  emptyElement.hidden = items.length > 0;
  
  listElement.replaceChildren(...items.map(({ domain, count }) => {
    const li = document.createElement("li");
    const nameWrap = document.createElement("span");
    nameWrap.className = "domain-entry";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = domain;
    const categoryName = domainCategory(domain);
    const category = document.createElement("span");
    category.className = "domain-category";
    category.textContent = t(`receiptCategory${categoryName[0].toUpperCase()}${categoryName.slice(1)}`);
    nameWrap.append(nameSpan, category);
    const countStrong = document.createElement("strong");
    countStrong.textContent = count;
    li.append(nameWrap, countStrong);
    return li;
  }));
}

async function bootstrap() {
  const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });
  language = uiPreferences.language || browserLanguage();
  localizeDocument(language);
  document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;

  const urlParams = new URLSearchParams(window.location.search);
  const tabId = parseInt(urlParams.get("tabId"), 10);
  
  if (!Number.isInteger(tabId)) {
    detailsDomain.textContent = t("internalUnavailable");
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) throw new Error("Tab not found");
    
    const receipt = await chrome.runtime.sendMessage({
      kind: "getSitePrivacyReceipt",
      tabId: tab.id,
      url: tab.url
    });
    
    detailsDomain.textContent = receipt.domain || t("currentSite");
    allowedTotal.textContent = Number(receipt.allowedRequests) || 0;
    blockedTotal.textContent = Number(receipt.blockedRequests) || 0;
    unknownTotal.textContent = Number(receipt.unknownRequests) || 0;
    
    renderList(blockedResources, blockedEmpty, blockedCount, receipt.blockedDomains);
    renderList(thirdPartyConnections, thirdPartyEmpty, thirdPartyCount, receipt.thirdPartyDomains);
  } catch (error) {
    detailsDomain.textContent = t("internalUnavailable");
  }
}

bootstrap();
