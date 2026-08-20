import { browserLanguage, localizeDocument, normalizeLanguage, translate } from "../../core/localization.js";
import { withTimeout } from "../../core/async-utils.js";
import { DEFAULT_TRUSTED_DOMAINS } from "../../features/security/link-safety.js";

const languageSelect = document.querySelector("#language-select");
const contentBlockingToggle = document.querySelector("#contentBlockingEnabled");
const monitoringToggle = document.querySelector("#monitoringEnabled");
const imageSwapOptions = document.querySelector("#image-swap-options");
const imageFileInput = document.querySelector("#image-file-input");
const customImageCount = document.querySelector("#custom-image-count");
const subscriptionStatuses = document.querySelector("#subscription-statuses");
const toast = document.querySelector("#save-toast");

let language = "en";
let uiPreferences = { language: null, theme: "system", activeSection: "general" };
let protectionSettings = {};
let linkSafety = { settings: {}, allowedDomains: [], blockedDomains: [] };
let historyPrivacy = { enabled: false, domains: [] };
let featurePreferences = {};
let customImages = [];
let toastTimer = null;
const MAX_CUSTOM_IMAGES = 9;
const MAX_CUSTOM_IMAGE_BYTES = 1_048_576;
const MAX_CUSTOM_IMAGES_TOTAL_BYTES = 6 * 1_048_576;
const CUSTOM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"]);
const OPTIONS_REQUEST_TIMEOUT_MS = 3_000;

const t = (key, values) => translate(language, key, values);

function renderInterfaceIcons() {
  const paths = {
    protection: "M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z",
    activity: "M4 16h3l2-7 3 10 3-13 2 10h3",
    privacy: "M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6Z",
    appearance: "M12 3a9 9 0 1 0 9 9c0-1.7-1.3-3-3-3h-1.5a2 2 0 0 1-2-2V5.5A2.5 2.5 0 0 0 12 3Z",
    rules: "M5 6h14M8 12h8M10 18h4",
    data: "M5 5h14v14H5ZM8 9h8M8 13h6",
    feedback: "M5 5h14v11H10l-5 4V5Z",
    video: "M5 6h14v12H5Zm5 3 5 3-5 3Z",
    search: "m20 20-4.5-4.5M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
    generic: "M6 7h12M6 12h12M6 17h8"
  };
  const choose = (key) => {
    if (/protection|filter|blocking|crypto|safety|warning|adblock/i.test(key)) return "protection";
    if (/analysis|activity|eco/i.test(key)) return "activity";
    if (/privacy|history|cookie/i.test(key)) return "privacy";
    if (/appearance|theme|image/i.test(key)) return "appearance";
    if (/rule|subscription|custom/i.test(key)) return "rules";
    if (/data|backup|local|diagnostic/i.test(key)) return "data";
    if (/feedback/i.test(key)) return "feedback";
    if (/video|autoplay|sponsor|floating|watch/i.test(key)) return "video";
    if (/search|lookalike|punycode|redirect|social/i.test(key)) return "search";
    return "generic";
  };
  document.querySelectorAll(".nav-icon, .setting-icon, .info-symbol").forEach((holder) => {
    const key = holder.closest("[data-section-target]")?.dataset.sectionTarget
      ?? holder.parentElement?.querySelector("[data-i18n]")?.dataset.i18n
      ?? "generic";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[choose(key)]);
    svg.append(path);
    holder.replaceChildren(svg);
  });
}

