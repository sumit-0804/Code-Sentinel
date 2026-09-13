# CodeSentinel — Team Build Plan

Written 13-Sep-2026 (start of week 8). This turns the Project Plan
(`docs/CodeSentinel_Project_Plan.pdf`) into branch-by-branch work, using what is already in the
repo. Each member has one file in this folder named after their branch.

| Member | Branch | Plan | Area |
| --- | --- | --- | --- |
| Sumit Goyal | `sumit-0804` | [sumit-0804.md](sumit-0804.md) | Orchestration — graph, fan-out, contracts, LLM layer |
| Durgesh Khushlani | `durgesh` | [durgesh.md](durgesh.md) | Orchestration — aggregation, threshold, persistence, vector DB |
| Ayush Soni | `ayush` | [ayush.md](ayush.md) | Backend — API Gateway, PostgreSQL |
| Vatsal Kamani | `vatsal` | [vatsal.md](vatsal.md) | DevOps — CI, Docker, GitHub App, deployment |
| Tej Prakash Tak | `tej` | [tej.md](tej.md) | Agents — agent kit, Security Agent, Logic Agent |
| Nevil Nandasana | `nevil` | [nevil.md](nevil.md) | Agents — Style Agent, VS Code extension commands |
| Parin Makwana | `parin` | [parin.md](parin.md) | Agents — review fixtures, Performance Agent, Documentation Agent |
| Moksh Mehta | `moksh` | [moksh.md](moksh.md) | Frontend — Next.js dashboard, VS Code webview |

Using an AI coding agent? `AGENTS.md` at the repo root tells it to read your plan file and stay
inside your paths. Point it at your plan: *"Read AGENTS.md and plans/<branch>.md, then do the next
unchecked task."*

## Where we are

Done: Proposal, Plan, BRD, System Design Document (all diagrams, 4 OpenAPI specs, `schema.sql`,
wireframes), monorepo scaffold, and the orchestrator's aggregation, de-duplication, severity
ranking and similar-issue lookup logic.

Not started: CI, API Gateway, database migrations, all five agents, the LangGraph graph, the LLM
layer, the GitHub App, the dashboard and the VS Code extension.

Behind the original plan: CI (was 2-Sep) and the API Gateway (was 3–11 Sep).

## Decisions already made

- **All our code is TypeScript.** Reviewed code can be JS, TS or Python; Python tools (Ruff,
  Black, Bandit, Semgrep) run as CLIs inside Docker images. The deployment diagram's "Python"
  labels on agents are outdated.
- **LangGraph's official TypeScript library** (`@langchain/langgraph`) is used for the orchestrator.
- **Vitest**, not Jest, for all tests.
- Agent services share one contract (`docs/design/openapi/agent.yaml`) and one base library
  (`packages/agent-kit`).

## Target milestones

| Date | Milestone | What must be true |
| --- | --- | --- |
| Thu 17-Sep | **Unblock gate** | `packages/contracts`, `packages/agent-kit` and CI merged to `main` |
| Fri 25-Sep | Skeletons | Gateway receives a signed webhook; mock agent and DB migrations run; agents answer `/healthz` |
| Fri 2-Oct | Pieces work alone | Orchestrator fans out to mock agents with timeout; Security and Style agents return real findings locally |
| Wed 7-Oct | Stack runs together | `docker compose up` → webhook → orchestrator → 2 agents → report stored |
| **Fri 9-Oct** | **M5 — MVP** | Real GitHub PR → Check Run + at least one inline suggested change |
| Mon 12-Oct | **M6 — Mid-semester demo** | Live demo, slides, code walkthrough |
| Fri 30-Oct | Feature complete (backend) | All 5 agents, LLM fallback, vector DB context, apply-fix flow |
| Fri 6-Nov | **M7 — Test Plan** | Test plan + cases + results, bug log, seeded DB |
| Fri 13-Nov | Clients complete | Dashboard, VS Code extension, staging deploy, E2E + contract tests green |
| **Mon 16-Nov** | **M8 — Final app live** | Public URL, README, deployment notes |
| Wed 18-Nov | M9 — Report & presentation | 15–25 page report, 10–15 slides, poster, demo |
| Thu 19-Nov | M10 — Peer review | Forms submitted |

## Dependency order

```
contracts (Sumit) ─┬─> agent-kit (Tej) ─┬─> Security + Logic (Tej)
                   │                    ├─> Style (Nevil)
                   │                    ├─> Performance + Documentation (Parin)
                   │                    └─> mock-agent (Durgesh)
                   ├─> orchestrator graph + fan-out (Sumit) ─> persistence, threshold, context (Durgesh)
                   ├─> gateway (Ayush) <── db migrations (Ayush)
                   │        └── uses github package (Vatsal)
                   └─> llm package (Sumit) ─> Logic, Performance, Documentation, Security LLM step
CI + docker-compose (Vatsal) ─> everyone
gateway API ─> dashboard (Moksh), VS Code extension (Nevil + Moksh)
```

