# Plan — Parin Makwana (`parin`)

**Area:** Agent Services — shared review fixtures, Performance Agent, Documentation Agent
**Planned effort:** 85 h own module (Project Plan §4.5)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `fixtures/` (new)
- `services/agent-performance/` (new, port 8083)
- `services/agent-documentation/` (new, port 8085)

## Why you have fixtures first

Your planned agent work starts 19-Oct, but every other member needs realistic sample diffs **now**:
Tej to prove the Security Agent flags seeded vulnerabilities, Nevil for lint samples, Durgesh to
measure the de-duplication rate, Vatsal for the demo PR, and Ayush for the Test Plan. You also get
a head start on the performance and documentation samples your own agents need.

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Tej | security samples | Fri 25-Sep |
| Nevil, Durgesh | style samples + cross-agent duplicates | Fri 2-Oct |
| Vatsal | demo PR contents | Tue 6-Oct |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep); `@code-sentinel/llm` (9-Oct)
- Tej — `@code-sentinel/agent-kit` (17-Sep)
- Moksh — docstring prompt design (26–28 Oct)

## Changes from the original Project Plan

- **New:** `fixtures/review-samples` corpus (14 Sep – 2 Oct).
- Rule-based Performance checks may start early (5-Oct) since they need no LLM.

---

## Phase 1 — Review fixture corpus (Mon 14 Sep – Fri 2 Oct)

- [ ] Layout: `fixtures/review-samples/<agent>/<case-name>/`, each with:
  - `request.json` — a valid `AgentReviewRequest` (validate it with the contracts schema);
  - `expected.json` — expected findings as `{ ruleId, filePath, lineStart, severity }`;
  - `README.md` — one line on what the case shows.
- [ ] Languages: every agent gets JS, TS and Python cases.
- [ ] **security** (by 25-Sep): SQL injection (f-string / template literal), command injection,
      `eval`/`pickle.loads`, hardcoded AWS key, hardcoded password, plus 2 clean cases.
- [ ] **style** (by 2-Oct): unused variables, formatting drift, import order, Python line length.
- [ ] **performance**: N+1 query in a loop, nested loops over the same collection (O(n²)),
      sync file I/O in a request handler, `await` inside `for` that could be `Promise.all`.
- [ ] **logic**: missing null check, off-by-one loop bound, unhandled promise rejection.
- [ ] **documentation**: exported function without JSDoc, public Python function without docstring.
- [ ] **cross-agent**: 2–3 cases where two agents should report the same issue (for Durgesh's
      de-dup rate).
- [ ] A small script `fixtures/validate.ts` that checks every `request.json` against contracts;
      run in CI via a `test` script.
- [ ] **Demo PR (by 6-Oct):** a branch in Vatsal's test repo built from security + style cases.

## Phase 2 — Performance Agent: rule-based detection (Mon 5 – Wed 21 Oct)

Requirement: FR-PERF-01. Design: `PerformanceAgent` in `class_agent.mmd`.

- [ ] `services/agent-performance` on port 8083 using the agent kit.
- [ ] `detectNPlusOne(hunk)`: DB/ORM/HTTP call inside a loop body (JS/TS and Python patterns).
- [ ] `detectBlockingCall(hunk)`: `fs.*Sync`, `child_process.execSync`, `time.sleep` in request paths.
- [ ] Nested loops over the same collection ⇒ O(n²) warning.
- [ ] Work on added lines only; heuristics are fine — the LLM step (Phase 3) confirms them.

**Done when:** flags O(n²)+ loops and N+1 query patterns in your fixtures.

## Phase 3 — Performance suggestions + confidence (Thu 22 – Fri 23 Oct)

Uses `@code-sentinel/llm` only.

- [ ] Send each candidate hunk to the LLM asking to confirm/reject and propose a fix, strict JSON.
- [ ] Confidence = heuristic strength × model confidence; the agent reports it, the orchestrator
      filters (do not filter in the agent).
- [ ] `ai_suggested` suggestions with `originalSnippet` / `suggestedSnippet`.
- [ ] All LLM providers down ⇒ return heuristic findings without suggestions (not a 503).

**Done when:** suggestions are posted only above the confidence threshold end to end.

## Phase 4 — Documentation Agent (Mon 26 – Fri 30 Oct)

Requirement: FR-DOC-01.

- [ ] `services/agent-documentation` on port 8085.
- [ ] `missingDocstrings(hunk)` (26–28 Oct): exported/public JS/TS functions and classes with no
      preceding `/** */` doc comment; Python `def`/`class` without a docstring; skip private
      (`_name`) and test files.
- [ ] `draftDocstring(symbol)` (29–30 Oct): LLM draft using Moksh's prompt; JSDoc for JS/TS,
      Google-style docstring for Python; returned as an `ai_suggested` suggestion.
- [ ] Sumit supports prompt tuning on 28–29 Oct.

**Done when:** a generated docstring is accepted/edited by a reviewer in the demo.

## Phase 5 — Tests and support (31 Oct – 4 Nov)

- [ ] **Unit tests (31 Oct – 1 Nov):** Performance + Documentation detection and generation logic,
      running every fixture case in `fixtures/review-samples/{performance,documentation}`.
- [ ] Tej reviews your Performance test cases (31-Oct).
- [ ] Your cases in the Test Plan (by 4-Nov).
- [ ] **Support task (2–3 Nov):** Next.js dashboard report detail view agreed with Moksh and wired to the API.
- [ ] **Bug-fixing rota (4-Nov).**
