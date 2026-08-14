import { parseURLParts } from "../link-safety.js";

const params = new URLSearchParams(location.search);
const destinationUrl = params.get("url") ?? "";
const destination = parseURLParts(destinationUrl);
const domain = destination?.registrableDomain || params.get("domain") || "unknown";
const action = params.get("action") ?? "warn";

const destinationDomain = document.querySelector("#destination-domain");
const destinationURL = document.querySelector("#destination-url");
const title = document.querySelector("#warning-title");
const summary = document.querySelector("#warning-summary");
const destinationLabel = document.querySelector(".domain-card dt");
const detailsSummary = document.querySelector(".details summary");
const urlLabel = document.querySelector(".details label");
const backButton = document.querySelector("#back-button");
const continueButton = document.querySelector("#continue-button");
const allowButton = document.querySelector("#allow-button");

const isRussian = (navigator.language || "").toLowerCase().startsWith("ru");
const copy = isRussian ? {
  pageTitle: "Browser Monitor — Подозрительный сайт",
  title: "Проверьте сайт перед переходом",
  blockedTitle: "Browser Monitor заблокировал этот сайт",
  summary: "Проверьте адрес перед переходом. Не вводите пароли, seed-фразы, платёжные данные или коды подтверждения на сайте, которому не доверяете.",
  blockedSummary: "Этот домен находится в вашем списке заблокированных сайтов. Вернитесь назад или явно добавьте домен в доверенные.",
  destination: "Вы переходите на",
  details: "Показать полный адрес",
  fullURL: "Полный адрес назначения",
  back: "Вернуться назад",
  continue: "Перейти один раз",
  allow: "Доверять домену и перейти",
  confirm: "Перейти на этот сайт один раз? Не вводите пароль, seed-фразу, код из SMS и не устанавливайте файлы, если не уверены в сайте.",
  allowError: "Не удалось добавить домен в доверенные."
} : {
  pageTitle: "Browser Monitor — Suspicious site",
  title: "Check this site before continuing",
  blockedTitle: "Browser Monitor blocked this site",
  summary: "Check the address before you continue. Do not enter passwords, recovery phrases, payment details, or verification codes on a site you do not trust.",
  blockedSummary: "This domain is on your blocked list. Go back, or explicitly trust this domain if you recognize it.",
  destination: "You are opening",
  details: "Show full address",
  fullURL: "Full destination URL",
  back: "Go back",
  continue: "Continue once",
  allow: "Trust this domain and continue",
  confirm: "Continue to this site once? Do not enter passwords, recovery phrases, verification codes, or install files unless you trust it.",
  allowError: "Could not trust this domain."
};

document.title = copy.pageTitle;
destinationDomain.textContent = domain;
destinationURL.value = destination?.href ?? destinationUrl;
title.textContent = copy.title;
summary.textContent = copy.summary;
destinationLabel.textContent = copy.destination;
detailsSummary.textContent = copy.details;
urlLabel.firstChild.textContent = `${copy.fullURL}\n`;
backButton.textContent = copy.back;
continueButton.textContent = copy.continue;
allowButton.textContent = copy.allow;
if (action === "block") {
  title.textContent = copy.blockedTitle;
  summary.textContent = copy.blockedSummary;
  continueButton.hidden = true;
}

function navigateToDestination() {
  if (destination?.href) location.href = destination.href;
}

backButton.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.href = "about:blank";
});

continueButton.addEventListener("click", () => {
  if (confirm(copy.confirm)) {
    navigateToDestination();
  }
});

allowButton.addEventListener("click", async () => {
  allowButton.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ kind: "allowLinkSafetyDomain", domain });
    if (!response?.ok) throw new Error(response?.error ?? "Could not allow this domain");
    navigateToDestination();
  } catch (error) {
    allowButton.disabled = false;
    alert(error?.message ?? copy.allowError);
  }
});
