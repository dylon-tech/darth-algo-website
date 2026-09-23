import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
export const platforms = ['instagram','x','tiktok'] as const;
export type Platform = typeof platforms[number];
export const campaign = 'welcome25';
export const opening = 'Hey 👋 Thanks for following Darth Algo! Want a 25% welcome discount on our TradingView indicators? Tap below and we’ll send it over. ⚫️🔴';
export const optInButton = 'Send my 25% code';
export const cta = 'New here? DM WELCOME for 25% off Darth Algo TradingView indicators.';
export const terms = 'First-time customers only. 25% off your first paid purchase or subscription invoice; later invoices are full price. Subject to checkout eligibility.';
export function offerUrl(platform: Platform) {return `https://www.darthalgo.com/?utm_source=${platform}&utm_medium=dm&utm_campaign=welcome25&utm_content=welcome_offer#pricing`;}
export function message(platform: Platform) {return `Welcome to Darth Algo 👋\n\nHere’s your 25% OFF welcome offer for our TradingView indicators.\n\nUse code WELCOME at checkout:\n${offerUrl(platform)}\n\n${terms}\n\nQuestions about the tools? Reply here.\nReply STOP to stop automated messages. ⚫️🔴`;}
export function contactKey(platform:Platform,account:string,recipient:string){return createHash('sha256').update(JSON.stringify([platform,account,recipient])).digest('hex');}
export function intent(text:string){const t=text.trim().toLowerCase();if(/\b(stop|unsubscribe|opt[ -]?out|remove me|do not (?:message|contact)|don.?t (?:message|contact)|no more messages)\b/.test(t))return 'stop';return /^welcome[.!]?$/i.test(t)?'welcome':'support';}
export type Gate={paused:boolean;owner:'none'|'provider'|'backend';connected:boolean;eligible:boolean;verifiedUntil:number;credentialExpires:number|null;discountVerified:boolean;optedOut:boolean;windowUntil:number;now:number};
export function gate(g:Gate){if(g.paused)return 'paused';if(g.owner!=='backend')return 'not_sending_owner';if(!g.connected||!g.eligible||g.verifiedUntil<=g.now)return 'connection_or_eligibility_unverified';if(g.credentialExpires!==null&&g.credentialExpires<=g.now)return 'credential_expired';if(g.optedOut)return 'opted_out';if(g.windowUntil<=g.now)return 'window_expired';if(!g.discountVerified)return 'discount_unverified';return null;}
export function retryDelay(attempt:number,retryAfter=0){return Math.min(86400,Math.max(retryAfter,30*2**Math.min(attempt,10)));}
// Internal adapter contract only. NOT an undocumented social-provider webhook.
export function validSignature(raw:string,timestamp:string,signature:string,secret:string,now=Date.now()){
 if(secret.length<32||!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 const expected='sha256='+createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');return timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export function validateMessage(text:unknown){return typeof text==='string'&&text.length<=1200&&text.includes('25%')&&text.includes('WELCOME')&&text.includes('TradingView')&&text.includes('STOP')&&text.includes('https://www.darthalgo.com/')&&text.includes('#pricing')&&text.includes(terms)&&!/(guaranteed|risk.free|expires today|profit guarantee)/i.test(text);}
export function netRevenue(paid:number,tax:number,refunded:number,refundedTax:number|null){
 if(![paid,tax,refunded].every(x=>Number.isSafeInteger(x)&&x>=0)||tax>paid||refunded>paid)return null;
 if(!refunded)return paid-tax;if(refunded===paid)return 0;
 // Never guess the tax component of a partial refund.
 if(refundedTax===null||refundedTax<0||refundedTax>Math.min(tax,refunded))return null;
 return paid-tax-refunded+refundedTax;
}
