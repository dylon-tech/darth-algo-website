import { db } from "../affiliate-db";
import { bufferStatus } from "./buffer";
import { createDeviceLink } from "./device-links";
import { syncContentApprovals } from "./content-handoff";
import { recurringBudgetAvailability } from "./budget";
import { departments, fingerprint, type Department } from "./policy";
import { queueJob, setPaused, workOneJob } from "./jobs";
import { decide } from "./service";
import { privateTelegramConfiguration, deliverOwnerNotices, telegramMethod } from "./delivery";
import type { OwnerUpdate } from "./telegram-policy";
import { mediaDashboard, researchDashboard } from "./telegram-media";
import { agentNames, agentMenu, homeMenu, agentsMenu, ideasMenu, backMenu, postsMenu, settingsMenu, resultMenu, replyPages, centerLink, homeButton, menuAction, naturalCommand, shortReply, budgetMessage, type MenuButtons } from "./telegram-ui";
import { workSummary } from "./work-summary";
import { ensureTelegramPanels, queuePanelReply } from "./telegram-panel";
import { ceoScorecard, ownerNeeds } from "./ceo-scorecard";
import { workAssignments, assignmentMessage } from "../../owner/work-assignments";

export async function recordOwnerUpdate(update: OwnerUpdate) {
  const sql=db();
  // Only whitelisted text and IDs from an authenticated private owner update
  // are retained; attachment bodies and arbitrary Telegram objects are dropped.
  const payload: OwnerUpdate = {update_id:update.update_id};
  if(update.message) payload.message={text:update.message.text?.slice(0,4000)};
  if(update.callback_query) payload.callback_query={id:update.callback_query.id,data:update.callback_query.data?.slice(0,64),...(Number.isSafeInteger(update.callback_query.message?.message_id) && update.callback_query.message!.message_id!>0?{message:{message_id:update.callback_query.message!.message_id}}:{})};
  await sql`insert into os_telegram_updates(update_id,payload) values(${update.update_id},${sql.json(payload)}) on conflict do nothing`;
}

