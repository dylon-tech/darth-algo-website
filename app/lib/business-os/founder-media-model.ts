/** Client-safe upload contract. Private originals never become public social assets implicitly. */
export const founderMediaLimits = {chunkBytes:1048576,maxFileBytes:33554432,maxStoredBytes:268435456,maxOpenUploads:4} as const;
export type FounderMediaAsset = {
 id:string;fileName:string;type:'image'|'video';mimeType:'image/png'|'image/jpeg'|'image/webp'|'video/mp4';
 bytes:number;width:number;height:number;durationSeconds:number|null;sha256:string;verifiedAt:string;
 url:string;downloadUrl:string;
 validation:{container:true;fullDecode:boolean;creativeReview:false};
};
export type FounderMediaUpload = {id:string;fileName:string;size:number;sha256:string|null;chunkBytes:number;chunkCount:number;received:number[];expiresAt:string;asset:FounderMediaAsset|null};
export type FounderMediaSnapshot = {
 checkedAt:string;assets:FounderMediaAsset[];
 capabilities:{upload:boolean;chunkBytes:number;maxFileBytes:number;maxStoredBytes:number;accepted:string[];conversion:string;generation:{available:false;reason:string};privacy:string};
};
export function founderMediaCapabilities(available=true):FounderMediaSnapshot['capabilities'] {
 return {upload:available,...founderMediaLimits,accepted:['image/png','image/jpeg','image/webp','video/mp4'],conversion:'Export HEIC as JPEG. Export MOV/HEVC video as H.264 MP4 with AAC audio before uploading. Uploads can pause when iOS suspends the app; return and retry the same file.',generation:{available:false,reason:'The approved photo v4 and video v15 references are identified, but a server render worker with verified capacity, current source footage and narration is not connected. Saving an idea does not create finished media.'},privacy:'Originals are private to your owner account. Download or share is not a publication receipt.'};
}
export function mediaFileName(value:unknown) {
 if(typeof value!=='string'||!value.trim()||value.length>240)throw Error('INVALID_FILE_NAME');
 return value.replace(/[\\/\x00-\x1f\x7f]/g,'_').trim();
}
export function mediaUuid(value:unknown):value is string {return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export function mediaByteRange(header:string|null,size:number):{start:number;end:number}|null {
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))throw Error('INVALID_RANGE');
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let end=match[1]?(match[2]?Number(match[2]):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start||(!match[1]&&Number(match[2])===0))throw Error('INVALID_RANGE');
 end=Math.min(end,size-1);return {start,end};
}
