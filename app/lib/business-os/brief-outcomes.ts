import {db} from '../affiliate-db';
import {publicOperationUrl} from './operations-model';

// Read saved outcomes for the existing private daily notice. This never sends
// anything itself and never turns a queued job or accepted post into success.
export async function briefOutcomes(){
 const sql=db();
 const [posts,jobs,retention,indicator,needs]=await Promise.all([
  sql`select distinct on(a.id) a.payload->>'network' as network,r.details from os_approvals a join os_activity r on r.entity_id=a.id::text where r.event='buffer_publish_checked' and r.details->>'published'='true' and r.created_at>now()-interval '24 hours' order by a.id,r.id desc limit 6`,
  sql`select j.department,left(r.result->>'brief',160) as preview from os_jobs j join os_runs r on r.id=j.run_id where j.status='succeeded' and j.finished_at>now()-interval '24 hours' order by j.finished_at desc limit 3`,
  sql`select details,created_at from os_activity where event='retention_sync' order by id desc limit 1`,
  sql`select id,status from os_indicator_candidates where candidate->>'name' ilike '%Session VWAP Reclaim%' order by created_at desc limit 1`,
  sql`select title,founder_action from os_open_loops where status='open' and founder_action is not null order by case severity when 'critical' then 0 when 'warning' then 1 else 2 end,last_seen_at desc limit 4`,
 ]);
 const links=posts.flatMap(p=>{const url=publicOperationUrl(p.details.externalLink,p.network);return url?[`${p.network}: ${url}`]:[];});
 const scan=retention[0],checked=scan?.details?.subscriptionsChecked;
 const body=[
  'VERIFIED OUTCOMES · last 24 hours',
  links.length?links.join('\n'):'No saved public post links in this readback window.',
  ...jobs.map(j=>`${j.department} completed: ${String(j.preview||'Saved output available in the agent conversation.').replace(/\s+/g,' ')}`),
  `Retention: ${typeof checked==='number'?`${checked} subscriptions checked${scan.details.hasMore?' (partial account scan)':''}`:'scan coverage unavailable'}; scans and drafts are not sent messages or recovered payments.`,
  `Session VWAP Reclaim: ${indicator[0]?.status||'state unavailable'}; compilation/replay require source-bound test evidence.`,
  'Private results: https://www.darthalgo.com/owner?view=inbox',
  ...(needs.length?['NEEDS YOU',...needs.map(n=>`${n.title}: ${n.founder_action}`)]:[]),
  `Read at ${new Date().toISOString()}. Retention scan: ${scan?.created_at instanceof Date?scan.created_at.toISOString():scan?.created_at||'unavailable'}.`,
 ].join('\n');
 return {body,postLinks:links.length,completedJobs:jobs.length,retentionCheckedAt:scan?.created_at||null};
}
