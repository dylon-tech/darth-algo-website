import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-shared-social-')),env={...process.env},originalFetch=globalThis.fetch;
let database;
try {
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
 database=new PGlite(join(dir,'db'));
 await database.exec(readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 await database.exec('update os_control set paused=false where id=1');
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--jsx','react-jsx','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/media-autopilot.ts','app/lib/business-os/telegram-media.ts','app/lib/business-os/social-health.ts'],{stdio:'pipe'});
 const require=createRequire(import.meta.url);let tail=Promise.resolve();
 const makeSql=driver=>{
  const sql=async(parts,...values)=>{const q=parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,'');if(q.includes('pg_advisory_xact_lock'))return [];return (await driver.query(q,values)).rows;};
  sql.json=v=>JSON.stringify(v);sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>fn(makeSql(tx)));}finally{release();}};return sql;
 };
 const sql=makeSql(database),mock=(name,exports)=>{const id=join(dir,'lib',name+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 mock('affiliate-db',{db:()=>sql});
 mock('business-os/social-art',{renderSocialCarousel:async plan=>plan.slides.map((s,i)=>({png:Buffer.from('image-'+i),altText:s.alt}))});
 const {prepareDailyCampaign,prepareSocialDelivery,executeSocialDelivery,checkSocialDelivery,syncDailySocial}=require(join(dir,'lib/business-os/daily-social.js'));
 const {canSendCommunityPhoto,communityReadiness}=require(join(dir,'lib/business-os/community-readiness.js'));
 const {socialHealthIssues}=require(join(dir,'lib/business-os/social-health.js'));
 assert.equal(canSendCommunityPhoto({type:'supergroup'},{status:'administrator'}),true);
 assert.equal(canSendCommunityPhoto({type:'channel'},{status:'administrator',can_post_messages:false}),false);
 assert.equal(canSendCommunityPhoto({type:'supergroup'},{status:'left'}),false);
 assert.equal(canSendCommunityPhoto({type:'supergroup'},{status:'restricted',is_member:true,can_send_messages:true,can_send_photos:false}),false);
 const {publishCommunityPreview}=require(join(dir,'lib/business-os/community-social.js'));
 const {ensureCommunityEducationSchema,publishEducationPost}=require(join(dir,'lib/community-education.js'));
 const {selectSocialChannel}=require(join(dir,'lib/business-os/buffer-social.js'));
 const {mediaDashboard}=require(join(dir,'lib/business-os/telegram-media.js'));
 const {mediaAutopilot}=require(join(dir,'lib/business-os/media-policy.js'));
 const {isDailySocialPayload,socialPostUrl}=require(join(dir,'lib/business-os/daily-social-policy.js'));
 const {syncMediaAutopilot}=require(join(dir,'lib/business-os/media-autopilot.js'));
 process.env.AI_OS_AI_ENABLED='false';process.env.VERCEL_ENV='production';process.env.AI_OS_AUTONOMY_ENABLED='true';process.env.BUFFER_API_KEY='offline';process.env.TELEGRAM_BOT_TOKEN='offline';
 const channels=[...Object.entries(mediaAutopilot.channels).map(([service,id])=>({id,service:service==='x'?'twitter':service,name:'darth.algo',isDisconnected:false,isLocked:false,isQueuePaused:false})),{id:'threads123',service:'threads',name:'darth.algo',isDisconnected:false,isLocked:false,isQueuePaused:false}];
 assert.equal(selectSocialChannel(channels,'threads').id,'threads123');
 assert.equal(selectSocialChannel([{...channels[2],name:'someone.else'}],'threads'),null);
 assert.equal(selectSocialChannel([{...channels[2],isDisconnected:true}],'threads'),null);
 assert.equal(selectSocialChannel([channels[2],{...channels[2],id:'other'}],'threads'),null);
 assert.equal(socialPostUrl('https://evil.test/p/1','instagram'),null);
 assert.equal(socialPostUrl('https://www.threads.com/@darth.algo','threads'),null);
 let writes=0,telegramWrites=0,drop=false,corrupt=false,dropTelegram=false;const posts=new Map(),inputs=[],community=[];
 globalThis.fetch=async(url,options)=>{
  if(url.startsWith('https://www.darthalgo.com/api/social-media/')){
   const [,assetId,hash]=new URL(url).pathname.match(/social-media\/([^/]+)\/([^/]+)$/);
   const row=(await database.query("select details from os_activity where event='social_media_asset' and entity_id=$1",[assetId])).rows[0];
   const slide=row.details.slides.find(s=>s.sha256===hash);
   return new Response(corrupt?Buffer.from('wrong'):Buffer.from(slide.png,'base64'),{headers:{'content-type':'image/png'}});
  }
  if(url==='https://api.telegram.org/botoffline/getChat')return Response.json({ok:true,result:{type:'supergroup'}});
  if(url==='https://api.telegram.org/botoffline/getMe')return Response.json({ok:true,result:{id:123}});
  if(url==='https://api.telegram.org/botoffline/getChatMember')return Response.json({ok:true,result:{status:'administrator'}});
  if(url==='https://api.telegram.org/botoffline/sendPhoto'){
   telegramWrites++;community.push(JSON.parse(options.body));if(dropTelegram)throw Error('Response lost');return Response.json({ok:true,result:{message_id:telegramWrites}});
  }
  assert.equal(url,'https://api.buffer.com');const {query,variables}=JSON.parse(options.body);
  if(query.includes('BufferOrganizations'))return Response.json({data:{account:{organizations:[{id:'org'}]}}});
  if(query.includes('BufferChannels'))return Response.json({data:{channels}});
  if(query.includes('CreatePost')){
   const i=variables.input,id='post'+(++writes);inputs.push(i);
   assert.equal(i.saveToDraft,false);assert.equal(i.needsApproval,false);assert.equal(i.assets.length,3);
   if(i.channelId===mediaAutopilot.channels.instagram)assert.equal(i.metadata.instagram.type,'post');
   const post={id,channelId:i.channelId,text:i.text,status:'sending',sentAt:null,externalLink:null,assets:i.assets.map(a=>({source:a.image.url,type:'image',image:{altText:a.image.metadata.altText}}))};posts.set(id,post);
   if(drop)throw Error('Response lost after write');return Response.json({data:{createPost:{post}}});
  }
  return Response.json({data:{post:posts.get(variables.input.id)}});
 };
 const {validCreativeHook,dailyCreativeCaption,syncDailyCreative}=require(join(dir,'lib/business-os/daily-creative.js'));
 assert.ok(validCreativeHook('Read the context before acting on a signal.'));
 assert.ok(!validCreativeHook('Guaranteed profits every day.'));
 assert.ok(!validCreativeHook('Visit https://evil.test for setups.'));
 const creativeDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),runId=randomUUID(),jobId=randomUUID(),hook='Read the context before acting on a signal.';
 await database.query("insert into os_runs(id,request_key,status,department,result,snapshot) values($1::uuid,$1::text,'completed','content',$2,$3)",[runId,JSON.stringify({xDraft:{text:hook,evidence:['business_knowledge']}}),JSON.stringify([{id:'business_knowledge',status:'verified'}])]);
 await database.query("insert into os_jobs(id,request_key,department,message,source,status,run_id) values($1,$2,'content','Daily shared caption','schedule','succeeded',$3)",[jobId,`daily-shared-creative:${creativeDay}`,runId]);
 assert.ok((await dailyCreativeCaption()).startsWith(hook));
 await database.query("update os_runs set snapshot='[]'::jsonb where id=$1",[runId]);assert.ok(!(await dailyCreativeCaption()).startsWith(hook));
 await database.query("update os_runs set snapshot=$1 where id=$2",[JSON.stringify([{id:'business_knowledge',status:'verified'}]),runId]);
 process.env.AI_OS_AI_ENABLED='true';assert.equal((await syncDailyCreative()).waiting,false);
 await database.query("update os_jobs set status='queued' where id=$1",[jobId]);assert.equal((await syncDailyCreative()).waiting,true);
 await database.query("update os_jobs set created_at=now()-interval '31 minutes' where id=$1",[jobId]);assert.equal((await syncDailyCreative()).waiting,false);
 await database.query("update os_jobs set status='succeeded' where id=$1",[jobId]);
 const [campaign,parallel]=await Promise.all([prepareDailyCampaign(),prepareDailyCampaign()]);assert.deepEqual(campaign,parallel);assert.ok(campaign.text.startsWith(hook));
 const early=new Date();early.setUTCHours(12,0,0,0);
 const prepared=await syncDailySocial(early);assert.equal(prepared.status,'prepared_for_daily_window');assert.equal(prepared.assetsReady,true);assert.deepEqual(Object.values(prepared.deliveries),['ready_for_daily_window','ready_for_daily_window','ready_for_daily_window']);assert.equal(writes,0,'Preparing the visible queue before 9 ET does not publish');
 assert.equal((await database.query("select count(*)::int as n from os_approvals where payload->>'executor'='buffer_social_v2'")).rows[0].n,3);
 assert.ok((await socialHealthIssues()).some(s=>s.includes('Community preview')));
 const ids={};
 for(const [network,channelId] of Object.entries({...mediaAutopilot.channels,threads:'threads123'})){
  const [a,b]=await Promise.all([prepareSocialDelivery(campaign,network,channelId),prepareSocialDelivery(campaign,network,channelId)]);assert.equal(a,b);ids[network]=a;
 }
 const row=(await database.query('select * from os_approvals where id=$1',[ids.x])).rows[0];
 assert.equal(isDailySocialPayload(row.payload),true);assert.equal(isDailySocialPayload({...row.payload,text:'changed'}),false);
 await database.exec('update os_control set paused=true where id=1');
 assert.equal((await syncMediaAutopilot()).status,'paused');await assert.rejects(executeSocialDelivery(ids.x),/OS_PAUSED/);assert.equal(writes,0);
 await database.exec('update os_control set paused=false where id=1');
 corrupt=true;await assert.rejects(executeSocialDelivery(ids.x),/ASSET_CHANGED/);assert.equal(writes,0);corrupt=false;
 for(const id of Object.values(ids))await Promise.all([executeSocialDelivery(id),executeSocialDelivery(id)]);
 assert.equal(writes,3,'One provider mutation per network, including concurrent attempts');
 for(const i of inputs){assert.equal(i.text,campaign.text);assert.deepEqual(i.assets,inputs[0].assets);}
 assert.equal((await publishCommunityPreview()).reason,'waiting_for_confirmed_social_post');assert.equal(telegramWrites,0);
 await ensureCommunityEducationSchema();
 await database.exec("insert into community_settings(key,value) values('education_chat_id','-100123'),('education_thread_id','7')");
 for(const p of posts.values()){
  p.status='sent';p.sentAt=new Date().toISOString();p.externalLink=p.channelId==='threads123'?'https://www.threads.com/@darth.algo/post/abc':p.channelId===mediaAutopilot.channels.x?'https://x.com/DarthAlgos/status/123':'https://www.instagram.com/p/abc/';
 }
 for(const id of Object.values(ids))assert.equal((await checkSocialDelivery(id)).published,true);
 for(const id of Object.values(ids))await executeSocialDelivery(id);assert.equal(writes,3);
 assert.match(await mediaDashboard('today'),/Threads/);
 await Promise.all([publishCommunityPreview(),publishCommunityPreview()]);await publishEducationPost({force:true});
 assert.equal((await communityReadiness()).ready,true);
 assert.equal(telegramWrites,1,'Legacy education trigger and simultaneous cron cannot duplicate preview');
 assert.equal(community[0].photo,campaign.assets[0].url);assert.equal(community[0].message_thread_id,7);
 assert.equal(community[0].reply_markup.inline_keyboard.length,3);assert.match(community[0].caption,/TODAY’S POST/);
 for(const [i,network] of ['instagram','x','threads'].entries())assert.ok(socialPostUrl(community[0].reply_markup.inline_keyboard[i][0].url,network));
 // Repeated status snapshots do not add noise when JSONB reorders network keys.
 const noon=new Date();noon.setUTCHours(18,0,0,0);await syncDailySocial(noon);await syncDailySocial(noon);
 assert.equal((await database.query("select count(*)::int as n from os_activity where event='daily_social_status'")).rows[0].n,2);
 assert.deepEqual(await socialHealthIssues(),[]);
 // A provider accepted the request but its response disappeared. Never resubmit.
 await database.query("delete from os_activity where entity_id=$1 and (event like 'buffer_publish_%' or event='media_auto_authorized')",[ids.threads]);drop=true;
 assert.equal((await executeSocialDelivery(ids.threads)).state,'unknown');await executeSocialDelivery(ids.threads);assert.equal(writes,4);drop=false;
 // An uncertain community response also remains a single attempt.
 await database.exec("delete from os_activity where event like 'community_social_%'");dropTelegram=true;
 assert.equal((await publishCommunityPreview()).reason,'delivery_uncertain_check_telegram');await publishCommunityPreview();assert.equal(telegramWrites,2);assert.ok((await socialHealthIssues()).some(s=>s.includes('uncertain')));
 console.log('PASS: shared immutable campaign, three exact accounts, identical images/caption, concurrent dedupe, asset verification, pause, confirmed links, one community preview, legacy education replacement, provider/Telegram lost-response replay protection. Providers mocked; distributed locks need production observation.');
}finally{globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);if(database)await database.close();rmSync(dir,{recursive:true,force:true});}
