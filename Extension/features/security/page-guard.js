(() => {
  if (globalThis.BrowserMonitorPageGuard) return;

  const BASE58 = "[1-9A-HJ-NP-Za-km-z]";
  const BECH32 = "[ac-hj-np-z02-9]";
  const SOCIAL_VIDEO_HOSTS = new Set([
    "x.com", "twitter.com", "instagram.com", "facebook.com", "tiktok.com",
    "reddit.com", "linkedin.com", "threads.net", "vk.com", "ok.ru"
  ]);
  const LONG_FORM_VIDEO_HOSTS = new Set([
    "youtube.com", "youtu.be", "rutube.ru", "vimeo.com", "dailymotion.com",
    "netflix.com", "primevideo.com", "hulu.com", "disneyplus.com", "max.com",
    "kinopoisk.ru", "okko.tv", "ivi.ru", "wink.ru", "start.ru", "kion.ru", "more.tv"
  ]);
  const ADDRESS_PATTERNS = [
    ["EVM", /^0x[a-fA-F0-9]{40}$/],
    ["Aptos / Sui", /^0x[a-fA-F0-9]{64}$/],
    ["Bitcoin", new RegExp(`^(?:[13]${BASE58}{25,34}|(?:bc1|tb1)${BECH32}{11,71})$`, "i")],
    ["Bitcoin Cash", /^(?:bitcoincash:)?[qp][a-z0-9]{41}$/i],
    ["Litecoin", new RegExp(`^(?:[LM3]${BASE58}{25,34}|ltc1${BECH32}{11,71})$`, "i")],
    ["Dogecoin", new RegExp(`^D${BASE58}{33}$`)],
    ["Tron", new RegExp(`^T${BASE58}{33}$`)],
    ["XRP", new RegExp(`^r${BASE58}{24,34}$`)],
    ["Cardano", /^(?:addr|stake)(?:_test)?1[ac-hj-np-z02-9]{20,100}$/i],
    ["Cosmos", /^[a-z][a-z0-9]{1,15}1[ac-hj-np-z02-9]{38,64}$/i],
    ["Stellar", /^G[A-Z2-7]{55}$/],
    ["Algorand", /^[A-Z2-7]{58}$/],
    ["NEAR", /^[a-z0-9_-]{2,64}\.(?:near|testnet)$/],
    ["Tezos", new RegExp(`^(?:tz[1-4]|KT1)${BASE58}{33}$`)],
    ["Monero", new RegExp(`^[48]${BASE58}{94,105}$`)],
    ["TON", /^(?:EQ|UQ)[A-Za-z0-9_-]{46}$/],
    ["Polkadot / Substrate", new RegExp(`^${BASE58}{47,48}$`)],
    ["Nano", /^(?:nano|xrb)_[13][13-9a-km-uw-z]{59}$/],
    ["Solana", new RegExp(`^${BASE58}{32,44}$`)]
  ];

  function cleanCopiedText(value) {
    return String(value ?? "")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
      .trim()
      .replace(/^[\s"'`()\[\]{}<>]+|[\s"'`()\[\]{}<>.,;:!?]+$/g, "");
  }

  function detectWalletAddress(value) {
    const cleaned = cleanCopiedText(value);
    if (!cleaned || cleaned.length > 160) return null;
    for (const [family, pattern] of ADDRESS_PATTERNS) {
      if (pattern.test(cleaned)) {
        return {
          family,
          value: cleaned,
          changed: cleaned !== String(value ?? "").trim()
        };
      }
    }
    return null;
  }

  function findWalletAddress(value) {
    const exact = detectWalletAddress(value);
    if (exact) return exact;
    const tokens = String(value ?? "").split(/[\s,;()[\]{}<>"']+/).filter(Boolean);
    if (tokens.length > 12) return null;
    const matches = tokens.map(detectWalletAddress).filter(Boolean);
    return matches.length === 1 ? matches[0] : null;
  }

  function normalizedHostname(value) {
    try {
      return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function unwrapSearchURL(value, searchHostname = "") {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (searchHostname && (host === searchHostname || host.endsWith(`.${searchHostname}`))) {
        for (const key of ["url", "u", "target", "destination", "dest"]) {
          const candidate = parsed.searchParams.get(key);
          if (!candidate) continue;
          try {
            const decoded = decodeURIComponent(candidate);
            if (/^https?:\/\//i.test(decoded)) return decoded;
          } catch {
            if (/^https?:\/\//i.test(candidate)) return candidate;
          }
        }
      }
      return parsed.href;
    } catch {
      return "";
    }
  }

  function searchEngine(hostname) {
    const host = String(hostname ?? "").toLowerCase().replace(/^www\./, "");
    if (/^(?:[a-z0-9-]+\.)?google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)) return "google";
    if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
    if (host === "ya.ru" || /^(?:[a-z0-9-]+\.)?yandex\.(?:ru|com|com\.tr|kz|by)$/.test(host)) return "yandex";
    if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) return "duckduckgo";
    if (host === "search.yahoo.com") return "yahoo";
    return "";
  }

  function searchResultSelectors(engine) {
    return {
      google: ["a:has(h3)"],
      bing: ["li.b_algo h2 > a", "li.b_algo a.tilk"],
      yandex: [".OrganicTitle-Link", ".organic__url", "a.Link_theme_normal[href] h2"],
      duckduckgo: ["article[data-testid='result'] h2 a", ".result__title a"],
      yahoo: ["#web h3 a", ".algo h3 a"]
    }[engine] ?? [];
  }

  function registrableDomain(value) {
    const hostname = normalizedHostname(value);
    if (!hostname) return "";
    const labels = hostname.split(".");
    if (labels.length <= 2) return hostname;
    const secondLevelSuffixes = new Set(["co.uk", "org.uk", "com.au", "com.br", "com.cn", "co.jp", "co.kr", "co.in"]);
    const suffix = labels.slice(-2).join(".");
    return secondLevelSuffixes.has(suffix) ? labels.slice(-3).join(".") : suffix;
  }

  function normalizedMediaIdentity(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/\b(?:watch online|смотреть онлайн|free|бесплатно|official|официальный)\b/gi, " ")
      .replace(/[|·•]+.*$/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }

  function normalizedMediaRoute(pathname, search = "") {
    const path = String(pathname ?? "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/\/+/g, "/")
      .replace(/[^\p{L}\p{N}/_-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const allowedKeys = new Set([
      "id", "v", "video", "movie", "film", "serial", "show",
      "season", "s", "episode", "ep", "e"
    ]);
    const selected = [];
    try {
      const params = new URLSearchParams(String(search ?? "").replace(/^\?/, ""));
      for (const [rawKey, rawValue] of params) {
        const key = rawKey.toLowerCase();
        if (!allowedKeys.has(key)) continue;
        const value = normalizedMediaIdentity(rawValue).slice(0, 60);
        if (value) selected.push(`${key}=${value}`);
      }
    } catch {}
    return [path, selected.sort().join("&")].filter(Boolean).join("?");
  }

  function hostnameMatches(hostname, domains) {
    const host = String(hostname ?? "").toLowerCase().replace(/^www\./, "");
    return [...domains].some((domain) => host === domain || host.endsWith(`.${domain}`));
  }

  function classifyLongFormMedia(input = {}) {
    const hostname = String(input.hostname ?? "").toLowerCase().replace(/^www\./, "");
    const pathname = String(input.pathname ?? "/").toLowerCase();
    const duration = Number(input.duration);
    const width = Number(input.width);
    const height = Number(input.height);
    const videoCount = Math.max(0, Number(input.videoCount) || 0);
    const metadata = [
      input.ogType,
      ...(Array.isArray(input.structuredTypes) ? input.structuredTypes : [])
    ].join(" ").toLowerCase();
    const title = normalizedMediaIdentity(input.title);

    if (input.advertisement === true) return { supported: false, reason: "advertisement" };
    if (!Number.isFinite(duration) || duration < 120) return { supported: false, reason: "short" };
    if (hostnameMatches(hostname, SOCIAL_VIDEO_HOSTS)) return { supported: false, reason: "social-feed" };

    const largePlayer = width >= 420 && height >= 236;
    if (!largePlayer) return { supported: false, reason: "small-player" };

    const knownVideoHost = hostnameMatches(hostname, LONG_FORM_VIDEO_HOSTS);
    const pathHint = /(?:^|\/)(?:watch|video|videos|film|films|movie|movies|series|serial|episode|episodes|show|shows|player|embed)(?:\/|$)/.test(pathname);
    const metadataHint = /\b(?:video|movie|tvepisode|tvseries|episode|film)\b/.test(metadata);
    const episodicTitle = /\b(?:s\d{1,2}e\d{1,3}|season|episode|серия|сезон|эпизод|фильм)\b/i.test(title);
    const longDuration = duration >= 600;
    const playerHint = input.playerHint === true;

    if (videoCount > 3 && !knownVideoHost && !metadataHint && !pathHint && !playerHint) {
      return { supported: false, reason: "video-feed" };
    }
    if (knownVideoHost && (pathHint || metadataHint || playerHint)) {
      return { supported: true, reason: "known-video-site" };
    }
    if ((pathHint || metadataHint || episodicTitle) && (longDuration || episodicTitle)) {
      return { supported: true, reason: "long-form-signals" };
    }
    if (playerHint && longDuration) return { supported: true, reason: "long-form-player" };
    return { supported: false, reason: "insufficient-signals" };
  }

  function mediaIdentitySource(hostname, title, pathname = "", search = "") {
    const domain = registrableDomain(`https://${String(hostname ?? "").replace(/^https?:\/\//i, "")}`);
    const identity = normalizedMediaIdentity(title);
    const route = normalizedMediaRoute(pathname, search);
    return domain && identity ? [domain, identity, route].filter(Boolean).join(":") : "";
  }

  globalThis.BrowserMonitorPageGuard = Object.freeze({
    classifyLongFormMedia,
    cleanCopiedText,
    detectWalletAddress,
    findWalletAddress,
    mediaIdentitySource,
    normalizedHostname,
    normalizedMediaIdentity,
    normalizedMediaRoute,
    registrableDomain,
    searchEngine,
    searchResultSelectors,
    unwrapSearchURL
  });
})();
