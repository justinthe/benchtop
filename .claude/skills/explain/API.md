# Runtime API (lib/explainer.js, lib/kit.js, lib/pure.js)

Three.js r0.186.1 is vendored in `lib/`. Pages import via the import map in `template.html`. Everything below is what the
runtime actually does today; if you need something not listed, see "Runtime gaps" in SKILL.md.

```js
import { createExplainer } from '../lib/explainer.js';
import { wavelengthToRGB, clamp, lerp } from '../lib/pure.js';   // optional helpers
import { model } from './model.js';                              // pure model
```

## createExplainer(config) -> `__bt`

Throws a readable error for a missing or mistyped required key. Required: `title`, `kicker`, `state`, `model`, `narrate`,
`build`, `views` (>= 1; each `{ label, pos:[x,y,z], target:[x,y,z] }`). A `mode.camera` must name a view.

| Key | Type | Notes |
|---|---|---|
| `slug` | string | Footer "Source" link to `../topics/<slug>.md`; also the thumbnail endpoint name. |
| `kicker`, `title`, `hook` | string | Kicker <= 5 words; title <= 3 words; hook 2 short sentences. |
| `type` | string | `explainer | world | data | play` (informational). |
| `state` | object | Initial state. Number values tween between modes; booleans and strings snap at the midpoint. Keys are also the URL-hash keys. |
| `model` | `(state) => object` | **Pure.** Called whenever state changes. Return every number the page shows. |
| `stats` | `[{ key, label, unit, fmt }]` | Exactly 3. `key` indexes the model result. `fmt` = decimals (default 1). Non-finite shows an em dash. `unit` is appended raw (include a leading space if wanted). |
| `narrate` | `(state, model) => html` | One paragraph, rewrites itself. May use `<b class="c-a">` with classes `c-a` cyan, `c-b` amber, `c-c` rose, `c-d` green. Throttled ~120 ms. Trusted HTML only. |
| `controls` | array | See below. |
| `modes` | `[{ name, state, camera, caption }]` | 2 to 5. Keys 1 to n. `state` is a **partial** state applied with a ~1.1 s tween; `camera` is a view name; `caption` shows above the narration. Touching any control clears the active mode. |
| `views` | object | Name -> `{ label, pos, target }`. First is the default; **V** cycles in declaration order. |
| `labels` | array | See below. Keep to 5 or fewer. |
| `screens` | array | See below. |
| `sound` | `{ ambient: 'room'|'outdoor'|'machine'|'none', ui: bool }` | Synthesized WebAudio. Muted state persists. |
| `assumptions` | html string | Shown in the help overlay under "How this works". Always supply it. |
| `occluders` | `(refs) => Mesh[]` | Meshes that hide labels behind them (raycast, ~5 Hz). Optional. |
| `onTier` | `(refs, tier) => void` | Called after every quality-tier change (`high | med | low`). Swap expensive materials here. |
| `build` | `(scene, kit) => refs` | Create geometry and lights. `kit` is every export of `lib/kit.js` plus `kit.THREE`. Return an object of references you need later (also passed to labels, screens, update, occluders, onTier). |
| `update` | `(refs, state, model, dt, t) => void` | Every frame. `dt` seconds (<= 0.1), `t` seconds since start. Animate the scene from state/model here. Do not allocate per frame. |
| `fov` | number | Default 40. |
| `bloom`, `bloomThreshold` | number | Defaults 0.35 and 1.0. Threshold is on linear HDR; raise it if bright metal glares. |
| `environmentIntensity` | number | Default 0.3 (IBL from RoomEnvironment). |
| `exposure` | number | Default 1. |
| `background`, `fog` | hex, bool | Default 0x14110f; `fog:false` disables. |
| `orbit` | `{ minPolar, maxPolar, minDist, maxDist }` | Defaults 0.12, 0.495 pi, 1, 14. |

### controls
```js
{ type: 'slider', key, label, min, max, step, unit, fmt, keys: ['[', ']'] }       // keys = [decrease, increase], Shift = x5
{ type: 'toggle', key, label, options: ['Off', 'On'], values?: [false, true], keys: ['D'] }   // key cycles
```
A toggle's `values` default to `[false, true]` when the state value is boolean, else to `options`. **There is no dropdown
or select control** and no more than about 3 toggle options fit. Slider keys must be single characters not already used
(1 to 9, V, H, ?, M are reserved).

### labels
```js
{ anchor: (refs) => Object3D | Object3D, text: (s, m) => html, show?: (s, m) => bool,
  info?: (s, m) => html, priority?: number }
```
`anchor` is an Object3D (use `kit.anchor()`); move it in `update` or when the model changes. `show` hides the label entirely
when false. `info` makes the pill clickable and opens a popover (one open at a time). Higher `priority` wins when pills
overlap on screen. Pills hide when behind the camera, off-screen, occluded, or overlapped by a higher-priority pill.

### screens (diegetic canvas displays)
```js
{ mesh: (refs) => Mesh | Mesh, size: [w, h], live?: bool, draw: (ctx, state, model, refs, w, h) => void }
```
The runtime replaces `mesh.material` with a `MeshBasicMaterial` carrying the canvas texture. Redraws on state change; with
`live: true` also every frame (use only for traces and animation; keep draw cheap). Put `kit` in `refs` if `draw` needs
`kit.chart`. Use font sizes >= 17 px on a 640 px canvas so text stays legible in 3D. Size canvases about 2x the on-screen size.

