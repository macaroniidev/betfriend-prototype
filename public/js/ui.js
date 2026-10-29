// Small UI kit shared by all screens. Screens build HTML strings and use these helpers so every page
// looks and behaves the same. CSS classes live in css/app.css. Every primitive is documented, with a
// usage example, in qa/ui-kit.md; #/ui-kit (pages/ui-kit.js, not in the nav) renders all of them.
//
// Editor contract (content.js / admin/frame.js) that every primitive here follows:
//   - h1/h2/h3 are static text; live values sit in <b data-bf-nodata> (or a nodata <tbody>)
//   - static verbs inside nodata (a row's "Bet both") are <span data-bf-text> islands
//   - result lists are one [data-bf-list] container; panels are section/.sec/.card with the heading first
//   - shell widgets (popovers, banners, back-to-top) are [data-bf-noedit][data-bf-ignore]
//
// Old signatures are kept: header, stats, empty(msg), seg/onSeg, select, numberInput, betBtn,
// wireBetButtons, drawer(title, html, {wide}), closeDrawer, toast, logBet, spark, meter, cta …

import { api } from './data/adapter.js';
import { fmtAmerican, pct, money, toDecimal, impliedProb, probToAmerican } from './lib/odds.js';
import { PLANS, ALL_ACCESS, paidPlansForTool, planHasTool, planName, cheapestPlanFor } from './plans.js';
import { store } from './store.js';
import { icon } from './icons.js';
import { lookup as glossaryLookup } from './glossary.js';

/** Escaped text for an uppercase Barlow heading: keeps the capital F in "BetFriend" (DESIGN.md §0). */
export const headText = (s) => esc(s).replace(/BetFriend/g, '<span class="bf-name">BetFriend</span>');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { fmtAmerican, pct, money, icon };

/** True inside the owner editor's preview (admin/frame.js). Drawers never make the app inert there. */
const inEditor = () => !!window.__BF_EDIT;
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const attrs = (o = {}) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');
let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

// =====================================================================================================
// Odds format (item B13). One global preference; every price helper goes through fmtOdds / fmtCents.
// =====================================================================================================

export const ODDS_FORMATS = [['american', 'American (+150)'], ['decimal', 'Decimal (2.50)'], ['implied', 'Implied % (40%)'], ['cents', 'Cents (40¢)']];
export const oddsFormat = () => store.get().oddsFormat || 'american';

/** An American price in the person's odds format (or `fmt`). */
export function fmtOdds(am, fmt = oddsFormat()) {
  if (am === null || am === undefined || !Number.isFinite(+am) || +am === 0) return '—';
  am = +am;
  if (fmt === 'decimal') return toDecimal(am).toFixed(2);
  if (fmt === 'implied') return `${(impliedProb(am) * 100).toFixed(1)}%`;
  if (fmt === 'cents') return `${Math.round(impliedProb(am) * 100)}¢`;
  return fmtAmerican(am);
}
/** A prediction-market price in cents (0–100) in the person's odds format. */
export function fmtCents(c, fmt = oddsFormat()) {
  if (c === null || c === undefined || !Number.isFinite(+c)) return '—';
  c = +c;
  if (fmt === 'cents' || c <= 0 || c >= 100) return `${Math.round(c * 10) / 10}¢`;
  if (fmt === 'implied') return `${Math.round(c * 10) / 10}%`;
  if (fmt === 'decimal') return (100 / c).toFixed(2);
  return fmtAmerican(probToAmerican(c / 100));
}
/** Price chip for an American price. `best` = the lime best-price highlight. */
export const price = (am, { best = false } = {}) => {
  const f = oddsFormat();
  return `<span class="price${best ? ' best' : ''}"${f !== 'american' && Number.isFinite(+am) ? ` title="${esc(fmtAmerican(+am))}"` : ''}>${fmtOdds(am, f)}</span>`;
};
/** Price chip for a cents price (prediction markets). */
export const cents = (c, { best = false } = {}) => `<span class="price${best ? ' best' : ''}">${fmtCents(c)}</span>`;
/** "You risk $X to win $Y" for a stake at an American price (tickets, slips). */
export function riskWin(stake, am) {
  const win = stake * (toDecimal(am) - 1);
  return `You risk <b data-bf-nodata>${money(stake)}</b> to win <b data-bf-nodata>${money(win)}</b>`;
}
/** Same for a prediction-market buy: `stake` dollars at `c` cents per $1 contract. */
export function riskWinCents(stake, c) {
  const win = c > 0 ? stake * (100 / c - 1) : 0;
  return `You risk <b data-bf-nodata>${money(stake)}</b> to win <b data-bf-nodata>${money(win)}</b>`;
}

// =====================================================================================================
// State legality (item B13): a sportsbook not operating in the selected state is flagged and its Bet
// action disabled. Footprint data: api.promos.booksInState (sample). Exchanges, DFS and prediction
// markets have no state data in the adapter, so they are never flagged.
// =====================================================================================================

export function bookLegal(id, state = store.get().state) {
  const b = api.bookById[id];
  if (!b || b.type !== 'sportsbook' || !api.promos?.booksInState) return true;
  return api.promos.booksInState(state).includes(id);
}
export const illegalNote = (id, state = store.get().state) => `${api.bookById[id]?.name || 'This book'} doesn’t take bets in ${state}`;

/** Book chip with brand color. Books not legal in the selected state get a dashed "not in NY" flag. */
export function book(id, { full = false } = {}) {
  const b = api.bookById[id];
  if (!b) return `<span class="book">${esc(id)}</span>`;
  const ok = bookLegal(id);
  return `<span class="book${ok ? '' : ' off'}" style="--bk:${b.color}" title="${esc(ok ? b.name : illegalNote(id))}"><i></i>${esc(full ? b.name : b.short)}${ok ? '' : `<span class="sr-only"> (${esc(illegalNote(id))})</span>`}</span>`;
}

export const edge = (x, { label } = {}) => `<span class="edge ${x >= 0 ? 'pos' : 'neg'}">${label ? esc(label) + ' ' : ''}${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%</span>`;
export const sport = (s) => `<span class="tag sport">${esc(s)}</span>`;
export const tag = (text, kind = '') => `<span class="tag ${kind}">${esc(text)}</span>`;
export const liveDot = () => `<span class="live-dot">LIVE</span>`;

