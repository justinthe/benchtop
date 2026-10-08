// Prism model: Sellmeier glass + 2D vector-Snell ray tracer. Pure (no DOM/three).
// Plane coords: u = along the optical rail (+x in scene), v = across it (+z in scene). Angles in degrees, CCW from +u toward +v.
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1], cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = a => ((a + 540) % 360) - 180;

// Schott N-SF11 Sellmeier coefficients (wavelength in micrometres)
const B = [1.73759695, .313747346, 1.89878101], C = [.013188707, .0623068142, 155.23629];
export const index = nm => { const l = (nm / 1000) ** 2; return Math.sqrt(1 + B.reduce((s, b, i) => s + b * l / (l - C[i]), 0)); };

export const BANDS = [400, 450, 500, 550, 600, 650, 700], D_LINE = 589.3;
export const APEX = 60, SIDE = .5, GAP = .02, ARM = 1.6, SCREEN_R = 1.7;
export const BASE_PHI = -42; // stage angle at which the 589 nm ray meets the first face at 72 degrees
export const BASE_INCIDENCE = 72;

// ---- closed forms (used to cross-check the tracer) ----
export function closedDeviation(inc, n, A = APEX) {
  const t2 = Math.asin(Math.sin(rad(inc)) / n), s = n * Math.sin(rad(A) - t2);
  return s > 1 ? NaN : inc + deg(Math.asin(s)) - A;
}
export const minDevIncidence = (n = index(D_LINE), A = APEX) => deg(Math.asin(n * Math.sin(rad(A / 2))));
export const minDeviation = (n = index(D_LINE), A = APEX) => 2 * minDevIncidence(n, A) - A;
// Below this first-face incidence the exit face totally reflects this wavelength.
export const tirIncidence = (nm, A = APEX) => { const n = index(nm); return deg(Math.asin(n * Math.sin(rad(A) - Math.asin(1 / n)))); };

// ---- geometry ----
function poly(c, phi, flip) {
  const h = SIDE * Math.sqrt(3) / 2, loc = [[0, 2 * h / 3], [-SIDE / 2, -h / 3], [SIDE / 2, -h / 3]]; // apex, base-left, base-right (CCW)
  const a = rad(phi) + (flip ? Math.PI : 0), ca = Math.cos(a), sa = Math.sin(a);
  const V = loc.map(([x, y]) => [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca]);
  const edges = [0, 1, 2].map(i => { const p = V[i], q = V[(i + 1) % 3], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return { a: p, b: q, n: [dy / l, -dx / l], id: i }; });
  return { c, V, edges, phi: deg(a) };
}
// Second prism: same glass, inverted, faces parallel to the first prism's exit face, GAP away. Auto-aligned on its own stage.
export function layout(s) {
  const phi = BASE_PHI + s.prism, prisms = [poly([0, 0], phi, false)];
  if (s.second) { const nx = rad(30 + phi), d = SIDE / Math.sqrt(3) + GAP; prisms.push(poly([Math.cos(nx) * d, Math.sin(nx) * d], phi, true)); }
  return { phi, prisms };
}

function segHit(p, d, e) {
  const s = [e.b[0] - e.a[0], e.b[1] - e.a[1]], den = cross(d, s);
  if (Math.abs(den) < 1e-12) return null;
  const ap = [e.a[0] - p[0], e.a[1] - p[1]], t = cross(ap, s) / den, u = cross(ap, d) / den;
  return t > 1e-7 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null;
}

