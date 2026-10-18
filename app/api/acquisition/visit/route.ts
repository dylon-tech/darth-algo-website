import {acquisitionPaths,acquisitionUuid,validAcquisitionLabels} from '../../../lib/acquisition-policy';
import {recordAcquisitionVisit} from '../../../lib/business-os/acquisition';
import {ownerSessionFromRequest,sameOrigin} from '../../../lib/business-os/owner-session';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:'Origin required'},{status:403,headers});
  if(process.env.VERCEL_ENV!=='production'||ownerSessionFromRequest(request))return Response.json({excluded:true},{headers});
  let observation:Parameters<typeof recordAcquisitionVisit>[0];
  try{
    if(Number(request.headers.get('content-length'))>700)throw Error();
    const reader=request.body?.getReader();if(!reader)throw Error();let raw='',size=0;const decoder=new TextDecoder();try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>700)throw Error();raw+=decoder.decode(r.value,{stream:true});}}finally{await reader.cancel();}const b=JSON.parse(raw);
    if(!b||!acquisitionUuid.test(b.visitId)||!acquisitionPaths.has(b.path)||!['visit','checkout'].includes(b.action)||!validAcquisitionLabels(b)||Object.keys(b).some(k=>!['visitId','path','action','source','campaign','content'].includes(k)))throw Error();
    if(b.content==='welcome_test')return Response.json({excluded:true},{headers});
    const fields=b as typeof b & {visitId:string;path:string;action:'visit'|'checkout'};
    observation={source:b.source,campaign:b.campaign,content:b.content,visitId:fields.visitId,path:fields.path,action:fields.action};
  }catch{return Response.json({error:'Invalid observation'},{status:400,headers});}
  try{const result=await recordAcquisitionVisit(observation);return Response.json(result,{status:result.recorded?200:429,headers});}
  catch{return Response.json({error:'Measurement unavailable'},{status:503,headers});}
}
