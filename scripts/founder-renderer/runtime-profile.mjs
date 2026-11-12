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
const records=files.sort().map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.resolve(file))).digest('hex')}));
const result={version:'vercel-native-v1',fingerprint:createHash('sha256').update(JSON.stringify(records)).digest('hex'),files:records};
const target='app/lib/business-os/founder-native-runtime.json';
if(process.argv.includes('--write'))fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
else if(JSON.stringify(JSON.parse(fs.readFileSync(target,'utf8')))!==JSON.stringify(result))throw Error('Renderer runtime changed. Review it and regenerate its readiness profile with --write.');
else console.log('Reviewed renderer runtime profile matches.');
