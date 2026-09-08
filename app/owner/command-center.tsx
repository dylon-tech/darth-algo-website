"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Bot, Check, ChevronRight, CircleHelp, Heart, Home, LockKeyhole, MessageCircle, Pause, PenLine, Play, Rocket, Settings, ShieldCheck, Sparkles, Users, ChartNoAxesCombined } from "lucide-react";
import { crewStatus, type AgentRun } from "./agent-status";
import { workAssignments, assignmentMessage } from "./work-assignments";
import type { Evidence } from "../lib/business-os/sources";
import type { Department } from "../lib/business-os/policy";
import styles from "./owner.module.css";
import InstallApp from "./install-app";
type Agent = {
    id: Department;
    mandate: string;
    state: string;
};
type Task = {
    id: string;
    department: Department;
    title: string;
    status: string;
    priority: number;
    result?: string;
    result_kind?: string;
};
type Job = {
    id: string;
    department: Department;
    message: string;
    status: string;
    created_at: string;
    error_code?: string;
};
type Approval = {
    id: string;
    payload_hash: string;
    effective_status: string;
    expires_at: string;
    payload: {
        summary: string;
        details: string;
        kind: string;
        evidence: string[];
    };
};
type Message = {
    id: string;
    department: Department;
    role: string;
    body: string;
    created_at: string;
};
type Snapshot = {
    pilot?: { attempts: number; completed: number; maxUsd: number; reservedUsd: number; estimatedCompletedCostUsd: number };
    runs: Array<AgentRun & {
        id: string;
    }>;
    agents: Agent[];
    tasks: Task[];
    approvals: Approval[];
    jobs: Job[];
    activity: Array<{
        id: string;
        actor: string;
        event: string;
        created_at: string;
        entity_id?: string;
        details?: {
            department?: string;
            runId?: string;
            verifiedSources?: number;
            unavailableSources?: number;
        };
    }>;
    messages: Message[];
    briefs: Array<{
        day: string;
        body: string;
    }>;
    outbox: Array<{
        id: string;
        status: string;
        error_code?: string;
    }>;
    paused: boolean;
};
type Ready = {
    checkedAt: string;
    environment: string;
    dataScope: string;
    evidence: Evidence[];
    blockers: string[];
    store: {
        status: string;
        tablesPresent: boolean | null;
        missingTables: string[] | null;
    };
    ai: {
        enabled: boolean;
        credentialPresent: boolean;
        modelConfigured: boolean;
        connectivity: string;
    };
    configuration: Record<string, boolean>;
};
const names: Record<Department, string> = { ceo: "CEO", growth: "Growth", content: "Content", support: "Support", affiliates: "Affiliates", analytics: "Analytics", research: "Research", operations: "Operations" };
const missions: Record<Department, string> = { ceo: "Keeps the whole crew focused.", growth: "Finds ways to bring in customers.", content: "Creates things people want to read.", support: "Helps customers feel looked after.", affiliates: "Helps partners bring in referrals.", analytics: "Finds the story in your numbers.", research: "Looks for your next good idea.", operations: "Keeps everyday work organized." };
const colors: Record<Department, string> = { ceo: "purple", growth: "orange", content: "pink", support: "green", affiliates: "blue", analytics: "blue", research: "yellow", operations: "purple" };
const sourceNames: Record<string, string> = { growth_30d: "Website visits & clicks", affiliate_ledger: "Partner commissions", affiliate_applications: "Partner applications", stripe_subscriptions: "Stripe subscriptions", tradingview_fulfillment: "Customer access", content_workflows: "Content tools", support_cases: "Customer support", retention: "Customer retention", paid_conversion: "Sales attribution" };
const suggestions: Record<Department, Array<{
    title: string;
    message: string;
}>> = {
    ceo: [{ title: "What matters today?", message: "Review the business data you can actually access. What are our top three priorities today, and what needs my decision?" }, { title: "Win our next customer", message: "Suggest one practical next step to win a new customer. Use verified evidence, list missing information, and ask before spending or contacting anyone." }],
    growth: [{ title: "Find our next customer", message: "Use our verified acquisition data to suggest one customer acquisition experiment. Include how we would measure it and any approval needed." }, { title: "Improve conversion", message: "Where might we improve conversion? Separate evidence from ideas and tell me which tracking data is missing." }],
    content: [{ title: "Draft a useful post", message: "Draft one helpful Darth Algo post based on verified product information. Do not invent performance claims or publish it. Flag facts that need checking." }, { title: "Plan this week’s content", message: "Suggest three content ideas that could help a customer understand Darth Algo and take the next step. Prepare drafts for review only." }],
    support: [{ title: "Help a stuck customer", message: "Help me draft a helpful reply to a customer who is struggling to get started. Ask for any missing case details and do not assume you can see support tickets." }, { title: "Make setup easier", message: "Suggest ways to make customer onboarding simpler using available evidence. Identify unknowns and customer-sensitive changes that need approval." }],
    affiliates: [{ title: "Check partner activity", message: "Summarize the recorded affiliate applications and commission activity. Explain gaps. Do not authorize payouts or assume an empty result means zero referrals." }, { title: "Help partners sell", message: "Draft a useful partner message and a small referral improvement idea. Keep it for review; do not send or publish anything." }],
    analytics: [{ title: "Explain my numbers", message: "Explain the verified business numbers in plain English, including date range, source, and what cannot be concluded. Do not treat subscriptions as unique customers." }, { title: "What can’t we measure?", message: "Which important acquisition, conversion, retention, and referral metrics cannot we reliably measure yet? Prioritize the next data connection." }],
    research: [{ title: "Find a useful question", message: "Identify one valuable customer or market question we should research next, based on the available evidence. Describe how to verify it; do not invent web research." }, { title: "Test a new idea", message: "Propose one small business improvement hypothesis, explain the evidence and uncertainty, and define a test before we commit time or money." }],
    operations: [{ title: "What’s blocked?", message: "Review available tasks and evidence. What is blocked or unconnected, and what is the next safe step? Do not claim a system is healthy without a check." }, { title: "Save us time", message: "Identify one repetitive task we could automate using the systems we already have. Explain the missing connection, approval needs, and measurable benefit." }],
};
const eventNames: Record<string, string> = { job_queued: "Request saved", job_started: "Picked up the request", agent_run_started: "Started work", agent_reading_sources: "Checking business data", agent_sources_checked: "Business data checked", agent_preparing_response: "Preparing a response", agent_response_ready: "Response validated; saving work", task_queued: "Follow-up task saved", approval_requested: "Asked for your approval", agent_run_completed: "Response and work saved", job_completed: "Request finished", agent_run_failed: "Work stopped — needs a check", job_failed: "Request did not finish", job_cancelled: "Request cancelled", run_lease_expired: "Run stopped reporting", job_lease_expired: "Request stopped reporting" };
type Section = "Home" | "My agents" | "Approvals" | "Results" | "Messages" | "Settings";
const label = (text: string) => text.replaceAll("_", " ");
const time = (date: string) => new Date(date).toLocaleString();
export default function CommandCenter() {
    const [auth, setAuth] = useState<boolean | null>(null), [enabled, setEnabled] = useState(false), [section, setSection] = useState<Section>("Home");
    const [chatView, setChatView] = useState<"chat" | "work" | "assign">("chat");
    const [updatedAt, setUpdatedAt] = useState(0), [clock, setClock] = useState(Date.now());
    useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 15000); return () => clearInterval(timer); }, []);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [ready, setReady] = useState<Ready | null>(null), [department, setDepartment] = useState<Department>("ceo");
    const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [drafts, setDrafts] = useState<Partial<Record<Department, string>>>({});
    const message = drafts[department] || "";
    const setMessage = (value: string) => setDrafts(current => ({ ...current, [department]: value }));
    const [revision, setRevision] = useState<Record<string, string>>({});
    const read = useCallback(async (path: string) => {
        const response = await fetch(path, { cache: "no-store" });
        if (response.status === 401) {
            setAuth(false);
            throw new Error("This device needs to reconnect. Open a fresh private setup link.");
        }
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.message || data.error || "Request failed");
        return data;
    }, []);
    const refresh = useCallback(async () => {
        try {
            setSnapshot(await read("/api/owner/command"));
            setUpdatedAt(Date.now());
            setError("");
        }
        catch (e) {
            setError((e as Error).message);
        }
    }, [read]);
    const checkConnections = useCallback(async () => {
        try {
            setReady(await read("/api/owner/command?view=readiness"));
        }
        catch (e) {
            setError((e as Error).message);
        }
    }, [read]);
    useEffect(() => { fetch("/api/owner/session", { cache: "no-store" }).then(r => r.json()).then(data => { setAuth(data.authenticated); setEnabled(data.enabled); }).catch(() => { setAuth(false); setError("Could not check owner access."); }); }, []);
    useEffect(() => {
        if (!auth)
            return;
        void refresh();
        void checkConnections();
        const timer = setInterval(() => { if (document.visibilityState === "visible")
            void refresh(); }, section === "Messages" ? 5000 : 15000);
        const visible = () => { if (document.visibilityState === "visible")
            void refresh(); };
        document.addEventListener("visibilitychange", visible);
        return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
    }, [auth, refresh, checkConnections, section]);
    async function action(body: Record<string, unknown>) {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/owner/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const result = await response.json();
            if (response.status === 401)
                setAuth(false);
            if (!response.ok)
                throw new Error(result.message || result.error || "Action failed");
            setNotice(result.bot ? `Private bot @${result.bot.username || result.bot.id}: ${typeof result.webhook === "object" ? `${result.webhook.url ? "webhook configured" : "webhook not connected"}; ${result.webhook.pendingUpdates} pending updates` : "connection saved"}.` : result.message || (body.operation === "message" ? "Your request is saved. Watch here for a reply." : body.operation === "work" ? "Checking the next waiting request." : "Saved."));
            await refresh();
            if (body.operation === "initialize")
                await checkConnections();
            return true;
        }
        catch (e) {
            setError((e as Error).message);
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    async function logout() { await fetch("/api/owner/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "logout" }) }); setAuth(false); setSnapshot(null); setReady(null); }
    async function send(event: FormEvent) { event.preventDefault(); if (await action({ operation: "message", department, message, requestKey: crypto.randomUUID() }))
        setMessage(""); }
    const pending = snapshot?.approvals.filter(a => a.effective_status === "pending") || [];
    const configured = Boolean(ready?.ai.enabled && ready.ai.credentialPresent && ready.ai.modelConfigured);
    const fresh = updatedAt > 0 && clock - updatedAt < 45000;
    const agentState = (id: Department) => crewStatus(id, { connected: Boolean(snapshot && ready), fresh, configured, paused: snapshot?.paused ?? true, runs: snapshot?.runs || [], queued: Boolean(snapshot?.jobs.some(j => j.department === id && j.status === "queued")), now: clock });
    const working = (snapshot?.agents || []).filter(a => agentState(a.id).label === "Working").length;
    const tested = new Set(snapshot?.runs.filter(r => r.status === "completed").map(r => r.department) || []).size;
    const pilotFailed = snapshot?.runs.some(r => r.approved_pilot && r.status === "failed");
    const chat = (id: Department) => { setDepartment(id); setSection("Messages"); setChatView("chat"); setNotice(""); };
    const readSource = (id: string) => ready?.evidence.find(e => e.id === id && e.status === "verified");
    const subscriptions = readSource("stripe_subscriptions")?.data as {
        counts?: Record<string, number>;
        complete?: boolean;
    } | undefined;
    const growth = readSource("growth_30d")?.data as Array<{
        event_type: string;
        events: number;
    }> | undefined;
    const clicks = growth?.filter(row => row.event_type === "outbound_click").reduce((sum, row) => sum + Number(row.events), 0);
    const liveTitle = !snapshot || !ready ? "Checking on your crew…" : !fresh ? "Let’s check the connection." : working ? `${working} ${working === 1 ? "agent is" : "agents are"} working.` : !configured && pilotFailed ? "An agent needs a check." : !configured && tested ? `${tested} of 8 agents finished a test run.` : !configured ? "Your crew is getting ready." : snapshot.paused ? "Your crew is taking a break." : working ? `${working} ${working === 1 ? "agent is" : "agents are"} working.` : "Your crew is waiting for work.";
    const summary = !ready ? "Getting the latest status." : !configured && (working || tested || pilotFailed) ? "Starter-test replies are saved in Messages. Routine work and automatic daily tasks are not enabled yet." : !configured ? "All 8 roles are built. Your saved requests will run when setup and a work allowance are ready." : snapshot?.paused ? "Resume when you’re ready for work to continue." : ready.configuration.autonomyEnabled ? "Daily work is enabled. The agents run when a request or scheduled check starts." : "Agents can handle requests. Automatic daily work is not switched on yet.";
    const selectedTasks = snapshot?.tasks.filter(t => t.department === department) || [];
    const currentTask = selectedTasks.find(t => t.status === "in_progress") || selectedTasks.find(t => ["queued", "blocked"].includes(t.status));
    const departmentJobs = snapshot?.jobs.filter(j => j.department === department) || [];
    const departmentEvents = (snapshot?.activity || []).filter(a => a.actor === department || a.details?.department === department || departmentJobs.some(j => j.id === a.entity_id) || snapshot?.runs.some(r => r.department === department && r.id === a.entity_id));
    const prompts = [...(currentTask ? [{ title: "About my current task", message: `Give me a progress update on this task: ${currentTask.title}. Tell me what is done, what is blocked, and what happens next.` }] : []), ...suggestions[department]];
    const actionable = Boolean(snapshot && configured && fresh && !snapshot.paused);
    if (auth === null)
        return <main id="main-content" className={styles.login}><div className={styles.loginCard}><Bot size={40}/><h1>Opening your HQ…</h1></div></main>;
    if (!auth)
        return <main id="main-content" className={styles.login}><div className={styles.loginCard}><div className={styles.eyebrow}><LockKeyhole size={16}/> JUST FOR YOU</div><h1>Darth Algo<span>Your crew. One little HQ.</span></h1><p>Open your private setup link to connect this device once. After that, just open your dashboard.</p><p className={styles.muted}>New phone or browser? Ask for a fresh setup link.</p>{!enabled && <p>Owner access is not switched on here yet.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}<small>No passcode or passkey to type.</small></div></main>;
    return <main id="main-content" className={styles.shell}><div className={styles.main}>
    <header className={styles.topbar}><button className={styles.brand} onClick={() => setSection("Home")} aria-label="Darth Algo home"><span className={styles.mark}>DA<span>✦</span></span><span>Darth Algo<small>Your pixel headquarters</small></span></button><button aria-label="Settings and help" onClick={() => setSection("Settings")}><Settings size={21}/></button></header>
    <nav className={styles.nav} aria-label="Your dashboard">{([{ name: "Home", icon: Home }, { name: "My agents", icon: Users }, { name: "Messages", icon: MessageCircle }, { name: "Approvals", icon: ShieldCheck }, { name: "Results", icon: ChartNoAxesCombined }] as const).map(item => <button key={item.name} aria-current={section === item.name ? "page" : undefined} className={section === item.name ? styles.selected : ""} onClick={() => setSection(item.name)}><item.icon size={20}/><span>{item.name}</span>{item.name === "Approvals" && pending.length > 0 && <b>{pending.length}</b>}</button>)}</nav>
    {ready?.environment === "preview" && <p className={styles.preview}>Preview · Your crew is still being set up.</p>}
    {error && <div className={styles.error} role="alert">{error}<button onClick={() => { void refresh(); void checkConnections(); }}>Check again</button></div>}
    {notice && <div className={styles.notice} role="status"><Check size={18}/>{notice}<button aria-label="Dismiss update" onClick={() => setNotice("")}>×</button></div>}

    {section === "Home" && <>
      <section className={styles.hero}><div className={styles.heroCopy}><span className={styles.eyebrow}>DARTH ALGO • OWNER MODE</span><h1>You’re the boss.<br /><span>Your crew awaits.</span></h1><p>A small team with one big job: helping Darth Algo grow.</p><button className={styles.primary} onClick={() => chat("ceo")}><MessageCircle size={21}/>Talk to my CEO<ArrowUpRight size={19}/></button></div><div className={styles.crewArt} aria-hidden="true"><span className={styles.starOne}>✦</span><div className={styles.robot}><PixelCrew /><span>CEO</span></div><div className={styles.satellite}><Rocket size={28}/></div><div className={styles.satelliteTwo}><Heart size={25}/></div><span className={styles.starTwo}>✦</span><span className={styles.orbitLabel}>YOUR CREW • YOUR CALL</span></div></section>
      <section className={styles.crewHealth} aria-label="Current team status"><div className={`${styles.healthIcon} ${working && fresh ? styles.green : styles.amber}`}><Bot size={29}/></div><div><h2>{liveTitle}</h2><p>{summary}</p></div><button onClick={() => setSection("My agents")}>See my crew<ChevronRight size={18}/></button></section>
      {snapshot?.pilot && snapshot.pilot.attempts > 0 && <section className={styles.panel}><h2>First mission: {snapshot.pilot.completed} of 8 runs finished</h2><p>Open Messages to read each agent’s work.</p><small>Estimated AI cost for completed work: ${snapshot.pilot.estimatedCompletedCostUsd.toFixed(4)} · Approved test limit: ${snapshot.pilot.maxUsd.toFixed(2)}. This is a usage estimate, not a billing statement.</small></section>}
      <div className={styles.quickGrid}>
        <button className={`${styles.quickCard} ${styles.purple}`} onClick={() => setSection("My agents")}><Users size={30}/><strong>My agents</strong><p>{snapshot && ready && fresh ? `${working} working now · ${snapshot.agents.length} in your crew` : "Check on everyone"}</p><span>Meet the team<ChevronRight size={19}/></span></button>
        <button className={`${styles.quickCard} ${styles.orange}`} onClick={() => setSection("Approvals")}><ShieldCheck size={30}/><strong>Needs my OK</strong><p>{!snapshot || !fresh ? "Checking your decisions…" : pending.length ? `${pending.length} ${pending.length === 1 ? "decision needs" : "decisions need"} you` : "Nothing waiting for your OK"}</p><span>Take a look<ChevronRight size={19}/></span></button>
        <button className={`${styles.quickCard} ${styles.green}`} onClick={() => setSection("Results")}><ChartNoAxesCombined size={30}/><strong>Business results</strong><p>See what your real numbers say</p><span>Show my numbers<ChevronRight size={19}/></span></button>
      </div>
      <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>YOUR DAILY CATCH-UP</span><h2>Your daily mission note</h2></div><Sparkles size={24}/></div>{snapshot?.briefs[0] ? <><p className={styles.muted}>{String(snapshot.briefs[0].day).slice(0, 10)}</p><pre className={styles.prose}>{snapshot.briefs[0].body}</pre></> : <p>No daily update yet. You can check the connected business numbers now.</p>}<button disabled={busy || !snapshot} onClick={() => action({ operation: "brief" })}>Check today’s numbers<ArrowUpRight size={17}/></button></section>
      <InstallApp />
    </>}

    {section === "My agents" && <><div className={styles.pageTitle}><span className={styles.eyebrow}>EIGHT ROLES. ONE TEAM.</span><h1>Meet your crew</h1><p>Tap anyone to talk. Green means they’re working right now.</p></div><div className={styles.agentGrid}>{(Object.keys(names) as Department[]).map(id => { const state = agentState(id); return <article className={styles.agentCard} key={id}><button className={styles.agentOpen} onClick={() => chat(id)}><div className={styles.panelHeading}><span className={`${styles.avatar} ${styles[colors[id]]}`}><PixelCrew role={id}/></span><Status value={state.label} tone={state.tone}/></div><h2>{names[id]}{id === "ceo" && <small>Team captain</small>}</h2><p>{missions[id]}</p><p className={styles.stateDetail}>{state.detail}</p><span className={styles.cardLink}>Talk to {names[id]}<MessageCircle size={18}/></span></button><button className={styles.giveWork} onClick={() => { setDepartment(id); setSection("Messages"); setChatView("assign"); }}>Give work<ArrowUpRight size={17}/></button></article>; })}</div><section className={styles.panel}><h2>What the crew can do today</h2><p>The crew can review connected numbers, write drafts and suggest next steps. Finished starter-test replies appear in Messages; routine work still needs to be enabled. Tools for publishing, refunds, and customer changes still need connecting.</p><p>You’ll be asked before spending money or making sensitive changes.</p></section></>}

    {section === "Messages" && <><div className={styles.pageTitle}><span className={styles.eyebrow}>YOUR CREW IS ONE TAP AWAY</span><h1>Messages</h1><p>Pick a character. Ask a question. Watch the work.</p></div><div className={styles.inbox}><aside className={styles.contacts} aria-label="Agent conversations">{(Object.keys(names) as Department[]).map(id => { const latest = snapshot?.messages.find(m => m.department === id); return <button key={id} aria-pressed={department === id} className={department === id ? styles.contactSelected : ""} onClick={() => { setDepartment(id); setChatView("chat"); }}><span className={`${styles.avatar} ${styles[colors[id]]}`}><PixelCrew role={id}/></span><span><b>{names[id]}</b><small>{latest?.body || missions[id]}</small><em>{agentState(id).label}</em></span></button>; })}</aside><div className={styles.inboxMain}><section className={styles.conversation}><div className={styles.chatHeader}><div className={styles.chatIdentity}><span className={`${styles.avatar} ${styles[colors[department]]}`}><PixelCrew role={department}/></span><div><h1>{names[department]}</h1><p>{missions[department]}</p></div></div><Status value={agentState(department).label} tone={agentState(department).tone}/></div><div className={styles.chatTabs}><button aria-pressed={chatView === "chat"} onClick={() => setChatView("chat")}><MessageCircle size={17}/>Messages</button><button aria-pressed={chatView === "assign"} onClick={() => setChatView("assign")}><Rocket size={17}/>Give work</button><button aria-pressed={chatView === "work"} onClick={() => setChatView("work")}><Play size={17}/>Watch work</button></div>{chatView === "chat" ? <><div className={styles.messages} role="log" aria-label={`${names[department]} conversation`}>{!snapshot?.messages.some(m => m.department === department) && !departmentJobs.some(j => j.status === "queued") && <div className={styles.empty}><MessageCircle size={35}/><h2>What shall we work on?</h2><p>{department === "ceo" ? "Try: What should we focus on to win our next customer?" : `Give ${names[department]} one thing to focus on.`}</p></div>}{[...(snapshot?.messages || [])].filter(m => m.department === department).reverse().map(m => <article key={m.id} className={m.role === "owner" ? styles.ownerMessage : styles.agentMessage}><small>{m.role === "owner" ? "You" : names[department]} · {time(m.created_at)}</small><p>{m.body}</p></article>)}{departmentJobs.filter(j => j.status === "queued").slice().reverse().map(j => <article className={styles.ownerMessage} key={j.id}><small>You · {time(j.created_at)} · Saved, waiting to run</small><p>{j.message}</p></article>)}</div><div className={styles.suggestions}><small>QUICK MESSAGES · TAP TO EDIT, THEN SEND</small><div>{prompts.map(prompt => <button key={prompt.title} onClick={() => setMessage(prompt.message)}>{prompt.title}<ArrowUpRight size={15}/></button>)}</div></div><form onSubmit={send} className={styles.composer}><label htmlFor="crew-message">Your message</label><textarea id="crew-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} placeholder={`Hey ${names[department]}, can you help me with…`} required/><div><p>{!configured ? "AI isn’t connected yet. You can save a request for later." : snapshot?.paused ? "The crew is paused. Your request will wait." : "Your reply appears here when the work finishes."}</p><button className={styles.primary} disabled={busy || !snapshot || !message.trim()}>{actionable ? "Send message" : "Save for later"}<ArrowUpRight size={19}/></button></div></form></> : chatView === "assign" ? <div className={styles.assignmentBoard}><h2>Give {names[department]} a job</h2><p>Pick one. The full assignment is already written.</p>{!actionable && <p className={styles.preview}>{!configured ? "AI setup is not finished. Tasks you give now will be saved and wait for activation." : snapshot?.paused ? "The crew is paused. These tasks will wait until work resumes." : "Checking the connection. Your saved tasks stay in the work list."}</p>}<div className={styles.assignmentGrid}>{workAssignments[department].map(assignment => <article key={assignment.id}><span className={styles.eyebrow}>READY-MADE JOB</span><h3>{assignment.title}</h3><p>{assignment.outcome}</p><details><summary>See the assignment</summary><p>{assignment.instruction}</p></details><button disabled={busy || !snapshot || departmentJobs.some(j => ["queued","running"].includes(j.status) && j.message===assignmentMessage(assignment))} onClick={async () => { if(await action({operation:"message", department, message:assignmentMessage(assignment), requestKey:crypto.randomUUID()}))setChatView("work"); }}>{departmentJobs.some(j => ["queued","running"].includes(j.status) && j.message===assignmentMessage(assignment)) ? "Already assigned" : actionable ? "Give this work" : "Save this task"}<ArrowUpRight size={17}/></button></article>)}</div><button className={styles.customWork} onClick={() => setChatView("chat")}><PenLine size={17}/>Write my own assignment</button><p className={styles.muted}>Drafts and analysis stay private. Spending, publishing, and sensitive customer actions need your OK.</p></div> : <div className={styles.workScreen}><div className={styles.screenTop}><span>LIVE WORK WINDOW</span><Status value={!fresh ? "Connection needs a check" : working && agentState(department).label === "Working" ? "Working now" : agentState(department).label} tone={agentState(department).tone}/></div><div className={styles.workStage}><div className={`${styles.deskCharacter} ${styles[colors[department]]}`}><PixelCrew role={department}/></div><div><h2>{agentState(department).detail}</h2><p>{currentTask?.title || departmentJobs.find(j => j.status === "running")?.message || "No task is running right now."}</p><small>{updatedAt ? `Last checked ${new Date(updatedAt).toLocaleTimeString()}` : "Checking…"} · Updates every 5 seconds while open</small></div></div><div className={styles.processLog}>{!departmentEvents.length ? <p>No work steps recorded yet. Real updates appear here when this agent starts a request.</p> : [...departmentEvents].slice(0, 30).reverse().map(event => <article key={event.id}><time>{new Date(event.created_at).toLocaleTimeString()}</time><div><b>{eventNames[event.event] || label(event.event)}</b>{event.event === "agent_sources_checked" && <p>{event.details?.verifiedSources ?? "—"} sources checked successfully · {event.details?.unavailableSources ?? "—"} unavailable</p>}</div></article>)}</div><p className={styles.screenNote}>Follow recorded work steps here. Finished replies and drafts appear in Messages and the work list below.</p></div>}</section><section className={styles.panel}><h2>{names[department]}’s work</h2>{!snapshot?.jobs.some(j => j.department === department) && <p>No requests saved yet.</p>}{snapshot?.jobs.filter(j => j.department === department).slice(0, 6).map(j => <div className={styles.listItem} key={j.id}><div><p>{j.message}</p><small>{time(j.created_at)} · {label(j.status)}{j.error_code && " · This needs a check"}</small></div>{j.status === "queued" && <button disabled={busy} onClick={() => action({ operation: "cancel_job", id: j.id })}>Cancel</button>}</div>)}{snapshot?.tasks.filter(t => t.department === department).map(t => <details className={styles.task} key={t.id}><summary>{t.title}<small>{label(t.status)}</small></summary>{t.result && <pre className={styles.prose}>{t.result}</pre>}{["queued", "blocked"].includes(t.status) && <button disabled={busy || !actionable} onClick={() => action({ operation: "run_task", id: t.id, requestKey: crypto.randomUUID() })}>Work on this</button>}</details>)}</section>

        </div></div></>}

    {section === "Approvals" && <><div className={styles.pageTitle}><span className={styles.eyebrow}>YOU HAVE THE FINAL SAY</span><h1>Needs your OK</h1><p>Check a suggestion. Say yes, ask for a change, or say no.</p></div><section className={styles.panel}>{!snapshot ? <p>Checking your decisions…</p> : !pending.length && <div className={styles.empty}><ShieldCheck size={42}/><h2>You’re all caught up.</h2><p>No decisions waiting for you.</p></div>}{snapshot?.approvals.map(a => <article className={styles.approval} key={a.id}><div className={styles.panelHeading}><small>{label(a.payload.kind)}</small><Status value={label(a.effective_status)}/></div><h2>{a.payload.summary}</h2><pre className={styles.prose}>{a.payload.details}</pre><details><summary>Why this was suggested</summary><p>{a.payload.evidence.map(id => sourceNames[id] || label(id)).join(", ")}</p><small>Decision expires {time(a.expires_at)}</small></details>{a.effective_status === "pending" && <><label>Anything you’d like changed?<textarea aria-label={`Note for ${a.payload.summary}`} value={revision[a.id] || ""} onChange={e => setRevision({ ...revision, [a.id]: e.target.value })} maxLength={2000} placeholder="Optional, unless you want a change"/></label><div className={styles.buttonRow}>{([['approved', 'Yes, approve'], ['revision_requested', 'Make a change'], ['declined', 'No thanks']] as const).map(([decision, text]) => <button key={decision} disabled={busy || (decision === "revision_requested" && !revision[a.id]?.trim())} onClick={() => action({ operation: "decide", id: a.id, payloadHash: a.payload_hash, decision, note: revision[a.id] || "Owner Command Center decision" })}>{text}</button>)}</div></>}</article>)}<p className={styles.muted}>Approvals are saved. These actions won’t be carried out until their business tools are connected.</p></section></>}

    {section === "Results" && <><div className={styles.pageTitle}><span className={styles.eyebrow}>REAL NUMBERS. PLAIN ENGLISH.</span><h1>How’s business?</h1><p>{ready ? `Last checked ${time(ready.checkedAt)}` : "Checking your connected numbers…"}</p><button disabled={busy} onClick={checkConnections}>Update numbers</button></div><div className={styles.metricGrid}><Metric caption="Active subscriptions" value={subscriptions?.complete ? subscriptions.counts?.active ?? 0 : "—"} detail="From your whole Stripe account. Subscriptions, not unique customers."/><Metric caption="Website link clicks" value={clicks ?? "—"} detail={`Last 30 days. Clicks do not mean purchases.${ready?.environment === "preview" ? " From the preview database copy." : ""}`}/><Metric caption="Sales from those clicks" value="—" detail="Not connected yet. We won’t guess."/></div>{ready?.environment === "preview" && <p className={styles.preview}>Stripe is checked live. Website and partner records come from a database copy while this is in preview.</p>}<section className={styles.panel}><h2>Where the numbers come from</h2>{ready?.evidence.map(e => <details className={styles.source} key={e.id}><summary><span>{sourceNames[e.id] || label(e.id)}</span><Status value={e.status === "verified" ? "Connected" : "Not connected"} tone={e.status === "verified" ? "green" : "amber"}/></summary><p>{e.scope}</p>{e.status === "verified" && <DataView data={e.data}/>}</details>)}</section></>}

    {section === "Settings" && <><div className={styles.pageTitle}><span className={styles.eyebrow}>THE LITTLE EXTRAS</span><h1>Settings & help</h1><p>Everything you need less often lives here.</p></div><InstallApp /><section className={styles.panel}><h2>Your crew’s setup</h2><p>Every agent needs the app’s AI connection and business tools. Account access from this chat is not automatically shared with the crew.</p><div className={styles.listItem}><span>Business editing tools</span><Status value="Not connected" tone="amber"/></div><div className={styles.listItem}><span>AI connection</span><Status value={!ready ? "Checking" : tested ? "Verified by completed work" : configured ? "Configured · needs a real run" : ready.ai.credentialPresent ? "Key saved · routine work off" : "Needs setup"} tone={configured ? "quiet" : "amber"}/></div><div className={styles.listItem}><span>Automatic daily work</span><Status value={!ready ? "Checking" : ready.configuration.autonomyEnabled ? "Switched on" : "Not switched on"}/></div><div className={styles.listItem}><span>Private Telegram</span><Status value={!ready ? "Checking" : ready.configuration.privateTelegramEnabled ? "Switched on · check connection" : "Needs setup"}/></div><div className={styles.buttonRow}><button disabled={busy || !snapshot || (!configured && snapshot.paused)} onClick={() => action({ operation: "pause", paused: !snapshot?.paused })}>{snapshot?.paused ? <Play size={17}/> : <Pause size={17}/>} {snapshot?.paused ? "Resume crew" : "Pause crew"}</button><button onClick={() => { void refresh(); void checkConnections(); }}>Check setup again</button></div><p className={styles.muted}>Pausing stops new work. Any request already sent to an outside service may finish.</p></section><details className={styles.panel}><summary>Work history</summary>{!snapshot?.activity.length && <p>No activity recorded yet.</p>}{snapshot?.activity.map(a => <div className={styles.listItem} key={a.id}><div><p>{label(a.event)}</p><small>{names[a.actor as Department] || label(a.actor)} · {time(a.created_at)}</small></div></div>)}</details><details className={styles.panel}><summary>Advanced setup</summary><p>{ready?.dataScope}</p><div className={styles.buttonRow}><button disabled={busy || ready?.store.tablesPresent !== false} onClick={() => action({ operation: "initialize" })}>Set up work storage</button><button disabled={busy || !actionable} onClick={() => action({ operation: "work" })}>Start next waiting request</button><button disabled={busy || !snapshot} onClick={() => action({ operation: "telegram_check" })}>Check Telegram</button><button disabled={busy || !ready?.configuration.privateTelegramEnabled} onClick={() => action({ operation: "telegram_connect" })}>Connect private bot</button><button disabled={busy || !ready?.configuration.privateTelegramEnabled} onClick={() => action({ operation: "deliver" })}>Send waiting owner notices</button></div>{ready && Object.entries(ready.configuration).map(([key, value]) => <div className={styles.listItem} key={key}><span>{label(key.replace(/([A-Z])/g, " $1"))}</span><Status value={value ? "Set" : "Not set"}/></div>)}{snapshot?.outbox.filter(x => x.status === "unknown").map(x => <p key={x.id}>An owner notice has unconfirmed delivery. Check Telegram before trying again.</p>)}</details><section className={styles.panel}><h2>This is your private space</h2><p>Your customer Telegram community stays separate. This device remembers you until you disconnect or its session expires.</p><button onClick={logout}><LockKeyhole size={17}/>Disconnect this device</button></section></>}
    <footer className={styles.footer}><span><Sparkles size={15}/> Small steps. A stronger business.</span><button onClick={() => setSection("Settings")}><CircleHelp size={17}/>Help & settings</button></footer>
  </div></main>;
}
function Metric({ caption, value, detail }: {
    caption: string;
    value: string | number;
    detail: string;
}) { return <article className={styles.metric}><span>{caption}</span><strong>{value}</strong><p>{detail}</p></article>; }
function Status({ value, tone = "quiet" }: {
    value: string;
    tone?: "green" | "amber" | "quiet";
}) { return <span className={`${styles.status} ${styles[tone]}`}><span aria-hidden="true">●</span>{value}</span>; }
function DataView({ data }: {
    data: unknown;
}) { if (Array.isArray(data)) {
    if (!data.length)
        return <p>No records found in this source.</p>;
    const keys = Object.keys(data[0] || {});
    return <div className={styles.tableScroll}><table><thead><tr>{keys.map(k => <th key={k}>{label(k)}</th>)}</tr></thead><tbody>{data.map((row, i) => <tr key={i}>{keys.map(k => <td key={k}>{String(row[k] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
} return <pre className={styles.prose}>{JSON.stringify(data, null, 2)}</pre>; }
function PixelCrew({ role = "ceo" }: {
    role?: Department;
}) {
    const bodies: Record<Department, string> = {
        ceo: "M9 2h6v2h3v3h2v13h2v2H2v-2h2V7h2V4h3z",
        growth: "M3 2h4v3h10V2h4v16h-3v3H6v-3H3zM7 21h3v2H7zM14 21h3v2h-3z",
        content: "M3 3h3v2h3v2h6V5h3V3h3v15h-3v3H6v-3H3zM7 21h3v2H7zM14 21h3v2h-3z",
        support: "M7 4h10v2h3v3h2v8h-2v3h-3v2H7v-2H4v-3H2V9h2V6h3z",
        affiliates: "M2 5h8v2h2v11h-2v3H2v-3H0V7h2zM15 3h6v2h3v13h-3v3h-6v-3h-2V5h2z",
        analytics: "M5 3h14v3h2v13h-2v2H5v-2H3V6h2zM1 8h2v7H1zM21 8h2v7h-2zM6 21h4v2H6zM14 21h4v2h-4z",
        research: "M11 1h3v3h2v3h2v3h3v3h-2v6h-3v3H8v-3H5v-6H2v-3h3V7h3V4h3z",
        operations: "M6 4h12v2h3v4h2v3h-2v7h-3v2H6v-2H3v-7H1v-3h2V6h3z"
    };
    return <svg className={styles.pixelCrew} viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d={bodies[role]}/>{role === "affiliates" ? <><path fill="#fff9e9" d="M2 9h8v7H2zM15 7h7v8h-7z"/><path fill="#30263f" d="M3 10h2v2H3zM7 10h2v2H7zM16 8h2v2h-2zM20 8h1v2h-1zM4 14h4v1H4zM17 13h3v1h-3z"/></> : <><path fill="#fff9e9" d={role === "research" ? "M7 13h10v5H7z" : "M6 9h12v8H6z"}/><path fill="#30263f" d={role === "support" ? "M7 10h2v1h1v2H9v1H8v-1H7zM14 10h2v1h1v2h-1v1h-1v-1h-1zM10 15h4v1h-4z" : role === "analytics" ? "M6 10h5v3H6zM13 10h5v3h-5zM11 11h2v1h-2zM10 15h4v1h-4z" : role === "research" ? "M8 14h2v2H8zM14 14h2v2h-2z" : role === "content" ? "M7 11h3v1H7zM14 10h2v3h-2zM10 15h4v1h-4z" : "M8 10h2v3H8zM14 10h2v3h-2zM10 15h4v1h-4z"}/></>}{role === "ceo" && <><path fill="#45304f" d="M6 17h12v2H6zM8 19h8v2H8z"/><path fill="#f6c35c" d="M6 3h2v2h3V2h2v3h3V3h2v4H6z"/></>}{role === "growth" && <path fill="#ffd897" d="M4 3h2v3H4zM18 3h2v3h-2zM10 17h4v3h-4z"/>}{role === "content" && <path fill="#ee91b5" d="M4 5h2v3H4zM18 5h2v3h-2zM3 14h3v1H3zM18 14h3v1h-3z"/>}{role === "research" && <path fill="#fff3c7" d="M11 6h2v2h2v2h-2v2h-2v-2H9V8h2zM8 18h8v2h-2v2h-4v-2H8z"/>}{role === "operations" && <><path fill="#f6c35c" d="M6 4h12v3h3v2H3V7h3z"/><path fill="#fff9e9" d="M11 3h2v5h-2zM8 18h2v2H8zM12 18h2v2h-2zM16 18h2v2h-2z"/></>}</svg>;
}
