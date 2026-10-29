// Command palette and keyboard scan layer (item C14 / 45).
//
// Palette: Ctrl K / ⌘K (anywhere), "/" when the page has no search field of its own, the top-bar search
// button or any [data-open-palette] element. It finds screens (with their HINTS line), saved views such as
// live modes and the prediction-market scanner, calculator tabs, settings sections and display settings.
// It never places, logs or sizes a bet: every result navigates or changes a display preference.
//
// Keyboard scan layer (single keys, never in a text field, a contentEditable, an open dialog or the editor):
//   j / k     next / previous result row (ui.table rows and focusable [data-bf-list] items)
//   Enter     open the focused row's details (ui.table's own handler; it opens a drawer, it never bets)
//   /         focus this page's search field, or open the palette
//   g + key   go to a screen (g d Daily, g a Arbitrage …)
//   ?         the shortcut cheat sheet
// Single-key Bet was rejected in the UX review (a reordering list makes a wrong bet too easy): no key here
// presses a Bet, Buy, Log or Convert button.
//
// Both dialogs sit outside #app (so a screen re-render or the drawer's inert never touches them), carry
// data-bf-palette + data-bf-noedit (excluded from the owner editor's selection in admin/frame.js) and
// data-bf-ignore (content.js never re-applies edits for their mutations).

import { NAV, HINTS } from './nav.js';
import { store } from './store.js';
import * as theme from './theme.js';
import * as content from './content.js';
import { esc, ODDS_FORMATS, toast, closeDrawer } from './ui.js';
import { icon } from './icons.js';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const PALETTE_KEY = isMac ? '⌘K' : 'Ctrl K';

/** g + key → route. Shown in the cheat sheet and next to the screen in palette results. */
const GO = { d: 'daily', a: 'arbitrage', e: 'positive-ev', m: 'middles', l: 'low-holds', p: 'promo-converter', h: 'sharp-money', o: 'pm-markets', n: 'alerts', t: 'tracker', c: 'calculators', s: 'account' };
const GO_OF = Object.fromEntries(Object.entries(GO).map(([k, r]) => [r, k]));

// ---------- commands ----------
const CALC_TABS = [['arb', 'Arbitrage'], ['ev', '+EV & No-vig'], ['kelly', 'Kelly'], ['parlay', 'Parlay'], ['hold', 'Hold'], ['convert', 'Odds converter'], ['bonus', 'Bonus bet'], ['middle', 'Middle']];
const SETTINGS = [['set-where', 'Location & plan', 'state plan'], ['set-sizing', 'Bankroll & sizing', 'bankroll kelly stake round'], ['set-books', 'My books', 'sportsbooks books'],
  ['set-display', 'Theme & odds', 'dark light odds format'], ['set-goal', 'Your goal', 'risk goal setup reset']];
const VIEWS = [
  ['arbitrage?mode=live', 'Arbitrage · Live', 'Arbitrage', 'in-game arbs'],
  ['positive-ev?mode=live', 'Positive EV · Live', 'Positive EV', 'in-game ev'],
  ['pm-markets?view=scanner', 'Cross-venue scanner', 'Markets & Order Book', 'prediction markets kalshi polymarket compare venues cheapest'],
  ['promo-converter?type=bonus-bet', 'Convert a bonus bet', 'Promo Converter', 'free bet site credit'],
];

