import { departments, type Department } from "./policy";
import { workAssignments } from "../../owner/work-assignments";

export type MenuButtons = Array<Array<{ text: string; callback_data: string } | { text: string; url: string }>>;
export const agentNames: Record<Department,string> = {
  ceo:"👑 CEO", growth:"🚀 Growth", content:"🎨 Content", support:"💚 Support",
  affiliates:"🤝 Affiliates", analytics:"📊 Analytics", research:"🔎 Research", operations:"🛠 Operations",
};
export const centerLink = {text:"🏠 Open dashboard",url:"https://www.darthalgo.com/owner"};
export function homeMenu(): MenuButtons {
  return [
    ...Array.from({length:4},(_,i)=>departments.slice(i*2,i*2+2).map(d=>({text:agentNames[d],callback_data:`ui:agent:${d}`}))),
    [{text:"👀 Who’s working?",callback_data:"ui:nav:status"},{text:"✅ My decisions",callback_data:"ui:nav:approvals"}],
    [{text:"☀️ Daily brief",callback_data:"ui:nav:brief"},centerLink],
  ];
}
export function agentMenu(department: Department): MenuButtons {
  return [
    ...workAssignments[department].map(a=>[{text:`▶ ${a.title}`,callback_data:`ui:work:${department}:${a.id}`}]),
    [{text:"👀 Who’s working?",callback_data:"ui:nav:status"},{text:"👥 Change agent",callback_data:"ui:nav:agents"}],
    [centerLink],
  ];
}
// Menu callbacks select only a known role, known internal preset or read-only view.
// Approval decisions stay on their separate expiring os: token path.
export function menuAction(data: string | undefined): {command: string; department?: Department; assignmentId?: string} | null {
  const parts=data?.split(":") || [];
  if(parts[0]!=="ui") return null;
  if(parts.length===3 && parts[1]==="nav" && ["agents","status","approvals","brief"].includes(parts[2])) return {command:`/${parts[2]}`};
  const department=parts[2] as Department;
  if(!departments.includes(department)) return null;
  if(parts.length===3 && parts[1]==="agent") return {command:`/${department}`,department};
  if(parts.length===4 && parts[1]==="work" && workAssignments[department].some(a=>a.id===parts[3])) return {command:`/${department}`,department,assignmentId:parts[3]};
  return null;
}
export function naturalCommand(text:string) {
  const normalized=text.trim().toLowerCase().replace(/[?!]+$/g,"");
  if(["hi","hello","hey","help","menu","agents","home"].includes(normalized)) return "/agents";
  if(["status","who's working","who’s working","what's happening","what’s happening"].includes(normalized)) return "/status";
  if(["approvals","my decisions"].includes(normalized)) return "/approvals";
  if(["brief","daily brief"].includes(normalized)) return "/brief";
  const match=text.trim().match(/^(ceo|growth|content|support|affiliates|analytics|research|operations)(?:\s*[:,]\s*|\s+|$)(.*)$/i);
  return match ? `/${match[1].toLowerCase()}${match[2] ? ' '+match[2] : ''}` : text;
}
export function shortReply(text:string,limit=650) {
  const clean=text.replace(/^#{1,6}\s+/gm,"").replace(/\*\*/g,"").trim();
  if(clean.length<=limit) return clean;
  const cut=clean.slice(0,limit); const boundary=cut.lastIndexOf(" ");
  return `${cut.slice(0,boundary>limit/2 ? boundary : limit)}…\n\nThis is a preview. Open the dashboard for the full answer.`;
}
export function budgetMessage(reason?:string) {
  if(reason==="AI_DAILY_BUDGET_EXHAUSTED") return "Waiting for the daily AI allowance";
  if(reason==="AI_MONTHLY_BUDGET_EXHAUSTED") return "Waiting for the monthly AI allowance";
  if(reason==="AI_RECURRING_SPEND_NOT_APPROVED") return "Waiting for spending approval";
  return "AI allowance needs a check";
}
