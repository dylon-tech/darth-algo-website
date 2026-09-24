import {db} from '../affiliate-db';
import {queueJob} from './jobs';
import {recurringBudgetAvailability} from './budget';
import {type Department} from './policy';
import {syncOpenLoops} from './open-loops';

export async function requestAgentRecovery(){
 const sql=db();
 const requestHour=new Date().toISOString().slice(0,13);
 const [record]=await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730916)`;return tx`insert into os_activity(actor,event,entity_id,details) select 'owner','owner_recovery_requested',${requestHour},'{"source":"CEO home"}'::jsonb where not exists(select 1 from os_activity where event='owner_recovery_requested' and entity_id=${requestHour}) returning id`;});
 if(record)console.info(JSON.stringify({event:'owner_recovery_requested',requestId:String(record.id)}));
 const [control]=await sql`select paused from os_control where id=1`;
 if(!control||control.paused)return {status:'blocked',message:'Work is paused. Resume it in the controls before recovery can run.'};
 if(process.env.AI_OS_AI_ENABLED!=='true'||process.env.AI_OS_AUTONOMY_ENABLED!=='true')return {status:'blocked',message:'The automatic worker is disabled. Its configuration needs repair.'};
 const budget=await recurringBudgetAvailability();if(!budget.available)return {status:'blocked',message:'The existing spending allowance is blocking recovery. No spending limit was changed.'};
 const eligible=await sql`select j.id,j.department,j.message,j.task_id from os_jobs j where j.status='failed' and j.created_at>now()-interval '48 hours'
 and j.request_key not like 'owner-recovery:%' and j.request_key not like 'recovery-review:%'
 and exists(select 1 from os_runs r where r.request_key='job_'||j.id::text and r.status='failed')
 and not exists(select 1 from os_jobs n where n.department=j.department and (n.status in ('queued','running') or n.created_at>j.created_at))
 order by j.created_at desc limit 5`;
 const retries=[];
 for(const j of eligible)retries.push(await queueJob(j.department as Department,j.message,`owner-recovery:${j.id}`,'owner',j.task_id||undefined));
 const hour=new Date().toISOString().slice(0,13).replace(/[^0-9]/g,'');
 const review=await queueJob('operations','Perform a recovery review of current worker and integration records. State what completed, what is blocked, and exact steps for each remaining issue. Do not retry unknown provider outcomes, alter spending limits or claim a code repair you cannot execute. Complete a concise recovery report.','recovery-review:'+hour,'owner');
 await syncOpenLoops();
 await sql`insert into os_activity(actor,event,entity_id,details) values('owner','owner_recovery_queued',${review.id},${sql.json({retryCount:retries.length,operationsJob:review.id})})`;
 console.info(JSON.stringify({event:'owner_recovery_queued',operationsJob:review.id,retryCount:retries.length}));
 return {status:'queued',jobId:review.id,retries:retries.length,message:`Recovery requested. ${retries.length} eligible internal request(s) queued for one retry. Operations will save its findings; the connected maintenance watch checks for code and deployment issues hourly.`};
}
