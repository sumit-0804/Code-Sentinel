# Plan — Ayush Soni (`ayush`)

**Area:** Backend & Database — API Gateway, PostgreSQL migrations and data access
**Planned effort:** 90 h own module (Project Plan §4.6)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `services/gateway/` (new)
- `packages/db/` (new)

GitHub API calls (Octokit, Checks, review comments) live in `packages/github`, owned by Vatsal.
The gateway imports it; do not call Octokit directly from the gateway.

## Status

The original plan had the gateway on 3–11 Sep and the schema/migrations on 14–16 Sep. Neither is
started, so this is the most time-critical module for M5. `schema.sql` is already written in
`docs/design/schema/`, so migrations are quick.

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Durgesh, Sumit | `@code-sentinel/db` client + migrations | Fri 18-Sep |
| Vatsal | gateway webhook route to plug GitHub calls into | Wed 23-Sep |
| MVP (M5) | webhook → orchestrator → report → GitHub | Thu 8-Oct |
| Moksh, Nevil | `/v1/reviews`, `/v1/repositories`, `/v1/findings` routes | Fri 23-Oct |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep); orchestrator endpoint (2-Oct)
- Vatsal — CI (15-Sep), Postgres in `docker-compose.yml` (19-Sep); `packages/github` (26-Sep)
- Durgesh — mock agent (25-Sep) for testing without real agents

---

## Phase 1 — Database package (Mon 14 – Fri 18 Sep)

Source: `docs/design/schema/schema.sql`, `er_core.mmd`, `er_identity.mmd`.

- [ ] Workspace `packages/db` (`@code-sentinel/db`) with `pg` and `node-pg-migrate`.
- [ ] Migration `001_initial` created from `schema.sql` — every enum, table, index and constraint.
- [ ] `npm run migrate:up` / `migrate:down -w @code-sentinel/db` against `DATABASE_URL`.
- [ ] `src/client.ts` — shared pool + a `withTransaction(fn)` helper.
- [ ] Query modules the MVP needs:
  - `repositories` — find by GitHub installation + full name; get effective agent config and
    threshold (override → org default → 0.8)
  - `reviews` — create, update status, get by id (org-scoped), list with filters
  - `agent_runs`, `findings`, `suggestions` — bulk insert (used by Durgesh's persistence)
  - `api_keys` — look up by hash
- [ ] `seed` script: one org, one admin user, one installation, one repo with all 5 agents enabled,
      a few past reviews with findings (the Test Plan needs a seeded DB).
- [ ] Test: `migrate up → down → up` runs cleanly on a fresh database.

**Done when:** migrate up/down runs cleanly on a fresh DB and the ER diagram matches.

## Phase 2 — Gateway scaffold + webhook receipt (Sat 19 – Wed 23 Sep)

Contract: `docs/design/openapi/gateway.yaml`. Requirements: FR-GW-01…05, AC-01.

- [ ] `services/gateway` — Express + TypeScript on `PORT` (default 3000).
- [ ] Middleware: request id, JSON logging, error handler returning the `common.yaml` `Error` shape,
      CORS for the dashboard origin only.
- [ ] `GET /healthz` (checks DB + orchestrator reachability).
- [ ] `POST /webhooks/github` — **FR-GW-03**:
  - read the **raw body** (`express.raw`) before any JSON parsing;
  - verify `X-Hub-Signature-256` with HMAC-SHA256 using `GITHUB_WEBHOOK_SECRET` and
    `crypto.timingSafeEqual`;
  - invalid ⇒ **401 `invalid_signature`**, payload never parsed or forwarded;
  - handle `pull_request` actions `opened`, `synchronize`, `reopened`; ignore others with 202;
  - use `X-GitHub-Delivery` as the orchestrator `Idempotency-Key`.
- [ ] Tests: valid signature, tampered body, missing header, ignored event type.

## Phase 3 — Route to orchestrator (Thu 24 – Wed 30 Sep)

Sequence: `seq_uc1_pr_review.mmd`.

- [ ] `src/clients/orchestrator-client.ts` — `createReviewJob`, `getReviewJob` with `SERVICE_TOKEN`.
- [ ] Webhook flow:
  1. look up repository + enabled agents + threshold in the DB;
  2. get the PR's changed files and patches via `packages/github` (Vatsal);
  3. build `ReviewJobRequest` (diff hunks only, NFR-06) and POST to the orchestrator;
  4. respond **202** to GitHub fast; create the in-progress Check Run within 5 s (AC-01, via Vatsal's package).
- [ ] When the job finishes (poll `GET /internal/v1/review-jobs/{jobId}` for MVP), hand the report to
      Vatsal's `publishReview()` to update the Check Run and post suggestions.
- [ ] Rate limiter per installation (FR-GW-05).
- [ ] Until Vatsal's package is ready, use a stub with the same function signatures.
- [ ] Test against Durgesh's mock agents with a recorded webhook payload.

**Done when:** a GitHub webhook payload is accepted, verified and forwarded.

## Phase 4 — MVP integration (Thu 1 – Fri 9 Oct)

- [ ] Gateway service in `docker-compose.yml` (give Vatsal the Dockerfile).
- [ ] End-to-end with Sumit and Vatsal on a real test PR.
- [ ] **M5 Fri 9-Oct, M6 demo Mon 12-Oct.**

## Phase 5 — Client-facing API (Tue 13 – Fri 23 Oct)

Needed by the dashboard and VS Code extension. Every read is scoped to the caller's organization
(NFR-13).

- [ ] Auth middleware: **session cookie** for the dashboard, **API key** (`Authorization: Bearer`)
      for VS Code; both resolve to user + organization. API keys stored hashed only. Follow the
      `securitySchemes` in `gateway.yaml` exactly.
- [ ] Dashboard login flow (GitHub OAuth, `sessions` table) — confirm details with Moksh and Vatsal.
- [ ] `GET /v1/me`, `GET/POST /v1/me/api-keys`, `DELETE /v1/me/api-keys/{keyId}`.
- [ ] `POST /v1/reviews` (on-demand, VS Code), `GET /v1/reviews` (filters: repo, date, severity,
      paging), `GET /v1/reviews/{reviewId}`, `GET /v1/reviews/{reviewId}/events` (SSE).
- [ ] `POST /v1/findings/{findingId}/suggestion/accept` and `/reject`.
- [ ] `POST /v1/reviews/{reviewId}/style-fixes` (calls the Style Agent's fixes — agree with Nevil).
- [ ] `GET /v1/repositories`, `GET/PUT /v1/repositories/{repositoryId}/config` (admin only for PUT).
- [ ] Tests for auth failures (401/403) and org isolation on every route.

## Phase 6 — Deployment, contract tests, test plan (Nov)

- [ ] **Test Plan coordinator (2–6 Nov):** collect every member's cases into the M7 document.
- [ ] **Deployment (9–11 Nov):** production Dockerfile, DB service wiring, migrations run on deploy
      (with Vatsal). Done when the app boots against containerised Postgres in staging.
- [ ] **Contract/integration tests (12–13 Nov):** Postman/Newman collection covering gateway,
      orchestrator and agents, run in CI (with Durgesh).
- [ ] **Support task (14-Nov):** validate dashboard review-history queries against seed data.
