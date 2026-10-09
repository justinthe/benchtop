---
title: Heat Bench
slug: thermochemistry
type: explainer
tags: [chemistry, thermochemistry, energy, hess-law]
---

# Why some reactions get hot and others get cold (Hess's law)

**Scope of this page:** enthalpy of reaction and Hess's law only. Calorimetry theory, bond energies,
activation energy, entropy and Gibbs energy are *not* on this page; they are separate topics later.
(The calorimeter appears here only as the instrument that makes the energy visible.)

**Audience:** high school and first-year college. Plain language first, then the number. No entropy,
no Gibbs. Sign convention stated once, clearly: negative ΔH means the reaction gives heat to its surroundings.

## The idea in a few sentences

Every substance has an energy "price tag" called its standard enthalpy of formation: the heat absorbed
when one mole is built from its elements. Elements in their natural form cost nothing. A reaction is just
taking apart the reactants and building the products, so its heat is the total price of the products
minus the total price of the reactants. Because energy is a state function, the route does not matter:
going straight there, or through the elements, always gives the same ΔH. That is Hess's law, and it lets
us work out reactions nobody can measure directly (burning carbon to carbon monoxide, for example).

I want people to **pick a reaction, see the heat it gives out or takes in as a real temperature change in
a calorimeter, and watch the same number appear as a gap on an energy diagram**. The three views of
one fact (a thermometer, a graph, an energy diagram) are the point of the page.

## Page type and scene

Explainer. A **chemistry lab bench in a bright teaching lab**: a lab bench with an insulated calorimeter
(lidded vessel with a water bath, stirrer, and a digital thermometer probe), a sealed reaction chamber
dipped in the water, reagent bottles and a balance as props, a shelf of glassware, a window, a plant.
Warm practical lighting, same visual language as Prism Room.

- **Hero object:** the calorimeter. Exothermic: faint warm glow in the water, a few steam wisps off the lid.
  Endothermic: cool blue tint, a little frost on the outside of the vessel.
- **Diegetic screen 1 (thermometer console):** digital readout plus a live temperature-vs-time trace.
- **Diegetic screen 2 (whiteboard / wall display):** the energy-level diagram (see below).
- **Prop details that must change with the chosen reaction:** the bottle on the balance is labelled with
  the reactant formula; the balance shows the grams currently chosen.

## Interactions

1. **Reaction menu** (must-have): choose from the table below. A new reaction restarts the run.
2. **Amount** slider: grams of the limiting reactant (range per reaction in the table).
3. **Water bath** slider: 50 to 1000 mL.
4. **Heat loss** toggle Off / On: Off = ideal insulation; On = the trace rises, peaks, then drifts back toward room
   temperature (so people see why real calorimetry needs a correction).
