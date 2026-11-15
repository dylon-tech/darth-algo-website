import {createHash} from 'node:crypto';
export const videoPrivacy=['public','unlisted','private'] as const;
export const tiktokPrivacy=['PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR','SELF_ONLY'] as const;
export type FounderVideoSettings={youtube:{platformAccountId:string;privacyStatus:typeof videoPrivacy[number];title:string};tiktok:{platformAccountId:string;privacyLevel:typeof tiktokPrivacy[number];allowComment:boolean;autoAddMusic:boolean;musicUsageConfirmed:boolean;isAiGenerated:boolean};instagram:{platformAccountId:string;mode:'regular'|'trial';graduationStrategy:null|'MANUAL'|'SS_PERFORMANCE';isAiGenerated:boolean}};
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const account=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\s\x00-\x1f]/.test(v);
export function validateFounderVideoSettings(value:unknown):FounderVideoSettings{
 if(!object(value)||!object(value.youtube)||!object(value.tiktok)||!object(value.instagram))throw Error('Choose all three video accounts and platform settings.');
 const y=value.youtube,t=value.tiktok,i=value.instagram;
 if(!account(y.platformAccountId)||!videoPrivacy.includes(y.privacyStatus as typeof videoPrivacy[number])||typeof y.title!=='string'||!y.title.trim()||y.title.length>100)throw Error('Choose a YouTube account, privacy setting, and title.');
 if(!account(t.platformAccountId)||!tiktokPrivacy.includes(t.privacyLevel as typeof tiktokPrivacy[number])||typeof t.allowComment!=='boolean'||typeof t.autoAddMusic!=='boolean'||typeof t.musicUsageConfirmed!=='boolean'||typeof t.isAiGenerated!=='boolean')throw Error('Choose TikTok privacy, comments, music, music-rights confirmation, and AI-label settings.');
 if(t.autoAddMusic&&!t.musicUsageConfirmed)throw Error('Confirm music rights before requesting TikTok music.');
 if(!account(i.platformAccountId)||!['regular','trial'].includes(String(i.mode))||typeof i.isAiGenerated!=='boolean'||(i.mode==='regular'?i.graduationStrategy!==null:!['MANUAL','SS_PERFORMANCE'].includes(String(i.graduationStrategy))))throw Error('Choose Instagram regular or Trial Reel, its graduation setting, and AI label.');
 // Construct only validated fields; no provider or model defaults enter approval.
 return {youtube:{platformAccountId:y.platformAccountId,privacyStatus:y.privacyStatus as FounderVideoSettings['youtube']['privacyStatus'],title:y.title},tiktok:{platformAccountId:t.platformAccountId,privacyLevel:t.privacyLevel as FounderVideoSettings['tiktok']['privacyLevel'],allowComment:t.allowComment,autoAddMusic:t.autoAddMusic,musicUsageConfirmed:t.musicUsageConfirmed,isAiGenerated:t.isAiGenerated},instagram:{platformAccountId:i.platformAccountId,mode:i.mode as 'regular'|'trial',graduationStrategy:i.graduationStrategy as FounderVideoSettings['instagram']['graduationStrategy'],isAiGenerated:i.isAiGenerated}};
}
export type FounderVideoApprovalSnapshot={itemId:string;contentVersion:number;mediaAssetId:string;mediaSha256:string;coverAssetId:string;coverSha256:string;caption:string;publishAt:string;settings:FounderVideoSettings;providerPostId:string;providerRevision:string};
export function validateFounderVideoSnapshot(value:unknown):FounderVideoApprovalSnapshot{
 if(!object(value))throw Error('A complete saved video snapshot is required.');
 for(const key of ['itemId','mediaAssetId','coverAssetId'])if(typeof value[key]!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value[key] as string))throw Error('Saved video and cover identifiers are required.');
 for(const key of ['mediaSha256','coverSha256'])if(typeof value[key]!=='string'||!/^[a-f0-9]{64}$/.test(value[key] as string))throw Error('Verified video and cover bytes are required.');
 if(!Number.isInteger(value.contentVersion)||Number(value.contentVersion)<1||typeof value.caption!=='string'||!value.caption.trim()||value.caption.length>2200||typeof value.publishAt!=='string'||!Number.isFinite(Date.parse(value.publishAt)))throw Error('Choose the saved video version, final caption, and posting time.');
 if(!account(value.providerPostId)||!account(value.providerRevision))throw Error('A verified provider draft and current revision are required before approval.');
 return {itemId:value.itemId as string,contentVersion:Number(value.contentVersion),mediaAssetId:value.mediaAssetId as string,mediaSha256:value.mediaSha256 as string,coverAssetId:value.coverAssetId as string,coverSha256:value.coverSha256 as string,caption:value.caption,publishAt:new Date(value.publishAt).toISOString(),settings:validateFounderVideoSettings(value.settings),providerPostId:value.providerPostId,providerRevision:value.providerRevision};
}
export function founderVideoSnapshotHash(snapshot:FounderVideoApprovalSnapshot){return createHash('sha256').update(JSON.stringify(validateFounderVideoSnapshot(snapshot))).digest('hex');}
