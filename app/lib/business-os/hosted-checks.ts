import {db} from '../affiliate-db';
import {browserStatus,ensureBrowserSchema,hostedConnection,startBrowser,stopBrowser,recordBrowserVerification} from './hosted-browser';
import {checkPrivateChart,privateTest} from './tradingview-runner';
import {queueOwnerNotice} from './delivery';
const checkId=`private-runtime:${privateTest.sourceHash}`;
const errors=new Set(['TRADINGVIEW_LOGIN_REQUIRED','TRADINGVIEW_SESSION_IN_USE','PRIVATE_LAYOUT_REQUIRED','PRIVATE_SOURCE_CHANGED','PRIVATE_INTERVAL_UNSUPPORTED','CHART_DATA_UNAVAILABLE','HOSTED_SESSION_REQUIRED','HOSTED_CONNECTION_INVALID']);
export function checkError(error:unknown){return error instanceof Error&&errors.has(error.message)?error.message:'PRIVATE_BROWSER_CHECK_FAILED';}
export async function queueHostedCheck(){
 await ensureBrowserSchema();
 const status=await browserStatus();
 if(!status.connected)throw Error('Connect Browserbase first.');
 if(!status.sessionId || !status.expiresAt || new Date(status.expiresAt).getTime()<=Date.now())throw Error('Start a sign-in session and sign in to TradingView first.');
 const rows=await db()`insert into os_browser_checks(id,status) values(${checkId},'queued') on conflict(id) do update set status='queued',error_code=null,evidence=null,started_at=null,finished_at=null where os_browser_checks.status not in ('queued','running') returning id`;
 return {queued:rows.length>0,status:rows.length?'queued':(await browserStatus()).latestCheck?.status||'queued'};
}
export async function runHostedChecks(){
 if(process.env.VERCEL_ENV!=='production'||process.env.AI_OS_ENABLED!=='true'||process.env.AI_OS_INDICATOR_LAB_ENABLED!=='true')return {status:'disabled'};
 await ensureBrowserSchema();
 const sql=db();
 await sql`update os_browser_checks set status='blocked',error_code='CHECK_INTERRUPTED',finished_at=now() where status='running' and started_at<now()-interval '5 minutes'`;
 const [control]=await sql`select paused from os_control where id=1`;if(!control||control.paused)return {status:'paused'};
 const connectionState=await browserStatus();
 if(!connectionState.connected)return {status:'connection_required'};
 // One initial private-runtime check is authorized by the setup request.
 // A blocked/finished check is never automatically requeued.
 await sql`insert into os_browser_checks(id,status) values(${checkId},'queued') on conflict do nothing`;
 const [claim]=await sql`update os_browser_checks set status='running',started_at=now() where id=${checkId} and status='queued' returning id`;
 if(!claim)return {status:'idle'};
 let browser:import('playwright-core').Browser|undefined;
 let attached=false;
 try{
  let connection;
  try{connection=await hostedConnection();}catch(error){
   if(!(error instanceof Error)||error.message!=='HOSTED_SESSION_REQUIRED')throw error;
   const status=await browserStatus();
   if(status.remainingPilotStarts<1)throw Error('HOSTED_SESSION_REQUIRED');
   await startBrowser();connection=await hostedConnection();
  }
  const {chromium}=await import('playwright-core');
  browser=await chromium.connectOverCDP(connection.endpoint,{timeout:15000});attached=true;
  const context=browser.contexts()[0];if(!context)throw Error('PRIVATE_BROWSER_CHECK_FAILED');
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://www.tradingview.com'});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  const {source,...evidence}=await checkPrivateChart(page);
  await recordBrowserVerification('verified');
  await sql`update os_browser_checks set status='checked',evidence=${sql.json(evidence)},finished_at=now() where id=${checkId} and status='running'`;
  const {importPrivateBeta}=await import('./private-beta-package');
  let imported=false;
  try{await importPrivateBeta(source,evidence);imported=true;}catch{/* Preserve real runtime evidence; release remains held if import fails. */}
  await queueOwnerNotice(`hosted-private-check:${checkId}`,'TradingView private chart checked: saved source matches, four intervals loaded, and the chart reopened. This is a runtime check; replay, educational review and public release are separate.');
  return {status:'checked',sourceHash:privateTest.sourceHash,intervals:evidence.checks.map(c=>c.interval),privateCandidateImported:imported,published:false};
 }catch(error){
  const code=checkError(error);
  await recordBrowserVerification(code);
  await sql`update os_browser_checks set status='blocked',error_code=${code},finished_at=now() where id=${checkId} and status='running'`;
  await queueOwnerNotice(`hosted-private-block:${checkId}:${code}`,code==='TRADINGVIEW_LOGIN_REQUIRED'?'TradingView needs your sign-in in the hosted browser. Open Settings → Connections → TradingView browser, sign in, then tap Finish sign-in & test.':code==='TRADINGVIEW_SESSION_IN_USE'?'TradingView is active on another device. Open the hosted browser, reconnect there, then tap Finish sign-in & test.':`The private TradingView check stopped (${code}). No release was published. Check the browser setup page.`);
  return {status:'blocked',code,published:false};
 }finally{
  // Keep the reservation if termination cannot be confirmed; never start a
  // second browser on an ambiguous outcome. API release persists the profile.
  if(attached)await stopBrowser().catch(()=>{});
  await browser?.close().catch(()=>{});
 }
}
