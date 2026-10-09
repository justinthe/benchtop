// Thermochemistry / Hess's law model: pure (no DOM, no three).
// Units: enthalpy kJ/mol, heat kJ, mass g, volume mL (= g of water), temperature degrees C, time s.
// Data: textbook standard enthalpies of formation at 298 K, 1 bar, exactly as given in topics/thermochemistry.md.

export const C_WATER = 4.184e-3;      // kJ per g per K
export const C_BOMB = 1.0;            // kJ/K, calorimeter body (bomb vessel only)
export const ROOM = 25.0;             // degrees C
export const TAU_MIX = 1.2;           // s, mixing time constant of the trace
export const TAU_LOSS = 60;           // s of simulated time; the page runs the loss at 10x
export const LOSS_SPEEDUP = 10;

// id -> { formula (with state symbol), dHf (kJ/mol), M (g/mol) }
export const species = {
  CH4: { formula: 'CH₄(g)', dHf: -74.8, M: 16.043 },
  O2: { formula: 'O₂(g)', dHf: 0 },
  CO2: { formula: 'CO₂(g)', dHf: -393.5 },
  H2O_l: { formula: 'H₂O(l)', dHf: -285.8 },
  H2O_g: { formula: 'H₂O(g)', dHf: -241.8 },
  C3H8: { formula: 'C₃H₈(g)', dHf: -103.8, M: 44.097 },
  C2H5OH: { formula: 'C₂H₅OH(l)', dHf: -277.7, M: 46.068 },
  C6H12O6: { formula: 'C₆H₁₂O₆(s)', dHf: -1273.3, M: 180.156 },
  H2: { formula: 'H₂(g)', dHf: 0, M: 2.016 },
  NH4NO3: { formula: 'NH₄NO₃(s)', dHf: -365.6, M: 80.043 },
  NH4: { formula: 'NH₄⁺(aq)', dHf: -132.5 },
  NO3: { formula: 'NO₃⁻(aq)', dHf: -205.0 },
  Fe2O3: { formula: 'Fe₂O₃(s)', dHf: -824.2, M: 159.69 },
  Al: { formula: 'Al(s)', dHf: 0 },
  Al2O3: { formula: 'Al₂O₃(s)', dHf: -1675.7 },
  Fe: { formula: 'Fe(s)', dHf: 0 },
  C: { formula: 'C(graphite)', dHf: 0 },
  CO: { formula: 'CO(g)', dHf: -110.5 },
};

const R = (id, label, reactants, products, limiting, range, vessel, table, def) => ({ id, label, reactants, products, limiting, range, vessel, table, def });
export const reactions = [
  R('methane', 'Burn methane', [['CH4', 1], ['O2', 2]], [['CO2', 1], ['H2O_l', 2]], 'CH4', [.2, 4], 'bomb', -890.3, 1),
  R('propane', 'Burn propane', [['C3H8', 1], ['O2', 5]], [['CO2', 3], ['H2O_l', 4]], 'C3H8', [.2, 4], 'bomb', -2219.9, 1),
  R('ethanol', 'Burn ethanol', [['C2H5OH', 1], ['O2', 3]], [['CO2', 2], ['H2O_l', 3]], 'C2H5OH', [.2, 6], 'bomb', -1366.7, 1),
  R('glucose', 'Burn glucose', [['C6H12O6', 1], ['O2', 6]], [['CO2', 6], ['H2O_l', 6]], 'C6H12O6', [.5, 10], 'bomb', -2802.5, 2),
  R('hydrogen', 'Hydrogen to water', [['H2', 1], ['O2', .5]], [['H2O_l', 1]], 'H2', [.05, 1], 'bomb', -285.8, .2),
  R('hydrogen-steam', 'Hydrogen to steam', [['H2', 1], ['O2', .5]], [['H2O_g', 1]], 'H2', [.05, 1], 'bomb', -241.8, .2),
  R('cold-pack', 'Cold pack', [['NH4NO3', 1]], [['NH4', 1], ['NO3', 1]], 'NH4NO3', [1, 40], 'cup', 28.1, 5),
  R('thermite', 'Thermite', [['Fe2O3', 1], ['Al', 2]], [['Al2O3', 1], ['Fe', 2]], 'Fe2O3', [1, 20], 'bomb', -851.5, 5),
  R('carbon-to-co', 'Carbon to CO (Hess)', [['C', 1], ['O2', .5]], [['CO', 1]], null, [0, 1], 'none', -110.5, 0),
];
export const byId = Object.fromEntries(reactions.map(r => [r.id, r]));

