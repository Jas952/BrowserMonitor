import { browserLanguage, localizeDocument, normalizeLanguage, translate } from "./localization.js";

const languageSelect = document.querySelector("#language-select");
const contentBlockingToggle = document.querySelector("#contentBlockingEnabled");
const monitoringToggle = document.querySelector("#monitoringEnabled");
const heroStatus = document.querySelector("#hero-status");
const imageSwapOptions = document.querySelector("#image-swap-options");
const imageFileInput = document.querySelector("#image-file-input");
const customImageCount = document.querySelector("#custom-image-count");
const subscriptionStatuses = document.querySelector("#subscription-statuses");
const toast = document.querySelector("#save-toast");

let language = "en";
let uiPreferences = { language: null, theme: "system", activeSection: "general" };
let protectionSettings = {};
let customImages = [];
let toastTimer = null;
const MAX_CUSTOM_IMAGES = 9;
const MAX_CUSTOM_IMAGE_BYTES = 1_048_576;
const MAX_CUSTOM_IMAGES_TOTAL_BYTES = 6 * 1_048_576;
const CUSTOM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"]);

const t = (key, values) => translate(language, key, values);

function showToast(key, values) {
  clearTimeout(toastTimer);
  toast.textContent = t(key, values);
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2_200);
}

function applyTheme(theme) {
  const selected = ["system", "light", "dark", "solarized", "forest"].includes(theme) ? theme : "system";
  document.documentElement.dataset.theme = selected === "system" ? "" : selected;
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeValue === selected);
  });
}

async function saveUIPreferences(partial) {
  uiPreferences = { ...uiPreferences, ...partial };
  await chrome.storage.local.set({ uiPreferences });
}

function showSection(requestedSection, persist = true) {
  const available = [...document.querySelectorAll(".settings-panel")].map((panel) => panel.id);
  const section = available.includes(requestedSection) ? requestedSection : "general";
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.hidden = panel.id !== section;
  });
  document.querySelectorAll(".nav-tab").forEach((button) => {
    const selected = button.dataset.sectionTarget === section;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  if (persist) saveUIPreferences({ activeSection: section });
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.sectionTarget));
});

function renderCustomImages() {
  customImageCount.textContent = customImages.length
    ? t("imageCount", { count: customImages.length })
    : t("noCustomImages");
  document.querySelector("#remove-images").disabled = customImages.length === 0;
}

function sanitizeCustomImages(values) {
  const result = [];
  let encodedBytes = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== "string" || !/^data:image\/(?:jpeg|png|webp|gif|bmp);base64,/i.test(value)) continue;
    const nextBytes = new TextEncoder().encode(value).byteLength;
    if (encodedBytes + nextBytes > 8_500_000) break;
    result.push(value);
    encodedBytes += nextBytes;
    if (result.length >= MAX_CUSTOM_IMAGES) break;
  }
  return result;
}

function renderSubscriptions(subscriptions) {
  subscriptionStatuses.replaceChildren(...(subscriptions ?? []).map((subscription) => {
    const row = document.createElement("div");
    row.className = "subscription-row";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = subscription.title || subscription.url;
    title.title = subscription.url;
    const detail = document.createElement("span");
    detail.className = subscription.error ? "error" : "";
    detail.textContent = subscription.error
      ? t("updateFailed", { error: subscription.error })
      : t("ruleSummary", {
          network: subscription.networkRuleCount ?? 0,
          cosmetic: subscription.cosmeticRuleCount ?? 0
        });
    copy.append(title, detail);
    const updated = document.createElement("span");
    updated.textContent = subscription.updatedAt
      ? t("updated", { time: new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(subscription.updatedAt)) })
      : "";
    row.append(copy, updated);
    return row;
  }));
}

function renderSettings() {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.checked = Boolean(protectionSettings[input.dataset.setting]);
  });
  const theme = protectionSettings.imageSwapTheme || "landscape";
  const themeRadio = document.querySelector(`input[name="imageSwapTheme"][value="${CSS.escape(theme)}"]`)
    ?? document.querySelector('input[name="imageSwapTheme"][value="landscape"]');
  themeRadio.checked = true;
  imageSwapOptions.disabled = !protectionSettings.imageSwapEnabled;
}

