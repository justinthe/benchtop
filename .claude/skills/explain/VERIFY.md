# Verify loop (Claude in Chrome)

Run after every generate or iterate. Max **3 fix iterations**; then report what remains. Everything below was exercised on
`pendulum/` and `prism-room/`. Load the browser tools once with ToolSearch (one call, comma-separated):
`select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_close_mcp`.

## Fastest path: scripted headless check
`PW_DIR=<dir containing node_modules/playwright-core> node tools/verify.mjs <slug> --out <dir> [--thumb]` runs steps 1 to 5 below in
headless Chrome (software GL, real phone emulation at 390 x 844), writes screenshots to `<dir>`, and prints a JSON report with
`problems` (exit code 1 if any). Use it when the Chrome extension is not connected, and as the first pass even when it is. You still
**look at the screenshots** (step 3). Set up once: `npm i playwright-core` in a scratch directory (not in the repo) and point `PW_DIR` at it.
The verifier is slow on pages with glass transmission (software rendering); that is normal.

## 0. Serve and test
- `curl -s -o /dev/null -w "%{http_code}" localhost:8000/` . If it fails, start `python3 tools/serve.py 8000` with `run_in_background`.
  If port 8000 already holds an older server (thumbnail POST returns 501), `fuser -k 8000/tcp` and restart. **Never `pkill -f`**
  a pattern that appears in your own command line; it kills your shell.
- `tools/test.sh` must pass before opening the browser.

## 1. Open and read the console
1. `tabs_context_mcp {createIfEmpty:true}`, then use **your own tab**; do not reuse a tab from another session.
2. Call `read_console_messages` once **before** navigating (pattern `rror|arn|xception|ailed|THREE`, `clear:true`). Tracking starts at the first call
   and persists across navigations in that tab.
3. `navigate` to `http://localhost:8000/<slug>/?r=<n>`. **Bump `?r=n` for every reload**: changing only the hash does not reload the page.
4. Wait about 2 s, then read the console again. **Zero errors and zero warnings** is the bar.
5. If `window.__bt` is undefined, a module threw (uncaught module errors often do not reach the console tool). Diagnose with:
```js
const O=location.origin; const html=await (await fetch('/<slug>/index.html')).text();
let code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/from '\.\.\//g,`from '${O}/`).replace(/from '\.\//g,`from '${O}/<slug>/`);
try { await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'}))); 'loaded' } catch(e) { 'ERR: '+e.message+' | '+(e.stack||'').split('\n').slice(0,5).join(' / ') }
```

## 2. Sweep every mode and view (finite numbers)
Background tabs throttle `requestAnimationFrame`, so **drive frames yourself** with `__bt.advance`:
```js
await new Promise(r=>setTimeout(r,2000)); const b=window.__bt, out=[b.ready];
const modes=document.querySelectorAll('.bt-modes .bt-btn').length, views=['<view1>','<view2>','<view3>'];
for (let m=1;m<=modes;m++) for (const v of views){ b.setModeInstant(m); b.setView(v,true); b.advance(40); out.push(`${m}/${v}: ${b.stats().join(' | ')}`); }
JSON.stringify({out, bad: out.filter(x=>/NaN|Infinity|undefined/.test(String(x)))})
```
Fail on any `NaN`, `Infinity`, or `undefined`. A lone em dash is fine only where the narration explains it (for example "trapped").
Do **not** return `location.hash` from `javascript_tool` (the tool blocks query-string-like output).

## 3. Look at it (screenshots)
For each mode x view take a screenshot (`computer screenshot`, `scale: 0.6` is enough) after `setModeInstant`, `setView`, `advance(60)`.
Checklist, per image:
- Hero framed, central, large; not under the title block or the control panel.
- Labels readable, none overlapping, none missing that should show; no label sitting on the panel.
- Screens legible from the default view; no clipped chart edges or axis text.
- No blown-out highlights (bloom, sun glare), no black frames, nothing floating that should rest on the bench.
- Narration text sensible for this state (no contradictions, no "NaN").
- Stats chips show 3 values.
Fix the cause, not the symptom (see PATTERNS pitfalls), then re-run from step 1.

## 4. Phone width
`resize_window` does not change the viewport reliably. Emulate with an iframe (media queries use the iframe width):
```js
document.body.innerHTML=''; document.body.style.cssText='background:#222;overflow:auto';
const f=document.createElement('iframe'); f.src='/<slug>/?r=p1'; f.style.cssText='width:390px;height:772px;border:0;display:block;margin:0 auto'; document.body.append(f);
await new Promise(r=>setTimeout(r,3000)); const w=f.contentWindow; w.__bt.advance(10);
JSON.stringify({w:w.innerWidth, tier:w.__bt.tier, scrollW:w.document.documentElement.scrollWidth, stats:w.__bt.stats()})
```
`scrollW` must equal 390 (no horizontal scroll). Screenshot: title and chips on top, hero visible above the bottom sheet, sheet peek shows the narration.

## 5. Quality tier and interaction
```js
const b=window.__bt; b.setTier('low'); b.advance(30); const lowOk=b.stats(); b.setTier('high'); b.advance(30);
const k=key=>window.dispatchEvent(new KeyboardEvent('keydown',{key})); k('v'); b.advance(60); k('2'); b.advance(60); k('h'); const help=document.querySelector('.bt-help').classList.contains('on'); k('Escape');
JSON.stringify({lowOk, help, view:b.view, mode:b.mode})
```
Check that expensive materials degraded on low (inspect `b.refs`), that V cycled the view, a number key set the mode, H opened help.
If the page has info labels, click one (`document.querySelector('.bt-label.info').click()`) and confirm its popover shows.

## 6. Capture
`await __bt.saveThumb()` from the best mode and view (should resolve `204`), then `node tools/meta.mjs ...` (see SKILL.md step 8).
Look at `<slug>/thumb.jpg` with Read once. Close your browser tab with `tabs_close_mcp` when finished.

## Fix-loop discipline
- One hypothesis per fix; re-run the failing check, not everything.
- Iteration 3 still failing: stop, report exactly what fails and what you tried. Do not paper over with hacks.
- Any change in `lib/` means re-running **both** golden pages (`pendulum/`, `prism-room/`) through steps 1 and 2.
