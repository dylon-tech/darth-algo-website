import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright-core';

// CI-only fixture transport. Production has no fixture URL, auth override,
// seeded customer, or alternate source endpoint added for these checks.
const port=3241,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{
  stdio:'inherit',env:{...process.env,DATABASE_URL:'',AI_OS_ENABLED:'false',AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'},
});
const widths=[320,390,430,768,1280],stamp=()=>new Date().toISOString();
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dayOffset=n=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const dayLabel=day=>new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'America/New_York'});
const templates=[
  {id:'DA-PHOTO-20261112-v4-REFINED',name:'Photo v4 · approved design',type:'image',description:'Approved design, synthetic test data.'},
  {id:'DA-VIDEO-v15',name:'Video v15 · approved edit',type:'video',description:'Approved edit, synthetic test data.'},
];
const customer={
  id:'cus_fixture_only',name:'Synthetic Long Customer Name for Layout Verification',email:'layout-test@example.invalid',
  tradingViewUsername:'Synthetic_chart_username',usernameStatus:'recorded',plans:['Pro Lifetime'],status:'Lifetime',
  subscriptions:[{id:'sub_fixture',plan:'Pro monthly',status:'canceled',currency:'usd',amountCents:2900,cadence:'month',nextChargeAt:null,paidThrough:null,cancelAtPeriodEnd:true,cancelAt:null,billingUrl:null}],
  access:{expected:[{plan:'Pro Lifetime',sourceId:'cs_fixture',expiresAt:null,kind:'lifetime'}],confirmed:'unknown',lastVerifiedAt:null,note:'Synthetic billing evidence; provider access has not been verified.'},
  payments:[],billingUrl:null,identityStatus:'Synthetic test customer. Not a real account.',
};
function finance(){return {
  version:'synthetic',status:'partial',checkedAt:stamp(),lastSuccessAt:null,currency:'usd',period:{start:dayOffset(-30),end:stamp(),label:'Last 30 days'},
  coverage:{subscriptions:false,invoices:false,sessions:false,charges:false,refunds:false,balances:false,allTimeAvailable:false,attributionComplete:false,taxComplete:false,excludedUnlinkedCharges:0,currencies:[],source:'Synthetic unavailable financial fixture'},
  metrics:{grossPaymentsCents:null,collectedSalesCents:null,refundsCents:null,processorNetCents:null,processingFeesCents:null,netSalesCashCents:null,overdueCents:null,mrrCents:null,atRiskMrrCents:null,annualRunRateCents:null,payingCustomers:null,historicalPaidCustomers:null,recurringCustomers:null,lifetimeCustomers:null,trialCustomers:null,profitCents:null,payoutsCents:null},
  forecast:[30,90,365].map(days=>({days,amountCents:null,atRiskCents:null,status:'unavailable',assumptions:'Synthetic data only.',issues:[]})),
  trend:null,customers:[customer],payments:[],issues:['Synthetic incomplete coverage. No financial amount is known.'],
  definitions:{collectedSales:'Known sales only.',mrr:'Lifetime excluded from recurring revenue.',forecast:'Existing customers only; unavailable terms stay unknown.',processorNet:'Processor net before tax, not profit.',profit:'Expense coverage is incomplete.',customers:'Synthetic customer for UI verification.',access:'Independent Lifetime entitlement remains valid.'},
};}
const inboxId='support:603bbf53-63a3-4bf4-a2de-98eb04301931';
const inboxItems=[{id:inboxId,category:'customer',kind:'support',title:'Synthetic question: find my invite-only indicator',preview:'A synthetic customer asks where the indicator appears after purchase.',body:'Synthetic support summary for browser testing. Where can I find invite-only indicators? This is not a real email.',sender:'Synthetic customer',at:stamp(),source:'Synthetic support ledger',sourceHref:'https://mail.google.com/',customerId:'cus_inbox_fixture',jobId:null,runId:null,severity:'info',sourceStatus:'open',contentCoverage:'summary_only',unread:true,state:{version:0,readAt:null,snoozedUntil:null,resolvedAt:null,draft:'',updatedAt:null}}];
const agentUpdate={id:'message:074c7459-9967-49b7-806d-bb61158bc056',category:'agent',kind:'agent_message',title:'Synthetic content agent technical report',preview:'A synthetic persisted report, not a provider result.',
  body:'Result: Synthetic agent saved two drafts. Rendering is not connected.\nNext: Connect the verified renderer before creating media.\nJob id: synthetic-inbox-job-only',sender:'Synthetic content agent',at:stamp(),source:'Synthetic agent messages',sourceHref:'/owner?view=team',customerId:null,jobId:null,runId:null,severity:'info',sourceStatus:'recorded',contentCoverage:'full_message',unread:true,
  summary:{result:'Synthetic agent saved two drafts. Rendering is not connected.',action:'Connect the verified renderer before creating media.',actionLabel:'Next',basis:'message_excerpt'},
  state:{version:0,readAt:null,snoozedUntil:null,resolvedAt:null,draft:'',updatedAt:null}};
