const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
async function main(){
 const {PGlite}=await import(require('node:url').pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href),pg=new PGlite();
 function adapter(client){const sql=async(strings,...values)=>{const q=strings.reduce((s,x,i)=>s+x+(i<values.length?'$'+(i+1):''),'');if(q.includes('pg_advisory_xact_lock'))return [];return (await client.query(q,values)).rows;};sql.begin=fn=>client.transaction(tx=>fn(adapter(tx)));return sql;}
 const sql=adapter(pg),cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m=new Module(file,module);m.paths=module.paths;m.require=id=>id.endsWith('affiliate-db')?{db:()=>sql}:id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);cache.set(file,m.exports);return m.exports;}
 Object.assign(process.env,{AI_OS_OWNER_KEY:'x'.repeat(64),AI_OS_ENABLED:'true',VERCEL_ENV:'production'});
 const b=load('app/lib/business-os/hosted-browser.ts');let creates=0,stops=0,mismatch=false,ambiguous=false;const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 global.fetch=async(url,init)=>{assert.equal(init.redirect,'error');assert.equal(init.headers['X-BB-API-Key'],'private-browser-key');const p=new URL(url).pathname;
 if(p.includes('/contexts/'))return Response.json({id:b.contextId,projectId:b.projectId});
 if(p==='/v1/sessions'){creates++;const body=JSON.parse(init.body);assert.equal(body.timeout,900);assert.deepEqual(body.browserSettings.context,{id:b.contextId,persist:true});assert.equal(body.browserSettings.recordSession,false);assert.equal(body.browserSettings.logSession,false);assert.equal(body.browserSettings.solveCaptchas,false);assert.equal(body.proxies,false);if(ambiguous)throw Error('timeout');return Response.json({id,contextId:mismatch?null:b.contextId,projectId:b.projectId});}
 if(init.method==='POST'){stops++;return Response.json({status:'COMPLETED'});}
 if(p.endsWith('/debug'))return Response.json({debuggerFullscreenUrl:'https://www.browserbase.com/devtools/?session=test',connectUrl:'must-not-return'});
 return Response.json({id,contextId:b.contextId,projectId:b.projectId,status:'RUNNING'});
 };
 await b.connectBrowser('private-browser-key');assert.equal((await b.browserStatus()).connected,true);assert(!JSON.stringify(await b.browserStatus()).includes('private-browser-key'));
 assert(!((await sql`select secret from os_browser_connection`)[0].secret).includes('private-browser-key'));
 const view=await b.startBrowser();assert.equal(view.contextVerified,true);assert(!JSON.stringify(view).includes('must-not-return'));
 await assert.rejects(b.startBrowser());assert.equal(creates,1);await assert.rejects(b.connectBrowser('private-browser-key'));
 await b.stopBrowser();assert.equal(stops,1);await assert.rejects(b.startBrowser());
 await sql`update os_browser_connection set hold_until=now()-interval '1 minute'`;mismatch=true;await assert.rejects(b.startBrowser(),/profile was not attached/);assert.equal(stops,2);await assert.rejects(b.startBrowser());assert.equal(creates,2);
 assert.equal((await b.browserStatus()).remainingPilotStarts,1);
 await sql`update os_browser_connection set hold_until=null`;mismatch=false;await b.startBrowser();assert.equal(creates,3);assert.equal((await b.browserStatus()).remainingPilotStarts,0);
 await sql`update os_browser_connection set hold_until=null`;await assert.rejects(b.startBrowser());assert.equal(creates,3);
 await b.ensureBrowserSchema();await b.connectBrowser('private-browser-key');assert.equal((await b.browserStatus()).remainingPilotStarts,0);await assert.rejects(b.startBrowser());
 await sql`update os_browser_connection set attempts=0,hold_until=null`;mismatch=false;ambiguous=true;await assert.rejects(b.startBrowser());await assert.rejects(b.startBrowser());assert.equal(creates,4);
 assert.throws(()=>b.validateViewer('https://browserbase.com.evil.example/test'));assert.throws(()=>b.validateViewer('http://browserbase.com/test'));assert.throws(()=>b.validateViewer('https://user:password@browserbase.com/test'));
 const route=load('app/api/owner/connections/browser/route.ts'),owner=load('app/lib/business-os/owner-session.ts');
 const url='https://www.darthalgo.com/api/owner/connections/browser';assert.equal((await route.GET(new Request(url))).status,401);
 const headers={host:'www.darthalgo.com',origin:'https://www.darthalgo.com',cookie:'darth_os_owner='+owner.createOwnerSession(process.env.AI_OS_OWNER_KEY)};
 assert.equal((await route.POST(new Request(url,{method:'POST',headers:{...headers,origin:'https://evil.example'}}))).status,403);
 process.env.VERCEL_ENV='preview';assert.equal((await route.POST(new Request(url,{method:'POST',headers}))).status,403);
 await pg.close();console.log('PASS: encrypted keys, owner/CSRF gates, verified profile, uncertain outcome hold, pilot cap, secret-safe viewer');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
