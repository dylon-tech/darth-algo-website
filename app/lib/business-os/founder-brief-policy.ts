import sources from './founder-brief-sources.json';

export const founderBriefSources=sources;
export type FounderScene={sourceId:string;claimIds:string[];label:string;spoken:string};
export type FounderBriefPlan={schemaVersion:1;sourceVersion:string;title:string;objective:string;headline:string;feature:string;summary:string;caption:string;scenes:FounderScene[]};
export type FounderBriefSnapshot={plan:FounderBriefPlan;hash:string;inputHash:string;fingerprint:string};
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k))&&allowed.every(k=>Object.hasOwn(v,k));
const unsafe=/(?:\d|[$€£%]|https?:|www\.|guarantee|profit|win.?rate|backtest|discount|black\s*friday|lifetime|free\s*trial|promotion|coupon|pricing|(?:product|subscription|monthly|annual)\s+price|\bbuy\b|\bsell\b|\blong\b|\bshort\b|forecast|prediction|return\s+on|outperform|live\s+(?:trade|market)|current\s+(?:trade|market))/i;
function text(v:unknown,max:number){return typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u0008\u000b-\u001f<>{}\\]/.test(v)&&!unsafe.test(v);}
/** Exact approved factual copy and owned sources; visual/creative approval remains separate. */
export function validateFounderBrief(value:unknown):FounderBriefPlan {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('BRIEF_INVALID');
 const p=value as Record<string,unknown>;
 if(!keys(p,['schemaVersion','sourceVersion','title','objective','headline','feature','summary','caption','scenes'])||p.schemaVersion!==1||p.sourceVersion!==sources.version)throw Error('BRIEF_SOURCE_VERSION');
 for(const [key,max] of [['title',160],['objective',240],['headline',58],['feature',58],['summary',180],['caption',600]] as const)if(!text(p[key],max))throw Error('BRIEF_UNSUPPORTED_CLAIM');
 if(!sources.headlines.includes(p.headline as string)||!sources.features.includes(p.feature as string)||!Array.isArray(p.scenes)||p.scenes.length<3||p.scenes.length>6)throw Error('BRIEF_SCENES_INVALID');
 for(const raw of p.scenes){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!keys(raw,['sourceId','claimIds','label','spoken']))throw Error('BRIEF_SCENE_INVALID');
  const source=sources.sources.find(s=>s.id===raw.sourceId);
  if(!source||!Array.isArray(raw.claimIds)||!raw.claimIds.length||raw.claimIds.length>3||new Set(raw.claimIds).size!==raw.claimIds.length||!raw.claimIds.every((id:unknown)=>typeof id==='string'&&Object.hasOwn(source.claims,id)))throw Error('BRIEF_SOURCE_UNSUPPORTED');
  if(!text(raw.label,52)||!text(raw.spoken,600)||!sources.labels.includes(raw.label))throw Error('BRIEF_UNSUPPORTED_CLAIM');
  const expected=raw.claimIds.map((id:string)=>(source.claims as Record<string,string|undefined>)[id]).join(' ');
  if(raw.spoken!==expected)throw Error('BRIEF_UNSUPPORTED_CLAIM');
 }
 const primary=sources.sources.find(s=>s.id===(p.scenes as FounderScene[])[0].sourceId)!;
 if(p.title!==primary.summary||p.objective!==primary.summary||p.summary!==primary.summary||p.caption!==primary.summary+sources.captionSuffix)throw Error('BRIEF_UNSUPPORTED_CLAIM');
 const words=p.scenes.map(s=>s.spoken).join(' ').split(/\s+/).length;
 if(words<45||words>180)throw Error('BRIEF_LENGTH');
 return p as unknown as FounderBriefPlan;
}
export function founderBriefScript(plan:FounderBriefPlan,type:string){return type==='video'?plan.scenes.map(s=>s.spoken).join(' '):'';}
export function canonicalBrief(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonicalBrief).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalBrief((value as Record<string,unknown>)[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function normalizedBriefText(text:string){return text.toLowerCase().replace(/[^a-z]+/g,' ').trim().replace(/\s+/g,' ');}
export function briefCopy(plan:FounderBriefPlan,type:string){return type==='video'?founderBriefScript(plan,type):`${plan.headline} ${plan.summary} ${plan.caption}`;}
export function similarBriefCopy(a:string,b:string){
 const left=normalizedBriefText(a),right=normalizedBriefText(b);if(left===right)return true;
 const shingles=(v:string)=>{const w=v.split(' ');return new Set(w.slice(0,-3).map((_,i)=>w.slice(i,i+4).join(' ')));};
 const x=shingles(left),y=shingles(right);if(!x.size||!y.size)return false;
 const overlap=[...x].filter(s=>y.has(s)).length;
 return overlap/Math.min(x.size,y.size)>=0.7;
}
const sceneSchema={type:'object',additionalProperties:false,required:['sourceId','claimIds','label','spoken'],properties:{
 sourceId:{type:'string',enum:sources.sources.map(s=>s.id)},
 claimIds:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:sources.sources.flatMap(s=>Object.keys(s.claims))}},
 label:{type:'string',enum:sources.labels},spoken:{type:'string',minLength:1,maxLength:600},
}};
const planSchema={type:'object',additionalProperties:false,required:['schemaVersion','sourceVersion','title','objective','headline','feature','summary','caption','scenes'],properties:{
 schemaVersion:{type:'integer',const:1},sourceVersion:{type:'string',const:sources.version},
 ...Object.fromEntries([['title',160],['objective',240],['headline',58],['feature',58],['summary',180],['caption',600]].map(([key,max])=>[key,{type:'string',minLength:1,maxLength:max}])),
 title:{type:'string',enum:sources.sources.map(s=>s.summary)},objective:{type:'string',enum:sources.sources.map(s=>s.summary)},
 headline:{type:'string',enum:sources.headlines},feature:{type:'string',enum:sources.features},summary:{type:'string',enum:sources.sources.map(s=>s.summary)},caption:{type:'string',enum:sources.sources.map(s=>s.summary+sources.captionSuffix)},
 scenes:{type:'array',minItems:3,maxItems:6,items:sceneSchema},
}};
export const founderBriefResponseSchema={type:'object',additionalProperties:false,required:['outcome','reason','plan'],properties:{
 outcome:{type:'string',enum:['ready','needs_source']},reason:{type:'string',maxLength:240},plan:{anyOf:[{type:'null'},planSchema]},
}};
