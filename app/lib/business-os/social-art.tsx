import { ImageResponse } from "next/og";
import type { PhotoPlan } from "./photo-plan";
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
 const accent=style==="clean"?"#E3BD72":style==="minimal"?"#A596FF":"#F34655";
 const slides=plan.slides;
 const output=[];
 for(const [index,slide] of slides.entries()) {
  const response=new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",padding:64,background:"#0C1019",color:"#F5F5F7",fontFamily:"sans-serif",borderTop:`12px solid ${accent}`}}>
   <div style={{display:"flex",justifyContent:"space-between",fontSize:24,letterSpacing:4}}><span>DARTH ALGO</span><span style={{color:accent}}>0{index+1} / 03</span></div>
   <div style={{display:"flex",flexDirection:"column",gap:30}}><span style={{fontSize:20,letterSpacing:4,color:accent}}>{plan.label}</span><div style={{display:"flex",fontSize:78,fontWeight:800,letterSpacing:-3,lineHeight:1.08}}>{slide.title}</div><div style={{display:"flex",fontSize:34,lineHeight:1.4,color:"#BBC4D4"}}>{slide.line}</div></div>
   {slide.image?<div style={{display:"flex",flexDirection:"column",gap:15,border:"1px solid #303B4F",borderRadius:12,padding:18,background:"#151C29"}}>
    {/* Owned product capture; the exact chart is kept intact. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`https://www.darthalgo.com/indicators/${slide.image}`} width={914} height={440} style={{objectFit:"contain"}} alt="" />
    <span style={{fontSize:18,color:"#98A5BB"}}>RECORDED PRODUCT EXAMPLE · NOT LIVE DATA</span>
   </div>:<div style={{display:"flex",flexDirection:"column",gap:16}}>{[["SWING","Fewer signals · broader moves","#58AFFF"],["SCALPER","More signals · faster setups","#FFA64E"],["PRO","Switch between both modes","#B48AFF"]].map(([name,copy,color])=><div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:30,border:`1px solid ${color}`,borderRadius:12,background:"#151B27"}}><span style={{fontSize:30,fontWeight:800,color}}>{name}</span><span style={{fontSize:25,color:"#CED4E0"}}>{copy}</span></div>)}</div>}
   <div style={{display:"flex",flexDirection:"column",gap:18,borderTop:"1px solid #303B4F",paddingTop:26}}><span style={{fontSize:30,color:accent}}>Explore darthalgo.com/links</span><span style={{fontSize:18,color:"#98A5BB"}}>Educational content. Trading involves risk.</span></div>
  </div>,{width:1080,height:1350});
  output.push({png:Buffer.from(await response.arrayBuffer()),altText:slide.alt});
 }
 return output;
}
