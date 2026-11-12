import {authenticateFounderRenderer} from '../../../lib/business-os/founder-renderer-auth';
import {recordFounderRendererHeartbeat} from '../../../lib/business-os/founder-renderer';
import {beginRendererUpload,completeRendererJob,completeRendererUpload,ownedRendererAttempt,ownedRendererLease,readRendererBody,rendererLease} from '../../../lib/business-os/founder-renderer-transport';
import {startNativeInvocation,finishNativeInvocation,assertNativeJobScope} from '../../../lib/business-os/founder-native-policy';
import {FounderContentError} from '../../../lib/business-os/founder-content-model';
import {privateHeaders} from '../../../lib/business-os/owner-session';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{...privateHeaders,Vary:'Authorization'}});
export async function POST(request:Request){
 let identity;try{identity=await authenticateFounderRenderer(request);}catch{return json({error:'Unauthorized'},401);}
 if(request.headers.get('content-type')!=='application/json')return json({error:'JSON required'},415);
 try{
  const input=JSON.parse((await readRendererBody(request,131072)).toString());
  if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request'},400);
  if(input.operation==='startReservedInvocation'){
   if(input.invocationId!==identity.invocationId||input.jobId!==identity.jobId||input.leaseToken!==identity.leaseToken)throw Error('LEASE_LOST');
   return json(await startNativeInvocation(identity));
  }
  if(identity.reservationStatus==='reserved')throw Error('INVOCATION_NOT_STARTED');
  if(input.operation==='workerHeartbeat'){
   const result=await recordFounderRendererHeartbeat(identity,input);
   if(identity.mode==='preflight')await finishNativeInvocation(identity,'completed');
   return json(result);
  }
  assertNativeJobScope(identity,input);
  const content=await import('../../../lib/business-os/founder-content');
  if(input.operation==='progress'){await ownedRendererLease(identity,input);return json(await content.heartbeatFounderRenderJob({...rendererLease(input),stage:input.stage,progress:input.progress}));}
  if(input.operation==='uploadBegin')return json(await beginRendererUpload(identity,input));
  if(input.operation==='uploadComplete')return json(await completeRendererUpload(identity,input));
  if(input.operation==='complete'){const result=await completeRendererJob(identity,input);await finishNativeInvocation(identity,result.status==='completed'?'completed':'failed');return json(result);}
  if(input.operation==='fail'){await ownedRendererAttempt(identity,input);const result=await content.failFounderRenderJob({...rendererLease(input),error:typeof input.error==='string'?input.error.slice(0,500):'The renderer stopped before completion.',retryable:input.retryable===true,ambiguous:input.ambiguous===true});await finishNativeInvocation(identity,input.ambiguous===true?'unknown':'failed');return json(result);}
  return json({error:'Unknown operation'},400);
 }catch(error){const code=error instanceof FounderContentError?error.code:error instanceof Error?error.message:'';const safe=/^[A-Z_]{4,60}$/.test(code)?code:'RENDER_UNCONFIRMED';return json({error:safe},safe==='REQUEST_TOO_LARGE'?413:safe==='RENDER_UNCONFIRMED'?503:409);}
}
