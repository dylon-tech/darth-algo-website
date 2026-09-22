export const supportCategories=['ACCESS','BILLING','FAILED_PAYMENT','CANCELLATION','REFUND','INDICATOR_QUESTION','TECHNICAL_SUPPORT','PRE_SALE','AFFILIATE','PARTNERSHIP','GENERAL','SPAM'] as const;
export type SupportCategory=typeof supportCategories[number];
export function classifySupport(subject:string,body:string):SupportCategory{
 const text=`${subject} ${body}`.toLowerCase().slice(0,12000);
 const rules:Array<[SupportCategory,RegExp]>=[
  ['SPAM',/\b(casino|guest post|seo package|crypto promotion|backlinks?)\b/],
  ['REFUND',/\brefund|money back|chargeback\b/],
  ['FAILED_PAYMENT',/\bpayment failed|card declined|past due|couldn'?t charge\b/],
  ['CANCELLATION',/\bcancel|cancellation|stop my subscription\b/],
  ['ACCESS',/\baccess|invite|locked out|can'?t (?:open|see|add)|tradingview username\b/],
  ['BILLING',/\bbilling|invoice|charged|receipt|subscription\b/],
  ['TECHNICAL_SUPPORT',/\b(error|bug|broken|not working|doesn'?t work|alert problem)\b/],
  ['INDICATOR_QUESTION',/\b(indicator|scalper|swing tool|pro tool|signal|setting)\b/],
  ['AFFILIATE',/\baffiliate|promo code|commission\b/],
  ['PARTNERSHIP',/\bpartnership|collab|sponsor|creator\b/],
  ['PRE_SALE',/\b(price|pricing|before i buy|trial|which plan)\b/],
 ];
 return rules.find(([,pattern])=>pattern.test(text))?.[0]||'GENERAL';
}
export function categoryNeedsFounder(category:SupportCategory){return ['REFUND','PARTNERSHIP'].includes(category);}
