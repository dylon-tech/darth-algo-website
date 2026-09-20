import { randomUUID } from "node:crypto";
import { db } from "../affiliate-db";
import type { Department } from "./policy";
import type { MenuButtons } from "./telegram-ui";

export const telegramPanelSchema=`
create table if not exists os_telegram_panels (
 owner_id bigint primary key, session_id uuid not null, department text not null default 'ceo',
 message_id bigint, revision bigint not null default 0, view text not null default 'home',
 active_job_id uuid, updated_at timestamptz not null default now()
);
alter table os_outbox add column if not exists panel_target jsonb;
`;
let ready:Promise<unknown>|undefined;
export async function ensureTelegramPanels() {
  if(!ready)ready=db().begin(async tx=>{await tx`select pg_advisory_xact_lock(730925)`;await tx.unsafe(telegramPanelSchema);}).catch(error=>{ready=undefined;throw error;});
  await ready;
}
export type PanelReply={owner:string;key:string;text:string;buttons:MenuButtons;department:Department;view:string;messageId?:number;newAgent?:boolean;jobId?:string;expectedSession?:string;expectedRevision?:number};
export async function queuePanelReply(input:PanelReply) {
  await ensureTelegramPanels();
  return db().begin(async tx=>{
    await tx`select pg_advisory_xact_lock(730926)`;
    const [duplicate]=await tx`select id from os_outbox where dedupe_key=${`panel:${input.key}`}`;
    if(duplicate)return;
    const [current]=await tx`select * from os_telegram_panels where owner_id=${input.owner} for update`;
    if(input.expectedSession && (!current || current.session_id!==input.expectedSession || Number(current.revision)!==input.expectedRevision || current.active_job_id!==input.jobId))return;
    const fresh=input.newAgent && current?.department!==input.department;
    const session=fresh || !current?randomUUID():current.session_id;
    const revision=Number(current?.revision || 0)+1;
    // Only an authenticated callback's bot message ID or a previously delivered
    // owner message may become the edit target. Never edit a user message.
    const messageId=fresh?null:input.messageId || current?.message_id || null;
    await tx`insert into os_telegram_panels(owner_id,session_id,department,message_id,revision,view,active_job_id)
      values(${input.owner},${session},${input.department},${messageId},${revision},${input.view},${input.jobId || null})
      on conflict(owner_id) do update set session_id=excluded.session_id,department=excluded.department,message_id=excluded.message_id,revision=excluded.revision,view=excluded.view,active_job_id=excluded.active_job_id,updated_at=now()`;
    await tx`insert into os_telegram_state(owner_id,department) values(${input.owner},${input.department}) on conflict(owner_id) do update set department=excluded.department`;
    await tx`insert into os_outbox(id,dedupe_key,body,buttons,panel_target) values(${randomUUID()},${`panel:${input.key}`},${input.text.slice(0,3500)},${tx.json(input.buttons)},${tx.json({owner:input.owner,session,revision})})`;
    // Fast repeated taps coalesce. Already-started sends are never replayed.
    await tx`update os_outbox set status='failed',error_code='PANEL_SUPERSEDED' where status='queued' and panel_target->>'owner'=${input.owner} and (panel_target->>'revision')::bigint<${revision}`;
  });
}

export async function syncTelegramDesk(){
 const {privateTelegramConfiguration,deliverOwnerNotices}=await import('./delivery');
 const config=privateTelegramConfiguration();if(!config.ready)return {status:'not_configured'};
 await ensureTelegramPanels();
 const sql=db();
 const [installed]=await sql`select id from os_activity where event='telegram_desk_v2_installed' limit 1`;
 if(!installed){
  // Retire only undelivered routine chatter. Decision records and unknown sends
  // retain their original state; no existing Telegram messages are deleted.
  await sql`update os_outbox set status='failed',error_code='REPLACED_BY_CEO_DIGEST' where status='queued' and panel_target is null and (dedupe_key like 'update:%' or dedupe_key like 'job-result:%' or dedupe_key like 'scheduled-check:%' or dedupe_key like 'media-submitted:%' or dedupe_key like 'daily-brief:%')`;
  const [panel]=await sql`select owner_id from os_telegram_panels where owner_id=${config.owner!}`;
  if(!panel){
   const [previous]=await sql`select provider_message_id from os_outbox where status='sent' and provider_message_id is not null and buttons is not null and (dedupe_key like 'update:%' or dedupe_key like 'job-result:%' or dedupe_key like 'media-policy:%') order by sent_at desc limit 1`;
   const {ceoScorecard}=await import('./ceo-scorecard');const {homeMenu}=await import('./telegram-ui');
   await queuePanelReply({owner:config.owner!,key:'ceo-desk-upgrade-v2',text:(await ceoScorecard()).body,buttons:homeMenu(),department:'ceo',view:'home',messageId:previous?Number(previous.provider_message_id):undefined});
  }
  await sql`insert into os_activity(actor,event,details) select 'operations','telegram_desk_v2_installed','{}'::jsonb where not exists(select 1 from os_activity where event='telegram_desk_v2_installed')`;
 }
 const {scheduledDailyBrief}=await import('./brief');await scheduledDailyBrief();
 const delivery=await deliverOwnerNotices(2);
 const [panel]=await sql`select view,message_id from os_telegram_panels where owner_id=${config.owner!}`;
 return {status:'ready',panelDelivered:Boolean(panel?.message_id),view:panel?.view,delivered:delivery.sent};
}
