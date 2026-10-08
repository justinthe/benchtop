# PRD — Markdown-to-Interactive-Explainer Generator

> Name: **benchtop** (repo `benchtop`, served at `<github-user>.github.io/benchtop/`)
> Owner: Justin · Status: Draft v1.1 · Date: 2026-10-08
> Reference: https://sael.net/ (Ryan Sael's interactive 3D explainers)

---

## 1. Summary

A personal tool that turns a **freeform markdown file** describing a concept into a **single, self-contained, interactive 3D HTML page** in the visual style of sael.net — stylized diorama, live numbers, sliders, guided steps, camera views — hostable as a static file on **GitHub Pages**.

The generator is a **Claude Code skill** (`/explain path/to/topic.md`). The skill reads the markdown, plans the scene and interactions, writes the page using a shared runtime library and style guide, opens it in Chrome, verifies it (screenshots + console), fixes problems, then hands it to the user for chat-based tweaks.

v1 = individual explainer pages only. Gallery/home page = v2.

---

## 2. Reference analysis (sael.net)

Observed on 2026-10-08:

**Site level**
- Static site. Catalog in `works.json`; each work lives at `/<slug>/` with `also.jpg` + `also.webm` thumbnails.
- Gallery: dark grid of cards, title + view count, hover plays video. Sidebar categories (Explainers 30, Worlds 10, Data 7, Design 2, Play 2, Virtual Tour 1). Tag chips (physics, diorama, cars, city, light, live data, optics, tokens, water, ai, benchmarks, biology, cost, flight). Sort: Newest / Most viewed. Global sound toggle.
- Shared runtime: `lib/three-0.183.2.js` (self-hosted Three.js), `sael.js`, `lib/fonts.css`. Single WebGL2 canvas per page.

