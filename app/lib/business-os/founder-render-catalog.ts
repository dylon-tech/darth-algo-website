import catalog from './founder-render-catalog.json';
export const founderRenderLessons=catalog.map(({id,title,idea,sourceLabel})=>({id,title,idea,sourceLabel}));
export function founderRenderBrief(item:{title?:string;idea?:string;script?:string;type?:string}){
 const lesson=catalog.find(row=>row.title.toLowerCase()===(item.title||'').trim().toLowerCase());
 if(!lesson)return {supported:false,reason:'This custom idea needs source review. Choose a reviewed lesson for automatic creation.'};
 if((item.idea||'').trim()&&![(lesson.idea)].includes((item.idea||'').trim()))return {supported:false,reason:'Your changed idea needs source review. Choose a reviewed lesson to reset its source plan, or save this custom draft.'};
 const script=(item.script||'').trim();
 if(script&&(item.type!=='video'||script!==lesson.script))return {supported:false,reason:'Your changed script needs source review before automatic creation. Your saved copy is preserved.'};
 return {supported:true,reason:'Reviewed lesson and genuine product sources selected.',recipeId:lesson.id};
}
