// QA for /landing/: loads it at 1440x900 and 390x844 (true emulation), reports console errors, horizontal overflow,
// broken images and small tap targets, exercises the interactions, and saves full-page + per-section screenshots.
// Usage: node qa/landing-check.mjs [--sections]  (server must be running on :4400)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.LP_URL || 'http://127.0.0.1:4400/';
const SECTIONS = process.argv.includes('--sections');
const crops = join(here, 'landing-crops');
if (SECTIONS) mkdirSync(crops, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bflp-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up */ }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');

for (const [w, h, mobile] of (process.env.LP_ALL ? [[1440, 900, false], [1024, 768, false], [768, 1024, true], [390, 844, true]] : [[1440, 900, false], [390, 844, true]])) {
  errors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  // force lazy images to load, then come back to top
  await ev(`(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); await new Promise(r => setTimeout(r, 1500)); await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); await document.fonts.ready; return 1; })()`);
  const report = await ev(`(() => {
    const doc = document.documentElement;
    const broken = [...document.images].filter(i => i.naturalWidth === 0).map(i => i.currentSrc || i.src);
    const wide = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !el.closest('.bf2-marquee,.bf2-tabs,.bf2-sticky,.bf2-examples,.bf2-shot picture') && getComputedStyle(el).position !== 'fixed'; }).slice(0, 5).map(el => el.tagName + '.' + [...el.classList].join('.'));
    const small = ${mobile} ? [...document.querySelectorAll('a,button,input,[role=tab]')].filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width && cs.visibility !== 'hidden' && !el.closest('[aria-hidden=true],.bf2-sticky,.bf2-nav:not(.open)') && (r.height < 44 && !(el.closest('p,li') && cs.display === 'inline')); }).map(el => el.tagName + ':' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(el.getBoundingClientRect().height)).slice(0, 12) : [];
    return { scrollWidth: doc.scrollWidth, innerWidth, overflow: doc.scrollWidth - innerWidth, height: doc.scrollHeight, broken, wide, small, h1: document.querySelectorAll('h1').length, nan: /NaN|undefined/.test(document.body.innerText) };
  })()`);
  // interactions
  const inter = await ev(`(async () => {
    const r = {};
    const num = document.getElementById('calc-stake');
    num.value = '1000'; num.dispatchEvent(new Event('input'));
    r.calc1000 = document.querySelector('[data-calc=result]').textContent + ' | ' + document.querySelector('[data-calc=math]').textContent;
    num.value = '487'; num.dispatchEvent(new Event('change'));
    r.calc487 = document.querySelector('[data-calc=math]').textContent;
    document.querySelector('[data-period=annual]').click();
    r.annual = [...document.querySelectorAll('[data-price]')].map(e => e.textContent).join(' ') + ' | ' + document.querySelector('[data-value]').textContent;
    r.nudgesAnnual = [...document.querySelectorAll('[data-nudge]')].map(e => e.textContent.split(' more')[0].replace('Only ', '')).join(' ');
    document.querySelector('[data-period=monthly]').click();
    r.monthly = [...document.querySelectorAll('[data-price]')].map(e => e.textContent).join(' ');
    r.nudges = [...document.querySelectorAll('[data-nudge]')].map(e => e.textContent.split(' more')[0].replace('Only ', '')).join(' ');
    const more = document.querySelector('.bf2-plans-more'); if (getComputedStyle(more).display !== 'none') { more.click(); r.planMore = more.getAttribute('aria-expanded') + '/' + !document.getElementById('plan-grid').classList.contains('is-compact'); more.click(); }
    document.querySelector('[data-shot=bettor-signals]').click(); r.lensHidden = document.querySelector('.bf2-lens-sharp').hidden; document.querySelector('[data-shot=sharp-money]').click(); r.lensBack = !document.querySelector('.bf2-lens-sharp').hidden;
    const fq = document.querySelector('#faq-2-b'); fq.click(); r.faq = fq.getAttribute('aria-expanded') + '/' + !document.getElementById('faq-2').hidden; fq.click();
    const tab = document.querySelector('[data-shot=live-ai]'); tab.click(); await new Promise(res => setTimeout(res, 1500));
    r.tab = document.querySelector('#shot-ai img').currentSrc.split('/').pop() + ' ' + tab.getAttribute('aria-selected');
    document.querySelector('[data-shot=ai-picks]').click();
    window.scrollTo(0, document.getElementById('ev').offsetTop); await new Promise(res => setTimeout(res, 500));
    r.stickyMid = document.querySelector('.bf2-sticky').dataset.show;
    window.scrollTo(0, 0); await new Promise(res => setTimeout(res, 400));
    r.stickyTop = document.querySelector('.bf2-sticky').dataset.show;
    if (${mobile}) { document.querySelector('.bf2-burger').click(); r.menu = document.getElementById('site-nav').classList.contains('open'); document.querySelector('.bf2-burger').click(); }
    return r;
  })()`);
  await sleep(700);
  await ev(`document.querySelector('.bf2-sticky').style.display='none'`);
  console.log(`\n== ${w}x${h}`, JSON.stringify(report, null, 1), '\ninteractions', JSON.stringify(inter, null, 1), '\nerrors', errors);

  const { cssContentSize } = await send('Page.getLayoutMetrics');
  const fullH = Math.ceil(cssContentSize.height);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: fullH, scale: mobile ? 1 : 0.5 } });
  writeFileSync(join(here, `landing-${w}.png`), Buffer.from(shot.data, 'base64'));
  if (SECTIONS) {
    const rects = await ev(`[...document.querySelectorAll('header.bf2-head, main > section, main > div, footer')].map(s => { const r = s.getBoundingClientRect(); return { n: (s.id || s.className.split(' ')[0]), y: r.top + scrollY, h: r.height }; })`);
    let i = 0;
    for (const r of rects) {
      for (let y = r.y; y < r.y + r.h; y += 1400) {
        const hh = Math.min(1400, r.y + r.h - y);
        const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: w, height: hh, scale: 1 } });
        writeFileSync(join(crops, `${w}-${String(i++).padStart(2, '0')}-${r.n}.png`), Buffer.from(s.data, 'base64'));
      }
    }
  }
}
ws.close(); chrome.kill();
process.exit(0);
