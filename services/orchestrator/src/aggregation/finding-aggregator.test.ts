import { describe, expect, it } from "vitest";

import type { Finding } from "../types.js";
import { FindingAggregator } from "./finding-aggregator.js";

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

describe("FindingAggregator", () => {
  it("collapses two findings that share file, line range and rule", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ agent: "security", confidence: 0.7 }),
      finding({ agent: "logic", confidence: 0.95 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe(0.95);
    expect(result[0]?.duplicateCount).toBe(2);
  });

  it("collapses agent-prefixed rule ids for the same issue type", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ agent: "security", ruleId: "security/hardcoded-secret" }),
      finding({ agent: "logic", ruleId: "logic/hardcoded-secret" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.duplicateCount).toBe(2);
  });

  it("collapses findings with the same CWE even when rule ids differ", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ agent: "security", ruleId: "security/sql-injection", cweId: "CWE-89" }),
      finding({ agent: "logic", ruleId: "logic/unsafe-query", cweId: "cwe-89" }),
    ]);

    expect(result).toHaveLength(1);
  });

  it("keeps findings with different issue types on the same lines", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ ruleId: "security/hardcoded-secret" }),
      finding({ agent: "style", ruleId: "style/eslint/no-unused-vars" }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("never lowers severity when the higher-confidence duplicate is less severe", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ severity: "critical", confidence: 0.7 }),
      finding({ agent: "logic", severity: "warning", confidence: 0.95 }),
    ]);

    expect(result[0]?.severity).toBe("critical");
    expect(result[0]?.agent).toBe("logic");
  });

  it("keeps the suggestion from the lower-confidence duplicate when the winner has none", () => {
    const aggregator = new FindingAggregator();
    const suggestion = {
      kind: "ai_suggested" as const,
      originalSnippet: 'const key = "AKIA..."',
      suggestedSnippet: "const key = process.env.AWS_KEY",
    };

    const result = aggregator.dedupe([
      finding({ confidence: 0.7, suggestion }),
      finding({ agent: "logic", confidence: 0.95 }),
    ]);

    expect(result[0]?.suggestion).toEqual(suggestion);
  });

  it("keeps findings that differ in location", () => {
    const aggregator = new FindingAggregator();

    const result = aggregator.dedupe([
      finding({ location: { filePath: "src/pay.ts", lineStart: 10, lineEnd: 10 } }),
      finding({ location: { filePath: "src/pay.ts", lineStart: 42, lineEnd: 42 } }),
    ]);

    expect(result).toHaveLength(2);
  });
});
