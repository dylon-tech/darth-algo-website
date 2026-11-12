import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
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
const inbox={checkedAt:stamp(),status:'partial',items:[],unreadCount:null,statePersistence:'available',sources:[],coverage:'Synthetic test fixture; message synchronization unavailable.',
  email:{status:'disconnected',source:'Gmail',lastSuccessfulSyncAt:null,reason:'Email synchronization has not been connected.',href:'https://mail.google.com/'},
  capabilities:{readNativeMessages:true,saveDraft:true,markRead:true,snooze:true,resolveInboxItem:true,emailSync:false,aiDraft:false,sendEmail:false},
};
const items=[],requests=[],replies=new Map();let forceConflict=false;
const itemId='74957c09-02d2-4bad-b079-4aa7be183404';
function content(month=today.slice(0,7)){
  return {checkedAt:stamp(),today,timeZone:'America/New_York',month,items,archivedItems:[],templates,
    days:Array.from({length:6},(_,n)=>({day:dayOffset(n),isToday:n===0,slots:['image','video'].map(type=>{
      const item=items.find(i=>i.day===dayOffset(n)&&i.type===type&&!i.extra);
      return {type,time:item?.time||(type==='image'?'09:00':'15:00'),itemId:item?.id||null,state:item?.status||'missing',remainingToday:n===0};
    })})),
    coverage:{futureDays:5,expectedOriginals:10,planned:items.length,produced:0,scheduled:0,published:0,skipped:0,held:0,missing:10-items.length,expectedDeliveries:0,acceptedDeliveries:0,publishedDeliveries:0,todayRemaining:2,definition:'Ten original future slots. Plans are not finished media or accepted schedules.'},
    agent:{paused:true,version:1,status:'Renderer connection required',lastSeenAt:null,lastCreatedCount:null,lastSuccessfulRun:null,nextRun:null,currentWork:null,incrementalBudgetUsd:0,publishingPause:'not_confirmed',message:'External provider schedules are unchanged.'},
    capabilities:{drafts:true,uploads:true,imageGeneration:false,videoGeneration:false,scheduling:false,publishingPause:false,rendererReason:'No verified renderer.',publisherReason:'No calendar scheduling executor is connected.'},
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
    if(name==='founder-inbox')return reply(inbox);
    if(name==='founder-media')return reply(media);
    if(name==='acquisition')return reply({checkedAt:stamp(),visits:{status:'unavailable',data:null},conversions:{status:'unavailable',data:null}});
    if(name!=='founder-content')return reply({error:'No synthetic route for this operation.'},503);
    if(request.method()==='GET'){
      const id=url.searchParams.get('id');return reply(id?{item:items.find(i=>i.id===id),versions:[],historyLimit:30}:content(url.searchParams.get('month')||undefined));
    }
    const body=request.postDataJSON();requests.push(body);
    if(replies.has(body.requestKey))return reply(replies.get(body.requestKey));
    assert.equal(body.operation,'save','Browser must only save the requested draft');
    const saved=body.item,current=saved.id?items.find(i=>i.id===saved.id):null;
    if(forceConflict){
      forceConflict=false;assert.ok(current);current.version++;current.caption='A newer computer edit';
      return reply({error:'This content changed on another device. Review the current saved version before saving.',code:'VERSION_CONFLICT',current},409);
    }
    if(current)assert.equal(saved.expectedVersion,current.version);
    const item={...saved,id:current?.id||itemId,version:(current?.version||0)+1,status:'draft',locked:true,
      mediaAssetId:null,coverAssetId:null,mediaUrl:null,coverUrl:null,mediaVerifiedAt:null,extra:Boolean(saved.extra),
      createdAt:current?.createdAt||stamp(),updatedAt:stamp(),deliveries:[],jobId:null,lastError:null};
    delete item.expectedVersion;if(current)Object.assign(current,item);else items.push(item);
    const response={item,message:'Saved to account. Your edit is protected from agent changes.',duplicate:false};replies.set(body.requestKey,response);return reply(response);
  });
  await mkdir('artifacts',{recursive:true});
  await page.goto(origin+'/owner');
  await page.getByRole('heading',{name:'Business overview',exact:true,level:1}).waitFor();
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
  assert.equal(await editor.getByLabel('Title',{exact:true}).getAttribute('maxlength'),'160','Title limit matches the server contract');
  assert.ok(await editor.getByRole('button',{name:'Save to account',exact:true}).isDisabled(),'Empty title cannot submit');
  assert.equal(await editor.getByLabel('Date',{exact:true}).inputValue(),targetDay,'An empty calendar date carries into the editor');
  await editor.getByLabel('Title',{exact:true}).fill('Synthetic calendar persistence check');
  await editor.getByLabel('Idea',{exact:true}).fill('A safe fixture idea. No real campaign or generation.');
  await editor.getByLabel('Caption',{exact:true}).fill('Initial phone caption');
  await editor.getByLabel('Date',{exact:true}).fill(dayOffset(3));
  await editor.getByLabel('Time (Eastern)',{exact:true}).fill('09:00');
  await editor.getByRole('button',{name:'Save to account',exact:true}).click();
  await page.getByText(/Saved to account/).first().waitFor();
  assert.equal(items.length,1);assert.equal(items[0].day,dayOffset(3));assert.equal(items[0].caption,'Initial phone caption');
  if(await editor.isVisible())await closeDialog();
  await page.reload();await page.getByRole('heading',{name:'Content',exact:true,level:1}).waitFor();
  await page.getByRole('button',{name:/Synthetic calendar persistence check/}).first().click();
  await editor.waitFor();assert.equal(await editor.getByLabel('Caption',{exact:true}).inputValue(),'Initial phone caption','Reload reads the persisted account version');
  await editor.getByLabel('Caption',{exact:true}).fill('Unsaved phone edit must survive conflict');
  forceConflict=true;await editor.getByRole('button',{name:'Save to account',exact:true}).click();
  await editor.getByText(/changed on another device/).waitFor();
  assert.equal(await editor.getByLabel('Caption',{exact:true}).inputValue(),'Unsaved phone edit must survive conflict','409 preserves the unsaved phone draft');
  await noOverflow('Version conflict editor');await page.screenshot({path:'artifacts/founder-content-conflict-synthetic.png',fullPage:true});
  await editor.getByRole('button',{name:'Keep my draft for review',exact:true}).click();
  const writesBeforeOffline=requests.length;
  await context.setOffline(true);await editor.getByLabel('Idea',{exact:true}).fill('Offline text remains a local draft.');
  if(await editor.getByRole('button',{name:'Save to account',exact:true}).isEnabled())await editor.getByRole('button',{name:'Save to account',exact:true}).click();
  assert.equal(requests.length,writesBeforeOffline,'Offline save cannot silently dispatch a protected action');
  await context.setOffline(false);
  await editor.getByText('Device draft · ready to save',{exact:true}).waitFor();
  assert.equal(await editor.getByLabel('Idea',{exact:true}).inputValue(),'Offline text remains a local draft.');
  assert.equal(requests.length,writesBeforeOffline,'Reconnect does not silently submit the offline draft');

  // Increase rendered text by 25% without changing the viewport. Native iOS
  // Dynamic Type and software-keyboard testing remain separate release checks.
  await page.evaluate(()=>{
    const sizes=Array.from(document.querySelectorAll('main p,main button,main input,main label,dialog p,dialog input,dialog textarea,dialog select,dialog label,dialog button,dialog small')).map(node=>({node,size:parseFloat(getComputedStyle(node).fontSize)}));
    for(const {node,size} of sizes)node.style.fontSize=(size*1.25)+'px';
  });
  await page.setViewportSize({width:430,height:852});await noOverflow('125% text size');
  assert.ok(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Enlarged editor text reflows inside the dialog');
  await editor.getByLabel('Caption',{exact:true}).focus();
  const saveBox=await editor.getByRole('button',{name:'Save to account',exact:true}).boundingBox();
  assert.ok(saveBox&&saveBox.height>=32&&saveBox.y>=0&&saveBox.y+saveBox.height<=853,'Editor save action stays visible with enlarged text');
  await page.screenshot({path:'artifacts/founder-editor-enlarged-synthetic.png',fullPage:true});
  assert.deepEqual(errors,[],'No browser runtime errors');
  const report={result:'PASS',engine:'Playwright WebKit; not a physical iPhone',widths,data:'Synthetic API responses only',productionWrites:0,
    checks:['real private API 401/no-store','five destinations','unavailable money without fake zeros','Lifetime overlap explanation and unknown provider access','dialog focus containment and restoration','empty-date draft creation','input limits agree with server','saved account version after reload','409 preserves unsaved text','offline/reconnect does not silently send','month and six-date agenda controls','no horizontal overflow','125% rendered text size']};
  await writeFile('artifacts/founder-dashboard-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await context?.close();await browser?.close();server.kill('SIGTERM');}
