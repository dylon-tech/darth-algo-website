import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'social-reference-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--skipLibCheck','--outDir',dir,'app/lib/business-os/social-visual-standard.ts','app/lib/business-os/budget-policy.ts']);
 const require=createRequire(import.meta.url);
 const {socialVisualStandard,socialReferenceInputs}=require(join(dir,'social-visual-standard.js'));
 const {assertRecurringEnvelope,recurringBudgetPolicy}=require(join(dir,'budget-policy.js'));
 const {pilot}=require(join(dir,'pilot-policy.js'));
 const manifest=JSON.parse(readFileSync('public/creative-references/cinematic-2026-09-22/manifest.json'));
 assert.deepEqual(socialVisualStandard,manifest);
 for(const r of manifest.references) {
  const bytes=readFileSync('public'+r.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);
 }
 const seen=new Set();
 const policy=recurringBudgetPolicy({AI_OS_RECURRING_SPEND_APPROVED:'true',AI_OS_DAILY_BUDGET_USD:'1',AI_OS_MONTHLY_BUDGET_USD:'10',AI_OS_MODEL:pilot.model});
 for(let day=1;day<=12;day++){
  const key='daily-shared-creative:2026-10-'+day;
  const refs=socialReferenceInputs(key);
  assert.deepEqual(refs,socialReferenceInputs(key),'Retries retain exact visual inputs');
  assert.equal(refs.length,2);
  assert.equal(refs[0].id,'cover');
  refs.forEach(r=>seen.add(r.id));
  const request={model:pilot.model,store:false,instructions:'Use approved reference photos.',max_output_tokens:2500,reasoning:{effort:'none'},input:[{role:'user',content:[{type:'input_text',text:'Review style'},...refs.map(r=>r.part)]}],text:{format:{type:'json_schema'}}};
  assert.doesNotThrow(()=>assertRecurringEnvelope(JSON.stringify(request),'openai',policy),'Reference inputs obey unchanged spending envelope');
 }
 assert.equal(seen.size,4,'All four approved photos are used across content runs');
 console.log('PASS: reference file hashes, exact manifest, deterministic image inputs, four-photo coverage and unchanged budget envelope.');
} finally {rmSync(dir,{recursive:true,force:true});}
