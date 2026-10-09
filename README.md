# benchtop

Turn a freeform markdown topic into a single, self-contained, interactive 3D explainer page. Static files only: host on GitHub
Pages, no build step, no CDN.

Live pages: `https://<github-user>.github.io/benchtop/<slug>/`. Current pages: `pendulum/`, `prism-room/`, `spectacles/`.

## Make a page (Claude Code)
1. Write `topics/<slug>.md` (any prose; optional frontmatter `title`, `slug`, `type`, `tags`; data tables are honoured exactly).
2. In Claude Code, in this repo: `/explain topics/<slug>.md`. The skill (`.claude/skills/explain/`) writes the model and its tests first,
   then the page, then verifies it in a browser and saves `thumb.jpg` and `meta.json`.
3. Tweak by chat: `/explain <slug> make the beam thicker`, or just ask.
4. Commit and push; Pages serves `/<slug>/`.

## Run it locally
```bash
python3 tools/serve.py 8000          # static server (+ thumbnail endpoint), http://localhost:8000/<slug>/
tools/test.sh                        # runtime checks + every page's model tests (Node only, no install)
tools/setup-verify.sh                # one time: playwright-core for the headless verifier (outside the repo)
node tools/verify.mjs <slug> --out verify-<slug>   # modes x views, phone width, console, keys, hash; writes screenshots
```

## Layout
```
lib/                shared runtime (three.js r0.186.1 vendored, explainer.js, kit.js, pure.js, css, fonts)
<slug>/             index.html, model.js (pure), model.test.mjs, meta.json, thumb.jpg
topics/             source markdown, public
tools/              serve.py, test.sh, check*.mjs, meta.mjs, verify.mjs, setup-verify.sh, vendor.sh
.claude/skills/explain/   the /explain skill: SKILL.md, API.md, STYLE.md, PATTERNS.md, VERIFY.md, template
PRD.md, PLAN.md     product requirements and the implementation plan with status
```

Three.js and fonts are re-vendored with `tools/vendor.sh` (pinned versions). Fonts are SIL OFL (`lib/fonts/OFL.txt`).
