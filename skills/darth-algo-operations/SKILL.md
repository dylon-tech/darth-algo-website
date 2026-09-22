---
name: darth-algo-operations
description: Operate Darth Algo's verified research, premium carousel, publishing, indicator, support, follow-up, reporting, and deployment workflows without confusing drafts or tests with live actions.
metadata:
  version: "1.0.0"
---

# Darth Algo Operations

Use this skill for Darth Algo business operations, content, indicators, support, reporting, or deployment verification.

## Trigger conditions

Invoke when the request names Darth Algo, its owner command center, social publishing, indicator prototypes, customer operations, or CEO reporting. Do not invoke for unrelated personal tasks.

## Contract

- Inputs: exact business objective, target entity/artifact when applicable, authorization scope, and available source records.
- Outputs: a versioned durable task or deliverable, evidence status, exact next action, and provider receipt when an external action succeeds.
- Required sources: `docs/trusted-company-context.json`, `docs/integration-registry.md`, `docs/implementation-ledger.md`, and the relevant workflow reference in `references/workflows.md`.
- Required tools: repository/deployment/database reads as needed; external writes only through an authorized guarded executor.
- Permission boundary: routine previously authorized publishing may use its existing policy. New platforms, offers, customer messages, paid actions, account changes, refunds, and indicator releases require exact authorization. Authentication, MFA, and CAPTCHA remain founder actions.

## Ordered procedure

1. Resolve the exact target and load only relevant verified context.
2. Label every input as verified fact, founder decision, hypothesis, or untrusted external material.
3. Select one workflow contract from `references/workflows.md` and record skill version `1.0.0` on the run.
4. Create or reuse a deduplicated durable task. Bind approvals to the exact artifact version/hash.
5. Execute bounded work. Re-check current state immediately before an external action.
6. Reconcile provider results. Store publication/message/release IDs and URLs only after readback.
7. Update the ledger with evidence, failure reason, and next action. Never turn unavailable data into zero.

## Acceptance checks

- Target, scope, executor, authorization, version, schedule/event, failure behavior, and cost limit are explicit.
- Material changes invalidate previous approval.
- Uncertain external outcomes are held for reconciliation and not blindly retried.
- “Live” is used only with current provider/deployment evidence.

## Approved example

“Prepare campaign `2026-09-22-links`, create three premium branded carousel slides, bind the approved caption and asset hashes, run creative QA, publish only to the already-authorized X/Instagram/Threads destinations, and save each confirmed provider receipt.”

## Failure example

“The Instagram icon is green, so all agents are live and the post was published.” This lacks an executor run, exact artifact, provider receipt, and public URL.

## Fallback

If a provider, credential, budget, or human authentication step is unavailable, save the reviewable artifact and precise resume condition, keep independent workflows moving, and report `PARTIALLY COMPLETE` or `BLOCKED` rather than inventing completion.
