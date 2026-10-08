// Fails if any relative import under lib/ points to a missing file.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
let bad = 0;
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk('lib').filter(f => f.endsWith('.js'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*['"](\.[^'"]+)['"]/g)) {
    if (!existsSync(resolve(dirname(f), m[1]))) { console.error(`${f}: missing ${m[1]}`); bad++; }
  }
}
process.exit(bad ? 1 : (console.log('imports ok'), 0));
