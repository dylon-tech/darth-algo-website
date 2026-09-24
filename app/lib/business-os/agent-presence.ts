import type {DeskAgent} from './desk-state';
export type Presence = {label:'Online'|'Offline'|'Unknown';active:boolean;step:string;warning:string|null};
const steps:Record<string,string>={agent_run_started:'Starting work',agent_reading_sources:'Checking sources',agent_sources_checked:'Sources checked',agent_preparing_response:'Creating the draft',agent_response_ready:'Saving the result'};
const recent=(value:string|null|undefined,now:number)=>{const age=now-Date.parse(value||'');return Number.isFinite(age)&&age>=-5000&&age<300000;};
/** Presence describes work, never merely a configured integration or a live scheduler. */
export function agentPresence(agent:DeskAgent,fresh:boolean,now=Date.now()):Presence {
 if(!fresh)return {label:'Unknown',active:false,step:'Refresh to check',warning:'Live status is unavailable'};
 if(agent.latest?.status==='running')return recent(agent.latest.createdAt,now)
  ?{label:'Online',active:true,step:steps[agent.latest.step||'']||'Working on the request',warning:null}
  :{label:'Unknown',active:false,step:'Run stopped reporting',warning:'Check this run before retrying'};
 if(agent.current?.status==='running')return recent(agent.current.startedAt,now)
  ?{label:'Online',active:true,step:'Picking up the request',warning:null}
  :{label:'Unknown',active:false,step:'Request stopped reporting',warning:'Check this request before retrying'};
 return {label:'Offline',active:false,step:agent.next||agent.waiting?'Work queued':agent.completed?'Ready for more work':'No active request',warning:agent.latest?.status==='failed'?'Last request failed':!agent.configured?'Connection needs setup':null};
}
export function shortWork(value:string|null|undefined,limit=100):string {
 const text=(value||'').replace(/^\[[^\]]+\]\s*/,'').replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();
 return text.length>limit?text.slice(0,limit-1).trimEnd()+'…':text;
}
