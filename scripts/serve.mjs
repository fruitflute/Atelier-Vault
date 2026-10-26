import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const built = process.argv.includes('--dist');
const root = fileURLToPath(new URL(built ? '../dist/' : '../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.md':'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 8000);
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const path = resolve(root, relative);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) ||
        !['index.html', 'app.js', 'styles.css', 'vendor/megajs-1.3.10.mjs', 'vendor/MEGAJS-LICENSE', 'studio/catalog.js', 'studio/core.js', 'studio/library.js', 'studio/ui.js', 'studio/studio.css', 'packs/example.json', 'packs/FORMAT.md', 'packs/AI-REQUEST.md', 'packs/schema.json'].includes(relative)) {
      res.writeHead(404).end(); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Atelier Vault: http://127.0.0.1:${port}`));
