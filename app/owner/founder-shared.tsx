'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowUpRight,RefreshCw,X} from 'lucide-react';
import s from './founder.module.css';

export const money=(cents:number|null|undefined,currency='USD')=>cents==null?'—':currency.toUpperCase()==='USD'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100):`${cents.toLocaleString('en-US')} ${currency.toUpperCase()} minor units`;
export const timestamp=(v:string|null|undefined)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Not yet verified';
export const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const dayLabel=(v:string)=>new Date(v+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'America/New_York'});
export const words=(v:string)=>v.replaceAll('_',' ').replace(/^\w/,c=>c.toUpperCase());
export function safeLink(value:string|null|undefined){if(!value||/[\x00-\x20\\]/.test(value))return null;if(value.startsWith('/')&&!value.startsWith('//'))return value;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function useFounderFeed<T>(url:string,active=true){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const request=useRef<AbortController|null>(null),requestUrl=useRef(''),mounted=useRef(false);
 const refresh=useCallback(async()=>{if(request.current&&requestUrl.current===url)return;request.current?.abort();const c=new AbortController();request.current=c;requestUrl.current=url;setLoading(true);const timer=setTimeout(()=>c.abort(),45000);
  try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:c.signal});if(response.status===401){window.dispatchEvent(new Event('founder-session-expired'));throw Error('Your session expired. Connect this device again.');}const body=await response.json();if(!response.ok)throw Error(body.error||'These records could not be refreshed.');if(mounted.current&&request.current===c&&!c.signal.aborted){setData(body);setError('');}}
  catch(e){if(mounted.current&&request.current===c){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Update unavailable.');else setError('This read timed out. The last saved data may be out of date.');}}
  finally{clearTimeout(timer);if(request.current===c){request.current=null;if(mounted.current)setLoading(false);}}
 },[url]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const current=request.current;request.current=null;current?.abort();};},[]);
 useEffect(()=>{setData(null);setError('');},[url]);
 useEffect(()=>{if(!active)return;void refresh();const visible=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh();};const timer=setInterval(visible,60000);document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};},[active,refresh]);
 return {data,setData,error,loading,refresh};
}
export class SaveError extends Error {constructor(message:string,public status:number,public current?:unknown){super(message);}}
export async function saveRequest<T=Record<string,unknown>>(path:string,body:unknown):Promise<T>{
 if(!navigator.onLine)throw new SaveError('Offline draft. Reconnect and save when you are ready.',0);
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),45000);
 try{const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:c.signal});const result=await r.json();if(r.status===401)window.dispatchEvent(new Event('founder-session-expired'));if(!r.ok)throw new SaveError(result.error||result.message||'Save was not confirmed.',r.status,result.current||result.state);return result as T;}
 catch(e){if(e instanceof SaveError)throw e;throw new SaveError('No confirmation received. Refresh the saved record before retrying; your draft is preserved.',0);}
 finally{clearTimeout(timer);}
}
export function Empty({title,children,action}:{title:string;children?:ReactNode;action?:ReactNode}){return <div className={s.empty}><span className={s.emptyMark}>—</span><h3>{title}</h3>{children&&<p>{children}</p>}{action}</div>;}
export function Notice({children,error=false}:{children:ReactNode;error?:boolean}){return <div className={error?s.error:s.notice} role={error?'alert':'status'}>{children}</div>;}
export function SectionHeading({title,action}:{title:string;action?:ReactNode}){return <div className={s.sectionHeading}><h2>{title}</h2>{action}</div>;}
export function Status({value}:{value:string}){return <span className={s.status} data-tone={/failed|unknown|held|input|disconnected|partial|unavailable/i.test(value)?'warn':/ready|published|saved|active|confirmed/i.test(value)?'good':'neutral'}>{words(value)}</span>;}
export function SourceNote({source,at,children}:{source:string;at?:string|null;children?:ReactNode}){return <details className={s.source}><summary>Source & coverage</summary><p>{source}{at&&<> · Read {timestamp(at)}</>}</p>{children}</details>;}
export function ExternalLink({href,children}:{href:string|null|undefined;children:ReactNode}){const url=safeLink(href);return url?<a className={s.link} href={url} target={url.startsWith('/')?undefined:'_blank'} rel='noreferrer'>{children}<ArrowUpRight size={16}/></a>:null;}
export function Refresh({onClick,loading=false}:{onClick:()=>void;loading?:boolean}){return <button className={s.iconButton} aria-label='Refresh records' onClick={onClick} disabled={loading}><RefreshCw size={20} className={loading?s.spinning:''}/></button>;}
export function Detail({title,onClose,children,actions}:{title:string;onClose:()=>void;children:ReactNode;actions?:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),previous=useRef<HTMLElement|null>(null);
 useEffect(()=>{const viewport=window.visualViewport;const resize=()=>{const d=ref.current;if(!d)return;if(window.innerWidth<760&&viewport){d.style.height=viewport.height+'px';d.style.top=viewport.offsetTop+'px';d.style.bottom='auto';}else{d.style.height='';d.style.top='';d.style.bottom='';}};resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);return()=>{viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize);};},[]);
 useEffect(()=>{const d=ref.current;if(!d)return;previous.current=document.activeElement as HTMLElement;d.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';const cancel=(e:Event)=>{e.preventDefault();onClose();};d.addEventListener('cancel',cancel);return()=>{d.removeEventListener('cancel',cancel);document.body.style.overflow=old;d.close();previous.current?.focus();};},[onClose]);
 return <dialog ref={ref} className={s.dialog} aria-label={title}><header className={s.detailHeader}><button className={s.iconButton} onClick={onClose} aria-label='Back'><ArrowLeft size={21}/></button><h2>{title}</h2><button className={s.iconButton} onClick={onClose} aria-label='Close detail'><X size={20}/></button></header><div className={s.detailBody}>{children}</div>{actions&&<footer className={s.detailActions}>{actions}</footer>}</dialog>;
}
export function MoneyChart({points,label}:{points:Array<{date:string;amountCents:number}>;label:string}){
 if(!points.length)return <div className={s.chartEmpty}><span>No verified trend for this period</span></div>;
 const max=Math.max(0,...points.map(p=>p.amountCents)),min=Math.min(0,...points.map(p=>p.amountCents)),range=max-min||1;
 const coords=points.map((p,i)=>`${12+i*576/Math.max(1,points.length-1)},${126-(p.amountCents-min)/range*112}`),path='M'+coords.join(' L');
 return <><svg className={s.chart} viewBox='0 0 600 150' role='img' aria-label={label}><defs><linearGradient id='founder-chart-fill' x1='0' y1='0' x2='0' y2='1'><stop stopColor='#ff6674' stopOpacity='.19'/><stop offset='1' stopColor='#ff6674' stopOpacity='0'/></linearGradient></defs>{[14,70,126].map(y=><line key={y} x1='12' x2='588' y1={y} y2={y} stroke='#34343b' strokeWidth='1'/>)}<path d={`${path} L588,140 L12,140 Z`} fill='url(#founder-chart-fill)'/><path d={path} fill='none' stroke='#ff8291' strokeWidth='3' vectorEffect='non-scaling-stroke'/></svg><div className={s.chartLabels}><span>{points[0]?.date}</span><span>Daily sales · {money(max)} max</span><span>{points.at(-1)?.date}</span></div><details className={s.source}><summary>View chart data</summary><div className={s.dataTable}>{points.map(p=><div key={p.date}><span>{p.date}</span><strong>{money(p.amountCents)}</strong></div>)}</div></details></>;
}
