'use client';
import {useState} from 'react';
import type {FounderVideoCapability} from '../lib/business-os/founder-video-publication';
import {ExternalLink,Notice} from './founder-shared';
import s from './founder.module.css';
export default function FounderVideoCapabilityPanel({base}:{base:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[data,setData]=useState<FounderVideoCapability|null>(null);
 async function check(){if(busy)return;setBusy(true);setError('');try{const response=await fetch(base+'/founder-video-capability',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw Error('Connection check did not finish. Sign in again if your session expired.');setData(await response.json());}catch(e){setError(e instanceof Error?e.message:'Connection check unavailable.');}finally{setBusy(false);}}
 return <section className={s.card} style={{marginTop:20}} aria-label='Video publishing setup'><h3>Video publishing setup</h3><p className={s.soft}>TikTok, YouTube and Instagram publishing is not activated. Check your website connections without uploading or posting anything.</p><button className={s.secondary} disabled={busy} onClick={()=>void check()}>{busy?'Checking…':'Check video connections'}</button>{error&&<Notice error>{error}</Notice>}{data&&<><p>{data.ownerAction}</p>{data.accounts.map(a=><p key={a.platform+':'+a.platformAccountId}>{a.platform} · {a.displayName} · {a.canPublish?'Account permission reported':'Reconnect needed'}</p>)}<details className={s.editorMore}><summary>What still needs verification</summary>{data.blockers.map(b=><p key={b}>{b}</p>)}</details></>}<p className={s.soft}>Before any video is posted, you must choose its TikTok privacy, comments and music, YouTube privacy, and Instagram Reel/AI-label settings. These choices will be included in the final review.</p><ExternalLink href='/owner/connections'>Open connected accounts</ExternalLink></section>;
}
