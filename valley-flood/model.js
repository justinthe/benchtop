// Valley Flood model: connected flood fill on a baked DEM. Pure (no DOM, no three).
// Units: elevations and levels in metres above sea level, cell sizes in metres, areas in km2, coordinates in degrees.
import { floodFill, count, argExtreme, lonLat } from '../lib/geo.js';

// Analyse a baked heightmap doc once: extremes, flooded area at every whole metre, and the biggest one-metre jump (the spill).
export function analyse(doc) {
  const { values: v, w, h, cell_m: [cx, cy] } = doc;
  const cellKm2 = cx * cy / 1e6, lowIdx = argExtreme(v, 'min'), highIdx = argExtreme(v, 'max');
  const min = v[lowIdx], max = v[highIdx];
  const curve = new Float64Array(max - min + 1);           // curve[k] = flooded km2 at level min + k (the DEM is whole metres, so area only steps at whole metres)
  for (let k = 0; k < curve.length; k++) curve[k] = count(floodFill(v, w, h, min + k, [lowIdx])) * cellKm2;
  let jumpK = 1;
  for (let k = 2; k < curve.length; k++) if (curve[k] - curve[k - 1] > curve[jumpK] - curve[jumpK - 1]) jumpK = k;
  const spillLevel = min + jumpK;

  // The rim cell: a cell at the spill level, next to the water one metre lower, that opens the largest newly connected region (the basin behind the rim).
  const before = floodFill(v, w, h, spillLevel - 1, [lowIdx]);
  const walled = Array.from(v, (z, i) => (before[i] ? Infinity : z));   // the old water blocks the fill, so a fill from the rim finds only the new region
  let rimIdx = -1, basin = null, basinN = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] !== spillLevel || before[i]) continue;
    const c = i % w, r = (i - c) / w;
    if (!((c > 0 && before[i - 1]) || (c < w - 1 && before[i + 1]) || (r > 0 && before[i - w]) || (r < h - 1 && before[i + w]))) continue;
    const reg = floodFill(walled, w, h, spillLevel, [i]), n = count(reg);
    if (n > basinN) { rimIdx = i; basin = reg; basinN = n; }
  }
  const basinFloorIdx = argExtreme(v, 'min', i => basin[i] === 1);
  let sc = 0, sr = 0; for (let i = 0; i < v.length; i++) if (basin[i]) { sc += i % w; sr += Math.floor(i / w); }
  const bc = sc / basinN, br = sr / basinN;                  // basin centroid; the label goes on the basin cell nearest to it
  const basinCentreIdx = argExtreme(Array.from(v, (_, i) => -Math.hypot(i % w - bc, Math.floor(i / w) - br)), 'max', i => basin[i] === 1);
  const at = i => { const c = i % w, r = (i - c) / w; return { idx: i, c, r, elev: v[i], lonlat: lonLat(doc, c, r) }; };
  return {
    w, h, cell: [cx, cy], cellKm2, min, max, totalKm2: w * h * cellKm2, curve,
    low: at(lowIdx), high: at(highIdx), rim: at(rimIdx), basinFloor: at(basinFloorIdx), basinCentre: at(basinCentreIdx),
    spillLevel, jumpKm2: curve[jumpK] - curve[jumpK - 1], basinKm2: basinN * cellKm2,
  };
}

// model(state) for one DEM. state = { level (m), contours (bool) }; returns every number the page shows plus the flood mask.
export function makeModel(doc) {
  const A = analyse(doc), v = doc.values;
  return function model(state) {
    const level = Math.round(Math.min(A.max, Math.max(A.min, Number.isFinite(state.level) ? state.level : A.min)));
    const mask = floodFill(v, A.w, A.h, level, [A.low.idx]);
    let below = 0; for (let i = 0; i < v.length; i++) if (v[i] <= level) below++;
    const floodedKm2 = count(mask) * A.cellKm2, belowKm2 = below * A.cellKm2;
    return {
      ...A, level, mask, floodedKm2, belowKm2,
      dryBelowKm2: belowKm2 - floodedKm2,                    // land lower than the water that stays dry because a ridge walls it off
      floodedPct: floodedKm2 / A.totalKm2 * 100,
      spilled: level >= A.spillLevel,
    };
  };
}
