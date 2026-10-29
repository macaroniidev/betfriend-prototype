// Feature-parity gate for the UX rebuild ("a rebuild, not a feature cut").
// qa/parity/<route>.json lists what a screen offered before the rebuild: page title, section headings,
// table columns, controls (with their options), actions, data fields and the detail drawer's contents.
// This script checks that every one of them can still be found on the screen today.
//
//   node qa/parity.mjs [route ...]            verify (default: every route that has a parity file)
//   node qa/parity.mjs --capture [route ...]  (re)generate the files from the running app; only meant for the
//                                             pre-rebuild app (it was captured from a frozen ux-before copy)
//   env BF_URL=http://127.0.0.1:44xx, WIDTH=1440 (390 to check the phone layout's DOM)
//
// How matching works: the checker visits the screen, every mode/tab it offers (Pre-match/Live, calculator
// tabs, ...), opens the detail drawer from the first row, and collects all text, including hidden text
// (collapsed <details>, menus, mobile toggles), plus aria-label/title/placeholder/option text. Text is
// lower-cased, punctuation and numbers are dropped, and each requirement must appear as a word sequence.
// When the rebuild renames something on purpose (e.g. "Calculator" -> "Calc"), add the new wording to the
// item's "aka" list in the JSON instead of deleting the item. Items render as strings or { text, aka:[...] }.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, routes as navRoutes, appUrl, sleep, ORIGIN } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'parity');
const argv = process.argv.slice(2);
const capture = argv.includes('--capture');
const named = argv.filter((a) => !a.startsWith('--'));
const WIDTH = Number(process.env.WIDTH || 1440);

// Renames already agreed in qa/ux-decisions.json; the capture writes them as "aka" so the gate expects them.
const AKA = {
  calculator: ['calc'],
};

// ---------------------------------------------------------------- in-page helpers (serialised to the page)

