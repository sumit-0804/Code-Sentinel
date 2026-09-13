# Plan — Moksh Mehta (`moksh`)

**Area:** Frontend — Next.js dashboard, VS Code webview panel
**Planned effort:** 85 h own module (Project Plan §4.8)
**Read first:** `AGENTS.md`, `plans/README.md`

## Paths you own

- `apps/dashboard/` (new, port 3001)
- `apps/vscode-extension/src/webview/` (Nevil owns the rest of the extension)

## Who depends on you

| Needs | From you | By |
| --- | --- | --- |
| Team (M6) | mid-semester demo slides | Sat 10-Oct |
| Parin | docstring prompt design | Wed 28-Oct |
| M8 | dashboard + webview working against the live API | Fri 13-Nov |

## You depend on

- Sumit — `@code-sentinel/contracts` (16-Sep) for all API types
- Ayush — client API routes and auth (by 23-Oct); until then, mock data
- Nevil — extension shell + API client (by 1-Nov)
- Vatsal — `apps/*` workspace (15-Sep); hosting decision (30-Oct)

## Design to follow

Wireframes in `docs/design/wireframes/` (read `README.txt` first):

| Screen | File | Priority |
| --- | --- | --- |
| Design tokens | `02-design-language.png` | build first |
| Review overview | `05-review-overview.png` | MVP of dashboard |
| Three-panel code review | `06-three-panel-review.png` | MVP of dashboard |
| Finding detail & fix | `07-finding-detail.png` | MVP of dashboard |
| Review history | `08-review-history.png` | MVP of dashboard |
| Repository & agent config | `11-configuration.png` | MVP of dashboard |
| Empty & error states | `14-empty-and-error-states.png` | MVP of dashboard |
| Editor extension panel | `13-editor-extension.png` | webview |
| Dashboard, repo detail, agents | `03`, `09`, `10` | stretch |

The dashboard talks **only to the gateway** (`gateway.yaml`), never to the orchestrator or agents.
It must be usable at 375px width.

## Changes from the original Project Plan

- **New:** lead the mid-semester demo slides (5–10 Oct).
- **Optional early start** on the dashboard with mock data (12–23 Oct), since your planned coding
  starts 26-Oct and the dashboard window (9–13 Nov) is tight.

---

## Phase 1 — Mid-semester demo slides (Mon 5 – Sat 10 Oct)

- [ ] Slide deck: problem, architecture (`architecture.png`), MVP flow (`seq_uc1_pr_review.png`),
      live demo script, what's next, team split.
- [ ] Get a screenshot of the real PR Check Run + suggestion from Vatsal on 9-Oct.
- [ ] Rehearsal with the team Sat 10-Oct; **demo Mon 12-Oct.**

## Phase 2 — Optional: dashboard shell with mock data (Mon 12 – Fri 23 Oct)

- [ ] Scaffold `apps/dashboard`: Next.js App Router + TypeScript, port 3001, `NEXT_PUBLIC_API_URL`.
- [ ] Design tokens from `02-design-language.png` as CSS variables (surfaces, brand, severity
      colours for critical/warning/info, type scale, agent marks).
- [ ] Typed API client in `src/lib/api.ts` using `@code-sentinel/contracts`; a mock mode that reads
      JSON built from the `examples` in `gateway.yaml`.
- [ ] Layout + navigation; empty/error state components (`14`).

## Phase 3 — Documentation Agent prompt design (Mon 26 – Wed 28 Oct)

- [ ] With Parin: prompts for JSDoc (JS/TS) and Google-style docstrings (Python).
- [ ] Test against a sample function set in `fixtures/review-samples/documentation`; record
      prompt versions and results in Parin's service README.

**Done when:** generated docstrings are reviewed against the sample set.

## Phase 4 — VS Code webview panel (Mon 2 – Fri 6 Nov)

Requirements: FR-VSC-02, FR-VSC-04. Wireframe: `13-editor-extension.png` (380px side panel).

- [ ] Layout and report rendering (2–4 Nov): summary strip, findings grouped by severity, agent
      status (including timed-out agents), click a finding ⇒ reveal the line in the editor.
- [ ] Use VS Code theme CSS variables so the panel matches light/dark themes; strict CSP in the webview.
- [ ] Accept/reject buttons and state handling (5–6 Nov): message the extension host, which calls
      `/v1/findings/{id}/suggestion/accept|reject` and applies a `WorkspaceEdit` on accept.
      Agree the message types with Nevil.

**Done when:** a developer can accept/reject an item and the panel state updates, without leaving the editor.

## Phase 5 — Next.js dashboard (Mon 9 – Fri 13 Nov)

Requirements: FR-WEB-01…04. Swap mock mode for the real gateway.

- [ ] Login via the gateway's session flow (agree details with Ayush).
- [ ] **Review history (9–11 Nov):** list with filters (repository, date range, severity), paging,
      empty state. Nevil helps with filter logic 7–9 Nov.
- [ ] **Report detail (12–13 Nov):** review overview + three-panel review + finding detail.
      Parin helps with the detail view 2–3 Nov.
- [ ] **Repository config (12–13 Nov):** enable/disable agents per repository, confidence threshold
      override; admin-only controls hidden for members.
- [ ] Responsive down to 375px.

**Done when:** past reviews are listed and filterable, an admin can open a report and
enable/disable agents per repository.

## Phase 6 — Testing (Nov)

- [ ] Your cases in the Test Plan (by 4-Nov).
- [ ] **UI test pass (14-Nov):** manual test script covering webview and dashboard, signed off with Nevil.
- [ ] **Bug-fixing rota (15-Nov).**
- [ ] Screens and poster visuals for the final presentation (M9, 18-Nov).