function enhanceSettingControls() {
  document.querySelectorAll(".setting-card").forEach((card, index) => {
    const input = card.querySelector('input[type="checkbox"]');
    const heading = card.querySelector(".setting-copy h3");
    const description = card.querySelector(".setting-copy p");
    if (!input || !heading) return;

    const baseId = input.id || input.dataset.setting || input.dataset.linkSafetySetting || `setting-${index}`;
    const safeId = baseId.replace(/[^a-z0-9_-]/gi, "-");
    heading.id ||= `${safeId}-label`;
    input.setAttribute("aria-labelledby", heading.id);
    input.setAttribute("role", "switch");
    if (description) {
      description.id ||= `${safeId}-description`;
      input.setAttribute("aria-describedby", description.id);
    }
  });
}

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
  const sectionAliases = {
    filters: "protection",
    "page-elements": "protection",
    "link-safety": "privacy",
    "history-privacy": "privacy"
  };
  const available = [...document.querySelectorAll(".settings-panel")].map((panel) => panel.id);
  const mappedSection = sectionAliases[requestedSection] ?? requestedSection;
  const section = available.includes(mappedSection) ? mappedSection : "general";
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.hidden = panel.id !== section;
    panel.setAttribute("aria-labelledby", `${panel.id}-tab`);
  });
  document.querySelectorAll(".nav-tab").forEach((button) => {
    const selected = button.dataset.sectionTarget === section;
    button.id = `${button.dataset.sectionTarget}-tab`;
    button.setAttribute("aria-controls", button.dataset.sectionTarget);
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  if (persist) saveUIPreferences({ activeSection: section });
  window.scrollTo({ top: 0, behavior: "instant" });
}

const outerTabs = [...document.querySelectorAll(".nav-tab")];
outerTabs.forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.sectionTarget));
  button.addEventListener("keydown", (event) => {
    const current = outerTabs.indexOf(button);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? outerTabs.length - 1
      : event.key === "ArrowDown" || event.key === "ArrowRight" ? (current + 1) % outerTabs.length
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (current - 1 + outerTabs.length) % outerTabs.length
      : -1;
    if (next < 0) return;
    event.preventDefault();
    outerTabs[next].focus();
    showSection(outerTabs[next].dataset.sectionTarget);
  });
});

function activateSubsection(tab, focus = false) {
  const section = tab.closest(".settings-section");
  const target = tab.dataset.subsectionTab;
  section.querySelectorAll("[data-subsection-tab]").forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    if (selected && focus) candidate.focus();
  });
  section.querySelectorAll("[data-subsection-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.subsectionPanel !== target;
  });
}

document.querySelectorAll(".subsection-tabs").forEach((tablist) => {
  const tabs = [...tablist.querySelectorAll("[data-subsection-tab]")];
  tabs.forEach((tab, index) => {
    const panel = document.querySelector(`[data-subsection-panel="${CSS.escape(tab.dataset.subsectionTab)}"]`);
    tab.id = `${tab.dataset.subsectionTab}-tab`;
    tab.setAttribute("aria-controls", tab.dataset.subsectionTab);
    panel.id = tab.dataset.subsectionTab;
    panel.setAttribute("aria-labelledby", tab.id);
    tab.addEventListener("click", () => activateSubsection(tab));
    tab.addEventListener("keydown", (event) => {
      const next = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
        : event.key === "ArrowRight" ? (index + 1) % tabs.length
        : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
        : -1;
      if (next < 0) return;
      event.preventDefault();
      activateSubsection(tabs[next], true);
    });
  });
  activateSubsection(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0]);
});

document.querySelectorAll(".feature-node").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".feature-node").forEach((candidate) => {
      const selected = candidate === button;
      candidate.classList.toggle("active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll(".feature-detail").forEach((detail) => {
      detail.hidden = detail.id !== button.dataset.featureDetail;
    });
  });
});

document.querySelectorAll(".feature-branch").forEach((branch) => {
  branch.addEventListener("toggle", () => {
    if (!branch.open) return;
    document.querySelectorAll(".feature-branch").forEach((candidate) => {
      if (candidate !== branch) candidate.open = false;
    });
  });
});

document.querySelectorAll(".info-button").forEach((button) => {
  button.addEventListener("keydown", (event) => {
    if (event.key === "Escape") button.blur();
  });
});

