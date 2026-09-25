// Isolated application acceptance test, executed by CI. No production credentials,
// external sends, or paid model calls. Financial/agent snapshots are labeled fixtures;
// Give Work, Message, Pause/Resume and duplicate keys hit real test PostgreSQL routes.
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {chromium,webkit} from 'playwright-core';
const url=new URL(process.env.HQ_TEST_DATABASE_URL||'http://missing');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/hq_world_test','Dedicated local HQ test database required');
const sql=postgres(url.toString(),{max:3,onnotice:()=>{}}),port=3240,origin=`http://127.0.0.1:${port}`,key='hq-world-isolated-test-key-never-for-production';
const schema=(await readFile('app/lib/business-os/schema.ts','utf8')).match(/export const schema = `([\s\S]*?)`;/)[1];await sql.unsafe(schema);const coordination=(await readFile('app/lib/business-os/coordination.ts','utf8')).match(/export const coordinationSchema = `([\s\S]*?)`;/)[1];await sql.unsafe(coordination);await sql`update os_control set paused=false`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{stdio:'inherit',env:{...process.env,DATABASE_URL:url.toString(),AI_OS_ENABLED:'true',AI_OS_OWNER_KEY:key,AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'false',AI_OS_TELEGRAM_ENABLED:'false',HQ_WORLD_ENABLED:'true'}});
let browser;const results={scope:'Isolated CI only. No production metrics or provider results.',checks:[],requests:0,screenshots:[],performance:{}};
const pass=name=>{results.checks.push(name);console.log('PASS',name);};
const stamp=()=>new Date().toISOString();
const team=[['ceo','Team Leader'],['research','Research'],['content','Content Creator'],['indicator_builder','Indicator Builder'],['growth','Growth'],['support','Customer Support'],['affiliates','Affiliates'],['analytics','Analytics'],['operations','Operations']].map(([id,name])=>({id,name,mandate:'Synthetic role for interface acceptance testing.',configured:true,latest:null,completed:{id:'fixture-'+id,department:id,status:'completed',createdAt:stamp(),finishedAt:stamp(),errorCode:null,brief:'ISOLATED TEST OUTPUT. Production data is not used in these screenshots.'},current:null,next:null,waiting:0,task:null,health:{rating:'Great',reason:'Synthetic fixture'}}));
const image='/creative-references/cinematic-2026-09-22/pro-2a84d6dc93aa.jpg';
let failFeed=false,olderFeed=false;
async function dashboard(){
 const [control]=await sql`select paused from os_control where id=1`,jobs=await sql`select id,department,status,message,created_at from os_jobs order by created_at desc`,events=await sql`select id::text,actor,event,created_at as at from os_activity order by id desc limit 12`;
 const agents=team.map(a=>{const j=jobs.find(j=>j.department===a.id&&j.status==='queued');return {...a,next:j?{id:j.id,department:j.department,status:j.status,message:j.message,createdAt:j.created_at.toISOString(),startedAt:null}:null,waiting:j?1:0};});
 const at=olderFeed?new Date(Date.now()-100000).toISOString():stamp();
 return {checkedAt:at,partial:[],issues:[],team:agents,health:{rating:'Great',reason:'Synthetic fixture. No live health claim.'},desk:{checkedAt:at,paused:control.paused,autonomy:true,budget:{configured:true,available:true},scheduler:{lastSeenAt:at,status:'active'},counts:{working:0,queued:jobs.filter(j=>j.status==='queued').length,completedToday:0,needsOwner:0},agents,services:[],activity:events,receipts:[],telemetryAvailable:true,decisions:[]},finances:{income:{incomeCents:64000,checkedAt:at,periodStart:at,periodEnd:at,scope:'Synthetic UI fixture, not company revenue.',history:[],otherCurrencies:[]},customers:{active:12,trials:2,checkedAt:at,scope:'Synthetic customer totals.'},bills:[{id:'fixture',name:'Test hosting',amountCents:2000,cadence:'monthly',status:'confirmed',source:'Isolated test record',verifiedAt:at},{id:'estimate',name:'Unverified test bill',amountCents:5000,cadence:'monthly',status:'estimated',source:'Fixture estimate',verifiedAt:null}],expenses:{monthlyCents:7000,estimated:1,missing:0}},brief:null,suggestions:[],queue:[{id:'synthetic',day:'2026-09-25',slot:'morning',text:'Synthetic test caption',image,state:'Fixture'}]};
}
try{
 let ready=false;for(let n=0;n<90;n++){try{if((await fetch(origin+'/owner')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert.ok(ready);
 assert.match(await (await fetch(origin+'/owner/world')).text(),/private HQ World/);
 for(const path of ['/api/owner/dashboard','/api/owner/command','/api/owner/content-queue','/api/owner/operations','/api/owner/indicators'])assert.equal((await fetch(origin+path)).status,401,path);
 const value=`${Math.floor(Date.now()/1000)+180*86400}.${randomBytes(24).toString('hex')}`,token=`${value}.${createHmac('sha256',key).update('darth-os-session-v1:'+value).digest('hex')}`;
 const headers={cookie:`darth_os_owner=${token}`,'Content-Type':'application/json'};
 assert.equal((await fetch(origin+'/api/owner/command',{method:'POST',headers:{...headers,origin:'https://invalid.example'},body:'{"operation":"pause","paused":true}'})).status,403);
 assert.equal((await fetch(origin+'/api/owner/command',{method:'POST',headers:{...headers,origin},body:'{"operation":"message","department":"wrong","message":"test","requestKey":"invalid-test"}'})).status,400);
 pass('Owner route and data require a session; cross-origin and invalid mutations refused');
 await mkdir('artifacts/hq-world',{recursive:true});
 for(const engine of ['chromium','webkit']){
  browser=await ({chromium,webkit}[engine]).launch({headless:true});
  const context=await browser.newContext({viewport:engine==='webkit'?{width:393,height:852}:{width:1440,height:1050},deviceScaleFactor:1,isMobile:engine==='webkit',hasTouch:engine==='webkit',reducedMotion:'reduce',recordVideo:{dir:'artifacts/hq-world/video',size:{width:engine==='webkit'?393:1440,height:engine==='webkit'?852:1050}}});
  await context.addCookies([{name:'darth_os_owner',value:token,url:origin,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/owner/dashboard',async route=>{results.requests++;await route.fulfill({status:failFeed?503:200,contentType:'application/json',body:JSON.stringify(failFeed?{error:'Isolated failed request'}:await dashboard())});});
  await page.route('**/api/owner/content-queue',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({checkedAt:stamp(),today:'2026-09-25',items:[]})}));
  await page.route('**/api/owner/command?view=status',route=>route.fulfill({status:200,contentType:'application/json',body:'{"approvals":[],"messages":[]}'}));
  await page.route('**/api/owner/operations',route=>route.fulfill({status:200,contentType:'application/json',body:'{"openLoops":[]}'}));
  await page.goto(origin+'/owner/world');await page.getByRole('button',{name:'Whole campus',exact:true}).waitFor();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Whole campus'&&!b.disabled));
  await page.getByText('$640.00',{exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),1);
  await page.evaluate(()=>{const n=document.createElement('div');n.id='test-label';n.textContent='ISOLATED TEST · SYNTHETIC METRICS · REAL TEST DATABASE CONTROLS';Object.assign(n.style,{position:'fixed',bottom:'0',left:'0',right:'0',background:'#4a1936',color:'#fff',font:'10px system-ui',padding:'5px',zIndex:100000,textAlign:'center'});document.body.append(n);});
  await page.screenshot({path:`artifacts/hq-world/${engine}-campus-synthetic.png`,fullPage:true});results.screenshots.push(`${engine}-campus-synthetic.png`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const name of ['Command','Research','Studio','Publishing','Indicators','Support','Finance','Engineering']){
   await page.getByRole('navigation',{name:'Departments'}).getByRole('button',{name:new RegExp(name)}).click();await page.getByRole('dialog').waitFor();assert.ok(await page.getByRole('dialog').getByRole('link',{name:'Open full workspace'}).isVisible());await page.getByRole('button',{name:'Close department'}).click();
  }
  pass(engine+': all eight departments, full workspace links, accessible return and no horizontal overflow');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.getByRole('button',{name:'Whole campus',exact:true}).click();
  await page.getByRole('navigation',{name:'Departments'}).getByRole('button',{name:/Research/}).click();await page.getByRole('button',{name:'Give work',exact:true}).click();
  await page.getByRole('textbox',{name:'Your assignment'}).fill('ISOLATED HQ ACCEPTANCE '+engine+': prepare an internal research brief. No external action.');
  await page.locator('form').getByRole('button',{name:'Give work',exact:true}).click();await page.getByRole('status').filter({hasText:/Request .* saved/}).waitFor();
  const [job]=await sql`select id,status,request_key from os_jobs where message like ${'ISOLATED HQ ACCEPTANCE '+engine+'%'} order by created_at desc limit 1`;assert.equal(job.status,'queued');
  await page.screenshot({path:`artifacts/hq-world/${engine}-saved-task-synthetic.png`,fullPage:true});
  await page.getByRole('button',{name:'Close agent',exact:true}).click();await page.getByRole('button',{name:'Close department',exact:true}).click();
  // Reissue the exact recorded request key twice using the real authenticated API.
  const [row]=await sql`select * from os_jobs where id=${job.id}`;const input={operation:'message',department:row.department,message:row.message,requestKey:row.request_key};
  const replay=await Promise.all([1,2].map(()=>fetch(origin+'/api/owner/command',{method:'POST',headers:{...headers,origin},body:JSON.stringify(input)}).then(r=>r.json())));assert.ok(replay.every(j=>j.id===job.id));assert.equal((await sql`select count(*)::int n from os_jobs where request_key=${job.request_key}`)[0].n,1);
  const mismatch=await fetch(origin+'/api/owner/command',{method:'POST',headers:{...headers,origin},body:JSON.stringify({...input,message:'Different work must not reuse that request key'})});assert.equal(mismatch.status,409);
  await page.getByRole('navigation',{name:'Departments'}).getByRole('button',{name:/Engineering/}).click();await page.getByRole('button',{name:'Pause new work'}).click();await page.getByRole('button',{name:'Resume new work'}).waitFor();assert.equal((await sql`select paused from os_control`)[0].paused,true);await page.getByRole('button',{name:'Resume new work'}).click();await page.getByRole('button',{name:'Pause new work'}).waitFor();assert.equal((await sql`select paused from os_control`)[0].paused,false);
  await page.getByRole('button',{name:'Run now',exact:true}).click();await page.getByRole('status').filter({hasText:'One bounded worker check requested'}).waitFor();assert.equal((await sql`select status from os_jobs where id=${job.id}`)[0].status,'queued','AI disabled: no invented completion');
  await page.getByRole('button',{name:'Close department'}).click();pass(engine+': real persisted request ID, concurrent dedupe, pause/resume and bounded Run now (AI disabled)');
  await page.getByRole('navigation',{name:'Departments'}).getByRole('button',{name:/Finance/}).click();assert.ok(await page.getByText('$20.00 confirmed monthly subtotal',{exact:false}).isVisible());await page.goBack();await page.getByRole('navigation',{name:'Departments'}).waitFor();
  await page.getByRole('navigation',{name:'Departments'}).getByRole('button',{name:/Research/}).click();await page.getByRole('button',{name:'Message',exact:true}).click();await page.getByRole('textbox',{name:'Message this agent'}).fill('Persist this draft across a page refresh');await page.reload();await page.getByRole('button',{name:'Messages',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'Message this agent'}).inputValue(),'Persist this draft across a page refresh');await page.getByRole('button',{name:'Close agent'}).click();await page.getByRole('button',{name:'Close department'}).click();
  failFeed=true;await page.getByRole('button',{name:'Refresh headquarters'}).click();await page.getByRole('alert').waitFor();assert.ok(await page.getByRole('button',{name:/System health/}).getByText('Unknown',{exact:true}).isVisible());failFeed=false;await page.getByRole('button',{name:'Refresh headquarters'}).click();await page.getByRole('alert').waitFor({state:'hidden'});
  // Old responses must not replace a newer accepted snapshot.
  olderFeed=true;await page.getByRole('button',{name:'Refresh headquarters'}).click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Refresh headquarters"]').disabled);olderFeed=false;assert.ok(await page.getByRole('button',{name:/System health/}).getByText('Great',{exact:true}).isVisible());
  await context.setOffline(true);await page.getByText('Disconnected.',{exact:false}).waitFor();await context.setOffline(false);
  const samples=await page.evaluate(async()=>{const times=[];let last=performance.now();await new Promise(resolve=>{const frame=()=>{const now=performance.now();times.push(now-last);last=now;if(times.length<60)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});const res=performance.getEntriesByType('resource');return {rafAverageMs:times.reduce((a,b)=>a+b,0)/times.length,loadedResourceBytes:res.reduce((n,r)=>n+(r.encodedBodySize||0),0),assetFailures:res.filter(r=>r.name.includes('/hq-world/')&&r.responseStatus>=400).length};});results.performance[engine]=samples;assert.equal(samples.assetFailures,0);
  if(engine==='chromium'){await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{bubbles:true,cancelable:true})));await page.getByText('The map could not load.',{exact:false}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Departments'}).getByRole('button').count(),8);await page.getByRole('button',{name:'Reload map'}).click();await page.getByRole('button',{name:'Whole campus'}).waitFor();}
  assert.deepEqual(errors,[]);pass(engine+': refreshed drafts, browser Back, failed read, reconnect, stale snapshot, reduced motion, canvas fallback and zero page errors');
  await context.close();assert.equal((await sql`select status from os_jobs where id=${job.id}`)[0].status,'queued');pass(engine+': request survives originating browser closure (queue durability; not live model execution)');await browser.close();browser=null;
 }
 await writeFile('artifacts/hq-world/acceptance.json',JSON.stringify(results,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');await sql.end();}
