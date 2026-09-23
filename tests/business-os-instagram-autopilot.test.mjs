import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-shared-social-')),env={...process.env},originalFetch=globalThis.fetch;
let database,whopWrites=0;
const RealDate=Date;let clockMs=RealDate.parse('2026-09-23T12:00:00Z');
globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[clockMs]));}static now(){return clockMs;}};
try {
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
 database=new PGlite(join(dir,'db'));
 const rawExec=database.exec.bind(database);database.exec=query=>rawExec(query.replaceAll('now()',`'${new RealDate(clockMs).toISOString()}'::timestamptz`));
 await database.exec(readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 await database.exec('update os_control set paused=false where id=1');
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--jsx','react-jsx','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/media-autopilot.ts','app/lib/business-os/telegram-media.ts','app/lib/business-os/social-health.ts'],{stdio:'pipe'});
 const require=createRequire(import.meta.url);let tail=Promise.resolve();
 const makeSql=driver=>{
  const sql=async(parts,...values)=>{let q=parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,'');q=q.replaceAll('now()',`'${new RealDate(clockMs).toISOString()}'::timestamptz`);if(q.includes('insert into os_activity('))q=q.replace('insert into os_activity(','insert into os_activity(created_at,').replace('values(',`values('${new RealDate(clockMs).toISOString()}'::timestamptz,`);if(q.includes('pg_advisory_xact_lock'))return [];return (await driver.query(q,values)).rows;};
  sql.json=v=>JSON.stringify(v);sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>fn(makeSql(tx)));}finally{release();}};return sql;
 };
 const sql=makeSql(database),mock=(name,exports)=>{const id=join(dir,'lib',name+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 mock('affiliate-db',{db:()=>sql});
 mock('business-os/social-art',{renderSocialCarousel:async()=>{throw Error('REJECTED_RENDERER_USED');}});
 mock('business-os/whop',{whopStatus:async()=>({connected:true,companyId:'company'}),createWhopHomePost:async()=>({id:'whop'+(++whopWrites),companyId:'company'}),verifyWhopPost:async(id)=>({postId:id,createdAt:new Date().toISOString(),published:true})});
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
  if(url.startsWith('https://www.darthalgo.com/creative-references/')||url.startsWith('https://www.darthalgo.com/social-campaigns/'))return new Response(readFileSync('public'+new URL(url).pathname),{headers:{'content-type':'image/jpeg'}});
  if(url.startsWith('https://www.darthalgo.com/api/social-media/')){
   const [,assetId,hash]=new URL(url).pathname.match(/social-media\/([^/]+)\/([^/]+)$/);
   const row=(await database.query("select details from os_activity where event='social_media_asset' and entity_id=$1",[assetId])).rows[0];
   const slide=row.details.slides.find(s=>s.sha256===hash);
   return new Response(corrupt?Buffer.from('wrong'):Buffer.from(slide.png,'base64'),{headers:{'content-type':slide.mimeType||'image/png'}});
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
   assert.equal(i.saveToDraft,false);assert.equal(i.needsApproval,false);assert.equal(i.assets.length,1);
   if(i.channelId===mediaAutopilot.channels.instagram)assert.equal(i.metadata.instagram.type,'post');
   const post={id,channelId:i.channelId,text:i.text,status:'sending',sentAt:null,externalLink:null,assets:i.assets.map(a=>({source:a.image.url,type:'image',image:{altText:a.image.metadata.altText}}))};posts.set(id,post);
   if(drop)throw Error('Response lost after write');return Response.json({data:{createPost:{post}}});
  }
  return Response.json({data:{post:posts.get(variables.input.id)}});
 };

 const {socialSchedule,withinSocialWindow}=require(join(dir,'lib/business-os/social-schedule.js'));
 const {dailySocialPayload}=require(join(dir,'lib/business-os/daily-social-policy.js'));
 const {fingerprint}=require(join(dir,'lib/business-os/policy.js'));
 const {socialCampaignQueue}=require(join(dir,'lib/business-os/social-campaign-queue.js'));
 const {validateReviewedCreative}=require(join(dir,'lib/business-os/reviewed-social.js'));
 const queuedHashes=new Set();
 for(const asset of socialCampaignQueue){validateReviewedCreative(asset);for(const a of asset.assets){assert.equal(createHash('sha256').update(readFileSync('public'+a.path)).digest('hex'),a.sha256);assert.equal(queuedHashes.has(a.sha256),false,'No recycled image across queued slots');queuedHashes.add(a.sha256);}}
 assert.throws(()=>validateReviewedCreative({...socialCampaignQueue[0],text:'Changed copy'}),/REVIEW_INVALID/);
 const [campaign,parallel]=await Promise.all([prepareDailyCampaign(),prepareDailyCampaign()]);
 assert.deepEqual(campaign,parallel);assert.equal(campaign.slot,'morning');assert.equal(campaign.assets.length,1);
 const prepared=await syncDailySocial();assert.equal(prepared.status,'prepared_for_daily_window');assert.equal(prepared.assetsReady,true);
 assert.deepEqual(Object.values(prepared.deliveries).slice(0,3),['ready_for_daily_window','ready_for_daily_window','ready_for_daily_window']);assert.equal(writes,0);assert.equal(whopWrites,0);
 const ids={};
 for(const [network,channelId] of Object.entries({...mediaAutopilot.channels,threads:'threads123'})){
  const [a,b]=await Promise.all([prepareSocialDelivery(campaign,network,channelId),prepareSocialDelivery(campaign,network,channelId)]);assert.equal(a,b);ids[network]=a;
 }
 const row=(await database.query('select * from os_approvals where id=$1',[ids.x])).rows[0];
 assert.equal(isDailySocialPayload(row.payload),true);assert.equal(isDailySocialPayload({...row.payload,text:'changed'}),false);
 assert.equal((await executeSocialDelivery(ids.x)).state,'waiting_for_daily_window');assert.equal(writes,0);
 clockMs=RealDate.parse('2026-09-23T13:00:00Z');
 await database.exec('update os_control set paused=true where id=1');
 assert.equal((await syncMediaAutopilot()).status,'paused');await assert.rejects(executeSocialDelivery(ids.x),/OS_PAUSED/);assert.equal(writes,0);
 await database.exec('update os_control set paused=false where id=1');
 corrupt=true;await assert.rejects(executeSocialDelivery(ids.x),/ASSET_CHANGED/);assert.equal(writes,0);corrupt=false;
 for(const id of Object.values(ids))await Promise.all([executeSocialDelivery(id),executeSocialDelivery(id)]);
 assert.equal(writes,3,'Concurrent runs send once per network');
 for(const i of inputs){assert.equal(i.text,campaign.text);assert.deepEqual(i.assets,inputs[0].assets);}
 assert.equal((await publishCommunityPreview()).reason,'waiting_for_confirmed_social_post');assert.equal(telegramWrites,0);
 await ensureCommunityEducationSchema();
 await database.exec("insert into community_settings(key,value) values('education_chat_id','-100123'),('education_thread_id','7')");
 const confirm=async (which)=>{
  for(const p of posts.values())if(p.status!=='sent'){
   p.status='sent';p.sentAt=new Date().toISOString();p.externalLink=p.channelId==='threads123'?'https://www.threads.com/@darth.algo/post/'+p.id:p.channelId===mediaAutopilot.channels.x?'https://x.com/DarthAlgos/status/'+p.id.replace('post',''):'https://www.instagram.com/p/'+p.id+'/';
  }
  for(const id of Object.values(which))assert.equal((await checkSocialDelivery(id)).published,true);
 };
 await confirm(ids);
 for(const id of Object.values(ids))await executeSocialDelivery(id);assert.equal(writes,3);
 await Promise.all([publishCommunityPreview(),publishCommunityPreview()]);await publishEducationPost({force:true});
 assert.equal(telegramWrites,1,'One preview per slot, including concurrent cron and legacy trigger');
 assert.equal(community[0].photo,campaign.assets[0].url);assert.equal(community[0].reply_markup.inline_keyboard.length,3);assert.match(community[0].caption,/MORNING POST/);
 await syncDailySocial();assert.equal(whopWrites,1);
 clockMs=RealDate.parse('2026-09-23T18:00:00Z');
 const afternoon=await prepareDailyCampaign();assert.equal(afternoon.slot,'afternoon');assert.notEqual(afternoon.assetId,campaign.assetId);
 const afternoonIds={};
 for(const [network,channelId] of Object.entries({...mediaAutopilot.channels,threads:'threads123'}))afternoonIds[network]=await prepareSocialDelivery(afternoon,network,channelId);
 await executeSocialDelivery(afternoonIds.x);assert.equal(writes,3,'Afternoon never sends before 3 PM');
 clockMs=RealDate.parse('2026-09-23T19:00:00Z');
 for(const id of Object.values(afternoonIds))await Promise.all([executeSocialDelivery(id),executeSocialDelivery(id)]);
 assert.equal(writes,6,'Two distinct slots reach each of three platforms');
 assert.notEqual(inputs[0].text,inputs[3].text);
 await confirm(afternoonIds);await syncDailySocial();assert.equal(whopWrites,2);
 await Promise.all([publishCommunityPreview(),publishCommunityPreview()]);assert.equal(telegramWrites,2);
 assert.match(community[1].caption,/AFTERNOON POST/);
 await syncDailySocial();assert.equal(writes,6);assert.equal(whopWrites,2);
 // Retired payloads remain readable for reconciliation but can never send.
 const legacy={...campaign,assetId:randomUUID(),assets:[...campaign.assets,...campaign.assets,...campaign.assets]};
 delete legacy.slot;delete legacy.contentId;delete legacy.reviewHash;legacy.creativeVersion='premium-black-red-2026-09-22-v4';
 legacy.assets=legacy.assets.map(a=>({...a,url:`https://www.darthalgo.com/api/social-media/${legacy.assetId}/${a.sha256}`}));
 const legacyPayload=dailySocialPayload(legacy,'x',mediaAutopilot.channels.x);assert.equal(legacyPayload.policyId,'owner-same-post-2026-09-20-v2');assert.equal(isDailySocialPayload(legacyPayload),true);
 const legacyId=randomUUID();await database.query("insert into os_approvals(id,payload,payload_hash,status,decided_by,expires_at) values($1,$2,$3,'approved','owner_policy',now()+interval '7 days')",[legacyId,JSON.stringify(legacyPayload),fingerprint(legacyPayload)]);
 assert.equal((await executeSocialDelivery(legacyId)).state,'creative_review_required');assert.equal(writes,6);
 // Lost responses preserve the attempted slot and block the next post on that channel.
 clockMs=RealDate.parse('2026-09-24T13:00:00Z');
 const next=await prepareDailyCampaign(),uncertainId=await prepareSocialDelivery(next,'threads','threads123');
 drop=true;assert.equal((await executeSocialDelivery(uncertainId)).state,'unknown');await executeSocialDelivery(uncertainId);assert.equal(writes,7);drop=false;
 clockMs=RealDate.parse('2026-09-24T19:00:00Z');
 const nextPm=await prepareDailyCampaign(),blockedId=await prepareSocialDelivery(nextPm,'threads','threads123');
 assert.equal((await executeSocialDelivery(blockedId)).state,'waiting_for_prior_receipt');assert.equal(writes,7);
 // Reconcile a known provider receipt with changed content without replaying it.
 const oldPayload=(await database.query('select payload,payload_hash from os_approvals where id=$1',[uncertainId])).rows[0];
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations','buffer_publish_receipt',${uncertainId},${sql.json({postId:'post7',payloadHash:oldPayload.payload_hash})})`;
 Object.assign(posts.get('post7'),{status:'sent',sentAt:new Date().toISOString(),text:'Provider returned modified copy',externalLink:'https://www.threads.com/@darth.algo/post/fixture'});
 const reconciled=await checkSocialDelivery(uncertainId);
 assert.equal(reconciled.state,'sent_content_changed');assert.equal(reconciled.published,false);assert.equal(reconciled.outcomeResolved,true);
 await executeSocialDelivery(uncertainId);assert.equal(writes,7,'Terminal reconciliation never resends the old post');
 assert.notEqual((await executeSocialDelivery(blockedId)).state,'waiting_for_prior_receipt');assert.equal(writes,8,'Fresh authorized campaign can continue');
 await executeSocialDelivery(blockedId);assert.equal(writes,8,'Fresh attempt is still deduplicated');
 // Missing future art does not silently repeat the seed pack or invoke the rejected renderer.
 const missing=await syncDailySocial(new Date('2026-10-25T13:00:00Z'));assert.equal(missing.status,'creative_assets_required');assert.equal(writes,8);
 // Eastern DST and midnight use local calendar slots; closed windows never catch up in a burst.
 assert.equal(socialSchedule(new Date('2026-11-01T13:59:00Z')).open,false);
 assert.equal(socialSchedule(new Date('2026-11-01T14:00:00Z')).open,true);
 assert.equal(socialSchedule(new Date('2026-11-01T20:00:00Z')).slot,'afternoon');
 assert.equal(socialSchedule(new Date('2026-09-24T02:00:00Z')).day,'2026-09-24');
 assert.equal(withinSocialWindow(campaign,new Date('2026-09-23T16:00:00Z')),false);
 console.log('PASS: two slots, exact reviewed artwork, JPEG verification, concurrent dedupe, schedule/DST, Whop and community twice daily, legacy readback, lost-response protection, no retired fallback.');
 // Durable reads reduce cron traffic; publish preflight bypasses cached channel state.
 const {bufferStatus,bufferGraphQL,bufferCooldown,bufferRetryAt}=require(join(dir,'lib/business-os/buffer.js'));
 await bufferStatus({fresh:true});
 const providerFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async(...args)=>{calls++;return providerFetch(...args);};
 await bufferStatus();await bufferStatus();assert.equal(calls,0);
 await bufferStatus({fresh:true});assert.equal(calls,2);
 channels[2].isQueuePaused=true;
 const threadsPayload=(await database.query('select payload from os_approvals where id=$1',[ids.threads])).rows[0].payload;
 await assert.rejects(require(join(dir,'lib/business-os/buffer-social.js')).socialPreflight(threadsPayload),/CHANNEL_NOT_READY/);
 channels[2].isQueuePaused=false;
 // Failed receipt checks are throttled without losing the original accepted receipt.
 globalThis.fetch=async()=>{calls++;throw Error('temporary outage');};calls=0;
 assert.equal((await checkSocialDelivery(ids.x)).published,false);
 await checkSocialDelivery(ids.x,{scheduled:true});assert.equal(calls,1);
 assert.ok((await database.query("select id from os_activity where event='buffer_publish_receipt' and entity_id=$1",[ids.x])).rows.length);
 // Old accepted posts back off to hourly; explicit owner reads still bypass the schedule.
 await database.exec("update os_activity set created_at=now()-interval '2 hours' where event='buffer_publish_receipt'");
 await database.exec("update os_activity set created_at=now()-interval '10 minutes' where event='buffer_publish_checked'");
 await checkSocialDelivery(ids.x,{scheduled:true});assert.equal(calls,1);
 await database.exec("update os_activity set created_at=now()-interval '61 minutes' where event='buffer_publish_checked'");
 await checkSocialDelivery(ids.x,{scheduled:true});assert.equal(calls,2);
 // A provider 429 persists its Retry-After across calls; never retries reads or writes early.
 calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'600'}});};
 await assert.rejects(bufferGraphQL('query Test { account { id } }'),/BUFFER_HTTP_429/);
 assert.ok(await bufferCooldown());
 await assert.rejects(bufferGraphQL('query Test { account { id } }'),/COOLDOWN/);
 await assert.rejects(bufferGraphQL('mutation Test { createPost { id } }'),/COOLDOWN/);assert.equal(calls,1);
 assert.ok((await socialHealthIssues()).some(s=>s.includes('rate-limiting')));
 const clock=Date.parse('2026-09-20T18:00:00Z');
 assert.equal(bufferRetryAt('600',clock),'2026-09-20T18:10:00.000Z');
 assert.equal(bufferRetryAt('Sun, 20 Sep 2026 19:00:00 GMT',clock),'2026-09-20T19:00:00.000Z');
 assert.equal(bufferRetryAt(null,clock),'2026-09-20T19:00:00.000Z');
 await database.exec("update os_activity set details=jsonb_build_object('retryAt',(now()-interval '1 minute')::text) where event='buffer_rate_limited'");
 globalThis.fetch=providerFetch;assert.equal(await bufferCooldown(),undefined);await bufferStatus({fresh:true});
 // A definite Whop 400 allows exactly one corrected attempt; unknown writes do not.
 clockMs=RealDate.parse('2026-09-23T23:00:00Z');
 const {syncDailyWhop}=require(join(dir,'lib/business-os/whop-daily.js'));
 const pm=(await database.query("select details from os_activity where event='daily_social_ready' and entity_id='2026-09-23-afternoon' order by id desc limit 1")).rows[0].details;
 const whopKey='daily-whop:2026-09-23-afternoon';
 await database.query('delete from os_activity where entity_id=$1',[whopKey]);
 await sql`insert into os_activity(actor,event,entity_id,details) values('owner','whop_home_publish_started',${whopKey},'{}'::jsonb)`;
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_unknown',${whopKey},' {"code":"WHOP_FORUM_HTTP_400"}'::jsonb)`;
 const beforeRepair=whopWrites;
 await Promise.all([syncDailyWhop(pm),syncDailyWhop(pm)]);await syncDailyWhop(pm);
 assert.equal(whopWrites,beforeRepair+1,'Concurrent repair claims do not duplicate the corrected post');
 await database.query('delete from os_activity where entity_id=$1',[whopKey]);
 await sql`insert into os_activity(actor,event,entity_id,details) values('owner','whop_home_publish_started',${whopKey},'{}'::jsonb)`;
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations','whop_home_publish_unknown',${whopKey},' {"code":"WHOP_PUBLISH_UNKNOWN"}'::jsonb)`;
 assert.equal((await syncDailyWhop(pm)).published,false);assert.equal(whopWrites,beforeRepair+1,'Unknown external outcome is never retried');
 console.log('PASS: persistent discovery cache, fresh publishing preflight, receipt throttle, Retry-After cooldown, health signal and safe recovery.');

}finally{globalThis.Date=RealDate;globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);if(database)await database.close();rmSync(dir,{recursive:true,force:true});}
