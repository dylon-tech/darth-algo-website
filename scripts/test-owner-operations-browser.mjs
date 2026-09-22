import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const origin='http://127.0.0.1:3100';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3100'],{stdio:'ignore',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'false'}});
let browser;
try {
  let online=false;
  for(let n=0;n<60;n++){try{await fetch(origin+'/owner');online=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
  assert.ok(online,'local test server started');
  const privateResponse=await fetch(origin+'/api/owner/operations');
  assert.equal(privateResponse.status,401,'owner operations reject unauthenticated requests');
  assert.match(privateResponse.headers.get('cache-control')||'',/no-store/i);
  const checkedAt=new Date().toISOString();
  const fixture={checkedAt,day:'2026-09-22',environment:'synthetic browser test',partial:[],scheduler:{enabled:true,paused:false,lastSeenAt:checkedAt,state:'idle',fresh:true},content:{prepared:true,preparedAt:checkedAt,previewUrl:null,caption:'Synthetic campaign fixture. Not a live campaign.',assets:3},deliveries:['x','instagram','threads','whop'].map(network=>({network,state:network==='whop'?'connection_checked_waiting_for_window':'ready_for_daily_window',published:false,postId:null,url:null,checkedAt})),indicator:{enabled:true,stage:'no_supported_idea',candidates:[],browserConnected:true,browserStartsRemaining:0,loginVerified:false,releaseExecutorConnected:false,lastHandoff:'insufficient_evidence_or_invalid_output',lastHandoffAt:checkedAt,researchState:'succeeded'},team:['ceo','growth','content','support','affiliates','analytics','research','operations'].map(id=>({id,state:'completed',finishedAt:checkedAt,queued:0,running:0,error:null}))};
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route('**/api/owner/operations',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
  await page.goto(origin+'/owner',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Content & publishing'}).waitFor();
  assert.equal(await page.getByText('No confirmed publication today',{exact:true}).count(),4);
  assert.equal(await page.getByText('Published',{exact:true}).count(),0,'no green fake publication receipts');
  assert.ok(await page.getByText('0 approved starts left',{exact:true}).isVisible());
  assert.ok(await page.getByText('Publishing worker needed',{exact:true}).isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'phone viewport has no horizontal overflow');
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/owner-operations-phone-fixture.png',fullPage:true});
  await page.getByRole('button',{name:'Manage my business'}).click();
  await page.getByRole('button',{name:'Back to live overview'}).click();
  await page.getByRole('heading',{name:'Content & publishing'}).waitFor();
  await page.setViewportSize({width:1200,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'desktop viewport has no horizontal overflow');
  await page.screenshot({path:'artifacts/owner-operations-desktop-fixture.png',fullPage:true});
  assert.deepEqual(pageErrors,[],'no browser runtime errors');
  console.log('PASS: owner auth/no-store, 393px mobile and desktop layout, truthful receipt labels, blocker visibility, existing-controls navigation, and browser runtime. Screenshots use synthetic data, not live agent evidence.');
} finally {await browser?.close();server.kill('SIGTERM');}
