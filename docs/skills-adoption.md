# Darth Algo operating improvements — September 30, 2026

Work ID: DA-SKILLS-20260930-v1. Owner request: apply useful material from alirezarezvani/claude-skills and the supplied TikTok video. Incremental spending authority: $0.

## Scope and evidence

Reviewed the MIT repository at commit `19392f7a08264ed00486a251f5b2098321771f94`. Selected 21 methods and adapted them to nine existing departments; no upstream installer, hooks, executable scripts, new model provider or external agent service is installed. Exact paths and SHA-256 hashes are in `skills-adoption-sources.json`; retain `claude-skills-LICENSE.txt` with these adaptations.

Reviewed sampled scenes from the owner-uploaded 114.24-second video, watermarked @kodekloud. At roughly 0–16s it introduces Dots; 24–48s show email input, a cloud computer and a recurring bug traced to GitHub; 56–80s show work continuing across days and connected apps; 88–112s show automatic/approval/never action boundaries. These are visual observations, not a verbatim audio transcript. The shortened TikTok link did not load. Official supporting product documentation: https://learn.chatgpt.com/docs/dots . No separate Dot provisioning capability is available in this session; do not claim one was created or connected. Scheduled tasks are periodic runs, not continuously active workers.

## Applied methods

| Source skill | Existing role | Darth Algo adaptation |
| --- | --- | --- |
| page-cro | growth | Match traffic promise, clear benefit, one CTA and real objections. |
| onboarding-cro | growth/support | One first-use outcome; separate payment from verified access and useful setup. |
| copywriting | content/growth | Customer language, specific supported benefits, finished copy. |
| content-humanizer | content | Remove generic phrasing; vary rhythm without invented lived experience. |
| ab-test-setup | growth/analytics | One variable, primary metric, guardrails, predeclared window and sample. |
| analytics-tracking | analytics | Explicit event definitions, cohorts, coverage and denominators. |
| churn-prevention | support | Separate cancellation and payment failure; stop obsolete follow-ups. |
| referral-program | affiliates | Separate partner recruitment, activation, referrals and paid sales. |
| social-content | content | One audience question, strong hook, product demonstration and CTA. |
| seo-audit | research/growth | Intent, titles, headings, canonical and useful original content before new pages. |
| customer-success-manager | support | Use evidenced setup/support signals; do not invent usage or churn scores. |
| revenue-operations | analytics/ceo | Locate the real funnel bottleneck; separate stage counts and outcomes. |
| saas-metrics-coach | analytics/ceo | Distinguish MRR, cash, lifetime sales, refunds and costs; missing stays unknown. |
| vendor-management | operations/ceo | Tie each service to a current dependency and a safe fallback. |
| process-mapper | operations/growth | Find waiting/rework at the constraint before optimizing other steps. |
| procurement-optimizer | operations/ceo | Find duplicate functions; assess switching risk before cost reductions. |
| knowledge-ops | operations | Versioned runbooks with owner, observable result, rollback and resume condition. |
| runbook-generator | operations | Symptom, diagnosis, minimal repair, test, rollback and escalation. |
| self-eval | all | Check actual deliverable against acceptance criteria; self-review is not external proof. |
| llm-cost-optimizer | all | Compact role context and reuse evidence within unchanged existing spend limits. |
| agent-workflow-designer | all | Smallest useful workflow, exact handoff artifacts, bounded attempts and explicit completion. |

## Runtime integration

`operating-playbooks.ts` loads only the applicable role guidance into the existing model instructions and records its version in `agent_context_ready`. Existing budget reservation, model selection, worker schedule, publishing rules and external executors remain unchanged. These instructions guide the model; they do not grant execution permissions.

`operating-memory.ts` derives a read-only summary from existing `os_runs` records. `collectEvidence` loads at most 501 rows from the prior seven days, reports the 500-row boundary, groups repeated failures by department and sanitized code, and retains up to three exact run IDs per group. It excludes message bodies and customer information. A later completed internal run is explicitly not proof of provider recovery. Missing database access becomes unavailable evidence; an empty sample is not healthy status. No migration or new database is required.

The personal Darth Algo Operations skill and the five active scheduled tasks receive equivalent role-appropriate guidance. Task prompt readback is configuration evidence, not a completed future run. Retired tasks remain disabled. Support's existing routine reply permission and maintenance's existing bounded repair authority remain as previously configured; no new outreach is granted.

## Applied video workflow

1. Observe current sources and deduplicate against the existing task/checkpoint.
2. Diagnose repeated evidence before retrying. Clustered codes are clues, not established shared causes.
3. Produce a concrete, bounded artifact with acceptance criteria.
4. Verify internal work with meaningful tests; external work requires provider readback.
5. Save a dated lesson with scope, source, outcome, limitation, next check and supersession condition in the existing role-owned record.
6. Reuse that lesson on the next eligible run; pause only the blocked step and keep unrelated work moving.

## Preserved owner rules

Keep current Swing/Scalper/Pro/Lifetime products, prices and trial clocks. Keep automatic-access messaging and customer-specific verification. Keep 9 AM and 3 PM Eastern posts, daily education/promotion alternation, product-forward cinematic black/red references, roughly one fresh carousel every two days, and full-history duplicate checks. Never replace real indicator screenshots with generated evidence. Keep customer data, inbox content, tokens and analytics in private records. No new paid plan, credits, separately billed run, budget increase, refunds, permission change, or extra publishing is authorized.

## Deliberately excluded

Do not adopt upstream default posting frequencies, mandatory cancellation surveys, new discounts, generalized SaaS thresholds, enterprise seat/usage health scores, unsupported predicted savings, fabricated proof, automatic policy mutation or third-party installers. Do not activate retired publishers or introduce a duplicate scheduler. Do not treat the video as permission to access every inbox or send messages.

## Verification and rollout

Run `node tests/operating-memory.test.cjs`, `node tests/model-context.test.cjs`, TypeScript and the production build. Verify the production deployment SHA after release and use existing runtime logs to observe the new playbook version when an already-authorized run occurs. Do not trigger a separately billed worker solely for validation. Roll back by reverting the adoption commit; the change does not migrate data, modify customer entitlements or rewrite prior content receipts.
