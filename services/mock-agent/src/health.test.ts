import { describe, expect, it } from "vitest";

import { getHealth } from "./health.js";

describe("getHealth", () => {
  it("is ok by default", () => {
    expect(getHealth({ agentKind: "security", port: 8081, delayMs: 0 }).status).toBe("ok");
  });

  it("is unavailable when MOCK_FAIL=500", () => {
    const health = getHealth({ agentKind: "security", port: 8081, delayMs: 0, failMode: "500" });
    expect(health.status).toBe("unavailable");
  });
});
