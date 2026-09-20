import {bufferGraphQL,bufferStatus,type BufferChannel} from './buffer';
import {verifyInstagramAssets} from './buffer-instagram';
import {instagramPublicationPayload} from './instagram-policy';
import {isDailySocialPayload,type DailySocialPayload,type SocialNetwork} from './daily-social-policy';
import {mediaAutopilot} from './media-policy';
export type SocialPost={id:string;text:string;channelId:string;status:string;sentAt?:string|null;externalLink?:string|null;assets:Array<{source:string;type:string;image?:{altText:string}}>};
const fields='id text channelId status sentAt externalLink assets { source type ... on ImageAsset { image { altText } } }';
export function selectSocialChannel(channels:BufferChannel[],network:SocialNetwork){
 const service=(c:BufferChannel)=>network==='x'?['x','twitter'].includes(String(c.service).toLowerCase()):c.service?.toLowerCase()===network;
 const pinned=network==='threads'?process.env.BUFFER_THREADS_CHANNEL_ID?.trim():mediaAutopilot.channels[network];
 const eligible=channels.filter(c=>service(c)&&(pinned?c.id===pinned:network==='threads'&&c.name?.replace(/^@/,'').toLowerCase()==='darth.algo'));
 if(eligible.length!==1)return null;
 const c=eligible[0];return c.isDisconnected===false&&c.isLocked===false&&c.isQueuePaused===false?c:null;
}
export async function socialPreflight(payload:DailySocialPayload){
 if(!isDailySocialPayload(payload))throw Error('DAILY_SOCIAL_PAYLOAD_INVALID');
 const state=await bufferStatus({fresh:true}),channel=selectSocialChannel(state.channels,payload.network);
 if(!channel||channel.id!==payload.channelId)throw Error('DAILY_SOCIAL_CHANNEL_NOT_READY');
 // Reuse bounded downloads and exact immutable-byte checks for all three networks.
 await verifyInstagramAssets(instagramPublicationPayload({campaignId:`daily-${payload.campaign.day}`,text:payload.text,assets:payload.assets}));
}
export async function createSocialPost(payload:DailySocialPayload){
 if(!isDailySocialPayload(payload))throw Error('DAILY_SOCIAL_PAYLOAD_INVALID');
 const data=await bufferGraphQL<{createPost:{post?:SocialPost}}>(`mutation DailySocialCreatePost($input:CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{${fields}}} ... on MutationError{message}}}`,{input:{channelId:payload.channelId,text:payload.text,assets:payload.assets.map(a=>({image:{url:a.url,metadata:{altText:a.altText}}})),mode:'shareNow',schedulingType:'automatic',saveToDraft:false,needsApproval:false,aiAssisted:true,...(payload.network==='instagram'?{metadata:{instagram:{type:'post',shouldShareToFeed:true,isAiGenerated:true}}}:{})}});
 if(!data.createPost?.post?.id)throw Error('DAILY_SOCIAL_POST_REJECTED');return data.createPost.post;
}
export async function getSocialPost(id:string){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('BUFFER_POST_ID_INVALID');
 return (await bufferGraphQL<{post:SocialPost}>(`query DailySocialPost($input:PostInput!){post(input:$input){${fields}}}`,{input:{id}})).post;
}
export function socialPostMatches(post:SocialPost,p:DailySocialPayload){return post.channelId===p.channelId&&post.text===p.text&&post.assets?.length===p.assets.length&&post.assets.every((a,i)=>a.type==='image'&&a.source===p.assets[i].url&&a.image?.altText===p.assets[i].altText);}
