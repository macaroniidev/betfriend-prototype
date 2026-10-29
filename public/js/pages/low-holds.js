// Low hold finder + VIP / rollover planner.
// Two-sided bets at different books that cost a little whichever side wins: the cheapest way to clear playthrough.
// Results are signed everywhere on this screen: "-$12.30" is a cost, "+$3.10" a profit, "Free" rounds to zero.
//
// Layout (UX rebuild, items B1–B17 + C7): results-first head with live status, facts and filters on one row,
// one keyed ui.table (legs as slip lines, one "Bet both" primary, Calc · Log), a low-hold slip drawer with the
// two-step Bet both (ui.legFlow), per-leg anchoring for book max bets and the stale-price guard, then the
// rollover planner as its own section. The classic calculator (../slips.js openArbCalc) opens from "Calc".

import { openArbCalc, signedMoney } from '../slips.js';
import { toDecimal, hold as holdOf, money, pct, fmtAmerican, arbStakes } from '../lib/odds.js';
import { patchFacts } from './middles.js';

const CSS = `
.bf-lh .holdv { font:900 var(--t-lg)/1 var(--f-head); font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-lh .holdv.zero { color:var(--pos); }
.bf-lh .lh-mkt { margin-bottom:4px; font-size:var(--t-xs); font-weight:700; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }
.bf-lh .lh-res { display:inline-flex; flex-direction:column; align-items:flex-end; gap:5px; }
.bf-lh .lh-res small { font-size:var(--t-xs); color:var(--muted); font-weight:600; white-space:nowrap; }
.bf-lh [data-lock-slot]:empty { display:none; }
.bf-lh [data-lock-slot] { margin-top:12px; }
.bf-lh .lh-bar { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px 28px; margin:0 0 12px; }
.bf-lh .lh-bar .stats.facts { margin:0; }
.bf-lh .lh-bar .toolbar.fb { margin:0; }
@media (min-width:861px) {
  /* Table tools (density, Columns) ride in the empty actions header instead of taking their own row. */
  .bf-lh [data-table] .tbl-tools { position:absolute; top:0; right:0; z-index:calc(var(--z-thead) + 1); padding:2px 0 0; }
  .bf-lh [data-table] .tbl-tools [data-tbl-density] span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .bf-lh .tbl.scrolls .ui-t th { top:0; }
  .bf-lh [data-table] .ui-t td[data-col="event"] { min-width:150px; }
}
@media (max-width:860px) {
  .bf-lh td[data-col="event"] .evt-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bf-lh .lh-mkt { max-width:none; }
  .bf-lh .holdv { font-size:var(--t-md); }
}
/* Rollover planner */
.bf-lh .lh-plan { display:grid; grid-template-columns:minmax(240px,300px) minmax(0,1fr); gap:20px 28px; align-items:start; }
.bf-lh .lh-plan-form { display:grid; gap:12px; }
.bf-lh .lh-plan-form .field, .bf-lh .lh-plan-form select { width:100%; }
.bf-lh .lh-plan-form .num input { width:100%; }
.bf-lh .lh-plan-intro { margin:0; color:var(--muted); font-size:var(--t-sm); }
.bf-lh .lh-prog { margin:10px 0 4px; font-size:var(--t-sm); color:var(--muted); display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.bf-lh .lh-plan .stats.facts { margin-top:0; }
.bf-lh .lh-plan-t td { vertical-align:middle; }
.bf-lh .lh-plan-t .pl-main { font-weight:700; }
.bf-lh .lh-plan-t .pl-sub { font-size:var(--t-xs); color:var(--muted); }
.bf-lh .lh-plan-t td.r { text-align:right; }
.bf-lh .lh-plan-more { font-size:var(--t-sm); color:var(--muted); margin:8px 0 0; }
.bf-lh .lh-plan-acts { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
@media (max-width:980px) { .bf-lh .lh-plan { grid-template-columns:1fr; } }
@media (max-width:860px) {
  .bf-lh .lh-plan-t thead { display:none; }
  .bf-lh .lh-plan-t, .bf-lh .lh-plan-t tbody { display:block; }
  .bf-lh .lh-plan-t tr { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:10px 0; border-bottom:2px solid var(--line-2); }
  .bf-lh .lh-plan-t td { display:block; padding:0; border:0; }
  .bf-lh .lh-plan-t td.act { grid-column:1 / -1; text-align:right; }
}
/* Low-hold slip (drawer) */
.lh-slip { display:grid; gap:16px; }
.lh-slip .lh-legs { width:100%; border-collapse:collapse; font-size:var(--t-cell); }
.lh-slip .lh-legs th { text-align:left; font-size:var(--t-xs); text-transform:uppercase; letter-spacing:.04em; color:var(--muted); padding:6px; border-bottom:1px solid var(--line); }
.lh-slip .lh-legs td { padding:8px 6px; border-bottom:1px solid var(--line-2); vertical-align:middle; font-variant-numeric:tabular-nums; }
.lh-slip .lh-legs .r { text-align:right; }
.lh-slip .lh-legs .oc { font-weight:700; }
.lh-slip .lh-legs input { width:88px; border:2px solid var(--line-strong); border-radius:8px; padding:6px 8px; background:var(--paper); color:var(--text); font-variant-numeric:tabular-nums; }
.lh-slip .lh-legs input.anch { border-color:var(--g); }
.lh-slip .ls-bets { display:flex; flex-wrap:wrap; gap:8px; }
.lh-slip .ls-ctl { display:flex; flex-wrap:wrap; gap:10px 14px; align-items:flex-end; }
.lh-slip .ls-ctl .field input { width:110px; }
.lh-slip .ls-note { font-size:var(--t-xs); color:var(--muted); margin:0; }
.lh-slip .ls-figs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:12px 0; }
.lh-slip .ls-figs > div { display:grid; gap:4px; }
.lh-slip .ls-figs span { font-size:var(--t-xs); color:var(--muted); font-weight:700; }
.lh-slip .ls-figs .hero-fig { align-items:flex-start; }
.lh-slip .ls-figs .hero-fig b { font-size:var(--t-xl); }
.lh-slip h3 { font-size:var(--t-md); margin:0 0 6px; }
.lh-slip .sc { width:100%; border-collapse:collapse; font-size:var(--t-cell); }
.lh-slip .sc th { text-align:right; font-size:var(--t-xs); color:var(--muted); text-transform:uppercase; letter-spacing:.04em; padding:6px; border-bottom:1px solid var(--line); }
.lh-slip .sc td { text-align:right; padding:8px 6px; border-bottom:1px solid var(--line-2); font-variant-numeric:tabular-nums; }
.lh-slip .sc th:first-child, .lh-slip .sc td:first-child { text-align:left; }
.lh-slip .sc .pos { color:var(--pos); font-weight:800; } .lh-slip .sc .cost { color:var(--muted); font-weight:700; }
.lh-slip .ls-links { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; }
@media (max-width:520px) {
  .lh-slip .lh-legs thead { display:none; }
  .lh-slip .lh-legs tr { display:grid; grid-template-columns:1fr auto; gap:6px 10px; padding:10px 0; border-bottom:1px solid var(--line-2); }
  .lh-slip .lh-legs td { border:0; padding:0; }
  .lh-slip .lh-legs td[data-label]::before { content:attr(data-label) " "; color:var(--muted); font-size:var(--t-xs); margin-right:4px; }
  .lh-slip .ls-figs .hero-fig b { font-size:var(--t-lg); }
}`;

