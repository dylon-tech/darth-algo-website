import {db} from "../affiliate-db";

/** Report provider-confirmed deliveries separately from prepared work and uncertain sends. */
export async function publishingQueueSnapshot() {
 const [row]=await db()`with latest as (
  select a.status,a.expires_at,r.event,r.details from os_approvals a
  left join lateral (select event,details from os_activity where entity_id=a.id::text
   and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked','buffer_publish_unknown') order by id desc limit 1) r on true
  where a.payload->>'executor' in ('buffer_x_v1','buffer_instagram_v1','buffer_social_v2') and a.created_at>now()-interval '7 days'
 ) select
 count(*) filter(where status in ('pending','approved') and expires_at>now() and event is null)::int as waiting,
 count(*) filter(where status='approved' and event in ('buffer_publish_started','buffer_publish_receipt','buffer_publish_checked') and coalesce(details->>'published','false')<>'true')::int as checking,
 count(*) filter(where status='approved' and event='buffer_publish_unknown')::int as attention from latest`;
 return {waiting:Number(row?.waiting||0),checking:Number(row?.checking||0),attention:Number(row?.attention||0)};
}
export function nextContentWindow(now=new Date()) {
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(now));
 return hour<9?'9 AM ET':'tomorrow at 9 AM ET';
}