export function when(ts) {
  const d = ts - Date.now();
  if (d < 0) return 'Started';
  const h = d / 3600e3;
  if (h < 1) return `in ${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `in ${Math.round(h)}h`;
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}
export const ago = (ts) => {
  const m = (Date.now() - ts) / 60e3;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
/** Short age for live rows: "12s", "4m", "2h". */
export const age = (ts) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};

/** Event cell: "Away @ Home" with sport + time/live. */
export function eventCell(eventId) {
  const e = api.eventById(eventId);
  if (!e) return '';
  return `<div class="evt"><div class="evt-name">${esc(e.away)} <span class="muted">@</span> ${esc(e.home)}</div>
    <div class="evt-meta">${sport(e.sport)} ${e.live ? `${liveDot()} <span class="muted">${esc(e.clock)} · ${e.score.away}-${e.score.home}</span>` : `<span class="muted">${when(e.start)}</span>`}</div></div>`;
}

// =====================================================================================================
// Plan awareness (item B10). Default plan is All-Access, so the demo shows every feature with no upsell.
// =====================================================================================================

export const currentPlan = () => store.get().plan || 'all-access';
/** Does the person's plan unlock this tool (route id)? */
export const hasTool = (tool) => planHasTool(currentPlan(), tool);
export const isLocked = (tool) => !hasTool(tool);
export { planName };

/** "Included in" chips, shown only when the tool is locked on the person's plan. */
export function planChip(tool) {
  if (!tool || hasTool(tool)) return '';
  const plans = paidPlansForTool(tool);
  return `<div class="incl">${icon('lock', { size: 14 })}<span>Not in your ${esc(planName(currentPlan()))} plan · Included in</span> ${plans.map((p) => `<a href="#/pricing" class="tag plan">${esc(p.name)}</a>`).join(' ')} <a href="#/pricing" class="tag plan aa">All-Access</a></div>`;
}
/**
 * Locked preview: the first `n` rows stay visible, the rest are replaced by a lock card (no blur).
 * Returns { rows, hidden, card }: render `rows`, then `card` (empty string when unlocked).
 */
export function lockRows(rows, tool, { n = 3, noun = 'results' } = {}) {
  if (!isLocked(tool) || rows.length <= n) return { rows, hidden: 0, card: '' };
  const hidden = rows.length - n;
  return { rows: rows.slice(0, n), hidden, card: lockCard({ tool, count: hidden, noun }) };
}
/** "Unlock 17 more arbs · $79.99/mo · 7-day trial" card. */
export function lockCard({ tool, count = 0, noun = 'results' } = {}) {
  const p = cheapestPlanFor(tool);
  const price = p ? `$${p.monthly}/mo` : `$${ALL_ACCESS.monthly}/mo`;
  return `<section class="lock-card" data-lock="${esc(tool || '')}">
    <span class="lock-ic">${icon('lock', { size: 20 })}</span>
    <div class="lock-txt"><h3>Unlock the full list</h3>
      <p><b data-bf-nodata>${count ? `${count} more ${esc(noun)}` : ''}</b> with ${esc(p ? p.name : 'All-Access')} · <b data-bf-nodata>${price}</b> · 7-day free trial</p></div>
    <a class="btn primary sm" href="#/pricing">See plans</a>
  </section>`;
}

// =====================================================================================================
// Page head (items A13 / B1): static H1, one-line subtitle (+ "More" when it doesn't fit), optional
// <details> for the long explanation, live status and actions on the title row, facts strip below.
// =====================================================================================================

/**
 * Results-first page head.
 *   title     static H1 text (never live values)
 *   subtitle  one line; clamped, with a More toggle when it overflows
 *   details   longer HTML behind a native <details> ("How it works" by default)
 *   tool      route id: shows the plan chip only when the tool is locked
 *   live      true (or liveStatus options) renders ui.liveStatus on the title row
 *   actions   HTML on the right of the title row (mode switch, buttons)
 *   facts     [{label, value, …}] facts strip (max 3–4 money facts)
 */
export function pageHead({ title, subtitle = '', details = '', detailsLabel = 'How it works', tool, actions = '', live = null, facts: f = null, cls = '' } = {}) {
  const liveHtml = live ? liveStatus(live === true ? {} : live) : '';
  return `<header class="page-head ph${cls ? ` ${cls}` : ''}">
    <div class="ph-main">
      <div class="ph-title"><h1>${headText(title)}</h1>${liveHtml}</div>
      ${subtitle ? `<div class="ph-sub"><p class="sub clamp">${subtitle}</p><button type="button" class="sub-more" data-sub-more aria-expanded="false" hidden>More</button></div>` : ''}
      ${details ? `<details class="ph-details"><summary>${esc(detailsLabel)}</summary><div class="ph-details-body">${details}</div></details>` : ''}
      ${planChip(tool)}
    </div>
    ${actions ? `<div class="head-actions">${actions}</div>` : '<div class="head-actions"></div>'}
    ${f && f.length ? facts(f) : ''}
  </header>`;
}

/** Page header (old signature, kept): same <header class="page-head"><h1> root, static H1. */
export function header({ title, subtitle = '', tool, actions = '' }) {
  return pageHead({ title, subtitle, tool, actions });
}

/**
 * Facts strip: the 3–4 money facts under a page title. Keeps the .stats / .stat strong classes (editor
 * + QA), figures are nodata. Items: {label, value, note, tone:'pos'|'neg', href, act, term}.
 * `href` / `act` make the fact clickable (link / delegated data-act button).
 */
export function facts(items, { cls = '' } = {}) {
  return `<div class="stats facts${cls ? ` ${cls}` : ''}">${items.filter(Boolean).map((s) => {
    const label = s.term ? term(s.term, s.label) : esc(s.label);
    const inner = `<span class="fact-l">${label}</span><strong class="${s.tone || ''}" data-bf-nodata>${s.value}</strong>${s.note ? `<small data-bf-nodata>${s.note}</small>` : ''}`;
    if (s.href) return `<a class="stat fact click" href="${esc(s.href)}">${inner}</a>`;
    if (s.act) return `<button type="button" class="stat fact click" data-act="${esc(s.act)}">${inner}</button>`;
    return `<div class="stat fact">${inner}</div>`;
  }).join('')}</div>`;
}

/** KPI tiles row (old): [{label, value, note, tone}] */
export const stats = (items) => `<div class="stats">${items.map((s) => `<div class="stat"><span>${esc(s.label)}</span><strong class="${s.tone || ''}">${s.value}</strong>${s.note ? `<small>${s.note}</small>` : ''}</div>`).join('')}</div>`;

// =====================================================================================================
// Live status (A13 / B4): "Live · updated 3s ago" + Pause. One global clock repaints every instance;
// Pause drives the shared api.setPaused (core ticks stop for every screen). States: live / paused /
// stale (no update for 3 ticks) / down (Feed down, --warn, never red).
// =====================================================================================================

let lastTick = Date.now();
/**
 * liveStatus({ label, updated, staleMs, feed }) → HTML. Repaints itself every second.
 * Screens that refresh on their own clock call ui.setLiveStatus(el|root, { updated, feed }).
 */
export function liveStatus({ label = 'Live', updated = null, staleMs = null, feed = 'ok' } = {}) {
  const a = attrs({ 'data-updated': updated || undefined, 'data-stale-ms': staleMs || undefined, 'data-ls-feed': feed, 'data-label': label });
  return `<div class="live-status" data-live-status${a}>
    <span class="ls-dot" aria-hidden="true"></span><span class="ls-text" data-bf-nodata>${esc(label)}</span>
    <button type="button" class="btn sm ghost ls-pause" data-ls-pause aria-pressed="false">${icon('pause', { size: 14 })}<span data-bf-nodata>Pause</span></button>
  </div>`;
}
/** Update a live status (pass the element or any root containing one). */
export function setLiveStatus(elOrRoot, { updated, feed } = {}) {
  const el = elOrRoot?.matches?.('[data-live-status]') ? elOrRoot : elOrRoot?.querySelector?.('[data-live-status]');
  if (!el) return;
  if (updated) el.dataset.updated = String(updated);
  if (feed) el.dataset.lsFeed = feed;
  paintLive(el);
}
function paintLive(el) {
  const paused = api.isPaused?.();
  const updated = +el.dataset.updated || lastTick;
  const staleMs = +el.dataset.staleMs || (api.tickMs || 4000) * 3;
  const since = Date.now() - updated;
  const state = el.dataset.lsFeed === 'down' ? 'down' : paused ? 'paused' : (since > staleMs && !document.hidden ? 'stale' : 'live');
  const label = el.dataset.label || 'Live';
  const txt = { live: `${label} · updated ${age(updated)} ago`, paused: `Paused · updated ${age(updated)} ago`, stale: `Stale · last update ${age(updated)} ago`, down: `Feed down · last update ${age(updated)} ago` }[state];
  if (el.dataset.state !== state) el.dataset.state = state;
  const t = el.querySelector('.ls-text');
  if (t && t.textContent !== txt) t.textContent = txt;
  const b = el.querySelector('[data-ls-pause]');
  if (b) {
    const p = String(!!paused);
    if (b.getAttribute('aria-pressed') !== p) {
      b.setAttribute('aria-pressed', p);
      b.innerHTML = paused ? `${icon('play', { size: 14 })}<span data-bf-nodata>Resume</span>` : `${icon('pause', { size: 14 })}<span data-bf-nodata>Pause</span>`;
    }
  }
}
const paintAllLive = () => document.querySelectorAll('[data-live-status]').forEach(paintLive);

// =====================================================================================================
// Controls (old): seg, select, numberInput.
// =====================================================================================================

/** Segmented control. Returns HTML; wire with onSeg(root, name, cb). The chosen button is .on + aria-pressed. */
export function seg(name, options, value) {
  return `<div class="seg" data-seg="${esc(name)}">${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    const on = String(v) === String(value);
    return `<button type="button" data-v="${esc(v)}" class="${on ? 'on' : ''}" aria-pressed="${on}">${esc(l)}</button>`;
  }).join('')}</div>`;
}
export function onSeg(root, name, cb) {
  root.querySelectorAll(`[data-seg="${name}"] button`).forEach((b) => b.addEventListener('click', () => {
    cb(b.dataset.v);
    // Screens either re-render or move .on themselves; mirror whatever they did into aria-pressed.
    root.querySelectorAll(`[data-seg="${name}"] button`).forEach((x) => x.setAttribute('aria-pressed', String(x.classList.contains('on'))));
  }));
}

/** Select control. */
export function select(name, options, value, label = '') {
  return `<label class="field">${label ? `<span>${esc(label)}</span>` : ''}<select data-sel="${esc(name)}">${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('')}</select></label>`;
}
export function onSelect(root, name, cb) {
  root.querySelector(`[data-sel="${name}"]`)?.addEventListener('change', (e) => cb(e.target.value));
}

export function numberInput(name, value, label, { prefix = '', step = 1, min = 0 } = {}) {
  return `<label class="field"><span>${esc(label)}</span><div class="num">${prefix ? `<em>${esc(prefix)}</em>` : ''}<input type="number" data-num="${esc(name)}" value="${esc(value)}" step="${step}" min="${min}"></div></label>`;
}
export function onNumber(root, name, cb) {
  root.querySelector(`[data-num="${name}"]`)?.addEventListener('input', (e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) cb(v); });
}

// =====================================================================================================
// Mode switch (A13 / B9): the one Pre-match / Live (or any modes) control. Synced to ?mode= in the hash
// and remembered per route, so a reload or a shared link reproduces the view.
// =====================================================================================================

/**
 * modeSwitch(options, value, { name, label }) → HTML. options: [[value, label, count?], …].
 * `count` renders as a nodata badge (live data). Wire with ui.onMode.
 */
export function modeSwitch(options, value, { name = 'mode', label = 'Mode' } = {}) {
  return `<div class="seg mode-switch" data-seg="${esc(name)}" data-mode-switch role="group" aria-label="${esc(label)}">${options.map((o) => {
    const [v, l, n] = Array.isArray(o) ? o : [o, o];
    const on = String(v) === String(value);
    return `<button type="button" data-v="${esc(v)}" class="${on ? 'on' : ''}" aria-pressed="${on}">${esc(l)}${n !== undefined ? ` <b class="ms-n" data-bf-nodata>${esc(n)}</b>` : ''}</button>`;
  }).join('')}</div>`;
}
/** Wire a mode switch: moves .on, writes ?<param>= (dropped for the default) and the route's view, then cb(value). */
export function onMode(root, cb, { name = 'mode', param = 'mode', def } = {}) {
  root.querySelectorAll(`[data-seg="${name}"] button`).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.v;
    root.querySelectorAll(`[data-seg="${name}"] button`).forEach((x) => { const on = x.dataset.v === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    const first = root.querySelector(`[data-seg="${name}"] button`)?.dataset.v;
    setQuery({ [param]: v === (def ?? first) ? null : v });
    view().set({ [param]: v });
    cb(v);
  }));
}
/** The mode to start in: ?mode= first, then the remembered view, then `def`. */
export function initialMode(params = getQuery().params, def = 'pre', allowed = null, param = 'mode') {
  const v = params[param] ?? view().get(param) ?? def;
  return !allowed || allowed.includes(v) ? v : def;
}
/** Update a mode's count badge. */
export function setModeCount(root, value, n, name = 'mode') {
  const b = root.querySelector(`[data-seg="${name}"] button[data-v="${CSS.escape(value)}"] .ms-n`);
  if (b && b.textContent !== String(n)) b.textContent = String(n);
}

// =====================================================================================================
// Money actions (A13 / B2): one primary per row with a verb + nodata amount, labelled ghosts
// (Calc · Log · Alert), a hero result figure. Wired by ONE delegated listener per root (ui.onAction).
// =====================================================================================================

/** Button that opens the sportsbook / market (deep link placeholder). Old helper, kept. */
export const betBtn = (bookId, label = 'Bet') => {
  const ok = bookLegal(bookId);
  return `<button class="btn sm primary" data-bet="${esc(bookId)}"${ok ? '' : ` aria-disabled="true" title="${esc(illegalNote(bookId))}"`}>${esc(label)} ${book(bookId)}</button>`;
};
export function wireBetButtons(root) {
  root.querySelectorAll('[data-bet]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.getAttribute('aria-disabled') === 'true') { toast(b.title || 'Not available in your state'); return; }
    toast(`Opening ${api.bookById[b.dataset.bet]?.name || 'book'} bet slip…`);
  }));
}

/**
 * The row's one primary action: <button class="btn primary sm bet-action" data-act="bet">
 *   <span data-bf-text>Bet both</span> <b data-bf-nodata>$1,000</b></button>
 * opts: verb, amount (HTML/text, live), act ('bet'), book (legality check: disabled out of state),
 *       size ('sm' | ''), tone ('primary' | 'lime'), disabled, title, autofocus, attrs {…}
 */
export function betAction({ verb = 'Bet', amount = '', act = 'bet', book: bookId, size = 'sm', tone = 'primary', disabled = false, title = '', autofocus = false, attrs: extra = {} } = {}) {
  const illegal = bookId && !bookLegal(bookId);
  const off = disabled || illegal;
  const t = illegal ? illegalNote(bookId) : title;
  const a = attrs({ 'data-act': act, 'data-book': bookId, 'aria-disabled': off ? 'true' : undefined, title: t || undefined, 'data-autofocus': autofocus || undefined, ...extra });
  return `<button type="button" class="btn ${tone}${size ? ` ${size}` : ''} bet-action"${a}><span data-bf-text>${esc(verb)}</span>${amount !== '' ? ` <b data-bf-nodata>${amount}</b>` : ''}</button>`;
}
/** A labelled secondary action (text-only ghost): ghost('calc', 'Calc'). `href` makes it a link. */
export function ghost(act, label, { href = '', attrs: extra = {}, iconKey = '' } = {}) {
  const ic = iconKey ? icon(iconKey, { size: 14 }) : '';
  if (href) return `<a class="btn sm ghost" href="${esc(href)}"${attrs(extra)}>${ic}<span data-bf-text>${esc(label)}</span></a>`;
  return `<button type="button" class="btn sm ghost" data-act="${esc(act)}"${attrs(extra)}>${ic}<span data-bf-text>${esc(label)}</span></button>`;
}
/** Primary + ghosts in one row cell: actions(betAction({...}), [['calc','Calc'],['log','Log'],['alert','Alert']]). */
export const actions = (primary = '', ghosts = []) => `<div class="row-acts">${primary}${ghosts.map(([a, l, o]) => ghost(a, l, o)).join('')}</div>`;
/** Hero result figure: "+$33.70" big + "if both fill". tone 'pos' | 'neg' | '' (cost shown muted, never red). */
export const heroFig = (value, note = '', { tone = 'pos' } = {}) => `<span class="hero-fig${tone ? ` ${tone}` : ''}"><b data-bf-nodata>${value}</b>${note ? `<small data-bf-text>${esc(note)}</small>` : ''}</span>`;

/**
 * One delegated click listener per root for every [data-act] inside it. Calls
 * handlers[act](key, el, event) where key = the closest [data-key] (a table row / card id).
 * Stops propagation (so a row's open handler doesn't fire), ignores aria-disabled actions (shows their
 * title as a toast) and, for act="bet" with no handler, shows the deep-link placeholder.
 * Calling it again on the same root merges handlers.
 */
const actionMaps = new WeakMap();
export function onAction(root, handlers = {}) {
  if (actionMaps.has(root)) { Object.assign(actionMaps.get(root), handlers); return; }
  const map = { ...handlers };
  actionMaps.set(root, map);
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    e.stopPropagation();
    if (el.getAttribute('aria-disabled') === 'true' || el.disabled) {
      e.preventDefault();
      if (el.title) toast(el.title);
      return;
    }
    const key = el.closest('[data-key]')?.dataset.key ?? null;
    const fn = map[el.dataset.act];
    if (fn) fn(key, el, e);
    else if (el.dataset.act === 'bet') toast(`Opening ${api.bookById[el.dataset.book]?.name || 'the book’s'} bet slip…`);
  });
}

// =====================================================================================================
// Risk labels (B5): every opportunity carries exactly one. Mapped centrally; the tooltip holds the
// variance note. Non-colour cue: each label has its own icon. Never red, never "guaranteed".
// =====================================================================================================

export const RISK = {
  hedged: { label: 'Hedged · both sides', short: 'Hedged', icon: 'shield', note: 'Profit is locked in if both legs fill at these prices. Voids, limits and price moves can change it.' },
  rollover: { label: 'Low-cost rollover', short: 'Rollover', icon: 'refresh', note: 'Costs a small, known amount on average. Used to clear playthrough or build VIP volume.' },
  edge: { label: 'Long-run edge · can lose', short: 'Edge · can lose', icon: 'ev', note: 'Worth more than it costs on average over many bets. Any single bet can lose.' },
  signal: { label: 'Signal · can lose', short: 'Signal', icon: 'pulse', note: 'Follows a model, a bettor or market money. It can lose; results vary bet to bet.' },
};
const RISK_OF = {
  arb: 'hedged', arbitrage: 'hedged', promo: 'hedged', conversion: 'hedged', 'promo-converter': 'hedged', 'hedged-boost': 'hedged', hedged: 'hedged',
  lowhold: 'rollover', 'low-hold': 'rollover', 'low-holds': 'rollover', rollover: 'rollover',
  ev: 'edge', '+ev': 'edge', 'positive-ev': 'edge', middle: 'edge', middles: 'edge', boost: 'edge', edge: 'edge', parlay: 'edge',
  sharp: 'signal', 'sharp-money': 'signal', pro: 'signal', bettor: 'signal', 'bettor-signals': 'signal', ai: 'signal', 'ai-picks': 'signal',
  pm: 'signal', 'pm-picks': 'signal', trader: 'signal', 'prediction-traders': 'signal', signal: 'signal', prop: 'signal', live: 'signal',
};
/** Risk class for an opportunity kind / tool id ('arb' → 'hedged'). Unknown kinds count as 'signal' (the cautious label). */
export const riskOf = (kind) => RISK_OF[String(kind || '').toLowerCase()] || 'signal';
/** Risk label chip. risk('arb') → "Hedged · both sides". { short: true } for tight rows. */
export function risk(kind, { short = false } = {}) {
  const k = riskOf(kind);
  const r = RISK[k];
  return `<span class="risk risk-${k}" title="${esc(r.note)}">${icon(r.icon, { size: 13 })}<span data-bf-text>${esc(short ? r.short : r.label)}</span></span>`;
}

// =====================================================================================================
// Glossary terms (A13 / B12). ui.term in copy, drawers and facts labels: a focusable term that shows the
// definition on hover, focus or tap, with a Glossary link. Table heads use ui.termTitle (title text only).
// =====================================================================================================

export function term(key, label) {
  const g = glossaryLookup(key);
  const text = esc(label ?? g?.term ?? key);
  if (!g) return text;
  return `<button type="button" class="term" data-term="${esc(g.key)}" aria-describedby="term-pop">${text}</button>`;
}
/** Plain-text definition for title="" (table heads). */
export const termTitle = (key) => esc(glossaryLookup(key)?.short || '');

// =====================================================================================================
// Empty, loading and error states (B8).
// =====================================================================================================

/**
 * empty('message')  (old) → the dashed empty box.
 * empty({ title, msg, actions: [{label, href|act, primary, attrs}], near, mate, cls })
 *   title  static h3; msg body copy; actions ≥2 (Reset filters / Switch to Live / Alert me …) as links
 *   (href) or delegated buttons (act → wire with ui.onAction); near = HTML of the nearest matches;
 *   mate = true shows Coach Mate on a green tile (scanner empty states only).
 */
export function empty(msgOrOptions) {
  if (typeof msgOrOptions !== 'object' || msgOrOptions === null) return `<div class="empty">${esc(msgOrOptions)}</div>`;
  const { title = '', msg = '', actions: acts = [], near = '', nearLabel = 'Closest matches right now', mate: withMate = false, cls = '' } = msgOrOptions;
  const btns = acts.map((a, i) => {
    const cl = `btn sm ${a.primary || (i === 0 && !acts.some((x) => x.primary)) ? 'primary' : 'outline'}`;
    return a.href ? `<a class="${cl}" href="${esc(a.href)}"${attrs(a.attrs)}>${esc(a.label)}</a>`
      : `<button type="button" class="${cl}" data-act="${esc(a.act || '')}"${attrs(a.attrs)}>${esc(a.label)}</button>`;
  }).join('');
  return `<div class="empty empty-x${cls ? ` ${cls}` : ''}" data-bf-empty>
    ${withMate ? `<div class="empty-mate on-green" aria-hidden="true"><img src="../img/coach-mate-film.svg" alt="" width="72" height="72"></div>` : ''}
    <div class="empty-main">${title ? `<h3>${headText(title)}</h3>` : ''}${msg ? `<p>${msg}</p>` : ''}${btns ? `<div class="empty-actions">${btns}</div>` : ''}</div>
    ${near ? `<div class="empty-near"><div class="empty-near-h">${esc(nearLabel)}</div><div data-bf-nodata>${near}</div></div>` : ''}
  </div>`;
}
/** Skeleton placeholder rows (replaces "Loading…"). */
export function skeleton({ rows = 5, cols = 4, label = 'Loading' } = {}) {
  // data-bf-ignore + data-bf-noedit: the router's loading placeholder is never an editor block or a text target.
  return `<div class="skel" role="status" aria-busy="true" data-bf-ignore data-bf-noedit><span class="sr-only">${esc(label)}…</span>${Array.from({ length: rows }, () => `<div class="skel-row">${'<i></i>'.repeat(cols)}</div>`).join('')}</div>`;
}
/** Error / not-found state: Daily, a tool finder and Retry. Used by the router; screens may reuse it. */
export function errorState({ title = 'This screen could not load', msg = 'Something went wrong while loading it. Try again, or pick another tool.', tools = [], retry = true } = {}) {
  return `<div class="empty empty-x err-state" data-bf-empty>
    <div class="empty-main"><h3>${headText(title)}</h3><p>${esc(msg)}</p>
      <div class="empty-actions">${retry ? '<button type="button" class="btn sm primary" data-retry>Retry</button>' : ''}<a class="btn sm outline" href="#/daily">Go to Daily Card</a><button type="button" class="btn sm outline" data-open-palette>Search tools</button>
      ${tools.length ? `<label class="field err-find"><span>Find a tool</span><select data-find-tool><option value="">Choose…</option>${tools.map(([id, l]) => `<option value="${esc(id)}">${esc(l)}</option>`).join('')}</select></label>` : ''}</div></div>
  </div>`;
}

// =====================================================================================================
// Paging for static lists (B14): page state survives ticks and re-renders (kept per key in memory).
// Never on live scanners.
// =====================================================================================================

const pagers = new Map(); // key -> { limit, step, cb }
/**
 * const pg = ui.pager('prop-research', { step: 20 });
 * html: rows.slice(0, pg.limit) … + pg.more(rows.length)     wire: pg.onMore(() => repaint())
 */
export function pager(key, { step = 20 } = {}) {
  if (!pagers.has(key)) pagers.set(key, { limit: step, step, cb: null });
  const p = pagers.get(key);
  return {
    get limit() { return p.limit; },
    slice: (rows) => rows.slice(0, p.limit),
    more: (total) => more({ key, shown: Math.min(p.limit, total), total, step: p.step }),
    onMore(cb) { p.cb = cb; },
    reset() { p.limit = p.step; },
  };
}
/** "Show 20 more" row. Use through ui.pager, or alone with a data-more key you handle. */
export function more({ key, shown, total, step = 20 } = {}) {
  if (shown >= total) return total > step ? `<div class="more-row"><span class="muted" data-bf-nodata>All ${total} shown</span></div>` : '';
  return `<div class="more-row"><button type="button" class="btn outline sm" data-more="${esc(key)}">Show ${Math.min(step, total - shown)} more</button><span class="muted" data-bf-nodata>Showing ${shown} of ${total}</span></div>`;
}

/**
 * Primary call to action with its terms line directly under it (DESIGN.md §6.3: every button has its
 * trial/terms line). `href` renders a link, otherwise a button; `attrs` adds raw attributes (e.g. data-trial).
 * `tone`: 'primary' (green, on white/dark grounds), 'lime' (only on green grounds) or 'outline' (secondary).
 */
export function cta(label, terms = '', { href = '', attrs: a = '', tone = 'primary', block = false } = {}) {
  const cls = `btn ${tone}${block ? ' block' : ''}`;
  const btn = href ? `<a class="${cls}" href="${esc(href)}" ${a}>${esc(label)}</a>` : `<button type="button" class="${cls}" ${a}>${esc(label)}</button>`;
  return `<div class="cta">${btn}${terms ? `<p class="cta-terms">${esc(terms)}</p>` : ''}</div>`;
}

// =====================================================================================================
// Drawer (A12): an accessible slip dialog. role=dialog + aria-modal + aria-labelledby, focus trap,
// Escape, focus returns to the opener (or #view). #app is inert while open (never in the editor) and
// closeDrawer always clears it. Under 860px it's a bottom sheet (92dvh, grab handle; swipe down from
// the handle only). Optional sticky footer for the primary action.
// =====================================================================================================

let drawerState = null; // { wrap, opener, cbs: [], onKey }
/**
 * drawer(title, html, { wide, footer, kicker, risk, onClose }) → the body element, with:
 *   body.close()           close it
 *   body.footer            the sticky footer element (hidden when empty); body.setFooter(html)
 *   body.status(html, tone) a polite status line at the top ('info' | 'warn' | 'ok'); '' hides it
 *   body.whenClosed(fn)    run fn when the drawer closes (stop tick listeners here)
 *   body.panel             the role=dialog element
 * Put data-autofocus on the element that should get focus first (e.g. the leg-1 Bet button).
 */
export function drawer(title, html, { wide = false, footer = '', kicker = '', risk: riskKind = '', onClose = null } = {}) {
  const prev = drawerState;
  let opener = document.activeElement;
  // Opening a drawer from inside another one keeps the original opener for focus return.
  if (prev && prev.wrap.contains(opener)) opener = prev.opener;
  closeDrawer({ restore: false });
  const tid = nextId('dr-t');
  const el = document.createElement('div');
  el.className = 'drawer-wrap';
  el.innerHTML = `<div class="drawer-bg" data-close-bg></div><aside class="drawer${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${tid}" tabindex="-1">
    <div class="drawer-handle" data-drawer-handle aria-hidden="true"><i></i></div>
    <header><div class="drawer-title"><h2 id="${tid}">${headText(title)}</h2>${riskKind ? risk(riskKind) : ''}${kicker ? `<div class="drawer-kicker">${kicker}</div>` : ''}</div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close', { size: 18 })}</button></header>
    <div class="drawer-status" role="status" aria-live="polite" hidden></div>
    <div class="drawer-body">${html}</div>
    <footer class="drawer-foot"${footer ? '' : ' hidden'}>${footer}</footer></aside>`;
  document.body.appendChild(el);
  const panel = el.querySelector('.drawer');
  const body = el.querySelector('.drawer-body');
  const foot = el.querySelector('.drawer-foot');
  const statusEl = el.querySelector('.drawer-status');
  const st = { wrap: el, opener, cbs: onClose ? [onClose] : [], onKey: null };
  drawerState = st;

  requestAnimationFrame(() => el.classList.add('open'));
  if (!inEditor()) { const app = document.getElementById('app'); if (app) app.inert = true; }
  el.querySelector('[data-close-bg]').addEventListener('click', () => closeDrawer());
  el.querySelector('[data-close]').addEventListener('click', () => closeDrawer());

  // Focus trap + Escape (document level, so it works wherever focus is).
  st.onKey = (e) => {
    if (drawerState !== st) return;
    if (e.key === 'Escape') {
      // An open popover inside the drawer (books, columns, term) closes first.
      if (document.querySelector('.fb-pop:not([hidden]), .tbl-colmenu:not([hidden])')) return;
      e.preventDefault(); e.stopPropagation(); closeDrawer(); return;
    }
    if (e.key !== 'Tab') return;
    const f = focusables(panel);
    if (!f.length) { e.preventDefault(); panel.focus(); return; }
    const first = f[0], last = f[f.length - 1];
    if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', st.onKey, true);

  // Bottom sheet: swipe down from the grab handle only (never from the scrolling content).
  wireSheetSwipe(el.querySelector('[data-drawer-handle]'), panel);

  // Initial focus: [data-autofocus] (e.g. the leg-1 button), else the dialog itself (reads its title).
  requestAnimationFrame(() => {
    const af = panel.querySelector('[data-autofocus]');
    (af || panel).focus({ preventScroll: true });
  });

  body.close = () => closeDrawer();
  body.footer = foot;
  body.panel = panel;
  body.setFooter = (h) => { foot.innerHTML = h || ''; foot.hidden = !h; };
  body.status = (h, tone = 'info') => { statusEl.hidden = !h; statusEl.className = `drawer-status ${tone}`; statusEl.innerHTML = h || ''; };
  body.whenClosed = (fn) => { st.cbs.push(fn); };
  return body;
}
/** Close any open drawer. Always clears #app inert (a route change can never leave the app inert). */
export function closeDrawer({ restore = true } = {}) {
  const st = drawerState;
  drawerState = null;
  const app = document.getElementById('app');
  if (app) app.inert = false;
  if (st) {
    document.removeEventListener('keydown', st.onKey, true);
    for (const fn of st.cbs) { try { fn(); } catch (err) { console.error(err); } }
  }
  const hadFocus = [...document.querySelectorAll('.drawer-wrap')].some((d) => d.contains(document.activeElement)) || document.activeElement === document.body;
  document.querySelectorAll('.drawer-wrap').forEach((d) => d.remove());
  if (!st || !restore || !hadFocus) return;
  const o = st.opener;
  const ok = o && o.isConnected && o !== document.body && !o.closest('[inert]') && o.getClientRects().length > 0;
  if (ok) o.focus({ preventScroll: true });
  else document.getElementById('view')?.focus({ preventScroll: true });
}
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';
const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((x) => !x.closest('[hidden]') && x.offsetParent !== null);

function wireSheetSwipe(handle, panel) {
  let y0 = null, dy = 0;
  handle.addEventListener('pointerdown', (e) => {
    if (!matchMedia('(max-width: 860px)').matches) return;
    y0 = e.clientY; dy = 0;
    handle.setPointerCapture(e.pointerId);
    panel.style.transition = 'none';
  });
  handle.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 90) closeDrawer();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

/**
 * Stale-price guard for an open drawer (B4): re-reads the opportunity on every tick.
 *   read()          → the current opp (by id), or null when it's gone
 *   sig(opp)        → a string of the prices that matter (default: legs' book:price)
 *   onUpdate(opp, prev) re-render the drawer's numbers; return a message to show (optional)
 * Shows "Price moved: stakes updated" / "This one is gone" in the drawer status and disables its bet
 * actions when gone. Stops by itself when the drawer closes.
 */
export function liveGuard(body, { read, sig = (o) => (o.legs || []).map((l) => `${l.book}:${l.price}`).join('|'), onUpdate = null, goneMsg = 'This one is gone: the prices moved and it no longer pays. Nothing was placed.' } = {}) {
  let prev = read();
  let last = prev ? sig(prev) : '';
  const off = api.onTick(() => {
    if (!body.isConnected) { off(); return; }
    const o = read();
    if (!o) {
      body.status(`${icon('info', { size: 16 })}<span>${esc(goneMsg)}</span>`, 'warn');
      body.panel?.querySelectorAll('[data-act="bet"], [data-bet], [data-leg]').forEach((b) => { b.setAttribute('aria-disabled', 'true'); b.title = 'No longer available'; });
      return;
    }
    const s = sig(o);
    if (s !== last) {
      const msg = onUpdate ? onUpdate(o, prev) : '';
      body.status(`${icon('refresh', { size: 16 })}<span>${esc(msg || 'Price moved: stakes updated')}</span>`, 'info');
      last = s;
    }
    prev = o;
  });
  body.whenClosed?.(off);
  return off;
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.dataset.bfIgnore = '';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

/** "Log bet" helper: adds to the tracker and confirms. */
export function logBet(bet) {
  api.tracker.add(bet);
  toast('Added to your Bet Tracker');
}

/** Mini sparkline SVG from numbers. */
export function spark(values, { w = 120, h = 32, color = 'var(--accent)' } = {}) {
  if (!values.length) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1 || 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.6" points="${pts}"/></svg>`;
}

