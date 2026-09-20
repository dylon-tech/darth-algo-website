import {privateHeaders} from "../../../../../lib/business-os/owner-session";
import {finishVidiqConnection,vidiqStateCookie} from "../../../../../lib/business-os/vidiq-connection";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(r:Request){
  let status="sign_in_failed";
  // The owner cookie is SameSite=Strict and is absent on this cross-site return.
  // Authorization was checked at initiation; the single-use state and separate
  // HttpOnly browser nonce bind this callback to that authenticated initiation.
  if(process.env.AI_OS_ENABLED==="true" && process.env.VERCEL_ENV==="production" && r.headers.get("host")==="www.darthalgo.com")try{
    const url=new URL(r.url),browser=r.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${vidiqStateCookie}=`))?.slice(vidiqStateCookie.length+1)||"";
    if(url.searchParams.has("error"))throw Error("CONSENT_DECLINED");
    await finishVidiqConnection(url.searchParams.get("state")||"",browser,url.searchParams.get("code")||"");status="connected";
  }catch{}
  return new Response(null,{status:303,headers:{...privateHeaders,"Referrer-Policy":"no-referrer",Location:`https://www.darthalgo.com/owner/connections?vidiq=${status}`,"Set-Cookie":`${vidiqStateCookie}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`}});
}
