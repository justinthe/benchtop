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

## 9. Pitfalls (each cost real time once)
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
