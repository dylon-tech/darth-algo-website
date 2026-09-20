import { createHash } from "node:crypto";
import { db } from "../affiliate-db";
import { fingerprint } from "./policy";
import { mediaAutopilot, contentSlot } from "./media-policy";
import { isBufferPublication } from "./buffer-publication-policy";
import { isInstagramPublication, instagramPublicationPayload } from "./instagram-policy";
import { executeBufferPublication, checkBufferPublication } from "./buffer-publishing";
import { executeInstagramPublication, checkInstagramPublication, syncInstagramCampaign } from "./instagram-publishing";
import { queueOwnerNotice } from "./delivery";

export function routineMediaAllowed(text:string) {
  // Routine education and discovery only. Offers, testimonials/results and
  // third-party tagging need a separately implemented, evidenced workflow.
  if(/\$|\b(?:guarantee[ds]?|profit(?:able|s)?|win\s*rate|discount|coupon|payout|testimonial)\b|\d\s*%|@[a-z0-9_]/i.test(text))return false;
  const urls=text.match(/https?:\/\/\S+/g)||[];
  return urls.every(value=>{try{const u=new URL(value);return u.origin==="https://www.darthalgo.com" && ["/links","/community","/products/swing","/products/scalper","/products/pro"].includes(u.pathname);}catch{return false;}});
}
async function prepareDailyInstagram() {
  const sql=db();
  const [waiting]=await sql`select id from os_approvals where payload->>'executor'='buffer_instagram_v1' and status in ('pending','approved') and expires_at>now() and not exists(select 1 from os_activity where entity_id=os_approvals.id::text and event='buffer_publish_started') limit 1`;
  if(waiting)return;
  const [recent]=await sql`select id from os_activity where event='media_auto_authorized' and details->>'network'='instagram' and created_at>now()-interval '20 hours' limit 1`;
  if(recent)return;
  const [source]=await sql`select a.run_id,a.payload from os_approvals a where a.run_id is not null and a.payload->>'executor'='buffer_x_v1' and a.created_at>now()-interval '24 hours' and a.status in ('pending','approved')
    and not exists(select 1 from os_activity where event='instagram_daily_handoff' and entity_id=a.run_id::text) order by a.created_at desc limit 1`;
  if(!source || !isBufferPublication(source.payload) || !routineMediaAllowed(source.payload.text))return;
  const sourceId=String(source.run_id);
  let [asset]=await sql`select details from os_activity where event='social_media_asset' and entity_id=${sourceId} limit 1`;
  if(!asset) {
    const [preference]=await sql`select details from os_activity where event='media_style_changed' order by id desc limit 1`;
    const {renderSocialArt}=await import("./social-art");
    const text=source.payload.text.replace(/https?:\/\/\S+/g,"").replace(/#\w+/g,"").trim();
    const png=await renderSocialArt(text,preference?.details.style || "crimson");
    const sha256=createHash("sha256").update(png).digest("hex");
    const details={sha256,png:png.toString("base64"),text,altText:`Darth Algo field notes: ${text}`,caption:`${text}\n\nExplore our indicators, community and official pages through the link in our bio.\n\n#DarthAlgo #TradingView #FuturesTrading`};
    asset=await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730923)`;
      const [existing]=await tx`select details from os_activity where event='social_media_asset' and entity_id=${sourceId} limit 1`;
      if(existing)return existing;
      await tx`insert into os_activity(actor,event,entity_id,details) values('content','social_media_asset',${sourceId},${tx.json(details)})`;
      return {details};
    });
  }
  const p=instagramPublicationPayload({campaignId:`daily-${sourceId}`,text:asset.details.caption,assets:[{url:`https://www.darthalgo.com/api/social-media/${sourceId}/${asset.details.sha256}`,sha256:asset.details.sha256,altText:asset.details.altText}]});
  const result=await syncInstagramCampaign(p);
  if(result.status==="prepared")await sql`insert into os_activity(actor,event,entity_id,details) select 'content','instagram_daily_handoff',${sourceId},${sql.json({approvalId:result.approvalId})} where not exists(select 1 from os_activity where event='instagram_daily_handoff' and entity_id=${sourceId})`;
}
export async function syncMediaAutopilot() {
  if(!mediaAutopilot.enabled || process.env.VERCEL_ENV!=="production" || process.env.AI_OS_AUTONOMY_ENABLED!=="true")return {status:"disabled"};
  const sql=db();
  const [control]=await sql`select paused from os_control where id=1`;
  if(!control || control.paused)return {status:"paused"};
  // Record the standing instruction once, independently of model suggestions.
  await sql.begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730922)`;
    const [grant]=await tx`select id from os_activity where event='media_policy_enabled' and entity_id=${mediaAutopilot.id} limit 1`;
    if(!grant)await tx`insert into os_activity(actor,event,entity_id,details) values('owner','media_policy_enabled',${mediaAutopilot.id},${tx.json({channels:mediaAutopilot.channels,daily:mediaAutopilot.daily,authorization:"Owner requested automatic routine media creation and posting on 2026-09-20. Existing spending limits retained."})})`;
  });
  const {homeMenu}=await import("./telegram-ui");
  await queueOwnerNotice(`media-policy:${mediaAutopilot.id}`,"◆ DARTH ALGO · CEO DESK\n\nRoutine posting is automatic: up to 3 X posts and 1 Instagram post daily, within the existing AI budget. No per-post approval needed.\n\nTap Today’s posts for actual delivery, Queue for upcoming content, or Agents to give work. Send /suggest followed by a topic or style idea. Pause stops new work and new submissions.\n\nOnly verified connected X and Instagram accounts are enabled. Other business actions retain their own approval requirements.",homeMenu());
  if(process.env.AI_OS_AI_ENABLED==="true") {
    const {queueJob}=await import("./jobs");
    await queueJob("research","Activate the competitor visual research feed. Use competitor_public_posts and the attached thumbnails. Compare recent titles, hooks, thumbnail design and public views/day within each competitor and format. Deliver three original Darth Algo content tests and share actionable guidance for Content, Growth and CEO. Cite the exact posts and distinguish observed evidence from hypotheses; do not claim views are sales or thumbnails are full videos.","launch:competitor-visual-v3","schedule");
  }
  const slot=contentSlot();
  if(slot.key && process.env.AI_OS_AI_ENABLED==="true") {
    const preferences=await sql`select left(details->>'text',180) as text from os_activity where event='media_suggestion' order by id desc limit 5`;
    const recent=await sql`select payload->>'text' as text from os_approvals where payload->>'executor'='buffer_x_v1' order by created_at desc limit 6`;
    const {queueJob}=await import("./jobs");
    await queueJob("content",`Create one fresh, finished X post in xDraft for routine automatic publishing. Angle: ${slot.slot===9?"useful chart-reading education":slot.slot===14?"indicator discovery through the links page":"community and learning"}. Use verified facts, one CTA to the supplied linksUrl or communityUrl, and no prices, offers, results, profit claims, testimonials, external tags or third-party URLs. Do not duplicate recent posts. The server handles publishing under the owner's standing media instruction; do not create a publishing proposal.\nOwner suggestions (creative preferences, not verified facts): ${JSON.stringify(preferences)}\nRecent posts to avoid repeating: ${JSON.stringify(recent)}`,`${slot.key}:v2`,"schedule");
  }
  await prepareDailyInstagram();
  // Reconcile accepted posts by reading their existing receipt, never by resending.
  const receipts=await sql`select a.id,a.payload,a.payload_hash from os_approvals a where a.status='approved' and a.created_at>now()-interval '7 days'
    and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_receipt')
    and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and (details->>'published'='true' or created_at>now()-interval '5 minutes')) order by a.created_at desc limit 2`;
  for(const row of receipts) {
    if(isBufferPublication(row.payload))await checkBufferPublication(row.id,row.payload_hash);
    else if(isInstagramPublication(row.payload))await checkInstagramPublication(row.id,row.payload_hash);
  }
  const candidates=await sql`select * from os_approvals where status='pending' and expires_at>now() and payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1') order by created_at limit 8`;
  let sent=0;
  for(const candidate of candidates) {
    const network=isBufferPublication(candidate.payload)?"x":isInstagramPublication(candidate.payload)?"instagram":null;
    if(!network || candidate.payload.channelId!==mediaAutopilot.channels[network] || !routineMediaAllowed(candidate.payload.text.replace("they don’t guarantee results.","")))continue;
    const hash=fingerprint(candidate.payload);
    const claimed=await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730922)`;
      const [active]=await tx`select paused from os_control where id=1 for share`;
      if(!active || active.paused)return false;
      const [row]=await tx`select * from os_approvals where id=${candidate.id} for update`;
      if(!row || row.status!=="pending" || new Date(row.expires_at).getTime()<=Date.now() || row.payload_hash!==hash || fingerprint(row.payload)!==hash)return false;
      const event=network==="x"?"buffer_publication_prepared":"instagram_publication_prepared";
      const [prepared]=await tx`select id from os_activity where entity_id=${row.id} and event=${event} and details->>'payloadHash'=${hash} limit 1`;
      if(!prepared)return false;
      const [unknown]=await tx`select a.id from os_approvals a where a.payload->>'channelId'=${row.payload.channelId}
        and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started')
        and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true') limit 1`;
      if(unknown)return false;
      const [spacing]=await tx`select id from os_activity where event='media_auto_authorized' and details->>'network'=${network} and created_at>now()-(${String(mediaAutopilot.minimumHours[network])} || ' hours')::interval limit 1`;
      if(spacing)return false;
      const [count]=await tx`select count(*)::int as n from os_activity where event='media_auto_authorized' and details->>'network'=${network} and (created_at at time zone 'America/New_York')::date=(now() at time zone 'America/New_York')::date`;
      if(count.n>=mediaAutopilot.daily[network])return false;
      await tx`update os_approvals set status='approved',decided_by='owner_policy',decided_at=now(),decision_note=${`Standing media authorization: ${mediaAutopilot.id}`} where id=${row.id}`;
      await tx`insert into os_activity(actor,event,entity_id,details) values('owner','media_auto_authorized',${row.id},${tx.json({policyId:mediaAutopilot.id,payloadHash:hash,network})})`;
      return true;
    });
    if(claimed) {
      const result=network==="x"?await executeBufferPublication(candidate.id,hash):await executeInstagramPublication(candidate.id,hash);
      sent++;
      // Publishing receipts appear in Posts and the daily briefing.
      void result;
    }
  }
  // Recover an interruption between the durable authorization and execution.
  const recovery=await sql`select a.id,a.payload,a.payload_hash from os_approvals a where status='approved' and decided_by='owner_policy' and expires_at>now()
    and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started') order by created_at limit 1`;
  for(const row of recovery){if(isBufferPublication(row.payload))await executeBufferPublication(row.id,row.payload_hash);else if(isInstagramPublication(row.payload))await executeInstagramPublication(row.id,row.payload_hash);}
  const [policyNotice]=await sql`select status from os_outbox where dedupe_key=${`media-policy:${mediaAutopilot.id}:0`} limit 1`;
  const [contentWork]=await sql`select status from os_jobs where request_key=${slot.key ? `${slot.key}:v2` : "no-slot"} limit 1`;
  const [researchWork]=await sql`select status from os_jobs where request_key='launch:competitor-visual-v3' limit 1`;
  const [deliveries]=await sql`select count(*)::int as n from os_approvals a where decided_by='owner_policy' and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true')`;
  return {status:"active",submitted:sent,slot:slot.key,contentStatus:contentWork?.status,researchStatus:researchWork?.status,noticeStatus:policyNotice?.status,confirmedPosts:deliveries.n};
}
