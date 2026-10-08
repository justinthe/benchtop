# PLAN — benchtop implementation

Source: `PRD.md` v1.1 (2026-10-08). Repo is empty (no commits). This plan orders the work by PRD §12 milestones, names every file, and gives a "done when" check per step.

---

## 0. Decisions made in this plan

| Topic | Decision | Why |
|---|---|---|
| Three.js version | Pin **r0.186.1** (latest on npm today), vendored to `lib/` | PRD §11: self-hosted, pinned. sael.net uses 0.183.2; no reason to start older. |
| How to vendor | `tools/vendor.sh` runs `npm pack three@0.186.1` + fontsource packages into scratch, copies only needed files. No `node_modules`, no `package.json` in repo. | Zero build step for pages (G4); script makes re-vendoring reproducible. |
| Skill location | Repo-local `.claude/skills/explain/` | Skill, runtime and golden examples version together; works when repo cloned elsewhere. |
| Runtime split | `lib/explainer.js` (core) + `lib/kit.js` (procedural builders) + `lib/explainer.css`. Sound lives inside `explainer.js`. | Fewest files that keep page code short. Kit is big and independent, so separate. |
| Tests | One Node script `tools/check.mjs` with `assert` for pure runtime logic (store, tween, hash codec, tier pick) + per-page model asserts in `<slug>/model.test.mjs`. No framework. | PRD §9.2 step 2 + §14 "Node asserts". |
| Verification hooks | Runtime exposes `window.__bt = { ready, setMode(i), setView(name), state, fps, errors }` | Lets Claude-in-Chrome verify deterministically (wait for `ready`, iterate modes × views) instead of simulating keypresses. |
| Model location | Pure model in `<slug>/model.js` (ES module, no Three import) | Same file imported by page and by Node asserts. |
| GitHub user / X link | Placeholders (`<github-user>`, empty X slot) | PRD decision #2, #7. Fill when known. |

---

## 1. M0 — Repo + Pages scaffold

Files:
```
.nojekyll                  # Pages serves files as-is (no Jekyll; underscores safe)
index.html                 # placeholder root: "benchtop — gallery in v2", links to pages that exist
.gitignore                 # scratch dirs, .recall/, *.tmp
tools/vendor.sh            # fetch + copy three, addons, fonts (see below)
tools/serve.sh             # python3 -m http.server 8000 from repo root
lib/three.module.js + three.core.js   # unminified r0.186.1 (Pages gzips)
lib/addons/...             # keep upstream folder structure so relative imports inside addons resolve
lib/fonts/*.woff2, fonts.css, OFL.txt
```

Addons to vendor (plus whatever they import transitively — `vendor.sh` copies the closure):
- `controls/OrbitControls.js`
- `postprocessing/`: `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass`, `SMAAPass`, `GTAOPass`, `ShaderPass`, `Pass`, `MaskPass`
- `shaders/`: `CopyShader`, `LuminosityHighPassShader`, `OutputShader`, `SMAAShader`, `GTAOShader`, `PoissonDenoiseShader`, `FXAAShader`
- `renderers/CSS2DRenderer.js`
- `environments/RoomEnvironment.js`
- `geometries/RoundedBoxGeometry.js`
- `utils/BufferGeometryUtils.js` (merging repeated geometry)
- `math/SimplexNoise.js` (terrain, plants, drift)

Fonts (fontsource npm packages, latin subset, woff2): Barlow Condensed 600/700, Inter 400/600, JetBrains Mono 400/500 + `OFL.txt`.

Import map (every page):
```html
<script type="importmap">
{ "imports": { "three": "../lib/three.module.js + three.core.js   # unminified r0.186.1 (Pages gzips)
</script>
```

**Done when:** `tools/serve.sh` → `localhost:8000/` loads with no console errors; a throwaway `lib/_smoke.html` renders a spinning cube via the import map; first commit pushed; Pages enabled on `main` root and placeholder visible at `<github-user>.github.io/benchtop/` (needs owner to create remote + enable Pages).

---

