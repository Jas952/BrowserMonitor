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
    backgroundEventCount: 0
  };
  const observers = [];
  const mediaStates = new Map();
  const animationStates = new Map();
  let ecoObserver = null;
  let protectionObserver = null;
  let protectionScanTimer = null;
  let imageSwapObserver = null;
  let imageSwapScanTimer = null;
  const imageSwapReplacements = [];
  let pageHasUserGesture = false;
  let protectionSettings = {
    cookieBannerBlockingEnabled: false,
    newsletterBlockingEnabled: false,
    surveyBlockingEnabled: false,
    notificationPromptBlockingEnabled: false,
    autoplayBlockingEnabled: false,
    floatingVideoBlockingEnabled: false,
    cosmeticFilteringEnabled: true,
    customCosmeticFilters: [],
    imageSwapEnabled: false,
    imageSwapTheme: "landscape"
  };
  let configuredProtectionSettings = { ...protectionSettings };
  let temporarySitePauses = {};
  let contentBlockingEnabled = true;
  let subscriptionCosmeticFilters = [];
  let imageSwapCustomImages = [];

  const PROTECTION_STYLE_ID = "browser-monitor-protection-style";
  const ACTIVATION_OVERLAY_ID = "browser-monitor-activation-overlay";
  const FLOATING_VIDEO_CLASS = "browser-monitor-hidden-floating-video";
  const IMAGE_SWAP_CLASS = "browser-monitor-image-swap";
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

  function playActivationAnimation() {
    document.querySelector(`#${ACTIVATION_OVERLAY_ID}`)?.remove();

    const host = document.createElement("div");
    host.id = ACTIVATION_OVERLAY_ID;
    host.setAttribute("aria-hidden", "true");
    const shadow = host.attachShadow({ mode: "closed" });
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
          filter: drop-shadow(0 8px 18px rgba(10, 18, 22, .18));
        }
        .shield path {
          fill: rgba(86, 111, 120, .08);
          stroke: rgba(174, 201, 210, .92);
          stroke-width: 2;
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

  function scanOptionalPageControls() {
    protectionScanTimer = null;
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

  function scheduleProtectionScan() {
    if (protectionScanTimer) return;
    protectionScanTimer = setTimeout(scanOptionalPageControls, 300);
  }

  function applyProtectionSettings(settings) {
    const previousImageSwapEnabled = protectionSettings.imageSwapEnabled;
    const previousImageSwapTheme = protectionSettings.imageSwapTheme;
    configuredProtectionSettings = { ...configuredProtectionSettings, ...settings };
    const currentDomain = location.hostname.toLowerCase().replace(/^www\./, "");
    const pausedUntil = Date.parse(temporarySitePauses[currentDomain] ?? "");
    const hasPermanentException = (configuredProtectionSettings.allowlistedSites ?? []).includes(currentDomain);
    const disabledOnSite = hasPermanentException || (Number.isFinite(pausedUntil) && pausedUntil > Date.now());
    protectionSettings = disabledOnSite
      ? {
          ...configuredProtectionSettings,
          cookieBannerBlockingEnabled: false,
          newsletterBlockingEnabled: false,
          surveyBlockingEnabled: false,
          notificationPromptBlockingEnabled: false,
          autoplayBlockingEnabled: false,
          floatingVideoBlockingEnabled: false,
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
      ...(protectionSettings.customCosmeticFilters ?? []).slice(0, 200),
      ...(contentBlockingEnabled && protectionSettings.cosmeticFilteringEnabled
        ? subscriptionCosmeticFilters.slice(0, 500)
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
    const needsScanning = protectionSettings.autoplayBlockingEnabled
      || protectionSettings.floatingVideoBlockingEnabled;
    if (needsScanning) {
      protectionObserver = new MutationObserver(scheduleProtectionScan);
      protectionObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    scanOptionalPageControls();
    configureImageSwap();
  }

  let pickerActive = false;
  let pickerTarget = null;
  let pickerTooltip = null;

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

  async function handlePickerClick(event) {
    if (!pickerTarget || pickerTarget === document.body || pickerTarget === document.documentElement) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const selector = selectorForElement(pickerTarget);
    stopElementPicker();
    await chrome.runtime.sendMessage({ kind: "addCustomCosmeticFilter", selector });
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
        countBackgroundEvent();
      }
    });

    observe("resource", (entries) => {
      for (const entry of entries) {
        state.resourceCount += 1;
        state.transferBytes += entry.transferSize ?? 0;
        countBackgroundEvent();
      }
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          state.layoutShiftScore += entry.value ?? 0;
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

  function setEcoMode(enabled) {
    state.ecoModeEnabled = enabled;
    let style = document.querySelector("#browser-monitor-eco-style");
    if (enabled) {
      if (!style) {
        style = document.createElement("style");
        style.id = "browser-monitor-eco-style";
        style.textContent = "*, *::before, *::after { animation-play-state: paused !important; scroll-behavior: auto !important; }";
        (document.head || document.documentElement).append(style);
      }
      pausePageActivity();
      ecoObserver?.disconnect();
      ecoObserver = new MutationObserver(() => pausePageActivity());
      ecoObserver.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      ecoObserver?.disconnect();
      ecoObserver = null;
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

  document.addEventListener("pointerdown", () => { pageHasUserGesture = true; }, { capture: true, passive: true });
  document.addEventListener("keydown", () => { pageHasUserGesture = true; }, { capture: true });
  document.addEventListener("play", (event) => {
    if (protectionSettings.autoplayBlockingEnabled && !pageHasUserGesture) {
      event.target?.pause?.();
    }
  }, true);

  chrome.storage.local.get({
    monitoringEnabled: true,
    contentBlockingEnabled: true,
    browserProtectionSettings: protectionSettings,
    temporarySitePauses: {},
    customSubscriptionCosmeticFilters: [],
    imageSwapCustomImages: []
  }).then(({
    monitoringEnabled,
    contentBlockingEnabled: blockingEnabled,
    browserProtectionSettings,
    temporarySitePauses: pauses,
    customSubscriptionCosmeticFilters,
    imageSwapCustomImages: storedCustomImages
  }) => {
    temporarySitePauses = pauses;
    contentBlockingEnabled = blockingEnabled;
    subscriptionCosmeticFilters = customSubscriptionCosmeticFilters;
    imageSwapCustomImages = Array.isArray(storedCustomImages) ? storedCustomImages.slice(0, 9) : [];
    updateEnabled(monitoringEnabled);
    applyProtectionSettings(browserProtectionSettings);
    chrome.runtime.sendMessage({ kind: "getEcoMode" }).then((response) => {
      setEcoMode(Boolean(response?.enabled));
    }).catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.monitoringEnabled) {
      updateEnabled(changes.monitoringEnabled.newValue);
    }
    if (areaName === "local" && changes.browserProtectionSettings) {
      applyProtectionSettings(changes.browserProtectionSettings.newValue ?? {});
    }
    if (areaName === "local" && changes.contentBlockingEnabled) {
      contentBlockingEnabled = changes.contentBlockingEnabled.newValue !== false;
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind === "playActivationAnimation") {
      playActivationAnimation();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.kind !== "getMetrics") return false;
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
      mediaElementCount: document.querySelectorAll("audio, video").length,
      visibility: document.visibilityState === "hidden" ? "hidden" : "visible"
    });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "setEcoMode") return false;
    setEcoMode(Boolean(message.enabled));
    sendResponse({ ok: true });
    return false;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "startElementPicker") return false;
    startElementPicker();
    sendResponse({ ok: true });
    return false;
  });
})();
