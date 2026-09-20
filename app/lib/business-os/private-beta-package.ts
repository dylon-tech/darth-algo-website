import {createHash,randomUUID} from 'node:crypto';
import {db} from '../affiliate-db';
import {privateTest,type RunnerEvidence,exactSourceHash} from './tradingview-runner';
import {pineChecks,pineLogicHash,scoreIndicator,validPrivatePreview,type IndicatorCandidate} from './indicator-policy';
import {ensureIndicatorSchema,recordPrivateIndicatorPreview} from './indicator-lab';
import {prepareIndicatorPackage} from './indicator-package';

const lowerSnapshot='https://www.tradingview.com/x/675CBsZI/';
const upperSnapshot='https://www.tradingview.com/x/KtxJYwT4/';
const instructionImage='https://s3.tradingview.com/snapshots/6/675CBsZI.png';
// Import the already tested, owner-requested prototype. This is deliberately
// separate from AI Research: it creates no fake research run or demand evidence.
export async function importPrivateBeta(source:string,evidence:RunnerEvidence){
 if(exactSourceHash(source)!==privateTest.sourceHash || evidence.sourceHash!==privateTest.sourceHash || evidence.account!==privateTest.account || evidence.chartUrl!==privateTest.chartUrl || evidence.reopened!==true || [1,3,5,15].some(i=>!evidence.checks.some(c=>c.interval===i)))throw Error('PRIVATE_SOURCE_CHANGED');
 const candidate:IndicatorCandidate={name:privateTest.title,pine:source,tier:'free',monthlyPriceUsd:0,
  purpose:'Mark a confirmed return inside the New York opening range after the first close beyond a boundary.',
  differentiation:'A fixed 09:30–09:45 New York range, a bounded return window and one initial breakout attempt per direction per session; incomplete opening data suppresses the range.',
  audience:'Traders reviewing failed opening-range breakouts on standard 1-, 3-, 5- or 15-minute candles.',
  demand:'Existing owner-requested private prototype. No measured market-demand, trading-performance or sales result is claimed.',
  pricingRationale:'Owner direction: new indicators are free and publicly discoverable on TradingView with protected code and no invitation.',
  sourceUrls:[lowerSnapshot,upperSnapshot]};
 const qa=pineChecks(source);if(!qa.passed)throw Error('PRIVATE_SOURCE_CHANGED');
 await ensureIndicatorSchema();
 const id=await db().begin(async tx=>{
  await tx`select pg_advisory_xact_lock(730932)`;
  const [prior]=await tx`select id,source_hash from os_indicator_candidates where logic_hash=${pineLogicHash(source)}`;
  if(prior){if(prior.source_hash!==privateTest.sourceHash)throw Error('PRIVATE_SOURCE_CHANGED');return String(prior.id);}
  const id=randomUUID();
  await tx`insert into os_indicator_candidates(id,run_id,candidate,source_hash,logic_hash,qa,score,status) values(${id},null,${tx.json(candidate)},${privateTest.sourceHash},${pineLogicHash(source)},${tx.json({...qa,origin:'owner_private_import',operatorEvidence:'docs/private-indicator-qa-2026-09-20.md'})},${tx.json(scoreIndicator(candidate))},'qa_blocked')`;
  await tx`insert into os_activity(actor,event,entity_id,details) values('operations','private_beta_imported',${id},${tx.json({sourceHash:privateTest.sourceHash,origin:'existing_private_prototype'})})`;
  return id;
 });
 const [row]=await db()`select private_preview,status from os_indicator_candidates where id=${id}`;
 if(!validPrivatePreview(row.private_preview,privateTest.sourceHash) && row.status==='qa_blocked'){
  await recordPrivateIndicatorPreview(id,privateTest.sourceHash,{chartUrl:privateTest.chartUrl,screenshotUrl:lowerSnapshot,compiled:true,replay:true,reopened:true,
   notes:`Codex operator observations on 2026-09-20 for this exact saved source: fresh Add to chart succeeded; AAPL and MES loaded on 3/5/15m, AAPL on 1m; unsupported MES 10m suppressed the range. AAPL Sep 17 downside and Sep 14 upside reentries were replayed and captured. Upper capture: ${upperSnapshot}. The hosted runtime check also verified source, four AAPL intervals and reopening. Live alert delivery and missing-bar/session-boundary cases remain unverified. This is operator evidence, not an automated semantic replay or profitability certification.`});
 }
 return id;
}
export async function preparePrivateBetaPackage(){
 const [row]=await db()`select id,private_preview,status,release_package from os_indicator_candidates where source_hash=${privateTest.sourceHash} and qa->>'origin'='owner_private_import' limit 1`;
 if(!row || !validPrivatePreview(row.private_preview,privateTest.sourceHash))return {status:'not_ready'};
 if(row.release_package || !['qa_blocked','pending'].includes(row.status))return {status:'already_prepared'};
 // This fixed image was visually inspected in the actual supervised chart QA.
 // Fetch its immutable bytes for the package digest; never fabricate a chart.
 const r=await fetch(instructionImage,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok || !r.headers.get('content-type')?.startsWith('image/png') || Number(r.headers.get('content-length'))>4_000_000)throw Error('INSTRUCTION_IMAGE_UNAVAILABLE');
 const reader=r.body?.getReader();if(!reader)throw Error('INSTRUCTION_IMAGE_UNAVAILABLE');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000)throw Error('INSTRUCTION_IMAGE_UNAVAILABLE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=Buffer.concat(chunks);if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('INSTRUCTION_IMAGE_UNAVAILABLE');
 const result=await prepareIndicatorPackage(String(row.id),privateTest.sourceHash,{
  title:'Darth Algo Opening Range Fakeout: a return inside the opening range',
  body:'Purple boundaries mark the 09:30–09:45 New York high and low. Orange FAKEOUT marks a confirmed return inside after an upside break; cyan marks a return after a downside break. Standard 1-, 3-, 5- and 15-minute candles are supported. Red background means unsupported chart settings. The default return window is three bars. Each direction gets one initial breakout attempt per session; an expired attempt is not rearmed. Complete opening-range data is required and evaluation ends at 16:00 New York time. Use the marker as context when reviewing a failed breakout. It is not an entry order, profit target, stop loss or guarantee. Both alert conditions appear in the private version; choose Once per bar close. Actual live alert delivery and missing-bar/session-boundary cases remain unverified. Replay observations do not establish profitability or guarantee behavior on every data feed. Planned release: free, public, protected code, no invite required.',
  example:`Actual AAPL five-minute replay: September 17 range 335.55–331.36, downside break followed by a confirmed return inside and a cyan marker (${lowerSnapshot}). September 14 range 334.99–331.34, upside break and return marked orange (${upperSnapshot}). Markers persisted as replay advanced. These are historical chart examples, not performance results.`,
  invalidation:'No marker is expected if the return misses the configured window, the first attempt already expired, the opening range is incomplete, or chart settings are unsupported. Moving through the opposite boundary cancels a pending attempt. An intrabar crossing alone is insufficient.',
  instructionImageUrl:instructionImage,imageSha256:createHash('sha256').update(bytes).digest('hex'),verifiedExample:true,
 });
 return {status:'prepared',approvalId:result.approvalId};
}
