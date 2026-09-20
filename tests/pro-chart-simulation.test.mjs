import assert from 'node:assert/strict';
import { proCandles, proSignals, proSimulation, advanceProLoop, PRO_LOOP_MS, proCandleTick, proFocusFrame } from '../app/components/pro-chart-simulation.ts';
const progressAt = visible => (visible - 42) / 34 * .88;
assert.equal(proSimulation(0).active, -1);
for (const [i, signal] of proSignals.entries()) {
  // One close activates both the marker and the plan; future target candles cannot leak.
  assert.equal(proSimulation(progressAt(signal.index + 1) - 1e-6).active, i - 1);
  const confirmed = proSimulation(progressAt(signal.index + 1) + 1e-6);
  assert.equal(confirmed.active, i);
  assert.equal(confirmed.tp1Hit, false);
  assert.equal(confirmed.tp2Hit, false);
  assert.ok(signal.buy ? signal.stop < signal.entry && signal.tp1 > signal.entry && signal.tp2 > signal.tp1 : signal.stop > signal.entry && signal.tp1 < signal.entry && signal.tp2 < signal.tp1);
  const end = proSignals[i+1]?.index ?? 75;
  const completed = proSimulation(progressAt(end + 1) - (i === 0 ? 1e-6 : 0));
  assert.equal(completed.active, i);
  assert.ok(completed.tp1Hit && completed.tp2Hit, 'Both targets must actually be reached in each scripted example');
  const sequence = proCandles.slice(signal.index+1,end+1);
  assert.ok(sequence.every(c=>signal.buy ? c.low > signal.stop : c.high < signal.stop),'Scripted winning example must not hit its stop first');
}
for (let i=0;i<=1000;i++) {
  const s = proSimulation(i/1000);
  assert.ok(s.visible>=42 && s.visible<=76);
  assert.ok(Number.isFinite(s.price));
  if (s.tp2Hit) assert.ok(s.tp1Hit);
}
assert.equal(advanceProLoop(.5,0),.5,'Pausing must preserve progress');
assert.ok(Math.abs(advanceProLoop(.9,PRO_LOOP_MS*.2)-.1)<1e-9,'Repeating must wrap to a new cycle');
assert.equal(advanceProLoop(.25,-100),.25);
assert.equal(proSimulation(advanceProLoop(.99,PRO_LOOP_MS*.02)).active,-1,'New cycle clears previous signal and target hits');
console.log('Pro autoplay, synchronized risk plans, and scripted target-hit checks passed.');

// Tick prices stay still between discrete updates, then visit the candle extremes.
const example = proCandles[48];
assert.deepEqual(proCandleTick(example,.01),proCandleTick(example,.1));
assert.equal(proCandleTick(example,0).price,example.open);
assert.equal(proCandleTick(example,1).price,example.close);
assert.equal(proCandleTick(example,1).high,example.high);
assert.equal(proCandleTick(example,1).low,example.low);
assert.ok(PRO_LOOP_MS<24000);
// Every feature gets a distinct, finite crop; dashboard and full risk plan remain in frame.
for (const narrow of [false,true]) {
  const frames = Array.from({length:5},(_,i)=>proFocusFrame(i,narrow,525,315,420,315,250));
  assert.equal(new Set(frames.map(JSON.stringify)).size,5);
  frames.forEach(frame=>assert.ok(frame.every(Number.isFinite)&&frame[2]>0&&frame[3]>0));
  const [x,y,w,h]=frames[4];
  assert.ok(x<=866&&x+w>=1108&&y<=83&&y+h>=221);
  assert.ok(frames[3][0]<=420&&frames[3][0]+frames[3][2]>=1005);
}
console.log('Discrete ticks and five feature-focus crops passed.');
