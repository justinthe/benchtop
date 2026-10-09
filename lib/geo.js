// Pure grid/GIS helpers (no DOM, no three): heightfield sampling, contours, flood fill, slope, area.
// Grids are row-major Float32Array/Array of length w*h; (c, r) = (column, row); row 0 is the first (north) row of a baked heightmap.

export const idx = (w, c, r) => r * w + c;

// Bilinear sample at fractional grid coords (clamped to the grid).
export function sample(v, w, h, c, r) {
  c = Math.min(w - 1, Math.max(0, c)); r = Math.min(h - 1, Math.max(0, r));
  const c0 = Math.min(w - 2, Math.floor(c)), r0 = Math.min(h - 2, Math.floor(r)), fc = c - c0, fr = r - r0;
  const a = v[r0 * w + c0], b = v[r0 * w + c0 + 1], d = v[(r0 + 1) * w + c0], e = v[(r0 + 1) * w + c0 + 1];
  return a * (1 - fc) * (1 - fr) + b * fc * (1 - fr) + d * (1 - fc) * fr + e * fc * fr;
}

// Marching squares: returns a flat array [c0,r0,c1,r1, ...] of segments (grid coords) where the field crosses `level`.
export function contourSegments(v, w, h, level) {
  const out = [], lerp = (a, b) => (level - a) / (b - a);
  for (let r = 0; r < h - 1; r++) for (let c = 0; c < w - 1; c++) {
    const a = v[r * w + c], b = v[r * w + c + 1], d = v[(r + 1) * w + c + 1], e = v[(r + 1) * w + c]; // TL TR BR BL
    const code = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (d >= level ? 2 : 0) | (e >= level ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const top = [c + lerp(a, b), r], right = [c + 1, r + lerp(b, d)], bottom = [c + lerp(e, d), r + 1], left = [c, r + lerp(a, e)];
    const seg = (p, q) => out.push(p[0], p[1], q[0], q[1]);
    switch (code) {
      case 1: case 14: seg(left, bottom); break;
      case 2: case 13: seg(bottom, right); break;
      case 3: case 12: seg(left, right); break;
      case 4: case 11: seg(top, right); break;
      case 6: case 9: seg(top, bottom); break;
      case 7: case 8: seg(left, top); break;
      case 5: case 10: { // saddle: split by the centre value
        const centre = (a + b + d + e) / 4 >= level;
        if ((code === 5) === centre) { seg(left, top); seg(bottom, right); } else { seg(left, bottom); seg(top, right); }
      }
    }
  }
  return out;
}

// Cells at or below `level` that are 4-connected to a seed cell (index) that is itself at or below `level`.
// Not a bathtub fill: a basin behind a rim stays dry until the level passes the rim.
export function floodFill(v, w, h, level, seeds) {
  const mask = new Uint8Array(w * h), stack = [];
  for (const s of seeds) if (v[s] <= level && !mask[s]) { mask[s] = 1; stack.push(s); }
  while (stack.length) {
    const i = stack.pop(), c = i % w, r = (i - c) / w;
    if (c > 0 && !mask[i - 1] && v[i - 1] <= level) { mask[i - 1] = 1; stack.push(i - 1); }
    if (c < w - 1 && !mask[i + 1] && v[i + 1] <= level) { mask[i + 1] = 1; stack.push(i + 1); }
    if (r > 0 && !mask[i - w] && v[i - w] <= level) { mask[i - w] = 1; stack.push(i - w); }
    if (r < h - 1 && !mask[i + w] && v[i + w] <= level) { mask[i + w] = 1; stack.push(i + w); }
  }
  return mask;
}

export const count = mask => { let n = 0; for (let i = 0; i < mask.length; i++) n += mask[i]; return n; };
export const areaKm2 = (mask, cellXm, cellYm) => count(mask) * cellXm * cellYm / 1e6;

// Slope in degrees by central differences (edges use one-sided differences). cellX/cellY in metres.
export function slopeDeg(v, w, h, cellX, cellY) {
  const out = new Float32Array(w * h);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const c0 = Math.max(0, c - 1), c1 = Math.min(w - 1, c + 1), r0 = Math.max(0, r - 1), r1 = Math.min(h - 1, r + 1);
    const dzdx = (v[r * w + c1] - v[r * w + c0]) / ((c1 - c0) * cellX), dzdy = (v[r1 * w + c] - v[r0 * w + c]) / ((r1 - r0) * cellY);
    out[r * w + c] = Math.atan(Math.hypot(dzdx, dzdy)) * 180 / Math.PI;
  }
  return out;
}

// Index of the lowest / highest cell, optionally restricted to a boolean predicate on the index.
export function argExtreme(v, kind = 'max', pred = () => true) {
  let best = -1;
  for (let i = 0; i < v.length; i++) if (pred(i) && (best < 0 || (kind === 'max' ? v[i] > v[best] : v[i] < v[best]))) best = i;
  return best;
}

// Lon/lat of a grid position for a baked heightmap doc ({ origin:[lon,lat], step:[dlon,dlat] }).
export const lonLat = (doc, c, r) => [doc.origin[0] + (c + .5) * doc.step[0], doc.origin[1] + (r + .5) * doc.step[1]];

// World helper: map grid (c, r) to scene (x, z) for a terrain `size` units wide (matches kit.terrainFromHeights, centred on 0,0).
// cell = [east_m, north_m] per sample (from a baked heightmap's cell_m) keeps the true aspect of non-square cells.
export function gridToWorld(c, r, w, h, size, cell = [1, 1]) {
  const depth = size * (h - 1) * cell[1] / ((w - 1) * cell[0]);
  return [(c / (w - 1) - .5) * size, (r / (h - 1) - .5) * depth];
}
