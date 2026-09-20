import { db } from "../affiliate-db";
import { queueOwnerNotice } from "./delivery";
import { businessDay, ceoScorecard } from "./ceo-scorecard";
import { homeMenu } from "./telegram-ui";

export async function createDailyBrief() {
 const sql=db(),day=businessDay();
 const [already]=await sql`select id from os_outbox where dedupe_key=${`ceo-brief-v2:${day}:0`} limit 1`;
 if(already){const [brief]=await sql`select * from os_briefs where day=${day}`;return brief || {day};}
 const score=await ceoScorecard();
 const body=score.body.replace('CEO DESK','DAILY BRIEF');
 const [brief]=await sql`insert into os_briefs(day,body,evidence) values(${day},${body},${sql.json({customers:score.customers,posts:score.posts,queue:score.queue,checkedAt:new Date().toISOString(),version:2})}) on conflict(day) do update set body=excluded.body,evidence=excluded.evidence returning *`;
 // Exactly one daily notification. Interactive views continue editing their own panel.
 await queueOwnerNotice(`ceo-brief-v2:${day}`,body,homeMenu());
 console.info(JSON.stringify({event:'ceo_daily_brief',day,customersVerified:score.customers.active!==null,postCount:score.posts.x+score.posts.instagram}));
 return brief;
}
export async function scheduledDailyBrief(){
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(new Date()));
 if(hour<9)return {status:'before_morning_brief'};
 const brief=await createDailyBrief();return {status:'queued_or_delivered',day:brief.day};
}
