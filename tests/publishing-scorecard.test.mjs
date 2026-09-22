import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'darth-queue-'));let database;
try {
 const {PGlite}=await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
 database=new PGlite(join(dir,'db'));
 await database.exec(readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/publishing-scorecard.ts','app/api/social-media/[id]/[hash]/route.ts']);
 const require=createRequire(import.meta.url),id=join(dir,'lib/affiliate-db.js');
 const sql=async(parts,...values)=>(await database.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
 require.cache[id]={id,filename:id,loaded:true,exports:{db:()=>sql}};
 const {publishingQueueSnapshot,nextContentWindow}=require(join(dir,'lib/business-os/publishing-scorecard.js'));
 const {GET}=require(join(dir,'api/social-media/[id]/[hash]/route.js'));
 const pending=randomUUID(),sending=randomUUID(),unknown=randomUUID(),published=randomUUID();
 for(const [i,status] of [[pending,'pending'],[sending,'approved'],[unknown,'approved'],[published,'approved']])await database.query("insert into os_approvals(id,payload,payload_hash,status,expires_at) values($1,$2,$3,$4,now()+interval '1 day')",[i,JSON.stringify({executor:i===pending?'buffer_social_v2':'buffer_instagram_v1',network:'threads'}),i,status]);
 for(const [i,event,details] of [[sending,'buffer_publish_started',{}],[unknown,'buffer_publish_unknown',{}],[published,'buffer_publish_checked',{published:true}]])await database.query("insert into os_activity(actor,event,entity_id,details) values('test',$1,$2,$3)",[event,i,JSON.stringify(details)]);
 assert.deepEqual(await publishingQueueSnapshot(),{waiting:1,checking:1,attention:1});
 await database.query("update os_approvals set expires_at=now()-interval '1 day' where id=$1",[pending]);
 assert.equal((await publishingQueueSnapshot()).waiting,0);
 assert.equal(nextContentWindow(new Date('2026-09-20T12:00:00Z')),'9 AM ET');
 assert.equal(nextContentWindow(new Date('2026-09-20T18:00:00Z')),'3 PM ET');
 assert.equal(nextContentWindow(new Date('2026-09-20T20:00:00Z')),'tomorrow at 9 AM ET');
 const assetId=randomUUID(),slides=['first','second','third'].map(text=>({png:Buffer.from(text).toString('base64'),sha256:createHash('sha256').update(text).digest('hex')}));
 await database.query("insert into os_activity(actor,event,entity_id,details) values('content','social_media_asset',$1,$2)",[assetId,JSON.stringify({slides})]);
 const get=hash=>GET(new Request('https://www.darthalgo.com'),{params:Promise.resolve({id:assetId,hash})});
 for(const [index,slide] of slides.entries()){const response=await get(slide.sha256);assert.equal(response.status,200);assert.equal(await response.text(),['first','second','third'][index]);}
 assert.equal((await get('0'.repeat(64))).status,404);
 slides[0].mimeType='image/jpeg';await database.query("update os_activity set details=$1 where entity_id=$2",[JSON.stringify({slides}),assetId]);assert.equal((await get(slides[0].sha256)).headers.get('content-type'),'image/jpeg');
 await database.query("update os_activity set details=$1 where entity_id=$2",[JSON.stringify(slides[0]),assetId]);
 assert.equal(await (await get(slides[0].sha256)).text(),'first','Existing single-image URLs remain valid');
 console.log('PASS: PostgreSQL queue separates ready, sending, uncertain and published; expired work excluded; all carousel hashes serve exact bytes; wrong hash rejected; legacy media preserved.');
}finally{if(database)await database.close();rmSync(dir,{recursive:true,force:true});}
