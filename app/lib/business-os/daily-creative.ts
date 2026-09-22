import {db} from '../affiliate-db';
import {photoPlanForDay,photoCaption} from './photo-plan';
import {currentCreativeVersion} from './creative-version';
import {dailySocialPolicy} from './daily-social-policy';
const keyFor=(now:Date)=>`daily-shared-creative:${currentCreativeVersion}:${new Intl.DateTimeFormat('en-CA',{timeZone:dailySocialPolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}`;
export function validCreativeHook(text:unknown):text is string {
 return typeof text==='string'&&text.trim()===text&&text.length>=15&&text.length<=140&&!/https?:|www\.|#|@|\$|\d\s*%|\b(?:guarantee\w*|profit\w*|win\s*rate|discount|coupon|payout|testimonial)\b/i.test(text);
}
export async function syncDailyCreative(now=new Date()){
 if(process.env.AI_OS_AI_ENABLED!=='true')return {status:'disabled',waiting:false};
 const sql=db(),key=keyFor(now);
 const [saved]=await sql`select id,status,created_at from os_jobs where request_key=${key}`;
 if(saved)return {status:String(saved.status),waiting:['queued','running'].includes(saved.status)&&Date.now()-new Date(saved.created_at).getTime()<30*60*1000};
 const suggestions=await sql`select left(details->>'text',180) as text from os_activity where event='media_suggestion' order by id desc limit 5`;
 const recent=await sql`select details->>'text' as text from os_activity where event='daily_social_ready' order by id desc limit 5`;
 const plan=photoPlanForDay(now),{queueJob}=await import('./jobs');
 await queueJob('content',`Write one fresh product-specific promotional caption hook for today's premium black/red Darth Algo photo campaign on X, Instagram and Threads. Lead with the visible indicator feature and why a trader would inspect it; avoid generic educational maxims. The visuals use the actual full-color logo, prominent owned charts and explicit TradingView context. Use xDraft.text for the hook only: 15–140 characters, no URLs, hashtags, tags, prices, offers, results or profit claims. The server adds the links-page CTA and recorded-example risk note and uses identical images/caption on all three platforms. Return verified evidence IDs. Do not publish or create a proposal.\nToday's owned-chart theme: ${plan.label}. Slides: ${plan.slides.map(s=>s.title+' '+s.line).join(' ')}\nUse the competitor research already in your evidence to improve the original hook, without copying competitor wording or claims.\nOwner topic/style suggestions (preferences, not verified facts): ${JSON.stringify(suggestions)}\nAvoid repeating: ${JSON.stringify(recent)}`,key,'schedule');
 return {status:'queued',waiting:true};
}
export async function dailyCreativeCaption(now=new Date()){
 const sql=db(),key=keyFor(now),plan=photoPlanForDay(now);
 const [run]=await sql`select r.result,r.snapshot from os_jobs j join os_runs r on r.id=j.run_id where j.request_key=${key} and j.status='succeeded' and r.status='completed' and r.department='content'`;
 const draft=run?.result?.xDraft;
 const verified=Array.isArray(run?.snapshot)&&Array.isArray(draft?.evidence)&&draft.evidence.length>0&&draft.evidence.every((id:string)=>run.snapshot.some((s:{id:string;status:string})=>s.id===id&&s.status==='verified'));
 return photoCaption(verified&&validCreativeHook(draft?.text)?{...plan,caption:draft.text}:plan);
}
