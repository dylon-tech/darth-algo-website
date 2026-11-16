import {createHmac,randomBytes} from 'node:crypto';
import {db} from '../affiliate-db';

export const challengeCookie='darth_owner_login';
export function emailLoginConfig(){
 const email=(process.env.AI_OS_OWNER_EMAIL||'').trim().toLowerCase();
 const key=process.env.AI_OS_OWNER_KEY||'';
 let url:URL;try{url=new URL(process.env.NEON_AUTH_BASE_URL||'');}catch{return null;}
 if(process.env.AI_OS_EMAIL_LOGIN_ENABLED!=='true'||process.env.AI_OS_ENABLED!=='true'||key.length<32||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||url.protocol!=='https:'||!url.hostname.endsWith('.neon.tech')||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/auth'))return null;
 return {email,key,base:url.toString().replace(/\/$/,'')};
}
function digest(value:string,key:string){return createHmac('sha256',key).update('owner-email-login-v1:'+value).digest('hex');}
let schema:Promise<unknown>|undefined;
async function ensure(){schema??=db()`create table if not exists os_owner_email_login (id text primary key, owner_hash text not null, created_at timestamptz not null default now(), expires_at timestamptz not null, attempts integer not null default 0, used boolean not null default false)`.catch(e=>{schema=undefined;throw e;});await schema;}
async function provider(path:string,body:Record<string,string>){
 const config=emailLoginConfig();if(!config)throw Error('LOGIN_UNAVAILABLE');
 const response=await fetch(config.base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://www.darthalgo.com'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(response.status===429?'LOGIN_RATE_LIMIT':'LOGIN_NOT_CONFIRMED');
 return response.json();
}
export async function requestOwnerCode(email:string){
 const config=emailLoginConfig();if(!config)throw Error('LOGIN_UNAVAILABLE');
 // A fixed server-side identity; never grant access to an arbitrary signup.
 if(email.trim().toLowerCase()!==config.email)return null;
 await ensure();const token=randomBytes(32).toString('hex'),id=digest(token,config.key),owner=digest(config.email,config.key);
 await db().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(731116)`;
  await tx`delete from os_owner_email_login where created_at<now()-interval '2 days'`;
  const [row]=await tx`select count(*)::int as count, count(*) filter(where created_at>now()-interval '60 seconds')::int as recent from os_owner_email_login where owner_hash=${owner} and created_at>now()-interval '1 hour'`;
  if(row.count>=5||row.recent>0)throw Error('LOGIN_RATE_LIMIT');
  await tx`insert into os_owner_email_login(id,owner_hash,expires_at) values(${id},${owner},now()+interval '10 minutes')`;
 });
 // Keep the reservation on timeout/failure: retries cannot spam the mailbox.
 const result=await provider('/email-otp/send-verification-otp',{email:config.email,type:'sign-in'});
 if(result?.success!==true)throw Error('LOGIN_NOT_CONFIRMED');
 return token;
}
export async function verifyOwnerCode(token:string,otp:string){
 const config=emailLoginConfig();if(!config)throw Error('LOGIN_UNAVAILABLE');
 if(!/^[a-f0-9]{64}$/.test(token)||!/^\d{6}$/.test(otp))throw Error('LOGIN_NOT_CONFIRMED');
 await ensure();const id=digest(token,config.key),owner=digest(config.email,config.key);
 const [attempt]=await db()`update os_owner_email_login set attempts=attempts+1 where id=${id} and owner_hash=${owner} and used=false and attempts<5 and expires_at>now() returning id`;
 if(!attempt)throw Error('LOGIN_NOT_CONFIRMED');
 const result=await provider('/sign-in/email-otp',{email:config.email,otp});
 if(!result?.token||result.user?.emailVerified!==true||result.user?.email?.toLowerCase()!==config.email)throw Error('LOGIN_NOT_CONFIRMED');
 const [consumed]=await db()`update os_owner_email_login set used=true where id=${id} and owner_hash=${owner} and used=false and expires_at>now() returning id`;
 if(!consumed)throw Error('LOGIN_NOT_CONFIRMED');
 // Provider session tokens and OTPs never reach logs, the browser response or storage.
 return true;
}
