import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { MockAgentConfig } from "./config.js";
import type { AgentKind, Finding } from "./types.js";

const FIXTURES_DIR = fileURLToPath(new URL("../fixtures/", import.meta.url));

const DEFAULT_FIXTURE: Partial<Record<AgentKind, string>> = {
  security: "security-findings.json",
  logic: "logic-findings.json",
  style: "style-findings.json",
};

// Agent kinds without a fixture file (performance, documentation) return no findings until
// Parin builds their own fixtures under services/mock-agent/fixtures/.
export function loadFindings(config: MockAgentConfig): Finding[] {
  const file = config.findingsFile ?? defaultFixturePath(config.agentKind);
  if (!file) return [];

  try {
    return JSON.parse(readFileSync(file, "utf-8")) as Finding[];
  } catch {
    return [];
  }
}

function defaultFixturePath(agentKind: AgentKind): string | undefined {
  const fileName = DEFAULT_FIXTURE[agentKind];
  return fileName ? `${FIXTURES_DIR}${fileName}` : undefined;
}
