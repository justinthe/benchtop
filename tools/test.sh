#!/usr/bin/env bash
# Run every check: runtime logic, import closure, and each page's model.test.mjs.
set -e
cd "$(dirname "$0")/.."
node tools/check.mjs
node tools/check-imports.mjs
for t in */model.test.mjs; do [ -e "$t" ] && node "$t"; done
