// End-to-end check of the admin editor in a real (headless) browser.
// Usage: BF_URL=http://127.0.0.1:4400 BF_PW_FILE=/path/to/password-file node qa/editor-walkthrough.mjs
// Steps: log in, publish a baseline, edit the landing headline, reorder two sections, add a library block,
// change a price, hide an app panel, upload an image, preview, publish, check as a logged-out visitor,
// restore the baseline and check the changes are gone. Screenshots go to qa/shots/walk-*.png.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { browser, sleep } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots'); mkdirSync(shots, { recursive: true });
const BASE = process.env.BF_URL || 'http://127.0.0.1:4400';
const PW = readFileSync(process.env.BF_PW_FILE, 'utf8').trim();
const USER = process.env.BF_USER || 'admin';
const results = [];
const ok = (step, pass, detail = '') => { results.push({ step, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}${detail ? ' · ' + detail : ''}`); };

const b = await browser({ width: 1440, height: 950 });
const shot = (n) => b.shot(join(shots, `walk-${n}.png`));
const until = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr).catch(() => false)) return true; await sleep(200); } return false; };
const F = (js) => `(() => { const w = document.getElementById('frame').contentWindow; const d = w.document; ${js} })()`;
const clickXY = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const clickFrameEl = async (selectorJs) => {
  const pos = await b.eval(F(`const el = ${selectorJs}; if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); const fr = document.getElementById('frame').getBoundingClientRect(); return { x: fr.left + r.left + Math.min(20, r.width / 2), y: fr.top + r.top + r.height / 2 };`));
  if (!pos) return false;
  await sleep(250);
  const pos2 = await b.eval(F(`const el = ${selectorJs}; const r = el.getBoundingClientRect(); const fr = document.getElementById('frame').getBoundingClientRect(); return { x: fr.left + r.left + Math.min(20, r.width / 2), y: fr.top + r.top + r.height / 2 };`));
  await clickXY(pos2.x, pos2.y); return true;
};
const clickTop = (sel) => b.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
const api = (path, opts = {}) => b.eval(`fetch('/admin/api/${path}', { method: '${opts.method || 'GET'}', headers: { 'X-BF-Admin': '1', 'Content-Type': 'application/json' }, body: ${opts.body ? `JSON.stringify(${JSON.stringify(opts.body)})` : 'undefined'} }).then(r => r.json())`);
const waitSaved = () => until(`!/Saving|Unsaved/.test(document.getElementById('status').textContent)`, 10000);

try {
  // 1. Log in
  await b.go(`${BASE}/admin`, 1500);
  await b.eval(`(() => { const f = document.getElementById('login'); f.username.value = ${JSON.stringify(USER)}; f.password.value = ${JSON.stringify(PW)}; f.requestSubmit(); })()`);
  ok('1. Log in', await until(`!!document.getElementById('frame')`, 10000));
  const cookie = (await b.cookies()).find((c) => c.name === 'bf_admin');
  ok('   session cookie is HttpOnly + SameSite=Strict', !!cookie && cookie.httpOnly && cookie.sameSite === 'Strict', cookie ? `secure=${cookie.secure}` : 'no cookie');

  // Baseline: publish the current state so there is something to restore to.
  await api('reset/landing', { method: 'POST', body: {} });
  await api('reset/app', { method: 'POST', body: {} });
  const base = await api('publish', { method: 'POST', body: { note: 'QA baseline (original site)' } });
  const baseline = await api('versions');
  const baseIds = baseline.versions.filter((v) => v.live).map((v) => v.id);
  ok('   baseline published', baseIds.length >= 1, JSON.stringify(base.published || []));
  await b.go(`${BASE}/admin`, 1500);
  await until(F(`return !!(w.document.querySelector('[data-bf-block=hero]'))`), 10000);
  await sleep(800);

  // 2. Edit a landing headline
  const NEW_H1 = 'QA edited headline';
  await clickFrameEl(`d.getElementById('hero-h1')`);
  const editing = await until(F(`return d.getElementById('hero-h1').isContentEditable`), 3000);
  await b.eval(F(`const el = d.getElementById('hero-h1'); const s = w.getSelection(); s.selectAllChildren(el);`));
  await b.send('Input.insertText', { text: NEW_H1 });
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitSaved();
  ok('2. Edit landing headline', editing && (await b.eval(F(`return d.getElementById('hero-h1').textContent.trim()`))) === NEW_H1);
  await shot('2-headline');

  // 3. Reorder two sections (move "how" down below "tools") with the panel
  const before = await b.eval(F(`return [...d.querySelectorAll('#main > [data-bf-block]')].map(e => e.dataset.bfBlock).slice(0, 5).join(',')`));
  await b.eval(`(() => { const li = document.querySelector('#tab-blocks li[data-key="how"]'); li.querySelector('[data-act=down]').click(); })()`);
  await sleep(300); await waitSaved();
  const after = await b.eval(F(`return [...d.querySelectorAll('#main > [data-bf-block]')].map(e => e.dataset.bfBlock).slice(0, 5).join(',')`));
  ok('3. Reorder two sections', after.indexOf('tools') < after.indexOf('how'), `${before} -> ${after}`);
  // and with the on-page toolbar: move "ev" up above "arbitrage"
  await b.eval(F(`const el = d.querySelector('[data-bf-block=ev]'); el.scrollIntoView({block:'center'}); el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 300 }));`));
  await sleep(200);
  await b.eval(F(`d.querySelector('#bf-tb [data-a=up]').click();`));
  await sleep(300); await waitSaved();
  const after2 = await b.eval(F(`return [...d.querySelectorAll('#main > [data-bf-block]')].map(e => e.dataset.bfBlock).join(',')`));
  ok('   on-page toolbar move', after2.indexOf('ev') < after2.indexOf('arbitrage'), after2.split(',').slice(2, 7).join(','));

  // 4. Add a block from the library
  await clickTop('[data-tab=add]');
  await b.eval(`[...document.querySelectorAll('#tab-add [data-i]')].find(x => x.textContent.includes('Check list')).click()`);
  await sleep(400); await waitSaved();
  const added = await b.eval(F(`return [...d.querySelectorAll('#main > [data-bf-block^="c-"]')].map(e => e.textContent.includes('Why bettors switch')).some(Boolean)`));
  ok('4. Add a library block', added);
  await shot('4-added');

  // 5. Change a price (Plans & prices) on the pricing screen
  await b.eval(`(() => { const s = document.getElementById('page'); s.value = 'app:pricing'; s.dispatchEvent(new Event('change')); })()`);
  await until(F(`return !!d.querySelector('.pricing .price-big')`), 12000);
  await sleep(800);
  await clickFrameEl(`d.querySelector('.pricing .price-big')`);
  const dlgOpen = await until(`document.getElementById('dlg').open && !!document.getElementById('plans-save')`, 6000);
  await b.eval(`(() => { const inp = document.querySelector('[data-plan="all-access"] [data-f=monthly]'); inp.value = '179.99'; document.getElementById('plans-save').click(); })()`);
  await waitSaved();
  const priceOk = await until(F(`return /179\\.99/.test(d.querySelector('.pricing .price-big')?.textContent || '')`), 12000);
  ok('5. Change a price (All-Access → $179.99)', dlgOpen && priceOk, await b.eval(F(`return d.querySelector('.pricing .price-big')?.textContent`)));
  ok('   sidebar button follows the new price', await b.eval(F(`return /179\\.99/.test(d.querySelector('.side-foot .btn')?.textContent || '')`)));
  await shot('5-price');

  // 6. Hide a panel on an app screen (Daily Card → "Account health")
  await b.eval(`(() => { const s = document.getElementById('page'); s.value = 'app:daily'; s.dispatchEvent(new Event('change')); })()`);
  await until(F(`return !!d.querySelector('.health')`), 12000);
  await until(`[...document.querySelectorAll('#tab-blocks li')].some(li => /Account health/.test(li.textContent))`, 8000);
  await b.eval(`[...document.querySelectorAll('#tab-blocks li')].find(li => /Account health/.test(li.textContent)).querySelector('[data-act=hide]').click()`);
  await sleep(500); await waitSaved();
  ok('6. Hide an app panel (Account health)', await b.eval(F(`return d.querySelector('.health')?.hasAttribute('data-bf-hidden')`)));
  // also edit a heading text on the app
  await clickFrameEl(`[...d.querySelectorAll('.card h2, .card h3')].find(h => /Unlock every tool/i.test(h.textContent))`);
  await b.eval(F(`const el = [...d.querySelectorAll('[contenteditable]')][0]; const s = w.getSelection(); s.selectAllChildren(el);`));
  await b.send('Input.insertText', { text: 'QA unlock heading' });
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitSaved();
  ok('   edit app text (card heading)', await until(F(`return [...d.querySelectorAll('h2,h3')].some(h => h.textContent.trim() === 'QA unlock heading')`), 4000));
  await shot('6-hidden');

  // 7. Upload an image (replace the landing hero art image)
  await b.eval(`(() => { const s = document.getElementById('page'); s.value = 'landing'; s.dispatchEvent(new Event('change')); })()`);
  await until(F(`return !!d.querySelector('[data-bf-block=hero] img')`), 10000);
  await sleep(600);
  const png = join(tmpdir(), 'bf-qa-upload.png');
  writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGklEQVR4nGO4qeLNzbjFfHTTYPRqVQAA6PoQAZHDZz4AAAAASUVORK5CYII=', 'base64'));
  const at = await b.eval(F(`const el = d.querySelector('[data-bf-block=hero] .bf2-shot img'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); const fr = document.getElementById('frame').getBoundingClientRect(); const hit = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2, hit: hit === el }`));
  await sleep(200); await clickXY(at.x, at.y);
  await until(`!!document.getElementById('sel-replace')`, 4000);
  await b.send('Page.setInterceptFileChooserDialog', { enabled: true });
  await b.eval(`document.getElementById('sel-replace').click()`);
  await sleep(500);
  const { root } = await b.send('DOM.getDocument', {});
  const { nodeId } = await b.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#file' });
  await b.send('DOM.setFileInputFiles', { nodeId, files: [png] });
  await until(F(`return /^\/uploads\//.test(d.querySelector('[data-bf-block=hero] .bf2-shot img').getAttribute('src'))`), 15000);
  await waitSaved(); await sleep(600);
  const imgSrc = await b.eval(F(`return d.querySelector('[data-bf-block=hero] .bf2-shot img').getAttribute('src')`));
  ok('7. Upload + replace an image', /^\/uploads\/[a-f0-9]+\.png$/.test(imgSrc), imgSrc);

  // 8. Preview (desktop + phone)
  await clickTop('[data-mode=preview]');
  await until(F(`return location.search.includes('bf_preview') && !!d.getElementById('hero-h1')`), 10000);
  await sleep(1200);
  const prevH1 = await b.eval(F(`return d.getElementById('hero-h1').textContent.trim()`));
  await clickTop('[data-device=phone]'); await sleep(800); await shot('8-preview-phone');
  await clickTop('[data-device=desktop]');
  ok('8. Preview shows the draft', prevH1 === NEW_H1 && !(await b.eval(F(`return !!d.getElementById('bf-tb')`))), prevH1);
  await clickTop('[data-mode=edit]'); await sleep(1500);

  // Logged-out visitor sees nothing yet
  const liveBefore = await (await fetch(`${BASE}/`)).text();
  ok('   draft not live before publishing', !liveBefore.includes(NEW_H1));

  // 9. Publish
  await clickTop('#publish-btn');
  await until(`!!document.getElementById('pub-go')`, 4000);
  await b.eval(`document.getElementById('pub-note').value = 'QA walkthrough'; document.getElementById('pub-go').click()`);
  ok('9. Publish', await until(`/live|Published/.test(document.getElementById('toast').textContent)`, 10000), await b.eval(`document.getElementById('toast').textContent`));

  // 10. Logged-out visitor sees the changes
  const live = await (await fetch(`${BASE}/`)).text();
  const order = [...live.matchAll(/data-bf-block="([^"]+)"/g)].map((m) => m[1]);
  const v = await browser({ width: 1440, height: 950 });
  await v.go(`${BASE}/app/#/pricing`, 2500);
  const vPrice = await v.eval(`document.querySelector('.pricing .price-big')?.textContent || ''`);
  await v.go(`${BASE}/app/#/daily`, 2500);
  const vHealth = await v.eval(`(() => { const h = document.querySelector('.health'); return h ? getComputedStyle(h).display : 'missing'; })()`);
  const vText = await v.eval(`[...document.querySelectorAll('h2,h3')].some(h => h.textContent.trim() === 'QA unlock heading')`);
  await v.shot(join(shots, 'walk-10-visitor-daily.png'));
  const vEdit = await (await fetch(`${BASE}/?bf_edit=1`, { redirect: 'manual' })).status;
  v.close();
  ok('10. Visitor sees headline', live.includes(NEW_H1));
  ok('    visitor sees new order + added block', order.indexOf('tools') < order.indexOf('how') && order.some((id) => id.startsWith('c-')) && live.includes('Why bettors switch'));
  ok('    visitor sees uploaded image', live.includes(imgSrc));
  ok('    visitor sees new price', /179\.99/.test(vPrice), vPrice);
  ok('    visitor: hidden panel is hidden', vHealth === 'none', vHealth);
  ok('    visitor sees app text edit', vText);
  ok('    visitor cannot open edit mode', vEdit === 302, String(vEdit));

  // 11. Restore the baseline
  await clickTop('#history-btn');
  await until(`!!document.querySelector('[data-restore]')`, 6000);
  await shot('11-history');
  for (const id of baseIds) {
    await b.eval(`(() => { const btn = document.querySelector('[data-restore="${id}"]'); if (btn) btn.click(); })()`);
    await sleep(1500);
    if (id !== baseIds[baseIds.length - 1]) { await clickTop('#history-btn'); await until(`!!document.querySelector('[data-restore]')`, 6000); }
  }
  await sleep(1000);
  const restored = await (await fetch(`${BASE}/`)).text();
  const v2 = await browser({ width: 1440, height: 950 });
  await v2.go(`${BASE}/app/#/pricing`, 2500);
  const rPrice = await v2.eval(`document.querySelector('.pricing .price-big')?.textContent || ''`);
  v2.close();
  ok('11. Restore previous version: changes gone', !restored.includes(NEW_H1) && !restored.includes('Why bettors switch') && /199\.99/.test(rPrice), rPrice);

  // Security: logged-out API calls are refused
  const codes = {};
  for (const [m, p] of [['GET', '/admin/api/state'], ['PUT', '/admin/api/draft/landing'], ['POST', '/admin/api/publish'], ['POST', '/admin/api/upload'], ['POST', '/admin/api/versions/1/restore'], ['GET', '/admin/assets/editor.js'], ['GET', '/admin/assets/frame.js']]) {
    codes[`${m} ${p}`] = (await fetch(`${BASE}${p}`, { method: m, headers: { 'X-BF-Admin': '1', 'Content-Type': 'application/json' }, body: m === 'GET' ? undefined : '{}' })).status;
  }
  ok('Security: logged-out requests refused', Object.values(codes).every((c) => c === 401), JSON.stringify(codes));
  // Cross-site write with a valid session but no custom header is refused
  const csrf = await b.eval(`fetch('/admin/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.status)`);
  ok('Security: write without same-origin header refused', csrf === 403, String(csrf));

  // Log out
  await clickTop('#logout'); await sleep(1500);
  ok('Log out', (await b.eval('location.pathname')) === '/admin' && !(await b.eval(`!!document.getElementById('frame')`)));
} catch (e) {
  ok('walkthrough crashed', false, e.stack || e.message);
} finally {
  const errs = b.errors.filter((e) => !/favicon|ERR_ABORTED/.test(e));
  if (errs.length) console.log('Browser errors:\n  ' + errs.slice(0, 8).join('\n  '));
  b.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  writeFileSync(join(shots, 'walk-results.json'), JSON.stringify(results, null, 1));
  process.exit(failed.length ? 1 : 0);
}