## Ownership map

One owner per path. Only the owner (or their AI agent) edits it; others ask the owner.

| Path | Owner |
| --- | --- |
| `packages/contracts/` | Sumit |
| `packages/llm/` | Sumit |
| `services/orchestrator/src/graph/`, `src/agents/`, `src/http/`, `src/index.ts`, `src/server.ts` | Sumit |
| `services/orchestrator/src/aggregation/`, `src/context/`, `src/threshold/`, `src/persistence/` | Durgesh |
| `services/mock-agent/` | Durgesh |
| `services/gateway/` | Ayush |
| `packages/db/` | Ayush |
| `packages/github/` | Vatsal |
| `.github/`, `infra/`, `docker-compose.yml`, root `package.json`, `turbo.json`, `tsconfig.base.json`, root lint/format config | Vatsal |
| `packages/agent-kit/` | Tej |
| `services/agent-security/`, `services/agent-logic/` | Tej |
| `services/agent-style/` | Nevil |
| `apps/vscode-extension/` (except `src/webview/`) | Nevil |
| `services/agent-performance/`, `services/agent-documentation/` | Parin |
| `fixtures/` | Parin |
| `apps/dashboard/` | Moksh |
| `apps/vscode-extension/src/webview/` | Moksh |
| `docs/design/**` | Sumit (update only through a reviewed PR) |
| `plans/<branch>.md` | That member |
| `AGENTS.md`, `plans/README.md`, root `README.md` | Sumit |

**Contract changes** (`packages/contracts`, `docs/design/openapi/*.yaml`, `docs/design/schema/schema.sql`)
need a PR approved by Sumit **and** every owner whose service consumes the changed shape.

## Branch workflow

One-time setup:

```bash
git clone https://github.com/sumit-0804/Code-Sentinel.git
cd Code-Sentinel
git checkout -b <your-branch> origin/main
npm install
git push -u origin <your-branch>
```

Durgesh already has `code-sentinel-durgesh` (fully merged). Switch to `durgesh` so everyone
follows the same naming.

Daily loop:

```bash
git fetch origin
git merge origin/main
npm install
npm run typecheck && npm run test
```

Getting work into `main`:

1. Open a PR from your branch to `main` for each **finished chunk** (one checkbox group in your
   plan) — not one giant PR at the end. Aim for at least one PR a week.
2. CI must be green. One other member must approve (this is Trello's "In Review" step).
3. After it merges, keep working on the same branch after `git merge origin/main`.
4. `package-lock.json` conflict: take `main`'s version, run `npm install`, commit the result.

Never push to `main` directly, never force-push a shared branch, never commit `.env` files.

## Ports and environment

| Service | Port | Key env vars |
| --- | --- | --- |
| Gateway | 3000 | `DATABASE_URL`, `ORCHESTRATOR_URL`, `SERVICE_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` |
| Dashboard | 3001 | `NEXT_PUBLIC_API_URL` |
| Orchestrator | 8080 | `DATABASE_URL`, `CHROMA_URL`, `SERVICE_TOKEN`, `AGENT_<KIND>_URL`, `AGENT_TIMEOUT_MS` |
| Security / Style / Performance / Logic / Documentation | 8081 / 8082 / 8083 / 8084 / 8085 | `SERVICE_TOKEN`, LLM keys where needed |
| Mock agent | 8089 | `MOCK_AGENT_KIND`, `MOCK_DELAY_MS`, `MOCK_FAIL` |
| ChromaDB | 8000 | — |
| PostgreSQL | 5432 | — |

LLM keys (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`) are read only
by `packages/llm`. Every service ships a `.env.example`; real `.env` files are never committed.

## Whole-team work (everyone)

| Work | When | Lead |
| --- | --- | --- |
| Weekly 1-page progress report (PDF, repo + Classroom) | every Friday | rotate: Sumit → Durgesh → Ayush → Vatsal → Tej → Nevil → Parin → Moksh |
| Mid-semester demo slides + code walkthrough | 5–11 Oct | Moksh (slides), Sumit (walkthrough), everyone rehearses Sat 10-Oct |
| Test Plan & Test Cases (M7) | 2–6 Nov | Ayush coordinates, each member writes their module's cases |
| Final report, presentation, poster, video, user manual | 14–18 Nov | split in a team meeting on Mon 9-Nov |
| AI prompts log for each stage (course requirement) | ongoing | each member keeps their own |
