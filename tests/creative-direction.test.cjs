/* Regression through the real model request builder; no provider calls. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map(),requests=[];let reserved=0,recorded=0;
const env={AI_OS_AI_ENABLED:'true',OPENAI_API_KEY:'synthetic-never-sent',AI_OS_MODEL:'synthetic-model'};
const mocks={
 'agent-suggestions':{suggestionKinds:[]},
 'indicator-policy':{indicatorJsonSchema:{},freeIndicatorInstructions:'',validateIndicator:()=>{}},
 'indicator-research':{observedIndicatorUrls:()=>[]},
 'competitor-research':{competitorThumbnails:async()=>[{id:'fixture',title:'Dated public competitor thumbnail',part:{type:'input_image',image_url:'data:image/png;base64,c3ludGhldGlj',detail:'low'}}]},
 'policy':{actionKinds:[],departments:['content','research','ceo'],registry:['content','research','ceo'].map(id=>({id,mandate:'Synthetic internal assignment'})),validatePlan:value=>value},
 'pilot-policy':{pilot:{model:'synthetic-model',maxOutputTokens:2500},assertPilotRequest:()=>{}},
 'budget':{reserveRecurringBudget:async()=>{reserved++;},recordRecurringUsage:async()=>{recorded++;},holdRecurringReservation:async()=>{}},
 'business-focus':{revenueFocus:''},
 'operating-playbooks':{operatingPlaybook:()=>'',operatingPlaybookVersion:'synthetic'},
};
function load(file){
 const basename=path.basename(file,'.ts');if(mocks[basename])return mocks[basename];
 if(cache.has(file))return cache.get(file);
 assert.notEqual(basename,'social-visual-standard','Active specialist must not load the superseded scene/metallic-type thumbnails');
 const exports={};cache.set(file,exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),process:{env},Buffer,AbortSignal,console:{info:()=>{},warn:()=>{}},fetch:async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:20},output:[{content:[{type:'output_text',text:JSON.stringify({brief:'Internal draft prepared; no file rendered.',tasks:[],proposals:[],xDraft:null})}]}]});
 }},{filename:file});
 return exports;
}
(async()=>{
 const creative=load(path.resolve('app/lib/business-os/creative-playbook.ts'));
 const evidence=creative.creativePlaybookEvidence();
 assert.equal(evidence.data.version,'DA-CREATIVE-20261116-v1');
 assert.equal(evidence.data.ownerCreativeTemplates.photo.version,'DA-PHOTO-20261112-v4-REFINED');
 assert.equal(evidence.data.ownerCreativeTemplates.video.version,'DA-VIDEO-v15');
 assert.match(evidence.scope,/written production standards/);
 assert.match(evidence.data.visualCoverage,/not attached/);
 for(const role of ['content','research','growth','operations','analytics','ceo']){
  const direction=creative.creativeDirection(role);
  assert.match(direction,/five complete future America\/New_York dates/);
  assert.match(direction,/one original finished image and one original finished video per day/);
  assert.match(direction,/DARTH stays red and ALGO white/);
  assert.match(direction,/matte condensed italic/);assert.match(direction,/borderless captions/);
  assert.match(direction,/existing approved ElevenLabs voice assets only when/);
  assert.match(direction,/current native renderer is v4\/v15-derived and uses Kokoro/);
  assert.match(direction,/not proof of exact approved video fidelity/);
  assert.match(direction,/\$5 per UTC month/);assert.match(direction,/maximum 100 attempts/);
  assert.doesNotMatch(direction,/The owner handles social video creation|Do not generate, commission|four-photo reference pack is the mandatory|extra-heavy condensed forward-italic metallic/);
 }
 const {generatePlan}=load(path.resolve('app/lib/business-os/model.ts'));
 await generatePlan('Prepare the next five days of video and photo handoffs.',[evidence],[],[],'content',false,'creative-fixture');
 const content=requests[0].body,input=JSON.parse(content.input[0].content);
 assert.equal(typeof content.input[0].content,'string','No retired style image is attached');
 assert.equal(input.creativePolicyVersion,creative.ownerCreativeVersion);
 assert.equal(input.socialReferenceVersion,null);assert.deepEqual(input.socialReferenceOrder,[]);
 assert.match(input.visualCoverage,/not attached/);
 assert.match(content.instructions,/This specialist has no rendering\/publishing tools/);
 assert.match(content.instructions,/otherwise return xDraft:null/);
 assert.doesNotMatch(content.instructions,/four-photo reference pack|Latest founder typography rule|September 24 is educational|The owner handles social video creation/);
 assert.equal(reserved,1);assert.equal(recorded,1,'Existing model usage accounting remains intact');
 await generatePlan('Review supplied competitor observations.',[evidence],[],[],'research',false,'research-fixture');
 const research=requests[1].body,researchInput=JSON.parse(research.input[0].content[0].text);
 assert.equal(research.input[0].content[1].type,'input_image','Legitimate dated competitor thumbnails remain available');
 assert.match(researchInput.visualCoverage,/competitor thumbnails/);
 assert.match(researchInput.visualCoverage,/do not claim to watch videos or inspect the approved templates/);
 env.AI_OS_AI_ENABLED='false';
 await assert.rejects(generatePlan('No activation.',[evidence],[],[],'content',false,'disabled-fixture'),/AI_DISABLED/);
 assert.equal(requests.length,2,'Policy correction does not activate disabled model calls');
 console.log('PASS current creative policy reaches specialist payloads; retired visuals removed, template/voice limits explicit, research imagery and execution/budget gates preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
