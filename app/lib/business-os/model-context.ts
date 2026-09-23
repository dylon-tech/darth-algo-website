import type {Evidence} from './sources';

const bytes=(value:unknown)=>Buffer.byteLength(JSON.stringify(value)??'null');
// Retain whole records/fields; never silently truncate source code, URLs or totals.
// Every omission is explicit. The complete snapshot remains on os_runs.
export function boundedContext(value:unknown,limit:number):unknown {
 if(bytes(value)<=limit)return value;
 const omitted={contextOmitted:true,reason:'Bounded model context; full value retained in run snapshot. Do not infer missing facts or totals.'};
 if(!value||typeof value!=='object')return omitted;
 if(Array.isArray(value)){
  const rows:unknown[]=[];
  for(const row of value){if(bytes({rows:[...rows,row],...omitted})>limit)break;rows.push(row);}
  return {rows,...omitted,totalRecords:value.length,includedRecords:rows.length};
 }
 const result:Record<string,unknown>={...omitted};
 for(const [key,item] of Object.entries(value)){
  const room=limit-bytes(result)-Buffer.byteLength(key)-8;
  if(room<250)break;
  result[key]=bytes(item)<=room?item:boundedContext(item,Math.min(room,1800));
 }
 return result;
}

export function modelContext(input:Record<string,unknown>&{evidence:Evidence[]},limit=48000) {
 const data:Record<string,unknown>&{evidence:Evidence[]}={...input,evidence:input.evidence.map(e=>({...e}))};
 if(bytes(data)<=limit)return JSON.stringify(data);
 data.openTasks=boundedContext(data.openTasks,3500);
 data.history=boundedContext(data.history,2500);
 // Product facts and the exact indicator specification get priority over history.
 const preferred=new Set(['business_knowledge','indicator_inventory','indicator_idea_handoffs','team_deliverables']);
 for(const e of data.evidence){
  const allowance=e.id==='indicator_inventory'?12000:preferred.has(e.id)?6500:2400;
  if(bytes(e.data)>allowance){e.data=boundedContext(e.data,allowance);e.scope+=' Partial model context: omitted records are unavailable to this run; do not infer completeness or totals.';}
 }
 while(bytes(data)>limit){
  const largest=[...data.evidence].sort((a,b)=>bytes(b.data)-bytes(a.data))[0];
  if(!largest||bytes(largest.data)<400)throw Error('AI_INPUT_LIMIT');
  largest.data=boundedContext(largest.data,Math.max(250,Math.floor(bytes(largest.data)*0.65)));
 }
 return JSON.stringify(data);
}
