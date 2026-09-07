// A role being registered or a switch being on is not proof of a live worker.
export type AgentRun = {
    department: string;
    status: string;
    created_at: string;
    finished_at?: string | null;
};
export type CrewStatus = {
    label: string;
    tone: "green" | "amber" | "quiet";
    detail: string;
};
export function crewStatus(id: string, input: {
    connected: boolean;
    fresh: boolean;
    configured: boolean;
    paused: boolean;
    runs: AgentRun[];
    queued: boolean;
    now?: number;
}): CrewStatus {
    if (!input.connected)
        return { label: "Checking", tone: "quiet", detail: "Checking this agent’s status." };
    if (!input.fresh)
        return { label: "Check connection", tone: "amber", detail: "The last update is out of date." };
    if (!input.configured)
        return { label: "Needs setup", tone: "amber", detail: "The AI connection is not ready yet." };
    if (input.paused)
        return { label: "Paused", tone: "quiet", detail: "Work is paused by the owner." };
    const latest = input.runs.filter(run => run.department === id).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (latest?.status === "running") {
        const age = (input.now ?? Date.now()) - Date.parse(latest.created_at);
        return Number.isFinite(age) && age >= 0 && age < 300000
            ? { label: "Working", tone: "green", detail: "Working on a saved request right now." }
            : { label: "Needs a check", tone: "amber", detail: "This run has not reported back on time." };
    }
    if (latest?.status === "failed")
        return { label: "Needs a check", tone: "amber", detail: "The last attempt did not finish." };
    if (input.queued)
        return { label: "Waiting", tone: "quiet", detail: "A request is saved and waiting to run." };
    return latest?.status === "completed"
        ? { label: "Ready for work", tone: "quiet", detail: "Finished its last request. Waiting for more work." }
        : { label: "Not tested yet", tone: "amber", detail: "Connected in settings; first successful run still needed." };
}
