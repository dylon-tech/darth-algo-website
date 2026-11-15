import {createHash} from 'node:crypto';
import type {FounderContentItem} from './founder-content-model';
export const founderPhotoAiDisclosure='AI-assisted media; Instagram AI label requested; Threads/X native labels not verified.' as const;
export const founderPhotoNetworks=['instagram','threads','x'] as const;
export type FounderPhotoNetwork=typeof founderPhotoNetworks[number];
export type FounderPhotoSnapshot={itemId:string;version:number;mediaAssetId:string;mediaSha256:string;mimeType:string;bytes:number;caption:string;altText:string;publishAt:string;isAiGenerated:true;aiDisclosure:typeof founderPhotoAiDisclosure;destinations:Array<{network:FounderPhotoNetwork;channelId:string;name:string}>};
export function publicationHash(value:unknown){const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
export function photoItemMatches(item:FounderContentItem,s:FounderPhotoSnapshot){return item.id===s.itemId&&item.version===s.version&&item.type==='image'&&item.mediaAssetId===s.mediaAssetId&&item.caption===s.caption&&item.title===s.altText&&item.destinations.length===s.destinations.length&&item.destinations.every(n=>s.destinations.some(d=>d.network===n))&&!['held','skipped','archived','generating'].includes(item.status);}
export function validatePhotoSnapshot(s:FounderPhotoSnapshot){
 if(!s||!/^[-a-f0-9]{36}$/.test(s.itemId)||!/^[-a-f0-9]{36}$/.test(s.mediaAssetId)||!Number.isInteger(s.version)||s.version<1||!/^[a-f0-9]{64}$/.test(s.mediaSha256)||!['image/png','image/jpeg'].includes(s.mimeType)||!Number.isInteger(s.bytes)||s.bytes<32||s.bytes>8000000||!s.caption.trim()||s.caption.length>280||!s.altText.trim()||s.altText.length>1000||s.isAiGenerated!==true||s.aiDisclosure!==founderPhotoAiDisclosure||!Number.isFinite(Date.parse(s.publishAt)))throw Error('PHOTO_PUBLICATION_INVALID');
 if(!s.destinations.length||s.destinations.length>3||new Set(s.destinations.map(d=>d.network)).size!==s.destinations.length||s.destinations.some(d=>!founderPhotoNetworks.includes(d.network)||!/^[-\w]{1,100}$/.test(d.channelId)||!d.name||d.name.length>200))throw Error('PHOTO_DESTINATIONS_INVALID');return s;
}
