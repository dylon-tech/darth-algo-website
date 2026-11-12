import {ownerSessionFromRequest,privateHeaders,sameOrigin} from '../../../lib/business-os/owner-session';
import {beginFounderMediaUpload,cancelFounderMediaUpload,completeFounderMediaUpload,founderMediaSnapshot,getFounderMediaUpload} from '../../../lib/business-os/founder-media';
import {founderMediaCapabilities} from '../../../lib/business-os/founder-media-model';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const headers={...privateHeaders,Vary:'Cookie'};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers});
const mediaErrorMessages:Record<string,string>={
 INVALID_FILE_NAME:'Choose a file with a valid name.',FILE_SIZE_LIMIT:'Choose a file from 32 bytes to 32 MB.',REQUEST_KEY_REQUIRED:'An upload retry key is required.',
 FILE_HASH_REQUIRED:'Verify the file fingerprint before starting this upload.',UPLOAD_FILE_MISMATCH:'The received bytes do not match the selected original. Cancel this upload and select the original file again.',
 UNSUPPORTED_MEDIA_FORMAT:'Use JPEG, PNG, WebP or H.264 MP4 with AAC audio. Export HEIC to JPEG and MOV/HEVC to H.264 MP4 first.',
 UPLOAD_KEY_CONFLICT:'This retry belongs to a different file. Start a new upload.',UPLOAD_EXPIRED:'This unfinished upload expired. Start the upload again.',
 TOO_MANY_OPEN_UPLOADS:'Finish or cancel an existing upload before starting another. Up to four uploads can be open.',MEDIA_STORAGE_LIMIT:'The private media allowance is full. No additional storage was purchased.',
 UPLOAD_NOT_FOUND:'Upload not found.',UPLOAD_INCOMPLETE:'Some file parts are missing. Resume the same upload before completing it.',INVALID_IMAGE:'This image could not be decoded. Export a valid JPEG, PNG or WebP and try again.',
 INVALID_MP4:'This MP4 could not be verified. Re-export as H.264 MP4 with AAC audio.',H264_MP4_REQUIRED:'Export the video using H.264 in an MP4 file. HEVC is not supported by this upload path.',AAC_AUDIO_REQUIRED:'Export the video with AAC audio.',
 INVALID_VIDEO_DIMENSIONS_OR_DURATION:'Use one video track up to 4096 pixels per side and no more than five minutes.',UPLOAD_ALREADY_COMPLETE:'This upload is already saved. The completed original was preserved.',
};
export async function GET(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 try{
  const id=new URL(request.url).searchParams.get('uploadId');if(id){const upload=await getFounderMediaUpload(id);return upload?json({upload}):json({error:'Upload not found.'},404);}
  return json(await founderMediaSnapshot());
 }catch{return json({error:'Private media storage could not be read.',checkedAt:new Date().toISOString(),assets:[],capabilities:founderMediaCapabilities(false)},503);}
}
export async function POST(request:Request){
 if(!ownerSessionFromRequest(request))return json({error:'Unauthorized'},401);
 if(!sameOrigin(request)||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Same-origin JSON required'},403);
 if(Number(request.headers.get('content-length'))>4096)return json({error:'Request too large'},413);
 try{
  const reader=request.body?.getReader();if(!reader)return json({error:'Request required'},400);
  const parts:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return json({error:'Request too large'},413);}parts.push(value);}
  let body:Record<string,unknown>;try{body=JSON.parse(Buffer.concat(parts).toString());}catch{return json({error:'Invalid JSON'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request'},400);
  if(body.operation==='begin')return json({upload:await beginFounderMediaUpload(body)});
  if(body.operation==='complete'&&typeof body.uploadId==='string')return json(await completeFounderMediaUpload(body.uploadId));
  if(body.operation==='cancel'&&typeof body.uploadId==='string')return json(await cancelFounderMediaUpload(body.uploadId));
  return json({error:'Invalid operation'},400);
 }catch(error){const code=error instanceof Error?error.message:'';return json({error:mediaErrorMessages[code]||'Upload was not confirmed. Check the saved upload before retrying.',code:code in mediaErrorMessages?code:'MEDIA_SAVE_UNCONFIRMED'},code==='FILE_SIZE_LIMIT'?413:code in mediaErrorMessages?409:503);}
}
