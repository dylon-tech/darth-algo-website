import {createHash, randomUUID} from "node:crypto";
import {db} from "../affiliate-db";
import {ensureIndicatorSchema} from "./indicator-lab";
import {pineHash} from "./indicator-policy";

export const maxCaptureBytes = 2 * 1024 * 1024;
export type CaptureOrigin = "owner_submission" | "assisted_browser" | "browser_worker";
export type CaptureMetadata = {
  chartUrl: string; symbol: string; timeframe: string; settings: string;
  visibleRange: string; capturedAt: string; marketContext: string; notes: string;
  compiled: boolean; replay: boolean; reopened: boolean; view: "indicator" | "before";
};
export const captureSchema = `
create table if not exists os_indicator_captures (
 id uuid primary key, candidate_id uuid not null references os_indicator_candidates(id),
 source_hash text not null, image_hash text not null, image_mime text not null,
 image_bytes bytea not null, metadata jsonb not null,
 origin text not null check (origin in ('owner_submission','assisted_browser','browser_worker')),
 created_at timestamptz not null default now(),
 unique(candidate_id,source_hash,image_hash),
 check(octet_length(image_bytes) between 32 and 2097152)
);
create index if not exists os_indicator_captures_version on os_indicator_captures(candidate_id,source_hash,created_at desc);
`;
export async function ensureCaptureSchema() {
  await ensureIndicatorSchema();
  await db().begin(async tx => {
    await tx`select pg_advisory_xact_lock(730943)`;
    await tx.unsafe(captureSchema);
  });
}
function field(raw:Record<string,unknown>,key:string,min:number,max:number) {
  const value=raw[key];
  if(typeof value!=="string" || value.trim().length<min || value.length>max)throw Error("INVALID_CAPTURE_METADATA");
  return value.trim();
}
export function validateCaptureMetadata(input:unknown):CaptureMetadata {
  if(!input || typeof input!=="object" || Array.isArray(input))throw Error("INVALID_CAPTURE_METADATA");
  const r=input as Record<string,unknown>;
  const chartUrl=field(r,"chartUrl",0,200);
  if(chartUrl && !/^https:\/\/www\.tradingview\.com\/chart\/[A-Za-z0-9]+\/$/.test(chartUrl))throw Error("INVALID_CHART_URL");
  const capturedAt=field(r,"capturedAt",10,40),time=Date.parse(capturedAt);
  if(!Number.isFinite(time) || time>Date.now()+300000)throw Error("INVALID_CAPTURE_TIME");
  if(![true,false].includes(r.compiled as boolean) || ![true,false].includes(r.replay as boolean) || ![true,false].includes(r.reopened as boolean) || !["indicator","before"].includes(String(r.view)))throw Error("INVALID_CAPTURE_CHECKS");
  return {chartUrl,symbol:field(r,"symbol",2,100),timeframe:field(r,"timeframe",1,40),settings:field(r,"settings",3,1000),visibleRange:field(r,"visibleRange",3,200),capturedAt:new Date(time).toISOString(),marketContext:field(r,"marketContext",3,300),notes:field(r,"notes",10,2000),compiled:r.compiled as boolean,replay:r.replay as boolean,reopened:r.reopened as boolean,view:r.view as CaptureMetadata["view"]};
}
// Only raster screenshots. Never serve uploaded SVG/HTML, and distrust MIME labels.
export function captureMime(bytes:Buffer) {
  if(bytes.length<32 || bytes.length>maxCaptureBytes)throw Error("CAPTURE_SIZE_LIMIT");
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(12,16).toString()==="IHDR")return "image/png";
  if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255 && bytes[bytes.length-2]===255 && bytes[bytes.length-1]===217)return "image/jpeg";
  throw Error("PNG_OR_JPEG_REQUIRED");
}
export async function saveIndicatorCapture(id:string,sourceHash:string,bytes:Buffer,input:unknown,origin:CaptureOrigin) {
  if(!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(sourceHash) || !["owner_submission","assisted_browser","browser_worker"].includes(origin))throw Error("INVALID_VERSION");
  const metadata=validateCaptureMetadata(input),mime=captureMime(bytes),imageHash=createHash("sha256").update(bytes).digest("hex");
  await ensureCaptureSchema();
  return db().begin(async tx => {
    const [candidate]=await tx`select source_hash,candidate,status from os_indicator_candidates where id=${id} for update`;
    if(!candidate || candidate.source_hash!==sourceHash || pineHash(candidate.candidate.pine)!==sourceHash || !["qa_blocked","pending","approved"].includes(candidate.status))throw Error("VERSION_OR_STAGE_CHANGED");
    const [existing]=await tx`select id from os_indicator_captures where candidate_id=${id} and source_hash=${sourceHash} and image_hash=${imageHash}`;
    if(existing)return {saved:true,id:existing.id,published:false,duplicate:true};
    const [{count}]=await tx`select count(*)::int as count from os_indicator_captures where candidate_id=${id} and source_hash=${sourceHash}`;
    if(count>=12)throw Error("CAPTURE_LIMIT_REACHED");
    const captureId=randomUUID();
    await tx`insert into os_indicator_captures(id,candidate_id,source_hash,image_hash,image_mime,image_bytes,metadata,origin)
      values(${captureId},${id},${sourceHash},${imageHash},${mime},${bytes},${tx.json(metadata)},${origin})`;
    await tx`insert into os_activity(actor,event,entity_id,details) values(${origin==="owner_submission"?"owner":"indicator_builder"},'indicator_chart_capture_saved',${id},${tx.json({captureId,sourceHash,imageHash,origin,compiled:metadata.compiled,replay:metadata.replay,reopened:metadata.reopened,skillVersion:"1.0.0"})})`;
    // Evidence is additive. A screenshot never grants approval or changes release QA.
    return {saved:true,id:captureId,published:false,duplicate:false};
  });
}

export async function readIndicatorCapture(candidateId:string,captureId:string) {
  await ensureCaptureSchema();
  const [row]=await db()`select p.* from os_indicator_captures p join os_indicator_candidates c on c.id=p.candidate_id
    where p.id=${captureId} and p.candidate_id=${candidateId} and p.source_hash=c.source_hash`;
  return row || null;
}
