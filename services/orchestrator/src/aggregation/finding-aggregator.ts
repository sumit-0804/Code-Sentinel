import { createHash } from "node:crypto";

import type { AgentKind, Finding } from "../types.js";
import { SEVERITY_WEIGHT } from "./severity-ranker.js";

const AGENT_KINDS: readonly AgentKind[] = [
  "security",
  "style",
  "performance",
  "logic",
  "documentation",
];

// Collapses findings that describe the same issue reported by more than one agent (FR-ORC-03).
// Same file and line range plus the same issue type: the CWE id when present, otherwise the ruleId
// without its agent prefix, since agents namespace rule ids ("security/x" vs "logic/x").
export class FindingAggregator {
  dedupe(findings: Finding[]): Finding[] {
    const byKey = new Map<string, Finding>();

    for (const finding of findings) {
      const key = this.dedupeKey(finding);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, { ...finding, duplicateCount: finding.duplicateCount ?? 1 });
        continue;
      }

      byKey.set(key, this.merge(existing, finding));
    }

    return [...byKey.values()];
  }

  // Keeps the higher-confidence report, but never lowers severity or drops a proposed fix.
  private merge(existing: Finding, incoming: Finding): Finding {
    const [primary, secondary] =
      existing.confidence >= incoming.confidence ? [existing, incoming] : [incoming, existing];

    const severity =
      SEVERITY_WEIGHT[secondary.severity] > SEVERITY_WEIGHT[primary.severity]
        ? secondary.severity
        : primary.severity;

    const suggestion = primary.suggestion ?? secondary.suggestion;

    return {
      ...primary,
      severity,
      ...(suggestion ? { suggestion } : {}),
      duplicateCount: (existing.duplicateCount ?? 1) + (incoming.duplicateCount ?? 1),
    };
  }

  private dedupeKey(finding: Finding): string {
    const { filePath, lineStart, lineEnd } = finding.location;
    return createHash("sha1")
      .update(`${filePath}:${lineStart}:${lineEnd}:${this.issueType(finding)}`)
      .digest("hex");
  }

  private issueType(finding: Finding): string {
    if (finding.cweId) return `cwe:${finding.cweId.toUpperCase()}`;

    const [prefix, ...rest] = finding.ruleId.split("/");
    const isAgentPrefix = rest.length > 0 && AGENT_KINDS.includes(prefix as AgentKind);
    return `rule:${isAgentPrefix ? rest.join("/") : finding.ruleId}`;
  }
}
