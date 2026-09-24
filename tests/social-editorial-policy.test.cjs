const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,readFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const dir=mkdtempSync(join(tmpdir(),'editorial-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/reviewed-social.ts']);
 const {regularContentKind,resultsSlot}=require(join(dir,'social-editorial-policy.js'));
 const {socialCampaignQueue}=require(join(dir,'social-campaign-queue.js'));
 const {creativeDigest,validateReviewedCreative}=require(join(dir,'reviewed-social.js'));
 assert.equal(regularContentKind('2026-09-24'),'educational');
 assert.equal(regularContentKind('2026-09-25'),'promotional');
 assert.equal(regularContentKind('2026-09-26'),'educational');
 assert.equal(regularContentKind('2026-10-01'),'promotional');
 assert.notEqual(regularContentKind('2026-11-01'),regularContentKind('2026-11-02'),'DST does not reset the calendar');
 assert.throws(()=>regularContentKind('2026-02-30'));
 assert.equal(resultsSlot('2026-09-25','morning'),true);
 assert.equal(resultsSlot('2026-09-30','morning'),true);
 assert.equal(resultsSlot('2026-09-30','afternoon'),false);
 assert.equal(resultsSlot('2026-09-24','morning'),false);
 for(const c of socialCampaignQueue){validateReviewedCreative(c);for(const a of c.assets)assert.equal(createHash('sha256').update(readFileSync('public'+a.path)).digest('hex'),a.sha256);}
 const base=structuredClone(socialCampaignQueue.find(c=>c.day==='2026-09-25'&&c.slot==='morning'));
 const sign=c=>{c.review.sha256=creativeDigest(c);return c;};
 const wrong=structuredClone(base);wrong.editorial.kind='educational';assert.throws(()=>validateReviewedCreative(sign(wrong)),/DAY_MISMATCH/);
 const disclaimer=structuredClone(base);disclaimer.text='Trading involves risk.';assert.throws(()=>validateReviewedCreative(sign(disclaimer)),/EDITORIAL_REVIEW/);
 const result=structuredClone(base);result.editorial.kind='results';assert.throws(()=>validateReviewedCreative(sign(result)),/RESULTS_EVIDENCE/);
 result.editorial.result={sourceHash:'a'.repeat(64),tradeDate:'2026-09-23',symbol:'MGC',timeframe:'5m',outcomeBasis:'chart_setup',verificationNote:'Test fixture only; not live evidence'};
 validateReviewedCreative(sign(result));
 result.editorial.result.tradeDate='2026-09-18';assert.throws(()=>validateReviewedCreative(sign(result)),/RESULTS_EVIDENCE/);
 const tampered=structuredClone(base);tampered.editorial.learning='changed after review';assert.throws(()=>validateReviewedCreative(tampered),/REVIEW_INVALID/);
 console.log('PASS: calendar, Wed/Fri evidence gates, historical compatibility, review tamper checks and all final asset hashes');
} finally {rmSync(dir,{recursive:true,force:true});}
