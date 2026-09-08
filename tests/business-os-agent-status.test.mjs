import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crewStatus } from '../app/owner/agent-status.ts';
const now=Date.parse('2026-09-07T10:00:00Z');
const base={connected:true,fresh:true,configured:true,paused:false,runs:[],queued:false,now};
test('a recorded approved pilot shows actual work without implying ongoing automation',()=>{
  const run={department:'ceo',status:'running',created_at:new Date(now-1000).toISOString(),approved_pilot:true};
  assert.equal(crewStatus('ceo',{...base,configured:false,runs:[run]}).label,'Working');
  assert.notEqual(crewStatus('ceo',{...base,configured:false,fresh:false,runs:[run]}).label,'Working');
  assert.equal(crewStatus('ceo',{...base,configured:false,runs:[{...run,status:'completed'}]}).label,'Test finished');
  assert.equal(crewStatus('ceo',{...base,configured:false,runs:[{...run,status:'failed'}]}).label,'Needs a check');
  assert.equal(crewStatus('ceo',{...base,configured:false,runs:[{...run,status:'completed',output_review:{verdict:'needs_revision',notes:'Requested draft is missing.'}}]}).label,'Needs revision');
});
test('registered and configured agents are not presented as tested or working',()=>{
  assert.equal(crewStatus('ceo',base).label,'Not tested yet');
  assert.equal(crewStatus('ceo',{...base,configured:false,queued:true}).label,'Needs setup');
});
test('only a recent recorded run earns the Working label',()=>{
  const runs=[{department:'ceo',status:'running',created_at:new Date(now-1000).toISOString()}];
  assert.equal(crewStatus('ceo',{...base,runs}).label,'Working');
  assert.equal(crewStatus('growth',{...base,runs}).label,'Not tested yet');
  assert.notEqual(crewStatus('ceo',{...base,runs,paused:true}).label,'Working');
  assert.notEqual(crewStatus('ceo',{...base,runs,fresh:false}).label,'Working');
  assert.notEqual(crewStatus('ceo',{...base,runs,configured:false}).label,'Working');
  assert.equal(crewStatus('ceo',{...base,runs,now:now+300000}).label,'Needs a check');
});
test('history is ordered and completion, failure, and waiting stay distinct',()=>{
  const completed={department:'ceo',status:'completed',created_at:new Date(now-10000).toISOString()};
  const failed={department:'ceo',status:'failed',created_at:new Date(now-1000).toISOString()};
  assert.equal(crewStatus('ceo',{...base,runs:[completed]}).label,'Ready for work');
  assert.equal(crewStatus('ceo',{...base,runs:[completed],queued:true}).label,'Waiting');
  assert.equal(crewStatus('ceo',{...base,runs:[completed,failed]}).label,'Needs a check');
});
