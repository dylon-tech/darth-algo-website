import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {vidiqAccessToken,vidiqResource} from './vidiq-connection';
import {validateFounderVideoSettings,type FounderVideoSettings} from './founder-video-publication-policy';
import {videoDraftRequest} from './founder-video-protocol';

// Reviewed contract source: https://github.com/vid-io/vidiq-mcp/tree/d4b0e3780f1b976241b0e9766e6ca140a75abc67/skills/vidiq-publishing
// No real call happens merely by importing this module. Every session is OFF unless
// production is explicitly enabled. Writes also require operator-reviewed schema
// hashes AND the exact manifest persisted with the owner's approved workflow.
export type FounderVideoManifest=Record<string,string>;
type ObjectValue=Record<string,unknown>;
type Tool={name:string;inputSchema:ObjectValue;description?:string;annotations?:{readOnlyHint?:boolean}};
export type FounderVideoAccount={platform:'YOUTUBE'|'TIKTOK'|'INSTAGRAM';platformAccountId:string;displayName:string;canPublish:true;publishingAvailable:boolean|null};
export type FounderInstagramArgs={platformAccountId:string;videoUrl:string;caption:string;isAiGenerated:boolean;trialParams?:{graduationStrategy:'MANUAL'|'SS_PERFORMANCE'}}|{platformAccountId:string;containerId:string}|{platformAccountId:string;mcpJobId:string};
const names=['social_account_list','video_upload','social_post_draft_create','social_post_draft_get','social_post_publish','social_post_status','instagram_publish_reel','job_poll'] as const;
type ToolName=typeof names[number];
const required:Record<ToolName,string[]>={social_account_list:[],video_upload:[],social_post_draft_create:['destinations'],social_post_draft_get:['postId'],social_post_publish:['postId','revision'],social_post_status:['postId'],instagram_publish_reel:['platformAccountId'],job_poll:['mcpJobId']};
const properties:Record<ToolName,Record<string,string>>={
 social_account_list:{canPublishOnly:'boolean',platform:'string'},video_upload:{url:'string',uploadId:'string',title:'string'},
 social_post_draft_create:{text:'string',media:'array',destinations:'array'},social_post_draft_get:{postId:'string'},social_post_publish:{postId:'string',revision:'string',publicationIds:'array'},social_post_status:{postId:'string'},
 instagram_publish_reel:{platformAccountId:'string',videoUrl:'string',caption:'string',isAiGenerated:'boolean',trialParams:'object',containerId:'string',mcpJobId:'string'},job_poll:{mcpJobId:'string'}
};
const object=(v:unknown):v is ObjectValue=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identifier=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\s\x00-\x1f\x7f]/.test(v);
const clean=(v:unknown)=>typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,'').slice(0,160):'';
function stable(v:unknown):unknown{return Array.isArray(v)?v.map(stable):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;}
export const founderVideoSchemaHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export const founderVideoMcpEnabled=()=>process.env.VERCEL_ENV==='production'&&process.env.FOUNDER_VIDEO_PUBLISHING_ENABLED==='true';
function error(code:string):never{throw Error('VIDEO_MCP_'+code);}
function validSchema(name:ToolName,s:ObjectValue){
 if(s.type!=='object'||!object(s.properties))return false;
 const actual=s.required===undefined?[]:s.required;if(!Array.isArray(actual)||actual.length!==required[name].length||actual.some(k=>typeof k!=='string'||!required[name].includes(k)))return false;
 return Object.entries(properties[name]).every(([key,type])=>object((s.properties as ObjectValue)[key])&&((s.properties as ObjectValue)[key] as ObjectValue).type===type);
}
const free=(description:string|undefined)=>/\bcost:\s*0\s+credit(?:\(s\)|s)?(?:\s|[.;]|$)/i.test(description||'');
function freePublish(description:string|undefined){return /other platforms are free/i.test(description||'')&&/per X post/i.test(description||'');}
function unwrapped(value:unknown):ObjectValue{
 if(!object(value)||value.isError)error('PROVIDER_RESPONSE_INVALID');
 if(object(value.structuredContent))return value.structuredContent;
 if(Array.isArray(value.content))for(const block of value.content){if(object(block)&&block.type==='text'&&typeof block.text==='string'&&block.text.length<=200_000)try{const parsed:unknown=JSON.parse(block.text);if(object(parsed))return parsed;}catch{/* Try another text block without exposing provider text. */}}
 error('PROVIDER_RESPONSE_INVALID');
}
function approvedSchemas():FounderVideoManifest{
 try{const value:unknown=JSON.parse(process.env.FOUNDER_VIDEO_MCP_SCHEMA_SHA256||'{}');if(!object(value))return {};return Object.fromEntries(Object.entries(value).filter(([key,v])=>names.some(n=>'vidiq_'+n===key)&&typeof v==='string'&&/^[a-f0-9]{64}$/.test(v))) as FounderVideoManifest;}catch{return {};}
}
function publicHttps(url:string){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.port&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname);}catch{return false;}}
export type FounderVideoMcp={
 manifest():FounderVideoManifest;
 assertWriteReady():void;
 verifyAccounts(settings:FounderVideoSettings):Promise<FounderVideoAccount[]>;
 importVideo(url:string,title:string):Promise<ObjectValue>;
 uploadStatus(uploadId:string):Promise<ObjectValue>;
 createDraft(request:ReturnType<typeof videoDraftRequest>):Promise<ObjectValue>;
 getDraft(postId:string):Promise<ObjectValue>;
 publish(postId:string,revision:string,publicationIds:string[]):Promise<ObjectValue>;
 postStatus(postId:string):Promise<ObjectValue>;
 instagram(args:FounderInstagramArgs):Promise<ObjectValue>;
 jobStatus(mcpJobId:string):Promise<ObjectValue>;
};
export async function withFounderVideoMcp<T>(callback:(adapter:FounderVideoMcp)=>Promise<T>,options:{expectedManifest?:FounderVideoManifest;beforeWrite?:(tool:string,args:Record<string,unknown>)=>Promise<void>}={}):Promise<T>{
 if(!founderVideoMcpEnabled())error('DISABLED');
 const client=new Client({name:'darth-algo-approved-video-publisher',version:'1.0.0'});
 let stage='CONNECT';
 try{
  const token=await vidiqAccessToken();
  const transport=new StreamableHTTPClientTransport(new URL(vidiqResource),{reconnectionOptions:{maxRetries:0,maxReconnectionDelay:0,initialReconnectionDelay:0,reconnectionDelayGrowFactor:1},requestInit:{headers:{Authorization:`Bearer ${token}`},redirect:'error'},fetch:(input,init)=>fetch(input,{...init,redirect:'error',cache:'no-store',signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})});
  await client.connect(transport,{timeout:12000});stage='DISCOVERY';
  const result=await client.listTools({}, {timeout:12000});let cursor=result.nextCursor;
  for(let page=1;cursor&&page<3;page++){const more=await client.listTools({cursor},{timeout:12000});result.tools.push(...more.tools);cursor=more.nextCursor;}
  if(cursor)error('DISCOVERY_INCOMPLETE');
  const found=new Map<ToolName,Tool>(),manifest:FounderVideoManifest={};
  for(const name of names){
   const matches=result.tools.filter(t=>t.name===name||t.name==='vidiq_'+name);if(matches.length!==1)error('TOOL_UNAVAILABLE');
   const tool=matches[0] as Tool;if(!validSchema(name,tool.inputSchema))error('SCHEMA_UNSUPPORTED');
   if(name==='social_post_publish'?!freePublish(tool.description):!free(tool.description))error('COST_UNVERIFIED');
   found.set(name,tool);manifest['vidiq_'+name]=founderVideoSchemaHash(tool.inputSchema);
  }
  if(options.expectedManifest&&JSON.stringify(stable(options.expectedManifest))!==JSON.stringify(stable(manifest)))error('SCHEMA_CHANGED');
  let settings:FounderVideoSettings|null=null,accounts:FounderVideoAccount[]=[];
  const approved=approvedSchemas();
  function writeGate(name:ToolName){
   if(!founderVideoMcpEnabled())error('DISABLED');
   if(!settings||!accounts.length)error('ACCOUNTS_NOT_VERIFIED');
   if(!options.expectedManifest||Object.entries(manifest).some(([key,value])=>approved[key]!==value))error('SCHEMA_NOT_APPROVED');
   if(approved['vidiq_'+name]!==manifest['vidiq_'+name])error('SCHEMA_NOT_APPROVED');
  }
  async function call(name:ToolName,args:ObjectValue,write=false){
   if(!founderVideoMcpEnabled())error('DISABLED');if(write){writeGate(name);await options.beforeWrite?.('vidiq_'+name,structuredClone(args));if(!founderVideoMcpEnabled())error('DISABLED');}
   stage=write?'WRITE_OUTCOME_UNKNOWN':'READ';
   const tool=found.get(name)!;return unwrapped(await client.callTool({name:tool.name,arguments:args},undefined,{timeout:15000}));
  }
  function checkId(id:string){if(!identifier(id))error('IDENTIFIER_INVALID');}
  const adapter:FounderVideoMcp={
   manifest:()=>({...manifest}),
   assertWriteReady:()=>writeGate('video_upload'),
   async verifyAccounts(value){
    settings=null;accounts=[];const s=validateFounderVideoSettings(value),r=await call('social_account_list',{});
    if(!Array.isArray(r.accounts)||(r.partial!==undefined&&(!Array.isArray(r.partial)||r.partial.some(p=>['YOUTUBE','TIKTOK','INSTAGRAM'].includes(String(p))))))error('ACCOUNTS_INCOMPLETE');
    const choices=[['YOUTUBE',s.youtube.platformAccountId],['TIKTOK',s.tiktok.platformAccountId],['INSTAGRAM',s.instagram.platformAccountId]] as const;
    const eligible:FounderVideoAccount[]=choices.map(([platform,accountId])=>{
     const rows=(r.accounts as unknown[]).filter((a):a is ObjectValue=>object(a)&&a.platform===platform&&a.platformAccountId===accountId);
     if(rows.length!==1||rows[0].canPublish!==true)error('ACCOUNT_UNAVAILABLE');const a=rows[0];return {platform,platformAccountId:accountId,displayName:clean(a.displayName)||clean(a.username)||platform,canPublish:true,publishingAvailable:typeof a.publishingAvailable==='boolean'?a.publishingAvailable:null};
    });
    const ig=eligible.find(a=>a.platform==='INSTAGRAM')!;
    if(ig.publishingAvailable===null){
     const matches=result.tools.filter(t=>t.name==='vidiq_instagram_connected_accounts'||t.name==='instagram_connected_accounts');
     const legacy=matches.length===1?matches[0]:null;
     if(legacy&&legacy.annotations?.readOnlyHint===true&&free(legacy.description)&&(!Array.isArray(legacy.inputSchema.required)||legacy.inputSchema.required.length===0)){
      stage='READ';const extra=unwrapped(await client.callTool({name:legacy.name,arguments:{}},undefined,{timeout:15000}));
      const rows=Array.isArray(extra.accounts)?extra.accounts.filter((a):a is ObjectValue=>object(a)&&a.platformAccountId===ig.platformAccountId):[];
      if(rows.length===1&&rows[0].publishingAvailable===true)ig.publishingAvailable=true;
     }
    }
    if(ig.publishingAvailable!==true)error('INSTAGRAM_CAPABILITY_UNVERIFIED');
    settings=s;accounts=eligible;return eligible.map(a=>({...a}));
   },
   async importVideo(url,title){
    // Only this site's version-bound short-lived export is accepted. No SSRF fetch
    // or arbitrary owner-supplied URL is performed by this adapter.
    if(!/^https:\/\/www\.darthalgo\.com\/api\/founder-video-source\/[a-f0-9-]{36}\/[A-Za-z0-9_-]{43}$/.test(url)||typeof title!=='string'||!title.trim()||title.length>160)error('IMPORT_SOURCE_INVALID');
    return call('video_upload',{url,title},true);
   },
   async uploadStatus(uploadId){checkId(uploadId);return call('video_upload',{uploadId});},
   async createDraft(request){
    if(!settings||!Array.isArray(request.media)||request.media.length!==1||request.media[0].type!=='video')error('DRAFT_INVALID');
    const canonical=videoDraftRequest({caption:request.text,settings},request.media[0].id);
    if(JSON.stringify(stable(request))!==JSON.stringify(stable(canonical)))error('DRAFT_INVALID');
    return call('social_post_draft_create',canonical,true);
   },
   async getDraft(postId){checkId(postId);return call('social_post_draft_get',{postId});},
   async publish(postId,revision,publicationIds){
    checkId(postId);checkId(revision);if(!settings||!Array.isArray(publicationIds)||!publicationIds.length||publicationIds.length>2||publicationIds.some(id=>!identifier(id))||new Set(publicationIds).size!==publicationIds.length)error('PUBLICATION_INVALID');
    // Fresh read prevents accidental paid/foreign destinations, even if a caller
    // supplies valid-looking IDs. Exact owner approval is enforced by the ledger.
    const draft=await call('social_post_draft_get',{postId});
    if(draft.postId!==postId||draft.revision!==revision||draft.credits!==0||!Array.isArray(draft.destinations)||draft.destinations.length>2||draft.destinations.length<1)error('DRAFT_CHANGED');
    for(const d of draft.destinations){if(!object(d)||!((d.platform==='YOUTUBE'&&d.platformAccountId===settings.youtube.platformAccountId)||(d.platform==='TIKTOK'&&d.platformAccountId===settings.tiktok.platformAccountId))||(d.credits!==undefined&&d.credits!==0))error('PAID_OR_FOREIGN_DESTINATION');}
    for(const id of publicationIds){const matches=draft.destinations.filter((d):d is ObjectValue=>object(d)&&d.publicationId===id);if(matches.length!==1||matches[0].status!=='draft'||matches[0].issue||matches[0].scheduledFor!==null)error('DESTINATION_NOT_DRAFT');}
    return call('social_post_publish',{postId,revision,publicationIds:[...publicationIds]},true);
   },
   async postStatus(postId){checkId(postId);return call('social_post_status',{postId});},
   async instagram(args){
    if(!settings||args.platformAccountId!==settings.instagram.platformAccountId)error('ACCOUNT_UNAVAILABLE');
    const a=args as unknown as ObjectValue,selectors=['videoUrl','containerId','mcpJobId'].filter(key=>a[key]!==undefined);if(selectors.length!==1)error('INSTAGRAM_REQUEST_INVALID');
    if(selectors[0]!=='videoUrl'){
     const key=selectors[0];if(!identifier(a[key])||Object.keys(a).some(k=>!['platformAccountId',key].includes(k)))error('INSTAGRAM_REQUEST_INVALID');
    }else{
     if(Object.keys(a).some(k=>!['platformAccountId','videoUrl','caption','isAiGenerated','trialParams'].includes(k))||typeof a.videoUrl!=='string'||!publicHttps(a.videoUrl)||typeof a.caption!=='string'||!a.caption.trim()||a.caption.length>2200||a.isAiGenerated!==settings.instagram.isAiGenerated)error('INSTAGRAM_REQUEST_INVALID');
     const expected=settings.instagram.mode==='trial'?{graduationStrategy:settings.instagram.graduationStrategy}:undefined;
     if(JSON.stringify(stable(a.trialParams))!==JSON.stringify(stable(expected)))error('INSTAGRAM_REQUEST_INVALID');
    }
    return call('instagram_publish_reel',{...a},true);
   },
   async jobStatus(mcpJobId){checkId(mcpJobId);return call('job_poll',{mcpJobId});}
  };
  stage='CALLBACK';return await callback(adapter);
 }catch(e){
  if(e instanceof Error&&/^VIDEO_[A-Z_]{1,100}$/.test(e.message))throw e;
  // Never leak provider bodies, signed media URLs or credentials. A thrown write
  // remains uncertain: caller must keep its pre-recorded attempt and not retry.
  error(stage==='WRITE_OUTCOME_UNKNOWN'?'WRITE_OUTCOME_UNKNOWN':stage==='CALLBACK'?'CALLBACK_FAILED':'UNAVAILABLE');
 }finally{await client.close().catch(()=>{});}
}
