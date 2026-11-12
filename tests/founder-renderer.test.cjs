const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {generateKeyPairSync,sign,randomUUID}=require('node:crypto');
const root=process.cwd(),cache=new Map(),stubs={};
function load(filename){filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename);const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;cache.set(filename,m.exports);m.require=id=>stubs[id]||(id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);cache.set(filename,m.exports);return m.exports;}

(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite'),pg=new PGlite();
 const sql=async(parts,...values)=>(await pg.query(parts.reduce((s,p,i)=>s+p+(i<values.length?'$'+(i+1):''),''),values)).rows;
 stubs['../affiliate-db']={db:()=>sql};
 const runtime=load('app/lib/business-os/founder-renderer.ts'),auth=load('app/lib/business-os/founder-renderer-auth.ts');
 assert.equal((await runtime.founderRendererStatus()).ready,false);
 assert.equal((await runtime.founderRendererStatus()).incrementalCostUsd,null);
 assert.equal((await runtime.wakeFounderRenderer()).accepted,false);
 await assert.rejects(runtime.recordFounderRendererHeartbeat({workerId:'x'},{rendererVersion:runtime.founderRendererVersion}),/HOST_NOT_VERIFIED/);
 await assert.rejects(auth.authenticateFounderRenderer(new Request('https://www.darthalgo.com/api/owner/founder-renderer',{headers:{authorization:'Bearer fake'}})),/UNAUTHORIZED/);

 // The dormant OIDC verifier stays tightly bound while production is disabled.
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),key={...publicKey.export({format:'jwk'}),kid:'test',alg:'RS256'},sha='a'.repeat(40),now=Date.now(),seconds=Math.floor(now/1000),t=auth.founderRendererTrust;
 const claims={iss:t.issuer,aud:t.audience,repository:t.repository,repository_id:t.repositoryId,repository_owner_id:t.ownerId,ref:t.ref,ref_type:'branch',repository_visibility:'public',runner_environment:'github-hosted',workflow_ref:t.workflow,workflow_sha:sha,sha,event_name:'schedule',run_id:'123',run_attempt:'1',iat:seconds,nbf:seconds,exp:seconds+300};
 const token=(c,h={alg:'RS256',typ:'JWT',kid:'test'})=>{const data=Buffer.from(JSON.stringify(h)).toString('base64url')+'.'+Buffer.from(JSON.stringify(c)).toString('base64url');return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');};
 assert.equal(auth.verifyFounderRendererJwt(token(claims),[key],sha,now).workerId,'github:123:1');
 for(const patch of [{aud:'owner'},{repository_id:'1'},{repository_owner_id:'1'},{ref:'refs/pull/1/merge'},{event_name:'pull_request'},{repository_visibility:'private'},{runner_environment:'self-hosted'},{workflow_ref:t.workflow.replace('founder-renderer','other')},{workflow_sha:'b'.repeat(40)},{sha:'b'.repeat(40)},{exp:seconds-1},{iat:seconds-1000},{nbf:seconds+120}])assert.throws(()=>auth.verifyFounderRendererJwt(token({...claims,...patch}),[key],sha,now),/UNAUTHORIZED/);
 assert.throws(()=>auth.verifyFounderRendererJwt(token(claims,{alg:'none',typ:'JWT',kid:'test'}),[key],sha,now),/UNAUTHORIZED/);
 assert.throws(()=>auth.verifyFounderRendererJwt(token(claims),[key],'',now),/UNAUTHORIZED/);

 await pg.exec('create table os_founder_render_jobs(id uuid primary key,lease_token uuid,worker_id text,status text);create table os_founder_renderer_uploads(upload_id uuid,job_id uuid,lease_token uuid,worker_id text,role text,asset_id uuid);');
 const lease={jobId:randomUUID(),leaseToken:randomUUID()},identity={workerId:'github:123:1'},other={workerId:'github:999:1'},media=randomUUID(),cover=randomUUID();let live=true,completedCalls=0;
 await pg.query('insert into os_founder_render_jobs values($1,$2,$3,$4)',[lease.jobId,lease.leaseToken,identity.workerId,'running']);
 for(const [role,id] of [['media',media],['cover',cover]])await pg.query('insert into os_founder_renderer_uploads values($1,$2,$3,$4,$5,$6)',[randomUUID(),lease.jobId,lease.leaseToken,identity.workerId,role,id]);
 stubs['./founder-content']={assertFounderRenderLease:async key=>{if(!live||key.leaseToken!==lease.leaseToken)throw Error('LEASE_LOST');return {job:{workerId:identity.workerId},item:{type:'video'}};},completeFounderRenderJob:async input=>{assert.equal(input.mediaAssetId,media);assert.equal(input.coverAssetId,cover);completedCalls++;return {status:'completed'};}};
 const transport=load('app/lib/business-os/founder-renderer-transport.ts');
 await assert.rejects(transport.ownedRendererLease(other,lease),/LEASE_LOST/);
 await assert.rejects(transport.ownedRendererAttempt(other,lease),/LEASE_LOST/);
 assert.equal((await transport.completeRendererJob(identity,{...lease,mediaAssetId:randomUUID()})).status,'completed'); // arbitrary incoming IDs ignored
 live=false;await pg.query('update os_founder_render_jobs set status=$1 where id=$2',['completed',lease.jobId]);
 assert.equal((await transport.completeRendererJob(identity,lease)).status,'completed');assert.equal(completedCalls,2); // terminal receipt replay reaches backend
 await assert.rejects(transport.ownedRendererLease(identity,lease),/LEASE_LOST/); // no terminal upload/progress
 assert.deepEqual(await transport.ownedRendererAttempt(identity,lease),lease); // terminal failure can reach backend replay branch
 await assert.rejects(transport.completeRendererJob(identity,{...lease,leaseToken:randomUUID()}),/LEASE_LOST/);
 await assert.rejects(transport.readRendererBody(new Request('https://example.test',{method:'POST',body:'x'.repeat(100)}),30),/REQUEST_TOO_LARGE/);
 assert.equal((await transport.readRendererBody(new Request('https://example.test',{method:'POST',body:'ok'}),30)).toString(),'ok');
 const route=load('app/api/owner/founder-renderer/route.ts');
 assert.equal((await route.POST(new Request('https://www.darthalgo.com/api/owner/founder-renderer',{method:'POST',headers:{authorization:'Bearer '+token(claims),'content-type':'application/json'},body:'{"operation":"claim"}'}))).status,401);
 await pg.close();console.log('Founder renderer disabled-host, identity, body limits, and terminal replay tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
