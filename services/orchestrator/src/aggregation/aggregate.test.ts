import { describe, expect, it } from "vitest";

import type { AgentRunSummary } from "../types.js";
import { aggregate, deriveStatus } from "./index.js";

function run(overrides: Partial<AgentRunSummary> = {}): AgentRunSummary {
  return { agent: "security", status: "succeeded", ...overrides };
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
});
