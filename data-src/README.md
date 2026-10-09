# data-src: raw inputs for baked data

Raw source files that `tools/bake/*` turn into `<slug>/data.json`. Kept so a bake can be repeated. Each entry records where it came from.

| File | What | Origin | Licence |
|---|---|---|---|
| `jacksboro_fault_dem.npz` | Digital elevation model, 344 x 403 cells (int16, metres), 3 arc-second (about 90 m) spacing, bounding box 36.43 to 36.73 N, 84.41 to 84.08 W (East Tennessee, USA) | USGS elevation data, as distributed in matplotlib's `sample_data` (`jacksboro_fault_dem.npz`, used by its hillshading examples) | US Government work (public domain); redistributed with matplotlib under its licence |

| `planets.csv` | The eight planets: semi-major axis (AU), orbital period (years), equatorial radius (km; the 1-bar level for the gas giants), mass (10^24 kg), surface gravity (m/s^2) | **Transcribed by the assistant from memory of NASA's Planetary Fact Sheet** (nssdc.gsfc.nasa.gov/planetary/factsheet). There was no internet to check it against the source. It is protected by cross-checks in the page's tests (g = GM/R^2 within 1 %, Kepler's third law T^2 = a^3 within 2 %). **A human should verify it against the NASA sheet before publishing.** | NASA data, public domain |

Bake example: `python3 -I tools/bake/heightmap.py data-src/jacksboro_fault_dem.npz -o <slug>/data.json --size 128 --source "USGS 3-arc-second DEM (via matplotlib sample data)"`.
Offline sandbox note: files here were copied from the local machine, not downloaded; nothing in this folder was fetched live.
