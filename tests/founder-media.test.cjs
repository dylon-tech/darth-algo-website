const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),{randomBytes,randomUUID,createHash}=require('node:crypto');
const root=process.cwd(),cache=new Map(),stubs={};
function load(filename){filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename);const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;cache.set(filename,m.exports);m.require=id=>stubs[id]||(id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);cache.set(filename,m.exports);return m.exports;}
const box=(type,payload)=>{const b=Buffer.alloc(8);b.writeUInt32BE(8+payload.length);b.write(type,4);return Buffer.concat([b,payload]);};
function mp4(codec='avc1'){
 const ftyp=box('ftyp',Buffer.from('isom\0\0\0\0isomiso2avc1mp41')),mdat=box('mdat',Buffer.alloc(20)),hdlr=Buffer.alloc(20);hdlr.write('vide',8);
 const mdhd=Buffer.alloc(24);mdhd.writeUInt32BE(60000,12);mdhd.writeUInt32BE(120000,16);
 const sample=Buffer.alloc(78);sample.writeUInt16BE(1080,24);sample.writeUInt16BE(1920,26);
 const stsd=Buffer.alloc(8);stsd.writeUInt32BE(1,4);
 const stsz=Buffer.alloc(12);stsz.writeUInt32BE(20,4);stsz.writeUInt32BE(1,8);
 const stco=Buffer.alloc(12);stco.writeUInt32BE(1,4);stco.writeUInt32BE(ftyp.length+8,8);
 const stbl=box('stbl',Buffer.concat([box('stsd',Buffer.concat([stsd,box(codec,Buffer.concat([sample,box('avcC',Buffer.from([1,66,0,30,255,224,0]))]))])),box('stsz',stsz),box('stco',stco)]));
 return Buffer.concat([ftyp,mdat,box('moov',box('trak',box('mdia',Buffer.concat([box('hdlr',hdlr),box('mdhd',mdhd),box('minf',stbl)]))))]);
}
async function main(){
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite'),pg=new PGlite();
 function adapter(client){const sql=async(strings,...values)=>{const q=strings.reduce((s,t,i)=>s+t+(i<values.length?'$'+(i+1):''),'');if(q.includes('pg_advisory_xact_lock'))return [];return (await client.query(q,values)).rows;};sql.unsafe=q=>client.exec(q);sql.begin=fn=>client.transaction(tx=>fn(adapter(tx)));return sql;}
 stubs['../affiliate-db']={db:()=>adapter(pg)};
 const media=load('app/lib/business-os/founder-media.ts'),model=load('app/lib/business-os/founder-media-model.ts');
 assert.deepEqual(model.mediaByteRange('bytes=3-9',8),{start:3,end:7});assert.deepEqual(model.mediaByteRange('bytes=-3',8),{start:5,end:7});assert.deepEqual(model.mediaByteRange('bytes=2-',8),{start:2,end:7});
 for(const range of ['bytes=9-10','bytes=3-1','bytes=0-1,3-4','bytes=-0','nonsense'])assert.throws(()=>model.mediaByteRange(range,8));
 const validVideo=media.inspectFounderMp4(mp4());assert.equal(validVideo.width,1080);assert.equal(validVideo.height,1920);assert.equal(validVideo.durationSeconds,2);assert.equal(validVideo.fullDecode,false);
 assert.throws(()=>media.inspectFounderMp4(mp4('hvc1')),/H264/);assert.throws(()=>media.inspectFounderMp4(mp4().subarray(0,-5)),/INVALID_MP4/);
 const image=await require('sharp')(randomBytes(900*900*3),{raw:{width:900,height:900,channels:3}}).png().toBuffer();
 const inspected=await media.inspectFounderMedia(image,'image/png');assert.equal(inspected.fullDecode,true);assert.equal(inspected.width,900);
 await assert.rejects(media.inspectFounderMedia(image,'image/jpeg'),/INVALID_IMAGE/);
 await assert.rejects(media.inspectFounderMedia(image.subarray(0,image.length-100),'image/png'),/INVALID_IMAGE/);
 await assert.rejects(media.inspectFounderMedia(Buffer.from('<svg>'+'.'.repeat(100)+'</svg>'),'image/png'),/INVALID_IMAGE/);
 const request={requestKey:randomUUID(),fileName:'Chart.png',size:image.length,mimeType:'image/png',sha256:createHash('sha256').update(image).digest('hex')},started=await media.beginFounderMediaUpload(request);
 assert.equal(started.sha256,request.sha256);await assert.rejects(media.beginFounderMediaUpload({...request,requestKey:randomUUID(),sha256:undefined}),/FILE_HASH_REQUIRED/);
 assert.equal((await media.beginFounderMediaUpload(request)).id,started.id);
 await assert.rejects(media.beginFounderMediaUpload({...request,fileName:'Different.png'}),/UPLOAD_KEY_CONFLICT/);
 await assert.rejects(media.beginFounderMediaUpload({...request,sha256:'a'.repeat(64)}),/UPLOAD_KEY_CONFLICT/); // same name, size and MIME are not source identity
 await assert.rejects(media.completeFounderMediaUpload(started.id),/UPLOAD_INCOMPLETE/);
 for(let i=0;i<started.chunkCount;i++){const chunk=image.subarray(i*started.chunkBytes,(i+1)*started.chunkBytes);await media.saveFounderMediaChunk(started.id,i,chunk);assert.equal((await media.saveFounderMediaChunk(started.id,i,chunk)).duplicate,true);}
 const changed=Buffer.from(image.subarray(0,started.chunkBytes));changed[0]^=255;await assert.rejects(media.saveFounderMediaChunk(started.id,0,changed),/CHUNK_CONFLICT/);
 const completed=await media.completeFounderMediaUpload(started.id);assert.equal(completed.asset.type,'image');assert.equal(completed.asset.validation.creativeReview,false);assert.equal((await media.completeFounderMediaUpload(started.id)).asset.id,completed.asset.id);
 const read=await media.getFounderMediaBytes(completed.asset.id);assert.deepEqual(read.bytes,image);assert.equal((await media.getFounderMediaUpload(started.id)).asset.id,completed.asset.id);
 assert.equal((await media.founderMediaSnapshot()).assets.length,1);assert.equal((await pg.query('select count(*)::int as n from os_founder_media_chunks')).rows[0].n,0);
 const retry=await media.beginFounderMediaUpload({...request,requestKey:randomUUID()});for(let i=0;i<retry.chunkCount;i++)await media.saveFounderMediaChunk(retry.id,i,image.subarray(i*retry.chunkBytes,(i+1)*retry.chunkBytes));assert.equal((await media.completeFounderMediaUpload(retry.id)).asset.id,completed.asset.id);assert.equal((await media.founderMediaSnapshot()).assets.length,1);
 const canceled=await media.beginFounderMediaUpload({...request,requestKey:randomUUID()});await media.cancelFounderMediaUpload(canceled.id);assert.equal(await media.getFounderMediaUpload(canceled.id),null);
 const mixed=await media.beginFounderMediaUpload({...request,requestKey:randomUUID()});
 for(let i=0;i<mixed.chunkCount;i++){const part=Buffer.from(image.subarray(i*mixed.chunkBytes,(i+1)*mixed.chunkBytes));if(i===mixed.chunkCount-1)part[part.length-1]^=1;await media.saveFounderMediaChunk(mixed.id,i,part);}
 await assert.rejects(media.completeFounderMediaUpload(mixed.id),/UPLOAD_FILE_MISMATCH/);assert.equal((await media.getFounderMediaUpload(mixed.id)).asset,null);assert.equal((await media.founderMediaSnapshot()).assets.length,1);await media.cancelFounderMediaUpload(mixed.id);
 Object.assign(process.env,{AI_OS_ENABLED:'true',AI_OS_OWNER_KEY:'private-test-owner-key-'.repeat(4)});
 const session=load('app/lib/business-os/owner-session.ts'),cookie=`${session.ownerCookie}=${session.createOwnerSession(process.env.AI_OS_OWNER_KEY)}`;
 const route=load('app/api/owner/founder-media/route.ts'),assetRoute=load('app/api/owner/founder-media/[id]/route.ts'),chunkRoute=load('app/api/owner/founder-media/[id]/chunks/route.ts'),origin='https://www.darthalgo.com';
 assert.equal((await route.GET(new Request(origin+'/api/owner/founder-media'))).status,401);
 assert.equal((await route.POST(new Request(origin+'/api/owner/founder-media',{method:'POST',headers:{cookie,origin:'https://evil.example','content-type':'application/json'},body:'{}'}))).status,403);
 assert.equal((await route.POST(new Request(origin+'/api/owner/founder-media',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:' '.repeat(5000)}))).status,413);
 const ctx={params:Promise.resolve({id:completed.asset.id})};assert.equal((await assetRoute.GET(new Request(origin),ctx)).status,401);
 const response=await assetRoute.GET(new Request(origin,{headers:{cookie,range:'bytes=2-19'}}),ctx);assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 2-19/${image.length}`);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');assert.deepEqual(Buffer.from(await response.arrayBuffer()),image.subarray(2,20));
 assert.equal((await assetRoute.GET(new Request(origin,{headers:{cookie,range:'bytes=99999999-'}}),ctx)).status,416);
 assert.equal((await chunkRoute.PUT(new Request(origin,{method:'PUT',headers:{cookie,origin:'https://evil.example','content-type':'application/octet-stream'},body:Buffer.from('x')}),ctx)).status,403);
 await pg.close();console.log('PASS media decode/container verification, chunk retries/conflicts, deduplication, cancellation, byte ranges, private ownership and CSRF/body limits.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
