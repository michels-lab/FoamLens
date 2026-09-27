'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const frontend = path.join(__dirname, '..', 'src', 'FoamLensDesktop', 'frontend', 'index.html');
const html = fs.readFileSync(frontend, 'utf8');

const begin = '/* FOAMLENS_PROFILE_PLAYBACK_CORE_START */';
const end = '/* FOAMLENS_PROFILE_PLAYBACK_CORE_END */';
const a = html.indexOf(begin);
const b = html.indexOf(end, a);
assert(a >= 0 && b > a, 'Spatial Profiles playback core markers are missing.');

const core = html.slice(a, b + end.length);
const api = new Function(core + '\nreturn {' +
  'playbackAlmostEqual,playbackSortedUniqueTimes,playbackCommonPhysicalRange,' +
  'playbackUniformTimeline,playbackNearestTime,playbackBracketTimes,' +
  'playbackStepIndex,playbackTemporalInterpolateProfiles};')();

const near = (x, y, tol = 1e-9) => Math.abs(x - y) <= tol;
const passed = [];
function test(name, fn) {
  fn();
  passed.push(name);
}

// 1. Two cases with exactly the same physical times.
test('same physical times', () => {
  const r = api.playbackCommonPhysicalRange([[0,1,2,3], [0,1,2,3]]);
  assert(r.valid && near(r.start, 0) && near(r.end, 3));
  assert(near(api.playbackNearestTime([0,1,2,3], 2), 2));
});

// 2. Fixed vs adaptive.
test('fixed vs adaptive', () => {
  const fixed = [0,1,2,3,4,5];
  const adaptive = [0,.73,1.41,2.16,3.02,4.11,5.08];
  const r = api.playbackCommonPhysicalRange([fixed, adaptive]);
  assert(r.valid && near(r.start, 0) && near(r.end, 5));
  assert(near(api.playbackNearestTime(adaptive, 3), 3.02));
});

// 3. Adaptive vs adaptive with different stored times.
test('adaptive vs adaptive', () => {
  const r = api.playbackCommonPhysicalRange([
    [.15,.88,1.77,2.61,3.55],
    [.1,.91,1.69,2.8,3.7]
  ]);
  assert(r.valid && near(r.start, .15) && near(r.end, 3.55));
});

// 4. Three or more simultaneous cases.
test('three or more cases', () => {
  const r = api.playbackCommonPhysicalRange([
    [0,2,4,6],
    [1,3,5,7],
    [.5,2.5,4.5,6.5]
  ]);
  const timeline = api.playbackUniformTimeline(r.start, r.end, 100);
  assert(r.valid && near(r.start, 1) && near(r.end, 6));
  assert.strictEqual(timeline.length, 100);
  assert(near(timeline[0], 1) && near(timeline.at(-1), 6));
});

// 5. Temporal interpolation with identical spatial sampling.
test('matching spatial sampling', () => {
  const p1 = {profileTime:4,t:[0,1,2],y:[0,10,20],profileAxis:'x',profileCoordUnit:'mm'};
  const p2 = {profileTime:6,t:[0,1,2],y:[10,20,30],profileAxis:'x',profileCoordUnit:'mm'};
  const q = api.playbackTemporalInterpolateProfiles(p1, p2, 5);
  assert(q.ok && !q.spatialRemap);
  assert(near(q.y[0], 5) && near(q.y[2], 25));
});

// 6. Different spatial sampling: align by physical coordinate, never array index.
test('different spatial sampling', () => {
  const p1 = {profileTime:4,t:[0,1,2],y:[0,10,20],profileAxis:'x',profileCoordUnit:'mm'};
  const p2 = {profileTime:6,t:[0,.5,1,1.5,2],y:[10,15,20,25,30],profileAxis:'x',profileCoordUnit:'mm'};
  const q = api.playbackTemporalInterpolateProfiles(p1, p2, 5);
  assert(q.ok && q.spatialRemap);
  const i = q.x.findIndex(x => near(x, 1.5));
  assert(i >= 0 && near(q.y[i], 20));

  const unsafe = api.playbackTemporalInterpolateProfiles(p1, {...p2,profileCoordUnit:'m'}, 5);
  assert(!unsafe.ok && unsafe.reason === 'axis-or-unit-mismatch');
});

// 7. Play and Pause are separate controls.
test('Play/Pause controls', () => {
  assert(html.includes('id="profilePlay"'));
  assert(html.includes('id="profilePause"'));
  assert(html.includes("$('profilePause').onclick=stopProfileAnimation"));
});

// 8. Manual slider passes a physical-time value rather than an array index.
test('manual physical-time slider', () => {
  assert(html.includes("applyProfileTimeValue(Number($('profileTimeSlider').value)"));
  assert(!html.includes("const vals=profileAvailableTimes(),i=Number($('profileTimeSlider').value)"));
});

// 9. Speed changes timer cadence, not simulation-directory stepping.
test('playback speed', () => {
  assert(html.includes("650/speed"));
  assert(html.includes("if(profileAnimationPlaying)startProfileAnimationTimer()"));
});

// 10. Playback reaches the common interval end and does not wrap.
test('common interval end', () => {
  assert.strictEqual(api.playbackStepIndex(99, 1, 100), 99);
  assert(html.includes("if(profilePlaybackFrameIndex>=profilePlaybackFrames.length-1){stopProfileAnimation();return}"));
});

// 11. Explicit return to start.
test('return to start', () => {
  assert.strictEqual(api.playbackStepIndex(0, -1, 100), 0);
  assert(html.includes("$('profilePrev').onclick=()=>jumpProfileBoundary('start')"));
});

// 12. Nearest / Interpolate may be switched during comparison at current tPlay.
test('switch Nearest / Interpolate', () => {
  assert(html.includes("id=\"profileAlignment\""));
  assert(html.includes("$('profileAlignment').addEventListener('change'"));
  assert(html.includes("buildProfilePlaybackAtTime(t)"));
});

// Additional robustness: missing writes / restart-like gaps.
test('missing times and restart-like gaps', () => {
  const r = api.playbackCommonPhysicalRange([
    [0,1,2,8,9,10],
    [3,3.5,7.2,9.5]
  ]);
  assert(r.valid && near(r.start, 3) && near(r.end, 9.5));
  assert(near(api.playbackNearestTime([3,3.5,7.2,9.5], 5), 3.5));
});

// Playback resolution is independent of any case's sample count.
test('independent animation resolution', () => {
  assert.strictEqual(api.playbackUniformTimeline(0, 10, 100).length, 100);
  assert.strictEqual(api.playbackUniformTimeline(0, 10, 17).length, 17);
});

// Per-case status must expose requested/used/delta for Nearest.
test('alignment status metadata', () => {
  assert(html.includes("'Requested'"));
  assert(html.includes("'Used'"));
  assert(html.includes('Δt:'));
  assert(html.includes("'Interpolated from'"));
});

console.log('Spatial Profiles physical-time playback regression suite passed: ' + passed.length + ' checks.');
for (const name of passed) console.log('  ✓ ' + name);
