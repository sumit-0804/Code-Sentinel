import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults to the security agent on its default port", () => {
    const config = loadConfig({});

    expect(config.agentKind).toBe("security");
    expect(config.port).toBe(8081);
    expect(config.delayMs).toBe(0);
    expect(config.failMode).toBeUndefined();
  });

  it("reads MOCK_AGENT_KIND and defaults the port to that agent's port", () => {
    const config = loadConfig({ MOCK_AGENT_KIND: "logic" });

    expect(config.agentKind).toBe("logic");
    expect(config.port).toBe(8084);
  });

  it("falls back to the security agent for an unrecognized MOCK_AGENT_KIND", () => {
    const config = loadConfig({ MOCK_AGENT_KIND: "not-a-real-agent" });

    expect(config.agentKind).toBe("security");
  });

  it("lets PORT override the agent's default port", () => {
    const config = loadConfig({ MOCK_AGENT_KIND: "style", PORT: "9999" });

    expect(config.port).toBe(9999);
  });

  it("parses a valid MOCK_FAIL value", () => {
    expect(loadConfig({ MOCK_FAIL: "timeout" }).failMode).toBe("timeout");
    expect(loadConfig({ MOCK_FAIL: "500" }).failMode).toBe("500");
    expect(loadConfig({ MOCK_FAIL: "malformed" }).failMode).toBe("malformed");
  });

  it("ignores an unrecognized MOCK_FAIL value", () => {
    expect(loadConfig({ MOCK_FAIL: "bogus" }).failMode).toBeUndefined();
  });

  it("passes MOCK_FINDINGS_FILE through unchanged", () => {
    const config = loadConfig({ MOCK_FINDINGS_FILE: "/tmp/custom.json" });

    expect(config.findingsFile).toBe("/tmp/custom.json");
  });
});
