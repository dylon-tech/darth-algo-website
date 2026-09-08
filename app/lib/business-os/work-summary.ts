export type WorkJob = { department: string; message: string; status: string; created_at: string; started_at?: string | null };
export function workSummary(department: string, jobs: WorkJob[], fresh: boolean, now = Date.now()) {
 const own = jobs.filter(j => j.department === department).sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at));
 const job = own.find(j => j.status === "running") || [...own].reverse().find(j => j.status === "queued") || own[0];
 if (!fresh) return { label: "Checking", title: "Waiting for a fresh update", tone: "amber" as const };
 if (!job) return { label: "No saved work", title: "No request recorded yet", tone: "quiet" as const };
 const age = now - Date.parse(job.started_at || "");
 const live = job.status === "running" && Number.isFinite(age) && age >= 0 && age < 300000;
 const label = live ? "Working" : job.status === "running" ? "Needs a check" : job.status === "queued" ? "Waiting" : job.status === "succeeded" ? "Last work finished" : job.status === "cancelled" ? "Cancelled" : "Needs a check";
 const firstLine = job.message.split(/\n/).find(line => line.trim()) || "Saved request";
 return { label, title: firstLine.length > 160 ? firstLine.slice(0,157) + "…" : firstLine, tone: live ? "green" as const : label === "Needs a check" ? "amber" as const : "quiet" as const };
}
