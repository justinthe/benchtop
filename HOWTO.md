# HOWTO: from a markdown topic to a live explainer page

This is the whole loop: write a topic, run the `/explain` skill in Claude Code, look at the result locally, tweak it, publish it.

```
topics/my-topic.md  ──/explain──▶  my-topic/index.html (+ model.js, tests, thumb, meta)  ──serve──▶  http://localhost:8000/my-topic/
                                                                                        ──push───▶  https://justinthe.github.io/benchtop/my-topic/
```

---

## 0. One-time setup

You need:
- **Claude Code**, started in this repo folder (`cd benchtop && claude`). The skill lives in `.claude/skills/explain/` and is picked up automatically.
- **Node 20+** and **Python 3** (no packages to install for the pages or the tests).
- **Google Chrome** (or Chromium).

Optional but recommended:
- The **Claude in Chrome** extension, connected. The skill uses it to open the page, read the console and take screenshots.
- The **headless verifier**, used when the extension is not connected. Run this once:
  ```bash
  tools/setup-verify.sh        # installs playwright-core into ~/.cache/benchtop-verify (outside the repo)
  ```

---

## 1. Write the topic file

Create `topics/<slug>.md`. The slug is the folder name and URL of the page, so use lowercase words joined by hyphens, for example `topics/moon-phases.md`.

**Any prose works.** The skill infers the rest. A short note is enough:

```markdown
# Why the Moon has phases

Half of the Moon is always lit by the Sun; what changes is how much of that lit half we see from Earth.
I'd like people to drag the Moon around its orbit and watch the phase change, with the Sun as a lamp.
Show how much is lit and how many days into the month it is. A month is about 29.5 days.
```

**Optional frontmatter** at the top overrides what the skill would guess:

```markdown
---
title: Heat Bench          # page title (2 to 3 words reads best)
slug: thermochemistry      # folder and URL name
type: explainer            # explainer | world | data | play
tags: [chemistry, energy]
---
```

### What makes a good topic

| You write | The skill does |
|---|---|
| The idea in plain words, and what people should *do* ("drag", "pick", "raise the water") | Turns the actions into sliders, toggles or a menu |
| The physics or rule, if you know it ("weight = mass x gravity") | Writes it into `model.js` and tests it |
| **Exact numbers** (a table, a worked example: "1 g of methane in 1 L warms it by 10.7 °C") | Uses them exactly and turns worked examples into tests |
| A scene idea ("a lab bench with a calorimeter", "a model on a plinth") | Builds that scene |
| Story beats ("normal eye, short-sighted, corrected") | Makes them the guided modes, keys 1 to 5 |
| What is out of scope | Leaves it out instead of guessing |

**Page types:**
- **explainer**: an apparatus on a bench, driven by a real model. Examples: `pendulum`, `prism-room`, `spectacles`, `thermochemistry`.
- **world**: an explorable diorama on a plinth. Example: `valley-flood`.
- **data**: one physical object per data record. Example: `planet-weights`.
- **play**: a toy or game (not built yet).

**Data and map pages:** put the raw file in `data-src/`, add a row to `data-src/README.md` saying where it came from and its licence, and name the file in the topic. The skill bakes it into a small `data.json` with the tools in `tools/bake/` (DEM grids, GeoJSON, CSV or JSON). Never paste numbers from memory as "real data". The planet table in `data-src/` is flagged for exactly that reason.

Good examples to copy from: `topics/spectacles.md` (short, with worked numbers) and `topics/thermochemistry.md` (long, with a data table, rules and tests).

---

## 2. Call the skill

In Claude Code, inside the repo:

```
/explain topics/<slug>.md
```

What happens, in order. It takes about 15 minutes and roughly 1 to 2.5 USD of model usage per page, judging by the pages built so far.

1. **Reads** the topic and the skill's guides (API, style, patterns, a similar finished page).
2. **Asks at most 3 questions**, and only if the physics or the data cannot be pinned down.
3. **Writes the model first**: `<slug>/model.js` and `<slug>/model.test.mjs`, then runs the tests until they pass.
4. **Prints a short plan**: title, scene, controls, stats, modes, camera views.
5. **Bakes data** (data and map pages only) into `<slug>/data.json`.
6. **Builds the page**: `<slug>/index.html`.
7. **Verifies it in a browser**. It opens every guided mode in every camera view at desktop and phone width, checks the console, keys and URL, looks at the screenshots, and fixes problems (up to 3 rounds).
8. **Captures** `thumb.jpg` and `meta.json`.
9. **Reports** what it built, the assumptions, the test results and anything unresolved.
10. **Learns**: adds what worked to `.claude/skills/explain/PATTERNS.md`.

