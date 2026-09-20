const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {randomUUID}=require('node:crypto');
const base=path.resolve('app/lib/business-os');
const cache=new Map(),stubs={};
function load(name){if(cache.has(name))return cache.get(name);const filename=path.join(base,name+'.ts'),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
 mod.require=(id)=>{if(stubs[id])return stubs[id];if(id.startsWith('./'))return load(id.slice(2));return require(id);};
 cache.set(name,mod.exports);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);cache.set(name,mod.exports);return mod.exports;}
const policy=load('indicator-policy');
const pine='//@version=6\nindicator("Darth Algo Test", overlay=true)\nx=ta.sma(close,20)\nsignal=barstate.isconfirmed and ta.crossover(close,x)\nplot(x)\nalertcondition(signal,"Cross","Closed bar crossed")';
const candidate={name:'Darth Algo Test',purpose:'A closed bar trend context indicator.',differentiation:'Tests a fresh design rather than copying any proprietary source code.',audience:'Traders who want clearly confirmed signals and readable charts.',pine,sourceUrls:['https://www.tradingview.com/scripts/','https://www.youtube.com/watch?v=abcdefghijk'],demand:'Two observed public sources suggest interest; this is a demand hypothesis.',pricingRationale:'Free until differentiated usefulness is validated with actual traders.',tier:'free',monthlyPriceUsd:0};
assert.equal(policy.pineChecks(pine).passed,true);
for(const bad of [pine+'\nx=request.security("X","D",close)',pine+'\nplot(close,offset=-1)',pine.replace('//@version=6','//@version=5')])assert.equal(policy.pineChecks(bad).passed,false);
assert.equal(policy.pineLogicHash(pine),policy.pineLogicHash(pine.replace('Darth Algo Test','Another Name')));
assert.throws(()=>policy.validateIndicator({...candidate,sourceUrls:['https://unobserved.example','https://elsewhere.example']},candidate.sourceUrls));
assert.throws(()=>policy.validateIndicator({...candidate,tier:'free',monthlyPriceUsd:10},candidate.sourceUrls));
assert.equal(policy.validTradingViewRelease('https://www.tradingview.com/script/Abcd-Test/'),true);
assert.equal(policy.validTradingViewRelease('https://www.tradingview.com.evil.com/script/Test/'),false);
async function main(){
 const pglite=process.env.OS_TEST_PGLITE_MODULE;if(!pglite)throw Error('OS_TEST_PGLITE_MODULE required');
 const {PGlite}=await import(require('node:url').pathToFileURL(pglite).href),pg=new PGlite();
 function adapter(client){const sql=async (strings,...values)=>{
   const query=strings.reduce((s,x,i)=>s+x+(i<values.length?'$'+(i+1):''),'');
   if(query.includes('pg_advisory_xact_lock'))return [];
   return (await client.query(query,values)).rows;};sql.json=JSON.stringify;sql.unsafe=q=>client.exec(q);sql.begin=fn=>client.transaction(tx=>fn(adapter(tx)));return sql;}
 const sql=adapter(pg),cards=[],notices=[];
 stubs['../affiliate-db']={db:()=>sql};
 stubs['./delivery']={queueApprovalNotice:async id=>{cards.push(id);await sql`insert into os_outbox(id,dedupe_key,body) values(${randomUUID()},${'approval:'+id+':0'},'card') on conflict do nothing`;},queueOwnerNotice:async (...v)=>notices.push(v)};
 stubs['./jobs']={queueJob:async (department,message,key)=>{await sql`insert into os_jobs(id,request_key,department,message,source) values(${randomUUID()},${key},${department},${message},'schedule') on conflict do nothing`;}};
 await pg.exec(fs.readFileSync(path.join(base,'schema.ts'),'utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
 const research=load('indicator-research');
 const extracted=research.extractPublicMetadata('<title>Public</title><script>SECRET_CODE</script><pre>PROPRIETARY</pre><h2>Demand</h2>','https://www.tradingview.com/scripts/');
 assert.equal(JSON.stringify(extracted).includes('SECRET_CODE'),false);assert.equal(JSON.stringify(extracted).includes('PROPRIETARY'),false);
 const lab=load('indicator-lab');await lab.ensureIndicatorSchema();await lab.ensureIndicatorSchema();
 Object.assign(process.env,{AI_OS_INDICATOR_LAB_ENABLED:'true',AI_OS_ENABLED:'true',VERCEL_ENV:'production',AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'true'});
 const snapshot=[{id:'indicator_market',status:'verified',data:{sources:candidate.sourceUrls.map(url=>({url,status:'verified'}))}}];
 async function output(c= candidate){const id=randomUUID();await sql`insert into os_runs(id,request_key,status,result,snapshot) values(${id},${id},'completed',${JSON.stringify({indicatorCandidate:c})},${JSON.stringify(snapshot)})`;await sql`insert into os_jobs(id,request_key,department,message,source,status,run_id) values(${randomUUID()},${'indicator:fixture:'+id},'research','lab','schedule','succeeded',${id})`;return id;}
 await output();await lab.syncIndicatorLab();await lab.syncIndicatorLab();
 const [row]=await sql`select * from os_indicator_candidates`;assert.equal(row.status,'qa_blocked');assert.equal(cards.length,0);
 const packages=load('indicator-package');
 const education={title:'How to use this indicator',body:'This educational example explains the opening range, closed-bar trigger, and how to interpret the chart without assuming future profits.',example:'On the captured chart, the close returns inside the opening range after the first upside breakout.',invalidation:'If price does not return within the configured window, the setup is not flagged.',instructionImageUrl:'https://www.darthalgo.com/images/indicator-example.png',imageSha256:'a'.repeat(64),verifiedExample:true};
 await assert.rejects(packages.prepareIndicatorPackage(row.id,row.source_hash,education));

 const privatePreview={chartUrl:'https://www.tradingview.com/chart/Private123/',screenshotUrl:'https://www.tradingview.com/x/Shot123/',compiled:true,replay:true,reopened:true,notes:'Compiled and replayed two symbols and three timeframes; saved chart reopened with the indicator.'};
 for(const bad of [{...privatePreview,chartUrl:'https://www.tradingview.com/chart/'},{...privatePreview,chartUrl:'https://www.tradingview.com.evil.com/chart/Bad/'},{...privatePreview,chartUrl:'https://www.tradingview.com/chart/Private123/?token=secret'},{...privatePreview,screenshotUrl:'javascript:alert(1)'},{...privatePreview,reopened:false},{...privatePreview,compiled:false}])await assert.rejects(lab.recordPrivateIndicatorPreview(row.id,row.source_hash,bad));
 await assert.rejects(lab.recordPrivateIndicatorPreview(row.id,'0'.repeat(64),privatePreview));
 await lab.recordPrivateIndicatorPreview(row.id,row.source_hash,privatePreview);
 const [savedPreview]=await sql`select private_preview,status,tradingview_url from os_indicator_candidates where id=${row.id}`;
 assert.equal(policy.validPrivatePreview(savedPreview.private_preview,row.source_hash),true);
 assert.equal(policy.validPrivatePreview(savedPreview.private_preview,'0'.repeat(64)),false);
 assert.equal(savedPreview.status,'qa_blocked');assert.equal(savedPreview.tradingview_url,null);
 await assert.rejects(packages.prepareIndicatorPackage(row.id,row.source_hash,{...education,verifiedExample:false}));
 await packages.prepareIndicatorPackage(row.id,row.source_hash,education);
 await packages.prepareIndicatorPackage(row.id,row.source_hash,education);
 const [ready]=await sql`select * from os_indicator_candidates where id=${row.id}`;
 row.approval_id=ready.approval_id;assert.equal(ready.status,'pending');assert.equal((await sql`select * from os_approvals`).length,1);
 await sql`update os_indicator_candidates set status='declined' where id=${row.id}`;
 await assert.rejects(lab.recordPrivateIndicatorPreview(row.id,row.source_hash,privatePreview));
 await sql`update os_indicator_candidates set status='pending' where id=${row.id}`;
 await output({...candidate,name:'Darth Algo Renamed',pine:pine.replace('Darth Algo Test','Darth Algo Renamed')});await lab.syncIndicatorLab();assert.equal((await sql`select * from os_indicator_candidates`).length,1);
 const checks={compiled:true,replay:true,notes:'Verified two symbols and three timeframes with closed-bar alert replay.',screenshotUrl:'https://www.tradingview.com/x/Abcd123/',educationUrl:'https://www.tradingview.com/chart/AAPL/Abcd-Educational-example/',packageHash:ready.release_package.hash};
 await assert.rejects(lab.recordIndicatorRelease(row.id,row.source_hash,'https://www.tradingview.com/script/Abcd-Test/',checks));
 const [approval]=await sql`select * from os_approvals where id=${row.approval_id}`;
 await assert.rejects(sql.begin(tx=>packages.queueApprovedIndicator(tx,row.approval_id,{...approval.payload,packageHash:'0'.repeat(64)})));
 await sql.begin(tx=>packages.queueApprovedIndicator(tx,row.approval_id,approval.payload));
 await sql.begin(tx=>packages.queueApprovedIndicator(tx,row.approval_id,approval.payload));
 assert.equal((await sql`select * from os_indicator_publications`).length,1);
 await sql`update os_approvals set status='approved' where id=${row.approval_id}`;
 await assert.rejects(lab.recordIndicatorRelease(row.id,'0'.repeat(64),'https://www.tradingview.com/script/Abcd-Test/',checks));
 await assert.rejects(lab.recordIndicatorRelease(row.id,row.source_hash,'https://www.tradingview.com/script/Abcd-Test/',{...checks,replay:false}));
 await assert.rejects(lab.recordIndicatorRelease(row.id,row.source_hash,'https://www.tradingview.com/script/Abcd-Test/',{...checks,packageHash:'0'.repeat(64)}));
 await lab.recordIndicatorRelease(row.id,row.source_hash,'https://www.tradingview.com/script/Abcd-Test/',checks);
 await lab.recordIndicatorRelease(row.id,row.source_hash,'https://www.tradingview.com/script/Abcd-Test/',checks);
 assert.equal((await sql`select * from os_activity where event='indicator_released'`).length,1);
 assert.equal((await sql`select status from os_indicator_publications`)[0].status,'completed');
 assert.match(await lab.indicatorDashboard(),/Research → Growth → Indicator Builder/);
 await sql`update os_control set paused=true`;process.env.AI_OS_AI_ENABLED='true';assert.equal((await lab.syncIndicatorLab()).status,'paused');
 await sql`update os_control set paused=false`;process.env.AI_OS_INDICATORS_PER_DAY='2';
 for(let i=0;i<6;i++){await lab.syncIndicatorLab();
 for(const job of await sql`select * from os_jobs where status='queued' and request_key like 'indicator-ideas:%'`){const rid=randomUUID();await sql`insert into os_runs(id,request_key,status,result,snapshot) values(${rid},${rid},'completed',${JSON.stringify({brief:'A source-backed original indicator idea for the next stage.'})},${JSON.stringify(snapshot)})`;await sql`update os_jobs set run_id=${rid} where id=${job.id}`;}
 await sql`update os_jobs set status='succeeded' where status='queued'`;} 
 const stages=await sql`select department,request_key from os_jobs where request_key like 'indicator-ideas:%' order by created_at`;assert.deepEqual(stages.map(r=>r.department),['research','growth']);
 assert.equal((await sql`select * from os_jobs where message like '[INDICATOR_LAB]%'`).length,2);
 await pg.close();console.log('PASS: static screening, source provenance, no code ingestion, idempotent schema/handoff/cards, duplicate logic, daily cap, pause, approval/hash/replay gates and release replay.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