/** Confidence meter 0..1 */
export const meter = (x, label = '') => `<span class="meter" title="${esc(label || pct(x, 0))}"><i style="width:${Math.round(x * 100)}%"></i></span>`;

// =====================================================================================================
// Surfaces, slips, checks, Coach Mate (B6 / B16): the landing page's building blocks.
// =====================================================================================================

/** Page section: <section class="sec"> with a 4px green top rule and a static h2 first. */
export function sec(title, html, { cls = '', id = '', actions: acts = '' } = {}) {
  return `<section class="sec${cls ? ` ${cls}` : ''}"${id ? ` id="${esc(id)}"` : ''}>
    <div class="sec-head"><h2>${headText(title)}</h2>${acts ? `<div class="sec-actions">${acts}</div>` : ''}</div>${html}</section>`;
}
/** Check-mark list (never numbers): checks(['Bet both sides', …]). Items are HTML. */
export const checks = (items, { cls = '' } = {}) => `<ul class="bf2-checks${cls ? ` ${cls}` : ''}">${items.map((i) => `<li><span>${i}</span></li>`).join('')}</ul>`;
/**
 * Landing-style bet slip (calculator results, worked examples):
 * slip({ caption, tag, legs: [{ title, sub, odds, stake }], result, math })
 */
export function slip({ caption = '', tag: t = '', legs = [], result = '', math = '', cls = '' } = {}) {
  return `<figure class="bf2-slip${cls ? ` ${cls}` : ''}">${caption ? `<figcaption>${esc(caption)}${t ? `<span>${esc(t)}</span>` : ''}</figcaption>` : ''}
    <ul>${legs.map((l) => `<li><span class="bf2-leg"><b>${l.title}</b>${l.sub ? `<small>${l.sub}</small>` : ''}</span><span class="bf2-odds" data-bf-nodata>${l.odds ?? ''}</span><span class="bf2-stake" data-bf-nodata>${l.stake ?? ''}</span></li>`).join('')}</ul>
    ${result ? `<p class="bf2-result" data-bf-nodata>${result}</p>` : ''}${math ? `<p class="bf2-math">${math}</p>` : ''}</figure>`;
}
/** Coach Mate on a green tile (max one per screen: Daily hero, Pricing, AI chat empty, scanner empties). */
export function mate(html = '', { pose = 'touchdown', cls = '' } = {}) {
  const src = { touchdown: 'coach-mate-touchdown', flag: 'coach-mate-flag', film: 'coach-mate-film', gameplan: 'coach-mate-gameplan', plain: 'coach-mate' }[pose] || 'coach-mate';
  return `<div class="mate-tile on-green${cls ? ` ${cls}` : ''}"><img src="../img/${src}.svg" alt="" width="96" height="96"><div class="mate-txt">${html}</div></div>`;
}

