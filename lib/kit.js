// Procedural builders. Everything returns Object3D/Mesh, casts + receives shadows by default.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { wavelengthToRGB } from './pure.js';
import { contourSegments, sample } from './geo.js';

const _cache = new Map();
const cached = (key, make) => { if (!_cache.has(key)) _cache.set(key, make()); return _cache.get(key); };

// ---- materials (cached per color so repeated props share one) ----
export const mat = {
  matte: (c, rough = .85) => cached(`m${c}${rough}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 })),
  plastic: (c, rough = .45) => cached(`p${c}${rough}`, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, clearcoat: .4, clearcoatRoughness: .4 })),
  metal: (c = 0xb8bcc2, rough = .3) => cached(`x${c}${rough}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 1 })),
  glass: (c = 0xcfeaff, opacity = .22) => cached(`g${c}${opacity}`, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: .04, metalness: 0, transparent: true, opacity, clearcoat: 1, ior: 1.5, depthWrite: false })),
  emissive: (c, intensity = 2) => cached(`e${c}${intensity}`, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: intensity, toneMapped: false })),
};

export function shadowy(obj, cast = true, receive = true) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}
const mesh = (geo, m, cast = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; return o; };

export const anchor = (x = 0, y = 0, z = 0) => { const o = new THREE.Object3D(); o.position.set(x, y, z); return o; };

// ---- primitives ----
export const roundedBox = (w, h, d, r = .02, m = mat.matte(0x888888)) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), m);

// Table with top surface at y = h. Returns group with .topY.
export function bench({ w = 3, d = 1.4, h = .8, color = 0x6b4a32, legColor = 0x2b2623 } = {}) {
  const g = new THREE.Group();
  const top = roundedBox(w, .06, d, .02, mat.matte(color, .6)); top.position.y = h - .03; g.add(top);
  const lx = w / 2 - .12, lz = d / 2 - .12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = roundedBox(.07, h - .06, .07, .01, mat.metal(legColor, .5)); leg.position.set(sx * lx, (h - .06) / 2, sz * lz); g.add(leg);
  }
  g.userData.topY = h;
  return g;
}

export function knob(r = .05, h = .04, color = 0xd9d4cb) {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 32), mat.plastic(color)); body.position.y = h / 2; g.add(body);
  const tick = mesh(new THREE.BoxGeometry(r * .12, h * .15, r * .8), mat.matte(0x222222)); tick.position.set(0, h + h * .02, -r * .45); g.add(tick);
  return g; // rotate g.rotation.y to turn
}

// Slider rail; g.setValue(0..1) moves the thumb along +x.
export function sliderRail(len = .4, color = 0x2a2623) {
  const g = new THREE.Group();
  const rail = roundedBox(len, .012, .03, .004, mat.matte(color)); g.add(rail);
  const thumb = roundedBox(.03, .03, .05, .008, mat.plastic(0xe6e0d6)); thumb.position.y = .015; g.add(thumb);
  g.setValue = f => { thumb.position.x = (f - .5) * (len - .03); };
  g.setValue(0);
  return g;
}

// Display in a bezel facing +z. Returns { group, screen } where screen is a plane at the front face.
export function screenBezel(w = 1, h = .6, { depth = .05, border = .03, color = 0x1d1a18 } = {}) {
  const group = new THREE.Group();
  const body = roundedBox(w + border * 2, h + border * 2, depth, .015, mat.plastic(color, .6)); group.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
  screen.position.z = depth / 2 + .001; group.add(screen);
  return { group, screen };
}

// ---- props ----
export function plant({ h = .5, leaves = 8, potColor = 0xb5683f, leafColor = 0x4f9a52 } = {}) {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(h * .28, h * .2, h * .35, 10), mat.matte(potColor, .8)); pot.position.y = h * .175; g.add(pot);
  const soil = mesh(new THREE.CylinderGeometry(h * .26, h * .26, .01, 10), mat.matte(0x2a1d14)); soil.position.y = h * .35; g.add(soil);
  const rnd = mulberry(leaves * 97);
  for (let i = 0; i < leaves; i++) {
    const leaf = mesh(new THREE.ConeGeometry(h * .09, h * (.55 + rnd() * .35), 5), new THREE.MeshStandardMaterial({ color: new THREE.Color(leafColor).offsetHSL((rnd() - .5) * .05, 0, (rnd() - .5) * .1), roughness: .7, flatShading: true }));
    const a = (i / leaves) * Math.PI * 2 + rnd();
    leaf.position.set(Math.cos(a) * h * .08, h * .35 + h * .25, Math.sin(a) * h * .08);
    leaf.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5);
    g.add(leaf);
  }
  return g;
}

