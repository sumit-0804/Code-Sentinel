import { describe, expect, it } from "vitest";

import type { CombinedReport, Finding } from "../types.js";
import { applyThreshold, DEFAULT_CONFIDENCE_THRESHOLD } from "./apply-threshold.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    agent: "security",
    ruleId: "security/hardcoded-secret",
    title: "Hardcoded secret",
    description: "An API key is committed in source.",
    location: { filePath: "src/pay.ts", lineStart: 10, lineEnd: 10 },
    severity: "critical",
    confidence: 0.9,
    ...overrides,
  };
}

function report(findings: Finding[]): CombinedReport {
  return {
    reviewId: "r1",
    status: "completed",
    summary: {
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      autoFixedCount: 0,
      suggestedFixCount: 0,
    },
    findings,
    agentRuns: [],
  };
}

describe("applyThreshold", () => {
  it("defaults to 0.8", () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.8);
  });

  it("marks a finding above the threshold as postable", () => {
    const above = finding({ confidence: 0.9 });
    const result = applyThreshold(report([above]), 0.8);

    expect(result.postableFindings.has(above)).toBe(true);
  });

  it("marks a finding exactly at the threshold as postable", () => {
    const atThreshold = finding({ confidence: 0.8 });
    const result = applyThreshold(report([atThreshold]), 0.8);

    expect(result.postableFindings.has(atThreshold)).toBe(true);
  });

  it("marks a finding below the threshold as not postable, but keeps it in the report", () => {
    const below = finding({ confidence: 0.79 });
    const result = applyThreshold(report([below]), 0.8);

    expect(result.postableFindings.has(below)).toBe(false);
    expect(result.report.findings).toContain(below);
  });

  it("returns an empty postable set for an empty report", () => {
    const result = applyThreshold(report([]), 0.8);

    expect(result.postableFindings.size).toBe(0);
    expect(result.report.findings).toHaveLength(0);
  });

  it("always marks a deterministic style fix as postable, regardless of confidence", () => {
    const styleFix = finding({
      confidence: 0.1,
      suggestion: {
        kind: "deterministic",
        originalSnippet: "var x = 1",
        suggestedSnippet: "const x = 1",
      },
    });

    const result = applyThreshold(report([styleFix]), 0.8);

    expect(result.postableFindings.has(styleFix)).toBe(true);
  });
});
