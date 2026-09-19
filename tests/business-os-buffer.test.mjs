import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dir=mkdtempSync(join(tmpdir(),'darth-buffer-'));
const originalFetch=globalThis.fetch;
const savedEnv={...process.env};
try {
  execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/buffer-test.ts'],{stdio:'pipe'});
  const require=createRequire(import.meta.url);
  const adapter=require(join(dir,'business-os/buffer.js'));
  let requests=[], organizations=[{id:'org1'},{id:'org2'}];
  const channel={id:'x1',name:'DarthAlgos',service:'twitter',isDisconnected:false,isLocked:false,isQueuePaused:false};
  let channels={org1:[{...channel,id:'ig',service:'instagram'}],org2:[channel]};
  let posts=new Map(), createCount=0, dropCreate=false, failRead=false, responseError;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.buffer.com');
    assert.equal(options.headers.Authorization,'Bearer offline-test-key');
    assert.equal(options.cache,'no-store');
    const request=JSON.parse(options.body);requests.push(request);
    if(responseError) return new Response(JSON.stringify(responseError),{status:200});
    const {query,variables}=request;
    if(query.includes('query BufferOrganizations')) return Response.json({data:{account:{organizations}}});
    if(query.includes('query BufferChannels')) {
      assert.match(query,/\$input: ChannelsInput!/);
      return Response.json({data:{channels:channels[variables.input.organizationId]||[]}});
    }
    if(query.includes('mutation BufferCreatePost')) {
      createCount++;
      const input=variables.input;
      assert.deepEqual(input.assets,[]);
      assert.equal(input.needsApproval,false);
      assert.equal(input.schedulingType,'automatic');
      assert.match(query,/\$input: CreatePostInput!/);
      const post={id:`post${createCount}`,channelId:input.channelId,text:input.text,status:input.saveToDraft?'draft':'scheduled',sentAt:null};
      posts.set(post.id,post);
      if(dropCreate) throw new Error('Response lost after provider accepted the write');
      return Response.json({data:{createPost:{post}}});
    }
    if(query.includes('query BufferPost')) {
      if(failRead) throw Error('Read unavailable');
      return Response.json({data:{post:posts.get(variables.input.id)}});
    }
    throw Error('Unexpected request');
  };
  delete process.env.BUFFER_API_KEY;
  assert.equal((await adapter.bufferStatus()).configured,false);
  assert.equal(requests.length,0);
  process.env.BUFFER_API_KEY='offline-test-key';
  delete process.env.BUFFER_X_CHANNEL_ID;
  let connection=await adapter.bufferStatus();
  assert.equal(connection.ready,true);
  assert.equal(connection.xChannel.id,'x1','Search beyond the first organization');
  channels.org1.push({...channel,id:'x2'});
  assert.equal((await adapter.bufferStatus()).error,'BUFFER_X_CHANNEL_AMBIGUOUS');
  process.env.BUFFER_X_CHANNEL_ID='x1';
  assert.equal((await adapter.bufferStatus()).ready,true);
  for(const [field,error] of [['isDisconnected','BUFFER_X_DISCONNECTED'],['isLocked','BUFFER_X_LOCKED'],['isQueuePaused','BUFFER_X_QUEUE_PAUSED']]) {
    channel[field]=true;
    assert.equal((await adapter.bufferStatus()).error,error);
    await assert.rejects(adapter.createBufferXPost({text:'test',channelId:'x1'}),new RegExp(error));
    channel[field]=false;
  }
  await assert.rejects(adapter.createBufferXPost({text:'test',channelId:'x2'}),/CHANNEL_MISMATCH/);
  await assert.rejects(adapter.createBufferXPost({text:' ',channelId:'x1'}),/TEXT_REQUIRED/);
  await assert.rejects(adapter.createBufferXPost({text:'x'.repeat(12001),channelId:'x1'}),/TEXT_TOO_LONG/);
  await assert.rejects(adapter.createBufferXPost({text:'test',channelId:'x1',mode:'shareNow) { evil }'}),/MODE_INVALID/);
  await assert.rejects(adapter.createBufferXPost({text:'test',channelId:'x1',saveToDraft:'false'}),/DRAFT_FLAG_INVALID/);
  assert.equal(createCount,0,'No mutation for invalid input or unavailable channels');
  const quoted='Quotes " braces } emoji 📊 and newline\nare content';
  let post=await adapter.createBufferXPost({text:quoted,channelId:'x1'});
  assert.equal(post.status,'draft');
  assert.equal(post.text,quoted);
  assert.ok(!requests.find(r=>r.query.includes('mutation')).query.includes(quoted),'Content stays in variables');
  assert.equal((await adapter.getBufferPost(post.id)).id,post.id);
  responseError={errors:[{message:'provider echoes offline-test-key'}]};
  await assert.rejects(adapter.bufferStatus(),e=>e.message==='BUFFER_GRAPHQL_ERROR');
  responseError=undefined;

  // Transaction-contract fixture: calls the actual draft-test implementation.
  // Live PostgreSQL isolation and real Buffer delivery remain separate gates.
  let events=[],tail=Promise.resolve();
  const sql=async(parts,...values)=>{
    const q=parts.join('?').replace(/\s+/g,' ');
    if(q.includes('pg_advisory_xact_lock')) return [];
    if(q.includes('select details')) {
      const event=q.includes("event='buffer_draft_test_started'")?'buffer_draft_test_started':'buffer_draft_test_receipt';
      return events.filter(e=>e.key===values[0]&&e.event===event).slice(-1).map(e=>({details:e.details}));
    }
    if(q.includes('insert into os_activity')) {
      const event=q.match(/values\('owner','([^']+)'/)[1];
      events.push({event,key:values[0],details:values[1]});return [];
    }
    throw Error(`Unhandled fixture query: ${q}`);
  };
  sql.json=x=>x;
  sql.begin=async fn=>{
    let release;const previous=tail;tail=new Promise(resolve=>{release=resolve;});await previous;
    try{return await fn(sql);}finally{release();}
  };
  const dbPath=join(dir,'affiliate-db.js');
  require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{db:()=>sql}};
  const {testBufferDraft}=require(join(dir,'business-os/buffer-test.js'));
  const before=createCount;
  const concurrent=await Promise.all([testBufferDraft(),testBufferDraft(),testBufferDraft()]);
  assert.equal(createCount,before+1,'Concurrent tests produce one external mutation');
  assert.ok(concurrent.some(r=>r.verified));
  post=posts.get(`post${createCount}`);
  assert.equal(post.status,'draft');
  assert.match(post.text,/Draft only/);
  await testBufferDraft();
  assert.equal(createCount,before+1,'Later retries read the saved receipt');
  failRead=true;
  assert.equal((await testBufferDraft()).verified,false);
  assert.equal(createCount,before+1,'Read failures cannot repeat creation');
  failRead=false;
  post.status='sent';post.sentAt='2026-09-19T06:00:00Z';
  assert.equal((await testBufferDraft()).verified,false,'Unexpected provider state is not called a successful draft test');
  events=[];dropCreate=true;
  const countBeforeUnknown=createCount;
  assert.equal((await testBufferDraft()).verified,false);
  await testBufferDraft();
  assert.equal(createCount,countBeforeUnknown+1,'A lost mutation response stays blocked across retries');
  assert.equal(events.filter(e=>e.event==='buffer_draft_test_started').length,1);
  console.log('PASS: organization discovery, exact X selection, unavailable channel gates, safe inputs, draft defaults, redacted errors, readback, concurrent/replayed test deduplication, and unknown-outcome protection. Offline fixtures only.');
} finally {
  globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env)) if(!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env,savedEnv);
  rmSync(dir,{recursive:true,force:true});
}
