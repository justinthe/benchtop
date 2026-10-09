import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compute, loadPlanets, G, STD_G, MASS_RANGE } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const doc = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const P = loadPlanets(doc), sorted = order => compute({ mass: 1, pick: 1, order }, P).rows.map(r => r.name),
  pickOf = (name, order) => sorted(order).indexOf(name) + 1,
  at = (mass, focus, order = 'distance') => compute(Object.freeze({ mass, pick: pickOf(focus, order), order }), P);

// --- the baked data, checked against physics (a mistyped cell fails here) ---
assert.equal(P.length, 8); assert.ok(doc.source && doc.license);
assert.deepEqual(P.map(p => p.name), ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']);
for (let i = 1; i < P.length; i++) assert.ok(P[i].semi_major_au > P[i - 1].semi_major_au, 'table is in distance order');
for (const p of P) {
  const gcalc = G * p.mass_1e24kg * 1e24 / (p.radius_km * 1e3) ** 2;
  near(gcalc / p.gravity_ms2, 1, .01, `g = GM/R^2 for ${p.name}`);
  near(p.period_yr ** 2 / p.semi_major_au ** 3, 1, .02, `Kepler T^2 = a^3 for ${p.name}`);
}
near(P.find(p => p.name === 'Earth').gravity_ms2, 9.8, .05, 'Earth g');

// --- worked numbers a reader can check ---
const e = at(70, 'Earth'); near(e.weightN, 686, .01, '70 kg on Earth = 686 N'); near(e.kgf, 70, .1, 'kgf near mass on Earth'); near(e.ratio, 1, 1e-12, 'Earth ratio');
const j = at(70, 'Jupiter'); near(j.weightN, 70 * 24.79, 1e-9, 'Jupiter'); near(j.ratio, 24.79 / 9.8, 1e-12, 'Jupiter ratio'); assert.ok(j.gas);
near(at(70, 'Mars').ratio, .38, .005, 'Mars about 0.38 of Earth'); assert.ok(!at(70, 'Mars').gas);
near(at(70, 'Jupiter').weightN / at(70, 'Mars').weightN, 6.7, .05, 'Jupiter is about 6.7 times Mars');
assert.equal(at(70, 'Earth').lightest, 'Mercury'); assert.equal(at(70, 'Earth').heaviest, 'Jupiter');
near(at(50, 'Venus').weightN / STD_G, at(50, 'Venus').kgf, 1e-12, 'kgf = N / standard g');

// --- invariants ---
for (const m of [30, 55.5, 120]) for (const p of P) near(at(m, p.name).weightN / m, p.gravity_ms2, 1e-9, 'weight/mass = g');
near(at(120, 'Mars').weightN, 4 * at(30, 'Mars').weightN, 1e-9, 'weight is linear in mass');

// --- sorting ---
const d = at(70, 'Earth', 'distance').rows, g = at(70, 'Earth', 'gravity').rows;
assert.deepEqual(d.map(r => r.name), P.map(p => p.name));
for (let i = 1; i < g.length; i++) assert.ok(g[i].g >= g[i - 1].g, 'gravity order ascending');
assert.equal(g[0].name, 'Mercury'); assert.equal(g[7].name, 'Jupiter');
assert.equal(at(70, 'Jupiter', 'gravity').focusIdx, 7); assert.equal(compute({ mass: 70, pick: 99, order: 'distance' }, P).name, 'Neptune', 'pick clamps'); assert.equal(compute({ mass: 70, pick: -3, order: 'distance' }, P).name, 'Mercury');

// --- modes (mirror the page's modes) ---
const modes = [{ mass: 70, pick: 3, order: 'distance' }, { mass: 70, pick: 1, order: 'gravity' }, { mass: 70, pick: 8, order: 'gravity' }];
assert.equal(compute(modes[1], P).name, compute(modes[1], P).lightest); assert.equal(compute(modes[2], P).name, compute(modes[2], P).heaviest);
assert.equal(compute(modes[0], P).name, 'Earth');

// --- finite sweep across the slider range ---
for (let m = MASS_RANGE[0]; m <= MASS_RANGE[1]; m += 7.5) for (const p of P) for (const order of ['distance', 'gravity']) {
  const r = at(m, p.name, order); for (const k of ['weightN', 'kgf', 'ratio', 'year', 'au', 'earthN']) assert.ok(Number.isFinite(r[k]), `${k} finite`);
}
console.log('planet-weights model ok');
