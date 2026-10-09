"""Offline tests for the bake tools (stdlib only): python3 -I -m unittest discover -s tools/bake"""
import http.server, io, json, math, os, sys, tempfile, threading, unittest, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import npy, heightmap, geojson, fetch_json

def run(mod, *args):
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, 'o.json'); mod.main(list(args) + ['-o', out]); return json.load(open(out))

class NpyTests(unittest.TestCase):
    def test_roundtrip_types(self):
        for code, vals in [('i2', [1, -2, 3, 4, 5, 6]), ('f4', [1.5, 2.5, -3.5, 4.5, 5.5, 6.5]), ('f8', [0.1] * 6), ('u1', [0, 255, 1, 2, 3, 4])]:
            shape, flat = npy.read_npy(npy.write_npy((2, 3), vals, code))
            self.assertEqual(shape, (2, 3)); self.assertEqual(len(flat), 6); self.assertAlmostEqual(flat[1], vals[1], places=5)
    def test_bad_magic(self):
        with self.assertRaises(ValueError): npy.read_npy(b'not numpy')

class HeightmapTests(unittest.TestCase):
    def make_npz(self, d, rows=8, cols=12):
        p = os.path.join(d, 'dem.npz'); vals = [r * 10 + c for r in range(rows) for c in range(cols)]
        with zipfile.ZipFile(p, 'w') as z:
            z.writestr('elevation.npy', npy.write_npy((rows, cols), vals, 'i2'))
            for k, v in dict(xmin=-84.0, xmax=-83.9, ymin=36.5, ymax=36.4, dx=.01, dy=.01).items(): z.writestr(k + '.npy', npy.write_npy((), [v], 'f8'))
        return p, vals
    def test_npz_bake_and_downsample(self):
        with tempfile.TemporaryDirectory() as d:
            p, vals = self.make_npz(d)
            doc = run(heightmap, p, '--source', 'test', '--size', '6')
            self.assertEqual((doc['w'], doc['h']), (6, 4)); self.assertEqual(len(doc['values']), 24)
            self.assertEqual(doc['downsample'], 2); self.assertEqual(doc['origin'], [-84.0, 36.5])
            self.assertLess(doc['step'][1], 0)                       # first row is north
            self.assertEqual(doc['values'][0], round((vals[0] + vals[1] + vals[12] + vals[13]) / 4))
            self.assertEqual((doc['min'], doc['max']), (min(doc['values']), max(doc['values'])))
            self.assertAlmostEqual(doc['cell_m'][1], 2 * .01 * math.pi / 180 * 6371008.8, delta=1)
    def test_no_downsample_when_small(self):
        with tempfile.TemporaryDirectory() as d:
            p, vals = self.make_npz(d); doc = run(heightmap, p, '--source', 't', '--size', '128')
            self.assertEqual(doc['values'], vals); self.assertEqual(doc['downsample'], 1)
    def test_asc_with_nodata_and_crop(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'g.asc')
            open(p, 'w').write('ncols 4\nnrows 3\nxllcorner 10\nyllcorner 20\ncellsize 1\nNODATA_value -9999\n1 2 3 4\n5 6 7 8\n9 10 11 12\n')
            doc = run(heightmap, p, '--source', 't', '--crop', '1,0,4,3')
            self.assertEqual((doc['w'], doc['h']), (3, 3)); self.assertEqual(doc['values'], [2, 3, 4, 6, 7, 8, 10, 11, 12])
            self.assertEqual(doc['origin'], [11.0, 23.0])
    def test_missing_georef_errors(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'x.npy'); open(p, 'wb').write(npy.write_npy((2, 2), [1, 2, 3, 4], 'f8'))
            with self.assertRaises(ValueError): run(heightmap, p, '--source', 't')

