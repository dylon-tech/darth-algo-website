import { db } from "../affiliate-db";
import { mediaAutopilot } from "./media-policy";
export async function mediaDashboard(view:"today"|"queue") {
  const sql=db();
  const rows=await sql`select a.id,a.payload,a.status,a.expires_at,
    (select details from os_activity where entity_id=a.id::text and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked','buffer_publish_unknown') order by id desc limit 1) as delivery
    from os_approvals a where payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1')
    and (a.created_at>now()-interval '7 days') order by created_at desc limit 40`;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:mediaAutopilot.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const day=(value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:mediaAutopilot.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const selected=rows.filter(r=>view==='today' ? r.delivery?.published===true && r.delivery.sentAt && day(r.delivery.sentAt)===today : r.status==='approved' && !r.delivery?.published || r.status==='pending' && new Date(r.expires_at).getTime()>Date.now());
  const posts=selected.slice(0,6).map((r,i)=>{
    const network=r.payload.executor==='buffer_x_v1'?'X':'Instagram';
    const state=r.delivery?.published?'✅ Published':r.delivery?`⏳ ${r.delivery.state} · check Buffer`:'📋 Waiting for next available slot';
    const preview=r.payload.assets?.[0]?.url;
    return `${i+1}. ${network} · ${state}\n${String(r.payload.text).slice(0,360)}${preview?`\nImage: ${preview}`:''}${r.delivery?.postId?`\nBuffer receipt: ${r.delivery.postId}`:''}`;
  }).join('\n\n');
  const [control]=await sql`select paused from os_control where id=1`;
  const jobs=await sql`select count(*)::int as n from os_jobs where department='content' and status in ('queued','running')`;
  return `◆ ${view==='today'?"TODAY’S POSTS":"POSTING QUEUE"} · ${today}\n\n${control?.paused?'⏸ Paused':'🟢 Automatic posting on'}\nUp to 3 X + 1 Instagram daily. Times use New York time.\n\n${posts || (view==='today'?'No publication confirmed today yet.':'No ready post waiting.')}\n\nContent jobs in progress or waiting: ${jobs[0].n}${selected.length>6?`\nShowing 6 of ${selected.length}.`:''}\nOnly saved provider-confirmed deliveries appear as published. Unknown deliveries block new automatic posts on that account until checked.`;
}
export async function researchDashboard() {
  const [run]=await db()`select result->>'brief' as brief,finished_at from os_runs where department='research' and status='completed' order by finished_at desc limit 1`;
  const [source]=await db()`select details,created_at from os_activity where event='competitor_snapshot' order by id desc limit 1`;
  return `◆ RESEARCH DESK\n\n${source?`Latest public-source check: ${new Date(source.created_at).toISOString()}\nSources available: ${source.details.sources.filter((s:{status:string})=>s.status==='verified').length}/${source.details.sources.length}`:'Public-source check is waiting.'}\n\n${run?String(run.brief).slice(0,2200):'The first competitor analysis is waiting.'}\n\nFindings are shared with the whole team. Visible engagement is a signal, not proof of sales. Social posts behind a login may be unavailable.`;
}
