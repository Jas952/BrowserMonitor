export function severityForScore(score) {
  if (score < 25) return "normal";
  if (score < 50) return "noticeable";
  if (score < 75) return "heavy";
  return "critical";
}

export function assessTab(metrics, tab) {
  const durationSeconds = Math.max(60, Number(metrics.sampleDurationSeconds) || 60);
  const perMinute = 60 / durationSeconds;
  const normalized = {
    longFrameCount: (Number(metrics.longFrameCount) || 0) * perMinute,
    blockingDurationMS: (Number(metrics.blockingDurationMS) || 0) * perMinute,
    forcedStyleAndLayoutDurationMS: (Number(metrics.forcedStyleAndLayoutDurationMS) || 0) * perMinute,
    resourceCount: (Number(metrics.resourceCount) || 0) * perMinute,
    transferBytes: (Number(metrics.transferBytes) || 0) * perMinute,
    layoutShiftScore: (Number(metrics.layoutShiftScore) || 0) * perMinute,
    backgroundEventCount: (Number(metrics.backgroundEventCount) || 0) * perMinute
  };
  const longFrames = Math.min(20, normalized.longFrameCount * 2);
  const blocking = Math.min(35, normalized.blockingDurationMS / 25);
  const forcedLayout = Math.min(10, normalized.forcedStyleAndLayoutDurationMS / 20);
  const network = Math.min(15, (normalized.transferBytes / 5_000_000) * 15);
  const resources = Math.min(5, (normalized.resourceCount / 100) * 5);
  const layoutShift = Math.min(10, (normalized.layoutShiftScore / 0.25) * 10);
  const background = metrics.visibility === "hidden"
    ? Math.min(15, normalized.backgroundEventCount * 2)
    : 0;
  const media = tab.audible || metrics.mediaElementCount > 0 ? 5 : 0;
  const score = Math.min(100, Math.round(longFrames + blocking + forcedLayout + network + resources + layoutShift + background + media));
  const severity = severityForScore(score);
  const indicators = {
    processor: severityForScore(Math.min(100, Math.round(((longFrames + blocking + forcedLayout) / 65) * 100))),
    network: severityForScore(Math.min(100, Math.round(((network + resources) / 20) * 100))),
    stability: severityForScore(Math.min(100, Math.round((layoutShift / 10) * 100))),
    background: severityForScore(Math.min(100, Math.round(((background + media) / 20) * 100)))
  };
  const reasons = [];

  if (normalized.blockingDurationMS >= 250) {
    reasons.push("Long main-thread blocks");
  }
  if (normalized.forcedStyleAndLayoutDurationMS >= 100) {
    reasons.push("Frequent style and layout recalculation");
  }
  if (normalized.transferBytes >= 5_000_000) {
    reasons.push("High network resource volume");
  }
  if (normalized.resourceCount >= 100) {
    reasons.push("High resource count");
  }
  if (normalized.layoutShiftScore >= 0.25) {
    reasons.push("Visible layout instability");
  }
  if (metrics.visibility === "hidden" && normalized.backgroundEventCount >= 3) {
    reasons.push("Activity continues in the background");
  }
  if (tab.audible || metrics.mediaElementCount > 0) {
    reasons.push("Active media elements on the page");
  }
  if (reasons.length === 0) {
    reasons.push("No significant load sources detected");
  }

  const recommendations = {
    normal: "This tab can remain open.",
    noticeable: "Keep an eye on this tab, especially in the background.",
    heavy: "Pause media or reload this tab.",
    critical: "Close this tab if you do not need it right now."
  };

  return {
    score,
    severity,
    indicators,
    reasons,
    recommendation: recommendations[severity],
    measurementConfidence: metrics.visibility === "unavailable"
      ? "unavailable"
      : Number(metrics.sampleDurationSeconds) >= 60
        ? "full"
        : "partial"
  };
}
