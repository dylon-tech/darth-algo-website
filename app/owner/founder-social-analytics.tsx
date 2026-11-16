'use client';
import type {FounderSocialAnalytics,SocialReceipt} from '../lib/business-os/founder-social-analytics';
import {Empty,ExternalLink,Notice,Refresh,SectionHeading,SourceNote,Status,timestamp,useFounderFeed} from './founder-shared';
import s from './founder.module.css';
const number=(value:number|null)=>value===null?'—':value.toLocaleString('en-US',{maximumFractionDigits:1});
function receiptLabel(row:SocialReceipt){return row.status==='completed'?'Delivered':row.status==='draft'?'Draft · not scheduled':row.status==='scheduled'?'Scheduled':row.status==='inProgress'||row.status==='submitted'?'Processing':row.status==='reconciliationRequired'?'Needs reconciliation':row.status;}
export default function FounderSocialAnalyticsPanel({base}:{base:string}){
 const feed=useFounderFeed<FounderSocialAnalytics>(base+'/social-analytics'),data=feed.data,ig=data?.instagram,publishing=data?.publishing;
 return <section aria-label='Social platform analytics'>
  <SectionHeading title='Platform performance' action={<Refresh loading={feed.loading} onClick={()=>void feed.refresh()}/>}/>
  {feed.error&&<Notice error>{feed.error}</Notice>}
  {!data?<Empty title={feed.loading?'Reading connected sources':'Social analytics unavailable'}>The last verified source read will appear here.</Empty>:<>
   <p className={s.soft}>Source read: {timestamp(data.checkedAt)}</p>
   {data.connection.status!=='connected'&&<Notice>{data.connection.message} <ExternalLink href='/owner/connections'>View connections</ExternalLink></Notice>}
   {ig?.status==='available'?<>
    <div className={s.metrics}><div className={s.metric}><span>Instagram followers</span><strong>{number(ig.followers)}</strong><small>@{ig.handle?.replace(/^@/,'')} · current count</small></div><div className={s.metric}><span>Recent Reels returned</span><strong>{ig.reels.length}</strong><small>Last 30 days · {ig.partial?'partial sample':'returned source window'}</small></div></div>
    {ig.reels.length?<div className={s.contentGrid} style={{marginTop:16}}>{ig.reels.slice(0,6).map(reel=><article className={s.card} key={reel.id} style={{marginBottom:12}}><h3 style={{overflowWrap:'anywhere'}}>{reel.caption||'Instagram Reel'}</h3><p>{timestamp(reel.publishedAt)}</p><div className={s.statsLine}><span><strong>{number(reel.views)}</strong>Views</span><span><strong>{number(reel.likes)}</strong>Likes</span><span><strong>{number(reel.saves)}</strong>Saves</span><span><strong>{number(reel.shares)}</strong>Shares</span></div><p>Average watch: {number(reel.averageWatchSeconds)}{reel.averageWatchSeconds===null?'':'s'} · Skip rate: {number(reel.skipPercent)}{reel.skipPercent===null?'':'%'}</p><ExternalLink href={reel.url}>Open Reel</ExternalLink></article>)}</div>:<Empty title='No Reels returned in this window'>This read returned no matching Reels. It does not establish zero views for the account.</Empty>}
    <SourceNote source={ig.source} at={data.checkedAt}><p>{ig.message}</p><p>Showing the six newest verified returned Reels. Follower growth and cross-platform rankings are unavailable.</p></SourceNote>
   </>:<Empty title='Instagram performance unavailable'>{ig?.message}</Empty>}
   <details className={s.source}><summary>Other platform coverage</summary>{data.unavailable.map(row=><p key={row.platform}><strong>{row.platform}:</strong> {row.message}</p>)}</details>
   <SectionHeading title='Provider delivery records'/>
   {publishing?.status==='available'?<>
    <div className={s.metrics}>{([['Delivered',publishing.counts?.delivered],['Scheduled',publishing.counts?.scheduled],['Drafts',publishing.counts?.draft],['Failed',publishing.counts?.failed]] as const).map(([label,value])=><div className={s.metric} key={label}><span>{label}</span><strong>{value??'—'}</strong><small>Returned destination rows only</small></div>)}</div>
    <div className={s.group} style={{marginTop:16}}>{publishing.rows.slice(0,12).map(row=><div className={s.row} key={row.id}><div><strong>{row.title}</strong><small>{row.platform} · {row.account}</small><Status value={receiptLabel(row)}/>{row.scheduledAt&&<small>{row.status==='draft'?'Planned':'Scheduled'}: {timestamp(row.scheduledAt)}</small>}{row.completedAt&&<small>Delivered: {timestamp(row.completedAt)}</small>}{row.issue&&<small>{row.issue}</small>}{row.url&&<ExternalLink href={row.url}>Open post</ExternalLink>}</div></div>)}</div>
    {!publishing.rows.length&&<Empty title='No vidIQ receipts returned'>Other providers and undated drafts are outside this feed.</Empty>}
    <SourceNote source={publishing.source} at={data.checkedAt}><p>{publishing.message}</p><p>{publishing.partial?'Partial source page. ':'One source page. '}Showing up to 12 destination rows. Unknown outcomes require reconciliation before any retry.</p></SourceNote>
   </>:<Empty title='Delivery records unavailable'>{publishing?.message}</Empty>}
  </>}
 </section>;
}
