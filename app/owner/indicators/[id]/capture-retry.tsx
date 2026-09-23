"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export function CaptureRetry({id,sourceHash}:{id:string;sourceHash:string}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");const router=useRouter();
  async function retry(){setBusy(true);try{const r=await fetch("/api/owner/indicators/captures/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,sourceHash})});const b=await r.json();if(!r.ok)throw Error(b.error);setMessage(b.status==="captured"?"This version already has a worker capture.":b.status==="running"?"A capture attempt is running.":"Capture requested for the next five-minute check. This version is not verified yet.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}}
  return <div className="mt-3"><button disabled={busy} onClick={()=>void retry()} className="min-h-11 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50">{busy?"Requesting…":"Retry chart capture"}</button><p role="status" className="mt-2 text-sm text-violet-300">{message}</p></div>;
}
