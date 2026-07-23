import { parseURLParts } from "./link-safety.js";

const params = new URLSearchParams(location.search);
const destinationUrl = params.get("url") ?? "";
const destination = parseURLParts(destinationUrl);
const source = parseURLParts(params.get("source") ?? "");
const domain = destination?.registrableDomain || params.get("domain") || "unknown";
const reasons = params.getAll("reason").filter(Boolean);
const action = params.get("action") ?? "warn";

const destinationDomain = document.querySelector("#destination-domain");
const sourceDomain = document.querySelector("#source-domain");
const destinationURL = document.querySelector("#destination-url");
const reasonList = document.querySelector("#reason-list");
const risk = document.querySelector("#warning-risk");
const backButton = document.querySelector("#back-button");
const continueButton = document.querySelector("#continue-button");
const allowButton = document.querySelector("#allow-button");

destinationDomain.textContent = domain;
sourceDomain.textContent = source?.registrableDomain ?? "current page";
destinationURL.value = destination?.href ?? destinationUrl;
risk.textContent = `${params.get("risk") || "Suspicious"} link`;
if (action === "block") {
  risk.textContent = "Blocked site";
  document.querySelector("#warning-title").textContent = "Browser Monitor blocked this site";
  document.querySelector(".summary").textContent = "This domain is on your blocked list. You can go back, or explicitly allow this domain if you trust it.";
  continueButton.hidden = true;
}

reasonList.replaceChildren(...(reasons.length ? reasons : ["This destination has suspicious link signals."]).map((reason) => {
  const item = document.createElement("li");
  item.textContent = reason;
  return item;
}));

function navigateToDestination() {
  if (destination?.href) location.href = destination.href;
}

backButton.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.href = "about:blank";
});

continueButton.addEventListener("click", () => {
  if (confirm("Последняя проверка перед переходом :) Если сайт просит пароль, seed phrase, код из SMS или установить файл, лучше закройте страницу.")) {
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
    alert(error?.message ?? "Could not allow this domain.");
  }
});
