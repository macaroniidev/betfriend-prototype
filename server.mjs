// BetFriend web server.
//   /           landing page (public/landing)
//   /app/       the BetFriend app (public/index.html + public/js, public/css)
//   /admin      owner login + visual editor (added by server/admin.mjs when a database is configured)
// Run: node server.mjs   (reads .env in this folder for local dev; PORT default 4400, HOST default 127.0.0.1)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
loadDotEnv(join(here, '.env'));

const pub = join(here, 'public');
const port = Number(process.env.PORT || 4400);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

// Optional dynamic layer (admin, editor, content API). Loaded only when a database is configured.
let dynamic = null;
if (process.env.DATABASE_URL && existsSync(join(here, 'server', 'admin.mjs'))) {
  dynamic = await (await import('./server/admin.mjs')).createAdmin({ root: here, pub });
}

/** Map a URL path to a file under public/, or null. */
function resolveStatic(path) {
  if (path === '/' || path === '/index.html') return join(pub, 'landing', 'index.html');
  if (path === '/app/' || path === '/app/index.html') return join(pub, 'index.html');
  if (path.startsWith('/app/')) return join(pub, path.slice(5));
  return join(pub, 'landing', path.slice(1));
}

async function sendFile(res, file, status = 200, extraHeaders = {}) {
  const body = await readFile(file);
  const type = types[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': type.startsWith('text/html') ? 'no-store' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let path = decodeURIComponent(url.pathname);
    if (path === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    if (path === '/landing' || path === '/landing/' || path === '/landing/index.html') { res.writeHead(301, { Location: '/' + url.search }); return res.end(); }
    if (path === '/app') { res.writeHead(301, { Location: '/app/' + url.search }); return res.end(); }

    if (dynamic && await dynamic.handle(req, res, url)) return;
    // Admin files are only served through /admin (with login checks), never as plain static files.
    if (path.startsWith('/app/admin') || path.startsWith('/admin')) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }

    path = normalize(path).replaceAll('\\', '/');
    if (path.includes('..')) throw Object.assign(new Error('bad path'), { status: 400 });
    let file = resolveStatic(path);
    if (!file.startsWith(pub + sep) && file !== pub) throw Object.assign(new Error('bad path'), { status: 400 });
    let s = await stat(file).catch(() => null);
    if (s?.isDirectory()) { file = join(file, 'index.html'); s = await stat(file).catch(() => null); }
    if (!s) {
      // Unknown /app/* paths fall back to the app shell (hash router); anything else is a 404.
      if (path.startsWith('/app/') && !extname(path)) return sendFile(res, join(pub, 'index.html'));
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found');
    }
    if (dynamic && file.endsWith('.html')) return dynamic.sendPage(req, res, url, file);
    return sendFile(res, file);
  } catch (err) {
    if (!res.headersSent) res.writeHead(err.status || 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(err.status ? err.message : 'Server error');
    if (!err.status) console.error(err);
  }
});
server.listen(port, host, () => console.log(`BetFriend: http://${host}:${port}/  (app: /app/)`));

function loadDotEnv(file) {
  if (process.env.NODE_ENV === 'production' || !existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2].trim() && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

