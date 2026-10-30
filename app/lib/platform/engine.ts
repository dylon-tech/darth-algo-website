export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type Profile = 'Scalp' | 'Swing' | 'Pro';
export type Strategy = 'Auto' | 'Reversal' | 'Trend';
export type Zone = { kind: 'FVG' | 'IFVG' | 'Order block'; side: 'bullish' | 'bearish'; low: number; high: number; time: number };
export type Study = { bias: 'bullish' | 'bearish' | 'neutral'; signal: string; reason: string; high: number; low: number; zones: Zone[]; bars: number };
export const markets = [
  { symbol: 'CME_MINI:MNQ1!', code: 'MNQ', name: 'Micro Nasdaq futures', type: 'Futures', pointValue: 2, tick: .25 },
  { symbol: 'CME_MINI:MES1!', code: 'MES', name: 'Micro S&P 500 futures', type: 'Futures', pointValue: 5, tick: .25 },
  { symbol: 'COMEX:MGC1!', code: 'MGC', name: 'Micro Gold futures', type: 'Futures', pointValue: 10, tick: .1 },
  { symbol: 'CME_MINI:NQ1!', code: 'NQ', name: 'Nasdaq futures', type: 'Futures', pointValue: 20, tick: .25 },
  { symbol: 'CME_MINI:ES1!', code: 'ES', name: 'S&P 500 futures', type: 'Futures', pointValue: 50, tick: .25 },
  { symbol: 'COMEX:GC1!', code: 'GC', name: 'Gold futures', type: 'Futures', pointValue: 100, tick: .1 },
  { symbol: 'COINBASE:BTCUSD', code: 'BTC-USD', name: 'Bitcoin / US dollar', type: 'Crypto', pointValue: 1, tick: .01 },
  { symbol: 'COINBASE:ETHUSD', code: 'ETH-USD', name: 'Ethereum / US dollar', type: 'Crypto', pointValue: 1, tick: .01 },
  { symbol: 'COINBASE:SOLUSD', code: 'SOL-USD', name: 'Solana / US dollar', type: 'Crypto', pointValue: 1, tick: .01 },
  { symbol: 'NASDAQ:AAPL', code: 'AAPL', name: 'Apple', type: 'Stocks', pointValue: 1, tick: .01 },
  { symbol: 'NASDAQ:NVDA', code: 'NVDA', name: 'NVIDIA', type: 'Stocks', pointValue: 1, tick: .01 },
  { symbol: 'NASDAQ:TSLA', code: 'TSLA', name: 'Tesla', type: 'Stocks', pointValue: 1, tick: .01 },
  { symbol: 'NASDAQ:MSFT', code: 'MSFT', name: 'Microsoft', type: 'Stocks', pointValue: 1, tick: .01 },
  { symbol: 'AMEX:SPY', code: 'SPY', name: 'S&P 500 ETF', type: 'Stocks', pointValue: 1, tick: .01 },
] as const;
export type Market = typeof markets[number];
export function validateCandles(input: unknown): Candle[] {
  if (!Array.isArray(input) || input.length < 25 || input.length > 2000) throw new Error('Use 25–2,000 completed candles.');
  let previous = 0;
  return input.map(row => {
    if (!row || typeof row !== 'object') throw new Error('Invalid candle.');
    const c = row as Candle;
    if (![c.time,c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite) || c.time <= previous || c.time > Date.now()/1000 || c.low <= 0 || c.high < Math.max(c.open,c.close) || c.low > Math.min(c.open,c.close) || c.volume < 0) throw new Error('Invalid prices or timestamps. Use ascending unique UTC timestamps.');
    previous = c.time;
    return {time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume};
  });
}
export function parseCsv(value: string): Candle[] {
  const lines = value.trim().split(/\r?\n/);
  if (lines[0].toLowerCase().replace(/\s/g,'') !== 'time,open,high,low,close,volume') throw new Error('CSV header: time,open,high,low,close,volume. Time must be Unix seconds.');
  return validateCandles(lines.slice(1).map(line => {
    const parts = line.split(',');
    if(parts.length !== 6 || parts.some(x => !x.trim())) throw new Error('Every row needs six values.');
    const [time,open,high,low,close,volume] = parts.map(Number);
    return {time,open,high,low,close,volume};
  }));
}
export function studyCandles(input: Candle[], profile: Profile, strategy: Strategy): Study {
  const bars = validateCandles(input), lookback = profile === 'Scalp' ? 8 : profile === 'Swing' ? 20 : 14;
  const last = bars.at(-1)!, prior = bars.slice(-lookback-1,-1);
  const high = Math.max(...prior.map(x=>x.high)), low = Math.min(...prior.map(x=>x.low));
  const fast = bars.slice(-5).reduce((n,c)=>n+c.close,0)/5;
  const slow = bars.slice(-20).reduce((n,c)=>n+c.close,0)/20;
  const bias = fast > slow*1.0002 ? 'bullish' : fast < slow*.9998 ? 'bearish' : 'neutral';
  const bullSweep = last.low < low && last.close > low && last.close > last.open;
  const bearSweep = last.high > high && last.close < high && last.close < last.open;
  const zones: Zone[] = [];
  for(let i=2;i<bars.length;i++) {
    const c=bars[i], a=bars[i-2], p=bars[i-1];
    for(let z=zones.length-1;z>=0;z--) {
      const zone=zones[z];
      if((zone.side==='bullish' && c.close<zone.low)||(zone.side==='bearish' && c.close>zone.high)) {
        if(zone.kind==='FVG') { zone.kind='IFVG'; zone.side=zone.side==='bullish'?'bearish':'bullish'; zone.time=c.time; }
        else zones.splice(z,1);
      }
    }
    if(c.low>a.high) zones.push({kind:'FVG',side:'bullish',low:a.high,high:c.low,time:c.time});
    if(c.high<a.low) zones.push({kind:'FVG',side:'bearish',low:c.high,high:a.low,time:c.time});
    const previous=bars.slice(Math.max(0,i-lookback),i);
    if(c.close>Math.max(...previous.map(x=>x.high)) && p.close<p.open) zones.push({kind:'Order block',side:'bullish',low:p.low,high:p.high,time:c.time});
    if(c.close<Math.min(...previous.map(x=>x.low)) && p.close>p.open) zones.push({kind:'Order block',side:'bearish',low:p.low,high:p.high,time:c.time});
    if(zones.length>30) zones.shift();
  }
  const reversalAllowed=strategy!=='Trend', trendAllowed=strategy!=='Reversal';
  let signal='Wait for confirmation', reason='No closed-bar setup meets this research rule set.';
  if(reversalAllowed && bullSweep) {signal='Bullish reversal candidate';reason='Price swept the prior range low, then closed back inside with a bullish candle.';}
  else if(reversalAllowed && bearSweep) {signal='Bearish reversal candidate';reason='Price swept the prior range high, then closed back inside with a bearish candle.';}
  else if(trendAllowed && last.close>high && bias==='bullish') {signal='Bullish trend candidate';reason='Closed above the prior range high with short-term trend alignment.';}
  else if(trendAllowed && last.close<low && bias==='bearish') {signal='Bearish trend candidate';reason='Closed below the prior range low with short-term trend alignment.';}
  return {bias,signal,reason,high,low,zones:zones.slice(-6),bars:bars.length};
}
export type PaperTrade = { id:string; symbol:string; side:'long'|'short'; entry:number; stop:number; target:number; quantity:number; pointValue:number; fee:number; openedAt:string; exit?:number; closedAt?:string; pnl?:number };
export function validateTrade(t:Omit<PaperTrade,'id'|'openedAt'>, balance:number, riskPercent:number, dayPnl:number, dailyLimit:number) {
  if(![t.entry,t.stop,t.target,t.quantity,t.pointValue,t.fee,balance,riskPercent,dailyLimit,dayPnl].every(Number.isFinite)) throw new Error('Enter valid numbers.');
  if(t.entry<=0||t.stop<=0||t.target<=0||t.quantity<=0||t.pointValue<=0||t.fee<0||balance<=0||riskPercent<=0||riskPercent>5||dailyLimit<=0) throw new Error('Use positive prices, quantity and limits. Risk must be 0–5%.');
  if(t.side==='long' ? !(t.stop<t.entry && t.target>t.entry) : !(t.stop>t.entry && t.target<t.entry)) throw new Error('The stop and target must be on opposite sides of entry.');
  const risk=Math.abs(t.entry-t.stop)*t.quantity*t.pointValue+t.fee;
  if(risk>balance*riskPercent/100) throw new Error('This trade exceeds your per-trade risk limit. Reduce quantity.');
  if(dayPnl<=-dailyLimit || risk>dailyLimit+Math.min(0,dayPnl)) throw new Error('This trade exceeds your remaining daily loss budget.');
  return risk;
}
export function closeTrade(trade:PaperTrade, exit:number, at:string):PaperTrade {
  if(trade.closedAt) throw new Error('Trade is already closed.');
  if(!Number.isFinite(exit)||exit<=0) throw new Error('Enter a valid exit price.');
  return {...trade,exit,closedAt:at,pnl:(exit-trade.entry)*(trade.side==='long'?1:-1)*trade.quantity*trade.pointValue-trade.fee};
}
export const monthKey=(date=new Date())=>`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