/** Best low-hold pairings where one leg sits on `bookId` (the book you need playthrough on). */
function rolloverLines(api, bookId, myBooks, maxHold) {
  const out = [];
  for (const line of api.lines()) {
    const mine = line.prices[bookId];
    if (!mine || line.outcomes.length !== 2) continue;
    for (let i = 0; i < 2; i++) {
      const j = 1 - i;
      let hedge = null;
      for (const b of myBooks) {
        if (b === bookId || !line.prices[b] || api.bookById[b]?.type !== 'sportsbook') continue;
        if (!hedge || line.prices[b][j] > hedge.price) hedge = { book: b, price: line.prices[b][j] };
      }
      if (!hedge) continue;
      const h = holdOf([mine[i], hedge.price]);
      if (h > maxHold + 0.015) continue;
      const e = api.eventById(line.eventId);
      const legs = [];
      legs[i] = { outcome: line.outcomes[i], book: bookId, price: mine[i] };
      legs[j] = { outcome: line.outcomes[j], book: hedge.book, price: hedge.price };
      out.push({ id: `ro-${line.id}-${i}-${hedge.book}`, kind: 'lowhold', lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market,
        label: line.label, event: `${e.away} @ ${e.home}`, start: e.start, live: line.live, legs, edge: -h, meta: { hold: h, mineIdx: i } });
    }
  }
  return out.sort((a, b) => a.meta.hold - b.meta.hold);
}

