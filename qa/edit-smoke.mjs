// Edit-mode smoke test for app screens, without logging in: loads the app in an iframe under a stub
// window.BFEditor (the API public/admin/editor.js gives frame.js), injects public/admin/frame.js from disk,
// and drives it with real mouse/keyboard input. Nothing is saved or published.
// Checks per route: blocks are listed and labelled, the page title can be edited in place and the override
// survives live ticks, table data is not editable, a panel can be hidden and shown, and the theme toggle
// (when present) is never selected. On the first route it also checks the content.js markup contract
// (data-bf-nodata is skipped, data-bf-text islands inside it still take overrides after a re-render).
// Usage: node qa/edit-smoke.mjs [route ...|all]   (default: daily arbitrage sharp-money pricing; BF_URL)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, routes as navRoutes, ORIGIN, sleep } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FRAME_JS = readFileSync(join(here, '../public/admin/frame.js'), 'utf8');
const FRAME_CSS = readFileSync(join(here, '../public/admin/frame.css'), 'utf8');
const args = process.argv.slice(2);
const routes = args[0] === 'all' ? await navRoutes() : args.length ? args : ['daily', 'arbitrage', 'sharp-money', 'pricing'];

const results = [];
const ok = (step, pass, detail = '') => { results.push({ step, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${step}${detail ? ' · ' + detail : ''}`); };

const b = await browser({ width: 1440, height: 950 });
// Inside the iframe only: what the server injects for ?bf_edit=1 (content.js in edit mode).
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `if (window.parent !== window) { window.__BF_CONTENT = { app: null, mode: 'edit' }; window.__BF_EDIT = { page: 'app' }; try { localStorage.setItem('bf-theme', 'light'); } catch {} }` });

// The host page: any same-origin URL works (an unknown path returns a plain 404 page).
await b.go(`${ORIGIN}/qa-edit-harness`, 300);
await b.eval(`(() => {
  document.body.innerHTML = '<iframe id="frame" style="position:fixed;left:0;top:0;width:1400px;height:900px;border:0"></iframe>';
  window.__docs = { app: { text: {}, layout: {}, custom: {}, images: {}, plans: {} } };
  window.__log = []; window.__sel = null; window.__ready = 0; window.__blocksChanged = 0;
  window.BFEditor = {
    page: () => 'app', mode: () => 'edit',
    doc: (p) => (window.__docs[p] ||= {}),
    change(p, fn) { fn(window.__docs[p] ||= {}); if (p === 'app') window.__frame.setAppDoc(window.__docs.app); window.__log.push('change'); },
    frameReady(ops) { window.__frame = ops; window.__ready++; },
    routeChanged(r) { window.__log.push('route:' + r); },
    blocksChanged() { window.__blocksChanged++; },
    select(info) { window.__sel = info; },
    openPlans() { window.__log.push('plans'); },
    codeLabel: (id) => id, uploadImage() {}, toast(m) { window.__log.push('toast:' + m); },
  };
})()`);

const F = (js) => `(() => { const w = document.getElementById('frame').contentWindow; const d = w.document; ${js} })()`;
const until = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.eval(expr).catch(() => false)) return true; await sleep(150); } return false; };
const clickXY = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
/** Click an element in the frame (a JS expression using d/w) with a real mouse event. */
async function clickIn(selJs) {
  const pos = await b.eval(F(`const el = ${selJs}; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + Math.min(12, r.width / 2), y: r.top + r.height / 2 };`));
  if (!pos) return false;
  await sleep(150); await clickXY(pos.x, pos.y); await sleep(150);
  return true;
}
const key = async (k, code, vk) => { for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk }); };

let first = true;
for (const r of routes) {
  b.errors.length = 0;
  await b.eval(`window.__ready = 0; document.getElementById('frame').src = '/app/?qa=' + Date.now() + '#/${r}'`);
  await until(F(`return !!d.querySelector('#view h1') && !!w.BFContent`), 10000);
  await sleep(900);
  await b.eval(F(`const st = d.createElement('style'); st.textContent = ${JSON.stringify(FRAME_CSS)}; d.head.appendChild(st); w.eval(${JSON.stringify(FRAME_JS)});`));
  const ready = await until(`window.__ready > 0`, 10000);
  // Under load the screen can still be painting when frame.js reports ready: retry until blocks show up (max ~10s).
  let blocks = [];
  for (let i = 0; ready && i < 20 && !blocks.length; i++) { blocks = await b.eval(`window.__frame.listBlocks()`); if (!blocks.length) await sleep(500); }
  const panels = blocks.filter((x) => x.label === 'Panel').length;
  ok(`${r}: frame.js ready, blocks listed`, ready && blocks.length > 0, `${blocks.length} blocks${panels ? `, ${panels} labelled "Panel"` : ''}`);

  // Edit the page title in place (click, select all, type, Enter).
  const h1 = await b.eval(F(`return d.querySelector('#view h1').textContent.trim()`));
  await clickIn(`d.querySelector('#view h1')`);
  const editable = await b.eval(F(`return d.querySelector('#view h1').isContentEditable`));
  const kind = await b.eval(`window.__sel?.kindLabel || ''`);
  // Headings with styled pieces (e.g. "Ask <span class=bf-name>BetFriend</span> AI") are edited one text piece at a
  // time, as the editor asks the owner to: select only the first non-empty text node.
  const piece = await b.eval(F(`const el = d.querySelector('#view h1'); const tw = d.createTreeWalker(el, 4); let n; while ((n = tw.nextNode()) && !n.nodeValue.trim()); const rg = d.createRange(); rg.selectNodeContents(n); const s = w.getSelection(); s.removeAllRanges(); s.addRange(rg); return n.nodeValue.trim();`));
  await b.send('Input.insertText', { text: 'QA heading' });
  await key('Enter', 'Enter', 13);
  await sleep(600);
  const saved = await b.eval(`window.__docs.app.text?.[${JSON.stringify(r)}]?.[${JSON.stringify(piece)}] || ''`);
  await sleep(4500); // let live data tick
  const shown = await b.eval(F(`return d.querySelector('#view h1').textContent.trim()`));
  ok(`${r}: edit the page title`, editable && kind === 'Heading' && saved === 'QA heading' && shown === h1.replace(piece, 'QA heading'), `kind=${kind} saved=${saved || '-'} shown=${shown}`);
  // Undo it the way the editor does (remove the override).
  await b.eval(`(() => { delete window.__docs.app.text?.[${JSON.stringify(r)}]?.[${JSON.stringify(piece)}]; window.__frame.setAppDoc(window.__docs.app); })()`);
  await sleep(300);
  ok(`${r}: override removed restores the code text`, (await b.eval(F(`return d.querySelector('#view h1').textContent.trim()`))) === h1);

  // Live table data is never editable; clicking it selects the block instead.
  if (await b.eval(F(`return !!d.querySelector('#view tbody td')`))) {
    await clickIn(`d.querySelector('#view tbody td')`);
    const tdEdit = await b.eval(F(`return !!d.querySelector('#view tbody [contenteditable]')`));
    const sel = await b.eval(`window.__sel?.kindLabel || ''`);
    ok(`${r}: table data not editable`, !tdEdit && /^Block/.test(sel), sel);
  }

  // Hide and show a top-level panel.
  const top = blocks.find((x) => x.depth === 0 && !x.custom);
  if (top) {
    await b.eval(`window.__frame.toggleHidden(${JSON.stringify(top.key)})`); await sleep(300);
    const hid = await b.eval(F(`return !!d.querySelector('[data-bf-hidden]')`));
    await b.eval(`window.__frame.toggleHidden(${JSON.stringify(top.key)})`); await sleep(300);
    const back = await b.eval(F(`return !d.querySelector('[data-bf-hidden]')`));
    ok(`${r}: hide + show a panel`, hid && back, top.label);
  }

  // Theme toggle (added by the rebuild): works in edit mode, never selected or edited.
  if (await b.eval(F(`return !!d.querySelector('#theme-toggle')`))) {
    await b.eval(`window.__sel = 'none'`);
    const before = await b.eval(F(`return d.documentElement.getAttribute('data-theme') || ''`));
    await clickIn(`d.querySelector('#theme-toggle')`);
    const after = await b.eval(F(`return d.documentElement.getAttribute('data-theme') || ''`));
    const sel = await b.eval(`window.__sel`);
    ok(`${r}: theme toggle not selectable`, sel === 'none' && !(await b.eval(F(`return !!d.querySelector('#theme-toggle[contenteditable], #theme-toggle [contenteditable]')`))), `theme ${before || 'default'} -> ${after || 'default'}`);
    if (after !== before) await clickIn(`d.querySelector('#theme-toggle')`);
  }

  // content.js contract, once: nodata skipped, data-bf-text islands keep overrides across re-renders.
  if (first) {
    first = false;
    await b.eval(F(`const v = w.BFContent.screenRoot(); const x = d.createElement('div'); x.id = 'qa-nd'; x.setAttribute('data-bf-nodata', ''); x.innerHTML = '<span data-bf-text>QA verb</span> <b>QA amount</b>'; v.appendChild(x);`));
    await b.eval(`(() => { const t = (window.__docs.app.text[${JSON.stringify(r)}] ||= {}); t['QA verb'] = 'QA verb edited'; t['QA amount'] = 'should not apply'; window.__frame.setAppDoc(window.__docs.app); })()`);
    await sleep(400);
    const a = await b.eval(F(`return d.getElementById('qa-nd').textContent`));
    await b.eval(F(`d.getElementById('qa-nd').innerHTML = '<span data-bf-text>QA verb</span> <b>QA amount</b>';`));
    await sleep(400);
    const c = await b.eval(F(`return d.getElementById('qa-nd').textContent`));
    await clickIn(`d.querySelector('#qa-nd b')`);
    const amountEditable = await b.eval(F(`return d.querySelector('#qa-nd b').isContentEditable`));
    await key('Escape', 'Escape', 27);
    await clickIn(`d.querySelector('#qa-nd span')`);
    const verbEditable = await b.eval(F(`return d.querySelector('#qa-nd span').isContentEditable`));
    await key('Escape', 'Escape', 27);
    const keys = await b.eval(F(`return w.BFContent.blocks().filter((x) => x.el.closest('#qa-nd')).map((x) => x.key)`));
    ok('contract: nodata skipped, data-bf-text island overridden (also after re-render)', a === 'QA verb edited QA amount' && c === 'QA verb edited QA amount', `${a} | after re-render: ${c}`);
    ok('contract: nodata not editable, island editable, nodata block not split', !amountEditable && verbEditable && keys.length === 1, `blocks=${keys.join(',')}`);
    await b.eval(`(() => { window.__docs.app.text = {}; window.__frame.setAppDoc(window.__docs.app); })()`);
    await b.eval(F(`d.getElementById('qa-nd')?.remove()`));
  }
  const errs = b.errors.filter((e) => !/favicon|404|ERR_ABORTED/.test(e));
  if (errs.length) ok(`${r}: no JS errors`, false, errs.slice(0, 2).join(' | '));
}
b.close();
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
