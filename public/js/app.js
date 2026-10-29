// App shell: sidebar navigation, top bar, page footer and hash router.
// Each screen is a module in js/pages/<route>.js exporting `default function render(root, ctx)`
// that may return a cleanup function (clear timers / unsubscribe).
//
// Shell contract (owner editor + QA):
//   - .side and .topbar are the "_shell" scope for owner text edits (content.js). Their static words
//     (group headings, nav labels, field labels) stay plain text; live values sit in [data-bf-nodata].
//   - nav links keep href="#<route>" and data-route; the active one gets .on + aria-current="page".
//   - #sr-live / #sr-alert (index.html) sit outside #app; screens talk to them through ui.announce.

import { api } from './data/adapter.js';
import { store } from './store.js';
import * as ui from './ui.js';
import * as odds from './lib/odds.js';
import { PLANS, ALL_ACCESS, planHasTool, planName } from './plans.js';
import * as content from './content.js';
import { NAV, HINTS, COUNTED } from './nav.js';
import { icon } from './icons.js';
import * as theme from './theme.js';
import * as palette from './palette.js';

// Owner edits from the visual editor: plan names/prices first, so every screen sees them.
content.applyPlans(PLANS, ALL_ACCESS);

export { NAV };
const ITEMS = NAV.flatMap((g) => g.items);
const TITLES = Object.fromEntries(ITEMS.map(([id, label]) => [id, label]));
const ICONS = Object.fromEntries(ITEMS.map(([id, , ic]) => [id, ic]));

/** Responsible-gambling line: sidebar footer and the foot of every page (DESIGN.md footer copy, short form). */
const COMPLIANCE = '21+ · 1-800-GAMBLER · BetFriend is not a sportsbook and doesn’t hold your money · No bet is a sure thing.';
const SAMPLE_NOTE = 'Prototype running on sample data. Prices, profits and records are examples; real feeds connect in js/data/adapter.js.';

// Per-viewer shell memory (never required: every read/write tolerates blocked storage).
const K_CLOSED = 'bf-nav-closed'; // ids of nav groups the person collapsed
const K_RECENT = 'bf-recent'; // last tools visited, newest first
const K_SEEN = 'bf-alerts-seen'; // time the person last opened Alerts / Exit Alerts
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

const $ = (s) => document.querySelector(s);
const mqMobile = matchMedia('(max-width: 860px)');

