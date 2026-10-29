// Arbitrage finder (C1, the reference migration): pre-match and live arbs across the person's books.
//
// Layout, results first: page head (static H1, one-line subtitle, live status, Pre-match / Live switch
// with counts) → facts strip → filter bar (Sport · Market · Min ROI · Total stake · Books · Sort) →
// one keyed ui.table whose legs are slip lines (book · price · side · stake) with ONE primary per row
// ("Bet both $1,000") plus Calc · Log. The row opens the arb slip: an accessible drawer / bottom sheet
// with the exact-stake calculator, one Bet button per leg (one deep link per gesture), the persistent
// "Leg 1 opened ✓ → now leg 2" banner (ui.legFlow), logging only on confirm and a stale-price guard.
//
// The older full-screen calculator (openArbCalc) lives in ../slips.js and is re-exported here for
// older imports (calculators.js); `openArbSlip` below is the two-step slip and is exported for reuse.

import { money, pct, toDecimal, fmtAmerican, arbStakes } from '../lib/odds.js';

export { openArbCalc, ensureCalcCss } from '../slips.js';

const CSS = `
.bf-arb .ph-title h1 { margin-right: 4px; }
/* Wide screens: the facts strip sits beside the title (a scoreboard), so results start higher. */
@media (min-width: 1200px) {
  .bf-arb .page-head.ph { padding-bottom: 12px; border-bottom: 2px solid var(--line); }
  .bf-arb .page-head.ph > .facts { grid-column: 2; grid-row: 1; align-self: center; margin: 0; padding: 0; border: 0; }
  .bf-arb .page-head.ph > .facts .stat small { display: block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
/* Compact rows: event, market and leg sides each stay on one line (full text in the title / slip); the leg's
   line (-4 / +1.5) always shows next to the side's name. */
.bf-arb .evc .evt-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 178px; }
.bf-arb .mkt b, .bf-arb .mkt small { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 112px; }
.bf-arb .ui-t .sl-side { max-width: 124px; }
.bf-arb .ui-t td[data-col="profit"] .hero-fig b { font-size: var(--t-xl); }
.bf-arb .roi-c { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.bf-arb .roi-c .edge { font-size: 14px; }
.bf-arb .mkt b { font-weight: 700; }
.bf-arb .mkt small { color: var(--muted); font-size: var(--t-xs); }
.bf-arb .seen { color: var(--muted); font-size: var(--t-sm); font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.bf-arb .seen.old { color: var(--warn); }
.bf-arb .seen.old::before { content: "◷ "; }
.bf-arb .ui-t td[data-col="legs"] { min-width: 280px; }
/* When the table must scroll sideways (narrow laptops) its head sticks to the scroller, not under the top bar. */
.bf-arb .tbl.scrolls .ui-t th { top: 0; }
.bf-arb .lock-slot:empty { display: none; }
.bf-arb .page-head .facts[hidden] { display: none; }
.bf-arb .near-item .slip-lines { max-width: 560px; }
.bf-arb .lock-slot { margin-top: 12px; }
.bf-arb .near-list { display: grid; gap: 10px; }
.bf-arb .near-item { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; align-items: start; padding: 10px 0; border-top: 1px solid var(--line); }
.bf-arb .near-item .evt-name { font-weight: 700; }
.bf-arb .how-sec { margin-top: 28px; }
/* Table tools (density, Columns) sit on the filter bar's row on desktop: one less row above the results. */
.bf-arb .fb-host { display: flex; align-items: flex-end; gap: 10px 14px; flex-wrap: wrap; }
.bf-arb .fb-host > .mode-switch { align-self: flex-end; }
.bf-arb .fb-host > .toolbar.fb { flex: 1 1 auto; margin-bottom: 0; }
.bf-arb .fb-host > .tbl-tools { padding: 0 0 2px; margin-left: auto; flex-wrap: nowrap; }
/* Between 861 and 1599px the table tools are icon buttons (names stay for screen readers + tooltips). */
@media (min-width: 861px) and (max-width: 1599px) {
  .bf-arb .fb-host > .tbl-tools .btn > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
.bf-arb .tbl { margin-top: 10px; }
@media (max-width: 860px) {
  .bf-arb .ui-t td[data-col="legs"] { min-width: 0; }
  .bf-arb .ui-t td[data-col="roi"] .risk { display: none; }
  .bf-arb .ui-t td[data-col="event"] .evt-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bf-arb .ui-t td[data-col="profit"] { align-self: center; }
  .bf-arb .fb-host > .tbl-tools { display: none; }
  .bf-arb .fb-host { align-items: center; gap: 8px; }
  .bf-arb .fb-host > .mode-switch { flex: 1 1 100%; }
  .bf-arb .fb-host > .mode-switch button { flex: 1; }
}

/* ---------- arb slip (drawer / bottom sheet) ---------- */
.arbslip { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.arbslip .as-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 2px solid var(--line); }
.arbslip .as-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: var(--t-sm); color: var(--muted); font-weight: 600; }
.arbslip .as-top .hero-fig { align-items: flex-end; }
.arbslip .as-legs { width: 100%; border-collapse: collapse; font-size: var(--t-cell); }
.arbslip .as-legs th { text-align: left; font-size: var(--t-xs); font-weight: 800; color: var(--muted); padding: 0 6px 6px; border-bottom: 1px solid var(--line); }
.arbslip .as-legs th.r, .arbslip .as-legs td.r { text-align: right; font-variant-numeric: tabular-nums; }
.arbslip .as-legs td { padding: 10px 6px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.arbslip .as-legs .oc { font-weight: 700; }
.arbslip .as-legs .oc-b { margin-top: 4px; }
.arbslip .as-legs input { width: 92px; font-variant-numeric: tabular-nums; }
.arbslip .as-legs input.anch { border-color: var(--g); box-shadow: 0 0 0 2px var(--g); }
.arbslip .as-legs td.lg-act { text-align: right; white-space: nowrap; }
.arbslip .as-legs tr.opened td { background: var(--hl); }
.arbslip .ctl { display: flex; align-items: flex-end; gap: 10px 14px; flex-wrap: wrap; }
.arbslip .anchor-note { margin: 0; font-size: var(--t-sm); color: var(--muted); }
.arbslip .as-sum { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 2px solid var(--line); border-bottom: 2px solid var(--line); }
.arbslip .as-sum > div { padding: 10px 12px 10px 0; }
.arbslip .as-sum > div + div { padding-left: 12px; border-left: 1px solid var(--line); }
.arbslip .as-sum span { display: block; font-size: var(--t-xs); font-weight: 700; color: var(--muted); }
.arbslip .as-sum strong { display: block; margin-top: 4px; font: 900 var(--t-xl)/1 var(--f-head); font-variant-numeric: tabular-nums; }
.arbslip .as-sum strong.pos { color: var(--pos); }
.arbslip .as-sum strong.neg { color: var(--neg); }
.arbslip h3 { font-size: var(--t-md); margin: 0 0 8px; }
.arbslip .sc { width: 100%; border-collapse: collapse; font-size: var(--t-sm); }
.arbslip .sc th { font-size: var(--t-xs); font-weight: 800; color: var(--muted); text-align: right; padding: 0 6px 6px; border-bottom: 1px solid var(--line); }
.arbslip .sc td { padding: 8px 6px; border-bottom: 1px solid var(--line); text-align: right; font-variant-numeric: tabular-nums; }
.arbslip .sc th:first-child, .arbslip .sc td:first-child { text-align: left; }
.arbslip .sc td.pos { color: var(--pos); font-weight: 800; }
.arbslip .sc td.neg { color: var(--neg); font-weight: 800; }
.arbslip .as-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
@media (max-width: 520px) {
  .arbslip .as-legs thead { display: none; }
  .arbslip .as-legs tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; padding: 10px 0; border-bottom: 1px solid var(--line); }
  .arbslip .as-legs td { border: 0; padding: 0; }
  .arbslip .as-legs td[data-label]::before { content: attr(data-label); display: block; color: var(--muted); font-size: var(--t-xs); font-weight: 700; }
  .arbslip .as-legs td.lg-act { grid-column: 1 / -1; text-align: left; }
  .arbslip .as-legs td.lg-act .btn { width: 100%; }
  .arbslip .as-sum strong { font-size: var(--t-lg); }
  .arbslip .as-top .hero-fig { align-items: flex-start; }
  /* Phones: the step button gets the whole first row of the sheet footer; Log and Alert sit under it. */
  .drawer:has(.arbslip) .drawer-foot .btn.primary { flex-basis: 100%; }
}`;
function ensureCss() {
  if (!document.getElementById('css-arbitrage')) document.head.insertAdjacentHTML('beforeend', `<style id="css-arbitrage">${CSS}</style>`);
}

