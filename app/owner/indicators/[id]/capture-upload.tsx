"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";

export function CaptureUpload({id,sourceHash}:{id:string;sourceHash:string}) {
  const router=useRouter();const [busy,setBusy]=useState(false),[result,setResult]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setResult("");
    const form=event.currentTarget,data=new FormData(form),image=data.get("image");
    if(!(image instanceof File)||!image.size||image.size>2*1024*1024){setResult("Choose a PNG or JPEG screenshot, up to 2 MB.");setBusy(false);return;}
    const metadata=Object.fromEntries(["chartUrl","symbol","timeframe","settings","visibleRange","marketContext","notes","view"].map(key=>[key,data.get(key)||""]));
    const capturedAt=new Date(String(data.get("capturedAt")));
    if(!Number.isFinite(capturedAt.getTime())){setResult("Enter when the chart was captured.");setBusy(false);return;}
    const body=new FormData();body.set("id",id);body.set("sourceHash",sourceHash);body.set("image",image);body.set("metadata",JSON.stringify({...metadata,capturedAt:capturedAt.toISOString(),compiled:data.has("compiled"),replay:data.has("replay"),reopened:data.has("reopened")}));
    try{const response=await fetch("/api/owner/indicators/captures",{method:"POST",body});const answer=await response.json();if(!response.ok)throw Error(answer.error||"Upload failed");setResult("Screenshot saved privately for this version. Release approval is unchanged.");form.reset();router.refresh();}catch(error){setResult(error instanceof Error?error.message:"Upload failed. Try again.");}finally{setBusy(false);}
  }
  const input="mt-1 w-full rounded-lg border border-white/15 bg-black p-3 text-white";
  return <details className="mt-6 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold">Add a chart screenshot</summary>
    <p className="mt-3 text-sm text-zinc-400">Upload the actual TradingView chart using this exact Pine version. It will be labeled as your submission. A screenshot alone does not complete release testing.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm">Screenshot · PNG or JPEG, up to 2 MB<input className={input} name="image" type="file" accept="image/png,image/jpeg" required/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Symbol and feed<input className={input} name="symbol" placeholder="CME_MINI:MNQ1!" maxLength={100} required/></label><label className="text-sm">Timeframe<input className={input} name="timeframe" placeholder="1 minute" maxLength={40} required/></label></div>
      <label className="block text-sm">Indicator settings<textarea className={input} name="settings" placeholder="Inputs used in this screenshot" minLength={3} maxLength={1000} required/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Visible chart dates and times<input className={input} name="visibleRange" placeholder="Date, start/end time, timezone" minLength={3} maxLength={200} required/></label><label className="text-sm">Captured at · your local time<input className={input} name="capturedAt" type="datetime-local" required/></label></div>
      <label className="block text-sm">Data and replay context<input className={input} name="marketContext" placeholder="Live, delayed, replay, or unknown; session and timezone" minLength={3} maxLength={300} required/></label>
      <label className="block text-sm">Saved chart link · optional<input className={input} name="chartUrl" type="url" placeholder="https://www.tradingview.com/chart/…/" maxLength={200}/></label>
      <label className="block text-sm">Image shows<select className={input} name="view"><option value="indicator">Candles with this indicator</option><option value="before">Before adding the indicator</option></select></label>
      <fieldset className="space-y-2 text-sm"><legend className="mb-2 text-zinc-400">Checks you personally completed</legend>{[["compiled","Compiled and added to chart"],["replay","Replay checked"],["reopened","Saved chart reopened with this version"]].map(([name,label])=><label key={name} className="flex items-center gap-3"><input type="checkbox" name={name}/>{label}</label>)}</fieldset>
      <label className="block text-sm">Observations or errors<textarea className={input} name="notes" minLength={10} maxLength={2000} required/></label>
      <button disabled={busy} className="min-h-11 rounded-lg bg-violet-300 px-5 py-3 font-semibold text-black disabled:opacity-50">{busy?"Saving…":"Save screenshot privately"}</button>
      <p role="status" className="text-sm text-violet-300">{result}</p>
    </form>
  </details>;
}
