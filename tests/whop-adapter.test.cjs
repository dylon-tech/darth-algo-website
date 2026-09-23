const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'whop-adapter-')),oldFetch=global.fetch,env={...process.env};
 try{
  execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--skipLibCheck','--outDir',dir,'app/lib/business-os/whop.ts']);
  const {createWhopHomePost,verifyWhopPost}=require(join(dir,'whop.js'));
  process.env.WHOP_COMPANY_API_KEY='offline';process.env.WHOP_COMPANY_ID='biz_test';
  let writes=0;
  global.fetch=async(url,options)=>{
   assert.equal(options.headers.Authorization,'Bearer offline');
   if(url.endsWith('/accounts/biz_test'))return Response.json({id:'biz_test'});
   if(options.method==='POST'){
    writes++;const body=JSON.parse(options.body);
    assert.equal(body.experience_id,'public');assert.equal(body.account_id,'biz_test');
    assert.equal('paywall_amount' in body,false);assert.equal('paywall_currency' in body,false);
    assert.equal(body.is_mention,false);return Response.json({id:'post1'});
   }
   return Response.json({id:'post1',content:'Approved copy',created_at:'2026-09-23T23:00:00Z'});
  };
  const accepted=await createWhopHomePost('Approved copy',{idempotencyKey:'same-artifact-v3'});
  assert.equal(accepted.id,'post1');assert.equal(writes,1);
  assert.equal((await verifyWhopPost(accepted.id,'Approved copy')).published,true);
  await assert.rejects(verifyWhopPost(accepted.id,'Changed copy'),/MISMATCH/);
  global.fetch=async(url)=>url.endsWith('/accounts/biz_test')?Response.json({id:'biz_test'}):Response.json({error:'Unauthorized: Actor is missing all required permissions: forum:post:create'},{status:400});
  await assert.rejects(createWhopHomePost('Approved copy',{idempotencyKey:'permission-test'}),/WHOP_FORUM_PERMISSION_MISSING/);
  console.log('Whop free payload, permission classification and independent exact-content readback passed; provider mocked.');
 }finally{global.fetch=oldFetch;process.env=env;rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
