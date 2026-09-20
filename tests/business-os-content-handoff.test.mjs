import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-handoff-'));
const env={...process.env}, originalFetch=globalThis.fetch;
let database;
try {
 if(!process.env.OS_TEST_PGLITE_MODULE) throw Error('OS_TEST_PGLITE_MODULE required');
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
 database=new PGlite(join(dir,'db'));
 await database.exec(readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 await database.exec("update os_control set paused=false where id=1");
 execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/content-handoff.ts']);
 const require=createRequire(import.meta.url);
 let tail=Promise.resolve();
 const makeSql=driver=>{
  const sql=async(parts,...values)=>{
   const text=parts.reduce((out,part,i)=>out+(i?'$'+i:'')+part,'');
   // PGlite is a single PostgreSQL session. Transaction ordering is serialized;
   // distributed advisory-lock semantics remain a live-Postgres test gate.
   if(text.includes('pg_advisory_xact_lock')) return [];
   return (await driver.query(text,values)).rows;
  };
  sql.json=v=>JSON.stringify(v);sql.unsafe=q=>driver.exec(q);
  sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>fn(makeSql(tx)));}finally{release();}};
  return sql;
 };
 const sql=makeSql(database);
 const mock=(path,exports)=>{const id=join(dir,'lib',path+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 mock('affiliate-db',{db:()=>sql});mock('business-os/service',{});
 let ready=true,posts=0,messages=0;
 mock('business-os/buffer',{bufferStatus:async()=>({ready,xChannel:{id:'x1',displayName:'DarthAlgos'}}),createBufferXPost:async()=>{posts++;throw Error('No public writes allowed');}});
 process.env.VERCEL_ENV='production';process.env.AI_OS_ENABLED='true';process.env.AI_OS_AI_ENABLED='false';
 process.env.AI_OS_TELEGRAM_ENABLED='true';process.env.AI_OS_TELEGRAM_TOKEN='12345:testtoken';process.env.AI_OS_TELEGRAM_OWNER_ID='54321';process.env.AI_OS_COMMUNITY_BOT_ID='98765';
 globalThis.fetch=async(url,options)=>{assert.match(url,/api.telegram.org\/bot12345:testtoken\/sendMessage$/);const body=JSON.parse(options.body);assert.equal(body.chat_id,'54321');assert.match(body.text,/Approve|Approving/);assert.ok(body.reply_markup.inline_keyboard[0].some(b=>b.text==='Approve & publish on X'));messages++;return Response.json({ok:true,result:{message_id:messages}});};
 mock('business-os/media-policy',{mediaAutopilot:{enabled:false}});
 const {prepareBufferPublication}=require(join(dir,'lib/business-os/buffer-publishing.js'));
 // The unified campaign suppresses the legacy handoff. Exercise that first, then
 // retain the old manual-mode contract as an isolated compatibility fixture.
 const dailyPolicy=require(join(dir,'lib/business-os/daily-social-policy.js'));
 const {syncContentApprovals}=require(join(dir,'lib/business-os/content-handoff.js'));
 assert.equal((await syncContentApprovals()).status,'shared_daily_campaign');
 dailyPolicy.dailySocialPolicy.enabled=false;
 const {validatePlan}=require(join(dir,'lib/business-os/policy.js'));
 const plan=text=>({brief:'Internal draft',tasks:[],proposals:[],xDraft:{text,evidence:['business_knowledge']}});
 assert.throws(()=>validatePlan(plan('x'.repeat(281)),['business_knowledge']),/Invalid X/);
 const run=async(text,department='content',verified=true)=>{
  const id=randomUUID();await database.query("insert into os_runs(id,request_key,status,department,result,snapshot,finished_at) values($1,$2,'completed',$3,$4,$5,now())",[id,id,department,JSON.stringify(plan(text)),JSON.stringify([{id:'business_knowledge',status:verified?'verified':'unavailable'}])]);return id;
 };
 await database.exec(`insert into os_activity(actor,event,entity_id,details) values('owner','buffer_draft_test_verified','draft','{"channelId":"x1"}')`);
 const id=await run('Join the Darth Algo community.');
 const simultaneous=await Promise.all([prepareBufferPublication('Join the Darth Algo community.',id),prepareBufferPublication('Join the Darth Algo community.',id)]);
 assert.equal(simultaneous[0].id,simultaneous[1].id);
 assert.equal((await database.query('select * from os_approvals')).rows.length,1);
 assert.equal((await database.query("select * from os_activity where event='content_x_handoff_completed'")).rows.length,1);
 // Simulate a restart after the approval committed, before notification.
 await syncContentApprovals();await syncContentApprovals();
 assert.equal(messages,1);assert.equal(posts,0);
 const a=(await database.query('select * from os_approvals')).rows[0];assert.equal(a.run_id,id);
 await database.query("update os_approvals set status='declined' where id=$1",[a.id]);
 await prepareBufferPublication('Join the Darth Algo community.',id);
 assert.equal((await database.query('select * from os_approvals')).rows.length,1,'A declined run is not resurrected');
 const bad=await run('Unsupported claim.','content',false);
 await assert.rejects(prepareBufferPublication('Unsupported claim.',bad),/EVIDENCE_INVALID/);
 const other=await run('Not Content.','research');
 await assert.rejects(prepareBufferPublication('Not Content.',other),/RUN_INVALID/);
 ready=false;const recover=await run('A fresh community invitation.');
 await syncContentApprovals();
 assert.equal((await database.query("select * from os_activity where event='content_x_handoff_completed' and entity_id=$1",[recover])).rows.length,0);
 ready=true;await database.exec("delete from os_activity where event='content_x_handoff_blocked'");
 // Exclude unsupported draft to select the retryable connection case.
 await database.query("update os_runs set finished_at=now()-interval '2 days' where id=$1",[bad]);
 await syncContentApprovals();assert.equal(messages,2);
 process.env.AI_OS_AI_ENABLED='true';process.env.AI_OS_AUTONOMY_ENABLED='true';
 await syncContentApprovals();await syncContentApprovals();
 assert.equal((await database.query("select * from os_jobs where request_key='launch:x-approval-v1'")).rows.length,1,'Launch assignment dedupes across restarts');
 const promotions=(await database.query("select * from os_jobs where request_key='launch:x-links-v1'")).rows;
 assert.equal(promotions.length,1,'Links-page promotion dedupes across restarts');
 assert.match(promotions[0].message,/supplied linksUrl/);
 await database.query("update os_approvals set status='revision_requested',decided_at=now(),decision_note='Make it shorter' where id=$1",[a.id]);
 await syncContentApprovals();await syncContentApprovals();
 assert.equal((await database.query("select * from os_jobs where request_key=$1",['revision:x:'+a.id])).rows.length,1,'Revision request queues one fresh Content job');
 await database.exec('update os_control set paused=true where id=1');
 assert.equal((await syncContentApprovals()).status,'paused');
 assert.equal(posts,0);
 console.log('PASS: PostgreSQL-engine handoff SQL, concurrent approval dedupe, completed-run validation, evidence checks, notification recovery, real private Telegram card generation, decline preservation, blocked connection recovery, launch-job dedupe and pause. Provider calls mocked; distributed locks not verified.');
} finally {
 globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);
 if(database)await database.close();rmSync(dir,{recursive:true,force:true});
}
