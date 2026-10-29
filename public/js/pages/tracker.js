// Bet Tracker & Account Health: P&L, ROI, CLV, a sortable ledger with settle/delete, linked leg groups
// (arb, middle, low hold, promo conversion), add-bet, CSV export, a per-tool breakdown that links to each
// tool, and sportsbook account health (healthy / limited / restricted).
//
// Layout (UX rebuild, items B1/B6/B7/B8/B10/B17, C13): results-first head with a flat facts strip, then
// the ledger (ui.table, keyed and sortable), then the P&L curve and breakdown side by side, then account
// health. Every panel is a <section class="sec"> with its h2 first (owner editor blocks).

const CSS = `
/* The facts strip lives inside the page head (one editor block with the title). */
.tk .tk-facts { grid-column: 1 / -1; margin-top: 4px; }
.tk .tk-facts .facts { margin-bottom: 0; }
.tk > .page-head { margin-bottom: 18px; }
.tk .tk-count { font-size: var(--t-sm); font-weight: 700; color: var(--muted); }
.tk .tk-bets > .sec-head { justify-content: flex-start; align-items: flex-end; gap: 10px 16px; }
.tk .tk-bets > .sec-head h2 { align-self: center; }
.tk .tk-count { align-self: center; margin-right: 8px; }
.tk .tk-fb { flex: 1 1 auto; min-width: 0; }
.tk .tk-fb .toolbar { margin: 0; }
.tk .tk-tools { margin-left: auto; }
.tk .tk-tools .tbl-tools { padding: 0; }
/* Desktop: the selects' first option names them (All sports / All tools / All books); labels stay for screen readers. */
@media (min-width: 861px) {
  .tk .tk-fb .fb-fields .field > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
/* Ledger cells: legs of a linked group stack one line per leg, aligned across Book / Odds / Stake / CLV / Status. */
.tk .sel { font-weight: 700; line-height: 1.3; }
.tk .sel .plus { color: var(--muted); font-weight: 600; }
.tk .sel-sub { font-size: var(--t-xs); color: var(--muted); margin-top: 2px; line-height: 1.35; }
.tk .stack { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.tk td.r .stack, .tk .stack.r { align-items: flex-end; }
.tk .stack > * { min-height: 22px; display: inline-flex; align-items: center; }
.tk .bonus-n { font-size: var(--t-xs); font-weight: 700; color: var(--muted); margin-left: 4px; }
.tk .pnl { font: 900 var(--t-md)/1 var(--f-head); font-variant-numeric: tabular-nums; white-space: nowrap; }
.tk .pnl.pos { color: var(--pos); }
.tk .pnl.neg { color: var(--neg); } /* negative P&L text only */
.tk .placed { color: var(--muted); white-space: nowrap; }
.tk .row-acts .btn.sm.outline { min-width: 0; padding-inline: 9px; }
.tk .tk-legs-btn b { font-variant-numeric: tabular-nums; }

/* Two panels side by side on wide screens: the curve and the per-tool breakdown. */
.tk .tk-pair { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 0 32px; }
.tk .tk-pair > .sec { margin-top: 28px; }
.tk .sec-head .muted { font-size: var(--t-sm); font-weight: 700; }

/* P&L curve: profit area tinted, loss area hatched (never colour alone). */
.tk .chart { width: 100%; display: block; }
.tk .chart text { fill: var(--muted); font: 600 11px var(--f-body); }
.tk .chart .grid line { stroke: var(--line-2); }
.tk .chart .zero { stroke: var(--line-strong); stroke-dasharray: 3 3; }
.tk .chart .ln { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linejoin: round; }
.tk .chart .ar-up { fill: var(--soft); }
.tk .chart .hatch-ln { stroke: var(--line-strong); stroke-width: 2; }
.tk .chart .dot { fill: var(--accent); stroke: var(--paper); stroke-width: 2; }
.tk .chart-key { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; font-size: var(--t-xs); font-weight: 700; color: var(--muted); }
.tk .chart-key i { display: inline-block; width: 14px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.tk .chart-key .k-up { background: var(--soft); border: 1px solid var(--g); }
.tk .chart-key .k-down { border: 1px solid var(--line-strong); }

/* Breakdown by tool: diverging bars. Profit = solid green, loss = hatched (B7). */
.tk .kinds { display: grid; }
.tk .kind-row { display: grid; grid-template-columns: minmax(0, 9.5rem) minmax(60px, 1fr) 5.5rem 4.2rem; gap: 12px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--line-2); font-size: var(--t-sm); }
.tk .kind-row:last-child { border-bottom: 0; }
.tk .kind-row.head { padding-top: 0; font-size: var(--t-xs); font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.tk .kind-name { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.tk .kind-name a { font-weight: 800; color: var(--text); text-decoration: none; }
.tk .kind-name a:hover { color: var(--accent); text-decoration: underline; }
.tk .kind-n { border: 0; background: none; padding: 0; font: 600 var(--t-xs) var(--f-body); color: var(--muted); text-align: left; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; width: max-content; }
.tk .kind-n:hover { color: var(--accent); }
.tk .num-c { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tk .num-c.pos { color: var(--pos); }
.tk .num-c.neg { color: var(--neg); }
.tk .num-c.muted { color: var(--muted); font-weight: 700; }
.tk .dbar { position: relative; height: 10px; }
.tk .dbar::before { content: ""; position: absolute; left: 0; right: 0; top: 4px; height: 2px; background: var(--line-2); }
.tk .dbar::after { content: ""; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--line-strong); }
.tk .dbar i { position: absolute; top: 0; bottom: 0; min-width: 4px; border-radius: 2px; }
.tk .dbar i.up { left: 50%; background: var(--g); }
.tk .dbar i.down { right: 50%; border: 1px solid var(--line-strong); }

/* Account health */
.tk .health-note { margin: 10px 0 12px; max-width: 78ch; color: var(--muted); font-size: var(--t-sm); }
.tk .health-note a { font-weight: 700; }

/* Drawers */
.tk-dr .kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 18px; margin: 0 0 16px; font-size: var(--t-body); }
.tk-dr .kv dt { color: var(--muted); font-weight: 700; font-size: var(--t-sm); }
.tk-dr .kv dd { margin: 0; font-weight: 600; text-align: left; }
.tk-dr .legs { display: grid; gap: 10px; margin: 0 0 14px; }
.tk-dr .leg { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 12px 0; border-top: 2px solid var(--line); }
.tk-dr .leg:last-child { border-bottom: 2px solid var(--line); }
.tk-dr .leg-l { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tk-dr .leg-l b { font-weight: 800; }
.tk-dr .leg-meta { display: flex; gap: 6px 10px; flex-wrap: wrap; align-items: center; font-size: var(--t-sm); color: var(--muted); }
.tk-dr .leg-r { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.tk-dr .leg-acts { grid-column: 1 / -1; display: flex; gap: 6px; flex-wrap: wrap; }
.tk-dr .note { margin: 0 0 14px; font-size: var(--t-sm); color: var(--muted); }
.tk-dr .tot { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin: 0 0 16px; }
.tk-dr .tot span { font-weight: 700; color: var(--muted); font-size: var(--t-sm); }
.tk-dr .settle { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 16px; }
.tk-dr .related { margin-top: 4px; }
.tk-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tk-form .full { grid-column: 1 / -1; }
.tk-csv { width: 100%; height: 60vh; font: 500 12px/1.5 var(--f-body); font-variant-numeric: tabular-nums; }

@media (max-width: 1100px) { .tk .tk-pair { grid-template-columns: 1fr; } }
@media (max-width: 860px) {
  .tk .kind-row { grid-template-columns: minmax(0, 7.5rem) minmax(40px, 1fr) 4.6rem 3.6rem; gap: 8px; }
  .tk .stack { gap: 4px; }
  .tk .stack > * { min-height: 20px; }
  .tk-form { grid-template-columns: 1fr; }
  /* Phones: Columns sits on the heading row, the filter bar takes its own full line under it. */
  .tk .tk-bets > .sec-head { align-items: center; }
  .tk .tk-fb { order: 3; flex-basis: 100%; }
  .tk .tbl[data-tbl="tk-health"] td.r { text-align: left; }
  .tk .tbl[data-tbl="tk-health"] td[data-col="status"] { justify-self: end; }
}`;

