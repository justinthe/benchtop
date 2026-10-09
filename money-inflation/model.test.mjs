import assert from 'node:assert/strict';
import { model, inflationRate, priceAt, STORY, P0 } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const at = (money, goods, years, story = 0) => model(Object.freeze({ money, goods, years, story }));

// starting numbers from the topic
assert.equal(P0, 10, 'P = 100000 x 4 / 40000');
const z = at(10, 0, 0);
near(z.bread, 3, 1e-9, 'bread $3'); near(z.milk, 2, 1e-9, 'milk $2'); near(z.bike, 200, 1e-9, 'bike $200');
assert.equal(z.loaves, 33, '$100 buys 33 loaves');

// the topic's checks
near(inflationRate(10, 0), 10, 1e-9, 'm 10, g 0');
near(inflationRate(10, 10), 0, 1e-9, 'm = g');
near(inflationRate(0, 5), -4.7619, 1e-3, 'deflation');

// MV = PQ holds every year, and the yearly price ratio is the inflation rate
for (const [m, g] of [[10, 0], [50, -5], [-5, 10], [3, 2]]) {
  for (let y = 0; y <= 20; y++) { const r = at(m, g, y); near(r.M * 4 / (r.P * r.Q), 1, 1e-12, `MV = PQ ${m} ${g} ${y}`); }
  near((priceAt(m, g, 5) / priceAt(m, g, 4) - 1) * 100, inflationRate(m, g), 1e-9, `yearly ratio ${m} ${g}`);
}

// story: one year at 10 %
near(at(10, 0, 1, 2).bread, 3, 1e-9, 'step 2: prices not moved yet');
const s5 = model({ ...STORY[5], story: 5 });
near(s5.bread, 3.3, 1e-9, 'step 5: bread $3.30'); assert.equal(s5.loaves, 30, 'step 6: $100 buys 30 loaves');
near(s5.M, 110000, 1e-6, 'vault +10 %');
const s3 = model({ ...STORY[3], story: 3 }), s4 = model({ ...STORY[4], story: 4 });
assert.ok(3 < s3.bread && s3.bread < s4.bread && s4.bread < 3.3, 'prices climb through steps 2 to 5');
near(model({ ...STORY[7], story: 7 }).bread, 3, 1e-9, 'step 7: goods keep up, bread holds at $3');

// monotonic: more money, higher prices; more goods, lower prices
assert.ok(at(20, 0, 5).P > at(10, 0, 5).P && at(10, 5, 5).P < at(10, 0, 5).P);
assert.ok(at(10, 0, 5).worth < 100 && at(0, 5, 5).worth > 100, 'saver loses with inflation, gains with deflation');

// finite across every slider range and story step
for (let m = -5; m <= 50; m += 5) for (let g = -5; g <= 10; g += 2.5) for (const y of [0, 1, 7, 20]) for (let st = 0; st <= 7; st += .5) {
  const r = at(m, g, y, st);
  for (const k of ['M', 'Q', 'P', 'bread', 'inflation', 'loaves', 'worth', 'Mi', 'Qi', 'Pi']) assert.ok(Number.isFinite(r[k]), `${k} finite at ${m} ${g} ${y} ${st}`);
  assert.ok(r.series.P.every(Number.isFinite) && r.series.P.length === 21);
}
console.log('money-inflation model ok');
