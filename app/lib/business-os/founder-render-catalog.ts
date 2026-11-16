import catalog from './founder-render-catalog.json';
import {validateFounderBrief,founderBriefScript,type FounderBriefSnapshot} from './founder-brief-policy';
export const founderRenderLessons=catalog.map(({id,title,idea,sourceLabel})=>({id,title,idea,sourceLabel}));
export function founderRenderBrief(item:{title?:string;idea?:string;script?:string;caption?:string;type?:string;renderBrief?:FounderBriefSnapshot}){
 if(item.renderBrief){try{const plan=validateFounderBrief(item.renderBrief.plan);if(!/^[a-f0-9]{64}$/.test(item.renderBrief.hash)||item.script!==founderBriefScript(plan,item.type||'')||item.caption!==plan.caption)throw Error();return {supported:true,reason:'Source-matched educational plan selected. Finished media still needs review.',recipeId:'dynamic-'+item.renderBrief.hash};}catch{return {supported:false,reason:'The saved source plan changed. Review this content before creating it.'};}}
 const lesson=catalog.find(row=>row.title.toLowerCase()===(item.title||'').trim().toLowerCase());
 if(!lesson)return {supported:false,reason:'This custom idea needs source review. Choose a reviewed lesson for automatic creation.'};
 if((item.idea||'').trim()&&![(lesson.idea)].includes((item.idea||'').trim()))return {supported:false,reason:'Your changed idea needs source review. Choose a reviewed lesson to reset its source plan, or save this custom draft.'};
 const script=(item.script||'').trim();
 if(script&&(item.type!=='video'||script!==lesson.script))return {supported:false,reason:'Your changed script needs source review before automatic creation. Your saved copy is preserved.'};
 return {supported:true,reason:'Reviewed lesson and genuine product sources selected.',recipeId:lesson.id};
}
