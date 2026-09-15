import type { MockAgentConfig } from "./config.js";
import { loadFindings } from "./findings-store.js";
import type { AgentReviewRequest, AgentReviewResponse, ErrorBody } from "./types.js";

export type ReviewOutcome =
  | { kind: "ok"; body: AgentReviewResponse }
  | { kind: "error"; status: number; body: ErrorBody }
  // MOCK_FAIL=timeout: the caller sends nothing back, so the orchestrator's own
  // per-agent timeout fires (FR-ORC-02).
  | { kind: "hang" };

export async function buildReviewResponse(
  request: unknown,
  config: MockAgentConfig,
): Promise<ReviewOutcome> {
  if (config.delayMs > 0) await sleep(config.delayMs);

  if (config.failMode === "timeout") return { kind: "hang" };

  if (config.failMode === "500") {
    return {
      kind: "error",
      status: 503,
      body: { code: "mock_agent_unavailable", message: "Mock agent configured to fail" },
    };
  }

  const parsed = parseRequest(request);
  if (!parsed.ok) {
    return { kind: "error", status: 400, body: { code: "invalid_request", message: parsed.error } };
  }

  if (config.failMode === "malformed") {
    // Deliberately violates the required "findings" field to exercise client-side validation.
    return { kind: "ok", body: { reviewId: parsed.value.reviewId } as unknown as AgentReviewResponse };
  }

  const findings = loadFindings(config);

  return {
    kind: "ok",
    body: {
      reviewId: parsed.value.reviewId,
      agent: config.agentKind,
      serviceVersion: "0.0.0",
      findings,
      analyzedFileCount: parsed.value.files.length,
      latencyMs: config.delayMs,
    },
  };
}

type ParseResult =
  | { ok: true; value: AgentReviewRequest }
  | { ok: false; error: string };

function parseRequest(request: unknown): ParseResult {
  if (typeof request !== "object" || request === null) {
    return { ok: false, error: "request body must be an object" };
  }

  const body = request as Partial<AgentReviewRequest>;
  if (typeof body.reviewId !== "string") {
    return { ok: false, error: "reviewId is required" };
  }
  if (!Array.isArray(body.files) || body.files.length === 0) {
    return { ok: false, error: "files must be a non-empty array" };
  }

  return { ok: true, value: body as AgentReviewRequest };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
