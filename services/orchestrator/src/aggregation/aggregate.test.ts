import { describe, expect, it } from "vitest";

import type { AgentRunSummary, Finding } from "../types.js";
import { aggregate, deriveStatus } from "./index.js";

function run(overrides: Partial<AgentRunSummary> = {}): AgentRunSummary {
  return { agent: "security", status: "succeeded", ...overrides };
}

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

describe("deriveStatus", () => {
  it("is completed when every agent succeeded or was skipped", () => {
    expect(deriveStatus([run(), run({ agent: "style", status: "skipped" })])).toBe("completed");
  });

  it("is partial when an agent timed out but another succeeded", () => {
    expect(deriveStatus([run(), run({ agent: "logic", status: "timed_out" })])).toBe("partial");
  });

  it("is failed when no agent produced a result", () => {
    expect(
      deriveStatus([run({ status: "failed" }), run({ agent: "logic", status: "timed_out" })]),
    ).toBe("failed");
  });
});

describe("aggregate", () => {
  it("marks the report partial when an agent timed out", () => {
    const report = aggregate({
      reviewId: "r1",
      rawFindings: [],
      agentRuns: [run(), run({ agent: "documentation", status: "timed_out" })],
    });

    expect(report.status).toBe("partial");
  });

  it("uses an explicit status when the caller provides one", () => {
    const report = aggregate({
      reviewId: "r1",
      rawFindings: [],
      agentRuns: [run({ status: "failed" })],
      status: "running",
    });

    expect(report.status).toBe("running");
  });

  it("dedupes, ranks and summarizes findings in one pass", () => {
    const report = aggregate({
      reviewId: "r1",
      rawFindings: [
        finding({ severity: "info", confidence: 0.4 }),
        finding({ agent: "logic", severity: "critical", confidence: 0.9 }),
        finding({
          agent: "style",
          ruleId: "style/no-unused-vars",
          severity: "warning",
          confidence: 0.6,
          location: { filePath: "src/pay.ts", lineStart: 42, lineEnd: 42 },
        }),
      ],
      agentRuns: [run()],
    });

    expect(report.findings).toHaveLength(2);
    expect(report.findings.map((f) => f.severity)).toEqual(["critical", "warning"]);
    expect(report.findings[0]?.duplicateCount).toBe(2);
    expect(report.summary).toEqual({
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
      autoFixedCount: 0,
      suggestedFixCount: 0,
    });
  });

  it("defaults to completed when every agent succeeded", () => {
    const report = aggregate({
      reviewId: "r1",
      rawFindings: [],
      agentRuns: [run()],
    });

    expect(report.status).toBe("completed");
  });
});
