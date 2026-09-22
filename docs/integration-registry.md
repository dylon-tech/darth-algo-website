# Integration registry

Last audited: 2026-09-22 UTC. Secrets are intentionally excluded.

| Provider | Account/resource | Read | Write | Executor | Last evidence | Current state | Reconnect/action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub | `dylon-tech/darth-algo-website` | verified | verified | Connected GitHub app | Repository metadata and clone at `bbd303b` | healthy | None |
| Vercel | team `Dylon's projects` | verified | verified through Git deployment | Git integration / Vercel deployment | Production deployment `dpl_GWsUjAY7S5BKmQYySJKiN7GoDTSG` READY at commit `b551b71`; public home and owner route respond | healthy, runtime health attention | Inspect authenticated owner health issues |
| Database | Production `DATABASE_URL` | verified by live production queries | active | Deployed Next.js app | Scheduled production transactions and schema checks complete against Postgres/Neon | authoritative | Keep health checks provider-neutral and secret-safe |
| Supabase | Three discovered projects | verified metadata | intentionally retired | Supabase account | All three report `INACTIVE`; none is referenced by the production runtime | not authoritative | Do not resume or include in production health |
| Buffer | X, Instagram, Threads | prior production preflight observed | fresh sends held | Deployed app | Owner rejected v4; scheduler and executor hold fresh daily sends | creative replacement required | Connect reviewed cinematic assets; continue receipt reconciliation |
| Telegram owner bot | Private owner channel | fixture tested | fixture tested | Deployed app | Identity, dedupe and exact-owner tests pass | needs live delivery check | Verify webhook and one private delivery |
| Telegram community | Community bot/channel | fixture tested | guarded | Deployed app | Separate identity enforcement passes | needs live readback | Preserve separation from owner bot |
| Stripe | Darth Algo account | repository adapters | webhook routes guarded | Deployed app | No fresh live credential test performed in this audit | unknown | Read-only subscription snapshot and webhook signature check |
| TradingView | Existing hosted browser | production status observed | no official publish API | Optional supervised browser | Browser is connected but start allowance is exhausted; one candidate still lacks private compile/replay evidence | blocked for validation/release | Founder-authenticated compile/replay; manual release remains required |
| OpenAI / AI Gateway | Bounded internal workers | configuration checks | budget guarded | Deployed app/worker | Offline budget and fail-closed tests pass | production use unverified | Confirm model, recurring cap and heartbeat before enablement |

No connector icon, environment-variable name, fixture, or old status note is treated as proof of a live production connection.
