// node tools/meta.mjs <slug> "<title>" "<kicker>" <type> <tag,tag,...>
// Writes <slug>/meta.json (feeds the v2 gallery). Hashes topics/<slug>.md when it exists.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const [slug, title, kicker, type, tags = ''] = process.argv.slice(2);
const TYPES = ['explainer', 'world', 'data', 'play'];
if (!/^[a-z0-9-]+$/.test(slug || '') || !title || !kicker || !TYPES.includes(type) || !existsSync(slug)) {
  console.error('usage: node tools/meta.mjs <slug> "<title>" "<kicker>" <explainer|world|data|play> <tag,tag>  (<slug>/ must exist)'); process.exit(1);
}
const src = `topics/${slug}.md`, meta = { slug, title, kicker, type, tags: tags.split(',').filter(Boolean), created: new Date().toISOString().slice(0, 10) };
if (existsSync(src)) { meta.source = src; meta.sourceSha256 = createHash('sha256').update(readFileSync(src)).digest('hex'); }
// keep the original creation date on re-runs
if (existsSync(`${slug}/meta.json`)) { try { meta.created = JSON.parse(readFileSync(`${slug}/meta.json`, 'utf8')).created || meta.created; } catch { /* rewrite */ } }
writeFileSync(`${slug}/meta.json`, JSON.stringify(meta, null, 2) + '\n');
console.log(`wrote ${slug}/meta.json`);
