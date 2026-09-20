import assert from 'node:assert/strict';
import { cameraPose, chapterAt, chapterProgress, journeyProgress } from '../app/components/chart-journey-math.ts';

// Forward/backward chapter navigation must round-trip through the real sticky geometry.
for (const [height, stage] of [[3960, 828], [2960, 650], [1850, 500]]) {
  chapterProgress.forEach((progress, index) => {
    const top = 72 - progress * (height - stage);
    const actual = journeyProgress(top, height, stage);
    assert.ok(Math.abs(actual - progress) < 1e-8);
    assert.equal(chapterAt(actual), index);
  });
  assert.equal(journeyProgress(500, height, stage), 0);
  assert.equal(journeyProgress(-height, height, stage), 1);
}
// Camera interpolation must remain continuous at chapter boundaries on phone and desktop.
for (const aspect of [.55, .8, 1.5, 2.4]) {
  let previous = cameraPose(0, aspect);
  for (let i = 1; i <= 1000; i++) {
    const pose = cameraPose(i / 1000, aspect);
    assert.ok(pose.every(Number.isFinite));
    assert.ok(pose[2] > 10);
    assert.ok(pose.every((value, index) => Math.abs(value - previous[index]) < .6));
    previous = pose;
  }
}
assert.ok(cameraPose(.5, .55)[2] > cameraPose(.5, 2)[2], 'Narrow screens must pull the camera back');
assert.deepEqual(cameraPose(-1, 2), cameraPose(0, 2));
assert.deepEqual(cameraPose(2, 2), cameraPose(1, 2));
console.log('Chart journey navigation and camera continuity checks passed.');
