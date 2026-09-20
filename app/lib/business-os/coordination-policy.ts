import { departments, type Department } from "./policy";

import { revenueFocus, revenueGoals } from "./business-focus";

export const maxHandoffDepth = 3;
export const maxWorkflowTasks = 16;
export function coordinationEnabled() { return process.env.AI_OS_COORDINATION_ENABLED === "true"; }
export function handoffAllowed(from: Department, to: Department, depth: number, count: number) {
  return departments.includes(from) && departments.includes(to) && from !== to &&
    Number.isInteger(depth) && depth >= 0 && depth < maxHandoffDepth && count < maxWorkflowTasks;
}
export const reviewTarget: Partial<Record<Department, Department>> = {
  research: "growth", growth: "content", content: "operations", affiliates: "operations",
  support: "operations", analytics: "ceo", operations: "ceo",
};
export function seedAssignments(day: string) {
  return departments.map(department => ({ department, key: `coord:${day}:${department}`,
    message: `${revenueGoals[department]}\n\n${department === "content" ? "Prepare one useful, finished X text post in xDraft for the standing-authorized publishing workflow, using verified product facts. Avoid repeating recent drafts; use shared competitor findings as creative hypotheses, not product facts. " : ""}${department === "research" ? "Study competitor_public_posts, indicator_market public discovery/pricing/demand metadata, and the attached thumbnails when available. Separate observed needs and advertised prices from hypotheses. Identify high-view-rate candidates within each channel and comparable format/age; record exact source URLs, observed views, dates, hook, thumbnail hierarchy, typography, colors, topic and CTA when observable. Do not claim to watch videos from thumbnails. Deliver 3 original Darth Algo adaptations and a brief for Content, Growth and CEO. Copy successful patterns, not wording, footage, branding or unverified results. Call missing metrics unavailable, not zero. " : ""}${revenueFocus}\n\nUse verified business evidence and shared team results. Solve one actionable problem with a finished internal deliverable. If existing work already covers it or a dependency is blocked, report that briefly instead of generating another version. Identify unavailable tools explicitly and propose only necessary handoffs. No external business action is authorized by this assignment.` }));
}
