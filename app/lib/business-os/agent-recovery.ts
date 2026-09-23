import {db} from '../affiliate-db';
import {queueJob} from './jobs';
import type {Department} from './policy';

// Owner requested recovery on September 23. Exactly one replacement per failed
// daily job from that incident, preserving failures and existing dollar limits.
export async function recoverContextIncident(){
 const sql=db();
 const jobs=await sql`select j.id,j.department,j.message,j.task_id from os_jobs j
  where j.status='failed' and j.request_key like 'coord:2026-09-23:%'
  and exists(select 1 from os_runs r where r.request_key='job_'||j.id::text and r.status='failed'
    and r.created_at>='2026-09-23T04:00:00Z' and r.created_at<'2026-09-23T04:10:00Z')`;
 for(const j of jobs)await queueJob(j.department as Department,j.message,`context-recovery-v1:${j.id}`,'schedule',j.task_id||undefined);
 return {eligible:jobs.length};
}
