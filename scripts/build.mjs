import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const at = path => new URL(path, root);
const upstream = await readFile(at('node_modules/megajs/dist/main.browser-es.mjs'));
const vendored = await readFile(at('vendor/megajs-1.3.10.mjs'));
if (!upstream.equals(vendored)) throw new Error('Vendored MEGAJS differs from the locked npm package');
console.log('MEGAJS SHA-256:', createHash('sha256').update(vendored).digest('hex'));
await rm(at('dist/'), { recursive: true, force: true });
await mkdir(at('dist/'));
for (const file of ['index.html', 'app.js', 'viewer.js', 'mega-tree.js', 'sync-diagnostics.js', 'styles.css', '.nojekyll', 'vendor', 'studio', 'packs']) {
  await cp(at(file), at(`dist/${file}`), { recursive: true });
}
console.log('Static site built in dist/');
