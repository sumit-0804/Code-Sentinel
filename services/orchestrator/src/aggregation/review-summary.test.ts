import { describe, expect, it } from "vitest";

import type { Finding } from "../types.js";
import { buildReviewSummary } from "./review-summary.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    agent: "security",
    ruleId: "security/hardcoded-secret",
    title: "Hardcoded secret",
    description: "An API key is committed in source.",
    location: { filePath: "src/pay.ts", lineStart: 10, lineEnd: 10 },
    severity: "warning",
    confidence: 0.5,
    ...overrides,
  };
}

describe("buildReviewSummary", () => {
  it("counts findings per severity", () => {
    const summary = buildReviewSummary([
      finding({ severity: "critical" }),
      finding({ severity: "critical" }),
      finding({ severity: "warning" }),
      finding({ severity: "info" }),
    ]);

    expect(summary.criticalCount).toBe(2);
    expect(summary.warningCount).toBe(1);
    expect(summary.infoCount).toBe(1);
  });

  it("counts a deterministic fix as auto-fixed, not suggested", () => {
    const summary = buildReviewSummary([
      finding({
        suggestion: {
          kind: "deterministic",
          originalSnippet: "var x = 1",
          suggestedSnippet: "const x = 1",
        },
      }),
    ]);

    expect(summary.autoFixedCount).toBe(1);
    expect(summary.suggestedFixCount).toBe(0);
  });

  it("counts an ai_suggested fix as suggested, not auto-fixed", () => {
    const summary = buildReviewSummary([
      finding({
        suggestion: {
          kind: "ai_suggested",
          originalSnippet: 'const key = "AKIA..."',
          suggestedSnippet: "const key = process.env.AWS_KEY",
        },
      }),
    ]);

    expect(summary.autoFixedCount).toBe(0);
    expect(summary.suggestedFixCount).toBe(1);
  });

  it("returns all zeros for an empty finding list", () => {
    const summary = buildReviewSummary([]);

    expect(summary).toEqual({
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      autoFixedCount: 0,
      suggestedFixCount: 0,
    });
  });
});