5. **Route** toggle on the diagram: *Direct* / *Via elements*. Both arrows are drawn to the same length
   (this is the Hess's-law demonstration).

Live temperature trace is must-have: after a reaction starts, the thermometer moves smoothly to its final
value over a couple of seconds (fast mixing), the graph draws it in real time, and the trace holds (heat loss
off) or relaxes (heat loss on).

## Reactions (use exactly these numbers)

Standard enthalpies of formation at 298 K and 1 bar, textbook values in kJ/mol. **Do not substitute other
data sources**: results should match the published reaction enthalpies in the last column to within 1 kJ.

| id | Reaction | Species (ΔfH°, kJ/mol) | ΔH° rxn (kJ per mol of reaction) | Limiting reactant (M, g/mol) | Amount range (g) |
|---|---|---|---|---|---|
| methane | CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(l) | CH₄ −74.8; O₂ 0; CO₂ −393.5; H₂O(l) −285.8 | **−890.3** | CH₄ 16.043 | 0.2 to 4 |
| propane | C₃H₈(g) + 5 O₂(g) → 3 CO₂(g) + 4 H₂O(l) | C₃H₈ −103.8 | **−2219.9** | C₃H₈ 44.097 | 0.2 to 4 |
| ethanol | C₂H₅OH(l) + 3 O₂(g) → 2 CO₂(g) + 3 H₂O(l) | C₂H₅OH −277.7 | **−1366.7** | C₂H₅OH 46.068 | 0.2 to 6 |
| glucose | C₆H₁₂O₆(s) + 6 O₂(g) → 6 CO₂(g) + 6 H₂O(l) | C₆H₁₂O₆ −1273.3 | **−2802.5** | C₆H₁₂O₆ 180.156 | 0.5 to 10 |
| hydrogen | H₂(g) + ½ O₂(g) → H₂O(l) | H₂ 0 | **−285.8** | H₂ 2.016 | 0.05 to 1 |
| hydrogen-steam | H₂(g) + ½ O₂(g) → H₂O(g) | H₂O(g) −241.8 | **−241.8** | H₂ 2.016 | 0.05 to 1 |
| cold-pack | NH₄NO₃(s) → NH₄⁺(aq) + NO₃⁻(aq) | NH₄NO₃ −365.6; NH₄⁺(aq) −132.5; NO₃⁻(aq) −205.0 | **+28.1** (endothermic) | NH₄NO₃ 80.043 | 1 to 40 |
| thermite | Fe₂O₃(s) + 2 Al(s) → Al₂O₃(s) + 2 Fe(s) | Fe₂O₃ −824.2; Al₂O₃ −1675.7; Fe, Al 0 | **−851.5** | Fe₂O₃ 159.69 | 1 to 20 |
| carbon-to-co | C(graphite) + ½ O₂(g) → CO(g) | CO −110.5; C, O₂ 0 | **−110.5** | (not measurable, see below) | n/a |

Rules:
- Elements in their standard state (O₂, H₂, C graphite, Fe, Al) have ΔfH° = 0.
- ΔH°rxn = Σ n·ΔfH°(products) − Σ n·ΔfH°(reactants). The page computes this from the species table; the
  last column is only for the tests.
- **Water vs steam** (hydrogen vs hydrogen-steam): the 44.0 kJ/mol gap is the latent heat of vaporisation.
  State symbols must be shown on the diagram and in the equation, because this is the classic Hess's-law trap.
- **carbon-to-co** cannot be measured: burning carbon gives CO₂, not CO. When selected, the calorimeter shows a
  locked state ("Nobody can burn carbon to stop at CO") and the page instead shows the Hess cycle:
  C + O₂ → CO₂ (−393.5), CO + ½ O₂ → CO₂ (−283.0), so C + ½ O₂ → CO = −393.5 − (−283.0) = −110.5.
  The two measurable steps are drawn as two arrows on the diagram and the unknown is the gap between them.

## Model (put this in `model.js`, pure, no DOM or three.js)

- `species`: map of id → { name, formula, state, dHf, M }.
- `reactions`: list of { id, label, reactants[{species, n}], products[{species, n}], limiting, range, vessel }. `vessel` is `cup` for cold-pack and `bomb` for every other measurable reaction.
- `deltaH(reaction)`: Σ n·ΔfH° products − Σ n·ΔfH° reactants.
- `energyLevels(reaction)`: reactants total, elements (0), products total, for the diagram.
- **Run model**, for a reaction with amount `m` grams of limiting reactant and water volume `V` mL:
  - moles of reaction ξ = (m / M) / ν_limiting (ν_limiting = stoichiometric number of the limiting reactant).
  - heat released to the bath q = −ξ·ΔH (kJ), negative q means the bath loses heat.
  - bath heat capacity C depends on the vessel type of the reaction (`vessel` field):
    - `bomb` (combustions, hydrogen, thermite): C = V × 4.184 J/K + 1.0 kJ/K calorimeter body. Reactant mass is not added.
    - `cup` (cold-pack): open insulated cup, C = (V + m) × 4.184 J/K, no extra calorimeter term (solute mass joins the water).
  - ΔT = q / C. Final temperature T = 25.0 °C + ΔT. Room temperature stays 25.0 °C.
  - **Limits:** if T would exceed 100 °C or fall below 0 °C, clamp the displayed temperature at that limit and show
    a banner "Water would boil" / "Water would freeze" (the model still reports the unclamped ΔT in the narration).
  - **Trace:** T(t) = 25 + ΔT·(1 − e^(−t/τ_mix)), τ_mix = 1.2 s. With heat loss On, multiply by e^(−t/τ_loss) for the
    excess over room temperature after the peak, τ_loss = 60 s (the page runs at 10× time; say so in "How this works").
- Outputs for stats: `dH` (kJ/mol), `q` (kJ, signed, bath view), `Tfinal` (°C).
- Carbon-to-CO: `run` returns `locked: true`, `dH` from the cycle, and the two step enthalpies.

## Tests the generator must write (Node asserts, run before building the page)

- Each row's computed ΔH equals the table value within 1e-9 (the arithmetic), and the table value is within 1 kJ of the
  published value: methane −890, propane −2220, ethanol −1367, glucose −2803.
- Hess invariance: for every reaction, going reactants → elements → products sums to the same ΔH as the direct formula.
- carbon-to-co: −393.5 − (−283.0) = −110.5 exactly (cycle) and equals the table.
- hydrogen vs hydrogen-steam differ by exactly 44.0 kJ.
- Sign: all exothermic rows give ΔT > 0, cold-pack gives ΔT < 0.
- Worked numbers: methane 1.00 g, 1000 mL bath (`bomb`) → q = 55.5 kJ, ΔT = +10.7 °C (±0.1).
  Cold-pack 5.0 g in 100 mL (`cup`) → q = −1.76 kJ (bath loses heat), ΔT = −4.0 °C (±0.1).
- Doubling the amount doubles ΔT (water volume and C_cal fixed).
- Energy conservation: |q| equals heat gained by water plus calorimeter for every reaction.
- Clamping: thermite 20 g in 50 mL triggers the "would boil" flag.

## Stats (3 chips)

- ΔH (kJ/mol) with sign shown (+28.1 / −890.3).
- Heat to the bath, q (kJ): positive when the bath warms.
- Final temperature (°C), one decimal.

## Guided modes

1. **Burn methane**: methane, 1.0 g, 1000 mL, heat loss off. The exothermic baseline. Camera on the calorimeter.
2. **Cold pack**: cold-pack, 5 g in 100 mL. The temperature drops; frost on the vessel.
3. **Hess shortcut**: carbon-to-co with the diagram view. The calorimeter is locked; the two-step cycle is drawn.
4. **Water or steam?**: hydrogen vs hydrogen-steam shown side by side on the diagram; mode toggles between them
   and highlights the 44 kJ gap.

## Camera views

- **Bench**: three-quarter view of the whole bench, calorimeter centred.
- **Flask**: close, slightly above the calorimeter, thermometer readable.
- **Diagram**: head-on at the energy-level display, readable on phone.

## Energy diagram (diegetic whiteboard screen, also needs to read on a phone)

- Vertical axis kJ/mol. A zero line for "elements".
- Draw a bar or ledge for reactants and for products at their summed ΔfH° heights, with state symbols.
- Draw ΔH as a vertical arrow between reactants and products, coloured warm (exothermic, arrow down) or cool
  (endothermic, arrow up).
- *Direct* route: one arrow reactants → products.
- *Via elements* route: arrow down/up from reactants to the zero line, then up/down to the products; label each leg
  with its sum; show that the two legs add to the same ΔH.
- Numbers on the diagram update live with the chosen reaction.

## Narration (rewrites itself, color-coded)

Plain English with live numbers. Example for methane:
"Burning 1.0 g of methane gives out **55.5 kJ**. That warms the 1000 mL water bath by **10.7 °C**, from 25.0 to
**35.7 °C**. On the energy diagram the products sit **890.3 kJ per mole** below the reactants, and the same drop
appears whether you go straight there or through the elements." For endothermic runs say "takes in" and "cools".
Do not use the words entropy or Gibbs.

## Labels (3D, small pills)

- Thermometer probe: "Water 35.7 °C".
- Reaction chamber: the reaction name and amount ("CH₄ 1.0 g").
- Calorimeter body: "Heat to bath +55.5 kJ" (info popup explains the sign convention).
- Balance: "1.0 g".

## Sound

Quiet lab ambience. Soft tick on controls. A gentle rising tone while the temperature climbs and a falling one
when it drops (tied to the thermometer value, very quiet).

## How this works (collapsible on the page)

State the assumptions in plain language: textbook ΔfH° values at 298 K, elements in standard states have zero
formation enthalpy, specific heat of water 4.184 J/g·K, calorimeter heat capacity 1.0 kJ/K, reactant mass ignored
in the heat capacity, complete reaction of the limiting reactant, and the time scale of the trace is sped up.

## Out of scope for this page

Bond energies, activation energy and catalysts, entropy, Gibbs energy, temperature dependence of ΔH (Kirchhoff),
non-standard states, real bomb-calorimeter corrections. Mention nothing of these beyond one line in the help text.

## Notes for the generator and runtime (not reader-facing)

- **Runtime gap:** the reaction menu is a 9-way choice. The runtime currently has only sliders and 2-to-3-way
  segmented toggles. Add a `select` control type (native `<select>` styled like the other controls, optional
  keys to step through options, snaps at the tween midpoint when a mode changes it) before building this page.
- **Kit additions likely needed:** `kit.calorimeter` (insulated vessel + lid + stirrer), `kit.thermometerProbe`,
  `kit.bottle` (reagent bottle with a label canvas), `kit.balance`, `kit.steam(origin)` (particle wisps), a frost
  overlay material, and `kit.chart.levels` for the energy diagram. Reuse `kit.screenBezel`, `kit.bench`, `kit.shelf`,
  `kit.plant`, `kit.windowLight`, `kit.room`.
- **Do not fake the physics:** all numbers on screen come from `model.js`; the diagram and the thermometer read the
  same result object.
- **Accessibility:** the reaction menu is a real labelled `<select>`; the energy diagram has a text equivalent in
  the narration; colour is never the only carrier of the exo/endo sign (arrow direction and the +/− sign also do it).
- **Performance:** no per-frame allocation in `update`; redraw the diagram only on state change and the trace at
  most 20 times per second.
- **Acceptance:** all asserts pass; zero console errors or warnings; every mode × view screenshot reviewed at
  desktop and phone width; thumbnail captured.
