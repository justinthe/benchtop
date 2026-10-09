# Style guide

The look is "a real object in a warm room, with a cool glass UI on top". Consistency beats novelty: the runtime already
supplies the chrome, so most style decisions below are about the **scene** and the **words**.

## Palette
- Room: dark warm neutral. Background `0x14110f`; wall about `0x7d6e60` to `0x8a7a6a`; floor tiles `0x3a332d` / `0x453d36`; bench wood `0x6b4a32`.
- UI accent: cool cyan `#7fd3ff` (runtime tokens `--accent`, `--c-a`). Amber `--c-b` `#ffb454`, rose `--c-c` `#ff7a90`, green `--c-d` `#8fe388`.
- **Domain colours appear only on the subject** (spectrum bands, heat glow, data series). Never decorate with them.
- Metals: steel `0xb8bcc2` (rough .3), dark anodised `0x3a3d41`, brass `0xc9a45c`. Plastics: near-black `0x2b2f36`, off-white `0xe8e4dc`.
- Emissive accents (stage ticks, indicators): amber `0xffb454` at intensity 1.5. Keep the dark plate behind bright beams or glows so they pop.

## Typography (runtime-owned, self-hosted OFL)
Barlow Condensed 700 uppercase for titles, Barlow Condensed 600 tracked for kickers, Inter for body and UI, JetBrains Mono for every
number. Canvas screens use JetBrains Mono at >= 17 px on a 640 px canvas.

## Scene grammar by type
| Type | Grammar | Must have |
|---|---|---|
| explainer | Apparatus on a bench in a room | hero object, 1+ diegetic screen, 3 views, knobs or rails that mirror sliders when cheap |
| world | Tilted diorama on a plinth | terrain or map, 3+ info hotspots, time-of-day or scenario toggle |
| data | Physical metaphor driven by baked data | scrub or filter control, values on hover or labels, source line |
| play | Toy box | direct manipulation, tiny goal or score |

Every page: **one hero** that is large and readable in the default view, supporting props that sell the room (plant, shelf, window,
lamp) but never compete, and exactly **3 camera views**: an overview (default), a close-up, and a diagram or studio view.

## Composition rules
- The hero sits in the central 60% of the frame at 16:9 and is not covered by the title block (left) or control panel (right, 290 px wide).
- Desktop checks at 1440 x 900; phone at 390 x 844 (bottom sheet takes the lower third; the hero must stay visible above it).
- At most **5 labels**; each says something the stats do not. Offset anchors up and sideways so two pills never fight for the same pixels.
- A diegetic screen is read from the default view without zooming: big type, thick lines (line width 4 to 5 px at 640 px wide).
- Do not fill space: a quiet dark bench beats clutter. Props stay low and to the sides.

## Lighting recipe (tune from here, do not reinvent)
- One warm directional "sun" through a window casting shadows: intensity 1.3 to 2.2, from behind-right, shadow frustum +-3.
- One warm point lamp for fill: colour `0xffc88a`, intensity 7 to 9, distance 9 to 10, placed front-left and high.
- Hemisphere light `0xfff1dc` / `0x3a2f28` at 0.15 to 0.25. IBL `environmentIntensity` 0.3 to 0.4.
- Bloom strength 0.3, threshold 1.0. Light rays and glows use emissive colour above 1 (`beam` boost 1.25 to 1.5, white feed 1.5).
- If bright metal glares, raise roughness (0.45 to 0.6) and lower the sun before touching bloom.

## Scale and layout
- Real-world scale: 1 scene unit = 1 m unless the topic says otherwise; state any rescale in `assumptions`.
- Bench top at y = 0.8. Apparatus about 0.3 to 1.5 units across; the bench about 5 x 3.5 for optics, 3.6 x 1.5 for small mechanics.
- Camera: fov 38 to 40; default view about 3 to 4.5 units away, slightly above (y 2.3 to 2.7).

## Writing voice
- **Kicker**: <= 5 words, a promise ("Where white light splits"). **Title**: <= 3 words, a noun ("Prism Room", "Pendulum Lab").
- **Hook**: 2 short sentences, curiosity then tension. No jargon in the hook.
- **Narration**: <= 60 words, plain English, live numbers in colour (`c-a` for the input or first quantity, `c-b` for the main result,
  `c-c` for the surprising or error quantity). Say what it means, not just what it is. Branch for special cases (trapped, locked, clamped).
- **Mode names**: 1 to 3 words, a story beat ("Least bend", "Rejoin"). **Mode captions**: <= 8 words, a sentence fragment.
- **Labels**: value first ("Deviation 68.3 deg"), <= 3 words plus the number.
- State sign conventions and units once, where they first matter. No emoji. No filler ("simply", "just", "basically").
- `assumptions` is honest: data source, simplifications, anything idealised, and what the numbers do not include.

## Accessibility and motion
Real `<input>` and `<button>` controls (runtime). Never encode meaning in colour alone (sign, direction, state also in text or shape).
Respect `prefers-reduced-motion` (runtime handles drift and tweens; do not add your own long animations without checking it).

## Performance
60 fps desktop, >= 30 fps mid phone. Merge or instance repeated geometry; no per-frame allocation in `update`; redraw screens on
state change unless they are traces; transmission or glass materials must degrade in `onTier` for `low`; page weight < 1.5 MB
excluding `lib/`.
