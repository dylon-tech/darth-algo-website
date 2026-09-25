import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {whopPermissionState} from './whop-permissions';

export const openLoopsSchema=`
create table if not exists os_open_loops (
 id uuid primary key, loop_key text not null unique, category text not null,
 title text not null, why text not null, service text not null,
 founder_action text, resume_action text not null,
 severity text not null check(severity in ('info','warning','critical')),
 status text not null default 'open' check(status in ('open','resolved')),
 source_type text not null, source_id text,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 resolved_at timestamptz, details jsonb not null default '{}'::jsonb
);
create index if not exists os_open_loops_active on os_open_loops(severity,last_seen_at desc) where status='open';`;

type Loop={key:string;category:string;title:string;why:string;service:string;founderAction:string|null;resumeAction:string;href?:string;severity:'info'|'warning'|'critical';sourceType:string;sourceId:string|null;details?:Record<string,unknown>};

export async function syncOpenLoops(){
 const sql=db();await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730934)`;await tx.unsafe(openLoopsSchema);});
 const loops:Loop[]=[];
 const [failed,tasks,approvals,indicator,browser,welcome,discount,capture,whop,retention]=await Promise.all([
  sql`select j.id,j.department,j.status,j.error_code,j.created_at from os_jobs j where j.status in ('failed','unknown') and j.created_at>now()-interval '7 days' and not (j.status='failed' and exists(select 1 from os_jobs n where n.department=j.department and n.status='succeeded' and n.created_at>j.created_at)) order by j.created_at desc limit 25`,
  sql`select id,department,title,status,updated_at from os_tasks where status='blocked' order by updated_at desc limit 25`,
  sql`select id,payload,expires_at from os_approvals where status='pending' and expires_at>now() order by created_at limit 25`,
  sql`select id,candidate->>'name' name,status from os_indicator_candidates where status in ('qa_blocked','pending','approved') order by created_at desc limit 10`,
  sql`select case when session_day=(now() at time zone 'America/New_York')::date then sessions_today else 0 end as sessions_today,verification_status,verified_at from os_browser_connection where id=1`,
  sql`select platform,paused,mode,evidence from os_welcome_platforms where platform='instagram'`,
  sql`select details,checked_at from os_welcome_checks where id='discount'`,
  sql`select blocked_reason from os_indicator_capture_control where id=1`,
  whopPermissionState(),
  sql`select count(*)::int as n from os_retention_reviews where state in ('draft_ready','awaiting_approval')`,
 ]);
 for(const row of failed)loops.push({key:`job:${row.id}`,category:'agent_failure',title:`${row.department} job needs recovery`,why:row.status==='unknown'?'The provider outcome is uncertain, so an automatic retry could duplicate an external action.':'The last execution failed.',service:'Darth Algo worker',founderAction:null,resumeAction:'Operations will reconcile the recorded result, then retry only when duplicate execution is impossible.',severity:'warning',sourceType:'job',sourceId:String(row.id),details:{errorCode:row.error_code||null}});
 for(const row of tasks)loops.push({key:`task:${row.id}`,category:'blocked_task',title:String(row.title),why:'A persisted task is blocked and has not reached a completed state.',service:String(row.department),founderAction:null,resumeAction:'The owning agent will re-check dependencies and resume the same durable task.',severity:'warning',sourceType:'task',sourceId:String(row.id)});
 for(const row of approvals)loops.push({key:`approval:${row.id}`,category:'approval',title:'Founder decision required',why:'This action is intentionally outside autonomous authority.',service:String(row.payload?.executor||row.payload?.kind||'Darth Algo'),founderAction:'Open the approval inbox and choose Approve, Revise, or Decline.',resumeAction:'The saved workflow resumes automatically after the decision.',severity:'info',sourceType:'approval',sourceId:String(row.id)});
 const browserRow=browser[0];
 for(const row of indicator){
  const name=String(row.name||'Indicator prototype');
  if(row.status==='qa_blocked')loops.push({key:`indicator-test:${row.id}`,category:'indicator_testing',title:`Test ${name}`,why:'Static code screening passed, but TradingView compilation and replay evidence are still required.',service:'TradingView',founderAction:capture[0]?.blocked_reason==='TRADINGVIEW_LOGIN_REQUIRED'?'Complete TradingView sign-in in the dedicated hosted browser.':Number(browserRow?.sessions_today)>=3?'Wait for the existing daily browser allowance to reset.':null,resumeAction:'The tester will compile, replay, capture evidence, and prepare the review card.',severity:'warning',sourceType:'indicator',sourceId:String(row.id),href:'/owner/indicators'});
  if(row.status==='pending')loops.push({key:`indicator-review:${row.id}`,category:'approval',title:`Review ${name}`,why:'A tested indicator package is awaiting the founder decision.',service:'Indicator Lab',founderAction:'Choose Approve, Revise, or Decline in Indicator Lab.',resumeAction:'Approval continues to the release package; revision returns to the builder.',severity:'info',sourceType:'indicator',sourceId:String(row.id),href:'/owner/indicators'});
  if(row.status==='approved')loops.push({key:`indicator-release:${row.id}`,category:'release',title:`Release ${name}`,why:'The indicator was approved but no verified TradingView publication receipt exists.',service:'TradingView',founderAction:'Complete the minimal TradingView submission if the release executor remains unavailable.',resumeAction:'The system verifies the public URL before marking the indicator released.',severity:'warning',sourceType:'indicator',sourceId:String(row.id),href:'/owner/indicators'});
 }
 if(whop.blocked)loops.push({key:'integration:whop',category:'connection',title:'Whop posting permission',why:'The latest recorded posting attempt lacks forum:post:create.',service:'Whop',founderAction:'Allow forum:post:create and forum:read on the existing Whop credential, then confirm in Connections.',resumeAction:'Verify the next authorized campaign with an actual post ID and content readback.',href:'/owner/connections',severity:'warning',sourceType:'integration',sourceId:'whop'});
 if(welcome[0]?.paused&&welcome[0]?.mode==='keyword_draft')loops.push({key:'integration:welcome-test',category:'welcome',title:'Test the WELCOME message',why:'The native keyword flow is still recorded as a draft. No received test message is recorded.',service:'Manychat',founderAction:'Designate your consenting Instagram test account. After offer validation, test WELCOME, a repeated request and STOP in the saved native flow.',resumeAction:'Record the actual recipient receipt and suppression checks before activating the existing flow.',href:'/owner/welcome',severity:'warning',sourceType:'integration',sourceId:'welcome-test'});
 if(discount[0]?.details?.reason==='DISCOUNT_DURATION_MUST_BE_ONCE')loops.push({key:'integration:welcome-offer',category:'welcome',title:'WELCOME duration differs from approved terms',why:'The latest Stripe read shows a recurring discount; saved approved terms cover the first paid invoice only.',service:'Stripe',founderAction:'In Stripe, correct your WELCOME configuration to 25% once, preserving first-time eligibility and the agreed no-expiry/no-global-cap terms.',resumeAction:'Re-read the code and safely verify checkout acceptance without a purchase.',href:'/owner/welcome',severity:'warning',sourceType:'integration',sourceId:'welcome-offer',details:{observedAt:discount[0].checked_at}});
 if(Number(retention[0]?.n)>0)loops.push({key:'integration:retention-review',category:'retention',title:'Review saved customer follow-up drafts',why:'Exact private drafts exist, but payment evidence alone is not permission or complete contact eligibility.',service:'Gmail / Retention',founderAction:'Review the named recipients and drafts after sent-history, suppression and access checks. Select a consenting controlled test before activation.',resumeAction:'Recheck live payment status immediately before any specifically approved send; preserve the provider receipt.',href:'/owner/retention',severity:'info',sourceType:'integration',sourceId:'retention-review'});
 const keys=loops.map(x=>x.key);
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730935)`;
  for(const loop of loops)await tx`insert into os_open_loops(id,loop_key,category,title,why,service,founder_action,resume_action,severity,status,source_type,source_id,details)
   values(${randomUUID()},${loop.key},${loop.category},${loop.title},${loop.why},${loop.service},${loop.founderAction},${loop.resumeAction},${loop.severity},'open',${loop.sourceType},${loop.sourceId},${tx.json(({...loop.details,href:loop.href||'/owner?view=inbox'}) as never)})
   on conflict(loop_key) do update set category=excluded.category,title=excluded.title,why=excluded.why,service=excluded.service,founder_action=excluded.founder_action,resume_action=excluded.resume_action,severity=excluded.severity,status='open',last_seen_at=now(),resolved_at=null,details=excluded.details`;
  if(keys.length)await tx`update os_open_loops set status='resolved',resolved_at=now() where status='open' and not(loop_key = any(${keys}))`;
  else await tx`update os_open_loops set status='resolved',resolved_at=now() where status='open'`;
 });
 return {status:'checked',open:loops.length,needsFounder:loops.filter(x=>x.founderAction).length};
}

export async function activeOpenLoops(limit=20){
 await db().unsafe(openLoopsSchema);
 return db()`select id,category,title,why,service,founder_action,resume_action,severity,last_seen_at,details->>'href' as href from os_open_loops where status='open' order by case severity when 'critical' then 0 when 'warning' then 1 else 2 end,last_seen_at desc limit ${Math.max(1,Math.min(50,limit))}`;
}
