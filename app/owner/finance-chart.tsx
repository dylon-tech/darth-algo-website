'use client';
import {useId,useState} from 'react';
import {ArrowUpRight,Users,Wallet} from 'lucide-react';
import type {CeoHome} from '../lib/business-os/ceo-home';
import styles from './business-home.module.css';

const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v/100);
const date=(at:string)=>new Date(at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
export default function FinanceChart({finances}:{finances:CeoHome['finances']}){
 const [metric,setMetric]=useState<'income'|'customers'>('income'),[days,setDays]=useState<7|30|90>(30),[selected,setSelected]=useState<number|null>(null);
 const gradient=useId().replaceAll(':',''),income=metric==='income';
 const source=income?finances?.income.history:finances?.customerHistory;
 const end=Date.parse(finances?.income.periodEnd||'')||Date.now(),start=end-days*86400000;
 const points=income?(source||[]).slice(-days):(source||[]).filter(p=>Date.parse(p.at)>start&&Date.parse(p.at)<=end+900000);
 const value=income?points.reduce((sum,p)=>sum+p.value,0):points.at(-1)?.value;
 const chosen=selected===null?null:points[Math.min(selected,points.length-1)];
 const format=(n:number)=>income?money(n):n.toLocaleString('en-US');
 const max=Math.max(1,...points.map(p=>p.value)),x=(at:string)=>24+Math.max(0,Math.min(1,(Date.parse(at)-start)/(end-start)))*672,y=(v:number)=>190-v/max*160;
 const path=points.map((p,i)=>`${i===0||(!income&&Date.parse(p.at)-Date.parse(points[i-1].at)>36*3600000)?'M':'L'}${x(p.at).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
 const switchMetric=(next:'income'|'customers')=>{setMetric(next);setSelected(null);};
 return <section className={styles.financeHero} aria-label='Income and customer analytics' data-metric={metric}>
  <div className={styles.heading}><div className={styles.segment} aria-label='Chart metric'><button aria-pressed={income} onClick={()=>switchMetric('income')}><Wallet size={15}/>Income</button><button aria-pressed={!income} onClick={()=>switchMetric('customers')}><Users size={15}/>Customers</button></div><span className={styles.liveDot}>STRIPE</span></div>
  <div className={styles.chartHeadline}><div><p>{income?`Income · last ${days} days`:'Active subscribers · latest observation'}</p><h2>{source&&value!==undefined?format(chosen?.value??value):'—'}</h2><span>{chosen?`${date(chosen.at)} · ${income?'24-hour receipts':'observed subscribers'}`:income?'Gross payments received, before costs':`${points.length} recorded day${points.length===1?'':'s'} in this range`}</span></div><span className={styles.chartEmblem}>{income?<ArrowUpRight size={28}/>:<Users size={28}/>}</span></div>
  {source&&points.length>0?<>
   <div className={styles.chartCanvas} onPointerMove={e=>{
    const box=e.currentTarget.getBoundingClientRect(),target=start+Math.max(0,Math.min(1,((e.clientX-box.left)/box.width*720-24)/672))*(end-start);
    let nearest=0;for(let i=1;i<points.length;i++)if(Math.abs(Date.parse(points[i].at)-target)<Math.abs(Date.parse(points[nearest].at)-target))nearest=i;
    setSelected(nearest);
   }} onPointerLeave={()=>setSelected(null)}>
    <svg viewBox='0 0 720 216' role='img' aria-label={`${income?'Daily USD income':'Recorded active subscribers'} for the last ${days} days. Use the slider below to inspect values.`}>
     <defs><linearGradient id={gradient} x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='currentColor' stopOpacity='.2'/><stop offset='100%' stopColor='currentColor' stopOpacity='0'/></linearGradient></defs>
     {[30,110,190].map((v,i)=><g key={v}><line x1='24' y1={v} x2='696' y2={v} stroke='currentColor' opacity='.08'/><text x='24' y={v-7} fill='currentColor' opacity='.5' fontSize='10'>{format(max*(1-i/2))}</text></g>)}
     {income&&<path d={`${path} L${x(points.at(-1)!.at)},190 L${x(points[0].at)},190 Z`} fill={`url(#${gradient})`}/>}
     <path d={path} fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'/>
     {!income&&points.map(p=><circle key={p.at} cx={x(p.at)} cy={y(p.value)} r='3.5' fill='currentColor'/>)}
     {chosen&&<g><line x1={x(chosen.at)} x2={x(chosen.at)} y1='20' y2='196' stroke='currentColor' opacity='.35' strokeDasharray='4 4'/><circle cx={x(chosen.at)} cy={y(chosen.value)} r='5' fill='currentColor' stroke='#151519' strokeWidth='3'/></g>}
    </svg>
    <div className={styles.chartDates}><span>{date(new Date(start).toISOString())}</span><span>{date(new Date(end).toISOString())} · UTC</span></div>
   </div>
   <label className={styles.scrubLabel}>Explore the chart<input type='range' aria-label='Explore chart dates' min={0} max={Math.max(0,points.length-1)} value={selected??points.length-1} onChange={e=>setSelected(Number(e.target.value))} aria-valuetext={`${date((chosen||points.at(-1)!).at)}, ${format((chosen||points.at(-1)!).value)}`}/></label>
  </>:<div className={styles.chartEmpty}><ActivityMark/><p>{source?'Customer history starts with your first recorded snapshot.':'Chart data is unavailable. It will appear after a successful financial check.'}</p></div>}
  <div className={styles.chartBottom}><span>{income?'Daily receipts · USD':points.length<2?'More observations will build your trend':'Observed counts · gaps are left open'}</span><div className={styles.ranges} aria-label='Chart period'>{([7,30,90] as const).map(n=><button key={n} aria-pressed={days===n} onClick={()=>{setDays(n);setSelected(null);}}>{n}D</button>)}</div></div>
  {points.length>0&&<details className={styles.chartTable}><summary>View exact values</summary><div><table><caption>{income?'Daily gross USD receipts':'Observed active subscribers'} · UTC</caption><thead><tr><th scope='col'>Date</th><th scope='col'>{income?'Income':'Customers'}</th></tr></thead><tbody>{points.map(p=><tr key={p.at}><td>{date(p.at)}</td><td>{format(p.value)}</td></tr>)}</tbody></table></div></details>}
 </section>;
}
function ActivityMark(){return <svg width='40' height='40' viewBox='0 0 40 40' aria-hidden='true'><path d='M3 25h8l6-15 8 24 5-14h7' fill='none' stroke='currentColor' strokeWidth='2'/></svg>;}
