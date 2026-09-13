# AGENTS.md — rules for AI coding agents

These rules apply to every AI coding agent working in this repository (Cursor, Codex, Antigravity,
Claude Code, Copilot or any other). Human contributors follow them too.

## 1. Before doing anything

1. Run `git branch --show-current`. Each team member works on their own branch.
2. Open that member's plan: `plans/<branch>.md` (for example `plans/durgesh.md`). It lists the
   member's tasks, the paths they own, and what they depend on.
3. Read `plans/README.md` for the team timeline, the ownership map and the merge rules.
4. If the branch is `main`, stop and ask the user which member's branch to switch to. Never work
   directly on `main`.
5. If no plan file matches the branch, ask the user before continuing.

## 2. Project in one paragraph

CodeSentinel is a multi-agent code review platform. A GitHub App, a VS Code extension and a
Next.js dashboard call an **API Gateway** (Express, :3000). The gateway calls the **Orchestrator**
(LangGraph via `@langchain/langgraph`, :8080), which fans a diff out in parallel to five **agent
services** — Security :8081, Style :8082, Performance :8083, Logic :8084, Documentation :8085 —
then de-duplicates, ranks and returns one combined report. Data lives in **PostgreSQL 15** (:5432)
and **ChromaDB** (:8000). The dashboard runs on :3001.

## 3. Source of truth

Implement what the design says. Do not invent endpoints, fields or tables.

| Question | Look here |
| --- | --- |
| HTTP endpoints, request/response shapes | `docs/design/openapi/*.yaml` (`common.yaml` holds shared schemas) |
| Database tables and enums | `docs/design/schema/schema.sql` |
| Classes and responsibilities | `docs/design/diagrams/mermaid/class_*.mmd`, `component.mmd` |
| Request flows | `docs/design/diagrams/mermaid/seq_uc*.mmd`, `state_review.mmd` |
| UI screens | `docs/design/wireframes/*.png` and `wireframes/README.txt` |
| Requirement IDs (FR-*, NFR-*, AC-*) | `docs/CodeSentinel_Requirements_Specification_BRD.pdf` |

If the design is ambiguous or seems wrong, stop and ask the user. Do not silently diverge.

## 4. Technology rules

- **All project code is TypeScript** (Node.js 20+, ESM, `"type": "module"`). No Python, Go or
  other languages in this repository's source code.
- The code being **reviewed** can be JavaScript, TypeScript or Python. Python-ecosystem tools
  (Ruff, Black, Bandit, Semgrep) are installed inside Docker images and invoked as external CLIs
  from TypeScript. They are never imported as project code.
- The deployment diagram currently labels some agents "Python". That label is outdated; agents
  are Node/TypeScript.
- Monorepo: npm workspaces + Turborepo. Workspaces live in `apps/*`, `services/*`, `packages/*`.
  Package names are `@code-sentinel/<name>`.
- TypeScript config extends `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`,
  `module: NodeNext`). Relative imports must use the `.js` suffix, e.g.
  `import { x } from "./x.js";`.
- Tests use **Vitest**, colocated as `*.test.ts` next to the code. Not Jest.
- Shared types and request validation come from `@code-sentinel/contracts`. Never redefine
  `Finding`, `CombinedReport`, `AgentReviewRequest` etc. inside a service.
- LLM calls go through `@code-sentinel/llm` only. Never call an LLM provider SDK or URL directly
  from an agent.
- Database access goes through `@code-sentinel/db` only.
- GitHub API access goes through `@code-sentinel/github` only.
- Do not add a dependency when the standard library or an existing dependency can do the job.
  If a new dependency is needed, say which one and why in the PR description.

## 5. Ownership — stay inside your paths

Every path in the repo has one owner (full map in `plans/README.md`). An agent working on a
member's branch may only create or edit files in **that member's owned paths**, plus:

- the member's own plan file `plans/<branch>.md` (tick checkboxes, add notes);
- new files the plan explicitly assigns to the member.

If a task needs a change in someone else's path (a new field in `packages/contracts`, a new query
in `packages/db`, a new root script), **do not make the change**. Tell the user what is needed and
from whom, so they can ask the owner or open an issue.

Never edit:

- `docs/design/**` and `docs/*.pdf` unless the plan assigns that document to the member;
- another member's plan file;
- `AGENTS.md` or `plans/README.md` unless the user explicitly asks.

## 6. Coding rules

- Keep changes minimal and focused on the current task. No drive-by refactors in other modules.
- Follow the existing style in the file you are editing. `.editorconfig`: 2 spaces, LF, UTF-8.
- **Comments: single-line `//` only.** No `/* */` blocks, no JSDoc blocks. Only add a comment
  when it gives context the code cannot (a requirement ID, a non-obvious reason). Do not restate
  what the code does.
- Reference requirement IDs where they explain behaviour, e.g. `// FR-ORC-02: slow agent must not block`.
- Validate every external input (HTTP bodies, webhook payloads, LLM output) before using it.
- Errors returned over HTTP use the `Error` schema in `common.yaml`.
- Every service exposes `GET /healthz`.
- Configuration comes from environment variables. Add every new variable to the service's
  `.env.example` with a safe placeholder.
- **Never commit secrets**: no API keys, tokens, private keys, webhook secrets or `.env` files.
- Diffs sent to LLMs contain changed hunks only, never whole repositories (NFR-06).
- Data is always scoped to one organization; never query or embed across organizations (NFR-13).

## 7. Definition of done for any task

Before telling the user a task is done:

1. `npm run typecheck`, `npm run test` and `npm run build` pass from the repo root.
2. New logic has Vitest tests, including the failure path.
3. The service's `README.md` is updated if setup, env vars or endpoints changed.
4. The matching checkbox in `plans/<branch>.md` is ticked.
5. If something could not be finished or verified, say so plainly. Do not claim it works.

## 8. Git rules

- Work only on the member's own branch. Never commit to `main`.
- **Never commit or push unless the user explicitly asks.** Never force-push.
- Commit messages: 3–4 words, imperative, no body, no prefixes, no emojis, no co-author lines,
  no "generated by AI" text. Examples: `Add webhook signature check`, `Fix agent timeout`.
- Before starting new work, bring the branch up to date with `main`:
  `git fetch origin && git merge origin/main`.
- If `package-lock.json` conflicts, take the version from `main`, then run `npm install` to
  regenerate it. Do not hand-edit the lockfile.
- Only stage files you changed for the task. Never stage `.env`, `dist/`, `node_modules/`.
- Changes reach `main` only through a pull request with green CI and one approving review from
  another member.

## 9. Asking instead of guessing

Stop and ask the user when:

- the task needs a change outside the member's owned paths;
- a contract (`openapi/*.yaml`, `packages/contracts`) seems to need a new or changed field;
- the design documents disagree with each other or with the plan;
- a destructive action is needed (deleting files, dropping tables, rewriting git history).
