const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

(async () => {
  const {PGlite} = await import(process.env.OS_TEST_PGLITE_MODULE || '@electric-sql/pglite');
  const database = new PGlite();
  const queries = [];
  const makeSql = executor => {
    const sql = async (parts, ...values) => {
      const query = parts.reduce((result, part, index) => result + (index ? '$' + index : '') + part, '');
      queries.push(query);
      if (query.includes('pg_advisory_xact_lock')) return [];
      return (await executor.query(query, values)).rows;
    };
    sql.unsafe = async query => {queries.push(query); return executor.exec(query);};
    sql.json = JSON.stringify;
    sql.begin = callback => database.transaction(tx => callback(makeSql(tx)));
    return sql;
  };
  const sql = makeSql(database), cache = new Map();
  function load(filename) {
    filename = path.resolve(filename); if (cache.has(filename)) return cache.get(filename);
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
    mod.require = id => id.endsWith('/affiliate-db') ? {db: () => sql} : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id) + '.ts') : require(id);
    cache.set(filename, mod.exports);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText, filename);
    return mod.exports;
  }
  const api = load('app/lib/business-os/founder-inbox.ts');
  const env = {...process.env};
  const supportId = 'support:00000000-0000-0000-0000-000000000001';
  try {
    await database.exec(fs.readFileSync('app/lib/business-os/schema.ts', 'utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
    await database.exec(`
      insert into os_support_conversations(id,provider,provider_thread_id,customer_key,category,status,subject,last_message_at,summary,requires_founder)
      values('00000000-0000-0000-0000-000000000001','gmail','1234567890abcdef','cus_test','support','open','Setup question','2026-01-01T12:00:00Z','How do I add the indicator?',true);
      insert into os_messages(id,department,role,body,created_at) values('00000000-0000-0000-0000-000000000002','content','agent','Saved a complete script. Rendering is not connected.','2026-01-01T13:00:00Z');
      insert into os_open_loops(id,loop_key,category,title,why,service,resume_action,severity,source_type,source_id,first_seen_at,last_seen_at,details)
      values('00000000-0000-0000-0000-000000000003','fixture','connection','Reconnect provider','The last sync failed','Publisher','Verify the saved receipt','warning','job','00000000-0000-0000-0000-000000000004','2026-01-01T14:00:00Z',now(),'{"href":"javascript:alert(1)"}');
    `);
    queries.length = 0;
    let snapshot = await api.founderInbox();
    assert.equal(snapshot.status, 'ready'); assert.equal(snapshot.statePersistence, 'not_initialized');
    assert.equal(snapshot.items.length, 3); assert.equal(snapshot.unreadCount, 3);
    assert.equal(snapshot.email.status, 'disconnected'); assert.equal(snapshot.capabilities.sendEmail, false);
    assert.equal(snapshot.items.find(item => item.id === supportId).contentCoverage, 'summary_only');
    assert.match(snapshot.items.find(item => item.id === supportId).sourceHref, /^https:\/\/mail\.google\.com\//);
    assert.equal(snapshot.items.find(item => item.id.startsWith('loop:')).sourceHref, '/owner/connections');
    assert(queries.every(query => query.trim().startsWith('select ')), 'Inbox GET must be read-only, including before state initialization');

    // Competing phone/computer saves never silently overwrite the first draft.
    const changes = await Promise.all([
      api.updateFounderInbox({operation:'update', id:supportId, expectedVersion:0, patch:{draft:'First safe reply',read:true}}),
      api.updateFounderInbox({operation:'update', id:supportId, expectedVersion:0, patch:{draft:'Second device reply'}}),
    ]);
    assert.deepEqual(changes.map(change => change.status).sort(), ['conflict','saved']);
    const saved = changes.find(change => change.status === 'saved');
    assert.equal(saved.state.version, 1); assert.equal(saved.sent, false);
    let detail = await api.founderInboxDetail(supportId);
    assert.equal(detail.item.state.draft, saved.state.draft); assert.equal(detail.draftHistory.length, 1);
    assert.equal(detail.messages[0].role, 'summary'); assert.equal(detail.canSend, false);
    assert.equal((await database.query('select count(*)::int n from os_founder_inbox_events')).rows[0].n, 1);

    const snooze = new Date(Date.now() + 3600000).toISOString();
    await api.updateFounderInbox({operation:'update', id:supportId, expectedVersion:1, patch:{snoozedUntil:snooze,resolved:true}});
    detail = await api.founderInboxDetail(supportId);
    assert.equal(detail.item.state.version, 2); assert.equal(detail.item.state.snoozedUntil, snooze);
    assert.equal(detail.item.state.draft, saved.state.draft, 'Read/hide actions preserve the draft');
    assert.equal((await database.query('select status from os_support_conversations')).rows[0].status, 'open', 'Hiding an inbox item must not claim its underlying support case is resolved');
    await database.query('update os_support_conversations set last_message_at=$1', [new Date(Date.now()+1000).toISOString()]);
    detail = await api.founderInboxDetail(supportId);
    assert.equal(detail.item.state.resolvedAt, null, 'New source messages reopen locally hidden threads');
    assert.equal(detail.item.unread, true);

    assert.throws(() => api.validateInboxUpdate({operation:'send',id:supportId,expectedVersion:2,patch:{draft:'No'}}), /INVALID_/);
    assert.throws(() => api.validateInboxUpdate({operation:'update',id:supportId,expectedVersion:2,patch:{snoozedUntil:new Date(Date.now()+31*86400000).toISOString()}}), /INVALID_SNOOZE/);
    assert.throws(() => api.validateInboxUpdate({operation:'update',id:'message:00000000-0000-0000-0000-000000000002',expectedVersion:0,patch:{draft:'No'}}), /INVALID_DRAFT/);
    assert.throws(() => api.validateInboxUpdate({operation:'update',id:supportId,expectedVersion:2,patch:{draft:'x'.repeat(20001)}}), /INVALID_DRAFT/);
    assert.equal(api.safeInboxHref('https://evil.test/'), null); assert.equal(api.safeInboxHref('//evil.test/'), null);
    assert.equal(api.validInboxId("support:abc' OR true"), false);

    // Authenticated, same-origin owner mutations only; neither reads nor saves send.
    process.env.AI_OS_ENABLED = 'true'; process.env.AI_OS_OWNER_KEY = 'test-inbox-owner-key-'.repeat(3);
    const session = load('app/lib/business-os/owner-session.ts'), route = load('app/api/owner/founder-inbox/route.ts');
    const url = 'https://www.darthalgo.com/api/owner/founder-inbox';
    const cookie = session.ownerCookie + '=' + session.createOwnerSession(process.env.AI_OS_OWNER_KEY);
    const request = (origin, body) => new Request(url, {method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await route.GET(new Request(url))).status, 401);
    assert.equal((await route.POST(new Request(url, {method:'POST'}))).status, 401);
    assert.equal((await route.POST(request('https://evil.test', {operation:'update',id:supportId,expectedVersion:2,patch:{read:true}}))).status, 403);
    assert.equal((await route.GET(new Request(url+'?id=invalid', {headers:{cookie}}))).status, 400);
    const response = await route.GET(new Request(url, {headers:{cookie}}));
    assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(response.headers.get('vary'), 'Cookie');
    assert.equal((await route.POST(request('https://www.darthalgo.com', {operation:'update',id:supportId,expectedVersion:0,patch:{draft:'Stale'}}))).status, 409);
    assert.equal((await route.POST(request('https://www.darthalgo.com', {operation:'send',id:supportId,expectedVersion:2,patch:{draft:'No'}}))).status, 400);

    await database.exec('drop table os_support_conversations');
    snapshot = await api.founderInbox();
    assert.equal(snapshot.status, 'partial'); assert.equal(snapshot.unreadCount, null);
    assert.equal(snapshot.items.length, 2); assert.equal(snapshot.sources.find(source => source.id === 'support').status, 'unavailable');
    console.log('PASS founder inbox: PostgreSQL persistence, cross-device conflicts, history, safe recovery, read-only source isolation, truthful Gmail coverage, auth and same-origin checks.');
  } finally {process.env = env; await database.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
