// QA: open every route (from NAV in public/js/nav.js) in headless Chrome at desktop (1440), phone (390) and
// small phone (360) width, with true mobile emulation. Reports console errors, horizontal overflow, load failures
// and broken values, measures where the first result row starts, and saves phone screenshots.
// Usage: node qa/check.mjs        (server must be running; BF_URL=http://127.0.0.1:44xx to target another one)
//   env THEME=light|dark (default light)   SHOTS=0 to skip the 390px screenshots
// Writes qa/first-row.json: { "<width>": { "<route>": { y, sel } } }  (y = document px of the first result row).
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, routes as navRoutes, appUrl, sleep, CORE_ROUTES } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const routes = await navRoutes();
console.log(`${routes.length} routes found in nav.js (${CORE_ROUTES.length} core routes present)`);

// Runs in the page. The first result row: the first visible item of the page's primary list ([data-bf-list] is
// the rebuild contract: mark the main results container with it). Before that contract existed, the topmost
// row of a full data table, feed item or result card is used. Hidden elements are ignored.
function firstRow() {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const y = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
  const listed = [...document.querySelectorAll('#view [data-bf-list] > *')].find(vis);
  if (listed) return { y: y(listed), sel: '[data-bf-list] > *' };
  const cands = [...document.querySelectorAll('#view table:not(.mini) tbody tr, #view .feed > *, #view .list > *, #view article.card')].filter(vis);
  if (!cands.length) return null;
  const top = cands.reduce((a, b) => (y(b) < y(a) ? b : a));
  return { y: y(top), sel: top.matches('tr') ? 'table row' : top.matches('article') ? 'card' : 'feed item' };
}

function probe() {
  const doc = document.documentElement;
  const view = document.getElementById('view');
  const wide = [...document.querySelectorAll('#view *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.table-wrap,[style*="overflow"],.scroll-x') && getComputedStyle(el).position !== 'fixed').slice(0, 3).map((el) => el.tagName + '.' + [...el.classList].join('.'));
  return { overflow: doc.scrollWidth - innerWidth, failed: !view || (document.body?.innerText || '').includes('could not load'), nan: /\$NaN|NaN%|undefined|\[object Object\]/.test(view?.innerText || ''), wide };
}

// Poll until the screen has rendered (a #view with content and no loading skeleton), up to 15s, then let
// one tick pass. A fixed wait gave blank loads (and a null document.body) when the machine was busy.
async function ready() {
  for (let i = 0; i < 75; i++) {
    const ok = await b.eval(`(() => { const v = document.getElementById('view'); return !!(v && v.children.length && !v.querySelector('.skel,[aria-busy=true]')); })()`).catch(() => false);
    if (ok) break;
    await sleep(200);
  }
  await sleep(1200);
}

const results = [];
const first = {};
const b = await browser({ theme: process.env.THEME || 'light' });
for (const [w, h, mobile] of [[1440, 1000, false], [390, 844, true], [360, 780, true]]) {
  await b.size(w, h, mobile);
  first[w] = {};
  for (const r of routes) {
    b.errors.length = 0;
    await b.go(appUrl(r), 600);
    await ready();
    const v = await b.run(probe);
    if (w !== 360) first[w][r] = await b.run(firstRow);
    results.push({ size: w, route: r, ...v, errors: [...b.errors] });
    if (w === 390 && process.env.SHOTS !== '0') await b.shot(join(here, `${r}-390.png`));
  }
}
b.close();
writeFileSync(join(here, 'first-row.json'), JSON.stringify(first, null, 1) + '\n');

const bad = results.filter((x) => x.overflow > 0 || x.failed || x.nan || x.errors.length);
for (const x of bad) console.log(`${x.size} ${x.route}: overflow=${x.overflow} failed=${x.failed} nan=${x.nan} wide=${x.wide.join(',')} errors=${x.errors.slice(0, 2).join(' | ')}`);
console.log('\nfirst result row (document y px)   1440 | 390');
for (const r of routes) { const a = first[1440][r], m = first[390][r]; if (a || m) console.log(`  ${r.padEnd(20)} ${String(a?.y ?? '-').padStart(6)} | ${String(m?.y ?? '-').padStart(6)}   ${a?.sel || m?.sel || ''}`); }
console.log(`\n${results.length} checks (${routes.length} routes × 1440/390/360), ${bad.length} with problems`);
await sleep(10);
process.exit(bad.length ? 1 : 0);
