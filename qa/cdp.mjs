// Tiny headless-Chrome helper shared by QA scripts:
//   const b = await browser({ width, height, mobile, theme, flags }); await b.go(url); await b.eval(js); b.shot(file); b.close()
// Also exports the route list (imported from public/js/nav.js), the server origin and the deterministic
// QA flags every script uses, so screenshots and measurements don't depend on first-run state.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const ORIGIN = (process.env.BF_URL || 'http://127.0.0.1:4400').replace(/\/$/, '');
export const appUrl = (route) => (route === 'landing' ? `${ORIGIN}/` : `${ORIGIN}/app/#/${route}`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The 27 screens that existed before the UX rebuild. Every one must still be in NAV afterwards. */
export const CORE_ROUTES = ['daily', 'pricing', 'arbitrage', 'positive-ev', 'middles', 'low-holds', 'screen', 'parlay-builder',
  'ev-builder', 'promo-converter', 'promo-optimizer', 'boosts', 'deposit-optimizer', 'sharp-money', 'bettor-signals', 'ai-picks',
  'live-ai', 'prop-research', 'ai-chat', 'prediction-traders', 'pm-picks', 'pm-markets', 'exit-alerts', 'tracker', 'alerts',
  'calculators', 'account'];

/**
 * Every app route, read from NAV in public/js/nav.js (the same list the sidebar and the editor's page picker use).
 * Asserts that all 27 core routes are still there; new routes (e.g. a glossary) are allowed.
 */
export async function routes() {
  let list;
  try {
    const { NAV } = await import(pathToFileURL(join(here, '../public/js/nav.js')).href);
    list = NAV.flatMap((g) => g.items.map((it) => (Array.isArray(it) ? it[0] : it.id)));
  } catch (err) {
    // nav.js may one day import browser-only code; fall back to reading the tuples from the source.
    console.warn(`qa: could not import nav.js (${err.message}); reading it as text`);
    const src = readFileSync(join(here, '../public/js/nav.js'), 'utf8');
    list = [...src.matchAll(/\[\s*'([a-z][a-z0-9-]*)'\s*,\s*'[^']+'/g)].map((m) => m[1]);
  }
  list = [...new Set(list)];
  const missing = CORE_ROUTES.filter((r) => !list.includes(r));
  if (missing.length) throw new Error(`nav.js is missing core routes: ${missing.join(', ')}`);
  return list;
}

/**
 * Deterministic browser state applied before every page load (localStorage, same origin as the app):
 *   bf-theme                 'light' | 'dark' (the explicit theme, not 'auto')
 *   bf-proto-settings-v1     merged with { plan: 'all-access', onboarded: true } so every tool is unlocked and
 *                            the first-run setup card is collapsed/hidden
 *   bf-qa                    '1', a marker pages may read to skip one-off intros/explainer auto-expansion
 * Override with { flags: { onboarded: false } } (or env QA_FLAGS='{"onboarded":false}') for first-run shots.
 */
export const DEFAULT_FLAGS = { plan: 'all-access', onboarded: true };
export function flagScript({ theme, flags } = {}) {
  let env = {};
  try { env = JSON.parse(process.env.QA_FLAGS || '{}'); } catch { /* ignore bad JSON */ }
  const settings = { ...DEFAULT_FLAGS, ...env, ...(flags || {}) };
  return `(() => { try {
    if (!/^https?:/.test(location.protocol)) return;
    const K = 'bf-proto-settings-v1';
    let s = {}; try { s = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch {}
    localStorage.setItem(K, JSON.stringify(Object.assign(s, ${JSON.stringify(settings)})));
    ${theme ? `localStorage.setItem('bf-theme', ${JSON.stringify(theme)});` : ''}
    localStorage.setItem('bf-qa', '1');
  } catch {} })();`;
}

export async function browser({ width = 1440, height = 1000, mobile = false, theme = null, flags = null } = {}) {
  // Launch with retries: under machine load Chrome can take a while to open its DevTools port. Profiles live
  // in their own folder (BF_PROFILE_ROOT, default <tmp>/bfqa) and are removed when the browser closes, so the
  // shared temp folder doesn't fill with thousands of bfcdp-* dirs (listing those slowed every launch).
  const root = process.env.BF_PROFILE_ROOT || join(tmpdir(), 'bfqa');
  mkdirSync(root, { recursive: true });
  const dropDir = (dir) => { try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* still locked: left behind */ } };
  let proc, wsUrl, profile;
  for (let attempt = 0; attempt < 4 && !wsUrl; attempt++) {
    const port = 9300 + Math.floor(Math.random() * 600);
    profile = mkdtempSync(join(root, 'p-'));
    proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    for (let i = 0; i < 100 && !wsUrl; i++) { await sleep(200); try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up */ } }
    if (!wsUrl) { const dead = proc, dir = profile; dead.once('exit', () => dropDir(dir)); dead.kill(); console.warn(`qa: Chrome did not start (attempt ${attempt + 1}); retrying`); }
  }
  if (!wsUrl) throw new Error('qa: headless Chrome did not open its DevTools port after 4 attempts');
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const errors = []; const dialogs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  const size = (w, h, mob) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob });
  await size(width, height, mobile);

  let prefScript = null;
  /** Set the theme (localStorage bf-theme + prefers-color-scheme) and QA flags for every following load. */
  async function prefs(opts = {}) {
    if (prefScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: prefScript }).catch(() => {});
    prefScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: flagScript(opts) })).identifier;
    if (opts.theme) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: opts.theme }] });
  }
  if (theme || flags) await prefs({ theme, flags });

  const b = {
    send, errors, dialogs, size, prefs,
    // Navigating between two hashes of the same page does not reload; force a reload so prefs apply.
    // Then wait until the page is really rendered (b.ready) instead of trusting a fixed delay: under load
    // (many Chrome processes from parallel QA runs) a fixed 1.5s gave blank screenshots and false parity
    // FAILs. `wait` stays the minimum settle time from the navigation (live ticks, late lists).
    async go(url, wait = 1500) {
      const t0 = Date.now();
      const cur = await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true }).then((r) => r.result.value).catch(() => '');
      if (cur.split('#')[0] === url.split('#')[0] && cur !== 'about:blank') { await send('Page.navigate', { url: 'about:blank' }); await sleep(50); }
      await send('Page.navigate', { url });
      await b.ready({ app: url.includes('/app/') });
      const left = wait - (Date.now() - t0);
      await sleep(Math.max(250, left));
    },
    /**
     * Poll (up to `timeout` ms) until the document has loaded and, for app routes, #view holds a rendered
     * screen: an h1 (or the error state) and no loading skeleton, with fonts ready. Returns true when ready.
     */
    async ready({ app = true, timeout = Number(process.env.READY_MS || 20000) } = {}) {
      const test = app
        ? `(() => { const v = document.getElementById('view'); return document.readyState === 'complete' && !!v && !!v.querySelector('h1, .err-state') && !v.querySelector('.skel') && (!document.fonts || document.fonts.status === 'loaded'); })()`
        : `document.readyState === 'complete' && (!document.fonts || document.fonts.status === 'loaded')`;
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const ok = await send('Runtime.evaluate', { expression: test, returnByValue: true }).then((r) => r.result.value === true).catch(() => false);
        if (ok) return true;
        await sleep(150);
      }
      console.warn(`qa: page not ready after ${timeout}ms`);
      return false;
    },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
    /** Run a function (serialised with toString) in the page with JSON-able args. */
    run(fn, ...args) { return b.eval(`(${fn})(...${JSON.stringify(args)})`); },
    async shot(file) { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(s.data, 'base64')); },
    async cookies() { return (await send('Network.getAllCookies')).cookies; },
    close() { try { ws.close(); } catch { /* */ } proc.once('exit', () => dropDir(profile)); proc.kill(); },
  };
  return b;
}
