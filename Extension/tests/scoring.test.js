import assert from "node:assert/strict";
import test from "node:test";
import { assessTab, severityForScore } from "../features/analytics/scoring.js";

test("severity boundaries remain stable", () => {
  assert.equal(severityForScore(24), "normal");
  assert.equal(severityForScore(25), "noticeable");
  assert.equal(severityForScore(50), "heavy");
  assert.equal(severityForScore(75), "critical");
});

test("quiet visible tab remains normal", () => {
  const assessment = assessTab({
    longFrameCount: 0,
    blockingDurationMS: 0,
    forcedStyleAndLayoutDurationMS: 0,
    transferBytes: 120_000,
    backgroundEventCount: 0,
    mediaElementCount: 0,
    visibility: "visible"
  }, { audible: false });

  assert.equal(assessment.severity, "normal");
  assert.ok(assessment.score < 25);
  assert.deepEqual(assessment.indicators, {
    processor: "normal", network: "normal", stability: "normal", background: "normal"
  });
});

test("busy hidden media tab becomes critical", () => {
  const assessment = assessTab({
    longFrameCount: 16,
    blockingDurationMS: 1_500,
    forcedStyleAndLayoutDurationMS: 300,
    transferBytes: 12_000_000,
    backgroundEventCount: 12,
    mediaElementCount: 1,
    visibility: "hidden"
  }, { audible: true });

  assert.equal(assessment.score, 100);
  assert.equal(assessment.severity, "critical");
  assert.equal(assessment.indicators.processor, "critical");
  assert.equal(assessment.indicators.background, "critical");
  assert.ok(assessment.reasons.includes("Activity continues in the background"));
});

test("long-lived tabs are scored by average activity instead of age", () => {
  const metrics = {
    sampleDurationSeconds: 600,
    longFrameCount: 16,
    blockingDurationMS: 1_500,
    forcedStyleAndLayoutDurationMS: 300,
    resourceCount: 200,
    transferBytes: 12_000_000,
    layoutShiftScore: 0.2,
    backgroundEventCount: 12,
    mediaElementCount: 0,
    visibility: "hidden"
  };

  const assessment = assessTab(metrics, { audible: false });
  assert.equal(assessment.severity, "normal");
  assert.equal(assessment.measurementConfidence, "full");
});

test("layout instability contributes to tab explanation", () => {
  const assessment = assessTab({
    sampleDurationSeconds: 60,
    layoutShiftScore: 0.4,
    visibility: "visible"
  }, { audible: false });

  assert.ok(assessment.reasons.includes("Visible layout instability"));
});

test("large resource counts contribute to tab explanation", () => {
  const result = assessTab({
    sampleDurationSeconds: 60,
    longFrameCount: 0,
    blockingDurationMS: 0,
    forcedStyleAndLayoutDurationMS: 0,
    resourceCount: 140,
    transferBytes: 0,
    layoutShiftScore: 0,
    backgroundEventCount: 0,
    mediaElementCount: 0,
    visibility: "visible"
  }, { audible: false });
  assert.ok(result.score > 0);
  assert.ok(result.reasons.includes("High resource count"));
});

test("measurement confidence distinguishes full partial and unavailable samples", () => {
  const base = {
    longFrameCount: 0, blockingDurationMS: 0, forcedStyleAndLayoutDurationMS: 0,
    resourceCount: 0, transferBytes: 0, layoutShiftScore: 0,
    backgroundEventCount: 0, mediaElementCount: 0
  };
  assert.equal(assessTab({ ...base, sampleDurationSeconds: 90, visibility: "visible" }, {}).measurementConfidence, "full");
  assert.equal(assessTab({ ...base, sampleDurationSeconds: 15, visibility: "visible" }, {}).measurementConfidence, "partial");
  assert.equal(assessTab({ ...base, sampleDurationSeconds: 0, visibility: "unavailable" }, {}).measurementConfidence, "unavailable");
});
