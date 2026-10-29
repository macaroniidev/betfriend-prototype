// Profit Boosts: today's boosts with boosted vs fair odds, boost EV, and the hedge that pays a profit
// whichever side wins (if both bets fill at these prices).
//
// Layout (UX rebuild, items B1–B17 + C7): results-first head, facts and filters on one row, one keyed ui.table
// (boost + hedge as slip lines, one primary per row: "Hedge $13.70" when a hedge pays, "Bet $25" otherwise),
// and a boost slip drawer with the two-step Bet both (ui.legFlow), the boost calculator and the stale-price guard.

import { patchFacts } from './middles.js';

const CSS = `
.bo .bo-name { font-weight:700; }
.bo .bo-sub { display:flex; flex-wrap:nowrap; gap:4px 6px; align-items:center; font-size:var(--t-xs); color:var(--muted); margin-top:3px; min-width:0; }
.bo .bo-sub > span:first-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bo .bo-odds { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
.bo .strike { text-decoration:line-through; color:var(--muted); font-size:var(--t-sm); font-variant-numeric:tabular-nums; }
.bo .arrow { color:var(--muted); }
.bo .boostpct { background:var(--warn-bg); color:var(--warn); }
.bo .bo-prof { display:inline-flex; flex-direction:column; align-items:flex-end; gap:5px; }
.bo .bo-prof .cost { color:var(--muted); font-weight:700; }
.bo [data-lock-slot]:empty { display:none; }
.bo [data-lock-slot] { margin-top:12px; }
.bo .bo-bar { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px 28px; margin:0 0 12px; }
.bo .bo-bar .stats.facts { margin:0; }
.bo .bo-bar .toolbar.fb { margin:0; }
@media (min-width:861px) {
  /* Table tools (density, Columns) ride in the empty actions header instead of taking their own row. */
  .bo .tbl-tools { position:absolute; top:0; right:0; z-index:calc(var(--z-thead) + 1); padding:2px 0 0; }
  .bo .tbl-tools [data-tbl-density] span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .bo .tbl.scrolls .ui-t th { top:0; }
  .bo .ui-t td[data-col="boost"] { min-width:170px; max-width:205px; }
  .bo .tbl[data-density="compact"] .ui-t th, .bo .tbl[data-density="compact"] .ui-t td { padding-inline:8px; }
}
@media (max-width:520px) {
  /* Keep the three Show options on one line on phones. */
  .bo .page-head [data-seg="show"] { flex-wrap:nowrap; }
  .bo .page-head [data-seg="show"] button { padding-inline:7px; white-space:nowrap; }
}
@media (max-width:860px) {
  .bo td[data-col="boost"] .bo-name { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
}
/* Boost slip (drawer) */
.bo-slip { display:grid; gap:16px; }
.bo-slip .bs-head { font-size:var(--t-sm); display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.bo-slip .bs-bets { display:flex; flex-wrap:wrap; gap:8px; }
.bo-slip .bs-in { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.bo-slip .bs-in .field input { width:100%; }
.bo-slip .bs-figs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 10px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:12px 0; }
.bo-slip .bs-figs > div { display:grid; gap:4px; }
.bo-slip .bs-figs span { font-size:var(--t-xs); color:var(--muted); font-weight:700; }
.bo-slip .bs-figs .hero-fig { align-items:flex-start; }
.bo-slip .bs-figs .hero-fig b { font-size:var(--t-xl); }
.bo-slip .bs-note { font-size:var(--t-xs); color:var(--muted); margin:0; }
.bo-slip .bs-links { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; }
@media (max-width:520px) { .bo-slip .bs-in { grid-template-columns:1fr 1fr; } .bo-slip .bs-figs .hero-fig b { font-size:var(--t-lg); } }`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-bo')) document.head.insertAdjacentHTML('beforeend', `<style id="css-bo">${CSS}</style>`);
  const P = api.promos;
  const short = (b) => api.bookById[b]?.short || b;
  const name = (b) => api.bookById[b]?.name || b;
  const eventName = (id) => { const e = api.eventById(id); return e ? `${e.away} @ ${e.home}` : ''; };
  const signed = (x) => `${x < 0 ? '−' : '+'}${odds.money(Math.abs(x))}`;
  /** A hedge pays a profit whichever side wins (if both fill). */
  const hedged = (b) => !!(b.hedge && b.hedge.profit > 0);

  let list = [];
  const load = () => { list = P.boosts({ state: store.get().state, books: store.get().books }); return list; };
  load();
  const booksIn = [...new Set(list.map((b) => b.book))];
  const sportsIn = [...new Set(list.map((b) => b.sport))];

  // "Show" is the screen's one switch (like Pre-match / Live elsewhere): ?show=ev|hedge, remembered per route.
  let show = ui.initialMode(params, 'all', ['all', 'ev', 'hedge'], 'show');
  const SHOW = [['all', 'All boosts'], ['ev', '+EV only'], ['hedge', 'Hedged profit']];
  root.innerHTML = `<div class="bo">
    ${ui.pageHead({
      title: 'Profit Boosts', tool: 'boosts', live: true,
      subtitle: 'Every boost posted today, priced against sharp fair odds. Hedge the other side at another book to keep a profit whichever side wins, or ride the +EV ones.',
      actions: ui.modeSwitch(SHOW.map(([v, l]) => [v, l, 0]), show, { name: 'show', label: 'Show' }),
    })}
    <div class="bo-bar"><div data-facts></div><div data-filters></div></div>
    <div data-table></div>
    <div data-lock-slot></div>
    ${ui.how({
      summary: 'Books pay extra on a boosted bet. Hedge it and keep the difference.',
      checks: [
        `A boost pays more than the ${ui.term('fair', 'fair odds')}, so it’s worth more than it costs`,
        'Bet the boost up to its max stake, then bet the other side at another book or exchange',
        'Sized right, you keep about the same profit whichever side wins, as long as both bets fill at these prices',
        'Or skip the hedge and ride the boost: worth more on average, but it can lose',
      ],
    })}
  </div>`;
  const q = (s) => root.querySelector(s);

  // ---- filters: Sport · Sportsbook · Books (hedge books) ----
  const fb = ui.filterBar({
    id: 'boosts',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...sportsIn], query: true },
      { key: 'book', type: 'select', label: 'Sportsbook', default: 'All', options: [['All', 'All books'], ...booksIn.map((b) => [b, name(b)])], role: 'market' },
      { key: 'books', type: 'books', label: 'Hedge books' },
    ],
    onChange: () => paint(),
  });
  q('[data-filters]').append(fb.el);
  const showOk = (b, v = show) => v === 'all' || (v === 'ev' ? b.ev > 0 : hedged(b));
  const filtered = () => list.filter((b) => (fb.values.book === 'All' || b.book === fb.values.book) && (fb.values.sport === 'All' || b.sport === fb.values.sport));
  const view = () => filtered().filter((b) => showOk(b));

  // ---- table ----
  const legsOf = (b) => [
    // The boost leg's stake is the book's max stake for the boost.
    { book: b.book, price: b.boostedPrice, side: 'Boost', stake: `${odds.money(b.maxStake, 0)} <small class="muted">max</small>` },
    ...(b.hedge ? [{ book: b.hedge.book, price: b.hedge.price, side: b.hedge.outcome, stake: b.hedge.stake }] : []),
  ];
  const t = ui.table({
    id: 'boosts', caption: 'Profit boosts posted today', rowKey: (b) => b.id,
    columns: [
      { key: 'boost', label: 'Boost', render: (b) => `<div class="bo-name">${ui.esc(b.title)}</div><div class="bo-sub"><span>${ui.esc(eventName(b.eventId))}</span> ${ui.sport(b.sport)}</div>` },
      { key: 'odds', label: 'Odds', pri: 3, render: (b) => `<span class="bo-odds"><span class="strike" aria-label="was ${odds.fmtAmerican(b.originalPrice)}">${ui.fmtOdds(b.originalPrice)}</span><span class="arrow" aria-hidden="true">→</span>${ui.price(b.boostedPrice, { best: true })} <span class="tag boostpct">+${Math.round(b.boostPct * 100)}%</span></span>` },
      { key: 'fair', label: 'Fair', align: 'r', pri: 3, title: ui.termTitle('fair'), render: (b) => ui.price(b.fairPrice) },
      { key: 'ev', label: 'Boost EV', align: 'r', sort: (b) => b.ev, title: ui.termTitle('ev'), render: (b) => ui.edge(b.ev) },
      { key: 'legs', label: 'Boost and hedge', render: (b) => `${ui.slipLegs(legsOf(b))}${b.hedge ? '' : `<span class="muted">No hedge at your books</span>`}` },
      // Hedged profit carries the row's one risk label: hedged (pays either way if both fill) or ride (can lose).
      { key: 'profit', label: 'Hedged profit', align: 'r', sort: (b) => (b.hedge ? b.hedge.profit : -Infinity), trend: (b) => b.hedge?.profit ?? 0,
        render: (b) => `<span class="bo-prof">${!b.hedge ? ui.na('No hedge') : hedged(b) ? ui.heroFig(signed(b.hedge.profit), 'if both fill') : `<b class="cost">${signed(b.hedge.profit)}</b>`}${ui.risk(hedged(b) ? 'hedged-boost' : 'boost', { short: true })}</span>` },
    ],
    action: (b) => ui.actions(hedged(b)
      ? ui.betAction({ verb: 'Hedge', amount: odds.money(b.hedge.stake) })
      : ui.betAction({ verb: 'Bet', amount: odds.money(b.maxStake, 0), book: b.book }), [['calc', 'Calc'], ['log', 'Log']]),
    onAction: {
      bet: (b) => openSlip(b, { start: true }),
      calc: (b) => openSlip(b, { focusCalc: true }),
      log: (b) => logBoost(b, { stake: b.maxStake, boosted: b.boostedPrice, hedge: b.hedge?.price }, hedged(b)),
    },
    onOpen: (b) => openSlip(b),
    sort: { key: 'ev', dir: 'desc' },
    mobile: { areas: ['boost boost ev', 'legs legs profit', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => ui.empty({
      title: 'No boosts match these filters',
      msg: `Nothing posted today in ${ui.esc(store.get().state)} matches. Show every boost, or get pinged when a new one beats fair odds.`,
      actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Show all boosts', act: 'show-all' }, { label: 'Alert me', href: '#/alerts?tool=boosts&min=5' }],
      near: [...list].sort((a, b) => b.ev - a.ev).slice(0, 3).map((b) => `<div>${ui.esc(b.title)} · <b>${odds.pct(b.ev)}</b> at ${ui.esc(short(b.book))}</div>`).join(''),
      nearLabel: 'Best boosts today',
      mate: true,
    }),
  });
  q('[data-table]').append(t.el);
  ui.onAction(q('[data-table]'), { reset: () => fb.reset(), 'show-all': () => { q('.page-head [data-seg="show"] button[data-v="all"]')?.click(); fb.reset(); } });
  ui.onMode(root, (v) => { show = v; paint(); }, { name: 'show', param: 'show', def: 'all' });

  function facts() {
    const lockable = list.filter(hedged);
    const best = [...list].sort((a, b) => b.ev - a.ev)[0];
    return [
      { label: 'Boosts today', value: String(list.length), note: `${new Set(list.map((b) => b.book)).size} books in ${ui.esc(store.get().state)}` },
      { label: 'Positive EV', value: String(list.filter((b) => b.ev > 0).length), note: 'vs sharp fair odds', term: 'ev' },
      { label: 'Hedged profit today', value: signed(lockable.reduce((a, b) => a + b.hedge.profit, 0)), tone: 'pos', note: `${lockable.length} boosts at max stake` },
      { label: 'Best boost EV', value: best ? odds.pct(best.ev) : ui.na(), tone: 'pos', note: best ? `at ${ui.esc(short(best.book))}` : '' },
    ];
  }
  function paint() {
    const rows = view();
    const { rows: shown, card } = ui.lockRows(rows, 'boosts', { n: 3, noun: 'boosts' });
    t.update(shown);
    const slot = q('[data-lock-slot]');
    if (slot.innerHTML !== card) slot.innerHTML = card;
    patchFacts(q('[data-facts]'), facts(), ui);
    const base = filtered();
    for (const [v] of SHOW) ui.setModeCount(root, v, base.filter((b) => showOk(b, v)).length, 'show');
  }
  paint();

  // ---- logging ----
  /** Log the boost (and its hedge as a linked, exclusive group when `both`). */
  function logBoost(b, C, both) {
    const base = { kind: 'promo', sport: b.sport, market: b.market, event: eventName(b.eventId) };
    const boostBet = { ...base, book: b.book, selection: `${b.title} (boost)`, price: C.boosted, stake: C.stake };
    if (both && b.hedge) {
      const h = odds.boostHedge(C.stake, C.boosted, C.hedge);
      api.tracker.addGroup([boostBet, { ...base, book: b.hedge.book, selection: `${b.hedge.outcome} (hedge)`, price: C.hedge, stake: Math.round(h.hedgeStake * 100) / 100 }], { exclusive: true });
      ui.toast('Both bets logged to your Bet Tracker');
    } else {
      api.tracker.add(boostBet);
      ui.toast('Boost logged to your Bet Tracker');
    }
    if (ui.legFlow.get()?.id === b.id) ui.legFlow.clear();
  }

  /**
   * Boost slip: the boost leg and its hedge with stakes, per-leg buttons (one deep link per tap), the
   * two-step Bet both, the boost calculator (stake, boosted odds, hedge odds) and the stale-price guard.
   * opts.start: the row's primary was pressed → open leg 1 (the boost) now. opts.focusCalc: start in the inputs.
   */
  function openSlip(b0, { start = false, focusCalc = false } = {}) {
    let b = b0;
    const C = { stake: b.maxStake, boosted: b.boostedPrice, hedge: b.hedge?.price ?? -110 };
    const hasHedge = () => !!b.hedge;
    const calc = () => {
      const h = odds.boostHedge(C.stake, C.boosted, C.hedge);
      return { ...h, ride: C.stake * odds.ev(b.fairProb, C.boosted), boostWins: C.stake * (odds.toDecimal(C.boosted) - 1) - h.hedgeStake, hedgeWins: h.hedgeStake * (odds.toDecimal(C.hedge) - 1) - C.stake };
    };
    const legs = (r) => [
      { book: b.book, price: C.boosted, side: b.title, stake: C.stake, label: 'Boost at', what: `${b.title} (boost)` },
      ...(hasHedge() ? [{ book: b.hedge.book, price: C.hedge, side: b.hedge.outcome, stake: r.hedgeStake, label: 'Hedge at', what: `${b.hedge.outcome} (hedge)` }] : []),
    ];
    const flowLegs = () => { const f = ui.legFlow.get(); return f && f.id === b.id ? f.legs : null; };

    const linesHtml = (r) => {
      const L = legs(r);
      const fl = flowLegs();
      return `${ui.slipLegs(L)}${ui.cashNeeded(L)}
        <div class="bs-bets">${L.map((l, i) => ui.betAction({
          verb: fl?.[i]?.opened ? 'Opened ✓' : l.label, amount: `${ui.esc(short(l.book))} · ${odds.money(l.stake)}`,
          act: 'leg', book: l.book, tone: fl?.[i]?.opened ? 'outline' : 'primary', autofocus: i === 0 && !focusCalc, attrs: { 'data-leg': i },
        })).join('')}</div>`;
    };
    const figsHtml = (r) => `<div><span>Hedge stake ${hasHedge() ? `at ${ui.esc(short(b.hedge.book))}` : ''}</span>${ui.heroFig(odds.money(r.hedgeStake), '', { tone: '' })}</div>
      <div><span>Hedged profit (either result)</span>${ui.heroFig(signed(r.profit), '', { tone: r.profit >= 0 ? 'pos' : '' })}</div>
      <div><span>Return on cash outlay</span>${ui.heroFig(odds.pct(r.profit / (C.stake + r.hedgeStake)), '', { tone: '' })}</div>
      <div><span>Let it ride: ${ui.term('ev', 'expected value')}</span>${ui.heroFig(signed(r.ride), '', { tone: r.ride >= 0 ? 'pos' : '' })}</div>`;
    const kvHtml = (r) => `<dt>Boost wins</dt><dd>${signed(r.boostWins)}</dd><dt>Hedge wins</dt><dd>${signed(r.hedgeWins)}</dd>
      <dt>Fair odds (sharp)</dt><dd>${ui.price(b.fairPrice)}</dd><dt>Boost EV</dt><dd>${odds.pct(odds.ev(b.fairProb, C.boosted))}</dd>`;
    const footHtml = (r) => {
      const fl = flowLegs();
      const n = legs(r).length;
      const next = fl ? fl.findIndex((l) => !l.opened) : 0;
      const primary = !fl
        ? (n > 1 ? ui.betAction({ verb: 'Bet both', amount: odds.money(C.stake + r.hedgeStake, 0), size: '' }) : ui.betAction({ verb: 'Bet', amount: odds.money(C.stake, 0), book: b.book, size: '' }))
        : next === -1 ? ui.betAction({ verb: n > 1 ? 'Log both bets' : 'Log bet', act: 'confirm', size: '' })
          : ui.betAction({ verb: `Next: leg ${next + 1}`, amount: ui.esc(short(legs(r)[next].book)), act: 'leg', book: legs(r)[next].book, size: '', attrs: { 'data-leg': next } });
      const done = fl && next === -1;
      return `${primary}${!done && hasHedge() ? ui.ghost('log', 'Log both bets') : ''}${ui.ghost('ride', 'Log boost only')}${ui.ghost('alert', 'Alert', { href: '#/alerts?tool=boosts&min=5' })}`;
    };

    const r0 = calc();
    const body = ui.drawer('Boost slip', `<div class="bo-slip">
      <div class="bs-head">${ui.book(b.book, { full: true })} boosted <span class="strike">${ui.fmtOdds(b.originalPrice)}</span> → ${ui.price(b.boostedPrice, { best: true })} <span class="tag boostpct">+${Math.round(b.boostPct * 100)}%</span></div>
      <div data-lines>${linesHtml(r0)}</div>
      <div class="bs-in">
        ${ui.numberInput('stake', C.stake, `Stake (max ${odds.money(b.maxStake, 0)})`, { prefix: '$', step: 5 })}
        ${ui.numberInput('boosted', C.boosted, 'Boosted odds', { step: 5, min: -10000 })}
        ${ui.numberInput('hedge', C.hedge, 'Hedge odds', { step: 5, min: -10000 })}
      </div>
      <div class="bs-figs" data-figs>${figsHtml(r0)}</div>
      <dl class="kv" data-kv>${kvHtml(r0)}</dl>
      <p class="bs-note">${hasHedge() ? 'Place the boost first: books cap boosts at the max stake and can pull them. Then place the hedge, and check both prices before you submit.' : 'No hedge is open at your books for this one. Riding it is worth more than it costs on average, but it can lose.'}</p>
      <div class="bs-links">${ui.calcLink({ tab: 'arb', a: C.boosted, b: C.hedge, stake: C.stake + r0.hedgeStake })}</div>
      ${ui.related([['promo-converter', 'Promo Converter'], ['low-holds', 'Low Holds'], ['tracker', 'Bet Tracker']])}
    </div>`, { risk: hedged(b) ? 'hedged-boost' : 'boost', kicker: `${ui.esc(b.title)} · ${ui.esc(eventName(b.eventId))}`, footer: footHtml(r0) });

    const repaint = () => {
      const r = calc();
      body.querySelector('[data-lines]').innerHTML = linesHtml(r);
      body.querySelector('[data-figs]').innerHTML = figsHtml(r);
      body.querySelector('[data-kv]').innerHTML = kvHtml(r);
      body.setFooter(footHtml(r));
      return r;
    };
    const openLeg = (i) => {
      if (!flowLegs()) {
        const r = calc();
        ui.legFlow.start({
          id: b.id, title: `${b.title} · boost${hasHedge() ? ' + hedge' : ''}`, exclusive: true,
          legs: legs(r).map((l) => ({ book: l.book, label: l.side, stake: l.stake,
            bet: { kind: 'promo', sport: b.sport, market: b.market, event: eventName(b.eventId), book: l.book, selection: l.what, price: l.price, stake: Math.round(l.stake * 100) / 100 } })),
        });
      }
      ui.legFlow.open(i);
      repaint();
    };
    ui.onAction(body.panel, {
      bet: () => openLeg(0),
      leg: (_, el) => openLeg(+el.dataset.leg),
      confirm: () => { ui.legFlow.confirm(); repaint(); },
      log: () => { logBoost(b, C, true); repaint(); },
      ride: () => { logBoost(b, C, false); repaint(); },
    });
    ui.onNumber(body, 'stake', (v) => { if (v > 0) { C.stake = Math.min(v, b.maxStake * 4); repaint(); } });
    ui.onNumber(body, 'boosted', (v) => { if (Math.abs(v) >= 100) { C.boosted = v; repaint(); } });
    ui.onNumber(body, 'hedge', (v) => { if (Math.abs(v) >= 100) { C.hedge = v; repaint(); } });
    // Stale-price guard: the hedge price moves with the market; the boost is fixed until the book pulls it.
    ui.liveGuard(body, {
      read: () => P.boosts({ state: store.get().state, books: store.get().books }).find((x) => x.id === b.id) || null,
      sig: (x) => `${x.hedge?.book}:${x.hedge?.price}`,
      onUpdate: (nb) => {
        const before = calc().profit;
        const typed = C.hedge !== (b.hedge?.price ?? -110);
        b = nb;
        if (!typed && b.hedge) {
          C.hedge = b.hedge.price;
          const inp = body.querySelector('[data-num="hedge"]');
          if (inp && inp !== document.activeElement) inp.value = C.hedge;
        }
        const r = repaint();
        return typed ? 'The hedge price moved. Your typed odds are kept: check them before you bet.' : `Hedge price moved: profit now ${signed(r.profit)} (was ${signed(before)})`;
      },
      goneMsg: 'This boost is gone: the book pulled it. Nothing was placed.',
    });
    if (focusCalc) requestAnimationFrame(() => body.querySelector('[data-num="stake"]')?.focus());
    if (start) openLeg(0);
  }

  // Deep link from the Daily Card: #/boosts?id=<boost id> opens that boost's slip.
  if (params.id) {
    const hit = list.find((b) => b.id === params.id);
    if (hit) setTimeout(() => openSlip(hit), 0);
    else ui.toast('That boost is gone. Here are today’s boosts.');
  }

  const offTick = api.onTick(() => { load(); paint(); });
  const offStore = store.subscribe(() => { load(); paint(); });
  return () => { offTick(); offStore(); fb.destroy?.(); t.destroy(); };
}
