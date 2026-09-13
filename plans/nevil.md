# Plan — Nevil Nandasana (`nevil`)

**Area:** Agent Services — Style Agent; VS Code extension commands
**Planned effort:** 90 h own module (Project Plan §4.4)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `services/agent-style/` (new, port 8082)
- `apps/vscode-extension/` **except** `src/webview/` (Moksh owns the webview)

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| MVP (M5) | Style Agent returning deterministic fixes | Fri 2-Oct |
| Ayush | apply-fixes behaviour for `POST /v1/reviews/{id}/style-fixes` | Fri 16-Oct |
| Moksh | extension shell + API client the webview plugs into | Wed 4-Nov |

## You depend on

- Tej — `@code-sentinel/agent-kit` (17-Sep). Start with the dispatcher and sandbox, which don't need it.
- Sumit — `@code-sentinel/contracts` (16-Sep)
- Ayush — `POST /v1/reviews`, `GET /v1/reviews/{id}`, API keys (by 23-Oct)
- Vatsal — Docker available in the local compose stack

## Key design points

- The Style Agent is the **only agent with no LLM** (NFR-07). Its fixes are rule-based, so they
  are `deterministic` suggestions that are safe to apply without review.
- **Every linter runs inside a Docker sandbox** (`DockerSandbox` in `class_agent.mmd`): network off,
  CPU and memory limits, per-request container.
- All project code is TypeScript. ESLint/Prettier (JS/TS) and Ruff/Black (Python) are installed
  in the sandbox image and invoked as CLIs.

---

## Phase 1 — Language dispatcher (Mon 14 – Thu 17 Sep)

- [ ] `services/agent-style` workspace; `Linter` interface: `name`, `languages`,
      `check(workDir, files) → LintResult[]`, `fix(workDir, files) → PatchedFile[]`.
- [ ] `LinterDispatcher.forLanguage(language)`: `.js/.jsx/.mjs/.cjs/.ts/.tsx` ⇒ ESLint + Prettier;
      `.py` ⇒ Ruff + Black; anything else ⇒ skipped with a reason.
- [ ] Tests for routing, including mixed-language requests.

**Done when:** routes `.js/.ts` to ESLint and `.py` to Ruff correctly.

## Phase 2 — Docker sandbox (Fri 18 – Mon 21 Sep)

Requirement: FR-STY-02.

- [ ] `services/agent-style/sandbox/Dockerfile`: Node 20 + ESLint + Prettier + Python 3 + Ruff +
      Black, with pinned versions and a default config for each tool.
- [ ] `DockerSandbox.run(command, files)` via the `docker` CLI (`child_process`, no extra deps):
      `--rm --network none --cpus 1 --memory 512m --pids-limit 256 --read-only`, a temp work dir
      mounted, hard timeout that kills the container.
- [ ] Files written to the temp dir from the request; temp dir always deleted afterwards.
- [ ] Health check reports `sandbox: ok` only if Docker responds (matches `agent.yaml` example).
- [ ] Test: a linter cannot reach the network or read host paths outside the mount.

**Done when:** linters run in an isolated container with no host access.

## Phase 3 — Linter wiring + auto-fix (Tue 22 – Sat 26 Sep)

Requirements: FR-STY-01, FR-STY-03.

- [ ] ESLint `--format json`, Ruff `--output-format json` ⇒ `Finding` (`ruleId` like
      `style/eslint/no-unused-vars`, severity from rule level, confidence 1.0).
- [ ] Prettier / Black / `eslint --fix` / `ruff --fix` on a copy ⇒ diff original vs fixed ⇒
      `Suggestion` with `kind: "deterministic"`, `originalSnippet`, `suggestedSnippet`.
- [ ] Only report issues on **added lines** of the diff (use the kit's diff helpers).
- [ ] Wrap in `BaseAgentService` + `createAgentServer` from the kit; port 8082.
- [ ] Service Dockerfile + compose snippet for Vatsal. The agent container needs access to the
      Docker daemon — document this.

**Done when:** auto-fixable issues are corrected without an LLM call.

## Phase 4 — Apply-fixes + tests (Mon 28 Sep – Fri 2 Oct)

- [ ] `StyleAgent.applyFixes(files)` returns patched files (used by the gateway's
      `POST /v1/reviews/{reviewId}/style-fixes`). Agree the internal call shape with Ayush; if a new
      agent endpoint is needed, raise a contract change with Sumit.
- [ ] Unit tests: JSON parsing per tool, suggestion diffing, skipped languages, sandbox timeout ⇒ 503.

## Phase 5 — MVP (Mon 5 – Mon 12 Oct)

- [ ] Integration with the orchestrator; **M5 Fri 9-Oct, M6 demo Mon 12-Oct.**

## Phase 6 — Optional early start on the extension (19 Oct – 1 Nov)

You have no planned work in this window. Getting the extension shell up early de-risks November.

- [ ] Scaffold `apps/vscode-extension` (TypeScript, `@types/vscode`, `@vscode/vsce` for packaging).
- [ ] Settings: gateway URL; API key stored with `context.secrets` (SecretStorage), never in settings.
- [ ] Typed API client in `src/api/` using `@code-sentinel/contracts`.

## Phase 7 — VS Code extension commands (Mon 2 – Fri 6 Nov)

Requirements: FR-VSC-01, FR-VSC-02. Sequence: `seq_uc2_vscode.mmd`. Wireframe: `13-editor-extension.png`.

- [ ] Command palette: **"CodeSentinel: Review this file"** and "Set API key".
- [ ] Send the file as a `ChangedFile` to `POST /v1/reviews` (`trigger: vscode_on_demand`); follow
      progress with `GET /v1/reviews/{id}/events` (SSE) or poll.
- [ ] Show progress notification; open Moksh's webview panel with the report.
- [ ] Diagnostics: findings also appear as squiggles in the editor.
- [ ] Unit tests + manual UI test script for Style Agent and extension (5–6 Nov).

**Done when:** "Review this file" returns a report in under 10 s.

## Phase 8 — Support (Nov)

- [ ] **Support task (7–9 Nov):** dashboard filter logic (repo/date/severity) agreed with Moksh and wired.
- [ ] **Bug-fixing rota (10–11 Nov).**
- [ ] VS Code / dashboard UI test pass with Moksh.
