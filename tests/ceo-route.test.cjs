// Run with TypeScript installed: node tests/ceo-route.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../app/api/owner/live/route.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
let authorized=false,calls=0,fail=false;
const moduleExports={};
vm.runInNewContext(compiled,{exports:moduleExports,Response,require:name=>name.endsWith('owner-session')?{ownerSessionFromRequest:()=>authorized,privateHeaders:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}}:{liveOverview:async()=>{calls++;if(fail)throw Error('database unavailable');return {agents:[],checkedAt:'2026-09-22T08:00:00Z'};}}});
(async()=>{let r=await moduleExports.GET(new Request('https://example.test/api/owner/live'));assert.equal(r.status,401);assert.equal(calls,0);authorized=true;r=await moduleExports.GET(new Request('https://example.test/api/owner/live'));assert.equal(r.status,200);assert.equal(calls,1);assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.get('vary'),'Cookie');fail=true;r=await moduleExports.GET(new Request('https://example.test/api/owner/live'));assert.equal(r.status,503);assert.match((await r.json()).error,/No work state/);console.log('8 private-route access, cache, and failure assertions passed.');})().catch(e=>{console.error(e);process.exitCode=1;});
