#!/usr/bin/env python3
"""Bake GeoJSON into compact local-metre vectors for 3D pages.

  python3 -I tools/bake/geojson.py <in.geojson> -o <slug>/data.json --source "..." [--tolerance 10] [--center LON,LAT]
      [--keep name,kind] [--license "..."]

Projects lon/lat to metres east (x) and north (y) of the centre (equirectangular; fine at city/valley scale), simplifies lines and
polygon rings with Douglas-Peucker (tolerance in metres), and rounds to 0.1 m. Handles Point, MultiPoint, LineString,
MultiLineString, Polygon, MultiPolygon. Stdlib only.
Output: { kind:'vector', unit:'m', origin:[lon,lat], bbox_m:[x0,y0,x1,y1], features:[{ id, type:'point'|'line'|'polygon', props, coords }],
          source, license, baked }  (coords: point [x,y]; line [[x,y]..]; polygon [ring, ring..] with the first ring the outer boundary)
"""
import argparse, datetime, json, math, os

R_EARTH = 6371008.8

def project(lon, lat, lon0, lat0):
    return (math.radians(lon - lon0) * R_EARTH * math.cos(math.radians(lat0)), math.radians(lat - lat0) * R_EARTH)

def _perp(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b; dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0: return math.hypot(x - x1, y - y1)
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)

def simplify(pts, tol):
    """Douglas-Peucker (iterative, so long lines cannot hit the recursion limit); keeps both endpoints."""
    if len(pts) < 3 or tol <= 0: return list(pts)
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop(); dmax, k = 0.0, -1
        for m in range(i + 1, j):
            d = _perp(pts[m], pts[i], pts[j])
            if d > dmax: dmax, k = d, m
        if k >= 0 and dmax > tol: keep[k] = True; stack += [(i, k), (k, j)]
    return [p for p, kp in zip(pts, keep) if kp]

def _ring(ring, o, tol):
    pts = simplify([project(x, y, *o) for x, y, *_ in ring], tol)
    if len(pts) > 2 and pts[0] == pts[-1]: pts = pts[:-1]      # open ring; consumers close it
    return [[round(x, 1), round(y, 1)] for x, y in pts] if len(pts) >= 3 else None

def convert(gj, origin=None, tol=10.0, keep=None):
    feats = gj['features'] if gj.get('type') == 'FeatureCollection' else [gj] if gj.get('type') == 'Feature' else [{'type': 'Feature', 'geometry': gj, 'properties': {}}]
    allpts = []
    def walk(c):
        if c and isinstance(c[0], (int, float)): allpts.append(c)
        else: [walk(x) for x in c]
    for f in feats:
        if f.get('geometry'): walk(f['geometry']['coordinates'])
    if not allpts: raise ValueError('no coordinates')
    lons, lats = [p[0] for p in allpts], [p[1] for p in allpts]
    o = origin or ((min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2)
    out = []
    for i, f in enumerate(feats):
        g = f.get('geometry')
        if not g: continue
        t, c = g['type'], g['coordinates']
        props = {k: v for k, v in (f.get('properties') or {}).items() if isinstance(v, (str, int, float, bool)) and (keep is None or k in keep)}
        def add(kind, coords): out.append({'id': len(out), 'type': kind, 'props': props, 'coords': coords})
        if t == 'Point': add('point', [round(v, 1) for v in project(c[0], c[1], *o)])
        elif t == 'MultiPoint': [add('point', [round(v, 1) for v in project(p[0], p[1], *o)]) for p in c]
        elif t in ('LineString', 'MultiLineString'):
            for line in ([c] if t == 'LineString' else c):
                pts = simplify([project(x, y, *o) for x, y, *_ in line], tol)
                if len(pts) >= 2: add('line', [[round(x, 1), round(y, 1)] for x, y in pts])
        elif t in ('Polygon', 'MultiPolygon'):
            for poly in ([c] if t == 'Polygon' else c):
                rings = [r for r in (_ring(rg, o, tol) for rg in poly) if r]
                if rings: add('polygon', rings)
    xs = [p[0] for f in out for p in (f['coords'] if f['type'] == 'line' else [f['coords']] if f['type'] == 'point' else [q for r in f['coords'] for q in r])]
    ys = [p[1] for f in out for p in (f['coords'] if f['type'] == 'line' else [f['coords']] if f['type'] == 'point' else [q for r in f['coords'] for q in r])]
    return {'kind': 'vector', 'unit': 'm', 'origin': [round(o[0], 6), round(o[1], 6)], 'bbox_m': [min(xs), min(ys), max(xs), max(ys)], 'features': out}

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input'); ap.add_argument('-o', '--out', required=True); ap.add_argument('--source', required=True)
    ap.add_argument('--license', default=''); ap.add_argument('--tolerance', type=float, default=10.0)
    ap.add_argument('--center'); ap.add_argument('--keep')
    a = ap.parse_args(argv)
    doc = convert(json.load(open(a.input)), tuple(float(x) for x in a.center.split(',')) if a.center else None, a.tolerance, set(a.keep.split(',')) if a.keep else None)
    doc.update(source=a.source, license=a.license, input=os.path.basename(a.input), baked=datetime.date.today().isoformat())
    with open(a.out, 'w') as f: json.dump(doc, f, separators=(',', ':'))
    print(f'wrote {a.out}: {len(doc["features"])} features, {os.path.getsize(a.out)//1024} KB')

if __name__ == '__main__': main()
