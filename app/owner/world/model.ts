import type {CeoHome} from '../../lib/business-os/ceo-home';
import type {DeskAgent} from '../../lib/business-os/desk-state';
import {monthlyCents} from '../../lib/business-os/ceo-home-model';
export const SNAPSHOT_TTL=90000;
export const RUN_TTL=300000;
export type RoomId='ceo'|'research'|'content'|'publishing'|'indicators'|'support'|'finance'|'operations';
export const rooms:Array<{id:RoomId;name:string;short:string;agents:string[];href:string;description:string}>=[
 {id:'ceo',name:'CEO Command Center',short:'Command',agents:['ceo'],href:'/owner?view=inbox',description:'Priorities, saved briefings and your decisions.'},
 {id:'research',name:'Research Lab',short:'Research',agents:['research'],href:'/owner/research',description:'Source findings and original recommendations.'},
 {id:'content',name:'Content Studio',short:'Studio',agents:['content'],href:'/owner?view=queue',description:'Real artwork, tracked revisions and content decisions.'},
 {id:'publishing',name:'Publishing Tower',short:'Publishing',agents:[],href:'/owner?view=queue',description:'Your existing 9 AM and 3 PM Eastern delivery workflow.'},
 {id:'indicators',name:'Indicator Workshop',short:'Indicators',agents:['indicator_builder'],href:'/owner/indicators',description:'Original drafts, protected Pine source and actual chart evidence.'},
 {id:'support',name:'Sales, Support & Retention',short:'Support',agents:['growth','support','affiliates'],href:'/owner/retention',description:'Saved cases and offers, with existing authorization gates.'},
 {id:'finance',name:'Finance Vault',short:'Finance',agents:['analytics'],href:'/owner?view=bills',description:'Sourced receipts, subscribing customers and confirmed bills.'},
 {id:'operations',name:'Automation & Engineering',short:'Engineering',agents:['operations'],href:'/owner/connections',description:'Worker observations, blockers and safe operating controls.'},
];
export type WorldStatus='Online'|'Offline'|'Needs approval'|'Blocked'|'Error'|'Stale / Unverified'|'Paused'|'Not configured';
export type WorldAgent={id:string;room:RoomId;name:string;status:WorldStatus;active:boolean;stage:string;jobId:string|null;runId:string|null;observedAt:string|null;errorCode:string|null;outputId:string|null};
export const recent=(at:string|null|undefined,now:number,ttl:number)=>{const age=now-Date.parse(at||'');return Number.isFinite(age)&&age>=-5000&&age<ttl;};
export function worldAgent(a:DeskAgent,data:CeoHome,fresh:boolean,now:number):WorldAgent{
 let status:WorldStatus='Offline',stage='Idle; no active job';
 const activeRun=a.latest?.status==='running',activeJob=a.current?.status==='running';
 const observed=activeRun?a.latest?.createdAt:activeJob?a.current?.startedAt:a.completed?.finishedAt;
 // In-flight work can finish while admission is paused. Do not conceal it.
 if(!fresh){status='Stale / Unverified';stage='Reconnect to verify activity';}
 else if(activeRun||activeJob){if(recent(observed,now,RUN_TTL)){status='Online';stage=(a.latest?.step||'Working on a saved request').replaceAll('_',' ');}else{status='Stale / Unverified';stage='Run exceeded its five-minute reporting window';}}
 else if(data.desk?.paused){status='Paused';stage='New work is paused';}
 else if(!a.configured){status='Not configured';stage='AI connection needs setup';}
 else if(a.latest?.status==='failed'){status='Error';stage=a.latest.errorCode?.replaceAll('_',' ')||'Latest run failed';}
 else if(a.task?.status==='blocked'||data.desk?.budget.available===false){status='Blocked';stage=data.desk?.budget.available===false?'Existing spending allowance reached':a.task?.title||'Dependency needs attention';}
 else if(data.suggestions.some(s=>s.department===a.id&&s.state==='pending')){status='Needs approval';stage='A saved proposal needs your decision';}
 else if(a.next||a.waiting){stage='Saved work queued';}
 return {id:a.id,room:rooms.find(r=>r.agents.includes(a.id))?.id||'operations',name:a.name,status,active:status==='Online',stage,jobId:a.current?.id||a.next?.id||null,runId:a.latest?.id||null,observedAt:observed||null,errorCode:a.latest?.errorCode||null,outputId:a.completed?.id||null};
}
export function growthGoal(cents:number|null){
 if(cents===null)return {targetCents:100000,level:0,fraction:null};
 let targetCents=100000,level=0;while(cents>=targetCents&&targetCents<Number.MAX_SAFE_INTEGER/3){targetCents*=3;level++;}
 return {targetCents,level,fraction:Math.max(0,Math.min(1,cents/targetCents))};
}
export function worldState(data:CeoHome,connected:boolean,now=Date.now()){
 const fresh=connected&&recent(data.checkedAt,now,SNAPSHOT_TTL)&&Boolean(data.desk)&&recent(data.desk?.checkedAt,now,SNAPSHOT_TTL);
 const agents=data.team.map(a=>worldAgent(a,data,fresh,now));
 const f=data.finances,confirmed=f?.bills.filter(b=>b.status==='confirmed'&&b.amountCents!==null)||[];
 const billsCents=confirmed.length?Math.round(confirmed.reduce((sum,b)=>sum+(monthlyCents(b)||0),0)):null;
 const missingBills=f?.bills.filter(b=>b.status!=='confirmed'&&b.status!=='inactive').length??null;
 const events=[...new Map((data.desk?.activity||[]).map(e=>[e.id,e])).values()].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,12);
 const health=!fresh?{rating:'Unknown',reason:'Live records are unavailable or stale.'}:data.desk?.paused?{rating:'Unknown',reason:'Work is intentionally paused. In-flight jobs can finish.'}:!recent(data.desk?.scheduler?.lastSeenAt,now,RUN_TTL)?{rating:'Unknown',reason:'The scheduler has not reported within five minutes.'}:data.health;
 return {fresh,agents,events,health,billsCents,missingBills,goal:growthGoal(f?.income.incomeCents??null)};
}
