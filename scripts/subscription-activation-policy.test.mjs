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

test('classifies real zero-total paid and no-payment-required trials without fabricating revenue', async () => {
  const { checkoutActivationEvidence: classify } = await import('../app/lib/subscription-activation-policy.ts');
  const session={status:'complete',payment_status:'paid',amount_total:0};
  const subscription={status:'trialing',trial_start:1793696797,trial_end:1793869597};
  for(const payment_status of ['paid','no_payment_required']) {
    assert.deepEqual(classify({...session,payment_status},'Swing',subscription),{kind:'trial_checkout',amountPaidCents:0,trialEndsAt:new Date(subscription.trial_end*1000).toISOString()});
  }
  assert.deepEqual(classify({...session,amount_total:1499},'Swing',subscription),{kind:'paid_checkout',amountPaidCents:1499,trialEndsAt:null});
  for(const change of [{status:'open'},{payment_status:'unpaid'},{amount_total:-1},{amount_total:0.5},{amount_total:null},{amount_total:NaN},{amount_total:Infinity}])assert.equal(classify({...session,...change},'Swing',subscription),null);
  for(const status of ['active','past_due','canceled','paused','incomplete'])assert.equal(classify(session,'Swing',{...subscription,status}),null);
  for(const change of [{trial_start:null},{trial_start:0},{trial_end:null},{trial_end:1793696797},{trial_end:1e15}])assert.equal(classify(session,'Swing',{...subscription,...change}),null);
  for(const plan of ['Pro','Scalper'])assert.equal(classify(session,plan,subscription),null);
});
