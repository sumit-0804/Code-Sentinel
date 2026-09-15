import { describe, expect, it } from "vitest";

import type { MockAgentConfig } from "./config.js";
import { buildReviewResponse } from "./review.js";
import type { AgentReviewRequest, AgentReviewResponse } from "./types.js";

function config(overrides: Partial<MockAgentConfig> = {}): MockAgentConfig {
  return { agentKind: "security", port: 8081, delayMs: 0, ...overrides };
}

function request(overrides: Partial<AgentReviewRequest> = {}): AgentReviewRequest {
  return {
    reviewId: "r1",
    files: [{ path: "a.py", language: "python", patch: "@@ -1 +1 @@" }],
    ...overrides,
  };
}

describe("buildReviewResponse", () => {
  it("returns findings from the agent's default fixture", async () => {
    const outcome = await buildReviewResponse(request(), config({ agentKind: "security" }));

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") throw new Error("expected ok");
    expect(outcome.body.agent).toBe("security");
    expect(outcome.body.findings.length).toBeGreaterThan(0);
    expect(outcome.body.reviewId).toBe("r1");
  });

  it("returns no findings for an agent kind with no fixture", async () => {
    const outcome = await buildReviewResponse(request(), config({ agentKind: "performance" }));

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") throw new Error("expected ok");
    expect(outcome.body.findings).toEqual([]);
  });

  it("rejects a request missing reviewId", async () => {
    const outcome = await buildReviewResponse({ files: request().files }, config());

    expect(outcome).toMatchObject({ kind: "error", status: 400 });
  });

  it("rejects a request with an empty files array", async () => {
    const outcome = await buildReviewResponse(request({ files: [] }), config());

    expect(outcome).toMatchObject({ kind: "error", status: 400 });
  });

  it("hangs and never resolves a response body when MOCK_FAIL=timeout", async () => {
    const outcome = await buildReviewResponse(request(), config({ failMode: "timeout" }));

    expect(outcome).toEqual({ kind: "hang" });
  });

  it("returns a 503 when MOCK_FAIL=500", async () => {
    const outcome = await buildReviewResponse(request(), config({ failMode: "500" }));

    expect(outcome).toMatchObject({ kind: "error", status: 503 });
  });

  it("returns a response missing required fields when MOCK_FAIL=malformed", async () => {
    const outcome = await buildReviewResponse(request(), config({ failMode: "malformed" }));

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") throw new Error("expected ok");
    const body = outcome.body as Partial<AgentReviewResponse>;
    expect(body.findings).toBeUndefined();
  });

  it("waits at least delayMs before responding", async () => {
    const start = Date.now();

    await buildReviewResponse(request(), config({ delayMs: 30 }));

    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});
