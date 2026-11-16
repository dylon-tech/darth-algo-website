"use client";
import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import styles from "./owner.module.css";
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function InstallApp(){
  const [installed,setInstalled]=useState(false),[prompt,setPrompt]=useState<InstallEvent|null>(null),[expanded,setExpanded]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia("(display-mode: standalone)");
    const check=()=>setInstalled(media.matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
    const complete=()=>{setInstalled(true);setPrompt(null);};
    check();media.addEventListener("change",check);window.addEventListener("beforeinstallprompt",capture);window.addEventListener("appinstalled",complete);
    return()=>{media.removeEventListener("change",check);window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",complete);};
  },[]);
  if(installed)return null;
  async function install(){if(!prompt){setExpanded(!expanded);return;}await prompt.prompt();await prompt.userChoice;setPrompt(null);}
  return <section className={styles.install}><div><Smartphone size={21}/><div><b>Put Darth Algo on your Home Screen</b><p>Open it like an app. Sign in once on each device.</p></div></div><button onClick={install}><Download size={16}/>{prompt?"Install app":"Add to Home Screen"}</button>{expanded && <p className={styles.installSteps}>On iPhone, open this page in Safari → Share → Add to Home Screen → keep Open as Web App on → Add. On Android, use your browser’s menu → Install app or Add to Home Screen. If the Home Screen app asks you to sign in again, use your owner email.</p>}</section>;
}