/**
 * Legs as slip lines (B3): book · price · side · stake, bold tabular, one line per leg, no per-leg
 * button (those live in the drawer). legs: [{ book, price, side, stake }] (stake is a number or HTML).
 */
export function slipLegs(legs) {
  return `<div class="slip-lines">${legs.map((l) => `<div class="sl">${book(l.book)}<span class="sl-price">${price(l.price)}</span>${sideHtml(l.side ?? l.outcome ?? '')}<b class="sl-stake">${l.stake === undefined || l.stake === null ? '' : typeof l.stake === 'number' ? money(l.stake) : l.stake}</b></div>`).join('')}</div>`;
}
/**
 * A leg's side as "team + line": when the name is cut short in a narrow column, the line (-4 / +1.5) still
 * shows, so you can always tell which side is which without opening the slip. The full text is the title.
 */
function sideHtml(side) {
  const m = String(side).match(/^(.*\S)\s+([+\-−]\d+(?:\.\d+)?)$/);
  if (!m) return `<span class="sl-side" title="${esc(side)}">${esc(side)}</span>`;
  return `<span class="sl-side split" title="${esc(side)}"><span class="sl-who">${esc(m[1])}</span><b class="sl-ln">${esc(m[2])}</b></span>`;
}
/** "Cash needed: $436 at bet365 · $564 at Fanatics" (summed per book). */
export function cashNeeded(legs) {
  const by = new Map();
  for (const l of legs) by.set(l.book, (by.get(l.book) || 0) + (+l.stake || 0));
  return `<p class="cash-needed">Cash needed: <span data-bf-nodata>${[...by].map(([b, v]) => `${money(v)} at ${esc(api.bookById[b]?.name || b)}`).join(' · ')}</span></p>`;
}
/** Status tag with a non-colour cue: status('Won', 'ok') ✓ · ('Lost','bad') ✗ · 'warn' · 'info' · 'muted'. */
export function status(text, kind = 'muted') {
  const ic = { ok: 'check', bad: 'x', warn: 'info', info: 'info', live: 'pulse', muted: 'dot' }[kind] || 'dot';
  return `<span class="st st-${esc(kind)}">${icon(ic, { size: 12 })}<span>${esc(text)}</span></span>`;
}
/** Direction cue ▲ / ▼ for a change (with screen-reader text). */
export const dir = (x) => (x > 0 ? '<span class="dir up" aria-label="up">▲</span>' : x < 0 ? '<span class="dir down" aria-label="down">▼</span>' : '');
/** "Not available" cell value (no colour-only empty cells). */
export const na = (label = 'Not available') => `<span class="na" aria-label="${esc(label)}" title="${esc(label)}">—</span>`;
/** Muted "wins ~45% · pays $96 · worth +$5.40" line under EV / AI / signal rows. */
export function evLine({ prob, payout, ev } = {}) {
  const parts = [];
  if (Number.isFinite(prob)) parts.push(`wins ~${Math.round(prob * 100)}%`);
  if (Number.isFinite(payout)) parts.push(`pays ${money(payout)}`);
  if (Number.isFinite(ev)) parts.push(`worth ${ev >= 0 ? '+' : '-'}${money(Math.abs(ev))}`);
  return `<p class="ev-line" data-bf-nodata>${parts.join(' · ')}</p>`;
}
/** "Suggested stake (¼ Kelly)" label for a Kelly multiplier. */
export function kellyLabel(mult = store.get().kellyMult) {
  const f = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1: 'full' }[+mult] || `${+mult}×`;
  return `Suggested stake (${f} Kelly)`;
}
/**
 * Collapsed "How this makes money" explainer (B12) inside its own section. Expanded only when the
 * person's goal is 'beginner' (first-run setup). checks: bullet HTML; example: worked example HTML.
 */
export function how({ title = 'How this makes money', summary = '', checks: items = [], example = '', open = null, cls = '' } = {}) {
  const isOpen = open ?? (store.get().goal === 'beginner' && !lsGet('bf-qa', null));
  return `<section class="sec how-sec${cls ? ` ${cls}` : ''}"><details class="how"${isOpen ? ' open' : ''}>
    <summary><h2>${headText(title)}</h2>${summary ? `<span class="how-sum">${summary}</span>` : ''}${icon('chevron', { size: 16, cls: 'how-chev' })}</summary>
    <div class="how-body">${items.length ? checks(items) : ''}${example ? `<div class="how-ex">${example}</div>` : ''}</div></details></section>`;
}
/** "Open in calculator" link, prefilled: calcLink({ tab: 'arb', a: +150, b: -140, stake: 1000 }). */
export function calcLink({ tab = 'arb', a, b, stake, label = 'Open in calculator', cls = 'btn sm ghost' } = {}) {
  const p = new URLSearchParams({ tab });
  if (a !== undefined) p.set('a', String(a));
  if (b !== undefined) p.set('b', String(b));
  if (stake !== undefined) p.set('stake', String(Math.round(stake * 100) / 100));
  return `<a class="${cls}" href="#/calculators?${p}" data-calc-link>${icon('calc', { size: 14 })}<span data-bf-text>${esc(label)}</span></a>`;
}
/** Related tools row (drawers, empty states): related([['bettor-signals', 'Pro Bettor Signals'], …]). */
export const related = (links, label = 'Related') => `<nav class="related" aria-label="${esc(label)}"><span class="related-l">${esc(label)}:</span>${links.map(([to, l]) => `<a href="#/${esc(to)}">${esc(l)}</a>`).join('')}</nav>`;

// =====================================================================================================
// Two-step "Bet both" (B3): a persistent banner tracks a multi-leg play until every leg is opened and
// the person confirms (only then is it logged), or dismisses it. One gesture opens one leg; nothing
// ever opens two windows at once. Survives route changes (sessionStorage).
// =====================================================================================================

const LF_KEY = 'bf-legflow';
const lfGet = () => { try { return JSON.parse(sessionStorage.getItem(LF_KEY)) || null; } catch { return null; } };
const lfSet = (v) => { try { if (v) sessionStorage.setItem(LF_KEY, JSON.stringify(v)); else sessionStorage.removeItem(LF_KEY); } catch { /* ignore */ } };
export const legFlow = {
  /**
   * Start tracking a play. legs: [{ book, label, stake, bet }] where `bet` is the tracker record
   * logged on confirm. exclusive: only one leg can win (arbs, promos). Replaces any older play.
   */
  start({ id, title, legs, exclusive = true }) {
    lfSet({ id, title, legs: legs.map((l) => ({ ...l, opened: false })), exclusive, at: Date.now() });
    paintLegBanner();
  },
  get: lfGet,
  /** Mark a leg opened (call from the per-leg button, after its one deep link). Returns the next leg index or -1. */
  opened(i) {
    const f = lfGet();
    if (!f || !f.legs[i]) return -1;
    f.legs[i].opened = true;
    lfSet(f);
    paintLegBanner();
    return f.legs.findIndex((l) => !l.opened);
  },
  /** Open leg i: the deep link placeholder (one per gesture) + mark it opened. */
  open(i) {
    const f = lfGet();
    const l = f?.legs[i];
    if (!l) return;
    if (!bookLegal(l.book)) { toast(illegalNote(l.book)); return; }
    toast(`Opening ${api.bookById[l.book]?.name || 'book'} bet slip…`);
    legFlow.opened(i);
  },
  /** Log every leg as one linked group (confirm step), then clear. */
  confirm() {
    const f = lfGet();
    if (!f) return;
    const bets = f.legs.map((l) => l.bet).filter(Boolean);
    if (bets.length) {
      if (api.tracker.addGroup) api.tracker.addGroup(bets, { exclusive: f.exclusive });
      else bets.forEach((b) => api.tracker.add(b));
      toast(bets.length > 1 ? 'Both bets logged to your Bet Tracker' : 'Added to your Bet Tracker');
    }
    legFlow.clear();
  },
  clear() { lfSet(null); paintLegBanner(); },
};
function paintLegBanner() {
  let el = document.getElementById('leg-banner');
  const f = lfGet();
  if (!f) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'leg-banner';
    el.className = 'leg-banner on-green';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Bet in progress');
    el.dataset.bfNoedit = '';
    el.dataset.bfIgnore = '';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lf]');
      if (!b) return;
      const a = b.dataset.lf;
      if (a === 'open') legFlow.open(+b.dataset.i);
      else if (a === 'log') legFlow.confirm();
      else if (a === 'dismiss') legFlow.clear();
    });
  }
  const next = f.legs.findIndex((l) => !l.opened);
  const done = f.legs.filter((l) => l.opened);
  const nb = (i) => api.bookById[f.legs[i].book]?.name || f.legs[i].book;
  const msg = next === -1
    ? `All ${f.legs.length} legs opened ✓. Placed them? Log the play.`
    : done.length ? `Leg ${done.length} opened ✓ → now leg ${next + 1} at ${esc(nb(next))}` : `Next: leg 1 at ${esc(nb(0))}`;
  el.innerHTML = `<div class="lb-txt"><b>${esc(f.title || 'Bet in progress')}</b><span>${msg}</span></div>
    <div class="lb-acts">${next !== -1 ? `<button type="button" class="btn lime sm" data-lf="open" data-i="${next}">Open leg ${next + 1}</button>` : ''}
    ${done.length ? `<button type="button" class="btn sm${next === -1 ? ' lime' : ' outline'}" data-lf="log">Log ${f.legs.length > 1 ? 'both' : 'bet'}</button>` : ''}
    <button type="button" class="btn sm ghost" data-lf="dismiss">Dismiss</button></div>`;
}

