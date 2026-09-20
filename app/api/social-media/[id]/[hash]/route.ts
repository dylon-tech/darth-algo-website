import { db } from "../../../../lib/affiliate-db";
export const runtime="nodejs";
export async function GET(_request:Request,context:{params:Promise<{id:string;hash:string}>}) {
  const {id,hash}=await context.params;
  if(!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(hash))return new Response(null,{status:404});
  const [asset]=await db()`select details->>'png' as png from os_activity where event='social_media_asset' and entity_id=${id} and details->>'sha256'=${hash} limit 1`;
  if(!asset)return new Response(null,{status:404});
  const bytes=Buffer.from(asset.png,"base64");
  return new Response(bytes,{headers:{"Content-Type":"image/png","Content-Length":String(bytes.length),"Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"}});
}
