'use client';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronRight,FlaskConical,RefreshCw} from 'lucide-react';
import {useOwnerFeed} from './use-owner-feed';
import styles from './iphone-home.module.css';
type Candidate={id:string;name:string|null;purpose:string|null;status:string;source_hash:string;capture_id:string|null;capture_origin:string|null;capture_error:string|null;created_at:string};
export default function LabPanel({active}:{active:boolean}){
 const {data,error,loading,refresh}=useOwnerFeed<{candidates:Candidate[]}>('/api/owner/indicators',active);
 return <section aria-label='Indicator drafts'>
  <div className={styles.sectionHeading}><h2>Your prototypes</h2><button aria-label='Refresh indicator drafts' disabled={loading} onClick={()=>void refresh()}><RefreshCw size={18}/></button></div>
  <p className={styles.caption}>Original companion tools. Open a draft for its private chart, full Pine source and release checks.</p>
  {error&&<p className={styles.alert} role='alert'>{error}</p>}
  <div className={styles.labGrid}>{data?.candidates.map(c=><Link className={styles.labCard} href={`/owner/indicators/${c.id}`} key={c.id}>
   {c.capture_id?<><Image src={`/api/owner/indicators/${c.id}/captures/${c.capture_id}`} alt={`${c.name||'Indicator'} · exact source version chart`} width={720} height={450} unoptimized/><small>{c.capture_origin==='owner_submission'?'Owner-supplied chart':'TradingView capture'} · release testing is separate</small></>:<div className={styles.labEmpty}><FlaskConical size={28}/><span>{c.capture_error?'Chart capture needs attention':'Chart preview pending'}</span><small>{c.capture_error?.replaceAll('_',' ')||'Open draft for source and testing status'}</small></div>}
   <div><small>{c.status.replaceAll('_',' ')}</small><h3>{c.name||'Indicator draft'}</h3><p>{c.purpose||'Research and validation are available inside.'}</p><small>Source {c.source_hash?.slice(0,8)||'unverified'} · Release requires your approval <ChevronRight size={15}/></small></div>
  </Link>)}</div>
  {!data&&!error&&<p className={styles.caption}>Reading your saved prototypes…</p>}
  {data?.candidates.length===0&&<p className={styles.caption}>No prototype is saved yet.</p>}
  <div className={styles.group}><Link className={styles.listRow} href='/owner/research'><span><strong>Research & sources</strong><small>See the evidence behind new ideas</small></span><ChevronRight size={17}/></Link><Link className={styles.listRow} href='/owner/browser'><span><strong>TradingView connection</strong><small>Resolve chart capture and sign-in requirements</small></span><ChevronRight size={17}/></Link></div>
 </section>;
}
