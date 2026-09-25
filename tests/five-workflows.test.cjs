const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,overrides={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>overrides[n]||require(n),Date,URL,Buffer,console,process,setTimeout,AbortSignal});return exports;}
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE);const database=new PGlite();
 function makeSql(connection){const s=async(parts,...values)=>(await connection.query(parts.reduce((q,p,i)=>q+(i?'$'+i:'')+p,''),values)).rows;s.json=x=>JSON.stringify(x);s.unsafe=q=>connection.exec(q);s.begin=fn=>connection.transaction(tx=>fn(makeSql(tx)));return s;}
 const sql=makeSql(database);
 const policy=load('app/lib/business-os/retention-policy.ts');
 const sample={id:'sub_fixture',livemode:true,status:'past_due',customer:'cus_fixture',cancel_at_period_end:false,latest_invoice:{id:'in_fixture',status:'open',attempted:true,amount_remaining:2900,amount_paid:0,hosted_invoice_url:'https://invoice.stripe.com/i/fixture'}};
 let subscriptions=[sample],retrieved={...sample,customer:{id:'cus_fixture',deleted:false,email:'consenting-fixture@example.test'}},providerReads=0;
 const client={subscriptions:{list:async()=>({data:subscriptions,has_more:false}),retrieve:async()=>{providerReads++;return retrieved;}}};
 const dbStub={db:()=>sql},stripeStub={stripe:()=>client};
 const revenue=load('app/lib/business-os/revenue-ops.ts',{'../affiliate-db':dbStub,'../stripe':stripeStub,'./retention-policy':policy,'./support-classifier':{}});
 const review=load('app/lib/business-os/retention-review.ts',{'../affiliate-db':dbStub,'../stripe':stripeStub,'./retention-policy':policy,'./revenue-ops':revenue});
 try{
  await database.exec("create table os_activity(id bigserial primary key,actor text,event text,entity_id text,details jsonb,created_at timestamptz default now());");
  await revenue.syncRetentionOpportunities();
  let [row]=await sql`select * from os_retention_opportunities`;
  assert.equal(row.status,'open');assert.equal(row.details.workflowState,'detected');assert.equal(row.authorized_offer,null);
  const first=await review.prepareRetentionReview(row.id),again=await review.prepareRetentionReview(row.id);
  assert.equal(first.id,again.id);assert.equal(first.sent,false);assert.equal(providerReads,2,'Every draft action rechecks live payment status');
  let [draft]=await sql`select * from os_retention_reviews`;
  assert.equal(draft.state,'draft_ready');assert.equal(draft.eligibility.sendAuthorization,false);assert.equal(draft.eligibility.suppression,'unverified');
  assert.match(draft.body,/invoice.stripe.com/);assert.doesNotMatch(draft.body,/discount|access removed|guaranteed/);
  retrieved={...retrieved,status:'active'};await assert.rejects(()=>review.prepareRetentionReview(row.id),/CURRENT_PAYMENT/);
  subscriptions=[{...sample,status:'trialing',latest_invoice:{...sample.latest_invoice,status:'paid',amount_paid:0}}];
  await sql`update os_activity set created_at=now()-interval '1 hour' where event='retention_sync'`;
  const trial=await revenue.syncRetentionOpportunities();assert.equal(trial.recovered,0);assert.equal(trial.resolved,1);
  [row]=await sql`select * from os_retention_opportunities`;assert.equal(row.status,'closed');assert.equal(row.recovered_at,null);assert.equal(row.details.recoveredRevenueCents,null);
  [draft]=await sql`select * from os_retention_reviews`;assert.equal(draft.state,'resolved');
  subscriptions=[{...sample,id:'sub_cancelled',status:'canceled'}];await sql`update os_activity set created_at=now()-interval '1 hour' where event='retention_sync'`;
  await revenue.syncRetentionOpportunities();const [cancelled]=await sql`select * from os_retention_opportunities where subscription_id='sub_cancelled'`;assert.equal(cancelled.status,'closed');assert.equal(cancelled.details.workflowState,'suppressed');
  await assert.rejects(()=>review.prepareRetentionReview(cancelled.id),/CASE_NOT_ELIGIBLE/);
  assert.equal(policy.paymentReminderDraft({...sample,cancel_at_period_end:true},'test@example.test'),null);
  assert.equal(policy.paymentReminderDraft({...sample,latest_invoice:{...sample.latest_invoice,attempted:false}},'test@example.test'),null);
  assert.equal(policy.safeInvoiceUrl('https://invoice.stripe.com.evil.test/i/x'),null);assert.equal(policy.safeInvoiceUrl('https://secret@invoice.stripe.com/i/x'),null);
  const op=load('app/lib/business-os/operations-model.ts');
  const delivery=load('app/lib/business-os/content-delivery.ts',{'../affiliate-db':dbStub,'./social-schedule':{},'./operations-model':op});
  const receipt={event:'buffer_publish_checked',created_at:new Date(),details:{published:true,postId:'post_fixture',externalLink:'https://www.threads.com/@fixture/post/test',checkedAt:new Date().toISOString()}};
  assert.equal(delivery.deliveryEvidence('threads',[receipt],'hash','hash',true).state,'Publication verified');
  assert.match(delivery.deliveryEvidence('threads',[receipt],'new','old').state,/version differs/);
  assert.match(delivery.deliveryEvidence('threads',[{...receipt,details:{postId:'accepted',published:false}}],'hash','hash').state,/accepted/);
  assert.match(delivery.deliveryEvidence('threads',[{...receipt,event:'buffer_publish_unknown',details:{}}],'hash','hash',true).state,/Outcome unknown/);
  assert.equal(delivery.deliveryEvidence('x',[],'hash','hash',true).state,'Held · no new send');
  assert.equal(delivery.deliveryEvidence('x',[receipt],'hash','hash').url,null,'A wrong-domain receipt cannot become a link');
  const schedule=load('app/lib/business-os/social-schedule.ts');
  for(const instant of ['2026-03-08T13:00:00Z','2026-11-01T14:00:00Z'])assert.equal(schedule.socialSchedule(new Date(instant)).open,true);
  for(const instant of ['2026-03-08T19:00:00Z','2026-11-01T20:00:00Z'])assert.equal(schedule.socialSchedule(new Date(instant)).slot,'afternoon');
  // Auth and CSRF must run before touching any private ledger or provider.
  let reads=0;const session={ownerSessionFromRequest:()=>false,sameOrigin:()=>true,privateHeaders:{'Cache-Control':'no-store'}};
  // Response is provided below via the real Node global in a separate evaluation.
  const routeExports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/owner/retention/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:routeExports,require:n=>n.endsWith('owner-session')?session:{retentionReviewSnapshot:()=>{reads++;},prepareRetentionReview:()=>{reads++;}},Response});
  assert.equal((await routeExports.GET(new Request('https://www.darthalgo.com/api/owner/retention'))).status,401);session.ownerSessionFromRequest=()=>true;session.sameOrigin=()=>false;
  assert.equal((await routeExports.POST(new Request('https://www.darthalgo.com/api/owner/retention',{method:'POST'}))).status,403);assert.equal(reads,0);
  console.log('PASS five workflows: real PostgreSQL retention transitions, immutable draft dedupe, fresh payment checks, cancellation/trial suppression, unknown receipts, exact-version readback, URL safety, DST, auth and CSRF. Providers are isolated fixtures; no email sent.');
 }finally{await database.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
