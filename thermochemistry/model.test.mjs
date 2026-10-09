import assert from 'node:assert/strict';
import { model, reactions, byId, deltaH, viaElements, hessCycle, run, tempAt, species, ROOM, C_WATER, C_BOMB, equation } from './model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// 1. arithmetic: every row's computed dH equals its table value; published values within 1 kJ
for (const r of reactions) near(deltaH(r), r.table, 1e-9, `dH ${r.id}`);
const published = { methane: -890, propane: -2220, ethanol: -1367, glucose: -2803 };
for (const [id, v] of Object.entries(published)) near(byId[id].table, v, 1, `published ${id}`);

// 2. Hess invariance: reactants -> elements -> products gives the same dH as the direct formula
for (const r of reactions) near(viaElements(r).total, deltaH(r), 1e-9, `via elements ${r.id}`);

// 3. the unmeasurable reaction from two measurable ones
const cyc = hessCycle(); near(cyc.burnC, -393.5, 1e-9, 'C + O2'); near(cyc.burnCO, -283.0, 1e-9, 'CO + 1/2 O2'); near(cyc.result, -110.5, 1e-9, 'C -> CO by Hess'); near(cyc.result, byId['carbon-to-co'].table, 1e-9, 'equals table');

// 4. water vs steam: 44.0 kJ latent heat
near(deltaH(byId['hydrogen-steam']) - deltaH(byId.hydrogen), 44.0, 1e-9, 'water vs steam');

// 5. signs: exothermic warms, the cold pack cools; carbon-to-co is locked
for (const r of reactions) {
  if (!r.limiting) { assert.ok(run(r, 1, 500).locked); continue; }
  const res = run(r, r.def, 500); assert.ok(r.table < 0 ? res.dT > 0 : res.dT < 0, `sign ${r.id}`);
}

// 6. worked numbers from the topic
const meth = run(byId.methane, 1.00, 1000); near(meth.q, 55.5, .05, 'methane q'); near(meth.dT, 10.7, .1, 'methane dT'); near(meth.Tfinal, 35.7, .1, 'methane T');
const cold = run(byId['cold-pack'], 5.0, 100); near(cold.q, -1.76, .01, 'cold pack q'); near(cold.dT, -4.0, .1, 'cold pack dT');

// 7. doubling the amount doubles dT (bomb vessel: heat capacity independent of the amount)
for (const r of reactions.filter(r => r.vessel === 'bomb')) {
  const a = run(r, r.range[0], 400), b = run(r, 2 * r.range[0], 400); near(b.dT / a.dT, 2, 1e-9, `doubling ${r.id}`);
}

// 8. energy conservation: heat to the bath = heat gained by water (+ calorimeter body)
for (const r of reactions.filter(r => r.limiting)) for (const water of [50, 400, 1000]) {
  const res = run(r, r.def, water), m = res.mass;
  const gained = r.vessel === 'cup' ? (water + m) * C_WATER * res.dT : (water * C_WATER + C_BOMB) * res.dT;
  near(gained, res.q, 1e-9, `conservation ${r.id} ${water}`);
}

// 9. clamping: thermite 20 g in 50 mL would boil; display clamps at 100
const th = run(byId.thermite, 20, 50); assert.ok(th.boils && th.Tfinal > 100 && th.Tshown === 100, 'thermite boils');
assert.ok(run(byId['cold-pack'], 40, 50).freezes === false || run(byId['cold-pack'], 40, 50).Tshown >= 0, 'freezing clamps at 0');

// 10. the trace: starts at room temperature, approaches the final value without loss, returns towards room with loss
const res = run(byId.methane, 1, 1000);
near(tempAt(res, 0, false), ROOM, 1e-12, 'trace start'); near(tempAt(res, 30, false), res.Tshown, 1e-6, 'trace settles');
assert.ok(tempAt(res, 1, false) < tempAt(res, 3, false), 'trace rises');
assert.ok(tempAt(res, 40, true) - ROOM < .05 * res.dT, 'loss relaxes towards room');
assert.ok(tempAt(res, 2, true) > ROOM, 'loss still peaks above room');
near(tempAt(run(byId['carbon-to-co'], 1, 1000), 5, false), ROOM, 0, 'locked stays at room');

// 11. amounts are clamped to each reaction's range
near(run(byId.hydrogen, 4, 1000).mass, 1, 0, 'clamp high'); near(run(byId['cold-pack'], 0, 1000).mass, 1, 0, 'clamp low');

// 12. guided modes give the stated results
const m1 = model({ rxn: 'methane', mass: 1, water: 1000, loss: false, route: 'direct' }); near(m1.dH, -890.3, 1e-9, 'mode 1'); near(m1.Tshown, 35.7, .1, 'mode 1 T');
const m2 = model({ rxn: 'cold-pack', mass: 5, water: 100, loss: false, route: 'direct' }); near(m2.Tshown, 21.0, .1, 'mode 2 T');
const m3 = model({ rxn: 'carbon-to-co', mass: 0, water: 500, loss: false, route: 'via' }); assert.ok(m3.locked && m3.cycle && !Number.isFinite(m3.q));
const m4 = model({ rxn: 'hydrogen-steam', mass: .2, water: 1000, loss: false, route: 'direct' }); near(m4.pair.gap, 44.0, 1e-9, 'mode 4 gap');

// 13. finite output across every control range (except the locked reaction, which reports NaN heat by design)
for (const r of reactions) for (const f of [0, .5, 1]) for (const water of [50, 500, 1000]) for (const loss of [false, true]) {
  const m = model({ rxn: r.id, mass: r.range[0] + f * (r.range[1] - r.range[0]), water, loss, route: 'via' });
  assert.ok(Number.isFinite(m.dH) && Number.isFinite(m.levels.reactants) && Number.isFinite(m.via.total), `finite ${r.id}`);
  if (r.limiting) assert.ok([m.q, m.dT, m.Tshown].every(Number.isFinite) && m.Tshown >= 0 && m.Tshown <= 100, `finite heat ${r.id}`);
}
// state symbols appear in every equation (the water/steam trap)
for (const r of reactions) assert.match(equation(r), /\((g|l|s|aq|graphite)\)/, `state symbols ${r.id}`);
assert.ok(Object.values(species).every(sp => Number.isFinite(sp.dHf)));
console.log('thermochemistry model ok');