/** "$5k" style bankroll for the phone top bar. */
function shortMoney(v) {
  if (!(v >= 1000)) return odds.money(v || 0, 0);
  const k = v / 1000;
  return `$${k >= 100 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
}

// ---------- markup ----------
function navHtml() {
  const closed = new Set(lsGet(K_CLOSED, []));
  return NAV.map((g) => `<details class="nav-group" data-group="${g.id}"${closed.has(g.id) ? '' : ' open'}>
    <summary class="nav-h"><span>${ui.esc(g.group)}</span>${icon('chevron', { size: 14, cls: 'chev' })}</summary>
    ${g.items.map(([id, label, ic]) => `<a href="#${id}" data-route="${id}"${HINTS[id] ? ` title="${ui.esc(HINTS[id])}"` : ''}>${icon(ic)}<span class="nav-label">${ui.esc(label)}</span>${COUNTED.includes(id) ? '<b class="nav-count" data-bf-nodata hidden></b>' : ''}<span class="nav-lock" data-bf-nodata hidden></span></a>`).join('')}
  </details>`).join('');
}

function sizingHtml(s) {
  return `<div class="sizing-pop on-paper" id="sizing-pop" role="dialog" aria-label="Bet sizing" hidden>
    <div class="pop-title">Bet sizing</div>
    <p class="pop-note">Every tool sizes stakes from these. Changes save when you leave a field.</p>
    <div class="pop-grid">
      ${ui.numberInput('pop-bankroll', s.bankroll, 'Bankroll', { prefix: '$', step: 100 })}
      ${ui.numberInput('pop-arbStake', s.arbStake, 'Arb total stake', { prefix: '$', step: 50 })}
      <label class="field pop-wide"><span>Kelly fraction: <strong data-pop-km data-bf-nodata>${s.kellyMult}×</strong></span><input type="range" min="0.1" max="1" step="0.05" value="${s.kellyMult}" data-pop-kelly aria-label="Kelly fraction"></label>
      <label class="field"><span>Round stakes</span><select data-pop-round>${[[0, 'Exact'], [1, 'To $1'], [5, 'To $5']].map(([v, l]) => `<option value="${v}"${+(s.stakeRound || 0) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>State</span><select data-pop-state>${api.states.map((st) => `<option${st.code === s.state ? ' selected' : ''}>${st.code}</option>`).join('')}</select></label>
      <label class="field pop-wide"><span>Odds format</span><select data-pop-odds>${ui.ODDS_FORMATS.map(([v, l]) => `<option value="${v}"${(s.oddsFormat || 'american') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <a class="pop-more" href="#account">All settings</a>
  </div>`;
}

function shell() {
  const s = store.get();
  const sample = api.source !== 'live';
  const demo = (cls) => (sample ? `<span class="pill demo ${cls}" title="${ui.esc(SAMPLE_NOTE)}">Sample data</span>` : '');
  document.getElementById('app').innerHTML = `
  <a class="skip-link" href="#view" id="skip" data-bf-noedit>Skip to content</a>
  <aside class="side" id="side" aria-label="Main menu">
    <div class="side-head">
      <a class="brand" href="#daily" aria-label="BetFriend home"><img src="../img/mate-face-deep.svg" width="34" height="34" alt=""><span class="bf-word" aria-hidden="true">Bet<span>Friend</span></span></a>
      ${demo('side-demo')}
      <a class="avatar side-avatar" href="#account" aria-label="Settings">JD</a>
      <button type="button" class="icon-btn side-close" id="side-close" aria-label="Close menu">${icon('close', { size: 20 })}</button>
    </div>
    <button type="button" class="side-search" id="pal-btn" data-open-palette aria-haspopup="dialog" title="Search tools · ${palette.PALETTE_KEY} · ? for keyboard shortcuts" data-bf-noedit>${icon('search', { size: 18 })}<span>Search tools</span><kbd aria-hidden="true">${palette.PALETTE_KEY}</kbd></button>
    <div class="recent" id="recent" hidden><div class="side-label">Recent</div><div class="recent-row" id="recent-row" data-bf-nodata></div></div>
    <nav class="side-nav" aria-label="Tools">${navHtml()}</nav>
    <div class="side-foot">
      <div id="side-plan">${planFootHtml(s.plan)}</div>
      <p class="compliance">${COMPLIANCE}</p>
    </div>
  </aside>
  <div class="side-bg" id="side-bg"></div>
  <div class="main" id="main">
    <header class="topbar">
      <button type="button" class="icon-btn menu" id="menu" aria-label="Open menu" aria-expanded="false" aria-controls="side">${icon('menu', { size: 22 })}</button>
      <a class="top-mark" href="#daily" aria-label="BetFriend home"><img src="../img/mate-face.svg" width="24" height="24" alt=""></a>
      <div class="top-title" id="top-title" aria-hidden="true"></div>
      <div class="top-right">
        ${demo('top-demo')}
        <label class="top-field top-state">State <select id="top-state">${api.states.map((st) => `<option ${st.code === s.state ? 'selected' : ''}>${st.code}</option>`).join('')}</select></label>
        <div class="sizing">
          <button type="button" class="top-chip bank" id="bank-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="sizing-pop">
            <span class="lbl">Bankroll</span><strong id="top-bank" data-bf-nodata>${odds.money(s.bankroll, 0)}</strong><strong class="short" id="top-bank-short" data-bf-nodata>${shortMoney(s.bankroll)}</strong>${icon('chevron', { size: 14, cls: 'chev' })}
          </button>
          ${sizingHtml(s)}
        </div>
        <a class="icon-btn bell" id="bell" href="#alerts" aria-label="Alerts">${icon('bell', { size: 20 })}<b class="badge" id="bell-n" data-bf-nodata hidden></b></a>
        ${theme.toggleHtml()}
        <a class="avatar top-avatar" href="#account" aria-label="Settings">JD</a>
      </div>
    </header>
    <main id="view" tabindex="-1"></main>
    <footer class="page-foot"><p class="compliance">${COMPLIANCE}</p></footer>
  </div>`;

  wireNav();
  wireSizing();
  theme.wireToggle(document.getElementById('theme-toggle'));
  $('#top-state').addEventListener('change', (e) => store.set({ state: e.target.value }));
  $('#skip').addEventListener('click', (e) => { e.preventDefault(); $('#view').focus(); $('#view').scrollIntoView(); });
  let prevPlan = s.plan;
  store.subscribe((st) => {
    if (st.plan !== prevPlan) { prevPlan = st.plan; $('#side-plan').innerHTML = planFootHtml(st.plan); paintLocks(); }
    $('#top-bank').textContent = odds.money(st.bankroll, 0);
    $('#top-bank-short').textContent = shortMoney(st.bankroll);
    $('#top-state').value = st.state;
    syncSizing(st);
  });
}

// ---------- plan awareness (item B10): sidebar footer + nav locks follow store.plan ----------
/** All-Access (the demo default) shows the plan you have, not an upsell; other plans get the upgrade CTA. */
function planFootHtml(plan = 'all-access') {
  if (plan === 'all-access') {
    return `<div class="side-plan"><span class="side-label">Your plan</span>
      <a href="#pricing" class="btn outline block side-plan-btn">All-Access · $${ALL_ACCESS.monthly}/mo</a></div>`;
  }
  return `<div class="side-plan"><span class="side-label">Your plan: <span data-bf-nodata>${ui.esc(planName(plan))}</span></span>
    <a href="#pricing" class="btn lime block">All-Access · $${ALL_ACCESS.monthly}/mo</a></div>`;
}
/** Lock glyph next to tools the person's plan doesn't include. */
function paintLocks() {
  const plan = store.get().plan || 'all-access';
  document.querySelectorAll('.side-nav a[data-route]').forEach((a) => {
    const lock = a.querySelector('.nav-lock');
    if (!lock) return;
    const locked = !planHasTool(plan, a.dataset.route);
    lock.hidden = !locked;
    // Content only while locked: other code reads nav link text (e.g. tool names on Pricing).
    lock.innerHTML = locked ? `${icon('lock', { size: 14 })}<span class="sr-only"> (not in your plan)</span>` : '';
  });
}

// ---------- sidebar: groups, mobile open/close, counts, recent tools ----------
function setNav(open, { focus = true } = {}) {
  const body = document.body;
  if (open === body.classList.contains('nav-open')) { syncInert(); return; }
  body.classList.toggle('nav-open', open);
  const menu = $('#menu');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  syncInert();
  if (!focus) return;
  // After the next frame: the sidebar only becomes focusable once its open style (visible, not inert) applies.
  if (open) requestAnimationFrame(() => { revealActive(); ($('#side a.on') || $('#side a'))?.focus({ preventScroll: true }); });
  else menu.focus();
}
/**
 * Keep the active nav link visible in the scrolling sidebar: never hidden under the sticky plan/compliance
 * footer (lower routes such as Exit Alerts, Bet Tracker, Settings). Scrolls only the sidebar, never the page.
 */
function revealActive() {
  const side = $('#side');
  const a = side?.querySelector('.side-nav a.on');
  if (!a || !a.offsetParent) return;
  const foot = side.querySelector('.side-foot');
  const sr = side.getBoundingClientRect(), ar = a.getBoundingClientRect();
  const bottom = (foot ? foot.getBoundingClientRect().top : sr.bottom) - 12;
  const top = sr.top + 12;
  if (ar.bottom > bottom) side.scrollTop += ar.bottom - bottom;
  else if (ar.top < top) side.scrollTop -= top - ar.top;
}
/** Below 860px the sidebar is an off-canvas drawer: closed = inert (Tab can't enter it), open = the page is inert. */
function syncInert() {
  const open = document.body.classList.contains('nav-open');
  $('#side').inert = mqMobile.matches && !open;
  $('#main').inert = mqMobile.matches && open;
}

function wireNav() {
  $('#menu').addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  $('#side-bg').addEventListener('click', () => setNav(false));
  $('#side-close').addEventListener('click', () => setNav(false));
  mqMobile.addEventListener('change', () => { if (!mqMobile.matches) document.body.classList.remove('nav-open'); setNav(false, { focus: false }); });
  syncInert();
  // Collapsed groups are remembered; groups are open by default.
  document.querySelectorAll('.nav-group').forEach((d) => d.addEventListener('toggle', () => {
    if (d.dataset.forced) { delete d.dataset.forced; return; } // opened by the router, not by the person
    lsSet(K_CLOSED, [...document.querySelectorAll('.nav-group:not([open])')].map((x) => x.dataset.group));
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#sizing-pop').hidden) { closeSizing(true); return; }
    if (document.body.classList.contains('nav-open')) setNav(false);
  });
}

/** Live counts: Arbitrage (open arbs at your books, pre-match + live) and Exit Alerts (open alerts). */
function paintCounts() {
  const set = (id, n, what) => {
    const el = document.querySelector(`[data-route="${id}"] .nav-count`);
    if (!el) return;
    el.hidden = !n;
    el.innerHTML = n ? `${n > 99 ? '99+' : n}<span class="sr-only"> ${what}</span>` : '';
    el.title = n ? `${n} ${what}` : '';
  };
  try { set('arbitrage', api.arbs({ books: store.get().books }).length, 'open arbs, pre-match and live'); } catch { /* engine error: leave the count off */ }
  set('exit-alerts', api.prediction.exitAlerts().length, 'open exit alerts');
}

/** Recent tools (phones): the last 4 screens visited, excluding the one on screen. */
function paintRecent(current) {
  const list = lsGet(K_RECENT, []).filter((id) => TITLES[id] && id !== current).slice(0, 4);
  $('#recent').hidden = !list.length;
  $('#recent-row').innerHTML = list.map((id) => `<a href="#${id}" class="recent-chip">${icon(ICONS[id], { size: 16 })}<span data-bf-text>${ui.esc(TITLES[id])}</span></a>`).join('');
}
function remember(id) {
  if (!TITLES[id]) return;
  lsSet(K_RECENT, [id, ...lsGet(K_RECENT, []).filter((x) => x !== id)].slice(0, 6));
}

// ---------- alerts bell ----------
// Unread = exit alerts that fired since the person last opened Alerts or Exit Alerts (real alert events
// from the data adapter). New ones are announced to screen readers; a trailing-stop hit interrupts.
let knownAlerts = null;
// Unread rule matches reported by the Alerts screen (or any future feed) through a window event:
//   window.dispatchEvent(new CustomEvent('bf:alerts', { detail: { unread: 3 } }))
// They add to the badge until the person opens Alerts.
let feedUnread = 0;
function paintBell() {
  const seen = +lsGet(K_SEEN, 0) || 0;
  const list = api.prediction.exitAlerts();
  const n = list.filter((a) => a.at > seen).length + feedUnread;
  const badge = $('#bell-n');
  badge.hidden = !n;
  badge.textContent = n > 9 ? '9+' : String(n);
  $('#bell').setAttribute('aria-label', n ? `Alerts, ${n} new` : 'Alerts');
  if (knownAlerts) {
    for (const a of list) {
      if (knownAlerts.has(a.id)) continue;
      const msg = `Exit alert: ${a.title}, ${a.side}. ${a.reason}. ${a.action}.`;
      ui.announce(msg, { key: 'exit-alert', assertive: a.reason === 'trailing stop' });
    }
  }
  knownAlerts = new Set(list.map((a) => a.id));
}

// ---------- sizing popover (bankroll chip) ----------
function syncSizing(st) {
  const pop = $('#sizing-pop');
  if (!pop) return;
  // Never overwrite the field the person is typing in.
  const put = (sel, v) => { const el = pop.querySelector(sel); if (el && el !== document.activeElement) el.value = v; };
  put('[data-num="pop-bankroll"]', st.bankroll);
  put('[data-num="pop-arbStake"]', st.arbStake);
  put('[data-pop-kelly]', st.kellyMult);
  put('[data-pop-round]', +(st.stakeRound || 0));
  put('[data-pop-state]', st.state);
  put('[data-pop-odds]', st.oddsFormat || 'american');
  pop.querySelector('[data-pop-km]').textContent = `${st.kellyMult}×`;
}
function openSizing() {
  const pop = $('#sizing-pop');
  syncSizing(store.get());
  pop.hidden = false;
  $('#bank-btn').setAttribute('aria-expanded', 'true');
  pop.querySelector('input')?.focus();
  setTimeout(() => document.addEventListener('pointerdown', outsideSizing), 0);
}
function closeSizing(returnFocus) {
  const pop = $('#sizing-pop');
  if (pop.hidden) return;
  // Commit whatever is in a focused field before closing (change only fires on blur).
  if (pop.contains(document.activeElement)) document.activeElement.blur();
  pop.hidden = true;
  $('#bank-btn').setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', outsideSizing);
  if (returnFocus) $('#bank-btn').focus();
}
function outsideSizing(e) { if (!e.target.closest('.sizing')) closeSizing(false); }

function wireSizing() {
  const pop = $('#sizing-pop');
  $('#bank-btn').addEventListener('click', () => (pop.hidden ? openSizing() : closeSizing(true)));
  // Commit on change (blur / Enter / slider release), not on every keystroke, so screens don't redraw mid-typing.
  const num = (name, key, min) => pop.querySelector(`[data-num="${name}"]`).addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v) && v >= min) store.set({ [key]: v });
    else e.target.value = store.get()[key];
  });
  num('pop-bankroll', 'bankroll', 0);
  num('pop-arbStake', 'arbStake', 1);
  const km = pop.querySelector('[data-pop-kelly]');
  km.addEventListener('input', () => { pop.querySelector('[data-pop-km]').textContent = `${km.value}×`; });
  km.addEventListener('change', () => store.set({ kellyMult: parseFloat(km.value) }));
  pop.querySelector('[data-pop-round]').addEventListener('change', (e) => store.set({ stakeRound: +e.target.value }));
  pop.querySelector('[data-pop-state]').addEventListener('change', (e) => store.set({ state: e.target.value }));
  pop.querySelector('[data-pop-odds]').addEventListener('change', (e) => store.set({ oddsFormat: e.target.value }));
  // "Using sample settings · Change" (ui.sampleSettingsLine) and other screens open the popover this way.
  window.addEventListener('bf:open-sizing', () => { if (pop.hidden) openSizing(); });
  pop.querySelector('.pop-more').addEventListener('click', () => closeSizing(false));
  // Keep Tab inside the popover's own fields, then let it leave naturally: closing when focus moves out.
  pop.addEventListener('focusout', (e) => { if (e.relatedTarget && !e.relatedTarget.closest('.sizing')) closeSizing(false); });
}

// ---------- router ----------
let cleanup = null;
let renderSeq = 0;

async function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'daily';
  const [id, qs] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  setNav(false, { focus: false });
  closeSizing(false);
  ui.closeDrawer();
  api.setPaused(false); // a Pause on one screen never freezes the next one
  document.querySelectorAll('[data-route]').forEach((a) => {
    const on = a.dataset.route === id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  // Show where you are even if that group was collapsed (not remembered as a choice).
  const grp = document.querySelector(`[data-route="${CSS.escape(id)}"]`)?.closest('details');
  if (grp && !grp.open) { grp.dataset.forced = '1'; grp.open = true; }
  requestAnimationFrame(revealActive);
  $('#top-title').innerHTML = ui.headText(TITLES[id] || 'BetFriend');
  document.title = `${TITLES[id] || 'BetFriend'} · BetFriend`;
  if (id === 'alerts' || id === 'exit-alerts') { lsSet(K_SEEN, Date.now()); if (id === 'alerts') feedUnread = 0; paintBell(); }
  remember(id);
  paintRecent(id);
  await renderPage(id, params);
}

/**
 * Render (or re-render) the current screen. A re-render keeps the scroll position: used when a global
 * display setting changes (odds format, state), so every price and Bet button picks it up at once.
 */
async function renderPage(id, params, { keepScroll = false } = {}) {
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const view = document.getElementById('view');
  const seq = ++renderSeq;
  const y = window.scrollY;
  if (!keepScroll) view.innerHTML = ui.skeleton({ rows: 6, cols: 4, label: 'Loading' }); // data-bf-ignore: never an editor block
  try {
    const mod = await import(`./pages/${id}.js`);
    if (seq !== renderSeq) return;
    view.innerHTML = '';
    const page = document.createElement('div');
    view.appendChild(page);
    const ctx = { api, store, ui, odds, plans: { PLANS, ALL_ACCESS }, params, navigate: (to) => { location.hash = to.includes('?') ? `#/${to}` : `#${to}`; } };
    const pageCleanup = mod.default(page, ctx) || null;
    const offLock = lockPreview(id, page);
    cleanup = () => { offLock(); if (typeof pageCleanup === 'function') pageCleanup(); };
    watchH1(view);
    content.setRoute(id);
    if (keepScroll) { window.scrollTo(0, y); return; }
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    if (seq !== renderSeq) return;
    const known = !!TITLES[id];
    view.innerHTML = `${ui.header({ title: TITLES[id] || 'Page not found' })}${ui.errorState({
      title: known ? 'This screen could not load' : 'Nothing at this address',
      msg: known ? 'Something went wrong while loading it. Try again, or pick another tool.' : 'The link may be old or mistyped. Pick a tool below.',
      retry: known,
      tools: ITEMS.map(([tid, label]) => [tid, label]),
    })}`;
    view.querySelector('[data-retry]')?.addEventListener('click', () => renderPage(id, params));
    view.querySelector('[data-find-tool]')?.addEventListener('change', (e) => { if (e.target.value) location.hash = `#${e.target.value}`; });
  }
}

// ---------- phone top bar: the page title shows only once the H1 has scrolled away (item A5) ----------
let h1Watch = null;
function watchH1(view) {
  h1Watch?.disconnect();
  document.body.classList.remove('h1-off');
  const h1 = view.querySelector('h1');
  if (!h1 || !('IntersectionObserver' in window)) { document.body.classList.toggle('h1-off', !h1); return; }
  // The top bar covers the first --topbar-h px, so the H1 counts as gone once it slides under it.
  const bar = document.querySelector('.topbar')?.offsetHeight || 58;
  h1Watch = new IntersectionObserver(([e]) => document.body.classList.toggle('h1-off', !e.isIntersecting && e.boundingClientRect.top < bar),
    { rootMargin: `-${bar}px 0px 0px 0px` });
  h1Watch.observe(h1);
}

// ---------- locked preview (item B10) ----------
// Screens that build their own preview (ui.lockRows + a [data-lock] / [data-lock-slot] mount) are left alone.
// On every other tool the person's plan doesn't include, the screen's result lists ([data-bf-list]) show
// their first 3 items and a lock card follows the first list: no blur, the rest of the screen still works.
// Pure CSS hides the extra items (body.bf-locked, see app.css) so list re-renders on ticks stay locked;
// a light observer keeps the card in place and its count current.
function lockPreview(id, page) {
  document.body.classList.remove('bf-locked');
  if (!TITLES[id] || !ui.isLocked(id) || page.querySelector('[data-lock],[data-lock-slot]')) return () => {};
  document.body.classList.add('bf-locked');
  let card = null, queued = false;
  const paint = () => {
    queued = false;
    // The card follows the first list that is actually cut short (a one-item hero list is left as it is).
    const lists = [...page.querySelectorAll('[data-bf-list]')].filter((l) => !l.parentElement.closest('[data-bf-list]'));
    const list = lists.find((l) => l.children.length > 3) || lists[0];
    if (!list) { card?.remove(); card = null; return; }
    const hidden = Math.max(0, list.children.length - 3);
    // The card goes after the list's own box (a table's .tbl wrapper, otherwise the list itself).
    const anchor = list.closest('.tbl') || list;
    const html = ui.lockCard({ tool: id, count: hidden, noun: 'results' });
    if (!card || !card.isConnected || card.previousElementSibling !== anchor || card._h !== html) {
      card?.remove();
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      card = tpl.content.firstElementChild;
      card.classList.add('lock-auto');
      card._h = html;
      anchor.after(card);
    }
  };
  const mo = new MutationObserver((recs) => {
    if (queued || recs.every((r) => card && card.contains(r.target))) return;
    queued = true;
    requestAnimationFrame(paint);
  });
  mo.observe(page, { childList: true, subtree: true });
  paint();
  return () => { mo.disconnect(); card?.remove(); document.body.classList.remove('bf-locked'); };
}

/** Display settings that change how every screen renders: re-render the current screen when they change. */
function watchDisplaySettings() {
  let last = { oddsFormat: store.get().oddsFormat, state: store.get().state };
  store.subscribe((st) => {
    const changed = st.oddsFormat !== last.oddsFormat || st.state !== last.state;
    last = { oddsFormat: st.oddsFormat, state: st.state };
    if (!changed) return;
    const { route: id, params } = ui.getQuery();
    // Settings syncs its own controls (re-rendering it would steal focus from the field being changed).
    if (id === 'account') return;
    ui.closeDrawer({ restore: false });
    renderPage(id, params, { keepScroll: true });
  });
}

// Range sliders: app.css paints the filled part of the track from --fill (WebKit has no native
// progress pseudo-element). Kept in sync on input and whenever a screen renders new sliders.
function syncRange(el) {
  const min = parseFloat(el.min) || 0, max = parseFloat(el.max), v = parseFloat(el.value);
  const span = (Number.isNaN(max) ? 100 : max) - min;
  el.style.setProperty('--fill', `${span > 0 ? Math.min(100, Math.max(0, ((v - min) / span) * 100)) : 0}%`);
}
function watchRanges() {
  document.addEventListener('input', (e) => { if (e.target.matches?.('input[type=range]')) syncRange(e.target); });
  const all = () => document.querySelectorAll('input[type=range]').forEach(syncRange);
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; all(); });
  }).observe(document.body, { childList: true, subtree: true });
  all();
}

theme.start(); // the pre-paint script in index.html already set data-theme; this wires sync + meta colour
shell();
ui.startKit(); // kit-wide listeners: live-status clock + Pause, glossary terms, pagers, back-to-top, leg banner
paintLocks();
watchDisplaySettings();
watchRanges();
content.start();
paintCounts();
paintBell();
api.onTick(() => { paintCounts(); paintBell(); });
window.addEventListener('bf:alerts', (e) => { feedUnread = Math.max(0, +e.detail?.unread || 0); paintBell(); });
palette.start(); // Ctrl K / ⌘K palette + keyboard scan layer (j/k, /, g + key, ?); never a single-key Bet
window.addEventListener('hashchange', route);
route();
