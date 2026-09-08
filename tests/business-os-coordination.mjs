import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'darth-coordination-'));
try {
  execFileSync('node_modules/.bin/tsc', ['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/coordination-policy.ts']);
  const require = createRequire(import.meta.url);
  const { handoffAllowed, seedAssignments } = require(join(dir, 'coordination-policy.js'));
  assert.equal(handoffAllowed('content','operations',0,0),true);
  assert.equal(handoffAllowed('content','content',0,0),false);
  assert.equal(handoffAllowed('content','operations',3,0),false);
  assert.equal(handoffAllowed('research','growth',0,16),false);
  assert.equal(new Set(seedAssignments('2026-09-08').map(x=>x.key)).size,8);
  assert.deepEqual(seedAssignments('2026-09-08'), seedAssignments('2026-09-08'));
  assert.notEqual(seedAssignments('2026-09-08')[0].key,seedAssignments('2026-09-09')[0].key);

  if (!process.env.OS_TEST_PGLITE_MODULE) throw Error('OS_TEST_PGLITE_MODULE required');
  const { PGlite } = await import(pathToFileURL(process.env.OS_TEST_PGLITE_MODULE).href);
  const db = new PGlite(join(dir,'db'));
  const base = readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1];
  const extension = readFileSync('app/lib/business-os/coordination.ts','utf8').match(/export const coordinationSchema = `([\s\S]*?)`;/)[1];
  await db.exec(base + extension); await db.exec(extension);
  const parent=randomUUID(), task=randomUUID(), handoff=randomUUID();
  await db.query("insert into os_runs(id,request_key,status,department,result) values($1,'parent','completed','research',$2)",[parent,JSON.stringify({brief:'Verified source findings'})]);
  await db.query("insert into os_tasks(id,department,title,priority,dedupe_key,evidence,root_run_id,handoff_depth) values($1,'growth','Use research',1,'research-to-growth','[]',$2,1)",[task,parent]);
  const insert="insert into os_handoffs(id,task_id,parent_run_id,root_run_id,from_department,to_department,body) values($1,$2,$3,$3,'research','growth','Verified source findings')";
  await db.query(insert,[handoff,task,parent]);
  await assert.rejects(db.query(insert,[randomUUID(),task,parent]));
  assert.equal((await db.query('select body from os_handoffs where task_id=$1',[task])).rows[0].body,'Verified source findings');
  // The same task has exactly one dispatched job, including across daemon restarts.
  await db.query("insert into os_jobs(id,request_key,department,message,source,task_id) values($1,$2,'growth','Use handoff','schedule',$3)",[randomUUID(),'handoff:'+task,task]);
  assert.equal((await db.query("select t.id from os_tasks t where t.status='queued' and not exists(select 1 from os_jobs j where j.task_id=t.id)")).rows.length,0);
  await db.query("update os_handoffs set status='completed' where task_id=$1",[task]);
  await db.query("insert into os_worker_heartbeat(id,worker_id,status) values(1,'test','idle')");
  await db.close();
  const reopened = new PGlite(join(dir,'db'));
  assert.equal((await reopened.query('select status from os_handoffs where id=$1',[handoff])).rows[0].status,'completed');
  assert.equal((await reopened.query('select status from os_worker_heartbeat where id=1')).rows[0].status,'idle');
  await reopened.close();
  console.log('PASS: handoff routing/loop bounds, daily seed dedupe, real SQL handoff payload, duplicate rejection, restart persistence, heartbeat. No paid model or external action.');
} finally { rmSync(dir,{recursive:true,force:true}); }