/** Inventory of the current screen state. Runs in the page. */
function inventory() {
  const view = document.getElementById('view');
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const visibleText = (el) => clean([...el.childNodes].map((n) => (n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 && !n.matches('svg,script,style') ? n.textContent : '')).join(' '));
  // Data rows and repeated result items: their wording is data, not a feature (only their actions count).
  const isData = (el) => !!el.closest('tbody, [data-bf-list], [data-bf-nodata], .feed, .drawer-wrap .chart');
  const repeated = (el) => {
    for (let e = el.parentElement; e && e !== view; e = e.parentElement) {
      if (!e.parentElement || !/^(DIV|ARTICLE|LI|SECTION|A|BUTTON)$/.test(e.tagName)) continue;
      const same = [...e.parentElement.children].filter((c) => c.tagName === e.tagName && c.className === e.className);
      if (same.length >= 3 && e.className && !e.matches('.stat, .field')) return true;
    }
    return false;
  };
  const out = { title: '', sections: [], columns: [], controls: [], actions: [], rowActions: [], fields: [] };
  const add = (k, v) => { v = clean(v); if (v && v.length <= 90 && !out[k].includes(v)) out[k].push(v); };
  const scope = (root) => {
    for (const h of root.querySelectorAll('h1')) if (!out.title) out.title = clean(h.textContent);
    for (const h of root.querySelectorAll('h2, h3, h4, header strong')) if (!isData(h) && !repeated(h)) add('sections', h.textContent);
    for (const th of root.querySelectorAll('thead th, [role=columnheader]')) add('columns', th.textContent);
    // Labelled controls: <label class="field"><span>Label</span> control</label>, checkboxes, bare inputs.
    for (const lab of root.querySelectorAll('label, .field')) {
      if (isData(lab) && !lab.closest('.drawer-wrap')) continue;
      const ctl = lab.querySelector('select, input, textarea, .seg');
      if (!ctl) continue;
      const name = clean(lab.querySelector(':scope > span, :scope > b, :scope > strong, :scope > small')?.textContent || visibleText(lab));
      const options = ctl.matches('select') ? [...ctl.options].map((o) => clean(o.textContent)) : ctl.matches('.seg') ? [...ctl.querySelectorAll('button')].map((x) => clean(x.textContent)) : [];
      const kind = ctl.matches('select') ? 'select' : ctl.matches('.seg') ? 'choice' : ctl.type === 'checkbox' ? 'checkbox' : ctl.type === 'range' ? 'slider' : 'input';
      if (name && !out.controls.some((c) => c.label === name)) out.controls.push({ label: name.slice(0, 80), kind, ...(options.length ? { options: [...new Set(options)].filter(Boolean) } : {}) });
    }
    for (const inp of root.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      const label = clean(inp.placeholder).slice(0, 80);
      if (!isData(inp) && !inp.closest('label, .field') && !out.controls.some((c) => c.label === label)) out.controls.push({ label, kind: 'input' });
    }
    // Segmented switches / tabs not inside a label.
    for (const seg of root.querySelectorAll('.seg, [role=tablist], .tabs')) {
      if (seg.closest('label, .field') || (isData(seg) && !seg.closest('.drawer-wrap'))) continue;
      const options = [...seg.querySelectorAll('button, [role=tab], a')].map((x) => clean(x.textContent)).filter(Boolean);
      if (options.length && !out.controls.some((c) => c.kind === 'switch' && c.options.join() === options.join())) out.controls.push({ label: options.join(' / ').slice(0, 80), kind: 'switch', options });
    }
    for (const el of root.querySelectorAll('button, a.btn, a[href^="#"], [role=button]')) {
      if (el.closest('.seg, [role=tablist], .tabs, .side, .topbar')) continue;
      const t = clean(el.textContent) || el.getAttribute('aria-label') || el.title;
      if (!t) continue;
      if (isData(el) || repeated(el)) add('rowActions', t); else add('actions', t);
    }
    for (const el of root.querySelectorAll('.stat > span, .stat > small:first-child, dt, .kv dt, .lbl, .label')) if (!isData(el) && !repeated(el)) add('fields', el.textContent);
  };
  scope(view);
  return out;
}

/** Text corpus of the current state: every text node (hidden ones too) and labelling attributes. */
function corpus() {
  const parts = [];
  const roots = [document.getElementById('view'), ...document.querySelectorAll('.drawer-wrap, [role=dialog], [data-bf-drawer], [role=menu], [role=listbox], .popover, .sheet')];
  for (const root of new Set(roots.filter(Boolean))) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) if (n.nodeValue.trim() && !n.parentElement.closest('script,style')) parts.push(n.nodeValue);
    for (const el of root.querySelectorAll('[aria-label], [title], [placeholder], [data-label], option')) {
      for (const a of ['aria-label', 'title', 'placeholder', 'data-label']) if (el.getAttribute(a)) parts.push(el.getAttribute(a));
    }
  }
  return parts.join(' | ');
}

