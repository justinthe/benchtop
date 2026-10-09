// benchtop runtime: chrome + renderer + state plumbing. Pages supply model, scene and config.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as kit from './kit.js';
import { createStore, tweenState, encodeHash, decodeHash, pickTier, tierDown, clamp, ease } from './pure.js';

const TIER = {
  high: { dpr: 2, shadow: 2048, gtao: true, smaa: true, fxaa: false, bloom: 1 },
  med: { dpr: 1.5, shadow: 1024, gtao: false, smaa: true, fxaa: false, bloom: 1 },
  low: { dpr: 1, shadow: 1024, gtao: false, smaa: false, fxaa: true, bloom: .5 },
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const store_ = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch { return null; } };

export function createExplainer(cfg) {
  validate(cfg);
  const root = $('div', 'bt'); document.body.append(root);
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) { root.append($('div', 'bt-fallback', '<h1 class="bt-h1">WebGL2 required</h1><p class="bt-hook">This explainer needs a browser with WebGL2 support.</p>')); return null; }

  // ================= State =================
  const defaults = { ...cfg.state };
  const store = createStore(cfg.state, cfg.model);
  const viewNames = Object.keys(cfg.views);
  const modes = cfg.modes || [];
  let modeIdx = 0, viewName = viewNames[0], tween = null, camTween = null, userMoved = false, lastInput = performance.now(), hashTimer = 0;

  // ================= Renderer & FX =================
  const canvas = $('canvas', 'bt-gl'); canvas.tabIndex = 0; canvas.setAttribute('aria-label', cfg.title + ' 3D scene'); root.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = cfg.exposure ?? 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // r186: PCFSoftShadowMap removed; PCF is already filtered

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.background ?? 0x14110f);
  if (cfg.fog !== false) scene.fog = new THREE.Fog(scene.background, 14, 40);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = cfg.environmentIntensity ?? .3;
  const camera = new THREE.PerspectiveCamera(cfg.fov ?? 40, 1, .05, 100);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const gtao = new GTAOPass(scene, camera, 1, 1); gtao.blendIntensity = .8; composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), cfg.bloom ?? .35, .6, cfg.bloomThreshold ?? 1.0); composer.addPass(bloom);
  const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa);
  const smaa = new SMAAPass(); composer.addPass(smaa);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 d=vUv-.5;
        c.rgb*=1.-dot(d,d)*.9; c.rgb+=(h(vUv*1000.+time)-.5)*.012; gl_FragColor=c; }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  let tier = TIER[store_('bt.tier')] ? store_('bt.tier') : pickTier({
    mobile: matchMedia('(pointer: coarse)').matches || innerWidth < 760,
    cores: navigator.hardwareConcurrency || 4,
    gpu: (() => { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; })(),
  });
  const labelRenderer = new CSS2DRenderer(); labelRenderer.domElement.className = 'bt-labels'; root.append(labelRenderer.domElement);

  function applyTier(t) {
    tier = t; const q = TIER[t];
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
    gtao.enabled = q.gtao; smaa.enabled = q.smaa; fxaa.enabled = q.fxaa; bloom.strength = (cfg.bloom ?? .35) * q.bloom;
    scene.traverse(o => { if (o.isLight && o.castShadow) { o.shadow.mapSize.set(q.shadow, q.shadow); o.shadow.map?.dispose(); o.shadow.map = null; } });
    cfg.onTier?.(refs, t);
    resize();
  }
  function resize() {
    const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
    renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h); labelRenderer.setSize(w, h);
    fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!userMoved && !camTween) applyView(viewName, true);
  }

  // ================= Camera =================
  const o = cfg.orbit || {};
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, enablePan: false, minPolarAngle: o.minPolar ?? .12, maxPolarAngle: o.maxPolar ?? Math.PI * .495, minDistance: o.minDist ?? 1, maxDistance: o.maxDist ?? 14, rotateSpeed: .7 });
  controls.addEventListener('start', () => { userMoved = true; camTween = null; idle(); controls.autoRotate = false; });
  const idle = () => { lastInput = performance.now(); };
  let driftBase = 0, prevAz = 0;

  function viewPose(name) {
    const v = cfg.views[name], tgt = new THREE.Vector3(...v.target), pos = new THREE.Vector3(...v.pos);
    const fit = camera.aspect < 1 ? (1 + (1 - camera.aspect) * .9) * (v.phoneFit || 1) : 1; // portrait: back the camera off
    return { pos: tgt.clone().add(pos.sub(tgt).multiplyScalar(fit)), tgt };
  }
  function refreshViewBtn() { viewBtn.innerHTML = `<span>${cfg.views[viewName].label || viewName}</span>`; }
  function applyView(name, instant) {
    viewName = name; refreshViewBtn(); writeHash(); const p = viewPose(name); userMoved = false;
    if (instant || reduced) { camera.position.copy(p.pos); controls.target.copy(p.tgt); controls.update(); camTween = null; return; }
    camTween = { t: 0, dur: .9, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), toPos: p.pos, toTgt: p.tgt };
  }
  function stepCamera(dt) {
    if (camTween) {
      camTween.t += dt / camTween.dur; const e = ease(Math.min(1, camTween.t));
      camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e); controls.target.lerpVectors(camTween.fromTgt, camTween.toTgt, e);
      if (camTween.t >= 1) camTween = null;
    } else if (!reduced && performance.now() - lastInput > 8000) {
      const az = controls.getAzimuthalAngle();
      if (!controls.autoRotate) { controls.autoRotate = true; controls.autoRotateSpeed = .35; driftBase = prevAz = az; }
      const d = az - driftBase;
      if (Math.abs(d) > .22 && d * (az - prevAz) > 0) controls.autoRotateSpeed *= -1;
      prevAz = az;
    }
    controls.update();
  }

  // ================= Scene =================
  const kitApi = { ...kit, THREE };
  const refs = cfg.build(scene, kitApi) || {};
  scene.updateMatrixWorld(true);

  // ================= UI =================
  const title = $('header', 'bt-title');
  title.append($('div', 'bt-kicker', cfg.kicker), $('h1', 'bt-h1', cfg.title), $('p', 'bt-hook', cfg.hook));
  const statsEl = $('div', 'bt-stats'); title.append(statsEl);
  const chipVals = (cfg.stats || []).map(s => {
    const chip = $('div', 'bt-chip bt-glass'), v = $('div', 'bt-chip-v'); chip.append($('div', 'bt-chip-l', s.label), v); statsEl.append(chip); return v;
  });
  const narr = $('div', 'bt-narr bt-glass'); narr.setAttribute('aria-live', 'polite');
  const narrCap = $('span', 'bt-cap'), narrBody = $('div'); narr.append(narrCap, narrBody); title.append(narr);
  root.append(title);

  const panel = $('aside', 'bt-panel bt-glass'); panel.setAttribute('aria-label', 'Controls');
  const handle = $('button', 'bt-handle'); handle.setAttribute('aria-label', 'Toggle controls'); handle.onclick = () => panel.classList.toggle('open');
  panel.append(handle);

  const modeBtns = [];
  if (modes.length) {
    const sec = $('div'); sec.append($('div', 'bt-sec-l', 'Try'));
    const grid = $('div', 'bt-modes');
    modes.forEach((m, i) => {
      const b = $('button', 'bt-btn', `<kbd>${i + 1}</kbd><span>${m.name}</span>`); b.setAttribute('aria-pressed', 'false'); b.onclick = () => setMode(i + 1);
      modeBtns.push(b); grid.append(b);
    });
    sec.append(grid); panel.append(sec);
  }

  const syncers = [], keyMap = {};
  // slider min/max/step may be numbers or functions of state (per-item ranges); resolved on every sync
  const rng = (c, s) => { const v = k => (typeof c[k] === 'function' ? c[k](s) : c[k]), min = v('min'), max = v('max'); return { min, max, step: v('step') ?? (max - min) / 200 }; };
  const ctrlFmt = (c, v) => (+v).toFixed(c.fmt ?? (rng(c, store.state).step < 1 ? 1 : 0)) + (c.unit || '');
  const setWith = (c, v) => ({ [c.key]: v, ...(c.patch ? c.patch(v, store.state) : {}) });   // optional patch: extra keys to set with this control
  for (const c of cfg.controls || []) {
    const sec = $('div');
    if (c.type === 'slider') {
      const lab = $('label', 'bt-slider');
      const val = $('span', 'bt-val'), input = $('input'); input.type = 'range'; Object.assign(input, rng(c, store.state));
      const hint = (c.keys || []).map(k => `<kbd class="bt-kbd">${k}</kbd>`).join('');
      const head = $('div', 'bt-slider-h'); head.append($('span', 'bt-sec-l', `${c.label} ${hint}`), val); lab.append(head, input); sec.append(lab);
      input.oninput = () => { cancelTween(); store.set(setWith(c, +input.value)); modeIdx = 0; const r = rng(c, store.state); snd.detent((input.value - r.min) / (r.max - r.min)); };
      syncers.push(s => { Object.assign(input, rng(c, s)); val.textContent = ctrlFmt(c, s[c.key]); input.value = s[c.key]; });
      if (c.keys) { keyMap[c.keys[0].toLowerCase()] = shift => nudge(c, -1, shift); keyMap[c.keys[1].toLowerCase()] = shift => nudge(c, 1, shift); }
    } else if (c.type === 'toggle') {
      const vals = c.values || (typeof defaults[c.key] === 'boolean' ? [false, true] : c.options);
      const hint = (c.keys || []).map(k => `<kbd class="bt-kbd">${k}</kbd>`).join('');
      sec.append($('div', 'bt-sec-l', `${c.label} ${hint}`));
      const seg = $('div', 'bt-seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', c.label);
      const btns = c.options.map((opt, i) => { const b = $('button', 'bt-btn', opt); b.setAttribute('role', 'radio'); b.onclick = () => { cancelTween(); store.set({ [c.key]: vals[i] }); modeIdx = 0; snd.tick(); }; seg.append(b); return b; });
      sec.append(seg);
      syncers.push(s => btns.forEach((b, i) => b.setAttribute('aria-checked', String(s[c.key] === vals[i]))));
      (c.keys || []).forEach(k => keyMap[k.toLowerCase()] = () => { cancelTween(); const i = vals.indexOf(store.state[c.key]); store.set({ [c.key]: vals[(i + 1) % vals.length] }); modeIdx = 0; snd.tick(); });
    } else if (c.type === 'select') {
      // native <select>: options are strings or { value, label }; values are strings (they go into the URL hash)
      const opts = c.options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
      const hint = (c.keys || []).map(k => `<kbd class="bt-kbd">${k}</kbd>`).join('');
      const lab = $('label', 'bt-select'); lab.append($('span', 'bt-sec-l', `${c.label} ${hint}`));
      const sel = $('select'); sel.setAttribute('aria-label', c.label);
      opts.forEach(o => { const op = $('option'); op.value = o.value; op.textContent = o.label; sel.append(op); });
      sel.onchange = () => { cancelTween(); store.set(setWith(c, sel.value)); modeIdx = 0; snd.tick(); };
      lab.append(sel); sec.append(lab);
      syncers.push(s => { sel.value = s[c.key]; });
      (c.keys || []).forEach(k => keyMap[k.toLowerCase()] = shift => {
        cancelTween(); const i = opts.findIndex(o => o.value === store.state[c.key]), n = opts.length;
        store.set(setWith(c, opts[(i + (shift ? n - 1 : 1)) % n].value)); modeIdx = 0; snd.tick();
      });
    } else continue;
    panel.append(sec);
  }
  function nudge(c, dir, big) {
    const r = rng(c, store.state), d = (r.max - r.min) / 40 * (big ? 5 : 1) * dir;
    cancelTween(); store.set(setWith(c, clamp(+store.state[c.key] + d, r.min, r.max))); modeIdx = 0; snd.detent((store.state[c.key] - r.min) / (r.max - r.min));
  }

  const tools = $('div', 'bt-tools');
  const viewBtn = $('button', 'bt-btn'); viewBtn.onclick = cycleView;
  const helpBtn = $('button', 'bt-btn', '<span>?</span>'); helpBtn.setAttribute('aria-label', 'Help'); helpBtn.onclick = () => toggleHelp();
  const muteBtn = $('button', 'bt-btn'); muteBtn.onclick = () => snd.toggle();
  tools.append(viewBtn, helpBtn, muteBtn);
  const toolSec = $('div'); toolSec.append($('div', 'bt-sec-l', 'View <kbd class="bt-kbd">V</kbd>'), tools); panel.append(toolSec);
  root.append(panel);

  const foot = $('footer', 'bt-foot');
  const shareBtn = $('button', '', 'Share'); shareBtn.onclick = share;
  // cfg.source = { label, date, url? }: credit for baked data; shown in the footer (desktop) and in the help overlay
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const srcText = cfg.source ? `Data: ${cfg.source.label}${cfg.source.date ? ` · ${cfg.source.date}` : ''}` : '';
  const slot = $('span', 'bt-slot');
  if (cfg.source?.url) { const a = $('a'); a.href = cfg.source.url; a.rel = 'noopener'; a.textContent = srcText; slot.append(a); } else slot.textContent = srcText;
  foot.append(slot, cfg.slug ? Object.assign($('a', 'bt-src', 'Source'), { href: `../topics/${cfg.slug}.md` }) : '', shareBtn);
  root.append(foot);
  const toast = $('div', 'bt-toast bt-glass'); root.append(toast);
  const showToast = msg => { toast.textContent = msg; toast.classList.add('on'); setTimeout(() => toast.classList.remove('on'), 1800); };
  async function share() {
    const data = { title: cfg.title, url: location.href };
    try { if (navigator.share) return await navigator.share(data); await navigator.clipboard.writeText(data.url); showToast('Link copied'); } catch { /* user cancelled */ }
  }

  // Narration lives in the title block on desktop, in the panel on phones.
  const mq = matchMedia('(max-width: 760px)');
  const placeNarr = () => (mq.matches ? panel.insertBefore(narr, panel.children[1]) : title.append(narr));
  mq.addEventListener('change', placeNarr); placeNarr();

  // Help overlay
  const help = $('div', 'bt-help'), box = $('div', 'bt-help-box bt-glass'); help.append(box); root.append(help);
  help.onclick = e => { if (e.target === help) toggleHelp(false); };
  const rows = [['1–9', 'Guided modes'], ['V', 'Cycle camera view'], ['M', 'Mute / unmute'], ['H  ?', 'This help']];
  for (const c of cfg.controls || []) if (c.keys) rows.push([c.keys.join('  '), c.type === 'slider' ? `${c.label} − / + (Shift ×5)` : c.type === 'select' ? `${c.label}: next (Shift: previous)` : `${c.label}`]);
  box.innerHTML = `<h2>${cfg.title}</h2><dl>${rows.map(([k, d]) => `<dt><kbd class="bt-kbd">${k}</kbd></dt><dd>${d}</dd>`).join('')}</dl>
    <p class="bt-sec-l">Quality</p><select aria-label="Quality">${['high', 'med', 'low'].map(t => `<option value="${t}">${t}</option>`).join('')}</select>
    ${cfg.source ? `<p class="bt-sec-l">Data source</p><p>${esc(cfg.source.label)}${cfg.source.date ? ` (${esc(cfg.source.date)})` : ''}${cfg.source.note ? `. ${esc(cfg.source.note)}` : ''}</p>` : ''}
    ${cfg.assumptions ? `<details><summary>How this works</summary><div>${cfg.assumptions}</div></details>` : ''}`;
  const tierSel = box.querySelector('select'); tierSel.onchange = () => { store_('bt.tier', tierSel.value); applyTier(tierSel.value); };
  function toggleHelp(on) { help.classList.toggle('on', on); if (help.classList.contains('on')) tierSel.value = tier; }

  // ================= Labels =================
  const labels = (cfg.labels || []).map(l => {
    const el = $('div', 'bt-label'), txt = $('span'), obj = new CSS2DObject(el);
    el.append(txt);
    let pop = null;
    if (l.info) {
      pop = $('div', 'bt-info bt-glass'); el.append(pop); el.classList.add('info'); el.tabIndex = 0; el.setAttribute('role', 'button');
      const toggle = () => { const open = !el.classList.contains('open'); labels.forEach(x => x.el.classList.remove('open')); el.classList.toggle('open', open); el.setAttribute('aria-expanded', String(open)); if (open) pop.innerHTML = l.info(store.state, store.model); snd.tick(); };
      el.onclick = e => { if (e.target.closest('.bt-info')) return; toggle(); };
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } };
    }
    const a = typeof l.anchor === 'function' ? l.anchor(refs) : l.anchor; a.add(obj);
    return { ...l, el, txt, pop, obj, anchorObj: a, hidden: false };
  });
  const occluders = () => (typeof cfg.occluders === 'function' ? cfg.occluders(refs) : cfg.occluders) || [];
  const ray = new THREE.Raycaster(), wp = new THREE.Vector3(), ndc = new THREE.Vector3();
  function cullLabels() {
    const occ = occluders(), taken = [];
    [...labels].sort((a, b) => (b.priority || 0) - (a.priority || 0)).forEach(l => {
      l.anchorObj.getWorldPosition(wp);
      let hide = false;
      ndc.copy(wp).project(camera);
      if (ndc.z > 1 || Math.abs(ndc.x) > 1.02 || Math.abs(ndc.y) > 1.02) hide = true;
      if (!hide && occ.length) {
        const dir = wp.clone().sub(camera.position), dist = dir.length(); ray.set(camera.position, dir.normalize()); ray.far = dist - .05;
        hide = ray.intersectObjects(occ, true).length > 0;
      }
      if (!hide) {
        const r = l.el.getBoundingClientRect();
        if (r.width && taken.some(t => r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top)) hide = true;
        else if (r.width) taken.push(r);
      }
      l.el.classList.toggle('hide', hide && !l.el.classList.contains('open'));
    });
  }

  // ================= Screens =================
  const screens = (cfg.screens || []).map(sc => {
    const m = typeof sc.mesh === 'function' ? sc.mesh(refs) : sc.mesh, [w, h] = sc.size || [512, 320];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    m.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    return { ...sc, ctx: cv.getContext('2d'), tex, w, h };
  });
  const drawScreens = (live) => { for (const s of screens) if (!live || s.live) { if (s.draw(s.ctx, store.state, store.model, refs, s.w, s.h) !== false) s.tex.needsUpdate = true; } };  // draw may return false (nothing changed): skip the texture upload

  // ================= Sound =================
  const snd = createSound(cfg.sound || {}, a => { muteBtn.innerHTML = `<span>${a.muted ? '🔇' : '🔊'}</span>`; muteBtn.setAttribute('aria-label', a.muted ? 'Unmute' : 'Mute'); });

  // ================= Modes / tweens =================
  function cancelTween() { tween = null; }
  function setMode(n, instant) {
    const m = modes[n - 1]; if (!m) return;
    modeIdx = n; snd.whoosh(); writeHash();
    if (m.camera && cfg.views[m.camera]) applyView(m.camera, instant);
    const to = { ...m.state };
    if (instant || reduced) { store.set(to); tween = null; } else tween = { t: 0, dur: 1.1, from: { ...store.state }, to };
  }
  function cycleView() { applyView(viewNames[(viewNames.indexOf(viewName) + 1) % viewNames.length]); snd.tick(); }

  // ================= Input =================
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.tagName === 'INPUT' && e.target.type === 'text')) return;
    idle(); snd.start();
    const k = e.key.toLowerCase();
    if (k === 'escape') toggleHelp(false);
    else if (/^[1-9]$/.test(k)) setMode(+k);
    else if (k === 'v') cycleView();
    else if (k === 'm') snd.toggle();
    else if (k === 'h' || k === '?') toggleHelp();
    else if (keyMap[k]) keyMap[k](e.shiftKey);
    else return;
  });
  addEventListener('pointerdown', () => { idle(); snd.start(); }, { passive: true });
  addEventListener('resize', resize);

  // ================= URL hash =================
  const hashTpl = { ...defaults, mode: 0, view: viewNames[0] };
  const hashIn = decodeHash(location.hash, hashTpl);
  if (hashIn.mode && modes[hashIn.mode - 1]) setMode(hashIn.mode, true);
  const { mode: _m, view: hv, ...hs } = hashIn; store.set(hs);
  if (hv && cfg.views[hv]) viewName = hv;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const out = {}; if (modeIdx) out.mode = modeIdx; if (viewName !== viewNames[0]) out.view = viewName;
      for (const k in defaults) if (store.state[k] !== defaults[k]) out[k] = store.state[k];
      try { history.replaceState(null, '', location.pathname + location.search + encodeHash(out)); } catch { /* sandboxed */ }
    }, 300);
  }

  // ================= Flush: state -> UI =================
  let narrTimer = 0;
  const fmtStat = (s, v) => (Number.isFinite(v) ? (s.signed && v > 0 ? '+' : '') + v.toFixed(s.fmt ?? 1) : '—');   // signed: show + for positive
  store.subscribe((s, m) => {
    (cfg.stats || []).forEach((st, i) => { chipVals[i].innerHTML = `${fmtStat(st, m[st.key])}<small>${st.unit || ''}</small>`; });
    syncers.forEach(f => f(s));
    labels.forEach(l => { l.el.classList.toggle('gone', !!l.show && !l.show(s, m)); l.txt.innerHTML = l.text(s, m); if (l.pop && l.el.classList.contains('open')) l.pop.innerHTML = l.info(s, m); });
    drawScreens(false);
    modeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(modeIdx === i + 1)));
    narrCap.textContent = modes[modeIdx - 1]?.caption || '';
    clearTimeout(narrTimer); narrTimer = setTimeout(() => { narrBody.innerHTML = cfg.narrate(store.state, store.model); }, 120);
    writeHash();
  });

  // ================= Quality sampling + loop =================
  let lastT = performance.now();
  let frames = 0, sampleT = 0, sampleN = 0, sampleActive = true, elapsed = 0, fps = 60, ready = false;
  const __bt = window.__bt = {
    get ready() { return ready; }, get settled() { return !tween && !camTween; }, get fps() { return fps; }, get tier() { return tier; },
    get state() { return store.state; }, get model() { return store.model; }, get mode() { return modeIdx; }, get view() { return viewName; },
    saveThumb: async (w, h) => { const blob = await (await fetch(__bt.thumb(w, h))).blob(); const r = await fetch(`/__thumb/${cfg.slug}`, { method: 'POST', body: blob }); return r.status; },
    stats: () => (store.flush(), chipVals.map(v => v.textContent)),
    // Background tabs throttle rAF; verification drives frames explicitly.
    advance(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) frame(dt); return { ready, frames }; }, setMode: n => setMode(n), setModeInstant: n => setMode(n, true), setView: (n, instant = true) => applyView(n, instant),
    set: p => { cancelTween(); store.set(p); modeIdx = 0; }, setTier: applyTier, refs, scene, camera,
    thumb(w = 1200, h = 630) {
      const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(w, h, false); composer.setPixelRatio(1); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix(); composer.render(0);
      const url = canvas.toDataURL('image/jpeg', .85);
      renderer.setPixelRatio(pr); resize(); return url;
    },
  };

  function frame(forcedDt) {
    const now = performance.now(), dt = forcedDt ?? Math.min((now - lastT) / 1000, .1); lastT = now; elapsed += dt;
    if (tween) {
      tween.t += dt / tween.dur; const e = ease(Math.min(1, tween.t));
      store.set(tweenState(tween.from, tween.to, e)); if (tween.t >= 1) tween = null;
    }
    stepCamera(dt);
    store.flush();
    cfg.update?.(refs, store.state, store.model, dt, elapsed);
    drawScreens(true);
    grade.uniforms.time.value = elapsed % 10;
    composer.render(dt);
    labelRenderer.render(scene, camera);
    if (frames % 12 === 0) cullLabels();
    if (frames === 2) ready = true;
    frames++;
    fps = fps * .9 + (dt > 0 ? 1 / dt : 60) * .1;
    if (sampleActive && !document.hidden && elapsed > .8) {
      sampleT += dt; sampleN++;
      if (sampleT > 2.5) {
        const f = sampleN / sampleT, limit = matchMedia('(pointer: coarse)').matches ? 28 : 45;
        if (f < limit && tier !== 'low') applyTier(tierDown(tier)); else sampleActive = false;
        sampleT = sampleN = 0;
      }
    }
  }

  applyTier(tier); applyView(viewName, true); store.flush(); refreshViewBtn(); drawScreens(false);
  narrBody.innerHTML = cfg.narrate(store.state, store.model);
  renderer.setAnimationLoop(() => frame());
  return __bt;
}

