import {createHash} from 'node:crypto';
import {socialCampaignQueue} from './social-campaign-queue';
import {socialVisualStandard} from './social-visual-standard';
import {currentCreativeVersion} from './creative-version';
import type {DailyCampaign} from './daily-social-policy';
import type {SocialSlot} from './social-schedule';
export type ReviewedCreative={id:string;day:string;slot:SocialSlot;theme:string;text:string;assets:Array<{path:string;sha256:string;altText:string;mimeType:'image/jpeg'|'image/png'}>;review:{referenceVersion:string;sha256:string;reviewer:string;reviewedAt:string}};
export function creativeDigest(c:Pick<ReviewedCreative,'text'|'assets'>) {return createHash('sha256').update(JSON.stringify({text:c.text,assets:c.assets})).digest('hex');}
export function validateReviewedCreative(c:ReviewedCreative) {
 if(!/^[a-z0-9-]{1,80}$/.test(c.id)||!/^\d{4}-\d{2}-\d{2}$/.test(c.day)||!['morning','afternoon'].includes(c.slot)||!c.text.trim()||c.text.length>280||c.assets.length<1||c.assets.length>3)throw Error('CREATIVE_REVIEW_INVALID');
 if(c.review.referenceVersion!==socialVisualStandard.version||!c.review.reviewer||!Number.isFinite(Date.parse(c.review.reviewedAt))||c.review.sha256!==creativeDigest(c))throw Error('CREATIVE_REVIEW_INVALID');
 for(const a of c.assets)if(!/^\/(?:social-campaigns|creative-references)\/[a-zA-Z0-9/_-]+\.(?:png|jpg)$/.test(a.path)||a.path.includes('..')||!a.path.includes(a.sha256.slice(0,12))||!/^([a-f0-9]{64})$/.test(a.sha256)||!a.altText||a.altText.length>1000||!['image/png','image/jpeg'].includes(a.mimeType))throw Error('CREATIVE_REVIEW_INVALID');
 return c;
}
export function reviewedCreativeFor(day:string,slot:SocialSlot):ReviewedCreative|null {
 const rows=socialCampaignQueue.filter(c=>c.day===day&&c.slot===slot);
 if(!rows.length)return null;
 if(rows.length!==1)throw Error('CREATIVE_SLOT_CONFLICT');
 return validateReviewedCreative(rows[0] as ReviewedCreative);
}
export function campaignMatchesReview(c:DailyCampaign) {
 if(c.creativeVersion!==currentCreativeVersion||!c.slot)return false;
 const approved=reviewedCreativeFor(c.day,c.slot);
 return Boolean(approved&&c.contentId===approved.id&&c.reviewHash===approved.review.sha256&&c.text===approved.text&&c.assets.length===approved.assets.length&&c.assets.every((a,i)=>a.sha256===approved.assets[i].sha256&&a.altText===approved.assets[i].altText));
}
export async function loadReviewedImages(c:ReviewedCreative) {
 validateReviewedCreative(c);
 return Promise.all(c.assets.map(async a=>{
  const response=await fetch('https://www.darthalgo.com'+a.path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok||response.headers.get('content-type')?.split(';')[0]!==a.mimeType||Number(response.headers.get('content-length'))>8_000_000)throw Error('CREATIVE_ASSET_UNAVAILABLE');
  const reader=response.body?.getReader();if(!reader)throw Error('CREATIVE_ASSET_UNAVAILABLE');
  const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8_000_000)throw Error('CREATIVE_ASSET_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=Buffer.concat(chunks);
  if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('CREATIVE_ASSET_CHANGED');
  return {sha256:a.sha256,png:bytes.toString('base64'),mimeType:a.mimeType,altText:a.altText};
 }));
}
