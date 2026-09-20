import { createHash } from "node:crypto";

export type IndicatorCandidate = {
  name: string; purpose: string; differentiation: string; audience: string;
  pine: string; sourceUrls: string[]; demand: string; pricingRationale: string;
  tier: "free" | "paid"; monthlyPriceUsd: number;
};
export const indicatorJsonSchema = { anyOf: [{type:"null"}, {
  type:"object", additionalProperties:false,
  required:["name","purpose","differentiation","audience","pine","sourceUrls","demand","pricingRationale","tier","monthlyPriceUsd"],
  properties:Object.fromEntries([
    ...["name","purpose","differentiation","audience","pine","demand","pricingRationale"].map(k=>[k,{type:"string",minLength:1,maxLength:k==="pine"?6500:k==="name"?80:500}]),
    ["sourceUrls",{type:"array",minItems:2,maxItems:5,items:{type:"string"}}],
    ["tier",{type:"string",enum:["free","paid"]}],
    ["monthlyPriceUsd",{type:"number",minimum:0,maximum:99}],
  ])
}] };
export function validateIndicator(value: unknown, observedUrls: string[]): IndicatorCandidate {
  if(!value || typeof value!=="object" || Array.isArray(value))throw Error("INVALID_INDICATOR");
  const c=value as IndicatorCandidate;
  for(const key of ["name","purpose","differentiation","audience","pine","demand","pricingRationale"] as const)
    if(typeof c[key]!=="string" || !c[key].trim() || c[key].length>(key==="pine"?6500:key==="name"?80:500))throw Error("INVALID_INDICATOR");
  if(!c.name.startsWith("Darth Algo ") || !["free","paid"].includes(c.tier) || !Number.isFinite(c.monthlyPriceUsd) || c.monthlyPriceUsd<0 || c.monthlyPriceUsd>99 || (c.tier==="free" && c.monthlyPriceUsd!==0) || (c.tier==="paid" && c.monthlyPriceUsd===0))throw Error("INVALID_INDICATOR");
  if(!Array.isArray(c.sourceUrls) || new Set(c.sourceUrls).size<2 || c.sourceUrls.length>5 || c.sourceUrls.some(u=>!observedUrls.includes(u)))throw Error("INDICATOR_UNOBSERVED_SOURCE");
  return c;
}
export function pineChecks(pine:string) {
  // Conservative static checks are NOT a compiler, replay, or profitability test.
  const code=pine.replace(/\/\/[^\n]*/g,"");
  const checks={
    pineV6:/^\/\/@version=6\s*$/m.test(pine),
    indicator:/\bindicator\s*\(/.test(code) && !/\bstrategy\s*\(/.test(code),
    closedBarSignals:/\bbarstate\.isconfirmed\b/.test(code),
    alerts:/\balertcondition\s*\(/.test(code),
    visualOutput:/\b(?:plot|plotshape|plotchar|bgcolor)\s*\(/.test(code),
    noExternalCode:!/^\s*import\s/m.test(code),
    noFutureData:!/(?:lookahead_on|request\.|timenow|varip|offset\s*=\s*-)/.test(code),
    boundedLength:pine.length<=6500,
  };
  return {checks,passed:Object.values(checks).every(Boolean),compiler:"not_run",chartReplay:"not_run",profitability:"not_tested"};
}
export function pineHash(pine:string) {return createHash("sha256").update(pine).digest("hex");}
export function pineLogicHash(pine:string) {
  return pineHash(pine.replace(/\/\/[^\n]*/g,"").replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/\s+/g,""));
}
export function scoreIndicator(c:IndicatorCandidate) {
  const qa=pineChecks(c.pine);
  // Transparent screening rubric. It does not claim measured product demand.
  const evidence=Math.min(30,new Set(c.sourceUrls).size*10);
  const completeness=[c.demand,c.differentiation,c.pricingRationale,c.audience].filter(s=>s.length>=40).length*10;
  const engineering=qa.passed?20:0;
  return {total:evidence+completeness+engineering,outOf:90,evidence,completeness,engineering,meaning:"Prototype screening score; no sales or trading-performance validation"};
}
export function validTradingViewRelease(url:string) {
  try {const u=new URL(url);return u.origin==="https://www.tradingview.com" && /^\/script\/[A-Za-z0-9][A-Za-z0-9-]*\/$/.test(u.pathname) && !u.search && !u.hash && !u.username && !u.password;}catch{return false;}
}

export type PrivateIndicatorPreview = {
  sourceHash: string; chartUrl: string; screenshotUrl: string;
  compiled: true; replay: true; reopened: true; notes: string;
  checkedAt: string; attestedBy: "owner";
};
function tradingViewPath(url: unknown, pattern: RegExp) {
  if(typeof url !== "string") return false;
  try { const u=new URL(url); return u.origin === "https://www.tradingview.com" && pattern.test(u.pathname) && !u.search && !u.hash && !u.username && !u.password; } catch { return false; }
}
export function validPrivatePreview(value: unknown, hash: string): value is PrivateIndicatorPreview {
  if(!value || typeof value !== "object") return false;
  const p=value as PrivateIndicatorPreview;
  return /^[a-f0-9]{64}$/.test(hash) && p.sourceHash === hash &&
    tradingViewPath(p.chartUrl, /^\/chart\/[A-Za-z0-9]+\/$/) &&
    tradingViewPath(p.screenshotUrl, /^\/x\/[A-Za-z0-9]+\/$/) &&
    p.compiled === true && p.replay === true && p.reopened === true &&
    typeof p.notes === "string" && p.notes.trim().length >= 30 && p.notes.length <= 2000 &&
    p.attestedBy === "owner" && typeof p.checkedAt === "string" && Number.isFinite(Date.parse(p.checkedAt));
}
