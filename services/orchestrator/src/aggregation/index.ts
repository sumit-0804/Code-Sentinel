import type { AgentRunSummary, CombinedReport, Finding, ReviewStatus } from "../types.js";
import { FindingAggregator } from "./finding-aggregator.js";
import { SeverityRanker } from "./severity-ranker.js";
import { buildReviewSummary } from "./review-summary.js";

export { FindingAggregator } from "./finding-aggregator.js";
export { SeverityRanker } from "./severity-ranker.js";
export { buildReviewSummary } from "./review-summary.js";

export interface AggregateInput {
  reviewId: string;
  rawFindings: Finding[];
  agentRuns: AgentRunSummary[];
  status?: ReviewStatus;
}

/**
 * The aggregation step of the review graph (`AggregateNode` in the class diagram): take the raw
 * findings collected from the fan-out, de-duplicate them, rank by severity, and roll up the
 * summary counts into a `CombinedReport`.
 *
 * Context lookup (similar past issues) and the confidence-threshold pass run as separate nodes
 * after this one.
 */
export function aggregate(input: AggregateInput): CombinedReport {
  const deduped = new FindingAggregator().dedupe(input.rawFindings);
  const findings = new SeverityRanker().rank(deduped);

  return {
    reviewId: input.reviewId,
    status: input.status ?? deriveStatus(input.agentRuns),
    summary: buildReviewSummary(findings),
    findings,
    agentRuns: input.agentRuns,
  };
}

// A timed-out or failed agent still yields a report, marked partial (FR-ORC-02, NFR-04).
// Only when no agent produced a result is the review failed.
export function deriveStatus(agentRuns: AgentRunSummary[]): ReviewStatus {
  const broken = agentRuns.filter((run) => run.status === "timed_out" || run.status === "failed");
  if (broken.length === 0) return "completed";

  const succeeded = agentRuns.some((run) => run.status === "succeeded");
  return succeeded ? "partial" : "failed";
}
