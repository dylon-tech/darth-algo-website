import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const key='test-only-'+ 'x'.repeat(40);
let calls=0;
const server=createServer((req,res)=>{
  calls++;
  assert.equal(req.method,'POST'); assert.equal(req.url,'/api/owner/worker');
  assert.equal(req.headers.authorization,`Bearer ${key}`);
  res.setHeader('content-type','application/json');res.end(JSON.stringify({status:'idle'}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const child=spawn(process.execPath,['scripts/owner-worker.mjs','--once'],{env:{...process.env,AI_OS_WORKER_ORIGIN:`http://127.0.0.1:${server.address().port}`,AI_OS_WORKER_KEY:key},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',x=>log+=x);child.stderr.on('data',x=>log+=x);
  assert.equal(await new Promise(resolve=>child.on('close',resolve)),0);
  assert.equal(calls,1); assert.ok(!log.includes(key));assert.ok(log.includes('"reachable":true'));
  console.log('PASS: actual daemon sends one authenticated bounded tick, exits once, never logs credential.');
} finally {server.close();}
