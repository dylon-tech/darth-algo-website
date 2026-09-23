"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureCampaign, attributeCheckout } from "../lib/campaign-attribution";

export default function CampaignAttribution() {
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname.startsWith("/owner") || pathname.startsWith("/admin")) return;
    const key="darth-campaign-v1";
    let previous: unknown=null;
    try {previous=JSON.parse(sessionStorage.getItem(key) || "null");} catch {}
    const attribution=captureCampaign(window.location.search,previous);
    if(attribution) try {sessionStorage.setItem(key,JSON.stringify(attribution));} catch {}
    // Only decorate existing known checkout links; never intercept navigation.
    // Failure leaves ordinary Stripe checkout working, including with JS disabled.
    let welcomeReference:string|null=null, welcomeToken:string|null=null, cancelled=false;
    const welcome=attribution?.campaign==='welcome25'&&['instagram','x','tiktok'].includes(attribution.source);
    const welcomeKey=attribution?.content==='welcome_test'?'darth-welcome-test-visit-v1':'darth-welcome-visit-v1';
    const decorate=()=>{
      document.querySelectorAll<HTMLAnchorElement>('a[href^="https://buy.stripe.com/"]').forEach(a=>{
        const next=attributeCheckout(a.href,attribution);
        if(next!==a.href) a.href=next;
        if(welcomeReference){const u=new URL(a.href);const ref=u.searchParams.get('client_reference_id');if(ref?.startsWith('da1_')||ref?.startsWith('daw_')){u.searchParams.set('client_reference_id',welcomeReference);a.href=u.toString();}}
      });
    };
    decorate();
    if(welcome){
      let saved:{token?:string;platform?:string;at?:number;visitId?:string}|null=null;
      try{saved=JSON.parse(sessionStorage.getItem(welcomeKey)||'null');}catch{}
      const token=saved?.platform===attribution.source&&saved.at&&Date.now()-saved.at<30*86400000?saved.token:undefined;
      const visitId=saved?.platform===attribution.source&&saved.at&&Date.now()-saved.at<30*86400000?saved.visitId||crypto.randomUUID():crypto.randomUUID();
      try{sessionStorage.setItem(welcomeKey,JSON.stringify({token,platform:attribution.source,at:saved?.at||Date.now(),visitId}));}catch{}
      void fetch('/api/welcome/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:attribution.source,token,visitId,test:attribution.content==='welcome_test'})}).then(r=>r.ok?r.json():null).then(v=>{if(cancelled||!v?.reference)return;welcomeReference=v.reference;welcomeToken=v.token;try{sessionStorage.setItem(welcomeKey,JSON.stringify({token:v.token,platform:attribution.source,at:saved?.at||Date.now(),visitId}));}catch{}decorate();}).catch(()=>{});
    }
    const click=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest?.('a');if(!welcome||!welcomeToken||!anchor)return;try{const u=new URL(anchor.href);if(u.origin!=='https://buy.stripe.com'||u.searchParams.get('client_reference_id')!==welcomeReference)return;void fetch('/api/welcome/visit',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({platform:attribution.source,token:welcomeToken,action:'checkout'})}).catch(()=>{});}catch{}};
    document.addEventListener('click',click);

    const observer=new MutationObserver(decorate);
    observer.observe(document.body,{childList:true,subtree:true});
    return ()=>{cancelled=true;observer.disconnect();document.removeEventListener('click',click);};
  },[pathname]);
  return null;
}