// =====================================================================================================
// Sticky action bar (B15): decision screens only (parlay slip, PM ticket, pricing, deposit optimizer),
// never on opportunity lists. Hides while an in-page CTA is visible, so two CTAs never show at once.
// =====================================================================================================

export const actionBar = (html, { cls = '' } = {}) => `<div class="actionbar${cls ? ` ${cls}` : ''}" data-actionbar>${html}</div>`;
/** Hide `bar` while `target` (the in-page CTA) is on screen. Returns a disconnect function. */
export function wireActionBar(bar, target) {
  if (!bar || !target || !('IntersectionObserver' in window)) return () => {};
  const io = new IntersectionObserver(([e]) => bar.classList.toggle('is-hidden', e.isIntersecting), { threshold: 0.01 });
  io.observe(target);
  return () => io.disconnect();
}

// =====================================================================================================
// Deep links (item C4 stage 3): #/<tool>?id=<item id> from the Daily Card and other screens.
// =====================================================================================================

/**
 * deepLink(root, id, { find, open, noun, gone })
 *   find(id) → the item (searched across modes / filters), or null when it has gone
 *   open(item) → opens its drawer (switch mode first if needed); may be omitted for list-only screens
 * After the screen's first paint (the router scrolls to the top first): opens the item, then marks its
 * row/card ([data-key=id], class .is-target) and scrolls it into view. A gone item gets a toast and the
 * screen as it is ("That arb is gone. Here are the ones open now."). Returns the item or null.
 */
export function deepLink(root, id, { find, open = null, noun = 'item', gone = '' } = {}) {
  if (!id) return null;
  let hit = null;
  try { hit = find(id); } catch { hit = null; }
  if (!hit) { setTimeout(() => toast(gone || `That ${noun} is gone. Here are the ones open now.`), 0); return null; }
  setTimeout(() => {
    if (!root.isConnected) return;
    open?.(hit);
    requestAnimationFrame(() => {
      const el = root.querySelector(`[data-key="${CSS.escape(String(id))}"]`);
      if (!el) return;
      el.classList.add('is-target');
      // Under an open drawer the row is still marked; on desktop the drawer sits beside it.
      el.scrollIntoView({ block: 'center' });
    });
  }, 0);
  return hit;
}

// =====================================================================================================
// Persisted views (B9): per-route view memory (filters, sort, density, columns, mode) in localStorage.
// =====================================================================================================

const VIEWS_KEY = 'bf-views';
/** view(route?) → { get(key, def), set(patch), all() } for the current (or given) route. */
export function view(route = getQuery().route) {
  return {
    get(k, d) { const v = lsGet(VIEWS_KEY, {})[route]?.[k]; return v === undefined ? d : v; },
    set(patch) { const all = lsGet(VIEWS_KEY, {}); all[route] = { ...(all[route] || {}), ...patch }; lsSet(VIEWS_KEY, all); },
    all() { return lsGet(VIEWS_KEY, {})[route] || {}; },
  };
}

// =====================================================================================================
// ui.table (A14): keyed rows, sortable heads, sticky header, density, Columns menu, focusable rows,
// mobile grid rows, frozen order while hovered/focused, NEW / Gone markers, tick tints.
// =====================================================================================================

