import {db} from '../affiliate-db';
import {liveOverview} from './live-overview';
import {companyFinances} from './company-finances';
import {agentHealth,systemHealth,type Issue} from './ceo-home-model';
import {socialCampaignQueue} from './social-campaign-queue';
import {reviewedCreativeFor} from './reviewed-social';
import {socialSchedule,campaignKey} from './social-schedule';
import {whopPermissionState} from './whop-permissions';
import {serviceView} from './desk-state';

export async function ceoHome(){
 const sql=db(),partial:string[]=[],now=Date.now();
 async function optional<T>(name:string,read:()=>Promise<T>,fallback:T){try{return await read();}catch{partial.push(name);return fallback;}}
 const [desk,finances,blocked,captures,whop,suggestions,prepared,briefs,welcome,uncertain]=await Promise.all([
  optional('agents',liveOverview,null),optional('finances',companyFinances,null),
  optional('tasks',async()=>Array.from(await sql`select department,id,title from os_tasks where status='blocked' order by updated_at desc limit 25`),[]),
  optional('captures',async()=>Array.from(await sql`select blocked_reason from os_indicator_capture_control where id=1`),[]),
  optional('whop',whopPermissionState,null),
  optional('suggestions',async()=>Array.from(await sql`select a.id,a.payload,a.payload_hash,a.status,a.expires_at,a.created_at,j.status as job_status,j.error_code,left(r.result->>'brief',6000) as result from os_approvals a left join os_jobs j on j.request_key='suggestion:'||a.id::text left join os_runs r on r.id=j.run_id where a.payload->>'executor'='internal_work_v1' and (a.created_at>now()-interval '7 days' or j.status in ('queued','running')) order by a.created_at desc limit 8`),[]),
  optional('queue',async()=>Array.from(await sql`select distinct on(entity_id) entity_id,event,details,created_at from os_activity where event='daily_social_ready' and created_at>now()-interval '4 days' order by entity_id,id desc limit 12`),[]),
  optional('briefings',async()=>Array.from(await sql`select day,body,created_at from os_briefs order by day desc limit 1`),[]),
  optional('welcome',async()=>await (await import('../welcome/service')).welcomeBrief(),''),
  optional('uncertain jobs',async()=>Array.from(await sql`select id,department,error_code from os_jobs where status='unknown' order by created_at desc limit 50`),[]),
 ]);
 const issues:Issue[]=[];
 for(const job of uncertain)issues.push({id:'unknown-'+job.id,department:String(job.department),title:'An earlier request has an uncertain outcome',reason:String(job.error_code||'Outcome needs reconciliation').replaceAll('_',' '),action:'Operations must inspect the saved run before any retry. Fix agents preserves this hold.',href:'#team',needsOwner:false});
 for(const t of blocked)issues.push({id:String(t.id),department:String(t.department),title:String(t.title),reason:'This saved assignment is blocked.',action:'Fix agents will inspect dependencies and retry eligible internal work.',href:'#team',needsOwner:false});
 if(whop?.blocked)issues.push({id:'whop',department:'content',title:'Whop posting permission',reason:'Whop rejected posting because its key lacks forum:post:create.',action:'Update the Whop key permissions and confirm in Connections.',href:'/owner/connections',needsOwner:true});
 if(desk){
  for(const service of desk.services){
   const blockedFields=['privateTesting','publishing','socialDiscovery'].map(k=>service.details[k]).filter(v=>typeof v==='string'&&/blocked|not_connected|waiting_for_credits|connection_required/.test(v));
   const view=blockedFields.length?{tone:'warn',label:'Needs attention',detail:blockedFields.join(' · ')}:serviceView(service,now);
   // Indicator jobs report every five minutes; use their actual cadence.
   const age=now-Date.parse(service.observedAt);
   if(age>10*60000||age< -30000){issues.push({id:'service-'+service.id,department:service.id==='indicators'?'indicator_builder':service.id==='social'?'content':'operations',title:`${service.id} status needs a check`,reason:'This workflow has no fresh observation.',action:'Fix agents will request a new operating check.',href:'#team',needsOwner:false});continue;}
   if(view.tone==='warn'&&view.label!=='Stale update')issues.push({id:'service-'+service.id,department:service.id==='indicators'?'indicator_builder':service.id==='social'?'content':service.id==='research'?'research':'operations',title:`${service.id} workflow needs attention`,reason:view.detail,action:service.id==='indicators'?'Open Indicator Lab to see the exact testing or sign-in requirement.':'Open the relevant connection or request recovery.',href:service.id==='indicators'?'/owner/indicators':'/owner/connections',needsOwner:/login|connection|required|credentials|credits|allowance/.test(view.detail)});
  }
  if(!desk.telemetryAvailable)partial.push('workflow observations');
  for(const a of desk.agents)if(a.latest?.status==='failed')issues.push({id:'run-'+a.latest.id,department:a.id,title:`${a.name} could not finish`,reason:a.latest.errorCode?.replaceAll('_',' ')||'The latest internal run failed.',action:'Fix agents can retry a confirmed failed internal request once. Uncertain outcomes stay held.',href:'#team',needsOwner:false});
 }
 if(/blocked|not available|not activated|draft|unverified|unavailable|not connected|paused/i.test(welcome))issues.push({id:'welcome',department:'growth',title:'Welcome messages need attention',reason:welcome.slice(0,500),action:'Review the saved Welcome setup and its required test.',href:'/owner/welcome',needsOwner:true});
 const capture=String(captures[0]?.blocked_reason||'');
 if(/TRADINGVIEW_LOGIN_REQUIRED/.test(capture)&&!issues.some(i=>i.id==='tradingview-login'))issues.push({id:'tradingview-login',department:'indicator_builder',title:'TradingView sign-in needed',reason:'The chart capture worker cannot use the saved TradingView session.',action:'Reconnect TradingView in the browser connection screen. Human verification must be completed by you.',href:'/owner/browser',needsOwner:true});
 const team=desk?.agents.map(a=>({...a,health:agentHealth(a,desk,issues,now)}))||[];
 const current=socialSchedule();
 const queue=socialCampaignQueue.filter(c=>c.day>current.day||(c.day===current.day&&(current.slot==='morning'||c.slot==='afternoon'))).sort((a,b)=>a.day.localeCompare(b.day)||(a.slot===b.slot?0:a.slot==='morning'?-1:1)).slice(0,6).map(c=>{
  let valid=true;try{reviewedCreativeFor(c.day,c.slot);}catch{valid=false;}
  const saved=prepared.find(r=>r.entity_id===campaignKey(c));
  const matched=saved?.details?.contentId===c.id&&saved?.details?.reviewHash===c.review.sha256;
  return {id:c.id,day:c.day,slot:c.slot,text:c.text,kind:c.editorial?.kind||'promotional',image:c.assets[0]?.path||null,state:!valid?'Needs review':matched?'Prepared for publishing':saved?'Saved version needs reconciliation':'Reviewed · awaiting preparation'};
 });
 return {checkedAt:new Date().toISOString(),partial,desk,finances,team,issues,health:systemHealth(team.map(a=>a.health),desk,issues,partial),queue,brief:briefs[0]||null,
  suggestions:suggestions.map(s=>({id:String(s.id),hash:String(s.payload_hash),title:String(s.payload.summary),deliverable:String(s.payload.details),department:String(s.payload.department),sourceBrief:String(s.payload.sourceBrief||''),createdAt:String(s.created_at),state:s.job_status||((s.status==='pending'&&new Date(s.expires_at).getTime()<now)?'expired':s.status),result:s.result as string|null,error:s.error_code as string|null}))};
}
export type CeoHome=Awaited<ReturnType<typeof ceoHome>>;
