const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{createHash}=require('node:crypto');
const transport={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/business-os/founder-video-source-transport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:transport,process,ReadableStream});
const bytes=Buffer.alloc(7_500_001,43),route={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/founder-video-source/[id]/[token]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:route,Response,Uint8Array,require:name=>name.endsWith('transport')?transport:{readFounderVideoSource:async()=>({bytes,asset:{mimeType:'video/mp4'}})}});
(async()=>{
 let authenticated=false;const probe={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/owner/founder-video-source-probe/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:probe,Response,Buffer,require:name=>name==='node:crypto'?{createHash}:name.endsWith('owner-session')?{ownerSessionFromRequest:()=>authenticated,privateHeaders:{}}:transport});
 const probeRequest=new Request('https://example.test/api/owner/founder-video-source-probe');assert.equal((await probe.GET(probeRequest)).status,401);authenticated=true;
 const diagnostic=await probe.GET(probeRequest),diagnosticBytes=Buffer.from(await diagnostic.arrayBuffer());assert.equal(diagnosticBytes.length,7_500_001);assert.equal(diagnostic.headers.get('x-content-sha256'),createHash('sha256').update(diagnosticBytes).digest('hex'));assert.equal(diagnostic.headers.get('content-length'),'7500001');assert.equal((await (await probe.HEAD(probeRequest)).arrayBuffer()).byteLength,0);
 const saved={...process.env};try{
 delete process.env.FOUNDER_VIDEO_SOURCE_TRANSPORT;delete process.env.FOUNDER_VIDEO_SOURCE_VERIFIED_SHA;
 process.env.VERCEL_ENV='production';process.env.VERCEL_GIT_COMMIT_SHA='a'.repeat(40);
 assert.equal(transport.founderVideoSourceLimit(),4_000_000);assert.throws(()=>transport.founderVideoSourceBody(bytes),/VIDEO_LARGE_SOURCE_UNVERIFIED/);
 const context={params:Promise.resolve({id:'synthetic',token:'synthetic'})},request=new Request('https://example.test/source');
 assert.equal((await route.GET(request,context)).status,404);
 process.env.FOUNDER_VIDEO_SOURCE_TRANSPORT='stream_verified_v1';process.env.FOUNDER_VIDEO_SOURCE_VERIFIED_SHA='b'.repeat(40);assert.equal(transport.founderVideoSourceLimit(),4_000_000);
 process.env.FOUNDER_VIDEO_SOURCE_VERIFIED_SHA='a'.repeat(40);assert.equal(transport.founderVideoSourceLimit(),32*1024*1024);
 const body=transport.founderVideoSourceBody(bytes),reader=body.getReader();let size=0;while(true){const next=await reader.read();if(next.done)break;assert.ok(next.value.byteLength<=65536);size+=next.value.byteLength;}assert.equal(size,bytes.length);
 const result=await route.GET(request,context);assert.equal(result.status,200);assert.equal(result.headers.get('content-length'),String(bytes.length));assert.equal(result.headers.get('content-type'),'video/mp4');assert.match(result.headers.get('cache-control'),/private, no-store/);
 const actual=Buffer.from(await result.arrayBuffer());assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
 const head=await route.HEAD(request,context);assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
 assert.throws(()=>transport.founderVideoSourceBody(new Uint8Array(32*1024*1024+1)),/VIDEO_LARGE_SOURCE_UNVERIFIED/);
 process.env.VERCEL_GIT_COMMIT_SHA='c'.repeat(40);assert.equal(transport.founderVideoSourceLimit(),4_000_000,'A different deployed commit invalidates proof');
 process.env.VERCEL_ENV='preview';assert.equal(transport.founderVideoSourceLimit(),4_000_000);
 console.log('PASS source transport: default4MB, exact-deployment gate, bounded32MB/64KiB stream, local7.5MB byte hash+Content-Length+HEAD. Not deployed/provider evidence.');
 }finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
})().catch(e=>{console.error(e);process.exitCode=1;});