inboxItems.push(agentUpdate);
const inboxHistory=[],inboxRequests=[];let forceInboxConflict=false;
const inbox={checkedAt:stamp(),status:'ready',items:inboxItems,unreadCount:2,statePersistence:'ready',sources:[{id:'support',status:'read',returned:1,limit:80,bounded:false,lastRecordAt:stamp()},{id:'messages',status:'read',returned:1,limit:80,bounded:false,lastRecordAt:stamp()}],coverage:'Synthetic test fixture; email synchronization unavailable.',
  email:{status:'disconnected',source:'Gmail',lastSuccessfulSyncAt:null,reason:'Email synchronization has not been connected.',href:'https://mail.google.com/'},
  capabilities:{readNativeMessages:true,saveDraft:true,markRead:true,snooze:true,resolveInboxItem:true,emailSync:false,aiDraft:false,sendEmail:false},
};
const items=[],requests=[],contentReads=[],jobs=[],replies=new Map();let forceConflict=false,rendererAvailable=false;
const itemId='74957c09-02d2-4bad-b079-4aa7be183404';
const rendererError='Synthetic renderer unavailable. Connect a verified renderer before starting creation.';
const agent={paused:true,version:1,status:'Off',lastSeenAt:null,lastCreatedCount:null,lastSuccessfulRun:null,nextRun:null,currentWork:null,incrementalBudgetUsd:0,publishingPause:'not_confirmed',message:'Synthetic creation is off. No provider was called.'};
const acceptedMessage=type=>`Synthetic ${type} job accepted by the test queue. No provider was called.`;
function queueSyntheticJob(item,source){
  item.version++;item.status='generating';item.jobId=randomUUID();item.updatedAt=stamp();item.lastError=null;
  const job={id:item.jobId,itemId:item.id,contentVersion:item.version,type:item.type,source,status:'queued',stage:'Queued',progress:0,attempts:0,retryable:false,createdAt:stamp(),updatedAt:stamp(),startedAt:null,finishedAt:null,error:null};
  Object.assign(item,{renderStatus:job.status,renderStage:job.stage,renderProgress:job.progress});
  jobs.push(job);return job;
}
function startSyntheticJob(item){
  const job=jobs.find(job=>job.id===item.jobId);assert.equal(job?.status,'queued','Only an accepted queued job can start');
  Object.assign(job,{status:'running',stage:'Rendering',progress:35,attempts:1,startedAt:stamp(),updatedAt:stamp()});
  // Worker progress changes independently from the protected content version.
  Object.assign(item,{renderStatus:job.status,renderStage:job.stage,renderProgress:job.progress});
}
function finishSyntheticJob(item,error=null){
  const job=jobs.find(job=>job.id===item.jobId);assert.equal(job?.status,'running','Only a running synthetic job can finish');
  Object.assign(job,{status:error?'failed':'completed',stage:error?'Failed':'Saved',progress:error?0:100,retryable:Boolean(error),error,updatedAt:stamp(),finishedAt:stamp()});
  Object.assign(item,{version:item.version+1,status:error?'failed':'checking',lastError:error,updatedAt:stamp(),renderStatus:job.status,renderStage:job.stage,renderProgress:job.progress});
  if(!error){assert.equal(item.type,'image','Completed fixture uses an existing public chart image');Object.assign(item,{mediaAssetId:randomUUID(),mediaUrl:'/indicators/swing-overview.png',mediaVerifiedAt:stamp()});}
}
function content(month=today.slice(0,7)){
  const future=items.filter(item=>item.day>today&&item.day<=dayOffset(5)&&!item.extra&&item.status!=='archived'),active=future.filter(item=>!['held','skipped'].includes(item.status));
  const generated=active.filter(item=>item.mediaAssetId&&item.mediaVerifiedAt&&(item.type==='image'||item.coverAssetId)).length,produced=active.filter(item=>item.status==='ready'&&item.mediaAssetId&&item.mediaVerifiedAt).length;
  return {checkedAt:stamp(),today,timeZone:'America/New_York',month,items,archivedItems:[],templates,jobs,
    days:Array.from({length:6},(_,n)=>({day:dayOffset(n),isToday:n===0,slots:['image','video'].map(type=>{
      const item=items.find(i=>i.day===dayOffset(n)&&i.type===type&&!i.extra);
      return {type,time:item?.time||(type==='image'?'09:00':'15:00'),itemId:item?.id||null,state:item?.status||'missing',remainingToday:n===0};
    })})),
    coverage:{futureDays:5,expectedOriginals:10,planned:active.length,generated,produced,scheduled:0,published:0,skipped:future.filter(item=>item.status==='skipped').length,held:future.filter(item=>item.status==='held').length,missing:10-future.length,expectedDeliveries:0,acceptedDeliveries:0,publishedDeliveries:0,todayRemaining:2,definition:'Ten original future slots. Generated files still need review; plans and jobs are not finished media or accepted schedules.'},
    agent:{...agent,generated,counts:Object.fromEntries(['queued','running','failed','blocked','completed'].map(status=>[status,jobs.filter(job=>job.status===status).length]))},
    capabilities:{drafts:true,uploads:true,imageGeneration:rendererAvailable,videoGeneration:rendererAvailable,scheduling:false,publishingPause:false,rendererReason:rendererAvailable?'Synthetic renderer transport only.':rendererError,publisherReason:'No calendar scheduling executor is connected.'},
    legacyQueue:{checkedAt:stamp(),today,items:[]},legacyQueueError:null,truncated:false,
  };
}
const media={checkedAt:stamp(),assets:[],capabilities:{upload:true,accepted:['image/jpeg','image/png','image/webp','video/mp4'],maxFileBytes:33554432,maxStoredBytes:268435456,chunkBytes:1048576,conversion:'Synthetic fixture. JPEG/PNG/WebP and H.264 MP4 accepted.',generation:{available:false,reason:'Synthetic media capability fixture.'},privacy:'Private owner originals; no publication implied.'}};
let browser,context,page;
const errors=[];
async function noOverflow(label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: horizontal overflow`);}
async function nav(name){
  const navigation=page.locator('nav[aria-label="Main navigation"]:visible,nav[aria-label="Desktop navigation"]:visible');
  await navigation.getByRole('button',{name,exact:true}).click();
  await page.getByRole('heading',{name:name==='Overview'?'Business overview':name,exact:true,level:1}).waitFor();
}
async function closeDialog(){await page.getByRole('dialog').getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});}

try{
  let ready=false;
  for(let n=0;n<90;n++){try{if((await fetch(origin+'/owner')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
  assert.ok(ready,'Local production build starts');
  for(const endpoint of ['founder-finance','founder-content','founder-inbox','founder-media']){
    const read=await fetch(`${origin}/api/owner/${endpoint}`);assert.equal(read.status,401,`${endpoint} private read`);assert.match(read.headers.get('cache-control')||'',/no-store/);
    if(endpoint!=='founder-finance')assert.equal((await fetch(`${origin}/api/owner/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401,`${endpoint} private mutation`);
  }
  browser=await webkit.launch({headless:true});
  context=await browser.newContext({viewport:{width:390,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/owner/**',async route=>{
    const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)});
    if(name==='session')return reply({authenticated:true});
    if(name==='founder-finance')return reply(finance());
    if(name==='founder-inbox'){
      if(request.method()==='GET'){
        const id=url.searchParams.get('id');
        if(!id)return reply({...inbox,checkedAt:stamp(),unreadCount:inboxItems.filter(item=>!item.state.readAt&&!item.state.resolvedAt&&!(item.state.snoozedUntil&&Date.parse(item.state.snoozedUntil)>Date.now())).length});
        const item=inboxItems.find(value=>value.id===id);if(!item)return reply({error:'Synthetic message not found.'},404);
        return reply({item,messages:[{id:item.id,role:item.category==='customer'?'summary':'agent',body:item.body,at:item.at,truncated:item.contentCoverage==='summary_only'}],draftHistory:item.category==='customer'?inboxHistory:[],stateAvailable:true,email:inbox.email,canSend:false,checkedAt:stamp()});
      }
      const body=request.postDataJSON();inboxRequests.push(body);
      assert.equal(body.operation,'update','Inbox only changes a safe draft or presentation state');
      const item=inboxItems.find(value=>value.id===body.id);assert.ok(item,'Known synthetic Inbox item');
      if(forceInboxConflict){forceInboxConflict=false;item.state.version++;item.state.draft='A newer account reply from the computer';item.state.updatedAt=stamp();return reply({error:'This item changed on another device.',state:item.state},409);}
      assert.equal(body.expectedVersion,item.state.version,'Inbox saves compare the account version');
      const patch=body.patch,previousDraft=item.state.draft;
      item.state={...item.state,version:item.state.version+1,updatedAt:stamp(),draft:typeof patch.draft==='string'?patch.draft:item.state.draft,
        readAt:patch.read===undefined?item.state.readAt:patch.read?stamp():null,resolvedAt:patch.resolved===undefined?item.state.resolvedAt:patch.resolved?stamp():null,
        snoozedUntil:patch.snoozedUntil===undefined?item.state.snoozedUntil:patch.snoozedUntil};
      item.unread=!item.state.readAt;
      if(item.state.draft!==previousDraft)inboxHistory.unshift({version:item.state.version,body:item.state.draft,at:stamp()});
      return reply({status:'saved',state:item.state,message:'Draft saved to your account. No email was sent.',sent:false});
    }
    if(name==='founder-media')return reply(media);
    if(name==='acquisition')return reply({checkedAt:stamp(),visits:{status:'unavailable',data:null},conversions:{status:'unavailable',data:null}});
    if(name!=='founder-content')return reply({error:'No synthetic route for this operation.'},503);
    if(request.method()==='GET'){
      const id=url.searchParams.get('id');contentReads.push({id,at:stamp()});const item=id?items.find(i=>i.id===id):null;return reply(id?{item,job:jobs.find(job=>job.id===item?.jobId)||null,versions:[],historyLimit:30}:content(url.searchParams.get('month')||undefined));
    }
    const body=request.postDataJSON();requests.push(body);
    assert.ok(typeof body.requestKey==='string'&&body.requestKey.length>0,'Content writes carry a retry key');
    if(replies.has(body.requestKey))return reply(replies.get(body.requestKey));
    const accepted=response=>{const snapshot=structuredClone(response);replies.set(body.requestKey,snapshot);return reply(snapshot);};
    if(body.operation==='agent'){
      assert.equal(body.expectedVersion,agent.version,'Agent changes compare the account version');
      if(!body.paused&&!rendererAvailable)return reply({error:rendererError,code:'RENDERER_NOT_CONNECTED'},409);
      agent.paused=body.paused;agent.version++;
      if(body.paused){
        for(const job of jobs.filter(job=>job.status==='queued'))Object.assign(job,{status:'canceled',stage:'Paused',updatedAt:stamp()});
        Object.assign(agent,{status:'Off',currentWork:null,message:'Synthetic creation paused. Existing schedules were unchanged.'});
        return accepted({paused:true,version:agent.version,message:agent.message});
      }
      assert.equal(items.length,0,'Five-day agent scenario begins with an isolated empty synthetic calendar');
      for(let day=1;day<=5;day++)for(const type of ['image','video']){
        const item={id:randomUUID(),version:1,day:dayOffset(day),time:type==='image'?'09:00':'15:00',type,title:`Synthetic agent ${type} for ${dayOffset(day)}`,idea:'A synthetic educational media idea.',script:'',caption:'',templateId:templates.find(template=>template.type===type).id,destinations:[],mediaAssetId:null,coverAssetId:null,mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,extra:false,locked:false,status:'draft',createdAt:stamp(),updatedAt:stamp(),deliveries:[],jobId:null,lastError:null};
        items.push(item);queueSyntheticJob(item,'agent');
      }
      Object.assign(agent,{status:'Queued',lastSeenAt:stamp(),lastCreatedCount:10,currentWork:'Ten synthetic media jobs are queued.',message:'Synthetic agent queued ten jobs for the next five days. No provider was called.'});
      return accepted({paused:false,version:agent.version,items,jobs,message:agent.message});
    }
    if(body.operation==='generate'){
      const current=items.find(item=>item.id===body.id);assert.ok(current,'Generation uses a saved account item');
      assert.equal(body.expectedVersion,current.version,'Generation uses the confirmed saved version');
      if(!rendererAvailable)return reply({error:rendererError,code:'RENDERER_NOT_CONNECTED'},409);
      const job=queueSyntheticJob(current,'owner');return accepted({item:current,job,message:acceptedMessage(current.type),duplicate:false});
    }
    assert.equal(body.operation,'save','Browser requests only the draft or explicitly chosen generation/agent action');
    const saved=body.item,current=saved.id?items.find(i=>i.id===saved.id):null;
    if(forceConflict){
      forceConflict=false;assert.ok(current);current.version++;current.caption='A newer computer edit';
      return reply({error:'This content changed on another device. Review the current saved version before saving.',code:'VERSION_CONFLICT',current},409);
    }
    if(current)assert.equal(saved.expectedVersion,current.version);
    const item={...saved,id:current?.id||(items.length?randomUUID():itemId),version:(current?.version||0)+1,status:'draft',locked:true,
      mediaAssetId:null,coverAssetId:null,mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,extra:Boolean(saved.extra),
      createdAt:current?.createdAt||stamp(),updatedAt:stamp(),deliveries:[],jobId:null,lastError:null,renderStatus:null,renderStage:null,renderProgress:0};
    delete item.expectedVersion;if(current)Object.assign(current,item);else items.push(item);
    return accepted({item,message:'Saved to account. Your edit is protected from agent changes.',duplicate:false});
  });
  await mkdir('artifacts',{recursive:true});
  await page.goto(origin+'/owner',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Business overview',exact:true,level:1}).waitFor();
  await page.getByText(customer.name,{exact:true}).first().waitFor();
  const sales=page.getByRole('region',{name:'Collected sales',exact:true});
  await sales.getByText('Waiting for complete payment and tax evidence',{exact:true}).waitFor();
  assert.match(await sales.innerText(),/—/);assert.doesNotMatch(await sales.innerText(),/\$\d/,'Unavailable sales must not become zero or sample amounts');
  assert.ok(await page.getByRole('option',{name:'All time',exact:true}).isDisabled());
  for(const width of widths){
    await page.setViewportSize({width,height:852});
    for(const tab of ['Overview','Customers','Inbox','Content','Analytics']){
      await nav(tab);await noOverflow(`${tab} at ${width}`);
      const navigation=page.locator('nav[aria-label="Main navigation"]:visible,nav[aria-label="Desktop navigation"]:visible');
      assert.equal(await navigation.getByRole('button').count(),5,'Five stable destinations');
      if(width===390||width===1280)await page.screenshot({path:`artifacts/founder-${tab.toLowerCase()}-${width}-synthetic.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:390,height:852});await nav('Customers');
  await page.getByRole('textbox',{name:'Search customers',exact:true}).fill('Synthetic');
  const opener=page.getByRole('button',{name:new RegExp(customer.name)});await opener.focus();await opener.click();
  const detail=page.getByRole('dialog',{name:'Customer details'});await detail.waitFor();
  await detail.getByText(/Canceling a monthly subscription does not cancel Lifetime entitlement/).waitFor();
  assert.ok(await detail.getByText('Unknown',{exact:true}).isVisible());
  for(let n=0;n<7;n++){await page.keyboard.press('Tab');assert.ok(await detail.evaluate(el=>el.contains(document.activeElement)),'Dialog keeps keyboard focus');}
  await noOverflow('Customer detail');await page.screenshot({path:'artifacts/founder-customer-detail-synthetic.png',fullPage:true});
  await closeDialog();assert.ok(await opener.evaluate(el=>el===document.activeElement),'Back restores customer opener focus');
  assert.equal(await page.getByRole('textbox',{name:'Search customers'}).inputValue(),'Synthetic','Search survives detail navigation');

  // Inbox uses the real list/detail contract, with only synthetic transport and
  // safe local/account draft writes. No Gmail request or email send is made.
  await nav('Inbox');
  await page.getByRole('button',{name:'Customer messages',exact:true}).click();
  await page.getByRole('button',{name:/Synthetic question: find my invite-only indicator/}).click();
  const conversation=page.getByRole('dialog',{name:'Customer conversation'});await conversation.waitFor();
  await conversation.getByText('Synthetic support summary for browser testing. Where can I find invite-only indicators? This is not a real email.',{exact:true}).waitFor();
  await conversation.getByText(/This is a saved summary, not the complete original thread/).waitFor();
  assert.equal(await conversation.getByRole('button',{name:/^Send(?: reply| email)?$/}).count(),0,'Unconnected sending cannot appear as an executable action');
  const replyField=conversation.getByRole('textbox',{name:/^Your reply/});
  await replyField.fill('Synthetic saved reply: open Indicators, then Invite-only scripts.');
  await conversation.getByRole('button',{name:'Save draft',exact:true}).click();
  await conversation.getByText('Draft saved to your account. No email was sent.',{exact:true}).waitFor();
  assert.equal(inboxItems[0].state.version,1);assert.equal(inboxItems[0].state.draft,'Synthetic saved reply: open Indicators, then Invite-only scripts.');
  await noOverflow('Populated Inbox detail');await page.screenshot({path:'artifacts/founder-inbox-detail-synthetic.png',fullPage:true});
  await closeDialog();await page.reload();
  await page.getByRole('heading',{name:'Inbox',exact:true,level:1}).waitFor();
  await page.getByRole('button',{name:'Customer messages',exact:true,pressed:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Customer messages',exact:true}).getAttribute('aria-pressed'),'true','Inbox filter survives reload');
  await page.getByRole('button',{name:/Synthetic question: find my invite-only indicator/}).click();await conversation.waitFor();
  await replyField.waitFor();
  await page.waitForFunction(expected=>document.querySelector('dialog textarea')?.value===expected,'Synthetic saved reply: open Indicators, then Invite-only scripts.');
  await replyField.fill('Unfinished phone reply remains after returning to the list.');
  await closeDialog();await page.getByRole('button',{name:/Synthetic question: find my invite-only indicator/}).click();await conversation.waitFor();
  await page.waitForFunction(expected=>document.querySelector('dialog textarea')?.value===expected,'Unfinished phone reply remains after returning to the list.');
  forceInboxConflict=true;await conversation.getByRole('button',{name:'Save draft',exact:true}).click();
  await conversation.getByText('Review the newer account version',{exact:true}).waitFor();
  assert.equal(await replyField.inputValue(),'Unfinished phone reply remains after returning to the list.','Inbox conflict preserves the phone reply');
  await conversation.getByText(/Show account draft/).click();
  await conversation.getByText('A newer account reply from the computer',{exact:true}).waitFor();
  await noOverflow('Inbox conflict');await page.screenshot({path:'artifacts/founder-inbox-conflict-synthetic.png',fullPage:true});
  await conversation.getByRole('button',{name:'Keep my draft',exact:true}).click();
  const inboxWritesBeforeOffline=inboxRequests.length;
  await context.setOffline(true);await replyField.fill('Offline synthetic reply, saved only when I choose.');
  await conversation.getByText(/Offline draft\. Your reply stays in this browser session/).waitFor();
  assert.ok(await conversation.getByRole('button',{name:'Save draft',exact:true}).isDisabled(),'Offline Inbox draft cannot dispatch');
  assert.equal(inboxRequests.length,inboxWritesBeforeOffline,'Offline Inbox changes never send');
  await context.setOffline(false);
  await page.waitForFunction(()=>navigator.onLine);
  assert.equal(inboxRequests.length,inboxWritesBeforeOffline,'Reconnection does not submit the unfinished reply');
  assert.equal(await replyField.inputValue(),'Offline synthetic reply, saved only when I choose.');
  await conversation.getByRole('button',{name:'Save draft',exact:true}).click();
  await conversation.getByText('Draft saved to your account. No email was sent.',{exact:true}).waitFor();
  assert.equal(inboxItems[0].state.draft,'Offline synthetic reply, saved only when I choose.');
  await conversation.getByRole('button',{name:'Mark read',exact:true}).click();
  await conversation.getByRole('button',{name:'Mark unread',exact:true}).waitFor();
  assert.ok(inboxItems[0].state.readAt,'Reading is persisted separately from the draft');
  await closeDialog();
  await page.getByRole('button',{name:'Agent updates',exact:true}).click();
  const updateOpener=page.getByRole('button',{name:/Synthetic agent saved two drafts\. Rendering is not connected\./});
  await updateOpener.waitFor();assert.equal(await page.getByText(/synthetic-inbox-job-only/).count(),0,'Inbox list shows a short result and next step');
  await updateOpener.click();const update=page.getByRole('dialog',{name:'Agent update'});await update.waitFor();
  await update.getByRole('heading',{name:agentUpdate.summary.result,exact:true}).waitFor();
  await update.getByText('Next: '+agentUpdate.summary.action,{exact:true}).waitFor();
  const originalUpdate=update.locator('details').filter({hasText:'Original update'});
  assert.equal(await originalUpdate.getAttribute('open'),null,'The original technical update is collapsed by default');
  assert.equal(await update.getByRole('button',{name:'Snooze 24 hours',exact:true}).count(),0,'Secondary Inbox actions stay under optional controls');
  await update.getByText('Original update',{exact:true}).click();
  await update.getByText(agentUpdate.body,{exact:true}).waitFor();
  await noOverflow('Plain Inbox agent update');await page.screenshot({path:'artifacts/founder-inbox-agent-summary-synthetic.png',fullPage:true});
  await closeDialog();

  await nav('Content');
  await page.getByRole('button',{name:'Month',exact:true}).click();
  await noOverflow('Month calendar');
  await page.getByRole('button',{name:'Agenda',exact:true}).click();
  for(let day=0;day<6;day++)assert.ok(await page.getByRole('button',{name:`Add content ${dayOffset(day)}`,exact:true}).isVisible(),'Agenda retains today and all five future dates');
  await page.getByRole('button',{name:'Month',exact:true}).click();
  const targetDay=dayOffset(3);
  if(targetDay.slice(0,7)!==today.slice(0,7))await page.getByRole('button',{name:'Next month',exact:true}).click();
  await page.getByRole('button',{name:`${dayLabel(targetDay)}, 0 items`,exact:true}).click();
  await page.getByRole('button',{name:`Create image on ${targetDay}`,exact:true}).click();
  const editor=page.getByRole('dialog');await editor.waitFor();
  await editor.getByRole('textbox',{name:'Idea',exact:true}).waitFor();
  assert.ok(await editor.getByRole('button',{name:'Image',exact:true}).isVisible());assert.ok(await editor.getByRole('button',{name:'Video',exact:true}).isVisible());
  assert.equal(await editor.getByRole('textbox').count(),1,'A new draft starts with only the idea field');
  for(const label of ['Title','Caption','Date','Time (Eastern)'])assert.equal(await editor.getByLabel(label,{exact:true}).isVisible(),false,`${label} stays under optional controls`);
  assert.ok(await editor.getByRole('button',{name:'Save draft',exact:true}).isDisabled(),'An empty idea and title cannot save');
  assert.ok(await editor.getByRole('button',{name:'Generate image',exact:true}).isDisabled(),'An empty idea and title cannot generate');
  assert.equal(await editor.getByRole('button',{name:'Save to account',exact:true}).count(),0,'An ungenerated idea is clearly saved as a draft');
  await noOverflow('Simple new content editor');await page.screenshot({path:'artifacts/founder-create-simple-synthetic.png',fullPage:true});
  await editor.getByText('Caption, date & other options',{exact:true}).click();
  assert.equal(await editor.getByRole('textbox',{name:'Title',exact:true}).getAttribute('maxlength'),'160','Title limit matches the server contract');
  assert.equal(await editor.getByLabel('Date',{exact:true}).inputValue(),targetDay,'An empty calendar date carries into the editor');
  await editor.getByRole('textbox',{name:'Title',exact:true}).fill('Synthetic calendar persistence check');
  await editor.getByRole('textbox',{name:'Idea',exact:true}).fill('A safe fixture idea. No real campaign or generation.');
  await editor.getByRole('textbox',{name:'Caption',exact:true}).fill('Initial phone caption');
  await editor.getByLabel('Date',{exact:true}).fill(dayOffset(3));
  await editor.getByLabel('Time (Eastern)',{exact:true}).fill('09:00');
  await editor.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByText(/Saved to account/).first().waitFor();
  assert.equal(items.length,1);assert.equal(items[0].day,dayOffset(3));assert.equal(items[0].caption,'Initial phone caption');
  if(await editor.isVisible())await closeDialog();
  await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();
  await page.getByRole('button',{name:/Synthetic calendar persistence check/}).first().click();
  await editor.waitFor();await editor.getByText('Caption, date & other options',{exact:true}).click();
  assert.equal(await editor.getByRole('textbox',{name:'Caption',exact:true}).inputValue(),'Initial phone caption','Reload reads the persisted account version');
  await editor.getByRole('textbox',{name:'Caption',exact:true}).fill('Unsaved phone edit must survive conflict');
  forceConflict=true;await editor.getByRole('button',{name:'Save draft',exact:true}).click();
  await editor.getByText(/changed on another device/).first().waitFor();
  assert.equal(await editor.getByRole('textbox',{name:'Caption',exact:true}).inputValue(),'Unsaved phone edit must survive conflict','409 preserves the unsaved phone draft');
  await noOverflow('Version conflict editor');await page.screenshot({path:'artifacts/founder-content-conflict-synthetic.png',fullPage:true});
  await editor.getByRole('button',{name:'Keep my draft for review',exact:true}).click();
  const writesBeforeOffline=requests.length;
  await context.setOffline(true);await editor.getByRole('textbox',{name:'Idea',exact:true}).fill('Offline text remains a local draft.');
  if(await editor.getByRole('button',{name:'Save draft',exact:true}).isEnabled())await editor.getByRole('button',{name:'Save draft',exact:true}).click();
  assert.equal(requests.length,writesBeforeOffline,'Offline save cannot silently dispatch a protected action');
  await context.setOffline(false);
  await editor.getByText('Device draft · ready to save',{exact:true}).waitFor();
  assert.equal(await editor.getByRole('textbox',{name:'Idea',exact:true}).inputValue(),'Offline text remains a local draft.');
  assert.equal(requests.length,writesBeforeOffline,'Reconnect does not silently submit the offline draft');

  // Increase rendered text by 25% without changing the viewport. Native iOS
  // Dynamic Type and software-keyboard testing remain separate release checks.
  await page.evaluate(()=>{
    const sizes=Array.from(document.querySelectorAll('main p,main button,main input,main label,dialog p,dialog input,dialog textarea,dialog select,dialog label,dialog button,dialog small')).map(node=>({node,size:parseFloat(getComputedStyle(node).fontSize)}));
    for(const {node,size} of sizes)node.style.fontSize=(size*1.25)+'px';
  });
  await page.setViewportSize({width:430,height:852});await noOverflow('125% text size');
  assert.ok(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Enlarged editor text reflows inside the dialog');
  await editor.getByRole('textbox',{name:'Caption',exact:true}).focus();
  const saveBox=await editor.getByRole('button',{name:'Save draft',exact:true}).boundingBox();
  assert.ok(saveBox&&saveBox.height>=32&&saveBox.y>=0&&saveBox.y+saveBox.height<=853,'Editor save action stays visible with enlarged text');
  await page.screenshot({path:'artifacts/founder-editor-enlarged-synthetic.png',fullPage:true});

  // Accepted jobs, their errors, and completed files below are synthetic API
  // responses. This tests the real UI contract without calling a renderer.
  await closeDialog();rendererAvailable=true;await page.reload();
  await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();
  await page.setViewportSize({width:390,height:852});await page.getByRole('button',{name:'Agenda',exact:true}).click();
  await page.getByRole('button',{name:`Create image on ${dayOffset(1)}`,exact:true}).click();await editor.waitFor();
  const imageIdea='Synthetic image creation from a saved idea.',imageTitle=imageIdea.slice(0,-1),imageWritesBefore=requests.length;
  await editor.getByRole('textbox',{name:'Idea',exact:true}).fill(imageIdea);
  assert.equal(await editor.getByLabel('Title',{exact:true}).inputValue(),'','The owner need not invent a separate title');
  await editor.getByRole('button',{name:'Generate image',exact:true}).click();
  await editor.getByRole('button',{name:'Queued',exact:true}).waitFor();
  await editor.getByText('Device draft · not saved to account',{exact:true}).waitFor({state:'hidden'});
  assert.equal(await editor.getByText('Device draft · not saved to account',{exact:true}).count(),0,'A server-accepted saved idea must not remain labeled unsaved');
  const imageWrites=requests.slice(imageWritesBefore),imageItem=items.find(item=>item.idea===imageIdea);
  assert.deepEqual(imageWrites.map(body=>body.operation),['save','generate'],'Generate first saves the idea, then requests a real job contract');
  assert.equal(imageWrites[0].item.title,imageTitle,'The title is derived from the idea before saving');
  assert.equal(imageWrites[1].id,imageItem.id);assert.equal(imageWrites[1].expectedVersion,1);
  assert.ok(imageItem.jobId,'The queued state comes from the accepted server job');
  assert.ok(await editor.getByRole('button',{name:'Queued',exact:true}).isDisabled());
  assert.equal(await editor.getByRole('button',{name:'Creating…',exact:true}).count(),0,'Accepted queue work is not presented as running');
  await editor.getByText('Queued for the next worker check. You can leave and come back.',{exact:true}).waitFor();
  await noOverflow('Accepted image generation');await page.screenshot({path:'artifacts/founder-generation-queued-synthetic.png',fullPage:true});
  await closeDialog();await nav('Overview');await nav('Content');
  await page.getByRole('button',{name:new RegExp(imageTitle)}).click();await editor.waitFor();
  await editor.getByText('Queued for the next worker check. You can leave and come back.',{exact:true}).waitFor();
  const imageReadsBefore=contentReads.length,queuedImageVersion=imageItem.version;startSyntheticJob(imageItem);
  await editor.getByText('Creating your image. You can leave and come back.',{exact:true}).waitFor({timeout:20000});
  assert.ok(await editor.getByRole('button',{name:'Creating…',exact:true}).isDisabled());
  assert.equal(imageItem.version,queuedImageVersion,'Polling accepts job progress without inventing a content edit');
  finishSyntheticJob(imageItem);
  await editor.getByRole('img',{name:imageTitle,exact:true}).waitFor({timeout:20000});
  await editor.getByText('Media ready to review',{exact:true}).waitFor();
  assert.ok(contentReads.length>imageReadsBefore,'Returning to a queued job polls its running and saved outcomes');
  await editor.getByRole('button',{name:'Save to account',exact:true}).waitFor();
  await editor.getByText('Posting status',{exact:true}).click();await editor.getByText('Not scheduled or published.',{exact:true}).waitFor();
  await noOverflow('Polled image result');await closeDialog();

  await page.getByRole('button',{name:`Create video on ${dayOffset(2)}`,exact:true}).click();await editor.waitFor();
  const videoIdea='Synthetic video creation from a saved idea.',videoTitle=videoIdea.slice(0,-1),videoWritesBefore=requests.length;
  await editor.getByRole('textbox',{name:'Idea',exact:true}).fill(videoIdea);
  await editor.getByRole('button',{name:'Generate video',exact:true}).click();
  await editor.getByRole('button',{name:'Queued',exact:true}).waitFor();
  const videoWrites=requests.slice(videoWritesBefore),videoItem=items.find(item=>item.idea===videoIdea);
  assert.deepEqual(videoWrites.map(body=>body.operation),['save','generate']);assert.equal(videoWrites[0].item.title,videoTitle);
  assert.equal(videoWrites[1].id,videoItem.id);assert.ok(videoItem.jobId);
  assert.ok(await editor.getByRole('button',{name:'Queued',exact:true}).isDisabled());
  await closeDialog();await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();
  await page.getByRole('button',{name:new RegExp(videoTitle)}).click();await editor.waitFor();
  await editor.getByText('Queued for the next worker check. You can leave and come back.',{exact:true}).waitFor();
  const videoReadsBefore=contentReads.length,videoWritesBeforeFailure=requests.length,videoError='Synthetic renderer stopped. Your saved idea is safe; creation did not finish.';
  startSyntheticJob(videoItem);finishSyntheticJob(videoItem,videoError);
  await editor.getByText(videoError,{exact:true}).first().waitFor({timeout:20000});
  assert.ok(contentReads.length>videoReadsBefore,'Reloaded job details poll for the real server outcome');
  assert.equal(requests.length,videoWritesBeforeFailure,'A failed job does not silently trigger another generation');
  assert.ok(await editor.getByRole('button',{name:'Generate video',exact:true}).isEnabled(),'Failed generation offers an explicit retry');
  assert.equal(await editor.locator('video').count(),0,'Failure cannot be presented as a completed video');
  await noOverflow('Polled video failure');await page.screenshot({path:'artifacts/founder-generation-failed-synthetic.png',fullPage:true});await closeDialog();

  rendererAvailable=false;await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();
  await page.getByRole('button',{name:'Agent',exact:true}).click();
  const jobsBeforeBlockedStart=jobs.length,itemsBeforeBlockedStart=items.length;
  await page.getByRole('button',{name:'Start agent',exact:true}).click();
  await page.getByText(rendererError,{exact:true}).first().waitFor();
  assert.ok(await page.getByRole('button',{name:'Start agent',exact:true}).isEnabled());
  await page.getByText('Off',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Pause creation',exact:true}).count(),0,'Unavailable renderer cannot look enabled');
  assert.equal(agent.paused,true);assert.equal(agent.version,1);assert.equal(jobs.length,jobsBeforeBlockedStart);assert.equal(items.length,itemsBeforeBlockedStart,'A blocked start does not substitute idea rows for production');
  await noOverflow('Blocked content agent');await page.screenshot({path:'artifacts/founder-agent-blocked-synthetic.png',fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();await page.getByRole('button',{name:'Agent',exact:true}).click();
  await page.getByText('Off',{exact:true}).waitFor();

  // Isolate the five-day scenario after checking protected manual drafts. All
  // ten slots must have accepted synthetic jobs; empty ideas do not count.
  items.splice(0);jobs.splice(0);replies.clear();rendererAvailable=true;
  await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();await page.getByRole('button',{name:'Agent',exact:true}).click();
  await page.getByRole('button',{name:'Start agent',exact:true}).click();
  await page.getByText('Synthetic agent queued ten jobs for the next five days. No provider was called.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Pause creation',exact:true}).waitFor();
  assert.equal(agent.paused,false);assert.equal(jobs.length,10);assert.equal(items.length,10);
  for(let day=1;day<=5;day++)assert.deepEqual(items.filter(item=>item.day===dayOffset(day)).map(item=>item.type).sort(),['image','video'],'Each of five complete future dates has both original formats');
  for(const item of items)assert.ok(item.jobId&&jobs.some(job=>job.id===item.jobId&&job.itemId===item.id&&job.status==='queued'),'Every generating slot points to an accepted job');
  assert.equal(content().coverage.generated,0);assert.equal(content().coverage.produced,0,'Queued jobs are not counted as verified or reviewed files');
  const agentProgress=page.locator('[aria-live="polite"]').filter({hasText:'finished for the next five days'});
  assert.match(await agentProgress.innerText(),/0\s*\/\s*10/,'Accepted jobs do not inflate the visible finished count');
  await noOverflow('Five-day content agent');await page.screenshot({path:'artifacts/founder-agent-queued-synthetic.png',fullPage:true});
  const agentReadsBefore=contentReads.length,agentWritesBefore=requests.length;
  const agentImage=items.find(item=>item.type==='image');startSyntheticJob(agentImage);finishSyntheticJob(agentImage);agent.currentWork='Synthetic image saved for review.';
  await page.getByText(agent.currentWork,{exact:true}).waitFor({timeout:20000});
  assert.ok(contentReads.length>agentReadsBefore,'Agent progress refreshes while creation is enabled');assert.equal(requests.length,agentWritesBefore,'Progress polling does not resubmit the start action');
  assert.equal(content().coverage.generated,1);assert.equal(content().coverage.produced,0,'A saved file is separate from creative review');
  assert.match(await agentProgress.innerText(),/1\s*\/\s*10/,'Visible progress follows the server count of saved files');
  await page.getByRole('button',{name:'Pause creation',exact:true}).click();
  await page.getByText('Synthetic creation paused. Existing schedules were unchanged.',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Start agent',exact:true}).waitFor();assert.equal(agent.paused,true);
  assert.deepEqual(errors,[],'No browser runtime errors');
  const report={result:'PASS',engine:'Playwright WebKit; not a physical iPhone',widths,data:'Synthetic API responses only',productionWrites:0,
    checks:['real private API 401/no-store','five destinations','unavailable money without fake zeros','Lifetime overlap explanation and unknown provider access','dialog focus containment and restoration','populated Inbox detail and summary coverage','versioned reply save and reload','session-only unfinished reply recovery','Inbox conflict preserves local reply and exposes account version','offline Inbox never sends or auto-saves on reconnect','persisted read state preserves reply','plain agent result and next step with optional original report','idea and format first; optional caption/title/date','empty-date draft creation','Save draft for ideas without media','input limits agree with server','saved account version after reload','409 preserves unsaved text','offline/reconnect does not silently send','image and video generate save an automatic title before requesting a job','accepted server job response shown','return and reload resume generation polling','renderer failure is visible without automatic retry','unavailable agent start remains Off without queued work','agent start accepts ten synthetic jobs across five future dates','generated files stay separate from creative review and publishing','enabled agent progress polling and explicit pause','month and six-date agenda controls','no horizontal overflow','125% rendered text size']};
  await writeFile('artifacts/founder-dashboard-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){
  if(page){await page.screenshot({path:'artifacts/founder-failure-synthetic.png',fullPage:true}).catch(()=>{});await writeFile('artifacts/founder-failure-state.json',JSON.stringify({error:String(error),runtimeErrors:errors,url:page.url(),body:await page.locator('body').innerText().catch(()=>''),dialogs:await page.locator('dialog').evaluateAll(nodes=>nodes.map(node=>({open:node.open,label:node.getAttribute('aria-label'),html:node.outerHTML}))).catch(()=>[])},null,2));}
  throw error;
}finally{await context?.close();await browser?.close();server.kill('SIGTERM');}
