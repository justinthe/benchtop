#!/usr/bin/env bash
# Vendor pinned three.js + addons + fonts into lib/. Re-run to reproduce.
set -euo pipefail
THREE=0.186.1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
cd "$T"
npm pack "three@$THREE" "@fontsource/barlow-condensed" "@fontsource/inter" "@fontsource/jetbrains-mono" --silent >/dev/null
for f in *.tgz; do mkdir "x-${f%.tgz}"; tar xzf "$f" -C "x-${f%.tgz}"; done
P="x-three-$THREE/package"

# three core (unminified; GitHub Pages gzips)
cp "$P/build/three.module.js" "$P/build/three.core.js" "$ROOT/lib/"
cp "$P/LICENSE" "$ROOT/lib/THREE-LICENSE"

# addons: keep upstream folder layout so relative imports resolve
ADDONS="
controls/OrbitControls.js
postprocessing/EffectComposer.js postprocessing/RenderPass.js postprocessing/UnrealBloomPass.js
postprocessing/OutputPass.js postprocessing/SMAAPass.js postprocessing/GTAOPass.js
postprocessing/ShaderPass.js postprocessing/Pass.js postprocessing/MaskPass.js
shaders/CopyShader.js shaders/LuminosityHighPassShader.js shaders/OutputShader.js
shaders/SMAAShader.js shaders/GTAOShader.js shaders/PoissonDenoiseShader.js shaders/FXAAShader.js
renderers/CSS2DRenderer.js
environments/RoomEnvironment.js
geometries/RoundedBoxGeometry.js
utils/BufferGeometryUtils.js
math/SimplexNoise.js
"
for a in $ADDONS; do
  mkdir -p "$ROOT/lib/addons/$(dirname "$a")"
  cp "$P/examples/jsm/$a" "$ROOT/lib/addons/$a"
done

# fonts: latin woff2 + css
F="$ROOT/lib/fonts"; : > "$F/fonts.css"
font() { # pkg family weight
  local src=$(echo x-fontsource-$1-*/package/files/$1-latin-$3-normal.woff2)
  cp "$src" "$F/"
  printf "@font-face{font-family:'%s';font-weight:%s;font-style:normal;font-display:swap;src:url('%s-latin-%s-normal.woff2') format('woff2')}\n" "$2" "$3" "$1" "$3" >> "$F/fonts.css"
}
font barlow-condensed "Barlow Condensed" 600; font barlow-condensed "Barlow Condensed" 700
font inter Inter 400; font inter Inter 600
font jetbrains-mono "JetBrains Mono" 400; font jetbrains-mono "JetBrains Mono" 500
cp x-fontsource-inter-*/package/LICENSE "$F/OFL.txt"
echo "vendored three@$THREE"
