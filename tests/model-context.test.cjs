const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const dir=mkdtempSync(join(tmpdir(),'context-test-'));
try{
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--outDir',dir,'app/lib/business-os/model-context.ts']);
 const {modelContext}=require(join(dir,'business-os/model-context.js'));
 const evidence=Array.from({length:20},(_,i)=>({id:i===0?'business_knowledge':'source_'+i,status:'verified',checkedAt:'2026-09-23',scope:'Not a complete population.',data:Array.from({length:100},(_,n)=>({url:'https://example.com/'+n,text:'界'.repeat(700)}))}));
 evidence[0].data={products:[{name:'Swing',price:'unchanged'}]};
 const input={message:'Complete an internal task.',evidence,openTasks:Array(50).fill({title:'Task'.repeat(200)}),history:Array(4).fill('Context'.repeat(3000)),verifiedCalculations:{events:123}};
 const original=JSON.stringify(input);
 for(const limit of [48000,29000]){
  const packed=modelContext(input,limit),parsed=JSON.parse(packed);
  assert.ok(Buffer.byteLength(packed)<=limit);
  assert.equal(parsed.evidence.length,20);
  assert.deepEqual(parsed.evidence[0].data,input.evidence[0].data);
  assert.deepEqual(parsed.verifiedCalculations,{events:123});
  assert.ok(parsed.evidence[1].data.contextOmitted);
  assert.equal(JSON.stringify(input),original,'Complete snapshot stays unchanged');
 }
 console.log('Bounded context preserves facts, scope and full snapshots; UTF-8 limit passed.');
}finally{rmSync(dir,{recursive:true,force:true});}
