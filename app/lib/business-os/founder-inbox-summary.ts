export type FounderInboxSummary = {
  result: string;
  action: string | null;
  actionLabel: 'Next' | 'Your action';
  basis: 'source_fields' | 'message_excerpt';
};

const actionLabel = /^(?:your (?:next )?action|next action|action needed|next step|next|action|needs you)\s*:\s*/i;
const resultLabel = /^(?:result|outcome|summary|status|what happened)\s*:\s*/i;
const technicalLine = /^(?:version|hash|sha(?:256)?|source|checked at|read at|run(?: id)?|job(?: id)?|provider receipt|https?:\/\/|[a-z_]+_id)\s*[:=]/i;
const qualifier = /\b(?:failed|failures?|errors?|blocked|unavailable|unknown|unverified|unconfirmed|unsuccessful|rejected|denied|cancelled|canceled|missing|incomplete|partial|partially|pending|awaiting|not|no|only|approval|spending|budget|synthetic|simulated|mock|sample|could not|cannot|can’t|can't)\b/i;
const sectionHeading = /^(?:summary|result|outcome|status|update|agent update|report|details):?$/i;

function plain(value: string) {
  return value.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/, '')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();
}
function lines(value: string) {
  let fenced = false;
  return value.split(/\r?\n/).flatMap(line => {
    if (/^\s*```/.test(line)) {fenced = !fenced; return [];}
    if (fenced) return [];
    const clean = plain(line);
    return clean && !technicalLine.test(clean) && !/^https?:\/\//i.test(clean) ? [clean] : [];
  });
}
function sentences(value: string) {
  return value.match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) || [];
}
function shortResult(value: string, fallback = 'An update is available.') {
  const candidates = sentences(plain(value).replace(resultLabel, ''));
  const first = candidates[0] || '';
  const cautions = candidates.filter(sentence => qualifier.test(sentence));
  // A benign early "No errors" must not hide a later "Publication unverified".
  // Include every limiting statement, or withhold the abbreviated outcome.
  const chosen = Array.from(new Set([first, ...cautions].filter(Boolean))).join(' ');
  return chosen && chosen.length <= 240 ? {result: chosen, reviewOriginal: false} : {result: fallback, reviewOriginal: true};
}
function shortAction(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const action = plain(value).replace(actionLabel, '');
  // Do not remove a prerequisite or caution from a multi-sentence action.
  return action.length <= 180 ? action || null : 'Open the full update for the next step.';
}

/** Uses named source fields. It does not infer execution or a provider result. */
export function summarizeBusinessAlert(input: {result: string; ownerAction?: string | null; nextStep?: string | null}): FounderInboxSummary {
  const brief = shortResult(input.result, 'An alert needs review.');
  return {result: brief.result, action: brief.reviewOriginal ? 'Open the full update before taking action.' : shortAction(input.ownerAction || input.nextStep), actionLabel: input.ownerAction ? 'Your action' : 'Next', basis: 'source_fields'};
}

/** Literal excerpts only: no model call, new instruction, or inferred success. */
export function summarizeAgentMessage(body: string): FounderInboxSummary {
  const all = lines(body);
  const actions: string[] = [];
  const results: string[] = [];
  let nextLineIsAction = false;
  for (const line of all) {
    if (sectionHeading.test(line)) {nextLineIsAction = false;continue;}
    if (nextLineIsAction) {const action = shortAction(line);if (action) actions.push(action);nextLineIsAction = false;continue;}
    if (actionLabel.test(line)) {const action = shortAction(line);if (action) actions.push(action);nextLineIsAction = !action;continue;}
    if (/^(?:your action|next action|next step|action needed|needs you)$/i.test(line)) {nextLineIsAction = true; continue;}
    results.push(line.replace(resultLabel, ''));
  }
  const resultText = results.join(' ');
  const brief = shortResult(resultText), distinctActions = Array.from(new Set(actions));
  const action = brief.reviewOriginal || distinctActions.length > 1 ? 'Open the full update before taking action.' : distinctActions[0] || null;
  return {result: brief.result, action, actionLabel: 'Next', basis: 'message_excerpt'};
}

export function inboxSummaryFor(item: {category: string; body: string; summary?: FounderInboxSummary | null}): FounderInboxSummary | null {
  // Customer wording is never algorithmically rewritten into an agent summary.
  if (item.category === 'customer') return null;
  return item.summary || summarizeAgentMessage(item.body);
}
