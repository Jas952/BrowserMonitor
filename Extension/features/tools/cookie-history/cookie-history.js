import { browserLanguage, localizeDocument, normalizeLanguage, translate } from "../../../core/localization.js";

const $ = (selector) => document.querySelector(selector);
let language = "en";

function t(key, values = {}) {
  return translate(language, key, values);
}

function applyPreferences(preferences = {}) {
  language = localizeDocument(normalizeLanguage(preferences.language || browserLanguage()));
  const theme = ["light", "dark", "solarized", "forest"].includes(preferences.theme) ? preferences.theme : "system";
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.title = `Browser Monitor — ${t("cookieHistoryTitle")}`;
}

async function hasPermission(permission) {
  return chrome.permissions.contains({ permissions: [permission] }).catch(() => false);
}

async function requestPermission(permission, promptKey) {
  if (await hasPermission(permission)) return true;
  if (!confirm(t(promptKey))) return false;
  return chrome.permissions.request({ permissions: [permission] }).catch(() => false);
}

function renderHistory(changes = []) {
  $("#cookie-history-count").textContent = new Intl.NumberFormat(language).format(changes.length);
  $("#cookie-history-empty").hidden = changes.length > 0;
  $("#cookie-history-rows").replaceChildren(...changes.map((change) => {
    const row = document.createElement("tr");
    const time = document.createElement("td");
    const domain = document.createElement("td");
    const name = document.createElement("td");
    const event = document.createElement("td");
    const date = new Date(change.at);
    time.textContent = date.toLocaleString(language === "ru" ? "ru-RU" : "en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
    time.title = date.toLocaleString(language === "ru" ? "ru-RU" : "en-US");
    domain.textContent = change.domain;
    domain.title = change.domain;
    name.textContent = change.name;
    name.title = change.name;
    event.textContent = t(change.removed ? "cookieChangeRemoved" : change.cause === "overwrite" ? "cookieChangeUpdated" : "cookieChangeCreated");
    row.append(time, domain, name, event);
    return row;
  }));
}

async function loadHistory() {
  const granted = await hasPermission("cookies");
  $("#cookie-permission-card").hidden = granted;
  $("#export-browser-cookies").disabled = !granted;
  if (!granted) {
    renderHistory([]);
    $("#cookie-history-status").textContent = t("cookieAccessDescription");
    return;
  }
  const result = await chrome.runtime.sendMessage({ kind:"getCookieChanges" }).catch(() => ({ changes:[] }));
  renderHistory(result.changes ?? []);
  $("#cookie-history-status").textContent = t("cookieHistorySessionNote");
}

$("#grant-cookie-access").addEventListener("click", async () => {
  if (await requestPermission("cookies", "cookiesPermissionPrompt")) await loadHistory();
});

$("#refresh-history").addEventListener("click", loadHistory);

$("#export-browser-cookies").addEventListener("click", async (event) => {
  if (!confirm(t("exportAllConfirm"))) return;
  if (!await requestPermission("cookies", "cookiesPermissionPrompt")) return;
  if (!await requestPermission("downloads", "downloadsPermissionPrompt")) return;
  event.currentTarget.disabled = true;
  $("#cookie-history-status").textContent = t("preparingExport");
  try {
    const result = await chrome.runtime.sendMessage({
      kind:"downloadCookies",
      all:true,
      format:$("#cookie-history-format").value,
      saveAs:true
    });
    $("#cookie-history-status").textContent = result.ok
      ? t("cookiesExported", { count:result.count, filename:result.filename })
      : (result.error ?? t("cookieExportFailed"));
  } finally {
    event.currentTarget.disabled = false;
  }
});

const stored = await chrome.storage.local.get({ uiPreferences:{ language:null, theme:"system" } });
applyPreferences(stored.uiPreferences);
await loadHistory();
