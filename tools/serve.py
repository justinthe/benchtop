#!/usr/bin/env python3
"""Dev server: static files (no cache) + POST /__thumb/<slug> writes <slug>/thumb.jpg. Localhost only."""
import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SLUG = re.compile(r'^/__thumb/([a-z0-9-]+)$')
ORIGIN = re.compile(r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$')

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def do_POST(self):
        m = SLUG.match(urlparse(self.path).path)
        origin = self.headers.get('Origin', '')
        n = int(self.headers.get('Content-Length', 0))
        d = os.path.join(ROOT, m.group(1)) if m else ''
        if not m or (origin and not ORIGIN.match(origin)) or n <= 0 or n > 2_000_000 or not os.path.isdir(d):
            self.send_error(400); return
        with open(os.path.join(d, 'thumb.jpg'), 'wb') as f: f.write(self.rfile.read(n))
        self.send_response(204); self.end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
