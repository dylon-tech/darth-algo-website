import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const dir = mkdtempSync(join(tmpdir(), 'darth-budget-'));
const savedEnv = { ...process.env };
try {
  execFileSync('node_modules/.bin/tsc', ['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/budget.ts'], { stdio:'pipe' });
  const require = createRequire(import.meta.url);
  const policy = require(join(dir, 'business-os/budget-policy.js'));
  const { pilot } = require(join(dir, 'business-os/pilot-policy.js'));
  const env = { AI_OS_RECURRING_SPEND_APPROVED:'true', AI_OS_DAILY_BUDGET_USD:'0.25', AI_OS_MONTHLY_BUDGET_USD:'0.50', AI_OS_MODEL:pilot.model };
  assert.throws(() => policy.recurringBudgetPolicy({}), /NOT_APPROVED/);
  for (const name of Object.keys(env)) assert.throws(() => policy.recurringBudgetPolicy({ ...env, [name]:undefined }));
  for (const value of ['0','-1','NaN','Infinity','1e3',' 1','1.0000001','1000000']) assert.throws(() => policy.usdToMicros(value));
  assert.equal(policy.usdToMicros('0.000001'),1);
  const config = policy.recurringBudgetPolicy(env);
  const request = { model:pilot.model,store:false,instructions:'Internal task only.',max_output_tokens:2500,reasoning:{effort:'none'},input:[{role:'user',content:'Draft a checklist.'}],text:{format:{type:'json_schema'}} };
  const body = JSON.stringify(request);
  assert.doesNotThrow(() => policy.assertRecurringEnvelope(body,'openai',config));
  assert.throws(() => policy.assertRecurringEnvelope(body,'gateway',config),/UNPRICED_PROVIDER/);
  for (const change of [{model:'unknown'},{tools:[{type:'web_search'}]},{previous_response_id:'id'},{max_output_tokens:2501},{reasoning:{effort:'high'}},{input:[{role:'user',content:[{type:'input_image',image_url:'x'}]}]}]) {
    assert.throws(() => policy.assertRecurringEnvelope(JSON.stringify({...request,...change}),'openai',config));
  }
  assert.throws(() => policy.assertRecurringEnvelope(JSON.stringify({...request,instructions:'🦊'.repeat(30000)}),'openai',config),/REQUEST_LIMIT/);
  assert.equal(policy.usageMicros({inputTokens:1000,outputTokens:1000},0.2,1.2),1400);
  for (const value of [null,undefined,-1,1.5,NaN,Infinity,'100']) assert.throws(() => policy.usageMicros({inputTokens:value,outputTokens:1},0.2,1.2));

  // Offline transaction-contract adapter: verify serialized shared DB access and
  // statement behavior. This is not a live PostgreSQL isolation/integration test.
  const rows = new Map();
  let day='2026-09-08',month='2026-09-01',tail=Promise.resolve(),writes=0;
  const fake = { begin: async fn => {
    let release,locked=false;
    const sql = async (parts,...v) => {
      const q=parts.join('?').replace(/\s+/g,' ').trim();
      if(q.startsWith('select pg_advisory_xact_lock')) {
        assert.equal(v[0],730915);
        const previous=tail;tail=new Promise(resolve=>{release=resolve;});await previous;locked=true;return [];
      }
      assert.ok(locked,'Every budget statement requires the database transaction lock');
      if(q.startsWith('select request_hash')) return rows.has(v[0])?[rows.get(v[0])]:[];
      if(q.startsWith('select at_utc')) return [{day,month}];
      if(q.startsWith('select coalesce')) return [{
        daily:String([...rows.values()].filter(r=>r.budget_day===v[0]||r.status!=='recorded').reduce((n,r)=>n+r.charged_micros,0)),
        monthly:String([...rows.values()].filter(r=>r.budget_month===v[1]||r.status!=='recorded').reduce((n,r)=>n+r.charged_micros,0)),
        anomaly:[...rows.values()].some(r=>r.anomaly)
      }];
      if(q.startsWith('insert into')) {
        const [key,hash,model,d,m,res,charged,daily,monthly,inputRate,outputRate]=v;
        assert.ok(!rows.has(key));writes++;
        rows.set(key,{request_hash:hash,model,budget_day:d,budget_month:m,reserved_micros:res,charged_micros:charged,daily_limit_micros:daily,monthly_limit_micros:monthly,input_usd_per_million:inputRate,output_usd_per_million:outputRate,status:'reserved',anomaly:false});return [];
      }
      if(q.startsWith('select *')) return rows.has(v[0])?[{...rows.get(v[0])}]:[];
      if(q.includes("set status='held',error_code='AI_BUDGET_UNKNOWN_USAGE'")) {rows.get(v[0]).status='held';return [];}
      if(q.includes("set status='held'")) {const r=rows.get(v[1]);if(r&&r.status!=='recorded')r.status='held';return [];}
      if(q.includes('set anomaly=true')) {const r=rows.get(v[1]);r.anomaly=true;r.charged_micros=Math.max(r.charged_micros,r.reserved_micros,v[0]);return [];}
      if(q.includes("set status='recorded'")) {
        const [input,output,actual,charged,anomaly,,key]=v;const r=rows.get(key);
        Object.assign(r,{status:'recorded',input_tokens:input,output_tokens:output,actual_micros:actual,charged_micros:charged,anomaly:r.anomaly||anomaly});return [];
      }
      throw new Error(`Unhandled test query: ${q}`);
    };
    try{return await fn(sql);}finally{release?.();}
  }};
  require.cache[join(dir,'affiliate-db.js')]={id:join(dir,'affiliate-db.js'),filename:join(dir,'affiliate-db.js'),loaded:true,exports:{db:()=>fake}};
  const budget=require(join(dir,'business-os/budget.js'));
  delete process.env.AI_OS_RECURRING_SPEND_APPROVED;
  assert.deepEqual(await budget.recurringBudgetAvailability(),{available:false,reason:'AI_RECURRING_SPEND_NOT_APPROVED'});
  Object.assign(process.env,env);
  assert.equal((await budget.recurringBudgetAvailability()).available,true);
  const concurrent=await Promise.allSettled(Array.from({length:10},(_,i)=>budget.reserveRecurringBudget(`job-${i}`,body)));
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,2);
  assert.equal(writes,2);
  assert.equal([...rows.values()].reduce((n,r)=>n+r.charged_micros,0),250000);
  assert.deepEqual(await budget.recurringBudgetAvailability(),{available:false,reason:'AI_DAILY_BUDGET_EXHAUSTED',dailyMicros:250000,monthlyMicros:250000});
  await assert.rejects(budget.reserveRecurringBudget('job-0',body),/ALREADY_RESERVED/);
  await assert.rejects(budget.reserveRecurringBudget('job-0',JSON.stringify({...request,instructions:'Changed'})),/KEY_CONFLICT/);
  await budget.recordRecurringUsage('job-0',{inputTokens:1000,outputTokens:1000});
  await budget.recordRecurringUsage('job-0',{inputTokens:null,outputTokens:null});
  assert.equal(rows.get('job-0').status,'recorded','Malformed replay preserves known usage');
  assert.equal(rows.get('job-0').charged_micros,1400,'Verified usage releases unused reservation');
  process.env.AI_OS_DAILY_BUDGET_USD='0.2514';
  assert.equal((await budget.recurringBudgetAvailability()).available,true,'Settled capacity funds a subsequent handoff');
  await budget.reserveRecurringBudget('handoff',body);
  assert.equal((await budget.recurringBudgetAvailability()).available,false);
  await budget.recordRecurringUsage('handoff',{inputTokens:0,outputTokens:0});
  assert.equal(rows.get('handoff').charged_micros,0);
  process.env.AI_OS_DAILY_BUDGET_USD='0.25';
  await budget.recordRecurringUsage('job-0',{inputTokens:1000,outputTokens:1000});
  await budget.holdRecurringReservation('job-1','TIMEOUT');
  day='2026-09-09';
  await budget.reserveRecurringBudget('day2',body);
  await assert.rejects(budget.reserveRecurringBudget('day2-extra',body),/DAILY_BUDGET/);
  await budget.recordRecurringUsage('day2',{inputTokens:null,outputTokens:10});
  assert.equal(rows.get('day2').status,'held');
  month='2026-10-01';day='2026-10-01';
  await assert.rejects(budget.reserveRecurringBudget('next-month',body),/DAILY_BUDGET/,'Unresolved reservations survive month boundaries');
  await budget.recordRecurringUsage('job-1',{inputTokens:10,outputTokens:10});
  await budget.recordRecurringUsage('day2',{inputTokens:10,outputTokens:10});
  process.env.AI_OS_MONTHLY_BUDGET_USD='0.125';
  await budget.reserveRecurringBudget('monthly',body);
  await budget.recordRecurringUsage('monthly',{inputTokens:10,outputTokens:10});
  day='2026-10-02';
  await assert.rejects(budget.reserveRecurringBudget('monthly-exhausted',body),/MONTHLY_BUDGET/);
  await budget.recordRecurringUsage('monthly',{inputTokens:11,outputTokens:10});
  await assert.rejects(budget.reserveRecurringBudget('conflict-stop',body),/USAGE_ANOMALY/);
  assert.match(budget.budgetSchema,/request_key text primary key/);
  assert.match(budget.budgetSchema,/charged_micros >= 0/);
  assert.equal(rows.get('monthly').charged_micros,125000,'Conflicting settlement restores the full conservative hold');
  console.log('PASS: fail-closed config, priced text envelope, exact currency parsing, concurrent reservation contract, daily/monthly limits, duplicate request protection, unknown holds and verified cost settlement and conservative unresolved/conflicting holds. No provider or live database calls.');
} finally {
  for(const key of Object.keys(process.env)) if(!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env,savedEnv);
  rmSync(dir,{recursive:true,force:true});
}
