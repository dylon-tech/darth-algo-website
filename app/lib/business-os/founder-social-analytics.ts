import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {vidiqAccessToken,vidiqResource,vidiqStatus} from './vidiq-connection';

type ObjectValue=Record<string,unknown>;
type Platform='INSTAGRAM'|'TIKTOK'|'YOUTUBE'|'THREADS';
type ToolName='social_account_list'|'instagram_owner_insights'|'social_post_list';
type Tool={name:string;description?:string;inputSchema:ObjectValue;annotations?:{readOnlyHint?:boolean}};
type Account={platform:Platform;id:string;name:string;username:string|null;scopes:string[]};
export type SocialReel={id:string;caption:string;url:string;publishedAt:string|null;views:number|null;likes:number|null;comments:number|null;saves:number|null;shares:number|null;averageWatchSeconds:number|null;averageWatchedPercent:number|null;skipPercent:number|null};
export type SocialReceipt={id:string;postId:string;platform:Platform;account:string;status:string;title:string;scheduledAt:string|null;completedAt:string|null;url:string|null;issue:string|null};
export type FounderSocialAnalytics={
 checkedAt:string;window:{from:string;to:string};
 connection:{status:'connected'|'not_connected'|'reconnect_required'|'unavailable';message:string};
 instagram:{status:'available'|'unavailable';handle:string|null;followers:number|null;reels:SocialReel[];partial:boolean;message:string;source:string};
 publishing:{status:'available'|'unavailable';rows:SocialReceipt[];counts:{delivered:number;scheduled:number;draft:number;failed:number;checking:number}|null;partial:boolean;message:string;source:string};
 unavailable:Array<{platform:string;message:string}>;
};
const object=(v:unknown):v is ObjectValue=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=160)=>typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max):'';
const id=(v:unknown):v is string=>typeof v==='string'&&/^[\w-]{1,200}$/.test(v);
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
const metric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const time=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const handles:Partial<Record<Platform,string>>={INSTAGRAM:'darth.algo',TIKTOK:'darth.algo',YOUTUBE:'darthalgotools',THREADS:'darth.algo'};
const platforms:Platform[]=['INSTAGRAM','TIKTOK','YOUTUBE','THREADS'];
function unavailable(now:Date):FounderSocialAnalytics {
 return {checkedAt:now.toISOString(),window:{from:new Date(now.getTime()-30*86400000).toISOString(),to:new Date(now.getTime()+6*86400000).toISOString()},
  connection:{status:'unavailable',message:'The website analytics connection could not be verified.'},
  instagram:{status:'unavailable',handle:null,followers:null,reels:[],partial:false,message:'Instagram owner insights are unavailable.',source:'vidIQ · Instagram owner insights'},
  publishing:{status:'unavailable',rows:[],counts:null,partial:false,message:'Provider delivery records are unavailable.',source:'vidIQ · social post records'},
  unavailable:[{platform:'TikTok',message:'Performance is unavailable here. The current vidIQ performance lookup requires credits; delivery receipts are separate.'},{platform:'YouTube',message:'Performance is unavailable here. Detailed YouTube analytics requires credits; delivery receipts are separate.'},{platform:'Threads',message:'No website performance reader is connected. Native and Metricool posts are outside the vidIQ receipt feed.'}],
 };
}
function unwrap(value:unknown):ObjectValue {
 if(!object(value)||value.isError)throw Error('SOCIAL_PROVIDER_INVALID');
 if(object(value.structuredContent)){if(JSON.stringify(value.structuredContent).length>300000)throw Error('SOCIAL_RESPONSE_TOO_LARGE');return value.structuredContent;}
 if(Array.isArray(value.content))for(const block of value.content.slice(0,10))if(object(block)&&block.type==='text'&&typeof block.text==='string'&&block.text.length<=300000){try{const parsed:unknown=JSON.parse(block.text);if(object(parsed))return parsed;}catch{/* No raw provider text leaves this module. */}}
 throw Error('SOCIAL_PROVIDER_INVALID');
}
function schemaType(value:unknown,type:string):boolean {
 if(!object(value))return false;if(value.type===type||(type==='number'&&value.type==='integer'))return true;
 return Array.isArray(value.anyOf)&&value.anyOf.length>0&&value.anyOf.every(v=>schemaType(v,type));
}
// Only these documented free read tools can be called. A price/schema change
// disables that reader; neither the paid research worker nor publisher is used.
export function analyticsToolSupported(name:ToolName,tool:Tool){
 const s=tool.inputSchema,required=name==='instagram_owner_insights'?['platformAccountId']:[];
 if(tool.annotations?.readOnlyHint===false||!/\bcost:\s*0\s+credit(?:\(s\)|s)?\s+per call\b/i.test(tool.description||'')||s.type!=='object'||!object(s.properties))return false;
 const actual=s.required===undefined?[]:s.required;if(!Array.isArray(actual)||actual.length!==required.length||actual.some(v=>!required.includes(String(v))))return false;
 const fields:Record<ToolName,Record<string,string>>={social_account_list:{},instagram_owner_insights:{platformAccountId:'string',mode:'string',since:'string',until:'string',limit:'number'},social_post_list:{from:'string',to:'string',limit:'number',platformAccountIds:'array'}};
 if(!Object.entries(fields[name]).every(([key,type])=>schemaType((s.properties as ObjectValue)[key],type)))return false;
 if(name==='instagram_owner_insights'){const mode=s.properties.mode as ObjectValue;if(Array.isArray(mode.enum)&&!mode.enum.includes('reels'))return false;}
 if(name==='social_post_list'&&!schemaType((s.properties.platformAccountIds as ObjectValue).items,'string'))return false;
 return true;
}
export function analyticsPostUrl(value:unknown,platform:Platform){
 if(typeof value!=='string'||value.length>500||/[\x00-\x20\\]/.test(value))return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;u.hash='';
  const domain=u.hostname.replace(/^www\./,'');
  if(platform==='INSTAGRAM'&&domain==='instagram.com'&&/^\/(p|reel)\/[\w-]+\/?$/.test(u.pathname)){u.search='';return u.href;}
  if(platform==='TIKTOK'&&domain==='tiktok.com'&&/^\/@[\w.-]+\/video\/\d+\/?$/.test(u.pathname)){u.search='';return u.href;}
  if(platform==='THREADS'&&['threads.com','threads.net'].includes(domain)&&/^\/@[\w.-]+\/post\/[\w-]+\/?$/.test(u.pathname)){u.search='';return u.href;}
  if(platform==='YOUTUBE'&&domain==='youtube.com'){const video=u.searchParams.get('v');if(u.pathname==='/watch'&&video&&/^[\w-]{11}$/.test(video)){u.search='?v='+video;return u.href;}if(/^\/shorts\/[\w-]{11}\/?$/.test(u.pathname)){u.search='';return u.href;}}
 }catch{}
 return null;
}
function accountsFrom(value:ObjectValue){
 if(!Array.isArray(value.accounts)||value.accounts.length>100||value.accounts.some(a=>!object(a)))throw Error('SOCIAL_ACCOUNTS_INVALID');
 if(value.partial!==undefined&&(!Array.isArray(value.partial)||value.partial.some(p=>typeof p!=='string')))throw Error('SOCIAL_ACCOUNTS_INVALID');
 const partial=Array.isArray(value.partial)?value.partial:[];
 const accounts:Account[]=[];
 for(const platform of platforms){
  if(partial.includes(platform))continue;
  const matches=value.accounts.filter((a):a is ObjectValue=>object(a)&&a.platform===platform&&a.connectionActive===true&&id(a.platformAccountId)&&['oauth','youtube'].includes(String(a.source))&&typeof a.username==='string'&&a.username.replace(/^@/,'').toLowerCase()===handles[platform]);
  // A display name alone cannot identify a brand's account. A missing TikTok
  // username therefore remains unavailable rather than selecting another brand.
  if(matches.length!==1)continue;const a=matches[0];
  accounts.push({platform,id:String(a.platformAccountId),name:text(a.displayName)||platform,username:text(a.username)||null,scopes:Array.isArray(a.scopes)?a.scopes.filter((s):s is string=>typeof s==='string'):[]});
 }
 return {accounts,partial:partial.length>0};
}
export function instagramAnalytics(value:ObjectValue,account:{id:string;username:string|null}):FounderSocialAnalytics['instagram'] {
 const out=unavailable(new Date()).instagram;
 if(value.status!=='available'||value.accessLevel!=='owner'||value.dataSource!=='instagram_owner_insights'||value.platformAccountId!==account.id||typeof value.handle!=='string'||value.handle.replace(/^@/,'').toLowerCase()!=='darth.algo'||!Array.isArray(value.reels))return {...out,message:value.reason==='owner_token_inactive'?'Instagram insights permission expired. Reconnect the same account in Connections.':'Instagram owner insights did not return verified data.'};
 const reels:SocialReel[]=[],seen=new Set<string>();let partial=value.isTruncated===true||value.reels.length>20;
 for(const row of value.reels.slice(0,20)){
  if(!object(row)||!id(row.igId)||typeof row.userPosted!=='string'||row.userPosted.replace(/^@/,'').toLowerCase()!=='darth.algo'){partial=true;continue;}
  const url=analyticsPostUrl(row.permalink,'INSTAGRAM');if(!url||seen.has(row.igId)){partial=true;continue;}seen.add(row.igId);
  reels.push({id:row.igId,caption:text(row.caption,160),url,publishedAt:time(row.timestamp),views:count(row.playCount),likes:count(row.likeCount),comments:count(row.commentCount),saves:count(row.saves),shares:count(row.shares),averageWatchSeconds:metric(row.avgWatchTimeMs)===null?null:Number(row.avgWatchTimeMs)/1000,averageWatchedPercent:metric(row.avgWatchedPct),skipPercent:metric(row.skipRate)!==null&&Number(row.skipRate)<=100?Number(row.skipRate):null});
 }
 if(value.reels.length&&!reels.length)return {...out,message:'Instagram returned records that could not be verified.'};
 return {...out,status:'available',handle:value.handle,followers:count(value.followersCount),reels,partial,message:'Up to 20 Reels published in the last 30 days. Post metrics are lifetime totals, may lag, and are not sales. Missing values stay unavailable.'};
}
export function publicationAnalytics(value:ObjectValue,accounts:Account[],window:FounderSocialAnalytics['window']):FounderSocialAnalytics['publishing'] {
 const out=unavailable(new Date()).publishing;
 if(!Array.isArray(value.destinations)||value.destinations.length>200||!object(value.window)||value.window.from!==window.from||value.window.to!==window.to)return {...out,message:'The provider receipt window could not be verified.'};
 const statuses=['draft','scheduled','submitted','inProgress','completed','failed','cancelled','reconciliationRequired'];
 const rows:SocialReceipt[]=[],seen=new Set<string>();let partial=value.nextCursor!=null;
 for(const d of value.destinations){
  if(!object(d)){partial=true;continue;}const account=accounts.find(a=>a.id===d.platformAccountId&&a.platform===d.platform);
  if(!account||!id(d.publicationId)||!id(d.postId)||!statuses.includes(String(d.status))||seen.has(String(d.publicationId))||(d.status==='scheduled'&&!time(d.scheduledFor))){partial=true;continue;}seen.add(d.publicationId as string);
  const issues:Record<string,string>={rejected:'The platform rejected this post.',reconnectRequired:'Reconnect this account.',limitReached:'The provider limit was reached.',retriesExhausted:'Provider retries ended. Reconcile before retrying.',unsupported:'This destination is unsupported.'};
  rows.push({id:d.publicationId as string,postId:d.postId as string,platform:account.platform,account:account.username||account.name,status:String(d.status),title:text(d.text,120)||'Post text unavailable',scheduledAt:time(d.scheduledFor),completedAt:time(d.completedAt),url:analyticsPostUrl(d.postUrl,account.platform),issue:issues[String(d.failureCode)]||(d.status==='failed'?'The provider reported a failed delivery.':d.status==='reconciliationRequired'?'Check the existing post before any retry.':null)});
 }
 if(value.destinations.length&&!rows.length)return {...out,message:'The returned receipts could not be matched to verified business accounts.'};
 const counts={delivered:0,scheduled:0,draft:0,failed:0,checking:0};
 for(const row of rows){if(row.status==='completed')counts.delivered++;else if(row.status==='scheduled')counts.scheduled++;else if(row.status==='draft')counts.draft++;else if(row.status==='failed')counts.failed++;else if(['submitted','inProgress','reconciliationRequired'].includes(row.status))counts.checking++;}
 return {...out,status:'available',rows,counts,partial,source:'vidIQ · social post records · '+accounts.map(a=>a.platform).join(', '),message:'One bounded page of vidIQ posts for these verified business accounts: last 30 days and next six days. Undated drafts and posts sent through other providers are excluded. Delivered does not prove public visibility; only scheduled rows are scheduled.'};
}
let running:Promise<FounderSocialAnalytics>|null=null;
export function founderSocialAnalytics(){
 // Coalesce concurrent page reads without retaining private results after the
 // request. A later disconnect is checked anew; no stale credential is cached.
 if(running)return running;const request=readAnalytics().finally(()=>{if(running===request)running=null;});running=request;return request;
}
async function readAnalytics(now=new Date()):Promise<FounderSocialAnalytics> {
 const out=unavailable(now);let client:Client|undefined;
 try{
  const connection=await vidiqStatus();if(!connection.connected){out.connection={status:'not_connected',message:'Connect vidIQ once in website Connections. The ChatGPT connection is separate.'};return out;}
  const token=await vidiqAccessToken(),deadline=AbortSignal.timeout(28000);
  client=new Client({name:'darth-algo-owner-social-analytics',version:'1.0.0'});
  const transport=new StreamableHTTPClientTransport(new URL(vidiqResource),{reconnectionOptions:{maxRetries:0,maxReconnectionDelay:0,initialReconnectionDelay:0,reconnectionDelayGrowFactor:1},requestInit:{headers:{Authorization:`Bearer ${token}`},redirect:'error'},fetch:(input,init)=>fetch(input,{...init,redirect:'error',cache:'no-store',signal:init?.signal?AbortSignal.any([init.signal,deadline]):deadline})});
  await client.connect(transport,{timeout:6000});
  const discovered=await client.listTools({},{timeout:6000});let cursor=discovered.nextCursor;
  for(let page=1;cursor&&page<3;page++){const next=await client.listTools({cursor},{timeout:6000});discovered.tools.push(...next.tools);cursor=next.nextCursor;}
  if(cursor)throw Error('SOCIAL_DISCOVERY_INCOMPLETE');
  const available=new Map<ToolName,Tool>();
  for(const name of ['social_account_list','instagram_owner_insights','social_post_list'] as const){const matches=discovered.tools.filter(t=>t.name===name||t.name==='vidiq_'+name);if(matches.length===1&&analyticsToolSupported(name,matches[0] as Tool))available.set(name,matches[0] as Tool);}
  const call=async(name:ToolName,args:ObjectValue)=>{const tool=available.get(name);if(!tool)throw Error('SOCIAL_FREE_READER_UNAVAILABLE');return unwrap(await client!.callTool({name:tool.name,arguments:args},undefined,{timeout:8000}));};
  const {accounts,partial}=accountsFrom(await call('social_account_list',{}));
  out.connection={status:'connected',message:partial?'The connection responded, but some account lookups were unavailable.':'Read-only website connection verified. No publishing settings were changed.'};
  const instagram=accounts.find(a=>a.platform==='INSTAGRAM');
  const reads:Promise<void>[]=[];
  if(instagram&&instagram.scopes.includes('instagram_business_manage_insights')&&available.has('instagram_owner_insights'))reads.push(call('instagram_owner_insights',{platformAccountId:instagram.id,mode:'reels',since:out.window.from.slice(0,10),until:now.toISOString().slice(0,10),limit:20}).then(value=>{out.instagram=instagramAnalytics(value,instagram);}).catch(()=>{}));
  else out.instagram.message=instagram?'Instagram insights permission or the verified free reader is unavailable.':'The website connection did not identify one active @darth.algo Instagram account.';
  if(accounts.length&&available.has('social_post_list'))reads.push(call('social_post_list',{platformAccountIds:accounts.map(a=>a.id),from:out.window.from,to:out.window.to,limit:25}).then(value=>{out.publishing=publicationAnalytics(value,accounts,out.window);if(partial)out.publishing.partial=true;}).catch(()=>{}));
  else out.publishing.message='A verified business account and the free receipt reader are required.';
  await Promise.allSettled(reads);return out;
 }catch(error){
  const reason=error instanceof Error?error.message:'';
  if(reason==='VIDIQ_NOT_CONNECTED')out.connection={status:'not_connected',message:'Connect vidIQ once in website Connections. The ChatGPT connection is separate.'};
  else if(reason==='VIDIQ_RECONNECT_REQUIRED')out.connection={status:'reconnect_required',message:'The saved website connection expired. Reconnect vidIQ in Connections.'};
  return out;
 }finally{await client?.close().catch(()=>{});}
}
