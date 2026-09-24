'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

/** Private, memory-only data; abort on exit and never mistake an old response for fresh evidence. */
export function useOwnerFeed<T>(url:string,active:boolean){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[checkedAt,setCheckedAt]=useState(0);
 const request=useRef<AbortController|null>(null),mounted=useRef(false);
 const refresh=useCallback(async()=>{
  if(request.current)return;
  const c=new AbortController();request.current=c;setLoading(true);
  const timer=setTimeout(()=>c.abort(),15000);
  try{const r=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:c.signal});
   if(r.status===401){setData(null);throw Error('Your session expired. Reconnect this device from your private Telegram chat.');}
   if(!r.ok)throw Error('These records could not be refreshed. Try again.');
   const next=await r.json() as T;if(mounted.current&&!c.signal.aborted){setData(next);setError('');setCheckedAt(Date.now());}
  }catch(e){if(mounted.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'The check timed out. No changes were made.');}
  finally{clearTimeout(timer);if(request.current===c)request.current=null;if(mounted.current)setLoading(false);}
 },[url]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 useEffect(()=>{if(!active)return;void refresh();const visible=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh();};const timer=setInterval(visible,20000);document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};},[active,refresh]);
 return {data,error,loading,checkedAt,refresh};
}
