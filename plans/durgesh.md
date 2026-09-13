# Plan — Durgesh Khushlani (`durgesh`)

**Area:** Orchestration — aggregation, confidence threshold, persistence, vector DB context
**Planned effort:** 105 h own module (Project Plan §4.2)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `services/orchestrator/src/aggregation/`
- `services/orchestrator/src/context/`
- `services/orchestrator/src/threshold/` (new)
- `services/orchestrator/src/persistence/` (new)
- `services/mock-agent/` (new)

Sumit owns `src/graph/`, `src/agents/`, `src/http/`, `src/server.ts`, `src/index.ts`. Your code is
called from his graph nodes; export functions/classes and let him wire them in.

## Already done (PR #2)

Monorepo scaffold, `FindingAggregator` (de-dup), `SeverityRanker`, `buildReviewSummary`,
`aggregate()`, `SimilarIssueLookup`, `VectorRepository` interface + `ChromaVectorRepository` stub.
You are ahead of the original schedule, so this plan pulls some later work forward.

**Branch:** switch from `code-sentinel-durgesh` to `durgesh` (see `plans/README.md`).

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Sumit, Ayush | `services/mock-agent` running | Fri 25-Sep |
| Sumit | threshold function + `ReviewRepository` | Sat 3-Oct |
| Test Plan | de-dup rate measured on fixtures | Fri 9-Oct |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep); your imports move from `../types.js` to it
- Tej — `@code-sentinel/agent-kit` (17-Sep) for the mock agent
- Ayush — `@code-sentinel/db` migrations + client (18-Sep)
- Vatsal — ChromaDB in `docker-compose.yml`
- Parin — `fixtures/review-samples` (2-Oct)

## Changes from the original Project Plan

- Aggregation, de-dup and ranking: **done early**.
- **New:** mock agent service, confidence threshold node, orchestrator persistence (none had an
  owner in the plan; they sit in your part of the orchestrator).
- Vector DB start moved from 19-Oct to 12-Oct.
- Design embeds **findings** (`finding_embeddings` table), not whole code chunks as the plan text
  says. Follow the design.

---

## Phase 1 — Finish tests for existing code (Mon 14 – Wed 16 Sep)

- [ ] `severity-ranker.test.ts` — critical before warning before info; confidence order inside a band; input array not mutated.
- [ ] `review-summary.test.ts` — counts per severity; `autoFixedCount` vs `suggestedFixCount`.
- [ ] `aggregate` test — dedupe + rank + summary together; `status` defaults to `completed`.
- [ ] `similar-issue-lookup.test.ts` — with a fake `VectorRepository`: results attached; a throwing
      repository returns findings unchanged; `index` swallows errors.
- [ ] Edge case in `FindingAggregator`: same issue from two agents with **different `ruleId`s** is
      not merged today. Decide with Sumit whether FR-ORC-03 ("same issue type") needs a
      normalised issue key; add a test either way.
- [ ] When contracts merges, switch imports to `@code-sentinel/contracts`.

## Phase 2 — Confidence threshold (Thu 17 – Sat 19 Sep)

Requirement: FR-ORC-06. Agents report true confidence and do not filter (`agent.yaml`).

- [ ] `src/threshold/apply-threshold.ts` — pure function taking the report and threshold (default
      0.8). Findings below the threshold stay in the report but are marked as not postable
      (check `common.yaml` / `orchestrator.yaml` for the exact field; if none exists, raise a
      contract change with Sumit instead of adding one locally).
- [ ] Deterministic Style fixes are not dropped by the threshold (NFR-07) — confirm with Nevil.
- [ ] Tests: exactly at threshold, below, above, empty report.

## Phase 3 — Mock agent service (Mon 21 – Fri 25 Sep)

Lets Sumit test fan-out and Ayush test the gateway before real agents exist.

- [ ] `services/mock-agent` built on `@code-sentinel/agent-kit` (if not merged yet, plain Express
      and switch later).
- [ ] Implements `POST /v1/review`, `GET /v1/capabilities`, `GET /healthz` exactly as `agent.yaml`.
- [ ] Env-controlled behaviour: `MOCK_AGENT_KIND`, `MOCK_DELAY_MS`, `MOCK_FAIL=500|timeout|malformed`,
      `MOCK_FINDINGS_FILE` (JSON list of findings to return).
- [ ] Ships 2–3 realistic finding sets (security, style) that include one cross-agent duplicate.
- [ ] Dockerfile + entry for Vatsal's `docker-compose.yml` (send him the snippet).
- [ ] README: how to run five instances on 8081–8085 for local fan-out testing.

## Phase 4 — Orchestrator persistence (Mon 28 Sep – Sat 3 Oct)

Design: `seq_uc1_pr_review.mmd` step "persist review, agent_runs, findings, suggestions";
tables in `schema.sql`.

- [ ] `src/persistence/review-repository.ts` using the client from `@code-sentinel/db`.
- [ ] `createReview` at job start (status `queued` → `running`).
- [ ] `saveResult` in **one transaction**: update `reviews` (status, summary counts, duration),
      insert `agent_runs`, `findings`, `suggestions`.
- [ ] `markFailed` for crashed jobs.
- [ ] If a query you need is missing in `packages/db`, ask Ayush — do not write raw SQL for tables
      he owns without agreeing it.
- [ ] Integration test against the docker-compose Postgres: a report round-trips.

## Phase 5 — MVP integration (Mon 5 – Fri 9 Oct)

- [ ] Help Sumit wire threshold + persist nodes into the graph.
- [ ] Run Parin's fixtures through aggregate; measure duplicate rate (**target < 5%**) and record it
      in the orchestrator README for the Test Plan.
- [ ] **M5 Fri 9-Oct, M6 demo Mon 12-Oct.**

## Phase 6 — Vector DB and embeddings (Mon 12 – Sat 24 Oct)

Requirements: FR-VDB-01, FR-VDB-02, FR-ORC-05, NFR-13, US-13.

- [ ] `Embedder` interface in `src/context/`; first implementation calls Ollama
      (`nomic-embed-text`) over HTTP so it stays free and local. Text = rule + title + description
      + snippet.
- [ ] Implement `ChromaVectorRepository` with the `chromadb` client: **one collection per
      organization**, upsert on `index`, `querySimilar` with a similarity cut-off.
- [ ] Write `finding_embeddings` rows (finding ↔ vector id) and `finding_similarities` rows for
      matches, via `@code-sentinel/db`.
- [ ] Index findings after a review is persisted (best effort, never fails the review).
- [ ] Seed script: embed the seeded review history so the demo shows recurring issues.

**Done when:** findings are embedded and stored after each review.

## Phase 7 — Similarity in the report (Tue 27 – Fri 30 Oct)

- [ ] `context` node implementation (export it; Sumit wires it) attaching `similarPastIssues`.
- [ ] Verify tenant isolation: org A never sees org B's issues (test).
- [ ] Latency check: context step adds < 2 s for a 20-finding report; cap `limit` if not.

**Done when:** past similar issues appear in the combined report.

## Phase 8 — Tests and hardening (31 Oct – 16 Nov)

- [ ] Unit + integration tests for merge, de-dup, threshold, persistence and search paths (31-Oct – 1-Nov).
- [ ] **Support task (2-Nov):** agree severity thresholds for Security Agent suggestions with Tej.
- [ ] Your module's cases in the Test Plan (by 4-Nov).
- [ ] **Contract tests with Ayush (12–13 Nov):** Postman/Newman collection for orchestrator endpoints.
- [ ] Bug-fix pass; final report section on aggregation and context.
