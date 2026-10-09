import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { floodFill, count } from '../lib/geo.js';
import { makeModel, analyse } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const doc = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const model = makeModel(doc), v = doc.values;

// ---- the baked data (topic: USGS 3-arc-second DEM, East Tennessee, about 36.43 to 36.73 N, 84.41 to 84.08 W, cells about 298 x 371 m at size 128)
assert.equal(doc.kind, 'heightmap'); assert.equal(doc.unit, 'm'); assert.match(doc.source, /USGS/);
assert.equal(v.length, doc.w * doc.h); assert.ok(v.every(Number.isInteger), 'whole metres');
assert.equal(Math.min(...v), doc.min); assert.equal(Math.max(...v), doc.max);
assert.ok(doc.min > 150 && doc.max < 1300, 'plausible Appalachian elevations');
near(doc.cell_m[0], 298, 2, 'cell east'); near(doc.cell_m[1], 371, 2, 'cell north');
near(doc.origin[0], -84.41, .01, 'west edge'); near(doc.origin[1], 36.73, .01, 'north edge');
near(doc.origin[0] + doc.w * doc.step[0], -84.08, .01, 'east edge'); near(doc.origin[1] + doc.h * doc.step[1], 36.43, .03, 'south edge');
assert.ok(doc.step[1] < 0, 'row 0 is north');
// cell size agrees with the angular step: 1 deg lat = 111.2 km, 1 deg lon = 111.2 km x cos(lat)
const midLat = (doc.origin[1] + doc.h * doc.step[1] / 2) * Math.PI / 180;
near(doc.cell_m[1], Math.abs(doc.step[1]) * 111195, 2, 'north cell from step'); near(doc.cell_m[0], doc.step[0] * 111195 * Math.cos(midLat), 2, 'east cell from step');

// ---- extremes and coordinates
const A = analyse(doc);
assert.equal(A.low.elev, doc.min); assert.equal(A.high.elev, doc.max);
for (const p of [A.low, A.high, A.rim, A.basinFloor, A.basinCentre]) {
  assert.equal(v[p.idx], p.elev); assert.equal(p.r * doc.w + p.c, p.idx);
  assert.ok(p.lonlat[0] > -84.42 && p.lonlat[0] < -84.07 && p.lonlat[1] > 36.42 && p.lonlat[1] < 36.74, 'inside bbox');
}
near(A.totalKm2, doc.w * doc.h * doc.cell_m[0] * doc.cell_m[1] / 1e6, 1e-9, 'map area');

// ---- area = cell count x cell size, and the connected fill (not a bathtub)
const m300 = model({ level: 300 });
near(m300.floodedKm2, count(floodFill(v, doc.w, doc.h, 300, [A.low.idx])) * doc.cell_m[0] * doc.cell_m[1] / 1e6, 1e-9, 'area formula');
assert.ok(m300.dryBelowKm2 > 0, 'some low ground is walled off at 300 m');
for (let i = 0; i < v.length; i++) if (m300.mask[i]) assert.ok(v[i] <= 300, 'flooded cells are at or below the level');
assert.equal(model({ level: doc.min }).floodedKm2 > 0, true);
near(model({ level: doc.max }).floodedKm2, A.totalKm2, 1e-9, 'everything floods at the top');
near(model({ level: doc.max }).dryBelowKm2, 0, 1e-9, 'nothing walled off at the top');

// ---- the spill (the story): biggest one-metre jump is 579 -> 580 m, a basin of about 191 km2 behind a 580 m rim
assert.equal(A.spillLevel, 580); assert.equal(A.rim.elev, 580);
const below = model({ level: 579 }), above = model({ level: 580 });
near(below.floodedKm2, 412.2, .1, 'flooded at 579'); near(above.floodedKm2, 604.2, .1, 'flooded at 580');
near(A.jumpKm2, above.floodedKm2 - below.floodedKm2, 1e-9, 'jump'); assert.ok(A.jumpKm2 > 150);
near(A.basinKm2, 190.7, .1, 'basin behind the rim'); assert.ok(A.basinKm2 <= A.jumpKm2 + 1e-9);
assert.ok(below.dryBelowKm2 > 190 && above.dryBelowKm2 < 5, 'the walled-off land drains into the flood at the spill');
assert.ok(!below.mask[A.basinFloor.idx] && above.mask[A.basinFloor.idx], 'basin floor dry at 579, wet at 580');
assert.ok(A.basinFloor.elev < 579, 'basin floor is below the water that cannot reach it');
assert.ok(!below.mask[A.basinCentre.idx] && above.mask[A.basinCentre.idx], 'label cell is in the basin');
assert.ok(!below.spilled && above.spilled);

// ---- invariants over the whole slider range: monotonic, bounded, finite, curve agrees with the model
let prev = -1;
for (let L = doc.min; L <= doc.max; L++) {
  const m = model({ level: L, contours: true });
  assert.ok([m.level, m.floodedKm2, m.dryBelowKm2, m.floodedPct, m.belowKm2].every(Number.isFinite), `finite at ${L}`);
  assert.ok(m.floodedKm2 >= prev && m.floodedKm2 <= m.belowKm2 + 1e-9 && m.dryBelowKm2 >= -1e-9, `bounds at ${L}`);
  near(m.curve[L - doc.min], m.floodedKm2, 1e-9, `curve at ${L}`);
  prev = m.floodedKm2;
}
// clamping and bad input
assert.equal(model({ level: 0 }).level, doc.min); assert.equal(model({ level: 5000 }).level, doc.max); assert.equal(model({ level: NaN }).level, doc.min);
assert.equal(model({ level: 579.6 }).level, 580);
const st = Object.freeze({ level: 400, contours: false }); model(st);

// ---- modes (keep in sync with index.html)
for (const [L, lo, hi] of [[300, 20, 30], [579, 412, 413], [580, 604, 605], [800, 870, 890]]) { const a = model({ level: L }).floodedKm2; assert.ok(a > lo && a < hi, `mode ${L}: ${a}`); }
console.log('valley-flood model ok');
