const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();let rechecks=0;const stubs={
 '../../../../lib/business-os/whop':{whopStatus:async()=>({configured:true,connected:true})},
 '../../../../lib/business-os/whop-permissions':{whopPermissionState:async()=>({blocked:true,verified:false,recheckRequested:false}),requestWhopPermissionRecheck:async()=>{rechecks++;return {state:'next_scheduled_attempt',verified:false};}}
};
function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
 mod.require=id=>stubs[id]||(id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id));
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);cache.set(filename,mod.exports);return mod.exports;}
(async()=>{
 const env={...process.env};try{
  process.env.AI_OS_ENABLED='true';process.env.AI_OS_OWNER_KEY='offline-test-owner-key-'.repeat(3);
  const session=load('app/lib/business-os/owner-session.ts'),route=load('app/api/owner/connections/whop/route.ts');
  const url='https://www.darthalgo.com/api/owner/connections/whop',cookie=session.ownerCookie+'='+session.createOwnerSession(process.env.AI_OS_OWNER_KEY);
  assert.equal((await route.GET(new Request(url))).status,401);
  assert.equal((await route.POST(new Request(url,{method:'POST'}))).status,401);
  const request=(origin,body)=>new Request(url,{method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await route.POST(request('https://evil.test',{action:'permissions_updated'}))).status,403);
  assert.equal((await route.POST(request('https://www.darthalgo.com',{action:'publish_now'}))).status,400);
  assert.equal(rechecks,0);
  const state=await route.GET(new Request(url,{headers:{cookie}}));assert.equal(state.headers.get('cache-control'),'no-store');assert.equal((await state.json()).publishing.blocked,true);
  const response=await route.POST(request('https://www.darthalgo.com',{action:'permissions_updated'}));assert.equal(response.status,200);assert.equal((await response.json()).verified,false);assert.equal(rechecks,1);
  console.log('PASS: Whop owner authorization, same-origin mutation, explicit intent and pending-only response; provider mocked.');
 }finally{process.env=env;}
})().catch(e=>{console.error(e);process.exitCode=1;});
