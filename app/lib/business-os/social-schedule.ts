export const socialSlots = {morning:{hour:9,endHour:12},afternoon:{hour:15,endHour:18}} as const;
export type SocialSlot = keyof typeof socialSlots;
export function easternClock(now=new Date()) {
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(now));
 return {day,hour};
}
export function socialSchedule(now=new Date()):{day:string;slot:SocialSlot;open:boolean} {
 const {day,hour}=easternClock(now);
 if(hour>=18)return {day:new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10),slot:'morning',open:false};
 const slot=hour<12?'morning':'afternoon';
 return {day,slot,open:hour>=socialSlots[slot].hour&&hour<socialSlots[slot].endHour};
}
export function campaignKey(c:{day:string;slot?:SocialSlot}) {return c.slot?`${c.day}-${c.slot}`:c.day;}
export function withinSocialWindow(c:{day:string;slot?:SocialSlot},now=new Date()) {
 const {day,hour}=easternClock(now);
 return Boolean(c.slot&&c.day===day&&hour>=socialSlots[c.slot].hour&&hour<socialSlots[c.slot].endHour);
}
