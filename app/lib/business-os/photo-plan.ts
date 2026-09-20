/** Owned-chart lessons for the standing photo-only publishing instruction. */
export type PhotoSlide = {title:string;line:string;image:string|null;alt:string};
export type PhotoPlan = {id:string;label:string;caption:string;slides:PhotoSlide[]};
const chart=(title:string,line:string,image:string,alt:string):PhotoSlide=>({title,line,image,alt:`${alt} Recorded product example, not live signals.`});
const discover:PhotoSlide={title:"Your next step.",line:"Explore the indicators, join the free community, and find every official Darth Algo page.",image:null,alt:"Darth Algo indicators, free community and official social pages at darthalgo.com/links."};
const plans:PhotoPlan[]=[
 {id:"context",label:"CHART CONTEXT",caption:"Start with the bigger picture. Review the trend context before focusing on an individual signal.",slides:[
  chart("Context comes first.","Read the surrounding trend before deciding what a single signal means.","swing-trend-cloud.png","Darth Algo Swing chart with green and red trend context."),
  chart("Then the setup.","Compare the signal with nearby price action. Make a plan before acting.","signal-context-alt.png","Darth Algo buy and sell markers alongside price action."),discover]},
 {id:"signals",label:"SIGNAL STUDY",caption:"A signal starts the review. Compare its context, nearby price structure and your trade plan before acting.",slides:[
  chart("Pause. Read. Decide.","Use a signal as a prompt to review the chart—not as a substitute for a trading plan.","signal-context-alt.png","Darth Algo signals in different chart conditions."),
  chart("Choose your pace.","Scalper shows more frequent setups. Review each one against your own entry rules.","scalper-execution.png","Recorded Darth Algo Scalper chart and signal markers."),discover]},
 {id:"risk",label:"TRADE PLANNING",caption:"Know the invalidation before the entry. Review the stop and potential targets as part of your plan.",slides:[
  chart("Plan the exit.","Locate the entry, stop and possible targets before deciding whether to take a setup.","swing-risk-plan.png","Darth Algo trade levels showing entry, stop and possible targets."),
  chart("Keep the context.","A target marks a possible exit. Price can move against the setup, so define your risk first.","swing-overview.png","Darth Algo Swing chart with surrounding price structure."),discover]},
 {id:"tools",label:"FIND YOUR STYLE",caption:"Fewer signals or faster setups? Compare Swing and Scalper, or switch between both modes with Pro.",slides:[
  chart("Give swings room.","Swing focuses on broader moves with fewer signals.","swing-overview.png","Recorded Darth Algo Swing chart."),
  chart("Study faster setups.","Scalper shows more frequent signals. Pro lets you switch between Swing and Scalp.","scalper-execution.png","Recorded Darth Algo Scalper chart."),{...discover,title:"Find your tool.",line:"Compare Swing, Scalper and Pro. Choose the approach that fits your trading process."}]},
 {id:"community",label:"LEARN TOGETHER",caption:"Bring your chart questions. Explore Darth Algo education, indicator help and the free trading community from our links page.",slides:[
  chart("Bring your chart.","Use a clear chart example to discuss context, setups and the questions you are working through.","swing-trend-cloud.png","Recorded Darth Algo trend chart for educational discussion."),
  chart("Ask better questions.","What is the context? Where is the setup invalidated? Which levels matter to the plan?","swing-risk-plan.png","Recorded Darth Algo risk-plan chart for educational discussion."),{...discover,title:"Find your community.",line:"Open the links page for our free Telegram community, education and official channels."}]},
];
export function photoPlanForDay(now=new Date()):PhotoPlan {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const value=(name:string)=>Number(parts.find(p=>p.type===name)!.value);
 const day=Math.floor(Date.UTC(value("year"),value("month")-1,value("day"))/86400000);
 return plans[((day%plans.length)+plans.length)%plans.length];
}
export function photoCaption(plan:PhotoPlan){
 // One caption fits X, Threads and Instagram without platform-specific rewrites.
 return `${plan.caption}\n\nTools + community: https://www.darthalgo.com/links\n\nRecorded example. Trading involves risk.\n#DarthAlgo`;
}
