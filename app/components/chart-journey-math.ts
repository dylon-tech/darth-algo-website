/** Deterministic scene choreography. These are illustrative shapes, never market data. */
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
export const chapterProgress = [0, .26, .47, .68, 1] as const;
export function chapterAt(progress: number) {
  return progress < .16 ? 0 : progress < .37 ? 1 : progress < .58 ? 2 : progress < .83 ? 3 : 4;
}
export function journeyProgress(top: number, height: number, stageHeight: number, header = 72) {
  return clamp((header - top) / Math.max(1, height - stageHeight));
}
const cameras = [
  [0, 12, 7, 24, 0, 0, 0],
  [.26, -5, 3.8, 19, -1, 0, 1.2],
  [.47, 9, 5, 18, 2, 0, 2.3],
  [.68, -6, 3, 17, 3, .1, 2.5],
  [1, 0, .5, 25, 0, 0, 0],
];
export function cameraPose(progress: number, aspect: number) {
  const p = clamp(progress);
  const index = Math.min(cameras.length - 2, Math.max(0, cameras.findIndex((row, i) => i < cameras.length - 1 && p <= cameras[i + 1][0])));
  const from = cameras[index], to = cameras[index + 1];
  const t = smooth(from[0], to[0], p);
  const pose = from.slice(1).map((v, i) => v + (to[i + 1] - v) * t);
  // Fit the 22-unit chart horizontally even in a narrow phone viewport.
  const fit = Math.max(1, 1.6 / Math.max(.35, aspect));
  pose[0] *= Math.min(1.2, fit); pose[2] *= fit;
  return pose;
}
export const demoCandles = Array.from({ length: 38 }, (_, index) => {
  const x = (index - 18.5) * .48;
  const mid = Math.sin(index * .25) * 1.2 + Math.sin(index * .62) * .5 + (index - 19) * .075;
  const delta = Math.sin(index * 2.3 + .5) * .63;
  return { x, open: mid - delta / 2, close: mid + delta / 2, high: mid + Math.abs(delta) / 2 + .22, low: mid - Math.abs(delta) / 2 - .28, up: delta > 0 };
});
