# @code-sentinel/orchestrator

The LangGraph orchestrator. It fans a review request out to the enabled agent services in
parallel, applies the per-agent timeout, then **aggregates, de-duplicates and severity-ranks**
the findings and attaches similar past issues before returning one combined report
(FR-ORC-01…06).

Contract: [`docs/design/openapi/orchestrator.yaml`](../../docs/design/openapi/orchestrator.yaml).
Class design: [`docs/design/diagrams/mermaid/class_orchestrator.mmd`](../../docs/design/diagrams/mermaid/class_orchestrator.mmd).

## What's scaffolded so far

| Area | Module | Status |
| --- | --- | --- |
| De-duplication (FR-ORC-03) | `aggregation/finding-aggregator.ts` | working |
| Severity ranking (FR-ORC-04) | `aggregation/severity-ranker.ts` | working |
| Summary counts | `aggregation/review-summary.ts` | working |
| Aggregate step | `aggregation/index.ts` → `aggregate()` | working |
| Context lookup (FR-ORC-05) | `context/similar-issue-lookup.ts` | interface + wiring, no vectors |
| Vector store (FR-VDB-01/02) | `context/vector-repository.ts` | interface + Chroma stub |
| Confidence threshold (FR-ORC-06) | `threshold/apply-threshold.ts` | working |

`applyThreshold` returns eligible findings as a `Set<Finding>` by object reference rather than a
field on `Finding` itself — no `postable`-style field exists yet in `common.yaml`. Ask Sumit before
adding one if the graph node needs this to survive serialization.

## Not started yet

- `ReviewJobController` + HTTP server (`/internal/v1/review-jobs`)
- `ReviewGraph` / `ReviewState` LangGraph wiring and `FanOutNode`
- `AgentClient` and the per-agent timeout
- `ReviewRepository` (PostgreSQL persistence)
- LLM abstraction layer

## Develop

```bash
npm install          # from the repo root
npm run test  -w @code-sentinel/orchestrator
npm run build -w @code-sentinel/orchestrator
```
