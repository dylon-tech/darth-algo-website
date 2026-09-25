const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const cache=new Map();
function load(file){file=require('node:path').resolve(file);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);cache.set(file,m);m.filename=file;m.paths=module.paths;m.require=function(id){if(id.startsWith('.'))return load(require('node:path').resolve(require('node:path').dirname(file),id)+'.ts');return require(id);};m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {worldState,growthGoal,workMotion}=load('app/owner/world/model.ts');
const at='2026-09-25T12:00:00.000Z',now=Date.parse(at);
const agent={id:'research',name:'Research',configured:true,latest:null,current:null,next:null,completed:{id:'r1',finishedAt:at},waiting:0,task:null};
const data={checkedAt:at,team:[agent],desk:{checkedAt:at,paused:false,autonomy:true,budget:{available:true},scheduler:{lastSeenAt:at},activity:[{id:'1',at,event:'job_started'},{id:'1',at,event:'job_started'}]},suggestions:[],health:{rating:'Great',reason:'No blockers observed'},finances:{income:{incomeCents:105000},bills:[{name:'Known',amountCents:12000,status:'confirmed',cadence:'annual'},{name:'Unverified',amountCents:99999,status:'estimated',cadence:'monthly'}]}};
let w=worldState(data,true,now);assert.equal(w.agents[0].status,'Offline');assert.equal(w.billsCents,1000);assert.equal(w.missingBills,1);assert.equal(w.events.length,1);assert.equal(w.goal.targetCents,300000);assert.equal(w.goal.level,1);
agent.latest={id:'r2',status:'running',createdAt:at,step:'agent_reading_sources'};w=worldState(data,true,now);assert.equal(w.agents[0].status,'Online');assert.equal(w.agents[0].stage,'agent reading sources');
data.desk.paused=true;assert.equal(worldState(data,true,now).agents[0].status,'Online');assert.equal(worldState(data,true,now).health.rating,'Unknown');
agent.latest=null;assert.equal(worldState(data,true,now).agents[0].status,'Paused');data.desk.paused=false;
assert.equal(worldState(data,false,now).agents[0].status,'Stale / Unverified');assert.equal(worldState(data,true,now+91000).fresh,false);
agent.latest={id:'r2',status:'running',createdAt:new Date(now-301000).toISOString()};assert.equal(worldState(data,true,now).agents[0].active,false);
agent.latest={id:'r3',status:'failed',errorCode:'TEST_ONLY'};assert.equal(worldState(data,true,now).agents[0].status,'Error');agent.latest=null;agent.configured=false;assert.equal(worldState(data,true,now).agents[0].status,'Not configured');agent.configured=true;
data.suggestions=[{department:'research',state:'pending'}];assert.equal(worldState(data,true,now).agents[0].status,'Needs approval');
assert.equal(growthGoal(null).fraction,null);assert.equal(growthGoal(0).fraction,0);assert.equal(growthGoal(900000).targetCents,2700000);
data.finances.bills=[];assert.equal(worldState(data,true,now).billsCents,null);
const map=JSON.parse(fs.readFileSync('public/hq-world/campus.tmj','utf8'));assert.equal(map.layers.find(x=>x.name==='Departments').objects.length,8);assert.equal(map.tilewidth,16);assert.equal(map.layers.find(x=>x.name==='Ground').data.length,map.width*map.height);
console.log('HQ World: presence, stale/future evidence, pause/in-flight, deduplication, bills, milestones and eight-room map verified with isolated fixtures.');

assert.equal(workMotion({active:true,status:'Online'}),'working');for(const status of ['Offline','Paused','Stale / Unverified'])assert.equal(workMotion({active:false,status}),'resting');for(const status of ['Blocked','Needs approval','Error'])assert.equal(workMotion({active:false,status}),'attention');
