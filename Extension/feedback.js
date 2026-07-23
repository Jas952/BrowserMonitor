const $ = (selector) => document.querySelector(selector);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const REPOSITORY_ISSUES_URL = "https://github.com/Jas952/BrowserMonitor/issues/new";
const MAX_OUTBOX_BYTES = 6 * 1024 * 1024;
let language = "en";
let attachment = null;
const query = new URLSearchParams(location.search);
const requestedType = ["feature", "bug", "site"].includes(query.get("type")) ? query.get("type") : "feature";
const reportedURL = (() => {
  try {
    const url = new URL(query.get("url") ?? "");
    return /^https?:$/.test(url.protocol) ? url.href.slice(0, 2_000) : "";
  } catch {
    return "";
  }
})();
const reportedTitle = String(query.get("title") ?? "").trim().slice(0, 300);
const COPY = {
  en: {
    title:"Send feedback",subtitle:"Suggest a tool or report a problem",feature:"New tool",bug:"Problem",site:"Site filters",email:"Your email",
    message:"Describe your request",attachment:"Screenshot",attachmentDetail:"PNG, JPEG or WebP up to 2 MB. It stays local until you attach it in GitHub.",
    choose:"Choose image",remove:"Remove attachment",note:"Sending opens a pre-filled GitHub issue. Nothing is sent silently; you review and submit it there.",
    send:"Continue to send",required:"Enter a valid email and describe the request.",imageError:"Choose a PNG, JPEG or WebP image up to 2 MB.",
    prepared:"Request prepared and GitHub opened. Attach the selected screenshot there, then submit the issue.",featureTitle:"Tool request",bugTitle:"Bug report",siteTitle:"Site filter report",
    emailNote:"This email is included in the GitHub issue and may be public.",
    siteTemplate:(url, title) => `Site: ${url}\nPage title: ${title || "Not available"}\n\nWhat is not working:\n`
  },
  ru: {
    title:"Отправить запрос",subtitle:"Предложить инструмент или сообщить об ошибке",feature:"Новый инструмент",bug:"Ошибка",site:"Фильтры сайта",email:"Ваша почта",
    message:"Опишите запрос",attachment:"Скриншот",attachmentDetail:"PNG, JPEG или WebP до 2 МБ. Файл остаётся локально, пока вы не прикрепите его в GitHub.",
    choose:"Выбрать изображение",remove:"Удалить вложение",note:"Отправка откроет заполненный запрос GitHub. Ничего не отправляется скрытно: вы проверяете и подтверждаете запрос там.",
    send:"Перейти к отправке",required:"Укажите корректную почту и опишите запрос.",imageError:"Выберите PNG, JPEG или WebP до 2 МБ.",
    prepared:"Запрос подготовлен и открыт в GitHub. Прикрепите выбранный скриншот и подтвердите создание запроса.",featureTitle:"Запрос инструмента",bugTitle:"Сообщение об ошибке",siteTitle:"Проблема фильтров сайта",
    emailNote:"Почта попадёт в GitHub Issue и может быть видна публично.",
    siteTemplate:(url, title) => `Сайт: ${url}\nНазвание страницы: ${title || "Недоступно"}\n\nЧто не работает:\n`
  }
};
const c = () => COPY[language];

function applyLanguage() {
  const copy = c();
  document.documentElement.lang = language;
  document.title = `Browser Monitor — ${copy.title}`;
  $("#feedback-title").textContent=copy.title; $("#feedback-subtitle").textContent=copy.subtitle;
  $("#feature-type").textContent=copy.feature; $("#bug-type").textContent=copy.bug; $("#site-type").textContent=copy.site; $("#email-label").textContent=copy.email; $("#email-note").textContent=copy.emailNote;
  $("#message-label").textContent=copy.message; $("#attachment-title").textContent=copy.attachment; $("#attachment-detail").textContent=copy.attachmentDetail;
  $("#choose-feedback-image").textContent=copy.choose; $(".attachment-preview button").ariaLabel=copy.remove;
  $("#delivery-note").textContent=copy.note; $("#send-feedback").textContent=copy.send;
}

function setStatus(text, type="") {
  $("#feedback-status").textContent = text;
  $("#feedback-status").className = `status ${type}`.trim();
}

function readDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compactOutbox(entries) {
  const result = [];
  let bytes = 0;
  for (const entry of entries.slice(0, 20)) {
    const nextBytes = new TextEncoder().encode(JSON.stringify(entry)).byteLength;
    if (bytes + nextBytes > MAX_OUTBOX_BYTES) continue;
    result.push(entry);
    bytes += nextBytes;
  }
  return result;
}

