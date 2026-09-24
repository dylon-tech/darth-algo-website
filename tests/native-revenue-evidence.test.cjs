const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
(async()=>{
 const {PGlite}=await import(process.env.OS_TEST_PGLITE_MODULE);const database=new PGlite();let queries=[];
 const sql=async(parts,...values)=>{const query=parts.reduce((a,p,i)=>a+(i?'$'+i:'')+p,'');queries.push(query);return (await database.query(query,values)).rows;};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/business-os/native-revenue-evidence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>n==='../affiliate-db'?{db:()=>sql}:require(n),Date,Array,Promise});
 try{
  await database.exec(fs.readFileSync('app/lib/business-os/schema.ts','utf8').match(/export const schema = `([\s\S]*?)`;/)[1]);
  let result=await exports.nativeRevenueEvidence();
  assert.equal(result[0].status,'verified');assert.equal(result[0].data.recorded_cases,0);assert.equal(result[0].data.providerInboxCoverage,'unavailable');
  assert.equal(result[1].data.recorded_opportunities,0);assert.equal(result[1].data.lastSync,null);assert.equal(result[1].data.churnRate,null);
  await database.exec("insert into os_support_conversations(id,provider,provider_thread_id,category,status,last_message_at,requires_founder,summary) values('00000000-0000-0000-0000-000000000001','instagram','private-thread','billing','escalated',now(),true,'SECRET CUSTOMER TEXT'); insert into os_retention_opportunities(id,opportunity_key,stripe_customer_id,subscription_id,reason,status) values('00000000-0000-0000-0000-000000000002','private-key','cus_private','sub_private','cancellation','contact_ready'); insert into os_activity(actor,event,details) values('retention','retention_sync','{\"status\":\"stripe_unavailable\",\"checkedAt\":\"2026-09-24T08:00:00Z\"}');");
  result=await exports.nativeRevenueEvidence();
  assert.equal(result[0].data.open_cases,1);assert.equal(result[0].data.needs_owner,1);
  assert.equal(result[1].data.recorded_opportunities,1);assert.equal(result[1].data.lastSync.status,'stripe_unavailable');assert.equal(result[1].data.coverage,'partial_persisted_ledger');
  assert.doesNotMatch(JSON.stringify(result),/SECRET CUSTOMER TEXT|private-thread|private-key|cus_private|sub_private/);
  assert(queries.every(q=>q.trim().startsWith('select ')),'Evidence reads must never mutate or send');
  await database.exec('drop table os_support_conversations'); // isolated fixture only
  result=await exports.nativeRevenueEvidence();assert.equal(result[0].status,'unavailable');assert.equal(result[0].data,null);assert.equal(result[1].status,'verified');
  await database.exec('drop table os_retention_opportunities');
  result=await exports.nativeRevenueEvidence();assert.equal(result[1].status,'unavailable');assert.equal(result[1].data,null);
  console.log('PASS native evidence: real PostgreSQL queries, empty vs missing, partial/stale sync provenance, independent failures, aggregate-only privacy and read-only behavior.');
 }finally{await database.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
