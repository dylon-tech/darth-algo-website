import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const steps = [
  ["1", "Choose your plan", "Visit darthalgo.com/#pricing and select Scalper, Swing, Pro, or Lifetime."],
  ["2", "Enter your username", "At checkout, enter the exact TradingView username connected to your account."],
  ["3", "Wait for access", "Invite-only access is normally added within 24 hours after purchase."],
  ["4", "Open TradingView", "Open your chart, then select Indicators from the top toolbar."],
  ["5", "Find Invite-only Scripts", "Open Invite-only Scripts and select the Darth Algo indicator you purchased."],
  ["6", "Add it to your chart", "Start in paper trading while you learn the signals and risk controls."],
];

export async function GET() {
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(145deg,#07090d 0%,#111720 58%,#2a0909 100%)",color:"white",padding:"64px",fontFamily:"Arial, sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:24,fontWeight:800,letterSpacing:5,color:"#ef4444"}}>DARTH ALGO</div>
        <div style={{fontSize:20,color:"#a1a1aa"}}>TRADINGVIEW SETUP GUIDE</div>
      </div>
      <div style={{fontSize:54,fontWeight:900,marginTop:28}}>Purchase to chart—in six steps</div>
      <div style={{fontSize:23,color:"#d4d4d8",marginTop:12}}>Follow these steps after choosing your indicator plan.</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:20,marginTop:34}}>
        {steps.map(([number,title,description])=><div key={number} style={{width:526,minHeight:218,display:"flex",gap:20,border:"1px solid #3f3f46",borderRadius:20,background:"rgba(17,24,39,.9)",padding:24}}>
          <div style={{width:54,height:54,borderRadius:27,display:"flex",alignItems:"center",justifyContent:"center",background:"#dc2626",fontSize:28,fontWeight:900,flexShrink:0}}>{number}</div>
          <div style={{display:"flex",flexDirection:"column"}}><div style={{fontSize:27,fontWeight:800}}>{title}</div><div style={{fontSize:19,lineHeight:1.45,color:"#d4d4d8",marginTop:10}}>{description}</div></div>
        </div>)}
      </div>
      <div style={{marginTop:"auto",display:"flex",justifyContent:"space-between",fontSize:17,color:"#a1a1aa"}}><div>Need help? Message @DarthAlgoAssistantBot</div><div>Educational only • Trading involves risk</div></div>
    </div>,
    { width: 1200, height: 1500 },
  );
}
