import type { MockAgentConfig } from "./config.js";
import type { Capabilities } from "./types.js";

export function getCapabilities(config: MockAgentConfig): Capabilities {
  return {
    agent: config.agentKind,
    version: "0.0.0",
    languages: ["javascript", "typescript", "python"],
    usesLlm: false,
    producesDeterministicFixes: config.agentKind === "style",
  };
}
