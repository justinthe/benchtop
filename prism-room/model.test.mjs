import assert from 'node:assert/strict';
import { index, BANDS, model, closedDeviation, minDevIncidence, minDeviation, tirIncidence, BASE_INCIDENCE } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const base = { light: 0, prism: 0, second: false };

// N-SF11 indices
near(index(589.3), 1.7845, 1e-4, 'n589'); near(index(400), 1.8454, 1e-4, 'n400'); near(index(700), 1.7718, 1e-4, 'n700');

// reference numbers: 72 deg incidence -> 68.3 deg deviation, 8.4 deg spread
const m = model(base);
near(m.incidence, BASE_INCIDENCE, 1e-6, 'incidence'); near(m.deviation, 68.31, .01, 'deviation'); near(m.spread, 8.40, .02, 'spread');
// tracer agrees with closed form
near(m.deviation, closedDeviation(72, index(589.3)), .01, 'trace vs closed form');

// spread also matches the closed form for the two extreme colours, at base pose and at least bend
for (const inc of [72, minDevIncidence()]) {
  const r = model({ ...base, prism: BASE_INCIDENCE - inc });
  near(r.spread, closedDeviation(inc, index(400)) - closedDeviation(inc, index(700)), 1e-6, `spread closed form at ${inc}`);
}

// minimum deviation: A + dmin = 2 asin(n sin(A/2)); reachable by turning the stage
near(minDevIncidence(), 63.15, .01, 'min-dev incidence'); near(minDeviation(), 66.31, .01, 'min deviation');
const least = model({ ...base, prism: BASE_INCIDENCE - minDevIncidence() });
near(least.deviation, minDeviation(), .01, 'least bend');
for (const dp of [-3, 3]) assert.ok(model({ ...base, prism: BASE_INCIDENCE - minDevIncidence() + dp }).deviation > least.deviation, 'deviation is minimal there');

// total internal reflection: violet first, below ~57.5 deg; red needs less incidence
near(tirIncidence(400), 57.5, .1, 'violet TIR threshold'); assert.ok(tirIncidence(700) < tirIncidence(400));
assert.equal(model({ ...base, prism: 72 - 60 }).tirCount, 0);   // 60 deg: nothing trapped
const part = model({ ...base, prism: 72 - 54 });                // 54 deg: some bands trapped
assert.ok(part.tirCount > 0 && part.tirCount < BANDS.length && !part.allTrapped);
const trapped = model({ ...base, prism: 72 - 45 });             // 45 deg: every band reflects at the exit face
assert.equal(trapped.tirCount, BANDS.length); assert.ok(trapped.tirPoint);

// collimator arm changes incidence the expected way (+arm = more incidence)
near(model({ ...base, light: 5 }).incidence, 77, .01, 'light arm');

// rejoin: second inverted prism sends every band out parallel to the input beam
for (const prism of [0, 5, -4]) {
  const r = model({ light: 0, prism, second: true });
  const ang = r.paths.map(p => { const [a, b] = p.pts.slice(-2); return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; });
  ang.forEach(x => near(x, 0, .1, `rejoin parallel at prism ${prism}`));
  assert.ok(r.spread < .1);
}

// no NaN where the beam passes (stats must be finite across the slider range)
for (let p = -10; p <= 30; p += 2.5) for (let l = -8; l <= 8; l += 4) {
  const r = model({ light: l, prism: p, second: false });
  assert.ok(Number.isFinite(r.incidence) && r.paths.every(x => x.pts.every(q => q.every(Number.isFinite))), `finite at ${p},${l}`);
}
console.log('prism model ok');
