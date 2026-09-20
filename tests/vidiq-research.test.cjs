const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const base=path.resolve('app/lib/business-os'),cache=new Map(),stubs={};
function load(name){if(cache.has(name))return cache.get(name);const filename=path.join(base,name+'.ts'),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod.require=id=>stubs[id]||(id.startsWith('./')?load(id.slice(2)):require(id));mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);cache.set(name,mod.exports);return mod.exports;}
async function main(){
 const {PGlite}=await import(require('node:url').pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href),pg=new PGlite();
 function adapter(client){const sql=async(strings,...values)=>{const query=strings.reduce((s,x,i)=>s+x+(i<values.length?'$'+(i+1):''),'');if(query.includes('pg_advisory_xact_lock'))return [];return (await client.query(query,values)).rows;};sql.json=JSON.stringify;sql.begin=fn=>client.transaction(tx=>fn(adapter(tx)));return sql;}
 const sql=adapter(pg);stubs['../affiliate-db']={db:()=>sql};
 Object.assign(process.env,{AI_OS_OWNER_KEY:'x'.repeat(64),AI_OS_ENABLED:'true',AI_OS_AI_ENABLED:'true',AI_OS_AUTONOMY_ENABLED:'true',AI_OS_INDICATOR_LAB_ENABLED:'true',VERCEL_ENV:'production'});
 const connection=load('vidiq-connection');await connection.ensureVidiqSchema();
 const sealed=connection.sealConnection({secret:'private-token'});assert(!sealed.includes('private-token'));assert.deepEqual(connection.openConnection(sealed),{secret:'private-token'});assert.throws(()=>connection.openConnection(sealed.slice(0,-3)+'zzz'));
 process.env.AI_OS_OWNER_KEY='y'.repeat(64);assert.throws(()=>connection.openConnection(sealed));process.env.AI_OS_OWNER_KEY='x'.repeat(64);
 let exchanges=0,refreshes=0;
 global.fetch=async(url,init)=>{if(String(url).endsWith('/register'))return Response.json({client_id:'client-123'});assert(String(url).endsWith('/token'));const p=new URLSearchParams(init.body);assert.equal(p.get('resource'),'https://mcp.vidiq.com/mcp');if(p.get('grant_type')==='refresh_token')refreshes++;else {exchanges++;assert(p.get('code_verifier').length>=43);}return Response.json({access_token:'private-access-token',refresh_token:'private-refresh',token_type:'Bearer',expires_in:3600});};
 const start=await connection.beginVidiqConnection(),state=new URL(start.url).searchParams.get('state');assert.equal(new URL(start.url).searchParams.get('code_challenge_method'),'S256');
 await assert.rejects(connection.finishVidiqConnection(state,'z'.repeat(43),'code'));assert.equal(exchanges,0);
 await connection.finishVidiqConnection(state,start.browser,'code');assert.equal(exchanges,1);await assert.rejects(connection.finishVidiqConnection(state,start.browser,'code'));assert.equal(exchanges,1);
 assert.equal((await connection.vidiqStatus()).connected,true);assert(!JSON.stringify(await connection.vidiqStatus()).includes('private-access'));
 await sql`update os_vidiq_connection set expires_at=now()-interval '1 minute'`;
 assert.equal(await connection.vidiqAccessToken(),'private-access-token');assert.equal(refreshes,1);
 const cancelled=await connection.beginVidiqConnection();await connection.disconnectVidiq();await assert.rejects(connection.finishVidiqConnection(new URL(cancelled.url).searchParams.get('state'),cancelled.browser,'code'));
 const fresh=await connection.beginVidiqConnection();await connection.finishVidiqConnection(new URL(fresh.url).searchParams.get('state'),fresh.browser,'code');
 let credits=0,paid=0,fail=false;
 class Client {async connect(){}async close(){}async listTools(){return {tools:[{name:'vidiq_balance'},{name:'vidiq_instagram_tiktok_outlier_search'}]};}async callTool({name}){if(name==='vidiq_balance')return {structuredContent:{totalCredits:credits,renewableResetsAt:'2026-09-30T12:10:26Z'}};paid++;if(fail)throw Error('timeout after submission');return {structuredContent:{instagram:[{url:'https://www.instagram.com/reel/abc123/',caption:'Trading example'}],tiktok:[{url:'https://www.tiktok.com/@trader/video/1234567890',description:'VWAP context'}]}};}}
 stubs['@modelcontextprotocol/sdk/client/index.js']={Client};stubs['@modelcontextprotocol/sdk/client/streamableHttp.js']={StreamableHTTPClientTransport:class{}};
 const research=load('vidiq-research');await pg.exec('create table os_control(id integer primary key,paused boolean);insert into os_control values(1,false)');
 assert.equal((await research.syncVidiqResearch()).status,'waiting_for_credits');assert.equal(paid,0);assert.equal((await research.vidiqEvidence()).status,'unavailable');
 credits=100;assert.equal((await research.syncVidiqResearch()).status,'already_checked');assert.equal(paid,0);
 await pg.exec('delete from os_vidiq_discovery');assert.equal((await research.syncVidiqResearch()).status,'observed_posts');assert.equal(paid,1);assert.equal((await research.vidiqEvidence()).data.posts.length,2);assert.equal((await connection.vidiqStatus()).latest.credits_reserved,5);
 await research.syncVidiqResearch();assert.equal(paid,1);
 await pg.exec('delete from os_vidiq_discovery');fail=true;assert.equal((await research.syncVidiqResearch()).status,'provider_outcome_unknown');await research.syncVidiqResearch();assert.equal(paid,2);assert.equal((await connection.vidiqStatus()).latest.credits_reserved,5);
 await pg.exec('delete from os_vidiq_discovery;update os_control set paused=true');assert.equal((await research.syncVidiqResearch()).status,'paused');assert.equal(paid,2);
 await connection.disconnectVidiq();assert.equal((await research.vidiqEvidence()).status,'unavailable');
 assert.deepEqual(research.socialPosts({url:'https://instagram.com.evil.example/reel/test'}),[]);
  assert.equal(research.balanceData({structuredContent:{totalCredits:'100'}}),null);
 const owner=load('owner-session');
 function route(relative){const filename=path.resolve(relative),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod.require=id=>id.endsWith('/owner-session')?owner:id.endsWith('/vidiq-connection')?connection:require(id);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);return mod.exports;}
 const api=route('app/api/owner/connections/vidiq/route.ts'),callback=route('app/api/owner/connections/vidiq/callback/route.ts');
 assert.equal((await api.GET(new Request('https://www.darthalgo.com/api/owner/connections/vidiq'))).status,401);
 const headers={host:'www.darthalgo.com',origin:'https://www.darthalgo.com',cookie:`darth_os_owner=${owner.createOwnerSession(process.env.AI_OS_OWNER_KEY)}`};
 assert.equal((await api.POST(new Request('https://www.darthalgo.com/api/owner/connections/vidiq',{method:'POST',headers:{...headers,origin:'https://evil.example'}}))).status,403);
 assert.equal((await api.DELETE(new Request('https://www.darthalgo.com/api/owner/connections/vidiq',{method:'DELETE',headers:{...headers,'sec-fetch-site':'cross-site'}}))).status,403);
 const begin=await api.POST(new Request('https://www.darthalgo.com/api/owner/connections/vidiq',{method:'POST',headers}));assert.equal(begin.status,200);assert(begin.headers.get('set-cookie').includes('HttpOnly; SameSite=Lax'));
 const authUrl=new URL((await begin.json()).url),nonce=begin.headers.get('set-cookie').split(';')[0];
 // OAuth return has no Strict owner cookie. The one-time nonce is sufficient only after authenticated initiation.
 const callbackUrl='https://www.darthalgo.com/api/owner/connections/vidiq/callback?'+new URLSearchParams({state:authUrl.searchParams.get('state'),code:'new-code'});
 const complete=await callback.GET(new Request(callbackUrl,{headers:{host:'www.darthalgo.com',cookie:nonce}}));assert(complete.headers.get('location').endsWith('vidiq=connected'));
 const replay=await callback.GET(new Request(callbackUrl,{headers:{host:'www.darthalgo.com',cookie:nonce}}));assert(replay.headers.get('location').endsWith('vidiq=sign_in_failed'));
 await pg.close();console.log('Passed: encrypted tokens, wrong key/tampering, PKCE browser binding, single-use state, disconnect cancellation, refresh, zero-credit hold, paid-call cap, ambiguous-outcome hold, pause, source provenance.');
}
main().catch(e=>{console.error(e);process.exit(1);});
