import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright-core';
// Synthetic transport only. No production authentication or provider bypass.
const port=3249,origin=`http://127.0.0.1:${port}`,stamp=()=>new Date().toISOString();
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{stdio:'inherit',env:{...process.env,DATABASE_URL:'',AI_OS_ENABLED:'false',AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'}});
const customer={id:'cus_accessfixture',name:'Synthetic Lifetime Customer',email:'layout@example.invalid',tradingViewUsername:'Recorded_Username',usernameStatus:'recorded',plans:['Pro Lifetime'],status:'Lifetime',subscriptions:[],payments:[],access:{expected:[{sourceId:'cs_accessfixture',plan:'Pro Lifetime',kind:'lifetime',expiresAt:null}],confirmed:'unknown',lastVerifiedAt:null,note:'Synthetic provider unverified.'},billingUrl:null,identityStatus:'Synthetic customer for UI testing.'};
const snapshot={customerId:customer.id,version:0,billing:{customerId:customer.id,recordedUsername:customer.tradingViewUsername,usernameStatus:'recorded',expected:customer.access.expected,subscriptions:[],payments:[],lifetimeProtected:true,complete:true,reviewRequired:false,checkedAt:stamp(),evidenceVersion:'a'.repeat(64),canRequest:true,reason:null},billingError:null,requests:[],provider:{confirmed:false,status:'unavailable',reason:'Synthetic request-only workflow.'}};
const writes=[],errors=[];let browser,forceConflict=false,cancelAfterUnknown=false,canceledReplay=null;
try{
 let ready=false;for(let n=0;n<60;n++){try{if((await fetch(origin+'/owner')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}assert(ready,'Local build starts');
 const unauthorized=await fetch(origin+'/api/owner/founder-access?customer='+customer.id);assert.equal(unauthorized.status,401);assert.match(unauthorized.headers.get('cache-control'),/no-store/);
 browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{if(!route.request().url().startsWith(origin+'/'))return route.abort();return route.continue();});
 await page.route('**/api/owner/**',async route=>{
  const request=route.request(),name=new URL(request.url()).pathname.split('/').at(-1),reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)});
  if(name==='session')return reply({authenticated:true});
  if(name==='founder-finance')return reply({customers:[customer],definitions:{customers:'Synthetic billing fixture.'},checkedAt:stamp()});
  if(name==='founder-inbox')return reply({items:[],unreadCount:0});
  if(name==='founder-content')return reply({items:[]});
  assert.equal(name,'founder-access','No external provider request is available');
  if(request.method()==='GET')return reply(snapshot);
  const body=request.postDataJSON();writes.push(body);
  assert.equal(body.customerId,customer.id);assert.equal(body.operation,'request');assert.equal(body.action,'correct_username');assert.equal(body.requestedExpiryDay,null);assert.equal(body.targetSourceId,null);
  if(canceledReplay){assert.equal(body.requestKey,canceledReplay.key,'An unknown creation response is retried with the same key');return reply({saved:true,duplicate:true,providerConfirmed:false,request:canceledReplay.request});}
  if(forceConflict){forceConflict=false;snapshot.version++;return reply({error:'Access requests changed on another device. Refresh before saving.'},409);}
  assert.equal(body.expectedVersion,snapshot.version);assert.equal(body.evidenceVersion,snapshot.billing.evidenceVersion);snapshot.version++;
  const saved={id:'0056f80d-cd07-4847-a019-62b02accad67',customerId:customer.id,action:body.action,targetSourceId:null,targetPlan:null,recordedUsername:customer.tradingViewUsername,requestedUsername:body.requestedUsername,requestedExpiryDay:null,reason:body.reason,state:'pending_provider_confirmation',version:1,createdAt:stamp(),updatedAt:stamp(),billingCheckedAt:stamp(),evidenceVersion:snapshot.billing.evidenceVersion};snapshot.requests.push(saved);
  if(cancelAfterUnknown){cancelAfterUnknown=false;saved.id='dbf0ab14-69bc-4f53-9d8d-36d5e27e969d';saved.state='request_canceled';saved.version++;snapshot.version++;canceledReplay={key:body.requestKey,request:saved};return reply({error:'Save response was not confirmed.'},503);}
  return reply({saved:true,duplicate:false,providerConfirmed:false,request:saved});
 });
 await page.goto(origin+'/owner?tab=customers');await page.getByRole('heading',{name:'Customers',level:1,exact:true}).waitFor();
 const opener=page.getByRole('button',{name:new RegExp(customer.name)});await opener.click();
 const detail=page.getByRole('dialog',{name:'Customer details'}),panel=detail.getByRole('region',{name:'Customer access requests'});
 await detail.getByRole('button',{name:'Request access change',exact:true}).click();await panel.getByText(/Lifetime rights are protected/).waitFor();
 assert.equal(await panel.getByRole('option',{name:'Revoke access',exact:true}).isDisabled(),true);assert.equal(await panel.getByRole('option',{name:'Extend access',exact:true}).isDisabled(),true);
 await panel.getByLabel('Requested change',{exact:true}).selectOption('correct_username');
 const username=panel.getByLabel(/^Requested TradingView username/),requested='Requested_'+('LongName'.repeat(6));
 await username.fill(requested);await panel.getByLabel('Reason · optional',{exact:true}).fill('Synthetic owner review only');await panel.getByRole('button',{name:'Save access request',exact:true}).click();
 await panel.getByText('Request saved. Provider confirmation pending.',{exact:true}).waitFor();assert.equal(customer.tradingViewUsername,'Recorded_Username');assert.equal(snapshot.requests[0].requestedUsername,requested);assert.equal(writes.length,1);
 await mkdir('artifacts',{recursive:true});
 for(const width of [320,390,430,768,1280]){
  await page.setViewportSize({width,height:852});await panel.scrollIntoViewIfNeeded();
  const overflow=await detail.evaluate(element=>({scroll:element.scrollWidth,client:element.clientWidth}));assert(overflow.scroll<=overflow.client+1,`Customer requests fit ${width}px`);
  if(width===320||width===390)await page.screenshot({path:`artifacts/founder-access-${width}-synthetic.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:852});
 await username.fill('Preserved_after_conflict');forceConflict=true;await panel.getByRole('button',{name:'Save access request',exact:true}).click();await panel.getByRole('button',{name:'Use refreshed record',exact:true}).waitFor();assert.equal(await username.inputValue(),'Preserved_after_conflict','A stale edit keeps the owner input');assert.equal(snapshot.requests.length,1);
 await detail.getByRole('button',{name:'Close detail'}).click();await page.reload();await opener.click();await detail.getByRole('button',{name:'Request access change',exact:true}).click();await panel.getByText('Requested username: '+requested,{exact:true}).waitFor();assert.equal(snapshot.requests.length,1,'Return uses the saved request; no automatic resubmission');
 await panel.getByLabel('Requested change',{exact:true}).selectOption('correct_username');await username.fill('Withdrawn_after_unknown_response');cancelAfterUnknown=true;await panel.getByRole('button',{name:'Save access request',exact:true}).click();await panel.getByText('Save response was not confirmed.',{exact:true}).waitFor();await panel.getByRole('button',{name:'Save access request',exact:true}).click();await panel.getByText('This request was already withdrawn. Review Saved requests before creating a new request.',{exact:true}).waitFor();await panel.getByText('Request withdrawn',{exact:true}).waitFor();assert.equal(snapshot.requests.length,2,'Retry reads back the withdrawn request without creating a third request');
 assert.deepEqual(errors,[]);await writeFile('artifacts/founder-access-browser.json',JSON.stringify({result:'PASS',engine:'Playwright WebKit, not a physical iPhone',widths:[320,390,430,768,1280],data:'Synthetic API responses only',productionWrites:0,checks:['owner API 401/no-store','Lifetime controls disabled','recorded and requested usernames separate','pending status only','saved request after reload','stale edits preserved','no automatic retry','withdrawn replay remains withdrawn','no horizontal overflow']},null,2));
 console.log('PASS synthetic customer access UI at 320/390/430/768/1280: pending requests, Lifetime guards, persistence and conflict recovery. No provider called.');
}finally{await browser?.close();server.kill('SIGTERM');}
