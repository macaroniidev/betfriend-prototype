// Brand QA: screenshot every app screen + the landing page at 390 and 1440, light and dark,
// and audit the rendered page against DESIGN.md's banned list.
// Usage: node qa/shots.mjs [route ...]   (server on :4400; writes qa/shots/<theme>-<width>-<route>.png)
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'shots'); mkdirSync(out, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ORIGIN = process.env.BF_URL || 'http://127.0.0.1:4400';
const app = readFileSync(join(here, '../public/js/app.js'), 'utf8');
const all = [...app.matchAll(/\['([a-z-]+)', '[^']+', '[^']*'\]/g)].map((m) => m[1]);
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['landing', ...all];
const themes = (process.env.THEMES || 'light,dark').split(',');
const widths = (process.env.WIDTHS || '390,1440').split(',').map(Number);

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bfshots-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) { await sleep(200); try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up */ } }
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');

// Runs in the page: list elements that break the brand rules.
const AUDIT = `(() => {
  const issues = [];
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const isRed = ([r, g, b, a = 1]) => a > .5 && r > 170 && g < 110 && b < 110;
  const isCream = ([r, g, b, a = 1]) => a > .5 && r >= 240 && g >= 235 && b >= 205 && b < 236 && r - b > 10;
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().slice(0, 24) + '"';
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const btnLike = el.matches('button, .btn, a.btn, .chip, .tag, .pill, .bf2-cta, [role=button], input[type=submit]');
    if (btnLike && parseFloat(cs.borderTopLeftRadius) >= Math.min(r.height / 2, 30) && r.height > 14 && !el.matches('.avatar, .sw *, [class*=dot], [class*=switch]')) issues.push('pill shape: ' + name(el));
    if (/monospace|consolas|sf mono|menlo|courier/i.test(cs.fontFamily) && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) issues.push('monospace: ' + name(el));
    if (cs.fontStyle === 'italic' && /barlow/i.test(cs.fontFamily)) issues.push('italic Barlow: ' + name(el));
    if (btnLike && el.matches('button, .btn, .bf2-cta') && isRed(rgb(cs.backgroundColor))) issues.push('red button: ' + name(el));
    if (r.width > innerWidth * .6 && isCream(rgb(cs.backgroundColor))) issues.push('cream ground: ' + name(el));
    if (/^H[123]$/.test(el.tagName) && cs.textTransform === 'uppercase' && /BetFriend/.test(el.textContent) && !el.querySelector('.bf-name')) issues.push('BetFriend in uppercase heading: ' + name(el));
  }
  const overflow = document.documentElement.scrollWidth - innerWidth;
  if (overflow > 0) issues.push('horizontal overflow ' + overflow + 'px');
  return [...new Set(issues)].slice(0, 12);
})()`;

const report = [];
for (const theme of themes) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 500 ? 844 : 1000, deviceScaleFactor: 1, mobile: w < 500 });
    for (const r of routes) {
      errors.length = 0;
      await send('Page.navigate', { url: r === 'landing' ? `${ORIGIN}/` : `${ORIGIN}/app/#/${r}` });
      await sleep(r === 'landing' ? 2200 : 1700);
      const v = (await send('Runtime.evaluate', { returnByValue: true, expression: AUDIT })).result.value || [];
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(out, `${theme}-${w}-${r}.png`), Buffer.from(shot.data, 'base64'));
      if (v.length || errors.length) report.push(`${theme} ${w} ${r}: ${[...v, ...errors.map((e) => 'JS error: ' + String(e).slice(0, 120))].join(' | ')}`);
    }
  }
}
ws.close(); chrome.kill();
console.log(report.join('\n') || 'no brand issues found');
console.log(`${themes.length * widths.length * routes.length} screens checked; shots in qa/shots/`);
process.exit(0);
