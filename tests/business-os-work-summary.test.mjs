import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'darth-work-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--skipLibCheck','--outDir',dir,'app/lib/business-os/work-summary.ts'],{stdio:'pipe'});
 const {workSummary}=createRequire(import.meta.url)(join(dir,'work-summary.js'));
 const now=Date.now();
 const job=(status,age=0)=>({department:'growth',status,message:'Find customers\nPrivate instructions',created_at:new Date(now-age).toISOString(),started_at:new Date(now-age).toISOString()});
 assert.equal(workSummary('growth',[job('running')],true,now).label,'Working');
 for(const age of [300000,600000,-1000]) assert.equal(workSummary('growth',[job('running',age)],true,now).label,'Needs a check');
 assert.equal(workSummary('growth',[job('running')],false,now).label,'Checking');
 assert.equal(workSummary('content',[job('running')],true,now).label,'No saved work');
 assert.equal(workSummary('growth',[job('succeeded')],true,now).label,'Last work finished');
 assert.equal(workSummary('growth',[job('succeeded'),job('queued',100)],true,now).label,'Waiting');
 assert.equal(workSummary('growth',[job('queued'),job('running',100)],true,now).label,'Working');
 assert.equal(workSummary('growth',[job('running')],true,now).title,'Find customers');
 console.log('PASS: actual work selection, department isolation, stale/future running jobs, stale snapshots, and finished-versus-working status.');
} finally {rmSync(dir,{recursive:true,force:true});}
