import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../lib/business-os/owner-session";
import {beginVidiqConnection,disconnectVidiq,vidiqStateCookie,vidiqStatus} from "../../../../lib/business-os/vidiq-connection";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(r:Request){if(!ownerSessionFromRequest(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});try{return Response.json(await vidiqStatus(),{headers:privateHeaders});}catch{return Response.json({error:"Connection status unavailable"},{status:503,headers:privateHeaders});}}
export async function POST(r:Request){
  if(!ownerSessionFromRequest(r)||!sameOrigin(r))return Response.json({error:"Unauthorized"},{status:403,headers:privateHeaders});
  if(process.env.VERCEL_ENV!=="production" || r.headers.get("host")!=="www.darthalgo.com")return Response.json({error:"Connect from www.darthalgo.com"},{status:409,headers:privateHeaders});
  try{const {url,browser}=await beginVidiqConnection();return Response.json({url},{headers:{...privateHeaders,"Set-Cookie":`${vidiqStateCookie}=${browser}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`}});}catch{return Response.json({error:"Could not start vidIQ sign-in. Please try again."},{status:503,headers:privateHeaders});}
}
export async function DELETE(r:Request){if(!ownerSessionFromRequest(r)||!sameOrigin(r))return Response.json({error:"Unauthorized"},{status:403,headers:privateHeaders});await disconnectVidiq();return Response.json({connected:false},{headers:{...privateHeaders,"Set-Cookie":`${vidiqStateCookie}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`}});}
