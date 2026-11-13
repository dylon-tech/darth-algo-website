import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'darth-profile-'));
const profile=JSON.parse(fs.readFileSync('app/lib/business-os/founder-native-runtime.json','utf8'));
try {
 for(const name of [...profile.files.map(x=>x.file),'app/lib/business-os/founder-native-runtime.json']){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.copyFileSync(name,path.join(root,name));}
 const run=()=>spawnSync(process.execPath,['scripts/founder-renderer/runtime-profile.mjs','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(run().status,0,'Reviewed checkout passes');
 const configPath=path.join(root,'vercel.json'),config=JSON.parse(fs.readFileSync(configPath,'utf8'));
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reorder(value[key])])):value;
 fs.writeFileSync(configPath,JSON.stringify(reorder(config)));
 assert.equal(run().status,0,'Host reserialization preserves reviewed settings');
 config.functions['api/founder-native-render.py'].maxDuration=301;
 fs.writeFileSync(configPath,JSON.stringify(config));
 const changed=run();assert.notEqual(changed.status,0,'A real runtime setting change must fail');assert.match(changed.stderr,/runtime changed: vercel\.json/);
 console.log('Runtime profile accepts formatting changes and rejects changed function settings.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