GJ = {'type': 'FeatureCollection', 'features': [
    {'type': 'Feature', 'properties': {'name': 'River', 'class': 'water', 'junk': {'a': 1}},
     'geometry': {'type': 'LineString', 'coordinates': [[0, 0], [0.001, 0.00001], [0.002, 0], [0.003, 0.00001], [0.004, 0]]}},
    {'type': 'Feature', 'properties': {'name': 'Park'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[0, 0], [0.002, 0], [0.002, 0.002], [0, 0.002], [0, 0]]]}},
    {'type': 'Feature', 'properties': {'name': 'Town'}, 'geometry': {'type': 'Point', 'coordinates': [0.001, 0.001]}}]}

class GeojsonTests(unittest.TestCase):
    def bake(self, **kw): return geojson.convert(GJ, origin=(0, 0), **kw)
    def test_projection_scale(self):
        x, y = geojson.project(0.001, 0.001, 0, 0)
        self.assertAlmostEqual(x, 111.19, delta=.05); self.assertAlmostEqual(y, 111.19, delta=.05)
        self.assertAlmostEqual(geojson.project(0.001, 0, 0, 60)[0], 111.19 * math.cos(math.radians(60)), delta=.05)
    def test_types_props_and_ring_open(self):
        d = self.bake(tol=0); types = [f['type'] for f in d['features']]
        self.assertEqual(types, ['line', 'polygon', 'point'])
        self.assertEqual(d['features'][0]['props'], {'name': 'River', 'class': 'water'})   # nested props dropped
        self.assertEqual(len(d['features'][1]['coords'][0]), 4)                            # closing vertex removed
    def test_simplify_keeps_endpoints_and_drops_wiggle(self):
        d = self.bake(tol=5.0); line = d['features'][0]['coords']
        self.assertEqual(len(line), 2); self.assertEqual(line[0], [0.0, 0.0]); self.assertAlmostEqual(line[-1][0], 444.8, delta=.5)
        self.assertEqual(len(self.bake(tol=0.0)['features'][0]['coords']), 5)
    def test_douglas_peucker_corner_survives(self):
        pts = [(0, 0), (50, 0.5), (100, 0), (100, 50), (100, 100)]
        out = geojson.simplify(pts, 5); self.assertIn((100, 0), out); self.assertNotIn((50, 0.5), out)
    def test_long_line_no_recursion_error(self):
        pts = [(i, (i % 2) * 0.1) for i in range(20000)]; self.assertEqual(len(geojson.simplify(pts, 1.0)), 2)
    def test_bbox_and_keep(self):
        d = geojson.convert(GJ, tol=0, keep={'name'}); self.assertEqual(d['features'][0]['props'], {'name': 'River'})
        self.assertLess(d['bbox_m'][0], d['bbox_m'][2])
    def test_empty_errors(self):
        with self.assertRaises(ValueError): geojson.convert({'type': 'FeatureCollection', 'features': []})

class FetchTests(unittest.TestCase):
    def test_local_json_select_keep_and_provenance(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'a.json'); json.dump({'meta': {}, 'rows': [{'a': 1, 'b': 2, 'c': 3}, {'a': 4, 'b': 5, 'c': 6}]}, open(p, 'w'))
            doc = run(fetch_json, p, '--source', 'x', '--select', 'rows', '--keep', 'a,c')
            self.assertEqual(doc['data'], [{'a': 1, 'c': 3}, {'a': 4, 'c': 6}]); self.assertEqual(doc['kind'], 'table')
            self.assertEqual(len(doc['sha256']), 64); self.assertRegex(doc['retrieved'], r'^\d{4}-\d\d-\d\d$')
    def test_csv_numbers_over_http(self):
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, 't.csv'), 'w').write('name,x,y\nA,1,2.5\nB,3,4\n')
            h = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=d, **k)
            srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h); threading.Thread(target=srv.serve_forever, daemon=True).start()
            try:
                doc = run(fetch_json, f'http://127.0.0.1:{srv.server_address[1]}/t.csv', '--source', 's')
            finally: srv.shutdown()
            self.assertEqual(doc['data'], [{'name': 'A', 'x': 1, 'y': 2.5}, {'name': 'B', 'x': 3, 'y': 4}])

if __name__ == '__main__': unittest.main()