## 2. M1 — Runtime library (`lib/explainer.js`, `lib/kit.js`, `lib/explainer.css`)

Built in this order; each step is visible in the demo page before moving on.

### 2.1 Core skeleton
- `createExplainer(config)` validates config (throws readable error naming the bad key), builds DOM chrome, renderer, scene, loop.
- WebGL2 check → graceful fallback message (PRD §11).
- Sections in file: `// Store`, `// Tween`, `// Renderer & FX`, `// Quality`, `// Camera`, `// UI`, `// Labels`, `// Screens`, `// Input`, `// Sound`, `// URL`, `// Debug hooks`.

### 2.2 Store + model pipeline (pure, Node-testable)
- `store.set(patch)` → `model(state)` → notify subscribers once per frame (rAF-batched, not per input event).
- Subscribers: stats, narration, labels, screens, `update(refs, s, m, dt)`.
- Export pure helpers (`createStore`, `tweenState`, `encodeHash`, `decodeHash`, `pickTier`) so `tools/check.mjs` imports them without DOM.

### 2.3 Renderer + post-FX
- WebGL2, `ACESFilmicToneMapping`, sRGB output, `PCFSoftShadowMap`, PMREM from `RoomEnvironment`.
- Composer: Render → GTAO (high only) → UnrealBloom → SMAA (high/med) or FXAA (low) → custom vignette+grain `ShaderPass` → Output.
- DPR cap: high 2, med 1.5, low 1. Shadow map: high 2048, med/low 1024; low disables GTAO + bloom resolution halved.

### 2.4 Quality tiers
- Initial guess from `WEBGL_debug_renderer_info` + `navigator.hardwareConcurrency` + touch/narrow screen.
- Sample fps over first ~3 s; step down one tier if < 45 (desktop) / < 28 (mobile). Never step up automatically.
- Manual override in help overlay; persisted in `localStorage`.

### 2.5 Camera
- OrbitControls with clamped polar/azimuth/distance from config (`orbit: {minPolar, maxPolar, minDist, maxDist}` with sane defaults).
- `views` map; V cycles; tweened position+target (ease in-out, ~900 ms).
- Idle drift: after 8 s idle, slow azimuth sway; any input cancels. Off under `prefers-reduced-motion`.

### 2.6 UI chrome (`explainer.css` + DOM builders)
- Title block (kicker / title / hook), stat chips (mono numbers, unit, fixed decimals), narration (`aria-live="polite"`, supports `<b class="c-red">` style color tags matching scene colors).
- Control panel: "TRY" mode tabs with number badges, sliders (`<input type=range>` + live readout + key hints), toggle groups (radio buttons styled as segmented control), view button, help button, mute button.
- Help overlay: generated from declared keys; quality override; "How this works" collapsible with `assumptions` from config (PRD §11 correctness).
- Footer: share (Web Share API → fallback copy link), "Source: topics/<slug>.md" link, empty optional slot.
- Narrow screens (< 760 px): panel becomes bottom sheet (collapsed handle → expanded), title block shrinks, ≥ 44 px targets.
- Tokens on `:root`: palette per STYLE (dark warm neutral, `--accent: #7fd3ff`), 12 px radius, glass panel (`backdrop-filter: blur`).

### 2.7 Modes + tweens
- Keys 1..n; selecting mode tweens every numeric state key, snaps booleans/enums at tween midpoint, moves camera to mode's view, sets caption into narration header.
- Touching any control leaves mode state "custom" (tab de-highlighted), doesn't snap back.
- `prefers-reduced-motion` → snap instead of tween.

### 2.8 Labels
- CSS2DRenderer pills; `text(s, m)` re-evaluated on state change.
- Hide when behind camera / offscreen / occluded (raycast from camera to anchor against `occluders` list, throttled to ~5 Hz).
- Simple overlap avoidance: if two pills' rects intersect, lower-priority one fades.

### 2.9 Screens
- `screens: [{ mesh, size: [w,h], draw(ctx, s, m) }]` → CanvasTexture on mesh material `emissiveMap` + `map`; redraw only on state change.
- Kit helpers for charts: `kit.chart.line(ctx, xs, ys, opts)`, `kit.chart.bars`, `kit.chart.spectrum`, axis/grid in screen style.

