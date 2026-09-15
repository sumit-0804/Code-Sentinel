import type { CombinedReport, Confidence, Finding } from "../types.js";

// Platform default until a Repository Admin overrides it (FR-ORC-06, FR-WEB-03).
export const DEFAULT_CONFIDENCE_THRESHOLD: Confidence = 0.8;

export interface ThresholdResult {
  report: CombinedReport;
  // Findings eligible for a posted GitHub suggested change (FR-ORC-06). Below-threshold
  // findings stay in report.findings, they are just excluded from this set.
  postableFindings: Set<Finding>;
}

// No "postable" field exists yet on the shared Finding/Suggestion schema (common.yaml). Rather
// than add one locally, this returns the eligible findings as a set of object references. Ask
// Sumit before adding a contract field if the graph node needs this to survive serialization.
export function applyThreshold(
  report: CombinedReport,
  threshold: Confidence = DEFAULT_CONFIDENCE_THRESHOLD,
): ThresholdResult {
  const postableFindings = new Set<Finding>();

  for (const finding of report.findings) {
    if (clearsThreshold(finding, threshold)) postableFindings.add(finding);
  }

  return { report, postableFindings };
}

function clearsThreshold(finding: Finding, threshold: Confidence): boolean {
  // Deterministic style fixes are never LLM-generated, so they skip the threshold entirely
  // and can always be committed without review (NFR-07). Confirm with Nevil if this changes.
  if (finding.suggestion?.kind === "deterministic") return true;
  return finding.confidence >= threshold;
}
