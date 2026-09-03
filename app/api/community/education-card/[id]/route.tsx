import { ImageResponse } from "next/og";
import { getEducationPost } from "../../../../lib/community-education";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getEducationPost(id);
  if (!post) return new Response("Not found", { status: 404 });
  const quotes = Array.isArray(post.market_snapshot) ? post.market_snapshot : [];
  const timestamp = new Date(post.created_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(145deg,#07090d 0%,#111720 62%,#2a0909 100%)",color:"white",padding:"58px",fontFamily:"Arial, sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:23,fontWeight:900,letterSpacing:5,color:"#ef4444"}}>DARTH ALGO</div><div style={{fontSize:18,color:"#a1a1aa"}}>FUTURES EDUCATION • 72-HOUR DROP</div></div>
      <div style={{fontSize:23,color:"#fca5a5",fontWeight:800,marginTop:32}}>{post.market}</div>
      <div style={{fontSize:53,fontWeight:900,lineHeight:1.06,marginTop:10}}>{post.title}</div>
      <div style={{display:"flex",gap:14,marginTop:30}}>{quotes.map((item)=><div key={item.symbol} style={{flex:1,display:"flex",flexDirection:"column",border:"1px solid #3f3f46",borderRadius:16,background:"rgba(17,24,39,.9)",padding:17}}><div style={{fontSize:15,color:"#a1a1aa"}}>{item.label}</div><div style={{fontSize:24,fontWeight:900,marginTop:6}}>{item.price===null?"Check chart":item.price.toLocaleString("en-US",{maximumFractionDigits:2})}</div><div style={{fontSize:15,color:item.changePercent===null?"#a1a1aa":item.changePercent>=0?"#4ade80":"#f87171",marginTop:5}}>{item.changePercent===null?"Delayed feed unavailable":`${item.changePercent>=0?"+":""}${item.changePercent.toFixed(2)}%`}</div></div>)}</div>
      <div style={{display:"flex",flexDirection:"column",gap:17,marginTop:30}}>{post.bullets.map((bullet,index)=><div key={bullet} style={{display:"flex",gap:18,alignItems:"flex-start",border:"1px solid #27272a",borderRadius:17,background:"rgba(0,0,0,.22)",padding:"20px 22px"}}><div style={{width:38,height:38,borderRadius:19,display:"flex",alignItems:"center",justifyContent:"center",background:"#dc2626",fontWeight:900,fontSize:20,flexShrink:0}}>{index+1}</div><div style={{fontSize:21,lineHeight:1.42,color:"#e4e4e7"}}>{bullet}</div></div>)}</div>
      <div style={{marginTop:24,borderLeft:"5px solid #ef4444",padding:"4px 0 4px 20px",display:"flex",flexDirection:"column"}}><div style={{fontSize:17,color:"#fca5a5",fontWeight:800}}>CHART FOCUS</div><div style={{fontSize:22,fontWeight:700,marginTop:6}}>{post.chart_focus}</div></div>
      <div style={{marginTop:"auto",display:"flex",justifyContent:"space-between",fontSize:15,color:"#a1a1aa"}}><div>Snapshot: {timestamp} • Data may be delayed</div><div>Educational only • Not financial advice • Trading involves risk</div></div>
    </div>,
    { width: 1200, height: 1200 },
  );
}
