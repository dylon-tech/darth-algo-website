'use client';
import type {FounderResearchSnapshot,ResearchIdea} from '../lib/business-os/founder-research';
import type {FounderMediaType} from '../lib/business-os/founder-content-model';
import {ExternalLink,useFounderFeed} from './founder-shared';
import s from './founder.module.css';
export default function FounderResearch({base,onUseLesson}:{base:string;onUseLesson:(lessonId:string,type:FounderMediaType)=>void}){
 const feed=useFounderFeed<FounderResearchSnapshot>(`${base}/founder-research`);
 function card(idea:ResearchIdea){return <article className={s.card} key={idea.id}><h3>{idea.title}</h3><p>{idea.hypothesis}</p>{idea.lessonId?<div className={s.actions}><button className={s.secondary} onClick={()=>onUseLesson(idea.lessonId!,'image')}>Use photo lesson</button><button className={s.secondary} onClick={()=>onUseLesson(idea.lessonId!,'video')}>Use video lesson</button></div>:<p>Needs source review · Generation unavailable.</p>}<ExternalLink href={idea.url}>Review source</ExternalLink><details><summary>Why this idea</summary><p>{idea.observation}</p><p>{idea.adaptation}</p><p>Observed {idea.checkedAt.slice(0,10)} · Not conversion or trading-return evidence.</p></details></article>;}
 const posts=Array.isArray(feed.data?.saved.data)?feed.data.saved.data as ResearchIdea[]:[];
 return <section aria-label='Source-linked research ideas'><h3>Source-linked research ideas</h3><p>Original lessons to test, not proven winners. Choosing a lesson opens its existing recipe; it does not publish or run paid research.</p>{feed.error&&<p role='status'>Saved research could not refresh. No research call was made.</p>}{!feed.data&&feed.loading&&<p>Reading saved research…</p>}{feed.data&&<><h4>Manually reviewed inspiration</h4>{feed.data.ideas.map(card)}<h4>Saved social research</h4>{feed.data.status==='partial'?<p>Saved research is unavailable right now.</p>:!posts.length?<p>No verified research saved yet.</p>:posts.map(card)}<p>Social links are saved discovery metadata, not watched videos. Metrics and conversion winners have not been verified here. No automatic competitor-to-recipe matching.</p></>}</section>;
}
