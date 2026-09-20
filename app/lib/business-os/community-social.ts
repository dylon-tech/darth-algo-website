import {db} from '../affiliate-db';
import {ensureCommunityEducationSchema} from '../community-education';
import {dailySocialPolicy,isDailySocialPayload,socialPostUrl,type SocialNetwork} from './daily-social-policy';
export async function publishCommunityPreview(now=new Date()){
 if(process.env.VERCEL_ENV!=='production'||!dailySocialPolicy.enabled||process.env.AI_OS_AUTONOMY_ENABLED!=='true')return {posted:false,reason:'disabled'};
 const sql=db(),day=new Intl.DateTimeFormat('en-CA',{timeZone:dailySocialPolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const [control]=await sql`select paused from os_control where id=1`;if(!control||control.paused)return {posted:false,reason:'paused'};
 const [already]=await sql`select event from os_activity where entity_id=${day} and event in ('community_social_started','community_social_sent') limit 1`;
 if(already)return {posted:false,reason:'already_attempted'};
 const rows=await sql`select a.payload,r.details from os_approvals a join lateral(select details from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true' and details->>'externalLink' is not null order by id desc limit 1) r on true where a.payload->>'executor'='buffer_social_v2' and a.payload->'campaign'->>'day'=${day} and a.status='approved' and ((r.details->>'sentAt')::timestamptz at time zone 'America/New_York')::date=${day}::date`;
 const posts=rows.filter(r=>isDailySocialPayload(r.payload)&&socialPostUrl(r.details.externalLink,r.payload.network));
 posts.sort((a,b)=>['instagram','x','threads'].indexOf(a.payload.network)-['instagram','x','threads'].indexOf(b.payload.network));
 if(!posts.length)return {posted:false,reason:'waiting_for_confirmed_social_post'};
 await ensureCommunityEducationSchema();
 const settings=await sql`select key,value from community_settings where key in ('education_chat_id','education_thread_id')`;
 const values=new Map(settings.map(r=>[String(r.key),String(r.value)])),chatId=values.get('education_chat_id'),threadId=values.get('education_thread_id'),token=process.env.TELEGRAM_BOT_TOKEN;
 if(!chatId||!threadId||!token)return {posted:false,reason:'community_connection_required'};
 const post=posts[0],payload=post.payload,photo=payload.assets[0].url;
 const links=posts.map(r=>({text:`View on ${r.payload.network==='x'?'X':r.payload.network==='instagram'?'Instagram':'Threads'}`,url:socialPostUrl(r.details.externalLink,r.payload.network as SocialNetwork)!}));
 const caption=`DARTH ALGO · TODAY’S POST\n\n${payload.text}\n\nTap below for the full post.`;
 const claimed=await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730925)`;
  const [active]=await tx`select paused from os_control where id=1 for share`;if(!active||active.paused)return false;
  const [existing]=await tx`select id from os_activity where entity_id=${day} and event='community_social_started' limit 1`;if(existing)return false;
  await tx`insert into os_activity(actor,event,entity_id,details) values('content','community_social_started',${day},${tx.json({policyId:dailySocialPolicy.id,chatId,threadId,photo,links})})`;
  return true;
 });
 if(!claimed)return {posted:false,reason:'already_attempted'};
 try{
  const response=await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,message_thread_id:Number(threadId),photo,caption,reply_markup:{inline_keyboard:links.map(link=>[link])}}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const result=await response.json() as {ok?:boolean;result?:{message_id?:number}};
  if(!response.ok||!result.ok||!result.result?.message_id)throw Error('COMMUNITY_PREVIEW_UNCONFIRMED');
  await sql`insert into os_activity(actor,event,entity_id,details) values('content','community_social_sent',${day},${sql.json({messageId:result.result.message_id,links})})`;
  return {posted:true,messageId:result.result.message_id};
 }catch{
  try{await sql`insert into os_activity(actor,event,entity_id,details) values('operations','community_social_unknown',${day},'{"needsCheck":true}'::jsonb)`;}catch{/* Durable started event blocks another send. */}
  return {posted:false,reason:'delivery_uncertain_check_telegram'};
 }
}
