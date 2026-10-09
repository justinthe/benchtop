// node --import ./tools/register-three.mjs tools/check-kit.mjs : geometry-only checks of the GIS kit builders (no WebGL needed)
import assert from 'node:assert/strict';
import * as kit from '../lib/kit.js';
import { floodFill, contourSegments } from '../lib/geo.js';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// terrain from a ramp: lowest 0, highest `height`; sampler agrees with vertices
const W = 9, H = 7, heights = Array.from({ length: W * H }, (_, i) => 100 + 10 * (i % W) + 5 * Math.floor(i / W));
const t = kit.terrainFromHeights(heights, W, H, { size: 4, height: 1 }), pos = t.geometry.attributes.position;
let ymin = 1e9, ymax = -1e9; for (let i = 0; i < pos.count; i++) { ymin = Math.min(ymin, pos.getY(i)); ymax = Math.max(ymax, pos.getY(i)); }
near(ymin, 0, 1e-6, 'lowest'); near(ymax, 1, 1e-6, 'highest');
const ground = kit.heightSampler(heights, W, H, { size: 4, height: 1 }), depth = 4 * (H - 1) / (W - 1);
near(ground(-2, -depth / 2), 0, 1e-6, 'sampler at low corner'); near(ground(2, depth / 2), 1, 1e-6, 'sampler at high corner');
for (let i = 0; i < pos.count; i += 7) near(ground(pos.getX(i), pos.getZ(i)), pos.getY(i), 1e-5, 'sampler matches vertex');

// non-square cells keep their metric aspect: depth = size * (h-1)*cy / ((w-1)*cx)
const rect = kit.terrainFromHeights(heights, W, H, { size: 4, height: 1, cell: [300, 450] }); rect.geometry.computeBoundingBox();
near(rect.geometry.boundingBox.max.z - rect.geometry.boundingBox.min.z, 4 * (H - 1) * 450 / ((W - 1) * 300), 1e-5, 'terrain depth with cell aspect'); near(kit.depthOf(W, H, 4), 4 * (H - 1) / (W - 1), 1e-12, 'default square');
const g2 = kit.heightSampler(heights, W, H, { size: 4, height: 1, cell: [300, 450] }), d2 = kit.depthOf(W, H, 4, [300, 450]); near(g2(2, d2 / 2), 1, 1e-6, 'sampler honours cell aspect');

// recolor changes the colour attribute in place
kit.recolorTerrain(t, (v, i, c) => c.setRGB(v, 0, 0)); near(t.geometry.attributes.color.getX(0), t.geometry.attributes.color.getX(0), 0, 'ok');
const highest = [...Array(pos.count).keys()].find(i => Math.abs(pos.getY(i) - 1) < 1e-9); near(t.geometry.attributes.color.getX(highest), 1, 1e-6, 'recolor high = 1');

// contour lines: a level crossing the ramp gives segments lying on the surface at the matching height
const levels = [135], lines = kit.contourLines(heights, W, H, levels, { size: 4, height: 1, lift: 0 }), lp = lines.geometry.attributes.position;
assert.ok(lp.count > 0 && lp.count % 2 === 0);
for (let i = 0; i < lp.count; i++) near(lp.getY(i), (135 - 100) / (heights[heights.length - 1] - 100), 1e-6, 'contour height');
assert.equal(lp.count / 2, contourSegments(heights, W, H, 135).length / 4);
assert.equal(kit.contourLines(heights, W, H, [9999]).geometry.attributes.position.count, 0, 'no crossing, no lines');

// ribbon: straight line of 5 points -> 10 vertices, 8 triangles, width respected, lifted onto the ground function
const r = kit.lineFromCoords([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], { width: .2, groundY: (x, z) => 2, lift: .01 }), rp = r.geometry.attributes.position;
assert.equal(rp.count, 10); assert.equal(r.geometry.index.count, 8 * 3);
for (let i = 0; i < rp.count; i++) { near(Math.abs(rp.getZ(i)), .1, 1e-6, 'half width'); near(rp.getY(i), 2.01, 1e-6, 'lifted'); }
const loop = kit.lineFromCoords([[0, 0], [1, 0], [1, 1], [0, 1]], { closed: true }); assert.equal(loop.geometry.index.count, 4 * 6);
const corner = kit.lineFromCoords([[0, 0], [1, 0], [1, 1]], { width: .2 }).geometry.attributes.position;       // bend: offsets stay finite
for (let i = 0; i < corner.count; i++) assert.ok(Number.isFinite(corner.getX(i)) && Number.isFinite(corner.getZ(i)));

// extruded polygons: a 1x1 square with a hole, height .5 on base y = 2, and a triangle on ground (groundY default 0), merged into one mesh
const sq = { rings: [[[0, 0], [1, 0], [1, 1], [0, 1]], [[.25, .25], [.25, .75], [.75, .75], [.75, .25]]], height: .5, y: 2, color: 0xff0000 };
const one = kit.extrudeFromPolygons([sq]); one.geometry.computeBoundingBox();
near(one.geometry.boundingBox.min.y, 2, 1e-6, 'base y'); near(one.geometry.boundingBox.max.y, 2.5, 1e-6, 'top y'); near(one.geometry.boundingBox.max.x, 1, 1e-6, 'x1'); near(one.geometry.boundingBox.min.z, 0, 1e-6, 'z0');
const two = kit.extrudeFromPolygons([sq, { rings: [[[3, 3], [4, 3], [4, 4]]], height: 1 }]); two.geometry.computeBoundingBox();
near(two.geometry.boundingBox.min.y, 0, 1e-6, 'second polygon on ground'); near(two.geometry.boundingBox.max.y, 2.5, 1e-6, 'tallest top'); near(two.geometry.boundingBox.max.x, 4, 1e-6, 'x range covers both');
assert.ok(two.geometry.attributes.color.count === two.geometry.attributes.position.count);
// the hole removes area: more vertices than a solid square of the same outline
assert.ok(one.geometry.attributes.position.count > kit.extrudeFromPolygons([{ rings: [sq.rings[0]], height: .5, y: 2 }]).geometry.attributes.position.count);
const red = one.geometry.attributes.color; near(red.getX(0), 1, 1e-6, 'colour red'); near(red.getY(0), 0, 1e-6, 'colour green');
void floodFill; console.log('kit geo ok');
