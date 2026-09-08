import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Run against actual PostgreSQL SQL/constraints in an ephemeral WASM database.
// PGlite has one connection; advisory locks are explicitly no-ops here, so this
// verifies persistence and integration, not multi-connection lock isolation.
const pglitePath = process.env.AI_OS_TEST_PGLITE_MODULE || resolve('../os-test-deps/node_modules/@electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(pglitePath).href);
const dir = mkdtempSync(join(tmpdir(), 'darth-os-integration-'));
const savedEnv = { ...process.env }, originalFetch = globalThis.fetch;
let pg;
try {
  execFileSync('node_modules/.bin/tsc', ['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/jobs.ts','app/lib/business-os/schema.ts'], {stdio:'pipe'});
  const require = createRequire(import.meta.url);
  pg = new PGlite();
  let tail = Promise.resolve();
  const serialize = fn => { const result=tail.then(fn);tail=result.catch(()=>{});return result; };
  const fragment = Symbol('sql-fragment');
  const makeTag = (connection, inTransaction=false) => {
    const tag = (parts,...values) => {
      if (!parts.raw) return { [fragment]:true, values:parts };
      const params=[];
      let text=parts[0];
      values.forEach((value,index)=>{
        if(value?.[fragment]) text+='('+value.values.map(item=>{params.push(item);return '$'+params.length;}).join(',')+')';
        else {params.push(value);text+='$'+params.length;}
        text+=parts[index+1];
      });
      if(/^\s*select pg_advisory_xact_lock\(/.test(text)) return Promise.resolve([]);
      const run=async()=>{try{return (await connection.query(text,params)).rows;}catch(error){error.message=`${error.message}\nSQL: ${text}`;throw error;}};
      return inTransaction?run():serialize(run);
    };
    tag.json=value=>JSON.stringify(value);
    tag.unsafe=text=>inTransaction?connection.exec(text):serialize(()=>connection.exec(text));
    tag.begin=fn=>serialize(()=>pg.transaction(tx=>fn(makeTag(tx,true))));
    return tag;
  };
  const sql=makeTag(pg);
  const modulePath=path=>join(dir,path);
  const stub=(path,exports)=>{const filename=modulePath(path);require.cache[filename]={id:filename,filename,loaded:true,exports};};
  stub('affiliate-db.js',{db:()=>sql});
  let evidenceReads=0;
  stub('business-os/sources.js',{collectEvidence:async()=>{
    evidenceReads++;
    return [{id:'business_test',status:'verified',checkedAt:new Date().toISOString(),scope:'Synthetic offline integration fixture.',data:{product:'Darth Algo',purpose:'Chart-reading software'}}];
  }});
  const {initializeOS}=require(modulePath('business-os/schema.js'));
  const {queueJob,workOneJob,cancelJob}=require(modulePath('business-os/jobs.js'));
  const {coordinationTick}=require(modulePath('business-os/coordination.js'));
  const {seedAssignments}=require(modulePath('business-os/coordination-policy.js'));
  const {runAgent}=require(modulePath('business-os/service.js'));
  const {recurringBudgetAvailability}=require(modulePath('business-os/budget.js'));
  const {pilot}=require(modulePath('business-os/pilot-policy.js'));
  await initializeOS();
  // Exercise upgrade from the prior deployed constraint with historical rows.
  await pg.exec(`alter table os_ai_budget_reservations drop constraint os_ai_budget_charged_nonnegative;
    alter table os_ai_budget_reservations add constraint prior_generated_charge_check check(charged_micros >= reserved_micros);
    insert into os_ai_budget_reservations(request_key,request_hash,model,budget_day,budget_month,reserved_micros,charged_micros,daily_limit_micros,monthly_limit_micros,input_usd_per_million,output_usd_per_million,status,actual_micros,anomaly)
    values ('migration-known','hash','fixture',current_date,current_date,125000,125000,1000000,10000000,0.2,1.2,'recorded',320,false),
      ('migration-held','hash','fixture',current_date,current_date,125000,125000,1000000,10000000,0.2,1.2,'held',null,false),
      ('migration-anomaly','hash','fixture',current_date,current_date,125000,125000,1000000,10000000,0.2,1.2,'recorded',320,true);`);
  await initializeOS();
  await initializeOS(); // Migration is idempotent.
  const upgraded=await pg.query('select request_key,charged_micros::int from os_ai_budget_reservations order by request_key');
  assert.deepEqual(upgraded.rows,[{request_key:'migration-anomaly',charged_micros:125000},{request_key:'migration-held',charged_micros:125000},{request_key:'migration-known',charged_micros:320}]);
  await assert.rejects(pg.query("update os_ai_budget_reservations set charged_micros=-1 where request_key='migration-known'"),/check constraint/);
  await pg.exec('delete from os_ai_budget_reservations');
  const providerInputs=[];
  const contentBrief='Finished content draft: Start with one clear setup. Review the chart context before a signal. Educational use only.';
  const reviewBrief='Completed operations review: The supplied post is an internal draft; check original chart evidence and request owner approval before publishing.';
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization,'Bearer offline-test-key-never-used');
    const request=JSON.parse(options.body),input=JSON.parse(request.input[0].content);
    providerInputs.push({request,input});
    assert.equal(request.model,pilot.model);
    assert.equal(request.store,false);
    const brief=providerInputs.length===1?contentBrief:reviewBrief;
    return new Response(JSON.stringify({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify({brief,tasks:[],proposals:[]})}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  Object.assign(process.env,{AI_OS_ENABLED:'true',AI_OS_AI_ENABLED:'true',AI_OS_AUTONOMY_ENABLED:'true',AI_OS_COORDINATION_ENABLED:'true',AI_OS_MODEL:pilot.model,OPENAI_API_KEY:'offline-test-key-never-used',AI_OS_DAILY_BUDGET_USD:'0.25',AI_OS_MONTHLY_BUDGET_USD:'1.00'});
  delete process.env.AI_OS_RECURRING_SPEND_APPROVED;
  assert.equal((await coordinationTick('offline-test-worker')).status,'budget_blocked');
  assert.equal(providerInputs.length,0,'Missing recurring approval prevents any provider call');
  process.env.AI_OS_RECURRING_SPEND_APPROVED='true';
  // Daily roster behavior is tested separately. Mark its eight assignments as
  // fixture successes so this scenario isolates the content→operations handoff.
  const fixtureDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const assignment of seedAssignments(fixtureDay)) {
    await sql`insert into os_jobs(id,request_key,department,message,source,status,finished_at)
      values(${randomUUID()},${assignment.key},${assignment.department},${assignment.message},'schedule','succeeded',now())`;
  }

  const original=await queueJob('content','Produce a finished educational post for review.','integration-content-001','owner');
  assert.equal(original.status,'queued');
  const activeRunId=randomUUID();
  await sql`insert into os_runs(id,request_key,status,department) values(${activeRunId},'fixture-active-direct','running','ceo')`;
  assert.equal((await workOneJob()).status,'idle_or_paused');
  assert.equal(providerInputs.length,0,'Active direct run prevents queue claim and model call');
  const [unclaimed]=await sql`select status from os_jobs where id=${original.id}`;
  assert.equal(unclaimed.status,'queued');
  await sql`delete from os_runs where id=${activeRunId}`;
  const first=await workOneJob();
  assert.equal(first.status,'succeeded');
  assert.equal(first.department,'content');
  assert.equal(providerInputs.length,1);
  const [sent]=await sql`select * from os_handoffs where parent_run_id=${first.runId}`;
  assert.equal(sent.from_department,'content');
  assert.equal(sent.to_department,'operations');
  assert.equal(sent.body,contentBrief);
  assert.equal(sent.status,'queued');

  const second=await coordinationTick('offline-test-worker');
  assert.equal(second.status,'succeeded');
  assert.equal(second.department,'operations');
  assert.equal(providerInputs.length,2);
  assert.match(providerInputs[1].request.instructions,/operations specialist/);
  const team=providerInputs[1].input.evidence.find(item=>item.id==='team_deliverables');
  assert.equal(team.data.handoffs.length,1);
  assert.equal(team.data.handoffs[0].body,contentBrief,'Receiver gets sender actual persisted deliverable');
  assert.equal(team.data.handoffs[0].parent_run_id,first.runId);
  assert.match(team.scope,/untrusted drafts/);
  const [received]=await sql`select h.status,t.status as task_status,t.result from os_handoffs h join os_tasks t on t.id=h.task_id where h.id=${sent.id}`;
  assert.equal(received.status,'completed');
  assert.equal(received.task_status,'completed');
  assert.equal(received.result,reviewBrief);

  const replay=await queueJob('content','Produce a finished educational post for review.','integration-content-001','owner');
  assert.equal(replay.id,original.id);
  assert.equal(replay.status,'succeeded');
  const replayRun=await runAgent('content',`job_${original.id}`,'Produce a finished educational post for review.');
  assert.equal(replayRun.duplicate,true);
  assert.equal(replayRun.id,first.runId);
  assert.equal(providerInputs.length,2,'Queue and completed-run replays cannot call the model again');

  assert.equal((await recurringBudgetAvailability()).available,true,'Verified settlement leaves capacity for more handoffs');
  process.env.AI_OS_DAILY_BUDGET_USD='0.125639';
  const availability=await recurringBudgetAvailability();
  assert.equal(availability.available,false);
  assert.equal(availability.reason,'AI_DAILY_BUDGET_EXHAUSTED');
  for(let i=0;i<3;i++) assert.equal((await coordinationTick('offline-test-worker')).status,'budget_blocked');
  assert.equal(providerInputs.length,2,'Exhausted budget cannot make additional calls');
  const [counts]=await sql`select (select count(*)::int from os_runs) as runs,(select count(*)::int from os_jobs) as jobs,(select count(*)::int from os_ai_budget_reservations) as reservations,(select sum(charged_micros)::int from os_ai_budget_reservations) as charged`;
  assert.deepEqual(counts,{runs:2,jobs:10,reservations:2,charged:640});
  const [pending]=await sql`select count(*)::int as n from os_tasks where status='queued'`;
  assert.equal(pending.n,1,'Next CEO handoff stays queued while budget is exhausted');
  assert.equal(evidenceReads,2);

  const [nextTask]=await sql`select id from os_tasks where status='queued'`;
  const cancelCandidate=await queueJob('ceo','Review completed operations draft.','integration-cancel-001','schedule',nextTask.id);
  await cancelJob(cancelCandidate.id);
  const [cancelled]=await sql`select j.status as job_status,t.status as task_status,h.status as handoff_status
    from os_jobs j join os_tasks t on t.id=j.task_id join os_handoffs h on h.task_id=t.id where j.id=${cancelCandidate.id}`;
  assert.deepEqual(cancelled,{job_status:'cancelled',task_status:'blocked',handoff_status:'blocked'});

  // Fixture a later explicit recovery attempt; stale jobs must become unknown
  // and block their tasks/handoffs without an automatic provider retry.
  await sql`update os_tasks set status='queued' where id=${nextTask.id}`;
  const staleCandidate=await queueJob('ceo','Review completed operations draft.','integration-stale-001','schedule',nextTask.id);
  await sql`update os_jobs set status='running',started_at=now() where id=${staleCandidate.id}`;
  await sql`update os_tasks set status='in_progress' where id=${nextTask.id}`;
  await sql`update os_handoffs set status='delivered' where task_id=${nextTask.id}`;
  await assert.rejects(runAgent('ceo','direct-while-worker-running','Do not overlap worker'),/OS_WORKER_BUSY/);
  await sql`update os_jobs set started_at=now()-interval '6 minutes' where id=${staleCandidate.id}`;
  assert.equal((await workOneJob()).status,'budget_blocked');
  const [expired]=await sql`select j.status as job_status,t.status as task_status,h.status as handoff_status
    from os_jobs j join os_tasks t on t.id=j.task_id join os_handoffs h on h.task_id=t.id where j.id=${staleCandidate.id}`;
  assert.deepEqual(expired,{job_status:'unknown',task_status:'blocked',handoff_status:'blocked'});
  assert.equal(providerInputs.length,2,'Cancellation, stale lease handling and busy guards do not call provider');
  // A Telegram request stays queued without a provider call when funds are held.
  const waiting=await queueJob('growth','Grow my business','integration-budget-wait','telegram');
  assert.equal((await workOneJob()).status,'budget_blocked');
  assert.equal((await sql`select status from os_jobs where id=${waiting.id}`)[0].status,'queued');
  assert.equal(providerInputs.length,2);
  // More than 12 historical attempts must not override approved dollar limits.
  for(let i=0;i<12;i++) await sql`insert into os_runs(id,request_key,status,department)
    values(${randomUUID()},${'historic-'+i},'failed','ceo')`;
  process.env.AI_OS_DAILY_BUDGET_USD='0.25';
  assert.equal((await workOneJob()).status,'succeeded');
  assert.equal(providerInputs.length,3);
  delete process.env.AI_OS_RECURRING_SPEND_APPROVED;
  await queueJob('growth','Another request','integration-no-consent','telegram');
  assert.equal((await workOneJob()).status,'budget_blocked');
  assert.equal(providerInputs.length,3,'Recurring consent still required after legacy cap removal');
  console.log('PASS: real PGlite schema + queue + service + model + persisted content→operations handoff; recipient sees sender deliverable; idempotent replays; budget preserves queue; active-run/worker guards, cancellation and stale lease handoff status. Provider mocked; advisory locks no-op, multi-connection isolation not tested.');
} finally {
  globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env)) if(!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env,savedEnv);
  await pg?.close();
  rmSync(dir,{recursive:true,force:true});
}
