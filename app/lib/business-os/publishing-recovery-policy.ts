// The owner's September 23 incident request authorizes recovery of the latest
// missed reviewed campaign. This expires tonight and never changes daily slots.
export function incidentCatchup(c:{day:string;slot?:string},now=new Date()){
 return c.day==='2026-09-23'&&c.slot==='afternoon'
  && now.getTime()>=Date.parse('2026-09-23T22:00:00Z')&&now.getTime()<Date.parse('2026-09-24T04:00:00Z');
}
