import {acquisitionLabels,acquisitionPaths,acquisitionUuid} from './acquisition-policy';
import type {CampaignAttribution} from './campaign-attribution';
import {knownCheckout} from './campaign-attribution';

const excludedKey='darth-acquisition-excluded-v1';
const sessionKey='darth-acquisition-tab-v1';
// Keep this first-party measurement separate from checkout navigation. Fail open.
export function startAcquisitionMeasurement(path:string,attribution:CampaignAttribution|null){
  const noop=(_href:string)=>{}; // eslint-disable-line @typescript-eslint/no-unused-vars
  try{
    if(path.startsWith('/owner')||path.startsWith('/admin')){sessionStorage.setItem(excludedKey,'1');return noop;}
    if(!acquisitionPaths.has(path)||!['www.darthalgo.com','darthalgo.com'].includes(location.hostname)||sessionStorage.getItem(excludedKey)==='1')return noop;
    if(new URLSearchParams(location.search).get('measurement')==='test'||attribution?.content==='welcome_test'){sessionStorage.setItem(excludedKey,'1');return noop;}
    const labels=acquisitionLabels(attribution),now=Date.now();
    let saved;try{saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch{}
    if(!saved||!acquisitionUuid.test(saved.id)||!Number.isFinite(saved.at)||saved.at>now||now-saved.at>=86400000)saved={id:crypto.randomUUID(),at:now};
    sessionStorage.setItem(sessionKey,JSON.stringify(saved));
    const observation={visitId:saved.id,path,...labels};
    const send=(action:'visit'|'checkout')=>fetch('/api/acquisition/visit',{method:'POST',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({...observation,action})});
    const registered=send('visit').then(async r=>{if(!r.ok)return false;const result=await r.json();if(result.excluded)sessionStorage.setItem(excludedKey,'1');return result.recorded===true;}).catch(()=>false);
    let clicked=false;
    return (href:string)=>{if(clicked||!knownCheckout(href))return;clicked=true;void registered.then(ok=>{if(ok)void send('checkout').catch(()=>{});});};
  }catch{return noop;}
}
