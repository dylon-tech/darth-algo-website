import {db} from '../affiliate-db';
import {bufferStatus,bufferGraphQL} from './buffer';
import {getSocialPost,socialPostMatches,type SocialPost} from './buffer-social';
import {isDailySocialPayload} from './daily-social-policy';

// Read-only provider diagnostics. No secret, customer data, source code, or
// arbitrary provider error text is logged. Never authorizes a retry.
export async function publishingDiagnostics(){
 const sql=db(),key='publishing-incident-20260923-v2';
 const [done]=await sql`select id from os_activity where event='publishing_diagnostic' and entity_id=${key} limit 1`;
 if(done)return;
 const rows=await sql`select a.id,a.payload,a.payload_hash,
  (select details from os_activity where entity_id=a.id::text and event='buffer_publish_receipt' order by id desc limit 1) as receipt,
  (select details from os_activity where entity_id=a.id::text and event='buffer_publish_checked' order by id desc limit 1) as checked
  from os_approvals a where a.payload->>'network'='threads'
  and exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_started')
  and not exists(select 1 from os_activity where entity_id=a.id::text and event='buffer_publish_checked' and details->>'published'='true') order by a.created_at limit 10`;
 const state=await bufferStatus();
 const reports=[];
 for(const row of rows){
  const payload=row.payload;
  const channel=state.channels.find(c=>c.id===payload.channelId);
  let posts:SocialPost[]=[];let more=false;let code:string|null=null;
  try{
   if(row.receipt?.postId)posts=[await getSocialPost(row.receipt.postId)];
   else if(channel?.organizationId){
    const r=await bufferGraphQL<{posts:{edges:Array<{node:SocialPost}>,pageInfo:{hasNextPage:boolean}}}>(`query RecoveryPosts($input:PostsInput!){posts(first:100,input:$input){edges{node{id text channelId status sentAt externalLink assets{source type ... on ImageAsset{image{altText}}}}}pageInfo{hasNextPage}}}`,{input:{organizationId:channel.organizationId,filter:{channelIds:[channel.id]}}});
    posts=r.posts.edges.map(e=>e.node);more=r.posts.pageInfo.hasNextPage;
   }
  }catch(e){code=e instanceof Error&&/^BUFFER_[A-Z0-9_]+$/.test(e.message)?e.message:'PROVIDER_READ_FAILED';}
  reports.push({approvalId:row.id,day:payload.campaign?.day,slot:payload.campaign?.slot,receipt:row.receipt||null,checked:row.checked||null,code,more,
   posts:posts.map(p=>({id:p.id,status:p.status,sentAt:p.sentAt,externalLink:p.externalLink,textMatches:p.text===payload.text,assetsMatch:isDailySocialPayload(payload)&&socialPostMatches(p,payload),expectedText:String(payload.text||'').slice(0,300),actualText:p.text?.slice(0,400),expectedAssets:payload.assets?.map((a:{url:string;altText:string})=>({url:a.url,altText:a.altText?.slice(0,160)})),actualAssets:p.assets.map(a=>({url:a.source,altText:a.image?.altText?.slice(0,160)}))}))});
 }
 const whop=await sql`select entity_id,event,details from os_activity where event in ('whop_home_publish_unknown','whop_home_publish_receipt') and created_at>='2026-09-23T04:00:00Z' order by id limit 10`;
 const details={reports,whop};
 await sql`insert into os_activity(actor,event,entity_id,details) values('operations','publishing_diagnostic',${key},${sql.json(details)})`;
 console.info(JSON.stringify({event:'publishing_diagnostic',...details}));
}
