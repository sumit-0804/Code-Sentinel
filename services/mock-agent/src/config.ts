import type { AgentKind } from "./types.js";

export type MockFailMode = "500" | "timeout" | "malformed";

const AGENT_KINDS: readonly AgentKind[] = [
  "security",
  "style",
  "performance",
  "logic",
  "documentation",
];

// Matches plans/README.md's port table.
const DEFAULT_PORTS: Record<AgentKind, number> = {
  security: 8081,
  style: 8082,
  performance: 8083,
  logic: 8084,
  documentation: 8085,
};

export interface MockAgentConfig {
  agentKind: AgentKind;
  port: number;
  delayMs: number;
  failMode?: MockFailMode;
  findingsFile?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MockAgentConfig {
  const agentKind = parseAgentKind(env.MOCK_AGENT_KIND);
  const port = Number(env.PORT ?? DEFAULT_PORTS[agentKind]);
  const delayMs = Number(env.MOCK_DELAY_MS ?? 0);
  const failMode = parseFailMode(env.MOCK_FAIL);

  return { agentKind, port, delayMs, failMode, findingsFile: env.MOCK_FINDINGS_FILE };
}

function parseAgentKind(value: string | undefined): AgentKind {
  if (value && AGENT_KINDS.includes(value as AgentKind)) return value as AgentKind;
  return "security";
}

function parseFailMode(value: string | undefined): MockFailMode | undefined {
  if (value === "500" || value === "timeout" || value === "malformed") return value;
  return undefined;
}