/** Clickable mode switches / tabs on the screen (not filters inside the toolbar). Returns their labels. */
function modeButtons() {
  const btns = [...document.querySelectorAll('#view .page-head .seg button, #view .head-actions button, #view [role=tablist] [role=tab], #view .tabs button, #view .tabs a, #view [data-mode], #view .mode-switch button')];
  return [...new Set(btns.filter((b) => !b.closest('tbody, .toolbar, label, .field') && !/^https?:/.test(b.getAttribute('href') || '')).map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
function clickMode(label) {
  const btns = [...document.querySelectorAll('#view .page-head .seg button, #view .head-actions button, #view [role=tablist] [role=tab], #view .tabs button, #view .tabs a, #view [data-mode], #view .mode-switch button')];
  const b = btns.find((x) => x.textContent.replace(/\s+/g, ' ').trim() === label);
  if (!b) return false;
  b.click(); return true;
}

/** Try to open the detail drawer from the first result. Returns how, or ''. Runs in the page (async). */
async function openDrawer() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const open = () => !!document.querySelector('.drawer-wrap, [role=dialog][aria-modal=true], [data-bf-drawer]:not([hidden])');
  const hash = location.hash;
  const rowSel = '#view [data-bf-list] > *, #view table:not(.mini) tbody tr';
  for (let i = 0; i < 20 && !document.querySelector(rowSel); i++) await wait(150); // lists can render late
  const firstRow = document.querySelector(rowSel);
  const cands = [];
  if (firstRow) {
    cands.push(['row', firstRow.querySelector('td:nth-child(2)') || firstRow]);
    for (const b of firstRow.querySelectorAll('[data-act=calc], [data-act=open], [data-act=details], button, a.btn')) if (!/^\s*(bet|buy|sell|place|log|track|alert)\b/i.test(b.textContent) && !b.closest('a[href^="http"]')) cands.push([`button "${b.textContent.trim().slice(0, 20)}"`, b]);
  }
  for (const [how, el] of cands) {
    el.click();
    await wait(450);
    // A click that navigated away: go back by setting the hash (history.back() can leave the app, because
    // persisted views use history.replaceState and there may be no in-app entry to return to).
    if (location.hash !== hash) {
      location.hash = hash;
      for (let j = 0; j < 40 && !document.querySelector('#view h1'); j++) await wait(150);
      await wait(300);
      return '';
    }
    if (open()) return how;
  }
  return '';
}
function closeDrawer() {
  document.querySelectorAll('.drawer-wrap [data-close], [role=dialog] [data-close]').forEach((b) => b.click());
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.querySelectorAll('.drawer-wrap').forEach((d) => d.remove());
}
function drawerInventory() {
  const d = document.querySelector('.drawer-wrap, [role=dialog][aria-modal=true], [data-bf-drawer]:not([hidden])');
  if (!d) return null;
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const uniq = (a) => [...new Set(a.map(clean).filter((x) => x && x.length <= 90))];
  return {
    sections: uniq([...d.querySelectorAll('h3, h4, .sec-title')].map((h) => h.textContent)),
    columns: uniq([...d.querySelectorAll('thead th')].map((h) => h.textContent)),
    fields: uniq([...d.querySelectorAll('dt, label > span, .field > span, .lbl, .stat > span')].map((h) => h.textContent)),
    actions: uniq([...d.querySelectorAll('button:not([data-close]), a.btn')].map((b) => b.textContent || b.getAttribute('aria-label'))),
  };
}

// ---------------------------------------------------------------- node side

/** Words only: lower case, no punctuation (so "Min ROI %" matches "Min ROI", "All · 45" matches "All 45"). */
export const norm = (s) => ` ${String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
/** The same without stand-alone numbers ("Show 4 more of 4" -> "show more of"), for labels that carry counts. */
const words = (s) => norm(s).replace(/ (?:\d+ )+/g, ' ');
/** At capture: drop live numbers from labels (counts, dollar amounts, percentages), keep the words. */
const generalize = (s) => String(s).replace(/[+\-−]?\d+(?:\.\d+)?¢/g, '').replace(/\s*[·(]\s*\d[\d,]*\)?\s*$/, '').replace(/[+\-−]?\$[\d,.]+[kKmM]?/g, '').replace(/[+\-−]?\d[\d.,]*%/g, '')
  .replace(/:.*$/, '').replace(/[✎→↗❚]+/g, '').replace(/\s+/g, ' ').trim();
/** Row actions mention the book ("Bet ESPN") and amounts: keep the verb words only. */
const verbOnly = (s) => s.split(/\s+/).filter((w) => !/^[A-Z0-9$+\-.,%@→↗·]+$/.test(w) || /^[A-Z][a-z]/.test(w)).join(' ').replace(/[→↗✎⇄]/g, '').trim();

async function visit(b, route) {
  await b.go(appUrl(route), 1900);
  const states = ['default'];
  let corp = await b.run(corpus);
  const inv = [await b.run(inventory)];
  const modes = await b.run(modeButtons);
  for (const m of modes) {
    if (!(await b.run(clickMode, m))) continue;
    await sleep(700);
    if (!(await b.eval('location.hash')).startsWith(`#/${route}`)) { await b.go(appUrl(route), 1500); continue; }
    states.push(`mode: ${m}`);
    corp += ' | ' + await b.run(corpus);
    inv.push(await b.run(inventory));
  }
  // Back to the default state, then the drawer from the first result.
  await b.go(appUrl(route), 1700);
  const via = await b.run(openDrawer);
  let drawer = null;
  if (via) {
    await sleep(300);
    drawer = await b.run(drawerInventory);
    corp += ' | ' + await b.run(corpus);
    await b.run(closeDrawer);
  }
  return { states, corpus: { full: norm(corp), words: words(corp) }, inv, drawer, via };
}

