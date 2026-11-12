/* Composed local SQL/route test: no provider or hosted render calls. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {randomUUID,createHash}=require('node:crypto');
const root=process.cwd(),cache=new Map(),stubs={},afters=[];
function load(file){file=path.resolve(root,file);if(stubs[file])return stubs[file];if(cache.has(file))return cache.get(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));const m=new Module(file,module);m.filename=file;m.paths=module.paths;cache.set(file,m.exports);m.require=id=>id==='next/server'?{after:fn=>afters.push(fn)}:id.startsWith('.')?load(path.resolve(path.dirname(file),id)+(id.endsWith('.json')?'':'.ts')):require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);return m.exports;}
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite'),pg=new PGlite();let tail=Promise.resolve();
 function adapter(client){const sql=async(strings,...values)=>{const query=strings.reduce((s,p,i)=>s+p+(i<values.length?'$'+(i+1):''),'');if(query.includes('pg_advisory_xact_lock'))return [];return(await client.query(query,values)).rows;};sql.unsafe=q=>client.exec(q);sql.json=JSON.stringify;sql.begin=async fn=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;try{return await pg.transaction(tx=>fn(adapter(tx)));}finally{release();}};return sql;}
 const sql=adapter(pg);stubs[path.resolve('app/lib/affiliate-db.ts')]={db:()=>sql};stubs[path.resolve('app/lib/business-os/daily-content-review.ts')]={readContentQueue:async()=>({items:[]})};
 await pg.exec('create table os_control(id integer primary key,paused boolean not null);insert into os_control values(1,false);create table os_messages(id uuid primary key,department text not null,role text not null,body text not null,run_id uuid,created_at timestamptz default now());');
 const policy=load('app/lib/business-os/founder-native-policy.ts'),renderer=load('app/lib/business-os/founder-renderer.ts'),content=load('app/lib/business-os/founder-content.ts'),model=load('app/lib/business-os/founder-content-model.ts'),catalog=load('app/lib/business-os/founder-render-catalog.ts'),route=load('app/api/owner/founder-renderer/route.ts'),chunks=load('app/api/owner/founder-renderer/[uploadId]/chunks/route.ts');
 const setup=key=>renderer.withNativeRequestLifetime(Date.now(),()=>Reflect.apply(renderer.requestNativeRendererSetup,renderer,[key]));
 const dispatch=()=>renderer.withNativeRequestLifetime(Date.now(),()=>Reflect.apply(renderer.dispatchNativeFounderJob,renderer,[]));
 const wakePending=()=>renderer.withNativeRequestLifetime(Date.now(),()=>Reflect.apply(renderer.wakePendingOwnerRenders,renderer,[]));
 const planner=date=>renderer.withNativeRequestLifetime(Date.now(),()=>content.founderContentPlannerTick(date));
 assert.equal((await renderer.founderRendererStatus()).ready,false);assert.equal((await renderer.wakeFounderRenderer()).accepted,false);
 await assert.rejects(setup(randomUUID()),/NOT_APPROVED/);assert.equal(afters.length,0);
 Object.assign(process.env,{AI_OS_ENABLED:'true',AI_OS_OWNER_KEY:'synthetic-local-native-test-key-never-used-in-production',AI_OS_MEDIA_RENDERER_ENABLED:'true',AI_OS_MEDIA_RENDERER_MONTHLY_USD:'5',AI_OS_MEDIA_RENDERER_APPROVAL_ID:randomUUID(),VERCEL_ENV:'production',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)});
 await content.ensureFounderContentSchema();
 const crossId=randomUUID(),crossBody=JSON.stringify({claim:{job:{id:randomUUID(),leaseToken:randomUUID(),workerId:'native:'+crossId}},mode:'preflight',callbackToken:'synthetic-callback'}),crossClaim=JSON.parse(crossBody).claim.job;
 const crossToken=policy.signNativeToken({scope:'invoke',aud:policy.nativeAudience,mode:'preflight',invocationId:crossId,jobId:crossClaim.id,leaseToken:crossClaim.leaseToken,workerId:crossClaim.workerId,sha:process.env.VERCEL_GIT_COMMIT_SHA,bodySha256:policy.nativeBodyHash(crossBody)});
 const cross=require('node:child_process').spawnSync('python3',['-c',`import importlib.util,json,sys,os,io,types
p=json.load(sys.stdin)
s=importlib.util.spec_from_file_location('handler','api/founder-native-render.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.verify_invocation(p['token'],p['body'].encode(),p['key'])['workerId']==p['workerId']
try:m.verify_invocation(p['token'],b'changed',p['key']);raise AssertionError('body changed')
except ValueError:pass
assert 'render' not in sys.modules
os.environ.update(AWS_LAMBDA_FUNCTION_MEMORY_SIZE='2048',VERCEL_REGION='iad1')
calls=[]
def api(payload,*args,**kwargs):
 calls.append(payload['operation']);return {'started':False}
sys.modules['worker']=types.SimpleNamespace(api=api)
h=m.handler.__new__(m.handler);h.headers={'Content-Length':str(len(p['body'].encode())),'Content-Type':'application/json','Authorization':'Bearer '+p['token']};h.rfile=io.BytesIO(p['body'].encode());replies=[];h.reply=lambda status,value:replies.append(status);h.do_POST()
assert replies==[409] and calls==['startReservedInvocation'] and 'render' not in sys.modules and 'setup_runtime' not in sys.modules
`],{encoding:'utf8',input:JSON.stringify({token:crossToken,body:crossBody,key:process.env.AI_OS_OWNER_KEY,workerId:crossClaim.workerId})});assert.equal(cross.status,0,cross.stderr);
 const image=await require('sharp')({create:{width:1080,height:1350,channels:3,background:'#151515'}}).png().toBuffer(),sha256=createHash('sha256').update(image).digest('hex');
 let invokes=0,lastCompleted,lastClaims,lastToken,networkUnknown=false,mutateAfterClaim=false,preflightGate=null,onInvoke=null;
 async function callback(token,input,expected=200){const response=await route.POST(new Request(policy.nativeCallbackAudience,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(input)}));const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;}
 const heartbeat={operation:'workerHeartbeat',runtimeProfile:renderer.nativeRuntimeFingerprint,rendererVersion:renderer.founderRendererVersion,incrementalCostUsd:0.05,imageReady:true,videoReady:true,fullDecode:true,narration:'kokoro-v1.0-am_michael',status:'ready'};
 global.fetch=async(url,options)=>{
  assert.equal(url,policy.nativeAudience,'Only the fixed native adapter can be invoked');invokes++;if(onInvoke){onInvoke();onInvoke=null;}
  const claims=policy.verifyNativeToken(options.headers.authorization.slice(7),policy.nativeAudience),payload=JSON.parse(options.body),lease={jobId:claims.jobId,leaseToken:claims.leaseToken};lastClaims=claims;lastToken=payload.callbackToken;
  assert.equal(claims.sha,process.env.VERCEL_GIT_COMMIT_SHA);assert.equal(claims.bodySha256,policy.nativeBodyHash(options.body));
  assert.equal((await callback(payload.callbackToken,{operation:'startReservedInvocation',invocationId:claims.invocationId,...lease})).started,true);
  assert.equal((await callback(payload.callbackToken,{operation:'startReservedInvocation',invocationId:claims.invocationId,...lease})).started,false,'Durable nonce rejects duplicate heavy work');
  if(networkUnknown)throw Error('Synthetic network receipt loss');
  if(claims.mode==='preflight'){if(preflightGate)await preflightGate;
   await callback(payload.callbackToken,{operation:'claim',...lease},409);
   await callback(payload.callbackToken,{operation:'progress',...lease,stage:'Preparing',progress:1},409);
   await callback(payload.callbackToken,{...heartbeat,runtimeProfile:'f'.repeat(64)},409);
   await callback(payload.callbackToken,heartbeat);return Response.json({status:'preflight_complete'});
  }
  await callback(payload.callbackToken,{operation:'progress',...lease,leaseToken:randomUUID(),stage:'Preparing',progress:1},409);
  await callback(payload.callbackToken,{operation:'progress',...lease,stage:'Preparing',progress:1});
  // A deploy while rendering cannot broaden access, but the exact bound lease
  // and reservation may finish under its original signed identity.
  process.env.VERCEL_GIT_COMMIT_SHA='b'.repeat(40);
  await callback(payload.callbackToken,{...heartbeat,status:'working'});
  for(const role of ['media','cover']){
   const begin=await callback(payload.callbackToken,{operation:'uploadBegin',...lease,role,fileName:role+'.png',size:image.length,mimeType:'image/png',sha256});
   const response=await chunks.PUT(new Request(policy.nativeCallbackAudience+'/'+begin.upload.id+'/chunks?index=0',{method:'PUT',headers:{authorization:'Bearer '+payload.callbackToken,'content-type':'application/octet-stream','x-darth-job-id':claims.jobId,'x-darth-lease-token':claims.leaseToken},body:image}),{params:Promise.resolve({uploadId:begin.upload.id})});assert.equal(response.status,200,await response.text());
   await callback(payload.callbackToken,{operation:'uploadComplete',...lease,uploadId:begin.upload.id,report:{fullDecode:true,creativeReview:false,sha256}});
  }
  if(mutateAfterClaim){await content.mutateFounderContent({operation:'save',requestKey:randomUUID(),item:{...payload.claim.item,expectedVersion:payload.claim.item.version,caption:'Owner edit while rendering'}});await callback(payload.callbackToken,{operation:'complete',...lease,caption:'Late copy',script:''},409);lastCompleted={status:'canceled'};return Response.json({status:'attempt_finished'});}
  lastCompleted=await callback(payload.callbackToken,{operation:'complete',...lease,caption:payload.claim.item.caption||'Synthetic private test caption',script:'',proofHash:'d'.repeat(64)});
  const replay=await callback(payload.callbackToken,{operation:'complete',...lease,caption:payload.claim.item.caption||'Synthetic private test caption',script:'',proofHash:'d'.repeat(64)});assert.equal(replay.status,lastCompleted.status);
  return Response.json({status:'attempt_finished'});
 };
 const setupKey=randomUUID();await setup(setupKey);await setup(setupKey);assert.equal(afters.length,1);assert.equal((await policy.nativeBudget()).reservedCents,5);await afters.shift();assert.equal(invokes,1);assert.equal((await renderer.founderRendererStatus()).ready,true);
 await sql`update os_founder_renderer_workers set last_seen_at=now()-interval '40 days'`;process.env.VERCEL_GIT_COMMIT_SHA='c'.repeat(40);assert.equal((await renderer.founderRendererStatus()).ready,true,'Unrelated deploy and idle time preserve this verified runtime profile');
 const lessons=catalog.founderRenderLessons;for(const lesson of lessons)assert.equal(catalog.founderRenderBrief({...lesson,type:'video',script:''}).supported,true);
 assert.equal(catalog.founderRenderBrief({...lessons[0],idea:'Different owner intent',type:'image'}).supported,false);assert.equal(catalog.founderRenderBrief({...lessons[0],script:'Different narration',type:'video'}).supported,false);
 const now=new Date(),day=model.addCalendarDays(model.founderClock(now).day,1);
 async function draft(lesson=lessons[0],patch={}){return(await content.mutateFounderContent({operation:'save',requestKey:randomUUID(),item:{day,time:'09:00',type:'image',title:lesson.title,idea:lesson.idea,script:'',caption:'',templateId:model.founderTemplates[0].id,destinations:[],mediaAssetId:null,coverAssetId:null,extra:true,...patch}},now)).item;}
 async function queue(item){return content.mutateFounderContent({operation:'generate',requestKey:randomUUID(),id:item.id,expectedVersion:item.version},now);}
 const custom=await draft(lessons[0],{idea:'Owner custom intent'});await assert.rejects(queue(custom),error=>error.code==='RENDER_SOURCE_REVIEW_REQUIRED');assert.equal((await policy.nativeBudget()).reservedCents,5,'Unsupported intent is rejected before paid reservation');
 const first=await queue(await draft());afters.length=0;assert.equal((await sql`select paused from os_founder_content_control`)[0].paused,true);
 const beforeTimingBudget=(await policy.nativeBudget()).reservedCents,beforeTimingInvokes=invokes;
 assert.equal((await renderer.withNativeRequestLifetime(Date.now()-25000,()=>renderer.wakeFounderRenderer())).accepted,false);
 assert.equal((await renderer.withNativeRequestLifetime(Date.now()-25000,()=>renderer.requestNativeRendererSetup(randomUUID()))).accepted,false);
 assert.equal((await policy.nativeBudget()).reservedCents,beforeTimingBudget);assert.equal(invokes,beforeTimingInvokes);
 const realClaim=content.claimFounderRenderJob,realNow=Date.now;
 content.claimFounderRenderJob=async input=>{const claim=await realClaim(input);Date.now=()=>realNow()+25000;return claim;};
 try{assert.equal((await dispatch()).status,'deferred');}finally{Date.now=realNow;content.claimFounderRenderJob=realClaim;}
 const deferred=(await sql`select status,attempts from os_founder_render_jobs where id=${first.item.jobId}`)[0];assert.equal(deferred.status,'queued');assert.equal(deferred.attempts,0);assert.equal((await policy.nativeBudget()).reservedCents,beforeTimingBudget);
 let finishLegacy;let legacyFinished=false;const legacyWork=new Promise(resolve=>{finishLegacy=()=>{legacyFinished=true;resolve();};});const invokedWhileLegacyPending=new Promise(resolve=>{onInvoke=resolve;});
 assert.equal((await wakePending()).accepted,true,'Only queued owner work is picked up while the agent is Off');assert.equal(afters.length,1);assert.ok(afters[0] instanceof Promise,'after receives an already-started Promise');await invokedWhileLegacyPending;assert.equal(legacyFinished,false,'Invocation starts before unrelated legacy work returns');finishLegacy();await legacyWork;await afters.shift();assert.equal(lastCompleted.status,'completed');assert.equal(lastCompleted.item.status,'checking');assert.equal(lastCompleted.item.deliveries.length,0);assert.equal((await policy.nativeBudget()).reservedCents,10);
 assert.equal((await sql`select status from os_founder_render_jobs where id=${first.item.jobId}`)[0].status,'completed');
 const assetRoute=load('app/api/owner/founder-media/[id]/route.ts'),ctx={params:Promise.resolve({id:lastCompleted.item.mediaAssetId})};assert.equal((await assetRoute.GET(new Request('https://www.darthalgo.com',{headers:{authorization:'Bearer '+lastToken}}),ctx)).status,401,'Worker token never grants owner library access');
 await callback(lastToken,{operation:'progress',jobId:lastClaims.jobId,leaseToken:lastClaims.leaseToken,stage:'Uploading',progress:70},409,'Ended lease cannot mutate');
 mutateAfterClaim=true;await queue(await draft(lessons[1]));afters.length=0;assert.equal((await dispatch()).status,'held');assert.equal(lastCompleted.status,'canceled','Owner edits win over late rendered files');mutateAfterClaim=false;
 // A profile mismatch keeps user intent On and queues one bounded paid setup
 // for this profile/month. Repeated cron retries cannot buy repeated checks.
 let releasePreflight;preflightGate=new Promise(resolve=>{releasePreflight=resolve;});
 await sql`update os_founder_renderer_workers set report=jsonb_set(report,'{runtimeProfile}','"old-profile"'::jsonb)`;await sql`update os_founder_content_control set paused=false where id=1`;
 assert.equal((await planner(now)).status,'blocked');assert.equal((await planner(now)).status,'blocked');assert.equal((await sql`select paused from os_founder_content_control`)[0].paused,false);assert.equal(afters.length,1);const beforeSetup=invokes;releasePreflight();await afters.shift();preflightGate=null;assert.equal(invokes,beforeSetup);assert.equal((await renderer.founderRendererStatus()).ready,true);
 await sql`update os_founder_content_control set paused=true where id=1`;
 await queue(await draft(lessons[2]));afters.length=0;networkUnknown=true;assert.equal((await dispatch()).status,'held');networkUnknown=false;assert.equal((await renderer.founderRendererStatus()).ready,false);assert.equal((await sql`select count(*)::int n from os_founder_render_jobs where status='blocked'`)[0].n,1);const countAfterLoss=invokes;await dispatch();assert.equal(invokes,countAfterLoss,'Ambiguous outcome cannot trigger duplicate heavy work');
 await setup(randomUUID());await afters.shift();
 // Fill the real ledger to 99 reservations, then race two eligible dispatches.
 while((await policy.nativeBudget()).reservedCents<495)await policy.reserveNativeAttempt({invocationId:randomUUID(),requestKey:randomUUID(),jobId:randomUUID(),leaseToken:randomUUID(),contentVersion:0,sha:process.env.VERCEL_GIT_COMMIT_SHA,mode:'preflight'});
 const jobs=[await queue(await draft(lessons[3])),await queue(await draft(lessons[4]))];afters.length=0;const beforeRace=invokes;await Promise.all([dispatch(),dispatch()]);assert.equal((await policy.nativeBudget()).reservedCents,500);assert.equal(invokes,beforeRace+1,'The 101st reservation never invokes hosting');
 const states=await sql`select status,error from os_founder_render_jobs where id in (${jobs[0].item.jobId},${jobs[1].item.jobId})`;assert.ok(states.every(row=>['completed','failed','queued'].includes(row.status)));assert.equal(states.filter(row=>row.status==='running').length,0,'A losing claim is durably released or held');
 await assert.rejects(policy.reserveNativeAttempt({invocationId:randomUUID(),requestKey:randomUUID(),jobId:randomUUID(),leaseToken:randomUUID(),contentVersion:0,sha:process.env.VERCEL_GIT_COMMIT_SHA,mode:'preflight'}),/BUDGET_EXHAUSTED/);
 // Controlled fixture: another connection check takes the last allowance
 // after a real claim but before its reservation. Never strand that claim.
 await sql`delete from os_founder_render_cost_reservations where id=(select id from os_founder_render_cost_reservations where mode='preflight' and status='reserved' and request_key not like 'setup-%' limit 1)`;
 const originalClaim=content.claimFounderRenderJob;let racedClaim;
 content.claimFounderRenderJob=async input=>{const claim=await originalClaim(input);if(claim){racedClaim=claim;await policy.reserveNativeAttempt({invocationId:randomUUID(),requestKey:randomUUID(),jobId:randomUUID(),leaseToken:randomUUID(),contentVersion:0,sha:process.env.VERCEL_GIT_COMMIT_SHA,mode:'preflight'});}return claim;};
 const beforeReserveLoss=invokes;assert.equal((await dispatch()).status,'held');content.claimFounderRenderJob=originalClaim;
 assert.ok(racedClaim);assert.equal(invokes,beforeReserveLoss);assert.equal((await sql`select status from os_founder_render_jobs where id=${racedClaim.job.id}`)[0].status,'failed');assert.equal((await policy.nativeBudget()).reservedCents,500);
 const disabledInvokes=invokes;delete process.env.AI_OS_MEDIA_RENDERER_ENABLED;assert.equal((await renderer.wakeFounderRenderer()).accepted,false);assert.equal(invokes,disabledInvokes);
 await pg.close();console.log('PASS native activation: disabled gate, exact paid reservations, nonce/scoped callbacks, verified private bytes, completed replay and owner-edit cancellation, owner-Off recovery, source checks, deploy/idle continuity, bounded recheck, ambiguous outcomes, request-lifetime deferral/immediate dispatch, and final allowance race.');
})().catch(error=>{console.error(error);process.exitCode=1;});
