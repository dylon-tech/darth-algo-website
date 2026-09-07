import { ImageResponse } from "next/og";
export const runtime="nodejs";
export function GET(request:Request){
  const requested=Number(new URL(request.url).searchParams.get("size"));
  const size=[180,192,512].includes(requested)?requested:512;
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",background:"#080d15",color:"#e1caff",border:`${Math.round(size*.035)}px solid #493958`,fontFamily:"sans-serif"}}><div style={{display:"flex",fontSize:size*.38,fontWeight:700,letterSpacing:-size*.035,lineHeight:1}}>DA</div><div style={{display:"flex",fontSize:size*.055,letterSpacing:size*.014,marginTop:size*.055,color:"#a998ba"}}>COMMAND</div></div>,{width:size,height:size,headers:{"Cache-Control":"public, max-age=86400"}});
}
