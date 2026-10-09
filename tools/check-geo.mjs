// node tools/check-geo.mjs: pure GIS helper checks
import assert from 'node:assert/strict';
import { sample, contourSegments, floodFill, count, areaKm2, slopeDeg, argExtreme, lonLat, gridToWorld } from '../lib/geo.js';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// bilinear: plane z = 2c + 3r is reproduced exactly, and clamps outside
const W = 5, H = 4, plane = Array.from({ length: W * H }, (_, i) => 2 * (i % W) + 3 * Math.floor(i / W));
near(sample(plane, W, H, 1.5, 2.25), 2 * 1.5 + 3 * 2.25, 1e-9, 'bilinear plane'); near(sample(plane, W, H, -3, 99), plane[(H - 1) * W], 1e-9, 'clamped');

// contours: plane z = c crosses level 2.5 as a vertical line x = 2.5; every segment has length 1 and all x equal
const ramp = Array.from({ length: 25 }, (_, i) => i % 5);
const seg = contourSegments(ramp, 5, 5, 2.5); assert.equal(seg.length / 4, 4);
for (let i = 0; i < seg.length; i += 4) { near(seg[i], 2.5, 1e-9, 'contour x0'); near(seg[i + 2], 2.5, 1e-9, 'contour x1'); near(Math.abs(seg[i + 3] - seg[i + 1]), 1, 1e-9, 'unit length'); }
assert.equal(contourSegments(ramp, 5, 5, 99).length, 0, 'no crossing, no segments');
// a peak gives a closed loop: every vertex appears an even number of times
const peak = Array.from({ length: 49 }, (_, i) => 10 - Math.hypot(i % 7 - 3, Math.floor(i / 7) - 3));
const pk = contourSegments(peak, 7, 7, 8.3), key = (x, y) => `${x.toFixed(6)},${y.toFixed(6)}`, deg = new Map();
for (let i = 0; i < pk.length; i += 4) for (const k of [key(pk[i], pk[i + 1]), key(pk[i + 2], pk[i + 3])]) deg.set(k, (deg.get(k) || 0) + 1);
assert.ok(pk.length > 0 && [...deg.values()].every(n => n === 2), 'closed contour loop');

// flood fill: bowl (centre 0) with a rim of 5 around it, outer ring 2. Level 3 fills only the bowl; level 6 spills over the rim to the outer ring.
const g = new Array(49).fill(2); const at = (c, r) => r * 7 + c;
for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) g[at(c, r)] = 5;
for (let r = 2; r <= 4; r++) for (let c = 2; c <= 4; c++) g[at(c, r)] = 0;
const m3 = floodFill(g, 7, 7, 3, [at(3, 3)]); assert.equal(count(m3), 9, 'bowl only behind the rim');
const m6 = floodFill(g, 7, 7, 6, [at(3, 3)]); assert.equal(count(m6), 49, 'spills over the rim');
assert.equal(count(floodFill(g, 7, 7, 3, [at(0, 0)])), 49 - 25, 'outer ring floods from the outside, bowl stays dry');   // 24 outer cells
assert.equal(count(floodFill(g, 7, 7, -1, [at(3, 3)])), 0, 'seed above level fills nothing');
near(areaKm2(m3, 100, 200), 9 * 100 * 200 / 1e6, 1e-12, 'area');
let prev = -1; for (let L = -1; L <= 6; L++) { const n = count(floodFill(g, 7, 7, L, [at(3, 3)])); assert.ok(n >= prev, 'monotonic in level'); prev = n; }

// slope: plane rising 2 m per 10 m cell in x
const sx = slopeDeg(Array.from({ length: 25 }, (_, i) => 2 * (i % 5)), 5, 5, 10, 10); sx.forEach(s => near(s, Math.atan(.2) * 180 / Math.PI, 1e-4, 'slope'));
assert.equal(slopeDeg(new Array(25).fill(7), 5, 5, 10, 10).every(s => s === 0), true);

assert.equal(argExtreme(g, 'min'), at(2, 2)); assert.equal(argExtreme(g, 'max', i => i !== at(1, 1)) , at(2, 1) < at(3, 1) ? at(2, 1) : at(3, 1), 'first max after exclusion');
const doc = { origin: [-84, 36.5], step: [.01, -.01] }; const ll = lonLat(doc, 0, 0); near(ll[0], -83.995, 1e-9, 'lon'); near(ll[1], 36.495, 1e-9, 'lat');
const [x0, z0] = gridToWorld(0, 0, 5, 3, 4), [x1, z1] = gridToWorld(4, 2, 5, 3, 4); near(x0, -2, 1e-12, 'x0'); near(x1, 2, 1e-12, 'x1'); near(z1 - z0, 2, 1e-12, 'depth = size*(h-1)/(w-1)');
const [, zc] = gridToWorld(0, 0, 5, 3, 4, [300, 450]), [, zd] = gridToWorld(4, 2, 5, 3, 4, [300, 450]); near(zd - zc, 4 * 2 * 450 / (4 * 300), 1e-12, 'metric aspect of non-square cells');
console.log('geo ok');
