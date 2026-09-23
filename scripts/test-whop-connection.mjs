import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('app/lib/business-os/whop.ts','utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {whopStatus,createWhopHomePost}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
const originalFetch=globalThis.fetch;
const names=['WHOP_COMPANY_API_KEY','WHOP_COMPANY_ID','WHOP_API_VERSION_DATE','WHOP_PUBLISHING_ENABLED'];
const original=Object.fromEntries(names.map(name=>[name,process.env[name]]));
let calls=[],count=0;
function mock(handler){calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return handler(url,init);};}
async function test(name,fn){await fn();count++;console.log(`PASS ${name}`);}
try {
  names.forEach(name=>delete process.env[name]);
  mock(()=>{throw Error('Unexpected network request');});
  await test('missing key never calls provider',async()=>{assert.equal((await whopStatus()).error,'WHOP_COMPANY_API_KEY_MISSING');assert.equal(calls.length,0);});
  process.env.WHOP_COMPANY_API_KEY='synthetic-test-key';
  process.env.WHOP_COMPANY_ID='biz_Test123';
  mock(()=>Response.json({id:'biz_Test123',title:'Synthetic business',owner:{id:'user_test'}}));
  await test('explicit account read is pinned and redirect-safe',async()=>{
    const status=await whopStatus();assert.equal(status.connected,true);assert.equal(status.ownerUserId,'user_test');
    assert.equal(calls[0].url,'https://api.whop.com/api/v1/accounts/biz_Test123');assert.equal(calls[0].init.headers['Api-Version-Date'],'2026-08-21-1');assert.equal(calls[0].init.redirect,'error');
  });
  delete process.env.WHOP_COMPANY_ID;
  await test('account-scoped key resolves me instead of guessing from a list',async()=>{const status=await whopStatus();assert.equal(status.companyId,'biz_Test123');assert.equal(calls.at(-1).url,'https://api.whop.com/api/v1/accounts/me');});
  process.env.WHOP_COMPANY_ID='biz_Expected123';
  await test('different account is rejected',async()=>{const status=await whopStatus();assert.equal(status.connected,false);assert.equal(status.error,'WHOP_ACCOUNT_MISMATCH');});
  process.env.WHOP_COMPANY_ID='../../unexpected';
  const previousCalls=calls.length;
  await test('invalid explicit account is rejected before HTTP',async()=>{assert.equal((await whopStatus()).error,'WHOP_COMPANY_ID_INVALID');assert.equal(calls.length,previousCalls);});
  process.env.WHOP_COMPANY_ID='biz_Test123';
  mock(()=>Response.json({error:{message:'Synthetic permission error'}},{status:403}));
  await test('permission failure stays blocked and cannot publish',async()=>{assert.equal((await whopStatus()).error,'WHOP_PERMISSION_MISSING');await assert.rejects(createWhopHomePost('Fixture',{idempotencyKey:'test-key-123'}),/WHOP_PERMISSION_MISSING/);assert.ok(calls.every(call=>call.init.method!=='POST'));});
  mock((url,init)=>init.method==='POST'?Response.json({id:'post_fixture',created_at:'2026-09-22T00:00:00Z'}):Response.json({id:'biz_Test123'}));
  await test('Home publication retains exact account, version and idempotency',async()=>{
    const post=await createWhopHomePost('Synthetic content',{idempotencyKey:'test-key-123',pinned:false});
    assert.equal(post.id,'post_fixture');const call=calls.find(item=>item.init.method==='POST');const body=JSON.parse(call.init.body);
    assert.equal(call.url,'https://api.whop.com/api/v1/forum_posts');assert.equal(call.init.headers['Idempotency-Key'],'test-key-123');assert.equal(call.init.headers['Api-Version-Date'],'2026-08-21-1');assert.equal(body.experience_id,'public');assert.equal(body.account_id,'biz_Test123');assert.equal(body.is_mention,false);assert.equal(body.paywall_amount,undefined);
  });
  mock((url,init)=>init.method==='POST'?Response.json({error:{}},{status:500}):Response.json({id:'biz_Test123'}));
  await test('uncertain provider write is not retried',async()=>{await assert.rejects(createWhopHomePost('Fixture',{idempotencyKey:'test-key-123'}),/WHOP_FORUM_HTTP_500/);assert.equal(calls.filter(call=>call.init.method==='POST').length,1);});
  console.log(`All ${count} Whop connection checks passed. Requests were intercepted; nothing was posted and no real credentials were used.`);
} finally {globalThis.fetch=originalFetch;for(const name of names){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}}
