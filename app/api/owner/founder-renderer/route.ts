import {authenticateFounderRenderer} from '../../../lib/business-os/founder-renderer-auth';
import {recordFounderRendererHeartbeat} from '../../../lib/business-os/founder-renderer';
import {beginRendererUpload,completeRendererJob,completeRendererUpload,ownedRendererAttempt,ownedRendererLease,readRendererBody,rendererLease} from '../../../lib/business-os/founder-renderer-transport';
import {FounderContentError} from '../../../lib/business-os/founder-content-model';
import {privateHeaders} from '../../../lib/business-os/owner-session';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{...privateHeaders,Vary:'Authorization'}});
export async function POST(request:Request){
 let identity;try{identity=await authenticateFounderRenderer(request);}catch{return json({error:'Unauthorized'},401);}
 if(request.headers.get('content-type')!=='application/json')return json({error:'JSON required'},415);
 try{
  const input=JSON.parse((await readRendererBody(request,65536)).toString());
  if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request'},400);
  if(input.operation==='workerHeartbeat')return json(await recordFounderRendererHeartbeat(identity,input));
  const content=await import('../../../lib/business-os/founder-content');
  if(input.operation==='claim')return json({claim:await content.claimFounderRenderJob({workerId:identity.workerId})});
  if(input.operation==='progress'){await ownedRendererLease(identity,input);return json(await content.heartbeatFounderRenderJob({...rendererLease(input),stage:input.stage,progress:input.progress}));}
  if(input.operation==='uploadBegin')return json(await beginRendererUpload(identity,input));
  if(input.operation==='uploadComplete')return json(await completeRendererUpload(identity,input));
  if(input.operation==='complete')return json(await completeRendererJob(identity,input));
  if(input.operation==='fail'){await ownedRendererAttempt(identity,input);return json(await content.failFounderRenderJob({...rendererLease(input),error:typeof input.error==='string'?input.error.slice(0,500):'The renderer stopped before completion.',retryable:input.retryable===true,ambiguous:input.ambiguous===true}));}
  return json({error:'Unknown operation'},400);
 }catch(error){
  const code=error instanceof FounderContentError?error.code:error instanceof Error?error.message:'';
  const safe=/^[A-Z_]{4,60}$/.test(code)?code:'RENDER_UNCONFIRMED';
  return json({error:safe},safe==='REQUEST_TOO_LARGE'?413:safe==='RENDER_UNCONFIRMED'?503:409);
 }
}
