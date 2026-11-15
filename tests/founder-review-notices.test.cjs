const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),{randomUUID}=require('node:crypto');
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite'),pg=new PGlite(),queries=[];
 function adapter(client){const sql=async(parts,...values)=>{const q=parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,'');queries.push(q);if(q.includes('pg_advisory_xact_lock'))return [];return(await client.query(q,values)).rows;};sql.json=JSON.stringify;sql.unsafe=q=>client.exec(q);sql.begin=f=>client.transaction(tx=>f(adapter(tx)));return sql;}
 const sql=adapter(pg),cache=new Map();
 function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;cache.set(filename,m.exports);m.require=id=>id.endsWith('/affiliate-db')?{db:()=>sql}:id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);cache.set(filename,m.exports);return m.exports;}
 try{
 const notices=load('app/lib/business-os/founder-review-notices.ts'),inbox=load('app/lib/business-os/founder-inbox.ts');
 assert.deepEqual(await notices.readFounderReviewNotices(sql),[]);assert.ok(queries.every(q=>q.startsWith('select ')),'Read never creates schema');
 await pg.exec(fs.readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 await pg.exec(`create table os_founder_content_items(id uuid primary key,version integer,archived boolean default false,media_type text,data jsonb,updated_at timestamptz); create table os_founder_render_jobs(id uuid primary key,item_id uuid,content_version integer,status text,media_asset_id uuid); create table os_founder_publications(item_id uuid,content_version integer,state text,approved_at timestamptz);`);
 const now='2026-11-16T12:00:00Z';
 async function make(type){const job=randomUUID(),item={id:randomUUID(),version:3,type,title:'Verified product example',status:'checking',mediaAssetId:randomUUID(),mediaVerifiedAt:now,coverAssetId:type==='video'?randomUUID():null,updatedAt:now};await sql`insert into os_founder_content_items values(${item.id},3,false,${type},${sql.json(item)},${now})`;await sql`insert into os_founder_render_jobs values(${job},${item.id},2,'completed',${item.mediaAssetId})`;await notices.writeFounderReviewNotice(sql,job,item,now);return {item,job};}
 const photo=await make('image'),video=await make('video');
 await notices.writeFounderReviewNotice(sql,photo.job,photo.item,'2026-11-16T12:05:00Z');
 const [saved]=await sql`select body,created_at from os_messages where id=${photo.job}`;assert.match(saved.body,/Does this photo and its caption look good/);assert.match(saved.body,/Nothing is published/);assert.equal(new Date(saved.created_at).toISOString(),new Date(now).toISOString(),'Completion replay preserves unread timestamp');
 const [count]=await sql`select count(*)::int n from os_messages where id=${photo.job}`;assert.equal(count.n,1);
 let rows=await notices.readFounderReviewNotices(sql);assert.equal(rows.length,2);assert.ok(rows.some(r=>r.id===photo.job+':3'));const id='review:'+photo.job+':3';
 let feed=await inbox.founderInbox();assert.equal(feed.items.filter(i=>i.kind==='content_review').length,2);assert.ok(!feed.items.some(i=>i.id==='message:'+photo.job),'Completion message is not duplicated in generic source');
 assert.equal((await inbox.founderInboxDetail(id)).item.sourceHref,'/owner?tab=content&item='+photo.item.id);assert.equal(await inbox.founderInboxDetail('message:'+photo.job),null,'Old generic completion does not bypass current review source');
 await inbox.updateFounderInbox({operation:'update',id,expectedVersion:0,patch:{read:true,resolved:true}});
 assert.equal((await sql`select count(*)::int n from os_founder_publications`)[0].n,0,'Inbox read/resolve does not approve publication');
 photo.item.version=4;photo.item.caption='New caption needs review';photo.item.updatedAt='2026-11-16T12:10:00Z';await sql`update os_founder_content_items set version=4,data=${sql.json(photo.item)},updated_at=${photo.item.updatedAt} where id=${photo.item.id}`;
 feed=await inbox.founderInbox();const edited=feed.items.find(i=>i.id==='review:'+photo.job+':4');assert.ok(edited?.unread);assert.equal(edited.state.resolvedAt,null,'New version does not inherit old resolution');assert.equal(await inbox.founderInboxDetail(id),null,'Stale exact-version review is unavailable');
 await sql`insert into os_founder_publications values(${photo.item.id},4,'approved',${now})`;assert.equal((await notices.readFounderReviewNotices(sql)).length,1,'Exact publication approval suppresses review request');
 await sql`update os_founder_publications set content_version=3`;assert.equal((await notices.readFounderReviewNotices(sql)).length,2,'Older approval does not suppress current review');
 photo.item.status='generating';await sql`update os_founder_content_items set data=${sql.json(photo.item)} where id=${photo.item.id}`;assert.equal((await notices.readFounderReviewNotices(sql)).length,1,'Regeneration hides obsolete request');
 const regeneratedJob=randomUUID();photo.item={...photo.item,version:6,status:'checking',mediaAssetId:randomUUID(),updatedAt:'2026-11-16T12:15:00Z'};await sql`update os_founder_content_items set version=6,data=${sql.json(photo.item)},updated_at=${photo.item.updatedAt} where id=${photo.item.id}`;await sql`insert into os_founder_render_jobs values(${regeneratedJob},${photo.item.id},5,'completed',${photo.item.mediaAssetId})`;await notices.writeFounderReviewNotice(sql,regeneratedJob,photo.item,photo.item.updatedAt);
 feed=await inbox.founderInbox();assert.equal(feed.items.filter(i=>i.kind==='content_review').length,2);assert.ok(feed.items.find(i=>i.id==='review:'+regeneratedJob+':6')?.unread);assert.equal(await inbox.founderInboxDetail('review:'+photo.job+':4'),null);
 await sql`update os_founder_content_items set archived=true where id=${photo.item.id}`;assert.equal((await notices.readFounderReviewNotices(sql)).length,1);
 video.item.status='ready';await sql`update os_founder_content_items set data=${sql.json(video.item)} where id=${video.item.id}`;assert.equal((await notices.readFounderReviewNotices(sql)).length,0,'Reviewed asset no longer asks for approval');
 video.item.status='checking';await sql`update os_founder_content_items set data=${sql.json(video.item)} where id=${video.item.id}`;
 const olderJob=randomUUID();await sql`insert into os_founder_render_jobs values(${olderJob},${video.item.id},1,'completed',${video.item.mediaAssetId})`;
 assert.equal((await notices.readFounderReviewNotices(sql)).length,1,'Same asset linked to older jobs still has one latest notification');
 await sql`delete from os_messages where id=${video.job}`;
 assert.equal((await notices.readFounderReviewNotices(sql))[0].id,video.job+':3','Durable render completion recovers a missing optional message row');
 assert.equal(inbox.validInboxId('review:'+video.job+':0'),false);assert.equal(inbox.validInboxId('review:'+video.job+':3:extra'),false);
 queries.length=0;await inbox.founderInbox();assert.ok(queries.every(q=>q.trim().startsWith('select ')),'All authenticated Inbox source reads remain read-only');
 console.log('PASS: durable versioned review notices; completion replay dedupe; photo/video and regeneration; stale/archived/approved filtering; current-version details; no inherited resolution or publication side effects; read-only inbox.');
 }finally{await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