It does **not** commit or push unless you ask.

### Changing a page afterwards

Ask in plain words, in the same session or a new one:

```
/explain spectacles add a mode for an over-corrected eye
/explain planet-weights use a dropdown to pick the planet
```

or just: *"make the beam thicker on prism-room"*. The skill reads the page, its model and its tests first, makes the smallest change, re-runs the tests and re-checks the affected views.

---

## 3. Where the output goes

Everything for one page lives in one folder named after the slug:

```
<slug>/
  index.html        the page
  model.js          the maths or data logic (every number on screen comes from here)
  model.test.mjs    tests for the model (run by tools/test.sh)
  data.json         baked data (data and map pages only)
  meta.json         title, kicker, type, tags, date, hash of the topic (for a future gallery)
  thumb.jpg         1200 x 630 preview image (also used for link previews)
```

Shared code is in `lib/` (runtime, 3D kit, fonts, three.js). Pages only reference it, so one runtime fix improves every page.

The verifier's screenshots go wherever `--out` points (for example `verify-<slug>/`). Any folder named `verify-*` is ignored by git.

---

## 4. Run it

### Look at a page

```bash
python3 tools/serve.py 8000
```

Then open `http://localhost:8000/<slug>/`, for example `http://localhost:8000/thermochemistry/`.

> **Always open pages through the server.** Double-clicking `index.html` (a `file://` address) shows a blank page, because browsers block the page's JavaScript modules from `file://`.

`tools/serve.py` is a plain static server that only listens on your own machine. It also accepts the thumbnail upload the skill uses.

### Using a page

- **Guided modes**: the **Try** buttons, or keys **1** to **5**.
- **Camera**: drag to orbit, scroll or pinch to zoom; **V** cycles the views.
- **Controls**: each one shows its keys, for example `[` `]` for a slider and `R` for a menu. **Shift** makes bigger slider steps, and steps a menu backwards.
- **H** or **?** opens help: the shortcuts, the quality setting, and **How this works** (the model's assumptions). **M** mutes sound.
- **Labels with an `i`** can be clicked for an explanation.
- **The URL keeps the state**, for example `#mode=2&view=close`, so you can share an exact view.
- **Phones** get a bottom sheet with the controls.

### Check everything

```bash
tools/test.sh                                         # all code checks + every page's model tests (seconds)
node tools/verify.mjs <slug> --out verify-<slug>      # full browser check of one page (a few minutes)
node tools/verify.mjs <slug> --thumb                  # same, and re-captures thumb.jpg
```

`verify.mjs` prints a JSON report. `"ok": true` and an empty `"problems"` list mean it passed. It needs the server running and the one-time `tools/setup-verify.sh`.

---

## 5. Publish

```bash
git add <slug> topics/<slug>.md
git commit -m "feat: <slug> explainer"
git push
```

**One-time GitHub setup:** in the repo on GitHub, go to **Settings → Pages**, set the source to **Deploy from a branch**, and choose **main** with **/ (root)**. Pages then appear at `https://justinthe.github.io/benchtop/<slug>/`. All paths are relative, so this works under the `/benchtop/` sub-path and on a custom domain later.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Blank page | Open it via `http://localhost:8000/<slug>/`, not by double-clicking the file. Then hard-reload. |
| `Address already in use` when starting the server | A server is already on 8000; just use it. To restart: `fuser -k 8000/tcp && python3 tools/serve.py 8000`. |
| The skill says the Chrome extension is not connected | It falls back to `tools/verify.mjs` automatically. Run `tools/setup-verify.sh` once if it says playwright-core is missing. |
| A page shows `—` instead of a number | That value is undefined for the current state. It is intentional only where the narration explains it (for example "cannot be measured"). Anything else is a bug: ask the skill to fix it. |
| The skill could not update `PATTERNS.md` | Unattended runs (`claude -p`) cannot write inside `.claude/`. The entry is in its report; paste it in by hand. |
| No internet | The bake tools work on local files in `data-src/`. Nothing is fetched live. |
| `tools/test.sh` fails | Read the first failing line; a model test names the number that is off. |

---

## Where to read more

- `.claude/skills/explain/SKILL.md`: the full procedure the skill follows.
- `.claude/skills/explain/API.md`: everything a page can configure (controls, labels, screens, views, data source).
- `.claude/skills/explain/STYLE.md` and `PATTERNS.md`: the look, the writing voice, and proven scene recipes.
- `PRD.md` and `PLAN.md`: what the project is for, and the milestone status.