export function shelf({ w = 1.4, h = 1.2, d = .3, boards = 3, color = 0x5c4330 } = {}) {
  const g = new THREE.Group();
  const rnd = mulberry(boards * 31);
  for (let i = 0; i <= boards; i++) {
    const b = roundedBox(w, .03, d, .008, mat.matte(color, .7)); b.position.y = (i / boards) * h; g.add(b);
    if (i < boards) {
      let x = -w / 2 + .05;
      while (x < w / 2 - .12) {
        const bw = .03 + rnd() * .04, bh = .12 + rnd() * .12;
        const book = roundedBox(bw, bh, d * .7, .004, mat.matte(new THREE.Color().setHSL(rnd(), .35, .4 + rnd() * .15).getHex()));
        book.position.set(x + bw / 2, b.position.y + .015 + bh / 2, 0); g.add(book); x += bw + .003;
        if (rnd() < .12) x += .1;
      }
    }
  }
  for (const sx of [-1, 1]) { const s = roundedBox(.03, h, d, .008, mat.matte(color, .7)); s.position.set(sx * (w / 2 - .015), h / 2, 0); g.add(s); }
  return g;
}

// Window on a wall facing +z with a warm sun light shining in. Returns { group, light }.
export function windowLight({ w = 1.4, h = 1.6, color = 0xfff0d0, intensity = 3.2, from = [1.5, 1.4, -2] } = {}) {
  const group = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat.emissive(color, 1.6)); group.add(pane);
  const fr = .05;
  for (const [sx, sy, fw, fh] of [[0, h / 2, w + fr, fr], [0, -h / 2, w + fr, fr], [-w / 2, 0, fr, h], [w / 2, 0, fr, h], [0, 0, fr * .6, h], [0, 0, w, fr * .6]]) {
    const bar = roundedBox(fw, fh, .06, .005, mat.matte(0xe8e2d8, .6)); bar.position.set(sx, sy, .02); group.add(bar);
  }
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...from); light.target.position.set(0, 0.6, 0.5);
  light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 12 });
  light.shadow.bias = -.0004; light.shadow.normalBias = .02; light.shadow.radius = 4;
  group.add(light, light.target);
  return { group, light };
}

export function floorTiles(size = 12, tiles = 12, a = 0x3a332d, b = 0x453d36) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'), n = 8, s = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#' + a.toString(16).padStart(6, '0') : '#' + b.toString(16).padStart(6, '0'); x.fillRect(i * s, j * s, s, s); }
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
  for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 512); x.moveTo(0, i * s); x.lineTo(512, i * s); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(tiles / n, tiles / n); tex.anisotropy = 8;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, roughness: .55, metalness: 0 }));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
  return f;
}

// Open-front room: floor + back wall (z=-d/2) + left wall (x=-w/2). Window cut-out is not modelled; hang windowLight on the wall.
export function room({ w = 8, d = 6, h = 3.2, wall = 0x8a7a6a, floorA = 0x3a332d, floorB = 0x453d36 } = {}) {
  const g = new THREE.Group();
  const floor = floorTiles(Math.max(w, d), Math.round(Math.max(w, d)), floorA, floorB); g.add(floor);
  const back = mesh(new THREE.PlaneGeometry(w, h), mat.matte(wall, .95), false); back.position.set(0, h / 2, -d / 2); g.add(back);
  const left = mesh(new THREE.PlaneGeometry(d, h), mat.matte(wall, .95), false); left.position.set(-w / 2, h / 2, 0); left.rotation.y = Math.PI / 2; g.add(left);
  const base = roundedBox(w, .12, .03, .005, mat.matte(0xe8e2d8, .7)); base.position.set(0, .06, -d / 2 + .015); g.add(base);
  g.userData = { w, d, h };
  return g;
}

