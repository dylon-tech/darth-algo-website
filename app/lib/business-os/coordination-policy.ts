import { departments, type Department } from "./policy";

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
    message: `Prepare today's ${department} deliverable for Darth Algo using verified business evidence and shared team results. Produce useful finished internal work, identify unavailable tools explicitly, and propose only necessary handoffs. No external business action is authorized by this assignment.` }));
}
