import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {vidiqAccessToken,vidiqResource} from './vidiq-connection';
const platforms=['YOUTUBE','TIKTOK','INSTAGRAM'] as const;
type Platform=typeof platforms[number];
export type FounderVideoCapability={enabled:false;status:'blocked';checkedAt:string;connected:boolean;accounts:Array<{platform:Platform;platformAccountId:string;displayName:string;canPublish:boolean;publishingAvailable:boolean|null}>;tools:Array<{name:string;schemaSha256:string}>;blockers:string[];ownerAction:string};
const expectedTools=['vidiq_social_account_list','vidiq_video_upload','vidiq_social_post_draft_create','vidiq_social_post_draft_get','vidiq_social_post_publish','vidiq_social_post_status','vidiq_instagram_publish_reel','vidiq_job_poll'] as const;
const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function text(v:unknown,max=200){return typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,'').slice(0,max):'';}
function accountsResult(result:unknown):Record<string,unknown>|null{
 if(!result||typeof result!=='object')return null;const r=result as Record<string,unknown>;if(r.isError)return null;
 if(Array.isArray(r.accounts))return r;
 if(r.structuredContent&&typeof r.structuredContent==='object'&&Array.isArray((r.structuredContent as Record<string,unknown>).accounts))return r.structuredContent as Record<string,unknown>;
 if(Array.isArray(r.content))for(const block of r.content){if(block?.type==='text'&&typeof block.text==='string'&&block.text.length<=100000)try{const parsed=JSON.parse(block.text);if(parsed&&Array.isArray(parsed.accounts))return parsed;}catch{}}
 return null;
}
/** Read-only. Never imports media, creates a draft, or invokes a publishing tool. */
export async function discoverFounderVideoCapabilities():Promise<FounderVideoCapability>{
 const status:FounderVideoCapability={enabled:false,status:'blocked',checkedAt:new Date().toISOString(),connected:false,accounts:[],tools:[],blockers:[],ownerAction:''};
 const client=new Client({name:'darth-algo-video-capability-check',version:'1.0.0'});
 try{
  const token=await vidiqAccessToken();
  const transport=new StreamableHTTPClientTransport(new URL(vidiqResource),{reconnectionOptions:{maxRetries:0,maxReconnectionDelay:0,initialReconnectionDelay:0,reconnectionDelayGrowFactor:1},requestInit:{headers:{Authorization:`Bearer ${token}`},redirect:'error'},fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})});
  await client.connect(transport,{timeout:12000});status.connected=true;
  const listed=await client.listTools({}, {timeout:12000});let cursor=listed.nextCursor;
  for(let page=1;cursor&&page<3;page++){const next=await client.listTools({cursor},{timeout:12000});listed.tools.push(...next.tools);cursor=next.nextCursor;}
  if(cursor)status.blockers.push('Provider tool discovery was incomplete. Retry the read-only capability check.');
  // Accept only exact known names. Schema presence isn't proof of workflow readiness.
  const tools=expectedTools.flatMap(name=>{const found=listed.tools.find(tool=>tool.name===name||tool.name===name.replace(/^vidiq_/,''));return found?[{...found,canonicalName:name}]:[];});
  status.tools=tools.map(tool=>({name:tool.name,schemaSha256:sha(tool.inputSchema)}));
  for(const name of expectedTools)if(!tools.some(tool=>tool.canonicalName===name))status.blockers.push(`The website connection does not expose ${name.replace(/^vidiq_/,'').replace(/_/g,' ')}.`);
  const list=tools.find(tool=>tool.canonicalName==='vidiq_social_account_list');
  if(list&&(!Array.isArray(list.inputSchema.required)||list.inputSchema.required.length===0)){
   const result=accountsResult(await client.callTool({name:list.name,arguments:{}},undefined,{timeout:12000}));
   if(!result)status.blockers.push('The provider did not return a verified account list.');
   else {
    status.accounts=(result.accounts as unknown[]).slice(0,100).flatMap(value=>{if(!value||typeof value!=='object')return [];const a=value as Record<string,unknown>;if(!platforms.includes(a.platform as Platform)||typeof a.platformAccountId!=='string'||!a.platformAccountId||a.platformAccountId.length>200||/[\s\x00-\x1f]/.test(a.platformAccountId))return [];return [{platform:a.platform as Platform,platformAccountId:a.platformAccountId,displayName:text(a.displayName)||text(a.username)||String(a.platform),canPublish:a.canPublish===true,publishingAvailable:typeof a.publishingAvailable==='boolean'?a.publishingAvailable:null}];});
    const partial=Array.isArray(result.partial)?result.partial:[];
    for(const platform of platforms){if(partial.includes(platform))status.blockers.push(`${platform} account lookup was incomplete; missing accounts are not proof of disconnection.`);else if(!status.accounts.some(a=>a.platform===platform&&a.canPublish))status.blockers.push(`Connect or reconnect a publishing-enabled ${platform} account in the website's vidIQ connection.`);}
   }
  }
  if(list&&Array.isArray(list.inputSchema.required)&&list.inputSchema.required.length)status.blockers.push('Account-list input requirements changed. The read-only adapter needs verification before use.');
  // Official source evidence (checked 2026-11-15):
  // https://github.com/vid-io/vidiq-mcp/blob/d4b0e3780f1b976241b0e9766e6ca140a75abc67/skills/vidiq-publishing/references/platforms-and-media.md
  // https://support.vidiq.com/en/articles/15082430-vidiq-mcp
  // A cached older official README listed this legacy read-only tool, but it is absent
  // from some current surfaces. Never assume its presence, price or identity map.
  const legacy=listed.tools.find(t=>t.name==='vidiq_instagram_connected_accounts'||t.name==='instagram_connected_accounts');
  if(legacy){
   status.tools.push({name:legacy.name,schemaSha256:sha(legacy.inputSchema)});
   const noRequiredArgs=!Array.isArray(legacy.inputSchema.required)||legacy.inputSchema.required.length===0;
   const free=/\bcost:\s*0\s+credit(?:\(s\)|s)?(?:\s|[.;]|$)/i.test(legacy.description||'');
   if(noRequiredArgs&&legacy.annotations?.readOnlyHint===true&&free){
    try{const result=accountsResult(await client.callTool({name:legacy.name,arguments:{}},undefined,{timeout:12000}));
     if(result){for(const account of status.accounts.filter(a=>a.platform==='INSTAGRAM')){
      const matches=(result.accounts as unknown[]).filter((v):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&(v as Record<string,unknown>).platformAccountId===account.platformAccountId&&typeof (v as Record<string,unknown>).publishingAvailable==='boolean');
      if(matches.length===1){const value=matches[0].publishingAvailable as boolean;if(account.publishingAvailable===null)account.publishingAvailable=value;else if(account.publishingAvailable!==value){account.publishingAvailable=false;status.blockers.push('Instagram capability results disagree for the same account. Recheck before publishing.');}}
     }}else status.blockers.push('The optional Instagram capability check did not return a recognized account list.');
    }catch{status.blockers.push('The optional Instagram capability check did not finish. No media was sent.');}
   }else status.blockers.push('The optional Instagram capability tool is not verified as zero-cost, read-only, and callable without extra inputs. It was not called.');
  }
  if(!status.accounts.some(a=>a.platform==='INSTAGRAM'&&a.canPublish&&a.publishingAvailable===true))status.blockers.push('Instagram AI-labelled Reel publishing requires publishingAvailable=true; canPublish alone does not verify that capability.');
  status.blockers.push('Official documentation maps a ready video uploadId to draft media, and Instagram AI-labelled Reels use videoUrl. The website import and draft flow has not been runtime-verified; this check uploads nothing.','The website draft-approval gate and YouTube verification handoff have not been verified. No publishing executor is enabled.');
  const eligible=platforms.every(platform=>status.accounts.some(a=>a.platform===platform&&a.canPublish));
  status.ownerAction=status.blockers.some(b=>b.includes('incomplete'))?'Retry the read-only capability check before choosing accounts; an incomplete lookup does not prove an account is missing.':eligible?'Choose the exact account on each platform, TikTok privacy/comments/music, YouTube privacy, and Instagram regular/Trial plus AI label. Those choices will be reviewed with the final draft after the website publishing workflow is verified.':'Connect the missing publishing accounts through the website connection, then check again. Existing ChatGPT-connected accounts do not prove the website connection has the same access.';
 }catch(error){
  // Never expose provider text, MCP content, URLs or credentials in an error.
  const code=error instanceof Error?error.message:'';
  status.blockers.push(code==='VIDIQ_NOT_CONNECTED'?'The website vidIQ connection is not connected.':code==='VIDIQ_RECONNECT_REQUIRED'?'The website vidIQ connection needs reconnection.':'The website video capability check could not finish. No media was uploaded or published.');
  status.ownerAction=code==='VIDIQ_NOT_CONNECTED'||code==='VIDIQ_RECONNECT_REQUIRED'?'Open website Connections and connect or reconnect vidIQ, then check again.':'Retry the read-only connection check. Do not upload or publish until its capabilities are verified.';
 }finally{await client.close().catch(()=>{});}
 return status;
}
