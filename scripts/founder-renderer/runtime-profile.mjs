/** Readiness follows this reviewed runtime, not unrelated site commit SHAs. */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const files=[
 'api/founder-native-render.py','package-lock.json','requirements.txt','.python-version','vercel.json',
 'app/lib/business-os/founder-native-policy.ts','app/lib/business-os/founder-native-lifetime.ts','app/lib/business-os/founder-content.ts',
 'app/lib/business-os/founder-renderer.ts','app/lib/business-os/founder-renderer-auth.ts',
 'app/lib/business-os/founder-renderer-transport.ts','app/lib/business-os/founder-render-catalog.ts',
 'app/lib/business-os/founder-render-catalog.json','app/lib/business-os/founder-media.ts',
 'app/lib/business-os/founder-media-model.ts',
 'app/api/owner/founder-content/route.ts','app/api/cron/owner-work/route.ts','app/api/owner/founder-renderer/route.ts','app/api/owner/founder-renderer/[uploadId]/chunks/route.ts',
 'scripts/founder-renderer/render.py','scripts/founder-renderer/recipes.py',
 'scripts/founder-renderer/worker.py','scripts/founder-renderer/setup_models.py',
 'scripts/founder-renderer/sources.json','scripts/founder-renderer/runtime-profile.mjs',
 'scripts/founder-renderer/prepared-vercel/setup_runtime.py',
];
// The host serializes vercel.json while preparing a build. Preserve semantic
// configuration checks without treating whitespace or object order as a change.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const records=files.sort().map(file=>{const raw=fs.readFileSync(path.resolve(file));const bytes=file==='vercel.json'?JSON.stringify(canonical(JSON.parse(raw.toString('utf8')))):raw;return {file,sha256:createHash('sha256').update(bytes).digest('hex')};});
const result={version:'vercel-native-v1',fingerprint:createHash('sha256').update(JSON.stringify(records)).digest('hex'),files:records};
const target='app/lib/business-os/founder-native-runtime.json';
if(process.argv.includes('--write'))fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
else {
 const expected=JSON.parse(fs.readFileSync(target,'utf8'));
 const changed=records.filter(row=>expected.files?.find(old=>old.file===row.file)?.sha256!==row.sha256).map(row=>row.file);
 if(JSON.stringify(expected)!==JSON.stringify(result))throw Error(`Renderer runtime changed: ${changed.join(', ')||'profile metadata'}. Review it and regenerate its readiness profile with --write.`);
 console.log('Reviewed renderer runtime profile matches.');
}
