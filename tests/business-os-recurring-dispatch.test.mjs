import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-dispatch-')),env={...process.env};let database;
try {
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);database=new PGlite();
 const schema=readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1];
 const extra=readFileSync('app/lib/business-os/coordination.ts','utf8').match(/export const coordinationSchema = `([\s\S]*?)`;/)[1];
 await database.exec(schema+extra);await database.exec('update os_control set paused=false where id=1');
 for(let i=0;i<13;i++){const id=randomUUID();await database.query("insert into os_runs(id,request_key,status,department) values($1,$2,'completed','content')",[id,id]);}
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/coordination.ts']);
 const require=createRequire(import.meta.url);
 const mock=(name,exports)=>{const id=join(dir,'lib',name+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 const sql=async(parts,...values)=>(await database.query(parts.reduce((out,part,i)=>out+(i?'$'+i:'')+part,''),values)).rows;
 mock('affiliate-db',{db:()=>sql});
 let availability={available:true},dispatched=0;
 mock('business-os/budget',{recurringBudgetAvailability:async()=>availability});
 mock('business-os/budget-policy',{recurringBudgetPolicy:()=>({dailyMicros:1000000,monthlyMicros:10000000})});
 mock('business-os/jobs',{queueJob:async()=>({})});
 mock('business-os/telegram-command',{workAndNotify:async()=>{dispatched++;return {status:'succeeded'};}});
 Object.assign(process.env,{AI_OS_COORDINATION_ENABLED:'true',AI_OS_ENABLED:'true',AI_OS_AI_ENABLED:'true',AI_OS_AUTONOMY_ENABLED:'true',OPENAI_API_KEY:'test-only'});
 const {coordinationTick}=require(join(dir,'lib/business-os/coordination.js'));
 assert.equal((await coordinationTick('test')).status,'succeeded');assert.equal(dispatched,1,'Thirteen previous runs do not override approved dollar availability');
 for(const reason of ['AI_DAILY_BUDGET_EXHAUSTED','AI_MONTHLY_BUDGET_EXHAUSTED','AI_BUDGET_USAGE_ANOMALY','AI_BUDGET_UNAVAILABLE']) {
  availability={available:false,reason};const result=await coordinationTick('test');assert.equal(result.reason,reason);assert.equal(dispatched,1,'Blocked dollar budgets never dispatch');
 }
 availability={available:true};await database.exec('update os_control set paused=true where id=1');assert.equal((await coordinationTick('test')).status,'paused');assert.equal(dispatched,1);
 console.log('PASS: actual recurring coordinator honors dollar availability after 13 runs; daily/monthly exhaustion, anomaly, unavailable budget and pause still prevent dispatch. Provider execution mocked.');
} finally {for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);if(database)await database.close();rmSync(dir,{recursive:true,force:true});}