const merge = (invs) => {
  const m = { title: invs[0].title, sections: [], columns: [], controls: [], actions: [], rowActions: [], fields: [] };
  for (const i of invs) {
    for (const k of ['sections', 'columns', 'actions', 'rowActions', 'fields']) for (const v of i[k]) if (!m[k].includes(v)) m[k].push(v);
    for (const c of i.controls) if (!m.controls.some((x) => x.label === c.label)) m.controls.push(c);
  }
  return m;
};

/** Flatten a parity file into [{ cat, text, aka }] requirements. */
function requirements(p) {
  const out = [];
  const item = (cat, x) => (typeof x === 'string' ? { cat, text: x, aka: [] } : { cat, text: x.text ?? x.label, aka: x.aka || [] });
  if (p.title) out.push(item('title', p.title));
  // Items marked { onlyWhenLocked: true } are the "Included in <plan>" chips: item B10 shows them only when the
  // person's plan lacks the tool, and QA runs on All-Access, so they are not expected on screen.
  for (const k of ['sections', 'columns', 'actions', 'rowActions', 'fields']) for (const x of p[k] || []) if (!x?.onlyWhenLocked) out.push(item(k, x));
  for (const c of p.controls || []) {
    if (c.kind !== 'switch') out.push(item('controls', { text: c.label, aka: c.aka })); // a switch is its options
    for (const o of c.options || []) out.push(item(`controls › ${c.label}`, o));
  }
  if (p.drawer) for (const k of ['sections', 'columns', 'fields', 'actions']) for (const x of p.drawer[k] || []) out.push(item(`drawer ${k}`, x));
  return out;
}
// Found when the words appear in order, either exactly (numbers included, e.g. "2×", "Leg 3 odds") or with
// stand-alone numbers ignored on both sides (counts such as "Show 4 more of 4").
const found = (corp, r) => [r.text, ...r.aka].some((t) => (norm(t).trim() && corp.full.includes(norm(t))) || (words(t).trim() && corp.words.includes(words(t))));

