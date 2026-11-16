import {NextResponse} from 'next/server';
import {challengeCookie,emailLoginConfig,requestOwnerCode,verifyOwnerCode} from '../../../lib/business-os/owner-email-login';
import {createOwnerSession,ownerCookie,privateHeaders,sameOrigin,sessionSeconds} from '../../../lib/business-os/owner-session';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json({available:Boolean(emailLoginConfig())},{headers:privateHeaders});}
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:privateHeaders});
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Same-origin JSON required.'},403);
 if(!emailLoginConfig())return reply({error:'Website sign-in is still being connected. Your dashboard stays private.'},503);
 const raw=await request.text();if(raw.length>1024)return reply({error:'Invalid request.'},400);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
 const options={httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict' as const,path:'/'};
 try{
  if(body?.operation==='request'&&typeof body.email==='string'&&body.email.length<=254){
   const token=await requestOwnerCode(body.email);
   const response=reply({message:'If this is your owner email, a sign-in code is on its way.'});
   response.cookies.set(challengeCookie,token||'',{...options,maxAge:token?600:0});return response;
  }
  if(body?.operation==='verify'&&typeof body.code==='string'){
   const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(challengeCookie+'='))?.slice(challengeCookie.length+1)||'';
   await verifyOwnerCode(token,body.code);
   const response=reply({authenticated:true});
   response.cookies.set(ownerCookie,createOwnerSession(process.env.AI_OS_OWNER_KEY!),{...options,maxAge:sessionSeconds});
   response.cookies.set(challengeCookie,'',{...options,maxAge:0});return response;
  }
  return reply({error:'Invalid request.'},400);
 }catch(error){const limited=error instanceof Error&&error.message==='LOGIN_RATE_LIMIT';return reply({error:limited?'Please wait before requesting another code.':'Sign-in was not confirmed. Check the code or request a new one.'},limited?429:401);}
}
