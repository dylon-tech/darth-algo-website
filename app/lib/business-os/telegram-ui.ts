import { departments, type Department } from "./policy";
import { workAssignments } from "../../owner/work-assignments";
export type MenuButtons=Array<Array<{text:string;callback_data:string}|{text:string;url:string}>>;
export const agentNames:Record<Department,string>={ceo:"👑 CEO",growth:"🚀 Growth",content:"🎨 Content",support:"💚 Support",affiliates:"🤝 Affiliates",analytics:"📊 Analytics",research:"🔎 Research",indicator_builder:"🧪 Indicator Builder",operations:"🛠 Operations"};
export const centerLink={text:"Website dashboard",url:"https://www.darthalgo.com/owner"};
export const connectButton={text:"Connect browser",callback_data:"ui:nav:connect"};
export const homeButton={text:"‹ CEO desk",callback_data:"ui:nav:home"};
export function homeMenu():MenuButtons{return [
 [{text:"🧪 Indicator Lab",callback_data:"ui:nav:lab"},{text:"🩺 Health",callback_data:"ui:nav:health"}],
 [{text:"☀ Overview",callback_data:"ui:nav:brief"},{text:"👥 My team",callback_data:"ui:nav:agents"}],
 [{text:"🗓 Posts",callback_data:"ui:nav:posts"},{text:"🔔 Needs me",callback_data:"ui:nav:approvals"}],
 [{text:"💡 Ideas",callback_data:"ui:nav:ideas"},{text:"⚙ Settings",callback_data:"ui:nav:settings"}],
];}
export function backMenu():MenuButtons{return [[homeButton]];}
export function postsMenu():MenuButtons{return [[{text:"Today",callback_data:"ui:nav:posts"},{text:"Upcoming",callback_data:"ui:nav:queue"}],[homeButton]];}
export function settingsMenu(paused=false):MenuButtons{return [[{text:paused?"▶ Resume agents":"⏸ Pause agents",callback_data:paused?"ui:nav:resume":"ui:nav:pause"},{text:"Connections",callback_data:"ui:nav:buffer"}],[centerLink,connectButton],[homeButton]];}
export function agentsMenu():MenuButtons{return [...Array.from({length:Math.ceil(departments.length/2)},(_,i)=>departments.slice(i*2,i*2+2).map(d=>({text:agentNames[d],callback_data:`ui:agent:${d}`}))),[{text:"🧪 Indicator Builder",callback_data:"ui:nav:lab"}],[{text:"Live work",callback_data:"ui:nav:status"},homeButton]];}
const quick:Record<Department,Array<[string,string]>>={
 ceo:[["today-plan","Choose our next move"],["growth-review","Find the main problem"]],
 growth:[["acquisition-test","Find customer ideas"],["signup-friction","Improve signups"]],
 content:[["daily-content-engine","Create a post"],["content-week","Suggest fresh ideas"]],
 support:[["onboarding-checklist","Improve onboarding"],["support-replies","Draft a reply"]],
 affiliates:[["partner-review","Check partners"],["partner-kit","Make a starter kit"]],
 analytics:[["numbers-brief","Explain our numbers"],["content-scorecard","Review post results"]],
 indicator_builder:[["draft-review","Review current drafts"]],
 research:[["competitor-intelligence","Study competitors"],["audience-map","Find our audience"]],
 operations:[["blocker-review","Check blockers"],["access-checklist","Check access process"]],
};
export function agentMenu(department:Department):MenuButtons{return [quick[department].map(([id,text])=>({text,callback_data:`ui:work:${department}:${id}`})),[{text:"Last result",callback_data:`ui:last:${department}`},{text:"Change agent",callback_data:"ui:nav:agents"}],[homeButton]];}
export function ideasMenu():MenuButtons{return [[{text:"Add my idea",callback_data:"ui:nav:suggest"},{text:"Get ideas",callback_data:"ui:work:content:content-week"}],[{text:"Red",callback_data:"ui:style:crimson"},{text:"Purple",callback_data:"ui:style:minimal"},{text:"Gold",callback_data:"ui:style:clean"}],[homeButton]];}
export function resultMenu(department:Department,jobId:string,page=0,total=1):MenuButtons{
 const rows:MenuButtons=[];
 if(total>1)rows.push([...(page>0?[{text:"‹ Previous",callback_data:`ui:result:${jobId}:${page-1}`}]:[]),...(page<total-1?[{text:page===0?"More ›":"Next ›",callback_data:`ui:result:${jobId}:${page+1}`}]:[])]);
 rows.push([{text:"Agent options",callback_data:`ui:agent:${department}`},homeButton]);return rows;
}
export function menuAction(data:string|undefined):{command:string;department?:Department;assignmentId?:string;style?:string;jobId?:string;page?:number}|null {
 const p=data?.split(":") || [];
 if(p[0]!=="ui")return null;
 if(p.length===3 && p[1]==="nav" && ["lab","health"].includes(p[2]))return {command:`/${p[2]}`};
 if(p.length===3 && p[1]==="nav" && ["home","agents","status","approvals","brief","buffer","connect","posts","queue","ideas","suggest","researchview","pause","resume","settings"].includes(p[2]))return {command:`/${p[2]}`};
 if(p.length===3 && p[1]==="style" && ["crimson","minimal","clean"].includes(p[2]))return {command:"/style",style:p[2]};
 if(p.length===4 && p[1]==="result" && /^[a-f0-9-]{36}$/.test(p[2]) && /^\d{1,2}$/.test(p[3]))return {command:"/result",jobId:p[2],page:Number(p[3])};
 const department=p[2] as Department;if(!departments.includes(department))return null;
 if(p.length===3 && p[1]==="last")return {command:"/last",department};
 if(p.length===3 && p[1]==="agent")return {command:`/${department}`,department};
 if(p.length===4 && p[1]==="work" && workAssignments[department].some(a=>a.id===p[3]))return {command:`/${department}`,department,assignmentId:p[3]};
 return null;
}
export function naturalCommand(text:string){
 const n=text.trim().toLowerCase().replace(/[?!]+$/g,"");
 if(["hi","hello","hey","help","menu","home"].includes(n))return "/home";
 if(n==="agents")return "/agents";
 if(["lab","indicator lab","indicators"].includes(n))return "/lab";
 if(["posts","today’s posts","today's posts"].includes(n))return "/posts";
 if(["queue","upcoming posts"].includes(n))return "/queue";
 if(["status","who's working","who’s working","what's happening","what’s happening"].includes(n))return "/status";
 if(["approvals","my decisions"].includes(n))return "/approvals";
 if(["buffer","x connection"].includes(n))return "/buffer";
 if(["brief","daily brief"].includes(n))return "/brief";
 if(["connect dashboard","connect my phone"].includes(n))return "/connect";
 const m=text.trim().match(/^(ceo|growth|content|support|affiliates|analytics|research|operations)(?:\s*[:,]\s*|\s+|$)(.*)$/i);
 return m?`/${m[1].toLowerCase()}${m[2]?' '+m[2]:''}`:text;
}
export function cleanReply(text:string){return text.replace(/^#{1,6}\s+/gm,"").replace(/\*\*/g,"").replace(/\[(?:[a-z][a-z0-9_]*(?:,\s*|\]))+/g,"").replace(/\n{3,}/g,"\n\n").trim();}
export function shortReply(text:string,limit=360){const clean=cleanReply(text);if(clean.length<=limit)return clean;const cut=clean.slice(0,limit);const end=Math.max(cut.lastIndexOf(". ")+1,cut.lastIndexOf("\n"));return `${cut.slice(0,end>limit/2?end:cut.lastIndexOf(" ")>0?cut.lastIndexOf(" "):limit).trim()}…`;}
export function replyPages(text:string){const clean=cleanReply(text),pages:string[]=[];let rest=clean;while(rest.length){let end=Math.min(800,rest.length);if(end<rest.length){const cut=rest.slice(0,end);end=Math.max(cut.lastIndexOf("\n"),cut.lastIndexOf(" ")) || end;}pages.push(rest.slice(0,end).trim());rest=rest.slice(end).trim();}return pages.length?pages:["No result saved yet."];}
export function budgetMessage(reason?:string){return reason==="AI_DAILY_BUDGET_EXHAUSTED"?"Waiting for today’s AI allowance":reason==="AI_MONTHLY_BUDGET_EXHAUSTED"?"Waiting for this month’s AI allowance":"AI allowance needs a check";}
