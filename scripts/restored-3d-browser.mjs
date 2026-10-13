import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';
const origin = 'http://127.0.0.1:3255';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3255'], {
 stdio: 'inherit', env: { ...process.env, DATABASE_URL: '', AI_OS_ENABLED: 'false', AI_OS_AI_ENABLED: 'false', AI_OS_AUTONOMY_ENABLED: 'false' },
});
const errors = [], checks = []; let browser;
try {
 let ready = false;
 for (let i=0;i<90;i++) { try { if ((await fetch(origin)).ok) {ready=true;break;} } catch {} await new Promise(r=>setTimeout(r,500)); }
 assert.ok(ready); await mkdir('artifacts/restored-3d',{recursive:true});
 for (const [name,engine,width,height] of [['desktop',chromium,1440,1000],['iphone',webkit,390,844]]) {
  browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
  await context.route('**/*',route=>{
   if (!route.request().url().startsWith(origin+'/')) return route.abort();
   if (!['GET','HEAD'].includes(route.request().method())) return route.fulfill({status:200,body:'{}'});
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
  for (const path of ['/','/products/pro','/products/scalper','/products/swing']) {
   await page.goto(origin+path,{waitUntil:'networkidle'});
   assert.equal(await page.locator('#inside-the-engine').count(),1);
   await page.getByRole('link',{name:'Explore in 3D ↓',exact:true}).click();
   const tour=page.locator('.chart-journey');
   await page.waitForFunction(()=>document.querySelector('.chart-journey')?.dataset.ready==='true');
   const renderer=await page.locator('.journey-webgl').getAttribute('data-renderer');
   assert.ok(['webgl','vector3d'].includes(renderer),`Actual 3D renderer: ${renderer}`);
   assert.equal(await tour.getAttribute('data-spatial'),'true');
   await tour.getByRole('button',{name:'03 Signals',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.chart-journey')?.dataset.chapter==='2');
   if(path==='/') await page.screenshot({path:`artifacts/restored-3d/${name}-3d.png`});
   await tour.getByRole('button',{name:'Chart view',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.journey-webgl')?.dataset.renderer==='pro-chart');
   if(['/','/products/pro'].includes(path)) {
    await tour.getByRole('button',{name:'Scalp',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.journey-webgl')?.dataset.mode==='scalp');
   }
   await tour.getByRole('button',{name:'Motion on',exact:true}).click();
   assert.equal(await tour.getAttribute('data-animated'),'false');
   await tour.getByRole('button',{name:'04 Risk',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.chart-journey')?.dataset.chapter==='3');
   if(path==='/') await page.screenshot({path:`artifacts/restored-3d/${name}-chart.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   checks.push(`${name} ${path}: 3D geometry, feature navigation, chart view, motion controls PASS`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(origin+'/#inside-the-engine',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.chart-journey')?.dataset.ready==='true');
  assert.equal(await page.locator('.chart-journey').getAttribute('data-animated'),'false');
  await page.getByRole('button',{name:'04 Risk',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.chart-journey')?.dataset.chapter==='3');
  checks.push(`${name}: reduced motion feature selection PASS`);
  await context.close();await browser.close();browser=null;
 }
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/restored-3d/report.json',JSON.stringify({result:'PASS',checks,externalWrites:0},null,2));
 console.log('PASS restored 3D and chart controls on desktop and iPhone, including reduced motion.');
} finally {await browser?.close();server.kill('SIGTERM');}
