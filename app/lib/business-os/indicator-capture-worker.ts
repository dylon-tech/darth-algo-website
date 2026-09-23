import type {Page} from "playwright-core";
import {db} from "../affiliate-db";
import {ensureCaptureSchema,saveIndicatorCapture} from "./indicator-captures";
import {pineChecks,pineHash} from "./indicator-policy";
import {browserStatus,hostedConnection,startBrowser,stopBrowser} from "./hosted-browser";

// Dedicated layout created during the owner's supervised preview. Never use /chart/
// (which opens the owner's personal layout), and never Save or Publish Pine here.
export const captureLayout={url:"https://www.tradingview.com/chart/386Msdr9/",name:"Darth Algo Indicator Lab Preview",account:"Darth_Algo"};
export const captureJobSchema=`
create table if not exists os_indicator_capture_jobs (
 candidate_id uuid not null references os_indicator_candidates(id),source_hash text not null,
 status text not null default 'queued' check(status in ('queued','running','captured','blocked','failed','stale')),
 attempts integer not null default 0,error_code text,capture_id uuid references os_indicator_captures(id),
 created_at timestamptz not null default now(),started_at timestamptz,finished_at timestamptz,
 primary key(candidate_id,source_hash)
);
create table if not exists os_indicator_capture_control (
 id integer primary key check(id=1),blocked_reason text,lease_until timestamptz
);
insert into os_indicator_capture_control(id) values(1) on conflict do nothing;
`;
export async function ensureCaptureJobSchema(){await ensureCaptureSchema();await db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730943)`;await tx.unsafe(captureJobSchema);});}
const globalBlocks=new Set(["TRADINGVIEW_LOGIN_REQUIRED","TRADINGVIEW_SESSION_IN_USE","DEDICATED_LAYOUT_REQUIRED","UNSAVED_EDITOR_REQUIRED","BROWSER_CONNECTION_REQUIRED","BROWSER_ALLOWANCE_OR_SESSION_REQUIRED","CAPTURE_INTERRUPTED","CLEAN_CHART_REQUIRED","STANDARD_CANDLES_REQUIRED","CHART_CONTEXT_UNAVAILABLE"]);
const knownErrors=new Set([...globalBlocks,"CLEAN_CHART_REQUIRED","STANDARD_CANDLES_REQUIRED","SOURCE_READBACK_MISMATCH","COMPILE_OR_RENDER_FAILED","CHART_CONTEXT_UNAVAILABLE","VERSION_OR_STAGE_CHANGED"]);
export function captureError(error:unknown){return error instanceof Error&&knownErrors.has(error.message)?error.message:"CAPTURE_FAILED";}
export function captureBlockMessage(code:string|null|undefined){
  const messages:Record<string,string>={
    TRADINGVIEW_LOGIN_REQUIRED:"Sign in to TradingView in the hosted browser, then retry this version.",
    TRADINGVIEW_SESSION_IN_USE:"TradingView is active on another device. Captures will not disconnect that session.",
    DEDICATED_LAYOUT_REQUIRED:"The hosted browser must open the dedicated Darth Algo Indicator Lab Preview layout in the Darth_Algo account.",
    UNSAVED_EDITOR_REQUIRED:"Open a new, untitled Pine script in the dedicated preview layout. The worker will not overwrite a saved script.",
    BROWSER_CONNECTION_REQUIRED:"Connect the hosted TradingView browser from Connections.",
    BROWSER_ALLOWANCE_OR_SESSION_REQUIRED:"The hosted browser is busy or its existing daily allowance is unavailable. No limit was increased.",
    CLEAN_CHART_REQUIRED:"The worker could not confirm a clean chart. Review the dedicated layout before retrying.",
    STANDARD_CANDLES_REQUIRED:"Set the dedicated layout to standard Candles before retrying.",
    SOURCE_READBACK_MISMATCH:"The Pine editor did not contain this exact version. No capture was accepted.",
    COMPILE_OR_RENDER_FAILED:"TradingView compilation or chart insertion could not be confirmed. Test the Pine and submit the error below.",
    CHART_CONTEXT_UNAVAILABLE:"The worker could not confirm the chart symbol and timeframe.",
    CAPTURE_INTERRUPTED:"The previous capture was interrupted. Review the browser before retrying.",
    VERSION_OR_STAGE_CHANGED:"This source version or review stage changed. Open the current draft.",
    CAPTURE_FAILED:"The browser capture stopped before verification. No preview was marked ready."
  };
  return messages[code||""]||"Waiting for a scheduled capture attempt. Queued does not mean tested.";
}

// Exported separately for a real browser test. No private TradingView endpoints,
// script saving, publication, alert creation, or trading actions are used.
export async function captureDraftOnChart(page:Page,pine:string,name:string) {
  await page.goto(captureLayout.url,{waitUntil:"domcontentloaded",timeout:25000});
  if(await page.getByText("Session disconnected",{exact:true}).isVisible())throw Error("TRADINGVIEW_SESSION_IN_USE");
  await page.getByRole("button",{name:`Logged in as ${captureLayout.account} Active layout: ${captureLayout.name}`,exact:true}).waitFor({state:"visible",timeout:20000}).catch(()=>{throw Error("TRADINGVIEW_LOGIN_REQUIRED");});
  if(page.url()!==captureLayout.url)throw Error("DEDICATED_LAYOUT_REQUIRED");
  if(await page.getByText("Session disconnected",{exact:true}).isVisible())throw Error("TRADINGVIEW_SESSION_IN_USE");
  if(!await page.getByRole("button",{name:"Candles",exact:true}).isVisible())throw Error("STANDARD_CANDLES_REQUIRED");
  const chart=page.getByRole("region",{name:"Chart #1",exact:true});
  const context=await chart.locator('[aria-label^="Chart for "]').getAttribute("aria-label");
  const match=context?.match(/^Chart for (.+), (.+)$/);
  if(!match)throw Error("CHART_CONTEXT_UNAVAILABLE");
  // Start with an unsaved editor. Refuse to modify an existing named script.
  await page.getByRole("button",{name:"Pine",exact:true}).click();
  await page.getByRole("button",{name:"Untitled script",exact:true}).waitFor({state:"visible",timeout:15000}).catch(()=>{throw Error("UNSAVED_EDITOR_REQUIRED");});
  await page.getByRole("button",{name:"Close",exact:true}).click();
  // This destructive-looking menu is scoped to the verified, dedicated test
  // layout above. It is never reached for the personal chart or a named script.
  await page.getByRole("button",{name:"Remove options",exact:true}).click();
  const remove=page.getByText("Remove drawings & indicators",{exact:true});
  if(!await remove.isVisible())throw Error("CLEAN_CHART_REQUIRED");
  await remove.click();
  const before=await chart.screenshot({type:"jpeg",quality:88});
  await page.getByRole("button",{name:"Pine",exact:true}).click();
  await page.getByRole("button",{name:"Untitled script",exact:true}).waitFor({state:"visible"});
  const editor=page.getByRole("textbox",{name:"Editor content;Press Alt+F1 for Accessibility Options.",exact:true});
  await editor.fill(pine);
  await page.evaluate(()=>navigator.clipboard.writeText(""));
  await editor.press("ControlOrMeta+A");await editor.press("ControlOrMeta+C");
  if(pineHash(await page.evaluate(()=>navigator.clipboard.readText()))!==pineHash(pine))throw Error("SOURCE_READBACK_MISMATCH");
  await page.getByRole("button",{name:"Add to chart",exact:true}).click();
  await page.getByRole("button",{name:`Undo insert ${name}`,exact:true}).waitFor({state:"visible",timeout:25000}).catch(()=>{throw Error("COMPILE_OR_RENDER_FAILED");});
  if(await page.getByText("Session disconnected",{exact:true}).isVisible())throw Error("TRADINGVIEW_SESSION_IN_USE");
  const code=await page.getByRole("code").textContent().catch(()=>"");
  if(/compilation error|runtime error|compilation failed/i.test(code||""))throw Error("COMPILE_OR_RENDER_FAILED");
  await page.getByRole("button",{name:"Close",exact:true}).click();
  // A frame boundary lets the inserted chart paint without a long fixed sleep.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const image=await chart.screenshot({type:"jpeg",quality:88});
  return {before,image,metadata:{chartUrl:captureLayout.url,symbol:match[1],timeframe:match[2],settings:"Default inputs from the exact Pine source; no settings changed by worker.",visibleRange:"See original chart axis. Exact date range was not available as text.",capturedAt:new Date().toISOString(),marketContext:"Current chart feed; live/delay status not independently verified. Replay not used.",notes:"Exact source read back from the Pine editor. TradingView confirmed insertion on the dedicated standard-candle chart. Source was not saved or published. Replay, reopening and repaint checks remain pending.",compiled:true,replay:false,reopened:false,view:"indicator" as const}};
}

export async function requestIndicatorCapture(id:string,hash:string) {
  await ensureCaptureJobSchema();
  return db().begin(async tx=>{
    const [c]=await tx`select candidate,source_hash,status from os_indicator_candidates where id=${id} for update`;
    if(!c || c.source_hash!==hash || pineHash(c.candidate.pine)!==hash || !pineChecks(c.candidate.pine).passed || c.status!=="qa_blocked")throw Error("VERSION_OR_STAGE_CHANGED");
    const [control]=await tx`select lease_until from os_indicator_capture_control where id=1 for update`;
    if(control.lease_until&&new Date(control.lease_until).getTime()>Date.now())return {status:"running"};
    const [j]=await tx`select attempts,status from os_indicator_capture_jobs where candidate_id=${id} and source_hash=${hash}`;
    if(j?.status==="captured")return {status:"captured"};
    if(j?.attempts>=3)throw Error("ATTEMPT_LIMIT_REACHED");
    await tx`insert into os_indicator_capture_jobs(candidate_id,source_hash) values(${id},${hash}) on conflict(candidate_id,source_hash) do update set status='queued',error_code=null,finished_at=null`;
    await tx`update os_indicator_capture_control set blocked_reason=null where id=1`;
    return {status:"queued"};
  });
}

export async function runIndicatorCaptures() {
  if(process.env.VERCEL_ENV!=="production"||process.env.AI_OS_ENABLED!=="true"||process.env.AI_OS_INDICATOR_LAB_ENABLED!=="true")return {status:"disabled"};
  await ensureCaptureJobSchema();const sql=db();
  const [control]=await sql`select paused from os_control where id=1`;if(!control||control.paused)return {status:"paused"};
  // Automatically schedule at most the three most recent distinct draft names.
  const candidates=await sql`select id,candidate,source_hash from (select distinct on(candidate->>'name') id,candidate,source_hash,created_at from os_indicator_candidates where status='qa_blocked' order by candidate->>'name',created_at desc) latest order by created_at desc limit 3`;
  for(const c of candidates.slice(0,3))if(pineChecks(c.candidate.pine).passed && pineHash(c.candidate.pine)===c.source_hash)await sql`insert into os_indicator_capture_jobs(candidate_id,source_hash) select ${c.id},${c.source_hash} where not exists(select 1 from os_indicator_captures where candidate_id=${c.id} and source_hash=${c.source_hash} and origin in ('assisted_browser','browser_worker') and metadata->>'view'='indicator') on conflict do nothing`;
  const claim=await sql.begin(async tx=>{
    const [gate]=await tx`select * from os_indicator_capture_control where id=1 for update`;
    if(gate.blocked_reason)return {blocked:gate.blocked_reason};
    if(gate.lease_until&&new Date(gate.lease_until).getTime()>Date.now())return {busy:true};
    const interrupted=await tx`update os_indicator_capture_jobs set status='blocked',error_code='CAPTURE_INTERRUPTED',finished_at=now() where status='running' returning candidate_id`;
    if(interrupted.length){await tx`update os_indicator_capture_control set blocked_reason='CAPTURE_INTERRUPTED' where id=1`;return {blocked:"CAPTURE_INTERRUPTED"};}
    await tx`update os_indicator_capture_jobs j set status='stale' from os_indicator_candidates c where j.candidate_id=c.id and j.status='queued' and (j.source_hash<>c.source_hash or c.status<>'qa_blocked')`;
    const [job]=await tx`select j.candidate_id,j.source_hash,c.candidate from os_indicator_capture_jobs j join os_indicator_candidates c on c.id=j.candidate_id where j.status='queued' order by j.created_at limit 1 for update of j`;
    if(!job)return {idle:true};
    await tx`update os_indicator_capture_control set lease_until=now()+interval '4 minutes' where id=1`;
    await tx`update os_indicator_capture_jobs set status='running',started_at=now() where candidate_id=${job.candidate_id} and source_hash=${job.source_hash}`;
    return {job};
  });
  if(!claim.job)return {status:claim.blocked?"blocked":claim.busy?"running":"idle",reason:claim.blocked||null};
  const {job}=claim;let browser:import("playwright-core").Browser|undefined,started=false;
  try {
    const connection=await browserStatus();if(!connection.connected)throw Error("BROWSER_CONNECTION_REQUIRED");
    // Do not attach to or terminate an owner's active sign-in session.
    if(connection.remainingPilotStarts<1 || (connection.expiresAt&&new Date(connection.expiresAt).getTime()>Date.now()))throw Error("BROWSER_ALLOWANCE_OR_SESSION_REQUIRED");
    await sql`update os_indicator_capture_jobs set attempts=attempts+1 where candidate_id=${job.candidate_id} and source_hash=${job.source_hash}`;
    await startBrowser();started=true;
    const endpoint=await hostedConnection();const {chromium}=await import("playwright-core");
    browser=await chromium.connectOverCDP(endpoint.endpoint,{timeout:15000});
    const context=browser.contexts()[0];if(!context)throw Error("CAPTURE_FAILED");
    await context.grantPermissions(["clipboard-read","clipboard-write"],{origin:"https://www.tradingview.com"});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    const capture=await captureDraftOnChart(page,job.candidate.pine,job.candidate.name);
    const saved=await saveIndicatorCapture(job.candidate_id,job.source_hash,capture.image,capture.metadata,"browser_worker");
    await saveIndicatorCapture(job.candidate_id,job.source_hash,capture.before,{...capture.metadata,view:"before",compiled:false,notes:"Same chart before adding this version. Indicator compilation and insertion refer to the paired after image."},"browser_worker");
    await sql`update os_indicator_capture_jobs set status='captured',capture_id=${saved.id},finished_at=now(),error_code=null where candidate_id=${job.candidate_id} and source_hash=${job.source_hash}`;
    return {status:"captured",candidateId:job.candidate_id,sourceHash:job.source_hash,captureId:saved.id,replay:false,published:false};
  } catch(error) {
    const code=captureError(error);
    await sql`update os_indicator_capture_jobs set status='blocked',error_code=${code},finished_at=now() where candidate_id=${job.candidate_id} and source_hash=${job.source_hash}`;
    if(globalBlocks.has(code)||code==="CAPTURE_FAILED")await sql`update os_indicator_capture_control set blocked_reason=${code} where id=1`;
    return {status:"blocked",candidateId:job.candidate_id,reason:code,published:false};
  } finally {
    if(started)await stopBrowser().catch(()=>{});
    await browser?.close().catch(()=>{});
    await sql`update os_indicator_capture_control set lease_until=null where id=1`;
  }
}
