import {ownerSessionFromRequest,privateHeaders,sameOrigin} from "../../../../lib/business-os/owner-session";
import {beginVidiqConnection,beginVidiqKeyVerification,disconnectVidiq,saveVidiqKey,vidiqStateCookie,vidiqStatus} from "../../../../lib/business-os/vidiq-connection";
import {verifyVidiqKey} from "../../../../lib/business-os/vidiq-research";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(r:Request){if(!ownerSessionFromRequest(r))return Response.json({error:"Unauthorized"},{status:401,headers:privateHeaders});try{return Response.json(await vidiqStatus(),{headers:privateHeaders});}catch{return Response.json({error:"Connection status unavailable"},{status:503,headers:privateHeaders});}}
export async function POST(r:Request){
  if(!ownerSessionFromRequest(r)||!sameOrigin(r))return Response.json({error:"Unauthorized"},{status:403,headers:privateHeaders});
  if(process.env.VERCEL_ENV!=="production" || r.headers.get("host")!=="www.darthalgo.com")return Response.json({error:"Connect from www.darthalgo.com"},{status:409,headers:privateHeaders});
  try{const {url,browser}=await beginVidiqConnection();return Response.json({url},{headers:{...privateHeaders,"Set-Cookie":`${vidiqStateCookie}=${browser}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`}});}catch(e){const blocked=e instanceof Error && e.message==="VIDIQ_REDIRECT_NOT_ALLOWED";return Response.json({error:blocked?"vidIQ does not allow this site's sign-in return address. Use the secure connection-key option below.":"vidIQ sign-in could not start. Use the connection-key option below.",code:blocked?"VIDIQ_REDIRECT_NOT_ALLOWED":"VIDIQ_CONNECTION_FAILED"},{status:blocked?409:503,headers:privateHeaders});}
}
export async function PUT(r:Request){
  if(!ownerSessionFromRequest(r)||!sameOrigin(r))return Response.json({error:"Unauthorized"},{status:403,headers:privateHeaders});
  if(!r.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"JSON required"},{status:415,headers:privateHeaders});
  const raw=await r.text();if(raw.length>5000)return Response.json({error:"Key is too long"},{status:413,headers:privateHeaders});
  let key:string;try{const body=JSON.parse(raw);if(typeof body.key!=="string")throw Error();key=body.key.trim();if(key.length<16||key.length>4096||/\s/.test(key))throw Error();}catch{return Response.json({error:"Paste the connection key from vidIQ's MCP settings."},{status:400,headers:privateHeaders});}
  try{const generation=await beginVidiqKeyVerification();const balance=await verifyVidiqKey(key);await saveVidiqKey(key,balance,generation);return Response.json({connected:true,balance},{headers:privateHeaders});}
  catch{return Response.json({error:"The key could not be verified with vidIQ. Check that you copied the full MCP key and try again. Your existing connection was not changed."},{status:502,headers:privateHeaders});}
}
export async function DELETE(r:Request){if(!ownerSessionFromRequest(r)||!sameOrigin(r))return Response.json({error:"Unauthorized"},{status:403,headers:privateHeaders});await disconnectVidiq();return Response.json({connected:false},{headers:{...privateHeaders,"Set-Cookie":`${vidiqStateCookie}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`}});}
