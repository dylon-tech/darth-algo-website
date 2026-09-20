import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const dir=mkdtempSync(join(tmpdir(),'photo-plan-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--skipLibCheck','--outDir',dir,'app/lib/business-os/photo-plan.ts']);
 const require=createRequire(import.meta.url),{photoPlanForDay,photoCaption}=require(join(dir,'photo-plan.js'));
 const dates=Array.from({length:5},(_,i)=>new Date(`2026-09-${20+i}T16:00:00Z`));
 const plans=dates.map(photoPlanForDay);
 assert.equal(new Set(plans.map(p=>p.id)).size,5,'Five consecutive days have distinct themes');
 assert.equal(new Set(plans.map(p=>p.slides[0].title)).size,5,'Different first-slide hooks');
 // Eastern calendar boundaries, including the repeated hour at DST fall-back.
 assert.equal(photoPlanForDay(new Date('2026-09-21T03:59:00Z')).id,plans[0].id);
 assert.equal(photoPlanForDay(new Date('2026-09-21T04:00:00Z')).id,plans[1].id);
 assert.equal(photoPlanForDay(new Date('2026-11-01T05:30:00Z')).id,photoPlanForDay(new Date('2026-11-01T06:30:00Z')).id);
 for(const p of plans){
  assert.equal(p.slides.length,3);
  for(const slide of p.slides){if(slide.image)assert.ok(existsSync('public/indicators/'+slide.image),`Owned capture exists: ${slide.image}`);assert.ok(slide.alt.length<1000);}
  const caption=photoCaption(p);assert.ok(caption.length<=280);assert.match(caption,/darthalgo.com\/links/);assert.match(caption,/Trading involves risk/);assert.equal((caption.match(/#\w+/g)||[]).length,1);
  assert.doesNotMatch(caption,/\$|\b(?:guarantee[ds]?|profit(?:able|s)?|win\s*rate|discount|coupon|payout|testimonial)\b|\d\s*%|@[a-z0-9_]/i);
 }
 console.log('PASS: five distinct daily lessons, Eastern midnight/DST stability, existing owned chart assets, and routine-post caption limits.');
} finally {rmSync(dir,{recursive:true,force:true});}