function commands() {
  const out = [];
  for (const g of NAV) {
    for (const [id, label, ic] of g.items) {
      out.push({ group: 'Screens', label, sub: HINTS[id] || g.group, ic, kbd: GO_OF[id] ? `g ${GO_OF[id]}` : '', words: `${g.group} ${id}`, run: () => go(id) });
    }
  }
  for (const [to, label, parent, words] of VIEWS) out.push({ group: 'Views', label, sub: parent, ic: 'filter', words, run: () => go(to) });
  for (const [tab, label] of CALC_TABS) out.push({ group: 'Calculators', label: `${label} calculator`, sub: 'Calculators', ic: 'calc', words: tab, run: () => go(`calculators?tab=${tab}`) });
  for (const [id, label, words] of SETTINGS) out.push({ group: 'Settings', label, sub: 'Settings', ic: 'settings', words, run: () => goSection(id) });
  out.push({ group: 'Settings', label: 'Bet sizing', sub: 'Bankroll, arb stake, Kelly, rounding', ic: 'sliders', words: 'bankroll kelly popover', run: () => window.dispatchEvent(new Event('bf:open-sizing')) });
  const pref = theme.get();
  for (const [p, l] of [['light', 'Light theme'], ['dark', 'Dark theme'], ['auto', 'Theme: follow the system']]) {
    out.push({ group: 'Display', label: l, sub: pref === p ? 'On now' : 'Theme', ic: 'settings', words: 'theme mode colour color', run: () => { theme.set(p); toast(`${l} on`); } });
  }
  const fmt = store.get().oddsFormat || 'american';
  for (const [f, l] of ODDS_FORMATS) out.push({ group: 'Display', label: `Odds: ${l}`, sub: fmt === f ? 'On now' : 'Odds format', ic: 'settings', words: `odds format ${f}`, run: () => { store.set({ oddsFormat: f }); toast(`Odds now show as ${l}`); } });
  out.push({ group: 'Help', label: 'Keyboard shortcuts', sub: 'j / k, /, g + key, ?', ic: 'info', words: 'keys shortcuts hotkeys', kbd: '?', run: () => openHelp() });
  return out;
}

