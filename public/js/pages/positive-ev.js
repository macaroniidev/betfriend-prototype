// Positive EV (C2): pre-match and live +EV bets priced against sharp no-vig fair odds.
//
// Same results-first pattern as Arbitrage: page head (static H1, live status) with the facts strip
// beside it on wide screens → mode switch + filter bar (Sport · Market · Min EV · Books popover ·
// Sort, with the fair-odds sources and "scan every book" behind Advanced) → one keyed ui.table.
// Each row: EV + risk label, the bet with a dollarised "wins ~45% · pays $96 · worth +$5.40" line,
// book · price, fair odds, win prob, the expected profit at the suggested Kelly stake, and ONE
// primary ("Bet $70") plus Calc · Log. The row opens the detail drawer (line history, every book's
// price, fair odds by sharp reference, devig breakdown, Kelly sizing) whose footer Bet / Log follow
// the Kelly slider, with a stale-price guard.

import { rng, SHARP_REFS } from '../data/core.js';

const MARKETS = ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'];
const METHOD_LABEL = { multiplicative: 'Multiplicative', power: 'Power', additive: 'Additive' };
const PAGE = 50; // rows per "Show more" step (applied after sorting, so the best rows are always on top)
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const CSS = `
.pev .ph-title h1 { margin-right: 4px; }
@media (min-width: 1200px) {
  .pev .page-head.ph { padding-bottom: 12px; border-bottom: 2px solid var(--line); }
  .pev .page-head.ph > .facts { grid-column: 2; grid-row: 1; align-self: center; margin: 0; padding: 0; border: 0; }
  .pev .page-head.ph > .facts .stat small { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
.pev .fb-host { display: flex; align-items: flex-end; gap: 10px 14px; flex-wrap: wrap; }
.pev .fb-host > .toolbar.fb { flex: 1 1 auto; margin-bottom: 0; }
.pev .fb-host > .tbl-tools { padding: 0 0 2px; margin-left: auto; flex-wrap: nowrap; }
@media (min-width: 861px) and (max-width: 1599px) {
  .pev .fb-host > .tbl-tools .btn > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
.pev .tbl { margin-top: 10px; }
.pev .fb-host .fb-adv:not([open]) { align-self: flex-end; }
.pev .fb-host .fb-adv > summary { min-height: 40px; }
.pev .ev-c { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.pev .ev-c .edge { font-size: 14px; }
.pev .evc .evt-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 165px; }
.pev .sel-name { font-weight: 700; }
.pev .sel-sub { font-size: var(--t-xs); color: var(--muted); margin-top: 2px; }
.pev .ui-t td[data-col="bet"] { min-width: 240px; }
.pev .ui-t .ev-line { font-size: 13px; white-space: nowrap; }
.pev .bookprice { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
.pev .ui-t td[data-col="stake"] .hero-fig b { font-size: var(--t-xl); }
.pev .num-v { font-variant-numeric: tabular-nums; font-weight: 700; }
.pev .fair-c { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; white-space: nowrap; }
.pev .fair-c small { font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pev .tbl.scrolls .ui-t th { top: 0; }
.pev .ui-t td[data-col="ev"] .risk { font-size: 11px; padding: 2px 5px; }
.pev .pev-foot { padding: 12px 0; display: flex; justify-content: center; }
.pev .pev-foot:empty { display: none; }
.pev .lock-slot:empty { display: none; }
.pev .page-head .facts[hidden] { display: none; }
.pev .near-item .slip-lines { max-width: 560px; }
.pev .lock-slot { margin-top: 12px; }
.pev .how-sec { margin-top: 28px; }
.pev .near-list { display: grid; gap: 4px; }
.pev .near-item { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 8px 0; border-top: 1px solid var(--line); }
/* Fair-odds sources (inside the filter bar's Advanced disclosure) */
.pev .pev-src { display: flex; flex-direction: column; gap: 6px; }
.pev .pev-src > span { font-size: var(--t-xs); font-weight: 700; color: var(--muted); }
.pev .pev-src .chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pev .pev-src small { font-size: var(--t-xs); color: var(--muted); }
.drawer-body .pev-src { display: flex; flex-direction: column; gap: 6px; }
.drawer-body .pev-src .chips { display: flex; flex-wrap: wrap; gap: 6px; }
@media (max-width: 860px) {
  .pev .fb-host { align-items: center; gap: 8px; }
  .pev .fb-host > .mode-switch { flex: 1 1 100%; }
  .pev .fb-host > .mode-switch button { flex: 1; }
  .pev .fb-host > .tbl-tools { display: none; }
  .pev .ui-t td[data-col="ev"] .risk { display: none; }
  .pev .ui-t td[data-col="bet"] { min-width: 0; }
  .pev .ui-t .ev-line { white-space: normal; }
  .pev .ui-t td[data-col="stake"] { align-self: center; }
}

/* ---------- detail drawer ---------- */
.pev-d { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.pev-d .pd-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 24px; flex-wrap: wrap; }
.pev-d .pd-bet { font: 900 var(--t-xl)/1.1 var(--f-head); text-transform: uppercase; }
.pev-d .pd-bet .price { font: inherit; }
.pev-d .pd-meta { margin-top: 4px; font-size: var(--t-sm); color: var(--muted); font-weight: 600; }
.pev-d .pd-top .kv { flex: 1 1 260px; max-width: 360px; }
.pev-d section { border-top: 2px solid var(--line); padding-top: 12px; }
.pev-d h3 { font-size: var(--t-md); margin: 0 0 8px; }
.pev-d .spark { display: block; width: 100%; max-width: 620px; height: auto; }
.pev-d .t td, .pev-d .t th { padding: 7px 10px; font-size: 13px; }
.pev-d .t th { position: static; }
.pev-d .t td:first-child { white-space: nowrap; }
.pev-d tr.hl td { background: var(--hl); }
.pev-d .hist-meta { display: flex; justify-content: space-between; font-size: var(--t-xs); color: var(--muted); margin-top: 4px; }
.pev-d .kelly-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pev-d input[type=range] { width: 100%; }
.pev-d .pd-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.pev-d .note { font-size: var(--t-xs); color: var(--muted); margin: 6px 0 0; }
.pev-d .tbl-x { overflow-x: auto; }
@media (max-width: 520px) { .pev-d .pd-top .kv { max-width: none; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-positive-ev')) document.head.insertAdjacentHTML('beforeend', `<style id="css-positive-ev">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const view = ui.view();
  const s0 = store.get();
  const st = {
    mode: ui.initialMode(params, 'pre', ['pre', 'live']),
    // Fair-odds sources: remembered per route, starting from Settings' sharp references.
    refs: (view.get('refs', null) || (s0.sharpRefs?.length ? s0.sharpRefs : SHARP_REFS)).filter((r) => api.bookById[r]),
    limit: PAGE,
  };
  if (!st.refs.length) st.refs = [...SHARP_REFS];
  const counts = { pre: 0, live: 0 };
  let all = [];       // every +EV bet for the current filters (unsorted)
  let lastUpdate = Date.now();

  const subtitle = (m) => (m === 'live'
    ? 'Like live arbs, live +EV bets are 2 to 3x more profitable. The volume makes this a staple for nearly every pro.'
    : 'Data-driven bets. We find bets paying out higher than they should, priced against sharp no-vig fair odds.');

  root.innerHTML = `<div class="pev">
    ${ui.pageHead({ title: 'Positive EV', tool: 'positive-ev', live: true,
      subtitle: `<span data-pev-sub>${subtitle(st.mode)}</span>`,
      facts: [{ label: '+EV bets found', value: '—' }] })}
    <section class="results" aria-labelledby="pev-results-h"><h2 id="pev-results-h" class="sr-only">Positive EV bets</h2>
      <div class="fb-host" data-fb>${ui.modeSwitch([['pre', 'Pre-match', '·'], ['live', 'Live +EV', '·']], st.mode)}</div>
      <div data-table></div>
      <div class="pev-foot" data-more></div>
      <div class="lock-slot" data-lock></div>
    </section>
    ${ui.how({
      summary: 'Bet only when a book pays more than the sharp fair price; over many bets the extra adds up.',
      checks: [
        `We remove the ${ui.term('vig')} from sharp books' prices (${ui.term('devig', 'devig')}) to get the ${ui.term('fair', 'fair odds')}.`,
        'A bet is +EV when your book pays more than those fair odds imply.',
        `Stakes follow ${ui.term('kelly', 'Kelly')} sizing at your ${ui.term('kelly_fraction', 'Kelly fraction')} of your ${ui.term('bankroll')}, so bigger edges get bigger bets.`,
        'Any single bet can lose. The edge shows up over hundreds of bets, and beating the closing line is the best sign it is real.',
      ],
    })}
  </div>`;
  const wrap = root.querySelector('.pev');
  const $ = (sel) => root.querySelector(sel);

  const method = () => methods[store.get().devigMethod] || odds.devig;
  const kellyStake = (o, mult = store.get().kellyMult) => Math.round(store.get().bankroll * odds.kelly(o.meta.fairProb, o.legs[0].price, mult));
  const fairOdds = (p) => ui.fmtOdds(odds.probToAmerican(p));
  const refsShort = () => st.refs.map((r) => api.bookById[r]?.short || r).join(' + ');
  const sourceNote = () => `vs ${refsShort()} · ${METHOD_LABEL[store.get().devigMethod] || 'Multiplicative'} devig`;

  // ---------- filter bar ----------
  const fb = ui.filterBar({
    id: 'pev',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: MARKETS, query: true },
      { key: 'minEv', type: 'number', label: 'Min EV %', default: 1, step: 0.5, min: 0, chip: (v) => `EV ≥ ${v}%` },
      { key: 'books', type: 'books', label: 'Books' },
      { key: 'sort', type: 'sort', label: 'Sort', default: 'ev', options: [['ev', 'Best EV'], ['worth', 'Most expected profit'], ['prob', 'Highest win chance'], ['start', 'Starting soonest']] },
      // Scan every sportsbook, including ones you don't use (the old "All" chip).
      { key: 'allBooks', type: 'toggle', label: 'Scan every book, not only mine', default: false, advanced: true },
    ],
    onChange: (v, key) => { if (key === 'sort') syncSort(); st.limit = PAGE; refresh(); },
  });
  $('[data-fb]').append(fb.el);
  const scanBooks = () => (fb.values.allBooks ? api.sportsbooks.map((b) => b.id) : store.get().books);

  // Fair-odds sources live in the Advanced disclosure (it moves into the filter sheet on phones).
  const advBody = fb.el.querySelector('.fb-adv-body');
  const src = document.createElement('div');
  src.className = 'fb-item pev-src';
  src.setAttribute('role', 'group');
  src.setAttribute('aria-label', 'Fair odds source');
  advBody?.append(src);
  function paintRefs() {
    src.innerHTML = `<span>Fair odds source</span><div class="chips">${[...new Set([...SHARP_REFS, ...st.refs])].filter((r) => api.bookById[r]).map((r) => {
      const on = st.refs.includes(r);
      return `<button type="button" class="chip${on ? ' on' : ''}" data-ref="${r}" aria-pressed="${on}">${ui.esc(api.bookById[r].name)}</button>`;
    }).join('')}</div><small>${ui.esc(METHOD_LABEL[store.get().devigMethod] || 'Multiplicative')} devig · change it in the <a href="#/ev-builder">Fair Odds Builder</a></small>`;
  }
  src.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ref]');
    if (!b) return;
    const r = b.dataset.ref;
    if (st.refs.includes(r)) { if (st.refs.length > 1) st.refs = st.refs.filter((x) => x !== r); else { ui.toast('Keep at least one fair-odds source'); return; } } else st.refs.push(r);
    view.set({ refs: st.refs });
    paintRefs(); refresh();
  });
  paintRefs();

  // ---------- table ----------
  const columns = [
    { key: 'ev', label: 'EV', title: ui.termTitle('ev'), sort: (o) => o.edge, trend: (o) => o.edge,
      render: (o) => `<div class="ev-c">${ui.edge(o.edge)}${ui.risk('ev', { short: true })}</div>` },
    { key: 'event', label: 'Event', cls: 'evc', sort: (o) => (o.live ? 0 : o.start || 0), render: (o) => `<div title="${ui.esc(o.event)}">${ui.eventCell(o.eventId)}</div>` },
    { key: 'bet', label: 'Bet', render: (o) => {
      const leg = o.legs[0];
      const stake = kellyStake(o);
      return `<div class="sel-name">${ui.esc(leg.outcome)}</div><div class="sel-sub">${o.label === o.market ? ui.esc(o.market) : `${ui.esc(o.market)} · ${ui.esc(o.label)}`}</div>
        ${stake > 0 ? ui.evLine({ prob: o.meta.fairProb, payout: stake * odds.toDecimal(leg.price), ev: stake * o.edge }) : ''}`;
    } },
    { key: 'book', label: 'Book · price', render: (o) => `<span class="bookprice">${ui.book(o.legs[0].book)} ${ui.price(o.legs[0].price, { best: true })}</span>` },
    // Fair odds and the win probability they imply share one column (one is the other, restated).
    { key: 'prob', label: 'Fair odds', align: 'r', title: ui.termTitle('fair'), sort: (o) => o.meta.fairProb,
      render: (o) => `<div class="fair-c"><span class="num-v">${ui.esc(fairOdds(o.meta.fairProb))}</span><small>${odds.pct(o.meta.fairProb)} win prob</small></div>` },
    { key: 'stake', label: 'Stake · worth', align: 'r', title: `${ui.kellyLabel()} and its expected profit`, sort: (o) => kellyStake(o) * o.edge, trend: (o) => kellyStake(o) * o.edge,
      render: (o) => ui.heroFig(`+${odds.money(kellyStake(o) * o.edge)}`, `on ${odds.money(kellyStake(o), 0)} stake`) },
  ];
  const t = ui.table({
    id: 'pev',
    caption: 'Positive EV bets',
    rowKey: (o) => o.id,
    columns,
    action: (o) => {
      const leg = o.legs[0];
      return ui.actions(ui.betAction({ verb: 'Bet', amount: odds.money(kellyStake(o) || store.get().unit, 0), book: leg.book, title: `Bet at ${api.bookById[leg.book]?.name || leg.book}` }),
        [['calc', 'Calc', { href: `#/calculators?tab=ev&a=${leg.price}&stake=${kellyStake(o) || store.get().unit}` }], ['log', 'Log']]);
    },
    onAction: {
      bet: (o) => ui.toast(`Opening ${api.bookById[o.legs[0].book]?.name || 'book'} bet slip…`),
      log: (o) => logEv(o, kellyStake(o) || store.get().unit),
    },
    onOpen: (o) => openDrawer(o),
    sort: { key: 'ev', dir: 'desc' },
    // Phones: the bet gets a full-width line (no wrapping); the stake · worth figure sits beside the actions.
    mobile: { areas: ['ev event book', 'bet bet bet', 'stake act act'], cols: 'auto minmax(0,1fr) auto' },
    // On phones the fair-odds column sits behind the row's Details toggle (pri 3 = not in the areas above).
    empty: () => {
      const other = counts[st.mode === 'live' ? 'pre' : 'live'];
      const acts = [];
      if (fb.activeCount()) acts.push({ label: 'Reset filters', act: 'reset' });
      // Offer the other mode only when it has results; otherwise point at more books.
      if (other) acts.push({ label: `Switch to ${st.mode === 'live' ? 'Pre-match' : 'Live +EV'} (${other})`, act: 'switch' });
      else acts.push({ label: 'Add books', href: '#/account' });
      acts.push({ label: 'Alert me', href: '#/alerts' });
      const near = api.ev({ live: st.mode === 'live', books: scanBooks(), minEdge: 0, refs: st.refs, method: method() }).slice(0, 3)
        .map((o) => `<div class="near-item">${ui.edge(o.edge)} <b>${ui.esc(o.legs[0].outcome)}</b> ${ui.book(o.legs[0].book)} ${ui.price(o.legs[0].price)} <span class="muted">${ui.esc(o.event)}</span></div>`).join('');
      return ui.empty({ title: 'No +EV bets match right now',
        msg: 'Nothing beats fair odds by your minimum EV at these books. Lower the threshold, scan more books or switch mode.',
        actions: acts, near: near ? `<div class="near-list">${near}</div>` : '', mate: true });
    },
  });
  $('[data-table]').append(t.el);
  const tools = t.el.querySelector('.tbl-tools');
  if (tools) {
    $('[data-fb]').append(tools);
    tools.querySelector('[data-tbl-density]')?.setAttribute('title', 'Comfortable rows');
    tools.querySelector('[data-tbl-cols]')?.setAttribute('title', 'Choose columns');
  }

  // The Sort select and the sortable heads are one setting; paging follows the active sort.
  const SORT_COL = { ev: ['ev', 'desc'], worth: ['stake', 'desc'], prob: ['prob', 'desc'], start: ['event', 'asc'] };
  function syncSort() {
    const [key, dir] = SORT_COL[fb.values.sort] || SORT_COL.ev;
    const cur = t.sortState();
    if (cur?.key !== key || cur?.dir !== dir) t.setSort({ key, dir });
  }
  syncSort();
  t.el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-sort]')) return;
    // A sortable head was clicked: mirror it in the Sort menu and re-page from the new top.
    const s = t.sortState();
    const opt = Object.entries(SORT_COL).find(([, [k, d]]) => s && k === s.key && d === s.dir);
    if (opt && opt[0] !== fb.values.sort) fb.set({ sort: opt[0] }, { silent: true });
    st.limit = PAGE;
    paint();
  });
  function sortedAll() {
    const s = t.sortState();
    const col = s && columns.find((c) => c.key === s.key && c.sort);
    if (!col) return all;
    const m = s.dir === 'asc' ? 1 : -1;
    return all.map((r, i) => [r, col.sort(r), i]).sort((a, b) => (a[1] === b[1] ? a[2] - b[2] : (a[1] - b[1]) * m)).map((x) => x[0]);
  }

  // ---------- facts ----------
  function factsItems(shown) {
    const top = all.reduce((m, o) => (o.edge > (m?.edge ?? -1) ? o : m), null);
    const avg = all.length ? all.reduce((a, o) => a + o.edge, 0) / all.length : 0;
    const staked = shown.reduce((a, o) => a + kellyStake(o), 0);
    const exp = shown.reduce((a, o) => a + kellyStake(o) * o.edge, 0);
    const live = st.mode === 'live';
    return [
      { label: live ? 'Live +EV bets' : '+EV bets found', term: 'ev', value: String(all.length),
        note: live ? `${api.events().filter((e) => e.live).length} games in play · prices refresh every ${Math.round((api.tickMs || 4000) / 1000)}s` : `${new Set(all.map((o) => o.eventId)).size} games` },
      { label: 'Top edge', value: top ? `+${(top.edge * 100).toFixed(2)}%` : '', tone: 'pos', note: top ? ui.esc(top.legs[0].outcome) : '' },
      { label: 'Average edge', value: `+${(avg * 100).toFixed(2)}%`, tone: 'pos', note: ui.esc(sourceNote()) },
      { label: 'Expected profit', value: odds.money(exp, 0), tone: 'pos', note: `on ${odds.money(staked, 0)} Kelly stakes` },
    ];
  }
  function paintFacts(shown) {
    const old = $('.page-head .facts');
    const items = factsItems(shown);
    const sig = items.map((i) => i.label).join('|');
    if (!old || old.dataset.sig !== sig) {
      const tmp = document.createElement('div');
      tmp.innerHTML = ui.facts(items);
      tmp.firstElementChild.dataset.sig = sig;
      if (old) old.replaceWith(tmp.firstElementChild); else $('.page-head').append(tmp.firstElementChild);
    } else {
      old.querySelectorAll('.stat').forEach((s, i) => {
        const strong = s.querySelector('strong');
        const small = s.querySelector('small');
        if (strong && strong.innerHTML !== items[i].value) strong.innerHTML = items[i].value;
        if (small && small.innerHTML !== items[i].note) small.innerHTML = items[i].note;
      });
    }
    $('.page-head .facts').hidden = !all.length; // hidden, never "—" / "$0", when nothing matches
  }

  // ---------- data ----------
  const query = (live) => api.ev({ sport: fb.values.sport, market: fb.values.market, live, books: scanBooks(),
    minEdge: (+fb.values.minEv || 0) / 100, refs: st.refs, method: method() });
  function paint() {
    const sorted = sortedAll();
    const { rows: unlocked, card } = ui.lockRows(sorted, 'positive-ev', { n: 3, noun: '+EV bets' });
    const shown = unlocked.slice(0, st.limit);
    t.update(shown);
    const rest = unlocked.length - shown.length;
    const more = rest > 0 ? `<button type="button" class="btn outline" data-act="more">Show ${Math.min(PAGE, rest)} more of ${rest}</button>` : '';
    const mEl = $('[data-more]');
    if (mEl.innerHTML !== more) mEl.innerHTML = more;
    const lock = $('[data-lock]');
    if (lock.innerHTML !== card) lock.innerHTML = card;
    paintFacts(shown);
  }
  function refresh() {
    all = query(st.mode === 'live');
    counts[st.mode] = all.length;
    counts[st.mode === 'live' ? 'pre' : 'live'] = query(st.mode !== 'live').length;
    ui.setModeCount(root, 'pre', counts.pre);
    ui.setModeCount(root, 'live', counts.live);
    paint();
    lastUpdate = Date.now();
    ui.setLiveStatus(root, { updated: lastUpdate });
  }

  function logEv(o, stake) {
    const leg = o.legs[0];
    ui.logBet({ kind: 'ev', book: leg.book, sport: o.sport, market: o.market, selection: `${leg.outcome}${o.market === 'Player Prop' ? ` · ${o.label}` : ''}`, price: leg.price, stake, event: o.event });
  }

  // ---------- detail drawer ----------
  function history(seedKey, price, n = 28) {
    const r = rng(hash(seedKey));
    const end = odds.impliedProb(price);
    const out = [];
    let p = end + (r() - 0.45) * 0.05;
    for (let i = 0; i < n; i++) {
      const tt = i / (n - 1);
      p += (r() - 0.5) * 0.012;
      out.push(p * (1 - tt) + end * tt);
    }
    out[n - 1] = end;
    return out.map((x) => odds.probToAmerican(Math.min(0.97, Math.max(0.03, x))));
  }

  function openDrawer(o0) {
    let o = o0;
    const leg0 = o.legs[0];
    if (!api.lineById(o.lineId)) return;
    const bookN = api.bookById[leg0.book]?.name || leg0.book;
    const short = api.bookById[leg0.book]?.short || leg0.book;
    let mult = store.get().kellyMult;
    const stakeAt = (m = mult) => Math.round(store.get().bankroll * odds.kelly(o.meta.fairProb, o.legs[0].price, m));

    // Everything that depends on the live prices (re-rendered by the stale-price guard).
    const analysis = () => {
      const line = api.lineById(o.lineId);
      const leg = o.legs[0];
      const idx = line.outcomes.indexOf(leg.outcome);
      const m = method();
      const fp = o.meta.fairProb;
      const s = store.get();
      const bookIds = Object.keys(line.prices);
      const sbBest = Math.max(...bookIds.filter((b) => api.bookById[b].type === 'sportsbook').map((b) => line.prices[b][idx]));
      const priceRows = bookIds.map((b) => ({ b, p: line.prices[b][idx], other: line.prices[b].filter((_, i) => i !== idx) })).sort((a, b) => b.p - a.p);
      const refRows = SHARP_REFS.filter((r) => line.prices[r]).map((r) => {
        const imp = line.prices[r].map(odds.impliedProb);
        return { r, prices: line.prices[r], over: imp.reduce((a, b) => a + b, 0) - 1, fair: m(imp)[idx], used: st.refs.includes(r) };
      });
      const methodRows = Object.entries(methods).map(([k, fn]) => {
        const f = api.fairProbs(line, st.refs, fn)[idx];
        return { k, f, e: odds.ev(f, leg.price), on: (s.devigMethod || 'multiplicative') === k };
      });
      const hist = history(`${line.id}|${leg.book}|${idx}`, leg.price);
      const typeTag = (b) => { const ty = api.bookById[b].type; return ty === 'sharp' ? ui.tag('Sharp', 'dark') : ty === 'exchange' ? ui.tag('Exchange', 'dark') : ''; };
      const fmt = (am) => ui.esc(ui.fmtOdds(am));
      return {
        top: `<div><div class="pd-bet">${ui.esc(leg.outcome)} ${ui.price(leg.price, { best: true })}</div>
            <div class="pd-meta">${ui.esc(o.label)} · ${ui.edge(o.edge, { label: 'EV' })}</div></div>
          <dl class="kv"><dt>${ui.term('fair', 'Fair odds')}</dt><dd>${fmt(odds.probToAmerican(fp))} (${odds.pct(fp)})</dd>
            <dt>Book</dt><dd>${ui.esc(bookN)}</dd><dt>${ui.term('ev', 'Expected value')} per $100</dt><dd>${odds.money(o.edge * 100)}</dd></dl>`,
        hist: `${ui.spark(hist.map((a) => -odds.impliedProb(a)), { w: 480, h: 70, color: 'var(--accent)' })}
          <div class="hist-meta"><span>Open ${fmt(hist[0])}</span><span>12h</span><span>Now ${fmt(leg.price)}</span></div>`,
        prices: `<table class="t"><thead><tr><th>Book</th><th class="num-cell">${ui.esc(leg.outcome)}</th><th class="num-cell">Other side</th><th class="num-cell">EV</th></tr></thead>
          <tbody>${priceRows.map(({ b, p, other }) => { const best = api.bookById[b].type === 'sportsbook' && p === sbBest; return `<tr class="${best ? 'hl' : ''}">
            <td>${ui.book(b)} ${typeTag(b)}${best ? ' <span class="sr-only">(best price)</span>' : ''}</td><td class="num-cell">${ui.price(p, { best })}</td>
            <td class="num-cell muted">${other.map(fmt).join(' / ')}</td><td class="num-cell">${ui.edge(odds.ev(fp, p))}</td></tr>`; }).join('')}</tbody></table>`,
        refs: `<table class="t"><thead><tr><th>Source</th><th class="num-cell">Prices</th><th class="num-cell">${ui.esc('Vig')}</th><th class="num-cell">Fair</th></tr></thead>
          <tbody>${refRows.map((x) => `<tr><td>${ui.book(x.r, { full: true })} ${x.used ? ui.tag('In blend', 'pos') : ''}</td>
            <td class="num-cell">${x.prices.map(fmt).join(' / ')}</td><td class="num-cell">${odds.pct(x.over)}</td>
            <td class="num-cell"><strong>${fmt(odds.probToAmerican(x.fair))}</strong></td></tr>`).join('')}
            <tr class="hl"><td><strong>Blended fair</strong></td><td></td><td></td><td class="num-cell"><strong>${fmt(odds.probToAmerican(fp))}</strong></td></tr></tbody></table>`,
        devig: `<table class="t"><thead><tr><th>Method</th><th class="num-cell">Fair prob</th><th class="num-cell">Fair odds</th><th class="num-cell">EV</th></tr></thead>
          <tbody>${methodRows.map((x) => `<tr class="${x.on ? 'hl' : ''}"><td>${METHOD_LABEL[x.k]} ${x.on ? ui.tag('Active', 'pos') : ''}</td>
            <td class="num-cell">${odds.pct(x.f, 2)}</td><td class="num-cell">${fmt(odds.probToAmerican(x.f))}</td><td class="num-cell">${ui.edge(x.e)}</td></tr>`).join('')}</tbody></table>`,
        fullKelly: `${odds.pct(odds.kelly(fp, leg.price, 1), 2)} of bankroll`,
      };
    };

    const a = analysis();
    const html = `<div class="pev-d">
      <div class="pd-top" data-pd="top">${a.top}</div>
      <section><h3>Kelly sizing</h3>
        <div class="kelly-row"><span class="muted">${ui.term('kelly_fraction', 'Kelly multiplier')}</span><strong data-pd="mult"></strong></div>
        <input type="range" min="0.05" max="1" step="0.05" value="${mult}" data-pd="range" aria-label="Kelly multiplier">
        <dl class="kv"><dt>Full Kelly</dt><dd data-pd="full">${a.fullKelly}</dd>
          <dt>Recommended stake <span class="muted" data-pd="klabel"></span></dt><dd data-pd="stake"></dd><dt>Expected profit</dt><dd data-pd="exp" class="pos"></dd>
          <dt>${ui.term('bankroll', 'Bankroll')}</dt><dd>${odds.money(store.get().bankroll, 0)}</dd></dl>
        <div data-pd="evline"></div>
        <p class="note">This bet can lose. The edge is an average over many bets like it, not a promise on this one.</p></section>
      <section><h3>Line history · ${ui.esc(short)}</h3><div data-pd="hist">${a.hist}</div></section>
      <section><h3>Price at every book</h3><div class="tbl-x" data-pd="prices">${a.prices}</div></section>
      <section><h3>Fair odds by sharp reference</h3><div class="tbl-x" data-pd="refs">${a.refs}</div></section>
      <section><h3>Devig breakdown</h3><div class="tbl-x" data-pd="devig">${a.devig}</div>
        <p class="note">Change your method and reference weights in the <a href="#/ev-builder">Fair Odds Builder</a>.</p></section>
      <div class="pd-links">${ui.calcLink({ tab: 'ev', a: leg0.price, stake: stakeAt() || store.get().unit })}
        ${ui.related([['sharp-money', 'Sharp Money'], ['ev-builder', 'Fair Odds Builder'], ['tracker', 'Bet Tracker']])}</div>
    </div>`;
    const body = ui.drawer(`${leg0.outcome} · ${bookN}`, html, { wide: true, risk: 'ev', kicker: ui.esc(`${o.event} · ${o.label}`), footer: ' ' });
    const q = (k) => body.querySelector(`[data-pd="${k}"]`);

    // Kelly numbers + the footer's Bet / Log follow the slider.
    const upd = () => {
      const stake = stakeAt();
      q('mult').textContent = `${mult.toFixed(2)}×`;
      q('klabel').textContent = ui.kellyLabel(mult).replace(/^Suggested stake\s*/, ''); // "(¼ Kelly)"
      q('stake').textContent = odds.money(stake, 0);
      q('exp').textContent = odds.money(stake * o.edge, 2);
      q('evline').innerHTML = stake > 0 ? ui.evLine({ prob: o.meta.fairProb, payout: stake * odds.toDecimal(o.legs[0].price), ev: stake * o.edge }) : '';
      const foot = `${ui.betAction({ verb: 'Bet at', amount: `${ui.esc(short)} · ${odds.money(stake || store.get().unit, 0)}`, book: o.legs[0].book, size: '', autofocus: true })}${ui.ghost('log', 'Log bet')}${ui.ghost('alert', 'Alert', { href: '#/alerts' })}`;
      if (body.footer._h !== foot) {
        const hadFocus = body.footer.contains(document.activeElement);
        body.setFooter(foot);
        body.footer._h = foot;
        if (hadFocus) body.footer.querySelector('.btn.primary')?.focus({ preventScroll: true });
      }
      return stake;
    };
    upd();
    q('range').addEventListener('input', (e) => { mult = parseFloat(e.target.value); upd(); });
    ui.onAction(body.panel, {
      bet: () => ui.toast(`Opening ${bookN} bet slip…`),
      log: () => logEv(o, upd() || store.get().unit),
    });

    // Stale-price guard: re-read this bet by id every tick.
    ui.liveGuard(body, {
      read: () => api.ev({ live: o.live, books: scanBooks(), minEdge: -1, refs: st.refs, method: method() }).find((x) => x.id === o.id && x.edge > 0) || null,
      sig: (x) => `${x.legs[0].price}|${x.edge.toFixed(4)}`,
      goneMsg: 'This bet is no longer +EV at this price. Nothing was placed.',
      onUpdate: (next, prev) => {
        const was = prev?.legs[0].price;
        o = next;
        const b = analysis();
        for (const k of ['top', 'hist', 'prices', 'refs', 'devig']) q(k).innerHTML = b[k];
        q('full').textContent = b.fullKelly;
        upd();
        return `${was !== undefined && was !== next.legs[0].price ? `Price moved ${ui.fmtOdds(was)} → ${ui.fmtOdds(next.legs[0].price)}: ` : 'Fair odds moved: '}EV now ${next.edge >= 0 ? '+' : ''}${(next.edge * 100).toFixed(2)}%, stake ${odds.money(stakeAt(), 0)}`;
      },
    });
  }

  // ---------- wiring ----------
  ui.onMode(root, (m) => {
    st.mode = m; st.limit = PAGE;
    const sub = $('[data-pev-sub]'); if (sub) sub.textContent = subtitle(m);
    refresh();
  }, { def: 'pre' });
  ui.onAction(wrap, {
    reset: () => fb.reset(),
    switch: () => root.querySelector(`[data-seg="mode"] button[data-v="${st.mode === 'live' ? 'pre' : 'live'}"]`)?.click(),
    more: () => { st.limit += PAGE; paint(); },
  });

  refresh();
  // Deep link from the Daily Card: #/positive-ev?id=<bet id> opens that bet's drawer (switching mode if needed).
  ui.deepLink(root, params.id, {
    noun: '+EV bet',
    gone: 'That bet is no longer +EV at its price. Here are the ones open now.',
    find: (id) => [false, true].map((live) => api.ev({ live, books: scanBooks(), minEdge: -1, refs: st.refs, method: method() })
      .find((x) => x.id === id && x.edge > 0)).find(Boolean) || null,
    open: (o) => {
      const want = o.live ? 'live' : 'pre';
      if (st.mode !== want) root.querySelector(`[data-seg="mode"] button[data-v="${want}"]`)?.click();
      openDrawer(o);
    },
  });
  const offTick = api.onTick(() => refresh());
  const offStore = store.subscribe(() => { paintRefs(); refresh(); });
  return () => { offTick(); offStore(); fb.destroy?.(); t.destroy(); ui.closeDrawer({ restore: false }); };
}
