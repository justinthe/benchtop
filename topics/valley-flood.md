---
title: Valley Flood
slug: valley-flood
type: world
tags: [gis, terrain, hydrology]
---

# How a valley floods

Raise the water in a real landscape and watch where it goes. Water does not fill the map evenly: it fills the
lowest valley first, stays behind a ridge until the level passes the lowest point of that ridge, then pours over and
suddenly claims much more land. I want people to feel that jump.

**Data:** a real digital elevation model, `data-src/jacksboro_fault_dem.npz` (USGS 3-arc-second elevation, East
Tennessee, bounding box about 36.43 to 36.73 N, 84.41 to 84.08 W). Bake it with `tools/bake/heightmap.py` into the
page's `data.json` and credit USGS and the source on the page. Do not invent place names that are not in the data;
use longitude and latitude, "highest point" and "lowest point".

**Scene:** a tilted diorama of the terrain on a plinth, relief exaggerated (say how much), optional contour lines at
round elevations, and a translucent water layer that follows the model: the cells at or below the chosen water level
that are connected to the lowest valley floor (a connected fill, not a flat bathtub, so a basin behind a ridge stays
dry until the level passes its rim). Show the **flooded area in km2** as a stat chip, and the water level in metres.

**Interactions:** a water level slider covering the full elevation range of the data; a toggle for contour lines;
hotspots (info labels) on the highest point and the lowest point with their real elevation and longitude/latitude.
Guided modes that show the story: low water (just the river valley), the level just below where it spills, just
above it (the jump), and a high level.

Physics and data to honour: the flooded set is cells with elevation <= level 4-connected to the lowest cell; area =
cell count x cell size (the data's cell is not square: about 298 m by 371 m after baking at 128). Cell sizes, bounding
box and elevation range come from the baked data. State in the page notes that the DEM is coarse (about 90 m before
downsampling), so this shows the idea, not a flood-risk map.

Out of scope: rainfall, river flow, dams (no real reservoirs are modelled), and any claim about real flood levels.
