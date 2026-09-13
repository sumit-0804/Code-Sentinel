# Plan — Sumit Goyal (`sumit-0804`)

**Area:** Orchestration — shared contracts, LangGraph review graph, parallel fan-out, LLM layer
**Planned effort:** 105 h own module (Project Plan §4.1)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `packages/contracts/`
- `packages/llm/`
- `services/orchestrator/src/graph/`, `src/agents/`, `src/http/`, `src/server.ts`, `src/index.ts`
- `docs/design/**` (reviewed PRs only), `AGENTS.md`, `plans/README.md`, root `README.md`

Durgesh owns `services/orchestrator/src/aggregation/`, `src/context/`, `src/threshold/`,
`src/persistence/`. Call into them; do not edit them.

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Everyone | `@code-sentinel/contracts` | Wed 16-Sep |
| Ayush (gateway) | `POST /internal/v1/review-jobs` running | Fri 2-Oct |
| Tej, Parin (LLM agents) | `@code-sentinel/llm` | Fri 9-Oct |

## You depend on

- Durgesh — `services/mock-agent` (25-Sep), threshold + persistence nodes (3-Oct)
- Tej — `packages/agent-kit` shapes (agents must return `AgentReviewResponse`)
- Vatsal — CI (15-Sep), `docker-compose.yml` with Postgres (19-Sep)

## Changes from the original Project Plan

- **New:** `packages/contracts` (not in the plan; everyone is blocked without it).
- Graph, fan-out and timeout moved **earlier** (plan: 28-Sep → 6-Oct) because M5 on 9-Oct needs
  them integrated before that date.

---

## Phase 1 — Shared contracts (Mon 14 – Wed 16 Sep)

Unblocks the whole team. Merge as fast as possible.

- [ ] Create workspace `packages/contracts` (`@code-sentinel/contracts`, ESM, builds to `dist/`).
- [ ] Move every type from `services/orchestrator/src/types.ts` into it. Keep names identical.
- [ ] Add the missing shapes from the OpenAPI files:
  - `common.yaml`: `Language`, `ChangedFile`, `Error`, anything else referenced by more than one spec
  - `agent.yaml`: `AgentReviewRequest`, `AgentReviewResponse`, `Capabilities`, `Health`
  - `orchestrator.yaml`: `ReviewJobRequest`, `ReviewJob`
- [ ] Add runtime validators (zod) for every request body a service receives. Export both the
      schema and the inferred type so types and validation never drift.
- [ ] Replace `services/orchestrator/src/types.ts` with imports from contracts. Agree the switch with
      Durgesh first, because his files import it.
- [ ] Unit tests: one valid and one invalid example per schema, using the `examples` in the YAML.
- [ ] PR → approvals from Durgesh, Tej and Ayush.

**Done when:** `import { Finding, AgentReviewRequestSchema } from "@code-sentinel/contracts"` works
in any workspace and CI is green.

## Phase 2 — LangGraph review graph (Thu 17 – Tue 22 Sep)

Design: `class_orchestrator.mmd`, `state_review.mmd`, `seq_uc1_pr_review.mmd`.

- [ ] Add `@langchain/langgraph` to the orchestrator.
- [ ] `src/graph/review-state.ts` — `ReviewState` as a LangGraph `Annotation.Root` with the fields
      in the class diagram: `reviewId`, `organizationId`, `files`, `enabledAgents`,
      `confidenceThreshold`, `agentTimeoutMs`, `rawFindings`, `agentRuns`, `report`.
- [ ] `src/graph/review-graph.ts` — `StateGraph` with nodes in order:
      `fanOut → aggregate → context → threshold → persist`, `START`/`END` edges, `compile()`.
- [ ] `aggregate` node calls Durgesh's existing `aggregate()`; `context`, `threshold`, `persist`
      start as pass-through stubs until Durgesh's nodes land.
