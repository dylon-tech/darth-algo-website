import { createHash, timingSafeEqual } from "node:crypto";

export const departments = ["ceo", "growth", "content", "support", "affiliates", "analytics", "research", "operations"] as const;
export type Department = typeof departments[number];
export const actionKinds = ["spending", "publishing", "customer_sensitive", "refund", "account_change", "outreach", "deployment", "other_external"] as const;
export type ActionKind = typeof actionKinds[number];

export const registry = [
  { id: "ceo", mandate: "Prioritize verified customer problems and measurable growth; coordinate departments and owner decisions." },
  { id: "growth", mandate: "Acquisition, conversion and referral experiments measured through retained customers." },
  { id: "content", mandate: "Accurate chart education and conversion content; reuse existing production and approval workflows." },
  { id: "support", mandate: "Activation, setup and retention; reuse existing support automation and escalate sensitive cases." },
  { id: "affiliates", mandate: "Recruitment preparation, first-sale attribution and refund-aware commissions; no automatic payouts." },
  { id: "analytics", mandate: "Source-backed measurement with explicit denominators, coverage and freshness." },
  { id: "research", mandate: "Customer and competitor evidence that leads to testable improvements." },
  { id: "operations", mandate: "Integration health, fulfillment reliability, incidents and automation." },
] as const;

export function secretMatches(actual: string | null, expected: string | undefined) {
  if (!actual || !expected || expected.length < 32) return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function fingerprint(value: unknown): string {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]));
    return v;
  }
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export type Plan = {
  brief: string;
  tasks: Array<{ department: Department; title: string; priority: number; evidence: string[] }>;
  proposals: Array<{ kind: ActionKind; summary: string; details: string; evidence: string[] }>;
};

export function validatePlan(raw: unknown, sourceIds: string[]): Plan {
  if (!raw || typeof raw !== "object") throw new Error("Invalid CEO output");
  const p = raw as Plan;
  const validText = (s: unknown, max: number) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
  const validEvidence = (v: unknown) => Array.isArray(v) && v.length > 0 && v.length <= 8 && v.every(x => typeof x === "string" && sourceIds.includes(x));
  if (!validText(p.brief, 6000) || !Array.isArray(p.tasks) || p.tasks.length > 5 || !Array.isArray(p.proposals) || p.proposals.length > 5) throw new Error("Invalid CEO output");
  for (const t of p.tasks) {
    if (!t || !departments.includes(t.department) || !validText(t.title, 240) || !Number.isInteger(t.priority) || t.priority < 1 || t.priority > 5 || !validEvidence(t.evidence)) throw new Error("Invalid task or evidence");
  }
  for (const a of p.proposals) {
    if (!a || !actionKinds.includes(a.kind) || !validText(a.summary, 240) || !validText(a.details, 4000) || !validEvidence(a.evidence)) throw new Error("Invalid proposal or evidence");
  }
  return p;
}

// No external executor is exposed in Phase 1. Approval records are decisions,
// never permission for an agent to call arbitrary URLs, send messages or spend.
export function canExecuteExternalAction(): false { return false; }
