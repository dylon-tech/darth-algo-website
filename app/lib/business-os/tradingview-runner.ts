import {createHash} from 'node:crypto';
import type {Page} from 'playwright-core';

// This runner verifies the existing, owner-authorized private layout. It never
// edits source, signs in, places trades or publishes a script/idea.
export const privateTest = {
  chartUrl:'https://www.tradingview.com/chart/Dgus0VP0/',
  layout:'Darth Algo - Range Echo Private Test',
  account:'Darth_Algo',
  title:'Darth Algo Opening Range Fakeout - Private Beta',
  sourceHash:'ac42afa13c5240d0342317c88e727ef2cf2a9bec413c7ede320523189f36578a',
} as const;
export type ChartCheck = {interval:number;rangeHigh:string;rangeLow:string};
export type RunnerEvidence = {account:string;sourceHash:string;chartUrl:string;checks:ChartCheck[];reopened:boolean;checkedAt:string};
export function exactSourceHash(value:string){return createHash('sha256').update(value).digest('hex');}
export function safeBrowserEndpoint(value:unknown){
 if(typeof value!=='string')throw Error('HOSTED_CONNECTION_INVALID');
 const u=new URL(value);
 if(u.protocol!=='wss:' || (u.hostname!=='connect.browserbase.com' && !/^connect\.[a-z0-9-]+\.browserbase\.com$/.test(u.hostname)) || u.username || u.password)throw Error('HOSTED_CONNECTION_INVALID');
 return u.href;
}
async function identity(page:Page,reconnect=false){
 await page.getByRole('button',{name:`Logged in as ${privateTest.account} Active layout: ${privateTest.layout}`,exact:true}).waitFor({state:'visible',timeout:20000}).catch(()=>{throw Error('TRADINGVIEW_LOGIN_REQUIRED');});
 if(await page.getByText('Session disconnected',{exact:true}).isVisible()){
  if(!reconnect)throw Error('TRADINGVIEW_SESSION_IN_USE');
  // Owner already authorized displacement of the other chart session.
  // Reconnect once at entry; repeated contention during the test stops the run.
  await page.getByRole('button',{name:'Connect',exact:true}).click();
  await page.getByText('Session disconnected',{exact:true}).waitFor({state:'hidden',timeout:15000});
 }
 if(page.url()!==privateTest.chartUrl)throw Error('PRIVATE_LAYOUT_REQUIRED');
}
export async function verifyHostedIdentity(page:Page){
 await page.goto(privateTest.chartUrl,{waitUntil:'domcontentloaded',timeout:25000});
 await identity(page,true);
 return {account:privateTest.account,chartUrl:privateTest.chartUrl,checkedAt:new Date().toISOString()};
}
async function sourceOnChart(page:Page){
 if(!await page.getByRole('button',{name:privateTest.title,exact:true}).isVisible()){
  const legend=page.getByRole('region',{name:'Chart #1',exact:true}).getByRole('toolbar').filter({hasText:privateTest.title});
  await legend.hover();await legend.locator('[data-qa-id="legend-pine-action"]').click();
 }
 await page.getByRole('button',{name:privateTest.title,exact:true}).waitFor({state:'visible'});
 const editor=page.getByRole('textbox',{name:'Editor content;Press Alt+F1 for Accessibility Options.',exact:true});
 await page.evaluate(()=>navigator.clipboard.writeText(''));
 await editor.click();await editor.press('ControlOrMeta+A');await editor.press('ControlOrMeta+C');
 // Read the UI's copy operation, never TradingView's private application objects.
 const copied=await page.evaluate(()=>navigator.clipboard.readText());
 if(exactSourceHash(copied)!==privateTest.sourceHash)throw Error('PRIVATE_SOURCE_CHANGED');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 return copied;
}
async function chartValues(page:Page,interval:number):Promise<ChartCheck>{
 const chart=page.getByRole('region',{name:'Chart #1',exact:true});
 const legend=chart.getByRole('toolbar').filter({hasText:privateTest.title});
 await legend.waitFor({state:'visible'});
 const high=legend.locator('[title="Opening range high"]'),low=legend.locator('[title="Opening range low"]');
 // A loaded name alone does not prove data calculated. Wait for numeric plots.
 await page.waitForFunction(({title})=>{
  const bars=Array.from(document.querySelectorAll('[role="toolbar"]')).filter(e=>e.textContent?.includes(title));
  return bars.some(e=>['Opening range high','Opening range low'].every(label=>{const t=e.querySelector(`[title="${label}"]`)?.textContent||'';return /^\d[\d,.]*$/.test(t.trim());}));
 },{title:privateTest.title},{timeout:20000}).catch(()=>{throw Error('CHART_DATA_UNAVAILABLE');});
 const rangeHigh=(await high.innerText()).trim(),rangeLow=(await low.innerText()).trim();
 if(Number(rangeHigh.replace(/,/g,''))<=Number(rangeLow.replace(/,/g,'')))throw Error('CHART_DATA_UNAVAILABLE');
 return {interval,rangeHigh,rangeLow};
}
export async function checkPrivateChart(page:Page):Promise<RunnerEvidence&{source:string}>{
 await verifyHostedIdentity(page);
 await page.getByRole('button',{name:'AAPL',exact:true}).waitFor({state:'visible'});
 await page.getByRole('button',{name:'Candles',exact:true}).waitFor({state:'visible'});
 const source=await sourceOnChart(page);
 // Only this dedicated private layout is touched. Preserve its saved defaults.
 const initial=await page.getByRole('button',{name:/^(1 minute|3 minutes|5 minutes|15 minutes)$/,exact:true}).innerText();
 const labels:Record<number,string>={1:'1 minute',3:'3 minutes',5:'5 minutes',15:'15 minutes'};
 let current=Number(initial.replace(/\D/g,''));
 if(!labels[current])throw Error('PRIVATE_INTERVAL_UNSUPPORTED');
 const checks:ChartCheck[]=[];
 try {
  for(const interval of [1,3,5,15]){
   await identity(page);
   if(current!==interval){await page.getByRole('button',{name:labels[current],exact:true}).click();await page.getByRole('gridcell',{name:labels[interval],exact:true}).click();current=interval;}
   checks.push(await chartValues(page,interval));
  }
 } finally {
  if(current!==5){await page.getByRole('button',{name:labels[current],exact:true}).click();await page.getByRole('gridcell',{name:labels[5],exact:true}).click();}
 }
 const save=page.getByRole('button',{name:'Save all charts for all symbols and intervals on your layout',exact:true});
 if(await save.isVisible())await save.click();
 await page.getByRole('button',{name:'All changes saved',exact:true}).waitFor({state:'visible'});
 await page.reload({waitUntil:'domcontentloaded',timeout:25000});
 await identity(page);await chartValues(page,5);await sourceOnChart(page);
 return {source,account:privateTest.account,sourceHash:privateTest.sourceHash,chartUrl:privateTest.chartUrl,checks,reopened:true,checkedAt:new Date().toISOString()};
}
