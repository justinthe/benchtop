#!/usr/bin/env python3
"""Bake a DEM grid into a small JSON heightfield for terrain pages.

  python3 -I tools/bake/heightmap.py <in.npz|in.npy|in.asc> -o <slug>/data.json --source "..." [--size 128]
      [--array elevation] [--origin LON,LAT --step DLON,DLAT] [--license "..."] [--crop c0,r0,c1,r1]

Inputs: .npz/.npy (2D array; georeference from keys xmin,ymin,xmax,ymax or --origin/--step), or ESRI ASCII grid (.asc).
For GeoTIFF run `gdal_translate -of AAIGrid in.tif out.asc` first. Stdlib only.
Output: { kind:'heightmap', w, h, unit:'m', min, max, values:[int metres, row-major, first row = north], origin:[lon,lat],
          step:[dlon,dlat] (after downsampling), cell_m:[east_m, north_m], source, license, baked, ... }
"""
import argparse, datetime, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import npy

R_EARTH = 6371008.8

def read_asc(path):
    head = {}
    with open(path) as f:
        for _ in range(6):
            pos = f.tell(); line = f.readline().split()
            if len(line) != 2 or not line[0].replace('_', '').isalpha(): f.seek(pos); break
            head[line[0].lower()] = float(line[1])
        rows = [[float(v) for v in ln.split()] for ln in f if ln.strip()]
    w, h = int(head['ncols']), int(head['nrows'])
    if len(rows) != h or any(len(r) != w for r in rows): raise ValueError('ASC rows do not match header')
    nd = head.get('nodata_value')
    cell = head.get('cellsize', head.get('dx'))
    x0 = head.get('xllcorner', head.get('xllcenter', 0)); y0 = head.get('yllcorner', head.get('yllcenter', 0))
    flat = [v for r in rows for v in r]
    return (h, w), flat, nd, (x0, y0 + cell * h), (cell, -cell)

def load(path, array_name=None, origin=None, step=None):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.asc':
        shape, flat, nd, org, st = read_asc(path)
        return shape, flat, nd, org, st
    arrs = npy.read_npz(path) if ext == '.npz' else {'a': npy.read_npy(open(path, 'rb').read())}
    name = array_name or ('elevation' if 'elevation' in arrs else next(k for k, (s, _) in arrs.items() if len(s) == 2))
    shape, flat = arrs[name]
    if len(shape) != 2: raise ValueError(f'array {name} is not 2D')
    org, st = origin, step
    if org is None and all(k in arrs for k in ('xmin', 'ymin', 'ymax', 'dx')):
        sc = lambda k: arrs[k][1][0]
        # matplotlib sample style: rows run from ymin (top) to ymax (bottom); decide direction from the values
        top = max(sc('ymin'), sc('ymax')); org = (sc('xmin'), top); st = (sc('dx'), -abs(sc('dy')))
    if org is None or st is None: raise ValueError('no georeference: pass --origin LON,LAT and --step DLON,DLAT')
    return shape, flat, None, org, st

def downsample(shape, flat, nodata, target):
    h, w = shape; k = max(1, math.ceil(max(h, w) / target))
    H, W = h // k, w // k
    out = []
    for r in range(H):
        for c in range(W):
            s = n = 0
            for rr in range(r * k, r * k + k):
                base = rr * w
                for cc in range(c * k, c * k + k):
                    v = flat[base + cc]
                    if nodata is not None and v == nodata: continue
                    s += v; n += 1
            out.append(s / n if n else None)
    return (H, W), out, k

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input'); ap.add_argument('-o', '--out', required=True); ap.add_argument('--source', required=True)
    ap.add_argument('--license', default=''); ap.add_argument('--size', type=int, default=128)
    ap.add_argument('--array'); ap.add_argument('--origin'); ap.add_argument('--step'); ap.add_argument('--crop')
    a = ap.parse_args(argv)
    pair = lambda s: tuple(float(x) for x in s.split(',')) if s else None
    shape, flat, nd, (lon0, lat0), (dlon, dlat) = load(a.input, a.array, pair(a.origin), pair(a.step))
    if a.crop:
        c0, r0, c1, r1 = (int(x) for x in a.crop.split(',')); h, w = shape
        flat = [flat[r * w + c] for r in range(r0, r1) for c in range(c0, c1)]; shape = (r1 - r0, c1 - c0)
        lon0 += c0 * dlon; lat0 += r0 * dlat
    (H, W), vals, k = downsample(shape, flat, nd, a.size)
    if any(v is None for v in vals): raise ValueError('grid has nodata holes after downsampling; crop them out')
    vals = [int(round(v)) for v in vals]
    step = [dlon * k, dlat * k]; latc = lat0 + dlat * k * H / 2
    cell_m = [abs(step[0]) * math.pi / 180 * R_EARTH * math.cos(math.radians(latc)), abs(step[1]) * math.pi / 180 * R_EARTH]
    doc = {'kind': 'heightmap', 'w': W, 'h': H, 'unit': 'm', 'min': min(vals), 'max': max(vals), 'values': vals,
           'origin': [lon0, lat0], 'step': step, 'cell_m': [round(cell_m[0], 1), round(cell_m[1], 1)],
           'source': a.source, 'license': a.license, 'input': os.path.basename(a.input), 'downsample': k,
           'baked': datetime.date.today().isoformat()}
    with open(a.out, 'w') as f: json.dump(doc, f, separators=(',', ':'))
    print(f'wrote {a.out}: {W}x{H}, {min(vals)}..{max(vals)} m, cell {cell_m[0]:.0f} x {cell_m[1]:.0f} m, {os.path.getsize(a.out)//1024} KB')

if __name__ == '__main__': main()
