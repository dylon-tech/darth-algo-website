import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-media-')),env={...process.env},originalFetch=globalThis.fetch;
let database;
try {
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
 database=new PGlite(join(dir,'db'));
 await database.exec(readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--jsx','react-jsx','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/media-autopilot.ts','app/lib/business-os/service.ts','app/lib/business-os/competitor-research.ts','app/lib/business-os/telegram-media.ts'],{stdio:'pipe'});
 const require=createRequire(import.meta.url);let tail=Promise.resolve();
 const makeSql=driver=>{
  const sql=async(parts,...values)=>{const q=parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,'');if(q.includes('pg_advisory_xact_lock'))return [];return (await driver.query(q,values)).rows;};
  sql.json=v=>JSON.stringify(v);sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await database.transaction(tx=>fn(makeSql(tx)));}finally{release();}};return sql;
 };
 const sql=makeSql(database),mock=(name,exports)=>{const id=join(dir,'lib',name+'.js');require.cache[id]={id,filename:id,loaded:true,exports};};
 mock('affiliate-db',{db:()=>sql});
 for(const name of ['sources','model','coordination','coordination-policy','pilot-policy','budget-policy'])mock('business-os/'+name,{});
 const {instagramPublicationPayload,isInstagramPublication}=require(join(dir,'lib/business-os/instagram-policy.js'));
 const {syncInstagramCampaign,executeInstagramPublication,checkInstagramPublication}=require(join(dir,'lib/business-os/instagram-publishing.js'));
 const {syncMediaAutopilot,routineMediaAllowed}=require(join(dir,'lib/business-os/media-autopilot.js'));
 const {prepareBufferPublication,checkBufferPublication}=require(join(dir,'lib/business-os/buffer-publishing.js'));
 const {mediaDashboard}=require(join(dir,'lib/business-os/telegram-media.js'));
 const {contentSlot,mediaAutopilot}=require(join(dir,'lib/business-os/media-policy.js'));
 const {decide}=require(join(dir,'lib/business-os/service.js'));
 const {parseCompetitorFeed,parseCompetitorPage}=require(join(dir,'lib/business-os/competitor-research.js'));
 const pageData={metadata:{channelMetadataRenderer:{externalId:'verified-channel'}},contents:{twoColumnBrowseResultsRenderer:{tabs:[{tabRenderer:{selected:true,content:{items:[{lockupViewModel:{contentId:'abcdefghijk',contentType:'LOCKUP_CONTENT_TYPE_VIDEO',metadata:{lockupMetadataViewModel:{title:{content:'A chart-reading lesson'},metadata:{contentMetadataViewModel:{metadataRows:[{metadataParts:[{text:{content:'2.4K views'}},{text:{content:'3 days ago'}}]}]}}}}}}]}}}]}}};
 const page=()=>`<script>var ytInitialData = ${JSON.stringify(pageData)};</script>`;
 const pagePosts=parseCompetitorPage(page(),'verified-channel',Date.parse('2026-09-20T12:00:00Z'));
 assert.equal(pagePosts.length,1);assert.equal(pagePosts[0].views,2400);assert.equal(pagePosts[0].viewsPerDay,800);assert.equal(pagePosts[0].viewsPrecision,'rounded public display');assert.equal(pagePosts[0].published,'2026-09-17T12:00:00.000Z');
 assert.equal(parseCompetitorPage(page(),'wrong-channel').length,0);
 pageData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.items[0].lockupViewModel.metadata.lockupMetadataViewModel.metadata.contentMetadataViewModel.metadataRows[0].metadataParts[0].text.content='Views unavailable';
 assert.equal(parseCompetitorPage(page(),'verified-channel')[0].views,null);
 process.env.VERCEL_ENV='production';process.env.AI_OS_AUTONOMY_ENABLED='true';process.env.AI_OS_AI_ENABLED='false';process.env.BUFFER_API_KEY='offline';process.env.BUFFER_X_CHANNEL_ID=mediaAutopilot.channels.x;process.env.AI_OS_TELEGRAM_ENABLED='false';
 let drafts=0,publics=0,drop=false,corrupt=false;const posts=new Map();
 globalThis.fetch=async(url,options)=>{
  if(url.startsWith('https://www.darthalgo.com/campaigns/'))return new Response(corrupt?Buffer.from('wrong'):readFileSync('public'+new URL(url).pathname),{headers:{'content-type':'image/png'}});
  assert.equal(url,'https://api.buffer.com');const {query,variables}=JSON.parse(options.body);
  if(query.includes('BufferOrganizations'))return Response.json({data:{account:{organizations:[{id:'org'}]}}});
  if(query.includes('BufferChannels'))return Response.json({data:{channels:Object.entries(mediaAutopilot.channels).map(([service,id])=>({id,service:service==='x'?'twitter':service,displayName:'Darth Algo',isDisconnected:false,isLocked:false,isQueuePaused:false}))}});
  if(query.includes('CreatePost')) {
   const i=variables.input,id='post'+(posts.size+1);if(i.saveToDraft)drafts++;else publics++;
   if(i.channelId===mediaAutopilot.channels.instagram){assert.equal(i.metadata.instagram.type,'post');assert.equal(i.metadata.instagram.isAiGenerated,true);assert.deepEqual(i.assets.map(a=>a.image.url),instagramPublicationPayload().assets.map(a=>a.url));}
   const post={id,channelId:i.channelId,text:i.text,status:i.saveToDraft?'draft':'sending',dueAt:null,sentAt:null,assets:i.assets.map(a=>({source:a.image.url,type:'image',image:{altText:a.image.metadata.altText}}))};posts.set(id,post);
   if(drop&&!i.saveToDraft)throw Error('Response lost after write');
   return Response.json({data:{createPost:{post}}});
  }
  return Response.json({data:{post:posts.get(variables.input.id)}});
 };
 const p=instagramPublicationPayload();assert.ok(isInstagramPublication(p));assert.ok(!isInstagramPublication({...p,channelId:'wrong'}));assert.ok(!isInstagramPublication({...p,assets:[...p.assets].reverse()}));
 assert.equal(contentSlot(new Date('2026-09-20T13:00:00Z')).slot,9);assert.equal(contentSlot(new Date('2026-09-20T08:00:00Z')).slot,null);
 assert.equal(routineMediaAllowed('Guaranteed profit $100'),false);assert.equal(routineMediaAllowed('Read the context first. https://www.darthalgo.com/links'),true);
 const first=await syncInstagramCampaign();await syncInstagramCampaign();assert.equal(drafts,1);assert.equal(publics,0);
 let row=(await database.query('select * from os_approvals where id=$1',[first.approvalId])).rows[0];
 await assert.rejects(executeInstagramPublication(row.id,row.payload_hash),/APPROVAL_REQUIRED/);
 await database.exec('update os_control set paused=true where id=1');assert.equal((await syncMediaAutopilot()).status,'paused');assert.equal(publics,0);
 await database.exec('update os_control set paused=false where id=1');
 await database.query("insert into os_activity(actor,event,details) values('owner','buffer_draft_test_verified',$1)",[JSON.stringify({channelId:mediaAutopilot.channels.x})]);
 const x=await prepareBufferPublication('Explore Darth Algo tools and community. https://www.darthalgo.com/links');
 await prepareBufferPublication('Plan the context before your entry. https://www.darthalgo.com/links');
 await Promise.all([syncMediaAutopilot(),syncMediaAutopilot()]);assert.equal(publics,2,'Exactly one X and one Instagram submission under concurrent sync');
 await syncMediaAutopilot();assert.equal(publics,2,'Spacing and unknown/sending receipts block duplicates');
 for(const post of posts.values())if(post.status==='sending'){post.status='sent';post.sentAt=new Date().toISOString();}
 assert.equal((await checkInstagramPublication(row.id,row.payload_hash)).published,true);
 const xr=(await database.query('select * from os_approvals where id=$1',[x.id])).rows[0];assert.equal((await checkBufferPublication(xr.id,xr.payload_hash)).published,true);
 assert.match(await mediaDashboard('today'),/Published/);assert.match(await mediaDashboard('queue'),/Waiting for next available slot/);
 await syncMediaAutopilot();assert.equal(publics,2,'Cadence limits survive confirmed receipts');
 const count=(await database.query("select count(*)::int as n from os_activity where event='media_auto_authorized'")).rows[0].n;assert.equal(count,2);
 // A changed remote asset never reaches the publishing mutation.
 await database.query("delete from os_activity where entity_id=$1 and event like 'buffer_publish_%'",[row.id]);corrupt=true;
 assert.equal((await executeInstagramPublication(row.id,row.payload_hash)).state,'unknown');assert.equal(publics,2);corrupt=false;
 await executeInstagramPublication(row.id,row.payload_hash);assert.equal(publics,2,'Failed preflight remains fail-closed, not blindly replayed');
 // New isolated case: lost external response cannot be retried.
 await database.query("delete from os_activity where entity_id=$1 and event like 'buffer_publish_%'",[row.id]);drop=true;
 assert.equal((await executeInstagramPublication(row.id,row.payload_hash)).state,'unknown');await executeInstagramPublication(row.id,row.payload_hash);assert.equal(publics,3);drop=false;
 // Explicit owner approval still routes through the real dispatcher.
 await database.query("delete from os_activity where entity_id=$1 and event like 'buffer_publish_%'",[row.id]);await database.query("update os_approvals set status='pending',decided_by=null where id=$1",[row.id]);
 await decide(row.id,row.payload_hash,'approved','Owner test');assert.equal(publics,4);
 const feed='<entry><yt:videoId>abcdefghijk</yt:videoId><title>Chart &amp; clarity</title><published>2026-09-18T00:00:00Z</published><media:statistics views="100"/></entry>';
 const parsed=parseCompetitorFeed(feed,Date.parse('2026-09-20T00:00:00Z'));assert.equal(parsed[0].viewsPerDay,50);assert.equal(parsed[0].title,'Chart & clarity');assert.equal(parseCompetitorFeed(feed.replace(' views="100"',''),Date.parse('2026-09-20T00:00:00Z'))[0].views,null);
 console.log('PASS: real PostgreSQL SQL, private carousel readback, ordered assets, pause, standing authorization, concurrent cadence guard, exact account, asset hashes, lost-response replay block, owner dispatcher, real queue/history, source parser. Providers mocked; distributed PostgreSQL locks require live verification.');
}finally{globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);if(database)await database.close();rmSync(dir,{recursive:true,force:true});}
