import {socialSchedule,campaignKey} from './social-schedule';
import {db} from '../affiliate-db';
import {bufferCooldown} from './buffer';
export async function socialHealthIssues(now=new Date()){
 const sql=db(),day=campaignKey(socialSchedule(now));
 const [status]=await sql`select details from os_activity where event='daily_social_status' and entity_id=${day} order by id desc limit 1`;
 const issues:string[]=[];
 if(status?.details.status==='creative_assets_required')issues.push('The next social slot needs a reviewed cinematic image. No old-template fallback will publish.');
 if(await bufferCooldown())issues.push('Buffer is rate-limiting requests. Publishing is waiting for its cooldown; no reconnection is needed.');
 for(const [network,label] of [['x','X'],['instagram','Instagram'],['threads','Threads']]){
  const state=status?.details.deliveries?.[network];
  if(state==='connection_required')issues.push(`Reconnect ${label} in Buffer.`);
  else if(['needs_check','assets_need_check'].includes(state))issues.push(`${label} post preparation needs checking.`);
 }
 if(status?.details.community && status.details.community!=='ready')issues.push('Community preview destination or photo permissions need checking.');
 const [uncertain]=await sql`select count(*)::int as n from os_approvals a where a.status='approved' and a.payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2')
 and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started' and created_at<now()-interval '15 minutes')
 and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true')`;
 if(Number(uncertain?.n))issues.push('Social delivery is unconfirmed. Check Buffer; posts will not be blindly resent.');
 const [community]=await sql`select event from os_activity where entity_id=${day} and event in ('community_social_started','community_social_sent','community_social_unknown') order by id desc limit 1`;
 if(community?.event==='community_social_unknown')issues.push('Check the community preview in Telegram; its delivery is uncertain.');
 return issues;
}
