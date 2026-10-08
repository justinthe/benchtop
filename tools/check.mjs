// Runtime logic checks: node tools/check.mjs
import assert from 'node:assert/strict';
import { createStore, tweenState, encodeHash, decodeHash, pickTier, tierDown, ease, clamp } from '../lib/pure.js';

// store: model recomputes on set, subscribers fire once per flush, no-op set stays clean
const st = createStore({ a: 1, b: 2 }, s => ({ sum: s.a + s.b }));
let calls = 0; st.subscribe(() => calls++);
assert.equal(st.model.sum, 3); st.flush(); assert.equal(calls, 1);
st.set({ a: 5 }); st.set({ b: 5 }); assert.equal(st.model.sum, 10);
st.flush(); st.flush(); assert.equal(calls, 2);
st.set({ a: 5 }); assert.equal(st.flush(), false);

// tween: numbers lerp, others snap at midpoint
assert.deepEqual(tweenState({ x: 0, f: false }, { x: 10, f: true }, .25), { x: 2.5, f: false });
assert.deepEqual(tweenState({ x: 0, f: false }, { x: 10, f: true }, .5), { x: 5, f: true });
assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.ok(Math.abs(ease(.5) - .5) < 1e-9);
assert.equal(clamp(5, 0, 1), 1);

// hash round-trip with typed template; unknown keys dropped; bad numbers ignored
const tpl = { mode: 0, length: 1, damping: false, view: 'lab' };
const h = encodeHash({ mode: 2, length: 1.23456, damping: true, view: 'side' });
assert.equal(h, '#mode=2&length=1.235&damping=true&view=side');
assert.deepEqual(decodeHash(h, tpl), { mode: 2, length: 1.235, damping: true, view: 'side' });
assert.deepEqual(decodeHash('#length=abc&evil=1&view=x%20y', tpl), { view: 'x y' });
assert.equal(encodeHash({}), '');

// tiers
assert.equal(pickTier({ gpu: 'Google SwiftShader' }), 'low');
assert.equal(pickTier({ mobile: true, cores: 6 }), 'low');
assert.equal(pickTier({ cores: 12 }), 'high');
assert.equal(tierDown('high'), 'med'); assert.equal(tierDown('low'), 'low');
console.log('check ok');
