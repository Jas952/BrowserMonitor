export function severityForScore(score) {
  if (score < 25) return "normal";
  if (score < 50) return "noticeable";
  if (score < 75) return "heavy";
  return "critical";
}

export function assessTab(metrics, tab) {
  const longFrames = Math.min(20, metrics.longFrameCount * 2);
  const blocking = Math.min(40, metrics.blockingDurationMS / 25);
  const forcedLayout = Math.min(15, metrics.forcedStyleAndLayoutDurationMS / 20);
  const network = Math.min(15, (metrics.transferBytes / 5_000_000) * 15);
  const background = metrics.visibility === "hidden"
    ? Math.min(20, metrics.backgroundEventCount * 2)
    : 0;
  const media = tab.audible || metrics.mediaElementCount > 0 ? 5 : 0;
  const score = Math.min(100, Math.round(longFrames + blocking + forcedLayout + network + background + media));
  const severity = severityForScore(score);
  const reasons = [];

  if (metrics.blockingDurationMS >= 250) {
    reasons.push("Long main-thread blocks");
  }
  if (metrics.forcedStyleAndLayoutDurationMS >= 100) {
    reasons.push("Frequent style and layout recalculation");
  }
  if (metrics.transferBytes >= 5_000_000) {
    reasons.push("High network resource volume");
  }
  if (metrics.visibility === "hidden" && metrics.backgroundEventCount >= 3) {
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

  return { score, severity, reasons, recommendation: recommendations[severity] };
}