async function siteDiagnostics() {
  if (!reportedURL) return null;
  const [blocking, settings] = await Promise.all([
    chrome.runtime.sendMessage({ kind: "getContentBlockingState", url: reportedURL }).catch(() => ({})),
    chrome.runtime.sendMessage({ kind: "getBrowserProtectionSettings" }).catch(() => ({}))
  ]);
  const filterKeys = [
    "adFilterEnabled", "privacyFilterEnabled", "cosmeticFilteringEnabled",
    "regionalRussianFilteringEnabled", "videoAdProtectionEnabled",
    "antiAdblockMessageBlockingEnabled", "cookieBannerBlockingEnabled"
  ];
  return {
    protectionEnabled: blocking.enabled !== false,
    allowlisted: blocking.siteAllowlisted === true,
    temporarilyPaused: Boolean(blocking.sitePausedUntil),
    filters: Object.fromEntries(filterKeys.map((key) => [key, settings[key] === true]))
  };
}

$("#feedback-message").addEventListener("input", () => {
  $("#message-limit").textContent = `${$("#feedback-message").value.length} / 5000`;
});
$("#choose-feedback-image").addEventListener("click", () => $("#feedback-image").click());
$("#feedback-image").addEventListener("change", async () => {
  const file = $("#feedback-image").files[0];
  if (!file || file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.has(file.type)) {
    attachment = null;
    setStatus(c().imageError, "error");
    return;
  }
  attachment = { name: file.name, type: file.type, size: file.size, dataURL: await readDataURL(file) };
  $(".attachment-preview img").src = attachment.dataURL;
  $(".attachment-preview span").textContent = attachment.name;
  $(".attachment-preview").hidden = false;
  setStatus("");
});
$(".attachment-preview button").addEventListener("click", () => {
  attachment = null;
  $("#feedback-image").value = "";
  $(".attachment-preview").hidden = true;
});

$("#send-feedback").addEventListener("click", async () => {
  const email = $("#feedback-email").value.trim();
  const message = $("#feedback-message").value.trim();
  const type = document.querySelector('input[name="feedback-type"]:checked').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    setStatus(c().required, "error");
    return;
  }
  $("#send-feedback").disabled = true;
  const diagnostics = type === "site" ? await siteDiagnostics() : null;
  const request = { id: crypto.randomUUID(), type, email, message, reportedURL, diagnostics, attachment, createdAt: new Date().toISOString(), status: "prepared" };
  const { feedbackOutbox = [] } = await chrome.storage.local.get({ feedbackOutbox: [] });
  await chrome.storage.local.set({ feedbackEmail: email, feedbackOutbox: compactOutbox([request, ...feedbackOutbox]) });
  const hostname = reportedURL ? new URL(reportedURL).hostname : "";
  const titlePrefix = type === "site" ? c().siteTitle : type === "bug" ? c().bugTitle : c().featureTitle;
  const title = `${titlePrefix}: ${type === "site" ? hostname : message.split("\n")[0].slice(0, 80)}`;
  const diagnosticsLines = diagnostics ? [
    "", "Site diagnostics:",
    `URL: ${reportedURL}`,
    `Protection enabled: ${diagnostics.protectionEnabled}`,
    `Allowlisted: ${diagnostics.allowlisted}`,
    `Temporarily paused: ${diagnostics.temporarilyPaused}`,
    ...Object.entries(diagnostics.filters).map(([key, enabled]) => `${key}: ${enabled}`)
  ] : [];
  const body = [`Email: ${email}`, "", message, ...diagnosticsLines, "", attachment ? `Screenshot selected locally: ${attachment.name} (attach it to this issue)` : "Screenshot: none", "", `Browser Monitor ${chrome.runtime.getManifest().version}`].join("\n");
  const url = `${REPOSITORY_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  await chrome.tabs.create({ url });
  request.status = "opened";
  await chrome.storage.local.set({ feedbackOutbox: compactOutbox([request, ...feedbackOutbox]) });
  setStatus(c().prepared, "success");
  $("#send-feedback").disabled = false;
});

const { uiPreferences, feedbackEmail } = await chrome.storage.local.get({ uiPreferences: { language: null, theme: "system" }, feedbackEmail: "" });
language = uiPreferences.language === "ru" ? "ru" : "en";
document.documentElement.dataset.theme = uiPreferences.theme === "system" ? "" : uiPreferences.theme;
applyLanguage();
document.querySelector(`input[name="feedback-type"][value="${requestedType}"]`).checked = true;
$("#feedback-email").value = feedbackEmail;
if (requestedType === "site" && reportedURL) {
  $("#feedback-message").value = c().siteTemplate(reportedURL, reportedTitle);
  $("#message-limit").textContent = `${$("#feedback-message").value.length} / 5000`;
  $("#feedback-message").focus();
  $("#feedback-message").setSelectionRange($("#feedback-message").value.length, $("#feedback-message").value.length);
}
