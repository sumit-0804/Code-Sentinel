// Mirrors the parts of docs/design/openapi/agent.yaml and common.yaml this service needs.
// Temporary, like services/orchestrator/src/types.ts -- move to @code-sentinel/contracts
// once Sumit merges it.

export type AgentKind = "security" | "style" | "performance" | "logic" | "documentation";
export type Language = "javascript" | "typescript" | "python" | "unknown";
export type Severity = "critical" | "warning" | "info";
export type Confidence = number;

export interface CodeLocation {
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

export interface Suggestion {
  kind: "deterministic" | "ai_suggested";
  originalSnippet: string;
  suggestedSnippet: string;
  explanation?: string;
}

export interface Finding {
  agent: AgentKind;
  ruleId: string;
  title: string;
  description: string;
  location: CodeLocation;
  severity: Severity;
  confidence: Confidence;
  cweId?: string;
  suggestion?: Suggestion;
}

export interface ChangedFile {
  path: string;
  language: Language;
  changeType?: "added" | "modified" | "renamed" | "deleted";
  previousPath?: string;
  patch: string;
  contextBefore?: string;
}

export interface AgentReviewRequest {
  reviewId: string;
  language?: Language;
  files: ChangedFile[];
  confidenceThreshold?: Confidence;
  options?: Record<string, unknown>;
}

export interface SkippedFile {
  path: string;
  reason: "unsupported_language" | "too_large" | "generated_file" | "binary";
}

export interface AgentReviewResponse {
  reviewId: string;
  agent: AgentKind;
  serviceVersion?: string;
  findings: Finding[];
  analyzedFileCount?: number;
  skippedFiles?: SkippedFile[];
  latencyMs?: number;
}

export interface Capabilities {
  agent: AgentKind;
  version: string;
  languages: Language[];
  usesLlm?: boolean;
  producesDeterministicFixes?: boolean;
  maxDiffBytes?: number;
}

export interface Health {
  status: "ok" | "degraded" | "unavailable";
  version?: string;
  checks?: Record<string, string>;
}

export interface ErrorBody {
  code: string;
  message: string;
}
