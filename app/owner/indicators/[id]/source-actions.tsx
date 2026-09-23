"use client";

import {useState} from "react";

export function SourceActions({source,name}:{source:string;name:string}) {
  const [message,setMessage]=useState("");
  async function copy() {
    try {await navigator.clipboard.writeText(source);setMessage("Complete Pine source copied.");}
    catch {setMessage("Clipboard unavailable. Select and copy the source text below.");}
  }
  function download() {
    const url=URL.createObjectURL(new Blob([source],{type:"text/plain;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;
    link.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}.pine`;
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-3"><button type="button" onClick={copy} className="rounded-lg bg-violet-300 px-4 py-2 font-semibold text-black">Copy Pine Script</button><button type="button" onClick={download} className="rounded-lg border border-white/20 px-4 py-2">Download .pine</button></div>
    <p role="status" className="text-sm text-zinc-400">{message}</p>
    <textarea readOnly aria-label="Complete Pine source" value={source} className="h-72 w-full resize-y rounded-lg bg-black p-4 font-mono text-xs text-white" onFocus={e=>e.currentTarget.select()}/>
  </div>;
}
