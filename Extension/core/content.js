(() => {
  if (globalThis.__browserMonitorContentLoaded) return;
  globalThis.__browserMonitorContentLoaded = true;

  const state = {
    enabled: true,
    sampleStartedAt: performance.now(),
    longFrameCount: 0,
    blockingDurationMS: 0,
    forcedStyleAndLayoutDurationMS: 0,
    resourceCount: 0,
    transferBytes: 0,
    layoutShiftScore: 0,
    backgroundEventCount: 0,
    hiddenSince: document.visibilityState === "hidden" ? performance.now() : null
  };
  const observers = [];
  const recentPerformanceEvents = [];
  const mediaStates = new Map();
  const animationStates = new Map();
  let ecoObserver = null;
  let ecoScanTimer = null;
  let protectionObserver = null;
  let protectionScanTimer = null;
  let videoProtectionTimer = null;
  let imageSwapObserver = null;
  let imageSwapScanTimer = null;
  const imageSwapReplacements = [];
  let pageHasUserGesture = false;
  let protectionSettings = {
    adFilterEnabled: true,
    cookieBannerBlockingEnabled: false,
    newsletterBlockingEnabled: false,
    surveyBlockingEnabled: false,
    notificationPromptBlockingEnabled: false,
    autoplayBlockingEnabled: false,
    floatingVideoBlockingEnabled: false,
    videoAdProtectionEnabled: true,
    sponsorSegmentSkippingEnabled: true,
    cosmeticFilteringEnabled: true,
    customCosmeticFilters: [],
    imageSwapEnabled: false,
    imageSwapTheme: "landscape"
  };
  let configuredProtectionSettings = { ...protectionSettings };
  let temporarySitePauses = {};
  let extensionEnabled = true;
  let configuredMonitoringEnabled = true;
  let configuredContentBlockingEnabled = true;
  let contentBlockingEnabled = true;
  let linkSafetyNavigationInProgress = false;
  let historyPrivacyEnabled = false;
  let historyPrivacyDomains = [];
  let historyPrivacyObserver = null;
  let historyPrivacyScanTimer = null;
  let searchProtectionObserver = null;
  let searchProtectionScanTimer = null;
  let searchProtectionEnabled = true;
  let searchProtectionLanguage = "en";
  const searchProtectionHosts = new Set();
  let subscriptionCosmeticFilters = [];
  let imageSwapCustomImages = [];
  const continueWatchingVideos = new WeakMap();
  let continueWatchingIdentityTimer = null;
  let continueWatchingEnabled = false;
  let cryptoGuardEnabled = false;
  let cryptoGuardCopy = null;
  let activitySampleTimer = null;

  const PROTECTION_STYLE_ID = "browser-monitor-protection-style";
  const ACTIVATION_OVERLAY_ID = "browser-monitor-activation-overlay";
  const FLOATING_VIDEO_CLASS = "browser-monitor-hidden-floating-video";
  const VIDEO_AD_CLASS = "browser-monitor-hidden-video-ad";
  const IMAGE_SWAP_CLASS = "browser-monitor-image-swap";
  const PROTECTION_SCAN_DELAY_MS = 450;
  const VIDEO_ACTIVE_POLL_MS = 2_500;
  const VIDEO_HIDDEN_POLL_MS = 15_000;
  const ECO_SCAN_DELAY_MS = 750;
  const ECO_HIDDEN_SCAN_DELAY_MS = 4_000;
  const SEARCH_PROTECTION_SCAN_DELAY_MS = 240;
  const CRYPTO_GUARD_COPY_TTL_MS = 5 * 60 * 1_000;
  const IMAGE_SWAP_SELECTOR = [
    "[data-ad-slot]",
    "[data-ad-client]",
    "iframe[id^='google_ads']",
    "iframe[src*='doubleclick.net']",
    "[class~='ad-slot']",
    "[class*='advertisement' i]",
    "[id^='ad-container' i]",
    "[id^='ad_slot' i]"
  ].join(",");
  const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
  const YOUTUBE_AD_SELECTOR = [
    "#masthead-ad",
    "#player-ads",
    ".video-ads",
    ".ytp-ad-overlay-container",
    ".ytp-ad-image-overlay",
    "ytd-action-companion-ad-renderer",
    "ytd-ad-slot-renderer",
    "ytd-banner-promo-renderer",
    "ytd-display-ad-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-player-legacy-desktop-watch-ads-renderer",
    "ytd-promoted-sparkles-web-renderer"
  ].join(",");
  const YOUTUBE_SKIP_SELECTOR = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button"
  ].join(",");
  const RUTUBE_HOSTS = new Set(["rutube.ru", "www.rutube.ru"]);
  const VIDEO_AD_CONTAINER_SELECTOR = [
    ".ima-ad-container",
    ".videoAdUi",
    "[id^='adfox_']",
    "[class*='adfox-module' i]",
    "[class*='vast-ad' i]",
    "[class*='vpaid-ad' i]",
    "[data-ad-state='playing']"
  ].join(",");
  const VIDEO_AD_SKIP_SELECTOR = [
    ".ima-ad-container button[class*='skip' i]",
    ".videoAdUi button[class*='skip' i]",
    "button[class*='ad-skip' i]",
    "button[data-testid*='ad-skip' i]",
    "button[aria-label*='skip ad' i]",
    "button[aria-label*='пропустить рекламу' i]"
  ].join(",");
  const VIDEO_AD_STATE_SELECTOR = [
    ".ad-showing",
    ".ad-playing",
    "[data-ad-state='playing']",
    "[class~='ad-playing']",
    "[class~='ad-showing']"
  ].join(",");
  const handledVideoAdElements = new WeakSet();
  let cachedVideoRoots = [document];
  let videoRootsUpdatedAt = 0;
  let sponsorVideoID = "";
  let sponsorSegments = [];
  let sponsorRequestID = "";
  let sponsorVideo = null;
  let trackingCleanerEnabled = true;
  const skippedSponsorSegments = new Set();

  function effectiveMonitoringEnabled(value) {
    return extensionEnabled && value !== false;
  }

  function closestAnchor(target) {
    return target?.closest?.("a[href]") ?? null;
  }

  function shouldCheckLinkClick(event, anchor) {
    if (!anchor || event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.hasAttribute("download")) return false;
    const href = anchor.href || "";
    if (!/^https?:\/\//i.test(href)) return false;
    if (new URL(href).origin === location.origin) return false;
    return true;
  }

  function continueNavigation(anchor, url) {
    linkSafetyNavigationInProgress = true;
    const target = (anchor.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") {
      window.open(url, target, "noopener");
    } else {
      location.href = url;
    }
    setTimeout(() => {
      linkSafetyNavigationInProgress = false;
    }, 1_000);
  }

  function cleanClickedURL(rawURL) {
    if (!trackingCleanerEnabled) return { url: rawURL, removed: [] };
    try {
      const url = new URL(rawURL);
      const removed = [];
      for (const key of [...url.searchParams.keys()]) {
        if (/^(?:utm_.+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|mc_cid|mc_eid|igshid|ref_src|ref_url)$/i.test(key)) {
          removed.push(key);
          url.searchParams.delete(key);
        }
      }
      return { url: url.href, removed };
    } catch {
      return { url: rawURL, removed: [] };
    }
  }

  function handleLinkSafetyClick(event) {
    if (linkSafetyNavigationInProgress) return;
    const anchor = closestAnchor(event.target);
    if (!shouldCheckLinkClick(event, anchor)) return;
    const cleaned = cleanClickedURL(anchor.href);
    const targetUrl = cleaned.url;
    event.preventDefault();
    chrome.runtime.sendMessage({
      kind: "evaluateLinkSafety",
      url: targetUrl,
      sourceUrl: location.href
      ,removedTrackingParameters: cleaned.removed
    }).then((response) => {
      if (["warn", "block"].includes(response?.action) && response.warningUrl) {
        chrome.runtime.sendMessage({
          kind: "navigateWarning",
          url: response.warningUrl,
          target: (anchor.getAttribute("target") || "").toLowerCase()
        });
        return;
      }
      continueNavigation(anchor, targetUrl);
    }).catch(() => {
      continueNavigation(anchor, targetUrl);
    });
  }

  function historyPrivacyTerms() {
    return historyPrivacyDomains.flatMap((domain) => {
      const base = domain.split(".")[0];
      return [domain, base].filter((value) => value && value.length >= 3);
    });
  }

  function shouldFilterSearchSuggestions() {
    const host = location.hostname.toLowerCase().replace(/^www\./, "");
    return ["google.com", "yandex.ru", "ya.ru", "bing.com"].some((domain) => host === domain || host.endsWith(`.${domain}`));
  }

  function filterSearchSuggestions() {
    clearTimeout(historyPrivacyScanTimer);
    historyPrivacyScanTimer = null;
    if (!extensionEnabled || !historyPrivacyEnabled || historyPrivacyDomains.length === 0 || !shouldFilterSearchSuggestions()) return;
    const terms = historyPrivacyTerms();
    if (terms.length === 0) return;
    const candidates = document.querySelectorAll([
      "[role='option']",
      ".sbct",
      ".erkvQe li",
      ".mini-suggest__item",
      ".suggest2-item",
      ".websearch-suggest__item",
      ".search3__suggest",
      "li[data-text]"
    ].join(","));
    for (const element of candidates) {
      const text = (element.textContent || element.getAttribute("data-text") || "").toLowerCase();
      const matched = terms.some((term) => text.includes(term.toLowerCase()));
      if (matched) {
        element.setAttribute("data-browser-monitor-history-hidden", "true");
        if (element instanceof HTMLElement) element.style.setProperty("display", "none", "important");
      }
    }
  }

  function restoreSearchSuggestions() {
    document.querySelectorAll("[data-browser-monitor-history-hidden='true']").forEach((element) => {
      element.removeAttribute("data-browser-monitor-history-hidden");
      if (element instanceof HTMLElement) element.style.removeProperty("display");
    });
  }

  function scheduleHistoryPrivacyScan() {
    if (historyPrivacyScanTimer || document.hidden) return;
    historyPrivacyScanTimer = setTimeout(filterSearchSuggestions, 160);
  }

  function configureHistoryPrivacy(settings = {}) {
    historyPrivacyEnabled = settings.enabled === true;
    historyPrivacyDomains = Array.isArray(settings.domains) ? settings.domains.slice(0, 500) : [];
    historyPrivacyObserver?.disconnect();
    historyPrivacyObserver = null;
    clearTimeout(historyPrivacyScanTimer);
    historyPrivacyScanTimer = null;
    restoreSearchSuggestions();
    if (extensionEnabled && historyPrivacyEnabled && shouldFilterSearchSuggestions()) {
      historyPrivacyObserver = new MutationObserver(scheduleHistoryPrivacyScan);
      if (!document.hidden) {
        historyPrivacyObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
      filterSearchSuggestions();
    }
  }

  function searchProtectionCopy() {
    return searchProtectionLanguage === "ru"
      ? {
          trusted: "Доверенный",
          risk: "Риск скама",
          suspicious: "Подозрительный",
          unverified: "Проверить",
          trust: "Считать оригиналом",
          trustedHint: "Домен добавлен вами в локальный белый список",
          riskHint: "Локальные признаки похожи на скам или подмену домена",
          suspiciousHint: "Перед переходом внимательно проверьте домен",
          unverifiedHint: "Browser Monitor не подтверждал этот домен"
        }
      : {
          trusted: "Trusted",
          risk: "Scam risk",
          suspicious: "Suspicious",
          unverified: "Check",
          trust: "Trust as original",
          trustedHint: "You added this domain to the local allowlist",
          riskHint: "Local signals resemble a scam or lookalike domain",
          suspiciousHint: "Check the domain carefully before opening it",
          unverifiedHint: "Browser Monitor has not verified this domain"
        };
  }

  function removeSearchProtectionBadges() {
    document.querySelectorAll("[data-browser-monitor-search-badge]").forEach((element) => element.remove());
    document.querySelectorAll("[data-browser-monitor-search-checked]").forEach((element) => {
      element.removeAttribute("data-browser-monitor-search-checked");
    });
  }

  function updateSearchProtectionBadge(host, action, trusted) {
    const copy = searchProtectionCopy();
    const status = host.shadowRoot?.querySelector(".status");
    const trustButton = host.shadowRoot?.querySelector(".trust");
    if (!status || !trustButton) return;
    const kind = trusted ? "trusted" : action === "block" ? "risk" : action === "warn" ? "suspicious" : "unverified";
    status.className = `status ${kind}`;
    status.textContent = copy[kind];
    status.title = copy[`${kind}Hint`];
    trustButton.hidden = trusted;
  }

  function createSearchProtectionBadge(domain, action, trusted) {
    const copy = searchProtectionCopy();
    const host = document.createElement("span");
    host.dataset.browserMonitorSearchBadge = domain;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display:inline-flex; position:relative; z-index:2; vertical-align:middle; margin-inline-start:7px; contain:content; }
        .wrap { display:inline-flex; align-items:center; gap:3px; font:600 10px/18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; white-space:nowrap; border-radius:999px; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
        button { font:inherit; }
        .status { display:inline-flex; min-height:18px; align-items:center; gap:4px; padding:0 7px; border:1px solid rgba(80,91,98,.18); border-radius:999px; background:rgba(80,91,98,.2); color:#5d686e; }
        .status::before { content:""; width:5px; height:5px; border-radius:50%; background:currentColor; }
        .status.trusted { border-color:rgba(49,113,74,.24); background:rgba(49,113,74,.18); color:#31714a; }
        .status.suspicious { border-color:rgba(157,111,38,.27); background:rgba(157,111,38,.2); color:#8b611f; }
        .status.risk { border-color:rgba(166,62,58,.28); background:rgba(166,62,58,.2); color:#a13f3b; }
        .trust { width:18px; height:18px; padding:0; border:1px solid rgba(80,91,98,.2); border-radius:50%; background:rgba(255,255,255,.82); color:#59676e; cursor:pointer; line-height:16px; }
        .trust:hover, .trust:focus-visible { background:#fff; color:#244d3a; outline:2px solid rgba(65,113,88,.2); }
        @media (prefers-color-scheme:dark) {
          .status { border-color:rgba(255,255,255,.18); background:rgba(40,45,50,.85); color:#aab4b9; }
          .status.trusted { background:rgba(49,113,74,.6); color:#82bd93; } .status.suspicious { background:rgba(157,111,38,.6); color:#d0a45d; } .status.risk { background:rgba(166,62,58,.6); color:#dc807c; }
          .trust { border-color:rgba(255,255,255,.2); background:rgba(25,27,28,.85); color:#b7c1c6; }
        }
      </style>
      <span class="wrap">
        <span class="status"></span>
        <button class="trust" type="button" title="${copy.trust}" aria-label="${copy.trust}">+</button>
      </span>
    `;
    const trustButton = shadow.querySelector(".trust");
    trustButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      trustButton.disabled = true;
      chrome.runtime.sendMessage({ kind: "allowLinkSafetyDomain", domain }).then((result) => {
        if (!result?.ok) throw new Error(result?.error);
        searchProtectionHosts.add(result.domain || domain);
        document.querySelectorAll("[data-browser-monitor-search-badge]").forEach((candidate) => {
          if (candidate.dataset.browserMonitorSearchBadge === (result.domain || domain)) {
            updateSearchProtectionBadge(candidate, "allow", true);
          }
        });
      }).catch(() => {
        trustButton.disabled = false;
      });
    });
    updateSearchProtectionBadge(host, action, trusted);
    return host;
  }

  function searchResultAnchor(candidate) {
    if (candidate instanceof HTMLAnchorElement) return candidate;
    return candidate?.closest?.("a[href]") ?? candidate?.querySelector?.("a[href]") ?? null;
  }

  function placeSearchProtectionBadge(anchor, host) {
    const heading = anchor.closest("h2, h3") ?? anchor.querySelector("h2, h3");
    if (heading?.contains(anchor)) {
      heading.append(host);
      return true;
    }
    if (!anchor.parentElement) return false;
    anchor.insertAdjacentElement("afterend", host);
    return true;
  }

  function scanSearchResults() {
    searchProtectionScanTimer = null;
    const guard = globalThis.BrowserMonitorPageGuard;
    const engine = guard?.searchEngine(location.hostname);
    if (!engine || !searchProtectionEnabled || document.hidden) return;
    const selector = guard.searchResultSelectors(engine).join(",");
    if (!selector) return;
    let inspected = 0;
    for (const candidate of document.querySelectorAll(selector)) {
      if (inspected >= 80) break;
      const anchor = searchResultAnchor(candidate);
      if (!anchor || anchor.hasAttribute("data-browser-monitor-search-checked")) continue;
      anchor.setAttribute("data-browser-monitor-search-checked", "true");
      const targetURL = guard.unwrapSearchURL(anchor.href, location.hostname.replace(/^www\./, ""));
      const domain = guard.registrableDomain(targetURL);
      if (!targetURL || !domain || domain === guard.registrableDomain(location.href)) continue;
      inspected += 1;
      chrome.runtime.sendMessage({
        kind: "evaluateLinkSafety",
        url: targetURL,
        sourceUrl: location.href
      }).then((result) => {
        if (!anchor.isConnected || anchor.parentElement?.querySelector?.(`[data-browser-monitor-search-badge="${CSS.escape(domain)}"]`)) return;
        const trusted = searchProtectionHosts.has(result?.registrableDomain || domain);
        const host = createSearchProtectionBadge(result?.registrableDomain || domain, result?.action || "allow", trusted);
        if (!placeSearchProtectionBadge(anchor, host)) host.remove();
      }).catch(() => {});
    }
  }

  function scheduleSearchProtectionScan() {
    if (searchProtectionScanTimer || document.hidden) return;
    searchProtectionScanTimer = setTimeout(scanSearchResults, SEARCH_PROTECTION_SCAN_DELAY_MS);
  }

  function configureSearchProtection({ enabled = true, language = "en", trustedDomains = [] } = {}) {
    searchProtectionEnabled = enabled !== false;
    searchProtectionLanguage = language === "ru" ? "ru" : "en";
    searchProtectionHosts.clear();
    for (const domain of trustedDomains) {
      const normalized = globalThis.BrowserMonitorPageGuard?.registrableDomain(`https://${domain}`);
      if (normalized) searchProtectionHosts.add(normalized);
    }
    searchProtectionObserver?.disconnect();
    searchProtectionObserver = null;
    clearTimeout(searchProtectionScanTimer);
    searchProtectionScanTimer = null;
    removeSearchProtectionBadges();
    if (!searchProtectionEnabled || !globalThis.BrowserMonitorPageGuard?.searchEngine(location.hostname)) return;
    searchProtectionObserver = new MutationObserver(scheduleSearchProtectionScan);
    if (!document.hidden) {
      searchProtectionObserver.observe(document.documentElement, { childList: true, subtree: true });
      scanSearchResults();
    }
  }

  function isYouTubePage() {
    return YOUTUBE_HOSTS.has(location.hostname.toLowerCase());
  }

  function isRutubePage() {
    return RUTUBE_HOSTS.has(location.hostname.toLowerCase());
  }

  function isYandexSearchPage() {
    const host = location.hostname.toLowerCase().replace(/^www\./, "");
    return (host === "yandex.ru" || host === "ya.ru" || host.endsWith(".yandex.ru"))
      && (location.pathname === "/search/" || location.pathname.startsWith("/search/") || location.pathname === "/");
  }

  function currentYouTubeVideoID() {
    if (!isYouTubePage()) return "";
    const match = location.pathname.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
    const value = new URL(location.href).searchParams.get("v") ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : "";
  }

  function videoProtectionRoots() {
    if (!isRutubePage()) return [document];
    if (Date.now() - videoRootsUpdatedAt < 5_000) return cachedVideoRoots;
    videoRootsUpdatedAt = Date.now();
    const roots = [document];
    let inspected = 0;
    for (let index = 0; index < roots.length && roots.length < 30 && inspected < 2_500; index += 1) {
      for (const element of roots[index].querySelectorAll("*")) {
        inspected += 1;
        if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot);
        if (roots.length >= 30 || inspected >= 2_500) break;
      }
    }
    cachedVideoRoots = roots;
    return roots;
  }

  function queryVideoRoots(selector) {
    return videoProtectionRoots().flatMap((root) => [...root.querySelectorAll(selector)]);
  }

  function playActivationAnimation() {
    document.querySelector(`#${ACTIVATION_OVERLAY_ID}`)?.remove();

    const host = document.createElement("div");
    host.id = ACTIVATION_OVERLAY_ID;
    host.setAttribute("aria-hidden", "true");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: block;
          pointer-events: none;
          contain: strict;
        }
        .veil {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: rgba(235, 241, 243, .94);
          background: rgba(38, 48, 53, .17);
          backdrop-filter: saturate(.82) brightness(.92) blur(1.5px);
          animation: veil 2.35s cubic-bezier(.22, .72, .2, 1) both;
        }
        .veil::after {
          content: "";
          position: absolute;
          inset: -35% -70%;
          background: linear-gradient(108deg, transparent 42%, rgba(211, 226, 231, .12) 49%, rgba(211, 226, 231, .12) 51%, transparent 58%);
          transform: translateX(-28%);
          animation: sheen 1.25s .18s ease-in-out both;
        }
        .lockup {
          position: relative;
          z-index: 1;
          display: grid;
          justify-items: center;
          gap: 13px;
          transform: translateY(-2px);
        }
        .emblem {
          position: relative;
          width: 112px;
          height: 124px;
          display: grid;
          place-items: center;
        }
        .shield {
          position: absolute;
          inset: 0;
          width: 112px;
          height: 124px;
          overflow: visible;
          filter:
            drop-shadow(0 1px 0 rgba(255, 255, 255, .24))
            drop-shadow(0 8px 18px rgba(10, 18, 22, .22));
        }
        .shield path {
          fill: rgba(255, 255, 255, .08);
          stroke: rgba(255, 255, 255, .78);
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: draw-shield .82s .18s cubic-bezier(.45, 0, .18, 1) forwards;
        }
        .app-mark {
          position: relative;
          width: 76px;
          height: 36px;
          opacity: 0;
          transform: scale(.72);
          filter: drop-shadow(0 7px 12px rgba(4, 9, 12, .2));
          animation: mark-in .48s .48s cubic-bezier(.18, .86, .25, 1.25) forwards;
        }
        .app-mark img {
          display: block;
          width: 76px;
          height: 36px;
        }
        .title {
          margin: 0;
          color: rgba(245, 248, 249, .96);
          font: 600 17px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: -.18px;
          text-shadow: 0 2px 10px rgba(9, 15, 18, .28);
          opacity: 0;
          transform: translateY(5px);
          animation: copy-in .32s .72s ease-out forwards;
        }
        .status {
          margin: -7px 0 0;
          color: rgba(238, 243, 245, .88);
          font: 500 12px/1.25 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: .08px;
          text-shadow: 0 2px 10px rgba(9, 15, 18, .42);
          opacity: 0;
          transform: translateY(4px);
          animation: copy-in .32s .82s ease-out forwards;
        }
        @keyframes veil {
          0% { opacity: 0; }
          12%, 76% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sheen {
          0% { transform: translateX(-28%); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translateX(28%); opacity: 0; }
        }
        @keyframes draw-shield { to { stroke-dashoffset: 0; } }
        @keyframes mark-in { to { opacity: 1; transform: scale(1); } }
        @keyframes copy-in { to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .veil { animation-duration: 1.2s; }
          .veil::after { display: none; }
          .shield path, .app-mark, .title, .status {
            animation: none;
            opacity: 1;
            transform: none;
            stroke-dashoffset: 0;
          }
        }
      </style>
      <div class="veil">
        <div class="lockup">
          <div class="emblem">
            <svg class="shield" viewBox="0 0 112 124" aria-hidden="true">
              <path pathLength="1" d="M56 5 99 21v33c0 29-18.2 51.7-43 62C31.2 105.7 13 83 13 54V21L56 5Z"/>
            </svg>
            <span class="app-mark"><img src="${chrome.runtime.getURL("icons/browser-monitor-core.svg")}" alt=""></span>
          </div>
          <p class="title">Browser Monitor</p>
          <p class="status">Protection and analysis are active</p>
        </div>
      </div>
    `;
    (document.documentElement || document).append(host);
    setTimeout(() => host.remove(), 2_500);
  }

  function protectionCSS(settings) {
    const rules = [];
    if (settings.adFilterEnabled && isYouTubePage()) {
      rules.push(`${YOUTUBE_AD_SELECTOR} { display: none !important; }`);
    }
    if (settings.adFilterEnabled && isYandexSearchPage()) {
      rules.push(`
        [aria-label="Реклама"],
        [aria-label="Advertisement"],
        [data-fast-name="ad"],
        [data-fast-name="advert"],
        [data-fast-name="banner"],
        [data-fast-name="direct-ad"],
        [data-zone-name="ad"],
        [data-zone-name="advert"],
        [data-zone-name="banner"],
        [data-zone-name="direct-ad"],
        [class*="direct" i][class*="card" i],
        [class*="serp-adv" i],
        [class*="serpAdv" i],
        [class*="Commercial" i],
        [class*="commercial" i],
        [class*="Advert" i],
        aside:has(a[href*="yabs.yandex" i]),
        aside:has(a[href*="an.yandex" i]),
        aside:has(a[href*="direct.yandex" i]),
        li:has(> a[href*="yabs.yandex" i]),
        li:has(> a[href*="an.yandex" i]),
        li:has(> a[href*="direct.yandex" i]),
        div:has(> a[href*="yabs.yandex" i]),
        div:has(> a[href*="an.yandex" i]),
        div:has(> a[href*="direct.yandex" i]) { display: none !important; }
      `);
    }
    if (settings.videoAdProtectionEnabled) {
      rules.push(`${VIDEO_AD_CONTAINER_SELECTOR} { display: none !important; }`);
      rules.push(`.${VIDEO_AD_CLASS} { display: none !important; }`);
    }
    if (settings.cookieBannerBlockingEnabled) {
      rules.push(`
        #onetrust-banner-sdk,
        .onetrust-pc-dark-filter,
        #CybotCookiebotDialog,
        #CybotCookiebotDialogBodyUnderlay,
        .qc-cmp2-container,
        .fc-consent-root,
        .didomi-popup-container,
        [id^="sp_message_container_"] { display: none !important; }
      `);
    }
    if (settings.newsletterBlockingEnabled) {
      rules.push(`
        .newsletter-modal,
        .newsletter-popup,
        [id*="newsletter-popup" i],
        [class*="newsletter-modal" i] { display: none !important; }
      `);
    }
    if (settings.surveyBlockingEnabled) {
      rules.push(`
        .survey-modal,
        .survey-popup,
        [id*="survey-popup" i],
        [class*="survey-modal" i] { display: none !important; }
      `);
    }
    if (settings.notificationPromptBlockingEnabled) {
      rules.push(`
        #onesignal-slidedown-container,
        .onesignal-slidedown-container,
        .pushcrew-chrome-style-notification,
        [class*="push-notification-prompt" i] { display: none !important; }
      `);
    }
    if (settings.floatingVideoBlockingEnabled) {
      rules.push(`.${FLOATING_VIDEO_CLASS} { display: none !important; }`);
    }
    if (settings.imageSwapEnabled) {
      rules.push(`.${IMAGE_SWAP_CLASS} { display: block !important; overflow: hidden !important; border-radius: 8px !important; background-position: center !important; background-repeat: no-repeat !important; background-size: cover !important; }`);
    }
    return rules.join("\n");
  }

  function restoreImageSwaps() {
    while (imageSwapReplacements.length > 0) {
      const { placeholder, original } = imageSwapReplacements.pop();
      if (placeholder.isConnected) placeholder.replaceWith(original);
    }
  }

  function stopImageSwapObserver() {
    imageSwapObserver?.disconnect();
    imageSwapObserver = null;
    clearTimeout(imageSwapScanTimer);
    imageSwapScanTimer = null;
  }

  function candidateDimensions(element) {
    const rect = element.getBoundingClientRect();
    const declaredWidth = Number.parseFloat(element.getAttribute("width") ?? element.style.width) || 0;
    const declaredHeight = Number.parseFloat(element.getAttribute("height") ?? element.style.height) || 0;
    return {
      width: Math.round(rect.width || declaredWidth),
      height: Math.round(rect.height || declaredHeight)
    };
  }

  function replaceImageSwapCandidate(element) {
    if (!(element instanceof HTMLElement) || imageSwapReplacements.length >= 2) return;
    const { width, height } = candidateDimensions(element);
    if (width < 60 || height < 60) return;
    const selectedTheme = protectionSettings.imageSwapTheme;
    const theme = ["landscape", "ocean", "minimal"].includes(selectedTheme) ? selectedTheme : "landscape";
    const customImage = selectedTheme === "custom" && imageSwapCustomImages.length > 0
      ? imageSwapCustomImages[imageSwapReplacements.length % imageSwapCustomImages.length]
      : null;
    const placeholder = document.createElement("div");
    placeholder.className = IMAGE_SWAP_CLASS;
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", "Local Browser Monitor artwork");
    placeholder.style.width = `${width}px`;
    placeholder.style.height = `${height}px`;
    placeholder.style.backgroundImage = `url(${JSON.stringify(
      customImage ?? chrome.runtime.getURL(`images/image-swap-${theme}.svg`)
    )})`;
    element.replaceWith(placeholder);
    imageSwapReplacements.push({ placeholder, original: element });
  }

  function scanImageSwapCandidates() {
    imageSwapScanTimer = null;
    if (!protectionSettings.imageSwapEnabled || imageSwapReplacements.length >= 2) {
      stopImageSwapObserver();
      return;
    }
    for (const candidate of document.querySelectorAll(IMAGE_SWAP_SELECTOR)) {
      replaceImageSwapCandidate(candidate);
      if (imageSwapReplacements.length >= 2) break;
    }
    if (imageSwapReplacements.length >= 2) stopImageSwapObserver();
  }

  function scheduleImageSwapScan() {
    if (imageSwapScanTimer || imageSwapReplacements.length >= 2) return;
    imageSwapScanTimer = setTimeout(scanImageSwapCandidates, 250);
  }

  function configureImageSwap() {
    stopImageSwapObserver();
    if (!protectionSettings.imageSwapEnabled) {
      restoreImageSwaps();
      return;
    }
    if (imageSwapReplacements.length >= 2) return;
    imageSwapObserver = new MutationObserver(scheduleImageSwapScan);
    imageSwapObserver.observe(document.documentElement, { childList: true, subtree: true });
    scheduleImageSwapScan();
  }

  function floatingContainer(video) {
    let candidate = video;
    for (let depth = 0; candidate && depth < 4; depth += 1, candidate = candidate.parentElement) {
      const position = getComputedStyle(candidate).position;
      if (position === "fixed" || position === "sticky") return candidate;
    }
    return null;
  }

  function recordVideoAdAction(element) {
    if (handledVideoAdElements.has(element)) return;
    handledVideoAdElements.add(element);
    chrome.runtime.sendMessage({ kind: "recordVideoAdAction" }).catch(() => {});
  }

  function scanVideoAds() {
    if (!contentBlockingEnabled || !protectionSettings.videoAdProtectionEnabled) return;
    for (const root of videoProtectionRoots()) {
      for (const button of root.querySelectorAll(VIDEO_AD_SKIP_SELECTOR)) {
        if (!(button instanceof HTMLElement) || button.hidden || button.getClientRects().length === 0) continue;
        button.click();
        recordVideoAdAction(button);
      }
      for (const container of root.querySelectorAll(VIDEO_AD_CONTAINER_SELECTOR)) {
        if (!(container instanceof HTMLElement)) continue;
        container.classList.add(VIDEO_AD_CLASS);
        container.style.setProperty("display", "none", "important");
        recordVideoAdAction(container);
      }
      for (const adState of root.querySelectorAll(VIDEO_AD_STATE_SELECTOR)) {
        const video = adState.matches("video") ? adState : adState.querySelector("video");
        if (!(video instanceof HTMLVideoElement) || !Number.isFinite(video.duration) || video.duration <= 0) continue;
        video.currentTime = Math.max(0, video.duration - 0.05);
        recordVideoAdAction(adState);
      }
    }
  }

  function handleSponsorTimeUpdate() {
    if (!sponsorVideo || !protectionSettings.sponsorSegmentSkippingEnabled) return;
    const time = sponsorVideo.currentTime;
    const segment = sponsorSegments.find(({ start, end }) => time >= start && time < end - 0.08);
    if (!segment) return;
    sponsorVideo.currentTime = segment.end + 0.05;
    const key = segment.uuid || `${segment.category}:${segment.start}:${segment.end}`;
    if (skippedSponsorSegments.has(key)) return;
    skippedSponsorSegments.add(key);
    chrome.runtime.sendMessage({ kind: "recordSponsorSegmentSkip", category: segment.category }).catch(() => {});
  }

  function connectSponsorVideo() {
    const nextVideo = document.querySelector("video.html5-main-video, #movie_player video, video");
    if (nextVideo === sponsorVideo) return;
    sponsorVideo?.removeEventListener("timeupdate", handleSponsorTimeUpdate);
    sponsorVideo = nextVideo instanceof HTMLVideoElement ? nextVideo : null;
    sponsorVideo?.addEventListener("timeupdate", handleSponsorTimeUpdate, { passive: true });
  }

  function updateSponsorProtection() {
    const videoID = contentBlockingEnabled && protectionSettings.sponsorSegmentSkippingEnabled
      ? currentYouTubeVideoID()
      : "";
    if (videoID !== sponsorVideoID) {
      sponsorVideoID = videoID;
      sponsorSegments = [];
      sponsorRequestID = "";
      skippedSponsorSegments.clear();
    }
    connectSponsorVideo();
    if (!videoID) {
      if (isYouTubePage()) chrome.runtime.sendMessage({ kind: "recordSponsorStatus", status: protectionSettings.sponsorSegmentSkippingEnabled ? "none" : "disabled" }).catch(() => {});
      return;
    }
    if (sponsorRequestID === videoID) return;
    sponsorRequestID = videoID;
    chrome.runtime.sendMessage({ kind: "getSponsorSegments", videoId: videoID })
      .then((response) => {
        if (sponsorVideoID !== videoID) return;
        sponsorSegments = Array.isArray(response?.segments) ? response.segments : [];
        chrome.runtime.sendMessage({ kind: "recordSponsorStatus", status: response?.status ?? "unavailable" }).catch(() => {});
        handleSponsorTimeUpdate();
      })
      .catch(() => {
        chrome.runtime.sendMessage({ kind: "recordSponsorStatus", status: "unavailable" }).catch(() => {});
        if (sponsorRequestID === videoID) sponsorRequestID = "";
      });
  }

  function stopVideoProtectionTimer() {
    clearTimeout(videoProtectionTimer);
    videoProtectionTimer = null;
    sponsorVideo?.removeEventListener("timeupdate", handleSponsorTimeUpdate);
    sponsorVideo = null;
  }

  function scheduleVideoProtectionTimer() {
    if (videoProtectionTimer) return;
    const tick = () => {
      videoProtectionTimer = null;
      if (!contentBlockingEnabled) return;
      const needsVideoAdPolling = protectionSettings.videoAdProtectionEnabled
        && (isYouTubePage() || isRutubePage());
      const needsSponsorPolling = protectionSettings.sponsorSegmentSkippingEnabled && isYouTubePage();
      const needsFallbackPolling = needsVideoAdPolling || needsSponsorPolling;
      if (!needsFallbackPolling) return;
      if (!document.hidden) {
        if (needsVideoAdPolling) scanVideoAds();
        if (needsSponsorPolling) updateSponsorProtection();
      }
      videoProtectionTimer = setTimeout(
        tick,
        document.hidden ? VIDEO_HIDDEN_POLL_MS : VIDEO_ACTIVE_POLL_MS
      );
    };
    const shouldSchedule = contentBlockingEnabled && (
      (protectionSettings.videoAdProtectionEnabled && (isYouTubePage() || isRutubePage()))
      || (protectionSettings.sponsorSegmentSkippingEnabled && isYouTubePage())
    );
    if (shouldSchedule) {
      videoProtectionTimer = setTimeout(
        tick,
        document.hidden ? VIDEO_HIDDEN_POLL_MS : VIDEO_ACTIVE_POLL_MS
      );
    }
  }

  function scanOptionalPageControls() {
    protectionScanTimer = null;
    if (contentBlockingEnabled && protectionSettings.adFilterEnabled && isYouTubePage()) {
      for (const button of document.querySelectorAll(YOUTUBE_SKIP_SELECTOR)) {
        if (button instanceof HTMLElement && !button.hidden && button.getClientRects().length > 0) button.click();
      }
      const player = document.querySelector(".html5-video-player.ad-showing");
      const video = player?.querySelector("video");
      if (video instanceof HTMLVideoElement && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
    }
    scanVideoAds();
    updateSponsorProtection();
    scheduleVideoProtectionTimer();
    if (protectionSettings.autoplayBlockingEnabled && !pageHasUserGesture) {
      for (const media of document.querySelectorAll("video[autoplay], audio[autoplay]")) {
        media.pause();
      }
    }
    document.querySelectorAll(`.${FLOATING_VIDEO_CLASS}`).forEach((element) => {
      element.classList.remove(FLOATING_VIDEO_CLASS);
    });
    if (protectionSettings.floatingVideoBlockingEnabled) {
      for (const video of document.querySelectorAll("video")) {
        floatingContainer(video)?.classList.add(FLOATING_VIDEO_CLASS);
      }
    }
  }

  function scheduleProtectionScan(delay = PROTECTION_SCAN_DELAY_MS) {
    if (protectionScanTimer || document.hidden) return;
    protectionScanTimer = setTimeout(scanOptionalPageControls, delay);
  }

  function handleProtectionMutations(records) {
    if (document.hidden) return;
    let inspected = 0;
    const candidateSelector = [
      "video",
      "audio",
      VIDEO_AD_CONTAINER_SELECTOR,
      VIDEO_AD_SKIP_SELECTOR,
      isYouTubePage() ? YOUTUBE_SKIP_SELECTOR : ""
    ].filter(Boolean).join(",");
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        inspected += 1;
        if (node.matches(candidateSelector) || node.querySelector(candidateSelector)) {
          scheduleProtectionScan();
          return;
        }
        if (inspected >= 30) return;
      }
    }
  }

  function applyProtectionSettings(settings) {
    const previousImageSwapEnabled = protectionSettings.imageSwapEnabled;
    const previousImageSwapTheme = protectionSettings.imageSwapTheme;
    configuredProtectionSettings = { ...configuredProtectionSettings, ...settings };
    const currentDomain = location.hostname.toLowerCase().replace(/^www\./, "");
    const pausedUntil = Date.parse(temporarySitePauses[currentDomain] ?? "");
    const hasPermanentException = (configuredProtectionSettings.allowlistedSites ?? []).includes(currentDomain);
    const disabledOnSite = !extensionEnabled || hasPermanentException || (Number.isFinite(pausedUntil) && pausedUntil > Date.now());
    protectionSettings = disabledOnSite
      ? {
          ...configuredProtectionSettings,
          adFilterEnabled: false,
          cookieBannerBlockingEnabled: false,
          newsletterBlockingEnabled: false,
          surveyBlockingEnabled: false,
          notificationPromptBlockingEnabled: false,
          autoplayBlockingEnabled: false,
          floatingVideoBlockingEnabled: false,
          videoAdProtectionEnabled: false,
          sponsorSegmentSkippingEnabled: false,
          customCosmeticFilters: []
        }
      : configuredProtectionSettings;
    if (previousImageSwapEnabled !== protectionSettings.imageSwapEnabled
        || previousImageSwapTheme !== protectionSettings.imageSwapTheme) {
      restoreImageSwaps();
    }
    let style = document.querySelector(`#${PROTECTION_STYLE_ID}`);
    const css = protectionCSS(protectionSettings);
    const customFilters = [
      ...(protectionSettings.customCosmeticFilters ?? []).slice(0, 200).map(selectorForCurrentSite).filter(Boolean),
      ...(extensionEnabled && contentBlockingEnabled && protectionSettings.cosmeticFilteringEnabled
        ? subscriptionCosmeticFilters.slice(0, 500).filter(safeSubscriptionCosmeticSelector)
        : [])
    ];
    if (css || customFilters.length > 0) {
      if (!style) {
        style = document.createElement("style");
        style.id = PROTECTION_STYLE_ID;
        (document.head || document.documentElement).append(style);
      }
      style.textContent = css;
      for (const selector of customFilters) {
        try {
          style.sheet.insertRule(`${selector} { display: none !important; }`);
        } catch {
          // Invalid custom selectors are ignored without affecting other rules.
        }
      }
    } else {
      style?.remove();
    }

    protectionObserver?.disconnect();
    protectionObserver = null;
    clearTimeout(protectionScanTimer);
    protectionScanTimer = null;
    stopVideoProtectionTimer();
    const needsScanning = protectionSettings.autoplayBlockingEnabled
      || protectionSettings.floatingVideoBlockingEnabled
      || (extensionEnabled && contentBlockingEnabled && protectionSettings.videoAdProtectionEnabled)
      || (extensionEnabled && contentBlockingEnabled && protectionSettings.adFilterEnabled && isYouTubePage());
    if (needsScanning) {
      protectionObserver = new MutationObserver(handleProtectionMutations);
      if (!document.hidden) {
        protectionObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
    }
    scanOptionalPageControls();
    configureImageSwap();
  }

  let pickerActive = false;
  let pickerTarget = null;
  let contextMenuTarget = null;
  let pickerTooltip = null;
  let undoElementPickerToast = null;
  let undoElementPickerTimer = null;

  document.addEventListener("contextmenu", (event) => {
    contextMenuTarget = event.target instanceof Element ? event.target : null;
  }, true);

  function selectorForCurrentSite(value) {
    const filter = String(value ?? "").trim();
    const separator = filter.indexOf("##");
    if (separator < 1) return filter;
    const domain = filter.slice(0, separator).toLowerCase();
    const hostname = location.hostname.toLowerCase().replace(/^www\./, "");
    return hostname === domain || hostname.endsWith(`.${domain}`)
      ? filter.slice(separator + 2)
      : "";
  }

  function safeSubscriptionCosmeticSelector(selector) {
    return String(selector ?? "").trim().toLowerCase() !== "#movie_video:empty";
  }

  function selectorForElement(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const classNames = [...element.classList]
      .filter((name) => !name.startsWith("browser-monitor-"))
      .slice(0, 3);
    const simple = `${element.localName}${classNames.map((name) => `.${CSS.escape(name)}`).join("")}`;
    try {
      if (document.querySelectorAll(simple).length === 1) return simple;
    } catch {
      // Fall through to a structural selector.
    }

    const parts = [];
    let current = element;
    while (current && current !== document.documentElement && parts.length < 5) {
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((candidate) => candidate.localName === current.localName)
        : [];
      const position = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
      parts.unshift(`${current.localName}${position}`);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function clearPickerTarget() {
    pickerTarget?.classList.remove("browser-monitor-picker-target");
    pickerTarget = null;
  }

  function stopElementPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    clearPickerTarget();
    pickerTooltip?.remove();
    pickerTooltip = null;
    document.querySelector("#browser-monitor-picker-style")?.remove();
    document.removeEventListener("mouseover", handlePickerHover, true);
    document.removeEventListener("mousemove", handlePickerMove, true);
    document.removeEventListener("click", handlePickerClick, true);
    document.removeEventListener("keydown", handlePickerKey, true);
  }

  function handlePickerHover(event) {
    if (!(event.target instanceof Element) || event.target === pickerTooltip) return;
    clearPickerTarget();
    pickerTarget = event.target;
    pickerTarget.classList.add("browser-monitor-picker-target");
  }

  function handlePickerMove(event) {
    if (!pickerTooltip) return;
    pickerTooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - 230)}px`;
    pickerTooltip.style.top = `${Math.min(event.clientY + 14, innerHeight - 46)}px`;
  }

  async function blockSelectedElement(element) {
    if (!element || element === document.body || element === document.documentElement) return false;
    const selector = selectorForElement(element);
    const result = await chrome.runtime.sendMessage({ kind: "addCustomCosmeticFilter", selector });
    if (result?.ok) showElementPickerUndo(result.selector);
    return result?.ok === true;
  }

  async function handlePickerClick(event) {
    if (!pickerTarget || pickerTarget === document.body || pickerTarget === document.documentElement) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = pickerTarget;
    stopElementPicker();
    await blockSelectedElement(target);
  }

  function showElementPickerUndo(selector) {
    clearTimeout(undoElementPickerTimer);
    undoElementPickerToast?.remove();
    const toast = document.createElement("div");
    toast.id = "browser-monitor-element-undo";
    toast.innerHTML = `
      <style>
        #browser-monitor-element-undo {
          position: fixed !important;
          right: 18px !important;
          bottom: 18px !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          max-width: min(430px, calc(100vw - 36px)) !important;
          padding: 10px !important;
          border: 1px solid rgba(255,255,255,.16) !important;
          border-radius: 10px !important;
          color: #f5f7f7 !important;
          background: rgba(28, 34, 37, .96) !important;
          box-shadow: 0 12px 34px rgba(0,0,0,.28) !important;
          font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        #browser-monitor-element-undo span { min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
        #browser-monitor-element-undo button {
          flex: none !important;
          height: 28px !important;
          padding: 0 10px !important;
          border: 0 !important;
          border-radius: 7px !important;
          color: #f5f7f7 !important;
          background: rgba(139,164,176,.34) !important;
          font: 700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          cursor: pointer !important;
        }
      </style>
      <span>Element hidden</span>
      <button type="button" data-action="undo">Undo</button>
      <button type="button" data-action="restore">Restore all</button>
    `;
    toast.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "undo") {
        await chrome.runtime.sendMessage({ kind: "removeCustomCosmeticFilter", selector });
        toast.remove();
      }
      if (action === "restore") {
        await chrome.runtime.sendMessage({ kind: "clearCustomCosmeticFilters" });
        toast.remove();
      }
    });
    document.documentElement.append(toast);
    undoElementPickerToast = toast;
    undoElementPickerTimer = setTimeout(() => toast.remove(), 12_000);
  }

  function handlePickerKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      stopElementPicker();
    }
  }

  function startElementPicker() {
    if (pickerActive) return;
    pickerActive = true;
    const style = document.createElement("style");
    style.id = "browser-monitor-picker-style";
    style.textContent = `
      .browser-monitor-picker-target { outline: 2px solid #8ba4b0 !important; outline-offset: 2px !important; cursor: crosshair !important; }
      #browser-monitor-picker-tooltip { position: fixed !important; z-index: 2147483647 !important; padding: 8px 10px !important; border-radius: 8px !important; background: #202224 !important; color: #f2f2f2 !important; font: 12px -apple-system, sans-serif !important; box-shadow: 0 4px 18px rgba(0,0,0,.3) !important; pointer-events: none !important; }
    `;
    (document.head || document.documentElement).append(style);
    pickerTooltip = document.createElement("div");
    pickerTooltip.id = "browser-monitor-picker-tooltip";
    pickerTooltip.textContent = "Click to hide · Esc to cancel";
    document.documentElement.append(pickerTooltip);
    document.addEventListener("mouseover", handlePickerHover, true);
    document.addEventListener("mousemove", handlePickerMove, true);
    document.addEventListener("click", handlePickerClick, true);
    document.addEventListener("keydown", handlePickerKey, true);
  }

  function countBackgroundEvent() {
    if (document.visibilityState === "hidden") {
      state.backgroundEventCount += 1;
    }
  }

  function rememberPerformanceEvent(type, values = {}) {
    recentPerformanceEvents.push({ type, at: Date.now(), background: document.hidden, ...values });
    const cutoff = Date.now() - 60_000;
    while (recentPerformanceEvents[0]?.at < cutoff) recentPerformanceEvents.shift();
    if (recentPerformanceEvents.length > 300) recentPerformanceEvents.splice(0, recentPerformanceEvents.length - 300);
  }

  function observe(type, callback) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()));
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch {
      // Unsupported performance entry types are optional signals.
    }
  }

  function startObservers() {
    if (observers.length > 0) return;
    state.sampleStartedAt = performance.now();

    observe("long-animation-frame", (entries) => {
      for (const entry of entries) {
        state.longFrameCount += 1;
        state.blockingDurationMS += entry.blockingDuration ?? entry.duration ?? 0;
        for (const script of entry.scripts ?? []) {
          state.forcedStyleAndLayoutDurationMS += script.forcedStyleAndLayoutDuration ?? 0;
        }
        rememberPerformanceEvent("long-frame", { durationMS: entry.blockingDuration ?? entry.duration ?? 0 });
        countBackgroundEvent();
      }
    });

    observe("resource", (entries) => {
      for (const entry of entries) {
        state.resourceCount += 1;
        state.transferBytes += Math.max(entry.transferSize ?? 0, entry.encodedBodySize ?? 0);
        rememberPerformanceEvent("request", { bytes: Math.max(entry.transferSize ?? 0, entry.encodedBodySize ?? 0), initiatorType: entry.initiatorType ?? "other" });
        countBackgroundEvent();
      }
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          state.layoutShiftScore += entry.value ?? 0;
          rememberPerformanceEvent("layout-shift", { value: entry.value ?? 0 });
          countBackgroundEvent();
        }
      }
    });
  }

  function stopObservers() {
    for (const observer of observers.splice(0)) {
      observer.disconnect();
    }
  }

  function updateEnabled(enabled) {
    state.enabled = enabled;
    if (enabled) startObservers();
    else stopObservers();
  }

  function pauseMediaElement(element) {
    if (!mediaStates.has(element)) {
      mediaStates.set(element, { wasPaused: element.paused, wasMuted: element.muted });
    }
    element.pause();
    element.muted = true;
  }

  function pausePageActivity() {
    for (const element of document.querySelectorAll("audio, video")) {
      pauseMediaElement(element);
    }
    for (const animation of document.getAnimations()) {
      if (typeof CSSAnimation !== "undefined" && animation instanceof CSSAnimation) {
        continue;
      }
      if (!animationStates.has(animation)) {
        animationStates.set(animation, animation.playState);
      }
      animation.pause();
    }
  }

  function scheduleEcoModeScan() {
    if (ecoScanTimer || !state.ecoModeEnabled) return;
    ecoScanTimer = setTimeout(() => {
      ecoScanTimer = null;
      if (state.ecoModeEnabled && state.ecoModeLevel !== "limit") pausePageActivity();
    }, document.hidden ? ECO_HIDDEN_SCAN_DELAY_MS : ECO_SCAN_DELAY_MS);
  }

  function setEcoMode(enabled, level = "limit") {
    state.ecoModeEnabled = enabled;
    state.ecoModeLevel = level;
    let style = document.querySelector("#browser-monitor-eco-style");
    if (enabled) {
      if (level !== "limit" && !style) {
        style = document.createElement("style");
        style.id = "browser-monitor-eco-style";
        style.textContent = "*, *::before, *::after { animation-play-state: paused !important; scroll-behavior: auto !important; }";
        (document.head || document.documentElement).append(style);
      }
      if (level !== "limit") pausePageActivity();
      ecoObserver?.disconnect();
      ecoObserver = null;
      if (level !== "limit") {
        ecoObserver = new MutationObserver(scheduleEcoModeScan);
        ecoObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
    } else {
      ecoObserver?.disconnect();
      ecoObserver = null;
      clearTimeout(ecoScanTimer);
      ecoScanTimer = null;
      style?.remove();
      for (const [element, previous] of mediaStates) {
        if (!element.isConnected) continue;
        element.muted = previous.wasMuted;
        if (!previous.wasPaused) element.play().catch(() => {});
      }
      mediaStates.clear();
      for (const [animation, previousState] of animationStates) {
        if (previousState === "running") animation.play();
      }
      animationStates.clear();
    }
  }

  function pageNoticeCopy(kind, values = {}) {
    const russian = searchProtectionLanguage === "ru";
    if (kind === "cryptoMismatch") {
      return russian
        ? `Crypto Guard остановил замену «${values.original}» на «${values.changed}».`
        : `Crypto Guard stopped “${values.original}” from being replaced with “${values.changed}”.`;
    }
    if (kind === "cryptoCleaned") {
      return russian
        ? "Crypto Guard удалил скрытые символы и скопировал чистый адрес."
        : "Crypto Guard removed hidden characters and copied the clean address.";
    }
    if (kind === "cryptoFailed") {
      return russian
        ? "Crypto Guard не смог безопасно скопировать адрес. Скопируйте его ещё раз."
        : "Crypto Guard could not copy the address safely. Please copy it again.";
    }
    if (kind === "clipboardBlocked") return russian ? "Сайт попытался заблокировать обычную вставку. Browser Monitor восстановил текст." : "The site tried to block a normal paste. Browser Monitor restored the text.";
    if (kind === "clipboardChanged") return russian
      ? `Скопировано: “${values.original}”. Сайт попытался заменить на: “${values.changed}”.`
      : `Copied: “${values.original}”. The site tried to replace it with: “${values.changed}”.`;
    if (kind === "clipboardIntercepted") return russian ? "Сайт перехватил событие буфера обмена. Содержимое не отправлялось из браузера." : "The site intercepted a clipboard event. Clipboard content did not leave the browser.";
    return "";
  }

  function showPageNotice(kind, values = {}) {
    const text = pageNoticeCopy(kind, values);
    if (!text) return;
    const noticeID = "browser-monitor-page-notice";
    document.querySelector(`#${noticeID}`)?.remove();
    const host = document.createElement("div");
    host.id = noticeID;
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        :host { position:fixed; right:18px; bottom:18px; z-index:2147483647; display:block; max-width:min(340px,calc(100vw - 36px)); }
        .notice { display:grid; grid-template-columns:8px minmax(0,1fr) 20px; align-items:start; gap:10px; padding:12px 12px 12px 14px; border:1px solid rgba(62,72,78,.18); border-radius:12px; background:rgba(248,249,247,.96); color:#283035; box-shadow:0 10px 30px rgba(17,24,28,.16); backdrop-filter:blur(12px); font:500 12px/1.42 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        i { width:7px; height:7px; margin-top:5px; border-radius:50%; background:${kind.startsWith("crypto") ? "#a6623e" : "#4b725c"}; }
        button { width:20px; height:20px; padding:0; border:0; border-radius:6px; background:transparent; color:#6f777b; cursor:pointer; font:16px/20px inherit; }
        button:hover, button:focus-visible { background:rgba(0,0,0,.06); outline:none; }
        @media (prefers-color-scheme:dark) { .notice { border-color:rgba(255,255,255,.12); background:rgba(27,30,31,.96); color:#edf0f1; box-shadow:0 12px 34px rgba(0,0,0,.32); } button { color:#aeb7bb; } }
      </style>
      <div class="notice" role="status"><i></i><span></span><button type="button" aria-label="Close">×</button></div>
    `;
    shadow.querySelector("span").textContent = text;
    shadow.querySelector("button").addEventListener("click", () => host.remove());
    (document.documentElement || document).append(host);
    setTimeout(() => host.remove(), 8_000);
  }

  function continueWatchingResumeURL(url, position) {
    try {
      const parsed = new URL(url || location.href, location.href);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if ((host === "youtube.com" || host === "youtu.be") && Number.isFinite(position) && position > 0) {
        parsed.searchParams.set("t", `${Math.max(0, Math.floor(position))}s`);
      }
      return parsed.href;
    } catch {
      return location.href;
    }
  }

  function showContinueWatchingNotice(video, { title, time, url, position }) {
    const russian = searchProtectionLanguage === "ru";
    const noticeID = "browser-monitor-page-notice";
    document.querySelector(`#${noticeID}`)?.remove();
    const host = document.createElement("div");
    host.id = noticeID;
    host.dataset.browserMonitorNotice = "continue-watching";
    host.dataset.browserMonitorMediaTitle = title;
    host.dataset.browserMonitorMediaTime = time;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { position:fixed; right:18px; bottom:18px; z-index:2147483647; display:block; width:min(370px,calc(100vw - 36px)); }
        .notice { position:relative; padding:14px 42px 14px 16px; border:1px solid rgba(62,72,78,.18); border-radius:14px; background:rgba(248,249,247,.97); color:#283035; box-shadow:0 12px 34px rgba(17,24,28,.18); backdrop-filter:blur(12px); font:500 12px/1.42 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .eyebrow { display:flex; align-items:center; gap:7px; margin-bottom:5px; color:#4b725c; font-size:11px; font-weight:700; letter-spacing:.02em; }
        .eyebrow::before { content:""; width:7px; height:7px; border-radius:50%; background:#4b725c; }
        a { display:block; overflow:hidden; margin-bottom:4px; color:inherit; font-size:13px; font-weight:700; text-decoration:none; text-overflow:ellipsis; white-space:nowrap; }
        a:hover, a:focus-visible { color:#315e47; text-decoration:underline; outline:none; }
        .time { color:#657076; }
        .actions { display:flex; margin-top:11px; }
        button { border:0; cursor:pointer; font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .go { min-height:30px; padding:0 11px; border-radius:8px; background:#dfeae3; color:#315e47; }
        .go:hover, .go:focus-visible { background:#d3e3d8; outline:2px solid rgba(65,113,88,.22); }
        .close { position:absolute; top:10px; right:10px; width:24px; height:24px; padding:0; border-radius:7px; background:transparent; color:#6f777b; font-size:17px; line-height:24px; }
        .close:hover, .close:focus-visible { background:rgba(0,0,0,.06); outline:none; }
        @media (prefers-color-scheme:dark) {
          .notice { border-color:rgba(255,255,255,.12); background:rgba(27,30,31,.97); color:#edf0f1; box-shadow:0 12px 34px rgba(0,0,0,.34); }
          .eyebrow { color:#8db49b; } .eyebrow::before { background:#8db49b; }
          .time { color:#aeb7bb; } a:hover, a:focus-visible { color:#a8cfb4; }
          .go { background:#30453a; color:#b7dbc2; } .go:hover, .go:focus-visible { background:#395244; }
          .close { color:#aeb7bb; }
        }
      </style>
      <div class="notice" role="status" aria-live="polite">
        <div class="eyebrow"></div>
        <a></a>
        <div class="time"></div>
        <div class="actions"><button class="go" type="button"></button></div>
        <button class="close" type="button">×</button>
      </div>
    `;
    const link = shadow.querySelector("a");
    link.href = url;
    link.textContent = title;
    shadow.querySelector(".eyebrow").textContent = russian ? "Продолжить просмотр" : "Continue watching";
    shadow.querySelector(".time").textContent = russian
      ? `Вы остановились на ${time}. Позиция хранится только локально.`
      : `You stopped at ${time}. The position is stored locally only.`;
    const goButton = shadow.querySelector(".go");
    goButton.textContent = russian ? `Продолжить с ${time}` : `Resume at ${time}`;
    goButton.addEventListener("click", () => {
      const targetURL = continueWatchingResumeURL(url, position);
      if (targetURL && targetURL !== location.href) {
        location.href = targetURL;
        return;
      }
      if (Number.isFinite(position) && position > 0) restoreContinueWatchingPosition(video, position);
      video.scrollIntoView({ behavior: "smooth", block: "center" });
      video.focus({ preventScroll: true });
    });
    const closeButton = shadow.querySelector(".close");
    closeButton.setAttribute("aria-label", russian ? "Закрыть" : "Close");
    closeButton.addEventListener("click", () => host.remove());
    (document.documentElement || document).append(host);
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function copiedSelectionText(event) {
    const target = event.target;
    if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
        && Number.isInteger(target.selectionStart) && Number.isInteger(target.selectionEnd)) {
      return target.value.slice(target.selectionStart, target.selectionEnd);
    }
    return document.getSelection()?.toString() ?? "";
  }

  function compactClipboardText(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length <= 48 ? text : `${text.slice(0, 22)}…${text.slice(-22)}`;
  }

  function watchClipboardCopy(event) {
    if (!cryptoGuardEnabled) return;
    const original = copiedSelectionText(event);
    if (!original || globalThis.BrowserMonitorPageGuard?.findWalletAddress(original)) return;
    setTimeout(() => {
      const changed = event.clipboardData?.getData("text/plain") ?? "";
      if (event.defaultPrevented && changed && changed !== original) {
        showPageNotice("clipboardChanged", { original: compactClipboardText(original), changed: compactClipboardText(changed) });
      } else if (event.defaultPrevented) {
        showPageNotice("clipboardIntercepted");
      }
    });
  }

  function watchClipboardPaste(event) {
    if (!cryptoGuardEnabled) return;
    const value = event.clipboardData?.getData("text/plain") ?? "";
    if (!value || globalThis.BrowserMonitorPageGuard?.findWalletAddress(value)) return;
    setTimeout(() => {
      if (!event.defaultPrevented) return;
      if (insertPastedText(event.target, value)) showPageNotice("clipboardBlocked");
      else showPageNotice("clipboardIntercepted");
    });
  }

  async function rememberCryptoCopy(address) {
    if (!cryptoGuardEnabled) return;
    const fingerprint = await sha256(address.value);
    cryptoGuardCopy = { fingerprint, family: address.family, value: address.value, expiresAt: Date.now() + CRYPTO_GUARD_COPY_TTL_MS };
    await chrome.runtime.sendMessage({
      kind: "rememberCryptoGuardCopy",
      fingerprint,
      family: address.family
    }).catch(() => {});
  }

  function handleCryptoCopy(event) {
    if (!cryptoGuardEnabled) return;
    const address = globalThis.BrowserMonitorPageGuard?.findWalletAddress(copiedSelectionText(event));
    if (!address || !event.clipboardData) return;
    try {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.clipboardData.clearData();
      event.clipboardData.setData("text/plain", address.value);
      void rememberCryptoCopy(address);
      if (address.changed) showPageNotice("cryptoCleaned");
    } catch {
      showPageNotice("cryptoFailed");
    }
  }

  function insertPastedText(target, value) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = Number.isInteger(target.selectionStart) ? target.selectionStart : target.value.length;
      const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : start;
      target.setRangeText(value, start, end, "end");
      target.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromPaste",
        data: value
      }));
      return true;
    }
    const editable = target?.closest?.("[contenteditable=''], [contenteditable='true']");
    if (!editable) return false;
    const selection = document.getSelection();
    if (!selection?.rangeCount) return false;
    selection.deleteFromDocument();
    const text = document.createTextNode(value);
    const range = selection.getRangeAt(0);
    range.insertNode(text);
    range.setStartAfter(text);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    editable.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertFromPaste",
      data: value
    }));
    return true;
  }

  function handleCryptoPaste(event) {
    if (!cryptoGuardEnabled) return;
    const address = globalThis.BrowserMonitorPageGuard?.findWalletAddress(event.clipboardData?.getData("text/plain"));
    if (!address) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = event.target;
    sha256(address.value).then(async (fingerprint) => {
      let result;
      if (cryptoGuardCopy?.expiresAt > Date.now()) {
        result = {
          known: true,
          matches: cryptoGuardCopy.family === address.family && cryptoGuardCopy.fingerprint === fingerprint
        };
      } else {
        result = await chrome.runtime.sendMessage({
          kind: "verifyCryptoGuardPaste",
          fingerprint,
          family: address.family
        }).catch(() => ({ known: false, matches: true }));
      }
      if (result?.known && result.matches === false) {
        showPageNotice("cryptoMismatch", {
          original: compactClipboardText(cryptoGuardCopy?.value ?? "known address"),
          changed: compactClipboardText(address.value)
        });
        return;
      }
      if (!insertPastedText(target, address.value)) showPageNotice("cryptoFailed");
    }).catch(() => showPageNotice("cryptoFailed"));
  }

  function mediaIdentityText() {
    const youtubeTitle = /(^|\.)youtube\.com$/i.test(location.hostname)
      ? document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string")?.textContent
      : "";
    return youtubeTitle
      || document.querySelector("meta[property='og:title']")?.content
      || document.querySelector("main h1, article h1, h1")?.textContent
      || document.title;
  }

  function mediaDisplayTitle() {
    return String(mediaIdentityText() ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
  }

  function structuredMediaTypes() {
    const found = new Set();
    for (const script of [...document.querySelectorAll("script[type='application/ld+json']")].slice(0, 10)) {
      const source = String(script.textContent ?? "").slice(0, 80_000);
      for (const match of source.matchAll(/"@type"\s*:\s*"(VideoObject|Movie|TVEpisode|TVSeries|Episode)"/gi)) {
        found.add(match[1]);
      }
    }
    return [...found];
  }

  function continueWatchingClassification(video) {
    const rect = video.getBoundingClientRect();
    const width = Math.max(rect.width, video.videoWidth || 0, Number(video.getAttribute("width")) || 0);
    const height = Math.max(rect.height, video.videoHeight || 0, Number(video.getAttribute("height")) || 0);
    const playerHint = Boolean(video.closest([
      ".html5-video-player",
      ".video-js",
      ".jwplayer",
      ".plyr",
      ".shaka-video-container",
      "[data-player]",
      "[class*='video-player' i]",
      "[class*='movie-player' i]"
    ].join(",")));
    return globalThis.BrowserMonitorPageGuard?.classifyLongFormMedia({
      hostname: location.hostname,
      pathname: location.pathname,
      duration: video.duration,
      width,
      height,
      videoCount: document.querySelectorAll("video").length,
      ogType: document.querySelector("meta[property='og:type']")?.content ?? "",
      structuredTypes: structuredMediaTypes(),
      playerHint,
      advertisement: isAdvertisementVideo(video),
      title: mediaDisplayTitle()
    }) ?? { supported: false, reason: "guard-unavailable" };
  }

  function formatPlaybackTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function mediaPresentation(title) {
    const types = structuredMediaTypes().map((value) => value.toLowerCase());
    const params = new URLSearchParams(location.search);
    const season = params.get("season") || params.get("s");
    const episodeNumber = params.get("episode") || params.get("ep") || params.get("e");
    const titleEpisode = title.match(/\b(s\d{1,2}\s*e\d{1,3}|\d{1,3}\s*(?:серия|эпизод)|(?:серия|эпизод)\s*\d{1,3})\b/i)?.[1] ?? "";
    const episode = season && episodeNumber
      ? `S${season} · E${episodeNumber}`
      : episodeNumber
        ? `E${episodeNumber}`
        : titleEpisode.replace(/\s+/g, " ").trim();
    const episodic = types.some((value) => ["tvepisode", "tvseries", "episode"].includes(value))
      || Boolean(episode)
      || /\b(?:series|serial|season|episode|серия|сезон|эпизод)\b/i.test(`${title} ${location.pathname}`);
    const movie = types.includes("movie")
      || /\b(?:film|movie|фильм|кино)\b/i.test(`${title} ${location.pathname}`);
    return {
      episode,
      mediaType: episodic ? "episode" : movie ? "movie" : "video"
    };
  }

  function continueWatchingSource(title) {
    return globalThis.BrowserMonitorPageGuard?.mediaIdentitySource(
      location.hostname,
      title,
      location.pathname,
      location.search
    );
  }

  async function continueWatchingIdentity(source) {
    return source && source.length >= 5 ? sha256(`media:${source}`) : "";
  }

  function restoreContinueWatchingPosition(video, position) {
    const apply = () => {
      if (!video.isConnected || video.ended || video.currentTime >= 5) return;
      try {
        if (typeof video.fastSeek === "function") video.fastSeek(position);
        else video.currentTime = position;
      } catch {
        try { video.currentTime = position; } catch {}
      }
    };
    apply();
    const onMediaReady = () => apply();
    video.addEventListener("loadeddata", onMediaReady, { once: true });
    video.addEventListener("canplay", onMediaReady, { once: true });
    setTimeout(apply, 250);
    setTimeout(apply, 1_000);
  }

  async function initializeContinueWatching(video) {
    if (!continueWatchingEnabled) return;
    if (!(video instanceof HTMLVideoElement) || isAdvertisementVideo(video)) return;
    if (!Number.isFinite(video.duration) || video.duration < 120) return;
    const classification = continueWatchingClassification(video);
    if (!classification.supported) return;
    const title = mediaDisplayTitle();
    const source = continueWatchingSource(title);
    if (continueWatchingVideos.get(video)?.source === source) return;
    const identity = await continueWatchingIdentity(source);
    if (!identity || !video.isConnected) return;
    if (continueWatchingVideos.get(video)?.identity === identity) return;
    const presentation = mediaPresentation(title);
    const state = { identity, source, lastSavedAt: 0, title, ...presentation };
    continueWatchingVideos.set(video, state);
    const saved = await chrome.runtime.sendMessage({
      kind: "getContinueWatchingPosition",
      identity
    }).catch(() => null);
    const position = Number(saved?.position);
    if (Number.isFinite(position) && position > 10 && position < video.duration - 20 && video.currentTime < 5) {
      restoreContinueWatchingPosition(video, position);
      showContinueWatchingNotice(video, {
        title,
        time: formatPlaybackTime(position),
        url: saved?.url || location.href,
        position
      });
    }
  }

  function saveContinueWatching(video, { completed = false, force = false } = {}) {
    if (!continueWatchingEnabled) return;
    const state = continueWatchingVideos.get(video);
    if (!state || !Number.isFinite(video.duration) || video.duration < 120) return;
    const now = Date.now();
    if (!force && !completed && now - state.lastSavedAt < 15_000) return;
    state.lastSavedAt = now;
    const position = Number(video.currentTime);
    chrome.runtime.sendMessage({
      kind: "setContinueWatchingPosition",
      identity: state.identity,
      position,
      duration: video.duration,
      title: state.title,
      episode: state.episode,
      mediaType: state.mediaType,
      pageURL: location.href,
      completed: completed || position >= video.duration - 20
    }).catch(() => {});
  }

  async function initializeAndSaveContinueWatching(video) {
    await initializeContinueWatching(video);
    saveContinueWatching(video, { force: true });
  }

  async function refreshAndSaveContinueWatching(video) {
    await initializeContinueWatching(video);
    saveContinueWatching(video);
  }

  function scheduleContinueWatchingIdentityCheck() {
    if (!continueWatchingEnabled) return;
    clearTimeout(continueWatchingIdentityTimer);
    continueWatchingIdentityTimer = setTimeout(() => {
      continueWatchingIdentityTimer = null;
      document.querySelectorAll("video").forEach((video) => {
        if (video.readyState >= 1) void initializeContinueWatching(video);
      });
    }, 120);
  }

  function storageSizeBytes(storage) {
    let bytes = 0;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index) ?? "";
        bytes += new Blob([key, storage.getItem(key) ?? ""]).size;
      }
    } catch {}
    return bytes;
  }

  async function pagePrivacySignals() {
    let firstPartyCookies = 0;
    let localStorageKeys = 0;
    let sessionStorageKeys = 0;
    let localStorageBytes = 0;
    let sessionStorageBytes = 0;
    try { firstPartyCookies = document.cookie ? document.cookie.split(";").filter(Boolean).length : 0; } catch {}
    try { localStorageKeys = localStorage.length; localStorageBytes = storageSizeBytes(localStorage); } catch {}
    try { sessionStorageKeys = sessionStorage.length; sessionStorageBytes = storageSizeBytes(sessionStorage); } catch {}
    const [indexedDatabases, cacheNames, serviceWorkers, estimate] = await Promise.all([
      globalThis.indexedDB?.databases?.().catch(() => []) ?? Promise.resolve([]),
      globalThis.caches?.keys?.().catch(() => []) ?? Promise.resolve([]),
      navigator.serviceWorker?.getRegistrations?.().catch(() => []) ?? Promise.resolve([]),
      navigator.storage?.estimate?.().catch(() => ({})) ?? Promise.resolve({})
    ]);
    return {
      firstPartyCookies,
      localStorageKeys,
      sessionStorageKeys,
      localStorageBytes,
      sessionStorageBytes,
      indexedDBCount: indexedDatabases.length,
      cacheStorageCount: cacheNames.length,
      serviceWorkerCount: serviceWorkers.length,
      storageUsageBytes: Number(estimate.usage) || 0,
      storageQuotaBytes: Number(estimate.quota) || 0,
      notificationPermission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      secureContext: window.isSecureContext
    };
  }

  const ACTIVITY_SAMPLE_MS = 15_000;
  const ACTIVITY_IDLE_MS = 45_000;
  const VIDEO_AD_MARKER = /\b(ad|ads|advert|advertisement|commercial|preroll|midroll|outstream|ima-container)\b/i;
  let lastActivityInteractionAt = 0;
  let activityVisitRecorded = false;
  let activityURL = location.href;
  let readablePageCache = { checkedAt: 0, value: false };

  function noteActivityInteraction() {
    lastActivityInteractionAt = Date.now();
    scheduleActivitySample();
  }

  function scheduleActivitySample() {
    if (activitySampleTimer || document.visibilityState !== "visible") return;
    activitySampleTimer = setTimeout(() => {
      activitySampleTimer = null;
      recordActivitySample();
      if (Date.now() - lastActivityInteractionAt <= ACTIVITY_IDLE_MS) scheduleActivitySample();
    }, ACTIVITY_SAMPLE_MS);
  }

  function elementIsVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width >= 240 && rect.height >= 135 && style.visibility !== "hidden" && style.display !== "none"
      && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  }

  function isAdvertisementVideo(video) {
    let node = video;
    for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      const markers = `${node.id} ${node.className} ${node.getAttribute?.("aria-label") ?? ""}`;
      if (VIDEO_AD_MARKER.test(markers)) return true;
    }
    return Boolean(video.closest("ytd-ad-slot-renderer, .video-ads, .ima-ad-container, [data-ad], [data-ad-slot]"));
  }

  function hasActiveContentVideo() {
    return [...document.querySelectorAll("video")].some((video) =>
      !video.paused && !video.ended && video.readyState >= 2 && elementIsVisible(video) && !isAdvertisementVideo(video)
    );
  }

  function pageLooksReadable() {
    const now = Date.now();
    if (now - readablePageCache.checkedAt < 30_000) return readablePageCache.value;
    const root = document.querySelector("article, main, [role='main']") ?? document.body;
    const textLength = String(root?.innerText ?? "").replace(/\s+/g, " ").trim().length;
    readablePageCache = { checkedAt: now, value: textLength >= 1_200 };
    return readablePageCache.value;
  }

  function recordActivitySample() {
    if (location.href !== activityURL) {
      activityURL = location.href;
      activityVisitRecorded = false;
      readablePageCache.checkedAt = 0;
    }
    const recentlyUsed = Date.now() - lastActivityInteractionAt <= ACTIVITY_IDLE_MS;
    if (document.visibilityState !== "visible" || !document.hasFocus() || !recentlyUsed) return;
    const video = hasActiveContentVideo();
    const reading = !video && pageLooksReadable();
    chrome.runtime.sendMessage({
      kind: "recordSiteActivity",
      visit: !activityVisitRecorded,
      activeSeconds: ACTIVITY_SAMPLE_MS / 1_000,
      videoSeconds: video ? ACTIVITY_SAMPLE_MS / 1_000 : 0,
      readingSeconds: reading ? ACTIVITY_SAMPLE_MS / 1_000 : 0
    }).then(() => {
      activityVisitRecorded = true;
    }).catch(() => {});
  }

  document.addEventListener("pointerdown", () => {
    pageHasUserGesture = true;
    noteActivityInteraction();
  }, { capture: true, passive: true });
  document.addEventListener("keydown", () => {
    pageHasUserGesture = true;
    noteActivityInteraction();
  }, { capture: true });
  document.addEventListener("scroll", noteActivityInteraction, { capture: true, passive: true });
  document.addEventListener("touchstart", noteActivityInteraction, { capture: true, passive: true });
  document.addEventListener("copy", handleCryptoCopy, true);
  document.addEventListener("paste", handleCryptoPaste, true);
  document.addEventListener("copy", watchClipboardCopy, true);
  document.addEventListener("paste", watchClipboardPaste, true);
  window.addEventListener("browser-monitor-crypto-copy", (event) => {
    if (!cryptoGuardEnabled) return;
    const address = globalThis.BrowserMonitorPageGuard?.detectWalletAddress(event.detail?.value);
    if (!address) return;
    void rememberCryptoCopy(address);
    if (event.detail?.changed) showPageNotice("cryptoCleaned");
  });
  window.addEventListener("browser-monitor-crypto-copy-error", () => {
    if (cryptoGuardEnabled) showPageNotice("cryptoFailed");
  });
  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLVideoElement) void initializeContinueWatching(event.target);
  }, true);
  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLVideoElement) void initializeContinueWatching(event.target);
  }, true);
  document.addEventListener("timeupdate", (event) => {
    if (event.target instanceof HTMLVideoElement) void refreshAndSaveContinueWatching(event.target);
  }, true);
  document.addEventListener("pause", (event) => {
    if (event.target instanceof HTMLVideoElement) saveContinueWatching(event.target, { force: true });
  }, true);
  document.addEventListener("seeked", (event) => {
    if (event.target instanceof HTMLVideoElement) void initializeAndSaveContinueWatching(event.target);
  }, true);
  document.addEventListener("ended", (event) => {
    if (event.target instanceof HTMLVideoElement) saveContinueWatching(event.target, { completed: true, force: true });
  }, true);
  document.addEventListener("emptied", (event) => {
    if (event.target instanceof HTMLVideoElement) continueWatchingVideos.delete(event.target);
  }, true);
  document.addEventListener("durationchange", (event) => {
    if (event.target instanceof HTMLVideoElement) void initializeContinueWatching(event.target);
  }, true);
  window.addEventListener("pagehide", () => {
    document.querySelectorAll("video").forEach((video) => saveContinueWatching(video, { force: true }));
  });
  document.addEventListener("visibilitychange", () => {
    state.hiddenSince = document.hidden ? (state.hiddenSince ?? performance.now()) : null;
    if (document.hidden) {
      clearTimeout(activitySampleTimer);
      activitySampleTimer = null;
      document.querySelectorAll("video").forEach((video) => saveContinueWatching(video, { force: true }));
    } else {
      scheduleActivitySample();
    }
  });
  window.addEventListener("popstate", scheduleContinueWatchingIdentityCheck);
  document.addEventListener("yt-navigate-finish", scheduleContinueWatchingIdentityCheck);
  const continueWatchingIdentityObserver = new MutationObserver(scheduleContinueWatchingIdentityCheck);
  const observeContinueWatchingIdentity = () => {
    if (document.head) {
      continueWatchingIdentityObserver.observe(document.head, {
        attributes: true,
        attributeFilter: ["content"],
        characterData: true,
        childList: true,
        subtree: true
      });
    }
  };
  if (document.head) observeContinueWatchingIdentity();
  else document.addEventListener("DOMContentLoaded", observeContinueWatchingIdentity, { once: true });
  scheduleActivitySample();
  document.addEventListener("play", (event) => {
    if (protectionSettings.autoplayBlockingEnabled && !pageHasUserGesture) {
      event.target?.pause?.();
    }
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(protectionScanTimer);
      protectionScanTimer = null;
      protectionObserver?.disconnect();
      historyPrivacyObserver?.disconnect();
      searchProtectionObserver?.disconnect();
      return;
    }
    if (protectionObserver) {
      protectionObserver.observe(document.documentElement, { childList: true, subtree: true });
      scheduleProtectionScan(0);
    }
    if (state.ecoModeEnabled) scheduleEcoModeScan();
    if (historyPrivacyObserver) {
      historyPrivacyObserver.observe(document.documentElement, { childList: true, subtree: true });
      scheduleHistoryPrivacyScan();
    }
    if (searchProtectionObserver) {
      searchProtectionObserver.observe(document.documentElement, { childList: true, subtree: true });
      scheduleSearchProtectionScan();
    }
  });

  chrome.storage.local.get({
    extensionEnabled: true,
    monitoringEnabled: true,
    contentBlockingEnabled: true,
    historyPrivacySettings: { enabled: false, domains: [] },
    browserProtectionSettings: protectionSettings,
    temporarySitePauses: {},
    customSubscriptionCosmeticFilters: [],
    imageSwapCustomImages: [],
    linkSafetyAllowedDomains: [],
    featurePreferences: { cryptoGuardEnabled: true, continueWatchingEnabled: true, trackingCleanerEnabled: true },
    uiPreferences: { language: null, theme: "system" }
  }).then(({
    extensionEnabled: storedExtensionEnabled,
    monitoringEnabled,
    contentBlockingEnabled: blockingEnabled,
    historyPrivacySettings,
    browserProtectionSettings,
    temporarySitePauses: pauses,
    customSubscriptionCosmeticFilters,
    imageSwapCustomImages: storedCustomImages,
    linkSafetyAllowedDomains,
    featurePreferences,
    uiPreferences
  }) => {
    temporarySitePauses = pauses;
    extensionEnabled = storedExtensionEnabled !== false;
    configuredMonitoringEnabled = monitoringEnabled !== false;
    configuredContentBlockingEnabled = blockingEnabled !== false;
    contentBlockingEnabled = extensionEnabled && configuredContentBlockingEnabled;
    subscriptionCosmeticFilters = customSubscriptionCosmeticFilters;
    imageSwapCustomImages = Array.isArray(storedCustomImages) ? storedCustomImages.slice(0, 9) : [];
    cryptoGuardEnabled = featurePreferences?.cryptoGuardEnabled !== false;
    continueWatchingEnabled = featurePreferences?.continueWatchingEnabled !== false;
    trackingCleanerEnabled = featurePreferences?.trackingCleanerEnabled !== false;
    window.dispatchEvent(new CustomEvent("browser-monitor-crypto-guard-state", { detail: { enabled: cryptoGuardEnabled } }));
    updateEnabled(effectiveMonitoringEnabled(configuredMonitoringEnabled));
    applyProtectionSettings(browserProtectionSettings);
    configureHistoryPrivacy(historyPrivacySettings);
    configureSearchProtection({
      enabled: extensionEnabled && browserProtectionSettings?.searchProtectionEnabled !== false,
      language: uiPreferences?.language || (navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en"),
      trustedDomains: linkSafetyAllowedDomains
    });
    if (continueWatchingEnabled) {
      document.querySelectorAll("video").forEach((video) => {
        if (video.readyState >= 1) void initializeContinueWatching(video);
      });
    }
    chrome.runtime.sendMessage({ kind: "getEcoMode" }).then((response) => {
      setEcoMode(Boolean(response?.enabled), response?.level);
    }).catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.extensionEnabled) {
      extensionEnabled = changes.extensionEnabled.newValue !== false;
      contentBlockingEnabled = extensionEnabled && configuredContentBlockingEnabled;
      updateEnabled(effectiveMonitoringEnabled(configuredMonitoringEnabled));
      applyProtectionSettings(configuredProtectionSettings);
      configureHistoryPrivacy({ enabled: historyPrivacyEnabled, domains: historyPrivacyDomains });
      configureSearchProtection({
        enabled: extensionEnabled && configuredProtectionSettings?.searchProtectionEnabled !== false,
        language: searchProtectionLanguage,
        trustedDomains: [...searchProtectionHosts]
      });
    }
    if (areaName === "local" && changes.historyPrivacySettings) {
      configureHistoryPrivacy(changes.historyPrivacySettings.newValue ?? {});
    }
    if (areaName === "local" && changes.linkSafetyAllowedDomains) {
      configureSearchProtection({
        enabled: extensionEnabled,
        language: searchProtectionLanguage,
        trustedDomains: changes.linkSafetyAllowedDomains.newValue ?? []
      });
    }
    if (areaName === "local" && changes.uiPreferences) {
      configureSearchProtection({
        enabled: extensionEnabled,
        language: changes.uiPreferences.newValue?.language
          || (navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en"),
        trustedDomains: [...searchProtectionHosts]
      });
    }
    if (areaName === "local" && changes.monitoringEnabled) {
      configuredMonitoringEnabled = changes.monitoringEnabled.newValue !== false;
      updateEnabled(effectiveMonitoringEnabled(configuredMonitoringEnabled));
    }
    if (areaName === "local" && changes.featurePreferences) {
      cryptoGuardEnabled = changes.featurePreferences.newValue?.cryptoGuardEnabled !== false;
      continueWatchingEnabled = changes.featurePreferences.newValue?.continueWatchingEnabled !== false;
      trackingCleanerEnabled = changes.featurePreferences.newValue?.trackingCleanerEnabled !== false;
      window.dispatchEvent(new CustomEvent("browser-monitor-crypto-guard-state", { detail: { enabled: cryptoGuardEnabled } }));
      if (!cryptoGuardEnabled) cryptoGuardCopy = null;
      if (!continueWatchingEnabled) {
        clearTimeout(continueWatchingIdentityTimer);
        continueWatchingIdentityTimer = null;
        document.querySelector('[data-browser-monitor-notice="continue-watching"]')?.remove();
      } else {
        document.querySelectorAll("video").forEach((video) => {
          if (video.readyState >= 1) void initializeContinueWatching(video);
        });
      }
    }
    if (areaName === "local" && changes.browserProtectionSettings) {
      configuredProtectionSettings = { ...protectionSettings, ...(changes.browserProtectionSettings.newValue ?? {}) };
      applyProtectionSettings(configuredProtectionSettings);
      configureSearchProtection({
        enabled: extensionEnabled && configuredProtectionSettings.searchProtectionEnabled !== false,
        language: searchProtectionLanguage,
        trustedDomains: [...searchProtectionHosts]
      });
    }
    if (areaName === "local" && changes.contentBlockingEnabled) {
      configuredContentBlockingEnabled = changes.contentBlockingEnabled.newValue !== false;
      contentBlockingEnabled = extensionEnabled && configuredContentBlockingEnabled;
      applyProtectionSettings(configuredProtectionSettings);
    }
    if (areaName === "local" && changes.customSubscriptionCosmeticFilters) {
      subscriptionCosmeticFilters = changes.customSubscriptionCosmeticFilters.newValue ?? [];
      applyProtectionSettings(configuredProtectionSettings);
    }
    if (areaName === "local" && changes.imageSwapCustomImages) {
      imageSwapCustomImages = Array.isArray(changes.imageSwapCustomImages.newValue)
        ? changes.imageSwapCustomImages.newValue.slice(0, 9)
        : [];
      restoreImageSwaps();
      configureImageSwap();
    }
    if (areaName === "local" && changes.temporarySitePauses) {
      temporarySitePauses = changes.temporarySitePauses.newValue ?? {};
      applyProtectionSettings(configuredProtectionSettings);
    }
  });

  document.addEventListener("click", handleLinkSafetyClick, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind === "playActivationAnimation") {
      playActivationAnimation();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.kind === "getPagePrivacySignals") {
      pagePrivacySignals().then(sendResponse).catch(() => sendResponse({}));
      return true;
    }
    if (message?.kind !== "getMetrics") return false;
    const recent = recentPerformanceEvents.filter((entry) => entry.at >= Date.now() - 60_000);
    const sum = (key) => recent.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
    sendResponse({
      available: state.enabled,
      sampleDurationSeconds: Math.max(0, (performance.now() - state.sampleStartedAt) / 1000),
      longFrameCount: state.longFrameCount,
      blockingDurationMS: state.blockingDurationMS,
      forcedStyleAndLayoutDurationMS: state.forcedStyleAndLayoutDurationMS,
      resourceCount: state.resourceCount,
      transferBytes: state.transferBytes,
      layoutShiftScore: state.layoutShiftScore,
      backgroundEventCount: state.backgroundEventCount,
      backgroundDurationSeconds: state.hiddenSince === null ? 0 : Math.max(0, (performance.now() - state.hiddenSince) / 1_000),
      mediaElementCount: document.querySelectorAll("audio, video").length,
      visibility: document.visibilityState === "hidden" ? "hidden" : "visible"
      ,recent: {
        sampleDurationSeconds: Math.min(60, Math.max(1, (performance.now() - state.sampleStartedAt) / 1000)),
        longFrameCount: recent.filter((entry) => entry.type === "long-frame").length,
        blockingDurationMS: sum("durationMS"),
        resourceCount: recent.filter((entry) => entry.type === "request").length,
        transferBytes: sum("bytes"),
        layoutShiftScore: sum("value"),
        backgroundEventCount: recent.filter((entry) => entry.background).length,
        timeline: recent.slice(-60)
      }
    });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "setEcoMode") return false;
    setEcoMode(Boolean(message.enabled), message.level);
    sendResponse({ ok: true });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "getPageRiskState") return false;
    const form = document.querySelector("form");
    const unsavedForm = [...document.querySelectorAll("input, textarea, select")].some((control) => {
      if (control.disabled || ["button", "submit", "reset", "hidden"].includes(control.type)) return false;
      if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) return control.checked !== control.defaultChecked;
      return String(control.value ?? "") !== String(control.defaultValue ?? "");
    });
    const activeMedia = [...document.querySelectorAll("audio, video")].some((media) => !media.paused && !media.ended);
    sendResponse({ unsavedForm: Boolean(form && unsavedForm), activeMedia });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "startElementPicker") return false;
    if (message.useContextTarget && contextMenuTarget
        && contextMenuTarget !== document.body && contextMenuTarget !== document.documentElement) {
      const target = contextMenuTarget;
      contextMenuTarget = null;
      blockSelectedElement(target).then((ok) => sendResponse({ ok })).catch(() => sendResponse({ ok: false }));
      return true;
    }
    startElementPicker();
    sendResponse({ ok: true });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "setHistoryPrivacyDomains") return false;
    configureHistoryPrivacy({
      enabled: message.enabled,
      domains: message.domains
    });
    sendResponse({ ok: true });
    return false;
  });
})();