**Explainer page anatomy (e.g. Prism Room)**
1. **Full-bleed 3D scene** — stylized room/diorama, warm practical lighting, bloom, soft shadows, props for atmosphere (plants, shelves, window light).
2. **Title block, top-left** — small uppercase kicker ("WHERE WHITE LIGHT SPLITS") + big display title ("PRISM ROOM") + 2–3 sentence hook.
3. **Stat chips** — 3 live values (INCIDENCE 72.0°, DEVIATION 68.3°, SPREAD 8.4°), monospace numbers.
4. **Narration box** — one paragraph that rewrites itself with current values, color-coded to scene elements.
5. **Control panel, top-right** — "TRY" mode tabs (Split / Least bend / Trapped / Rejoin) numbered 1–4 as keyboard shortcuts; sliders with live readouts; toggle groups (Second prism: Waiting/In; View: Lab/Exploded/Studio); camera + help buttons. Shortcut hints shown inline (`[ ]`, `P`, `V`).
6. **In-scene labels** — small pill tags anchored to 3D objects ("Light 42°", "Screen 32 nm of colour").
7. **Diegetic screens** — charts rendered onto the 3D device's displays (curve plot, spectrum), plus physical knobs/sliders that mirror UI controls.
8. **Footer bar, bottom-right** — view count, share, email/subscribe, "Follow on X".
9. Physics/model is **real** (actual refractive index, Snell's law), not decorative.

---

## 3. Goals / Non-goals

**Goals**
- G1. One command from markdown to a polished, working, interactive page.
- G2. Visual quality close to sael.net using **procedural geometry + post-processing only** (no external models).
- G3. Correct underlying model: numbers shown are computed, not faked.
- G4. Output is static, self-contained, deployable to GitHub Pages with zero build step.
- G5. Works on desktop and mobile/touch.
- G6. Covers four page types: Explainer, World, Data, Play/Design.
- G7. Works across domains: science/engineering, software/systems, GIS/geospatial, business/process.

**Non-goals (v1)**
- Gallery/home page, tag filters, hover thumbnails, view counts (→ v2).
- Multi-user, accounts, web UI, hosting backend.
- GLTF / AI-generated 3D models.
- Live client-side API fetching (data baked at build time).
- Automatic CI generation (GitHub Action).

---

## 4. User & workflow

Single user (owner). Writes markdown, runs Claude Code.

```
1. Write  topics/prism.md            (freeform prose)
2. Run    /explain topics/prism.md
3. Skill  → interprets → plans → asks ≤3 clarifying questions only if ambiguous
          → generates site/prism-room/index.html
          → opens in Chrome, screenshots each mode/view, reads console
          → self-fixes (max N loops) → reports summary + screenshots
4. User   chat tweaks: "make the beam thicker", "add a 5th mode for total reflection"
5. User   git push → GitHub Pages serves /prism-room/
```

### 4.1 Worked example: spectacles
```
topics/spectacles.md        "How spectacles work" — prose, any style
        │  /explain topics/spectacles.md
        ▼
spectacles/index.html       same chrome as prism-room (title top-left, panel top-right,
spectacles/meta.json        stat chips, narration, modes 1–4, views V); new scene:
spectacles/thumb.jpg        eye model + lens on optics console, rays to retina
lib/…                       shared, reused by every page
```
Likely result: controls = eye length (myopia ↔ hyperopia), lens power (diopters); stats = focal point, blur size, correction needed; modes = Normal eye / Myopia / Corrected with concave lens / Hyperopia + convex; diegetic screen = retina image sharp vs blurred. Gallery (v2) later reads every `<slug>/meta.json` + `thumb.jpg` automatically.

---

## 5. Input spec

**Pure freeform markdown.** No required frontmatter or sections. The skill infers everything.

Example:
```markdown
# Why white light splits in a prism

Glass slows violet more than red. Snell's law... (any length, any style)
I want people to rotate the prism and see the fan open and close.
Show the minimum deviation angle. Maybe a second prism recombining it.
```

The skill must extract:
| Extracted item | Example |
|---|---|
| Page type | Explainer / World / Data / Play |
| Core concept + hook line | "White light looks simple until..." |
| Governing model / equations / data | Snell's law, Sellmeier for N-SF11 |
| Variables → controls | prism angle, light angle |
| Outputs → stat chips | incidence, deviation, spread |
| Story beats → guided modes (2–5) | Split, Least bend, Trapped, Rejoin |
| Scene metaphor + setting | optics lab bench in a sunlit room |
| Camera views | Lab / Exploded / Studio |
| Data to bake (Data pages) | fetched once, embedded as JSON |

Optional (not required, but honored if present): YAML frontmatter overriding `title`, `slug`, `type`, `tags`, `palette`. Inline hints like "use a river delta" are honored.

If the markdown is too vague to build a correct model, the skill asks up to 3 targeted questions before generating.

---

## 6. Output spec

### 6.1 Repo layout
```
benchtop/                      # GitHub Pages repo root
  lib/
    three.module.min.js        # pinned Three.js (self-hosted, no CDN dependency)
    addons/                    # EffectComposer, UnrealBloomPass, OutputPass, OrbitControls, RoomEnvironment, CSS2DRenderer
    explainer.js               # shared runtime (see §7)
    explainer.css              # shared UI styles + tokens
    fonts/                     # self-hosted fonts
    sfx/                       # optional CC0 samples; default sound is WebAudio-synthesized
  topics/                      # source markdown, public, committed
  <slug>/
    index.html                 # the page (scene code inline or in main.js)
    main.js                    # optional, if page code is large
    data.json                  # baked data (Data pages)
    meta.json                  # title, kicker, type, tags, created, source md hash (feeds v2 gallery)
    thumb.jpg                  # screenshot captured during verify (feeds v2 gallery)
```

### 6.2 Page requirements
- Loads via ES modules + import map pointing at `../lib/`. No bundler, no build step.
- Opens directly from GitHub Pages; works from `python -m http.server` locally.
- First meaningful frame < 2.5 s on mid laptop; page weight target < 1.5 MB excluding shared lib.
- 60 fps desktop, ≥30 fps mid-range phone (via quality tiers).
- No console errors or warnings in verify run.
- `<title>`, description meta, OG tags (title/description/thumb) present for future sharing.

---

## 7. Shared runtime library (`lib/explainer.js`)

Built once by hand (with Claude), reused by every page. Pages only write the **scene + model + config**; the runtime provides chrome and plumbing. This is the key to consistent quality and short per-page code.

### 7.1 API sketch
```js
import { createExplainer } from '../lib/explainer.js';

createExplainer({
  kicker: 'Where white light splits',
  title: 'Prism Room',
  hook: 'White light looks simple until...',
  type: 'explainer',                     // explainer | world | data | play
  state: { prism: 0, light: 42, second: false },
  model: (s) => ({ incidence: ..., deviation: ..., spread: ... }),   // pure function
  stats: [ { key: 'incidence', label: 'Incidence', unit: '°', fmt: 1 }, ... ],
  narrate: (s, m) => `N-SF11 slows violet more than red ... ${m.spread.toFixed(1)}°`,
  controls: [
    { type: 'slider', key: 'prism', label: 'Prism', min: -30, max: 30, keys: ['[', ']'] },
    { type: 'toggle', key: 'second', label: 'Second prism', options: ['Waiting','In'], keys: ['P'] },
  ],
  modes: [   // guided tour, keys 1..n
    { name: 'Split', state: {...}, camera: 'lab', caption: '...' },
    { name: 'Least bend', state: {...}, camera: 'lab', caption: '...' },
  ],
  views: { lab: {pos, target}, exploded: {...}, studio: {...} },  // key V cycles
  labels: [ { anchor: obj3D, text: (s,m) => `Light ${s.light}°` } ],
  screens: [ { mesh: displayMesh, draw: (ctx, s, m) => {...} } ],  // diegetic canvas-texture charts
  sound: { ambient: 'room', ui: true },
  build: (scene, kit) => { /* procedural geometry; returns refs */ },
  update: (refs, s, m, dt) => { /* animate scene from state */ },
});
```

### 7.2 Runtime responsibilities
| Area | Requirement |
|---|---|
| Renderer | WebGL2, ACES tone mapping, sRGB, soft shadows (PCFSoft), PMREM env from `RoomEnvironment`, DPR cap by tier |
| Post-FX | Bloom (UnrealBloom), SMAA/FXAA, optional SSAO/GTAO on high tier, vignette, subtle grain |
| Quality tiers | auto-detect (GPU + fps sampling) → high / medium / low; manual override in help menu |
| Camera | OrbitControls with clamped angles, smooth tweened transitions between views, idle slow drift |
| UI chrome | title block, stat chips, narration box, control panel, mode tabs, toggle groups, help overlay, footer bar |
| Labels | CSS2D pills anchored to 3D objects, auto-hide when occluded/offscreen |
| Screens | canvas-texture displays on 3D meshes, redrawn on state change |
| State | single reactive store; any change → recompute `model` → update stats, narration, labels, screens, scene |
| Tweens | all state jumps (mode switch) tween numerically, not snap |
| Keyboard | 1–9 modes, V view cycle, declared slider/toggle keys, H/? help, M mute |
| Touch | tap/drag orbit, pinch zoom, bottom-sheet control panel on narrow screens, ≥44 px targets |
| Sound | WebAudio; ambient loop + UI ticks; muted by default until first interaction; M toggles; remembers via localStorage |
| URL state | state encoded in hash (`#mode=2&prism=12`) so views are linkable |
| Footer | share (Web Share API / copy link), link to X profile, optional view-count slot (v2) |
| Accessibility | controls are real `<input>`/`<button>`, labelled; `prefers-reduced-motion` disables drift/tweens; narration in an `aria-live` region |
| Kit helpers | procedural builders: rounded box, bench/console, knob, slider rail, screen bezel, low-poly plant, shelf, window light, floor tiles, terrain from heightmap, low-poly buildings, pipes/tubes, arrows, particles, cables |

### 7.3 Style guide (`STYLE.md`, read by skill)
- Palette: dark warm-neutral room, cool cyan UI accent (`#7fd3ff`-ish), warm practical lights; domain colors (e.g. spectrum) only on subject matter.
- Typography: condensed display for titles, clean sans for body, monospace for numbers.
- Panels: translucent dark glass, 12 px radius, subtle border, compact.
- Scene grammar: "object on a lab console in a room" for Explainers; "tilted diorama on a plinth" for Worlds; "physical model + data screens" for Data; "toy box" for Play.
- Every page has: hero object, supporting props, one diegetic screen minimum (Explainer/Data), 3 camera views.

---

## 8. Page types

| Type | Scene | Interaction | Typical domains |
|---|---|---|---|
| **Explainer** | Lab console + subject apparatus | Sliders drive real model; 2–5 guided modes; diegetic charts | physics, engineering, biology, software internals (e.g. "what happens when you send a prompt") |
| **World** | Explorable diorama (city, river, campus, room) | Orbit, hotspots with info pills, time-of-day / scenario toggles | GIS, urban, architecture, process maps |
| **Data** | Physical metaphor driven by baked dataset (globe, bars as buildings, mountain of benchmarks) | Scrub time, filter, hover values | business metrics, GIS layers, AI benchmarks, cost |
| **Play / Design** | Toy or design object | Direct manipulation, small game loop or configurator | anything playful |

Domain mapping hints the skill uses:
- Software/systems → physical metaphors (data center floor, pipes = network, packets = particles, building floors = layers).
- GIS → terrain from DEM/heightmap baked to PNG/JSON, river/road meshes from GeoJSON simplified at build time.
- Business/process → factory line / conveyor / city metaphor; flows as particles; KPIs as stat chips.

---

## 9. The Claude Code skill (`/explain`)

### 9.1 Location
`~/.claude/skills/explain/` (or repo `.claude/skills/explain/`):
```
SKILL.md          # procedure (below)
STYLE.md          # visual + writing style guide
PATTERNS.md       # proven scene recipes per type/domain, grows over time
template.html     # page skeleton using lib/explainer.js
examples/         # 2–3 reference pages (golden examples) the skill imitates
```

### 9.2 Procedure
1. **Read** markdown. Classify type + domain.
2. **Model first**: write the governing equations / data model as pure JS; sanity-check numbers (unit test-style asserts in a scratch script run with Node).
3. **Clarify** (only if needed): ≤3 questions.
4. **Plan** (shown briefly to user): title/kicker/hook, scene metaphor, controls, stats, modes, views, labels, screens.
5. **Bake data** (Data/GIS pages): fetch sources, reduce, save `data.json`; record source + date in `meta.json` and footer.
6. **Generate** `<slug>/index.html` (+ `main.js` if large) from template.
7. **Verify loop** (Claude in Chrome):
   - serve locally, open page, wait for render
   - read console → fix errors
   - screenshot each mode × each view, desktop + mobile viewport
   - check: hero object framed, labels not overlapping, panel not covering hero, text readable, fps reasonable
   - max 3 fix iterations, then report remaining issues
8. **Capture** `thumb.jpg` (best screenshot) and write `meta.json`.
9. **Report**: path, screenshots, model assumptions, known limits.
10. **Iterate** on user chat requests; re-run verify after each change.

### 9.3 Learning loop
When a page turns out well, its scene recipe is appended to `PATTERNS.md` so later pages reuse it.

---

## 10. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | `/explain <file.md>` produces `<slug>/index.html` that runs with no errors | P0 |
| F2 | Freeform markdown accepted; no required structure | P0 |
| F3 | Model values computed from real equations/data; shown in stats + narration | P0 |
| F4 | Title block, stat chips, narration, control panel, footer per §2 anatomy | P0 |
| F5 | Procedural 3D scene with post-FX meeting style guide | P0 |
| F6 | Guided modes (2–5) with tweened state + camera transitions, keys 1–n | P0 |
| F7 | ≥3 camera views, V cycles | P0 |
| F8 | In-scene anchored labels | P0 |
| F9 | Diegetic screen charts (Explainer/Data) | P1 |
| F10 | Mobile/touch layout + quality tiers | P0 |
| F11 | Sound (ambient + UI), muted until interaction, M toggle | P1 |
| F12 | Help overlay listing shortcuts | P1 |
| F13 | URL hash state | P2 |
| F14 | Automated Chrome verify + self-fix loop | P0 |
| F15 | Data baked to `data.json` with source attribution | P0 (Data pages) |
| F16 | `meta.json` + `thumb.jpg` written per page | P1 (feeds v2) |
| F17 | Chat-based iteration on an existing page | P0 |
| F18 | Honors optional frontmatter / inline hints | P2 |

---

## 11. Non-functional requirements
- **Static only**: no server code; GitHub Pages compatible; relative paths only (works under `/<repo>/` subpath).
- **No CDN at runtime**: Three.js + addons + fonts self-hosted in `lib/` (pinned version).
- **Performance**: see §6.2. Shadow map ≤2048 high tier, ≤1024 low; geometry merged/instanced where repeated.
- **Browser support**: latest Chrome, Firefox, Safari (desktop + iOS), Android Chrome. WebGL2 required; show graceful fallback message otherwise.
- **Maintainability**: page code readable, sections commented (Model / Build / Update / Config).
- **Correctness**: model assumptions listed in a collapsible "How this works" section on the page.

---

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Repo + GitHub Pages setup, pinned Three.js in `lib/` | blank page deploys |
| M1 | `lib/explainer.js` + `explainer.css` runtime | hand-written demo page (e.g. pendulum) exercises every runtime feature on desktop + phone |
| M2 | Golden examples: hand-polish 2 pages (one Explainer, one World) to sael.net quality | owner happy with look |
| M3 | Skill v1: `SKILL.md`, `STYLE.md`, `template.html`, `PATTERNS.md` | `/explain` produces working Explainer from freeform md |
| M4 | Verify loop with Claude in Chrome | skill self-fixes console errors + layout issues |
| M5 | Data + GIS support (baking, terrain, GeoJSON) | one Data page + one GIS World page generated |
| M6 | Play type + sound polish | one Play page generated |
| v2 | Gallery: `works.json` from `meta.json`, grid, categories, tags, hover video (webm capture), sort | — |

---

## 13. Success metrics
- ≥80% of generated pages need ≤3 chat tweaks to be "publishable" (owner judgment).
- 0 console errors on published pages.
- Mobile Lighthouse performance ≥70 on a typical page.
- Time from markdown to publishable page ≤30 min.

---

## 14. Risks & mitigations
| Risk | Mitigation |
|---|---|
| LLM output inconsistent / ugly | Strong runtime lib + style guide + golden examples; page code limited to scene/model |
| sael.net-level fidelity hard procedurally | Invest in `kit` helpers + post-FX; grow `PATTERNS.md`; accept "close to" not identical |
| Wrong physics/math | Model-first step with Node asserts; assumptions shown on page |
| Mobile perf | Quality tiers, DPR cap, disable SSAO/shadows on low |
| Pure freeform too vague | ≤3 clarifying questions before generating |
| Three.js API drift | Pin version in `lib/`; skill references that version |
| Page code too large for one shot | Split into `main.js`; runtime absorbs boilerplate |

---

## 15. Decisions (resolved open questions)

| # | Topic | Decision |
|---|---|---|
| 1 | Repo / URL | `benchtop`, public GitHub repo, GitHub Pages from `main` root → `<github-user>.github.io/benchtop/<slug>/`. Relative paths only so it also works on a custom domain later. |
| 2 | Branding | None for v1. Footer shows only share + optional link slot (empty by default). |
| 3 | `topics/` | Public, committed alongside pages. Each page footer links "Source: topics/<slug>.md". |
| 4 | Fonts | All SIL Open Font License (free to self-host, commercial OK), files in `lib/fonts/`, woff2 only, latin subset: **Barlow Condensed** 600/700 (display titles, kickers), **Inter** 400/600 (body, UI), **JetBrains Mono** 400/500 (numbers, stat chips, labels). Include `OFL.txt`. |
| 5 | Sound | Synthesized at runtime with WebAudio (no audio files → no licensing, ~0 KB): UI tick/click, slider detent, mode whoosh, soft ambient room tone (filtered noise + low hum). Optional upgrade: CC0 samples from Kenney.nl, stored in `lib/sfx/` with `CREDITS.md`. |
| 6 | Language | English only. No i18n plumbing. |
| 7 | View counter | Deferred to v2 with the gallery. Footer keeps an empty slot. |

## 16. Open questions
None blocking. Revisit at v2: gallery design, view counter provider, custom domain.