enhanceSettingControls();
renderInterfaceIcons();

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
  document.querySelectorAll("[data-link-safety-setting]").forEach((input) => {
    input.checked = Boolean(linkSafety.settings?.[input.dataset.linkSafetySetting]);
  });
  document.querySelectorAll("[data-feature-setting]").forEach((input) => {
    input.checked = featurePreferences[input.dataset.featureSetting] !== false;
  });
  document.querySelector("#linkSafetyAllowedDomains").value = (linkSafety.allowedDomains ?? []).join("\n");
  document.querySelector("#linkSafetyBlockedDomains").value = (linkSafety.blockedDomains ?? []).join("\n");
  document.querySelector("#historyPrivacyEnabled").checked = historyPrivacy.enabled === true;
  document.querySelector("#historyPrivacyDomains").value = (historyPrivacy.domains ?? []).join("\n");
  const theme = protectionSettings.imageSwapTheme || "landscape";
  const themeRadio = document.querySelector(`input[name="imageSwapTheme"][value="${CSS.escape(theme)}"]`)
    ?? document.querySelector('input[name="imageSwapTheme"][value="landscape"]');
  themeRadio.checked = true;
  imageSwapOptions.disabled = !protectionSettings.imageSwapEnabled;
}

function updateLanguage(nextLanguage, { refreshSubscriptions = true } = {}) {
  language = localizeDocument(normalizeLanguage(nextLanguage));
  languageSelect.value = language;
  document.querySelector("#built-in-trusted-domains").textContent = t("builtInTrustedDomains", {
    count: DEFAULT_TRUSTED_DOMAINS.length
  });
  renderCustomImages();
  if (!refreshSubscriptions || !globalThis.chrome?.storage?.local?.get) return;
  chrome.storage.local.get({ filterSubscriptions: [] }).then((state) => {
    renderSubscriptions(state.filterSubscriptions);
  });
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

async function saveLinkSafety(partial = {}, silent = false) {
  const result = await chrome.runtime.sendMessage({
    kind: "setLinkSafetySettings",
    settings: partial.settings,
    allowedDomains: partial.allowedDomains,
    blockedDomains: partial.blockedDomains
  });
  if (!result?.ok) {
    showToast("error");
    return false;
  }
  linkSafety = {
    settings: result.settings,
    allowedDomains: result.allowedDomains,
    blockedDomains: result.blockedDomains
  };
  renderSettings();
  if (!silent) showToast("saved");
  return true;
}

async function ensureHistoryPermission() {
  if (await chrome.permissions.contains({ permissions: ["history"] }).catch(() => false)) return true;
  if (!confirm(t("historyPermissionPrompt"))) return false;
  return chrome.permissions.request({ permissions: ["history"] }).catch(() => false);
}

async function saveHistoryPrivacy(partial = {}, silent = false) {
  if (partial.enabled === true && !await ensureHistoryPermission()) {
    showToast("permissionRequired");
    return false;
  }
  const result = await chrome.runtime.sendMessage({
    kind: "setHistoryPrivacySettings",
    settings: {
      ...historyPrivacy,
      ...partial
    }
  });
  if (!result?.ok) {
    showToast("error");
    return false;
  }
  historyPrivacy = result.settings;
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

function validateCosmeticFilters(lines) {
  const invalid = [];
  lines.forEach((line, index) => {
    const selector = line.includes("##") ? line.slice(line.indexOf("##") + 2) : line;
    try {
      if (!selector || !CSS.supports(`selector(${selector})`)) invalid.push(index + 1);
    } catch { invalid.push(index + 1); }
  });
  return invalid;
}

async function load() {
  const storage = await withTimeout(chrome.storage.local.get({
      uiPreferences: { language: null, theme: "system", activeSection: "general" },
      imageSwapCustomImages: [],
      filterSubscriptions: []
    }), OPTIONS_REQUEST_TIMEOUT_MS, "Settings preferences");
  uiPreferences = storage.uiPreferences;
  customImages = sanitizeCustomImages(storage.imageSwapCustomImages);
  language = uiPreferences.language || browserLanguage();
  updateLanguage(language);
  applyTheme(uiPreferences.theme);
  showSection(uiPreferences.activeSection || "general", false);
  renderSubscriptions(storage.filterSubscriptions);

  const [settings, state, preferencesState] = await Promise.all([
    withTimeout(chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" }), OPTIONS_REQUEST_TIMEOUT_MS, "Protection settings"),
    withTimeout(chrome.runtime.sendMessage({ kind: "getOptionsState" }), OPTIONS_REQUEST_TIMEOUT_MS, "Options state"),
    withTimeout(chrome.runtime.sendMessage({ kind: "getFeaturePreferences" }), OPTIONS_REQUEST_TIMEOUT_MS, "Feature preferences")
  ]);
  protectionSettings = settings;
  linkSafety = state.linkSafety ?? { settings: {}, allowedDomains: [], blockedDomains: [] };
  historyPrivacy = state.historyPrivacy ?? { enabled: false, domains: [] };
  featurePreferences = preferencesState.preferences ?? {};
  contentBlockingToggle.checked = state.contentBlockingEnabled;
  monitoringToggle.checked = state.monitoringEnabled;
  renderSettings();
  for (const key of ["allowlistedSites", "customBlockedDomains", "customCosmeticFilters", "customFilterListURLs"]) {
    document.querySelector(`#${key}`).value = (protectionSettings[key] ?? []).join("\n");
  }
  document.querySelector("#activity-retention").value = String(featurePreferences.activityRetentionDays ?? 90);
  document.querySelector("#activity-reference-hours").value = String(featurePreferences.activityReferenceHours ?? 8);
  document.querySelector("#activity-exclusions").value = (featurePreferences.activityExcludedSites ?? []).join("\n");
  document.querySelector("#eco-default-level").value = featurePreferences.ecoDefaultLevel ?? "limit";
  document.querySelector("#continue-retention").value = String(featurePreferences.continueWatchingRetentionDays ?? 90);
  document.querySelector("#blocking-journal-enabled").checked = featurePreferences.blockingJournalEnabled === true;
  document.querySelector("#tracking-cleaner-enabled").checked = featurePreferences.trackingCleanerEnabled !== false;
}

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    if (input.dataset.setting === "imageSwapEnabled") imageSwapOptions.disabled = !input.checked;
    await saveProtection({ [input.dataset.setting]: input.checked });
  });
});

