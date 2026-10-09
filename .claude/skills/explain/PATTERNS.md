# Scene patterns and pitfalls

Recipes proven in the golden pages. Read the one closest to your topic, copy its **structure**, change the content. New
recipes get appended at the bottom by step 10 of the procedure.

## Pattern index
1. Model-first page (all pages)
2. Mechanics bench: `pendulum/`
3. Optics bench with traced rays: `prism-room/`
4. Mirror a control with a physical knob or stage
5. Tracking arm / auto-aligned second part
6. Diegetic chart screen
7. Info hotspots
8. Domain mapping hints (software, GIS, business)
9. Pitfalls (read before the verify loop)
10. Paraxial eye/lens bench: `spectacles/`
11. A body lit from a fixed direction (custom shader): `moon-phases/`
12. Data and GIS pages (baked data, terrain diorama, flood layer)
13. Chemistry bench with a run trace and an energy diagram: `thermochemistry/`
14. Data page from a baked table: `planet-weights/`
15. GIS flood diorama from a real DEM: `valley-flood/`
16. Story longer than 5 modes, economics diorama: `money-inflation/`

## 1. Model-first page
`model.js` (pure) -> `model.test.mjs` (asserts) -> page. The page never computes a displayed number itself.
Simulation state that cannot live in the reactive state (a pendulum's current angle) lives in `refs`; the model returns only
steady-state quantities (period, speed). When a slider changes the dynamics but not the pose, keep integrating; when it changes the
initial condition, reseed the sim (pendulum reseeds when `angle0` changes, so mode tweens look like "held, then released").

## 2. Mechanics bench (`pendulum/index.html`)
Room + bench + gantry rig + display on a stand. A protractor arc (emissive torus, partial) behind the moving part, a marker for the
release point, rod and bob as scaled cylinders updated each frame from the sim. Scene scale decoupled from physics with one constant
(`VIS` units per metre) so a 2 m pendulum fits the room. Live angle-vs-time trace on the screen (`live: true`, 6 s ring buffer).

## 3. Optics bench with traced rays (`prism-room/`)
- Trace rays in the **bench plane** in the model (2D, vector form of Snell, reflect on total internal reflection), map plane
  coordinates to scene `x = u`, `z = v`, `y = beam height`. The 3D beams are drawn from the traced polylines (`kit.beam.setPath`),
  so what you see is what was computed.
- Rotation sign: model angle CCW from +u toward +v; scene `rotation.y = -angle`.
- Glass: `MeshPhysicalMaterial` with `transmission: 1`, `ior`, `dispersion` on high and med; swap to `kit.mat.glass()` in `onTier('low')`.
  Add a faint `LineSegments(EdgesGeometry)` so the silhouette reads against a dark bench.
- A dark matte plate under the apparatus so beams and glows have contrast. Beams: white feed `boost 1.5`, bands `boost 1.25`, width 0.0045 to 0.006.
- Update beams and label anchors **only when the model result object changed** (`refs.lastM !== m`).
- Aim the source at the middle of the first face (not the centroid) or the beam can clip the wrong face.

## 4. Mirror a control with a physical object
A slider that sets an angle also rotates a visible knob or stage (`knob.rotation.y = -angle * k`). Cheap, and it makes the scene
feel like the controls are real. Stages carry an emissive tick; position its **local** y relative to its parent, not the world.

## 5. Tracking arm / auto-aligned part
When a part would be fiddly for users to align (a screen that must be where the beam lands, a second prism that must sit parallel
to the first), compute its pose in the model and let it follow, smoothing angles with a damped lerp (`lerpAngle`) so jumps swing instead of
snapping. Say in `assumptions` that it auto-aligns. A part that is "waiting" parks at a fixed spot on the bench and rides to its pose
(`lerp` position, small sine hop in y) instead of floating above the scene.

## 6. Diegetic chart screen
`kit.screenBezel` + a `screens` entry. Draw with `kit.chart`. Recipe: dark `#0d1114` background, grid at 0.08 alpha, curve width 4 to 5 px,
current point as a white disc with a drop line, a dashed amber reference line with its value, a rose shaded zone for "bad" regions, title
at 21 px, ticks at 17 px. Tilt the monitor about 25 to 30 degrees toward the default camera and keep it at the front corner so it does not
block the hero. Redraw on change; use `live: true` only for scrolling traces.

## 7. Info hotspots
Give a label an `info` function to make it a clickable pill with a popover. Use it to explain *why* a number is what it is
(for example the minimum-deviation fact on the Deviation label). One or two per page; the popover may cover the scene because the
user opened it.

## 8. Domain mapping hints
- **Software and systems**: data-centre floor; pipes = network; particles = packets; building floors = layers; racks = services.
- **GIS**: terrain from a baked heightmap; rivers and roads from simplified GeoJSON as tubes or ribbons; plinth diorama; hotspots for places.
- **Business and process**: factory line or conveyor; flows as particles; KPIs as stat chips; a city metaphor for portfolios.
- **Chemistry and heat**: lab bench with an insulated vessel; warm glow and steam wisps for heat given out, blue tint and frost for heat taken in;
  an energy-level diagram on a wall display so the same number appears on a thermometer, a trace and a diagram.
- **Biology**: macro diorama (a cell as a room); particles for molecules; a slider for concentration or time.

## 10. Paraxial eye/lens bench (`spectacles/`)
- Model: reduced eye (60 D surface, fluid n = 1.336, retina at the axial length) plus a thin lens in the same plane. `model()` returns the
  focus, blur, needed power **and the ray polylines** (7 marginal rays inside a 4 mm pupil, plus a dim "past the retina" segment when the
  focus falls behind it), so the 3D rays are the computed ones. Tests: exact ray-crosses-axis-at-focus and retina-height identities,
  `needed power = 1336/L - 60` against the topic's numbers, finite sweep, and the corrected modes land within the sharp threshold.
- Scale: pick one `S` (units per mm) so the whole eye reads (S = 0.07 makes a 22 mm eye about 1.5 units); raise the eye on a post.
- The eye is one transparent ellipsoid whose x-scale follows the axial length; the retina disc and rays follow the same value.
- The thin lens is a `LatheGeometry` rebuilt only when the power moves more than 0.04 D (dispose the old geometry).
- Retina picture: draw the sharp chart once to a cached canvas, then average N = 48 disc-shaped offsets with running-mean alpha
  (`globalAlpha = 1/(i+1)`). Defocus blur really is a disc, and `ctx.filter` is not available in Safari.
- Camera: choose the Rays view so the focus and retina clear the control panel (shift the target), and a Retina view that looks at the
  monitor from the side the eye is NOT on, otherwise the eye's labels land on the title block. Use `phoneFit` for portrait.

## 11. A body lit only from a fixed direction (`moon-phases/`)
Built by a cold session from `topics/moon-phases.md`; it is the reference for "one slider drives a pose, a derived quantity is the star".
- Model: one angle (`elong` from the lamp direction) and `lit = (1 - cos(elong)) / 2`; phase names by elongation cut points; waxing vs waning
  from `elong < 180`. Tests: principal phases (0, 50, 100, 50 %), a geometric cross-check of the lit fraction, mirror symmetry waxing/waning,
  monotonic rise to full, day wrapping, finite sweep.
- Lighting a ball so only the lamp lights it (room lights must not wash the dark half): a small `ShaderMaterial` with a `sunDir` uniform and
  `smoothstep(-.03, .12, dot(normalize(worldNormal), sunDir))` between a 2.5 % ambient and full albedo; procedural albedo from object-space noise.
- Sky screen: draw the disc from the same model result: dark disc, then the lit region as half-ellipse arcs by phase; name and percent in text.
- A head-sized Earth whose nose turns toward the Moon makes the "view from Earth" screen meaningful.
- Orbit-scale scenes are small on a phone: `phoneFit` about 2 on the overview and 1.35 on a top view. Keep sunbeams as short stubs by the lamp; full-length
  beams read as bars.

## 12. Data and GIS pages
- **Pipeline**: raw file in `data-src/` -> `tools/bake/*` -> `<slug>/data.json` (with provenance) -> `model.js` takes the parsed document as an input and computes everything shown
  (still pure) -> the page does `await fetch('./data.json')` then `createExplainer`. The Node test reads the same `data.json` with `fs` and checks it, so a bad bake fails `tools/test.sh`.
- **Terrain diorama** (World): `kit.plinth`, `kit.terrainFromHeights(values, w, h, {size, height, cell: doc.cell_m})`; vertical exaggeration = `height` (state it in `assumptions`), `kit.contourLines`
  at round levels, `kit.heightSampler` to stand hotspots on the ground, `geo.argExtreme` and `geo.lonLat` for real-coordinate hotspots (highest and lowest points).
- **Flood or threshold layer**: the model computes `mask = floodFill(values, w, h, level, [seedIndex])` and `areaKm2`; the page repaints with `kit.recolorTerrain` only when the level changed
  (blue where `mask[i]`) and draws a translucent water plane at `level`. Seed from `argExtreme(values, 'min')`. Show the flooded area as a stat chip.
- **Scene units**: terrain `size` about 4 to 6; one constant converts metres to scene units; labels use real place names only if they are in the data, otherwise lon/lat.
- **Data page** (metaphor driven by a table): one physical object per record (columns, stacks, spheres on rails; `buildingsInstanced` for many), a control that sorts, filters or switches
  the quantity, values on labels, a screen with the table or chart, `source` in the config. Cross-check baked columns against a formula in the model test. Use a log scale when data spans
  decades and say so on the page.

## 13. Chemistry bench: calorimeter, run trace, energy diagram (`thermochemistry/`)
- Model: a species table (formula with state symbol, dHf, M) and a reaction list (reactants/products as [id, n], limiting reactant, amount range, vessel type,
  expected table value for the tests). dH = sum(products) - sum(reactants); via elements = -sum(reactants) + sum(products); `run()` gives q, C, dT, clamped display
  temperature and boil/freeze flags; `tempAt(res, t, loss)` gives the trace. Tests: every row against its table value, Hess invariance, worked numbers, energy conservation,
  doubling, clamping, finite sweep, state symbols present.
- A **select** for the item list with `patch: v => ({ mass: item[v].default })`, and a slider whose `min/max/step` are functions of the selected item.
- **Run restart pattern**: in `update`, build a key from the inputs that define a run; when it changes, reset `t0` and the history. The screen trace is `live` but
  returns `false` unless 50 ms passed (20 fps cap). Labels show the final value; the console shows the live one.
- Hero feedback without new kit code: water emissive colour from the live excess temperature (warm or cool), a frost skin cylinder whose opacity follows cooling,
  `kit.particles` steam whose opacity follows heat, a pulsing red ring for a locked state.
- **Diagram screen on the back wall** (whiteboard, 960 x 576): keep the vertical scale true; reactants ledge left, products right, dashed elements line at 0; Direct = one
  coloured arrow (warm down for exothermic, cool up for endothermic), Via elements = two dark legs with their sums. Lay out special cases (a Hess cycle, a water/steam pair)
  by hand and check for text collisions in the screenshots: values under ledges collide with arrow labels when two levels are close. Fonts >= 25 px.
- Diagram view: the board must sit between the title block (left ~31 %) and the panel (right ~26 %), so the camera stands well back (about 3.7 units for a 2-unit board).
- Phone: calorimeter labels can sit on top of the board in the diagram view; keep labels anchored low on the hero or hide them in that view.

## 14. Data page from a baked table (`planet-weights/`, built by a cold session)
- One object per record: eight platform scales in a row; column height = the quantity on ONE fixed linear scale, record ball on top; an "Earth line" label as a reference.
- The model test reads `data.json` and cross-checks the columns against physics (g = GM/R^2 within 1 %, Kepler within 2 %), so a mistyped row fails.
- Second quantity on a screen: a log-log plot with the law's line (year vs distance). Footer `source` carries the provenance caveat verbatim.
- It picked the item with a 1..8 slider because no select existed then; use a `select` now.

## 15. GIS flood diorama from a real DEM (`valley-flood/`, built by a cold session)
- Bake with `tools/bake/heightmap.py`; terrain with `cell: doc.cell_m` and 5x relief on a plinth with a skirt wall; contours every 100 m with a toggle.
- Model: `floodFill` from the lowest cell; it also reports **"dry below water"** (cells at or below the level that are not connected), tinted amber, which makes the
  hidden basin visible before it spills. The spill level is found, not hard-coded: the largest one-metre jump in flooded area; the rim cell and the basin behind it follow.
- Stats: level, flooded km2, dry-below-water km2. Hotspots: highest, lowest, rim, basin (hidden after it floods), all with lon/lat from `geo.lonLat`.
- Screen: flooded area vs level curve with the jump marked. Modes bracket the spill: one metre below and at the rim.

## 9. Pitfalls (each cost real time once)
- Helpers that `build`, `update` or a screen `draw` call are executed **during** `createExplainer(...)`. Declare them as `function` declarations (hoisted),
  `var`, or above the call. A `const`/`let` below the call is a temporal-dead-zone `ReferenceError` and the page stays blank.
- Unattended runs (`claude -p`) cannot write inside `.claude/` (protected): step 10 then belongs in the report verbatim.
- `THREE.Clock` is deprecated in r186 (the runtime no longer uses it). Do not use it in pages; use `dt` from `update`.
- A page that 404s on the favicon logs a console error: keep the inline `<link rel="icon" ...>` from the template.
- The scripted verifier (`tools/verify.mjs`) clicks info labels through the DOM because a culled label can be off-screen.
- `THREE.PCFSoftShadowMap` was removed in r186. The runtime uses `PCFShadowMap`; do not set shadow types yourself.
- `kit.beam.setPath([])` must be safe (it is); never index pooled meshes with a negative index.
- Positions of children are **local**: an emissive tick at `y = .921` inside a group at `y = .89` floats at 1.81. Check with `__bt.scene.traverse` + `getWorldPosition`.
- Bloom: window glare and bright metal wash out the frame; fix roughness and sun intensity before raising the bloom threshold.
- A big monitor in the default view eats the hero. Make it about 0.8 to 1.0 m wide and put it at a front corner.
- Two labels anchored a few cm apart overlap and the lower priority one disappears; offset anchors (`dx`, `dy`) at assignment time.
- A narration branch that contradicts itself ("fans out by 0.0 deg") reads as a bug. Branch the sentence for edge states.
- A slider range that lets the beam miss the object produces NaN stats. Sweep every slider range in the model test.
- `tweenState` snaps booleans at the midpoint; animate a boolean-driven prop yourself in `update` (damped follow) for smoothness.
- Do not put spaces or `?` in state keys; keys become URL hash keys.

## 16. Story longer than 5 modes; economics diorama (`money-inflation/`)
- A 7-step story does not fit 2 to 5 modes: make it a `story` slider (0 = free play, 1..n) with keys B/N and `patch: v => STORY[v]` setting the other
  sliders; every other slider gets `patch: () => ({ story: 0 })` so touching it leaves the story. Modes still bookmark key beats. The model rounds `story`
  (mode tweens pass through fractional values).
- A catch-up the model does not have (prices lagging new money) is shown as a per-step `adj` fraction in the model, and said in `assumptions`.
- Values spanning 1x to 3000x: log-scale chart (say so on the board) and a piecewise stack height (linear to 3x, then log) so the hero stays readable.
- Pitfall: label `show(s, m)` is re-evaluated only on **state** change, not on `setView`, so it cannot hide a label per camera view. Move the anchor instead
  (low on the object, below the narration box).
- Pitfall: a wide side-by-side scene (bank | street | shop) loses its left third to the title block. Put the key object centre-back (vault under the
  wall board), low props on the left, and aim the default camera target about 0.5 units right of the scene centre.
- `kit.shelf` comes filled with books; build your own boards when the shelf holds model-driven goods.
