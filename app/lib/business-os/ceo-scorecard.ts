import {socialHealthIssues} from "./social-health";
import { db } from "../affiliate-db";
import {publishingQueueSnapshot,nextContentWindow} from "./publishing-scorecard";
import { stripe } from "../stripe";
export const businessDay=(date=new Date())=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
type SubscriptionRow={livemode:boolean;status:string;customer:string|{id:string};cancel_at_period_end?:boolean;cancel_at?:number|null};
export function countCustomers(rows:SubscriptionRow[]){
 const active=new Set<string>(),trials=new Set<string>(),late=new Set<string>();
 for(const row of rows){if(!row.livemode)throw new Error("LIVE_DATA_REQUIRED");const id=typeof row.customer==='string'?row.customer:row.customer.id;if(!id)throw new Error("CUSTOMER_ID_REQUIRED");if(row.status==='active')active.add(id);if(row.status==='trialing')trials.add(id);if(row.status==='past_due')late.add(id);}
 return {active:active.size,trials:trials.size,pastDue:late.size,scope:"Unique Stripe customers with an active subscription. Whole Stripe account; trials separate. Lifetime and TradingView access not included."};
}
export async function customerSnapshot(){
 const sql=db();
 const [cached]=await sql`select details,created_at from os_activity where event='ceo_customer_snapshot' and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(cached)return cached.details as {active:number|null;trials:number|null;pastDue:number|null;checkedAt:string;scope:string};
 let result;
 try {
  const client=stripe(),balance=await client.balance.retrieve({},{timeout:5000,maxNetworkRetries:0});if(!balance.livemode)throw new Error("LIVE_DATA_REQUIRED");
  const rows:SubscriptionRow[]=[];let after:string|undefined,complete=false;
  for(let page=0;page<10;page++){
   const batch=await client.subscriptions.list({status:'all',limit:100,...(after?{starting_after:after}:{})},{timeout:5000,maxNetworkRetries:0});
   rows.push(...batch.data);if(!batch.has_more){complete=true;break;}after=batch.data.at(-1)?.id;if(!after)break;
  }
  if(!complete)throw new Error("INCOMPLETE_CUSTOMER_SNAPSHOT");
  result={...countCustomers(rows),checkedAt:new Date().toISOString()};
 }catch{result={active:null,trials:null,pastDue:null,checkedAt:new Date().toISOString(),scope:"Live Stripe customer count unavailable."};}
 await sql`insert into os_activity(actor,event,details) values('analytics','ceo_customer_snapshot',${sql.json(result)})`;
 return result;
}
export async function ownerNeeds(){
 const sql=db();
 const approvals=await sql`select id,payload from os_approvals where status='pending' and expires_at>now() and coalesce(payload->>'executor','') not in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2') order by created_at limit 6`;
 const failed=await sql`select department,status from (select distinct on(department) department,status,created_at from os_jobs order by department,created_at desc) latest where status in ('failed','unknown') and created_at>now()-interval '24 hours'`;
 const [blocked]=await sql`select count(*)::int as n from os_tasks where status='blocked'`;
 return {approvals,failed,blocked:Number(blocked.n)};
}
export async function ceoScorecard(){
 const sql=db(),day=businessDay();
 const [customers,needs,posts,jobs,controls,queue]=await Promise.all([
  customerSnapshot(),ownerNeeds(),
  sql`select coalesce(a.payload->>'network',a.payload->>'executor') as network,(r.details->>'sentAt')::timestamptz at time zone 'America/New_York' as sent_at from os_approvals a join lateral (select details from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true' and details->>'sentAt' is not null order by id desc limit 1) r on true where a.payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2') and ((r.details->>'sentAt')::timestamptz at time zone 'America/New_York')::date=${day}::date`,
  sql`select status,count(*)::int as n from os_jobs where status in ('queued','running') group by status`,
  sql`select paused from os_control where id=1`,publishingQueueSnapshot(),
 ]);
 const x=posts.filter(p=>['buffer_x_v1','x'].includes(p.network)).length,ig=posts.filter(p=>['buffer_instagram_v1','instagram'].includes(p.network)).length,threads=posts.filter(p=>p.network==='threads').length;
 const count=(s:string)=>jobs.find(j=>j.status===s)?.n || 0;
 const attention=[...(needs.approvals.length?[`${needs.approvals.length}${needs.approvals.length===6?'+':''} proposal${needs.approvals.length===1?'':'s'} to review`]:[]),...(needs.failed.length?[`${needs.failed.map(j=>j.department).join(', ')}: last job needs a check`]:[])];
 if(queue.attention)attention.push(`${queue.attention} post delivery needs checking in Buffer`);
 if(process.env.AI_OS_INDICATOR_LAB_ENABLED==="true") {
  const research=await (await import("./vidiq-connection")).vidiqStatus().catch(()=>null);
  if(research && !research.connected)attention.push("connect vidIQ in Connections");
  attention.push("TradingView publishing worker needs setup");
 }
 attention.push(...await socialHealthIssues());
 const body=[`◆ DARTH ALGO · CEO DESK`,`Talking to: CEO`,"",`Active subscribing customers: ${customers.active??'unavailable'}`,`Trials: ${customers.trials??'unavailable'} · Past due: ${customers.pastDue??'unavailable'}`,`Published today: ${x+ig+threads} (${x} X · ${ig} Instagram · ${threads} Threads)`,`Post queue: ${queue.waiting} ready · ${queue.checking} checking delivery`,`Agents: ${count('running')} working · ${count('queued')} waiting`,"",`Needs you: ${attention.length?attention.join('; '):'no pending decisions or recent failed jobs.'}`,needs.blocked?`Blocked tasks: ${needs.blocked} · open Needs me.`:'',`Posting: ${controls[0]?.paused?'paused':`automatic · next content window ${nextContentWindow()}`}`,"",`Stripe subscriptions only; lifetime/access unverified.`,`Updated ${new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(new Date())} ET · ${day}`].filter((x,i,a)=>x!=='' || a[i-1]!=='').join('\n');
 return {day,body,customers,posts:{x,instagram:ig,threads},queue,needs};
}