## Runtime features you get for free
Title block, 3 stat chips, narration, mode tabs, sliders, toggles, V view button, help overlay, mute, share, footer source link,
bottom-sheet controls on phones (narration moves into the sheet), orbit controls with idle drift, URL hash state (state keys +
`mode` + `view`, debounced, `history.replaceState`), keyboard (1 to 9, V, M, H or ?, declared control keys), WebGL2 fallback
message, quality tiers (auto step-down on low fps; override in help), post-FX (GTAO high tier, bloom, AA, vignette, grain, ACES),
`prefers-reduced-motion` support.

## `window.__bt` (verification handle)
| Member | Meaning |
|---|---|
| `ready` | true after 3 frames have rendered. |
| `advance(n=1, dt=1/30)` | Step n frames synchronously. **Required for verification**: background tabs throttle rAF. Returns `{ ready, frames }`. |
| `stats()` | Flushes state to the DOM and returns the 3 chip strings. |
| `setModeInstant(n)` / `setMode(n)` | 1-based mode; instant vs tweened. |
| `setView(name, instant=true)` | Move the camera. |
| `set(patch)` | Set state keys (clears active mode). |
| `state`, `model`, `mode`, `view`, `tier`, `fps`, `settled` | Read-only. `settled` = no tween running. |
| `setTier(t)` | `high | med | low`. |
| `thumb(w=1200, h=630)` | Returns a JPEG data URL (renders at that size, then restores). |
| `saveThumb(w, h)` | POSTs the thumbnail to `tools/serve.py`, which writes `<slug>/thumb.jpg`. Resolves to HTTP status (204 = ok). |
| `refs`, `scene`, `camera` | For inspection (for example, world positions of meshes). |

## kit (lib/kit.js): all return Object3D unless noted; meshes cast and receive shadows by default
**Materials** `kit.mat.{matte(c,rough), plastic(c,rough), metal(c,rough), glass(c,opacity), emissive(c,intensity)}` (cached per
args; do not mutate a shared material, create your own instead).
**Primitives** `roundedBox(w,h,d,r,mat)`, `anchor(x,y,z)`, `shadowy(obj,cast,receive)`, `mulberry(seed)` (seeded RNG).
**Furniture and props**
- `bench({w,d,h,color,legColor})` table, top surface at y = h (`group.userData.topY`).
- `room({w,d,h,wall,floorA,floorB})` floor + back wall (z = -d/2) + left wall (x = -w/2), open front/right.
- `windowLight({w,h,color,intensity,from})` returns `{ group, light }`; the directional light casts shadows. Place the group on the back wall facing +z.
- `shelf({w,h,d,boards,color})`, `plant({h,leaves,potColor,leafColor})`, `floorTiles(size,tiles,a,b)`, `plinth(r,h,color)`.
- `knob(r,h,color)` rotate `.rotation.y`; `sliderRail(len,color)` with `.setValue(0..1)`.
- `screenBezel(w,h,{depth,border,color})` returns `{ group, screen }`; screen plane faces +z. Give `screen` to a `screens[].mesh`.
**Terrain and city** `noiseHeights(w,h,{scale,octaves,seed,falloff})` -> Float32Array; `terrainFromHeights(heights,w,h,{size,height,colorFn})` -> Mesh;
`lowPolyBuilding(w,h,d,color)`; `buildingsInstanced([{x,z,w,d,h,y?}], color)` -> one InstancedMesh.
**Lines and flow** `tube(points,r,mat,segments)`, `pipe(points,r,mat)`, `cable(a,b,sag,r,mat)`, `arrow(dir,len,color,r)` (`.setLength(l)`),
`particles(count,{size,color,step})` (call `.update(dt)`; `step(i,p,dt)` mutates the Vector3 `p`),
`beam(color,width,{boost})` (`.setPath(points)` with `[x,y,z]` or Vector3 arrays; `.setOpacity(o)`; additive and emissive; set
`renderOrder` on the group so it draws after glass).
**2D chart helpers (for screens)** `kit.chart.{clear(ctx,w,h,bg), text(ctx,str,x,y,{size,color,align,font}), grid(ctx,rect,nx,ny),
line(ctx,rect,xs,ys,{x:[lo,hi],y:[lo,hi]},{color,width}), bars(ctx,rect,values,max,{color,gap}), spectrum(ctx,rect,from,to)}`.
`rect` is `{x,y,w,h}` in canvas pixels.

## pure.js (DOM-free, unit-tested in tools/check.mjs)
`clamp`, `lerp`, `ease`, `createStore`, `tweenState`, `encodeHash`, `decodeHash`, `pickTier`, `tierDown`, `TIERS`, `wavelengthToRGB(nm)`.

## File conventions
```
<slug>/index.html        page (head + one module script; or + main.js when > ~400 lines)
<slug>/model.js          pure model, no DOM, no three
<slug>/model.test.mjs    node:assert tests (run by tools/test.sh)
<slug>/meta.json         tools/meta.mjs
<slug>/thumb.jpg         __bt.saveThumb()
<slug>/data.json         baked data (data/world pages)
topics/<slug>.md         the source topic
```
All asset paths are relative so the site works under `/<repo>/` on GitHub Pages. Pages sit one folder below the repo root
(`../lib/...`).

## Not available yet
Dropdown or select control; more than ~3 toggle options; free pointer-drag of scene objects (Play type); video or GIF
capture; baked-data helpers (arrive with the Data/GIS milestone); per-label custom positioning in screen space.
