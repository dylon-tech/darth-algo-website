"use client";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import styles from "../owner.module.css";
export default function ConnectDevice(){
  const token=useRef("");
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    // Keep the secret in memory only and remove it from the displayed address.
    // Preserve it during React Strict Mode's repeated effect setup.
    if(!token.current)token.current=window.location.hash.slice(1);
    window.history.replaceState(null,"","/owner/connect");
    setReady(/^[a-f0-9]{64}$/.test(token.current));
  },[]);
  async function connect(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/owner/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operation:"connect",token:token.current})});
      const data=await response.json();if(!response.ok)throw new Error(data.error || "Could not connect this device.");
      token.current="";window.location.replace("/owner");
    }catch(e){setError((e as Error).message);setBusy(false);}
  }
  return <main id="main-content" className={styles.login}><div className={styles.loginCard}><div className={styles.eyebrow}><LockKeyhole size={16}/> PRIVATE DEVICE SETUP</div><h1>DARTH ALGO<span>One tap. You’re in.</span></h1><p>Connect your own phone or computer once. Then your Command Center opens directly whenever you return.</p><button disabled={!ready || busy} onClick={connect}>{busy?"Connecting…":"Connect this device"}<ArrowUpRight size={17}/></button>{!ready && <p>Open the full private setup link to connect this device.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}<small>Use this on a device you control. This setup link works once and expires after 24 hours.</small></div></main>;
}
