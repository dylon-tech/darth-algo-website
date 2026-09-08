// Supervised worker: no model calls while idle; secrets never printed.
import { setTimeout as wait } from 'node:timers/promises';
const origin = process.env.AI_OS_WORKER_ORIGIN;
const key = process.env.AI_OS_WORKER_KEY;
const workerId = process.env.AI_OS_WORKER_ID || 'darth-primary';
if (!origin || !key || key.length < 32 || !/^[a-zA-Z0-9_-]{1,64}$/.test(workerId)) throw Error('WORKER_CONFIGURATION_REQUIRED');
const url = new URL('/api/owner/worker', origin);
if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw Error('WORKER_HTTPS_REQUIRED');
if (url.username || url.password) throw Error('WORKER_URL_CREDENTIALS_NOT_ALLOWED');
let stopped = false;
process.on('SIGTERM', () => { stopped = true; });
process.on('SIGINT', () => { stopped = true; });
while (!stopped) {
  try {
    const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(110000),
      headers: { Authorization: `Bearer ${key}`, 'x-worker-id': workerId } });
    if ([401, 403, 404].includes(response.status)) { console.error('WORKER_AUTH_OR_DEPLOYMENT_REQUIRED'); process.exitCode = 1; break; }
    console.log(JSON.stringify({ at: new Date().toISOString(), reachable: response.ok }));
  } catch { console.error('WORKER_REQUEST_UNCONFIRMED'); }
  if (process.argv.includes('--once')) break;
  if (!stopped) await wait(30000);
}
