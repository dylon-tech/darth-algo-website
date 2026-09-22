import {ImageResponse} from "next/og";
export const size={width:512,height:512};
export const contentType="image/png";
export default function Icon(){
 const site=process.env.NEXT_PUBLIC_SITE_URL??"https://www.darthalgo.com";
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}>
   <img src={`${site.replace(/\/$/,"")}/darth-algo-link-logo.svg`} width="512" height="512" alt="" />
  </div>,
  {...size}
 );
}
