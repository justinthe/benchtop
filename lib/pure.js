// Pure helpers (no DOM, no three) so tools/check.mjs can test them in Node.
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Reactive store: set() recomputes the model immediately, flush() notifies once per frame.
export function createStore(initial, model) {
  let state = { ...initial }, m = model(state), dirty = true;
  const subs = new Set();
  return {
    get state() { return state; },
    get model() { return m; },
    set(patch) {
      let changed = false;
      for (const k in patch) if (state[k] !== patch[k]) { changed = true; break; }
      if (!changed) return;
      state = { ...state, ...patch }; m = model(state); dirty = true;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    flush() {
      if (!dirty) return false;
      dirty = false; subs.forEach(fn => fn(state, m)); return true;
    },
  };
}

// Numbers lerp; everything else snaps at the midpoint.
export function tweenState(from, to, t) {
  const out = {};
  for (const k in to) out[k] = typeof to[k] === 'number' && typeof from[k] === 'number' ? lerp(from[k], to[k], t) : (t >= .5 ? to[k] : from[k]);
  return out;
}

// Hash codec: '#mode=2&length=1.5'. Types come from `template`; unknown keys are dropped.
export function encodeHash(obj) {
  const p = Object.entries(obj).map(([k, v]) => `${k}=${encodeURIComponent(typeof v === 'number' ? +v.toFixed(3) : v)}`);
  return p.length ? '#' + p.join('&') : '';
}
export function decodeHash(hash, template) {
  const out = {};
  for (const pair of hash.replace(/^#/, '').split('&')) {
    const [k, raw = ''] = pair.split('=');
    if (!(k in template)) continue;
    const v = decodeURIComponent(raw);
    if (typeof template[k] === 'number') { const n = Number(v); if (v !== '' && Number.isFinite(n)) out[k] = n; }
    else if (typeof template[k] === 'boolean') out[k] = v === 'true' || v === '1';
    else out[k] = v;
  }
  return out;
}

export const TIERS = ['high', 'med', 'low'];
export function pickTier({ mobile = false, cores = 8, gpu = '' } = {}) {
  if (/swiftshader|llvmpipe|software/i.test(gpu)) return 'low';
  if (mobile) return cores >= 8 ? 'med' : 'low';
  return cores >= 6 ? 'high' : 'med';
}
export const tierDown = t => TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(t) + 1)];

// Visible wavelength (nm) -> [r,g,b] in 0..1 (Bruton approximation, gamma .8, dimmed at the ends).
export function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else if (nm <= 780) r = 1;
  const f = nm < 420 ? .3 + .7 * (nm - 380) / 40 : nm > 700 ? .3 + .7 * (780 - nm) / 80 : 1;
  return [r, g, b].map(c => Math.pow(clamp(c * f, 0, 1), .8));
}
