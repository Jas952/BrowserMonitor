import { browserLanguage, localizeDocument, translate } from "./localization.js";

const detailsDomain = document.querySelector("#details-domain");
const blockedCount = document.querySelector("#blocked-count");
const blockedResources = document.querySelector("#blocked-resources");
const blockedEmpty = document.querySelector("#blocked-empty");
const thirdPartyCount = document.querySelector("#third-party-count");
const thirdPartyConnections = document.querySelector("#third-party-connections");
const thirdPartyEmpty = document.querySelector("#third-party-empty");

let language = "en";
const t = (key, values) => translate(language, key, values);

function renderList(listElement, emptyElement, countElement, data) {
  const items = Array.isArray(data) ? data : [];
  countElement.textContent = items.length;
  emptyElement.hidden = items.length > 0;
  
  listElement.replaceChildren(...items.map(({ domain, count }) => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = domain;
    const countStrong = document.createElement("strong");
    countStrong.textContent = count;
    li.append(nameSpan, countStrong);
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
    
    renderList(blockedResources, blockedEmpty, blockedCount, receipt.blockedDomains);
    renderList(thirdPartyConnections, thirdPartyEmpty, thirdPartyCount, receipt.thirdPartyDomains);
  } catch (error) {
    detailsDomain.textContent = t("internalUnavailable");
  }
}

bootstrap();
