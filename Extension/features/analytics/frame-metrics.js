(() => {
  if (window === window.top) return;
  const startedAt = performance.now();
  const metrics = { longFrameCount: 0, blockingDurationMS: 0, forcedStyleAndLayoutDurationMS: 0, resourceCount: 0, transferBytes: 0, layoutShiftScore: 0, backgroundEventCount: 0 };
  const observe = (type, callback) => {
    if (!globalThis.PerformanceObserver?.supportedEntryTypes?.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()));
      observer.observe({ type, buffered: true });
    } catch {}
  };
  observe("long-animation-frame", (entries) => entries.forEach((entry) => {
    metrics.longFrameCount += 1;
    metrics.blockingDurationMS += entry.blockingDuration ?? entry.duration ?? 0;
    for (const script of entry.scripts ?? []) metrics.forcedStyleAndLayoutDurationMS += script.forcedStyleAndLayoutDuration ?? 0;
    if (document.hidden) metrics.backgroundEventCount += 1;
  }));
  observe("resource", (entries) => entries.forEach((entry) => {
    metrics.resourceCount += 1;
    metrics.transferBytes += Math.max(entry.transferSize ?? 0, entry.encodedBodySize ?? 0);
    if (document.hidden) metrics.backgroundEventCount += 1;
  }));
  observe("layout-shift", (entries) => entries.forEach((entry) => {
    if (!entry.hadRecentInput) metrics.layoutShiftScore += entry.value ?? 0;
  }));
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "getFrameMetrics") return false;
    sendResponse({ available: true, sampleDurationSeconds: Math.max(0, (performance.now() - startedAt) / 1000), ...metrics });
    return false;
  });
})();