export function plinth(r = 2.4, h = .35, color = 0x2c2724) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 64), mat.matte(color, .5)); b.position.y = h / 2; g.add(b);
  const rim = mesh(new THREE.TorusGeometry(r, .02, 8, 64), mat.metal(0x9a9186, .35)); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  return g;
}

// ---- terrain / city ----
// heights: Float32Array|number[] row-major, w*h samples. Returns mesh `size` wide in x/z, tallest sample = `height`.
export function terrainFromHeights(heights, w, h, { size = 4, height = 1, colorFn, cell = [1, 1] } = {}) {
  const geo = new THREE.PlaneGeometry(size, depthOf(w, h, size, cell), w - 1, h - 1);   // cell = [east_m, north_m] per sample, so non-square DEM cells keep their true aspect
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) { lo = Math.min(lo, heights[i]); hi = Math.max(hi, heights[i]); }
  const span = hi - lo || 1, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (heights[i] - lo) / span;
    pos.setY(i, t * height);
    (colorFn ? colorFn(t, c) : defaultTerrainColor(t, c));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true }));
}
function defaultTerrainColor(t, c) {
  return t < .25 ? c.set(0xc9b68a) : t < .6 ? c.set(0x5f8f4e).lerp(new THREE.Color(0x3f6b3a), (t - .25) / .35) : c.set(0x6b665e).lerp(new THREE.Color(0xf2f2f2), Math.max(0, (t - .8) / .2));
}
// Procedural heightfield: simplex fbm with optional radial falloff (island/diorama look).
export function noiseHeights(w, h, { scale = 3, octaves = 4, seed = 1, falloff = true } = {}) {
  const sn = new SimplexNoise({ random: mulberry(seed) }), out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let a = 1, f = scale, v = 0, n = 0;
    for (let o = 0; o < octaves; o++) { v += a * sn.noise(i / w * f, j / h * f); n += a; a *= .5; f *= 2; }
    v = v / n * .5 + .5;
    if (falloff) { const dx = i / (w - 1) * 2 - 1, dy = j / (h - 1) * 2 - 1; v *= Math.max(0, 1 - Math.pow(Math.hypot(dx, dy), 3)); }
    out[j * w + i] = v;
  }
  return out;
}

// Depth of a terrain `size` units wide for a w x h grid whose cells are cell[0] x cell[1] metres (default square).
export const depthOf = (w, h, size, cell = [1, 1]) => size * (h - 1) * cell[1] / ((w - 1) * cell[0]);

// Terrain bookkeeping shared by the helpers below: heights are normalised like terrainFromHeights (lowest = 0, highest = `height`).
const _span = heights => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < heights.length; i++) { lo = Math.min(lo, heights[i]); hi = Math.max(hi, heights[i]); } return { lo, hi, span: hi - lo || 1 }; };

// (x, z) in terrain scene units -> terrain surface height y, for placing things on the ground. Same args as terrainFromHeights.
export function heightSampler(heights, w, h, { size = 4, height = 1, cell = [1, 1] } = {}) {
  const { lo, span } = _span(heights), depth = depthOf(w, h, size, cell);
  return (x, z) => (sample(heights, w, h, (x / size + .5) * (w - 1), (z / depth + .5) * (h - 1)) - lo) / span * height;
}

// Re-colour a terrainFromHeights mesh in place: colorFn(t01, index, THREE.Color) mutates the colour (use for flood or overlay layers).
export function recolorTerrain(mesh, colorFn) {
  const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color, c = new THREE.Color();
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < pos.count; i++) { lo = Math.min(lo, pos.getY(i)); hi = Math.max(hi, pos.getY(i)); }
  const span = hi - lo || 1;
  for (let i = 0; i < pos.count; i++) { colorFn((pos.getY(i) - lo) / span, i, c); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true;
}

