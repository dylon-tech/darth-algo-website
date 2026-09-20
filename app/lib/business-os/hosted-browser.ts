import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import {db} from "../affiliate-db";

// Existing owner-created project and empty TradingView profile. No account creation or upgrade.
export const projectId="5e6b0d1e-7d00-4162-a121-e3fd9d00fbca";
export const contextId="39ea64d2-006f-4177-ad21-354cf582a128";
const duration=900;
function cipherKey(){const key=process.env.AI_OS_OWNER_KEY;if(!key||key.length<32)throw Error("Owner configuration unavailable");return createHash("sha256").update(`darth-browserbase-v1:${key}`).digest();}
export function sealBrowserKey(value:string){const iv=randomBytes(12),c=createCipheriv("aes-256-gcm",cipherKey(),iv);c.setAAD(Buffer.from("browserbase-v1"));const body=Buffer.concat([c.update(value,"utf8"),c.final()]);return [iv,c.getAuthTag(),body].map(b=>b.toString("base64url")).join(".");}
function openKey(value:string){const [iv,tag,body]=value.split(".").map(x=>Buffer.from(x,"base64url"));const c=createDecipheriv("aes-256-gcm",cipherKey(),iv);c.setAAD(Buffer.from("browserbase-v1"));c.setAuthTag(tag);return Buffer.concat([c.update(body),c.final()]).toString("utf8");}
let ready:Promise<void>|undefined;
export function ensureBrowserSchema(){return ready??=(async()=>{await db().begin(async t=>{
 await t`select pg_advisory_xact_lock(730936)`;
 await t`create table if not exists os_browser_connection(id integer primary key check(id=1),secret text,connected_at timestamptz,session_id text,hold_until timestamptz,attempts integer not null default 0)`;
 await t`alter table os_browser_connection add column if not exists verified_at timestamptz`;
 await t`alter table os_browser_connection add column if not exists verification_status text`;
 await t`alter table os_browser_connection add column if not exists verification_lock timestamptz`;
 await t`create table if not exists os_browser_checks(id text primary key,status text not null,started_at timestamptz,finished_at timestamptz,evidence jsonb,error_code text)`;
 await t`insert into os_browser_connection(id) values(1) on conflict do nothing`;
});})().catch(e=>{ready=undefined;throw e;});}
async function api(key:string,path:string,body?:unknown){
 const r=await fetch(`https://api.browserbase.com/v1/${path}`,{method:body===undefined?"GET":"POST",headers:{"X-BB-API-Key":key,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error("Browserbase could not complete the request. Check the connection and account allowance.");
 const raw=await r.text();if(raw.length>100000)throw Error("Browserbase response unavailable");try{return JSON.parse(raw);}catch{throw Error("Browserbase response unavailable");}
}
export function sessionSettings(){return {projectId,timeout:duration,keepAlive:false,proxies:false,browserSettings:{context:{id:contextId,persist:true},recordSession:false,logSession:false,solveCaptchas:false,ignoreCertificateErrors:false,viewport:{width:1280,height:900}},userMetadata:{purpose:"darth-algo-owner-login-pilot"}};}
export function validateSession(s:{id?:string;contextId?:string;projectId?:string}){if(!s.id||!/^[a-f0-9-]{36}$/i.test(s.id)||s.contextId!==contextId||s.projectId!==projectId)throw Error("The saved login profile was not attached. Sign-in has been stopped.");return s.id;}
export function validateViewer(value:unknown){if(typeof value!=="string")throw Error("Live view unavailable");const u=new URL(value);if(u.protocol!=="https:"||!["www.browserbase.com","browserbase.com"].includes(u.hostname)||u.username||u.password)throw Error("Unexpected live-view address");return u.href;}
export async function connectBrowser(key:string){
 if(key.length<16||key.length>4096||/\s/.test(key))throw Error("Paste the full Browserbase API key.");
 const c=await api(key,`contexts/${contextId}`);if(c.id!==contextId||c.projectId!==projectId)throw Error("This key does not match the Darth Algo browser profile.");
 await ensureBrowserSchema();const rows=await db()`update os_browser_connection set secret=${sealBrowserKey(key)},connected_at=now(),verified_at=null,verification_status=null where id=1 and (hold_until is null or hold_until<now()) returning id`;
 if(!rows.length)throw Error("Wait for the existing browser session to finish before replacing the connection.");
}
export async function browserStatus(){
 await ensureBrowserSchema();
 const [r]=await db()`select secret is not null as connected,connected_at,session_id,hold_until,attempts,verified_at,verification_status from os_browser_connection where id=1`;
 const [check]=await db()`select status,started_at,finished_at,error_code from os_browser_checks order by started_at desc nulls last limit 1`;
 return {connected:!!r.connected,connectedAt:r.connected_at,sessionId:r.session_id,expiresAt:r.hold_until,remainingPilotStarts:Math.max(0,2-r.attempts),tradingViewVerified:!!r.verified_at&&r.verification_status==='verified',verifiedAt:r.verified_at,verificationStatus:r.verification_status,workerConfigured:true,workerEnabled:check?.status==='queued'||check?.status==='running',workerScope:'private_saved_chart_checks',publishingEnabled:false,latestCheck:check||null};
}
export async function startBrowser(){
 await ensureBrowserSchema();
 // Commit reservation before the external request; an uncertain response must not create another session.
 const [r]=await db()`update os_browser_connection set attempts=attempts+1,hold_until=now()+interval '16 minutes',session_id=null where id=1 and secret is not null and attempts<2 and (hold_until is null or hold_until<now()) returning secret`;
 if(!r)throw Error("A session is already reserved, the connection is missing, or the two-session pilot allowance is exhausted. Refresh status.");
 const key=openKey(r.secret);const s=await api(key,"sessions",sessionSettings());
 if(typeof s.id==="string"&&/^[a-f0-9-]{36}$/i.test(s.id))await db()`update os_browser_connection set session_id=${s.id} where id=1`;
 try{validateSession(s);return await browserView();}catch(e){if(typeof s.id==="string"&&/^[a-f0-9-]{36}$/i.test(s.id))await api(key,`sessions/${s.id}`,{status:"REQUEST_RELEASE"}).catch(()=>{});throw e;}
}
export async function browserView(){
 await ensureBrowserSchema();const [r]=await db()`select secret,session_id,hold_until from os_browser_connection where id=1`;
 if(!r.secret||!r.session_id||new Date(r.hold_until).getTime()<=Date.now())return {active:false};
 const key=openKey(r.secret),s=await api(key,`sessions/${r.session_id}`);validateSession(s);
 if(!["RUNNING","PENDING"].includes(s.status))return {active:false};
 const view=await api(key,`sessions/${r.session_id}/debug`);
 return {active:true,url:validateViewer(view.debuggerFullscreenUrl),sessionId:r.session_id,expiresAt:r.hold_until,contextVerified:true};
}
export async function stopBrowser(){await ensureBrowserSchema();const [r]=await db()`select secret,session_id from os_browser_connection where id=1`;if(r.secret&&r.session_id){const key=openKey(r.secret);await api(key,`sessions/${r.session_id}`,{status:"REQUEST_RELEASE"});const latest=await api(key,`sessions/${r.session_id}`);if(["COMPLETED","TIMED_OUT","ERROR"].includes(latest.status))await db()`update os_browser_connection set hold_until=now()+interval '30 seconds' where id=1 and session_id=${r.session_id}`;}/* An unconfirmed stop keeps the full reservation. */}

// Server-only connection material; never returned by the owner routes or logged.
export async function hostedConnection(){
 await ensureBrowserSchema();
 const [r]=await db()`select secret,session_id,hold_until from os_browser_connection where id=1`;
 if(!r?.secret||!r.session_id||new Date(r.hold_until).getTime()<=Date.now())throw Error('HOSTED_SESSION_REQUIRED');
 const s=await api(openKey(r.secret),`sessions/${r.session_id}`);validateSession(s);
 if(s.status!=='RUNNING')throw Error('HOSTED_SESSION_REQUIRED');
 const {safeBrowserEndpoint}=await import('./tradingview-runner');
 return {sessionId:r.session_id,endpoint:safeBrowserEndpoint(s.connectUrl)};
}
export async function recordBrowserVerification(status:string){
 await db()`update os_browser_connection set verification_status=${status},verified_at=case when ${status}='verified' then now() else null end where id=1`;
}