document.querySelectorAll("[data-link-safety-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    await saveLinkSafety({ settings: { [input.dataset.linkSafetySetting]: input.checked } });
  });
});

document.querySelectorAll("[data-feature-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    const result = await chrome.runtime.sendMessage({
      kind: "setFeaturePreferences",
      preferences: { [input.dataset.featureSetting]: input.checked }
    });
    if (result?.ok) {
      featurePreferences = result.preferences;
      renderSettings();
      showToast("saved");
    } else {
      input.checked = !input.checked;
      showToast("error");
    }
  });
});

contentBlockingToggle.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({ kind: "setContentBlocking", enabled: contentBlockingToggle.checked });
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
  const cosmeticFilters = normalizedLines(document.querySelector("#customCosmeticFilters").value, 200);
  const invalid = validateCosmeticFilters(cosmeticFilters);
  if (invalid.length) {
    toast.textContent = t("invalidCosmeticRules", { lines: invalid.join(", ") });
    toast.classList.add("visible");
    return;
  }
  const partial = {
    allowlistedSites: normalizedLines(document.querySelector("#allowlistedSites").value, 2_000),
    customBlockedDomains: normalizedLines(document.querySelector("#customBlockedDomains").value, 1_000),
    customCosmeticFilters: cosmeticFilters,
    customFilterListURLs: normalizedLines(document.querySelector("#customFilterListURLs").value, 2),
    customFilterListRefreshRequestedAt: new Date().toISOString()
  };
  await saveProtection(partial);
  const storage = await chrome.storage.local.get({ filterSubscriptions: [] });
  renderSubscriptions(storage.filterSubscriptions);
});

