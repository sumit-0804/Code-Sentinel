import express, { type Express } from "express";

import { getCapabilities } from "./capabilities.js";
import type { MockAgentConfig } from "./config.js";
import { getHealth } from "./health.js";
import { buildReviewResponse } from "./review.js";

export function createApp(config: MockAgentConfig): Express {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  app.post("/v1/review", (req, res) => {
    buildReviewResponse(req.body, config)
      .then((outcome) => {
        if (outcome.kind === "hang") return; // MOCK_FAIL=timeout: never respond.
        res.status(outcome.kind === "ok" ? 200 : outcome.status).json(outcome.body);
      })
      .catch((error: unknown) => {
        res.status(500).json({ code: "internal_error", message: String(error) });
      });
  });

  app.get("/v1/capabilities", (_req, res) => {
    res.status(200).json(getCapabilities(config));
  });

  app.get("/healthz", (_req, res) => {
    const health = getHealth(config);
    res.status(health.status === "unavailable" ? 503 : 200).json(health);
  });

  return app;
}
