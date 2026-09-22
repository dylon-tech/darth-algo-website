# Darth Algo implementation ledger

Updated: 2026-09-22 UTC. Owner-facing time zone: America/New_York.

This ledger records verified evidence, not intended state. `live` requires a provider or deployment receipt; `tested` means an offline or local test passed; `blocked` names the exact dependency.

| Workstream | Owner | Status | Dependency | Evidence | Acceptance test | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Source repository | Operations | live | GitHub | `dylon-tech/darth-algo-website`, main at `bbd303b` during audit | Connected repository is readable and writable | Keep main as source of truth |
| Production build | Operations | tested | Node/Next.js | `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass locally | Clean compile and static generation | Verify deployment reaches READY |
| Durable OS schema | Operations | tested | Production `DATABASE_URL` | PGlite-backed schema, queue, approval, handoff, Telegram, content, and indicator tests | Full safe-fixture suite passes | Observe production migration and heartbeat |
| Owner command center | Operations | tested | Owner runtime configuration | `/owner`, PWA manifest, session and private-route tests | Phone-sized authenticated command creates durable job | Verify on production iPhone Safari |
| Recurring executor | Operations | partial | Vercel cron plus production flags | Cron routes and durable leases exist; production heartbeat must be observed | Independent cloud tick records fresh heartbeat | Confirm production env and next run |
| Premium carousel workflow | Content | partial | Buffer credentials and healthy destinations | Premium black/red three-slide assets, hash binding, QA and delivery fixtures pass | Provider receipt and public URL match approved hashes | Verify next authorized live campaign |
| Indicator prototype workflow | Research | partial | Hosted TradingView session | Discovery, original generation, static screening, review cards and release gates pass fixtures | TradingView compile/replay evidence attached to exact source hash | Run supervised private validation |
| Customer support/retention | Support | tested | Support inbox adapter for outbound work | Deterministic routing and retention tables/tests | Verified inbound event creates deduplicated case; resolution cancels follow-up | Connect/verify inbox executor |
| Native reusable skill | Operations | in progress | Skill directory installation | Versioned package under `skills/darth-algo-operations` | Validator passes and invocation returns version | Install and invoke once |
| Supabase | Operations | not authoritative | All discovered projects inactive | Three connected projects report `INACTIVE`; repository documents Postgres/Neon | Production env identifies a project before any mutation | Do not resume or migrate without evidence |

## Stop conditions

- Do not publish, message customers, change offers, spend money, or release an indicator without the existing exact-scope authorization and provider readiness gates.
- Do not retry an uncertain external outcome until readback or reconciliation establishes that the first attempt did not succeed.
- Do not represent queued, configured, compiled, or statically screened work as live execution.