- [ ] Commit a short graph description to `services/orchestrator/README.md` (plan's "graph diagram
      approved" done-criterion).
- [ ] Tests: invoking the compiled graph with a fake fan-out produces a `CombinedReport`.

## Phase 3 — Agent client, parallel fan-out, timeouts (Wed 23 – Sun 27 Sep)

Requirements: FR-ORC-01, FR-ORC-02, NFR-02, NFR-04, AC-12.

- [ ] `src/agents/agent-client.ts` — `review()`, `capabilities()`, `health()` against `agent.yaml`,
      using `fetch` + `AbortController`. Sends `Authorization` with `SERVICE_TOKEN` and
      `X-Request-Id`.
- [ ] Agent URLs from env: `AGENT_SECURITY_URL`, `AGENT_STYLE_URL`, … Missing URL ⇒ run is `skipped`.
- [ ] `src/graph/fan-out-node.ts` — call every enabled agent with `Promise.allSettled`; each call
      has its own timeout (`agentTimeoutMs`, default 20000).
- [ ] Map each outcome to an `AgentRunSummary`: `succeeded`, `timed_out`, `failed` (HTTP 4xx/5xx,
      invalid body), `skipped`; record `latencyMs`.
- [ ] Validate each agent response with the contracts schema; an invalid body is `failed`, not a crash.
- [ ] Review status: all succeeded ⇒ `completed`; some failed/timed out ⇒ `partial`; none ⇒ `failed`.
- [ ] Tests with Durgesh's mock agent (or a stubbed `fetch`): one slow agent times out and the
      report still completes as `partial`; one agent returns 500; one returns malformed JSON.

**Done when:** all 5 agents are callable concurrently with mock responses, and a slow/failed agent
does not block the report.

## Phase 4 — Orchestrator HTTP service (Mon 28 Sep – Fri 2 Oct)

Contract: `docs/design/openapi/orchestrator.yaml`.

- [ ] `src/server.ts` — Express app on `PORT` (default 8080), JSON body limit, request id,
      `SERVICE_TOKEN` check on all `/internal/*` routes.
- [ ] `src/http/review-job-controller.ts`:
  - `POST /internal/v1/review-jobs` — validate, return **202** `ReviewJob`, run the graph in the
    background.
  - `Idempotency-Key` — same key returns **200** with the existing job (redelivered webhooks).
  - **422** when no agents are enabled.
  - `GET /internal/v1/review-jobs/{jobId}` — status + report when finished.
  - `POST /internal/v1/review-jobs/{jobId}/cancel`.
  - `GET /internal/v1/agents/health` — calls each agent's `/healthz`.
  - `GET /healthz`.
- [ ] Job store: in-memory map for MVP behind a small interface so it can move to Postgres later.
- [ ] Optional `callbackUrl`: POST the finished report there (best effort, one retry).
- [ ] `.env.example`, `npm run dev` / `npm start` scripts, README section on running it.
- [ ] Tests: 202 path, idempotent 200, 422, 401 without token, 400 on bad body.

**Handoff:** tell Ayush the orchestrator runs; agree whether the gateway polls the job or passes a
callback URL (polling is enough for MVP).

## Phase 5 — MVP integration (Sat 3 – Thu 8 Oct)

- [ ] Run the stack with `docker compose` (Vatsal) and the real Security + Style agents.
- [ ] Fix contract mismatches found in integration (through contract PRs, not local hacks).
- [ ] Walk the full UC-1 flow with Ayush and Vatsal on a real test PR.

## Phase 6 — LLM abstraction layer (Mon 5 – Fri 9 Oct)

Design: `class_llm.mmd`. Requirements: FR-LOG-02, NFR-11, NFR-14.

- [ ] Workspace `packages/llm` (`@code-sentinel/llm`).
- [ ] `LlmProvider` interface: `name()`, `complete(LlmRequest)`, `isAvailable()`.
- [ ] Providers via plain `fetch` (no vendor SDKs): `OpenRouterProvider`, `GeminiFlashProvider`,
      `GroqProvider`, `OllamaProvider`.
- [ ] `LlmClient` with ordered chain OpenRouter → Gemini Flash → Groq → Ollama; `ProviderPolicy`
      (timeout, retries, which errors fall back: timeout, 429, 5xx, network).
- [ ] `LlmResponse` includes `provider`, `model`, `fallbackDepth`, token counts.
- [ ] Prompt helpers: a system prompt template + a JSON-output parser that rejects malformed output.
- [ ] Tests with stubbed `fetch`: first provider 429 → second succeeds with `fallbackDepth: 1`;
      all fail → typed error the agent maps to HTTP 503.
- [ ] README with env vars and a 10-line usage example for agent owners.

**Done when:** fallback triggers automatically on provider error and Tej/Parin can use it.

## Phase 7 — Tests, demo (Sat 10 – Mon 12 Oct)

- [ ] Orchestrator test suite covers fan-out, timeout, partial result, idempotency, LLM fallback.
- [ ] Code walkthrough section for the mid-semester demo.
- [ ] **M6 demo, Mon 12-Oct.**

## Phase 8 — After the demo (13 Oct – 16 Nov)

- [ ] Review and merge contract PRs as agents 3–5 come online.
- [ ] Update `docs/design/diagrams/deployment.svg` labels (agents are Node, not Python) with Vatsal.
- [ ] Move the job store to PostgreSQL if restarts lose jobs in staging.
- [ ] **Support task (28–29 Oct):** LLM prompt tuning for the Documentation Agent with Parin.
- [ ] Orchestrator test cases for the Test Plan (by 4-Nov).
- [ ] Bug-fix pass and final report sections on orchestration (9–16 Nov).