async function handleUpdate(update: OwnerUpdate) {
  await ensureTelegramPanels();
  const sql=db(),owner=privateTelegramConfiguration().owner!;
  const [state]=await sql`select * from os_telegram_state where owner_id=${owner}`;
  let department=(state?.department || "ceo") as Department;
  const callback=update.callback_query,menu=menuAction(callback?.data);
  let newAgent=false,view=menu?.command.slice(1) || "chat",jobId:string|undefined;
  const notice=(text:string,buttons:MenuButtons=homeMenu())=>queuePanelReply({owner,key:`update:${update.update_id}`,text:text.startsWith("◆ DARTH ALGO")?text:`${agentNames[department]} · ${department==="ceo"?"COMMAND CENTER":"AGENT"}\n\n${text}`,buttons,department,view,messageId:callback?.message?.message_id,newAgent,jobId});
  if(callback?.id){try{await telegramMethod("answerCallbackQuery",{callback_query_id:callback.id});}catch{}}
  if(callback && !menu) {
    const match=callback.data?.match(/^os:([a-f0-9]{32})$/);
    const [action]=match?await sql`select * from os_callback_actions where id=${match[1]} and expires_at>now()`:[];
    if(!action){await notice("That button expired. Open Needs me for current decisions.");return;}
    const [approval]=await sql`select * from os_approvals where id=${action.approval_id}`;
    if(!approval || approval.status!=="pending" || fingerprint(approval.payload)!==action.payload_hash || approval.payload_hash!==action.payload_hash || new Date(approval.expires_at).getTime()<=Date.now()){
      await notice("This decision was already handled or expired.");return;
    }
    if(action.decision==="revision_requested") {
      await sql`insert into os_telegram_state(owner_id,revision_id,revision_hash) values(${owner},${approval.id},${approval.payload_hash}) on conflict(owner_id) do update set revision_id=excluded.revision_id,revision_hash=excluded.revision_hash`;
      await notice(`What should change?\n${shortReply(approval.payload.summary,160)}\n\nType your changes, or /cancel.`);
    }else{const result=await decide(approval.id,action.payload_hash,action.decision,"Owner Telegram decision");await notice(result.message);}
    return;
  }
  let text=menu?.command || update.message?.text?.trim();
  if(!text){await notice("Type a request or choose a button. File uploads aren’t supported here yet.");return;}
  if(state?.revision_id && menu?.department){await notice("Finish your revision, or send /cancel, before changing agents.");return;}
  if(!state?.revision_id)text=naturalCommand(text);
  const command=text.split(/\s+/)[0].split("@")[0].toLowerCase();
  if(command==="/cancel"){
    await sql`update os_telegram_state set revision_id=null,revision_hash=null where owner_id=${owner}`;
    await notice("Cancelled.");return;
  }
  if(state?.revision_id && !text.startsWith("/")){
    const result=await decide(state.revision_id,state.revision_hash,"revision_requested",text);
    await sql`update os_telegram_state set revision_id=null,revision_hash=null where owner_id=${owner}`;
    await notice(result.message);return;
  }
  const [panel]=await sql`select view from os_telegram_panels where owner_id=${owner}`;
  if(panel?.view==="suggest" && !text.startsWith("/"))text=`/suggest ${text}`;
  const routed=text.split(/\s+/)[0].toLowerCase();
  if(["/start","/help","/home","/brief"].includes(command)){
    department="ceo";view="home";const score=await ceoScorecard();await notice(score.body);return;
  }
  if(command==="/connect"){
    const link=await createDeviceLink("https://www.darthalgo.com");
    await telegramMethod("sendMessage",{chat_id:owner,protect_content:true,text:"Connect this browser once. On iPhone, open in Safari. The link expires in 24 hours.",reply_markup:{inline_keyboard:[[{text:"Connect browser",url:link.url}]]}});return;
  }
  if(command==="/lab"){const {indicatorDashboard}=await import("./indicator-lab");await notice(await indicatorDashboard());return;}
  if(command==="/health"){const {runtimeHealth}=await import("./runtime-health");const h=await runtimeHealth();await notice(["SYSTEM HEALTH",h.status,"Worker: "+(h.lastSeenAt||"unavailable"),"Waiting: "+h.queued,"Failed/uncertain (24h): "+h.failed,"Unconfirmed notices: "+h.unknownNotices,...h.issues].join("\n"));return;}
  if(command==="/agents"){await notice(`Choose who to work with.\nCurrent: ${agentNames[department]}`,agentsMenu());return;}
  if(command==="/posts" || command==="/queue"){await notice(await mediaDashboard(command==="/posts"?"today":"queue"),postsMenu());return;}
  if(command==="/researchview"){department="research";await notice(await researchDashboard(),agentMenu(department));return;}
  if(command==="/ideas"){await notice("Give Content a topic or choose a visual style. Your suggestions guide future posts.",ideasMenu());return;}
  if(routed==="/suggest"){
    const suggestion=text.slice(text.split(/\s+/)[0].length).trim();
    if(!suggestion){view="suggest";await notice("What should we make next?\nType your idea here.",backMenu());return;}
    await sql`insert into os_activity(actor,event,entity_id,details) values('owner','media_suggestion',${String(update.update_id)},${sql.json({text:suggestion.slice(0,1500)})})`;
    view="ideas";await notice("Saved. Content will use your idea in upcoming posts.",ideasMenu());return;
  }
  if(command==="/style" && menu?.style){
    await sql`insert into os_activity(actor,event,entity_id,details) values('owner','media_style_changed',${String(update.update_id)},${sql.json({style:menu.style})})`;
    await notice("Style saved for new graphics.",ideasMenu());return;
  }
  if(command==="/settings" || command==="/pause" || command==="/resume"){
    if(command!=="/settings")await setPaused(command==="/pause");
    const [control]=await sql`select paused from os_control where id=1`;
    await notice(`Agents: ${control?.paused?"paused":"on"}\nRoutine posts: automatic\nDaily briefing: 9 AM Eastern\n\n${control?.paused?"Started requests may still finish.":"New work runs within your existing budget."}`,settingsMenu(Boolean(control?.paused)));return;
  }
  if(command==="/status"){
    const jobs=await sql`select department,status,message,created_at,started_at from os_jobs where status in ('running','queued') or id in(select distinct on(department) id from os_jobs order by department,created_at desc) order by created_at desc`;
    const crew=departments.map(id=>{const work=workSummary(id,jobs as unknown as import("./work-summary").WorkJob[],true);return `${agentNames[id]} · ${work.label}`;}).join("\n");
    await notice(crew+"\n\nChoose an agent to see its work.",agentsMenu());return;
  }
  if(command==="/buffer"){
    try{const c=await bufferStatus();await notice(c.channels.map(c=>`${c.service}: ${c.displayName || c.name} · ${c.isDisconnected || c.isLocked || c.isQueuePaused?"needs attention":"connected"}`).join("\n")+"\n\nPublishing enabled: X + Instagram.",[[{text:"‹ Settings",callback_data:"ui:nav:settings"}]]);}
    catch{await notice("Social connection needs a check. Open dashboard Settings.",[[centerLink,homeButton]]);}return;
  }
  if(command==="/approvals"){
    const needs=await ownerNeeds();
    const lines=needs.approvals.slice(0,3).map(a=>`• Review: ${shortReply(String(a.payload.summary),120)}`);
    lines.push(...needs.failed.map(j=>`• ${agentNames[j.department as Department]}: inspect the last failed job.`));
    if(needs.blocked)lines.push(`• Operations: ${needs.blocked} blocked task${needs.blocked===1?'':'s'} to inspect.`);
    await notice(lines.length?lines.join("\n")+"\n\nRoutine posts need no approval. Review other proposals in the dashboard.":"You’re caught up. No decisions waiting.",[[{text:"Review decisions",url:"https://www.darthalgo.com/owner"},{text:"Ask Operations",callback_data:"ui:agent:operations"}],[homeButton]]);return;
  }
  if(command==="/result" || command==="/last"){
    const [job]=menu?.jobId?await sql`select j.*,r.result from os_jobs j left join os_runs r on r.id=j.run_id where j.id=${menu.jobId}`:await sql`select j.*,r.result from os_jobs j left join os_runs r on r.id=j.run_id where j.department=${menu?.department || department} order by j.created_at desc limit 1`;
    if(!job){await notice("No saved work yet. Choose a job to start.",agentMenu(department));return;}
    department=job.department as Department;jobId=job.id;
    if(!job.result?.brief){view="working";await notice(`Status: ${job.status}\n${shortReply(job.message,140)}`,[[{text:"Refresh",callback_data:`ui:result:${job.id}:0`}],[homeButton]]);return;}
    const pages=replyPages(job.result.brief),page=Math.min(menu?.page || 0,pages.length-1);view="result";
    await notice(`Result · ${page+1}/${pages.length}\n\n${pages[page]}`,resultMenu(department,job.id,page,pages.length));return;
  }
  const selected=command.startsWith("/")?command.slice(1):"";
  let message=text;
  if(departments.includes(selected as Department)){
    newAgent=department!==selected;department=selected as Department;
    message=text.slice(text.split(/\s+/)[0].length).trim();
    if(menu?.assignmentId){
      message=assignmentMessage(workAssignments[department].find(a=>a.id===menu.assignmentId)!);
      if(department==="content" && menu.assignmentId==="daily-content-engine")message="Suggest one fresh photo concept for our shared daily X, Instagram and Threads campaign. Return xDraft:null. Keep the brief short with one hook and one visual direction, using owned chart captures and a links-page CTA. The daily publisher creates the same images and caption for all three; community gets a confirmed-post preview. No video production or invented results.";
      if(department==="content" && menu.assignmentId==="content-week")message="Give the owner three fresh content ideas inspired by available competitor research. Each needs a short hook and one-sentence visual direction. Keep the whole deliverable below 600 characters. Return xDraft:null; this is an ideas request, not a publishing request.";
    }
    if(!message){view="agent";const [last]=await sql`select status,message from os_jobs where department=${department} order by created_at desc limit 1`;await notice(`You’re talking to ${agentNames[department]}.\n${last?`Last work: ${{queued:"waiting",running:"working",succeeded:"finished",failed:"needs a check",unknown:"needs a check",cancelled:"cancelled"}[last.status as string] || "saved"}.\n${shortReply(String(last.message).split("\n")[0],100)}`:"Ready for a task."}\n\nType a request or choose a job.`,agentMenu(department));return;}
  }else if(text.startsWith("/")){await notice("Choose a button below, or type your request.");return;}
  const [pending]=await sql`select id from os_jobs where department=${department} and message=${message} and status in ('queued','running') limit 1`;
  const job=pending || await queueJob(department,message,`telegram:${update.update_id}`,"telegram");
  jobId=job.id;view="working";
  const budget=await recurringBudgetAvailability();
  const [control]=await sql`select paused from os_control where id=1`;
  await notice(`${pending?"Already queued.":"Task saved."} ${control?.paused?"Resume agents to start.":!budget.available?budgetMessage(budget.reason):"This panel will show the result."}`,[[{text:"Check progress",callback_data:`ui:result:${job.id}:0`},{text:"Agent options",callback_data:`ui:agent:${department}`}],[homeButton]]);
}

