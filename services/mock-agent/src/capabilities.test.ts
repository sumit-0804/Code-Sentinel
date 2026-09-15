import { describe, expect, it } from "vitest";

import { getCapabilities } from "./capabilities.js";

describe("getCapabilities", () => {
  it("reports the configured agent kind", () => {
    expect(getCapabilities({ agentKind: "logic", port: 8084, delayMs: 0 }).agent).toBe("logic");
  });

  it("only the style agent claims deterministic fixes", () => {
    expect(
      getCapabilities({ agentKind: "style", port: 8082, delayMs: 0 }).producesDeterministicFixes,
    ).toBe(true);
    expect(
      getCapabilities({ agentKind: "security", port: 8081, delayMs: 0 }).producesDeterministicFixes,
    ).toBe(false);
  });
});
