import type {DeskSnapshot, DeskAgent} from './desk-state';
export type Health = {rating:'Great'|'Good'|'Poor'|'Unknown';reason:string};
export type Issue = {id:string;department:string;title:string;reason:string;action:string;href:string;needsOwner:boolean};
export type Bill = {id:string;name:string;amountCents:number|null;cadence:'monthly'|'annual'|'weekly';status:'confirmed'|'estimated'|'unverified'|'inactive';source:string;verifiedAt:string|null;sourceUrl?:string;estimatedAt?:string};
export const monthlyCents=(bill:Bill)=>bill.amountCents===null?null:bill.amountCents*(bill.cadence==='annual'?1/12:bill.cadence==='weekly'?52/12:1);
export function expenseSummary(bills:Bill[],incomeCents:number|null){
 const active=bills.filter(b=>b.status!=='inactive');
 const known=active.filter(b=>(b.status==='confirmed'||b.status==='estimated')&&b.amountCents!==null);
 const estimated=known.filter(b=>b.status==='estimated');
 const subtotal=known.length?Math.round(known.reduce((n,b)=>n+(monthlyCents(b)||0),0)):null;
 return {monthlyCents:subtotal,estimated:estimated.length,estimatedCents:Math.round(estimated.reduce((n,b)=>n+(monthlyCents(b)||0),0)),missing:active.length-known.length,complete:active.length>0&&known.length===active.length&&estimated.length===0,ratio:subtotal!==null&&incomeCents!==null&&incomeCents>0?subtotal/incomeCents*100:null};
}
function recent(at:string|null|undefined,now:number,limit:number){const age=now-Date.parse(at||'');return Number.isFinite(age)&&age>=-30000&&age<limit;}
export function agentHealth(agent:DeskAgent,desk:DeskSnapshot,issues:Issue[],now=Date.now()):Health{
 if(!recent(desk.checkedAt,now,75000))return {rating:'Unknown',reason:'The live status check is out of date.'};
 if(desk.paused)return {rating:'Poor',reason:'Work is paused. Resume work in the controls to continue.'};
 if(!agent.configured||!desk.autonomy)return {rating:'Poor',reason:'The automatic worker or AI connection is not enabled.'};
 if(!recent(desk.scheduler?.lastSeenAt,now,300000))return {rating:'Unknown',reason:'The worker has not checked in within five minutes.'};
 if(desk.budget.available===false||desk.scheduler?.status==='budget_blocked')return {rating:'Poor',reason:'The existing AI spending allowance is blocking new work.'};
 const active=agent.current||agent.latest?.status==='running';
 const freshRun=recent(agent.current?.startedAt||agent.latest?.createdAt,now,300000);
 if(active&&!freshRun)return {rating:'Poor',reason:'The current request stopped reporting. Its outcome needs checking before retrying.'};
 const own=issues.filter(i=>i.department===agent.id||i.department==='all');
 const completed=recent(agent.completed?.finishedAt,now,36*3600000);
 if(own.length||agent.task?.status==='blocked'||agent.latest?.status==='failed')return {rating:completed||Boolean(active&&freshRun)?'Good':'Poor',reason:own[0]?.reason||agent.latest?.errorCode?.replaceAll('_',' ')||'A saved task is blocked. Open this agent for its next step.'};
 if(agent.next&&!recent(agent.next.createdAt,now,3600000))return {rating:'Good',reason:'An assignment has waited more than an hour.'};
 if(!completed&&!active)return {rating:'Unknown',reason:'No completed work was recorded in the last 36 hours.'};
 return {rating:'Great',reason:active?'Working on its saved assignment. No current blocker was found.':'Recent work completed and no current blocker was found.'};
}
export function systemHealth(agents:Health[],desk:DeskSnapshot|null,issues:Issue[],partial:string[]):Health{
 if(!desk||!agents.length)return {rating:'Unknown',reason:'The business worker records could not be read.'};
 if(desk.paused||!desk.autonomy||desk.budget.available===false)return {rating:'Poor',reason:desk.paused?'Agents are paused.':!desk.autonomy?'Automatic agent work is disabled.':'The spending allowance is blocking new agent work.'};
 if(agents.every(a=>a.rating==='Poor'))return {rating:'Poor',reason:'All agents are blocked. Open the cards below to see the recovery steps.'};
 if(agents.every(a=>a.rating==='Unknown'))return {rating:'Unknown',reason:'There is not enough fresh evidence to rate the system.'};
 if(partial.length||issues.length||agents.some(a=>a.rating!=='Great'))return {rating:'Good',reason:'Some work is moving, but the issues below still need attention.'};
 return {rating:'Great',reason:'All agents have recent work evidence and no current issues were found.'};
}
