(() => {
  if (window === window.top || globalThis.__browserMonitorFrameVideoResumeLoaded) return;
  globalThis.__browserMonitorFrameVideoResumeLoaded = true;

  const trackedVideos = new WeakMap();
  let identityCheckTimer = null;
  let enabled = true;
  let language = navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";

  async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function mediaTitle() {
    return String(document.querySelector("meta[property='og:title']")?.content
      || document.querySelector("main h1, article h1, h1")?.textContent
      || document.title || "").replace(/\s+/g, " ").trim().slice(0, 140);
  }

  function isAdvertisementVideo(video) {
    let node = video;
    for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
      const marker = `${node.id} ${node.className} ${node.getAttribute?.("aria-label") ?? ""}`;
      if (/\b(ad|ads|advert|advertisement|commercial|preroll|midroll|outstream|ima-container)\b/i.test(marker)) return true;
    }
    return Boolean(video.closest(".video-ads, .ima-ad-container, [data-ad], [data-ad-slot]"));
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

  function classification(video) {
    const rect = video.getBoundingClientRect();
    const playerHint = Boolean(video.closest([
      "#player",
      ".html5-video-player",
      ".video-js",
      ".jwplayer",
      ".plyr",
      ".shaka-video-container",
      ".dash-video-player",
      "[data-player]",
      "[class*='video-player' i]",
      "[class*='movie-player' i]",
      "[class*='player' i]"
    ].join(",")));
    return globalThis.BrowserMonitorPageGuard?.classifyLongFormMedia({
      hostname: location.hostname,
      pathname: location.pathname,
      duration: video.duration,
      width: Math.max(rect.width, video.videoWidth || 0, Number(video.getAttribute("width")) || 0),
      height: Math.max(rect.height, video.videoHeight || 0, Number(video.getAttribute("height")) || 0),
      videoCount: document.querySelectorAll("video").length,
      ogType: document.querySelector("meta[property='og:type']")?.content ?? "",
      structuredTypes: structuredMediaTypes(),
      playerHint,
      advertisement: isAdvertisementVideo(video),
      title: mediaTitle()
    }) ?? { supported: false };
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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

  function showNotice(title, position) {
    document.querySelector("#browser-monitor-frame-resume")?.remove();
    const host = document.createElement("div");
    host.id = "browser-monitor-frame-resume";
    host.dataset.browserMonitorNotice = "continue-watching";
    host.dataset.browserMonitorMediaTitle = title;
    host.dataset.browserMonitorMediaTime = formatTime(position);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { position:fixed; right:12px; bottom:12px; z-index:2147483647; display:block; width:min(330px,calc(100vw - 24px)); }
        .notice { position:relative; padding:12px 38px 12px 14px; border:1px solid rgba(62,72,78,.2); border-radius:12px; background:rgba(248,249,247,.97); color:#283035; box-shadow:0 10px 30px rgba(17,24,28,.2); font:500 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        strong { display:block; overflow:hidden; margin-bottom:3px; text-overflow:ellipsis; white-space:nowrap; }
        span { color:#657076; }
        button { position:absolute; top:8px; right:8px; width:24px; height:24px; padding:0; border:0; border-radius:7px; background:transparent; color:#6f777b; cursor:pointer; font:17px/24px sans-serif; }
        button:hover, button:focus-visible { background:rgba(0,0,0,.06); outline:none; }
        @media (prefers-color-scheme:dark) { .notice { border-color:rgba(255,255,255,.12); background:rgba(27,30,31,.97); color:#edf0f1; } span,button { color:#aeb7bb; } }
      </style>
      <div class="notice" role="status" aria-live="polite"><strong></strong><span></span><button type="button">×</button></div>
    `;
    shadow.querySelector("strong").textContent = title;
    shadow.querySelector("span").textContent = language === "ru"
      ? `Продолжено с ${formatTime(position)} · позиция хранится локально`
      : `Resumed from ${formatTime(position)} · stored locally`;
    const close = shadow.querySelector("button");
    close.setAttribute("aria-label", language === "ru" ? "Закрыть" : "Close");
    close.addEventListener("click", () => host.remove());
    (document.documentElement || document).append(host);
  }

  function restore(video, position) {
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
    video.addEventListener("loadeddata", apply, { once: true });
    video.addEventListener("canplay", apply, { once: true });
    setTimeout(apply, 250);
    setTimeout(apply, 1_000);
  }

  async function initialize(video) {
    if (!enabled || !(video instanceof HTMLVideoElement) || isAdvertisementVideo(video)) return;
    if (!Number.isFinite(video.duration) || video.duration < 120 || !classification(video).supported) return;
    const title = mediaTitle();
    const source = globalThis.BrowserMonitorPageGuard?.mediaIdentitySource(
      location.hostname,
      title,
      location.pathname,
      location.search
    );
    if (trackedVideos.get(video)?.source === source) return;
    const identity = source?.length >= 5 ? await sha256(`media:${source}`) : "";
    if (!identity || !video.isConnected) return;
    if (trackedVideos.get(video)?.identity === identity) return;
    trackedVideos.set(video, {
      identity,
      source,
      lastSavedAt: 0,
      title,
      ...mediaPresentation(title)
    });
    const saved = await chrome.runtime.sendMessage({ kind: "getContinueWatchingPosition", identity }).catch(() => null);
    const position = Number(saved?.position);
    if (Number.isFinite(position) && position > 10 && position < video.duration - 20 && video.currentTime < 5) {
      restore(video, position);
      showNotice(title, position);
    }
  }

  function save(video, { completed = false, force = false } = {}) {
    const state = trackedVideos.get(video);
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

  async function initializeAndSave(video) {
    await initialize(video);
    save(video, { force: true });
  }

  async function refreshAndSave(video) {
    await initialize(video);
    save(video);
  }

  function scheduleIdentityCheck() {
    clearTimeout(identityCheckTimer);
    identityCheckTimer = setTimeout(() => {
      identityCheckTimer = null;
      document.querySelectorAll("video").forEach((video) => {
        if (video.readyState >= 1) void initialize(video);
      });
    }, 120);
  }

  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLVideoElement) void initialize(event.target);
  }, true);
  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLVideoElement) void initialize(event.target);
  }, true);
  document.addEventListener("timeupdate", (event) => {
    if (event.target instanceof HTMLVideoElement) void refreshAndSave(event.target);
  }, true);
  document.addEventListener("pause", (event) => {
    if (event.target instanceof HTMLVideoElement) save(event.target, { force: true });
  }, true);
  document.addEventListener("seeked", (event) => {
    if (event.target instanceof HTMLVideoElement) void initializeAndSave(event.target);
  }, true);
  document.addEventListener("ended", (event) => {
    if (event.target instanceof HTMLVideoElement) save(event.target, { completed: true, force: true });
  }, true);
  document.addEventListener("emptied", (event) => {
    if (event.target instanceof HTMLVideoElement) trackedVideos.delete(event.target);
  }, true);
  document.addEventListener("durationchange", (event) => {
    if (event.target instanceof HTMLVideoElement) void initialize(event.target);
  }, true);
  window.addEventListener("pagehide", () => {
    document.querySelectorAll("video").forEach((video) => save(video, { force: true }));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.querySelectorAll("video").forEach((video) => save(video, { force: true }));
    }
  });
  window.addEventListener("popstate", scheduleIdentityCheck);
  const identityObserver = new MutationObserver(scheduleIdentityCheck);
  const observeIdentity = () => {
    if (document.head) {
      identityObserver.observe(document.head, {
        attributes: true,
        attributeFilter: ["content"],
        characterData: true,
        childList: true,
        subtree: true
      });
    }
  };
  if (document.head) observeIdentity();
  else document.addEventListener("DOMContentLoaded", observeIdentity, { once: true });

  chrome.storage.local.get({ extensionEnabled: true, uiPreferences: { language: null } }).then((stored) => {
    enabled = stored.extensionEnabled !== false;
    language = stored.uiPreferences?.language || language;
    document.querySelectorAll("video").forEach((video) => {
      if (video.readyState >= 1) void initialize(video);
    });
  });
})();
