---
name: explain
description: Turn a freeform markdown topic into an interactive 3D explainer page in this repo (benchtop). Use when the user runs /explain <path/to/topic.md>, asks to "make an explainer", "build a page for topics/x.md", or asks to change, fix, or add a mode to an existing page under a <slug>/ folder.
argument-hint: <topics/some-topic.md> | <slug> <change request>
---

# /explain: markdown to interactive explainer

You generate **one static page** at `<slug>/index.html` from a markdown topic, using the shared runtime in `lib/`.
The runtime owns the chrome (title, stat chips, narration, controls, labels, camera, sound, hash, quality tiers).
**Your page only supplies: model, scene, config.** Never copy runtime code into a page and never edit `lib/` to suit
one page unless a gap is real (see "Runtime gaps").

Read these before writing anything, in this order, and only these (they are short):
1. `.claude/skills/explain/API.md`: the exact `createExplainer` config and kit helpers. **Trust it over memory.**
2. `.claude/skills/explain/STYLE.md`: look, writing voice, layout rules.
3. `.claude/skills/explain/PATTERNS.md`: proven scene recipes and the pitfalls list.
4. One golden example closest to the topic (`.claude/skills/explain/examples.md` lists them): `pendulum/index.html` (mechanics), `prism-room/index.html` (optics, richest).
   Also read that example's `model.js` and `model.test.mjs`; they show the model-first shape.

`/explain` with a **topic path** = create. `/explain <slug> <request>` (or any follow-up chat tweak) = iterate (last section).

## Create procedure

### 1. Read and classify
- Read the topic. Parse optional YAML frontmatter (`title`, `slug`, `type`, `tags`, `palette`); it overrides what you infer.
- Pick **type**: `explainer` (apparatus + real model), `world` (explorable diorama), `data` (baked dataset as a physical
  metaphor), `play` (toy). Pick domain. Slug = frontmatter slug, else kebab-case of the title (`^[a-z0-9-]+$`).
- Extract: the core concept and hook, the **governing model** (equations or data, with sources), variables to controls,
  outputs to stat chips (exactly 3), story beats to guided modes (2 to 5), scene metaphor, 3 camera views, data to bake.
- If the topic gives numbers (a data table, worked examples, expected results), those are **requirements**: use exactly
  those values and turn the worked examples into asserts. Never substitute other data silently.
- Slug collision: if `<slug>/` exists, you are iterating, not creating. Do not overwrite; go to "Iterate".

### 2. Clarify (only if blocked)
Ask **at most 3** questions with AskUserQuestion, and only when the model cannot be pinned down (ambiguous physics,
missing data source, two valid scopes). Offer a recommended default. Do not ask about taste; decide and note it.
If the topic is too broad for one page, build the first slice it names and say what you left out.

### 3. Model first (before any scene code)
- Write `<slug>/model.js`: **pure ES module, no DOM, no three import**. Exports `model(state)` returning every number the
  page shows, plus any constants or helper functions the tests need. All numbers on screen come from here.
- Write `<slug>/model.test.mjs` with plain `node:assert` (no framework): reference values from the topic or from textbook
  values you can state, closed-form cross-checks of any simulation, invariants (conservation, monotonicity, symmetry),
  a finite-output sweep across every slider range, and each mode's state. Anchor on numbers a reader could check.
- Run `node <slug>/model.test.mjs` until it passes. A failing assert means fix the **model**, never the assert (unless the
  assert's reference value is wrong; then say so in the report).
- Hard rules: finite output for all slider extremes; no mutation of the input state; units named in a comment.

### 4. Plan (show briefly, do not wait for approval)
Print a short plan: kicker / title / hook, scene metaphor and hero object, controls (key, range, unit, keys), 3 stats, modes
(name, state, view), 3 views, labels, screens, what is simplified. Then continue.

### 5. Bake data (data and GIS pages only)
Fetch once at build time, reduce, write `<slug>/data.json`, record source and date for the footer and `meta.json`.
(Baking tools arrive in a later milestone; until then do this inline and keep `data.json` small, < 300 KB.)

### 6. Generate the page
- `mkdir <slug>`, then copy `.claude/skills/explain/template.html` to `<slug>/index.html`. Your real `model.js` and
  `model.test.mjs` from step 3 already exist; `template.model.js` / `template.model.test.mjs` only show the shape.
  Replace every `REPLACE` marker and the Cube Lab sample content. Keep the head (title, description, OG, import map,
  stylesheet) and edit values.
- Section order inside the module: `Config` then `Build` then `Update`, with screen draw functions at the bottom.
- Split into `<slug>/main.js` only if the page passes about 400 lines.
- Respect API.md limits: sliders and 2 to 3 option toggles only (no dropdown yet), labels at most 5, one screen at least
  for explainers.
- Write the topic's source link by setting `slug` in the config (footer links `../topics/<slug>.md`).

### 7. Verify (mandatory, see `VERIFY.md`)
Run `tools/test.sh`, then the verify loop in `.claude/skills/explain/VERIFY.md` (Chrome extension, or `tools/verify.mjs` when it is not connected). **Max 3 fix iterations**, then report
what remains. A page that was not opened in Chrome is not finished.

### 8. Capture
- Thumbnail: `node tools/verify.mjs <slug> --thumb` (mode 1, default view), or `__bt.saveThumb()` from the best mode and view in the extension.
- `node tools/meta.mjs <slug> "<Title>" "<Kicker>" <type> <tag,tag>` writes `meta.json` (hashes the topic).

### 9. Report (short)
Path and local URL, the plan as built, **model assumptions and simplifications**, test results, screenshots reviewed (modes
by views, desktop and phone), anything unresolved, and anything you changed in `lib/`. Do not commit or push unless asked.

### 10. Learn
If the page introduced a scene recipe that worked, append it to `PATTERNS.md` (recipe, numbers, pitfalls). If you hit a
trap, add it to the pitfalls list. Keep entries short and concrete.

## Iterate (chat tweaks to an existing page)
Read the page, its `model.js`, and its tests first. Make the smallest edit that does the job. Model change: update the tests
in the same edit and re-run them. New mode: add to `modes` and test its state. After **every** change re-run `tools/test.sh`
and the Chrome loop on the affected mode and view, desktop plus phone width if layout moved. Keep `meta.json` current
(`tools/meta.mjs` re-run keeps the original `created` date).

## Runtime gaps
If the topic needs something the runtime lacks (a dropdown control, a new input type, a new camera behaviour):
1. Say so and propose the smallest addition to `lib/`.
2. Add it to the runtime (not the page), with a case in `tools/check.mjs` if it has pure logic.
3. Document it in `API.md` and re-run `tools/test.sh` plus both golden pages in Chrome (regression).
Never fork the runtime into a page.

## Hard rules
- Static only, relative paths only, no CDN, no build step, no new dependency.
- Zero console errors **and warnings** in the verify run.
- Do not fake physics: stats, narration, labels, screens and the 3D scene must all read the same result object.
- No emoji or lorem ipsum. Narration is plain English with live numbers.
- Do not commit, push, or publish unless the user asks.
