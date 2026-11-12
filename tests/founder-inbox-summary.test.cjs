const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/business-os/founder-inbox-summary.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports:exportsObject});
const {summarizeAgentMessage,summarizeBusinessAlert,inboxSummaryFor} = exportsObject;

let summary = summarizeAgentMessage('# Summary\nResult: Draft saved.\nVideo rendering is not connected.\nNext action: Connect the existing renderer.\nRun ID: private-technical-id');
assert.equal(summary.result, 'Draft saved. Video rendering is not connected.');
assert.equal(summary.action, 'Connect the existing renderer.');
assert.doesNotMatch(summary.result + summary.action, /private-technical-id/);

summary = summarizeAgentMessage('Instagram published. Threads outcome is unknown.\nNext: Check the provider before retrying.');
assert.match(summary.result, /Instagram published/); assert.match(summary.result, /Threads outcome is unknown/);
assert.equal(summary.action, 'Check the provider before retrying.');
assert.equal(summarizeAgentMessage('The update is pending.').result, 'The update is pending.');
assert.equal(summarizeAgentMessage('The post was not published.').result, 'The post was not published.');
assert.equal(summarizeAgentMessage('No failures were reported.').result, 'No failures were reported.');
assert.equal(summarizeAgentMessage('Ready for review, not confirmed.').result, 'Ready for review, not confirmed.');

summary = summarizeBusinessAlert({result:'The last attempt failed.',ownerAction:'Reconnect the account. Then verify the pending post.',nextStep:'Retry after confirmation.'});
assert.equal(summary.result,'The last attempt failed.');assert.equal(summary.action,'Reconnect the account. Then verify the pending post.');assert.equal(summary.actionLabel,'Your action');
summary = summarizeBusinessAlert({result:'A task is blocked.',nextStep:'Operations will check the existing job.'});
assert.equal(summary.actionLabel,'Next');assert.equal(summary.action,'Operations will check the existing job.');

summary = summarizeAgentMessage('## Next step\nReview the exact draft.\n## Result\nThe reply is saved.\n```json\n{"secret":"not summary content"}\n```');
assert.equal(summary.action,'Review the exact draft.');assert.equal(summary.result,'The reply is saved.');
assert.equal(summarizeAgentMessage('A'.repeat(400)+' not confirmed.').result,'An update is available.','Long text cannot lose a qualifying phrase through truncation');
assert.equal(summarizeAgentMessage('Saved.\nNo owner action was requested.').action,null,'Missing action is not invented');
assert.equal(summarizeAgentMessage('Scheduled for tomorrow. This is a synthetic example.').result,'Scheduled for tomorrow. This is a synthetic example.');
assert.equal(summarizeAgentMessage('Outcome unknown.\nNext: Reconcile the prior attempt. Retry only after a confirmed failure.').action,'Reconcile the prior attempt. Retry only after a confirmed failure.');
summary = summarizeAgentMessage('No errors were found in the draft. Publication is unverified. Next action: Check the saved provider result.');
assert.match(summary.result,/No errors/);assert.match(summary.result,/Publication is unverified/,'A later material limitation survives an earlier benign qualifier');
summary = summarizeAgentMessage('Instagram published. Threads failed. X outcome is unknown.');
assert.match(summary.result,/Threads failed/);assert.match(summary.result,/X outcome is unknown/,'All short material outcomes are retained');
summary = summarizeAgentMessage('The draft is ready. The provider returned an error. Publication was rejected.');
assert.match(summary.result,/returned an error/);assert.match(summary.result,/Publication was rejected/,'Provider errors and rejection cannot disappear behind a successful draft result');
assert.equal(summarizeAgentMessage('Result: Report saved.\nNext:\nDetails:\nThe report has three sections.').action,null,'A missing next action cannot consume a Details heading as an instruction');
summary = summarizeAgentMessage('The draft is saved. '+Array.from({length:8},(_,i)=>`Destination ${i+1} is unverified and requires a separate result check.`).join(' ')+'\nNext: Publish again.');
assert.equal(summary.result,'An update is available.');assert.equal(summary.action,'Open the full update before taking action.','Long mixed outcomes never become an unconditional retry instruction');
summary = summarizeAgentMessage('Outcome unknown.\nNext: Retry now.\nAction needed: Do not retry until reconciliation.');
assert.equal(summary.action,'Open the full update before taking action.','Conflicting next actions require reviewing the original');
assert.equal(inboxSummaryFor({category:'customer',body:'My original words are a question, not a request to cancel.',summary:{result:'Wrong rewrite',action:null}}),null,'Customer text never uses an agent-generated summary');
assert.equal(inboxSummaryFor({category:'agent',body:'Saved report.'}).result,'Saved report.');
console.log('PASS concise Inbox summaries: literal source results/actions, qualifier preservation, technical-detail exclusion, safe long-text fallback, and unchanged customer wording.');
