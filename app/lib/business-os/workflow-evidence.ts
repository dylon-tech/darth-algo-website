import {db} from '../affiliate-db';
import {readContentQueue} from './daily-content-review';
import {easternClock} from './social-schedule';
import {pineChecks,pineHash} from './indicator-policy';

// Bounded production readback through the existing worker. No provider writes,
// customer identities, Pine source, credentials or arbitrary draft text in logs.
export async function recordWorkflowEvidence(){
 const sql=db(),day=easternClock().day,revision=process.env.VERCEL_GIT_COMMIT_SHA||'unknown';
 const key=`five-workflows-v1:${day}:${revision}`;
 const [exists]=await sql`select id from os_activity where event='workflow_acceptance_snapshot' and entity_id=${key} limit 1`;
 if(exists)return;
 const [queue,indicators,retention,loops]=await Promise.all([
  readContentQueue(),
  sql`select id,source_hash,candidate,status from os_indicator_candidates where candidate->>'name' ilike '%Session VWAP Reclaim%' order by created_at desc limit 1`,
  sql`select details from os_activity where event='retention_sync' order by id desc limit 1`,
  sql`select loop_key,title,service,founder_action,resume_action,details->>'href' as href from os_open_loops where status='open' and founder_action is not null order by last_seen_at desc limit 12`,
 ]);
 const candidate=indicators[0];
 const captures=candidate?await sql`select id,source_hash,origin,metadata->>'compiled' as compiled,metadata->>'replay' as replay,metadata->>'capturedAt' as captured_at from os_indicator_captures where candidate_id=${candidate.id} and source_hash=${candidate.source_hash} order by created_at desc limit 4`:[];
 const evidence={skillVersion:'1.0.0',revision,checkedAt:new Date().toISOString(),
  content:queue.items.filter(c=>c.day<=day).slice(-4).map(c=>({id:c.id,day:c.day,slot:c.slot,reviewHash:c.reviewHash,deliveries:c.deliveries})),
  indicator:candidate?{id:candidate.id,sourceHash:candidate.source_hash,status:candidate.status,sourceHashMatches:typeof candidate.candidate?.pine==='string'&&pineHash(candidate.candidate.pine)===candidate.source_hash,staticChecks:pineChecks(candidate.candidate?.pine||''),captures:Array.from(captures)}:null,
  retention:retention[0]?.details||null,needsYou:Array.from(loops),
  limits:['Authenticated owner interaction unverified by this snapshot.','Static Pine checks do not establish TradingView compilation or replay.','Retention scans and drafts do not establish messages or recovered revenue.','Provider readback evidence does not establish a physical iPhone test.']};
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730962)`;
  const [duplicate]=await tx`select id from os_activity where event='workflow_acceptance_snapshot' and entity_id=${key} limit 1`;
  if(duplicate)return;
  await tx`insert into os_activity(actor,event,entity_id,details) values('operations','workflow_acceptance_snapshot',${key},${tx.json(evidence as never)})`;
  console.info(JSON.stringify({event:'workflow_acceptance_snapshot',...evidence}));
 });
}
