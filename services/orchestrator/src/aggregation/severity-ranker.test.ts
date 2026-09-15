import { describe, expect, it } from "vitest";

import type { Finding } from "../types.js";
import { SeverityRanker } from "./severity-ranker.js";

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

describe("SeverityRanker", () => {
  it("orders critical before warning before info", () => {
    const ranker = new SeverityRanker();

    const result = ranker.rank([
      finding({ severity: "info" }),
      finding({ severity: "critical" }),
      finding({ severity: "warning" }),
    ]);

    expect(result.map((f) => f.severity)).toEqual(["critical", "warning", "info"]);
  });

  it("orders by confidence within the same severity band", () => {
    const ranker = new SeverityRanker();

    const result = ranker.rank([
      finding({ severity: "critical", confidence: 0.6 }),
      finding({ severity: "critical", confidence: 0.9 }),
      finding({ severity: "critical", confidence: 0.7 }),
    ]);

    expect(result.map((f) => f.confidence)).toEqual([0.9, 0.7, 0.6]);
  });

  it("does not mutate the input array", () => {
    const ranker = new SeverityRanker();
    const input = [finding({ severity: "info" }), finding({ severity: "critical" })];
    const original = [...input];

    ranker.rank(input);

    expect(input).toEqual(original);
  });
});
