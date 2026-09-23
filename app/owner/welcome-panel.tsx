'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './welcome.module.css';
import type {welcomeSnapshot} from '../lib/welcome/service';
type Snapshot=Awaited<ReturnType<typeof welcomeSnapshot>>;
export default function WelcomePanel({compact=false}:{compact?:boolean}){
 const [data,setData]=useState<Snapshot|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[draft,setDraft]=useState(''),[editing,setEditing]=useState('');
 async function refresh(){try{const r=await fetch('/api/owner/welcome',{cache:'no-store'});if(!r.ok)throw Error();setData(await r.json());}catch{setNotice('Private Welcome Agent status unavailable. Open your connected owner browser.');}}
 useEffect(()=>{void refresh();},[]);
 async function action(platform:string,action:string){setBusy(true);try{const r=await fetch('/api/owner/welcome',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform,action,message:draft})});const v=await r.json();setNotice(v.message||v.error);if(r.ok){setEditing('');await refresh();}}catch{setNotice('Result unknown. Refresh before retrying.');}finally{setBusy(false);}}
 const count=data?.platforms.every(p=>p.acceptedToday!==null)?data.platforms.reduce((s,p)=>s+(p.acceptedToday||0),0):null;
 return <section className={styles.card} aria-label='Welcome Agent'><header className={styles.header}><Image src='/darth-algo-social-logo.png' alt='Darth Algo' width={48} height={48} unoptimized/><div><span className={styles.kicker}>GROWTH</span><h2>Welcome Agent</h2></div><span className={styles.status}>Sending off</span></header>
 <div className={styles.metrics}><div><strong>{count??'—'}</strong><span>Offers accepted today</span></div><div><strong>—</strong><span>Verified paid customers</span></div><div><strong>—</strong><span>Attributed revenue</span></div></div>
 <p className={styles.note}>A dash means unavailable. Sending and payment coverage need verification.</p>
 {notice&&<p role='status' className={styles.notice}>{notice}</p>}
 {data&&<><p className={styles.note}>Last system read: {new Date(data.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York'})} ET · <button disabled={busy} onClick={()=>void refresh()}>Refresh</button></p><div className={styles.platforms}>{data.platforms.map(p=><div key={p.platform}><strong>{p.platform==='x'?'X':p.platform==='instagram'?'Instagram':'TikTok'}</strong><span>{p.status}</span></div>)}</div>
 <div className={styles.callout}><strong>Instagram connected · welcome draft saved</strong><p>Follow-to-DM is unavailable for this account. The Manychat fallback responds to an exact WELCOME message. Sending stays off until the controlled test and final offer validation are complete.</p></div>
 {compact?<Link className={styles.button} href='/owner/welcome'>Open Welcome Agent →</Link>:<>
 <details open><summary>What needs you</summary><ol>{data.ownerActions.map(a=><li key={a}>{a}</li>)}</ol></details>
 {data.platforms.map(p=><article key={p.platform} className={styles.platform}><div className={styles.row}><h3>{p.platform==='x'?'X':p.platform==='instagram'?'Instagram':'TikTok'}</h3><span className={styles.status}>{p.status}</span></div><p>{p.inventory?.trigger}</p><dl><dt>Account</dt><dd>{p.account_label}</dd><dt>Connection</dt><dd>{p.connected?'Observed connected':'Needs connection'}{p.connectionObservedAt?` · ${p.connectionObservedAt} (manual check)`:''}</dd><dt>Sending owner</dt><dd>{p.sending_owner==='none'?'Not assigned':p.sending_owner}</dd><dt>Last event</dt><dd>{p.last_event_at?new Date(p.last_event_at).toLocaleString():'Unavailable'}</dd><dt>Policy check</dt><dd>{p.inventory?.verifiedAt}</dd><dt>Delivery / read receipts</dt><dd>Unavailable / unavailable</dd><dt>Eligible events</dt><dd>Unavailable</dd><dt>Suppressed / failed / unknown</dt><dd>{['suppressed','failed','unknown'].map(status=>data.outcomes.find(o=>o.platform===p.platform&&o.status===status)?.n??'Unavailable').join(' / ')}</dd><dt>Observed visits / checkout clicks</dt><dd>{data.visits.find(v=>v.platform===p.platform)?.visits??0} / {data.visits.find(v=>v.platform===p.platform)?.checkouts??0} (30 days)</dd></dl>
 <details><summary>Permissions, costs and limits</summary><p>{p.inventory?.permissions}</p><p>{p.inventory?.eligibility}</p><p>{p.inventory?.restrictions}</p><p>{p.inventory?.cost}</p></details>
 {p.providerFlowUrl&&<p><a className={styles.button} href={p.providerFlowUrl} target='_blank' rel='noreferrer'>Open native flow in Manychat →</a></p>}
 <div className={styles.actions}><button disabled={busy} onClick={()=>void action(p.platform,'pause')}>Pause</button><button disabled={busy} onClick={()=>void action(p.platform,'resume')}>Resume</button><button disabled={busy} onClick={()=>void action(p.platform,'test')}>Send Test</button><button onClick={()=>{if(p.providerFlowUrl){setNotice('Edit the saved message through Open native flow in Manychat. Dashboard changes cannot update this provider.');return;}setEditing(p.platform);setDraft(p.message);}}>Edit Message</button></div>
 {editing===p.platform&&<div className={styles.editor}><label htmlFor={'message-'+p.platform}>Offer draft · saving pauses sending</label><textarea id={'message-'+p.platform} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1200}/><button disabled={busy} onClick={()=>void action(p.platform,'edit')}>Save draft</button><button onClick={()=>setEditing('')}>Cancel</button></div>}
 </article>)}
 <details><summary>Measurement and revenue</summary><p>{data.analytics.visits}</p><p>{data.analytics.conversionDenominator}</p><p>{data.analytics.revenue}</p><p>{data.analytics.paidCoverage}</p><p>WELCOME-only purchases are kept separate from campaign purchases with a known source. They do not prove incremental sales. Refund totals and paid conversions remain unavailable until verified.</p></details>
 <details><summary>Optional profile or pinned-post text</summary><p>New here? DM WELCOME for 25% off Darth Algo TradingView indicators.</p><p>Prepared only. No profile or post has been changed.</p></details>
 </>}
 </>}
 </section>;
}
