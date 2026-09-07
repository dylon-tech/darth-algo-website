import { db } from "../affiliate-db";
import { collectEvidence } from "./sources";
import { queueOwnerNotice } from "./delivery";

export async function createDailyBrief() {
  const sql=db();
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const [existing]=await sql`select * from os_briefs where day=${day}`;
  if(existing) {await queueOwnerNotice(`daily-brief:${day}`,existing.body);return existing;}
  const [evidence,jobs,approvals,control]=await Promise.all([
    collectEvidence(),
    sql`select status,count(*)::int as count from os_jobs group by status`,
    sql`select count(*)::int as count from os_approvals where status='pending' and expires_at>now()`,
    sql`select paused from os_control where id=1`,
  ]);
  const verified=evidence.filter(x=>x.status==="verified");
  const missing=evidence.filter(x=>x.status==="unavailable");
  const environment=process.env.VERCEL_ENV || "local";
  const body=[`DARTH ALGO · DAILY OWNER BRIEF · ${day}`,`Environment: ${environment}${environment==="preview" ? " (database branch copy; not a continuous production feed)" : ""}`,`Checked: ${new Date().toISOString()}`,"", "VERIFIED SOURCE SNAPSHOT",...verified.map(x=>`${x.id}: ${JSON.stringify(x.data)}\nScope: ${x.scope}`),...(!verified.length?["No business source could be verified."]:[]),"",`UNKNOWN: ${missing.map(x=>x.id).join(", ") || "none"}`,"",`JOBS: ${jobs.map(x=>`${x.status} ${x.count}`).join(", ") || "none"}`,`OWNER DECISIONS: ${approvals[0].count}`,`WORK: ${control[0]?.paused ? "paused" : "on demand"}; AI ${process.env.AI_OS_AI_ENABLED==="true" ? "enabled" : "disabled"}`,"", "NEXT PRIORITIES", "1. Verify paid-customer access and payment-to-activation coverage.","2. Resolve missing measurement sources before scaling acquisition spend.","3. Review pending decisions and completed internal deliverables.","", "This is a source report. No model was called and no external business action was executed."].join("\n");
  const result=await sql.begin(async tx=>{
    const [inserted]=await tx`insert into os_briefs(day,body,evidence) values(${day},${body},${tx.json(JSON.parse(JSON.stringify(evidence)))}) on conflict do nothing returning *`;
    if(inserted) await tx`insert into os_activity(actor,event,entity_id,details) values('ceo','daily_source_brief_created',${day},'{"modelCalled":false}'::jsonb)`;
    return inserted;
  });
  const brief=result || (await sql`select * from os_briefs where day=${day}`)[0];
  await queueOwnerNotice(`daily-brief:${day}`,brief.body);
  return brief;
}
