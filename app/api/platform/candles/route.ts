import { NextRequest, NextResponse } from 'next/server';
import { validateCandles } from '../../../lib/platform/engine';
export const runtime = 'nodejs';
const periods:Record<string,number>={'1':60,'5':300,'15':900,'60':3600,'360':21600,'D':86400};
export async function GET(req:NextRequest) {
  const symbol=req.nextUrl.searchParams.get('symbol')||'BTC-USD';
  const granularity=periods[req.nextUrl.searchParams.get('interval')||'15'];
  if(!['BTC-USD','ETH-USD','SOL-USD'].includes(symbol)||!granularity) return NextResponse.json({error:'Supported crypto symbol and interval required.'},{status:400});
  try {
    const response=await fetch(`https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=${granularity}`,{next:{revalidate:30},signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('upstream');
    const raw:unknown=await response.json();
    if(!Array.isArray(raw)) throw new Error('schema');
    const now=Math.floor(Date.now()/1000);
    const bars=validateCandles(raw.filter((r:unknown)=>Array.isArray(r)&&r.length===6&&r[0]+granularity<=now).map((r:number[])=>({time:r[0],low:r[1],high:r[2],open:r[3],close:r[4],volume:r[5]})).sort((a,b)=>a.time-b.time));
    const last=bars.at(-1)!;
    return NextResponse.json({symbol,interval:granularity,bars,source:'Coinbase Exchange public candles',dataMode:'delayed-snapshot',fetchedAt:new Date().toISOString(),lastClosedAt:new Date((last.time+granularity)*1000).toISOString(),stale:now-last.time-granularity>granularity*2},{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=30'}});
  } catch { return NextResponse.json({error:'Market data is unavailable. Retry or import completed candles. No synthetic data was substituted.'},{status:502}); }
}
