const CATEGORY_DEFINITIONS = {
  work: {
    color: "blue",
    titles: { en: "Work", ru: "Работа" },
    domains: ["github.com", "gitlab.com", "bitbucket.org", "notion.so", "figma.com", "canva.com", "linear.app", "atlassian.net", "trello.com", "asana.com", "clickup.com", "docs.google.com", "drive.google.com", "chatgpt.com", "claude.ai"]
  },
  communication: {
    color: "cyan",
    titles: { en: "Communication", ru: "Общение" },
    domains: ["mail.google.com", "outlook.live.com", "outlook.office.com", "slack.com", "discord.com", "web.whatsapp.com", "web.telegram.org", "messages.google.com", "teams.microsoft.com", "zoom.us"]
  },
  social: {
    color: "purple",
    titles: { en: "Social", ru: "Соцсети" },
    domains: ["x.com", "twitter.com", "facebook.com", "instagram.com", "linkedin.com", "reddit.com", "vk.com", "ok.ru", "threads.net", "pinterest.com"]
  },
  video: {
    color: "red",
    titles: { en: "Video", ru: "Видео" },
    domains: ["youtube.com", "youtu.be", "rutube.ru", "vimeo.com", "dailymotion.com", "twitch.tv", "kick.com"]
  },
  shopping: {
    color: "orange",
    titles: { en: "Shopping", ru: "Покупки" },
    domains: ["amazon.com", "ebay.com", "aliexpress.com", "ozon.ru", "wildberries.ru", "market.yandex.ru", "avito.ru", "etsy.com"]
  },
  finance: {
    color: "green",
    titles: { en: "Finance", ru: "Финансы" },
    domains: ["tradingview.com", "investing.com", "binance.com", "coinbase.com", "wise.com", "paypal.com", "revolut.com", "tinkoff.ru", "tbank.ru"]
  },
  reading: {
    color: "yellow",
    titles: { en: "Reading", ru: "Чтение" },
    domains: ["wikipedia.org", "medium.com", "substack.com", "habr.com", "news.ycombinator.com", "bbc.com", "reuters.com", "nytimes.com", "theguardian.com"]
  },
  other: {
    color: "grey",
    titles: { en: "Other", ru: "Другое" },
    domains: []
  }
};

function matchesDomain(hostname, candidate) {
  return hostname === candidate || hostname.endsWith(`.${candidate}`);
}

export function classifyTab(tab) {
  let hostname = "";
  try {
    const url = new URL(tab?.url || tab?.pendingUrl || "");
    if (!/^https?:$/.test(url.protocol)) return null;
    hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    if (category === "other") continue;
    if (definition.domains.some((domain) => matchesDomain(hostname, domain))) return category;
  }
  return "other";
}

export function visibleTabGroupKey(tab) {
  const groupId = Number(tab?.groupId);
  const windowId = Number(tab?.windowId);
  const title = String(tab?.groupTitle || "").trim();
  if (!Number.isInteger(groupId) || groupId < 0 || !Number.isInteger(windowId) || !title) return null;
  return `${windowId}:${groupId}`;
}

export function planTabGroups(tabs, { language = "en" } = {}) {
  const normalizedLanguage = language === "ru" ? "ru" : "en";
  const groups = new Map();
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    if (!Number.isInteger(tab?.id) || tab.pinned) continue;
    const category = classifyTab(tab);
    if (!category) continue;
    const windowId = Number(tab.windowId);
    if (!Number.isInteger(windowId)) continue;
    const key = `${windowId}:${category}`;
    if (!groups.has(key)) {
      const definition = CATEGORY_DEFINITIONS[category];
      groups.set(key, {
        category,
        windowId,
        title: definition.titles[normalizedLanguage],
        color: "blue",
        tabIds: []
      });
    }
    groups.get(key).tabIds.push(tab.id);
  }
  return [...groups.values()];
}
