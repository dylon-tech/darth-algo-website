// Standing owner authorization, 2026-09-20: routine media creation and posting
// on already authorized business accounts. Other external actions keep their gates.
export const mediaAutopilot = {
  id:"owner-media-2026-09-20-v1", enabled:true,
  channels:{x:"6aae1656ea19ca0bde83a4c7",instagram:"6aaf1886ea19ca0bde8f584c"},
  daily:{x:3,instagram:1}, minimumHours:{x:4,instagram:20}, timezone:"America/New_York",
} as const;
export function contentSlot(now=new Date()) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:mediaAutopilot.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const part=(name:string)=>parts.find(p=>p.type===name)!.value;
  const day=`${part("year")}-${part("month")}-${part("day")}`,hour=Number(part("hour"));
  const slot=hour>=19?19:hour>=14?14:hour>=9?9:null;
  return {day,slot,key:slot===null?null:`media:${day}:${slot}`};
}
