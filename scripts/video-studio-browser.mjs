import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const port=3233, origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{stdio:'inherit',env:{...process.env,AI_OS_ENABLED:'false',AI_OS_AI_ENABLED:'false',AI_OS_AUTONOMY_ENABLED:'false'}});
let browser;
try {
 let running=false;
 for(let i=0;i<90;i++){try{const r=await fetch(origin+'/owner');if(r.ok){running=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 assert.ok(running,'Test server did not start');
 assert.equal((await fetch(origin+'/api/owner/dashboard')).status,401,'Private dashboard must reject unauthenticated reads');
 assert.equal((await fetch(origin+'/api/owner/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'message',department:'content',message:'test',requestKey:'test-only-request'})})).status,401,'Command endpoint must reject unauthenticated writes');
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage(), pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 const keys=[];
 // Synthetic fixture only. No customer records, sessions, database writes, or paid providers.
 await page.route('**/api/owner/dashboard',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({checkedAt:new Date().toISOString(),team:[],issues:[],partial:[],desk:null,finances:null,brief:null,suggestions:[],queue:[]})}));
 await page.route('**/api/owner/command',route=>{
  assert.equal(route.request().method(),'POST');const body=route.request().postDataJSON();
  assert.equal(body.operation,'message');assert.equal(body.department,'content');assert.ok(body.message.length<=4000);assert.match(body.message,/Do not publish/);assert.match(body.requestKey,/^video-studio:[a-f0-9]{64}$/);
  keys.push(body.requestKey);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'e7bc82d0-93e2-4daa-8d38-329597b3186e',status:'queued'})});
 });
 await page.goto(origin+'/owner?view=studio');
 await page.getByRole('heading',{name:'Make your next Reel.'}).waitFor();
 await page.getByRole('textbox',{name:'On-screen headline'}).fill('CLARITY BEFORE THE CLICK.');
 await page.getByRole('button',{name:'Send to content agent',exact:true}).click();
 await page.getByRole('button',{name:'Request saved',exact:true}).waitFor();
 assert.ok(await page.getByRole('button',{name:'Request saved',exact:true}).isDisabled());assert.equal(keys.length,1);
 await page.reload();await page.getByRole('heading',{name:'Make your next Reel.'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'On-screen headline'}).inputValue(),'CLARITY BEFORE THE CLICK.');
 await page.getByRole('button',{name:'Send to content agent',exact:true}).click();await page.getByRole('button',{name:'Request saved',exact:true}).waitFor();assert.equal(keys.length,2);assert.equal(keys[0],keys[1],'Reload must reuse the same request key');
 await page.getByRole('button',{name:'HQ',exact:true}).click();await page.getByRole('heading',{name:'Headquarters',exact:true}).waitFor();
 await page.getByRole('button',{name:/Create a video/}).click();await page.getByRole('heading',{name:'Make your next Reel.'}).waitFor();assert.match(page.url(),/view=studio/);
 await page.goBack();await page.getByRole('heading',{name:'Headquarters',exact:true}).waitFor();
 await page.getByRole('button',{name:'Studio',exact:true}).click();await page.getByRole('heading',{name:'Make your next Reel.'}).waitFor();
 await context.setOffline(true);await page.getByText(/You are offline\. Saved figures/).waitFor();await context.setOffline(false);
 await mkdir('artifacts',{recursive:true});
 for(const width of [393,1280]){await page.setViewportSize({width,height:852});await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`Horizontal overflow at ${width}px`);await page.screenshot({path:`artifacts/video-studio-${width}-synthetic.png`,fullPage:true});}
 assert.deepEqual(pageErrors,[],'Browser runtime errors');
 console.log('PASS: private API auth, synthetic mobile UI, persisted drafts, idempotency, back navigation, offline feedback, no overflow at 393/1280px. Not a physical iPhone test.');
} finally {await browser?.close();server.kill('SIGTERM');}
