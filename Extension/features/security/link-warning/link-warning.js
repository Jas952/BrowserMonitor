import { parseURLParts } from "../link-safety.js";

const params = new URLSearchParams(location.search);
const destinationUrl = params.get("url") ?? "";
const destination = parseURLParts(destinationUrl);
const trustedHost = destination?.hostname || params.get("domain") || "unknown";
const registrableDomain = destination?.registrableDomain || params.get("domain") || trustedHost;
const action = params.get("action") ?? "warn";
const removed = params.getAll("removed");
const { uiPreferences } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" } });

const $ = (selector) => document.querySelector(selector);
const title = $("#warning-title");
const summary = $("#warning-summary");
const backButton = $("#back-button");
const continueButton = $("#continue-button");
const allowButton = $("#allow-button");
const moreButton = $("#more-button");
const moreMenu = $("#more-menu");
const blockButton = $("#block-button");
const copyCleanButton = $("#copy-clean-button");

const language = uiPreferences.language || navigator.language || "en";
const isRussian = language.toLowerCase().startsWith("ru");
const copy = isRussian ? {
  pageTitle: "Browser Monitor — Проверка адреса",
  title: "Проверьте адрес",
  blockedTitle: "Сайт заблокирован",
  summary: "Browser Monitor заметил признак риска. Убедитесь, что это ожидаемый адрес.",
  blockedSummary: "Этот домен находится в вашем списке заблокированных.",
  destination: "Открывается",
  mainDomain: "Основной домен: {domain}",
  fullAddress: "Полный адрес",
  back: "Назад",
  continue: "Продолжить один раз",
  allow: "Доверять и перейти",
  more: "Другие действия",
  block: "Заблокировать домен",
  copyClean: "Копировать чистую ссылку",
  copied: "Скопировано",
  cleaned: (names) => `Удалены параметры отслеживания: ${names}.`,
  allowError: "Не удалось добавить адрес в доверенные."
} : {
  pageTitle: "Browser Monitor — Check address",
  title: "Check the address",
  blockedTitle: "Site blocked",
  summary: "Browser Monitor found a risk signal. Make sure this is the destination you expect.",
  blockedSummary: "This domain is on your blocked list.",
  destination: "Opening",
  mainDomain: "Main domain: {domain}",
  fullAddress: "Full address",
  back: "Go back",
  continue: "Continue once",
  allow: "Trust and continue",
  more: "More actions",
  block: "Block domain",
  copyClean: "Copy clean link",
  copied: "Copied",
  cleaned: (names) => `Removed tracking parameters: ${names}.`,
  allowError: "Could not add this address to trusted sites."
};

document.documentElement.lang = isRussian ? "ru" : "en";
document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
document.title = copy.pageTitle;
title.textContent = action === "block" ? copy.blockedTitle : copy.title;
summary.textContent = action === "block" ? copy.blockedSummary : copy.summary;
$("#destination-label").textContent = copy.destination;
$("#destination-domain").textContent = trustedHost;
$("#registrable-summary").textContent = trustedHost === registrableDomain
  ? ""
  : copy.mainDomain.replace("{domain}", registrableDomain);
$("#full-address-label").textContent = copy.fullAddress;
$("#destination-url").textContent = destination?.href ?? destinationUrl;
backButton.textContent = copy.back;
continueButton.textContent = copy.continue;
allowButton.textContent = copy.allow;
moreButton.setAttribute("aria-label", copy.more);
blockButton.textContent = copy.block;
copyCleanButton.textContent = copy.copyClean;

if (removed.length) {
  $("#cleaned-parameters").hidden = false;
  $("#cleaned-parameters").textContent = copy.cleaned(removed.join(", "));
}
if (action === "block") continueButton.hidden = true;

function navigateToDestination() {
  if (destination?.href) location.href = destination.href;
}

function closeMenu({ restoreFocus = false } = {}) {
  moreMenu.hidden = true;
  moreButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) moreButton.focus();
}

function openMenu() {
  moreMenu.hidden = false;
  moreButton.setAttribute("aria-expanded", "true");
  moreMenu.querySelector('[role="menuitem"]')?.focus();
}

backButton.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.href = "about:blank";
});
continueButton.addEventListener("click", navigateToDestination);

allowButton.addEventListener("click", async () => {
  allowButton.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ kind: "allowLinkSafetyDomain", domain: trustedHost });
    if (!response?.ok) throw new Error(response?.error ?? copy.allowError);
    navigateToDestination();
  } catch (error) {
    allowButton.disabled = false;
    alert(error?.message ?? copy.allowError);
  }
});

moreButton.addEventListener("click", () => {
  if (moreMenu.hidden) openMenu();
  else closeMenu({ restoreFocus: true });
});

blockButton.addEventListener("click", async () => {
  blockButton.disabled = true;
  const response = await chrome.runtime.sendMessage({ kind: "blockLinkSafetyDomain", domain: registrableDomain }).catch(() => ({ ok: false }));
  if (response?.ok) location.href = "about:blank";
  else blockButton.disabled = false;
});

copyCleanButton.addEventListener("click", async () => {
  const hasPermission = await chrome.permissions.contains({ permissions: ["clipboardWrite"] }).catch(() => false);
  const prompt = isRussian
    ? "Разрешить Browser Monitor скопировать очищенную ссылку в буфер обмена?"
    : "Allow Browser Monitor to copy the cleaned link to your clipboard?";
  if (!hasPermission && !confirm(prompt)) return;
  const granted = hasPermission || await chrome.permissions.request({ permissions: ["clipboardWrite"] }).catch(() => false);
  if (!granted) return;
  await navigator.clipboard.writeText(destination?.href ?? destinationUrl);
  copyCleanButton.textContent = copy.copied;
});

document.addEventListener("pointerdown", (event) => {
  if (!moreMenu.hidden && !event.target.closest(".more-actions")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !moreMenu.hidden) {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }
  if (!["ArrowDown", "ArrowUp"].includes(event.key) || moreMenu.hidden) return;
  event.preventDefault();
  const items = [...moreMenu.querySelectorAll('[role="menuitem"]')];
  const current = items.indexOf(document.activeElement);
  const change = event.key === "ArrowDown" ? 1 : -1;
  items[(current + change + items.length) % items.length]?.focus();
});
