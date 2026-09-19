import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dir = mkdtempSync(join(tmpdir(), 'darth-publish-'));
const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;
try {
  execFileSync('node_modules/.bin/tsc', ['--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--esModuleInterop', '--skipLibCheck', '--outDir', dir, 'app/lib/business-os/buffer-publishing.ts', 'app/lib/business-os/service.ts'], { stdio: 'pipe' });
  const require = createRequire(import.meta.url);
  const { fingerprint } = require(join(dir, 'business-os/policy.js'));
  const { bufferPublicationPayload, isBufferPublication } = require(join(dir, 'business-os/buffer-publication-policy.js'));
  let events, approvals, paused, verified, failReceiptWrite, failRead, dropResponse, createCount, posts, tail, channel;
  const reset = () => {
    events = []; approvals = []; paused = false; verified = true; failReceiptWrite = false; failRead = false; dropResponse = false;
    createCount = 0; posts = new Map(); tail = Promise.resolve();
    channel = { id: 'x1', displayName: 'DarthAlgos', service: 'twitter', isDisconnected: false, isLocked: false, isQueuePaused: false };
  };
  reset();
  // Contract fixture serializes transactions and rolls them back on exceptions.
  // It does not substitute for testing PostgreSQL isolation against a live DB.
  const sql = async (parts, ...v) => {
    const q = parts.join('?').replace(/\s+/g, ' ').trim();
    if (q.includes('pg_advisory_xact_lock')) return [];
    if (q.includes("event='buffer_draft_test_verified'")) return verified && v[0] === 'x1' ? [{ id: 1 }] : [];
    if (q.includes('select paused')) return [{ paused }];
    if (q.includes('select id,status,expires_at from os_approvals')) return approvals.filter(a => ['pending', 'approved'].includes(a.status) && a.payload.channelId === v[0] && a.payload.text === v[1]).slice(-1);
    if (q.startsWith('select * from os_approvals')) return approvals.filter(a => a.id === v[0]);
    if (q.startsWith('update os_approvals set status=?')) { const a = approvals.find(a => a.id === v[2]); a.status = v[0]; a.decision_note = v[1]; a.decided_by = 'owner'; return []; }
    if (q.startsWith('update os_approvals')) { approvals.forEach(a => { if (a.status === 'pending' && new Date(a.expires_at) <= new Date()) a.status = 'expired'; }); return []; }
    if (q.startsWith('insert into os_approvals')) { approvals.push({ id: v[0], payload: v[1], payload_hash: v[2], status: 'pending', expires_at: new Date(Date.now() + 86400000).toISOString() }); return []; }
    if (q.startsWith('select') && q.includes('from os_activity')) {
      const event = q.match(/event='([^']+)'/)[1];
      return events.filter(e => e.entity === v[0] && e.event === event && (event !== 'buffer_publication_prepared' || e.details.payloadHash === v[1])).slice(-1);
    }
    if (q.startsWith('insert into os_activity')) {
      const literal = q.match(/values\('[^']+','([^']+)'/);
      if (!literal) { events.push({ id: events.length + 1, event: v[0], entity: v[1], details: v[2] }); return []; }
      const event = literal[1];
      if (event === 'buffer_publish_receipt' && failReceiptWrite) throw Error('Database unavailable after external write');
      events.push({ id: events.length + 1, entity: v[0], event, details: v[1] }); return [];
    }
    throw Error(`Unhandled fixture SQL: ${q}`);
  };
  sql.json = x => x;
  sql.begin = async fn => {
    let release;
    const prior = tail;
    tail = new Promise(resolve => { release = resolve; });
    await prior;
    const saved = structuredClone({ events, approvals });
    try { return await fn(sql); }
    catch (error) { events = saved.events; approvals = saved.approvals; throw error; }
    finally { release(); }
  };
  const dbPath = join(dir, 'affiliate-db.js');
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { db: () => sql } };
  const { prepareBufferPublication, executeBufferPublication, checkBufferPublication } = require(join(dir, 'business-os/buffer-publishing.js'));
  process.env.VERCEL_ENV = 'production'; process.env.BUFFER_API_KEY = 'offline-test-key'; delete process.env.BUFFER_X_CHANNEL_ID;
  globalThis.fetch = async (_url, options) => {
    const { query, variables } = JSON.parse(options.body);
    if (query.includes('query BufferOrganizations')) return Response.json({ data: { account: { organizations: [{ id: 'org1' }] } } });
    if (query.includes('query BufferChannels')) return Response.json({ data: { channels: [channel] } });
    if (query.includes('mutation BufferCreatePost')) {
      const i = variables.input;
      assert.equal(i.saveToDraft, false); assert.equal(i.mode, 'shareNow'); assert.equal(i.channelId, 'x1');
      assert.equal(events.filter(e => e.event === 'buffer_publish_started').length, 1, 'Claim is durable before provider call');
      createCount++;
      const post = { id: `post${createCount}`, text: i.text, channelId: i.channelId, status: 'sending', sentAt: null };
      posts.set(post.id, post);
      if (dropResponse) throw Error('Response lost after acceptance');
      return Response.json({ data: { createPost: { post } } });
    }
    if (query.includes('query BufferPost')) {
      if (failRead) throw Error('Read unavailable');
      return Response.json({ data: { post: posts.get(variables.input.id) } });
    }
    throw Error('Unexpected Buffer request');
  };
  const approve = async (text = 'A precise post for X.') => {
    const prepared = await prepareBufferPublication(text);
    const row = approvals.find(a => a.id === prepared.id);
    row.status = 'approved'; row.decided_by = 'owner';
    return row;
  };
  const valid = bufferPublicationPayload('Exact text', 'x1', 'DarthAlgos');
  assert.ok(isBufferPublication(valid));
  for (const edited of [{ ...valid, mode: 'addToQueue' }, { ...valid, details: 'Misleading preview' }, { ...valid, text: 'Changed' }, { ...valid, extra: true }, { ...valid, executor: 'not_connected' }]) assert.equal(isBufferPublication(edited), false);
  assert.throws(() => bufferPublicationPayload('x'.repeat(281), 'x1', 'DarthAlgos'));
  process.env.VERCEL_ENV = 'preview';
  await assert.rejects(prepareBufferPublication('test'), /PRODUCTION_ONLY/);
  await assert.rejects(executeBufferPublication('id', 'hash'), /PRODUCTION_ONLY/);
  process.env.VERCEL_ENV = 'production'; verified = false;
  await assert.rejects(prepareBufferPublication('test'), /DRAFT_TEST_REQUIRED/);
  verified = true;
  const prepared = await prepareBufferPublication('A precise post for X.');
  assert.equal((await prepareBufferPublication('A precise post for X.')).id, prepared.id, 'Preparation is deduplicated');
  let row = approvals[0];
  await assert.rejects(executeBufferPublication(row.id, row.payload_hash), /APPROVAL_REQUIRED/);
  row = approvals[0]; row.status = 'approved'; row.decided_by = 'owner';
  await assert.rejects(executeBufferPublication(row.id, '0'.repeat(64)), /VERSION_CHANGED/);
  row = approvals[0]; row.payload.text = 'Tampered';
  await assert.rejects(executeBufferPublication(row.id, row.payload_hash), /VERSION_CHANGED/);
  row = approvals[0]; row.payload = bufferPublicationPayload('A precise post for X.', 'x1', 'DarthAlgos'); row.payload_hash = fingerprint(row.payload);
  paused = true;
  await assert.rejects(executeBufferPublication(row.id, row.payload_hash), /OS_PAUSED/);
  paused = false; row = approvals[0]; row.expires_at = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(executeBufferPublication(row.id, row.payload_hash), /EXPIRED/);
  assert.equal(createCount, 0);
  reset(); row = await approve();
  const concurrent = await Promise.all([executeBufferPublication(row.id, row.payload_hash), executeBufferPublication(row.id, row.payload_hash), executeBufferPublication(row.id, row.payload_hash)]);
  assert.equal(createCount, 1, 'Concurrent clicks produce only one external mutation');
  assert.ok(concurrent.every(r => r.published === false), 'Sending is never reported as published');
  let result = await executeBufferPublication(row.id, row.payload_hash);
  assert.equal(createCount, 1); assert.equal(result.state, 'sending');
  await assert.rejects(prepareBufferPublication('A precise post for X.'), /ALREADY_APPROVED/);
  failRead = true;
  assert.equal((await checkBufferPublication(row.id, row.payload_hash)).state, 'unconfirmed');
  failRead = false;
  const post = posts.get('post1'); post.status = 'sent'; post.sentAt = '2026-09-19T12:00:00Z';
  paused = true; row.expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await checkBufferPublication(row.id, row.payload_hash)).published, true, 'Read-only reconciliation works paused/expired');
  post.text = 'Different text';
  assert.equal((await checkBufferPublication(row.id, row.payload_hash)).published, false);
  assert.equal(createCount, 1);
  for (const failure of ['drop', 'receipt']) {
    reset(); row = await approve(); dropResponse = failure === 'drop'; failReceiptWrite = failure === 'receipt';
    assert.equal((await executeBufferPublication(row.id, row.payload_hash)).state, 'unknown');
    await executeBufferPublication(row.id, row.payload_hash);
    await checkBufferPublication(row.id, row.payload_hash);
    assert.equal(createCount, 1, `${failure}: unknown writes are never replayed`);
    await assert.rejects(prepareBufferPublication('A precise post for X.'), /ALREADY_APPROVED/);
  }
  reset(); row = await approve(); channel.id = 'different-channel';
  assert.equal((await executeBufferPublication(row.id, row.payload_hash)).state, 'unknown');
  assert.equal(createCount, 0, 'Changing the live destination cannot redirect approval');
  reset(); row = await approve(); events = [];
  await assert.rejects(executeBufferPublication(row.id, row.payload_hash), /PREPARED_APPROVAL_REQUIRED/);
  assert.equal(createCount, 0, 'A fabricated typed proposal without owner preparation cannot execute');
  // Exercise the actual decision dispatcher, with unrelated AI/source modules isolated.
  for (const name of ['sources', 'model', 'coordination', 'coordination-policy', 'pilot-policy', 'budget-policy']) {
    const path = join(dir, `business-os/${name}.js`);
    require.cache[path] = { id: path, filename: path, loaded: true, exports: {} };
  }
  const { decide } = require(join(dir, 'business-os/service.js'));
  reset();
  const decisionPost = await prepareBufferPublication('Owner approves this exact post.');
  row = approvals[0];
  const decisions = await Promise.allSettled([decide(decisionPost.id, row.payload_hash, 'approved', 'Yes'), decide(decisionPost.id, row.payload_hash, 'approved', 'Repeated click')]);
  assert.equal(decisions.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(createCount, 1, 'Decision commit dispatches once');
  reset();
  row = { id: 'generic', status: 'pending', payload: { kind: 'publishing', summary: 'A vague proposal', details: 'Something on X', evidence: [], executor: 'not_connected', policyVersion: 1 }, expires_at: new Date(Date.now() + 86400000).toISOString() };
  row.payload_hash = fingerprint(row.payload); approvals.push(row);
  assert.equal((await decide(row.id, row.payload_hash, 'approved', 'Yes')).executed, false);
  assert.equal(createCount, 0, 'Generic AI proposals never dispatch publishing');
  reset();
  await prepareBufferPublication('Decline this post.'); row = approvals[0];
  await decide(row.id, row.payload_hash, 'declined', 'No');
  assert.equal(createCount, 0);
  console.log('PASS: exact visible payload, owner preparation and approval, production-only writes, verified draft gate, expiry/pause/tamper guards, concurrent deduplication, durable unknown outcomes, same-content replay prevention, and read-only receipt reconciliation. Offline transaction/API fixtures only.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  rmSync(dir, { recursive: true, force: true });
}
