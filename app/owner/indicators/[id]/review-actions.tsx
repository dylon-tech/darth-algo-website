"use client";

import {useState} from "react";

export function ReviewActions({id,sourceHash,stage}:{id:string;sourceHash:string;stage:string}){
  const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [result,setResult]=useState("");
  async function act(action:"request_changes"|"reject"|"make_paid"|"test_feedback"){
    setBusy(true);setResult("");
    try{const response=await fetch("/api/owner/indicators/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,sourceHash,action,note})});
      const body=await response.json();if(!response.ok)throw Error(body.error||"Review could not be saved");
      setResult(action==="make_paid"?"Commercial proposal request saved. No price or customer access changed.":action==="reject"?"Draft archived. Reload to see its new stage.":action==="test_feedback"?"Your test notes were saved for this exact source version. They are not agent validation.":"Revision request saved. Reload to see its new stage.");
    }catch(error){setResult(error instanceof Error?error.message:"Review could not be saved");}finally{setBusy(false);}
  }
  return <section className="rounded-2xl border border-white/10 p-5"><h2 className="text-xl font-semibold">Your review</h2>{stage==="qa_blocked"?<><p className="mt-2 text-sm text-amber-300">TradingView compilation and exact-version chart preview are pending. Release approval is unavailable.</p><label className="mt-4 block text-sm" htmlFor="revision-note">Compiler error, change request or paid proposal rationale</label><textarea id="revision-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} className="mt-2 h-28 w-full rounded-lg bg-black p-3 text-white"/><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy||!note.trim()} onClick={()=>void act("test_feedback")} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-40">Send test error or notes</button><button disabled={busy||!note.trim()} onClick={()=>void act("request_changes")} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-40">Request Changes</button><button disabled={busy} onClick={()=>void act("reject")} className="rounded-lg border border-red-500/40 px-4 py-2 text-red-300 disabled:opacity-40">Reject</button><button disabled={busy||!note.trim()} onClick={()=>void act("make_paid")} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-40">Make Paid proposal</button></div></>:<p className="mt-2 text-zinc-400">Current stage: {stage}. Exact-version approval is handled only after private test and education package checks.</p>}<p role="status" className="mt-3 text-sm text-violet-300">{result}</p></section>;
}