### 2.10 Input
- Keyboard: 1–9 modes, V view, H/? help, M mute, declared slider keys (step ± with shift = ×10), toggle keys cycle. Ignore when focus in text input.
- Touch handled by OrbitControls + CSS; nothing custom beyond bottom sheet.

### 2.11 Sound (WebAudio, synthesized)
- Lazy `AudioContext` on first user gesture; muted by default until then; M toggles; persisted.
- Voices: tick (short filtered click), slider detent (pitch tied to value fraction, rate-limited), mode whoosh (noise sweep), ambient room tone (brown noise through lowpass + 55/110 Hz hum, very low gain). `sound.ambient` selects preset: `room | outdoor | machine | none`.

### 2.12 URL hash state
- `#mode=2&prism=12&view=exploded` — written debounced (300 ms) with `history.replaceState`; read on load before first model run. Only keys declared in `state`.

### 2.13 Kit (`lib/kit.js`)
Each returns `THREE.Object3D` (or mesh), shares a material cache, casts/receives shadows by default:
`roundedBox, bench/console, knob, sliderRail, screenBezel (returns {group, screenMesh}), plant, shelf, windowLight (rect area-ish via spot + emissive pane), floorTiles, room (walls+floor+window), plinth, terrainFromHeights(heights, w, h, scale), lowPolyBuilding, buildingsInstanced, tube(path), pipe, arrow, particles (instanced points with update fn), cable (catenary tube), label anchors (empty Object3D)`.
Also `kit.mat.{glass, metal, matte, emissive, plastic}(color)` presets.

### 2.14 Demo page `pendulum/`
- Exercises every feature: 2 sliders (length, gravity) + 1 toggle (damping), 3 modes, 3 views, 2 labels, 1 screen (θ(t) trace), sound, hash, assumptions.
- `pendulum/model.js` (small-angle period + RK4 integrator for large angle) + `pendulum/model.test.mjs` (T = 2π√(L/g) within 0.5% at 5°, energy conserved undamped).

**Done when:** `node tools/check.mjs && node pendulum/model.test.mjs` pass; pendulum page verified in Chrome at 1440×900 and 390×844: zero console errors/warnings, every mode × view screenshot looks right, keyboard shortcuts work, hash round-trips, sound toggles, fps ≥ 55 desktop.

---

## 3. M2 — Golden examples

| Page | Type | Topic file | Scene |
|---|---|---|---|
| `prism-room/` | Explainer | `topics/prism-room.md` | Optics console in sunlit room; triangular prism (N-SF11 via Sellmeier), white beam → 7-band fan; second prism toggle; diegetic deviation-vs-incidence curve + spectrum screen. Modes: Split / Least bend / Trapped (TIR) / Rejoin. Views: Lab / Exploded / Studio. |
| `river-delta/` (proposed; swap if owner prefers) | World | `topics/river-delta.md` | Tilted diorama on plinth; procedural terrain + river channel, sea level + discharge sliders, time-of-day toggle, hotspots as info pills. |

Each gets `model.js` + `model.test.mjs` + `meta.json` + `thumb.jpg`. Owner reviews screenshots; iterate until "happy with look". Everything learned → `STYLE.md` + `PATTERNS.md` drafts.

**Done when:** owner signs off on both.

---

## 4. M3 — Skill v1 (`.claude/skills/explain/`)

```
SKILL.md        # frontmatter (name: explain, description triggers on "/explain <file.md>") + procedure PRD §9.2
STYLE.md        # PRD §7.3 expanded with concrete tokens, scene grammar per type, writing voice (kicker ≤5 words, hook 2–3 sentences, narration ≤60 words with live numbers)
PATTERNS.md     # recipes from M2 (optics bench, terrain diorama) + domain mapping hints PRD §8
template.html   # skeleton: head (title/description/OG), import map, createExplainer config with every section stubbed + commented Model / Build / Update / Config
API.md          # exact createExplainer + kit reference (generated by hand from M1 code; skill reads this, not explainer.js)
examples/       # symlinks or copies: pendulum, prism-room, river-delta index.html + model.js
```

