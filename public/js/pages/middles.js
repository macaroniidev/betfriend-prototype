// Middles finder: Over a low number at one book + Under a higher number at another.
// Usually one side wins and you lose a little; if the result lands in the middle, both sides win.
//
// Layout (UX rebuild, items B1–B17 + C7): results-first page head with live status and facts, the shared
// filter bar, one keyed ui.table (legs as slip lines, one "Bet both" primary, Calc · Log · Alert), and a
// middle slip drawer with the two-step Bet both (ui.legFlow), the stale-price guard and the scenarios.
// The classic middle calculator (editable odds) stays in ../slips.js and opens from the row's "Calc".
// `middleMath` is re-exported here for Calculators.

import { money, pct } from '../lib/odds.js';
import { middleMath, openMidCalc } from '../slips.js';

export { middleMath } from '../slips.js';

const CSS = `
.bf-mid .mid-w { display:inline-flex; flex-direction:column; gap:2px; }
.bf-mid .mid-w b { font:900 var(--t-lg)/1 var(--f-head); font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-mid .mid-w small { color:var(--muted); font-size:var(--t-xs); font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-mid .mid-mkt { margin-bottom:4px; font-size:var(--t-xs); font-weight:700; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:290px; }
.bf-mid .mid-avg { display:inline-flex; flex-direction:column; align-items:flex-end; gap:5px; }
.bf-mid .miss { color:var(--muted); font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-mid .hits { color:var(--pos); font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-mid .chance { display:inline-flex; gap:8px; align-items:center; justify-content:flex-end; font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-mid .m-only { display:none; }
.bf-mid [data-lock-slot]:empty { display:none; }
.bf-mid [data-lock-slot] { margin-top:12px; }
/* Facts and filters share one row on wide screens, so the first middle sits high on the page (B1). */
.bf-mid .mid-bar { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px 28px; margin:0 0 8px; }
.bf-mid .mid-bar .stats.facts { margin:0; }
.bf-mid .mid-bar .toolbar.fb { margin:0; }
@media (min-width:861px) {
  /* Table tools (density, Columns) ride in the empty actions header instead of taking their own row. */
  .bf-mid .tbl-tools { position:absolute; top:0; right:0; z-index:calc(var(--z-thead) + 1); padding:2px 0 0; }
  .bf-mid .tbl-tools [data-tbl-density] span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .bf-mid .tbl.scrolls .ui-t th { top:0; }
  /* Long outcome heads wrap to two lines so all nine columns and the actions fit at laptop widths. */
  .bf-mid .ui-t th[data-col="miss"] { white-space:normal; min-width:104px; line-height:1.25; }
  .bf-mid .ui-t th[data-col="chance"], .bf-mid .ui-t th[data-col="hit"] { white-space:normal; width:72px; line-height:1.25; }
  .bf-mid .ui-t th .th-sort { text-align:inherit; }
  .bf-mid .ui-t td[data-col="event"] { min-width:132px; }
  .bf-mid .tbl[data-density="compact"] .ui-t th, .bf-mid .tbl[data-density="compact"] .ui-t td { padding-inline:8px; }
}
@media (max-width:860px) {
  .bf-mid .m-only { display:block; margin-top:4px; font-size:var(--t-xs); color:var(--muted); text-align:right; white-space:nowrap; }
  .bf-mid .mid-w b { font-size:var(--t-md); }
  /* Phone rows stay short: one-line event name, risk label as its icon (the text stays for screen readers). */
  .bf-mid td[data-col="event"] .evt-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bf-mid .mid-mkt { max-width:none; }
}
/* Middle slip (drawer) */
.mid-slip { display:grid; gap:16px; }
.mid-slip .ms-legs { display:grid; gap:8px; }
.mid-slip .ms-bets { display:flex; flex-wrap:wrap; gap:8px; }
.mid-slip .ms-figs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:12px 0; }
.mid-slip .ms-figs > div { display:grid; gap:4px; }
.mid-slip .ms-figs span { font-size:var(--t-xs); color:var(--muted); font-weight:700; }
.mid-slip .ms-figs .hero-fig { align-items:flex-start; }
.mid-slip .ms-figs .hero-fig b { font-size:var(--t-xl); }
.mid-slip .ms-ctl { display:flex; flex-wrap:wrap; gap:10px 14px; align-items:flex-end; }
.mid-slip .ms-ctl .field input { width:110px; }
.mid-slip h3 { font-size:var(--t-md); margin:0 0 6px; }
.mid-slip .ms-ruler { position:relative; height:48px; margin:2px 6px 4px; }
.mid-slip .ms-ruler .ln { position:absolute; left:0; right:0; top:14px; height:2px; background:var(--line-strong); }
.mid-slip .ms-ruler .zone { position:absolute; left:33%; width:34%; top:6px; height:18px; background:var(--hl); border:2px solid var(--g); border-radius:6px; }
.mid-slip .ms-ruler .tk { position:absolute; top:28px; transform:translateX(-50%); font-size:var(--t-xs); color:var(--muted); white-space:nowrap; font-variant-numeric:tabular-nums; }
.mid-slip .ms-ruler .tk.both { color:var(--text); font-weight:800; }
.mid-slip .ms-ruler .k1 { left:9%; } .mid-slip .ms-ruler .k2 { left:33%; } .mid-slip .ms-ruler .k3 { left:50%; } .mid-slip .ms-ruler .k4 { left:67%; } .mid-slip .ms-ruler .k5 { left:91%; }
.mid-slip .sc { width:100%; border-collapse:collapse; font-size:var(--t-cell); }
.mid-slip .sc th { text-align:right; font-size:var(--t-xs); color:var(--muted); text-transform:uppercase; letter-spacing:.04em; padding:6px; border-bottom:1px solid var(--line); }
.mid-slip .sc td { text-align:right; padding:8px 6px; border-bottom:1px solid var(--line-2); font-variant-numeric:tabular-nums; }
.mid-slip .sc th:first-child, .mid-slip .sc td:first-child { text-align:left; }
.mid-slip .sc tr.mid td { background:var(--hl); font-weight:800; }
.mid-slip .sc .pos { color:var(--pos); font-weight:800; } .mid-slip .sc .cost { color:var(--muted); font-weight:700; }
.mid-slip .ms-note { font-size:var(--t-xs); color:var(--muted); margin:0; }
.mid-slip .ms-links { display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; }
@media (max-width:520px) { .mid-slip .ms-figs .hero-fig b { font-size:var(--t-lg); } }`;

