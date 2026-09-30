// Read-only lessons from existing run records. No message bodies, credentials,
// customer identities, new storage, external writes or retry authorization.
export type MemoryRun = { id: string; department: string; status: string; error_code: string | null; finished_at: string | Date | null };
const allowedDepartments = new Set(['ceo','growth','content','support','affiliates','analytics','research','indicator_builder','operations']);
const knownCodes = new Set(['CEO_RUN_FAILED','AI_INPUT_LIMIT','AI_INCOMPLETE','AI_EMPTY_OUTPUT','X_DRAFT_CONTENT_ONLY','RUN_LEASE_EXPIRED_OR_PAUSED','DAILY_RUN_LIMIT','Invalid X draft','Invalid CEO output','Invalid task or evidence','Invalid proposal or evidence']);
function safeCode(code: string | null): string {
  if (code && (knownCodes.has(code) || /^AI_PROVIDER_(401|403|429|400|404|500|502|503)(_(insufficient_quota|invalid_api_key|model_not_found|unsupported_parameter|rate_limit_exceeded))?$/.test(code))) return code;
  // Do not retain arbitrary upstream error text, even when it resembles a code.
  if (code && /^AI_(BUDGET|DAILY_BUDGET|MONTHLY_BUDGET|RECURRING_SPEND)_[A-Z_]{1,50}$/.test(code)) return 'AI_BUDGET_GUARD';
  return 'UNCLASSIFIED_FAILURE';
}
export function operatingMemory(rows: readonly MemoryRun[], now = Date.now(), limit = 500) {
  const cutoff = now - 7 * 86400000;
  const seen = new Set<string>();
  const valid = rows.filter(row => {
    const at = row.finished_at ? new Date(row.finished_at).getTime() : NaN;
    if (!/^[a-f0-9-]{36}$/i.test(row.id) || seen.has(row.id) || !allowedDepartments.has(row.department) || !['failed','completed'].includes(row.status) || !Number.isFinite(at) || at < cutoff || at > now) return false;
    seen.add(row.id); return true;
  }).sort((a,b)=>new Date(b.finished_at!).getTime()-new Date(a.finished_at!).getTime());
  const sample = valid.slice(0, limit);
  const groups = new Map<string, {department:string;code:string;count:number;lastSeen:string;runIds:string[];laterInternalCompletion:boolean}>();
  for (const row of sample) {
    if (row.status !== 'failed') continue;
    const code = safeCode(row.error_code), key = `${row.department}:${code}`;
    const at = new Date(row.finished_at!).toISOString();
    const group = groups.get(key) || {department:row.department,code,count:0,lastSeen:at,runIds:[],laterInternalCompletion:sample.some(r=>r.department===row.department && r.status==='completed' && new Date(r.finished_at!).getTime()>new Date(row.finished_at!).getTime())};
    group.count++; if (group.runIds.length<3) group.runIds.push(row.id);
    groups.set(key,group);
  }
  const repeated = [...groups.values()].filter(g=>g.count>=2).sort((a,b)=>b.count-a.count || b.lastSeen.localeCompare(a.lastSeen));
  return {version:'operating-memory-v1',periodStart:new Date(cutoff).toISOString(),periodEnd:new Date(now).toISOString(),sampledRuns:sample.length,coverage:rows.length>limit?'latest_500_only':'available_7d_records',repeated:repeated.slice(0,8),omittedGroups:Math.max(0,repeated.length-8),limitation:'Saved internal runs only. Repeated codes may have different causes. Later internal completion is not provider recovery. No failures in this sample is not proof of business health. Diagnose before another attempt; never replay uncertain external actions.'};
}
