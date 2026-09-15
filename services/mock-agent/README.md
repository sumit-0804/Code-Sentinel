# @code-sentinel/mock-agent

Stands in for a real agent (Security, Style, Performance, Logic, Documentation) so Sumit can test
the orchestrator's fan-out and Ayush can test the gateway before the real agent services exist.
Implements the same contract every real agent will: `docs/design/openapi/agent.yaml`.

One process = one agent kind. Run five instances (different `MOCK_AGENT_KIND` + `PORT`) to
simulate the full fan-out.

## Endpoints

- `POST /v1/review` — returns findings from a fixture file (see below).
- `GET /v1/capabilities` — describes the configured agent kind.
- `GET /healthz` — liveness/readiness.

## Configuration

See [`.env.example`](.env.example). Key variables:

| Variable | Purpose |
| --- | --- |
| `MOCK_AGENT_KIND` | Which agent this instance pretends to be. Defaults to `security`. |
| `PORT` | Defaults to that agent's port from `plans/README.md` (8081–8085). |
| `MOCK_DELAY_MS` | Artificial delay before responding — exercises the orchestrator's per-agent timeout (FR-ORC-02). |
| `MOCK_FAIL` | `500` (agent unavailable), `timeout` (never responds), or `malformed` (response missing required fields). |
| `MOCK_FINDINGS_FILE` | Path to a JSON `Finding[]` file, overriding the built-in fixture. |

## Fixtures

`fixtures/security-findings.json`, `fixtures/logic-findings.json` and `fixtures/style-findings.json`
are realistic finding sets for the `payments/retry_queue.py` example from the BRD wireframes.
The security and logic fixtures both report the same SQL-injection line with the same CWE
(`CWE-89`) but different `ruleId`s, on purpose — a cross-agent duplicate for exercising
`FindingAggregator`'s de-duplication. Performance and Documentation have no fixture yet and
return an empty findings array until Parin adds one.

## Run five instances locally

```bash
npm run build -w @code-sentinel/mock-agent

MOCK_AGENT_KIND=security      PORT=8081 node services/mock-agent/dist/server.js
MOCK_AGENT_KIND=style         PORT=8082 node services/mock-agent/dist/server.js
MOCK_AGENT_KIND=performance   PORT=8083 node services/mock-agent/dist/server.js
MOCK_AGENT_KIND=logic         PORT=8084 node services/mock-agent/dist/server.js
MOCK_AGENT_KIND=documentation PORT=8085 node services/mock-agent/dist/server.js
```

Point the orchestrator's `AGENT_<KIND>_URL` variables at these five ports for local fan-out
testing.

## Docker / docker-compose

`Dockerfile` builds and runs a single instance; `MOCK_AGENT_KIND` and `PORT` select which agent
it plays. For Vatsal's `docker-compose.yml`, one service block per agent kind, e.g.:

```yaml
mock-agent-security:
  build:
    context: .
    dockerfile: services/mock-agent/Dockerfile
  environment:
    MOCK_AGENT_KIND: security
    PORT: "8081"
  ports:
    - "8081:8081"
```

Repeat for style/8082, performance/8083, logic/8084, documentation/8085.

## Develop

```bash
npm install                              # from the repo root
npm run test       -w @code-sentinel/mock-agent
npm run typecheck  -w @code-sentinel/mock-agent
npm run build      -w @code-sentinel/mock-agent
```
