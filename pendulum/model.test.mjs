import assert from 'node:assert/strict';
import { agm, smallPeriod, period, model, stepRK4 } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// 1 m on Earth: classic 2.006 s
near(smallPeriod(1, 9.81), 2.0064, 1e-3, 'T0');
// small angle: exact period within 0.1% of formula
near(period(1, 9.81, 5) / smallPeriod(1, 9.81), 1, 1e-3, '5deg');
// 90 deg release: known ratio 1.18034
near(period(1, 9.81, 90) / smallPeriod(1, 9.81), 1.18034, 5e-4, '90deg');
near(agm(1, 1), 1, 1e-12, 'agm identity');

// integrator conserves energy (undamped) over 10 periods
const [g, L, a0] = [9.81, 1, 60 * Math.PI / 180], E = (t, o) => o * o / 2 + (g / L) * (1 - Math.cos(t));
let th = a0, om = 0; const E0 = E(th, om);
for (let i = 0; i < 20000; i++) [th, om] = stepRK4(th, om, 1e-3, g, L);
near(E(th, om) / E0, 1, 1e-6, 'energy drift');

// integrated period matches analytic: time between downward zero crossings
th = a0; om = 0; const cross = [];
for (let i = 0, t = 0; i < 8000 && cross.length < 2; i++, t += 1e-3) {
  const prev = th; [th, om] = stepRK4(th, om, 1e-3, g, L);
  if (prev > 0 && th <= 0) cross.push(t + 1e-3 * prev / (prev - th));
}
near(cross[1] - cross[0], period(L, g, 60), 2e-3, 'simulated period');

// damping removes energy
th = a0; om = 0; for (let i = 0; i < 10000; i++) [th, om] = stepRK4(th, om, 1e-3, g, L, .3);
assert.ok(E(th, om) < E0 * .1, 'damped energy falls');

// stats finite and ordered
const m = model({ length: 1, gravity: 9.81, angle0: 75 });
assert.ok(m.T > m.T0 && m.err > 0 && Number.isFinite(m.peak));
console.log('pendulum model ok');
