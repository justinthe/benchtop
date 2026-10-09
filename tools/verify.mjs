// Headless verify (fallback when the Claude-in-Chrome extension is unavailable, and handy in CI-less setups).
//   node tools/verify.mjs <slug> [--out <dir>] [--base http://localhost:8000] [--thumb]
// One-time setup: tools/setup-verify.sh (installs playwright-core in ~/.cache/benchtop-verify; override with PW_DIR or BENCHTOP_VERIFY_DIR).
// Needs a running dev server (python3 tools/serve.py) and a Chrome/Chromium ($CHROME or a standard path).
// Does the VERIFY.md loop: console errors/warnings, every mode x view (finite stats, screenshots), tier swap, keys, hash, phone width.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
const argv = process.argv.slice(2), slug = argv[0];
const PW_DIR = process.env.PW_DIR || process.env.BENCHTOP_VERIFY_DIR || join(homedir(), '.cache', 'benchtop-verify');
const CHROME = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && existsSync(p));
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
if (!slug) { console.error('usage: node tools/verify.mjs <slug> [--out dir] [--base url] [--thumb]   (first time: tools/setup-verify.sh)'); process.exit(2); }
if (!existsSync(join(PW_DIR, 'node_modules', 'playwright-core'))) { console.error(`playwright-core not found in ${PW_DIR}. Run tools/setup-verify.sh once.`); process.exit(2); }
if (!CHROME) { console.error('No Chrome/Chromium found. Install one or set CHROME=/path/to/chrome.'); process.exit(2); }
const base = opt('--base', 'http://localhost:8000'), out = opt('--out', `verify-${slug}`), wantThumb = argv.includes('--thumb');
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(PW_DIR + '/')('playwright-core');

const report = { slug, problems: [], notes: [], shots: [] };
const bad = m => report.problems.push(m), note = m => report.notes.push(m);
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });

async function pass(name, viewport, { phone = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
  await ctx.addInitScript(() => { try { localStorage.setItem('bt.tier', 'high'); localStorage.setItem('bt.muted', '1'); } catch {} });
  const page = await ctx.newPage(), logs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => logs.push(`requestfailed: ${r.url()}`));
  page.on('response', r => { if (r.status() >= 400) logs.push(`http ${r.status()}: ${r.url()}`); });
  await page.goto(`${base}/${slug}/?r=${Date.now()}`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__bt, null, { timeout: 20000 }); } catch { bad(`${name}: window.__bt never appeared (module failed to load)`); logs.forEach(l => bad(`${name} console ${l}`)); await ctx.close(); return null; }
  const t0 = Date.now(); await page.evaluate(() => window.__bt.advance(4)); note(`${name}: 4 frames in ${Date.now() - t0} ms (software GL)`);
  const ready = await page.evaluate(() => (window.__bt.advance(2), window.__bt.ready)); if (!ready) bad(`${name}: __bt.ready false after frames`);

  const info = await page.evaluate(() => {
    const b = window.__bt, modes = document.querySelectorAll('.bt-modes .bt-btn').length, start = b.view, views = [start];
    const k = key => window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    for (let i = 0; i < 8; i++) { k('v'); b.advance(1); if (b.view === start) break; views.push(b.view); }
    b.setView(start, true);
    return { modes, views, labels: document.querySelectorAll('.bt-label').length, controls: document.querySelectorAll('.bt-panel input, .bt-panel .bt-seg').length };
  });
  if (info.views.length < 3) bad(`${name}: only ${info.views.length} views (PRD wants >= 3)`);
  if (info.modes < 2) bad(`${name}: only ${info.modes} modes`);
  if (info.labels > 5) bad(`${name}: ${info.labels} labels (> 5)`);

  const combos = [[0, info.views[0]], ...Array.from({ length: info.modes }, (_, i) => info.views.map(v => [i + 1, v])).flat()];
  for (const [m, v] of combos) {
    const r = await page.evaluate(([m, v]) => {
      const b = window.__bt; if (m) b.setModeInstant(m); b.setView(v, true); b.advance(6);
      const text = document.body.innerText;
      return { stats: b.stats(), nan: /NaN|Infinity|undefined/.test(text), narr: document.querySelector('.bt-narr')?.innerText || '' };
    }, [m, v]);
    if (r.nan) bad(`${name} mode ${m}/${v}: NaN/Infinity/undefined in page text`);
    if (r.stats.length !== 3 || r.stats.some(s => !s.trim())) bad(`${name} mode ${m}/${v}: stats chips ${JSON.stringify(r.stats)}`);
    if (r.stats.some(s => s.includes('—'))) note(`${name} mode ${m}/${v}: em dash in stats ${JSON.stringify(r.stats)} (ok only if narrated)`);
    const file = join(out, `${name}-m${m}-${v}.jpg`); await page.screenshot({ path: file, type: 'jpeg', quality: 72 }); report.shots.push(file);
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth); if (sw > viewport.width) bad(`${name}: horizontal scroll (${sw} > ${viewport.width})`);

  // quality tier + keyboard + hash + help
  const t = await page.evaluate(() => { const b = window.__bt; b.setTier('low'); b.advance(3); const lowStats = b.stats(); b.setTier('high'); b.advance(3); return { lowStats }; });
  if (t.lowStats.some(s => /NaN|Infinity/.test(s))) bad(`${name}: bad stats on low tier`);
  await page.keyboard.press('h'); if (!(await page.locator('.bt-help.on').count())) bad(`${name}: H did not open help`); await page.keyboard.press('Escape');
  const v0 = await page.evaluate(() => window.__bt.view); await page.keyboard.press('v'); await page.evaluate(() => window.__bt.advance(2));
  if ((await page.evaluate(() => window.__bt.view)) === v0) bad(`${name}: V key did not change view`);
  if (info.modes) { await page.keyboard.press('2'); await page.evaluate(() => window.__bt.advance(2)); if ((await page.evaluate(() => window.__bt.mode)) !== 2) bad(`${name}: key 2 did not select mode 2`); }
  if (info.modes) { try { await page.waitForFunction(() => /mode=2/.test(location.hash), null, { timeout: 30000 }); } catch { bad(`${name}: hash never got mode=2 (${await page.evaluate(() => location.hash)})`); } }
  const opened = await page.evaluate(() => { const el = document.querySelector('.bt-label.info'); if (!el) return null; el.click(); return el.classList.contains('open'); }); // DOM click: the label may be culled off-screen
  if (opened === false) bad(`${name}: info label did not open`);

  if (wantThumb && !phone) { await page.evaluate(() => { window.__bt.setModeInstant(1); window.__bt.setView(Object.keys(window.__bt.refs).length ? window.__bt.view : window.__bt.view, true); window.__bt.advance(6); });
    const code = await page.evaluate(() => window.__bt.saveThumb()); if (code !== 204) bad(`${name}: saveThumb returned ${code}`); else note(`${name}: thumb saved`); }

  logs.forEach(l => bad(`${name} console ${l}`));
  await ctx.close(); return info;
}

try {
  await pass('desktop', { width: 1280, height: 720 });
  await pass('phone', { width: 390, height: 844 }, { phone: true });
} catch (e) { bad(`verifier crashed: ${e.message.split('\n')[0]}`); } finally { await browser.close(); }
report.ok = report.problems.length === 0;
console.log(JSON.stringify(report, null, 1));
process.exit(report.ok ? 0 : 1);
