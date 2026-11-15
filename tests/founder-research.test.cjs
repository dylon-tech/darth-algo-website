const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const catalog=require('../app/lib/business-os/founder-render-catalog.json');
function load(path,requireFn){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:requireFn,URL,Date,Response});return exports;}
const helper=load('app/lib/business-os/founder-research.ts',name=>{if(name==='./founder-render-catalog')return {founderRenderLessons:catalog};if(name==='../affiliate-db')return {db:()=>{throw Error('No production DB allowed');}};throw Error(name);});
const at='2026-11-15T10:00:00.000Z';
const posts=helper.savedResearchPosts({parserVersion:2,posts:[{url:'https://www.instagram.com/reel/verified/?secret=omit',metadata:'999% profitable BUY NOW'},{url:'https://www.instagram.com/reel/verified/'},{url:'https://evil.example/post'},{url:'javascript:alert(1)'},{url:'https://user:password@www.tiktok.com/@test/video/123'},{url:'https://www.tiktok.com/@test/video/123'}]},at);
assert.equal(posts.length,2);assert.equal(posts[0].url,'https://www.instagram.com/reel/verified/');assert.ok(posts.every(x=>x.lessonId===null));assert.doesNotMatch(JSON.stringify(posts),/999|BUY NOW|password|secret=/);assert.match(posts[0].observation,/not been independently verified/);
assert.equal(helper.savedResearchPosts({parserVersion:1,posts:[{url:'https://www.instagram.com/reel/a/'}]},at).length,0);
assert.equal(helper.savedResearchPosts({parserVersion:2,posts:[]},'invalid').length,0);
const ideas=helper.researchIdeas();assert.equal(ideas.length,3);assert.ok(ideas.every(x=>x.checkedAt==='2026-11-15'));assert.ok(ideas.filter(x=>x.lessonId).every(x=>catalog.some(c=>c.id===x.lessonId)));assert.equal(ideas.find(x=>x.id==='prime-guide').lessonId,null);
(async()=>{
 let calls=[];const sql=async(strings,...args)=>{const query=strings.join('?');calls.push({query,args});assert.match(query.trim(),/^select /);if(query.includes('to_regclass'))return [{present:'os_vidiq_discovery'}];return [{result:{parserVersion:2,posts:[{url:'https://www.instagram.com/reel/test/'}]},checked_at:at}];};
 const result=await helper.founderResearch(sql);assert.equal(result.status,'ready');assert.equal(result.saved.status,'verified');assert.equal(result.saved.checkedAt,at);assert.equal(result.saved.data.length,1);assert.equal(calls.length,2);
 assert.match(calls[1].query,/order by checked_at desc nulls last limit 1/);
 const empty=await helper.founderResearch(async()=>[]);assert.equal(empty.saved.status,'unavailable');assert.equal(empty.status,'ready');
 const broken=await helper.founderResearch(async()=>{throw Error('private credential');});assert.equal(broken.status,'partial');assert.doesNotMatch(JSON.stringify(broken),/private credential/);
 let reads=0;let authorized=false;
 const route=load('app/api/owner/founder-research/route.ts',name=>name.endsWith('owner-session')?{ownerSessionFromRequest:()=>authorized,privateHeaders:{'X-Robots-Tag':'noindex'}}:{founderResearch:async()=>{reads++;return result;}});
 let response=await route.GET({});assert.equal(response.status,401);assert.equal(reads,0);
 authorized=true;response=await route.GET({});assert.equal(response.status,200);assert.equal(reads,1);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('vary'),'Cookie');
 assert.equal(route.POST,undefined);assert.equal(route.PUT,undefined);
 console.log('PASS source-linked research: authenticated private read-only API, bounded saved evidence, safe URLs, no metadata performance claims, exact curated recipe mapping, no paid calls or approval side effects.');
})().catch(error=>{console.error(error);process.exitCode=1;});
