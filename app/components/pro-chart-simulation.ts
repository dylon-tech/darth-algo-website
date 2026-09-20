/** Scripted winning examples for a product walkthrough, never performance evidence. */
export const PRO_LOOP_MS = 24000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const knots = [[0,4470],[15,4535],[30,4510],[43,4488],[44,4494],[56,4530],[59,4524],[60,4520],[75,4485]];
const closingPrice = (index: number) => {
  const segment = knots.findIndex((point, i) => i < knots.length - 1 && index <= knots[i + 1][0]);
  const [start, from] = knots[segment], [end, to] = knots[segment + 1];
  const t = (index - start) / (end - start);
  return from + (to - from) * t + Math.sin(t * Math.PI) * Math.sin(index * 1.7) * 2.5;
};
export const proCandles = Array.from({ length: 76 }, (_, i) => {
  const close = closingPrice(i), open = i ? closingPrice(i - 1) : close - 2;
  return {open,close,high:Math.max(open,close)+1.2,low:Math.min(open,close)-1.2};
});
export const proSignals = [{index:44,buy:true},{index:60,buy:false}].map(signal => {
  const entry = proCandles[signal.index].close, direction = signal.buy ? 1 : -1;
  return {...signal,entry,stop:entry-direction*20,tp1:entry+direction*20,tp2:entry+direction*30};
});
export function advanceProLoop(progress: number, elapsed: number) {
  return (progress + Math.max(0, elapsed) / PRO_LOOP_MS) % 1;
}
export function proSimulation(progress: number) {
  const p = clamp(progress), visible = 42 + 34 * Math.min(1, p / .88);
  const index = Math.min(75, Math.ceil(visible) - 1), growth = Math.min(1, visible - index);
  const candle = proCandles[index];
  const price = candle.open + (candle.close-candle.open)*growth;
  const active = proSignals.findLastIndex(signal => visible >= signal.index + 1);
  const signal = proSignals[active];
  const reached = (target: number) => {
    if (!signal) return false;
    // Only completed candles and the currently revealed fraction may hit a target.
    for (let i = signal.index + 1; i <= index; i++) {
      const c = proCandles[i], fraction = i === index ? growth : 1;
      const extreme = c.open + ((signal.buy ? c.high : c.low) - c.open) * fraction;
      if (signal.buy ? extreme >= target : extreme <= target) return true;
    }
    return false;
  };
  const tp1Hit = !!signal && reached(signal.tp1), tp2Hit = !!signal && reached(signal.tp2);
  return {visible,index,growth,price,active,tp1Hit,tp2Hit,
    phase: !signal ? "Watching for a setup" : tp2Hit ? "TP2 reached · Scripted example" : tp1Hit ? "TP1 reached · Tracking TP2" : `${signal.buy ? "BUY" : "SELL"} signal · Entry, SL & targets set`,
  };
}
