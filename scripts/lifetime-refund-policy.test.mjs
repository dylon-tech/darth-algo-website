import test from "node:test";
import assert from "node:assert/strict";
import { lifetimeRefundStatus } from "../app/lib/lifetime-refund-policy.ts";

test("no refund on a fully captured and verified charge stays in source review", () => {
  assert.equal(lifetimeRefundStatus(0, 8999), "awaiting_source_review");
});

test("full refund before a delayed paid event prevents delivery", () => {
  assert.equal(lifetimeRefundStatus(8999, 8999), "refunded");
});

test("partially refunded order requires manual review", () => {
  assert.equal(lifetimeRefundStatus(1500, 8999), "refund_review");
});

test("missing or inconsistent Stripe charge data must fail closed", () => {
  for (const [refunded, captured] of [
    [undefined, undefined], [null, 8999], [0, null],
    [0, 0], [-1, 8999], [9000, 8999], [10.5, 8999],
  ]) assert.equal(lifetimeRefundStatus(refunded, captured), "refund_review");
});
