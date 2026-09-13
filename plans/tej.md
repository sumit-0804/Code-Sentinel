# Plan — Tej Prakash Tak (`tej`)

**Area:** Agent Services — shared agent kit, Security Agent, Logic Agent
**Planned effort:** 90 h own module (Project Plan §4.3)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `packages/agent-kit/` (new)
- `services/agent-security/` (new, port 8081)
- `services/agent-logic/` (new, port 8084)

## Why you own the agent kit

All five agents implement the same contract (`agent.yaml`) and the same base class
(`BaseAgentService` in `class_agent.mmd`). Writing that once, first, stops Nevil, Parin and Durgesh
from building three different HTTP servers. It is small; do it before the Security Agent.

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Nevil, Parin, Durgesh | `@code-sentinel/agent-kit` | Thu 17-Sep |
| MVP (M5) | Security Agent returning findings | Fri 2-Oct |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep); `@code-sentinel/llm` (9-Oct) for the Logic Agent
- Parin — vulnerable-code fixtures in `fixtures/review-samples/security` (by 25-Sep; write your
  own first 3 samples if they are not there yet)
- Vatsal — CI, compose entry for your service

## Changes from the original Project Plan

- **New:** `packages/agent-kit` (had no owner).
- Security Agent dates slide ~3 days to make room for the kit.
- All code is TypeScript; Semgrep and Bandit run as CLIs inside the agent's Docker image.

---

## Phase 1 — Agent kit (Mon 14 – Thu 17 Sep)

Design: `class_agent.mmd`, `component.mmd` (ReviewController / Analyzer), `agent.yaml`.

- [ ] Workspace `packages/agent-kit` (`@code-sentinel/agent-kit`).
- [ ] `BaseAgentService` (abstract): `agentKind`, `maxDiffBytes`, `review(request)`, abstract
      `analyze(file: ChangedFile): Promise<Finding[]>`, `detectLanguage(file)` (by extension,
      per-file language wins over request hint), `skip(file, reason)`.
- [ ] `review()` runs `analyze` per file, collects findings, returns `AgentReviewResponse` with
      `serviceVersion` and skipped files.
- [ ] `createAgentServer(agent, options)` — Express app with:
  - `POST /v1/review` — validates body with contracts schema; **400** invalid, **401** bad
    `SERVICE_TOKEN`, **413** over `maxDiffBytes`, **422** unsupported language, **503** when a
    dependency (sandbox, all LLM providers) is down;
  - `GET /v1/capabilities`, `GET /healthz`;
  - `X-Request-Id` propagated into logs.
- [ ] Diff helpers: parse a unified `patch` into hunks, list **added lines with new-file line
      numbers** (every agent needs this to report `lineStart/lineEnd`).
- [ ] `runCli(command, args, { cwd, timeoutMs })` helper around `child_process.execFile` for agents
      that shell out to tools (returns stdout/stderr/exit code; kills on timeout).
- [ ] Tests: patch parsing edge cases (new file, deleted file, multiple hunks, `\ No newline`),
      every HTTP error code above.
- [ ] README with a 20-line "build an agent" example.

**Done when:** a new agent is ~30 lines: extend `BaseAgentService`, implement `analyze`, call
`createAgentServer`.

## Phase 2 — Security Agent: SAST (Fri 18 – Wed 23 Sep)

Requirements: FR-SEC-01…04.

- [ ] `services/agent-security` on port 8081 using the kit.
- [ ] Write changed files/hunks to a temp dir; run **Semgrep** (`--json`, `--config` pointing to
      rules **vendored in** `services/agent-security/rules/` — no registry download at runtime)
      for JS, TS and Python.
- [ ] Run **Bandit** (`-f json`) for Python files.
- [ ] Map tool output → `Finding`: `ruleId` prefixed `security/`, `cweId`, severity mapping
      (Semgrep ERROR/Bandit HIGH ⇒ critical, …), confidence from the tool's confidence level.
- [ ] Only report results on **added lines** of the diff.
- [ ] Dockerfile: Node 20 base + Python + `pip install semgrep bandit`.
- [ ] Tests with mocked CLI output + one integration test that runs in Docker only.

**Done when:** flags 3 seeded vulnerable-code samples correctly (SQL injection, command injection,
unsafe deserialization / eval).

## Phase 3 — Security Agent: secret detection (Thu 24 – Wed 30 Sep)

- [ ] Pattern set: AWS access keys, GitHub tokens (`ghp_`, `github_pat_`), private key headers,
      Slack/Stripe/Google API key formats, generic `password|secret|api_key = "..."`.
- [ ] Shannon-entropy check on string literals in added lines to catch unknown formats; tune the
      cut-off on fixtures to avoid flagging hashes in tests and lockfiles.
- [ ] Ignore obvious placeholders (`xxx`, `changeme`, `<your-key>`) and `*.example` files.
- [ ] **Never echo the full secret** in `description` or `suggestion` — mask all but 4 chars.
- [ ] Suggestion: move to environment variable (`ai_suggested` is not needed; a static template is fine).

**Done when:** detects hardcoded API keys/passwords in the test repo.

## Phase 4 — MVP (Thu 1 – Mon 12 Oct)

- [ ] Service in `docker-compose.yml` (send Vatsal the snippet).
- [ ] Integration with Sumit's orchestrator; fix contract mismatches through contract PRs.
- [ ] **M5 Fri 9-Oct, M6 demo Mon 12-Oct.**

## Phase 5 — Logic Agent (Mon 19 – Sun 25 Oct)

Requirements: FR-LOG-01, FR-LOG-02. Uses `@code-sentinel/llm` only.

- [ ] `services/agent-logic` on port 8084.
- [ ] Prompt design (19–21 Oct): system prompt asking for null-handling, off-by-one, boundary,
      unhandled promise/exception issues in **the given hunks only**, strict JSON output
      (`ruleId`, `title`, `description`, `lineStart`, `lineEnd`, `confidence`, optional fix).
- [ ] Validate LLM JSON; drop items whose lines are not in the diff; clamp confidence to [0,1].
- [ ] Record `llmProvider` / fallback depth on the response for the agent run.
- [ ] Confidence scoring (22–23 Oct): combine model confidence with simple checks (line exists,
      snippet matches) so only high-confidence issues become suggestions.
- [ ] All providers down ⇒ 503 (the orchestrator records a failed run and continues).
- [ ] Unit tests for Security and Logic (24–25 Oct): detection, masking, JSON parsing, scoring.

**Done when:** flags null-check / off-by-one bugs in sample diffs.

## Phase 6 — End-to-end and support (Oct – Nov)

- [ ] **GitHub App E2E (26–30 Oct):** suggested change appears inline on a real test PR (with Vatsal).
- [ ] **Support task (31-Oct):** review Performance Agent test cases with Parin.
- [ ] **2-Nov:** agree severity thresholds for Security suggestions with Durgesh.
- [ ] Your cases in the Test Plan (by 4-Nov); E2E on live deployment with Vatsal (12–13 Nov).
