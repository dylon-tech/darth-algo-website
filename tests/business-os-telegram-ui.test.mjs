import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'darth-telegram-ui-'));
try {
  execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/telegram-ui.ts','app/lib/business-os/telegram-policy.ts'],{stdio:'pipe'});
  const require=createRequire(import.meta.url);
  const ui=require(join(dir,'lib/business-os/telegram-ui.js'));
  const {departments}=require(join(dir,'lib/business-os/policy.js'));
  const {workAssignments}=require(join(dir,'owner/work-assignments.js'));
  const {isPrivateOwnerUpdate}=require(join(dir,'lib/business-os/telegram-policy.js'));
  assert.equal(ui.homeMenu().flat().filter(b=>b.callback_data?.startsWith('ui:agent:')).length,8);
  for(const department of departments) {
    assert.deepEqual(ui.menuAction(`ui:agent:${department}`),{command:`/${department}`,department});
    for(const assignment of workAssignments[department]) {
      const button=ui.agentMenu(department).flat().find(b=>b.callback_data?.endsWith(':'+assignment.id));
      assert.ok(button); assert.ok(Buffer.byteLength(button.callback_data)<=64);
      assert.equal(ui.menuAction(button.callback_data).assignmentId,assignment.id);
    }
  }
  for(const bad of ['ui:nav:approve','ui:work:growth:refund','ui:agent:admin','ui:agent:growth:extra','os:abc','ui:nav:pause']) assert.equal(ui.menuAction(bad),null);
  assert.equal(ui.naturalCommand('Growth, find our next customers'),'/growth find our next customers');
  assert.equal(ui.naturalCommand('CONTENT: Write a post'),'/content Write a post');
  assert.equal(ui.naturalCommand('menu'),'/agents');
  assert.equal(ui.naturalCommand('Who’s working?'),'/status');
  assert.equal(ui.naturalCommand('Please revise the draft'), 'Please revise the draft');
  const full='A complete draft. '.repeat(100);
  assert.ok(ui.shortReply(full).length<800);
  assert.match(ui.shortReply(full),/preview.*dashboard/s);
  assert.equal(full.length,1800,'Full persisted result is not mutated');
  const update={update_id:1,callback_query:{from:{id:123,is_bot:false},data:'ui:work:growth:acquisition-test',message:{chat:{id:123,type:'private'}}}};
  assert.equal(isPrivateOwnerUpdate(update,'123'),true);
  assert.equal(isPrivateOwnerUpdate(update,'456'),false);
  update.callback_query.message.chat.type='group';
  assert.equal(isPrivateOwnerUpdate(update,'123'),false);
  console.log('PASS: eight agents and 24 valid internal assignments, bounded callbacks, no menu approval/control bypass, natural routing, compact previews, private owner-only callback authorization.');
} finally {rmSync(dir,{recursive:true,force:true});}
