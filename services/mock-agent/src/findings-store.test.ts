import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadFindings } from "./findings-store.js";
import type { Finding } from "./types.js";

function finding(): Finding {
  return {
    agent: "security",
    ruleId: "security/hardcoded-secret",
    title: "Hardcoded secret",
    description: "test fixture",
    location: { filePath: "a.py", lineStart: 1, lineEnd: 1 },
    severity: "critical",
    confidence: 0.9,
  };
}

describe("loadFindings", () => {
  it("loads the default fixture for the security agent", () => {
    const findings = loadFindings({ agentKind: "security", port: 8081, delayMs: 0 });
    expect(findings.length).toBeGreaterThan(0);
  });

  it("returns an empty array for an agent kind with no default fixture", () => {
    const findings = loadFindings({ agentKind: "performance", port: 8083, delayMs: 0 });
    expect(findings).toEqual([]);
  });

  it("prefers MOCK_FINDINGS_FILE over the agent's default fixture", () => {
    const path = join(tmpdir(), `mock-agent-findings-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify([finding()]));

    const findings = loadFindings({
      agentKind: "security",
      port: 8081,
      delayMs: 0,
      findingsFile: path,
    });

    expect(findings).toEqual([finding()]);
  });

  it("returns an empty array when the findings file does not exist", () => {
    const findings = loadFindings({
      agentKind: "security",
      port: 8081,
      delayMs: 0,
      findingsFile: join(tmpdir(), "does-not-exist.json"),
    });

    expect(findings).toEqual([]);
  });
});
