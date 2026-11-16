/** Large video delivery is unavailable until an operator verifies the exact deployed
 * commit's Content-Length and byte hash with the receiving provider. A new commit
 * invalidates readiness. This is not inferred from mocked tests or an owner click. */
export function founderVideoStreamingVerified(){
 const head=process.env.VERCEL_GIT_COMMIT_SHA;
 return process.env.VERCEL_ENV==='production'&&Boolean(head&&/^[a-f0-9]{40}$/.test(head))&&process.env.FOUNDER_VIDEO_SOURCE_TRANSPORT==='stream_verified_v1'&&process.env.FOUNDER_VIDEO_SOURCE_VERIFIED_SHA===head;
}
export function founderVideoSourceLimit(){return founderVideoStreamingVerified()?32*1024*1024:4_000_000;}
export function founderVideoSourceBody(bytes:Uint8Array):BodyInit{
 if(bytes.byteLength>founderVideoSourceLimit())throw Error('VIDEO_LARGE_SOURCE_UNVERIFIED');
 if(bytes.byteLength<=4_000_000)return bytes as BodyInit;
 return founderVideoByteStream(bytes);
}
/** Shared deterministic streaming primitive; no media lookup or authorization. */
export function founderVideoByteStream(bytes:Uint8Array){
 let offset=0;
 return new ReadableStream<Uint8Array>({pull(controller){
  if(offset>=bytes.byteLength){controller.close();return;}
  const end=Math.min(offset+64*1024,bytes.byteLength);controller.enqueue(bytes.subarray(offset,end));offset=end;
 },cancel(){offset=bytes.byteLength;}});
}
