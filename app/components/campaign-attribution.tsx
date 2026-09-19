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
    const decorate=()=>{
      document.querySelectorAll<HTMLAnchorElement>('a[href^="https://buy.stripe.com/"]').forEach(a=>{
        const next=attributeCheckout(a.href,attribution);
        if(next!==a.href) a.href=next;
      });
    };
    decorate();
    const observer=new MutationObserver(decorate);
    observer.observe(document.body,{childList:true,subtree:true});
    return ()=>observer.disconnect();
  },[pathname]);
  return null;
}
