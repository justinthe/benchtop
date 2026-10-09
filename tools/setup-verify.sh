#!/usr/bin/env bash
# One-time: install playwright-core (no browser download) where tools/verify.mjs looks for it, outside the repo.
set -euo pipefail
D="${BENCHTOP_VERIFY_DIR:-$HOME/.cache/benchtop-verify}"
mkdir -p "$D" && cd "$D"
[ -f package.json ] || npm init -y >/dev/null
npm i playwright-core@1.49.1 --silent
for c in "${CHROME:-}" /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser; do [ -n "$c" ] && [ -x "$c" ] && { echo "browser: $c"; break; }; done || true
echo "verify deps ready in $D (tools/verify.mjs finds it automatically)"