export const sumHf = side => side.reduce((s, [id, n]) => s + n * species[id].dHf, 0);
export const deltaH = r => sumHf(r.products) - sumHf(r.reactants);
export const sideLabel = side => side.map(([id, n]) => `${n === 1 ? '' : n === .5 ? '½ ' : n + ' '}${species[id].formula}`).join(' + ');
export const equation = r => `${sideLabel(r.reactants)} → ${sideLabel(r.products)}`;
// Hess route through the elements: legs (reactants -> elements, elements -> products) and their sum
export const viaElements = r => ({ down: -sumHf(r.reactants), up: sumHf(r.products), total: -sumHf(r.reactants) + sumHf(r.products) });

// The unmeasurable reaction C + 1/2 O2 -> CO from two measurable combustions
export function hessCycle() {
  const burnC = sumHf([['CO2', 1]]) - sumHf([['C', 1], ['O2', 1]]);            // C + O2 -> CO2
  const burnCO = sumHf([['CO2', 1]]) - sumHf([['CO', 1], ['O2', .5]]);         // CO + 1/2 O2 -> CO2
  return { burnC, burnCO, result: burnC - burnCO };
}

// Run in the calorimeter. Returns NaN heat/temperatures for the unmeasurable reaction (locked).
export function run(r, mass, water) {
  if (!r.limiting) return { locked: true, xi: NaN, q: NaN, C: NaN, dT: NaN, Tfinal: NaN, Tshown: NaN, boils: false, freezes: false, mass: NaN };
  const m = Math.min(r.range[1], Math.max(r.range[0], mass));                   // clamp into the reaction's range
  const nu = r.reactants.find(([id]) => id === r.limiting)[1];
  const xi = m / species[r.limiting].M / nu;                                    // mol of reaction
  const q = -xi * deltaH(r);                                                    // kJ to the bath (positive = bath warms)
  const C = r.vessel === 'cup' ? (water + m) * C_WATER : water * C_WATER + C_BOMB;
  const dT = q / C, Tfinal = ROOM + dT;
  return { locked: false, mass: m, xi, q, C, dT, Tfinal, Tshown: Math.min(100, Math.max(0, Tfinal)), boils: Tfinal > 100, freezes: Tfinal < 0 };
}

// Temperature shown by the thermometer t seconds (page time) after the run starts. Clamped like the display.
export function tempAt(res, t, loss) {
  if (res.locked) return ROOM;
  const excess = res.dT * (1 - Math.exp(-t / TAU_MIX)) * (loss ? Math.exp(-t * LOSS_SPEEDUP / TAU_LOSS) : 1);
  return Math.min(100, Math.max(0, ROOM + excess));
}

// s: { rxn (id), mass (g), water (mL), loss (bool), route ('direct'|'via') }
export function model(s) {
  const r = byId[s.rxn] || reactions[0], dH = deltaH(r), res = run(r, s.mass, s.water), via = viaElements(r);
  const pair = r.id === 'hydrogen' || r.id === 'hydrogen-steam' ? { liquid: deltaH(byId.hydrogen), steam: deltaH(byId['hydrogen-steam']), gap: deltaH(byId['hydrogen-steam']) - deltaH(byId.hydrogen) } : null;
  return {
    r, id: r.id, equation: equation(r), dH, exo: dH < 0, via, levels: { reactants: sumHf(r.reactants), products: sumHf(r.products), elements: 0 },
    ...res, Tfinal: res.Tfinal, cycle: r.id === 'carbon-to-co' ? hessCycle() : null, pair, route: s.route, loss: !!s.loss,
  };
}
