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
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/telegram-command.ts']);
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
  sql.json=v=>JSON.stringify(v);
  sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>fn(makeSql(tx)));}finally{release();}};
  return sql;
 };
 const sql=makeSql(database);
 const mock=(path,exports)=>{const id=join(dir,'lib',path+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 mock('affiliate-db',{db:()=>sql});mock('business-os/service',{});

 let work={status:'idle_or_paused'};
 mock('business-os/jobs',{workOneJob:async()=>work});
 mock('business-os/content-handoff',{syncContentApprovals:async()=>({status:'checked'})});
 process.env.AI_OS_OWNER_KEY='test-owner-key-'.repeat(4);
 process.env.AI_OS_TELEGRAM_ENABLED='true';process.env.AI_OS_TELEGRAM_TOKEN='12345:testtoken';process.env.AI_OS_TELEGRAM_OWNER_ID='54321';process.env.AI_OS_COMMUNITY_BOT_ID='98765';
 const sent=[];
 globalThis.fetch=async(url,options)=>{assert.match(url,/api.telegram.org\/bot12345:testtoken\/sendMessage$/);const body=JSON.parse(options.body);assert.equal(body.chat_id,'54321');sent.push(body);return Response.json({ok:true,result:{message_id:sent.length}});};
 const {recordOwnerUpdate,processOwnerUpdates,workAndNotify}=require(join(dir,'lib/business-os/telegram-command.js'));
 const {consumeDeviceLink}=require(join(dir,'lib/business-os/device-links.js'));
 await recordOwnerUpdate({update_id:1,message:{text:'/connect'}});
 await processOwnerUpdates();await processOwnerUpdates();
 assert.equal(sent.length,1,'Inbox replay does not issue duplicate login links');
 assert.equal(sent[0].protect_content,true);
 const link=new URL(sent[0].reply_markup.inline_keyboard[0][0].url);
 assert.equal(link.origin,'https://www.darthalgo.com');assert.equal(link.pathname,'/owner/connect');assert.equal(link.search,'');
 const token=link.hash.slice(1);assert.match(token,/^[a-f0-9]{64}$/);
 const rows=(await database.query('select * from os_device_links')).rows;
 assert.equal(rows.length,1);assert.notEqual(rows[0].token_hash,token);
 assert.equal((await database.query('select * from os_outbox')).rows.length,0,'Bearer link is not persisted in notification outbox');
 assert.ok(!JSON.stringify((await database.query('select * from os_activity')).rows).includes(token));
 await consumeDeviceLink(token);await assert.rejects(consumeDeviceLink(token),/DEVICE_LINK_UNAVAILABLE/);
 const runId=randomUUID();
 await database.query("insert into os_runs(id,request_key,status,department,result,finished_at) values($1,$2,'completed','operations',$3,now())",[runId,runId,JSON.stringify({brief:'A private internal report.',tasks:[],proposals:[]})]);
 const job=async(source,success=true)=>{
  const id=randomUUID();await database.query("insert into os_jobs(id,request_key,department,message,source,status) values($1,$2,'operations','test',$3,$4)",[id,id,source,success?'succeeded':'failed']);
  work={status:success?'succeeded':'failed',jobId:id,department:'operations',...(success?{runId}:{})};await workAndNotify();
 };
 await job('schedule');assert.equal(sent.length,1,'Routine background report stays in dashboard');
 await job('telegram');assert.equal(sent.length,2);assert.match(sent[1].text,/reply ready/);
 await job('schedule',false);await job('schedule',false);assert.equal(sent.length,3,'Scheduled failure alert dedupes by department/day');
 console.log('PASS: authenticated-inbox reconnect routing, one-use hashed links, no bearer token in outbox/activity, replay dedupe, direct replies, quiet scheduled reports, bounded failure alerts. Telegram provider mocked.');
} finally {
 globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);
 if(database)await database.close();rmSync(dir,{recursive:true,force:true});
}
