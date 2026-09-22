import type {SocialSlot} from './social-schedule';
import type {InstagramAsset} from './instagram-policy';
export const dailySocialPolicy={id:'owner-twice-daily-2026-09-22-v3',enabled:true,hour:9,afternoonHour:15,minimumHours:4,timezone:'America/New_York'} as const;
export type SocialNetwork='x'|'instagram'|'threads';
export type DailyCampaign={day:string;assetId:string;theme:string;text:string;assets:InstagramAsset[];creativeVersion?:string;slot?:SocialSlot;contentId?:string;reviewHash?:string};
export function dailySocialPayload(campaign:DailyCampaign,network:SocialNetwork,channelId:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(campaign.day)||!['x','instagram','threads'].includes(network)||!campaign.text.trim()||campaign.text.length>280||(campaign.slot?(campaign.assets.length<1||campaign.assets.length>3):campaign.assets.length!==3)||!/^[a-zA-Z0-9_-]{1,100}$/.test(channelId))throw Error('DAILY_SOCIAL_PAYLOAD_INVALID');
 if(campaign.slot&&!['morning','afternoon'].includes(campaign.slot))throw Error('DAILY_SOCIAL_SLOT_INVALID');
 if(!/^[a-f0-9-]{36}$/.test(campaign.assetId))throw Error('DAILY_SOCIAL_ASSET_INVALID');
 for(const a of campaign.assets)if(!/^[a-f0-9]{64}$/.test(a.sha256)||a.url!==`https://www.darthalgo.com/api/social-media/${campaign.assetId}/${a.sha256}`||!a.altText||a.altText.length>1000)throw Error('DAILY_SOCIAL_ASSET_INVALID');
 return {kind:'publishing' as const,executor:'buffer_social_v2' as const,policyId:campaign.slot?dailySocialPolicy.id:'owner-same-post-2026-09-20-v2',network,channelId,campaign,text:campaign.text,assets:campaign.assets,mode:'shareNow' as const,summary:campaign.slot?`${campaign.slot} photo · ${network}`:`Daily photo · ${network}`,details:campaign.slot?`Same images and caption across X, Instagram and Threads. ${campaign.day} ${campaign.slot}`:`Same three images and caption across X, Instagram and Threads. ${campaign.day}`,evidence:['owner_same_post_instruction']};
}
export type DailySocialPayload=ReturnType<typeof dailySocialPayload>;
function canonical(value:unknown):string {
 const sort=(v:unknown):unknown=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sort(x)])):v;
 return JSON.stringify(sort(value));
}
export function isDailySocialPayload(value:unknown):value is DailySocialPayload {
 try{const p=value as DailySocialPayload;return canonical(p)===canonical(dailySocialPayload(p.campaign,p.network,p.channelId));}catch{return false;}
}
export function socialPostUrl(value:unknown,network:SocialNetwork):string|null {
 try{const u=new URL(String(value));const hosts={x:['x.com','www.x.com','twitter.com','www.twitter.com'],instagram:['instagram.com','www.instagram.com'],threads:['threads.net','www.threads.net','threads.com','www.threads.com']};
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts[network].includes(u.hostname))return null;
 const valid=network==='x'?/^\/[^/]+\/status\/\d+\/?$/.test(u.pathname):network==='instagram'?/^\/(p|reel)\/[^/]+\/?$/.test(u.pathname):/^\/@[^/]+\/post\/[^/]+\/?$/.test(u.pathname);
 return valid?u.href:null;}catch{return null;}
}
