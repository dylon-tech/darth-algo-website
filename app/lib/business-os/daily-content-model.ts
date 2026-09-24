export type ContentAction='disapprove'|'remake'|'approve_replacement';
export type ContentDecision={id:string;action:ContentAction;contentId:string;reviewHash:string;assetHashes:string[];note:string;jobId:string|null;requestKey:string;intentHash:string};
export type QueueItem={id:string;day:string;slot:'morning'|'afternoon';theme:string;kind:string;text:string;reviewHash:string;images:Array<{path:string;altText:string}>;state:string;decision:ContentDecision|null;submitted:boolean;canApprove:boolean;revision:{id:string;status:string;brief:string|null}|null};
export type ContentQueue={checkedAt:string;today:string;items:QueueItem[]};
export const contentHeld=(decision:ContentDecision|null)=>Boolean(decision&&decision.action!=='approve_replacement');
export function replacementIsNew(decision:ContentDecision|null,candidate:{id:string;reviewHash:string;assetHashes:string[]}):boolean {
 return Boolean(decision&&candidate.reviewHash!==decision.reviewHash&&candidate.assetHashes.length&&candidate.assetHashes.every(hash=>!decision.assetHashes.includes(hash)));
}
export const queueActionMessage=(action:ContentAction)=>action==='disapprove'?'Disapproved. This slot is held and will not post.':action==='remake'?'Remake requested. The original is held; new artwork must be reviewed before posting.':'Replacement approved. The normal schedule and publishing checks still apply.';
