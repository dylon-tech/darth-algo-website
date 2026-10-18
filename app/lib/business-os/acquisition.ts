import {db} from '../affiliate-db';
import {acquisitionDailyLimit,acquisitionRetainedLimit, type AcquisitionLabels} from '../acquisition-policy';

export const acquisitionSchema=`
create table if not exists os_acquisition_coverage (
 id boolean primary key default true check(id), started_at timestamptz not null default now());
insert into os_acquisition_coverage(id) values(true) on conflict do nothing;
create table if not exists os_acquisition_visits (
 visit_id uuid not null, path text not null, source text not null, campaign text not null, content text not null,
 created_at timestamptz not null default now(), checkout_clicked_at timestamptz,
 primary key(visit_id,path,source,campaign,content));
create index if not exists os_acquisition_visits_created on os_acquisition_visits(created_at);
create table if not exists os_acquisition_caps (
 day date primary key, reached_at timestamptz not null default now());
`;
let schemaReady:Promise<void>|undefined;
export async function ensureAcquisitionSchema(){
  schemaReady??=db().begin(async sql=>{await sql`select pg_advisory_xact_lock(730960)`;await sql.unsafe(acquisitionSchema);}).then(()=>{}).catch(error=>{schemaReady=undefined;throw error;});
  return schemaReady;
}
export async function recordAcquisitionVisit(v:AcquisitionLabels & {visitId:string;path:string;action:'visit'|'checkout'}){
  await ensureAcquisitionSchema();
  return db().begin(async sql=>{
    await sql`select pg_advisory_xact_lock(730961)`;
    if(v.action==='checkout'){
      await sql`update os_acquisition_visits set checkout_clicked_at=coalesce(checkout_clicked_at,now()) where visit_id=${v.visitId}::uuid and path=${v.path} and source=${v.source} and campaign=${v.campaign} and content=${v.content} and created_at>now()-interval '1 day'`;
      return {recorded:true};
    }
    const existing=await sql`select 1 from os_acquisition_visits where visit_id=${v.visitId}::uuid and path=${v.path} and source=${v.source} and campaign=${v.campaign} and content=${v.content}`;
    if(existing.length)return {recorded:true};
    // Bounded storage. No IP, user agent, customer identity, referrer or raw URL.
    await sql`delete from os_acquisition_visits where created_at<now()-interval '30 days'`;
    await sql`delete from os_acquisition_caps where day<current_date-30`;
    const [n]=await sql`select count(*)::int retained,count(*) filter(where created_at>=date_trunc('day',now()))::int today from os_acquisition_visits`;
    if(n.retained>=acquisitionRetainedLimit||n.today>=acquisitionDailyLimit){
      await sql`insert into os_acquisition_caps(day) values(current_date) on conflict do nothing`;
      return {recorded:false,capacityReached:true};
    }
    await sql`insert into os_acquisition_visits(visit_id,path,source,campaign,content) values(${v.visitId},${v.path},${v.source},${v.campaign},${v.content}) on conflict do nothing`;
    return {recorded:true};
  });
}
export async function acquisitionSnapshot(){
  // Read-only preflight/snapshot: the first accepted public observation initializes storage.
  // Before activation, missing tables are unavailable, never historical zero traffic.
  const sql=db();
  const [coverage]=await sql`select started_at from os_acquisition_coverage where id=true`;
  const groups=await sql`select path,source,campaign,content,count(*)::int page_tab_visits,count(checkout_clicked_at)::int checkout_clicks,min(created_at) first_observed_at,max(created_at) last_observed_at from os_acquisition_visits where created_at>=now()-interval '30 days' group by path,source,campaign,content order by page_tab_visits desc,path limit 501`;
  const caps=await sql`select day,reached_at from os_acquisition_caps where day>=current_date-30 order by day`;
  return {trackingStartedAt:coverage.started_at,windowDays:30,groups:groups.slice(0,500),groupsTruncated:groups.length>500,capacityReachedDays:caps,dailyLimit:acquisitionDailyLimit,
    definitions:'Visits are deduplicated browser-tab/page/campaign observations, not unique people or verified qualified traffic. Checkout clicks are outbound link clicks, not Stripe sessions.',
    limitations:'No historical backfill. Untagged traffic stays unknown. Client labels are unverified and unregistered free-text campaigns are grouped together. Same-tab only; JavaScript, storage, blockers and capacity can undercount. Owner sessions, owner/admin paths and explicit test sessions are excluded. Signed-out owner traffic on another browser cannot be identified. No conversion rate or causation inferred.'};
}

// Reuse the existing authenticated owner-work schedule; no new timer or worker.
// Run only at the top of the UTC hour and never initialize an inactive collector.
export async function maintainAcquisitionRetention(now=new Date()){
  if(now.getUTCMinutes()!==0)return;
  const sql=db();const [state]=await sql`select to_regclass('public.os_acquisition_visits') as visits`;
  if(!state.visits)return;
  await sql`delete from os_acquisition_visits where created_at<now()-interval '30 days'`;
  await sql`delete from os_acquisition_caps where day<current_date-30`;
}
