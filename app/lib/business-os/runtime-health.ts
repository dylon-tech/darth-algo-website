import {socialHealthIssues} from "./social-health";
import {db} from "../affiliate-db";
import {queueOwnerNotice,deliverOwnerNotices} from "./delivery";
export async function runtimeHealth(){
  const sql=db();
  const [h]=await sql`select status,last_seen_at from os_worker_heartbeat where id=1`;
  const [control]=await sql`select paused from os_control where id=1`;
  const [jobs]=await sql`select count(*) filter(where status='queued')::int as queued,
    count(*) filter(where status in ('failed','unknown') and created_at>now()-interval '24 hours')::int as failed,
    min(created_at) filter(where status='queued') as oldest from os_jobs`;
  const [outbox]=await sql`select count(*)::int as n from os_outbox where status in ('unknown','failed') and created_at>now()-interval '24 hours'`;
  const stale=!h || Date.now()-new Date(h.last_seen_at).getTime()>300000;
  const issues:string[]=await socialHealthIssues();
  if(stale)issues.push("Worker heartbeat is older than five minutes.");
  if(!control?.paused && jobs.oldest && Date.now()-new Date(jobs.oldest).getTime()>3600000)issues.push("Queued work has waited over an hour.");
  if(h?.status==="budget_blocked")issues.push("AI is waiting for the configured spending allowance.");
  if(["ai_disabled","coordination_disabled"].includes(h?.status))issues.push("Automatic AI work is disabled by configuration.");
  if(h?.status==="failed")issues.push("Latest coordinator invocation failed.");
  if(outbox.n)issues.push("Some Telegram deliveries need reconciliation; they will not be blindly resent.");
  return {status:control?.paused?"paused":issues.length?"attention":"healthy",lastSeenAt:h?new Date(h.last_seen_at).toISOString():null,queued:jobs.queued,failed:jobs.failed,unknownNotices:outbox.n,issues};
}
export async function monitorRuntime(){
  const health=await runtimeHealth(),sql=db();
  const [previous]=await sql`select details from os_activity where event='health_observed' order by id desc limit 1`;
  const signature=JSON.stringify([health.status,health.issues]);
  // Alert on meaningful transitions only. No recurring "still healthy" messages.
  if(previous?.details.signature!==signature){
    const key=await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730933)`;
      const [latest]=await tx`select details from os_activity where event='health_observed' order by id desc limit 1`;
      if(latest?.details.signature===signature)return null;
      const [row]=await tx`insert into os_activity(actor,event,details) values('operations','health_observed',${tx.json({signature,...health})}) returning id`;
      return String(row.id);
    });
    if(key && (health.status==="attention" || previous?.details.status==="attention"))await queueOwnerNotice(`health:${key}`,`Darth Algo system: ${health.status}\n${health.issues.join("\n") || "Worker activity has recovered."}`);
  }
  await deliverOwnerNotices(2);
  return health;
}
