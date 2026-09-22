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
 let credits=0,paid=0,fail=false,authReject=false;
 class Client {async connect(){if(authReject)throw Error("invalid provider credential");}async close(){}async listTools(){return {tools:[{name:'vidiq_balance'},{name:'vidiq_instagram_tiktok_outlier_search'}]};}async callTool({name}){if(name==='vidiq_balance')return {structuredContent:{totalCredits:credits,renewableResetsAt:'2026-09-30T12:10:26Z'}};paid++;if(fail)throw Error('timeout after submission');return {structuredContent:{instagram:[{url:'https://www.instagram.com/reel/abc123/',caption:'Trading example'}],tiktok:[{url:'https://www.tiktok.com/@trader/video/1234567890',description:'VWAP context'}]}};}}
 stubs['@modelcontextprotocol/sdk/client/index.js']={Client};stubs['@modelcontextprotocol/sdk/client/streamableHttp.js']={StreamableHTTPClientTransport:class{}};
 const research=load('vidiq-research');await pg.exec('create table os_control(id integer primary key,paused boolean);insert into os_control values(1,false)');
 assert.equal((await research.syncVidiqResearch()).status,'public_sources_fallback');assert.equal(paid,0);assert.equal((await research.vidiqEvidence()).status,'unavailable');
 credits=100;assert.equal((await research.syncVidiqResearch()).status,'already_checked');assert.equal(paid,0);
 await pg.exec('delete from os_vidiq_discovery');assert.equal((await research.syncVidiqResearch()).status,'observed_posts');assert.equal(paid,1);assert.equal((await research.vidiqEvidence()).data.posts.length,2);assert.equal((await connection.vidiqStatus()).latest.credits_reserved,5);
 await research.syncVidiqResearch();assert.equal(paid,1);
 await pg.exec('delete from os_vidiq_discovery');fail=true;assert.equal((await research.syncVidiqResearch()).status,'provider_outcome_unknown');await research.syncVidiqResearch();assert.equal(paid,2);assert.equal((await connection.vidiqStatus()).latest.credits_reserved,5);
 await pg.exec('delete from os_vidiq_discovery;update os_control set paused=true');assert.equal((await research.syncVidiqResearch()).status,'paused');assert.equal(paid,2);
 await connection.disconnectVidiq();assert.equal((await research.vidiqEvidence()).status,'unavailable');
 assert.deepEqual(research.socialPosts({url:'https://instagram.com.evil.example/reel/test'}),[]);
  const formatted='## Instagram\n\n**@ig_trader** — "EMA idea"\n  reel:AbcDef12345\n  **reel_concept**: EMA context only\n\n## TikTok\n\n**@tick_trader** — "Liquidity idea"\nhttps://www.tiktok.com/@tick_trader/video/123456789\n**concept**: Liquidity sweep\n\n**@other_trader** — "Volume idea"\nhttps://www.tiktok.com/@other_trader/video/987654321';
 const parsed=research.socialPosts({content:[{type:'text',text:formatted}]});assert.equal(parsed.length,3);
 const ig=parsed.find(p=>p.platform==='Instagram'),tik=parsed.find(p=>p.url.includes('@tick_trader'));
 assert.equal(ig.url,'https://www.instagram.com/reel/AbcDef12345/');assert.equal(ig.urlProvenance,'provider_reel_id');assert(ig.metadata.includes('EMA'));assert(!ig.metadata.includes('Liquidity'));
 assert(tik.metadata.includes('Liquidity'));assert(!tik.metadata.includes('EMA'));assert(!tik.metadata.includes('Volume'));
 assert.equal(research.socialPosts('Unattributed caption and https://www.tiktok.com/@x/video/123')[0].metadata,'');
 assert.equal(research.balanceData({structuredContent:{totalCredits:'100'}}),null);
 const owner=load('owner-session');
 function route(relative){const filename=path.resolve(relative),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod.require=id=>id.endsWith('/owner-session')?owner:id.endsWith('/vidiq-connection')?connection:id.endsWith('/vidiq-research')?research:require(id);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);return mod.exports;}
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

 const paidBeforeKey=paid,keyValue='test-mcp-key-12345678901234567890';
 const keyRequest=(key=keyValue,h=headers)=>new Request('https://www.darthalgo.com/api/owner/connections/vidiq',{method:'PUT',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({key})});
 assert.equal((await api.PUT(keyRequest(keyValue,{...headers,origin:'https://evil.example'}))).status,403);
 assert.equal((await api.PUT(keyRequest('short'))).status,400);
 credits=0;const savedKey=await api.PUT(keyRequest());assert.equal(savedKey.status,200);assert.equal((await savedKey.json()).balance.totalCredits,0);assert.equal(paid,paidBeforeKey);
 assert.equal(await connection.vidiqAccessToken(),keyValue);const publicStatus=JSON.stringify(await connection.vidiqStatus());assert(!publicStatus.includes(keyValue));assert.equal((await connection.vidiqStatus()).verifiedBalance.totalCredits,0);
 const [storedKey]=await sql`select tokens from os_vidiq_connection where id=1`;assert(!storedKey.tokens.includes(keyValue));
 authReject=true;const rejected=await api.PUT(keyRequest('replacement-invalid-key-1234567890'));assert.equal(rejected.status,502);assert.equal(await connection.vidiqAccessToken(),keyValue);assert(!(await rejected.text()).includes('replacement-invalid'));assert.equal(paid,paidBeforeKey);authReject=false;
 await sql`update os_vidiq_connection set client_id=null where id=1`;
 global.fetch=async()=>Response.json({detail:'redirect_uri is not allowed.'},{status:400});
 const deniedRedirect=await api.POST(new Request('https://www.darthalgo.com/api/owner/connections/vidiq',{method:'POST',headers}));assert.equal(deniedRedirect.status,409);assert.equal((await deniedRedirect.json()).code,'VIDIQ_REDIRECT_NOT_ALLOWED');
 await connection.disconnectVidiq();assert.equal((await connection.vidiqStatus()).verifiedBalance,null);
 const cancelledKeyGeneration=await connection.beginVidiqKeyVerification();await connection.disconnectVidiq();await assert.rejects(connection.saveVidiqKey(keyValue,{totalCredits:0,renewableResetsAt:null},cancelledKeyGeneration));assert.equal((await connection.vidiqStatus()).connected,false);
 await pg.close();console.log('Passed: encrypted tokens, wrong key/tampering, PKCE browser binding, single-use state, disconnect cancellation, refresh, zero-credit hold, paid-call cap, ambiguous-outcome hold, pause, source provenance.');
}
main().catch(e=>{console.error(e);process.exit(1);});