const ALWAYS_SHOW = new Set(['age']); // never hideable (Age on arbitrage / EV / middles)
const areaName = (k) => `c_${String(k).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

/**
 * const t = ui.table({ id, caption, columns, rowKey, rows, onOpen, action, onAction, sort, empty, mobile });
 * container.append(t.el); … on every tick: t.update(rows)
 *
 * columns: [{ key, label, title, align: 'r'|'c', sort: fn(row)→value | true, pri: 1|2|3, render: fn(row)→HTML,
 *             cls, hidden (default hidden), always (can't be hidden), trend: fn(row)→number (tint ▲/▼ on change),
 *             mlabel (show the label above the value on phones) }]
 * rowKey     row → stable id (default row.id)
 * onOpen     (row, tr) when a row is clicked or Enter/Space on a focused row
 * action     row → HTML for the actions cell (ui.betAction + ui.ghost …)
 * onAction   { act: (row, el, event) } for [data-act] inside rows (one delegated listener)
 * sort       default { key, dir: 'desc'|'asc' }; null = data order
 * empty      HTML (or fn) shown instead of the table when there are no rows (use ui.empty({…}))
 * onSort     (sort) => {}  called after a header click changed the sort ({ key, dir } or null)
 * mobile     { areas: ['risk ev age', 'legs legs profit', 'act act act'], cols: 'minmax(0,1fr) auto' }
 *            (column keys as area names, 'act' = the actions cell); default: auto layout
 * Returns { el, update(rows), rows(), sortState(), destroy() }.
 */
export function table(opts) {
  const o = { id: 'main', caption: '', rowKey: (r) => r.id, rows: [], onOpen: null, action: null, onAction: {}, sort: null, empty: '', mobile: null,
    freeze: true, newMs: 8000, goneMs: 5000, density: 'compact', tools: true, rowClass: null, ...opts };
  const v = view();
  const memo = v.get(`tbl:${o.id}`, {});
  const st = {
    sort: memo.sort !== undefined ? memo.sort : o.sort,
    density: memo.density || o.density,
    hidden: new Set(memo.hidden || o.columns.filter((c) => c.hidden).map((c) => c.key)),
  };
  const cols = o.columns;
  const save = () => v.set({ [`tbl:${o.id}`]: { sort: st.sort, density: st.density, hidden: [...st.hidden] } });
  const canHide = (c, i) => i > 0 && !c.always && !ALWAYS_SHOW.has(c.key);

  const el = document.createElement('div');
  el.className = 'tbl';
  el.dataset.tbl = o.id;
  el.dataset.density = st.density;
  el.innerHTML = `${o.tools ? `<div class="tbl-tools">
      <button type="button" class="tbl-pending" data-tbl-apply hidden><b data-bf-nodata></b> <span>· apply</span></button>
      <span class="spacer"></span>
      <button type="button" class="btn sm ghost" data-tbl-density aria-pressed="${st.density === 'comfortable'}" title="Comfortable rows">${icon('density', { size: 14 })}<span>Comfortable</span></button>
      <div class="tbl-cols"><button type="button" class="btn sm ghost" data-tbl-cols aria-expanded="false" aria-haspopup="true" title="Choose columns">${icon('columns', { size: 14 })}<span>Columns</span>${icon('chevron', { size: 12 })}</button>
        <div class="tbl-colmenu" role="group" aria-label="Show columns" hidden data-bf-noedit>${cols.map((c, i) => canHide(c, i)
          ? `<label class="check"><input type="checkbox" data-col-toggle="${esc(c.key)}"${st.hidden.has(c.key) ? '' : ' checked'}> ${esc(c.label || c.key)}</label>` : '').join('')}</div></div>
    </div>` : ''}
    <div class="tbl-scroll"><table class="t ui-t">${o.caption ? `<caption class="sr-only">${esc(o.caption)}</caption>` : ''}
      <thead><tr>${cols.map((c) => `<th scope="col" data-col="${esc(c.key)}" class="${c.align === 'r' ? 'r' : c.align === 'c' ? 'c' : ''}"${c.title ? ` title="${esc(c.title)}"` : ''}${st.hidden.has(c.key) ? ' hidden' : ''}>${c.sort
        ? `<button type="button" class="th-sort" data-sort="${esc(c.key)}">${esc(c.label)}<span class="sort-ic" aria-hidden="true"></span></button>` : esc(c.label)}</th>`).join('')}${o.action ? '<th scope="col" class="act-h"><span class="sr-only">Actions</span></th>' : ''}</tr></thead>
      <tbody data-bf-list data-bf-nodata></tbody></table></div>
    <div class="tbl-empty" hidden></div>`;
  const tbody = el.querySelector('tbody');
  const tableEl = el.querySelector('table');
  const scroll = el.querySelector('.tbl-scroll');
  const emptyEl = el.querySelector('.tbl-empty');
  const pendingEl = el.querySelector('[data-tbl-apply]');
  const entries = new Map(); // key -> { tr, row, html: Map(col -> html), trend: Map(col -> n), gone }
  let data = o.rows || [];
  let first = true;
  let hover = false, focus = false;

  // ---- scoped CSS: mobile grid areas (one <style> per table id, no inline styles) ----
  function mobileCss() {
    const vis = cols.filter((c) => !st.hidden.has(c.key));
    const main = vis.filter((c) => (c.pri || 1) < 3);
    let areas, colsT = o.mobile?.cols || 'minmax(0,1fr) auto';
    if (o.mobile?.areas) areas = o.mobile.areas.map((line) => line.split(/\s+/).map((k) => (k === 'act' ? 'act' : k === '.' ? '.' : areaName(k))).join(' '));
    else {
      const ageCol = main.find((c) => c.key === 'age') || main.slice(1).reverse().find((c) => c.align === 'r');
      const rest = main.filter((c) => c !== main[0] && c !== ageCol);
      areas = [`${areaName(main[0]?.key)} ${ageCol ? areaName(ageCol.key) : areaName(main[0]?.key)}`];
      for (let i = 0; i < rest.length; i += 2) areas.push(rest[i + 1] ? `${areaName(rest[i].key)} ${areaName(rest[i + 1].key)}` : `${areaName(rest[i].key)} ${areaName(rest[i].key)}`);
      if (o.action) areas.push('act act');
    }
    const named = new Set(areas.join(' ').split(/\s+/));
    const sel = `.tbl[data-tbl="${CSS.escape(o.id)}"]`;
    const rules = cols.filter((c) => named.has(areaName(c.key))).map((c) => `${sel} td[data-col="${CSS.escape(c.key)}"]{grid-area:${areaName(c.key)}}`).join('');
    const css = `@media (max-width:860px){${sel} tbody tr{grid-template-areas:${areas.map((a) => `"${a}"`).join(' ')};grid-template-columns:${colsT}}${rules}${named.has('act') ? `${sel} td.act{grid-area:act}` : ''}}`;
    const id = `tbl-css-${o.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    let s = document.getElementById(id);
    if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
    if (s.textContent !== css) s.textContent = css;
    // Cells without an area on phones are the "extras" (pri 3): behind the row's More toggle.
    el.dataset.extras = String(cols.some((c) => !named.has(areaName(c.key)) && !st.hidden.has(c.key)));
    extrasSet = new Set(cols.filter((c) => !named.has(areaName(c.key))).map((c) => c.key));
  }
  let extrasSet = new Set();

  // ---- rows ----
  const cellHtml = (c, row) => (c.render ? c.render(row) : esc(row[c.key] ?? ''));
  function makeRow(key, row) {
    const tr = document.createElement('tr');
    tr.dataset.key = key;
    tr.className = 'click';
    tr.tabIndex = 0;
    for (const c of cols) {
      const td = document.createElement('td');
      td.dataset.col = c.key;
      td.dataset.label = c.label || '';
      if (c.align === 'r') td.classList.add('r', 'num');
      if (c.align === 'c') td.classList.add('c');
      if (c.cls) td.classList.add(...c.cls.split(/\s+/));
      if (c.mlabel) td.classList.add('mlabel');
      if (extrasSet.has(c.key)) td.classList.add('x');
      td.hidden = st.hidden.has(c.key);
      tr.appendChild(td);
    }
    if (o.action) { const td = document.createElement('td'); td.className = 'act'; tr.appendChild(td); }
    return { tr, row, html: new Map(), trend: new Map(), gone: false, born: Date.now() };
  }
  function patch(en, row) {
    en.row = row;
    const tds = en.tr.children;
    cols.forEach((c, i) => {
      const td = tds[i];
      const h = cellHtml(c, row);
      if (en.html.get(c.key) !== h) {
        td.innerHTML = h; // whole-cell innerHTML, never nodeValue (content.js restores stale text nodes)
        en.html.set(c.key, h);
      }
      if (c.trend) {
        const n = +c.trend(row);
        const p = en.trend.get(c.key);
        if (p !== undefined && Number.isFinite(n) && n !== p) tint(td, n > p ? 'up' : 'down');
        en.trend.set(c.key, n);
      }
    });
    if (o.action) {
      const td = tds[cols.length];
      const extra = extrasCount() ? `<button type="button" class="btn sm ghost tbl-more" data-tbl-more aria-expanded="${en.tr.classList.contains('open')}">${icon('chevron', { size: 14 })}<span data-bf-text>Details</span></button>` : '';
      const h = en.gone ? `<button type="button" class="btn sm" aria-disabled="true" disabled>Gone</button>` : o.action(row) + extra;
      if (en.html.get('__act') !== h) { td.innerHTML = h; en.html.set('__act', h); }
    }
    const rc = o.rowClass ? o.rowClass(row) : '';
    if (en.rc !== rc) { if (en.rc) en.tr.classList.remove(...en.rc.split(/\s+/)); if (rc) en.tr.classList.add(...rc.split(/\s+/)); en.rc = rc; }
  }
  const extrasCount = () => cols.filter((c) => extrasSet.has(c.key) && !st.hidden.has(c.key)).length;
  function tint(td, d) {
    td.classList.remove('tick-up', 'tick-down');
    void td.offsetWidth; // restart the animation
    td.classList.add(`tick-${d}`);
    td.querySelector('.tick-ar')?.remove();
    td.insertAdjacentHTML('beforeend', `<i class="tick-ar" aria-hidden="true">${d === 'up' ? '▲' : '▼'}</i>`);
    clearTimeout(td._tt);
    td._tt = setTimeout(() => { td.classList.remove('tick-up', 'tick-down'); td.querySelector('.tick-ar')?.remove(); }, 1200);
  }
  function sorted(rows) {
    if (!st.sort?.key) return rows;
    const c = cols.find((x) => x.key === st.sort.key);
    if (!c?.sort) return rows;
    const f = c.sort === true ? (r) => r[c.key] : c.sort;
    const m = st.sort.dir === 'asc' ? 1 : -1;
    return rows.map((r, i) => [r, f(r), i]).sort((a, b) => {
      const x = a[1], y = b[1];
      if (x === y) return a[2] - b[2];
      if (x === undefined || x === null) return 1;
      if (y === undefined || y === null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * m;
    }).map((x) => x[0]);
  }
  const frozen = () => o.freeze && (hover || focus);

  function update(rows = data) {
    data = rows || [];
    const list = sorted(data);
    const keys = list.map((r) => String(o.rowKey(r)));
    const keySet = new Set(keys);
    // Empty state
    const isEmpty = !list.length && ![...entries.values()].some((e) => e.gone);
    emptyEl.hidden = !isEmpty;
    scroll.hidden = isEmpty;
    if (isEmpty) {
      const h = typeof o.empty === 'function' ? o.empty() : o.empty || '';
      if (emptyEl._h !== h) { emptyEl.innerHTML = h; emptyEl._h = h; }
    }
    // Patch existing rows in place; create new ones.
    let fresh = 0;
    list.forEach((row, i) => {
      const k = keys[i];
      let en = entries.get(k);
      if (!en) {
        en = makeRow(k, row);
        entries.set(k, en);
        if (!first) { en.tr.classList.add('is-new'); setTimeout(() => en.tr.classList.remove('is-new'), o.newMs); }
        en.pending = frozen();
        fresh++;
      } else if (en.gone) { en.gone = false; en.tr.classList.remove('gone'); en.html.delete('__act'); }
      patch(en, row);
    });
    // Rows that disappeared: struck through with a disabled "Gone" action, removed after goneMs.
    for (const [k, en] of entries) {
      if (keySet.has(k) || en.gone) continue;
      en.gone = true;
      en.tr.classList.add('gone');
      en.html.delete('__act');
      patch(en, en.row);
      en.goneAt = Date.now();
    }
    for (const [k, en] of entries) {
      if (en.gone && Date.now() - en.goneAt > o.goneMs && !frozen()) { en.tr.remove(); entries.delete(k); }
    }
    if (frozen()) {
      // Order is frozen under the cursor / focus: count what's waiting instead of moving rows.
      const domKeys = [...tbody.children].map((tr) => tr.dataset.key);
      const desired = keys.filter((k) => entries.get(k).tr.isConnected);
      const moved = desired.some((k, i) => domKeys.filter((x) => keySet.has(x))[i] !== k);
      const waiting = [...entries.values()].filter((e) => !e.tr.isConnected).length;
      const n = waiting + (moved ? 1 : 0);
      if (pendingEl) {
        pendingEl.hidden = !n;
        const b = pendingEl.querySelector('b');
        const txt = waiting ? `${waiting} new · ${waiting === 1 ? 'update' : 'updates'}` : 'Order changed';
        if (b.textContent !== txt) b.textContent = txt;
      }
    } else {
      order(keys);
      if (pendingEl) pendingEl.hidden = true;
    }
    if (list.length) first = false; // the first non-empty paint is the baseline: nothing is NEW yet
  }
  function order(keys) {
    // Desired: live rows in sort order, then gone rows (kept until they expire).
    const trs = [...keys.map((k) => entries.get(k).tr), ...[...entries.values()].filter((e) => e.gone).map((e) => e.tr)];
    trs.forEach((tr, i) => { if (tbody.children[i] !== tr) tbody.insertBefore(tr, tbody.children[i] || null); });
    while (tbody.children.length > trs.length) tbody.lastElementChild.remove();
  }
  function applyNow() { hover = false; focus = false; update(data); }

  // ---- sort heads ----
  function paintSort() {
    el.querySelectorAll('th[data-col]').forEach((th) => {
      const on = st.sort?.key === th.dataset.col;
      th.setAttribute('aria-sort', on ? (st.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.classList.toggle('sorted', on);
    });
  }
  el.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.sort;
    if (st.sort?.key !== k) st.sort = { key: k, dir: 'desc' };
    else if (st.sort.dir === 'desc') st.sort = { key: k, dir: 'asc' };
    else st.sort = o.sort && o.sort.key !== k ? { ...o.sort } : null;
    save(); paintSort(); applyNow();
    o.onSort?.(st.sort); // lets a screen keep its own Sort select / paging in step with header clicks
  }));

  // ---- tools: density, columns menu, pending apply ----
  el.querySelector('[data-tbl-density]')?.addEventListener('click', (e) => {
    st.density = st.density === 'compact' ? 'comfortable' : 'compact';
    el.dataset.density = st.density;
    e.currentTarget.setAttribute('aria-pressed', String(st.density === 'comfortable'));
    save();
  });
  const colBtn = el.querySelector('[data-tbl-cols]');
  const colMenu = el.querySelector('.tbl-colmenu');
  if (colBtn) {
    const close = () => { colMenu.hidden = true; colBtn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc_, true); };
    const outside = (e) => { if (!e.target.closest('.tbl-cols')) close(); };
    const esc_ = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); colBtn.focus(); } };
    colBtn.addEventListener('click', () => {
      if (!colMenu.hidden) { close(); return; }
      colMenu.hidden = false; colBtn.setAttribute('aria-expanded', 'true');
      colMenu.querySelector('input')?.focus();
      setTimeout(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', esc_, true); }, 0);
    });
    if (!colMenu.querySelector('input')) colBtn.parentElement.hidden = true;
    colMenu.addEventListener('change', (e) => {
      const k = e.target.dataset.colToggle;
      if (!k) return;
      if (e.target.checked) st.hidden.delete(k); else st.hidden.add(k);
      save(); applyHidden();
    });
  }
  function applyHidden() {
    mobileCss();
    const idx = cols.map((c) => c.key);
    el.querySelectorAll('th[data-col]').forEach((th) => { th.hidden = st.hidden.has(th.dataset.col); });
    for (const en of entries.values()) {
      [...en.tr.children].forEach((td, i) => {
        if (i >= idx.length) return;
        td.hidden = st.hidden.has(idx[i]);
        td.classList.toggle('x', extrasSet.has(idx[i]));
      });
      en.html.delete('__act');
      patch(en, en.row);
    }
  }
  pendingEl?.addEventListener('click', applyNow);

  // ---- freeze while hovered / focused ----
  tbody.addEventListener('mouseenter', () => { hover = true; });
  tbody.addEventListener('mouseleave', () => { hover = false; update(data); });
  tbody.addEventListener('focusin', () => { focus = true; });
  tbody.addEventListener('focusout', (e) => { if (!tbody.contains(e.relatedTarget)) { focus = false; update(data); } });

  // ---- open + actions (one delegated listener) ----
  const rowOf = (tr) => entries.get(tr?.dataset.key);
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-key]');
    const en = rowOf(tr);
    if (!en) return;
    const more = e.target.closest('[data-tbl-more]');
    if (more) {
      e.stopPropagation();
      const open = !tr.classList.contains('open');
      tr.classList.toggle('open', open);
      more.setAttribute('aria-expanded', String(open));
      en.html.delete('__act'); // re-rendered (with the new aria-expanded) on the next patch
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      e.stopPropagation();
      if (en.gone || act.getAttribute('aria-disabled') === 'true') { e.preventDefault(); if (act.title) toast(act.title); return; }
      const fn = o.onAction?.[act.dataset.act];
      if (fn) fn(en.row, act, e);
      else if (act.dataset.act === 'bet') toast(`Opening ${api.bookById[act.dataset.book]?.name || 'the book’s'} bet slip…`);
      return;
    }
    if (e.target.closest('a, button, input, select, label, summary')) return;
    if (!en.gone && o.onOpen) o.onOpen(en.row, tr);
  });
  tbody.addEventListener('keydown', (e) => {
    const tr = e.target;
    if (!tr.matches?.('tr[data-key]') || (e.key !== 'Enter' && e.key !== ' ')) return;
    const en = rowOf(tr);
    if (!en || en.gone || !o.onOpen) return;
    e.preventDefault();
    o.onOpen(en.row, tr);
  });

  // ---- table tools placement (item B1, results first) ----
  // Desktop: Comfortable / Columns (and the "n new · apply" chip) sit in the actions column's header, so they
  // don't cost a row above the results. Phones (no thead) and tables without an actions column keep the row.
  // A screen that moved .tbl-tools elsewhere (e.g. into its filter bar) is left alone.
  const toolsEl = el.querySelector('.tbl-tools');
  const actTh = el.querySelector('th.act-h');
  const mqPhone = matchMedia('(max-width: 860px)');
  const placeTools = () => {
    if (!toolsEl || !actTh) return;
    if (toolsEl.parentElement !== el && toolsEl.parentElement !== actTh) return; // the screen placed it
    const inHead = !mqPhone.matches;
    if (inHead && toolsEl.parentElement !== actTh) actTh.append(toolsEl);
    else if (!inHead && toolsEl.parentElement !== el) el.prepend(toolsEl);
    toolsEl.classList.toggle('in-head', inHead);
  };
  placeTools();
  mqPhone.addEventListener('change', placeTools);

  // ---- sticky header: page-level sticky when the table fits; horizontal scroll otherwise ----
  const fit = () => {
    const over = tableEl.scrollWidth > scroll.clientWidth + 1;
    el.classList.toggle('scrolls', over && !matchMedia('(max-width: 860px)').matches);
  };
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => requestAnimationFrame(fit)) : null;
  ro?.observe(scroll);

  mobileCss();
  paintSort();
  update(data);
  requestAnimationFrame(fit);

  return {
    el,
    update(rows) { update(rows); requestAnimationFrame(fit); },
    rows: () => sorted(data),
    sortState: () => st.sort,
    setSort(s) { st.sort = s; save(); paintSort(); applyNow(); },
    destroy() { ro?.disconnect(); mqPhone.removeEventListener('change', placeTools); },
  };
}

// =====================================================================================================
// ui.filterBar (A14): fixed order Mode → Sport → Market → threshold → Books → Sort, "n filters · Reset",
// Advanced disclosure (remembered, with an active chip), values remembered per route and key ones in
// the hash. Phones: [Mode] [Filters · n] [Sort] + removable chips; the filters open in a bottom sheet.
// Keeps the .toolbar class.
// =====================================================================================================

const ROLE_ORDER = { mode: 0, sport: 1, market: 2, threshold: 3, books: 4, sort: 5 };
const roleOf = (f) => f.role || (f.type === 'mode' ? 'mode' : f.type === 'books' ? 'books' : f.type === 'sort' ? 'sort' : f.key === 'sport' ? 'sport' : f.key === 'market' ? 'market' : 'threshold');
const counts = (f) => !['mode', 'sort', 'books'].includes(roleOf(f)) && f.count !== false;

