// Editor-contract check for app screens (see the contract notes at the top of public/js/content.js).
// For each route it reads the owner editor's block tree (window.BFContent.blocks()) at t=0 and again after the
// live data has ticked for a while, and reports:
//   - unstable keys: block keys that appeared/disappeared between the two reads (saved layouts would break)
//   - headingless blocks: panels the editor can only call "Panel" (no h1/h2/h3 and no known class)
//   - idle applies: how often content.js re-applied while idle with no owner edits (should be 0)
//   - with an edit: the same check with one text override active, and that the override is still shown
// Usage: node qa/blocks.mjs [route ...|all]   (default: arbitrage daily sharp-money; env WAIT=10000 ms, BF_URL)
// Exit code 1 when keys are unstable or an override is lost.
import { browser, routes as navRoutes, appUrl, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const all = await navRoutes();
const routes = args[0] === 'all' ? all : args.length ? args : ['arbitrage', 'daily', 'sharp-money'];
const WAIT = Number(process.env.WAIT || 10000);

// Mirrors the label logic in public/admin/frame.js (A.label: heading, BFContent.blockName, then its old class map)
// so "headingless" means "shown as Panel".
function snapshot() {
  const C = window.BFContent;
  if (!C) return { error: 'BFContent missing' };
  const NAMES = ['page-head', 'stats', 'toolbar', 'live-bar', 'chips', 'feed', 'callout', 'table-wrap', 'welcome'];
  const list = C.blocks();
  return {
    keys: list.map((b) => b.key),
    headingless: list.filter((b) => !b.group && !b.el.dataset.bfCustom
      && !(b.el.matches('h1,h2,h3') || b.el.querySelector('h1,h2,h3,header strong'))
      && !NAMES.some((n) => b.el.classList.contains(n)) && !C.blockName?.(b.el)).map((b) => b.key),
  };
}

const b = await browser({ width: 1440, height: 1000, theme: 'light' });
let failed = 0;
for (const r of routes) {
  // 1) No owner edits.
  await b.go(appUrl(r), 1800);
  await b.eval(`window.__bfApplied = 0; addEventListener('bf:applied', () => window.__bfApplied++)`);
  const t0 = await b.run(snapshot);
  await sleep(WAIT);
  const t1 = await b.run(snapshot);
  const idle = await b.eval('window.__bfApplied');
  if (t0.error) { console.log(`${r}: ${t0.error}`); failed++; continue; }
  const gone = t0.keys.filter((k) => !t1.keys.includes(k)), added = t1.keys.filter((k) => !t0.keys.includes(k));

  // 2) One text override on the page title, as the editor would save it (keyed on one text node's original
  // text; a title like "Ask <span class=bf-name>BetFriend</span> AI" has several); it must survive the ticks.
  const H1 = `(() => { const h = document.querySelector('#view h1'); const w = h && document.createTreeWalker(h, NodeFilter.SHOW_TEXT); for (let n; w && (n = w.nextNode());) if (n.nodeValue.trim()) return n; return null; })()`;
  const h1 = await b.eval(`(${H1}?.nodeValue || '').trim()`);
  let edit = 'no h1';
  let editApplies = 0;
  if (h1) {
    await b.eval(`(() => { const d = JSON.parse(JSON.stringify(BFContent.doc)); (d.text[${JSON.stringify(r)}] ||= {})[${JSON.stringify(h1)}] = 'QA title'; BFContent.setDoc(d); window.__bfApplied = 0; })()`);
    await sleep(Math.min(WAIT, 5000));
    editApplies = await b.eval('window.__bfApplied');
    const shown = await b.eval(`(${H1}?.nodeValue || '').trim()`);
    edit = shown === 'QA title' ? 'kept' : `LOST (shows "${shown}")`;
    if (shown !== 'QA title') failed++;
    await b.eval(`BFContent.setDoc({})`); await sleep(300);
    const back = await b.eval(`(${H1}?.nodeValue || '').trim()`);
    if (back !== h1) { edit += ` · NOT RESTORED ("${back}")`; failed++; }
  }

  if (gone.length || added.length) failed++;
  const bad = gone.length || added.length || !/^(kept|no h1)$/.test(edit);
  console.log(`${bad ? 'FAIL' : 'ok  '}  ${r.padEnd(20)} blocks=${t0.keys.length} idle applies=${idle} (${WAIT / 1000}s) · with edit: ${edit}, applies=${editApplies}`);
  if (gone.length) console.log(`      keys gone:  ${gone.join('  ')}`);
  if (added.length) console.log(`      keys added: ${added.join('  ')}`);
  const dataKeys = t0.keys.filter((k) => /\|[^/]*\d/.test(k));
  if (dataKeys.length) console.log(`      keys with numbers in a heading (headings must be static): ${dataKeys.join('  ')}`);
  if (t0.headingless.length) console.log(`      headingless (shown as "Panel"): ${t0.headingless.join('  ')}`);
}
b.close();
console.log(`\n${routes.length} routes checked, ${failed} problems`);
process.exit(failed ? 1 : 0);