// Contour lines (LineSegments) on a terrainFromHeights terrain: `levels` are in the original height units (for example metres).
export function contourLines(heights, w, h, levels, { size = 4, height = 1, color = 0x1b1713, opacity = .55, lift = .004, cell = [1, 1] } = {}) {
  const { lo, span } = _span(heights), depth = depthOf(w, h, size, cell), pos = [];
  for (const level of levels) {
    const seg = contourSegments(heights, w, h, level), y = (level - lo) / span * height + lift;
    for (let i = 0; i < seg.length; i += 2) pos.push((seg[i] / (w - 1) - .5) * size, y, (seg[i + 1] / (h - 1) - .5) * depth);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

// Flat ribbon along a polyline (rivers, roads). coords [[x,z],...] in scene units; groundY(x,z) puts it on the terrain (default 0).
export function lineFromCoords(coords, { width = .03, color = 0x4aa3df, groundY = () => 0, lift = .006, closed = false } = {}) {
  const n = coords.length, pos = [], idx = [], hw = width / 2;
  for (let i = 0; i < n; i++) {
    const a = coords[closed ? (i + n - 1) % n : Math.max(0, i - 1)], b = coords[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const [x, z] = coords[i], nx = -dz * hw, nz = dx * hw;                      // left normal
    for (const k of [1, -1]) { const px = x + nx * k, pz = z + nz * k; pos.push(px, groundY(px, pz) + lift, pz); }
    if (i > 0) { const j = (i - 1) * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
  }
  if (closed && n > 2) { const j = (n - 1) * 2; idx.push(j, 0, j + 1, j + 1, 0, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: .6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; return m;
}

// Extruded polygons (buildings, zones) merged into ONE mesh. polys: [{ rings: [[ [x,z],.. ], hole..], height?, color?, y? }], scene units; y = base height.
export function extrudeFromPolygons(polys, { height = .1, color = 0xd8d0c4, groundY = () => 0 } = {}) {
  const geos = [], c = new THREE.Color();
  for (const p of polys) {
    const [outer, ...holes] = p.rings, shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, z)));
    holes.forEach(hole => shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, z)))));
    const hgt = p.height ?? height, g = new THREE.ExtrudeGeometry(shape, { depth: hgt, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, hgt + (p.y ?? groundY(outer[0][0], outer[0][1])), 0);   // shape y -> scene z, extrusion up from the base
    const col = new Float32Array(g.attributes.position.count * 3); c.set(p.color ?? color);
    for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); geos.push(g.index ? g.toNonIndexed() : g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }));
  m.castShadow = m.receiveShadow = true; return m;
}

export function lowPolyBuilding(w = .3, h = .6, d = .3, color = 0xd8d0c4) {
  const g = new THREE.Group();
  const body = roundedBox(w, h, d, .01, mat.matte(color, .8)); body.position.y = h / 2; g.add(body);
  const roof = roundedBox(w * 1.05, .03, d * 1.05, .005, mat.matte(0x4a4440)); roof.position.y = h + .015; g.add(roof);
  return g;
}
// list: [{x,z,w,d,h,y?}] → one InstancedMesh (single draw call).
export function buildingsInstanced(list, color = 0xd8d0c4) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .8 }), list.length);
  const m = new THREE.Matrix4(), c = new THREE.Color(), rnd = mulberry(list.length);
  list.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, (b.y || 0) + b.h / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    im.setMatrixAt(i, m); im.setColorAt(i, c.set(color).offsetHSL(0, 0, (rnd() - .5) * .18));
  });
  im.castShadow = im.receiveShadow = true;
  return im;
}

// ---- lines / flow ----
export function tube(points, r = .01, m = mat.plastic(0x222222), segments) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => (p.isVector3 ? p : new THREE.Vector3(...p))));
  return mesh(new THREE.TubeGeometry(curve, segments || points.length * 8, r, 8, false), m);
}
export const pipe = (points, r = .03, m = mat.metal(0x9aa0a6, .4)) => tube(points, r, m);
export function cable(a, b, sag = .1, r = .006, m = mat.matte(0x151515, .6)) {
  const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b), pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(A.clone().lerp(B, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))); }
  return tube(pts, r, m, 48);
}

// Arrow pointing along `dir` (unit-ish vector). Call arrow.setLength(l) to resize.
export function arrow(dir = [1, 0, 0], len = .5, color = 0x7fd3ff, r = .012) {
  const g = new THREE.Group(), m = mat.emissive(color, 1.2);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), m), head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 7, 16), m);
  g.add(shaft, head);
  g.setLength = l => { shaft.scale.y = Math.max(l - r * 7, .001); shaft.position.y = shaft.scale.y / 2; head.position.y = shaft.scale.y + r * 3.5; };
  g.setLength(len);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
  return g;
}