/**
 * const fb = ui.filterBar({ id, fields, onChange, sticky });  container.append(fb.el)
 * fields: [{ key, type: 'mode'|'select'|'number'|'toggle'|'books'|'sort', label, options: [[v, l]],
 *            default, query (sync to the hash), advanced (behind the Advanced disclosure),
 *            prefix, step, min, chip: v => 'NBA' (chip text), count (false = never counts as a filter) }]
 * 'books' edits store.books (your books, shared by every tool) from a popover.
 * fb.values (live object) · fb.set(patch) · fb.reset() · fb.activeCount()
 */
export function filterBar({ id = 'main', fields, onChange = () => {}, sticky = false } = {}) {
  const v = view();
  const saved = v.get(`fb:${id}`, {});
  const q = getQuery().params;
  const list = fields.map((f, i) => ({ ...f, _i: i })).sort((a, b) => (ROLE_ORDER[roleOf(a)] - ROLE_ORDER[roleOf(b)]) || a._i - b._i);
  const values = {};
  for (const f of list) {
    if (f.type === 'books') continue;
    const raw = f.query && q[f.key] !== undefined ? q[f.key] : saved[f.key] !== undefined ? saved[f.key] : f.default;
    values[f.key] = f.type === 'number' ? (Number.isFinite(+raw) ? +raw : f.default) : f.type === 'toggle' ? (raw === true || raw === 'true' || raw === '1') : raw;
    if (f.options && !f.options.some((o) => String(Array.isArray(o) ? o[0] : o) === String(values[f.key]))) values[f.key] = f.default;
  }
  const isActive = (f) => counts(f) && f.type !== 'books' && String(values[f.key]) !== String(f.default);
  const activeCount = () => list.filter(isActive).length;
  const opt = (o) => (Array.isArray(o) ? o : [o, o]);

  const el = document.createElement('div');
  el.className = `toolbar fb${sticky ? ' fb-sticky' : ''}`;
  el.dataset.fb = id;
  const control = (f) => {
    const val = values[f.key];
    if (f.type === 'mode') return `<div class="fb-item fb-mode">${modeSwitch(f.options, val, { name: `fb-${f.key}`, label: f.label || 'Mode' })}</div>`;
    if (f.type === 'books') return `<div class="fb-item fb-books"><button type="button" class="btn sm outline" data-fb-books aria-expanded="false" aria-haspopup="true">${icon('filter', { size: 14 })}<span>${esc(f.label || 'Books')}</span> <b data-bf-nodata data-fb-books-n>${store.get().books.length}</b></button>
      <div class="fb-pop" hidden data-bf-noedit role="group" aria-label="Your books">${booksChecks()}</div></div>`;
    if (f.type === 'toggle') return `<div class="fb-item fb-${roleOf(f)}"><label class="check fb-toggle"><input type="checkbox" data-fb-key="${esc(f.key)}"${val ? ' checked' : ''}> ${esc(f.label)}</label></div>`;
    if (f.type === 'number') return `<div class="fb-item fb-${roleOf(f)}"><label class="field"><span>${esc(f.label)}</span><div class="num">${f.prefix ? `<em>${esc(f.prefix)}</em>` : ''}<input type="number" data-fb-key="${esc(f.key)}" value="${esc(val)}" step="${f.step ?? 1}" min="${f.min ?? 0}"></div></label></div>`;
    return `<div class="fb-item fb-${roleOf(f)}"><label class="field"><span>${esc(f.label || (f.type === 'sort' ? 'Sort' : f.key))}</span><select data-fb-key="${esc(f.key)}">${(f.options || []).map((o) => { const [ov, ol] = opt(o); return `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label></div>`;
  };
  const booksChecks = () => {
    const mine = new Set(store.get().books);
    return `<div class="fb-pop-h">Your books</div><div class="fb-books-grid">${api.sportsbooks.map((b) => `<label class="check${bookLegal(b.id) ? '' : ' off'}" title="${esc(bookLegal(b.id) ? b.name : illegalNote(b.id))}"><input type="checkbox" data-fb-book="${esc(b.id)}"${mine.has(b.id) ? ' checked' : ''}> ${esc(b.name)}</label>`).join('')}</div>
      <p class="fb-pop-note">Every tool uses these books. <a href="#/account">All settings</a></p>`;
  };
  const main = list.filter((f) => !f.advanced);
  const adv = list.filter((f) => f.advanced);
  const sortF = main.find((f) => roleOf(f) === 'sort');
  const modeF = main.find((f) => roleOf(f) === 'mode');
  // Mode and Sort stay in the bar on phones; everything else is in .fb-fields (moves into the sheet).
  el.innerHTML = `${modeF ? control(modeF) : ''}<div class="fb-fields" data-fb-fields>${main.filter((f) => f !== sortF && f !== modeF).map(control).join('')}
      ${adv.length ? `<details class="fb-adv"${v.get(`fb:${id}:adv`, false) ? ' open' : ''}><summary>Advanced <b class="fb-adv-n" data-bf-nodata hidden></b></summary><div class="fb-adv-body">${adv.map(control).join('')}</div></details>` : ''}
    </div>
    <button type="button" class="btn sm outline fb-open" data-fb-open aria-haspopup="dialog">${icon('filter', { size: 14 })}<span>Filters</span> <b data-bf-nodata data-fb-n></b></button>
    ${sortF ? control(sortF) : ''}
    <span class="fb-reset-wrap" hidden><span class="fb-count" data-bf-nodata></span><button type="button" class="btn sm ghost" data-fb-reset>Reset</button></span>
    <div class="fb-chips" data-bf-nodata></div>`;
  const fieldsBox = el.querySelector('[data-fb-fields]');

  function commit(key) {
    const persist = {};
    for (const f of list) if (f.type !== 'books') persist[f.key] = values[f.key];
    v.set({ [`fb:${id}`]: persist });
    const qp = {};
    for (const f of list) if (f.query) qp[f.key] = String(values[f.key]) === String(f.default) ? null : values[f.key];
    if (Object.keys(qp).length) setQuery(qp);
    paintCount();
    onChange({ ...values }, key);
  }
  function paintCount() {
    const n = activeCount();
    const wrap = el.querySelector('.fb-reset-wrap');
    wrap.hidden = !n;
    wrap.querySelector('.fb-count').textContent = `${n} ${n === 1 ? 'filter' : 'filters'}`;
    el.querySelector('[data-fb-n]').textContent = n ? String(n) : '';
    const an = el.querySelector('.fb-adv-n');
    if (an) { const k = adv.filter(isActive).length; an.hidden = !k; an.textContent = k ? String(k) : ''; }
    el.querySelector('.fb-chips').innerHTML = list.filter(isActive).map((f) => {
      const o = (f.options || []).map(opt).find(([ov]) => String(ov) === String(values[f.key]));
      const txt = f.chip ? f.chip(values[f.key]) : f.type === 'toggle' ? f.label : `${f.label}: ${o ? o[1] : values[f.key]}`;
      return `<button type="button" class="fb-chip" data-fb-clear="${esc(f.key)}" aria-label="Remove filter ${esc(txt)}">${esc(txt)} ${icon('x', { size: 12 })}</button>`;
    }).join('');
    el.querySelector('[data-fb-books-n]') && (el.querySelector('[data-fb-books-n]').textContent = String(store.get().books.length));
  }
  function readInput(t) {
    const f = list.find((x) => x.key === t.dataset.fbKey);
    if (!f) return;
    if (f.type === 'number') { const n = parseFloat(t.value); if (Number.isNaN(n)) return; values[f.key] = n; }
    else if (f.type === 'toggle') values[f.key] = t.checked;
    else values[f.key] = t.value;
    commit(f.key);
  }
  // Controls are wired directly (not delegated) so the mobile sheet can host the same nodes.
  function wire(scope) {
    scope.querySelectorAll('[data-fb-key]').forEach((inp) => {
      inp.addEventListener(inp.type === 'number' ? 'input' : 'change', () => readInput(inp));
    });
    scope.querySelectorAll('[data-seg^="fb-"] button').forEach((b) => b.addEventListener('click', () => {
      const key = b.closest('[data-seg]').dataset.seg.slice(3);
      b.closest('[data-seg]').querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      values[key] = b.dataset.v;
      if (key === 'mode') view().set({ mode: b.dataset.v });
      commit(key);
    }));
    scope.querySelectorAll('[data-fb-books]').forEach((b) => {
      const pop = b.nextElementSibling;
      const close = () => { pop.hidden = true; b.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escK, true); };
      const outside = (e) => { if (!e.target.closest('.fb-books')) close(); };
      const escK = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); b.focus(); } };
      b.addEventListener('click', () => {
        if (!pop.hidden) { close(); return; }
        pop.hidden = false; b.setAttribute('aria-expanded', 'true');
        pop.querySelector('input')?.focus();
        setTimeout(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escK, true); }, 0);
      });
      pop.addEventListener('change', (e) => {
        const id_ = e.target.dataset.fbBook;
        if (!id_) return;
        const cur = new Set(store.get().books);
        if (e.target.checked) cur.add(id_); else cur.delete(id_);
        if (!cur.size) { e.target.checked = true; toast('Keep at least one book'); return; }
        store.set({ books: api.sportsbooks.map((x) => x.id).filter((x) => cur.has(x)) });
        paintCount();
        onChange({ ...values }, 'books');
      });
    });
  }
  wire(el);
  el.querySelector('.fb-adv')?.addEventListener('toggle', (e) => v.set({ [`fb:${id}:adv`]: e.target.open }));
  el.querySelector('[data-fb-reset]').addEventListener('click', () => api_.reset());
  el.querySelector('.fb-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fb-clear]');
    if (b) api_.set({ [b.dataset.fbClear]: list.find((f) => f.key === b.dataset.fbClear).default });
  });
  // Phones: the filter fields move into a bottom sheet and come back when it closes.
  el.querySelector('[data-fb-open]').addEventListener('click', () => {
    const home = document.createComment('fb');
    fieldsBox.replaceWith(home);
    const body = drawer('Filters', '', { footer: `<button type="button" class="btn primary block" data-fb-done>Show results</button><button type="button" class="btn ghost" data-fb-sheet-reset>Reset</button>` });
    body.appendChild(fieldsBox);
    body.footer.querySelector('[data-fb-done]').addEventListener('click', () => closeDrawer());
    body.footer.querySelector('[data-fb-sheet-reset]').addEventListener('click', () => api_.reset());
    body.whenClosed(() => { home.replaceWith(fieldsBox); });
  });

  function syncControls() {
    for (const f of list) {
      if (f.type === 'books') continue;
      if (f.type === 'mode') {
        el.querySelectorAll(`[data-seg="fb-${f.key}"] button`).forEach((b) => { const on = b.dataset.v === String(values[f.key]); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        continue;
      }
      // The fields may be in the mobile sheet (moved out of `el`), so look in both places.
      const sel = `[data-fb-key="${CSS.escape(f.key)}"]`;
      const inp = fieldsBox.querySelector(sel) || el.querySelector(sel);
      if (!inp) continue;
      if (f.type === 'toggle') inp.checked = !!values[f.key];
      else if (String(inp.value) !== String(values[f.key])) inp.value = values[f.key];
    }
  }
  const api_ = {
    el,
    values,
    activeCount,
    set(patch, { silent = false } = {}) {
      Object.assign(values, patch);
      syncControls();
      if (silent) { paintCount(); return; }
      commit(Object.keys(patch)[0]);
    },
    reset() {
      for (const f of list) if (f.type !== 'books' && counts(f)) values[f.key] = f.default;
      syncControls();
      commit('reset');
    },
    get mode() { return modeF ? values[modeF.key] : undefined; },
  };
  paintCount();
  const off = store.subscribe(() => { const n = el.querySelector('[data-fb-books-n]'); if (n) n.textContent = String(store.get().books.length); });
  api_.destroy = off;
  return api_;
}

// =====================================================================================================
// First-run setup (B11): a compact, skippable, expandable card for the top of Daily. Defaults stay as
// they are; until it's done screens can show "Using sample settings". Check marks, never numbers.
// =====================================================================================================

/** "Using sample settings: NJ, 8 books, $5,000 · Change" (opens the top-bar sizing popover). */
export function sampleSettingsLine() {
  const s = store.get();
  return `<p class="sample-line">Using sample settings: <span data-bf-nodata>${esc(s.state)}, ${s.books.length} books, ${money(s.bankroll, 0)}</span> · <button type="button" class="linkish" data-open-sizing>Change</button></p>`;
}
/**
 * Mounts the first-run card into `container` (Daily). Hidden once store.onboarded is true.
 * Steps: where you bet (state + books), bankroll presets, risk preset, goal, and a bonus-bet question
 * deep-linked to Promo Converter. Returns { el, destroy }.
 */
export function setupCard(container) {
  const STEPS = [['where', 'Where you bet'], ['bankroll', 'Bankroll'], ['risk', 'Risk'], ['goal', 'Goal']];
  const el = document.createElement('section');
  el.className = 'setup-card';
  container.appendChild(el);
  const paint = () => {
    const s = store.get();
    if (s.onboarded) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const done = new Set(s.setupDone || []);
    const open = el.querySelector('details')?.open || false;
    el.innerHTML = `<details class="setup"${open ? ' open' : ''}>
      <summary><h2>${headText('Set up BetFriend for you')}</h2>
        <span class="setup-prog" aria-label="${done.size} of ${STEPS.length} done">${STEPS.map(([k, l]) => `<span class="sp${done.has(k) ? ' on' : ''}" title="${esc(l)}">${icon(done.has(k) ? 'check' : 'dot', { size: 12 })}</span>`).join('')}</span>
        <span class="setup-hint">${sampleSettingsLine()}</span>
        <span class="setup-acts"><span class="btn sm primary" aria-hidden="true">Set up</span><button type="button" class="btn sm ghost" data-setup-skip>Skip</button></span>
      </summary>
      <div class="setup-body">
        <div class="setup-step${done.has('where') ? ' done' : ''}"><h3>${icon(done.has('where') ? 'check' : 'dot', { size: 14 })} Where you bet</h3>
          <label class="field"><span>State</span><select data-setup-state>${api.states.map((x) => `<option${x.code === s.state ? ' selected' : ''}>${x.code}</option>`).join('')}</select></label>
          <div class="chips setup-books">${api.sportsbooks.map((b) => `<button type="button" class="chip${s.books.includes(b.id) ? ' on' : ''}${bookLegal(b.id, s.state) ? '' : ' off'}" data-setup-book="${b.id}" aria-pressed="${s.books.includes(b.id)}"${bookLegal(b.id, s.state) ? '' : ` title="${esc(illegalNote(b.id, s.state))}"`}>${esc(b.short)}</button>`).join('')}</div>
          <button type="button" class="btn sm outline" data-setup-ok="where">Looks right</button></div>
        <div class="setup-step${done.has('bankroll') ? ' done' : ''}"><h3>${icon(done.has('bankroll') ? 'check' : 'dot', { size: 14 })} Bankroll</h3>
          <div class="chips">${[500, 1000, 5000, 25000].map((n) => `<button type="button" class="chip${s.bankroll === n ? ' on' : ''}" data-setup-bank="${n}" aria-pressed="${s.bankroll === n}">${money(n, 0)}</button>`).join('')}</div></div>
        <div class="setup-step${done.has('risk') ? ' done' : ''}"><h3>${icon(done.has('risk') ? 'check' : 'dot', { size: 14 })} Risk</h3>
          <div class="chips">${[['hedged', 'Hedged only'], ['balanced', 'Hedged + low-cost'], ['edges', 'Edges too (can lose)']].map(([k, l]) => `<button type="button" class="chip${s.riskPreset === k ? ' on' : ''}" data-setup-risk="${k}" aria-pressed="${s.riskPreset === k}">${esc(l)}</button>`).join('')}</div></div>
        <div class="setup-step${done.has('goal') ? ' done' : ''}"><h3>${icon(done.has('goal') ? 'check' : 'dot', { size: 14 })} Goal</h3>
          <div class="chips">${[['beginner', 'I’m new: explain things'], ['promos', 'Cash out promos'], ['hedged', 'Hedged profit'], ['edges', '+EV and signals'], ['pm', 'Prediction markets']].map(([k, l]) => `<button type="button" class="chip${s.goal === k ? ' on' : ''}" data-setup-goal="${k}" aria-pressed="${s.goal === k}">${esc(l)}</button>`).join('')}</div></div>
        <div class="setup-step"><h3>${icon('promo', { size: 14 })} Do you hold a bonus bet?</h3><a class="btn sm outline" href="#/promo-converter">Convert it to cash</a></div>
        <div class="setup-foot"><button type="button" class="btn primary sm" data-setup-done>Done</button></div>
      </div></details>`;
  };
  const mark = (k, patch) => { const s = store.get(); store.set({ ...patch, setupDone: [...new Set([...(s.setupDone || []), k])] }); };
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-setup-skip]')) { e.preventDefault(); store.set({ onboarded: true }); toast('Setup skipped. Sample settings stay on; change them any time in Settings.'); return; }
    if (t.matches('[data-setup-done]')) { store.set({ onboarded: true }); toast('All set'); return; }
    if (t.dataset.setupOk) mark(t.dataset.setupOk, {});
    if (t.dataset.setupBook) {
      const cur = new Set(store.get().books);
      if (cur.has(t.dataset.setupBook)) cur.delete(t.dataset.setupBook); else cur.add(t.dataset.setupBook);
      if (cur.size) store.set({ books: api.sportsbooks.map((x) => x.id).filter((x) => cur.has(x)) });
    }
    if (t.dataset.setupBank) mark('bankroll', { bankroll: +t.dataset.setupBank });
    if (t.dataset.setupRisk) mark('risk', { riskPreset: t.dataset.setupRisk });
    if (t.dataset.setupGoal) mark('goal', { goal: t.dataset.setupGoal });
  });
  el.addEventListener('change', (e) => { if (e.target.matches('[data-setup-state]')) store.set({ state: e.target.value }); });
  paint();
  const off = store.subscribe(paint);
  return { el, destroy: off };
}

// ---------- URL query (deep links without re-rendering) ----------
// The route lives in the hash: #/arbitrage?mode=live&sport=NBA. setQuery rewrites the query with
// history.replaceState, which does not fire hashchange, so the screen is not re-rendered and no history
// entry is added. Use it to make filters shareable/reloadable; read them back from ctx.params on render.

/** Current route id and query params from the hash. */
export function getQuery() {
  const [id, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { route: id || 'daily', params: Object.fromEntries(new URLSearchParams(qs || '')) };
}
/** Merge `patch` into the hash query. null / undefined / '' / false remove a key. Returns the new params. */
export function setQuery(patch = {}) {
  const { route, params } = getQuery();
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '' || v === false) p.delete(k);
    else p.set(k, String(v));
  }
  const qs = p.toString();
  history.replaceState(history.state, '', `${location.pathname}${location.search}#/${route}${qs ? `?${qs}` : ''}`);
  return Object.fromEntries(p);
}

// ---------- screen-reader announcements ----------
// #sr-live (polite) and #sr-alert (assertive) live in index.html, outside #app, so re-rendering a screen
// never wipes them and content.js ignores them. Announcements are throttled per key to one every 15s
// (the latest message wins and is spoken when the window ends), so a ticking table can't flood a
// screen reader. Live-table updates ({ live: true }) stay silent unless the person turns them on
// (store setting `announceLive`).
const SR_GAP = 15000;
const srLast = new Map(); // key -> time of the last spoken message
const srPending = new Map(); // key -> { msg, timer }

function speak(msg, assertive) {
  const el = document.getElementById(assertive ? 'sr-alert' : 'sr-live');
  if (!el) return;
  el.textContent = '';
  // A fresh text node after clearing makes screen readers repeat identical messages too.
  setTimeout(() => { el.textContent = msg; }, 60);
}

/**
 * Tell screen-reader users something changed.
 * opts.key      throttle bucket (default 'default'); different keys don't hold each other up
 * opts.force    speak now, ignoring the throttle (direct answers to the person's own action)
 * opts.assertive  interrupt (role=alert), e.g. a stop-loss hit; never throttled
 * opts.live     an automatic live-data update: silent unless store.announceLive is on
 */
export function announce(msg, { key = 'default', force = false, assertive = false, live = false } = {}) {
  if (!msg) return;
  if (live && !announceLive()) return;
  if (assertive || force) { srLast.set(key, Date.now()); speak(msg, assertive); return; }
  const wait = SR_GAP - (Date.now() - (srLast.get(key) || 0));
  if (wait <= 0) { srLast.set(key, Date.now()); speak(msg, false); return; }
  const p = srPending.get(key);
  if (p) { p.msg = msg; return; }
  const entry = { msg, timer: setTimeout(() => { srPending.delete(key); srLast.set(key, Date.now()); speak(entry.msg, false); }, wait) };
  srPending.set(key, entry);
}
const announceLive = () => !!store.get().announceLive;

// =====================================================================================================
// startKit(): global wiring for the kit, called once by the shell (app.js). Delegated listeners for
// subtitle More toggles, glossary terms, pagers, live-status Pause, "Change" sample-settings links,
// plus the live-status clock and the back-to-top button.
// =====================================================================================================

let kitStarted = false;
export function startKit() {
  if (kitStarted) return;
  kitStarted = true;

  // Live status: one clock for every instance; ticks move "updated" forward.
  api.onTick(() => { lastTick = Date.now(); paintAllLive(); });
  api.onPauseChange?.(() => paintAllLive());
  setInterval(paintAllLive, 1000);

  // Subtitle clamp: show "More" only where the one line actually overflows.
  const syncClamps = () => document.querySelectorAll('.ph-sub').forEach((w) => {
    const p = w.querySelector('.sub'), b = w.querySelector('[data-sub-more]');
    if (!p || !b || p.classList.contains('open')) return;
    b.hidden = p.scrollWidth <= p.clientWidth + 1 && p.scrollHeight <= p.clientHeight + 1;
  });
  let q = false;
  const queue = () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; syncClamps(); }); };
  new MutationObserver(queue).observe(document.getElementById('view') || document.body, { childList: true, subtree: true });
  window.addEventListener('resize', queue, { passive: true });
  document.fonts?.ready?.then(queue);

  document.addEventListener('click', (e) => {
    const more = e.target.closest('[data-sub-more]');
    if (more) {
      const p = more.parentElement.querySelector('.sub');
      const open = !p.classList.contains('open');
      p.classList.toggle('open', open);
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Less' : 'More';
      return;
    }
    const pause = e.target.closest('[data-ls-pause]');
    if (pause) { api.setPaused?.(!api.isPaused?.()); paintAllLive(); return; }
    const pg = e.target.closest('[data-more]');
    if (pg && pagers.has(pg.dataset.more)) {
      const p = pagers.get(pg.dataset.more);
      p.limit += p.step;
      p.cb?.();
      return;
    }
    if (e.target.closest('[data-open-sizing]')) { e.preventDefault(); window.dispatchEvent(new CustomEvent('bf:open-sizing')); return; }
    const t = e.target.closest('.term');
    if (t) { e.preventDefault(); e.stopPropagation(); termShow(t, true); return; }
    if (!e.target.closest('#term-pop')) termHide(true);
  }, true);

  // Glossary popover: hover / focus / tap. One shared element outside #app (never edited).
  document.addEventListener('mouseover', (e) => { const t = e.target.closest?.('.term'); if (t) termShow(t); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.term') && !e.relatedTarget?.closest?.('#term-pop')) termHide(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest?.('.term'); if (t) termShow(t); else if (!e.target.closest?.('#term-pop')) termHide(true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && termEl && !termEl.hidden) { termHide(true); termFor?.focus(); } });

  // Back to top: after two screens of scrolling.
  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'to-top';
  top.hidden = true;
  top.setAttribute('aria-label', 'Back to top');
  top.dataset.bfNoedit = '';
  top.dataset.bfIgnore = '';
  top.innerHTML = icon('top', { size: 20 });
  document.body.appendChild(top);
  top.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('view')?.focus({ preventScroll: true }); });
  let tq = false;
  window.addEventListener('scroll', () => {
    if (tq) return; tq = true;
    requestAnimationFrame(() => { tq = false; top.hidden = window.scrollY < window.innerHeight * 2; });
  }, { passive: true });

  paintLegBanner();
}

