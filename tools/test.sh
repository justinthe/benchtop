#!/usr/bin/env bash
# Run every check: runtime logic, import closure, and each page's model.test.mjs.
set -e
cd "$(dirname "$0")/.."
# lib files are ES modules: check them as modules (a plain `node --check` would parse them as scripts)
for f in lib/*.js; do node --experimental-default-type=module --check "$f" 2>/dev/null || { echo "syntax error in $f"; node --experimental-default-type=module --check "$f"; exit 1; }; done
echo 'lib syntax ok'
node tools/check.mjs
node tools/check-imports.mjs
node tools/check-geo.mjs
node --import ./tools/register-three.mjs tools/check-kit.mjs
python3 -I -m unittest discover -s tools/bake -t tools/bake >/dev/null 2>/tmp/bake-test.log || { cat /tmp/bake-test.log; exit 1; }
echo 'bake ok'
for t in */model.test.mjs; do [ -e "$t" ] && node "$t"; done