// ------------------------------------------------------------------------------------------------
// "Seen" ages. Opportunity ids are stable across ticks (lib/opportunities.js), so we remember when each
// arb was first seen. The first load of each mode is back-dated a little so the sample looks realistic.
// ------------------------------------------------------------------------------------------------
const seen = new Map();
const readyModes = new Set();
function seenAt(o) {
  if (!seen.has(o.id)) {
    let h = 0;
    for (const c of o.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const back = o.live ? 4e3 + (h % 80) * 1e3 : 60e3 + (h % 50) * 60e3;
    seen.set(o.id, Date.now() - (readyModes.has(!!o.live) ? 0 : back));
  }
  return seen.get(o.id);
}
/** Past this age a price should be re-checked before betting: the Age cell turns amber. */
const OLD_MS = { live: 30e3, pre: 45 * 60e3 };

const bothWord = (n) => (n === 2 ? 'both' : `all ${n}`);
const bookShort = (api, id) => api.bookById[id]?.short || id;
const bookName = (api, id) => api.bookById[id]?.name || id;

export default function render(root, ctx) {
  ensureCss();
  const { api, store, ui, params } = ctx;
  const st = { mode: ui.initialMode(params, 'pre', ['pre', 'live']) };
  const counts = { pre: 0, live: 0 }; // arbs per mode (mode switch badges, empty-state "Switch to …")
  const stake = () => Math.max(1, +fb.values.stake || store.get().arbStake || 1000);
  const profitOf = (o) => arbStakes(o.legs.map((l) => l.price), stake()).profit;
  const stakesOf = (o) => arbStakes(o.legs.map((l) => l.price), stake()).stakes;
  const legsOf = (o) => { const s = stakesOf(o); return o.legs.map((l, i) => ({ book: l.book, price: l.price, side: l.outcome, stake: s[i] })); };
  const legal = (o) => o.legs.every((l) => ui.bookLegal(l.book));
  const illegalTitle = (o) => { const b = o.legs.find((l) => !ui.bookLegal(l.book)); return b ? ui.illegalNote(b.book) : ''; };

  root.innerHTML = `<div class="bf-arb">
    ${ui.pageHead({
      title: 'Arbitrage', tool: 'arbitrage', live: true,
      subtitle: 'Bet both sides of one market at two books. Whichever side wins, you keep the difference, as long as both legs fill at these prices.',
      facts: [{ label: 'Pre-match arbs', value: '—' }],
    })}
    <section class="results" aria-labelledby="arb-results-h"><h2 id="arb-results-h" class="sr-only">Arbitrage opportunities</h2>
      <div class="fb-host" data-fb>${ui.modeSwitch([['pre', 'Pre-match', '·'], ['live', 'Live', '·']], st.mode)}</div>
      <div data-table></div>
      <div class="lock-slot" data-lock></div>
    </section>
    <div data-how></div>
  </div>`;
  const wrap = root.querySelector('.bf-arb');
  const q = (s) => root.querySelector(s);

  // ---------- filter bar (order is fixed by role: Sport → Market → Min ROI / Total stake → Books → Sort) ----------
  const fb = ui.filterBar({
    id: 'arb',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'], query: true },
      { key: 'minRoi', type: 'number', label: 'Min ROI %', default: 0, step: 0.25, chip: (v) => `ROI ≥ ${v}%` },
      // Total stake sizes every row; it is the shared arb stake (top-bar sizing popover), not a filter.
      { key: 'stake', type: 'number', label: 'Total stake', prefix: '$', default: store.get().arbStake || 1000, step: 50, min: 1, count: false },
      { key: 'books', type: 'books', label: 'Books' },
      { key: 'sort', type: 'sort', label: 'Sort', default: 'roi', options: [['roi', 'Best ROI'], ['profit', 'Most profit'], ['age', 'Newest'], ['start', 'Starting soonest']] },
    ],
    onChange: (v, key) => {
      if (key === 'stake') { if (+v.stake > 0 && +v.stake !== store.get().arbStake) store.set({ arbStake: +v.stake }); return; }
      if (key === 'sort') syncSort();
      refresh();
    },
  });
  fb.set({ stake: store.get().arbStake || 1000 }, { silent: true }); // the shared stake wins over a remembered one
  q('[data-fb]').append(fb.el);

  // ---------- results table ----------
  const nearest = () => {
    // Closest arbs the filters hide: same mode first, then the other one.
    const books = store.get().books;
    const same = api.arbs({ books, live: st.mode === 'live' });
    const pool = same.length ? same : api.arbs({ books, live: st.mode !== 'live' });
    return pool.slice(0, 3).map((o) => `<div class="near-item">${ui.edge(o.edge)}<div><div class="evt-name">${ui.esc(o.event)}</div>${ui.slipLegs(legsOf(o))}</div></div>`).join('');
  };
  const t = ui.table({
    id: 'arbs',
    caption: 'Arbitrage opportunities',
    rowKey: (o) => o.id,
    columns: [
      { key: 'roi', label: 'ROI', title: ui.termTitle('roi'), sort: (o) => o.edge, trend: (o) => o.edge,
        render: (o) => `<div class="roi-c">${ui.edge(o.edge)}${ui.risk('arb', { short: true })}</div>` },
      // Event sorts by start time ("Starting soonest" in the Sort menu).
      { key: 'event', label: 'Event', sort: (o) => (o.live ? 0 : o.start || 0), cls: 'evc', render: (o) => `<div title="${ui.esc(o.event)}">${ui.eventCell(o.eventId)}</div>` },
      { key: 'market', label: 'Market', render: (o) => `<div class="mkt" title="${ui.esc(o.label)} · ${ui.esc(o.market)}"><b>${ui.esc(o.label)}</b><small>${ui.esc(o.market)}</small></div>` },
      { key: 'legs', label: 'Legs · stake per book', title: 'Each leg: book · price · side · stake to bet there', render: (o) => ui.slipLegs(legsOf(o)) },
      { key: 'profit', label: 'Profit', align: 'r', sort: profitOf, trend: profitOf, title: 'Profit if both legs fill at these prices',
        render: (o) => ui.heroFig(`+${money(profitOf(o))}`, `if ${bothWord(o.legs.length)} fill`) },
      { key: 'age', label: 'Age', align: 'r', sort: (o) => seenAt(o), title: 'How long ago we first saw this arb at these books',
        render: (o) => { const ms = Date.now() - seenAt(o); const old = ms > OLD_MS[o.live ? 'live' : 'pre'];
          return `<span class="seen${old ? ' old' : ''}"${old ? ' title="Seen a while ago: check both prices before you bet"' : ''}>seen ${ui.age(seenAt(o))}</span>`; } },
    ],
    action: (o) => ui.actions(
      ui.betAction({ verb: `Bet ${bothWord(o.legs.length)}`, amount: money(stake(), 0), disabled: !legal(o), title: illegalTitle(o) }),
      [['calc', 'Calc'], ['log', 'Log']]),
    onAction: {
      bet: (o) => openArbSlip(o, ctx, { total: stake(), focus: 'leg' }),
      calc: (o) => openArbSlip(o, ctx, { total: stake(), focus: 'stake' }),
      log: (o) => logArb(o, legsOf(o), ctx),
    },
    onOpen: (o) => openArbSlip(o, ctx, { total: stake(), focus: 'leg' }),
    sort: { key: 'roi', dir: 'desc' },
    mobile: { areas: ['roi event age', 'legs legs profit', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => {
      const other = counts[st.mode === 'live' ? 'pre' : 'live'];
      const acts = [];
      if (fb.activeCount()) acts.push({ label: 'Reset filters', act: 'reset' });
      // Offer the other mode only when it has results; otherwise point at more books.
      if (other) acts.push({ label: `Switch to ${st.mode === 'live' ? 'Pre-match' : 'Live'} (${other})`, act: 'switch' });
      else acts.push({ label: 'Add books', href: '#/account' });
      acts.push({ label: 'Alert me', href: '#/alerts' });
      return ui.empty({
        title: 'No arbs match right now',
        msg: fb.activeCount() ? 'Your filters hide every current arb. Loosen them, switch mode, or get an alert when one appears.'
          : 'Arbs come and go in seconds. Switch mode, add books, or get an alert when one appears.',
        actions: acts, near: nearest(), mate: true,
      });
    },
  });
  q('[data-table]').append(t.el);
  // Desktop: the table's Comfortable / Columns tools share the filter bar's row.
  const tools = t.el.querySelector('.tbl-tools');
  if (tools) {
    q('[data-fb]').append(tools);
    tools.querySelector('[data-tbl-density]')?.setAttribute('title', 'Comfortable rows');
    tools.querySelector('[data-tbl-cols]')?.setAttribute('title', 'Choose columns');
  }

  // The Sort select and the sortable heads are one setting.
  const SORT_COL = { roi: ['roi', 'desc'], profit: ['profit', 'desc'], age: ['age', 'desc'], start: ['event', 'asc'] };
  function syncSort() {
    const [key, dir] = SORT_COL[fb.values.sort] || SORT_COL.roi;
    const cur = t.sortState();
    if (cur?.key !== key || cur?.dir !== dir) t.setSort({ key, dir });
  }
  syncSort();

  // ---------- facts strip (labels static per mode; values patched in place each tick) ----------
  function factsItems(rows) {
    const n = rows.length;
    const best = rows.reduce((m, o) => (o.edge > (m?.edge ?? -1) ? o : m), null);
    const total = rows.reduce((a, o) => a + profitOf(o), 0);
    const avg = n ? rows.reduce((a, o) => a + o.edge, 0) / n : 0;
    return [
      { label: st.mode === 'live' ? 'Live arbs now' : 'Pre-match arbs', value: String(n), note: `across ${store.get().books.length} of your books` },
      { label: 'Best ROI', term: 'roi', value: best ? `+${pct(best.edge, 2)}` : '', tone: 'pos', note: best ? ui.esc(best.event) : '' },
      { label: `Profit available at ${money(stake(), 0)}`, value: money(total), tone: 'pos', note: 'if you hit every arb' },
      { label: 'Avg ROI', value: `+${pct(avg, 2)}`, note: st.mode === 'live' ? 'live markets' : 'pre-match markets' },
    ];
  }
  function paintFacts(rows) {
    const old = q('.page-head .facts');
    const items = factsItems(rows);
    const sig = items.map((i) => i.label).join('|');
    if (!old || old.dataset.sig !== sig) {
      const tmp = document.createElement('div');
      tmp.innerHTML = ui.facts(items);
      const el = tmp.firstElementChild;
      el.dataset.sig = sig;
      if (old) old.replaceWith(el); else q('.page-head').append(el);
    } else {
      // Same labels: patch only the live figures (nodata), so the editor's text keys never churn.
      old.querySelectorAll('.stat').forEach((s, i) => {
        const strong = s.querySelector('strong');
        const small = s.querySelector('small');
        if (strong && strong.innerHTML !== items[i].value) strong.innerHTML = items[i].value;
        if (small && small.innerHTML !== items[i].note) small.innerHTML = items[i].note;
      });
    }
    // An empty scanner hides its figures instead of showing "—" / "$0.00".
    q('.page-head .facts').hidden = !rows.length;
  }

  // ---------- data ----------
  const load = (live = st.mode === 'live') => {
    const f = fb.values;
    return api.arbs({ books: store.get().books, live, sport: f.sport, market: f.market })
      .filter((o) => o.edge * 100 >= (+f.minRoi || 0));
  };
  function refresh() {
    const rows = load();
    rows.forEach(seenAt);
    readyModes.add(st.mode === 'live');
    counts[st.mode] = rows.length;
    counts[st.mode === 'live' ? 'pre' : 'live'] = load(st.mode !== 'live').length;
    ui.setModeCount(root, 'pre', counts.pre);
    ui.setModeCount(root, 'live', counts.live);
    const { rows: shown, card } = ui.lockRows(rows, 'arbitrage', { n: 3, noun: 'arbs' });
    t.update(shown);
    const lock = q('[data-lock]');
    if (lock.innerHTML !== card) lock.innerHTML = card;
    paintFacts(rows);
    ui.setLiveStatus(root, { updated: Date.now() });
  }

  // ---------- "How this makes money" (collapsed; after the results) ----------
  function paintHow() {
    const o = load()[0];
    let example = '';
    if (o) {
      const legs = legsOf(o);
      example = ui.slip({
        caption: `Worked example at ${money(stake(), 0)}`, tag: 'Hedged',
        legs: legs.map((l) => ({ title: ui.esc(l.side), sub: ui.esc(bookName(api, l.book)), odds: ui.esc(ui.fmtOdds(l.price)), stake: money(l.stake) })),
        result: `+${money(profitOf(o))} if both fill`,
        math: `${legs.map((l) => `${money(l.stake)} × ${toDecimal(l.price).toFixed(2)}`).join(' or ')} pays about ${money(legs[0].stake * toDecimal(legs[0].price))} back either way.`,
      });
    }
    q('[data-how]').innerHTML = ui.how({
      summary: 'Two books disagree on a price; betting both sides at the right stakes pays the same whichever side wins.',
      checks: [
        'We scan every book you use for prices that disagree, and refresh them every few seconds.',
        'Stakes are sized so either side pays the same, and the difference is your profit.',
        `Place both legs quickly: prices move. Live arbs are often 2 to 3x bigger because books adjust odds in real time.`,
        `It only works if both legs fill at these prices. Voids, ${ui.term('limit', 'limits')} and price moves can change the result.`,
      ],
      example,
    });
  }

  // ---------- wiring ----------
  ui.onMode(root, (m) => { st.mode = m; refresh(); }, { def: 'pre' });
  ui.onAction(wrap, {
    reset: () => fb.reset(),
    switch: () => root.querySelector(`[data-seg="mode"] button[data-v="${st.mode === 'live' ? 'pre' : 'live'}"]`)?.click(),
  });

  refresh();
  paintHow();
  // Deep link from the Daily Card: #/arbitrage?id=<arb id> opens that arb's slip (switching mode if needed).
  ui.deepLink(root, params.id, {
    noun: 'arb',
    gone: 'That arb is gone: a price moved. Here are the ones open now.',
    find: (id) => [false, true].map((live) => api.arbs({ books: store.get().books, live }).find((o) => o.id === id)).find(Boolean) || null,
    open: (o) => {
      const want = o.live ? 'live' : 'pre';
      if (st.mode !== want) root.querySelector(`[data-seg="mode"] button[data-v="${want}"]`)?.click();
      openArbSlip(o, ctx, { total: stake(), focus: 'leg' });
    },
  });
  const offTick = api.onTick(() => refresh());
  const offStore = store.subscribe((s) => {
    if (s.arbStake && +s.arbStake !== +fb.values.stake) fb.set({ stake: s.arbStake }, { silent: true });
    refresh();
  });
  return () => { offTick(); offStore(); fb.destroy?.(); t.destroy(); ui.closeDrawer({ restore: false }); };
}

// ================================================================================================
// Arb slip: exact stakes per book, one Bet button per leg (one deep link per gesture), the persistent
// leg banner, logging only on confirm, cash needed per book, payout by outcome and a stale-price guard.
// Works for any N-leg arb or low hold in the shared opportunity shape.
// ================================================================================================

/** Log every leg as one linked, exclusive group (only one side can win). */
function logArb(o, legs, { api, ui }, kind = 'arb') {
  api.tracker.addGroup(legs.map((l) => ({ kind, book: l.book, sport: o.sport, market: o.market, selection: l.side, price: l.price,
    stake: Math.round(l.stake * 100) / 100, event: o.event })), { exclusive: true });
  ui.toast(`Logged ${legs.length} linked bets to your Bet Tracker`);
}

/**
 * openArbSlip(opp, ctx, { total, focus: 'leg' | 'stake', kind: 'arb' | 'lowhold' })
 * The two-step "Bet both" slip. `focus: 'leg'` puts focus on the leg-1 Bet button (Bet both = 2 clicks),
 * `focus: 'stake'` on the total stake (Calc).
 */
export function openArbSlip(opp, ctx, { total: total0, focus = 'leg', kind = 'arb' } = {}) {
  ensureCss();
  const { ui, store, api } = ctx;
  let o = opp;
  const n = o.legs.length;
  const round0 = +store.get().stakeRound;
  const st = {
    prices: o.legs.map((l) => l.price), edited: false,
    total: total0 ?? store.get().arbStake ?? 1000,
    anchor: -1, anchorStake: 0, round: [0, 1, 5].includes(round0) ? round0 : 0,
  };
  const ev = api.eventById(o.eventId);

  const compute = () => {
    const decs = st.prices.map(toDecimal);
    let stakes;
    if (st.anchor >= 0) stakes = decs.map((d) => (st.anchorStake * decs[st.anchor]) / d);
    else { const inv = decs.reduce((a, d) => a + 1 / d, 0); stakes = decs.map((d) => (st.total / d) / inv); }
    if (st.round) stakes = stakes.map((s, i) => (i === st.anchor ? s : Math.max(st.round, Math.round(s / st.round) * st.round)));
    const staked = stakes.reduce((a, b) => a + b, 0);
    const pays = stakes.map((s, i) => s * decs[i]);
    const profits = pays.map((p) => p - staked);
    return { stakes, staked, pays, profits, min: Math.min(...profits) };
  };
  const flow = () => { const f = ui.legFlow.get(); return f && f.id === o.id ? f : null; };
  const legsNow = (r = compute()) => o.legs.map((l, i) => ({ book: l.book, price: st.prices[i], side: l.outcome, stake: r.stakes[i] }));
  const signed = (x) => `${x >= 0 ? '+' : '-'}${money(Math.abs(x))}`;

  const html = `<div class="arbslip">
    <div class="as-top">
      <div class="as-meta">${ui.edge(o.edge, { label: 'ROI' })}<span>${ui.esc(o.label)} · ${ui.esc(o.market)}</span>
        <span>${ev ? ui.esc(ev.sport) : ''} · ${o.live ? 'Live' : ui.esc(ui.when(o.start))}</span></div>
      <span data-hero></span>
    </div>
    <table class="as-legs"><thead><tr><th>Outcome</th><th>Odds</th><th>Stake</th><th class="r">Payout</th><th class="r"><span class="sr-only">Bet</span></th></tr></thead><tbody>
      ${o.legs.map((l, i) => `<tr data-leg-row="${i}">
        <td><div class="oc">${ui.esc(l.outcome)}</div><div class="oc-b">${ui.book(l.book, { full: true })}</div></td>
        <td data-label="Odds (American)"><input data-price="${i}" value="${fmtAmerican(st.prices[i])}" inputmode="numeric" aria-label="Odds for ${ui.esc(l.outcome)} (American)"></td>
        <td data-label="Stake"><input data-stake="${i}" type="number" step="1" min="0" aria-label="Stake for ${ui.esc(l.outcome)}"></td>
        <td data-label="Payout" class="r" data-pay="${i}"></td>
        <td class="lg-act" data-legbtn="${i}"></td></tr>`).join('')}
    </tbody></table>
    <div data-cash></div>
    <div class="ctl">
      ${ui.numberInput('ctotal', Math.round(st.total), 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Round stakes</span>${ui.seg('round', [[0, 'Exact'], [1, '$1'], [5, '$5']], st.round)}</label>
      <button type="button" class="btn sm outline" data-balance>Balance stakes</button>
    </div>
    <p class="anchor-note" data-anchor-note></p>
    <div class="as-sum"><div><span>Total staked</span><strong data-o="staked"></strong></div><div><span data-o="plabel">Profit if ${bothWord(n)} fill</span><strong data-o="profit"></strong></div><div><span>${ui.term('roi', 'ROI')}</span><strong data-o="roi"></strong></div></div>
    <section><h3>Payout by outcome</h3><table class="sc"><thead><tr><th>If this wins</th><th>Payout</th><th>Profit</th></tr></thead><tbody data-o="sc"></tbody></table></section>
    <div class="as-links">${n === 2 ? ui.calcLink({ tab: kind === 'lowhold' ? 'hold' : 'arb', a: st.prices[0], b: st.prices[1], stake: st.total }) : ''}
      ${ui.related(kind === 'lowhold' ? [['arbitrage', 'Arbitrage'], ['promo-converter', 'Promo Converter']] : [['middles', 'Middles'], ['low-holds', 'Low Holds'], ['tracker', 'Bet Tracker']])}</div>
  </div>`;
  const body = ui.drawer(kind === 'lowhold' ? 'Low hold slip' : 'Arbitrage slip', html, { wide: true, risk: kind, kicker: ui.esc(o.event), footer: ' ' });
  const $ = (s) => body.querySelector(s);

  // Footer: the one primary walks the play — Bet leg 1 → Bet leg 2 → Log both bets (the confirm step).
  function paintFooter(r = compute()) {
    const f = flow();
    const next = f ? f.legs.findIndex((l) => !l.opened) : 0;
    const allOpen = f && next === -1;
    const legBtn = (i, opts = {}) => ui.betAction({ verb: `Bet leg ${i + 1}`, amount: `${ui.esc(bookShort(api, o.legs[i].book))} · ${money(r.stakes[i], st.round ? 0 : 2)}`,
      act: 'leg', book: o.legs[i].book, attrs: { 'data-leg': i }, ...opts });
    const primary = allOpen
      ? ui.betAction({ verb: `Log ${bothWord(n)} bets`, act: 'log', size: '', amount: '' })
      : legBtn(next, { size: '', autofocus: focus === 'leg' && !f });
    // Only touch the footer when it changes: replacing it would drop keyboard focus on every tick.
    const foot = `${primary}${allOpen ? '' : ui.ghost('log', `Log ${bothWord(n)} bets`)}${ui.ghost('alert', 'Alert', { href: '#/alerts' })}`;
    if (body.footer._h !== foot) {
      const hadFocus = body.footer.contains(document.activeElement);
      body.setFooter(foot);
      body.footer._h = foot;
      if (hadFocus) body.footer.querySelector('.btn.primary')?.focus({ preventScroll: true });
    }
    // Per-leg buttons in the table (one gesture each, outline: the footer holds the one primary); opened legs show ✓.
    o.legs.forEach((l, i) => {
      const opened = !!f?.legs[i]?.opened;
      const cell = $(`[data-legbtn="${i}"]`);
      const h = opened ? `${ui.status('Opened', 'ok')} ${ui.ghost('leg', 'Reopen', { attrs: { 'data-leg': i } })}` : legBtn(i, { tone: 'outline' });
      if (cell._h !== h) { cell.innerHTML = h; cell._h = h; }
      $(`[data-leg-row="${i}"]`).classList.toggle('opened', opened);
    });
    if (f && !allOpen && next > 0) body.status(`${ui.esc(`Leg ${next} opened ✓ → now leg ${next + 1} at ${bookName(api, o.legs[next].book)}`)}`, 'ok');
    else if (allOpen) body.status(ui.esc(`All ${n} legs opened ✓. Placed them? Log the play so the Bet Tracker settles it as one.`), 'ok');
  }

  const paint = () => {
    const r = compute();
    const active = document.activeElement;
    r.stakes.forEach((s, i) => {
      const inp = $(`[data-stake="${i}"]`);
      inp.classList.toggle('anch', i === st.anchor);
      if (inp !== active) inp.value = s.toFixed(st.round ? 0 : 2);
      $(`[data-pay="${i}"]`).textContent = money(r.pays[i]);
      const pin = $(`[data-price="${i}"]`);
      if (pin !== active && pin.value !== fmtAmerican(st.prices[i])) pin.value = fmtAmerican(st.prices[i]);
    });
    const tot = $('[data-num="ctotal"]');
    if (tot !== active) tot.value = Math.round(r.staked * 100) / 100;
    $('[data-hero]').innerHTML = ui.heroFig(r.min >= 0 ? `+${money(r.min)}` : signed(r.min), r.min >= 0 ? `if ${bothWord(n)} fill` : 'cost to run', { tone: r.min >= 0 ? 'pos' : '' });
    $('[data-cash]').innerHTML = ui.cashNeeded(legsNow(r));
    $('[data-o="staked"]').textContent = money(r.staked);
    $('[data-o="plabel"]').textContent = r.min >= 0 ? `Profit if ${bothWord(n)} fill` : 'Cost to run';
    const pr = $('[data-o="profit"]');
    pr.textContent = signed(r.min);
    pr.className = r.min >= 0 ? 'pos' : 'neg';
    const roi = $('[data-o="roi"]');
    roi.textContent = `${r.min >= 0 ? '+' : ''}${pct(r.min / r.staked, 2)}`;
    roi.className = r.min >= 0 ? 'pos' : 'neg';
    $('[data-o="sc"]').innerHTML = o.legs.map((l, i) => `<tr><td>${ui.esc(l.outcome)} <span class="muted">· ${ui.esc(bookShort(api, l.book))}</span></td><td>${money(r.pays[i])}</td><td class="${r.profits[i] >= 0 ? 'pos' : 'neg'}">${signed(r.profits[i])}</td></tr>`).join('');
    $('[data-anchor-note]').innerHTML = st.anchor >= 0
      ? `Anchored on ${ui.book(o.legs[st.anchor].book)} at ${money(st.anchorStake)} (that book's max bet). The other legs are sized to match.`
      : `Book capped your stake? Type its max bet on that leg and the other legs resize to match. ${ui.term('limit', 'Limits')} vary by book and market.`;
    paintFooter(r);
    return r;
  };

  // Start (or restart) the tracked play with the current stakes; the banner survives route changes.
  const startFlow = () => {
    const r = compute();
    const prev = flow();
    ui.legFlow.start({ id: o.id, title: `${o.event} · Bet ${bothWord(n)}`, exclusive: true,
      legs: o.legs.map((l, i) => ({ book: l.book, label: l.outcome, stake: r.stakes[i],
        bet: { kind, book: l.book, sport: o.sport, market: o.market, selection: l.outcome, price: st.prices[i], stake: Math.round(r.stakes[i] * 100) / 100, event: o.event } })) });
    // Keep legs already opened in this play.
    if (prev) prev.legs.forEach((l, i) => { if (l.opened) ui.legFlow.opened(i); });
  };

  ui.onAction(body.panel, {
    leg: (_, el) => {
      if (!flow()) startFlow();
      ui.legFlow.open(+el.dataset.leg); // one deep link per gesture, never two
      paintFooter();
      // Hand focus to the next step (leg 2, then Log) so Bet both stays two clicks + confirm.
      requestAnimationFrame(() => body.footer.querySelector('.btn.primary')?.focus({ preventScroll: true }));
    },
    log: () => {
      // Logging is the confirm step: log what is on the slip now, as one linked group.
      startFlow();
      ui.legFlow.confirm();
      body.status(ui.esc('Logged to your Bet Tracker as one linked play ✓'), 'ok');
      paintFooter();
    },
  });
  ui.onNumber(body, 'ctotal', (v) => { st.total = v; st.anchor = -1; paint(); });
  ui.onSeg(body, 'round', (v) => {
    st.round = Number(v);
    body.querySelectorAll('[data-seg="round"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    paint();
  });
  body.querySelectorAll('[data-stake]').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    if (Number.isNaN(v) || v <= 0) return;
    st.anchor = Number(inp.dataset.stake); st.anchorStake = v; paint();
  }));
  body.querySelectorAll('[data-price]').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    if (Number.isNaN(v) || Math.abs(v) < 100) return;
    st.prices[Number(inp.dataset.price)] = v; st.edited = true; paint();
  }));
  $('[data-balance]').addEventListener('click', () => { const r = compute(); st.total = Math.round(r.staked); st.anchor = -1; paint(); });
  if (focus === 'stake') $('[data-num="ctotal"]').setAttribute('data-autofocus', '');

  paint();

  // Stale-price guard: re-read this arb by id every tick. Typed odds are the person's own and stay put.
  const read = () => (kind === 'lowhold' ? api.lowHolds?.({ books: store.get().books }) : api.arbs({ books: store.get().books, live: o.live }))?.find((x) => x.id === o.id) || null;
  ui.liveGuard(body, {
    read,
    goneMsg: 'This arb is gone: a price moved and it no longer pays. If you placed one leg, check the other book before you hedge.',
    onUpdate: (next, prev) => {
      const moved = next.legs.map((l, i) => (prev && prev.legs[i] && prev.legs[i].price !== l.price ? `${bookShort(api, l.book)} ${ui.fmtOdds(prev.legs[i].price)} → ${ui.fmtOdds(l.price)}` : '')).filter(Boolean);
      o = next;
      if (!st.edited) st.prices = next.legs.map((l) => l.price);
      const r = paint();
      return `Price moved${moved.length ? ` ${moved.join(', ')}` : ''}: ${r.min >= 0 ? `profit now +${money(r.min)}` : `now costs ${money(-r.min)}`}`;
    },
  });
  // The leg banner can also move the play on (outside the drawer): keep the footer in step.
  const offTick = api.onTick(() => { if (body.isConnected) paintFooter(); });
  body.whenClosed(offTick);
  return body;
}
