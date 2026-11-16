import {db} from '../affiliate-db';
import {founderRenderLessons} from './founder-render-catalog';
import type {Evidence} from './sources';
export type ResearchIdea={id:string;title:string;url:string;checkedAt:string;observation:string;hypothesis:string;lessonId:string|null;adaptation:string};
export type FounderResearchSnapshot={status:'ready'|'partial';saved:Evidence;ideas:ResearchIdea[]};
const curated:ResearchIdea[]=[
 {id:'lux-library',title:'Teach one feature, then one next step',url:'https://www.luxalgo.com/library/',checkedAt:'2026-11-15',observation:'Manually reviewed product library: concept-to-tool demonstrations and next steps.',hypothesis:'Test a short, single-feature lesson rather than a broad product pitch.',lessonId:'one-feature',adaptation:'Uses our existing “One feature, one clear lesson” recipe and genuine Darth Algo chart. This is a broad educational-format adaptation, not a recreation of the competitor demo.'},
 {id:'flux-clarity',title:'Make one chart easier to read',url:'https://www.fluxcharts.com/',checkedAt:'2026-11-15',observation:'Manually reviewed product site: chart clarity and workflow framing.',hypothesis:'Test a phone-readable chart lesson with one takeaway.',lessonId:'chart-readable',adaptation:'Uses our existing “Keep the chart readable” recipe. It does not claim the same feature, chart, or result as Flux Charts.'},
 {id:'prime-guide',title:'A concise feature lesson with context',url:'https://chartprime.com/strategies',checkedAt:'2026-11-15',observation:'Manually reviewed strategy pages: concise feature descriptions with fuller guides.',hypothesis:'Test a feature-and-limitation explanation with a longer guide as the next step.',lessonId:null,adaptation:'Needs source review: a specific limitation and guide must be verified before this new concept can be generated.'}
];
export function researchIdeas(){return curated.map(idea=>({...idea,lessonId:founderRenderLessons.some(lesson=>lesson.id===idea.lessonId)?idea.lessonId:null}));}
export function savedResearchPosts(value:unknown,checkedAt:string):ResearchIdea[]{
 if(!value||typeof value!=='object')return [];const data=value as {parserVersion?:unknown;posts?:unknown};
 if(data.parserVersion!==2||!Array.isArray(data.posts)||!Number.isFinite(Date.parse(checkedAt)))return [];
 const seen=new Set<string>();return data.posts.slice(0,50).flatMap((raw:unknown)=>{
  if(!raw||typeof raw!=='object')return [];const p=raw as Record<string,unknown>;if(typeof p.url!=='string')return [];
  try{const u=new URL(p.url);if(u.protocol!=='https:'||u.username||u.password||u.port)return [];
   const ig=['instagram.com','www.instagram.com'].includes(u.hostname)&&/^\/(reel|p)\/[\w-]+\/?$/.test(u.pathname);
   const tt=['tiktok.com','www.tiktok.com'].includes(u.hostname)&&/^\/@[\w.-]+\/video\/\d+\/?$/.test(u.pathname);if(!ig&&!tt)return [];
   u.search='';u.hash='';u.hostname=ig?'www.instagram.com':'www.tiktok.com';if(seen.has(u.href))return [];seen.add(u.href);
   return [{id:`saved-${seen.size}`,title:`Saved ${ig?'Instagram':'TikTok'} research link`,url:u.href,checkedAt,observation:'Post link observed in saved vidIQ discovery. Video content and performance have not been independently verified.',hypothesis:'Review the source for one original educational angle before proposing a new lesson.',lessonId:null,adaptation:'Needs source review. No automatic recipe match or performance ranking is inferred from a caption or keyword.'}];
  }catch{return [];}
 }).slice(0,10);
}
export async function founderResearch(sql=db()):Promise<FounderResearchSnapshot>{
 const base:Evidence={id:'saved_indicator_social',status:'unavailable',checkedAt:new Date().toISOString(),scope:'Saved vidIQ discovery only. No provider calls, credits, watched-video claims, conversion evidence, or cross-platform comparisons. Observation date is not the post publication date.',data:null};
 try{const [table]=await sql`select to_regclass('public.os_vidiq_discovery') as present`;if(!table?.present)return {status:'ready',saved:base,ideas:researchIdeas()};
 const [row]=await sql`select result,checked_at from os_vidiq_discovery where status='observed_posts' and result->>'parserVersion'='2' order by checked_at desc nulls last limit 1`;
 const at=row?.checked_at?new Date(row.checked_at).toISOString():'';const posts=savedResearchPosts(row?.result,at);
 return {status:'ready',saved:posts.length?{...base,status:'verified',checkedAt:at,data:posts}:base,ideas:researchIdeas()};
 }catch{return {status:'partial',saved:base,ideas:researchIdeas()};}
}
