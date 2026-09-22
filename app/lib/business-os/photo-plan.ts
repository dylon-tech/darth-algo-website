/** Product-led premium campaigns for the standing photo-only publishing instruction. */
export type PhotoSlide = {title:string;line:string;image:string|null;alt:string};
export type PhotoPlan = {id:string;label:string;caption:string;slides:PhotoSlide[]};
const chart=(title:string,line:string,image:string,alt:string):PhotoSlide=>({title,line,image,alt:`${alt} Recorded product example, not live signals.`});
const discover:PhotoSlide={title:"Your chart. Upgraded.",line:"See Darth Algo on TradingView. Explore the tools and free community.",image:null,alt:"Darth Algo indicators, free community and official social pages at darthalgo.com/links."};
const plans:PhotoPlan[]=[
 {id:"context",label:"DARTH ALGO SWING",caption:"See the trend cloud and signal context together with Darth Algo Swing on TradingView.",slides:[
  chart("See the trend.","Darth Algo Swing puts the trend cloud directly on your TradingView chart.","swing-trend-cloud.png","Darth Algo Swing chart with green and red trend context."),
  chart("Signals. In context.","Buy and sell markers alongside price action. Review the setup before you act.","signal-context-alt.png","Darth Algo buy and sell markers alongside price action."),discover]},
 {id:"signals",label:"DARTH ALGO SCALPER",caption:"Meet Darth Algo Scalper: more frequent signals, visible on your TradingView chart.",slides:[
  chart("Spot the setup.","Darth Algo marks buy and sell signals where you already study price: TradingView.","signal-context-alt.png","Darth Algo signals in different chart conditions."),
  chart("Built for your pace.","Scalper surfaces more frequent setups. Your entry rules still decide the trade.","scalper-execution.png","Recorded Darth Algo Scalper chart and signal markers."),discover]},
 {id:"risk",label:"DARTH ALGO TRADE LEVELS",caption:"Entry. Stop. Targets. Explore Darth Algo trade levels on TradingView before planning your next setup.",slides:[
  chart("Entry. Stop. Targets.","See the trade levels together on your TradingView chart. Define your risk before entry.","swing-risk-plan.png","Darth Algo trade levels showing entry, stop and possible targets."),
  chart("The full chart matters.","A target marks a possible exit. Price can move against the setup, so define your risk first.","swing-overview.png","Darth Algo Swing chart with surrounding price structure."),discover]},
 {id:"tools",label:"SWING / SCALPER / PRO",caption:"Swing or Scalp? Get both modes with Darth Algo Pro on TradingView. Compare the tools.",slides:[
  chart("Catch the bigger picture.","Darth Algo Swing: broader moves, fewer signals, clear trend context on TradingView.","swing-overview.png","Recorded Darth Algo Swing chart."),
  chart("Turn up the pace.","Scalper: more frequent signals. Pro: switch between Swing and Scalp.","scalper-execution.png","Recorded Darth Algo Scalper chart."),{...discover,title:"Two modes. One Pro.",line:"Explore Darth Algo Pro on TradingView. Switch modes to match your process."}]},
 {id:"community",label:"DARTH ALGO COMMUNITY",caption:"Your charts. Your questions. Join the free Darth Algo community for indicator help and trading education.",slides:[
  chart("Your chart has a crew.","Join the free Darth Algo community for TradingView indicator help and chart discussions.","swing-trend-cloud.png","Recorded Darth Algo trend chart for educational discussion."),
  chart("See it. Discuss it.","Bring a real setup. Discuss the trend, signal and risk levels with the community.","swing-risk-plan.png","Recorded Darth Algo risk-plan chart for educational discussion."),{...discover,title:"Join the community.",line:"Open the links page for our free Telegram community, education and official channels."}]},
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