export async function processOwnerUpdates() {
  const sql=db();
  // Serialize owner routing/revision state across concurrent webhook requests.
  for(let i=0;i<5;i++) {
    const update=await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(730918)`;
      const stale=await tx`update os_telegram_updates set status='failed' where status='processing' and processed_at<now()-interval '2 minutes' returning update_id`;
      for(const item of stale) await tx`insert into os_activity(actor,event,entity_id,details) values('operations','telegram_update_interrupted',${String(item.update_id)},'{"manualReviewRequired":true}'::jsonb)`;
      const [busy]=await tx`select update_id from os_telegram_updates where status='processing' limit 1`;
      if(busy) return null;
      const [next]=await tx`select update_id,payload from os_telegram_updates where status='queued' order by update_id for update skip locked limit 1`;
      if(next) await tx`update os_telegram_updates set status='processing',processed_at=now() where update_id=${next.update_id}`;
      return next;
    });
    if(!update) break;
    try {
      await handleUpdate(update.payload);
      await sql`update os_telegram_updates set status='processed',processed_at=now() where update_id=${update.update_id}`;
    } catch {
      await sql`update os_telegram_updates set status='failed',processed_at=now() where update_id=${update.update_id}`;
      await queuePanelReply({owner:privateTelegramConfiguration().owner!,key:`update-error:${update.update_id}`,text:"Command Center · This action needs a check. Open the dashboard before retrying a decision.",buttons:[[centerLink,homeButton]],department:"ceo",view:"error"});
    }
  }
}

export async function workAndNotify() {
  await processOwnerUpdates();
  await deliverOwnerNotices(1);
  const result=await workOneJob();
  try { await syncContentApprovals(); } catch { /* Completed work and owner inbox delivery continue; the cron recovers the handoff. */ }
  if(result.jobId) {
    const [run]=result.runId?await db()`select result from os_runs where id=${result.runId}`:[];
    const department=result.department as Department,owner=privateTelegramConfiguration().owner!;
    const [panel]=await db()`select * from os_telegram_panels where owner_id=${owner} and active_job_id=${result.jobId} and view='working'`;
    if(panel){
      const brief=run?.result?.brief;
      await queuePanelReply({owner,key:`job-result:${result.jobId}`,department,view:"result",jobId:result.jobId,expectedSession:panel.session_id,expectedRevision:Number(panel.revision),
        text:`${agentNames[department]} · ${brief?"RESULT":"NEEDS A CHECK"}\n\n${brief?shortReply(brief):"This job couldn’t finish. Open Last result for its status."}`,
        buttons:brief?[[{text:"Read result",callback_data:`ui:result:${result.jobId}:0`},{text:"Agent options",callback_data:`ui:agent:${department}`}],[homeButton]]:agentMenu(department)});
    }
    // Background completions and failures are covered by the scorecard/digest.
    // A result must never replace a different agent or a newer view.
  }
  await deliverOwnerNotices(1);
  return result;
}
