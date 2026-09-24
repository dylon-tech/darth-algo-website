'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Copy, Download, Film, Pause, Play, Send, ShieldCheck } from 'lucide-react';
import { VIDEO_CTA, VIDEO_DISCLOSURE, VIDEO_TEMPLATES, buildVideoBrief, isVideoDraft, isVideoJobReceipt, newVideoDraft, videoDraftErrors, type VideoScene } from './video-studio-model';
import styles from './video-studio.module.css';
const STORAGE_KEY = 'darth-video-storyboard-v1';
const REVIEW_CLIP = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3GjCrDqrkf77RLg2koyExGkjpYm/6ded79a2-b566-4396-a90f-189cc7668dcc.mp4';
export default function VideoStudio({active,disabled,onOpenTeam}:{active:boolean;disabled:boolean;onOpenTeam:()=>void}) {
  const [draft,setDraft] = useState(() => newVideoDraft());
  const [ready,setReady] = useState(false), [saved,setSaved] = useState(false);
  const [scene,setScene] = useState(0), [playing,setPlaying] = useState(false), [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState(''), [receipt,setReceipt] = useState<{id:string;status:string}|null>(null);
  const [receiptMessage,setReceiptMessage] = useState(''), [uncertain,setUncertain] = useState(false), [failedImage,setFailedImage] = useState('');
  const reviewVideo = useRef<HTMLVideoElement|null>(null);
  const locked = useRef(false), request = useRef<AbortController|null>(null), mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    try { const raw = sessionStorage.getItem(STORAGE_KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (isVideoDraft(parsed)) setDraft(parsed); } } catch { /* Browser storage is optional. */ }
    setReady(true);
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STORAGE_KEY,JSON.stringify(draft)); setSaved(true); } catch { setSaved(false); }
  },[draft,ready]);
  useEffect(() => {
    if (!playing || !active || busy) return;
    const timer = setTimeout(() => { if (scene === draft.scenes.length-1) setPlaying(false); else setScene(scene+1); },draft.scenes[scene].seconds*1000);
    return () => clearTimeout(timer);
  },[playing,active,busy,scene,draft.scenes]);
  useEffect(() => { if (!active) {setPlaying(false);reviewVideo.current?.pause();} else if (navigator.onLine) setFailedImage(''); },[active]);
  useEffect(() => {
    const reconnect=()=>setFailedImage('');
    window.addEventListener('online',reconnect);
    return()=>window.removeEventListener('online',reconnect);
  },[]);
  const template = VIDEO_TEMPLATES.find(t => t.id===draft.templateId)!;
  const shot = draft.scenes[scene], errors = videoDraftErrors(draft), total = draft.scenes.reduce((n,s)=>n+s.seconds,0);
  let brief = '';
  try { brief = buildVideoBrief(draft); } catch { /* Invalid drafts stay editable, not submittable. */ }
  const alreadySent = Boolean(receipt && receiptMessage===brief);
  function edit(patch: Partial<VideoScene>) { setPlaying(false); setDraft(d => ({...d,scenes:d.scenes.map((s,i)=>i===scene?{...s,...patch}:s)})); }
  function choose(index: number) { setPlaying(false); setScene(index); }
  async function copy() {
    try { await navigator.clipboard.writeText(brief); setNotice('Production brief copied.'); }
    catch { setNotice('Clipboard is unavailable. Use Save brief instead.'); }
  }
  function download() {
    const blob = new Blob([brief],{type:'text/plain;charset=utf-8'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href=url; a.download=`darth-algo-${draft.templateId}-video-brief.txt`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Production brief exported. This is not a video file.');
  }
  async function send() {
    if (locked.current || disabled || !brief || alreadySent) return;
    locked.current=true; setBusy(true); setPlaying(false); setNotice('');
    const submittedBrief=brief, controller=new AbortController(); request.current=controller;
    const timer=setTimeout(()=>controller.abort(),20000);
    try {
      // The same exact brief always uses the same key, including after a lost response or reload.
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(submittedBrief));
      const requestKey='video-studio:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
      const r=await fetch('/api/owner/command',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({operation:'message',department:'content',message:submittedBrief,requestKey})});
      if ([400,401,403,413].includes(r.status)) { if (mounted.current) {setUncertain(false);setNotice(r.status===401?'Your owner session expired. Sign in again before sending.':'The server rejected the request. Your brief is still available to edit or export.');} return; }
      if (!r.ok) throw Error('unconfirmed');
      const body: unknown=await r.json();
      if (!isVideoJobReceipt(body)) throw Error('unconfirmed');
      if (mounted.current) {setReceipt(body);setReceiptMessage(submittedBrief);setUncertain(false);setNotice(`Content-agent request ${body.status}. This receipt confirms an internal job, not a finished or published video.`);}
    } catch {
      if (mounted.current) {setUncertain(true);setNotice('The response was not confirmed. Check the same request before creating another. An unchanged brief reuses its original request key.');}
    } finally { clearTimeout(timer); locked.current=false; if (mounted.current) setBusy(false); }
  }
  return <section className={styles.studio} aria-labelledby='video-studio-title'>
    <div className={styles.studioHeading}><div><p className={styles.kicker}>DARTH ALGO / VIDEO LAB</p><h2 id='video-studio-title'>Make your next Reel.</h2><p>Start with your product. Shape the story. Send a precise brief to your content agent.</p></div><span className={styles.format}><Film size={16}/>9:16 · {total}s</span></div>
    <details className={styles.review} onToggle={e=>{if(!e.currentTarget.open)reviewVideo.current?.pause();}}><summary><Film size={18}/><span>Watch your first rendered draft<small>18 seconds · Voiceover · Chart-led product promo</small></span></summary><video ref={reviewVideo} controls playsInline preload='none' src={REVIEW_CLIP} aria-label='Darth Algo clarity Reel review draft'><track kind='captions' src='/video-drafts/clarity-review.vtt' srcLang='en' label='English'/>Your browser does not support embedded video.</video><p>Review draft, not published. This rendered file is separate from the editable storyboard below; edits do not automatically rerender it. Provider-hosted playback requires an internet connection.</p></details>
    <div className={styles.templates} aria-label='Video concepts'>{VIDEO_TEMPLATES.map((t,i)=><button key={t.id} disabled={busy} aria-pressed={draft.templateId===t.id} onClick={()=>{if(t.id===draft.templateId)return;if(!window.confirm('Replace this storyboard with the selected template? Export this brief first to keep a copy.'))return;setDraft(newVideoDraft(t.id));setScene(0);setPlaying(false);setNotice('Template loaded. Edit any scene below.');}}><span>0{i+1}</span><strong>{t.name}</strong><small>{t.purpose}</small></button>)}</div>
    <div className={styles.workspace}>
      <div className={styles.previewColumn}>
        <div className={styles.phone} aria-label={`Storyboard scene ${scene+1}: ${shot.headline}`}>
          <div className={styles.phoneBrand}><Image src='/darth-algo-social-logo.png' width={28} height={28} alt='Darth Algo'/><strong>DARTH ALGO</strong><span>STORYBOARD</span></div>
          <p className={styles.sceneNumber}>SCENE {scene+1} / {draft.scenes.length}</p><h3>{shot.headline || 'Your headline'}</h3>
          <div className={styles.chartFrame}>{failedImage===template.image?<div><p>Source image unavailable. Review the asset before rendering.</p><button type='button' onClick={()=>setFailedImage('')}>Retry chart preview</button></div>:<Image src={template.image} loading='eager' width={1183} height={471} sizes='(max-width: 740px) 300px, 340px' unoptimized alt='Selected historical Darth Algo product chart; not a live signal' onError={()=>setFailedImage(template.image)}/>}</div>
          <p className={styles.previewContext}>FOR USE ON TRADINGVIEW</p><span className={styles.previewCta}>Explore the tools ↗<small>darthalgo.com/links</small></span><small className={styles.disclosure}>{VIDEO_DISCLOSURE}</small>
        </div>
        <div className={styles.previewControls}><button aria-label='Previous scene' disabled={scene===0} onClick={()=>choose(scene-1)}><ChevronLeft size={19}/></button><button onClick={()=>{if(!playing&&scene===draft.scenes.length-1)setScene(0);setPlaying(!playing);}} disabled={busy} aria-pressed={playing}><span>{playing?<Pause size={17}/>:<Play size={17}/>}</span>{playing?'Pause':'Preview timing'}</button><button aria-label='Next scene' disabled={scene===draft.scenes.length-1} onClick={()=>choose(scene+1)}><ChevronRight size={19}/></button></div>
        <p className={styles.help}>Silent storyboard preview, not a rendered clip. Source charts remain unchanged.</p>
      </div>
      <div className={styles.editor}>
        <div className={styles.timeline} aria-label='Storyboard scenes'>{draft.scenes.map((s,i)=><button key={i} aria-pressed={scene===i} onClick={()=>choose(i)}><span>Scene {i+1}</span><strong>{s.seconds}s</strong></button>)}</div>
        <fieldset disabled={busy}><legend>Edit this scene</legend>
          <label>On-screen headline<input maxLength={64} value={shot.headline} onChange={e=>edit({headline:e.target.value})}/></label>
          <label>Voiceover<textarea rows={3} maxLength={180} value={shot.voiceover} onChange={e=>edit({voiceover:e.target.value})}/><small>Confident, energetic, and natural. No promises of profit.</small></label>
          <label>What viewers see<textarea rows={3} maxLength={240} value={shot.direction} onChange={e=>edit({direction:e.target.value})}/></label>
          <label className={styles.duration}>Scene length<select value={shot.seconds} onChange={e=>edit({seconds:Number(e.target.value)})}>{[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
          <details className={styles.details}><summary>Extra direction</summary><label>Notes for the creator<textarea rows={3} maxLength={300} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><p>Concept reference: <a href={template.reference} target='_blank' rel='noopener noreferrer'>your earlier Reel</a>. Caption themes informed this template; this is not a frame-for-frame copy.</p></details>
        </fieldset>
        {errors.length>0&&<p role='status' className={styles.warning}>{errors[0]}</p>}
        {!brief&&!errors.length&&<p role='status' className={styles.warning}>Shorten the directions or notes to fit the agent request.</p>}
        <div className={styles.actions}><button className={styles.primary} disabled={busy||disabled||!brief||alreadySent} onClick={()=>void send()}>{alreadySent?<Check size={18}/>:<Send size={18}/>} {busy?'Confirming request…':alreadySent?'Request saved':uncertain?'Check same request':'Send to content agent'}</button><button disabled={!brief||busy} onClick={()=>void copy()} aria-label='Copy production brief'><Copy size={18}/></button><button disabled={!brief||busy} onClick={download} aria-label='Save production brief'><Download size={18}/></button></div>
        <p className={styles.help}>{saved?'Draft saved in this browser tab; not synced across devices.':'Draft is in memory. Export it to keep a copy.'} Sending uses the existing agent budget and permissions.</p>
        {notice&&<p role='status' className={styles.notice}>{notice}</p>}
        {receipt&&<div className={styles.receipt}><span>Internal job · {receipt.status}<small>{receipt.id}</small></span><button onClick={onOpenTeam}>See agent work<ArrowRight size={17}/></button></div>}
      </div>
    </div>
    <div className={styles.guardrail}><ShieldCheck size={22}/><div><strong>Brand rules. Honest previews.</strong><p>Actual DA logo · Real chart references · Clear CTA · No invented trade results. Review claims again after edits.</p><p>Rendering is not connected in this workspace yet. A future render must show its provider quote and fit the server-side budget before spending. Creating a brief does not schedule a post.</p></div></div>
    <details className={styles.details}><summary>Production brief & destination</summary><pre>{brief||'Complete the scene fields to prepare the production brief.'}</pre><a href={VIDEO_CTA} target='_blank' rel='noopener noreferrer'>Open the customer destination ↗</a></details>
  </section>;
}
