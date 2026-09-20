import { createHash } from "node:crypto";
import { bufferGraphQL, bufferStatus, type BufferPost } from "./buffer";
import { isInstagramPublication, type InstagramPublication } from "./instagram-policy";

export type InstagramPost = BufferPost & { assets: Array<{ source: string; type: string; image?: { altText: string } }> };
const postFields = "id text channelId status dueAt sentAt assets { source type ... on ImageAsset { image { altText } } }";
export async function instagramChannelReady(payload: InstagramPublication) {
  const state = await bufferStatus();
  const channel = state.channels.find(c=>c.id===payload.channelId && c.service?.toLowerCase()==="instagram");
  if (!channel || channel.isDisconnected !== false || channel.isLocked !== false || channel.isQueuePaused !== false) throw new Error("INSTAGRAM_CHANNEL_NOT_READY");
}
export async function verifyInstagramAssets(payload: InstagramPublication) {
  if (!isInstagramPublication(payload)) throw new Error("INSTAGRAM_PAYLOAD_INVALID");
  await Promise.all(payload.assets.map(async asset => {
    const response = await fetch(asset.url, {cache:"no-store", redirect:"error", signal:AbortSignal.timeout(15000)});
    if (!response.ok || response.headers.get("content-type")?.split(";")[0]!=="image/png" || Number(response.headers.get("content-length"))>8_000_000) throw new Error("INSTAGRAM_ASSET_UNAVAILABLE");
    // Bound the download even if content-length is missing or incorrect.
    const reader=response.body?.getReader(); if(!reader) throw new Error("INSTAGRAM_ASSET_UNAVAILABLE");
    const hash=createHash("sha256"); let size=0;
    try { while(true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>8_000_000)throw new Error("INSTAGRAM_ASSET_TOO_LARGE"); hash.update(value); } }
    finally {await reader.cancel();}
    if(hash.digest("hex")!==asset.sha256) throw new Error("INSTAGRAM_ASSET_CHANGED");
  }));
}
export async function getInstagramPost(id: string): Promise<InstagramPost> {
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("BUFFER_POST_ID_INVALID");
  const data=await bufferGraphQL<{post:InstagramPost}>(`query InstagramPost($input: PostInput!) { post(input:$input) { ${postFields} } }`,{input:{id}});
  return data.post;
}
export function instagramPostMatches(post: InstagramPost, payload: InstagramPublication) {
  return post.channelId===payload.channelId && post.text===payload.text && Array.isArray(post.assets) && post.assets.length===payload.assets.length && post.assets.every((asset,i)=>asset.type==="image" && asset.image?.altText===payload.assets[i].altText && asset.source===payload.assets[i].url);
}
export async function createInstagramPost(payload: InstagramPublication, saveToDraft = true) {
  if(!isInstagramPublication(payload)) throw new Error("INSTAGRAM_PAYLOAD_INVALID");
  await Promise.all([instagramChannelReady(payload),verifyInstagramAssets(payload)]);
  const data=await bufferGraphQL<{createPost:{post?:InstagramPost}}>(`mutation InstagramCreatePost($input:CreatePostInput!) { createPost(input:$input) { ... on PostActionSuccess { post { ${postFields} } } ... on MutationError { message } } }`,{input:{
    channelId:payload.channelId,text:payload.text,assets:payload.assets.map(asset=>({image:{url:asset.url,metadata:{altText:asset.altText}}})),
    mode:"shareNow",schedulingType:"automatic",needsApproval:false,saveToDraft,aiAssisted:true,
    metadata:{instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:true}},
  }});
  if(!data.createPost?.post?.id)throw new Error("INSTAGRAM_POST_REJECTED");
  return data.createPost.post;
}
