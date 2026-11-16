'use client';
import {useEffect,useState,type FormEvent} from 'react';
import InstallApp from './install-app';
import s from './founder.module.css';
export default function EmailLogin({onConnected,sourceBase}:{onConnected:()=>Promise<void>;sourceBase:string}){
 const [available,setAvailable]=useState<boolean|null>(null),[email,setEmail]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;fetch(sourceBase+'/sign-in',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(active)setAvailable(d.available===true);}).catch(()=>{if(active)setAvailable(false);});return()=>{active=false;};},[sourceBase]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  const r=await fetch(sourceBase+'/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sent?{operation:'verify',code}:{operation:'request',email}),signal:AbortSignal.timeout(20000)});const result=await r.json();if(!r.ok)throw Error(result.error||'Please try again.');
  if(sent){setCode('');await onConnected();}else{setSent(true);setMessage(result.message);}
 }catch(error){setMessage(error instanceof Error&&error.name!=='TimeoutError'?error.message:'The connection timed out. Wait a minute before trying again.');}finally{setBusy(false);}}
 return <><p>Sign in to your private dashboard. No Telegram needed.</p>{available===null?<p role='status'>Checking sign-in…</p>:available?<form className={s.form} onSubmit={submit}>
 {!sent?<label>Owner email<input type='email' autoComplete='email' inputMode='email' required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>:<><p>Enter the six-digit code sent to your owner email.</p><label>Sign-in code<input type='text' inputMode='numeric' autoComplete='one-time-code' pattern='[0-9]{6}' maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} disabled={busy}/></label></>}
 <button className={s.primary} disabled={busy}>{busy?'Please wait…':sent?'Open dashboard':'Email me a code'}</button>
 {sent&&<button type='button' className={s.secondary} disabled={busy} onClick={()=>{setSent(false);setCode('');setMessage('');}}>Use a different email or request a new code</button>}
 </form>:<p role='status'>Website sign-in is being connected. Your dashboard stays private.</p>}
 {message&&<p role='status'>{message}</p>}<button className={s.secondary} onClick={()=>void onConnected()}>Check existing sign-in</button><InstallApp/></>;
}
