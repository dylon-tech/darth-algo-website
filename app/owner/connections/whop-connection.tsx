"use client";
import {useEffect,useState} from 'react';
type State={connected:boolean;companyName?:string|null;publishingConfigured?:boolean;publishing?:{blocked:boolean;verified:boolean;recheckRequested:boolean}};
export default function WhopConnection(){
 const [data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[locked,setLocked]=useState(false);
 async function refresh(){
  try{
   const response=await fetch('/api/owner/connections/whop',{cache:'no-store'});
   if(response.status===401){setLocked(true);return;}
   const state=await response.json();
   if(!response.ok&&!state.publishing)throw Error();
   setData(state);setLocked(false);
  }catch{setMessage('Whop status is unavailable. Refresh to check again.');}
 }
 useEffect(()=>{void refresh();},[]);
 async function recheck(){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/owner/connections/whop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'permissions_updated'})});
   if(!response.ok)throw Error();
   await refresh();setMessage('The next scheduled approved post can try again. Posting permission and delivery have not yet been verified.');
  }catch{setMessage('Could not resume scheduled posting. Open your owner sign-in and try again.');}
  finally{setBusy(false);}
 }
 const status=locked?'Open your owner sign-in to check Whop.':!data?'Checking Whop…':data.publishing?.blocked?'Posting permission required':!data.connected?'Account connection needs checking':data.publishingConfigured===false?'Whop posting is paused':data.publishing?.recheckRequested?'Permission update reported · Next scheduled attempt pending':data.publishing?.verified?'Posting permission verified':'Account connected · Posting permission unverified';
 return <section className="mt-6 rounded-2xl border border-white/10 p-7" aria-labelledby="whop-heading">
  <p className="text-sm text-violet-300">Morning and afternoon posts</p><h2 id="whop-heading" className="mt-2 text-2xl font-semibold">Whop</h2>
  <p className="mt-4 font-medium" role="status">{status}</p>
  {data?.publishing?.blocked&&<div className="mt-4 rounded-xl border border-amber-400/30 p-4">
   <p className="text-slate-200">Whop rejected the post because the connected key lacks <code>forum:post:create</code>. In Whop, update this key to allow creating posts and reading forums (<code>forum:read</code>) so the app can verify delivery.</p>
   <a href="https://whop.com/dashboard/" target="_blank" rel="noreferrer" className="mt-4 inline-block text-violet-300 underline">Open Whop dashboard ↗</a>
   <p className="mt-3 text-sm text-slate-400">After updating the existing key, use the button below. If Whop gives you a replacement key, it must also replace the app’s connection key before posting can resume.</p>
   <button type="button" disabled={busy} onClick={()=>void recheck()} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy?'Updating…':'I updated the permissions'}</button>
  </div>}
  <p className="mt-3 text-sm text-slate-400">A post counts as published only after Whop returns it in a separate delivery check. Reporting a permission update does not mark a post as delivered.</p>
  {!locked&&<button type="button" disabled={busy} onClick={()=>void refresh()} className="mt-3 px-4 py-3 text-sm text-violet-300 disabled:opacity-50">Refresh Whop status</button>}
  {message&&<p role="status" className="mt-3 text-sm text-slate-300">{message}</p>}
 </section>;
}