document.querySelector("#save-feature-preferences").addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({
    kind: "setFeaturePreferences",
    preferences: {
      activityRetentionDays: Number(document.querySelector("#activity-retention").value),
      activityReferenceHours: Number(document.querySelector("#activity-reference-hours").value),
      activityExcludedSites: normalizedLines(document.querySelector("#activity-exclusions").value, 500),
      ecoDefaultLevel: document.querySelector("#eco-default-level").value,
      continueWatchingRetentionDays: Number(document.querySelector("#continue-retention").value),
      blockingJournalEnabled: document.querySelector("#blocking-journal-enabled").checked,
      trackingCleanerEnabled: document.querySelector("#tracking-cleaner-enabled").checked
    }
  });
  if (result?.ok) { featurePreferences = result.preferences; showToast("saved"); }
  else showToast("error");
});

const domainListsDialog = document.querySelector("#domain-lists-dialog");
let domainListsInvoker = null;

function openDomainListsDialog(focusTarget) {
  domainListsInvoker = document.activeElement;
  domainListsDialog.showModal();
  requestAnimationFrame(() => document.querySelector(focusTarget)?.focus());
}

document.querySelector("#open-allowed-domains").addEventListener("click", () => openDomainListsDialog("#linkSafetyAllowedDomains"));
document.querySelector("#open-blocked-domains").addEventListener("click", () => openDomainListsDialog("#linkSafetyBlockedDomains"));
document.querySelector("#close-domain-lists").addEventListener("click", () => domainListsDialog.close());
document.querySelector("#cancel-domain-lists").addEventListener("click", () => domainListsDialog.close());
domainListsDialog.addEventListener("close", () => domainListsInvoker?.focus());
domainListsDialog.addEventListener("click", (event) => {
  if (event.target === domainListsDialog) domainListsDialog.close();
});

document.querySelector("#save-link-safety").addEventListener("click", async () => {
  const saved = await saveLinkSafety({
    allowedDomains: normalizedLines(document.querySelector("#linkSafetyAllowedDomains").value, 500),
    blockedDomains: normalizedLines(document.querySelector("#linkSafetyBlockedDomains").value, 500)
  });
  if (saved) domainListsDialog.close();
});

document.querySelector("#historyPrivacyEnabled").addEventListener("change", async (event) => {
  await saveHistoryPrivacy({ enabled: event.currentTarget.checked });
});

document.querySelector("#save-history-privacy").addEventListener("click", async () => {
  await saveHistoryPrivacy({
    domains: normalizedLines(document.querySelector("#historyPrivacyDomains").value, 500)
  });
});

document.querySelector("#purge-history-privacy").addEventListener("click", async (event) => {
  if (!await ensureHistoryPermission()) {
    showToast("permissionRequired");
    return;
  }
  event.currentTarget.disabled = true;
  try {
    await saveHistoryPrivacy({
      enabled: true,
      domains: normalizedLines(document.querySelector("#historyPrivacyDomains").value, 500)
    }, true);
    const result = await chrome.runtime.sendMessage({ kind: "purgeHistoryPrivacyDomains" });
    showToast(result?.permissionRequired ? "permissionRequired" : "saved");
  } finally {
    event.currentTarget.disabled = false;
  }
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
  const hasDownloads = await chrome.permissions.contains({ permissions: ["downloads"] }).catch(() => false);
  if (!hasDownloads && !confirm(t("settingsDownloadPermissionPrompt"))) {
    showToast("permissionCancelled");
    return;
  }
  const granted = hasDownloads || await chrome.permissions.request({ permissions: ["downloads"] }).catch(() => false);
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
    linkSafety: state.linkSafety,
    historyPrivacy: state.historyPrivacy,
    contentBlockingEnabled: state.contentBlockingEnabled,
    monitoringEnabled: state.monitoringEnabled,
    uiPreferences,
    imageSwapCustomImages: customImages
    ,featurePreferences
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  await chrome.downloads.download({ url, filename: "browser-monitor-settings.json", saveAs: true });
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  showToast("backupReady");
});

