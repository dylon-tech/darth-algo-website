/** Scripted winning examples for a product walkthrough, never performance evidence. */
export const PRO_LOOP_MS = 14000;
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
export type IndicatorMode = "swing" | "scalp";
export const indicatorProfiles = {
  swing: { label: "Swing", timeframe: "15m", minutes: 15, setups: [{index:44,buy:true},{index:60,buy:false}], risk: 20, target1: 20, target2: 30 },
  scalp: { label: "Scalper", timeframe: "1m", minutes: 1, setups: [{index:44,buy:true},{index:50,buy:true},{index:60,buy:false},{index:67,buy:false}], risk: 12, target1: 8, target2: 12 },
};
export function signalsFor(mode: IndicatorMode = "swing") {
 const profile = indicatorProfiles[mode];
 return profile.setups.map(signal => {
  const entry = proCandles[signal.index].close, direction = signal.buy ? 1 : -1;
  return {...signal,entry,stop:entry-direction*profile.risk,tp1:entry+direction*profile.target1,tp2:entry+direction*profile.target2};
 });
}
export const proSignals = signalsFor();
export function advanceProLoop(progress: number, elapsed: number) {
  return (progress + Math.max(0, elapsed) / PRO_LOOP_MS) % 1;
}
/** Discrete intrabar ticks follow OHLC, so the live candle can move both ways. */
export function proCandleTick(candle: typeof proCandles[number], growth: number) {
  const step = growth >= 1 ? 1 : Math.floor(clamp(growth) * 6) / 6;
  const points = candle.close >= candle.open ? [candle.open,candle.low,candle.high,candle.close] : [candle.open,candle.high,candle.low,candle.close];
  const segment = Math.min(2,Math.floor(step*3)), fraction = step*3-segment;
  const price = points[segment]+(points[segment+1]-points[segment])*fraction;
  const shown = [...points.slice(0,segment+1),price];
  return {price,high:Math.max(...shown),low:Math.min(...shown)};
}
export function proFocusFrame(feature: number, narrow: boolean, priceX: number, priceY: number, signalX: number, signalY: number, riskTop: number) {
  if (feature === 4) return [850,65,270,180];
  if (feature === 3) return [Math.max(40,signalX-45),riskTop-45,Math.min(980,1050-Math.max(40,signalX-45)),225];
  if (feature === 2) return [Math.max(40,Math.min(signalX,priceX)-80),Math.min(signalY,priceY)-90,Math.max(350,Math.abs(priceX-signalX)+230),230];
  if (feature === 1) return [Math.max(40,priceX-270),priceY-95,430,220];
  return narrow ? [300,0,820,570] : [0,0,1120,570];
}
export function proSimulation(progress: number, mode: IndicatorMode = "swing") {
  const signals = signalsFor(mode);
  const p = clamp(progress), visible = 42 + 34 * Math.min(1, p / .88);
  const index = Math.min(75, Math.ceil(visible) - 1), growth = Math.min(1, visible - index);
  const candle = proCandles[index];
  const price = proCandleTick(candle,growth).price;
  const active = signals.findLastIndex(signal => visible >= signal.index + 1);
  const signal = signals[active];
  const reached = (target: number) => {
    if (!signal) return false;
    // Only completed candles and the currently revealed fraction may hit a target.
    for (let i = signal.index + 1; i <= index; i++) {
      const c = proCandles[i], fraction = i === index ? growth : 1;
      const tick = proCandleTick(c,fraction);
      const extreme = signal.buy ? tick.high : tick.low;
      if (signal.buy ? extreme >= target : extreme <= target) return true;
    }
    return false;
  };
  const tp1Hit = !!signal && reached(signal.tp1), tp2Hit = !!signal && reached(signal.tp2);
  return {visible,index,growth,price,active,tp1Hit,tp2Hit,
    phase: !signal ? "Watching for a setup" : tp2Hit ? "TP2 reached · Scripted example" : tp1Hit ? "TP1 reached · Tracking TP2" : `${signal.buy ? "BUY" : "SELL"} signal · Entry, SL & targets set`,
  };
}
