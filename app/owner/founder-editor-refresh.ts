import type {FounderContentItem} from '../lib/business-os/founder-content-model';

const progress=(item:FounderContentItem)=>({renderStatus:item.renderStatus,renderStage:item.renderStage,renderProgress:item.renderProgress});
const metadata=(item:FounderContentItem)=>({...progress(item),publication:item.publication,deliveries:item.deliveries});

/** History supplies current render progress; the calendar supplies verified
 * publication projections. Neither may apply receipts to another version. */
export function contentEditorRefresh(record:FounderContentItem|null,history:FounderContentItem|undefined,calendar:FounderContentItem|undefined,dirty:boolean):{kind:'replace'|'metadata'|'conflict';item:FounderContentItem}|null{
 if(!record)return null;
 const current=[history,calendar].filter((item):item is FounderContentItem=>Boolean(item&&item.id===record.id&&item.version>=record.version)).sort((a,b)=>b.version-a.version)[0];
 if(!current)return null;
 // The raw history endpoint intentionally has no publisher projection. A
 // same-version history response cannot erase the calendar's last readback.
 const receipts=calendar?.id===current.id&&calendar.version===current.version?calendar:current.version===record.version?record:current;
 const next={...current,publication:receipts.publication,deliveries:receipts.deliveries};
 if(next.version===record.version&&JSON.stringify(metadata(next))===JSON.stringify(metadata(record)))return null;
 if(dirty)return next.version>record.version?{kind:'conflict',item:next}:{kind:'metadata',item:{...record,...metadata(next)}};
 return {kind:'replace',item:next};
}
