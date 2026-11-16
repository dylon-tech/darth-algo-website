import type { Metadata, Viewport } from "next";
export const metadata:Metadata={
  title:"Darth Algo · Dashboard",description:"Your private Darth Algo dashboard.",
  applicationName:"Darth Algo",manifest:"/owner/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Darth Algo",statusBarStyle:"black-translucent"},
  icons:{icon:"/owner/app-icon?size=192",apple:"/owner/app-icon?size=180"},
  robots:{index:false,follow:false},alternates:{canonical:null},referrer:"no-referrer",
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#101113"};
export default function OwnerLayout({children}:{children:React.ReactNode}){return children;}
