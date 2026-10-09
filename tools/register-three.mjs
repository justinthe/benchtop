// node --import ./tools/register-three.mjs <script>: lets Node resolve the import-map names ('three', 'three/addons/') used by lib/*.js.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
const root = ${JSON.stringify(new URL('../lib/', import.meta.url).href)};
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: root + 'three.module.js', shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: root + 'addons/' + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}`));
