import { ImageResponse } from "next/og";
import type { PhotoPlan } from "./photo-plan";
/* eslint-disable @next/next/no-img-element -- next/og ImageResponse requires native image elements. */
// Branded typography template, not a fabricated chart or performance screenshot.
// Runs on the existing server; no paid image-generation API is introduced.
export async function renderSocialArt(text:string,style="crimson") {
  const clean=text.replace(/https?:\/\/\S+/g,"").replace(/#\w+/g,"").trim().slice(0,280);
  const accent=style==="clean"?"#E3BD72":style==="minimal"?"#A596FF":"#F34655";
  const response=new ImageResponse(
    <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",background:"#101116",color:"#F5F5F7",padding:80,fontFamily:"sans-serif",borderTop:`16px solid ${accent}`}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:27,letterSpacing:6}}><span>DARTH ALGO</span><span style={{color:accent}}>FIELD NOTES</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:38}}>
        <div style={{display:"flex",width:100,height:8,background:accent}} />
        <div style={{display:"flex",fontSize:clean.length>210?53:clean.length>130?63:78,lineHeight:1.17,fontWeight:700,letterSpacing:-2}}>{clean}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:22,borderTop:"1px solid #393B45",paddingTop:35}}>
        <div style={{display:"flex",fontSize:30,color:accent}}>TOOLS · COMMUNITY · OFFICIAL SOCIALS</div>
        <div style={{display:"flex",fontSize:34}}>Explore darthalgo.com/links</div>
        <div style={{display:"flex",fontSize:20,color:"#9D9FA8"}}>Educational content. Trading involves risk.</div>
      </div>
    </div>,{width:1080,height:1350});
  return Buffer.from(await response.arrayBuffer());
}

// A reusable three-slide product lesson, using owned recorded charts.
// This is a deterministic design renderer; it adds no paid generation dependency.
export async function renderSocialCarousel(plan:PhotoPlan,style="crimson") {
 // Use the original full-color logo as a PNG: nested SVG images can disappear
 // in next/og. Missing brand assets stop generation instead of silently posting.
 const logoResponse=await fetch('https://www.darthalgo.com/darth-algo-social-logo.png');
 if(!logoResponse.ok)throw Error('CREATIVE_LOGO_UNAVAILABLE');
 const logo=`data:image/png;base64,${Buffer.from(await logoResponse.arrayBuffer()).toString('base64')}`;
 const fontResponse=await fetch('https://www.darthalgo.com/fonts/darth-social/DarthDisplay-Bold.ttf');
 if(!fontResponse.ok)throw Error('CREATIVE_FONT_UNAVAILABLE');
 const displayFont=await fontResponse.arrayBuffer();
 // The premium black/red product-ad system is the standing owner-approved
 // template. Older style preferences may change accent intensity, but never
 // return the daily campaign to the generic "field notes" layout.
 const accent=style==="clean"?"#ff344d":style==="minimal"?"#d51f37":"#ff263f";
 const slides=plan.slides;
 const output=[];
 for(const [index,slide] of slides.entries()) {
  const response=new ImageResponse(<div style={{display:"flex",position:"relative",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",padding:58,background:"radial-gradient(circle at 88% 8%, #4b0712 0%, #130207 26%, #050506 58%)",color:"#fff",fontFamily:"sans-serif",border:`2px solid ${accent}`}}>
   <div style={{display:"flex",position:"absolute",inset:18,border:"1px solid rgba(255,38,63,.28)",borderRadius:28}} />
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:16}}><img src={logo} width={92} height={92} alt="Darth Algo"/><span style={{fontSize:27,fontWeight:900,fontFamily:"Darth Display",letterSpacing:5}}>DARTH ALGO</span></div><span style={{fontSize:19,color:accent,letterSpacing:2}}>TRADINGVIEW TOOLS · 0{index+1}/03</span></div>
   <div style={{display:"flex",flexDirection:"column",gap:18}}><span style={{fontSize:20,letterSpacing:5,color:accent,fontWeight:800}}>{plan.label}</span><div style={{display:"flex",fontSize:76,fontWeight:900,fontFamily:"Darth Display",letterSpacing:-4,lineHeight:1.02,textTransform:"uppercase",maxWidth:940}}>{slide.title}</div><div style={{display:"flex",fontSize:31,lineHeight:1.32,color:"#d4d4d8",maxWidth:900}}>{slide.line}</div></div>
   {slide.image?<div style={{display:"flex",flexDirection:"column",gap:12,border:"2px solid rgba(255,38,63,.55)",borderRadius:24,padding:15,background:"linear-gradient(145deg,#17171b,#070708)",boxShadow:"0 28px 70px rgba(0,0,0,.65)"}}>
    {/* Owned product capture; the exact chart is kept intact. */}
    <img src={`https://www.darthalgo.com/indicators/${slide.image}`} width={934} height={485} style={{objectFit:"contain",borderRadius:14}} alt="" />
    <span style={{fontSize:17,color:"#a1a1aa",letterSpacing:2}}>RECORDED DARTH ALGO EXAMPLE · USED ON TRADINGVIEW</span>
   </div>:<div style={{display:"flex",flexDirection:"column",gap:22}}>
    <div style={{display:"flex",position:"relative",width:960,height:390,padding:"24px 38px",border:"8px solid #444449",borderRadius:58,background:"#050506",boxShadow:"0 24px 60px rgba(255,38,63,.2)",alignItems:"center"}}>
     <img src={`https://www.darthalgo.com/indicators/${plan.slides[0].image||'swing-overview.png'}`} width={868} height={322} style={{objectFit:"contain",borderRadius:24}} alt="Recorded Darth Algo chart in a phone mockup"/>
     <div style={{display:"flex",position:"absolute",left:10,top:135,width:18,height:106,borderRadius:12,background:"#111115"}} />
    </div>
    <span style={{fontSize:17,color:"#a1a1aa",letterSpacing:2}}>RECORDED PRODUCT EXAMPLE · PHONE MOCKUP</span>
    <div style={{display:"flex",gap:12}}>{[["SWING","Broader moves"],["SCALPER","Faster setups"],["PRO","Both modes"]].map(([name,copy])=><div key={name} style={{display:"flex",flex:1,flexDirection:"column",gap:10,padding:18,border:`1px solid ${accent}`,borderRadius:18,background:"linear-gradient(135deg,#26050b,#0a0a0c)"}}><span style={{fontSize:27,fontWeight:900,fontFamily:"Darth Display",color:accent}}>{name}</span><span style={{fontSize:23,color:"#e4e4e7"}}>{copy}</span></div>)}</div>
   </div>}
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,borderTop:"1px solid rgba(255,255,255,.16)",paddingTop:22}}><span style={{fontSize:29,fontWeight:900,fontFamily:"Darth Display",color:accent}}>EXPLORE DARTHALGO.COM/LINKS</span><span style={{fontSize:16,color:"#a1a1aa"}}>Educational · Trading involves risk</span></div>
  </div>,{width:1080,height:1350,fonts:[{name:"Darth Display",data:displayFont,weight:900,style:"normal"}]});
  output.push({png:Buffer.from(await response.arrayBuffer()),altText:slide.alt});
 }
 return output;
}
