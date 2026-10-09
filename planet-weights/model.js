// Pure model: weight of a body on each planet from the baked table (planet-weights/data.json).
// Units: mass kg, g m/s^2, weight N, kgf = N / 9.80665, distance AU, year length Earth years.
export const G = 6.674e-11, STD_G = 9.80665, GAS_GIANTS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune'];
export const MASS_RANGE = [30, 120];

export const loadPlanets = doc => doc.data;

// Rows for one mass, sorted by 'distance' (from the Sun) or 'gravity' (weakest pull first).
export function compute(state, planets) {
  const earth = planets.find(p => p.name === 'Earth');
  let rows = planets.map(p => {
    const weightN = state.mass * p.gravity_ms2;
    return { name: p.name, au: p.semi_major_au, year: p.period_yr, g: p.gravity_ms2, weightN, kgf: weightN / STD_G,
      ratio: p.gravity_ms2 / earth.gravity_ms2, gas: GAS_GIANTS.includes(p.name) };
  });
  rows = state.order === 'gravity' ? rows.sort((a, b) => a.g - b.g) : rows.sort((a, b) => a.au - b.au);
  const focusIdx = Math.min(rows.length - 1, Math.max(0, Math.round(state.pick) - 1)); // pick: 1-based position along the row
  const lightest = rows.reduce((a, b) => (b.g < a.g ? b : a)).name, heaviest = rows.reduce((a, b) => (b.g > a.g ? b : a)).name;
  return { rows, focusIdx, ...rows[focusIdx], earthN: state.mass * earth.gravity_ms2, lightest, heaviest };
}

export const makeModel = planets => state => compute(state, planets);