document.querySelector("#export-diagnostics").addEventListener("click", async () => {
  const hasDownloads = await chrome.permissions.contains({ permissions: ["downloads"] }).catch(() => false);
  if (!hasDownloads && !confirm(t("settingsDownloadPermissionPrompt"))) return;
  if (!hasDownloads && !await chrome.permissions.request({ permissions: ["downloads"] }).catch(() => false)) return;
  const [state, settings, preferences, permissions, dynamicRules, sessionRules, storage] = await Promise.all([
    chrome.runtime.sendMessage({ kind: "getOptionsState" }),
    chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" }),
    chrome.runtime.sendMessage({ kind: "getFeaturePreferences" }),
    chrome.permissions.getAll(),
    chrome.declarativeNetRequest.getDynamicRules(),
    chrome.declarativeNetRequest.getSessionRules(),
    chrome.storage.local.get({ filterSubscriptions: [], latestSnapshot: null, pendingSiteResets: [], blockingRequestJournal: [] })
  ]);
  const safeSettings = { ...settings };
  delete safeSettings.customCosmeticFilters;
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    extension: { version: chrome.runtime.getManifest().version, manifestVersion: chrome.runtime.getManifest().manifest_version, minimumChromeVersion: chrome.runtime.getManifest().minimum_chrome_version },
    settings: safeSettings,
    featurePreferences: preferences.preferences,
    protection: { contentBlockingEnabled: state.contentBlockingEnabled, monitoringEnabled: state.monitoringEnabled, allowlistedSiteCount: state.allowlistedSites?.length ?? 0 },
    rules: { dynamic: dynamicRules.length, session: sessionRules.length, subscriptions: storage.filterSubscriptions.map((entry) => {
      let source = "custom source";
      try { source = new URL(entry.url).hostname; } catch {}
      return { source, updatedAt: entry.updatedAt, networkRuleCount: entry.networkRuleCount, cosmeticRuleCount: entry.cosmeticRuleCount, error: entry.error ?? null };
    }) },
    permissions,
    runtime: { latestSnapshotError: storage.latestSnapshot?.error ?? null, pendingSiteResetCount: storage.pendingSiteResets.length, blockingJournalEntries: storage.blockingRequestJournal.length }
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  await chrome.downloads.download({ url, filename: `browser-monitor-diagnostics-${Date.now()}.json`, saveAs: true });
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
      imageSwapCustomImages: sanitizeCustomImages(payload.imageSwapCustomImages),
      featurePreferences: payload.featurePreferences ?? featurePreferences
    });
    showToast("importReady");
    await load();
  } catch {
    showToast("invalidBackup");
  } finally {
    settingsFileInput.value = "";
  }
});

document.querySelector("#open-feedback").addEventListener("click", async () => {
  const url = chrome.runtime.getURL("features/feedback/feedback.html");
  const existing = (await chrome.tabs.query({})).find((tab) => {
    try {
      const current = new URL(tab.url);
      const target = new URL(url);
      return current.origin === target.origin && current.pathname === target.pathname;
    } catch {
      return false;
    }
  });
  if (!existing?.id) {
    await chrome.tabs.create({ url, active: true });
    return;
  }
  await chrome.tabs.update(existing.id, { url, active: true });
  if (typeof existing.windowId === "number") {
    await chrome.windows.update(existing.windowId, { focused: true }).catch(() => null);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.filterSubscriptions) renderSubscriptions(changes.filterSubscriptions.newValue ?? []);
});

updateLanguage(browserLanguage(), { refreshSubscriptions: false });
load().catch(() => showToast("error"));