function updateLanguage(nextLanguage) {
  language = localizeDocument(normalizeLanguage(nextLanguage));
  languageSelect.value = language;
  renderCustomImages();
  chrome.storage.local.get({ filterSubscriptions: [] }).then((state) => {
    renderSubscriptions(state.filterSubscriptions);
  });
  heroStatus.textContent = contentBlockingToggle.checked ? t("protectionOn") : t("protectionOff");
}

async function saveProtection(partial, silent = false) {
  const result = await chrome.runtime.sendMessage({ kind: "setBrowserProtectionSettings", settings: partial });
  if (!result?.ok) {
    showToast("error");
    return false;
  }
  protectionSettings = result.settings;
  renderSettings();
  if (!silent) showToast("saved");
  return true;
}

function normalizedLines(value, limit) {
  return [...new Set(value.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("!")))]
    .slice(0, limit);
}

async function load() {
  const [settings, state, storage] = await Promise.all([
    chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" }),
    chrome.runtime.sendMessage({ kind: "getOptionsState" }),
    chrome.storage.local.get({
      uiPreferences: { language: null, theme: "system", activeSection: "general" },
      imageSwapCustomImages: [],
      filterSubscriptions: []
    })
  ]);
  protectionSettings = settings;
  uiPreferences = storage.uiPreferences;
  customImages = sanitizeCustomImages(storage.imageSwapCustomImages);
  language = uiPreferences.language || browserLanguage();
  contentBlockingToggle.checked = state.contentBlockingEnabled;
  monitoringToggle.checked = state.monitoringEnabled;
  updateLanguage(language);
  applyTheme(uiPreferences.theme);
  showSection(uiPreferences.activeSection || "general", false);
  renderSettings();
  renderSubscriptions(storage.filterSubscriptions);
  for (const key of ["allowlistedSites", "customBlockedDomains", "customCosmeticFilters", "customFilterListURLs"]) {
    document.querySelector(`#${key}`).value = (protectionSettings[key] ?? []).join("\n");
  }
}

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    if (input.dataset.setting === "imageSwapEnabled") imageSwapOptions.disabled = !input.checked;
    await saveProtection({ [input.dataset.setting]: input.checked });
  });
});

contentBlockingToggle.addEventListener("change", async () => {
  const result = await chrome.runtime.sendMessage({ kind: "setContentBlocking", enabled: contentBlockingToggle.checked });
  heroStatus.textContent = result.enabled ? t("protectionOn") : t("protectionOff");
  showToast("saved");
});

monitoringToggle.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({ kind: "setMonitoring", enabled: monitoringToggle.checked });
  showToast("saved");
});

languageSelect.addEventListener("change", async () => {
  await saveUIPreferences({ language: languageSelect.value });
  updateLanguage(languageSelect.value);
});

document.querySelectorAll("[data-theme-value]").forEach((button) => {
  button.addEventListener("click", async () => {
    await saveUIPreferences({ theme: button.dataset.themeValue });
    applyTheme(button.dataset.themeValue);
  });
});

document.querySelectorAll('input[name="imageSwapTheme"]').forEach((radio) => {
  radio.addEventListener("change", async () => {
    if (radio.value === "custom" && customImages.length === 0) imageFileInput.click();
    await saveProtection({ imageSwapTheme: radio.value });
  });
});

document.querySelector("#choose-images").addEventListener("click", () => imageFileInput.click());
imageFileInput.addEventListener("change", async () => {
  const files = [...imageFileInput.files].slice(0, MAX_CUSTOM_IMAGES);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length === 0
      || totalBytes > MAX_CUSTOM_IMAGES_TOTAL_BYTES
      || files.some((file) => file.size > MAX_CUSTOM_IMAGE_BYTES || !CUSTOM_IMAGE_TYPES.has(file.type))) {
    showToast("error");
    return;
  }
  customImages = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
  await chrome.storage.local.set({ imageSwapCustomImages: customImages });
  await saveProtection({ imageSwapTheme: "custom", imageSwapEnabled: true }, true);
  renderCustomImages();
  showToast("saved");
});

