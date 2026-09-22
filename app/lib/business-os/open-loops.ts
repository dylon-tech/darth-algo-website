import {randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';

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

type Loop={key:string;category:string;title:string;why:string;service:string;founderAction:string|null;resumeAction:string;severity:'info'|'warning'|'critical';sourceType:string;sourceId:string|null;details?:Record<string,unknown>};

export async function syncOpenLoops(){
 const sql=db();await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730934)`;await tx.unsafe(openLoopsSchema);});
 const loops:Loop[]=[];
 const [failed,tasks,approvals,indicator,browser]=await Promise.all([
  sql`select id,department,status,error_code,created_at from os_jobs where status in ('failed','unknown') and created_at>now()-interval '7 days' order by created_at desc limit 25`,
  sql`select id,department,title,status,updated_at from os_tasks where status='blocked' order by updated_at desc limit 25`,
  sql`select id,payload,expires_at from os_approvals where status='pending' and expires_at>now() order by created_at limit 25`,
  sql`select id,candidate->>'name' name,status from os_indicator_candidates where status in ('qa_blocked','pending','approved') order by created_at desc limit 10`.catch(()=>[]),
  sql`select attempts,verification_status,verified_at from os_browser_connection where id=1`.catch(()=>[]),
 ]);
 for(const row of failed)loops.push({key:`job:${row.id}`,category:'agent_failure',title:`${row.department} job needs recovery`,why:row.status==='unknown'?'The provider outcome is uncertain, so an automatic retry could duplicate an external action.':'The last execution failed.',service:'Darth Algo worker',founderAction:null,resumeAction:'Operations will reconcile the recorded result, then retry only when duplicate execution is impossible.',severity:'warning',sourceType:'job',sourceId:String(row.id),details:{errorCode:row.error_code||null}});
 for(const row of tasks)loops.push({key:`task:${row.id}`,category:'blocked_task',title:String(row.title),why:'A persisted task is blocked and has not reached a completed state.',service:String(row.department),founderAction:null,resumeAction:'The owning agent will re-check dependencies and resume the same durable task.',severity:'warning',sourceType:'task',sourceId:String(row.id)});
 for(const row of approvals)loops.push({key:`approval:${row.id}`,category:'approval',title:'Founder decision required',why:'This action is intentionally outside autonomous authority.',service:String(row.payload?.executor||row.payload?.kind||'Darth Algo'),founderAction:'Open the approval inbox and choose Approve, Revise, or Decline.',resumeAction:'The saved workflow resumes automatically after the decision.',severity:'info',sourceType:'approval',sourceId:String(row.id)});
 const browserRow=browser[0];
 for(const row of indicator){
  const name=String(row.name||'Indicator prototype');
  if(row.status==='qa_blocked')loops.push({key:`indicator-test:${row.id}`,category:'indicator_testing',title:`Test ${name}`,why:'Static code screening passed, but TradingView compilation and replay evidence are still required.',service:'TradingView',founderAction:Number(browserRow?.attempts)>=2?'Authorize another bounded TradingView browser session.':null,resumeAction:'The tester will compile, replay, capture evidence, and prepare the review card.',severity:'warning',sourceType:'indicator',sourceId:String(row.id)});
  if(row.status==='pending')loops.push({key:`indicator-review:${row.id}`,category:'approval',title:`Review ${name}`,why:'A tested indicator package is awaiting the founder decision.',service:'Indicator Lab',founderAction:'Choose Approve, Revise, or Decline in Indicator Lab.',resumeAction:'Approval continues to the release package; revision returns to the builder.',severity:'info',sourceType:'indicator',sourceId:String(row.id)});
  if(row.status==='approved')loops.push({key:`indicator-release:${row.id}`,category:'release',title:`Release ${name}`,why:'The indicator was approved but no verified TradingView publication receipt exists.',service:'TradingView',founderAction:'Complete the minimal TradingView submission if the release executor remains unavailable.',resumeAction:'The system verifies the public URL before marking the indicator released.',severity:'warning',sourceType:'indicator',sourceId:String(row.id)});
 }
 const keys=loops.map(x=>x.key);
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730935)`;
  for(const loop of loops)await tx`insert into os_open_loops(id,loop_key,category,title,why,service,founder_action,resume_action,severity,status,source_type,source_id,details)
   values(${randomUUID()},${loop.key},${loop.category},${loop.title},${loop.why},${loop.service},${loop.founderAction},${loop.resumeAction},${loop.severity},'open',${loop.sourceType},${loop.sourceId},${tx.json((loop.details||{}) as never)})
   on conflict(loop_key) do update set category=excluded.category,title=excluded.title,why=excluded.why,service=excluded.service,founder_action=excluded.founder_action,resume_action=excluded.resume_action,severity=excluded.severity,status='open',last_seen_at=now(),resolved_at=null,details=excluded.details`;
  if(keys.length)await tx`update os_open_loops set status='resolved',resolved_at=now() where status='open' and not(loop_key = any(${keys}))`;
  else await tx`update os_open_loops set status='resolved',resolved_at=now() where status='open'`;
 });
 return {status:'checked',open:loops.length,needsFounder:loops.filter(x=>x.founderAction).length};
}

export async function activeOpenLoops(limit=20){
 await db().unsafe(openLoopsSchema);
 return db()`select id,category,title,why,service,founder_action,resume_action,severity,last_seen_at from os_open_loops where status='open' order by case severity when 'critical' then 0 when 'warning' then 1 else 2 end,last_seen_at desc limit ${Math.max(1,Math.min(50,limit))}`;
}
