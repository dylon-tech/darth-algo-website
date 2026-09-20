import { db } from "../affiliate-db";
import { shortReply } from "./telegram-ui";
import {nextContentWindow} from "./publishing-scorecard";
import { mediaAutopilot } from "./media-policy";
export async function mediaDashboard(view:"today"|"queue") {
  const sql=db();
  const rows=await sql`select a.id,a.payload,a.status,a.expires_at,
    (select jsonb_build_object('event',event) || details from os_activity where entity_id=a.id::text and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked','buffer_publish_unknown') order by id desc limit 1) as delivery
    from os_approvals a where payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2')
    and (a.created_at>now()-interval '7 days') order by created_at desc limit 40`;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:mediaAutopilot.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const day=(value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:mediaAutopilot.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const selected=rows.filter(r=>view==='today' ? r.delivery?.published===true && r.delivery.sentAt && day(r.delivery.sentAt)===today : r.status==='approved' && !r.delivery?.published && (r.delivery || new Date(r.expires_at).getTime()>Date.now()) || r.status==='pending' && new Date(r.expires_at).getTime()>Date.now());
  const posts=selected.slice(0,4).map((r,i)=>{
    const network=r.payload.executor==='buffer_social_v2'?(r.payload.network==='x'?'X':r.payload.network==='threads'?'Threads':'Instagram'):r.payload.executor==='buffer_x_v1'?'X':'Instagram';
    const state=r.delivery?.published?'Published':r.delivery?.event==='buffer_publish_unknown'?'Delivery uncertain — check Buffer':r.delivery?'Checking delivery':'Waiting for next available slot';
    return `${i+1}. ${network} · ${state}\n${shortReply(String(r.payload.text).replace(/https?:\/\/\S+/g,''),120)}`;
  }).join('\n\n');
  return `${view==='today'?"TODAY’S POSTS":"UPCOMING POSTS"} · ${today}\n${selected.length} ${view==='today'?'confirmed published':'waiting or checking delivery'}\n\n${posts || (view==='today'?'No confirmed posts today yet.':'The queue is clear.')}\n\n${selected.length>4?'Showing the latest 4. ':''}One daily photo campaign is shared across X, Instagram and Threads.\nNext content window: ${nextContentWindow()}.`;
}
export async function researchDashboard() {
  const [run]=await db()`select result->>'brief' as brief,finished_at from os_runs where department='research' and status='completed' order by finished_at desc limit 1`;
  const [source]=await db()`select details,created_at from os_activity where event='competitor_snapshot' order by id desc limit 1`;
  return `COMPETITOR RESEARCH\n\n${run?shortReply(String(run.brief),360):'The first report is waiting.'}\n\n${source?`${source.details.sources.filter((s:{status:string})=>s.status==='verified').length}/${source.details.sources.length} public sources available.`:'Source check waiting.'} Findings are shared with the team.`;
}
