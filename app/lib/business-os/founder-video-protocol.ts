import {createHash} from 'node:crypto';
import {validateFounderVideoSettings,type FounderVideoSettings} from './founder-video-publication-policy';
// Contracts: https://github.com/vid-io/vidiq-mcp/tree/d4b0e3780f1b976241b0e9766e6ca140a75abc67/skills/vidiq-publishing/references
// Pure protocol only. No client, credentials, network calls, or activation switch.
export const videoBufferedExportLimit=4_000_000;
export type VideoBrief={caption:string;settings:FounderVideoSettings};
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\s\x00-\x1f]/.test(v);
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function videoSourceGate(bytes:number){
 if(!Number.isSafeInteger(bytes)||bytes<32||bytes>33_554_432)throw Error('VIDEO_SIZE_INVALID');
 return {ready:false as const,requiresLargeSourceVerification:bytes>videoBufferedExportLimit,reason:bytes>videoBufferedExportLimit?'Native video needs a verified large-file source with exact Content-Length and byte identity. Options are approved private object storage with expiring URLs or a deployed streamed export proven to preserve that header; neither is currently verified.':'A scoped, expiring buffered export with Content-Length must be implemented and runtime-verified before import. The existing streaming export has not been verified for this import contract.'};
}
export function validateVideoBrief(value:VideoBrief):VideoBrief{
 if(typeof value.caption!=='string'||!value.caption.trim()||value.caption.length>2200)throw Error('VIDEO_CAPTION_REQUIRED');
 return {caption:value.caption,settings:validateFounderVideoSettings(value.settings)};
}
export function videoDraftRequest(value:VideoBrief,uploadId:string,thumbnailImageId?:string){
 const b=validateVideoBrief(value);if(!id(uploadId))throw Error('READY_UPLOAD_ID_REQUIRED');if(thumbnailImageId!==undefined&&!id(thumbnailImageId))throw Error('VERIFIED_COVER_ID_REQUIRED');
 // Own calendar sends now only after approval. No provider scheduling/default accounts.
 const {youtube:y,tiktok:t}=b.settings;
 return {text:b.caption,media:[{id:uploadId,type:'video' as const}],destinations:[{platform:'YOUTUBE' as const,platformAccountId:y.platformAccountId,title:y.title,privacyStatus:y.privacyStatus,...(thumbnailImageId?{thumbnailImageId}:{})},{platform:'TIKTOK' as const,platformAccountId:t.platformAccountId,privacyLevel:t.privacyLevel,allowComment:t.allowComment,autoAddMusic:t.autoAddMusic,musicUsageConfirmed:t.musicUsageConfirmed,isAiGenerated:t.isAiGenerated}]};
}
export type VideoDraftEvidence={postId:string;revision:string;publicationIds:[string,string];requestSha256:string};
function canonical(v:unknown):unknown{return Array.isArray(v)?v.map(canonical):obj(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
export function videoRequestHash(request:ReturnType<typeof videoDraftRequest>){return createHash('sha256').update(JSON.stringify(canonical(request))).digest('hex');}
export function verifyVideoDraft(value:unknown,request:ReturnType<typeof videoDraftRequest>):VideoDraftEvidence{
 if(!obj(value)||!id(value.postId)||!id(value.revision)||value.ready!==true||value.credits!==0||value.text!==request.text||!obj(value.media)||value.media.videos!==1||value.media.images!==0||!Array.isArray(value.destinations)||value.destinations.length!==2)throw Error('VIDEO_DRAFT_NOT_VERIFIED');
 const ids=request.destinations.map(expected=>{
  const matches=(value.destinations as unknown[]).filter((d):d is Record<string,unknown>=>obj(d)&&d.platform===expected.platform&&d.platformAccountId===expected.platformAccountId);
  if(matches.length!==1)throw Error('VIDEO_ACCOUNT_PARITY_FAILED');const d=matches[0];
  if(d.status!=='draft'||d.issue||!id(d.publicationId)||d.scheduledFor!==null||(d.credits!==undefined&&d.credits!==0)||(d.text!==undefined&&d.text!==request.text))throw Error('VIDEO_DESTINATION_NOT_VERIFIED');
  if(d.media!==undefined&&(!obj(d.media)||d.media.videos!==1||d.media.images!==0))throw Error('VIDEO_MEDIA_COUNT_CHANGED');
  return d.publicationId;
 });
 if(ids[0]===ids[1])throw Error('VIDEO_DUPLICATE_PUBLICATION_ID');
 // Readback has counts, not identity/options: bind the exact persisted create request.
 return {postId:value.postId,revision:value.revision,publicationIds:ids as [string,string],requestSha256:videoRequestHash(request)};
}
export function videoPublishRequest(approved:VideoDraftEvidence,current:VideoDraftEvidence){
 if(JSON.stringify(canonical(approved))!==JSON.stringify(canonical(current)))throw Error('VIDEO_DRAFT_REAPPROVAL_REQUIRED');
 if(!id(approved.postId)||!id(approved.revision)||approved.publicationIds.length!==2||approved.publicationIds.some(v=>!id(v))||!/^[a-f0-9]{64}$/.test(approved.requestSha256))throw Error('VIDEO_APPROVAL_INVALID');
 return {postId:approved.postId,revision:approved.revision,publicationIds:[...approved.publicationIds]};
}
export function instagramVideoRequest(brief:VideoBrief,readyVideoUrl:string,capability:{platformAccountId:string;canPublish:boolean;publishingAvailable:boolean}){
 const {settings,caption}=validateVideoBrief(brief),i=settings.instagram;
 if(capability.platformAccountId!==i.platformAccountId||capability.canPublish!==true||capability.publishingAvailable!==true)throw Error('INSTAGRAM_CAPABILITY_REQUIRED');
 const url=new URL(readyVideoUrl);if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error('PROVIDER_READY_VIDEO_URL_REQUIRED');
 // Caller must establish provider-ready URL provenance; arbitrary HTTPS is insufficient.
 return {platformAccountId:i.platformAccountId,videoUrl:readyVideoUrl,caption,isAiGenerated:i.isAiGenerated,...(i.mode==='trial'?{trialParams:{graduationStrategy:i.graduationStrategy!}}:{})};
}
export type VideoAttemptState='waiting'|'started'|'submitted'|'outcome_unknown'|'verification_required'|'completed_unconfirmed'|'confirmed'|'failed'|'needs_reconciliation';
export function videoPublishOutcome(value:unknown,approved:VideoDraftEvidence){
 if(!obj(value)||value.postId!==approved.postId||!Array.isArray(value.destinations))return {state:'outcome_unknown' as VideoAttemptState,ownerAction:'Check the existing provider post. Do not create or publish a replacement.'};
 if(value.status==='verification_required')return {state:'verification_required' as VideoAttemptState,ownerAction:'Complete YouTube verification through the provider. Website verification handoff is not implemented; no automatic replay is permitted.'};
 const exact=value.destinations.length===2&&approved.publicationIds.every(pid=>(value.destinations as unknown[]).filter(d=>obj(d)&&d.publicationId===pid).length===1);
 if(!exact)return {state:'outcome_unknown' as VideoAttemptState,ownerAction:'Provider destination identity changed. Review before any further action.'};
 return {state:'submitted' as VideoAttemptState,ownerAction:'Check the saved destination receipts; acceptance is not proof of public visibility.'};
}
export const videoReadDelaysMs=[10_000,20_000,30_000,30_000,30_000] as const;
export function videoReadBudget(input:{state:VideoAttemptState;attempts:number;startedAt:number;nextCheckAt:number|null},now:number){
 if(!['submitted','outcome_unknown'].includes(input.state))return 'stop' as const;
 if(!Number.isSafeInteger(input.attempts)||input.attempts<0||!Number.isFinite(input.startedAt)||now-input.startedAt>=120_000||input.attempts>=6)return 'manual' as const;
 if(input.nextCheckAt!==null&&now<input.nextCheckAt)return 'wait' as const;
 return 'read' as const;
}