function go(to) { location.hash = to.includes('?') ? `#/${to}` : `#${to}`; }
/** Settings sections have ids; open Settings first when needed, then scroll to the section. */
function goSection(id) {
  const show = () => { const el = document.getElementById(id); if (!el) return false; el.scrollIntoView({ block: 'start' }); el.querySelector('h2')?.setAttribute('tabindex', '-1'); el.querySelector('h2')?.focus({ preventScroll: true }); return true; };
  if (location.hash.replace(/^#\/?/, '').split('?')[0] === 'account' && show()) return;
  go('account');
  let n = 0;
  const wait = () => { if (!show() && ++n < 120) requestAnimationFrame(wait); };
  requestAnimationFrame(wait);
}

/** Every query word must appear in the label, group, hint or keywords. Label starts rank first. */
function search(list, q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list.filter((c) => c.group !== 'Display' && c.group !== 'Calculators');
  const scored = list.map((c) => {
    const label = c.label.toLowerCase();
    const hay = `${label} ${c.sub} ${c.group} ${c.words || ''}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return null;
    const score = (label.startsWith(words[0]) ? 0 : label.includes(` ${words[0]}`) ? 1 : label.includes(words[0]) ? 2 : 3) + (c.group === 'Screens' ? 0 : 0.5);
    return [score, c];
  }).filter(Boolean).sort((a, b) => a[0] - b[0]);
  // Keep each group together (one heading per group), groups ordered by their best match.
  const rank = new Map();
  scored.forEach(([sc, c]) => { if (!rank.has(c.group)) rank.set(c.group, sc); });
  return scored.sort((a, b) => (rank.get(a[1].group) - rank.get(b[1].group)) || a[1].group.localeCompare(b[1].group) || a[0] - b[0]).map((x) => x[1]);
}

// ---------- dialogs ----------
let pal = null, help = null, opener = null, items = [], active = 0;

function mount() {
  if (pal) return;
  const shared = 'data-bf-palette data-bf-noedit data-bf-ignore';
  document.body.insertAdjacentHTML('beforeend', `
  <div class="palette-wrap" id="palette" ${shared} hidden>
    <div class="palette-bg" data-pal-close></div>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Search tools and settings">
      <div class="pal-in">${icon('search', { size: 18 })}
        <input type="text" id="pal-q" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Search tools, calculators, settings" aria-label="Search tools, calculators and settings">
        <button type="button" class="pal-esc" data-pal-close aria-label="Close search"><kbd>Esc</kbd></button></div>
      <ul class="pal-list" id="pal-list" role="listbox" aria-label="Results"></ul>
      <p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>Enter</kbd> open</span><span><kbd>?</kbd> shortcuts</span></p>
    </div>
  </div>
  <div class="palette-wrap" id="kbd-help" ${shared} hidden>
    <div class="palette-bg" data-pal-close></div>
    <div class="palette kbd-sheet" role="dialog" aria-modal="true" aria-labelledby="kbd-h" tabindex="-1">
      <div class="kbd-head"><h2 id="kbd-h">Keyboard shortcuts</h2><button type="button" class="icon-btn" data-pal-close aria-label="Close">${icon('close', { size: 18 })}</button></div>
      <dl class="kbd-list">
        <dt><kbd>${esc(PALETTE_KEY)}</kbd></dt><dd>Search tools, calculators and settings</dd>
        <dt><kbd>/</kbd></dt><dd>Search this page (or open the search above)</dd>
        <dt><kbd>j</kbd> <kbd>k</kbd></dt><dd>Next / previous result row</dd>
        <dt><kbd>Enter</kbd></dt><dd>Open the focused row’s details</dd>
        <dt><kbd>Esc</kbd></dt><dd>Close a drawer, menu or this list</dd>
        <dt><kbd>?</kbd></dt><dd>This list</dd>
      </dl>
      <h3 class="kbd-h3">Go to a screen: <kbd>g</kbd> then</h3>
      <dl class="kbd-list kbd-go">${Object.entries(GO).map(([k, r]) => `<dt><kbd>${k}</kbd></dt><dd>${esc(labelOf(r))}</dd>`).join('')}</dl>
      <p class="kbd-note">No shortcut places, logs or sizes a bet. Bet and Buy buttons always take a click, or Enter on the button itself. Shortcuts are off while you type in a field.</p>
    </div>
  </div>`);
  pal = document.getElementById('palette');
  help = document.getElementById('kbd-help');
  const input = pal.querySelector('#pal-q');
  const list = pal.querySelector('#pal-list');
  input.addEventListener('input', () => { active = 0; paint(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); active = 0; paintActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Tab') e.preventDefault(); // focus stays in the search box (the list is driven by arrows)
  });
  list.addEventListener('pointermove', (e) => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== active) { active = +li.dataset.i; paintActive(false); } });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
  for (const w of [pal, help]) w.addEventListener('click', (e) => { if (e.target.closest('[data-pal-close]')) close(); });
  // Keep Tab inside the cheat sheet (its only control is Close).
  help.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); help.querySelector('.icon-btn').focus(); } });
}
const labelOf = (r) => NAV.flatMap((g) => g.items).find(([id]) => id === r)?.[1] || r;

function paint(q) {
  items = search(commands(), q).slice(0, 40);
  const list = pal.querySelector('#pal-list');
  let last = '';
  list.innerHTML = items.length ? items.map((c, i) => {
    const head = c.group !== last ? `<li class="pal-g" role="presentation">${esc(c.group)}</li>` : '';
    last = c.group;
    return `${head}<li class="pal-it" role="option" id="pal-o${i}" data-i="${i}" aria-selected="false">${icon(c.ic || 'dot', { size: 18 })}
      <span class="pal-t"><b>${esc(c.label)}</b><small>${esc(c.sub)}</small></span>${c.kbd ? `<kbd>${esc(c.kbd)}</kbd>` : ''}</li>`;
  }).join('') : `<li class="pal-none" role="presentation">Nothing matches “${esc(q)}”. Try a tool name such as arbitrage, kelly or bonus.</li>`;
  paintActive();
}
function paintActive(scroll = true) {
  const input = pal.querySelector('#pal-q');
  pal.querySelectorAll('.pal-it').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === active)));
  const cur = pal.querySelector(`#pal-o${active}`);
  if (cur) { input.setAttribute('aria-activedescendant', cur.id); if (scroll) cur.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
}
function move(d) { if (!items.length) return; active = (active + d + items.length) % items.length; paintActive(); }
function choose(i) {
  const c = items[i];
  if (!c) return;
  close({ restore: c.group === 'Display' });
  c.run();
}

const isOpen = () => (pal && !pal.hidden) || (help && !help.hidden);

export function openPalette(q = '') {
  mount();
  if (!help.hidden) close({ restore: false });
  if (document.querySelector('.drawer-wrap')) closeDrawer({ restore: false }); // one dialog at a time
  if (pal.hidden) opener = document.activeElement;
  pal.hidden = false;
  document.body.classList.add('pal-open');
  const input = pal.querySelector('#pal-q');
  input.value = q;
  active = 0;
  paint(q);
  input.focus();
}
export function openHelp() {
  mount();
  if (!pal.hidden) close({ restore: false });
  if (help.hidden) opener = opener && document.contains(opener) ? opener : document.activeElement;
  help.hidden = false;
  document.body.classList.add('pal-open');
  help.querySelector('.palette').focus();
}
export function close({ restore = true } = {}) {
  if (!pal) return;
  pal.hidden = true;
  help.hidden = true;
  document.body.classList.remove('pal-open');
  const back = opener;
  opener = null;
  if (!restore) return;
  if (back && document.contains(back) && back !== document.body && !back.closest('[inert]')) back.focus({ preventScroll: true });
  else document.getElementById('view')?.focus({ preventScroll: true });
}

// ---------- keyboard scan layer ----------
const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest?.('[contenteditable=""],[contenteditable="true"]'));
/** The owner editor (/admin) loads the app with content mode 'edit': no single-key shortcuts there. */
const editing = () => content.mode === 'edit' || !!window.__BF_EDITING;
/** A drawer, sheet or menu is open: single keys belong to it. */
const dialogOpen = () => !!document.querySelector('#app [role=dialog][aria-modal="true"]:not([hidden]), .drawer-wrap:not([hidden]), #sizing-pop:not([hidden]), body.nav-open');

// Rows only: never a Bet/Buy/Log button itself (.btn / [data-act] children are skipped).
const ROWS = '#view tr[data-key][tabindex]:not(.gone), #view [data-bf-list] > [tabindex="0"]:not(.btn):not([data-act]), #view [data-bf-list] > a[href]:not(.btn):not([data-act]), #view [data-bf-list] > button:not(.btn):not([data-act])';
function rows() {
  return [...document.querySelectorAll(ROWS)].filter((el) => el.getClientRects().length && !el.closest('[hidden]'));
}
function step(d) {
  const list = rows();
  if (!list.length) return false;
  const cur = document.activeElement;
  let i = list.findIndex((r) => r === cur || r.contains(cur));
  if (i < 0) {
    // Start from what's on screen: the first row below the sticky top bar (j) or the last one above the fold (k).
    const top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 58) + 40;
    const vis = list.map((r) => r.getBoundingClientRect());
    i = d > 0 ? vis.findIndex((r) => r.top >= top) : vis.map((r) => r.bottom <= innerHeight).lastIndexOf(true);
    if (i < 0) i = d > 0 ? 0 : list.length - 1;
  } else i = Math.min(list.length - 1, Math.max(0, i + d));
  const el = list[i];
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest' });
  return true;
}
function pageSearch() {
  const f = [...document.querySelectorAll('#view input[type=search], #view input[data-q], #view input[data-search], #view [data-fb-search] input')]
    .find((el) => el.getClientRects().length && !el.disabled && !el.closest('[hidden]'));
  if (!f) return false;
  f.focus();
  f.select?.();
  return true;
}

let gAt = 0;
function onKey(e) {
  if (e.defaultPrevented || e.isComposing) return;
  // Ctrl K / ⌘K works everywhere, even in a field (except the owner editor).
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
    if (editing()) return;
    e.preventDefault();
    if (pal && !pal.hidden) close(); else openPalette();
    return;
  }
  if (isOpen()) { if (e.key === 'Escape') { e.preventDefault(); close(); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (editing() || typing(e.target) || dialogOpen()) return;
  const k = e.key;
  if (gAt && Date.now() - gAt < 1200) {
    gAt = 0;
    const r = GO[k.toLowerCase()];
    if (r) { e.preventDefault(); go(r); }
    return;
  }
  gAt = 0;
  if (k === '?') { e.preventDefault(); openHelp(); return; }
  if (k === '/') { e.preventDefault(); if (!pageSearch()) openPalette(); return; }
  if (e.shiftKey) return;
  if (k === 'j' || k === 'k') { if (step(k === 'j' ? 1 : -1)) e.preventDefault(); return; }
  if (k === 'g') { gAt = Date.now(); }
}

/** Wire the palette + keyboard layer once (app.js). */
export function start() {
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-open-palette]');
    if (!t) return;
    e.preventDefault();
    openPalette();
  });
  // A route change closes the palette (e.g. browser Back while it's open).
  window.addEventListener('hashchange', () => { if (isOpen()) close({ restore: false }); });
}
