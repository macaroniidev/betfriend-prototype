// QA: open every route in headless Chrome at desktop and phone size (true 390px via DevTools emulation),
// report console errors, horizontal overflow and load failures, and save phone screenshots.
// Usage: node qa/check.mjs  (server must be running on :4400)
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:4400/app/#/';
const app = readFileSync(join(here, '../public/js/app.js'), 'utf8');
const routes = [...app.matchAll(/\['([a-z-]+)', '[^']+', '[^']*'\]/g)].map((m) => m[1]);

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bfqa-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up yet */ }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');

const results = [];
for (const [w, h, mobile] of [[1440, 1000, false], [390, 844, true]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  for (const r of routes) {
    errors.length = 0;
    await send('Page.navigate', { url: `${BASE}${r}` });
    await sleep(1800);
    const ev = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
      const doc = document.documentElement;
      const wide = [...document.querySelectorAll('#view *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.table-wrap,[style*="overflow"],.scroll-x') && getComputedStyle(el).position !== 'fixed').slice(0, 3).map((el) => el.tagName + '.' + [...el.classList].join('.'));
      return { overflow: doc.scrollWidth - innerWidth, failed: document.body.innerText.includes('could not load'), nan: /\\$NaN|NaN%|undefined/.test(document.getElementById('view').innerText), wide };
    })()` });
    const v = ev.result.value;
    results.push({ size: w, route: r, ...v, errors: [...errors] });
    if (mobile) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(here, `${r}-390.png`), Buffer.from(shot.data, 'base64'));
    }
  }
}
ws.close(); chrome.kill();
const bad = results.filter((x) => x.overflow > 0 || x.failed || x.nan || x.errors.length);
for (const x of bad) console.log(`${x.size} ${x.route}: overflow=${x.overflow} failed=${x.failed} nan=${x.nan} wide=${x.wide.join(',')} errors=${x.errors.slice(0, 2).join(' | ')}`);
console.log(`${results.length} checks, ${bad.length} with problems`);
process.exit(0);
