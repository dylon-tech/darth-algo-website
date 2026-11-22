const assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]||require(n),Date,Number,JSON,console,Promise});return exports;}
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE||'@electric-sql/pglite');const database=new PGlite();
 const makeSql=executor=>{const sql=async(parts,...values)=>{const query=parts.reduce((all,part,index)=>all+(index?'$'+index:'')+part,'');if(query.includes('pg_advisory_xact_lock'))return [];return(await executor.query(query,values)).rows;};sql.begin=callback=>database.transaction(tx=>callback(makeSql(tx)));return sql;};
 const sql=makeSql(database);
 // Exact pre-migration source table with its generated CHECK name.
 await database.exec(`create table os_subscription_activation (
 checkout_session_id text primary key, subscription_id text not null unique,
 customer_id text, stripe_event_id text not null, product_id text not null, price_id text not null,
 plan_name text not null check(plan_name in ('Swing','Scalper','Pro')), tradingview_username text,
 amount_paid_cents integer not null check(amount_paid_cents > 0),currency text not null,
 status text not null default 'access_unverified' check(status in ('access_unverified','username_review','subscription_review','canceled','access_verified')),
 created_at timestamptz not null default now(),last_checked_at timestamptz,access_verified_at timestamptz);
 insert into os_subscription_activation values ('cs_existing','sub_existing','cus_fixture','evt_existing','prod_fixture','price_fixture','Pro','fixture_user',2900,'usd','access_verified',now(),null,'2026-11-01T00:00:00Z');`);
 let subscription={id:'sub_trial',customer:'cus_fixture',livemode:true,status:'trialing',trial_start:1793696797,trial_end:1793869597};
 let lines={has_more:false,data:[{quantity:1,price:{id:'price_1TyfRJLAuZzjYekvDZhVu7GD',product:'prod_UycgwPt0RlecEZ'}}]};
 let reads=0;const provider={checkout:{sessions:{listLineItems:async()=>{reads++;return lines;}}},subscriptions:{retrieve:async()=>subscription}};
 const imports={'./affiliate-db':{db:()=>sql},'./stripe':{stripe:()=>provider},'./subscription-activation-policy':load('app/lib/subscription-activation-policy.ts')};
 let activation=load('app/lib/subscription-activation.ts',imports);
 const session={id:'cs_trial',subscription:'sub_trial',customer:'cus_fixture',livemode:true,mode:'subscription',status:'complete',payment_status:'paid',amount_total:0,currency:'usd',custom_fields:[{key:'tradingviewusername',type:'text',text:{value:'fixture_user'}}]};
 const event=(change={})=>({id:'evt_trial',livemode:true,type:'checkout.session.completed',data:{object:{...session,...change}}});
 const rows=()=>sql`select * from os_subscription_activation order by checkout_session_id`;
 try{
 await activation.captureSubscriptionActivation(event());let data=await rows();assert.equal(data.length,2);
 assert.equal(data[0].status,'access_verified');assert.equal(data[0].amount_paid_cents,2900);assert.equal(data[0].evidence_kind,'paid_checkout');assert.equal(data[0].access_verified_at.toISOString(),'2026-11-01T00:00:00.000Z');
 assert.equal(data[1].evidence_kind,'trial_checkout');assert.equal(data[1].amount_paid_cents,0);assert.equal(data[1].status,'access_unverified');assert.equal(data[1].trial_ends_at.toISOString(),new Date(subscription.trial_end*1000).toISOString());
 await activation.captureSubscriptionActivation(event());assert.equal((await rows()).length,2);
 activation=load('app/lib/subscription-activation.ts',imports);await activation.ensureSubscriptionActivationSchema();assert.equal((await rows()).length,2,'cold-start migration is repeatable');
 await assert.rejects(sql`update os_subscription_activation set amount_paid_cents=1 where evidence_kind='trial_checkout'`,/check constraint/);
 await assert.rejects(sql`update os_subscription_activation set amount_paid_cents=0 where evidence_kind='paid_checkout'`,/check constraint/);
 await activation.captureSubscriptionActivation({livemode:true,type:'customer.subscription.deleted',data:{object:subscription}});
 await activation.captureSubscriptionActivation(event());assert.equal((await rows())[1].status,'canceled','late checkout cannot undo cancellation');
 subscription={...subscription,id:'sub_no_payment'};await activation.captureSubscriptionActivation(event({id:'cs_no_payment',subscription:subscription.id,payment_status:'no_payment_required',custom_fields:[]}));
 assert.equal((await sql`select status from os_subscription_activation where checkout_session_id='cs_no_payment'`)[0].status,'username_review');
 subscription={...subscription,id:'sub_paid',status:'active'};await activation.captureSubscriptionActivation(event({id:'cs_paid',subscription:subscription.id,amount_total:1499}));
 assert.equal((await sql`select amount_paid_cents from os_subscription_activation where checkout_session_id='cs_paid'`)[0].amount_paid_cents,1499);
 const before=(await rows()).length;
 for(const status of ['active','past_due','canceled','paused']){subscription={...subscription,id:'sub_'+status,status};await activation.captureSubscriptionActivation(event({id:'cs_'+status,subscription:subscription.id}));}
 assert.equal((await rows()).length,before,'historical ended/converted trial is not recreated');
 subscription={...subscription,id:'sub_guard',status:'trialing'};
 await assert.rejects(activation.captureSubscriptionActivation(event({id:'cs_guard',customer:'cus_other'})),/customer mismatch/);
 await assert.rejects(activation.captureSubscriptionActivation(event({id:'cs_guard',customer:null})),/customer mismatch/);
 lines={...lines,has_more:true};await assert.rejects(activation.captureSubscriptionActivation(event({id:'cs_guard'})),/incomplete checkout items/);lines={...lines,has_more:false};
 subscription={...subscription,livemode:false};await assert.rejects(activation.captureSubscriptionActivation(event({id:'cs_guard'})),/not a live subscription/);
 const previousReads=reads;await activation.captureSubscriptionActivation({...event(),livemode:false});await activation.captureSubscriptionActivation({...event(),type:'invoice.paid'});await activation.captureSubscriptionActivation(event({status:'open'}));assert.equal(reads,previousReads);
 assert.equal((await rows()).length,before);assert.equal((await activation.subscriptionActivationSnapshot()).autoGrantedTradingViewAccess,false);
 await sql`drop table os_subscription_activation`;activation=load('app/lib/subscription-activation.ts',imports);await activation.ensureSubscriptionActivationSchema();assert.equal((await rows()).length,0,'fresh installations use the migrated schema');
 console.log('PASS migration, paid evidence preservation, both Stripe zero-total trial shapes, constraints, cold starts, duplicate/cancellation ordering, identity guards, ended trials and no fabricated revenue/access.');
 }finally{await database.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
