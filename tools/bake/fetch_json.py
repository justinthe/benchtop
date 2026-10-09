#!/usr/bin/env python3
"""Fetch a JSON (or CSV) source once, reduce it, and write <slug>/data.json with provenance.

  python3 -I tools/bake/fetch_json.py <url|file> -o <slug>/data.json --source "Publisher, dataset" [--select a.b.c]
      [--keep field1,field2] [--limit N] [--license "..."]

--select walks into the document (dots; integers index lists). --keep keeps only those fields of each record in a list.
CSV input (url or file ending .csv) becomes a list of records (numeric-looking cells become numbers). Records the URL, retrieval
date (UTC) and SHA-256 of the raw bytes. Stdlib only. Needs network for http(s) URLs; local paths and file:// work offline.
"""
import argparse, csv, datetime, hashlib, io, json, os, urllib.request

def fetch(src):
    if src.startswith(('http://', 'https://', 'file://')):
        req = urllib.request.Request(src, headers={'User-Agent': 'benchtop-bake/1'})
        with urllib.request.urlopen(req, timeout=30) as r: return r.read()
    with open(src, 'rb') as f: return f.read()

def num(v):
    try: return int(v)
    except ValueError:
        try: return float(v)
        except ValueError: return v

def parse(raw, src):
    text = raw.decode('utf-8-sig')
    if src.lower().split('?')[0].endswith('.csv'): return [{k: num(v) for k, v in row.items()} for row in csv.DictReader(io.StringIO(text))]
    return json.loads(text)

def select(doc, path):
    for part in (p for p in path.split('.') if p):
        doc = doc[int(part)] if isinstance(doc, list) else doc[part]
    return doc

def reduce(doc, keep=None, limit=None):
    if isinstance(doc, list):
        if keep: doc = [{k: r[k] for k in keep if k in r} for r in doc]
        if limit: doc = doc[:limit]
    return doc

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src'); ap.add_argument('-o', '--out', required=True); ap.add_argument('--source', required=True)
    ap.add_argument('--license', default=''); ap.add_argument('--select', default=''); ap.add_argument('--keep'); ap.add_argument('--limit', type=int)
    a = ap.parse_args(argv)
    raw = fetch(a.src)
    data = reduce(select(parse(raw, a.src), a.select), a.keep.split(',') if a.keep else None, a.limit)
    doc = {'kind': 'table' if isinstance(data, list) else 'json', 'data': data, 'source': a.source, 'license': a.license, 'url': a.src,
           'retrieved': datetime.datetime.now(datetime.timezone.utc).date().isoformat(), 'sha256': hashlib.sha256(raw).hexdigest()}
    with open(a.out, 'w') as f: json.dump(doc, f, separators=(',', ':'))
    print(f'wrote {a.out}: {len(json.dumps(data))//1024} KB of data from {a.src}')

if __name__ == '__main__': main()
