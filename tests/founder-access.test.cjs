const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {randomUUID}=require('node:crypto');
const ts=require('typescript');

(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite');
 const database=new PGlite(),now=new Date('2026-11-16T18:00:00Z');
 const makeSql=executor=>{const sql=async(parts,...values)=>{const query=parts.reduce((all,part,index)=>all+(index?'$'+index:'')+part,'');if(query.includes('pg_advisory_xact_lock'))return [];return(await executor.query(query,values)).rows;};sql.unsafe=query=>executor.exec(query);sql.json=JSON.stringify;sql.begin=callback=>database.transaction(tx=>callback(makeSql(tx)));return sql;};
 const sql=makeSql(database),coverage={subscriptions:true,invoices:true,sessions:true,charges:true,refunds:true,balances:true,allTimeAvailable:true,attributionComplete:true};
 const baseCustomer={id:'cus_accessfixture',name:'Synthetic access customer',email:'synthetic@example.test',tradingViewUsername:'Recorded_User',usernameStatus:'recorded',plans:['Swing'],status:'Recurring',subscriptions:[{id:'sub_accessfixture',plan:'Swing',status:'active',currency:'usd',amountCents:1499,cadence:'month',nextChargeAt:'2026-12-01T12:00:00Z',paidThrough:'2026-12-01T12:00:00Z',cancelAtPeriodEnd:false,cancelAt:null,billingUrl:'https://dashboard.stripe.com/subscriptions/sub_accessfixture'}],access:{expected:[{plan:'Swing',sourceId:'sub_accessfixture',expiresAt:'2026-12-01T12:00:00Z',kind:'paid'}],confirmed:'unknown',lastVerifiedAt:null,note:'Synthetic provider not read'},payments:[{id:'ch_accessfixture',at:'2026-11-01T12:00:00Z',amountCents:1499,refundedCents:0,currency:'usd',plan:'Swing',sourceUrl:'https://dashboard.stripe.com/payments/pi_accessfixture'}],billingUrl:'https://dashboard.stripe.com/customers/cus_accessfixture',identityStatus:'Synthetic Stripe customer'};
 let customer=structuredClone(baseCustomer),currentCoverage={...coverage},checkedAt=now.toISOString(),freshReads=0,readFails=false,authenticated=true,originAllowed=true;
 const cache=new Map(),root=process.cwd();
 function load(filename){filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename);if(filename.endsWith('.json'))return JSON.parse(fs.readFileSync(filename,'utf8'));const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod.require=id=>{
  if(id.endsWith('/affiliate-db'))return {db:()=>sql};
  if(id.endsWith('/founder-finance'))return {freshFounderCustomerBilling:async id=>{freshReads++;if(readFails)throw Error('private provider details must stay hidden');return{checkedAt,coverage:{...currentCoverage},customer:customer?.id===id?structuredClone(customer):null};}};
  if(id.endsWith('/owner-session'))return {ownerSessionFromRequest:()=>authenticated,sameOrigin:()=>originAllowed,privateHeaders:{'Cache-Control':'private, no-store'}};
  if(id.startsWith('.'))return load(path.resolve(path.dirname(filename),id)+(path.extname(id)?'':'.ts'));
  return require(id);
 };cache.set(filename,mod.exports);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return mod.exports;}
 const oldFetch=global.fetch;global.fetch=async()=>{throw Error('Access requests must never call a provider executor');};
 try{
  await database.exec(fs.readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
  const access=load('app/lib/business-os/founder-access.ts'),inbox=load('app/lib/business-os/founder-inbox.ts'),summary=load('app/lib/business-os/founder-inbox-summary.ts');
  const read=()=>access.readFounderAccess(customer.id,now);
  const make=async extra=>{const snapshot=await read();return{operation:'request',requestKey:randomUUID(),customerId:customer.id,expectedVersion:snapshot.version,evidenceVersion:snapshot.billing.evidenceVersion,action:'grant',targetSourceId:'sub_accessfixture',requestedUsername:'Requested_User',requestedExpiryDay:null,reason:'Synthetic owner review',...extra};};
  const count=async()=>Number((await sql`select count(*)::int n from os_founder_access_requests`)[0].n);
  let snapshot=await read();assert.equal(snapshot.version,0);assert.equal(snapshot.billing.canRequest,true);assert.equal(snapshot.provider.confirmed,false);
  const original=JSON.stringify(customer),input=await make(),beforeRead=freshReads;
  const saved=await access.mutateFounderAccess(input,now);
  assert.equal(freshReads,beforeRead+1,'Mutation independently refreshes billing; caller evidence is not trusted');
  assert.equal(saved.providerConfirmed,false);assert.equal(saved.request.state,'pending_provider_confirmation');assert.equal(saved.request.recordedUsername,'Recorded_User');assert.equal(saved.request.requestedUsername,'Requested_User');assert.equal(JSON.stringify(customer),original,'Neither Stripe facts nor recorded username is changed');
  snapshot=await read();assert.equal(snapshot.version,1);assert.equal(snapshot.requests.length,1);
  const beforeReplay=freshReads;assert.equal((await access.mutateFounderAccess(input,now)).duplicate,true);assert.equal(freshReads,beforeReplay,'An exact unknown-response replay is local and cannot execute another provider action');assert.equal(await count(),1);
  await assert.rejects(access.mutateFounderAccess({...input,reason:'Changed intent using the same key'},now),e=>e.code==='REQUEST_KEY_CONFLICT');
  const duplicate=await access.mutateFounderAccess({...input,requestKey:randomUUID(),expectedVersion:1},now);assert.equal(duplicate.duplicate,true);assert.equal((await read()).version,1,'A semantic no-op does not increment the customer version');assert.equal(await count(),1);
  await assert.rejects(access.mutateFounderAccess({...input,requestKey:randomUUID(),expectedVersion:1,reason:'Changed pending reason'},now),e=>e.code==='PENDING_REQUEST_CHANGED');
  let inboxSnapshot=await inbox.founderInbox(),item=inboxSnapshot.items.find(item=>item.id==='access:'+saved.request.id);assert(item);assert.equal(item.customerId,customer.id);assert.equal(item.sourceStatus,'pending_provider_confirmation');assert.equal(summary.inboxRecordStatus(item),'Provider confirmation pending');assert.match(item.body,/No access change has been executed/);assert.equal(item.sourceHref,'/owner?tab=customers');
  assert.equal((await inbox.founderInboxDetail(item.id)).item.body,item.body,'Inbox reads the same persisted request after a separate read');
  const stale=await make({action:'reconcile',targetSourceId:null,requestedUsername:null});
  customer.access.expected[0].expiresAt='2026-12-02T12:00:00Z';
  await assert.rejects(access.mutateFounderAccess(stale,now),e=>e.code==='EVIDENCE_CHANGED');customer=structuredClone(baseCustomer);
  const correction=await make({action:'correct_username',targetSourceId:null,requestedUsername:'Corrected_User'});
  await access.mutateFounderAccess(correction,now);
  await assert.rejects(access.mutateFounderAccess({...stale,requestKey:randomUUID()},now),e=>e.code==='VERSION_CONFLICT');
  for(const source of ['subscriptions','invoices','sessions','charges','refunds','allTimeAvailable','attributionComplete']){
   currentCoverage={...coverage,[source]:false};snapshot=await read();assert.equal(snapshot.billing.canRequest,false,source+' incomplete evidence must fail closed');
   await assert.rejects(access.mutateFounderAccess({...await make({action:'reconcile',targetSourceId:null,requestedUsername:null})},now),e=>e.code==='BILLING_REVIEW_REQUIRED');
  }
  currentCoverage={...coverage};checkedAt=new Date(now.getTime()-61000).toISOString();assert.equal((await read()).billing.canRequest,false,'Stale evidence cannot support a request');checkedAt=now.toISOString();
  for(const bad of [{providerConfirmed:true},{action:'confirmed'},{requestedUsername:'<script>alert(1)</script>'},{requestedExpiryDay:'2026-02-30'}])await assert.rejects(access.mutateFounderAccess({...await make(),...bad},now),e=>e.code==='INVALID_ACCESS_REQUEST');
  await assert.rejects(access.mutateFounderAccess(await make({action:'revoke',targetSourceId:'sub_othercustomer'}),now),/exact subscription/);
  await assert.rejects(access.mutateFounderAccess(await make({action:'extend',requestedExpiryDay:'2026-11-30'}),now),/later than/);
  customer.access.expected=[];await assert.rejects(access.mutateFounderAccess(await make(),now),e=>e.code==='ENTITLEMENT_REQUIRED');customer=structuredClone(baseCustomer);
  customer.usernameStatus='conflict';customer.tradingViewUsername=null;await assert.rejects(access.mutateFounderAccess(await make(),now),e=>e.code==='USERNAME_CONFLICT');
  const conflictCorrection=await access.mutateFounderAccess(await make({action:'correct_username',targetSourceId:null,requestedUsername:'Verified_By_Owner'}),now);assert.equal(conflictCorrection.request.recordedUsername,null);assert.equal(customer.usernameStatus,'conflict','Saving a correction request cannot falsely resolve source conflicts');
  customer=structuredClone(baseCustomer);customer.access.expected.push({plan:'Pro Lifetime',sourceId:'cs_lifetimefixture',expiresAt:null,kind:'lifetime'});customer.status='Recurring';
  snapshot=await read();assert.equal(snapshot.billing.lifetimeProtected,true,'Lifetime protection follows entitlement, not the display status or subscription cancellation');
  for(const action of ['revoke','extend'])await assert.rejects(access.mutateFounderAccess(await make({action,requestedExpiryDay:action==='extend'?'2027-01-01':null}),now),e=>e.code==='LIFETIME_PROTECTED');
  const lifetime=await access.mutateFounderAccess(await make({targetSourceId:'cs_lifetimefixture'}),now);assert.equal(lifetime.request.targetPlan,'Pro Lifetime');assert.equal(lifetime.request.requestedExpiryDay,null);assert.equal(lifetime.providerConfirmed,false);
  customer.access.expected[1].kind='review';assert.equal((await read()).billing.canRequest,false,'A partial Lifetime refund remains protected and requires review');await assert.rejects(access.mutateFounderAccess(await make({action:'revoke'}),now),e=>e.code==='BILLING_REVIEW_REQUIRED');
  customer=structuredClone(baseCustomer);snapshot=await read();
  await assert.rejects(access.mutateFounderAccess({operation:'cancel',requestKey:randomUUID(),customerId:'cus_another',expectedVersion:0,requestId:saved.request.id,requestVersion:1},now),e=>e.code==='NOT_FOUND');
  const withdrawal={operation:'cancel',requestKey:randomUUID(),customerId:customer.id,expectedVersion:snapshot.version,requestId:saved.request.id,requestVersion:1};
  readFails=true;const withdrawn=await access.mutateFounderAccess(withdrawal,now);assert.equal(withdrawn.request.state,'request_canceled','Local withdrawal does not depend on available Stripe or call a provider');assert.equal((await access.mutateFounderAccess(withdrawal,now)).duplicate,true);
  const canceledReplay=await access.mutateFounderAccess(input,now);assert.equal(canceledReplay.duplicate,true);assert.equal(canceledReplay.request.state,'request_canceled','Retrying a creation after another device withdrew it returns the current withdrawn state');
  snapshot=await read();assert.equal(snapshot.billing,null);assert.match(snapshot.billingError,/unavailable/);assert(!JSON.stringify(snapshot).includes('private provider details'));assert(snapshot.requests.length>0,'Provider failure does not hide persistent request history');
  item=(await inbox.founderInbox()).items.find(item=>item.id==='access:'+saved.request.id);assert.equal(summary.inboxRecordStatus(item),'Request withdrawn');assert.match(item.body,/No provider action was taken/);
  readFails=false;
  const route=load('app/api/owner/founder-access/route.ts');
  const request=(body,headers={'content-type':'application/json'})=>new Request('https://www.darthalgo.com/api/owner/founder-access',{method:'POST',headers,body:typeof body==='string'?body:JSON.stringify(body)});
  authenticated=false;let result=await route.GET(new Request('https://www.darthalgo.com/api/owner/founder-access?customer='+customer.id));assert.equal(result.status,401);assert.match(result.headers.get('cache-control'),/private.*no-store/);assert.equal((await route.POST(request({}))).status,401);
  authenticated=true;originAllowed=false;assert.equal((await route.POST(request({}))).status,403);originAllowed=true;
  assert.equal((await route.POST(request({},{}))).status,403);assert.equal((await route.POST(request('x'.repeat(3001)))).status,413);assert.equal((await route.POST(request('{'))).status,400);
  result=await route.GET(new Request('https://www.darthalgo.com/api/owner/founder-access?customer=checkout:guest'));assert.equal(result.status,400);
  assert.equal((await sql`select count(*)::int n from os_founder_access_requests where state not in ('pending_provider_confirmation','request_canceled')`)[0].n,0);
  assert.equal((await sql`select count(*)::int n from os_messages`)[0].n,0,'Inbox tracking does not queue outbound messages or agents');
  console.log('PASS access requests: fresh complete billing, stale evidence/version denial, durable idempotent history, requested-vs-recorded usernames, Lifetime/refund safeguards, scoped targets, unknown-provider semantics, local withdrawal, Inbox readback, owner auth and CSRF. No network mutation executed.');
 }finally{global.fetch=oldFetch;await database.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