SKILL.md procedure (condensed):
1. Read md, parse optional frontmatter, classify type + domain, derive slug.
2. Write `<slug>/model.js` + `model.test.mjs`; run with Node; fix until pass.
3. Ask ≤3 questions only if model can't be pinned down.
4. Print short plan (title/kicker/hook, metaphor, controls, stats, modes, views, labels, screens).
5. Data/GIS: run bake step (M5).
6. Generate `<slug>/index.html` (+ `main.js` if > ~400 lines) from `template.html`.
7. Verify loop (M4).
8. Write `meta.json` (title, kicker, type, tags, created, sha256 of source md) + `thumb.jpg`.
9. Report path, screenshots, assumptions, known limits.
10. Chat iteration: edit, re-run verify.

**Done when:** `/explain topics/spectacles.md` (PRD §4.1, write this topic file as the acceptance input) produces a working page without hand edits beyond ≤3 chat tweaks.

---

## 5. M4 — Verify loop (Claude in Chrome)

- `tools/serve.sh` in background; open `http://localhost:8000/<slug>/` in new tab.
- Wait for `window.__bt.ready`; read console (errors + warnings); fail fast on any.
- For each mode × view: `__bt.setMode(i)`, `__bt.setView(v)`, wait tween end, screenshot. Repeat at mobile viewport (resize window 390×844).
- Checklist per shot (in SKILL.md): hero framed & not covered by panel, labels readable + not overlapping, text contrast, no NaN/Infinity in stats (also asserted programmatically via `__bt.stats`), fps from `__bt.fps`.
- Max 3 fix iterations, then report remaining issues.
- Thumb: canvas `toDataURL('image/jpeg', 0.85)` via `__bt.thumb()` at 1200×630 → saved through a tiny helper (`tools/save-thumb.py` reads base64 from stdin) — avoids depending on screenshot file export.

**Done when:** a deliberately broken page (typo in build, label overlapping panel) gets fixed by the skill without human help.

---

## 6. M5 — Data + GIS

- `tools/bake/` — stdlib-only scripts (Python `-I`, no deps): `heightmap.py` (DEM GeoTIFF/ASC → 16-bit PNG or JSON grid, downsampled), `geojson.py` (Douglas–Peucker simplify + project to local meters + quantize), `fetch_json.py` (fetch + reduce + record source/date).
- Runtime: `kit.terrainFromHeights`, `kit.lineFromCoords` (rivers/roads as tubes/ribbons), `kit.extrudeFromPolygons` (buildings/zones).
- Data page: `data.json` loaded via `fetch('./data.json')` before `createExplainer`; source + date in footer and `meta.json`.
- Acceptance pages: one Data page (e.g. AI benchmark "mountain") + one GIS World (real DEM tile, e.g. a valley/river).

**Done when:** both generated via `/explain` and verified.

---

## 7. M6 — Play type + sound polish

- Runtime additions only if a Play page needs them: pointer drag of scene objects (`draggables` config → raycast + plane drag), simple game-loop hook (`tick(refs, s, dt)` already covered by `update`).
- Sound: tune levels, add `machine`/`outdoor` ambient presets if not done in M1.
- Acceptance: one Play page via `/explain`.

---

## 8. Execution order & checkpoints

1. M0 scaffold + vendor → commit.
2. M1 runtime in order 2.1→2.14; checkpoint with owner after 2.6 (chrome look) using pendulum screenshots.
3. M2 prism-room → owner review → river-delta → owner review.
4. M3 skill files + spectacles acceptance run.
5. M4 verify automation (partly exercised already during M1–M3).
6. M5, M6.

Owner inputs needed (not blocking M0–M1):
- GitHub username + whether to create the remote now.
- Confirm World golden topic (river delta vs. something else).
- X profile link (or leave empty).

## 9. Out of scope (per PRD)
Gallery/`works.json`, view counter, GLTF, runtime API fetching, CI generation, i18n.
