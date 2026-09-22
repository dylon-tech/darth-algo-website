const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
async function main(){
 const {PGlite}=await import(require('node:url').pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href),pg=new PGlite();
 function adapter(client){const sql=async(strings,...values)=>{const q=strings.reduce((s,x,i)=>s+x+(i<values.length?'$'+(i+1):''),'');if(q.includes('pg_advisory_xact_lock'))return [];return (await client.query(q,values)).rows;};sql.begin=fn=>client.transaction(tx=>fn(adapter(tx)));sql.json=x=>JSON.stringify(x);return sql;}
 const sql=adapter(pg),cache=new Map(),stubs={};let notices=[],runs=0,closes=0,releases=0,failure=null;
 const evidence={account:'Darth_Algo',sourceHash:'ac42afa13c5240d0342317c88e727ef2cf2a9bec413c7ede320523189f36578a',checks:[1,3,5,15].map(interval=>({interval,rangeHigh:'338.49',rangeLow:'335.39'})),reopened:true};
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new Module(file,module);m.paths=module.paths;m.require=id=>stubs[id]|| (id.endsWith('affiliate-db')?{db:()=>sql}:id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id));m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);cache.set(file,m.exports);return m.exports;}
 Object.assign(process.env,{AI_OS_OWNER_KEY:'x'.repeat(64),AI_OS_ENABLED:'true',AI_OS_INDICATOR_LAB_ENABLED:'true',VERCEL_ENV:'production'});
 stubs['./delivery']={queueOwnerNotice:async(key,body)=>{notices.push({key,body});}};
 stubs['playwright-core']={chromium:{connectOverCDP:async(endpoint)=>{assert.equal(endpoint,'wss://connect.browserbase.com/?safe=test');return {contexts:()=>[{grantPermissions:async()=>{},newPage:async()=>({setDefaultTimeout(){}})}],close:async()=>{closes++;}};}}};
 const actualRunner=load('app/lib/business-os/tradingview-runner.ts');
 assert.equal(actualRunner.exactSourceHash('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 for(const url of ['https://connect.browserbase.com','wss://connect.browserbase.com.evil.test','wss://user:secret@connect.browserbase.com','wss://127.0.0.1'])assert.throws(()=>actualRunner.safeBrowserEndpoint(url));
 assert.equal(actualRunner.safeBrowserEndpoint('wss://connect.us-west-2.browserbase.com/?session=x'),'wss://connect.us-west-2.browserbase.com/?session=x');
 stubs['./tradingview-runner']={...actualRunner,checkPrivateChart:async()=>{runs++;if(failure)throw Error(failure);return evidence;}};
 const hosted=load('app/lib/business-os/hosted-browser.ts');await hosted.ensureBrowserSchema();
 await pg.exec('create table os_control(id integer primary key,paused boolean);insert into os_control values(1,false)');
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 global.fetch=async(url,init)=>{if(init.method==='POST'){releases++;return Response.json({status:'COMPLETED'});}return Response.json({id,contextId:hosted.contextId,projectId:hosted.projectId,status:releases?'COMPLETED':'RUNNING',connectUrl:'wss://connect.browserbase.com/?safe=test'});};
 const worker=load('app/lib/business-os/hosted-checks.ts');
 await assert.rejects(worker.queueHostedCheck(),/Connect Browserbase/);
 await sql`update os_browser_connection set secret=${hosted.sealBrowserKey('test-private-key')},session_id=${id},hold_until=now()+interval '15 minutes',attempts=2 where id=1`;
 assert.equal((await worker.queueHostedCheck()).queued,true);assert.equal((await worker.queueHostedCheck()).queued,false);
 await sql`update os_control set paused=true`;assert.equal((await worker.runHostedChecks()).status,'paused');assert.equal(runs,0);
 await sql`update os_control set paused=false`;
 const result=await worker.runHostedChecks();assert.equal(result.status,'checked');assert.equal(result.published,false);assert.equal(runs,1);assert.equal(closes,1);assert.equal(releases,1);
 assert.equal((await worker.runHostedChecks()).status,'idle');assert.equal(runs,1);assert.equal((await hosted.browserStatus()).tradingViewVerified,true);
 const [saved]=await sql`select * from os_browser_checks`;assert.equal(saved.status,'checked');assert.deepEqual(saved.evidence.checks,evidence.checks);assert(!JSON.stringify(saved).includes('test-private-key'));
 // Explicit owner retry can reverify; simultaneous duplicate queue attempts collapse.
 releases=0;await sql`update os_browser_connection set hold_until=now()+interval '15 minutes',attempts=3`;
 assert.equal((await worker.queueHostedCheck()).queued,true);assert.equal((await worker.queueHostedCheck()).queued,false);
 failure='TRADINGVIEW_LOGIN_REQUIRED';assert.equal((await worker.runHostedChecks()).code,'TRADINGVIEW_LOGIN_REQUIRED');assert.equal((await hosted.browserStatus()).tradingViewVerified,false);
 assert.equal((await sql`select status from os_browser_checks`)[0].status,'blocked');assert.equal((await worker.runHostedChecks()).status,'idle');assert(notices.some(n=>n.body.includes('sign-in')));
 // Unknown failures are masked; provider text/credentials must not enter logs/notices.
 assert.equal(worker.checkError(Error('secret-key-provider-error')),'PRIVATE_BROWSER_CHECK_FAILED');
 await sql`update os_browser_checks set status='running',started_at=now()-interval '6 minutes'`;
 assert.equal((await worker.runHostedChecks()).status,'idle');assert.equal((await sql`select error_code from os_browser_checks`)[0].error_code,'CHECK_INTERRUPTED');
 // Exhausted allowance cannot silently create another session after a queued session expires.
 releases=0;await sql`update os_browser_connection set hold_until=now()+interval '15 minutes'`;
 await worker.queueHostedCheck();await sql`update os_browser_connection set hold_until=now()-interval '1 minute'`;
 assert.equal((await worker.runHostedChecks()).code,'HOSTED_SESSION_REQUIRED');assert.equal(runs,2);
 const route=load('app/api/cron/indicator-browser/route.ts');assert.equal((await route.GET(new Request('https://www.darthalgo.com/api/cron/indicator-browser'))).status,401);
 await pg.close();console.log('PASS: durable private check queue, duplicates, pause, exact-source evidence, masked failures, login loss, interrupted jobs, session allowance and cron authentication. Browser interactions mocked; not live QA.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
