import {summarizeAgentMessage} from './founder-inbox-summary';

/** Presentation only. Does not change any agent's authority, tools, or budget. */
export const ownerReportStyle = `Owner-message style: simple and straight to the point.
Start the brief with two short lines:
Result: one plain-English sentence stating what is actually finished, blocked, or still unverified.
Next: one concrete next action and who takes it. Say no action is needed only when the evidence supports that.
Aim for 55 words or fewer across those two lines. Keep every material failed, unknown, partial, pending, approval, or spending condition in the opening even when that requires a few more words. Do not call an uncertain outcome failed or safe to retry.
Then use Details: for the complete requested deliverable, evidence, source references, dates, and technical notes. Retain the actual draft, checklist, or analysis there; brevity must not replace it with a plan. Avoid repeated summaries, internal IDs, and implementation jargon in the opening.`;

/** The full brief remains stored; only the owner's completion notice is shortened. */
export function ownerReportPreview(brief: string) {
  const summary = summarizeAgentMessage(brief);
  return `Result: ${summary.result}\nNext: ${summary.action || 'Open the saved result for details.'}`;
}