let termEl = null, termFor = null, termTimer = null;
function termShow(t, pinned = false) {
  const g = glossaryLookup(t.dataset.term);
  if (!g) return;
  clearTimeout(termTimer);
  if (!termEl) {
    termEl = document.createElement('div');
    termEl.id = 'term-pop';
    termEl.className = 'term-pop';
    termEl.setAttribute('role', 'tooltip');
    termEl.dataset.bfNoedit = '';
    termEl.dataset.bfIgnore = '';
    termEl.hidden = true;
    document.body.appendChild(termEl);
    termEl.addEventListener('mouseleave', () => termHide());
  }
  termFor = t;
  termEl.innerHTML = `<b>${esc(g.term)}</b><p>${esc(g.short)}</p><a href="#/glossary?t=${esc(g.key)}">Glossary</a>`;
  termEl.hidden = false;
  termEl.dataset.pinned = pinned ? '1' : '';
  const r = t.getBoundingClientRect();
  const w = Math.min(300, window.innerWidth - 24);
  termEl.style.width = `${w}px`;
  const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 8 + termEl.offsetHeight < window.innerHeight;
  termEl.style.left = `${left}px`;
  termEl.style.top = `${below ? r.bottom + 8 : Math.max(8, r.top - termEl.offsetHeight - 8)}px`;
}
function termHide(force = false) {
  if (!termEl || termEl.hidden) return;
  if (!force && termEl.dataset.pinned) return;
  clearTimeout(termTimer);
  termTimer = setTimeout(() => { if (termEl) termEl.hidden = true; }, force ? 0 : 150);
}