function validate(c) {
  const need = { title: 'string', kicker: 'string', state: 'object', model: 'function', narrate: 'function', build: 'function', views: 'object' };
  for (const k in need) if (typeof c[k] !== need[k]) throw new Error(`createExplainer: config.${k} must be a ${need[k]}`);
  if (!Object.keys(c.views).length) throw new Error('createExplainer: config.views needs at least one view');
  for (const [n, v] of Object.entries(c.views)) if (!v.pos || !v.target) throw new Error(`createExplainer: view "${n}" needs pos and target`);
  (c.modes || []).forEach((m, i) => { if (m.camera && !c.views[m.camera]) throw new Error(`createExplainer: mode ${i + 1} camera "${m.camera}" is not in views`); });
}

// ================= Sound (WebAudio, fully synthesized) =================
function createSound(opts, onChange) {
  let ctx, master, started = false, lastDetent = 0;
  const api = {
    muted: store_('bt.muted') === '1',
    start() {
      if (started) return; started = true;
      try { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = api.muted ? 0 : 1; master.connect(ctx.destination); ambient(); } catch { ctx = null; }
    },
    toggle() { api.start(); api.muted = !api.muted; store_('bt.muted', api.muted ? '1' : '0'); if (master) master.gain.setTargetAtTime(api.muted ? 0 : 1, ctx.currentTime, .05); onChange(api); },
    tick() { blip(1800, 700, .03, .06, 'square'); },
    detent(f) { const t = performance.now(); if (t - lastDetent < 45) return; lastDetent = t; blip(300 + f * 700, 300 + f * 700, .02, .05, 'triangle'); },
    whoosh() {
      if (!ctx || api.muted) return;
      const src = ctx.createBufferSource(); src.buffer = noise(.5, 'white'); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      const g = ctx.createGain(); const t = ctx.currentTime;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2200, t + .35);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .1); g.gain.linearRampToValueAtTime(0, t + .45);
      src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + .5);
    },
  };
  function blip(f0, f1, dur, vol, type) {
    if (!ctx || api.muted || opts.ui === false) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .01);
  }
  function noise(sec, kind) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function ambient() {
    const kind = opts.ambient || 'room'; if (kind === 'none') return;
    const src = ctx.createBufferSource(); src.buffer = noise(4, 'brown'); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind === 'outdoor' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'outdoor' ? 700 : 380;
    const g = ctx.createGain(); g.gain.value = kind === 'machine' ? .05 : .035; src.connect(f).connect(g).connect(master); src.start();
    const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = kind === 'machine' ? 110 : 55; hg.gain.value = kind === 'machine' ? .012 : .006;
    hum.connect(hg).connect(master); hum.start();
  }
  onChange(api);
  return api;
}
