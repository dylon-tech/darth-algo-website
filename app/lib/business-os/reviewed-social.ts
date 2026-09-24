import {createHash} from 'node:crypto';
import {socialCampaignQueue} from './social-campaign-queue';
import {socialVisualStandard} from './social-visual-standard';
import {currentCreativeVersion} from './creative-version';
import type {DailyCampaign} from './daily-social-policy';
import type {SocialSlot} from './social-schedule';
import {regularContentKind,resultsSlot,socialEditorialVersion,type SocialContentKind} from './social-editorial-policy';
export type EditorialReview={version:string;kind:SocialContentKind;sources:string[];learning:string;result?:{sourceHash:string;tradeDate:string;symbol:string;timeframe:string;outcomeBasis:'chart_setup'|'executed_trade';verificationNote:string}};
export type ReviewedCreative={id:string;day:string;slot:SocialSlot;theme:string;text:string;editorial?:EditorialReview;assets:Array<{path:string;sha256:string;altText:string;mimeType:'image/jpeg'|'image/png'}>;review:{referenceVersion:string;sha256:string;reviewer:string;reviewedAt:string}};
export function creativeDigest(c:Pick<ReviewedCreative,'text'|'assets'|'editorial'>) {return createHash('sha256').update(JSON.stringify({text:c.text,assets:c.assets,...(c.editorial?{editorial:c.editorial}:{})})).digest('hex');}
export function assertFreshCreative(c:ReviewedCreative,history:ReviewedCreative[]) {
 // Same campaign syndicated across channels/reconciled on retries is one post.
 // Changing URLs, hashtags, punctuation or filename is not fresh content.
 const copyKey=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/https?:\/\/\S+/g,' ').replace(/#[\p{L}\p{N}_]+/gu,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const key=copyKey(c.text),hashes=new Set(c.assets.map(a=>a.sha256));
 for(const old of history) {
  if(old.id===c.id)continue;
  if((key&&key===copyKey(old.text))||old.assets.some(a=>hashes.has(a.sha256)))throw Error('CREATIVE_DUPLICATE_CONTENT');
  if(c.editorial?.result&&old.editorial?.result?.sourceHash===c.editorial.result.sourceHash)throw Error('CREATIVE_DUPLICATE_RESULT');
 }
}
export function validateReviewedCreative(c:ReviewedCreative) {
 if(!/^[a-z0-9-]{1,80}$/.test(c.id)||!/^\d{4}-\d{2}-\d{2}$/.test(c.day)||!['morning','afternoon'].includes(c.slot)||!c.text.trim()||c.text.length>280||c.assets.length<1||c.assets.length>3)throw Error('CREATIVE_REVIEW_INVALID');
 if(c.review.referenceVersion!==socialVisualStandard.version||!c.review.reviewer||!Number.isFinite(Date.parse(c.review.reviewedAt))||c.review.sha256!==creativeDigest(c))throw Error('CREATIVE_REVIEW_INVALID');
 for(const a of c.assets)if(!/^\/(?:social-campaigns|creative-references)\/[a-zA-Z0-9/_-]+\.(?:png|jpg)$/.test(a.path)||a.path.includes('..')||!a.path.includes(a.sha256.slice(0,12))||!/^([a-f0-9]{64})$/.test(a.sha256)||!a.altText||a.altText.length>1000||!['image/png','image/jpeg'].includes(a.mimeType))throw Error('CREATIVE_REVIEW_INVALID');
 if(c.day>='2026-09-24') {
  const e=c.editorial;
  if(!e||e.version!==socialEditorialVersion||!e.sources.length||!e.learning.trim()||/illustrative display|trading involves (?:substantial )?risk/i.test(c.text+' '+c.assets.map(a=>a.altText).join(' ')))throw Error('CREATIVE_EDITORIAL_REVIEW_REQUIRED');
  if(e.kind==='results') {
   const r=e.result;
   const time=Date.parse(c.day+'T00:00:00Z'),weekday=new Date(time).getUTCDay();
   const monday=new Date(time-((weekday+6)%7)*86400000).toISOString().slice(0,10);
   if(!resultsSlot(c.day,c.slot)||!r||!/^[a-f0-9]{64}$/.test(r.sourceHash)||r.tradeDate<monday||r.tradeDate>c.day||!r.symbol.trim()||!r.timeframe.trim()||!['chart_setup','executed_trade'].includes(r.outcomeBasis)||!r.verificationNote.trim())throw Error('CREATIVE_RESULTS_EVIDENCE_REQUIRED');
   regularContentKind(r.tradeDate);
  } else if(e.kind!==regularContentKind(c.day))throw Error('CREATIVE_EDITORIAL_DAY_MISMATCH');
 }
 return c;
}
export function reviewedCreativeFor(day:string,slot:SocialSlot):ReviewedCreative|null {
 const rows=socialCampaignQueue.filter(c=>c.day===day&&c.slot===slot);
 if(!rows.length)return null;
 if(rows.length!==1)throw Error('CREATIVE_SLOT_CONFLICT');
 if(day>='2026-09-24')assertFreshCreative(rows[0],socialCampaignQueue.filter(c=>c.day<day||(c.day===day&&c.slot==='morning'&&slot==='afternoon')));
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
