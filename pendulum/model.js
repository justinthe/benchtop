// Pendulum model: pure functions, no DOM/three. Imported by the page and by model.test.mjs.
const rad = d => d * Math.PI / 180;

// Arithmetic-geometric mean: exact large-angle period is T = T0 / AGM(1, cos(theta0/2)).
export function agm(a, b) { for (let i = 0; i < 24; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)]; return a; }
export const smallPeriod = (L, g) => 2 * Math.PI * Math.sqrt(L / g);
export const period = (L, g, angle0) => smallPeriod(L, g) / agm(1, Math.cos(rad(angle0) / 2));

// s: { length (m), gravity (m/s^2), angle0 (deg) }
export function model(s) {
  const T0 = smallPeriod(s.length, s.gravity), T = period(s.length, s.gravity, s.angle0);
  return { T0, T, peak: Math.sqrt(2 * s.gravity * s.length * (1 - Math.cos(rad(s.angle0)))), err: (T / T0 - 1) * 100 };
}

// One RK4 step of theta'' = -(g/L) sin(theta) - c*omega. Returns [theta, omega].
export function stepRK4(th, om, dt, g, L, c = 0) {
  const f = (t, o) => [o, -(g / L) * Math.sin(t) - c * o];
  const k1 = f(th, om), k2 = f(th + dt / 2 * k1[0], om + dt / 2 * k1[1]), k3 = f(th + dt / 2 * k2[0], om + dt / 2 * k2[1]), k4 = f(th + dt * k3[0], om + dt * k3[1]);
  return [th + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), om + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
}
