import {authenticateFounderRenderer} from '../../../../../lib/business-os/founder-renderer-auth';
import {readRendererBody,saveRendererChunk} from '../../../../../lib/business-os/founder-renderer-transport';
import {founderMediaLimits} from '../../../../../lib/business-os/founder-media-model';
import {privateHeaders} from '../../../../../lib/business-os/owner-session';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{...privateHeaders,Vary:'Authorization'}});
export async function PUT(request:Request,context:{params:Promise<{uploadId:string}>}){
 let identity;try{identity=await authenticateFounderRenderer(request);}catch{return json({error:'Unauthorized'},401);}
 if(identity.reservationStatus==='reserved')return json({error:'INVOCATION_NOT_STARTED'},409);
 if(request.headers.get('content-type')!=='application/octet-stream')return json({error:'Binary chunk required'},415);
 try{
  const {uploadId}=await context.params,index=new URL(request.url).searchParams.get('index');
  if(index===null||!/^\d{1,2}$/.test(index))return json({error:'Invalid chunk'},400);
  const input={uploadId,index:Number(index),jobId:request.headers.get('x-darth-job-id'),leaseToken:request.headers.get('x-darth-lease-token')};
  return json(await saveRendererChunk(identity,input,await readRendererBody(request,founderMediaLimits.chunkBytes)));
 }catch(error){const code=error instanceof Error?error.message:'';return json({error:/^[A-Z_]{4,60}$/.test(code)?code:'CHUNK_UNCONFIRMED'},code==='REQUEST_TOO_LARGE'?413:409);}
}
