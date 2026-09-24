import type {Bill} from './ceo-home-model';

// Owner authorized best estimates on 2026-09-24. These are planning assumptions,
// never invoices, spending authorizations, or claims about the owner's actual plan.
const estimatedAt='2026-09-24T00:00:00.000Z';
function estimate(id:string,name:string,amountCents:number,source:string,sourceUrl?:string,cadence:Bill['cadence']='monthly'):Bill{
 return {id,name,amountCents,cadence,status:'estimated',source,sourceUrl,estimatedAt,verifiedAt:null};
}
export const estimatedBills:Bill[]=[
 estimate('tradingview','TradingView',6995,'Assumes Premium, monthly. Published annual equivalent $59.95 plus $120/year monthly-billing difference. Actual plan, market data and taxes unknown.','https://www.tradingview.com/pricing/'),
 estimate('vercel','Vercel',2000,'Assumes one Pro seat at the public base price. Additional usage and seats excluded.','https://vercel.com/pricing'),
 estimate('neon','Neon',1500,'Usage allowance using the published $15 typical small-project spend. Actual usage/plan unknown. Counted here even if collected through Vercel.','https://neon.com/pricing'),
 estimate('buffer','Buffer',0,'Free plan with three connected channels observed September 20. Assumes unchanged; no paid upgrade was made.','https://buffer.com/pricing'),
 estimate('openai','OpenAI / AI Gateway',5000,'Planning allowance of $50/month for API use, not measured spend or a subscription quote. Existing $100 worker cap is unchanged.'),
 estimate('elevenlabs','ElevenLabs',2200,'Assumes Creator at the standard $22 monthly price, excluding introductory discount and overages. Actual plan unknown.','https://elevenlabs.io/pricing'),
 estimate('godaddy','GoDaddy domain',2500,'Round $25/year renewal allowance for one domain. Actual renewal, privacy add-ons and taxes unknown.',undefined,'annual'),
 estimate('metricool','Metricool',2500,'Round $25/month analytics allowance. Connected analytics are known; paid tier and actual invoice are not.','https://metricool.com/pricing/'),
 estimate('vidiq','vidIQ',2000,'Round $20/month research allowance. Credits are not a verified recurring charge; actual plan is unknown.','https://vidiq.com/plans/'),
 estimate('browserbase','Browserbase',2000,'Assumes the public $20 Developer plan for the connected browser. Actual plan and usage unknown; does not buy more sessions.','https://www.browserbase.com/pricing'),
 estimate('manychat','Manychat',0,'Free plan observed September 23. Assumes unchanged; Welcome remains subject to its activation gates.','https://manychat.com/pricing'),
];
export function mergeBillEstimates(saved:Bill[]):Bill[]{
 return [...estimatedBills.filter(b=>!saved.some(s=>s.id===b.id)),...saved.map(b=>{
  const fallback=estimatedBills.find(e=>e.id===b.id);
  return b.status==='unverified'&&b.amountCents===null&&fallback?{...fallback,name:b.name}:b;
 })];
}
