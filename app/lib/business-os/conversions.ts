import { stripe } from "../stripe";
import { summarizeConversions, type CheckoutObservation } from "./conversion-summary";

export async function checkoutConversions() {
  const client=stripe();
  const options={timeout:5000,maxNetworkRetries:0};
  const balance=await client.balance.retrieve({},options);
  if(!balance.livemode) throw new Error("TEST_MODE_NOT_EVIDENCE");
  const end=Math.floor(Date.now()/1000),start=end-30*86400;
  const rows:CheckoutObservation[]=[];
  let after:string|undefined;
  for(let page=0;page<5;page++) {
    const batch=await client.checkout.sessions.list({limit:100,created:{gte:start,lt:end},expand:["data.subscription"],...(after?{starting_after:after}:{})},options);
    rows.push(...batch.data as CheckoutObservation[]);
    if(!batch.has_more) return summarizeConversions(rows,start,end);
    after=batch.data.at(-1)?.id;
    if(!after) break;
  }
  throw new Error("CHECKOUT_PAGINATION_INCOMPLETE");
}
