import assert from 'node:assert/strict';
import { model, SYNODIC, NAMES, CUTS } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// principal phases: new 0 %, quarters 50 %, full 100 % (topic: synodic month about 29.5 days)
near(SYNODIC, 29.5, .1, 'synodic month');
near(model({ day: 0 }).litPct, 0, 1e-9, 'new'); near(model({ day: SYNODIC / 4 }).litPct, 50, 1e-9, 'first quarter');
near(model({ day: SYNODIC / 2 }).litPct, 100, 1e-9, 'full'); near(model({ day: 3 * SYNODIC / 4 }).litPct, 50, 1e-9, 'last quarter');
assert.equal(model({ day: 0 }).name, 'New moon'); assert.equal(model({ day: 7.4 }).name, 'First quarter');
assert.equal(model({ day: 14.8 }).name, 'Full moon'); assert.equal(model({ day: 22.1 }).name, 'Last quarter');
assert.equal(model({ day: 3.7 }).name, 'Waxing crescent'); assert.equal(model({ day: 11 }).name, 'Waxing gibbous');
assert.equal(model({ day: 18.5 }).name, 'Waning gibbous'); assert.equal(model({ day: 26 }).name, 'Waning crescent');
assert.equal(model({ day: 29.4 }).name, 'New moon');
assert.equal(NAMES.length, CUTS.length + 1);

// geometry cross-check: lit fraction = (1 + e.s)/2, e = unit vector Moon->Earth, s = unit vector Moon->Sun = (-1, 0)
for (let d = 0; d < SYNODIC; d += .37) {
  const m = model({ day: d }), e = [-m.moon[0], -m.moon[1]];
  near(m.lit, (1 - e[0]) / 2, 1e-12, `geometry at day ${d}`);
  near(Math.hypot(...m.moon), 1, 1e-12, 'unit orbit vector');
}
// symmetry: waxing and waning mirror each other; lit rises to full then falls
for (let d = 0; d <= SYNODIC / 2; d += .5) near(model({ day: d }).lit, model({ day: SYNODIC - d }).lit, 1e-12, 'mirror');
let prev = -1; for (let d = 0; d <= SYNODIC / 2; d += .25) { const l = model({ day: d }).lit; assert.ok(l >= prev); prev = l; }
assert.ok(model({ day: 5 }).waxing && !model({ day: 20 }).waxing);
// Moon at new is toward the Sun (-x), at first quarter toward the viewer (+z), at full away from the Sun (+x)
near(model({ day: 0 }).moon[0], -1, 1e-12, 'new toward Sun'); near(model({ day: SYNODIC / 4 }).moon[1], 1, 1e-12, 'quarter +z');
near(model({ day: SYNODIC / 2 }).moon[0], 1, 1e-12, 'full away from Sun');
// wrapping and days-to-full
near(model({ day: SYNODIC + 3 }).day, 3, 1e-9, 'wrap'); near(model({ day: -1 }).day, SYNODIC - 1, 1e-9, 'negative wrap');
near(model({ day: SYNODIC / 2 }).toFull, 0, 1e-9, 'at full'); near(model({ day: 0 }).toFull, SYNODIC / 2, 1e-9, 'new to full');

// no mutation, finite sweep over slider range
const st = Object.freeze({ day: 10 }); model(st);
for (let d = 0; d <= SYNODIC; d += .1) { const m = model({ day: d }); assert.ok([m.day, m.elong, m.lit, m.litPct, m.toFull, ...m.moon].every(Number.isFinite), `finite at ${d}`); assert.ok(m.litPct >= 0 && m.litPct <= 100); }
console.log('moon-phases model ok');