export function trace(prisms, origin, angle, nm, steps = 16) {
  const n = index(nm); let p = origin.slice(), d = [Math.cos(rad(angle)), Math.sin(rad(angle))], inside = false, skip = null, first = null, lastExit = null;
  const pts = [p.slice()], tir = [];
  for (let k = 0; k < steps; k++) {
    let best = null;
    prisms.forEach((pr, pi) => pr.edges.forEach(e => {
      if (skip && skip.pi === pi && skip.id === e.id) return;
      const t = segHit(p, d, e); if (t !== null && (!best || t < best.t)) best = { t, e, pi };
    }));
    if (!best) break;
    p = [p[0] + d[0] * best.t, p[1] + d[1] * best.t]; pts.push(p.slice());
    const ent = dot(d, best.e.n) < 0, N = ent ? best.e.n : [-best.e.n[0], -best.e.n[1]], eta = ent ? 1 / n : n;
    const c1 = -dot(d, N), kk = 1 - eta * eta * (1 - c1 * c1);
    if (!first) first = { p: p.slice(), incidence: deg(Math.acos(clamp(c1, -1, 1))) };
    if (kk < 0) { d = [d[0] + 2 * c1 * N[0], d[1] + 2 * c1 * N[1]]; tir.push(p.slice()); }
    else { const f = eta * c1 - Math.sqrt(kk); d = [eta * d[0] + f * N[0], eta * d[1] + f * N[1]]; inside = ent; if (!ent) lastExit = p.slice(); }
    skip = { pi: best.pi, id: best.e.id };
  }
  return { pts, dir: d, angle: deg(Math.atan2(d[1], d[0])), tir, first, lastExit, exited: !inside && lastExit !== null };
}

let _curve;
function curve() { return _curve ||= Array.from({ length: 61 }, (_, k) => ({ inc: 30 + k, dev: closedDeviation(30 + k, index(D_LINE)) })); }

// s: { light (collimator arm, deg), prism (stage, deg), second (bool) }
export function model(s) {
  const { prisms } = layout(s), a = s.light, e0 = prisms[0].edges[0];
  // collimator is aimed at the middle of the first face, ARM away along the beam direction
  const aim = [(e0.a[0] + e0.b[0]) / 2, (e0.a[1] + e0.b[1]) / 2], o = [aim[0] - ARM * Math.cos(rad(a)), aim[1] - ARM * Math.sin(rad(a))];
  const rays = BANDS.map(nm => ({ nm, ...trace(prisms, o, a, nm) }));
  const ref = trace(prisms, o, a, D_LINE);
  const devOf = r => Math.abs(wrap(r.angle - a)), exits = rays.filter(r => r.exited), devs = exits.map(devOf);

  // screen arm tracks the reference ray's exit direction
  const psi = ref.exited ? ref.angle : exits.length ? exits[0].angle : a, e = [Math.cos(rad(psi)), Math.sin(rad(psi))], perp = [-e[1], e[0]];
  const paths = rays.map(r => {
    const out = { nm: r.nm, pts: r.pts.slice(), exited: r.exited, tir: r.tir.length > 0, lateral: null };
    if (r.exited) {
      const last = r.pts[r.pts.length - 1], de = dot(r.dir, e), t = (SCREEN_R - dot(last, e)) / de;
      if (de > 1e-6 && t > 0) { const hit = [last[0] + r.dir[0] * t, last[1] + r.dir[1] * t]; out.pts.push(hit); out.lateral = dot([hit[0] - SCREEN_R * e[0], hit[1] - SCREEN_R * e[1]], perp); }
      else out.pts.push([last[0] + r.dir[0] * 3, last[1] + r.dir[1] * 3]);
    }
    return out;
  });
  const tirRay = rays.find(r => r.tir.length);
  return {
    incidence: ref.first ? ref.first.incidence : NaN,
    deviation: ref.exited ? devOf(ref) : NaN,
    spread: devs.length ? Math.max(...devs) - Math.min(...devs) : NaN,
    tirCount: rays.filter(r => r.tir.length).length,
    allTrapped: exits.length === 0,
    entry: ref.first ? ref.first.p : null, exit: ref.lastExit, tirPoint: tirRay ? tirRay.tir[0] : null,
    origin: o, paths, screen: { angle: psi, lateral: paths.map(p => p.lateral) },
    prisms: prisms.map(p => ({ c: p.c, phi: p.phi })),
    minDev: minDeviation(), minDevIncidence: minDevIncidence(), curve: curve(),
  };
}
