# Plan — Vatsal Kamani (`vatsal`)

**Area:** Integrations & DevOps — CI, local Docker stack, GitHub App, deployment
**Planned effort:** 90 h own module (Project Plan §4.7)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `.github/` (workflows, PR template)
- `infra/`, `docker-compose.yml`
- root `package.json`, `turbo.json`, `tsconfig.base.json`, root ESLint/Prettier config
- `packages/github/` (new)

Service Dockerfiles live inside each service and belong to that service's owner; you own how they
are composed and deployed.

## Status

Monorepo scaffold is done (Durgesh did it in PR #2). CI (planned 2-Sep) is not. The GitHub App was
planned for 19–30 Oct, but **M5 on 9-Oct needs a PR comment posted back**, so the core of it moves
to late September.

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Everyone | CI on PRs | Tue 15-Sep |
| Everyone | `apps/*` workspace + lint config | Tue 15-Sep |
| Durgesh, Ayush | Postgres + ChromaDB in `docker-compose.yml` | Sat 19-Sep |
| Ayush | `packages/github`: PR files + Check Run create | Sat 26-Sep |
| Ayush (M5) | `publishReview()`: Check Run update + inline suggestions | Tue 6-Oct |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep) for `CombinedReport`
- Ayush — gateway webhook route (23-Sep)
- Each service owner — their Dockerfile

## Changes from the original Project Plan

- GitHub App webhook + Checks + suggestions moved from 19–30 Oct to 21 Sep – 7 Oct (MVP needs them).
- **New:** `docker-compose.yml` for local development.
- 19–30 Oct is now used for the apply-fix flow (FR-GH-04) and installation sync.

---

## Phase 1 — CI and shared config (Mon 14 – Tue 15 Sep)

- [ ] Add `apps/*` to root `workspaces` (dashboard and VS Code extension go there).
- [ ] Root ESLint (flat config, `typescript-eslint`) + Prettier matching `.editorconfig`; add a
      `lint` script to the orchestrator so `turbo run lint` has something to run.
- [ ] `.github/workflows/ci.yml` on `pull_request` to `main` and on push to `main`:
      Node 20, `npm ci`, `npx turbo run lint typecheck test build`, cache `~/.npm` and `.turbo`.
- [ ] `.github/pull_request_template.md`: what changed, plan checkbox(es), how tested.
- [ ] Ask Sumit (repo owner) to enable branch protection on `main`: require CI + 1 approval, no
      direct pushes.
- [ ] CI badge in root `README.md` (ask Sumit to merge that one-line change).

**Done when:** CI badge green on `main`; a failing test blocks merge.

## Phase 2 — Local stack (Wed 16 – Sat 19 Sep)

- [ ] `docker-compose.yml`: `postgres:15` (5432, volume), `chromadb/chroma` (8000), and Ollama
      (optional profile `llm`).
- [ ] Profiles/services added as owners deliver Dockerfiles: gateway 3000, orchestrator 8080,
      agents 8081–8085, mock agent 8089, dashboard 3001.
- [ ] Root `.env.example` listing every variable from the ports table in `plans/README.md`.
- [ ] `infra/README.md`: `docker compose up`, run migrations, seed, reset.

## Phase 3 — GitHub App basics (Mon 21 – Sat 26 Sep)

Requirements: FR-GH-01, AC-01.

- [ ] Register a **test GitHub App** in a team test org with a test repo. Permissions: Pull
      requests (read/write), Checks (read/write), Contents (read), Metadata (read). Events:
      `pull_request`, `installation`, `installation_repositories`.
- [ ] Share App ID / webhook secret / private key through a private channel — never in the repo.
- [ ] Local webhook delivery via smee.io (or similar) to `localhost:3000/webhooks/github`.
- [ ] Workspace `packages/github` (`@code-sentinel/github`) with Octokit App auth:
  - `getInstallationClient(installationId)`
  - `getPullRequestFiles(installationId, owner, repo, prNumber)` → `ChangedFile[]` with patches
  - `createCheckRun(...)` in progress
- [ ] Tests with recorded API responses (no live calls in CI).

**Done when:** the App receives `pull_request` events from the test repo.

## Phase 4 — Post results back (Mon 28 Sep – Wed 7 Oct)

Requirements: FR-GH-02, FR-GH-03. Wireframe: `12-pull-request-check.png`.

- [ ] `updateCheckRun(...)` with conclusion from the report: `fail` if any critical, `neutral`
      if partial, else `pass`; summary text with counts and which agents timed out.
- [ ] `postReviewSuggestions(...)` — one PR review with inline comments using GitHub's
      ```` ```suggestion ```` blocks, **only for findings above the confidence threshold**.
- [ ] Map `lineStart/lineEnd` to diff positions correctly (multi-line suggestions use
      `start_line` + `line`).
- [ ] `publishReview(installationId, pr, report)` combining both — the one function Ayush calls.
- [ ] Nothing is committed to the branch (FR-GH-04 happens only when the author acts).

**Done when:** a suggested change appears inline on a real test PR.

## Phase 5 — MVP (Thu 8 – Mon 12 Oct)

- [ ] **End-to-end on a live PR (M5, Fri 9-Oct):** open PR → Check Run in progress → suggestions.
- [ ] Prepare the demo repo and PR with Parin's seeded samples.
- [ ] **M6 demo Mon 12-Oct.**

## Phase 6 — GitHub App completion (Mon 19 – Fri 30 Oct)

- [ ] `installation` / `installation_repositories` events keep `github_installations` and
      `repositories` in sync (via Ayush's db queries).
- [ ] Apply-fix flow (UC-3, `seq_uc3_apply_fix.mmd`, FR-GH-04): when a suggestion is accepted
      through the gateway, create the commit via the API.
- [ ] Update `docs/design/diagrams/deployment.svg` labels (agents are Node, not Python) — PR
      reviewed by Sumit.
- [ ] **Pick the hosting target by 30-Oct.** The Style Agent needs Docker to run linters, so pure
      serverless hosts (Vercel/Firebase) can't run the agents. Option: dashboard on Vercel, all
      services on one Docker-capable host (Render/Railway/Fly.io or a VM). Write the decision in
      `infra/README.md`.

## Phase 7 — Deployment and E2E (Nov)

- [ ] Your cases in the Test Plan (by 4-Nov).
- [ ] **Deployment (9–11 Nov):** public hosting, live URL, CI/CD deploys `main` automatically,
      secrets in the host's secret store. Helm chart only if time remains (course "preferred").
- [ ] **End-to-end test (12–13 Nov):** real GitHub PR through to posted comment against the live
      deployment (with Tej).
- [ ] **Support task (14-Nov):** repo-level agent configuration in the dashboard, tested with Moksh.
- [ ] Deployment notes for M8 (16-Nov).
