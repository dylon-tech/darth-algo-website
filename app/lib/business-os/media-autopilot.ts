import {db} from "../affiliate-db";
import {checkBufferPublication} from "./buffer-publishing";
import {checkInstagramPublication} from "./instagram-publishing";
import {syncDailySocial} from "./daily-social";
import {publishCommunityPreview} from "./community-social";
export function routineMediaAllowed(text:string) {
  // Routine education and discovery only. Offers, testimonials/results and
  // third-party tagging need a separately implemented, evidenced workflow.
  if(/\$|\b(?:guarantee[ds]?|profit(?:able|s)?|win\s*rate|discount|coupon|payout|testimonial)\b|\d\s*%|@[a-z0-9_]/i.test(text))return false;
  const urls=text.match(/https?:\/\/\S+/g)||[];
  return urls.every(value=>{try{const u=new URL(value);return u.origin==="https://www.darthalgo.com" && ["/links","/community","/products/swing","/products/scalper","/products/pro"].includes(u.pathname);}catch{return false;}});
}
// The old independent X/Instagram lanes are superseded by one shared daily campaign.
export async function syncMediaAutopilot() {
 if(process.env.VERCEL_ENV!=="production" || process.env.AI_OS_AUTONOMY_ENABLED!=="true")return {status:"disabled"};
 const sql=db();
 const [control]=await sql`select paused from os_control where id=1`;
 if(!control||control.paused)return {status:"paused"};
 // Preserve accepted legacy deliveries; retire unsent independent drafts.
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730922)`;
  await tx`update os_approvals a set status='expired',decision_note='Superseded by the owner’s same-post daily campaign' where status in ('pending','approved') and payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1') and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started')`;
 });
 const receipts=await sql`select a.id,a.payload,a.payload_hash from os_approvals a where status='approved' and payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1') and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_receipt') and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and (details->>'published'='true' or created_at>now()-interval '5 minutes')) order by created_at limit 2`;
 for(const r of receipts){if(r.payload.executor==='buffer_x_v1')await checkBufferPublication(r.id,r.payload_hash);else await checkInstagramPublication(r.id,r.payload_hash);}
 const social=await syncDailySocial();
 const community=await publishCommunityPreview();
 return {...social,community};
}
