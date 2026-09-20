import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from "node:crypto";
import {db} from "../affiliate-db";

export const vidiqResource="https://mcp.vidiq.com/mcp";
export const vidiqCallback="https://www.darthalgo.com/api/owner/connections/vidiq/callback";
export const vidiqStateCookie="__Host-darth_vidiq";
export const hashState=(s:string)=>createHash("sha256").update(s).digest("hex");
function encryptionKey(){const key=process.env.AI_OS_OWNER_KEY;if(!key || key.length<32)throw Error("OWNER_KEY_REQUIRED");return createHash("sha256").update(`darth-vidiq-v1:${key}`).digest();}
export function sealConnection(value:unknown){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);cipher.setAAD(Buffer.from("vidiq-v1"));const body=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),body].map(b=>b.toString("base64url")).join(".");}
export function openConnection(value:string){const parts=value.split(".");if(parts.length!==3)throw Error("CONNECTION_INVALID");const [iv,tag,body]=parts.map(p=>Buffer.from(p,"base64url")),cipher=createDecipheriv("aes-256-gcm",encryptionKey(),iv);cipher.setAAD(Buffer.from("vidiq-v1"));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(body),cipher.final()]).toString("utf8"));}
let ready:Promise<void>|undefined;
export function ensureVidiqSchema(){return ready??=(async()=>{await db().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730935)`;
  await tx`create table if not exists os_vidiq_connection(id integer primary key check(id=1),client_id text,generation uuid,tokens text,expires_at timestamptz,connected_at timestamptz)`;
  await tx`alter table os_vidiq_connection add column if not exists verified_balance jsonb`;
  await tx`create table if not exists os_vidiq_oauth(state_hash text primary key,browser_hash text not null,generation uuid not null,verifier text not null,client_id text not null,expires_at timestamptz not null)`;
  await tx`create table if not exists os_vidiq_discovery(day text primary key,status text not null,credits_reserved integer not null default 0 check(credits_reserved between 0 and 5),balance jsonb,result jsonb,checked_at timestamptz not null default now())`;
  await tx`insert into os_vidiq_connection(id) values(1) on conflict do nothing`;
});})().catch(e=>{ready=undefined;throw e;});}
async function providerPost(path:string,body:URLSearchParams|Record<string,unknown>){
  const response=await fetch(`${vidiqResource}/${path}`,{method:"POST",redirect:"error",signal:AbortSignal.timeout(12000),headers:{"Content-Type":body instanceof URLSearchParams?"application/x-www-form-urlencoded":"application/json"},body:body instanceof URLSearchParams?body.toString():JSON.stringify(body),cache:"no-store"});
  if(!response.ok){const detail=await response.json().catch(()=>null);if(path==="register" && detail?.detail==="redirect_uri is not allowed.")throw Error("VIDIQ_REDIRECT_NOT_ALLOWED");throw Error("VIDIQ_CONNECTION_FAILED");}
  const text=await response.text();if(text.length>32000)throw Error("VIDIQ_RESPONSE_INVALID");return JSON.parse(text);
}
export async function beginVidiqConnection(){
  await ensureVidiqSchema();
  const [existing]=await db()`select client_id from os_vidiq_connection where id=1`;
  let clientId=existing.client_id as string|undefined;
  if(!clientId){const registration=await providerPost("register",{client_name:"Darth Algo Research",redirect_uris:[vidiqCallback],grant_types:["authorization_code","refresh_token"],response_types:["code"],token_endpoint_auth_method:"none",scope:"api"});clientId=registration.client_id;if(typeof clientId!=="string" || !clientId || clientId.length>2000)throw Error("VIDIQ_REGISTRATION_FAILED");}
  const state=randomBytes(32).toString("base64url"),browser=randomBytes(32).toString("base64url"),verifier=randomBytes(48).toString("base64url"),generation=randomUUID();
  await db().begin(async tx=>{
    await tx`update os_vidiq_connection set client_id=${clientId!},generation=${generation} where id=1`;
    await tx`delete from os_vidiq_oauth`;
    await tx`insert into os_vidiq_oauth(state_hash,browser_hash,generation,verifier,client_id,expires_at) values(${hashState(state)},${hashState(browser)},${generation},${sealConnection(verifier)},${clientId!},now()+interval '10 minutes')`;
  });
  const url=new URL(`${vidiqResource}/authorize`);url.search=new URLSearchParams({client_id:clientId!,redirect_uri:vidiqCallback,response_type:"code",scope:"api",state,code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256",resource:vidiqResource}).toString();
  return {url:url.href,browser};
}
function validTokens(value:Record<string,unknown>){if(typeof value.access_token!=="string" || value.access_token.length<8 || value.access_token.length>16000 || String(value.token_type).toLowerCase()!=="bearer" || (value.refresh_token!==undefined && (typeof value.refresh_token!=="string" || value.refresh_token.length>16000)))throw Error("VIDIQ_TOKEN_INVALID");return value;}
function expiry(tokens:Record<string,unknown>){const seconds=Number(tokens.expires_in);return Number.isFinite(seconds)&&seconds>0?new Date(Date.now()+Math.min(seconds,365*86400)*1000):null;}
export async function finishVidiqConnection(state:string,browser:string,code:string){
  if(!/^[\w-]{43}$/.test(state) || !/^[\w-]{43}$/.test(browser) || !code || code.length>4000)throw Error("VIDIQ_STATE_INVALID");
  await ensureVidiqSchema();
  // Consume once before exchange. An ambiguous exchange requires a fresh owner sign-in.
  const [pending]=await db()`delete from os_vidiq_oauth where state_hash=${hashState(state)} and browser_hash=${hashState(browser)} and expires_at>now() returning *`;
  if(!pending)throw Error("VIDIQ_STATE_INVALID");
  const tokens=validTokens(await providerPost("token",new URLSearchParams({grant_type:"authorization_code",client_id:pending.client_id,redirect_uri:vidiqCallback,code,code_verifier:openConnection(pending.verifier),resource:vidiqResource})));
  const rows=await db()`update os_vidiq_connection set tokens=${sealConnection(tokens)},expires_at=${expiry(tokens)},connected_at=now() where id=1 and generation=${pending.generation} returning id`;
  if(!rows.length)throw Error("VIDIQ_CONNECTION_CANCELLED");
}
export async function beginVidiqKeyVerification(){await ensureVidiqSchema();const generation=randomUUID();await db()`update os_vidiq_connection set generation=${generation} where id=1`;return generation;}
export async function saveVidiqKey(key:string,balance:{totalCredits:number;renewableResetsAt:string|null},generation:string){
  if(key.length<16 || key.length>4096 || /\s/.test(key))throw Error("VIDIQ_KEY_INVALID");
  await ensureVidiqSchema();await db().begin(async tx=>{
    const rows=await tx`update os_vidiq_connection set tokens=${sealConnection({access_token:key,token_type:"Bearer",auth_method:"api_key"})},expires_at=null,connected_at=now(),verified_balance=${tx.json(balance)} where id=1 and generation=${generation} returning id`;
    if(!rows.length)throw Error("VIDIQ_CONNECTION_CANCELLED");
    await tx`delete from os_vidiq_oauth`;
  });
}
export async function disconnectVidiq(){await ensureVidiqSchema();await db().begin(async tx=>{await tx`update os_vidiq_connection set tokens=null,expires_at=null,connected_at=null,generation=null,verified_balance=null where id=1`;await tx`delete from os_vidiq_oauth`;});}
export async function vidiqAccessToken(){
  await ensureVidiqSchema();
  // Serialize refresh and disconnect so rotating refresh tokens cannot race.
  return db().begin(async tx=>{
    const [row]=await tx`select * from os_vidiq_connection where id=1 for update`;
    if(!row?.tokens)throw Error("VIDIQ_NOT_CONNECTED");
    let tokens=openConnection(row.tokens);
    if(row.expires_at && new Date(row.expires_at).getTime()<Date.now()+60000){
      if(!tokens.refresh_token)throw Error("VIDIQ_RECONNECT_REQUIRED");
      const next=validTokens(await providerPost("token",new URLSearchParams({grant_type:"refresh_token",client_id:row.client_id,refresh_token:tokens.refresh_token,resource:vidiqResource})));
      tokens={...next,refresh_token:next.refresh_token||tokens.refresh_token};
      await tx`update os_vidiq_connection set tokens=${sealConnection(tokens)},expires_at=${expiry(tokens)} where id=1`;
    }
    return tokens.access_token as string;
  });
}
export async function vidiqStatus(){await ensureVidiqSchema();const [row]=await db()`select connected_at,verified_balance,tokens is not null as connected from os_vidiq_connection where id=1`;const [latest]=await db()`select day,status,credits_reserved,balance,checked_at from os_vidiq_discovery order by day desc limit 1`;return {connected:!!row?.connected,connectedAt:row?.connected_at||null,verifiedBalance:row?.verified_balance||null,dailyCreditCap:5,latest:latest||null};}
