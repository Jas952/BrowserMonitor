import assert from "node:assert/strict";
import test from "node:test";
import { assessTab, severityForScore } from "../scoring.js";

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
  assert.ok(assessment.reasons.includes("Activity continues in the background"));
});
