// node tools/meta.mjs <slug> "<title>" "<kicker>" <type> <tag,tag,...>
// Writes <slug>/meta.json, then rebuilds works.json (the gallery list). Hashes topics/<slug>.md when it exists.
// node tools/meta.mjs   (no args) only rebuilds works.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const [slug, title, kicker, type, tags = ''] = process.argv.slice(2);
const TYPES = ['explainer', 'world', 'data', 'play'];
if (slug === undefined) { works(); process.exit(0); }
if (!/^[a-z0-9-]+$/.test(slug || '') || !title || !kicker || !TYPES.includes(type) || !existsSync(slug)) {
  console.error('usage: node tools/meta.mjs <slug> "<title>" "<kicker>" <explainer|world|data|play> <tag,tag>  (<slug>/ must exist)'); process.exit(1);
}
const src = `topics/${slug}.md`, meta = { slug, title, kicker, type, tags: tags.split(',').filter(Boolean), created: new Date().toISOString().slice(0, 10) };
if (existsSync(src)) { meta.source = src; meta.sourceSha256 = createHash('sha256').update(readFileSync(src)).digest('hex'); }
// keep the original creation date on re-runs
if (existsSync(`${slug}/meta.json`)) { try { meta.created = JSON.parse(readFileSync(`${slug}/meta.json`, 'utf8')).created || meta.created; } catch { /* rewrite */ } }
writeFileSync(`${slug}/meta.json`, JSON.stringify(meta, null, 2) + '\n');
console.log(`wrote ${slug}/meta.json`);
works();

// works.json = every <dir>/meta.json plus the page's <meta name="description">, newest first
function works() {
  const list = readdirSync('.', { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(`${d.name}/meta.json`) && existsSync(`${d.name}/index.html`))
    .map(d => {
      const { slug, title, kicker, type, tags, created } = JSON.parse(readFileSync(`${d.name}/meta.json`, 'utf8'));
      const desc = readFileSync(`${d.name}/index.html`, 'utf8').match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
      return { slug, title, kicker, type, tags, created, desc };
    })
    .sort((a, b) => b.created.localeCompare(a.created) || a.title.localeCompare(b.title));
  writeFileSync('works.json', JSON.stringify(list, null, 2) + '\n');
  console.log(`wrote works.json (${list.length} pages)`);
}