const b = await browser({ width: WIDTH, height: WIDTH < 500 ? 844 : 1000, mobile: WIDTH < 500, theme: 'light' });
let problems = 0;
if (capture) {
  mkdirSync(dir, { recursive: true });
  const list = named.length ? named : await navRoutes();
  for (const route of list) {
    const v = await visit(b, route);
    const m = merge(v.inv);
    // Only text that is a feature: drop pure numbers, keep the verb of row actions.
    const real = (s) => norm(s).trim().length > 0 && !/^@/.test(s);
    const p = {
      route,
      captured: { from: 'ux-before (app as it was before the UX rebuild)', origin: ORIGIN, width: WIDTH, date: new Date().toISOString().slice(0, 10), states: v.states, drawerVia: v.via || null },
      title: m.title,
      sections: [...new Set(m.sections.map(generalize).filter(real))],
      columns: [...new Set(m.columns.map(generalize).filter(real))],
      controls: m.controls.map((c) => ({ ...c, label: c.kind === 'switch' ? c.label : generalize(c.label) })).filter((c) => real(c.label)).map((c) => ({ ...c, ...(c.options ? { options: c.options.filter(real) } : {}) })),
      actions: [...new Set(m.actions.map(generalize).filter(real))],
      rowActions: [...new Set(m.rowActions.filter(real).map((x) => generalize(verbOnly(x))).filter(real))],
      fields: [...new Set(m.fields.map(generalize).filter(real))],
      ...(v.drawer ? { drawer: { sections: [...new Set(v.drawer.sections.map(generalize).filter(real))], columns: [...new Set(v.drawer.columns.map(generalize).filter(real))], fields: [...new Set(v.drawer.fields.map(generalize).filter(real))], actions: [...new Set(v.drawer.actions.map((x) => generalize(verbOnly(x))).filter(real))] } } : {}),
    };
    // Planned renames become accepted alternatives.
    const withAka = (x) => { const a = AKA[norm(x).trim()]; return a ? { text: x, aka: a } : x; };
    for (const k of ['actions', 'rowActions']) p[k] = p[k].map(withAka);
    if (p.drawer) p.drawer.actions = p.drawer.actions.map(withAka);
    // Keep only what a fresh visit finds again (drops time-dependent text such as "Updated 3s ago").
    const again = await visit(b, route);
    const keep = (cat, x) => found(again.corpus, requirements({ [cat]: [x] })[0] || { text: '', aka: [] });
    let dropped = 0;
    for (const k of ['sections', 'columns', 'actions', 'rowActions', 'fields']) p[k] = p[k].filter((x) => keep(k, x) || (dropped++, false));
    p.controls = p.controls.filter((c) => found(again.corpus, { text: c.label, aka: [] }) || (dropped++, false)).map((c) => (c.options ? { ...c, options: c.options.filter((o) => found(again.corpus, { text: o, aka: [] }) || (dropped++, false)) } : c));
    if (p.drawer && again.drawer) for (const k of ['sections', 'columns', 'fields', 'actions']) p.drawer[k] = p.drawer[k].filter((x) => found(again.corpus, typeof x === 'string' ? { text: x, aka: [] } : x) || (dropped++, false));
    writeFileSync(join(dir, `${route}.json`), JSON.stringify(p, null, 1) + '\n');
    console.log(`captured ${route.padEnd(20)} ${requirements(p).length} items (${v.states.length} states, drawer: ${v.via || 'none'}, ${dropped} volatile dropped)`);
  }
} else {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')) : [];
  const nav = await navRoutes();
  const list = named.length ? named : files;
  const noFile = nav.filter((r) => !files.includes(r));
  if (noFile.length) console.log(`note: no parity file for ${noFile.join(', ')} (new screens are not gated)`);
  for (const route of list) {
    const p = JSON.parse(readFileSync(join(dir, `${route}.json`), 'utf8'));
    if (!nav.includes(route)) { console.log(`FAIL  ${route}: route no longer in nav.js`); problems++; continue; }
    const v = await visit(b, route);
    const reqs = requirements(p);
    const missing = reqs.filter((r) => !found(v.corpus, r));
    if (p.drawer && !v.via) missing.push({ cat: 'drawer', text: '(the detail drawer did not open from the first row)' });
    problems += missing.length;
    console.log(`${missing.length ? 'FAIL' : 'ok  '}  ${route.padEnd(20)} ${reqs.length - missing.length}/${reqs.length}${p.drawer ? ` · drawer ${v.via ? 'opened' : 'NOT opened'}` : ''}`);
    for (const r of missing) console.log(`        missing ${r.cat}: "${r.text}"`);
  }
  console.log(`\n${list.length} routes checked, ${problems} missing items`);
}
b.close();
process.exit(problems ? 1 : 0);