// Points cloud; opts.step(i, p(Vector3 scratch), dt) mutates p in place, called by points.update(dt).
export function particles(count = 200, { size = .03, color = 0xffffff, step } = {}) {
  const pos = new Float32Array(count * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, color, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  const p = new THREE.Vector3();
  pts.update = dt => {
    for (let i = 0; i < count; i++) { p.fromArray(pos, i * 3); step(i, p, dt); p.toArray(pos, i * 3); }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

// Light ray: pooled thin cylinders + joint spheres along a polyline. setPath(points) only touches transforms.
// Additive and emissive (color is boosted above 1), so crossing beams sum toward white and bloom picks them up.
export function beam(color = 0xffffff, width = .008, { boost = 2 } = {}) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const segGeo = new THREE.CylinderGeometry(width, width, 1, 8, 1, true), jointGeo = new THREE.SphereGeometry(width, 8, 6);
  const segs = [], joints = [], up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), mid = new THREE.Vector3();
  const take = (pool, geo, i) => { if (!pool[i]) { pool[i] = new THREE.Mesh(geo, m); g.add(pool[i]); } pool[i].visible = true; return pool[i]; };
  g.setPath = pts => {
    const P = pts.map(p => (p.isVector3 ? p : new THREE.Vector3(...p)));
    for (let i = 0; i < P.length - 1; i++) {
      const s = take(segs, segGeo, i); d.subVectors(P[i + 1], P[i]); const len = d.length();
      s.position.copy(mid.addVectors(P[i], P[i + 1]).multiplyScalar(.5)); s.scale.set(1, Math.max(len, 1e-6), 1); s.quaternion.setFromUnitVectors(up, d.divideScalar(len || 1));
    }
    for (let i = Math.max(0, P.length - 1); i < segs.length; i++) segs[i].visible = false;
    for (let i = 0; i < P.length; i++) take(joints, jointGeo, i).position.copy(P[i]);
    for (let i = P.length; i < joints.length; i++) joints[i].visible = false;
  };
  g.setOpacity = o => { m.opacity = o; };
  g.setPath([]);
  return g;
}

// ---- screen drawing helpers (2D canvas) ----
export const chart = {
  clear(ctx, w, h, bg = '#0d1114') { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); },
  text(ctx, str, x, y, { size = 14, color = '#9ab', align = 'left', font = 'JetBrains Mono, monospace' } = {}) {
    ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
  },
  grid(ctx, r, nx = 4, ny = 4, color = 'rgba(255,255,255,.08)') {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= nx; i++) { const x = r.x + r.w * i / nx; ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); }
    for (let j = 0; j <= ny; j++) { const y = r.y + r.h * j / ny; ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); }
    ctx.stroke();
  },
  // r = {x,y,w,h}; xs/ys data arrays; range = {x:[lo,hi], y:[lo,hi]}
  line(ctx, r, xs, ys, range, { color = '#7fd3ff', width = 2 } = {}) {
    const [x0, x1] = range.x, [y0, y1] = range.y;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.beginPath();
    xs.forEach((x, i) => { const px = r.x + (x - x0) / (x1 - x0) * r.w, py = r.y + r.h - (ys[i] - y0) / (y1 - y0) * r.h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
  },
  // Horizontal 400-700 nm color strip filling rect r.
  spectrum(ctx, r, from = 400, to = 700) {
    const gr = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    for (let nm = from; nm <= to; nm += 10) gr.addColorStop((nm - from) / (to - from), `rgb(${wavelengthToRGB(nm).map(c => Math.round(c * 255)).join(',')})`);
    ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
  },
  bars(ctx, r, values, max, { color = '#7fd3ff', gap = 4 } = {}) {
    const bw = r.w / values.length - gap;
    values.forEach((v, i) => { const bh = Math.max(0, v / max) * r.h; ctx.fillStyle = Array.isArray(color) ? color[i % color.length] : color; ctx.fillRect(r.x + i * (bw + gap), r.y + r.h - bh, bw, bh); });
  },
};

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