document.querySelector("#remove-images").addEventListener("click", async () => {
  customImages = [];
  await chrome.storage.local.set({ imageSwapCustomImages: [] });
  if (protectionSettings.imageSwapTheme === "custom") await saveProtection({ imageSwapTheme: "landscape" }, true);
  renderCustomImages();
  showToast("saved");
});

document.querySelector("#save-rules").addEventListener("click", async () => {
  const partial = {
    allowlistedSites: normalizedLines(document.querySelector("#allowlistedSites").value, 2_000),
    customBlockedDomains: normalizedLines(document.querySelector("#customBlockedDomains").value, 1_000),
    customCosmeticFilters: normalizedLines(document.querySelector("#customCosmeticFilters").value, 200),
    customFilterListURLs: normalizedLines(document.querySelector("#customFilterListURLs").value, 2),
    customFilterListRefreshRequestedAt: new Date().toISOString()
  };
  await saveProtection(partial);
  const storage = await chrome.storage.local.get({ filterSubscriptions: [] });
  renderSubscriptions(storage.filterSubscriptions);
});

document.querySelector("#update-lists").addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  try {
    await saveProtection({ customFilterListRefreshRequestedAt: new Date().toISOString() }, true);
    const storage = await chrome.storage.local.get({ filterSubscriptions: [] });
    renderSubscriptions(storage.filterSubscriptions);
    showToast("saved");
  } finally {
    event.currentTarget.disabled = false;
  }
});


document.querySelector("#export-settings").addEventListener("click", async () => {
  const granted = await chrome.permissions.request({ permissions: ["downloads"] }).catch(() => false);
  if (!granted) {
    showToast("permissionRequired");
    return;
  }
  const state = await chrome.runtime.sendMessage({ kind: "getOptionsState" });
  const settings = await chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" });
  const payload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    protectionSettings: settings,
    contentBlockingEnabled: state.contentBlockingEnabled,
    monitoringEnabled: state.monitoringEnabled,
    uiPreferences,
    imageSwapCustomImages: customImages
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  await chrome.downloads.download({ url, filename: "browser-monitor-settings.json", saveAs: true });
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  showToast("backupReady");
});

const settingsFileInput = document.querySelector("#settings-file-input");
document.querySelector("#import-settings").addEventListener("click", () => settingsFileInput.click());
settingsFileInput.addEventListener("change", async () => {
  try {
    const file = settingsFileInput.files[0];
    if (!file || file.size > 9_500_000) throw new Error("invalid");
    const payload = JSON.parse(await file.text());
    if (payload.schemaVersion !== 2 || typeof payload.protectionSettings !== "object") throw new Error("invalid");
    if (!confirm(t("importConfirm"))) return;
    const result = await chrome.runtime.sendMessage({ kind: "replaceOptionsSettings", payload });
    if (!result?.ok) throw new Error(result?.error ?? "invalid");
    await chrome.storage.local.set({
      uiPreferences: payload.uiPreferences ?? uiPreferences,
      imageSwapCustomImages: sanitizeCustomImages(payload.imageSwapCustomImages)
    });
    showToast("importReady");
    await load();
  } catch {
    showToast("invalidBackup");
  } finally {
    settingsFileInput.value = "";
  }
});

document.querySelector("#reset-settings").addEventListener("click", async () => {
  if (!confirm(t("resetConfirm"))) return;
  const result = await chrome.runtime.sendMessage({ kind: "resetOptionsSettings" });
  if (result?.ok) {
    await chrome.storage.local.set({ imageSwapCustomImages: [], uiPreferences: { language, theme: "system", activeSection: uiPreferences.activeSection || "general" } });
    showToast("saved");
    await load();
  } else {
    showToast("error");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.filterSubscriptions) renderSubscriptions(changes.filterSubscriptions.newValue ?? []);
});

load().catch(() => showToast("error"));
