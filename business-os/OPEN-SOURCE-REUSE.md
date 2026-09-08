# Darth Algo reuse shortlist

Reviewed September 7, 2026. These are candidates, not installed services or a claim that the crew is running. Preserve the existing Next.js site, Vercel hosting, Neon database, Stripe integration, Make workflows and customer Telegram community. The private owner system stays separate.

## Visual direction

Use a compact pixel headquarters with five main destinations, eight recognizable characters, a messages inbox and one-tap assignments. Keep body text, metrics and mobile controls readable. Show work animation only when backed by fresh execution events; an idle illustration must not imply an active agent.

| Resource | Fit and reuse decision |
| --- | --- |
| [NES.css](https://github.com/nostalgic-css/NES.css) | MIT CSS components and useful 8-bit styling reference. It does not supply app layout or behavior. Avoid importing its global styling into the customer website. |
| [Kenney Pixel Adventure UI](https://kenney.nl/assets/ui-pack-pixel-adventure) | Creator lists 500 assets under CC0. Good candidate for buttons, panels and small decorative details. |
| [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | Creator lists 130 16×16 assets under CC0. Useful optional character and room pieces; the current eight agent characters are original SVG designs. |
| [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) | MIT project with a pixel office driven by activity hooks. Current reference provider is Claude Code; OpenAI integration requires a custom adapter. Check third-party sprite terms separately before copying assets. |
| [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI) | Code is MIT but artwork is limited to non-commercial learning. Do not reuse that artwork for Darth Algo. |
| [Agent Pixels](https://github.com/gcampton/Agent-Pixels) | Interesting Paperclip office concept. No reuse license was established in the inspected root/package. Do not copy its code or assets without resolving permission. |

Adopted now: [Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p), bundled unmodified with its SIL Open Font License in `public/fonts/darth-owner`. Use only for short owner headlines and labels; ordinary text retains a readable system font. Font source blob: `39adf42efa597906e53be689474ac82214112124`.

## Agent and automation tools

| Project | Business fit | Decision |
| --- | --- | --- |
| [Paperclip](https://github.com/paperclipai/paperclip) | Agent organization, goals, delegated tasks, approvals, heartbeats and reported spending controls. MIT. | Strongest business orchestration candidate. Evaluate its HTTP adapter around the existing runtime before considering replacement. |
| [Activepieces](https://github.com/activepieces/activepieces) | Business integrations, workflow pieces and human approval. MIT community edition; enterprise parts use commercial terms. | Consider for missing connectors after inventorying existing Make scenarios. |
| [Vercel Workflow](https://github.com/vercel/workflow) | Durable steps, retries and waiting within the current hosting stack. Apache-2.0. | Compare with Trigger.dev using the same restart/approval test. Choose one execution mechanism. |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Durable background jobs, retries, queues, approval waits and run visibility. Apache-2.0 project. | Alternative when separate workers or longer tool jobs are needed; adds operational infrastructure. |
| [OpenAI Agents JS](https://github.com/openai/openai-agents-js) | Tools, handoffs, sessions, tracing and human-in-the-loop support. MIT. | Candidate engine after explicit key setup. Runtime agents need their own authorized credentials and tool implementations. |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | Support inbox, canned replies, help center and APIs. MIT except enterprise and third-party components. | Consider only if the current support system cannot supply a shared inbox. Requires hosting or a service plan. |
| [PostHog](https://github.com/PostHog/posthog) | Conversion funnels, activation, retention and experiments. MIT except enterprise and third-party components. | Candidate to close verified measurement gaps. Audit current tracking first; do not equate clicks with sales. |
| [Langfuse](https://github.com/langfuse/langfuse) | Agent traces, evaluations, prompt versions and usage visibility. MIT except enterprise parts. | Add after real model runs exist and data handling is defined. |

Paperclip was inspected read-only at commit `ae03465ad44a251ada86fae76ba0504ebe88fb8c`; no installation scripts ran. Its HTTP adapter triggers an external service but does not capture that service's stdout as a live run viewer. Our runtime would need explicit callbacks/events. Its documented budgets use reported cost events, with an 80% warning and 100% pause; this does not establish a provider-enforced cap on in-flight spending.

## Useful workflow patterns

[Awesome n8n templates](https://github.com/enescingoz/awesome-n8n-templates) is a discovery index. Its author says the collected templates belong to third parties. Verify each original workflow's license, credentials, destinations and write actions before adaptation. Do not bulk-import or activate them.

Prioritize these patterns in the current infrastructure:

1. Growth: trace incoming leads to source and produce a daily conversion opportunity list.
2. Content: draft useful posts from verified customer questions; publishing waits for approval.
3. Support: triage requests and prepare evidence-backed replies; sensitive replies escalate.
4. Affiliates: reconcile referred conversions against verified attribution and flag discrepancies.
5. Analytics: produce a daily source-backed brief with missing data explicitly labeled.
6. Operations: detect failed jobs and retry only idempotent operations; alert the owner when intervention is needed.

## Acceptance before runtime adoption

A pilot must prove work continues after closing the dashboard, survives process restart, avoids duplicate external writes, respects pause and budget controls, and binds approval to the exact proposed risky action. It must emit persisted progress/results, keep customer data out of public logs, and isolate private Telegram from the customer community.

Repository feature claims and license checks are a shortlist review, not a full security or operational audit. None of these candidate services is currently connected. Existing preview has eight registered departments, eight real queued starter assignments and zero AI runs; model credentials and external business editing tools remain unconnected.
