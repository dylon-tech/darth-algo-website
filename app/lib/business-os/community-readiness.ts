import {db} from '../affiliate-db';
import {ensureCommunityEducationSchema} from '../community-education';
import {fingerprint} from './policy';
type Permissions={can_send_messages?:boolean;can_send_photos?:boolean};
type Member=Permissions&{status:string;is_member?:boolean;can_post_messages?:boolean};
export function canSendCommunityPhoto(chat:{type:string;permissions?:Permissions},member:Member){
 if(member.status==='creator')return true;
 if(member.status==='administrator')return chat.type==='channel'?member.can_post_messages===true:['group','supergroup'].includes(chat.type);
 if(member.status==='restricted')return member.is_member===true&&member.can_send_messages===true&&member.can_send_photos===true;
 return member.status==='member'&&['group','supergroup'].includes(chat.type)&&chat.permissions?.can_send_messages===true&&chat.permissions?.can_send_photos===true;
}
export async function communityReadiness(){
 await ensureCommunityEducationSchema();const sql=db();
 const rows=await sql`select key,value from community_settings where key in ('education_chat_id','education_thread_id')`;
 const settings=new Map(rows.map(r=>[String(r.key),String(r.value)])),chatId=settings.get('education_chat_id'),threadId=settings.get('education_thread_id'),token=process.env.TELEGRAM_BOT_TOKEN;
 if(!chatId||!threadId||!token||!/^\d+$/.test(threadId))return {ready:false,state:'connection_required',checkedAt:new Date().toISOString()};
 const key=fingerprint({chatId,threadId,token});
 const [saved]=await sql`select details from os_activity where event='community_destination_checked' and entity_id=${key} and created_at>now()-interval '15 minutes' order by id desc limit 1`;
 if(saved)return saved.details as {ready:boolean;state:string;checkedAt:string};
 async function read<T>(method:string,body:unknown):Promise<T>{
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)});
  const result=await response.json() as {ok:boolean;result:T};if(!response.ok||!result.ok)throw Error('COMMUNITY_CHECK_FAILED');return result.result;
 }
 let ready=false,state='check_failed';
 try{
  const [chat,bot]=await Promise.all([read<{type:string;permissions?:Permissions}>('getChat',{chat_id:chatId}),read<{id:number}>('getMe',{})]);
  const member=await read<Member>('getChatMember',{chat_id:chatId,user_id:bot.id});
  ready=canSendCommunityPhoto(chat,member);state=ready?'ready':'posting_permission_required';
 }catch{/* Do not expose provider text or credentials. A failed read sends nothing. */}
 const details={ready,state,checkedAt:new Date().toISOString()};
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations','community_destination_checked',${key},${sql.json(details)})`;
 return details;
}