/** Signed money with a true minus ("−$41.37"), "+$917.26". */
const signed = (x) => `${x < 0 ? '−' : '+'}${money(Math.abs(x))}`;

export default function render(root, ctx) {
  const { api, store, ui, params } = ctx;
  if (!document.getElementById('css-middles')) document.head.insertAdjacentHTML('beforeend', `<style id="css-middles">${CSS}</style>`);

  const st = { mode: ui.initialMode(params, 'pre', ['pre', 'live']) };
  const seen = new Map(); // opp id → first time we saw it (Age column)
  const short = (b) => api.bookById[b]?.short || b;
  const roundPref = () => ([0, 1, 5].includes(+store.get().stakeRound) ? +store.get().stakeRound : 0);

  root.innerHTML = `<div class="bf-mid">
    ${ui.pageHead({
      title: 'Middles', tool: 'middles', live: true,
      subtitle: 'Bet the Over on the low number and the Under on the high number at two books. Most of the time one side wins and you lose a little. If the result lands between the numbers, both bets win.',
      actions: ui.modeSwitch([['pre', 'Pre-match', 0], ['live', 'Live', 0]], st.mode),
    })}
    <div class="mid-bar"><div data-facts></div><div data-filters></div></div>
    <div data-table></div>
    <div data-lock-slot></div>
    ${ui.how({
      summary: 'Two bets that usually cost a little and sometimes both win.',
      checks: [
        `Take the ${ui.term('middle', 'Over on the low number')} at one book and the Under on the high number at another`,
        'Stakes are split so either single win pays back about the same',
        'If the result lands between the two numbers, both bets win: that rare big payout is the point',
        'Most of the time only one side wins and you lose a little. The Average column is what it’s worth per try over many tries',
      ],
    })}
  </div>`;
  const q = (s) => root.querySelector(s);

  // ---- filters: Sport · Books · Sort, plus the total stake used to size every row ----
  const fb = ui.filterBar({
    id: 'middles',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'stake', type: 'number', label: 'Total stake', default: store.get().arbStake || 1000, prefix: '$', step: 50, min: 10, count: false },
      { key: 'books', type: 'books', label: 'Books' },
      { key: 'sort', type: 'sort', label: 'Sort by', default: 'ev', options: [['ev', 'Best average'], ['width', 'Widest'], ['cost', 'Lowest cost'], ['chance', 'Most likely to hit'], ['age', 'Newest']] },
    ],
    onChange: (_, key) => { if (key === 'sort' || key === 'reset') syncSort(); paint(); },
  });
  q('[data-filters]').append(fb.el);
  const total = () => Math.max(10, +fb.values.stake || 1000);

  // ---- data ----
  const load = (mode = st.mode) => api.middles({ books: store.get().books, live: mode === 'live', sport: fb.values.sport })
    .map((o) => {
      if (!seen.has(o.id)) seen.set(o.id, Date.now());
      return { o, m: middleMath(o.legs.map((l) => l.price), total(), o.meta.middleProb) };
    });
  const legsOf = (r) => r.o.legs.map((l, i) => ({ ...l, side: l.outcome, stake: r.m.stakes[i] }));

  // ---- table ----
  const t = ui.table({
    id: 'middles', caption: 'Middles at your books', rowKey: (r) => r.o.id,
    columns: [
      { key: 'width', label: 'Width', sort: (r) => r.o.meta.width, title: ui.termTitle('middle'),
        render: (r) => `<span class="mid-w"><b>${r.o.meta.width} pt${r.o.meta.width === 1 ? '' : 's'}</b><small>${r.o.meta.low} – ${r.o.meta.high}</small></span>` },
      { key: 'event', label: 'Event', render: (r) => ui.eventCell(r.o.eventId) },
      // The market caption sits above the two legs it describes.
      { key: 'legs', label: 'Legs', render: (r) => `<div class="mid-mkt">${ui.esc(r.o.market === 'Player Prop' ? r.o.label : 'Game total')}</div>${ui.slipLegs(legsOf(r))}` },
      { key: 'miss', label: 'If it misses (likely)', align: 'r', sort: (r) => r.m.worst, render: (r) => `<span class="miss">${signed(r.m.worst)}</span>` },
      { key: 'chance', label: 'Chance it hits', align: 'r', sort: (r) => r.o.meta.middleProb, render: (r) => `<span class="chance">${pct(r.o.meta.middleProb, 1)}</span>` },
      { key: 'hit', label: 'If it hits', align: 'r', sort: (r) => r.m.both, render: (r) => `<span class="hits">${signed(r.m.both)}</span>` },
      { key: 'avg', label: 'Average', align: 'r', sort: (r) => r.m.ev, trend: (r) => r.m.ev, title: ui.termTitle('ev'),
        // The hero average carries the row's one risk label: worth it on average, and it can lose.
        render: (r) => `<span class="mid-avg">${ui.heroFig(signed(r.m.ev), '', { tone: r.m.ev >= 0 ? 'pos' : '' })}${ui.risk('middle', { short: true })}<span class="m-only" data-bf-nodata>${signed(r.m.worst)} if it misses</span></span>` },
      { key: 'age', label: 'Age', align: 'r', sort: (r) => seen.get(r.o.id), render: (r) => `<span class="muted">${ui.age(seen.get(r.o.id))}</span>` },
    ],
    // One primary per row; Alert lives in the slip footer and the empty state (keeps rows compact).
    action: () => ui.actions(ui.betAction({ verb: 'Bet both' }), [['calc', 'Calc'], ['log', 'Log']]),
    onAction: { bet: (r) => openSlip(r.o, { start: true }), calc: (r) => openMidCalc(r.o, ctx, total()), log: (r) => logPlay(r.o, r.m) },
    onOpen: (r) => openSlip(r.o),
    sort: { key: 'avg', dir: 'desc' },
    mobile: { areas: ['width event age', 'legs legs avg', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => emptyState(),
  });
  q('[data-table]').append(t.el);

  // The Sort select drives the table's sort (one source of truth: the table remembers it too).
  const SORTS = { ev: { key: 'avg', dir: 'desc' }, width: { key: 'width', dir: 'desc' }, cost: { key: 'miss', dir: 'desc' }, chance: { key: 'chance', dir: 'desc' }, age: { key: 'age', dir: 'desc' } };
  function syncSort() { const s = SORTS[fb.values.sort] || SORTS.ev; const cur = t.sortState(); if (cur?.key !== s.key || cur?.dir !== s.dir) t.setSort(s); }

  function alertHref(o) {
    return `#/alerts?tool=middles&min=${o.meta.width}${fb.values.sport !== 'All' ? `&sport=${encodeURIComponent(fb.values.sport)}` : ''}`;
  }

  function emptyState() {
    const other = st.mode === 'live' ? 'pre' : 'live';
    const n = load(other).length;
    const allSports = fb.values.sport !== 'All' ? api.middles({ books: store.get().books, live: st.mode === 'live' }).slice(0, 3) : [];
    return ui.empty({
      title: 'No middles match right now',
      msg: fb.activeCount() ? 'Your filters hide every current middle. Loosen them, switch modes, or get pinged when one opens up.' : 'Nothing is open at your books right now. Lines move all day, so check back or set an alert.',
      actions: [
        ...(fb.activeCount() ? [{ label: 'Reset filters', act: 'reset' }] : []),
        { label: `Switch to ${other === 'live' ? 'Live' : 'Pre-match'} (${n})`, act: 'switch' },
        { label: 'Alert me', href: '#/alerts?tool=middles&min=1' },
      ],
      near: allSports.length ? allSports.map((o) => `<div>${ui.esc(o.event)} · <b>${o.meta.width} pt</b> ${ui.esc(o.label)}</div>`).join('') : '',
      nearLabel: 'Open in other sports',
      mate: true,
    });
  }
  ui.onAction(q('[data-table]'), {
    reset: () => fb.reset(),
    switch: () => q(`.page-head [data-seg="mode"] button[data-v="${st.mode === 'live' ? 'pre' : 'live'}"]`)?.click(),
  });

  // ---- facts strip (patched in place: labels static, figures nodata) ----
  function facts(rows) {
    const best = rows.reduce((a, r) => Math.max(a, r.m.ev), -Infinity);
    const widest = rows.reduce((a, r) => Math.max(a, r.o.meta.width), 0);
    const big = rows.reduce((a, r) => Math.max(a, r.m.both), 0);
    return [
      { label: st.mode === 'live' ? 'Live middles' : 'Pre-match middles', value: String(rows.length), note: 'at your books' },
      { label: 'Widest middle', value: rows.length ? `${widest} pts` : ui.na() },
      { label: 'Biggest if it hits', value: rows.length ? signed(big) : ui.na(), tone: 'pos', note: `at ${money(total(), 0)} total` },
      { label: 'Best average', value: rows.length ? signed(best) : ui.na(), tone: best >= 0 ? 'pos' : '', term: 'ev' },
    ];
  }

  function paint() {
    const rows = load();
    const { rows: shown, card } = ui.lockRows(rows, 'middles', { n: 3, noun: 'middles' });
    t.update(shown);
    const slot = q('[data-lock-slot]');
    if (slot.innerHTML !== card) slot.innerHTML = card;
    patchFacts(q('[data-facts]'), facts(rows), ui);
    ui.setModeCount(root, st.mode, rows.length);
    ui.setModeCount(root, st.mode === 'live' ? 'pre' : 'live', load(st.mode === 'live' ? 'pre' : 'live').length);
  }

  ui.onMode(root, (m) => { st.mode = m; paint(); }, { def: 'pre' });
  syncSort();
  paint();

  // ---- Bet both, Log ----
  function logPlay(o, m) {
    // Both legs of a middle can win, so the group is not exclusive.
    api.tracker.addGroup(o.legs.map((l, i) => ({ kind: 'middle', book: l.book, sport: o.sport, market: o.market, selection: l.outcome,
      price: l.price, stake: Math.round(m.stakes[i] * 100) / 100, event: o.event })));
    if (ui.legFlow.get()?.id === o.id) ui.legFlow.clear();
    ui.toast(`Logged both sides of the ${o.meta.width} pt middle`);
  }
  function startFlow(o, m) {
    ui.legFlow.start({
      id: o.id, title: `${o.event} · ${o.meta.width} pt middle`, exclusive: false,
      legs: o.legs.map((l, i) => ({ book: l.book, label: l.outcome, stake: m.stakes[i],
        bet: { kind: 'middle', book: l.book, sport: o.sport, market: o.market, selection: l.outcome, price: l.price, stake: Math.round(m.stakes[i] * 100) / 100, event: o.event } })),
    });
  }

  /**
   * Middle slip: legs with stakes, per-leg buttons (one deep link per tap), the two-step Bet both,
   * cash needed per book, outcome figures, stake / rounding / chance controls and the scenarios.
   * opts.start: the person pressed "Bet both" in the row → start the play and open leg 1 right away.
   */
  function openSlip(o0, { start = false } = {}) {
    let o = o0;
    const S = { total: total(), round: roundPref(), p: o.meta.middleProb };
    const math = () => middleMath(o.legs.map((l) => l.price), S.total, S.p, S.round);
    const flowLegs = () => { const f = ui.legFlow.get(); return f && f.id === o.id ? f.legs : null; };

    const legsHtml = (m) => {
      const fl = flowLegs();
      return `${ui.slipLegs(o.legs.map((l, i) => ({ ...l, side: l.outcome, stake: m.stakes[i] })))}
        ${ui.cashNeeded(o.legs.map((l, i) => ({ book: l.book, stake: m.stakes[i] })))}
        <div class="ms-bets">${o.legs.map((l, i) => ui.betAction({
          verb: fl?.[i]?.opened ? 'Opened ✓' : 'Bet', amount: `${money(m.stakes[i], S.round ? 0 : 2)} at ${ui.esc(short(l.book))}`,
          act: 'leg', book: l.book, tone: fl?.[i]?.opened ? 'outline' : 'primary', autofocus: i === 0, attrs: { 'data-leg': i },
        })).join('')}</div>`;
    };
    const figsHtml = (m) => `<div><span>If it misses (likely)</span>${ui.heroFig(signed(m.worst), '', { tone: '' })}</div>
      <div><span>If it hits</span>${ui.heroFig(signed(m.both))}</div>
      <div><span>${ui.term('ev', 'Average')}</span>${ui.heroFig(signed(m.ev), '', { tone: m.ev >= 0 ? 'pos' : '' })}</div>`;
    const scHtml = (m) => {
      const side = (1 - S.p) / 2;
      const { low, high } = o.meta;
      const row = (label, ch, v, cls = '') => `<tr class="${cls}"><td>${label}</td><td>${pct(ch, 1)}</td><td class="${v >= 0 ? 'pos' : 'cost'}">${signed(v)}</td></tr>`;
      return row(`Under ${low}: Under wins`, side, m.underOnly) + row(`Between ${low} and ${high}: both win`, S.p, m.both, 'mid') + row(`Over ${high}: Over wins`, side, m.overOnly);
    };
    const footHtml = (m) => {
      const fl = flowLegs();
      const next = fl ? fl.findIndex((l) => !l.opened) : 0;
      const primary = !fl ? ui.betAction({ verb: 'Bet both', amount: money(m.staked, 0), size: '' })
        : next === -1 ? ui.betAction({ verb: 'Log both bets', act: 'confirm', size: '' })
          : ui.betAction({ verb: `Next: leg ${next + 1}`, amount: ui.esc(short(o.legs[next].book)), act: 'leg', book: o.legs[next].book, size: '', attrs: { 'data-leg': next } });
      return `${primary}${fl && next === -1 ? '' : ui.ghost('log', 'Log both bets')}${ui.ghost('alert', 'Alert', { href: alertHref(o) })}`;
    };

    const m0 = math();
    const body = ui.drawer('Middle slip', `<div class="mid-slip">
      <div class="ms-legs" data-lines>${legsHtml(m0)}</div>
      <div class="ms-figs" data-figs>${figsHtml(m0)}</div>
      <div><h3>Middle zone</h3><div class="ms-ruler" aria-hidden="true"><div class="ln"></div><div class="zone"></div>
        <span class="tk k1">Under wins</span><span class="tk k2">${o.meta.low}</span><span class="tk k3 both">Both win</span><span class="tk k4">${o.meta.high}</span><span class="tk k5">Over wins</span></div>
        <p class="ms-note">If the result lands between ${o.meta.low} and ${o.meta.high}, both bets win. Most of the time one side wins and you lose a little.</p></div>
      <div class="ms-ctl">
        ${ui.numberInput('mtotal', Math.round(S.total), 'Total stake', { prefix: '$', step: 50 })}
        <label class="field"><span>Round stakes</span>${ui.seg('mround', [[0, 'Exact'], [1, '$1'], [5, '$5']], S.round)}</label>
        ${ui.numberInput('mprob', (S.p * 100).toFixed(1), 'Chance it hits %', { step: 0.1 })}
      </div>
      <div><h3>Scenarios</h3><table class="sc"><thead><tr><th>Final result</th><th>Chance</th><th>Profit</th></tr></thead><tbody data-sc data-bf-nodata>${scHtml(m0)}</tbody></table></div>
      <p class="ms-note">Books can cap your stake on props and totals. If one does, lower the total stake so both legs fit, and check both prices before you submit.</p>
      <div class="ms-links">${ui.calcLink({ tab: 'middle', a: o.legs[0].price, b: o.legs[1].price, stake: S.total })}
        <button type="button" class="btn sm ghost" data-act="calc"><span data-bf-text>Edit odds in the middle calculator</span></button></div>
      ${ui.related([['arbitrage', 'Arbitrage'], ['low-holds', 'Low Holds'], ['tracker', 'Bet Tracker']])}
    </div>`, { risk: 'middle', kicker: `${ui.esc(o.event)} · ${o.meta.width} pt middle · ${ui.esc(o.label)}`, footer: footHtml(m0) });

    const repaint = () => {
      const m = math();
      body.querySelector('[data-lines]').innerHTML = legsHtml(m);
      body.querySelector('[data-figs]').innerHTML = figsHtml(m);
      body.querySelector('[data-sc]').innerHTML = scHtml(m);
      body.setFooter(footHtml(m));
      return m;
    };
    const openLeg = (i) => {
      if (!flowLegs()) startFlow(o, math());
      ui.legFlow.open(i);
      repaint();
    };
    ui.onAction(body.panel, {
      bet: () => openLeg(0),
      leg: (_, el) => openLeg(+el.dataset.leg),
      confirm: () => { ui.legFlow.confirm(); repaint(); },
      log: () => { logPlay(o, math()); repaint(); },
      calc: () => openMidCalc(o, ctx, S.total),
    });
    ui.onNumber(body, 'mtotal', (v) => { if (v > 0) { S.total = v; repaint(); } });
    ui.onNumber(body, 'mprob', (v) => { S.p = Math.min(0.9, Math.max(0, v / 100)); repaint(); });
    ui.onSeg(body, 'mround', (v) => {
      S.round = Number(v);
      body.querySelectorAll('[data-seg="mround"] button').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      repaint();
    });
    // Stale-price guard: re-read this middle every tick; stakes and figures follow the new prices.
    ui.liveGuard(body, {
      read: () => api.middles({ books: store.get().books, live: o.live }).find((x) => x.id === o.id) || null,
      onUpdate: (n) => {
        const before = math().ev;
        o = n;
        const m = repaint();
        return `Price moved: average now ${signed(m.ev)} (was ${signed(before)})`;
      },
      goneMsg: 'This middle is gone: one of the prices moved. Nothing was placed.',
    });
    if (start) openLeg(0);
  }

  // Deep link from the Daily Card: #/middles?id=<opp id> opens that middle's slip.
  if (params.id) {
    const hit = [...load('pre'), ...load('live')].find((r) => r.o.id === params.id);
    if (hit) setTimeout(() => openSlip(hit.o), 0);
    else ui.toast('That middle is gone. Here are the ones open now.');
  }

  const offTick = api.onTick(() => paint());
  const offStore = store.subscribe(() => paint());
  return () => { offTick(); offStore(); fb.destroy?.(); t.destroy(); };
}

/**
 * Patch a page head's facts strip in place: values update without re-rendering the labels (so the
 * owner editor's overrides and the content.js watcher stay quiet). Rebuilds a fact only when its label changes.
 */
export function patchFacts(head, items, ui) {
  const tpl = document.createElement('template');
  tpl.innerHTML = ui.facts(items).trim();
  const next = tpl.content.firstElementChild;
  const cur = head.querySelector('.facts');
  if (!cur) { head.append(next); return; }
  const a = [...cur.children], b = [...next.children];
  if (a.length !== b.length) { cur.replaceWith(next); return; }
  b.forEach((nb, i) => {
    const ca = a[i];
    if (ca.querySelector('.fact-l')?.textContent !== nb.querySelector('.fact-l')?.textContent || ca.tagName !== nb.tagName) { ca.replaceWith(nb); return; }
    for (const sel of ['strong', 'small']) {
      const x = ca.querySelector(sel), y = nb.querySelector(sel);
      if (!x && !y) continue;
      if (!x || !y) { ca.replaceWith(nb); return; }
      if (x.innerHTML !== y.innerHTML) x.innerHTML = y.innerHTML;
      if (x.className !== y.className) x.className = y.className;
    }
  });
}
