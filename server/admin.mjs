// Admin + content layer: owner login, the visual editor, drafts, publishing, version history, uploads.
// Pages are served with the published content applied (live), the draft (preview) or the draft plus
// the editor (edit). Only a logged-in owner can see drafts, the editor, or call any write endpoint.
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { q, migrate } from './db.mjs';
import * as auth from './auth.mjs';
import { cleanLanding, cleanApp } from './sanitize.mjs';
import { composeLanding, codeBlocks } from './landing.mjs';

const PAGES = { landing: cleanLanding, app: cleanApp };
const MAX_JSON = 2 * 1024 * 1024;
const MAX_UPLOAD = 8 * 1024 * 1024;
const IMG = { png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], gif: [0x47, 0x49, 0x46, 0x38], webp: [0x52, 0x49, 0x46, 0x46] };
const MIME = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export async function createAdmin({ root, pub }) {
  await migrate();
  await auth.syncAdminFromEnv();
  const uploadDir = resolve(root, process.env.UPLOAD_DIR || './uploads');
  await mkdir(uploadDir, { recursive: true });
  const adminDir = join(pub, 'admin');
  const landingFile = join(pub, 'landing', 'index.html');
  const appFile = join(pub, 'index.html');

  // Published content is cached in memory and refreshed on every publish/restore.
  let published = null;
  async function getPublished() {
    if (!published) {
      const { rows } = await q('select page, published from bf_pages');
      published = Object.fromEntries(rows.map((r) => [r.page, r.published]));
    }
    return published;
  }
  async function getDraft(page) {
    const { rows } = await q('select draft, published from bf_pages where page = $1', [page]);
    return rows[0]?.draft ?? rows[0]?.published ?? null;
  }

  const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  async function currentAdmin(req) {
    const tok = auth.readCookie(req, auth.COOKIE);
    return tok ? auth.sessionFromToken(tok).catch(() => null) : null;
  }
  const audit = (who, action, detail, ip) => q('insert into bf_audit (who, action, detail, ip) values ($1,$2,$3,$4)', [who, action, detail || null, ip]).catch(() => {});

  function json(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(JSON.stringify(body));
  }
  async function readBody(req, limit) {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('Too large'), { status: 413 }); chunks.push(c); }
    return Buffer.concat(chunks);
  }
  const readJson = async (req) => { try { return JSON.parse((await readBody(req, MAX_JSON)).toString('utf8') || '{}'); } catch (e) { if (e.status) throw e; throw Object.assign(new Error('Bad JSON'), { status: 400 }); } };

  /** Write requests must come from our own pages (custom header + same origin): blocks cross-site forms. */
  function sameOrigin(req) {
    if (req.headers['x-bf-admin'] !== '1') return false;
    const origin = req.headers.origin;
    if (!origin) return true;
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }

  async function sendAdminFile(res, name, { status = 200 } = {}) {
    const file = join(adminDir, name);
    if (!file.startsWith(adminDir + sep)) return json(res, 400, { error: 'bad path' });
    const body = await readFile(file).catch(() => null);
    if (!body) return json(res, 404, { error: 'not found' });
    const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream';
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'same-origin' });
    res.end(body);
  }

  // Public assets of the login page; everything else under /admin needs a session.
  const PUBLIC_ADMIN = new Set(['login.js', 'admin.css']);

  async function handle(req, res, url) {
    const path = url.pathname;

    // Uploaded images (public, read-only).
    if (path.startsWith('/uploads/')) {
      const name = path.slice('/uploads/'.length);
      if (!/^[a-z0-9]+\.(png|jpg|gif|webp)$/.test(name)) { res.writeHead(404); res.end(); return true; }
      const body = await readFile(join(uploadDir, name)).catch(() => null);
      if (!body) { res.writeHead(404); res.end(); return true; }
      res.writeHead(200, { 'Content-Type': MIME[name.split('.').pop()], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" });
      res.end(body); return true;
    }

    if (path !== '/admin' && !path.startsWith('/admin/')) return false;
    const ip = ipOf(req);

    // ---- auth API ----
    if (path === '/admin/api/login' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'Forbidden' }), true;
      const body = await readJson(req);
      const user = String(body.username || '').trim().toLowerCase().slice(0, 64);
      const wait = auth.loginBlocked(ip, user);
      if (wait) return json(res, 429, { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minutes.` }, { 'Retry-After': String(wait) }), true;
      const r = await auth.login(user, String(body.password || '').slice(0, 200), { ip, userAgent: req.headers['user-agent'] });
      if (!r) { auth.noteFailure(ip, user); audit(user, 'login_failed', null, ip); return json(res, 401, { error: 'Wrong username or password.' }), true; }
      auth.clearFailures(ip); audit(r.admin.username, 'login', null, ip);
      return json(res, 200, { ok: true, user: r.admin.username }, { 'Set-Cookie': auth.sessionCookie(req, r.token) }), true;
    }
    if (path === '/admin/api/logout' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'Forbidden' }), true;
      await auth.logout(auth.readCookie(req, auth.COOKIE));
      return json(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie(req) }), true;
    }

    const admin = await currentAdmin(req);

    // ---- pages ----
    if (path === '/admin' || path === '/admin/') {
      return sendAdminFile(res, admin ? 'editor.html' : 'login.html'), true;
    }
    if (path === '/admin/login') return sendAdminFile(res, 'login.html'), true;
    if (path.startsWith('/admin/assets/')) {
      const name = path.slice('/admin/assets/'.length);
      if (!/^[a-z0-9-]+\.(js|css|svg)$/.test(name)) return json(res, 404, { error: 'not found' }), true;
      if (!admin && !PUBLIC_ADMIN.has(name)) return json(res, 401, { error: 'Login required' }), true;
      return sendAdminFile(res, name), true;
    }

    // ---- everything below needs a logged-in owner ----
    if (!path.startsWith('/admin/api/')) return json(res, 404, { error: 'not found' }), true;
    if (!admin) return json(res, 401, { error: 'Login required' }), true;
    if (req.method !== 'GET' && !sameOrigin(req)) return json(res, 403, { error: 'Forbidden' }), true;
    const route = path.slice('/admin/api/'.length);

    if (route === 'me') return json(res, 200, { user: admin.username }), true;

    if (route === 'state' && req.method === 'GET') {
      const { rows } = await q('select page, draft, published, draft_updated_at, published_at from bf_pages');
      const by = Object.fromEntries(rows.map((r) => [r.page, r]));
      const landingHtml = await readFile(landingFile, 'utf8');
      const pages = {};
      for (const p of Object.keys(PAGES)) {
        const r = by[p];
        pages[p] = {
          draft: r?.draft ?? r?.published ?? null,
          hasUnpublished: !!r?.draft && JSON.stringify(r.draft) !== JSON.stringify(r.published),
          publishedAt: r?.published_at, draftSavedAt: r?.draft_updated_at,
        };
      }
      pages.landing.codeBlocks = codeBlocks(landingHtml).map((b) => ({ id: b.id, label: blockLabel(b.html, b.id) }));
      return json(res, 200, { user: admin.username, pages }), true;
    }

    let m;
    if ((m = route.match(/^draft\/(landing|app)$/)) && req.method === 'PUT') {
      const doc = PAGES[m[1]](await readJson(req));
      await q(`insert into bf_pages (page, draft, draft_updated_at) values ($1, $2, now())
               on conflict (page) do update set draft = excluded.draft, draft_updated_at = now()`, [m[1], doc]);
      return json(res, 200, { ok: true, savedAt: new Date().toISOString() }), true;
    }
    if ((m = route.match(/^draft\/(landing|app)$/)) && req.method === 'DELETE') {
      await q('update bf_pages set draft = published, draft_updated_at = now() where page = $1', [m[1]]);
      audit(admin.username, 'discard_draft', { page: m[1] }, ip);
      return json(res, 200, { ok: true }), true;
    }
    if (route === 'publish' && req.method === 'POST') {
      const body = await readJson(req);
      const note = String(body.note || '').slice(0, 200) || null;
      const done = [];
      for (const page of Object.keys(PAGES)) {
        const { rows } = await q('select draft, published from bf_pages where page = $1', [page]);
        const r = rows[0];
        if (!r?.draft || JSON.stringify(r.draft) === JSON.stringify(r.published)) continue;
        await q('update bf_pages set published = draft, published_at = now() where page = $1', [page]);
        const v = await q('insert into bf_versions (page, content, note, created_by) values ($1,$2,$3,$4) returning id', [page, r.draft, note || 'Published', admin.username]);
        done.push({ page, version: v.rows[0].id });
      }
      published = null;
      audit(admin.username, 'publish', { done }, ip);
      return json(res, 200, { ok: true, published: done }), true;
    }
    if (route === 'versions' && req.method === 'GET') {
      const { rows } = await q(`select v.id, v.page, v.note, v.created_by, v.created_at,
          (v.content = p.published) as live
        from bf_versions v left join bf_pages p on p.page = v.page order by v.id desc limit 200`);
      return json(res, 200, { versions: rows }), true;
    }
    if ((m = route.match(/^versions\/(\d+)\/restore$/)) && req.method === 'POST') {
      const { rows } = await q('select id, page, content from bf_versions where id = $1', [Number(m[1])]);
      if (!rows[0]) return json(res, 404, { error: 'Version not found' }), true;
      const { page, content, id } = rows[0];
      await q(`insert into bf_pages (page, draft, published, draft_updated_at, published_at) values ($1, $2, $2, now(), now())
               on conflict (page) do update set draft = excluded.draft, published = excluded.published, draft_updated_at = now(), published_at = now()`, [page, content]);
      const v = await q('insert into bf_versions (page, content, note, created_by) values ($1,$2,$3,$4) returning id', [page, content, `Restored version #${id}`, admin.username]);
      published = null;
      audit(admin.username, 'restore', { page, from: id, version: v.rows[0].id }, ip);
      return json(res, 200, { ok: true, page, version: v.rows[0].id }), true;
    }
    if ((m = route.match(/^reset\/(landing|app)$/)) && req.method === 'POST') {
      // Back to the original code version (as a draft; publish to make it live).
      await q(`insert into bf_pages (page, draft, draft_updated_at) values ($1, $2, now())
               on conflict (page) do update set draft = excluded.draft, draft_updated_at = now()`, [m[1], PAGES[m[1]]({})]);
      return json(res, 200, { ok: true }), true;
    }
    if (route === 'upload' && req.method === 'POST') {
      const buf = await readBody(req, MAX_UPLOAD);
      const kind = Object.entries(IMG).find(([, sig]) => sig.every((b, i) => buf[i] === b))?.[0];
      if (!kind || (kind === 'webp' && buf.slice(8, 12).toString() !== 'WEBP')) return json(res, 415, { error: 'Use a PNG, JPG, WebP or GIF image.' }), true;
      const name = `${randomBytes(12).toString('hex')}.${kind}`;
      await writeFile(join(uploadDir, name), buf, { mode: 0o640 });
      const original = String(req.headers['x-filename'] || '').slice(0, 200);
      await q('insert into bf_uploads (file, mime, size, original_name, created_by) values ($1,$2,$3,$4,$5)', [name, MIME[kind], buf.length, original, admin.username]);
      return json(res, 200, { ok: true, url: `/uploads/${name}` }), true;
    }
    if (route === 'uploads' && req.method === 'GET') {
      const { rows } = await q('select file, original_name, size, created_at from bf_uploads order by id desc limit 100');
      return json(res, 200, { uploads: rows.map((r) => ({ ...r, url: `/uploads/${r.file}` })) }), true;
    }
    return json(res, 404, { error: 'not found' }), true;
  }

  /** Serve the landing page or the app shell with content applied. */
  async function sendPage(req, res, url, file) {
    const isLanding = file === landingFile, isApp = file === appFile;
    let html = await readFile(file, 'utf8');
    const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
    if (!isLanding && !isApp) { res.writeHead(200, headers); return res.end(html); }

    const wantEdit = url.searchParams.has('bf_edit'), wantPreview = url.searchParams.has('bf_preview');
    let mode = 'live';
    if (wantEdit || wantPreview) {
      const admin = await currentAdmin(req);
      if (!admin) { res.writeHead(302, { Location: '/admin' }); return res.end(); }
      mode = wantEdit ? 'edit' : 'preview';
      headers['X-Robots-Tag'] = 'noindex, nofollow';
      headers['X-Frame-Options'] = 'SAMEORIGIN';
    } else {
      headers['X-Frame-Options'] = 'SAMEORIGIN';
    }
    const page = isLanding ? 'landing' : 'app';
    const doc = mode === 'live' ? (await getPublished())[page] : await getDraft(page);

    if (isLanding) {
      html = composeLanding(html, doc, mode);
      if (mode === 'edit') html = html.replace(/<script src="landing\.js"[^>]*><\/script>/, '');
    } else {
      const payload = JSON.stringify({ app: doc || null, mode }).replace(/</g, '\\u003c');
      html = html.replace('</head>', `<script>window.__BF_CONTENT=${payload};</script>\n</head>`);
    }
    if (mode === 'edit') {
      html = html.replace('</head>', '<link rel="stylesheet" href="/admin/assets/frame.css">\n</head>')
        .replace('</body>', `<script>window.__BF_EDIT=${JSON.stringify({ page })};</script><script src="/admin/assets/frame.js" defer></script>\n</body>`);
    }
    if (mode === 'preview') {
      html = html.replace('</body>', '<div style="position:fixed;left:12px;bottom:12px;z-index:9999;background:#0C4F2D;color:#C6F432;font:800 12px Figtree,system-ui,sans-serif;padding:6px 10px;border-radius:8px">Draft preview</div>\n</body>');
    }
    res.writeHead(200, headers);
    res.end(html);
  }

  return { handle, sendPage };
}

/** A readable name for a landing block: its first heading, else its id. */
function blockLabel(html, id) {
  const NAMES = { hero: 'Hero', stats: 'Stats row', signup: 'Final call to action' };
  if (NAMES[id]) return NAMES[id];
  const h = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  const text = h ? h[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8209;/g, '-').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim() : '';
  return text ? text.slice(0, 60) : id;
}
