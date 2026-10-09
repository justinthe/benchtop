import assert from 'node:assert/strict';
import { model, neededPower, NORMAL_LENGTH, N_EYE, EYE_POWER, PUPIL, SHARP_UM, RAY_HEIGHTS } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// reference numbers from the topic
near(NORMAL_LENGTH, 22.3, .05, 'normal eye length'); near(neededPower(NORMAL_LENGTH), 0, 1e-9, 'normal eye needs nothing');
near(neededPower(24.5), -5.5, .05, '24.5 mm eye'); near(neededPower(21.0), 3.6, .05, '21.0 mm eye');
// "about 2.7 D per mm of length error" near the normal length
near(-(neededPower(NORMAL_LENGTH + .5) - neededPower(NORMAL_LENGTH - .5)), 2.7, .1, 'dioptres per mm');

// uncorrected: sign conventions
const my = model({ eye: 24.5, lens: 0 }), hy = model({ eye: 21.0, lens: 0 }), no = model({ eye: NORMAL_LENGTH, lens: 0 });
assert.ok(my.offset < 0 && my.kind === 'myopic' && !my.sharp, 'long eye: focus in front of retina');
assert.ok(hy.offset > 0 && hy.kind === 'hyperopic' && !hy.sharp, 'short eye: focus behind retina');
assert.ok(no.sharp && no.kind === 'normal' && no.blurUm < 1e-6, 'normal eye is sharp');

// correcting with the needed power puts the focus exactly on the retina
for (const L of [20, 21, 22.3, 24.5, 27]) { const m = model({ eye: L, lens: neededPower(L) }); near(m.focus, L, 1e-9, `focus on retina at ${L}`); near(m.blurUm, 0, 1e-6, `no blur at ${L}`); }
// modes from the topic: concave -5.5 D fixes the 24.5 mm eye; convex +3.5 D fixes the 21 mm eye (within tolerance)
assert.ok(model({ eye: 24.5, lens: -5.5 }).sharp && model({ eye: 21, lens: 3.5 }).sharp, 'mode corrections are sharp');
assert.ok(my.blurUm > 100, 'uncorrected myope is clearly blurred');

// blur circle = pupil * |f - L| / f, grows with the error
near(my.blurUm, 1000 * PUPIL * Math.abs(my.focus - 24.5) / my.focus, 1e-9, 'blur formula');
assert.ok(model({ eye: 24.5, lens: -3 }).blurUm < my.blurUm, 'partial correction helps');

// every ray crosses the axis at the focus; at the retina its height is h(1 - L/f)
for (const [eye, lens] of [[24.5, 0], [21, 0], [22.3, 2], [26, -6]]) {
  const m = model({ eye, lens });
  m.rays.forEach(r => { const [, hr] = r.pts[2]; near(hr, r.h * (1 - eye / m.focus), 1e-9, 'retina height'); const slope = (r.pts[2][1] - r.h) / eye; near(r.h + slope * m.focus, 0, 1e-9, 'ray reaches axis at focus'); });
  assert.equal(!!m.rays[0].past, m.focus > eye, 'rays continue past the retina only for a too-short eye');
}
// total power adds
near(model({ eye: 22.3, lens: 2.5 }).Ptot, EYE_POWER + 2.5, 1e-12, 'powers add');

// finite across every slider range
for (let eye = 20; eye <= 27; eye += .25) for (let lens = -8; lens <= 6; lens += .5) {
  const m = model({ eye, lens });
  assert.ok([m.focus, m.blurUm, m.needed, m.Ptot].every(Number.isFinite) && m.rays.every(r => r.pts.flat().every(Number.isFinite)), `finite at ${eye},${lens}`);
}
assert.equal(RAY_HEIGHTS.length, 7); assert.ok(Math.max(...RAY_HEIGHTS) < PUPIL / 2); assert.ok(SHARP_UM > 0 && N_EYE === 1.336);
console.log('spectacles model ok');