/** Cost per $1 of playthrough on the target leg: hedge sized so both outcomes return the same. */
function costPerDollar(o) {
  const i = o.meta.mineIdx, j = 1 - i;
  const pay = toDecimal(o.legs[i].price);
  const hedge = pay / toDecimal(o.legs[j].price);
  return { cost: 1 + hedge - pay, hedge };
}

/** Hold as a percentage, or "Free" when it rounds to 0.00%. */
const holdText = (h) => (Math.abs(h) < 0.00005 ? 'Free' : pct(h, 2));
/** Result of a play from its cost `c` (result = -c): a profit is green, a cost stays neutral (never red). */
const resultHtml = (c) => `<span class="${c < -0.005 ? 'pos' : 'muted'}"><b>${signedMoney(-c)}</b></span>`;

export default function render(root, ctx) {
  const { api, store, ui, params } = ctx;
  if (!document.getElementById('css-low-holds')) document.head.insertAdjacentHTML('beforeend', `<style id="css-low-holds">${CSS}</style>`);
  const myBooks = () => store.get().books;
  const st = { mode: ui.initialMode(params, 'pre', ['pre', 'live']), req: 5000, book: myBooks()[0] || 'dk', maxBet: 500 };
  const seen = new Map(); // opp id → first time we saw it (Age column)
  const short = (b) => api.bookById[b]?.short || b;
  const roundPref = () => ([0, 1, 5].includes(+store.get().stakeRound) ? +store.get().stakeRound : 0);

  root.innerHTML = `<div class="bf-lh">
    ${ui.pageHead({
      title: 'Low Holds', tool: 'low-holds', live: true,
      subtitle: 'Bet both sides at different books for a small cost whichever side wins. The cheapest way to clear playthrough on a bonus: run your rollover for pennies on the dollar.',
      actions: ui.modeSwitch([['pre', 'Pre-match', 0], ['live', 'Live', 0]], st.mode),
    })}
    <div class="lh-bar"><div data-facts></div><div data-filters></div></div>
    <div data-table></div>
    <div data-lock-slot></div>
    ${ui.sec('VIP / rollover planner', `<div class="lh-plan">
      <div class="lh-plan-form" data-plan-form></div>
      <div data-plan></div></div>`, { id: 'lh-planner' })}
    ${ui.how({
      summary: 'Bet both sides for a small, known cost to clear playthrough.',
      checks: [
        `Every line has a ${ui.term('hold')}: the book’s margin. A low hold means both sides together cost almost nothing`,
        'Bet one side at the book you need volume on and the other side at another book',
        'Whichever side wins, you get back almost all of the money: the small difference is the cost of the rollover',
        `Use it to clear ${ui.term('playthrough')} on a bonus or to build VIP volume, then withdraw`,
      ],
    })}
  </div>`;
  const q = (s) => root.querySelector(s);

  // ---- filters: Sport · Max hold · Books, plus the playthrough amount that sizes every row ----
  const fb = ui.filterBar({
    id: 'low-holds',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'maxHold', type: 'number', label: 'Max hold %', default: 2, step: 0.1, min: 0, query: true, chip: (v) => `Hold ≤ ${v}%` },
      { key: 'amount', type: 'number', label: 'Playthrough to run', default: 1000, prefix: '$', step: 100, min: 10, count: false },
      { key: 'books', type: 'books', label: 'Books' },
    ],
    onChange: (_, key) => { paintTable(); if (key === 'maxHold' || key === 'books' || key === 'reset') paintPlan(); },
  });
  q('[data-filters]').append(fb.el);
  const X = () => Math.max(10, +fb.values.amount || 1000);
  const maxHold = () => Math.max(0, Math.min(10, +fb.values.maxHold || 0)) / 100;

  // ---- data ----
  const load = (mode = st.mode) => api.lowHolds({ books: myBooks(), live: mode === 'live', sport: fb.values.sport, maxHold: maxHold() })
    .map((o) => {
      if (!seen.has(o.id)) seen.set(o.id, Date.now());
      const r = arbStakes(o.legs.map((l) => l.price), X());
      return { o, stakes: r.stakes, cost: -r.profit };
    });

  // ---- table ----
  const t = ui.table({
    id: 'low-holds', caption: 'Low-hold lines at your books', rowKey: (r) => r.o.id,
    columns: [
      { key: 'hold', label: 'Hold', sort: (r) => r.o.meta.hold, trend: (r) => -r.o.meta.hold, title: ui.termTitle('hold'),
        render: (r) => `<span class="holdv${r.o.meta.hold < 0.005 ? ' zero' : ''}">${holdText(r.o.meta.hold)}</span>` },
      { key: 'event', label: 'Event', render: (r) => ui.eventCell(r.o.eventId) },
      { key: 'legs', label: 'Legs', render: (r) => `<div class="lh-mkt">${ui.esc(r.o.label)}</div>${ui.slipLegs(r.o.legs.map((l, i) => ({ ...l, side: l.outcome, stake: r.stakes[i] })))}` },
      // The result carries the row's one risk label: a small known cost, used for rollover.
      { key: 'result', label: 'Result', align: 'r', sort: (r) => -r.cost, title: 'What the pair returns whichever side wins: a minus is the cost to run it',
        render: (r) => `<span class="lh-res">${ui.heroFig(signedMoney(-r.cost), '', { tone: r.cost <= 0.005 ? 'pos' : '' })}<small data-bf-nodata>on ${money(X(), 0)}</small>${ui.risk('lowhold', { short: true })}</span>` },
      { key: 'age', label: 'Age', align: 'r', sort: (r) => seen.get(r.o.id), render: (r) => `<span class="muted">${ui.age(seen.get(r.o.id))}</span>` },
    ],
    action: () => ui.actions(ui.betAction({ verb: 'Bet both' }), [['calc', 'Calc'], ['log', 'Log']]),
    onAction: {
      bet: (r) => openSlip(r.o, { start: true }),
      calc: (r) => openArbCalc(r.o, ctx, { kind: 'lowhold', total: X() }),
      log: (r) => logPlay(r.o, r.o.legs.map((l) => l.price), r.stakes),
    },
    onOpen: (r) => openSlip(r.o),
    sort: { key: 'hold', dir: 'asc' },
    mobile: { areas: ['hold event age', 'legs legs result', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => emptyState(),
  });
  q('[data-table]').append(t.el);

  function emptyState() {
    const other = st.mode === 'live' ? 'pre' : 'live';
    const looser = api.lowHolds({ books: myBooks(), live: st.mode === 'live', sport: fb.values.sport, maxHold: maxHold() + 0.01 }).slice(0, 3);
    return ui.empty({
      title: 'No low holds match right now',
      msg: 'Nothing is under this hold at your books. Raise the max hold a little, switch modes, or get pinged when one opens up.',
      actions: [
        { label: 'Raise max hold to ' + `${(maxHold() * 100 + 1).toFixed(1)}%`, act: 'looser' },
        ...(fb.activeCount() ? [{ label: 'Reset filters', act: 'reset' }] : []),
        { label: `Switch to ${other === 'live' ? 'Live' : 'Pre-match'} (${load(other).length})`, act: 'switch' },
        { label: 'Alert me', href: `#/alerts?tool=low-holds&min=${(maxHold() * 100).toFixed(1)}` },
      ],
      near: looser.map((o) => `<div>${ui.esc(o.event)} · <b>${holdText(o.meta.hold)}</b> ${ui.esc(o.label)}</div>`).join(''),
      nearLabel: 'Just above your max hold',
      mate: true,
    });
  }
  ui.onAction(q('[data-table]'), {
    looser: () => fb.set({ maxHold: Math.round((maxHold() * 100 + 1) * 10) / 10 }),
    reset: () => fb.reset(),
    switch: () => q(`.page-head [data-seg="mode"] button[data-v="${st.mode === 'live' ? 'pre' : 'live'}"]`)?.click(),
  });

  function facts(rows) {
    const best = rows.length ? Math.min(...rows.map((r) => r.cost)) : 0;
    return [
      { label: 'Low-hold lines', value: String(rows.length), note: `hold ≤ ${pct(maxHold(), 1)}` },
      { label: 'Lowest hold', value: rows.length ? holdText(Math.min(...rows.map((r) => r.o.meta.hold))) : ui.na(), tone: 'pos', term: 'hold' },
      { label: `Best result per ${money(X(), 0)}`, value: rows.length ? signedMoney(-best) : ui.na(), tone: rows.length && best <= 0.005 ? 'pos' : '', note: 'of playthrough' },
      { label: 'Avg hold', value: rows.length ? pct(rows.reduce((a, r) => a + r.o.meta.hold, 0) / rows.length, 2) : ui.na() },
    ];
  }

  function paintTable() {
    const rows = load();
    const { rows: shown, card } = ui.lockRows(rows, 'low-holds', { n: 3, noun: 'low-hold lines' });
    t.update(shown);
    const slot = q('[data-lock-slot]');
    if (slot.innerHTML !== card) slot.innerHTML = card;
    patchFacts(q('[data-facts]'), facts(rows), ui);
    ui.setModeCount(root, st.mode, rows.length);
    ui.setModeCount(root, st.mode === 'live' ? 'pre' : 'live', load(st.mode === 'live' ? 'pre' : 'live').length);
  }

  // ---- rollover planner ----
  function paintPlanForm() {
    if (!myBooks().includes(st.book)) st.book = myBooks()[0] || st.book;
    q('[data-plan-form]').innerHTML = `
      <p class="lh-plan-intro">Tell us what you need to roll over and where. We find the lowest-hold lines on that book and hedge them at your other books.</p>
      ${ui.numberInput('req', st.req, 'Playthrough required', { prefix: '$', step: 500 })}
      ${ui.select('pbook', myBooks().map((b) => [b, api.bookById[b]?.name || b]), st.book, 'On book')}
      ${ui.numberInput('maxbet', st.maxBet, 'Max bet per line', { prefix: '$', step: 50 })}`;
    const form = q('[data-plan-form]');
    ui.onNumber(form, 'req', (v) => { if (v > 0) { st.req = v; paintPlan(); } });
    ui.onNumber(form, 'maxbet', (v) => { if (v > 0) { st.maxBet = v; paintPlan(); } });
    ui.onSelect(form, 'pbook', (v) => { st.book = v; paintPlan(); });
  }
  let steps = [];
  function paintPlan() {
    const cands = rolloverLines(api, st.book, myBooks(), maxHold()).slice(0, 40);
    let left = st.req, cost = 0;
    steps = [];
    for (const o of cands) {
      if (left <= 0) break;
      const s = Math.min(st.maxBet, left);
      const c = costPerDollar(o);
      steps.push({ o, stake: s, hedge: c.hedge * s, cost: c.cost * s });
      cost += c.cost * s; left -= s;
    }
    const done = st.req - Math.max(0, left);
    const bk = api.bookById[st.book];
    const box = q('[data-plan]');
    if (!steps.length) {
      box.innerHTML = ui.empty({ title: 'No hedgeable lines on this book right now', msg: `Nothing at ${ui.esc(bk?.name || st.book)} pairs with your other books under this hold.`,
        actions: [{ label: 'Raise max hold', act: 'plan-looser' }, { label: 'Choose another book', act: 'plan-book' }] });
      return;
    }
    const free = cost <= 0.005;
    box.innerHTML = `${ui.facts([
      { label: 'Bets needed', value: String(steps.length) },
      { label: free ? 'Expected result' : 'Expected cost', value: signedMoney(-cost), tone: free ? 'pos' : '' },
      { label: 'Result per $100', value: signedMoney((-cost / Math.max(1, done)) * 100), tone: free ? 'pos' : '' },
    ])}
      <div class="lh-prog"><span data-bf-nodata>${money(done, 0)} of ${money(st.req, 0)}</span> rolled over on ${ui.book(st.book)}</div>
      <div class="bar"><i style="width:${Math.min(100, (done / st.req) * 100)}%"></i></div>
      <table class="t lh-plan-t"><thead><tr><th>Bet on <b data-bf-nodata>${ui.esc(bk?.short || '')}</b></th><th>Hedge</th><th class="r">Result</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody data-bf-nodata>${steps.slice(0, 8).map((x) => {
        const i = x.o.meta.mineIdx, j = 1 - i;
        return `<tr class="click" data-pid="${ui.esc(x.o.id)}" tabindex="0">
          <td><div class="pl-main">${ui.esc(x.o.legs[i].outcome)} ${ui.price(x.o.legs[i].price)}</div><div class="pl-sub">${money(x.stake, 0)} · ${ui.esc(x.o.event)}</div></td>
          <td><div>${ui.book(x.o.legs[j].book)} ${ui.price(x.o.legs[j].price)}</div><div class="pl-sub">${money(x.hedge)} on ${ui.esc(x.o.legs[j].outcome)}</div></td>
          <td class="r"><div>${resultHtml(x.cost)}</div><div class="pl-sub">hold ${pct(x.o.meta.hold, 2)}</div></td>
          <td class="act r">${ui.betAction({ verb: 'Bet both', attrs: { 'data-pid': x.o.id } })}</td></tr>`;
      }).join('')}</tbody></table>
      ${steps.length > 8 ? `<p class="lh-plan-more"><span data-bf-nodata>+ ${steps.length - 8}</span> more bets in this plan</p>` : ''}
      <div class="lh-plan-acts"><button type="button" class="btn outline" data-act="plan-log">Log first bet pair</button></div>`;
  }
  // Planner rows: click opens that pair's slip (anchored on the target book's stake); Bet both starts it.
  const planStep = (el) => steps.find((s) => s.o.id === el.closest('[data-pid]')?.dataset.pid);
  const openStep = (x, start = false) => {
    const i = x.o.meta.mineIdx;
    openSlip(x.o, { start, anchor: i, anchorStake: x.stake, read: () => rolloverLines(api, st.book, myBooks(), maxHold()).find((y) => y.id === x.o.id) || null });
  };
  ui.onAction(q('[data-plan]'), {
    bet: (_, el) => { const x = planStep(el); if (x) openStep(x, true); },
    'plan-log': () => {
      const x = steps[0];
      if (!x) return;
      const i = x.o.meta.mineIdx, j = 1 - i;
      const stakes = [];
      stakes[i] = x.stake; stakes[j] = Math.round(x.hedge * 100) / 100;
      logPlay(x.o, x.o.legs.map((l) => l.price), stakes);
    },
    'plan-looser': () => fb.set({ maxHold: Math.round((maxHold() * 100 + 1) * 10) / 10 }),
    'plan-book': () => q('[data-plan-form] select')?.focus(),
  });
  q('[data-plan]').addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, select')) return;
    const x = e.target.closest('tr[data-pid]') && planStep(e.target);
    if (x) openStep(x);
  });
  q('[data-plan]').addEventListener('keydown', (e) => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('tr[data-pid]')) return;
    e.preventDefault();
    const x = planStep(e.target);
    if (x) openStep(x);
  });

  // ---- logging and the two-step Bet both ----
  function logPlay(o, prices, stakes) {
    // Opposite sides of one market: exactly one leg can win, so the group settles together.
    api.tracker.addGroup(o.legs.map((l, i) => ({ kind: 'lowhold', book: l.book, sport: o.sport, market: o.market, selection: l.outcome,
      price: prices[i], stake: Math.round(stakes[i] * 100) / 100, event: o.event })), { exclusive: true });
    if (ui.legFlow.get()?.id === o.id) ui.legFlow.clear();
    ui.toast(`Logged ${fmtAmerican(prices[0])} / ${fmtAmerican(prices[1])} as one low-hold pair`);
  }

  /**
   * Low-hold slip: legs with editable odds and stakes (type a stake to anchor on a book's max bet),
   * per-leg buttons (one deep link per tap), the two-step Bet both, cash needed, the result figures,
   * payout by outcome, and the stale-price guard.
   * opts: start (Bet both pressed in a row: open leg 1 now), anchor/anchorStake (planner rows), read (re-read fn).
   */
  function openSlip(o0, { start = false, anchor = -1, anchorStake = 0, read = null } = {}) {
    let o = o0;
    const S = { prices: o.legs.map((l) => l.price), total: X(), anchor, anchorStake, round: roundPref() };
    const n = o.legs.length;
    const compute = () => {
      const decs = S.prices.map(toDecimal);
      let stakes;
      if (S.anchor >= 0) { const pay = S.anchorStake * decs[S.anchor]; stakes = decs.map((d) => pay / d); }
      else { const inv = decs.reduce((a, d) => a + 1 / d, 0); stakes = decs.map((d) => (S.total / d) / inv); }
      if (S.round) stakes = stakes.map((s, i) => (i === S.anchor ? s : Math.max(S.round, Math.round(s / S.round) * S.round)));
      const staked = stakes.reduce((a, b) => a + b, 0);
      const pays = stakes.map((s, i) => s * decs[i]);
      const profits = pays.map((p) => p - staked);
      return { stakes, staked, pays, profits, min: Math.min(...profits) };
    };
    const flowLegs = () => { const f = ui.legFlow.get(); return f && f.id === o.id ? f.legs : null; };

    const legsRows = () => o.legs.map((l, i) => `<tr>
      <td><div class="oc">${ui.esc(l.outcome)}</div><div>${ui.book(l.book, { full: true })}</div></td>
      <td data-label="Odds"><input data-price="${i}" value="${fmtAmerican(S.prices[i])}" inputmode="numeric" aria-label="Odds at ${ui.esc(api.bookById[l.book]?.name || l.book)}"></td>
      <td data-label="Stake"><input data-stake="${i}" type="number" step="1" min="0" aria-label="Stake at ${ui.esc(api.bookById[l.book]?.name || l.book)}"></td>
      <td data-label="Payout" class="r" data-pay="${i}"></td></tr>`).join('');
    const betsHtml = (r) => {
      const fl = flowLegs();
      return o.legs.map((l, i) => ui.betAction({
        verb: fl?.[i]?.opened ? 'Opened ✓' : 'Bet', amount: `${money(r.stakes[i], S.round ? 0 : 2)} at ${ui.esc(short(l.book))}`,
        act: 'leg', book: l.book, tone: fl?.[i]?.opened ? 'outline' : 'primary', autofocus: i === 0, attrs: { 'data-leg': i },
      })).join('');
    };
    const footHtml = (r) => {
      const fl = flowLegs();
      const next = fl ? fl.findIndex((l) => !l.opened) : 0;
      const primary = !fl ? ui.betAction({ verb: 'Bet both', amount: money(r.staked, 0), size: '' })
        : next === -1 ? ui.betAction({ verb: 'Log both bets', act: 'confirm', size: '' })
          : ui.betAction({ verb: `Next: leg ${next + 1}`, amount: ui.esc(short(o.legs[next].book)), act: 'leg', book: o.legs[next].book, size: '', attrs: { 'data-leg': next } });
      return `${primary}${fl && next === -1 ? '' : ui.ghost('log', 'Log both bets')}${ui.ghost('alert', 'Alert', { href: `#/alerts?tool=low-holds&min=${(o.meta.hold * 100).toFixed(1)}` })}`;
    };

    const body = ui.drawer('Low hold slip', `<div class="lh-slip">
      <table class="lh-legs"><thead><tr><th>Outcome</th><th>Odds</th><th>Stake</th><th class="r">Payout</th></tr></thead><tbody data-legs>${legsRows()}</tbody></table>
      <div class="ls-bets" data-bets></div>
      <div data-cash></div>
      <p class="ls-note" data-anchor-note></p>
      <div class="ls-figs" data-figs></div>
      <div class="ls-ctl">
        ${ui.numberInput('ctotal', Math.round(S.total), 'Total stake', { prefix: '$', step: 50 })}
        <label class="field"><span>Round stakes</span>${ui.seg('round', [[0, 'Exact'], [1, '$1'], [5, '$5']], S.round)}</label>
        <button type="button" class="btn sm outline" data-act="balance">Balance stakes</button>
      </div>
      <div><h3>Payout by outcome</h3><table class="sc"><thead><tr><th>If this wins</th><th>Payout</th><th>Profit</th></tr></thead><tbody data-sc data-bf-nodata></tbody></table></div>
      <p class="ls-note">A low hold costs a little whichever side wins, which makes it the cheapest way to clear playthrough on a bonus. Books can cap your stake: type the capped stake on that leg and the other leg resizes to match.</p>
      <div class="ls-links">${ui.calcLink({ tab: 'hold', a: o.legs[0].price, b: o.legs[1].price, stake: S.total })}
        <button type="button" class="btn sm ghost" data-act="calc"><span data-bf-text>Open the full calculator</span></button></div>
      ${ui.related([['promo-converter', 'Promo Converter'], ['deposit-optimizer', 'Deposit Optimizer'], ['tracker', 'Bet Tracker']])}
    </div>`, { risk: 'lowhold', kicker: `${ui.esc(o.event)} · ${ui.esc(o.label)}`, footer: '' });

    const paint = () => {
      const r = compute();
      const active = document.activeElement;
      r.stakes.forEach((s, i) => {
        const inp = body.querySelector(`[data-stake="${i}"]`);
        inp.classList.toggle('anch', i === S.anchor);
        if (inp !== active) inp.value = s.toFixed(S.round ? 0 : 2);
        body.querySelector(`[data-pay="${i}"]`).textContent = money(r.pays[i]);
      });
      const tot = body.querySelector('[data-num="ctotal"]');
      if (tot && tot !== active) tot.value = Math.round(r.staked * 100) / 100;
      body.querySelector('[data-bets]').innerHTML = betsHtml(r);
      body.querySelector('[data-cash]').innerHTML = ui.cashNeeded(o.legs.map((l, i) => ({ book: l.book, stake: r.stakes[i] })));
      const profit = r.min >= -0.005;
      body.querySelector('[data-figs]').innerHTML = `<div><span>Total staked</span>${ui.heroFig(money(r.staked), '', { tone: '' })}</div>
        <div><span>${profit ? `Profit if ${n === 2 ? 'both' : `all ${n}`} fill` : 'Cost to run'}</span>${ui.heroFig(signedMoney(r.min), '', { tone: profit ? 'pos' : '' })}</div>
        <div><span>${ui.term('hold', 'Hold')}</span>${ui.heroFig(holdText(holdOf(S.prices)), '', { tone: '' })}</div>`;
      body.querySelector('[data-sc]').innerHTML = o.legs.map((l, i) => `<tr><td>${ui.esc(l.outcome)} <span class="muted">· ${ui.esc(short(l.book))}</span></td><td>${money(r.pays[i])}</td><td class="${r.profits[i] >= -0.005 ? 'pos' : 'cost'}">${signedMoney(r.profits[i])}</td></tr>`).join('');
      body.querySelector('[data-anchor-note]').innerHTML = S.anchor >= 0
        ? `Anchored on ${ui.book(o.legs[S.anchor].book)} at <b data-bf-nodata>${money(S.anchorStake)}</b> (that book’s max bet). The other leg is sized to match.`
        : 'Tip: type a stake on either leg to anchor on it, for example when a book caps your max bet.';
      body.setFooter(footHtml(r));
      return r;
    };

    const openLeg = (i) => {
      if (!flowLegs()) {
        const r = compute();
        ui.legFlow.start({
          id: o.id, title: `${o.event} · low-hold pair`, exclusive: true,
          legs: o.legs.map((l, k) => ({ book: l.book, label: l.outcome, stake: r.stakes[k],
            bet: { kind: 'lowhold', book: l.book, sport: o.sport, market: o.market, selection: l.outcome, price: S.prices[k], stake: Math.round(r.stakes[k] * 100) / 100, event: o.event } })),
        });
      }
      ui.legFlow.open(i);
      paint();
    };
    ui.onAction(body.panel, {
      bet: () => openLeg(0),
      leg: (_, el) => openLeg(+el.dataset.leg),
      confirm: () => { ui.legFlow.confirm(); paint(); },
      log: () => { const r = compute(); logPlay(o, S.prices, r.stakes); paint(); },
      balance: () => { const r = compute(); S.total = Math.round(r.staked); S.anchor = -1; paint(); },
      calc: () => openArbCalc(o, ctx, { kind: 'lowhold', total: compute().staked }),
    });
    ui.onNumber(body, 'ctotal', (v) => { if (v > 0) { S.total = v; S.anchor = -1; paint(); } });
    ui.onSeg(body, 'round', (v) => {
      S.round = Number(v);
      body.querySelectorAll('[data-seg="round"] button').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      paint();
    });
    body.querySelectorAll('[data-stake]').forEach((inp) => inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      if (Number.isNaN(v) || v <= 0) return;
      S.anchor = Number(inp.dataset.stake); S.anchorStake = v; paint();
    }));
    body.querySelectorAll('[data-price]').forEach((inp) => inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      if (Number.isNaN(v) || Math.abs(v) < 100) return;
      S.prices[Number(inp.dataset.price)] = v; paint();
    }));
    // Stale-price guard: re-read this pair every tick. New prices replace the ones in the slip unless
    // the person has typed their own odds.
    ui.liveGuard(body, {
      read: read || (() => api.lowHolds({ books: myBooks(), live: o.live, maxHold: 0.1 }).find((x) => x.id === o.id) || null),
      onUpdate: (nx) => {
        const before = compute().min;
        const typed = S.prices.some((p, i) => p !== o.legs[i].price);
        o = nx;
        if (!typed) S.prices = o.legs.map((l) => l.price);
        o.legs.forEach((l, i) => { const inp = body.querySelector(`[data-price="${i}"]`); if (!typed && inp !== document.activeElement) inp.value = fmtAmerican(l.price); });
        const r = paint();
        return typed ? 'Prices moved at the books. Your typed odds are kept: check them before you bet.' : `Price moved: result now ${signedMoney(r.min)} (was ${signedMoney(before)})`;
      },
      goneMsg: 'This pair is gone: one of the prices moved. Nothing was placed.',
    });
    paint();
    if (start) openLeg(0);
  }

  // Deep link from the Daily Card: #/low-holds?id=<opp id> opens that pair's slip.
  if (params.id) {
    const hit = [...load('pre'), ...load('live')].find((r) => r.o.id === params.id);
    if (hit) setTimeout(() => openSlip(hit.o), 0);
    else ui.toast('That low hold is gone. Here are the ones open now.');
  }

  ui.onMode(root, (m) => { st.mode = m; paintTable(); }, { def: 'pre' });
  paintPlanForm();
  paintTable();
  paintPlan();
  const offTick = api.onTick(() => paintTable());
  let booksSig = myBooks().join();
  const offStore = store.subscribe(() => {
    if (myBooks().join() !== booksSig) { booksSig = myBooks().join(); paintPlanForm(); paintPlan(); }
    paintTable();
  });
  return () => { offTick(); offStore(); fb.destroy?.(); t.destroy(); };
}
