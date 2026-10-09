---
title: Planet Scales
slug: planet-weights
type: data
tags: [astronomy, gravity, data]
---

# What would you weigh on the other planets?

Your mass is the same everywhere, but your weight is the pull of the planet under your feet. I want people to
pick their own mass and see, on a row of scales, what that same body would weigh on each of the eight planets.

**Data:** `data-src/planets.csv` (distance from the Sun, year length, radius, mass, surface gravity). Bake it with
`tools/bake/fetch_json.py` (a local CSV path works offline) into the page's `data.json` and credit the source on the
page. This is a **Data** page: one physical object per planet driven by the numbers, not a hand-made scene.

Ideas, not requirements:
- A bench with eight platform scales in a row; the dial or a column rises with the weight in newtons (also show the
  "kilograms-force" people expect, labelled clearly as the same thing in different units).
- A mass slider (30 to 120 kg). A switch between sorting the planets by distance from the Sun and by surface gravity.
- A second quantity on a screen: the length of that planet's year, since the table has it (Kepler: year grows with
  distance, faster than you'd think).
- Guided modes like "On Earth", "Lightest" (Mars or Mercury), "Heaviest" (Jupiter).

Physics to honour: weight = mass x surface gravity. The table's surface gravity must agree with g = G M / R^2
(G = 6.674e-11) using the same row's mass and radius, and each year length must obey Kepler's third law
(years^2 = AU^3) closely; both are good checks that the baked data was not mistyped. Jupiter's gravity is at the 1-bar
level (a gas giant has no surface); say so in the page's notes. Scale the visual heights honestly and say which scale
you used (Jupiter is about 6.7 times Mars).

Out of scope: moons, rotation, exact "standing" on gas giants, anything beyond the eight planets.
