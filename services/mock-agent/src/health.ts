import type { MockAgentConfig } from "./config.js";
import type { Health } from "./types.js";

export function getHealth(config: MockAgentConfig): Health {
  if (config.failMode === "500") return { status: "unavailable", version: "0.0.0" };
  return { status: "ok", version: "0.0.0" };
}