const KINDS = [['arb', 'Arbitrage'], ['ev', '+EV'], ['middle', 'Middles'], ['lowhold', 'Low holds'], ['promo', 'Promos'], ['sharp', 'Sharp money'], ['signal', 'Bettor signals'], ['ai-pick', 'AI picks'], ['prediction', 'Prediction mkts']];
const kindLabel = (k) => (KINDS.find(([v]) => v === k) || [k, k])[1];
// Where each kind of bet came from (breakdown links + drawer "Related" row).
const KIND_ROUTE = { arb: ['arbitrage', 'Arbitrage'], ev: ['positive-ev', 'Positive EV'], middle: ['middles', 'Middles'], lowhold: ['low-holds', 'Low Holds'],
  promo: ['promo-converter', 'Promo Converter'], sharp: ['sharp-money', 'Sharp Money'], signal: ['bettor-signals', 'Pro Bettor Signals'],
  'ai-pick': ['ai-picks', 'AI Sports Picks'], prediction: ['prediction-traders', 'Prediction Traders'] };
const STATUS = [['all', 'All'], ['open', 'Open'], ['won', 'Won'], ['lost', 'Lost'], ['push', 'Push']];
const PAGE = 10; // ledger rows shown first; "Show 20 more" adds pages

export default function render(root, { api, store, ui, odds }) {
  if (!document.getElementById('css-tk')) document.head.insertAdjacentHTML('beforeend', `<style id="css-tk">${CSS}</style>`);
  const T = api.tracker;
  const money = odds.money;
  const signed = (x, d = 2) => `${x > 0.004 ? '+' : ''}${money(x, d)}`;
  const day = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  let limit = PAGE;

  root.innerHTML = `<div class="tk">
    ${ui.pageHead({ title: 'Bet Tracker & Accounts', tool: 'tracker',
      subtitle: 'Every bet from every tool in one ledger: P&amp;L, ROI and closing-line value, plus the health of each sportsbook account.',
      actions: '<button type="button" class="btn outline" id="tk-csv">Copy as CSV</button><button type="button" class="btn primary" id="tk-add">+ Add bet</button>' })}
    <div class="tk-facts" id="tk-facts"></div>
    <section class="sec tk-bets"><div class="sec-head"><h2>Bets</h2><span class="tk-count" data-bf-nodata id="tk-count"></span><div class="tk-fb" id="tk-filters"></div><div class="tk-tools" id="tk-tools"></div></div>
      <div id="tk-table"></div><div id="tk-lock"></div><div id="tk-more"></div></section>
    ${ui.how({ title: 'How your ledger counts', summary: 'Linked bets, closing-line value and bonus bets, in one line each.', checks: [
      'Linked bets (both sides of an arb, a middle, a promo conversion) show as one row. Its P&amp;L is the sum of the legs.',
      `${ui.term('clv', 'CLV')} compares your price with the closing price. Beating the close often is the best sign your bets have an edge.`,
      `A ${ui.term('bonus_bet', 'bonus bet')} stake is site credit: a loss costs $0 and it is left out of the cash staked behind ROI.`,
    ] })}
    <div class="tk-pair">
      <section class="sec"><div class="sec-head"><h2>P&amp;L over time</h2><span class="muted" data-bf-nodata id="tk-range"></span></div><div id="tk-chart"></div></section>
      <section class="sec"><div class="sec-head"><h2>Breakdown by tool</h2><span class="muted">P&amp;L · ROI</span></div><div id="tk-kinds"></div></section>
    </div>
    <section class="sec" id="tk-health"><div class="sec-head"><h2>Account health</h2><span class="muted">Status, limits and balances per sportsbook</span></div>
      <div id="tk-hfacts"></div>
      <p class="health-note">A limited book caps how much it takes per bet, and BetFriend sizes every arb, +EV and promo leg at that book to fit. To keep your volume up, spread deposits over more books with the <a href="#/deposit-optimizer">Deposit Optimizer</a>.</p>
      <div id="tk-htable"></div></section>
  </div>`;
  const $ = (s) => root.querySelector(s);
  root.querySelector('.page-head').append($('#tk-facts')); // facts strip under the title row

  // ------------------------------------------------------------------ facts strip (max 4 money facts)
  function drawFacts() {
    const s = T.summary();
    const atRisk = T.list().filter((b) => b.status === 'open').reduce((a, b) => a + (b.bonus ? 0 : b.stake), 0);
    $('#tk-facts').innerHTML = ui.facts([
      { label: 'Profit / loss', value: signed(s.pnl), tone: s.pnl >= 0 ? 'pos' : 'neg', note: `on ${money(s.staked, 0)} cash settled` },
      { label: 'ROI', value: odds.pct(s.roi), tone: s.roi >= 0 ? 'pos' : 'neg', note: `Win rate ${odds.pct(s.winRate)} · ${s.count - s.open} settled` },
      { label: 'Avg CLV', term: 'clv', value: `${s.clv >= 0 ? '+' : ''}${odds.pct(s.clv, 2)}`, tone: s.clv >= 0 ? 'pos' : 'neg', note: s.clv >= 0 ? 'better than the closing price' : 'worse than the closing price' },
      { label: 'Open bets', value: String(s.open), note: `${money(atRisk, 0)} at risk`, act: 'show-open' },
    ]);
  }
  ui.onAction($('#tk-facts'), { 'show-open': () => { fb.set({ status: 'open' }); $('.tk-bets').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  // ------------------------------------------------------------------ ledger: filter bar + keyed table
  const fb = ui.filterBar({ id: 'tk', fields: [
    { key: 'status', type: 'mode', label: 'Status', default: 'all', options: STATUS },
    { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: [['All', 'All sports'], ...api.sports] },
    { key: 'kind', type: 'select', label: 'Tool', default: 'All', options: [['All', 'All tools'], ...KINDS], chip: (v) => kindLabel(v) },
    { key: 'book', type: 'select', label: 'Book', default: 'All', options: [['All', 'All books'], ...api.sportsbooks.map((b) => [b.id, b.name])], chip: (v) => api.bookById[v]?.name || v },
  ], onChange: () => { limit = PAGE; mountTable(); } });
  $('#tk-filters').append(fb.el);

  const F = fb.values;
  const matches = (b) => (F.status === 'all' || b.status === F.status) && (F.kind === 'All' || b.kind === F.kind)
    && (F.book === 'All' || b.book === F.book) && (F.sport === 'All' || b.sport === F.sport);
  const filtered = () => T.list().filter(matches);

  // Linked legs collapse into one entry (the whole group shows even when the filter matched one leg).
  function entries(list) {
    const out = [], seen = new Set();
    for (const b of list) {
      if (!b.group) { out.push({ id: b.id, legs: [b], single: true }); continue; }
      if (seen.has(b.group)) continue;
      seen.add(b.group);
      out.push({ id: `g:${b.group}`, group: b.group, legs: T.list().filter((x) => x.group === b.group) });
    }
    return out.map(enrich);
  }
  function enrich(e) {
    const legs = e.legs, first = legs[0];
    const open = legs.some((b) => b.status === 'open');
    const pnl = legs.reduce((a, b) => a + b.pnl, 0);
    const cash = legs.reduce((a, b) => a + (b.bonus ? 0 : b.stake), 0);
    const clvs = legs.filter((b) => b.clv);
    return { ...e, first, kind: first.kind, placedAt: first.placedAt, open, pnl, cash,
      stake: legs.reduce((a, b) => a + b.stake, 0),
      clv: clvs.length ? clvs.reduce((a, b) => a + b.clv, 0) / clvs.length : null,
      price: legs.length === 1 ? first.price : null };
  }

  const statusOf = (st) => ({ won: ui.status('Won', 'ok'), lost: ui.status('Lost', 'bad'), push: ui.status('Push', 'muted'), open: ui.status('Open', 'info') }[st] || ui.status(st));
  const pnlHtml = (pnl, open) => (open ? ui.na('Open: not settled yet') : `<b class="pnl ${pnl > 0.004 ? 'pos' : pnl < -0.004 ? 'neg' : ''}">${signed(pnl)}</b>`);
  const stack = (items, cls = '') => `<div class="stack${cls ? ` ${cls}` : ''}">${items.join('')}</div>`;
  const settleBtns = (b) => STATUS.slice(2).map(([v, l]) => `<button type="button" class="btn sm outline" data-act="settle" data-s="${v}" data-id="${ui.esc(b.id)}"><span data-bf-text>${l}</span></button>`).join('');

  const columns = [
    { key: 'placed', label: 'Placed', sort: (e) => e.placedAt, render: (e) => `<span class="placed">${day(e.placedAt)}</span>` },
    { key: 'bet', label: 'Bet', sort: (e) => e.first.selection, render: (e) => {
      if (e.single) {
        const b = e.first;
        return `<div class="sel">${ui.esc(b.selection)}</div><div class="sel-sub">${ui.esc(b.sport || '')} · ${ui.esc(b.market || '')}${b.bonus ? ' · bonus bet (stake not returned)' : ''}</div>`;
      }
      const f = e.first;
      return `<div class="sel">${e.legs.map((b) => ui.esc(b.selection)).join(' <span class="plus">+</span> ')}</div>
        <div class="sel-sub">${e.legs.length} linked bets · ${f.event ? `${ui.esc(f.event)} · ` : ''}${ui.esc(f.sport || '')} · ${ui.esc(f.market || '')}</div>`;
    } },
    { key: 'kind', label: 'Tool', sort: (e) => kindLabel(e.kind), render: (e) => ui.tag(kindLabel(e.kind)) },
    { key: 'book', label: 'Book', render: (e) => stack(e.legs.map((b) => ui.book(b.book))) },
    { key: 'odds', label: 'Odds', align: 'r', sort: (e) => e.price, render: (e) => stack(e.legs.map((b) => ui.price(b.price))) },
    { key: 'stake', label: 'Stake', align: 'r', sort: (e) => e.stake, render: (e) => stack(e.legs.map((b) => `<span>${money(b.stake)}${b.bonus ? '<span class="bonus-n">bonus</span>' : ''}</span>`)) },
    { key: 'clv', label: 'CLV', align: 'r', title: ui.termTitle('clv'), sort: (e) => e.clv, render: (e) => stack(e.legs.map((b) => (b.clv ? ui.edge(b.clv) : ui.na('No closing price')))) },
    { key: 'status', label: 'Status', sort: (e) => (e.open ? 1 : 0), render: (e) => stack(e.legs.map((b) => statusOf(b.status))) },
    { key: 'pnl', label: 'P&L', align: 'r', sort: (e) => (e.open ? null : e.pnl), render: (e) => pnlHtml(e.pnl, e.open) },
  ];
  const sortFn = (key) => columns.find((c) => c.key === key)?.sort;
  // The table sorts what it is given; sort the whole ledger first so paging takes the right rows.
  function ordered(list, st) {
    const f = st?.key && sortFn(st.key);
    if (!f) return list;
    const m = st.dir === 'asc' ? 1 : -1;
    return list.map((r, i) => [r, f(r), i]).sort((a, b) => {
      const x = a[1], y = b[1];
      if (x === y) return a[2] - b[2];
      if (x === undefined || x === null) return 1;
      if (y === undefined || y === null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * m;
    }).map((r) => r[0]);
  }

  const action = (e) => {
    const del = ui.ghost(e.single ? 'del' : 'delg', '✕', { attrs: { 'aria-label': e.single ? 'Delete bet' : 'Delete all linked bets', title: e.single ? 'Delete bet' : 'Delete all linked bets' } });
    if (!e.single) {
      return `<div class="row-acts"><button type="button" class="btn sm outline tk-legs-btn" data-act="legs" aria-haspopup="dialog"><span data-bf-text>${e.open ? 'Settle legs' : 'Show legs'}</span> <b data-bf-nodata>${e.legs.length}</b></button>${del}</div>`;
    }
    const b = e.first;
    return `<div class="row-acts">${b.status === 'open' ? settleBtns(b) : ''}${del}</div>`;
  };

  let table = null;
  function mountTable() {
    table?.destroy();
    table = ui.table({
      id: 'tk-bets', caption: 'Your bets', rowKey: (e) => e.id, columns, action,
      sort: { key: 'placed', dir: 'desc' },
      onOpen: (e) => (e.single ? openBet(e.first.id) : openGroup(e.group)),
      onAction: {
        settle: (e, el) => { T.settle(el.dataset.id, el.dataset.s); ui.toast(`Settled as ${el.dataset.s}`); },
        legs: (e) => openGroup(e.group),
        del: (e) => { T.remove(e.first.id); ui.toast('Bet deleted'); },
        delg: (e) => { T.removeGroup(e.group); ui.toast('Linked bets deleted'); },
      },
      mobile: { areas: ['bet bet pnl', 'book odds stake', 'status kind placed', 'act act act'], cols: 'minmax(0,1fr) auto auto' },
      empty: () => ui.empty({ title: 'No bets match these filters', msg: 'Nothing in your ledger fits this status, tool, book and sport.',
        actions: [{ label: 'Reset filters', act: 'reset' }, { label: '+ Add bet', act: 'add' }, { label: 'Find a bet on the Daily Card', href: '#/daily' }] }),
    });
    ui.onAction(table.el, { reset: () => { fb.set({ status: 'all' }, { silent: true }); fb.reset(); }, add: addBet });
    // The table's own tools (pending updates, density, Columns) sit on the section-head row to save a line.
    $('#tk-tools').replaceChildren(...[table.el.querySelector('.tbl-tools')].filter(Boolean));
    $('#tk-table').replaceChildren(table.el);
    drawBets();
  }

  function drawBets() {
    const list = filtered();
    const all = ordered(entries(list), table.sortState());
    $('#tk-count').textContent = `${list.length} bets`;
    // Plan awareness (B10): a plan without the tracker sees its first rows and a lock card, never a blur.
    const { rows, card } = ui.lockRows(all, 'tracker', { n: 3, noun: 'bets' });
    table.update(rows.slice(0, limit));
    $('#tk-lock').innerHTML = card;
    $('#tk-more').innerHTML = card ? '' : ui.more({ key: 'tk-bets', shown: Math.min(limit, rows.length), total: rows.length, step: 20 });
  }
  $('#tk-more').addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { limit += 20; drawBets(); } });
  // A sort click re-pages the whole ledger, not just the visible rows.
  $('#tk-table').addEventListener('click', (e) => { if (e.target.closest('[data-sort]')) requestAnimationFrame(drawBets); });

  // ------------------------------------------------------------------ P&L curve
  function drawChart() {
    const el = $('#tk-chart');
    const settled = T.list().filter((b) => b.status !== 'open').sort((a, b) => a.placedAt - b.placedAt);
    if (settled.length < 2) {
      $('#tk-range').textContent = '';
      el.innerHTML = ui.empty({ title: 'Settle a few bets to see your curve', msg: 'Your profit line starts once two bets are settled.',
        actions: [{ label: 'Show open bets', act: 'show-open' }, { label: '+ Add bet', act: 'add' }] });
      return;
    }
    let c = 0;
    const pts = settled.map((b) => ({ t: b.placedAt, v: (c += b.pnl) }));
    pts.unshift({ t: pts[0].t - 3600e3, v: 0 });
    const W = Math.max(280, el.clientWidth || 600), H = 250, L = 52, R = 10, Tp = 10, B = 24;
    const minV = Math.min(0, ...pts.map((p) => p.v)), maxV = Math.max(0, ...pts.map((p) => p.v));
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const x = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v) => Tp + (1 - (v - minV) / (maxV - minV || 1)) * (H - Tp - B);
    const step = niceStep((maxV - minV) / 4);
    const ticks = [];
    for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) ticks.push(v);
    const days = W < 420 ? 2 : 4;
    const xt = Array.from({ length: days + 1 }, (_, i) => t0 + ((t1 - t0) * i) / days);
    const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${x(t0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(t1).toFixed(1)},${y(0).toFixed(1)}`;
    const z = y(0), last = pts[pts.length - 1];
    // The same area is drawn twice: tinted above $0 (profit) and hatched below it (loss).
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cumulative profit and loss: ${ui.esc(signed(last.v))} after ${settled.length} settled bets">
      <defs><pattern id="tk-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch-ln" x1="0" y1="0" x2="0" y2="6"/></pattern>
        <clipPath id="tk-up"><rect x="0" y="0" width="${W}" height="${Math.max(0, z)}"/></clipPath>
        <clipPath id="tk-down"><rect x="0" y="${z}" width="${W}" height="${Math.max(0, H - z)}"/></clipPath></defs>
      <g class="grid">${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${money(v, 0)}</text>`).join('')}</g>
      <polygon class="ar-up" clip-path="url(#tk-up)" points="${area}"/>
      <polygon fill="url(#tk-hatch)" clip-path="url(#tk-down)" points="${area}"/>
      <line class="zero" x1="${L}" x2="${W - R}" y1="${z}" y2="${z}"/>
      <polyline class="ln" points="${line}"/>
      <circle class="dot" cx="${x(last.t)}" cy="${y(last.v)}" r="4.5"/>
      ${xt.map((t, i) => `<text x="${x(t)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === days ? 'end' : 'middle'}">${day(t)}</text>`).join('')}
    </svg><div class="chart-key"><span><i class="k-up"></i>Above $0: in profit</span><span><i class="k-down loss-hatch"></i>Below $0: down overall</span></div>`;
    $('#tk-range').textContent = `${settled.length} settled · ${signed(last.v)}`;
  }
  const niceStep = (s) => { const p = 10 ** Math.floor(Math.log10(Math.max(1, s))); return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= s) || p * 10; };
  ui.onAction($('#tk-chart'), { 'show-open': () => fb.set({ status: 'open' }), add: addBet });

  // ------------------------------------------------------------------ breakdown by tool (links to each tool)
  function drawKinds() {
    const by = {};
    for (const b of T.list()) {
      const k = (by[b.kind] ||= { n: 0, staked: 0, pnl: 0 });
      k.n++;
      if (b.status !== 'open') { k.staked += b.bonus ? 0 : b.stake; k.pnl += b.pnl; } // bonus stakes are site credit, not cash
    }
    const rows = KINDS.filter(([k]) => by[k]).map(([k, l]) => ({ k, l, ...by[k] })).sort((a, b) => b.pnl - a.pnl);
    if (!rows.length) {
      $('#tk-kinds').innerHTML = ui.empty({ title: 'No bets yet', msg: 'Log a bet from any tool and its profit shows up here.', actions: [{ label: '+ Add bet', act: 'add' }, { label: 'Open the Daily Card', href: '#/daily' }] });
      return;
    }
    const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
    $('#tk-kinds').innerHTML = `<div class="kinds" data-bf-nodata>
      <div class="kind-row head" aria-hidden="true"><span>Tool</span><span></span><span class="num-c">P&amp;L</span><span class="num-c">ROI</span></div>
      ${rows.map((r) => {
        const w = ((Math.abs(r.pnl) / max) * 50).toFixed(1);
        const [route, name] = KIND_ROUTE[r.k] || ['daily', r.l];
        const roi = r.staked ? r.pnl / r.staked : 0;
        return `<div class="kind-row"><span class="kind-name"><a href="#/${route}" title="Open ${ui.esc(name)}">${ui.esc(r.l)}</a>
            <button type="button" class="kind-n" data-act="kind" data-kind="${ui.esc(r.k)}" aria-label="Show ${r.n} ${ui.esc(r.l)} bets in the ledger">${r.n} bets</button></span>
          <span class="dbar" aria-hidden="true">${+w ? `<i class="${r.pnl >= 0 ? 'up' : 'down loss-hatch'}" style="width:${w}%"></i>` : ''}</span>
          <span class="num-c ${r.pnl > 0.004 ? 'pos' : r.pnl < -0.004 ? 'neg' : ''}">${signed(r.pnl, 0)}</span>
          <span class="num-c muted">${roi > 0 ? '+' : ''}${odds.pct(roi, 1)}</span></div>`;
      }).join('')}</div>`;
  }
  ui.onAction($('#tk-kinds'), {
    kind: (_, el) => { fb.set({ kind: el.dataset.kind, status: 'all' }); $('.tk-bets').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    add: addBet,
  });

  // ------------------------------------------------------------------ account health
  function oppCounts() {
    const f = { live: undefined };
    const opps = [...api.arbs(f), ...api.ev({ minEdge: 0.02 }), ...api.middles(f), ...api.lowHolds(f)];
    const by = {};
    for (const o of opps) for (const l of o.legs) by[l.book] = (by[l.book] || 0) + 1;
    return by;
  }
  const healthTag = (st) => ({ healthy: ui.status('Healthy', 'ok'), limited: ui.status('Limited', 'warn'), restricted: ui.status('Restricted', 'bad') }[st] || ui.status(st));
  const healthTable = ui.table({
    id: 'tk-health', caption: 'Sportsbook account health', tools: false, freeze: false, rowKey: (r) => r.id, sort: null,
    columns: [
      { key: 'book', label: 'Sportsbook', render: (r) => ui.book(r.id, { full: true }) },
      { key: 'status', label: 'Status', render: (r) => healthTag(r.h.status) },
      { key: 'max', label: 'Max stake', align: 'r', mlabel: true, render: (r) => (r.h.maxStake ? money(r.h.maxStake, 0) : '<span class="muted">No limit</span>') },
      { key: 'bal', label: 'Balance', align: 'r', mlabel: true, render: (r) => money(r.h.balance || 0, 0) },
      { key: 'opps', label: 'Open opps', align: 'r', mlabel: true, render: (r) => String(r.n) },
      { key: 'since', label: 'Since', render: (r) => (r.h.since ? `<span class="muted">${ui.ago(r.h.since)}</span>` : ui.na('Never limited')) },
    ],
    action: (r) => `<div class="row-acts">${r.h.status === 'healthy'
      ? '<button type="button" class="btn sm outline" data-act="lim"><span data-bf-text>Mark limited</span></button>'
      : '<button type="button" class="btn sm outline" data-act="ok"><span data-bf-text>Mark healthy</span></button>'}${r.h.status !== 'restricted' ? ui.ghost('rest', 'Restricted') : ''}</div>`,
    onAction: {
      lim: (r) => markLimited(r.id),
      ok: (r) => { T.setHealth(r.id, { status: 'healthy', maxStake: null, since: null }); ui.toast('Account marked healthy'); },
      rest: (r) => { T.setHealth(r.id, { status: 'restricted', maxStake: 5, since: Date.now() }); ui.toast('Account marked restricted'); },
    },
    mobile: { areas: ['book book status', 'max bal opps', 'act act act'], cols: 'repeat(3, minmax(0, 1fr))' },
  });
  $('#tk-htable').append(healthTable.el);

  function drawHealth() {
    const H = T.health();
    const counts = oppCounts();
    const books = api.sportsbooks.map((b) => b.id);
    const sum = (st) => books.filter((b) => (H[b]?.status || 'healthy') === st).reduce((a, b) => a + (counts[b] || 0), 0);
    $('#tk-hfacts').innerHTML = ui.facts([
      { label: 'Opportunities on healthy books', value: String(sum('healthy')), tone: 'pos' },
      { label: 'On limited / restricted books', value: String(sum('limited') + sum('restricted')) },
      { label: 'Total balance', value: money(books.reduce((a, b) => a + (H[b]?.balance || 0), 0), 0) },
    ]);
    healthTable.update(books.map((id) => ({ id, h: H[id] || { status: 'healthy' }, n: counts[id] || 0 })));
  }

  function markLimited(id) {
    const body = ui.drawer(`Mark ${api.bookById[id].name} limited`, `<div class="tk-dr"><p class="note">Enter the max stake the book now accepts. BetFriend sizes every arb, +EV and promo leg at this book to fit.</p>
      ${ui.numberInput('max', 50, 'Max stake per bet', { prefix: '$', step: 5 })}
      <p class="note">Limits cut your volume. ${ui.related([['deposit-optimizer', 'Deposit Optimizer: spread deposits over more books']], 'Next')}</p></div>`,
    { footer: '<button type="button" class="btn primary" data-act="save" data-autofocus>Save limit</button><button type="button" class="btn ghost" data-close-form>Cancel</button>' });
    body.footer.querySelector('[data-close-form]').addEventListener('click', ui.closeDrawer);
    body.footer.querySelector('[data-act="save"]').addEventListener('click', () => {
      T.setHealth(id, { status: 'limited', maxStake: Math.max(1, parseFloat(body.querySelector('[data-num="max"]').value) || 50), since: Date.now() });
      ui.closeDrawer(); ui.toast('Account marked limited');
    });
  }

  // ------------------------------------------------------------------ drawers: one bet / one linked group
  const calcFor = (legs) => {
    if (legs.length === 2) return ui.calcLink({ tab: legs[0].kind === 'middle' ? 'middle' : legs.some((b) => b.bonus) ? 'bonus' : 'arb', a: legs[0].price, b: legs[1].price, stake: legs.reduce((a, b) => a + b.stake, 0) });
    return ui.calcLink({ tab: 'ev', a: legs[0].price, stake: legs[0].stake });
  };
  const relatedFor = (kind) => { const r = KIND_ROUTE[kind]; return r ? ui.related([[r[0], `Open ${r[1]}`], ['calculators', 'Calculators']]) : ''; };
  const clvWords = (clv) => (!clv ? 'No closing price recorded.' : clv > 0
    ? `You got a price ${odds.pct(clv, 2)} better than the closing price. Beating the close often is the best sign of an edge.`
    : `The price closed ${odds.pct(-clv, 2)} better than the one you got. One bet means little; watch the average.`);

  function openBet(id) {
    const paint = () => {
      const b = T.list().find((x) => x.id === id);
      if (!b) { ui.closeDrawer(); return null; }
      return `<div class="tk-dr">
        <div class="tot"><div>${statusOf(b.status)}</div>${b.status === 'open' ? ui.heroFig(money(b.stake), 'at risk', { tone: '' }) : ui.heroFig(signed(b.pnl), 'P&L', { tone: b.pnl > 0.004 ? 'pos' : b.pnl < -0.004 ? 'neg' : '' })}</div>
        <dl class="kv"><dt>Bet</dt><dd>${ui.esc(b.selection)}</dd>
          <dt>Market</dt><dd>${ui.esc(b.sport || '')} · ${ui.esc(b.market || '')}</dd>
          <dt>Book</dt><dd>${ui.book(b.book, { full: true })}</dd>
          <dt>Odds</dt><dd>${ui.price(b.price)} <span class="muted">· ${ui.riskWin(b.stake, b.price)}</span></dd>
          <dt>Tool</dt><dd>${ui.tag(kindLabel(b.kind))}</dd>
          <dt>Placed</dt><dd>${day(b.placedAt)}</dd>
          <dt>${ui.term('clv', 'CLV')}</dt><dd>${b.clv ? ui.edge(b.clv) : ui.na('No closing price')} <span class="muted">${clvWords(b.clv)}</span></dd></dl>
        ${b.status === 'open' ? `<div class="settle" role="group" aria-label="Settle this bet">${settleBtns(b)}</div>` : ''}
        ${relatedFor(b.kind)}</div>`;
    };
    const html = paint();
    if (!html) return;
    const body = ui.drawer('Bet details', html, { kicker: ui.esc(kindLabel(T.list().find((x) => x.id === id).kind)),
      footer: `${calcFor([T.list().find((x) => x.id === id)])}<button type="button" class="btn ghost" data-act="del">Delete bet</button>` });
    wireDrawer(body, paint, { del: () => { T.remove(id); ui.closeDrawer(); ui.toast('Bet deleted'); } });
  }

  function openGroup(group) {
    const legsOf = () => T.list().filter((b) => b.group === group);
    const paint = () => {
      const legs = legsOf();
      if (!legs.length) { ui.closeDrawer(); return null; }
      const e = enrich({ legs });
      const exclusive = legs[0].exclusive;
      return `<div class="tk-dr">
        <div class="tot"><div><span>${legs.length} linked bets${legs.some((b) => b.bonus) ? ' · includes a bonus bet' : ''}</span></div>${e.open ? ui.heroFig(money(e.cash), 'cash staked', { tone: '' }) : ui.heroFig(signed(e.pnl), 'P&L, all legs', { tone: e.pnl > 0.004 ? 'pos' : e.pnl < -0.004 ? 'neg' : '' })}</div>
        <p class="note">${exclusive ? 'Only one side can win: settling one leg settles the other.' : 'Each leg settles on its own. When the result lands between the lines, both legs win.'}</p>
        <div class="legs">${legs.map((b) => `<div class="leg">
          <div class="leg-l"><b>${ui.esc(b.selection)}</b><div class="leg-meta">${ui.book(b.book, { full: true })}${ui.price(b.price)}<span>${money(b.stake)}${b.bonus ? ' bonus bet' : ''}</span>${b.clv ? `<span>CLV ${ui.edge(b.clv)}</span>` : ''}</div></div>
          <div class="leg-r">${statusOf(b.status)}${b.status === 'open' ? '' : `<b class="pnl ${b.pnl > 0.004 ? 'pos' : b.pnl < -0.004 ? 'neg' : ''}">${signed(b.pnl)}</b>`}</div>
          ${b.status === 'open' ? `<div class="leg-acts" role="group" aria-label="Settle ${ui.esc(b.selection)}">${settleBtns(b)}</div>` : ''}</div>`).join('')}</div>
        ${relatedFor(legs[0].kind)}</div>`;
    };
    const html = paint();
    if (!html) return;
    const legs = legsOf();
    const body = ui.drawer('Linked bets', html, { kicker: `${ui.esc(kindLabel(legs[0].kind))}${legs[0].event ? ` · ${ui.esc(legs[0].event)}` : ''}`,
      risk: ['arb', 'promo', 'lowhold', 'middle'].includes(legs[0].kind) ? legs[0].kind : '',
      footer: `${calcFor(legs)}<button type="button" class="btn ghost" data-act="delg">Delete linked bets</button>` });
    wireDrawer(body, paint, { delg: () => { T.removeGroup(group); ui.closeDrawer(); ui.toast('Linked bets deleted'); } });
  }

  // Drawer bodies repaint when the ledger changes (settling a leg settles its partner in exclusive groups).
  function wireDrawer(body, paint, extra) {
    ui.onAction(body.panel, { settle: (_, el) => { T.settle(el.dataset.id, el.dataset.s); ui.toast(`Settled as ${el.dataset.s}`); }, ...extra });
    const off = T.subscribe(() => { const h = paint(); if (h) body.innerHTML = h; });
    body.whenClosed(off);
  }

  // ------------------------------------------------------------------ add bet + CSV
  function addBet() {
    const body = ui.drawer('Add a bet', `<form class="tk-form" id="tk-f">
      <label class="field full"><span>Selection</span><input class="input" name="selection" required placeholder="e.g. Chiefs -3" data-autofocus></label>
      ${ui.select('book', api.sportsbooks.map((b) => [b.id, b.name]), store.get().books[0] || 'dk', 'Sportsbook')}
      ${ui.select('kind', KINDS, 'ev', 'Tool')}
      ${ui.select('sport', api.sports, 'NFL', 'Sport')}
      ${ui.select('market', ['Moneyline', 'Spread', 'Total', 'Player Prop', 'Parlay'], 'Moneyline', 'Market')}
      ${ui.numberInput('price', -110, 'Odds (American)', { step: 5, min: -10000 })}
      ${ui.numberInput('stake', store.get().unit || 50, 'Stake', { prefix: '$', step: 5 })}
      ${ui.numberInput('clv', 0, 'CLV % (optional)', { step: 0.5, min: -100 })}</form>`,
    { footer: '<button class="btn primary" type="submit" form="tk-f">Add to tracker</button><button class="btn ghost" type="button" data-close-form>Cancel</button>' });
    body.footer.querySelector('[data-close-form]').addEventListener('click', ui.closeDrawer);
    body.querySelector('#tk-f').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (s) => body.querySelector(s).value;
      const price = parseFloat(q('[data-num="price"]'));
      const stake = parseFloat(q('[data-num="stake"]'));
      if (!(Math.abs(price) >= 100) || !(stake > 0)) { ui.toast('Enter valid odds (±100 or more) and a stake'); return; }
      T.add({ selection: q('[name="selection"]'), book: q('[data-sel="book"]'), kind: q('[data-sel="kind"]'), sport: q('[data-sel="sport"]'), market: q('[data-sel="market"]'),
        price, stake, clv: (parseFloat(q('[data-num="clv"]')) || 0) / 100 });
      ui.toast('Bet added'); ui.closeDrawer();
    });
  }

  function exportCsv() {
    const cols = ['id', 'placedAt', 'kind', 'group', 'book', 'sport', 'market', 'selection', 'price', 'stake', 'bonus', 'status', 'pnl', 'clv'];
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered().map((b) => cols.map((c) => cell(c === 'placedAt' ? new Date(b.placedAt).toISOString() : c === 'book' ? api.bookById[b.book]?.name || b.book : c === 'pnl' ? b.pnl.toFixed(2) : c === 'clv' ? (b.clv || 0).toFixed(4) : b[c])).join(','));
    // Copy to the clipboard (file downloads are blocked when the app is shared as a page).
    const csv = [cols.join(','), ...rows].join('\n');
    const fallback = () => {
      const body = ui.drawer('Your bets as CSV', `<p class="muted">Select all and copy, then paste into a spreadsheet.</p><textarea class="input tk-csv" readonly>${ui.esc(csv)}</textarea>`, { wide: true });
      const ta = body.querySelector('textarea'); ta.focus(); ta.select();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(csv).then(() => ui.toast(`Copied ${rows.length} bets as CSV`), fallback);
    } else fallback();
  }

  $('#tk-add').addEventListener('click', addBet);
  $('#tk-csv').addEventListener('click', exportCsv);
  mountTable();
  const all = () => { drawFacts(); drawBets(); drawChart(); drawKinds(); drawHealth(); };
  all();
  const off = T.subscribe(() => all());
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(drawChart, 150); };
  window.addEventListener('resize', onResize);
  return () => { off(); fb.destroy?.(); table?.destroy(); healthTable.destroy(); window.removeEventListener('resize', onResize); clearTimeout(rt); };
}
