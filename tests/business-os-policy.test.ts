import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node runs the explicit TypeScript extension in this isolated test.
import { secretMatches, fingerprint, validatePlan, canExecuteExternalAction, actionKinds } from "../app/lib/business-os/policy.ts";

test("owner authentication fails closed", () => {
  assert.equal(secretMatches(null, undefined), false);
  assert.equal(secretMatches("short", "short"), false);
  assert.equal(secretMatches("a".repeat(32), "b".repeat(32)), false);
  assert.equal(secretMatches("a".repeat(32), "a".repeat(32)), true);
});
test("approvals bind to exact nested payload but ignore property order", () => {
  assert.equal(fingerprint({ a: 1, b: { x: 2 } }), fingerprint({ b: { x: 2 }, a: 1 }));
  assert.notEqual(fingerprint({ amount: 10, target: "a" }), fingerprint({ amount: 100, target: "a" }));
  assert.notEqual(fingerprint({ target: "a" }), fingerprint({ target: "b" }));
});
test("model cannot introduce unsupported evidence, departments or actions", () => {
  const task = { department: "growth", title: "Check attribution", priority: 1, evidence: ["growth_30d"] };
  const plan = { brief: "Conversion is unavailable.", tasks: [task], proposals: [] };
  assert.deepEqual(validatePlan(plan, ["growth_30d"]), plan);
  for (const bad of [{ evidence: ["invented_revenue"] }, { evidence: [] }, { priority: 0 }, { department: "bank" }, { title: "" }]) {
    assert.throws(() => validatePlan({ ...plan, tasks: [{ ...task, ...bad }] }, ["growth_30d"]));
  }
  assert.throws(() => validatePlan({ ...plan, proposals: [{ kind: "shell", summary: "Run", details: "Run", evidence: ["growth_30d"] }] }, ["growth_30d"]));
  assert.throws(() => validatePlan({ ...plan, tasks: Array(6).fill(task) }, ["growth_30d"]));
});
test("every external action remains non-executable, including approved proposals", () => {
  for (const kind of actionKinds) assert.equal(canExecuteExternalAction(), false, kind);
});
