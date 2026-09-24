import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { VIDEO_TEMPLATES, newVideoDraft, isVideoDraft, videoDraftErrors, buildVideoBrief, ownerViewFromSearch, ownerViewParam, isVideoJobReceipt } from '../app/owner/video-studio-model.ts';
for (const template of VIDEO_TEMPLATES) {
 test(`${template.id}: valid, bounded, source-backed brief`,()=>{
  const draft=newVideoDraft(template.id);assert.equal(isVideoDraft(draft),true);assert.deepEqual(videoDraftErrors(draft),[]);
  const brief=buildVideoBrief(draft);assert.ok(brief.length<=4000);assert.match(brief,/INTERNAL/);assert.match(brief,/Do not publish/);assert.match(brief,/Trading involves risk/);assert.match(brief,/https:\/\/www.darthalgo.com\/links/);assert.ok(brief.includes(template.reference));
 });
}
test('draft copies do not mutate master templates',()=>{const d=newVideoDraft();d.scenes[0].headline='Changed';assert.notEqual(newVideoDraft().scenes[0].headline,'Changed');});
test('empty and overlong persisted fields are rejected',()=>{const d=newVideoDraft();d.notes='x'.repeat(301);assert.equal(isVideoDraft(d),false);assert.equal(isVideoDraft(null),false);assert.equal(isVideoDraft({}),false);});
test('unknown templates and malformed scene times are rejected',()=>{const d=newVideoDraft();d.templateId='fake';assert.equal(isVideoDraft(d),false);const e=newVideoDraft();e.scenes[0].seconds=NaN;assert.equal(isVideoDraft(e),false);});
test('empty scene cannot be sent',()=>{const d=newVideoDraft();d.scenes[0].voiceover=' ';assert.throws(()=>buildVideoBrief(d));});
test('impossibly fast voiceover requires a revision',()=>{const d=newVideoDraft();d.scenes[0].seconds=2;assert.ok(videoDraftErrors(d).length>0);});
test('maximal validated drafts keep the CTA inside the server limit',()=>{const d=newVideoDraft();d.scenes.forEach(s=>{s.headline='H'.repeat(64);s.voiceover='V'.repeat(180);s.direction='D'.repeat(240);});d.notes='N'.repeat(300);const brief=buildVideoBrief(d);assert.ok(brief.length<=4000);assert.ok(brief.includes('https://www.darthalgo.com/links'));});
test('navigation accepts only owner views and preserves friendly aliases',()=>{for(const view of ['home','team','queue','bills'])assert.equal(ownerViewFromSearch('?view='+ownerViewParam(view)),view);assert.equal(ownerViewFromSearch('?view=https://elsewhere.invalid'),'home');assert.equal(ownerViewFromSearch('?view=studio'),'queue');});
test('receipt must contain a real UUID and a recognized job state',()=>{const id='e7bc82d0-93e2-4daa-8d38-329597b3186e';assert.equal(isVideoJobReceipt({id,status:'queued'}),true);assert.equal(isVideoJobReceipt({id,status:'published'}),false);assert.equal(isVideoJobReceipt({id:'pretend',status:'queued'}),false);});
test('same brief has the same retry key; changed content gets another',()=>{const digest=m=>'video-studio:'+createHash('sha256').update(m).digest('hex');const a=buildVideoBrief(newVideoDraft());assert.equal(digest(a),digest(a));const d=newVideoDraft();d.notes='Slow down the end card.';assert.notEqual(digest(a),digest(buildVideoBrief(d)));});
test('client delegates only an authenticated internal content job',()=>{const text=readFileSync(new URL('../app/owner/video-studio.tsx',import.meta.url),'utf8');assert.match(text,/credentials:'same-origin'/);assert.match(text,/operation:'message',department:'content'/);assert.match(text,/crypto.subtle.digest\('SHA-256'/);assert.doesNotMatch(text,/HF_API_KEY|api.higgsfield.ai|localStorage|NEXT_PUBLIC_.*SECRET/);assert.match(text,/isVideoJobReceipt\(body\)/);});
test('mobile accessibility and reduced-motion guards are present',()=>{const css=readFileSync(new URL('../app/owner/video-studio.module.css',import.meta.url),'utf8');assert.match(css,/prefers-reduced-motion/);assert.match(css,/min-height: 44px/);assert.match(css,/font-size: 16px/);const home=readFileSync(new URL('../app/owner/business-home.tsx',import.meta.url),'utf8');assert.match(home,/visibilitychange/);assert.match(home,/popstate/);assert.match(home,/offline\|\|Boolean\(error\)/);});
