import assert from 'node:assert/strict';
import { model } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// reference values a reader can check by hand
const m = model({ side: 1, spin: 0 });
near(m.volume, 1, 1e-12, 'volume'); near(m.area, 6, 1e-12, 'area'); near(m.diagonal, Math.sqrt(3), 1e-12, 'diagonal');
// invariants: scaling the side by k scales volume by k^3 and area by k^2
const k = model({ side: 2.5, spin: 0 });
near(k.volume / m.volume, 2.5 ** 3, 1e-9, 'volume scaling'); near(k.area / m.area, 2.5 ** 2, 1e-9, 'area scaling');
// finite across the whole slider range
for (let side = .2; side <= 2; side += .1) assert.ok(Object.values(model({ side, spin: 0 })).every(Number.isFinite), `finite at ${side}`);
console.log('model ok');
