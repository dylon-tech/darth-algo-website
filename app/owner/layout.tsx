import type { Metadata, Viewport } from "next";
export const metadata:Metadata={
  title:"Darth Algo · Owner Command",description:"Your private Darth Algo Command Center.",
  applicationName:"Darth Command",manifest:"/owner/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Darth Command",statusBarStyle:"black-translucent"},
  icons:{icon:"/owner/app-icon?size=192",apple:"/owner/app-icon?size=180"},
  robots:{index:false,follow:false},alternates:{canonical:null},referrer:"no-referrer",
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#080d15"};
export default function OwnerLayout({children}:{children:React.ReactNode}){return children;}
