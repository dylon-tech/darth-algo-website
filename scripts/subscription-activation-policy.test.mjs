import test from "node:test";
import assert from "node:assert/strict";
import { paidMonthlyPlan, checkoutTradingViewUsername } from "../app/lib/subscription-activation-policy.ts";

const plans = [
  ["price_1TyfRJLAuZzjYekvDZhVu7GD","prod_UycgwPt0RlecEZ","Swing"],
  ["price_1TyfO6LAuZzjYekvVTZjStmx","prod_Uycd58YOrTYNIe","Scalper"],
  ["price_1TeSwbLAuZzjYekvgGYRpqjo","prod_UdkRkkaCbtk8oJ","Pro"],
];

for(const [price,product,name] of plans) {
  test(`recognizes exact live ${name} product/price pair`,() => {
    assert.deepEqual(paidMonthlyPlan([{price:{id:price,product},quantity:1}]),{productId:product,priceId:price,name});
  });
}

test("rejects mismatched products and arbitrary prices", () => {
  assert.equal(paidMonthlyPlan([{price:{id:plans[0][0],product:plans[1][1]},quantity:1}]),null);
  assert.equal(paidMonthlyPlan([{price:{id:"price_fake",product:plans[0][1]},quantity:1}]),null);
  assert.equal(paidMonthlyPlan([{price:{id:plans[0][0],product:plans[0][1]},quantity:2}]),null);
  assert.equal(paidMonthlyPlan([]),null);
  assert.equal(paidMonthlyPlan([
    {price:{id:plans[0][0],product:plans[0][1]},quantity:1},
    {price:{id:plans[1][0],product:plans[1][1]},quantity:1},
  ]),null);
});

test("accepts only one reasonable TradingView username from checkout fields", () => {
  assert.equal(checkoutTradingViewUsername([{key:"tradingviewusername",type:"text",text:{value:" sample_user "}}]),"sample_user");
  assert.equal(checkoutTradingViewUsername([]),null);
  assert.equal(checkoutTradingViewUsername([{key:"other",type:"text",text:{value:"abc123"}}]),null);
  assert.equal(checkoutTradingViewUsername([{key:"tradingviewusername",type:"text",text:{value:"<script>alert(1)</script>"}}]),null);
  assert.equal(checkoutTradingViewUsername([
    {key:"tradingviewusername",type:"text",text:{value:"one"}},
    {key:"tradingviewusername",type:"text",text:{value:"two"}},
  ]),null);
});
