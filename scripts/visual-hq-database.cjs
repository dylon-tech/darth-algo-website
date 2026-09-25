const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {randomUUID,createHash}=require('node:crypto');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
// Never point this destructive fixture at a real account database.
const url=new URL(process.env.DATABASE_URL||'http://missing');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/visual_hq_test','Dedicated local CI test database required');
const {db}=require('../app/lib/affiliate-db.ts');
const {socialCampaignQueue}=require('../app/lib/business-os/social-campaign-queue.ts');
const {creativeDigest}=require('../app/lib/business-os/reviewed-social.ts');
const {campaignKey}=require('../app/lib/business-os/social-schedule.ts');
const {readContentQueue,decideContent,latestContentDecision,ownerCampaignHeld}=require('../app/lib/business-os/daily-content-review.ts');
const sql=db();
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await sql`create table os_activity(id bigserial primary key,created_at timestamptz not null default now(),actor text,event text,entity_id text,details jsonb not null default '{}')`;
 await sql`create table os_approvals(id uuid primary key,payload jsonb,status text,decided_by text,decided_at timestamptz,decision_note text)`;
 await sql`create table os_runs(id uuid primary key,result jsonb)`;
 await sql`create table os_jobs(id uuid primary key,request_key text unique,department text,message text,source text,status text not null default 'queued',run_id uuid,created_at timestamptz default now())`;
 const index=socialCampaignQueue.findIndex(c=>c.day==='2026-09-24'&&c.slot==='morning');assert.ok(index>=0);
 let c=socialCampaignQueue[index];const original=structuredClone(c);
 const input=async(action,extra={})=>({id:c.id,reviewHash:c.review.sha256,action,expectedDecisionId:(await latestContentDecision(c))?.id||null,requestKey:'test:'+randomUUID(),...extra});
 const reset=()=>sql`truncate os_activity,os_approvals,os_runs,os_jobs`;
 await check('today keeps both slots even after morning window',async()=>{const q=await readContentQueue(new Date('2026-09-24T23:00:00Z'));assert.equal(q.today,'2026-09-24');assert.equal(q.items.filter(i=>i.day===q.today).length,2);});
 await check('disapproval is durable, declines unsent approvals and deduplicates retry',async()=>{
  await sql`insert into os_approvals(id,payload,status) values(${randomUUID()},${sql.json({executor:'buffer_social_v2',campaign:{day:c.day,slot:c.slot}})},'approved')`;
  const i=await input('disapprove');await decideContent(i);assert.equal(await ownerCampaignHeld(c),true);assert.equal((await sql`select status from os_approvals`)[0].status,'declined');
  assert.equal((await decideContent(i)).duplicate,true);assert.equal((await sql`select count(*)::int as n from os_activity where event='daily_content_owner_decision'`)[0].n,1);
  await assert.rejects(()=>decideContent({...i,note:'Changed'}),/different decision/);
 });
 await check('remake inserts exactly one real content request, including concurrent retry',async()=>{
  const i=await input('remake',{note:'Bigger chart'});const results=await Promise.all([decideContent(i),decideContent(i)]);assert.equal(results[0].jobId,results[1].jobId);
  const jobs=await sql`select * from os_jobs`;assert.equal(jobs.length,1);assert.equal(jobs[0].department,'content');assert.match(jobs[0].message,/^\[APPROVED_SUGGESTION\]/);assert.match(jobs[0].message,/Bigger chart/);assert.ok(jobs[0].message.length<=4000);assert.equal(await ownerCampaignHeld(c),true);
 });
 await check('queued or uncertain remake cannot be relaunched under a fresh key',async()=>{await assert.rejects(()=>input('remake').then(decideContent),/earlier remake/);await sql`update os_jobs set status='unknown'`;await assert.rejects(()=>input('remake').then(decideContent),/earlier remake/);});
 await check('original artwork cannot be approved as its own replacement',async()=>{await assert.rejects(()=>input('approve_replacement').then(decideContent),/different reviewed version/);assert.equal(await ownerCampaignHeld(c),true);});
 await check('new reviewed image requires an explicit decision and only releases exact version',async()=>{
  const replacement=structuredClone(original),hash=createHash('sha256').update('isolated-new-artwork').digest('hex');replacement.assets=[{...original.assets[0],sha256:hash,path:'/social-campaigns/test/replacement-'+hash.slice(0,12)+'.jpg'}];replacement.review.sha256=creativeDigest(replacement);socialCampaignQueue[index]=replacement;c=replacement;
  const q=await readContentQueue(new Date('2026-09-24T12:00:00Z'));assert.equal(q.items.find(i=>i.id===c.id).canApprove,true);assert.equal(await ownerCampaignHeld(c),true);
  await decideContent(await input('approve_replacement'));assert.equal(await ownerCampaignHeld({...c,reviewHash:c.review.sha256}),false);assert.equal(await ownerCampaignHeld({...original,reviewHash:original.review.sha256}),true);
  socialCampaignQueue[index]=original;c=original;assert.equal(await ownerCampaignHeld(c),true);
 });
 await reset();
 await check('optimistic decision version prevents conflicting simultaneous actions',async()=>{const a=await input('disapprove'),b=await input('remake');const r=await Promise.allSettled([decideContent(a),decideContent(b)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.filter(x=>x.status==='rejected').length,1);});
 await reset();
 await check('partial publication remains intact while unsent destinations are held',async()=>{
  const id=randomUUID();await sql`insert into os_approvals(id,payload,status) values(${id},${sql.json({executor:'buffer_social_v2',campaign:{day:c.day,slot:c.slot}})},'approved')`;
  const i=await input('disapprove');let entered;const gate=new Promise(r=>entered=r);
  const claim=sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730924)`;entered();await tx`select pg_sleep(0.08)`;await tx`insert into os_activity(actor,event,entity_id) values('owner','buffer_publish_started',${id})`;});
  await gate;await Promise.all([claim,decideContent(i)]);assert.equal(await ownerCampaignHeld(c),true);assert.equal((await sql`select status from os_approvals where id=${id}`)[0].status,'approved');
 });
 await reset();
 await check('owner hold that wins shared lock prevents later publishing claim',async()=>{await decideContent(await input('disapprove'));const canClaim=await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730924)`;return !(await ownerCampaignHeld(c,tx));});assert.equal(canClaim,false);});
 await reset();
 await check('community claim honors a saved owner hold under the shared lock',async()=>{await decideContent(await input('disapprove'));const canClaim=await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(730925)`;return !(await ownerCampaignHeld(c,tx));});assert.equal(canClaim,false);});
 await reset();
 await check('Whop submission also makes stop/remake unavailable',async()=>{await sql`insert into os_activity(actor,event,entity_id) values('owner','whop_home_publish_started',${'daily-whop:'+campaignKey(c)})`;await assert.rejects(()=>input('remake').then(decideContent),/already started/);assert.equal((await sql`select count(*)::int as n from os_jobs`)[0].n,0);});
 await check('malformed decisions are rejected without writes',async()=>{for(const i of [null,{}, {id:c.id,action:'disapprove',reviewHash:33,requestKey:'testkey',expectedDecisionId:null}])await assert.rejects(()=>decideContent(i),/Invalid content decision/);});
 console.log(`${passed} isolated database checks passed. No provider was called and no production record was used.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>sql.end());
