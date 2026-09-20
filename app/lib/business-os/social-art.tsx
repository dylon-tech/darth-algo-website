import { ImageResponse } from "next/og";
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
