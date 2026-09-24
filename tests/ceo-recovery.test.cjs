const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto');
const cache=new Map();let sql,budget=true;
const mocks={
 'app/lib/business-os/budget-policy.ts':{recurringBudgetPolicy:()=>({})},
 'app/lib/business-os/sources.ts':{collectEvidence:async()=>[]},
 'app/lib/business-os/model.ts':{generatePlan:async()=>({model:'fixture',usage:{},plan:{brief:'A complete internal artifact.',tasks:[{department:'content',title:'Unapproved follow-up'}],proposals:[{kind:'publishing',summary:'Unapproved send'}],xDraft:{text:'Do not hand this off',evidence:['a']}}})},
 'app/lib/affiliate-db.ts':{db:()=>sql},
 'app/lib/business-os/budget.ts':{recurringBudgetAvailability:async()=>({available:budget})},
 'app/lib/business-os/open-loops.ts':{syncOpenLoops:async()=>{}},
};
function load(file){file=path.normalize(file);if(mocks[file])return mocks[file];if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInThisContext('(function(exports,require,process,Response,console){'+code+'\n})',{filename:file})(exports,n=>n.startsWith('.')?load(path.join(path.dirname(file),n)+'.ts'):require(n),process,Response,console);return exports;}
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE);const database=new PGlite();
 try{
 await database.exec(fs.readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 let tail=Promise.resolve();function make(driver){const f=async(parts,...v)=>{const q=parts.reduce((a,p,i)=>a+(i?'$'+i:'')+p,'');if(q.includes('pg_advisory_xact_lock'))return [];return (await driver.query(q,v)).rows;};f.json=JSON.stringify;f.begin=async cb=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>cb(make(tx)));}finally{release();}};return f;}sql=make(database);
 process.env.AI_OS_AI_ENABLED='true';process.env.AI_OS_AUTONOMY_ENABLED='true';
 await database.exec('update os_control set paused=false');
 const suggestions=load('app/lib/business-os/agent-suggestions.ts'),policy=load('app/lib/business-os/policy.ts'),service=load('app/lib/business-os/service.ts'),recovery=load('app/lib/business-os/owner-recovery.ts');
 assert.equal(suggestions.validSuggestions([{kind:'promotion_draft',title:'A specific hook',evidence:['a']}],['a']),true);
 assert.equal(suggestions.validSuggestions([{kind:'buy_credits',title:'Bad',evidence:['a']}],['a']),false);
 assert.equal(suggestions.validSuggestions([{kind:'education_brief',title:'No evidence',evidence:['bad']}],['a']),false);
 async function proposal(){const payload=suggestions.suggestionPayload({kind:'education_brief',title:'Alert frequency lesson',evidence:['a']},'Verified source brief'),id=randomUUID(),hash=policy.fingerprint(payload);await sql`insert into os_approvals(id,payload,payload_hash,expires_at) values(${id},${sql.json(payload)},${hash},now()+interval '1 day')`;return{id,hash};}
 const p=await proposal();await assert.rejects(service.decide(p.id,'f'.repeat(64),'approved','test'),/VERSION_CHANGED/);
 assert.equal((await sql`select count(*)::int n from os_jobs`)[0].n,0);
 await database.exec('update os_control set paused=true');await assert.rejects(service.decide(p.id,p.hash,'approved','test'),/WORK_NOT_AVAILABLE/);
 assert.equal((await sql`select status from os_approvals where id=${p.id}`)[0].status,'pending','Failed queue rolls approval back');
 await database.exec('update os_control set paused=false');
 const decided=await Promise.allSettled([service.decide(p.id,p.hash,'approved','test'),service.decide(p.id,p.hash,'approved','test')]);assert.equal(decided.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await sql`select count(*)::int n from os_jobs where request_key=${'suggestion:'+p.id}`)[0].n,1);
 const declined=await proposal();await service.decide(declined.id,declined.hash,'declined','test');assert.equal((await sql`select count(*)::int n from os_jobs`)[0].n,1);
 await database.exec("update os_jobs set status='succeeded';");
 async function failed(department,status='failed',confirmed=true){const id=randomUUID();await sql`insert into os_jobs(id,request_key,department,message,source,status) values(${id},${'fixture:'+id},${department},'Finish internal report','owner',${status})`;if(confirmed)await sql`insert into os_runs(id,request_key,department,status,error_code) values(${randomUUID()},${'job_'+id},${department},'failed','AI_INPUT_LIMIT')`;return id;}
 const f=await failed('analytics'),u=await failed('support','unknown'),unconfirmed=await failed('affiliates','failed',false);
 budget=false;assert.equal((await recovery.requestAgentRecovery()).status,'blocked');assert.equal((await sql`select count(*)::int n from os_jobs where request_key like 'owner-recovery:%'`)[0].n,0);budget=true;
 await Promise.all([recovery.requestAgentRecovery(),recovery.requestAgentRecovery()]);
 assert.equal((await sql`select count(*)::int n from os_jobs where request_key=${'owner-recovery:'+f}`)[0].n,1,'One retry per confirmed failed job');
 assert.equal((await sql`select count(*)::int n from os_jobs where request_key in (${'owner-recovery:'+u},${'owner-recovery:'+unconfirmed})`)[0].n,0,'Unknown and unconfirmed outcomes never retry');
 assert.equal((await sql`select status from os_jobs where id=${u}`)[0].status,'unknown');
 assert.equal((await sql`select count(*)::int n from os_jobs where request_key like 'recovery-review:%'`)[0].n,1,'One operations review per hour');
 await database.exec("update os_jobs set status='failed' where request_key like 'owner-recovery:%'");await recovery.requestAgentRecovery();assert.equal((await sql`select count(*)::int n from os_jobs where request_key like 'owner-recovery:%'`)[0].n,1,'Failed retries do not recurse');
 const artifact=await service.runAgent('content','fixture-approved-artifact','[APPROVED_SUGGESTION] Finish this brief');
 const saved=(await sql`select result from os_runs where id=${artifact.id}`)[0].result;assert.equal(saved.brief,'A complete internal artifact.');assert.equal(saved.xDraft,null,'Approved internal work cannot enter publishing handoff');assert.equal(saved.tasks.length,0);assert.equal(saved.proposals.length,0);
 console.log('PASS: PostgreSQL-backed exact approval, duplicate/concurrent decisions, rollback, declined work, evidence recipes, budget pause, one retry and unknown-outcome holds. External providers not called.');
 }finally{await database.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
