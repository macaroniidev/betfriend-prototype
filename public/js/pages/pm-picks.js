// AI Market Picks: model fair probability vs market price on Kalshi, Polymarket, ProphetX and Novig, graded
// with reasons and sized from your bankroll, plus a cross-venue price comparison per contract.
// Results-first (B1): live status, filters and 4 facts in the head, the top 3 picks right under it.
// Every pick has ONE primary (B2: "Buy YES · $86 · Polymarket ↗") and a Log ghost; the full list is a
// ui.table paged with "Show 20 more" (static list, B14). Prices follow the odds-format preference (B13).

const CSS = `
.pmp .top-sec { margin: 4px 0 0; }
/* Section headings use the shared .sec scale (app.css .sec-head h2), like every other screen. */
.pmp .kick { font-size: var(--t-fig); margin: 0 0 10px; }
.pmp .top3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
/* Top picks: flat tiles on --panel with the green top rule (no card-in-card, B6). */
.pmp .pick { padding: 14px 16px 14px; display: grid; gap: 9px; align-content: start; background: var(--panel); border-top: 4px solid var(--g); border-radius: 0 0 var(--r) var(--r); }
.pmp .pick .hd { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmp .grade { margin-left: auto; font: 900 var(--t-lg)/1 var(--f-head); min-width: 40px; height: 36px; padding: 0 6px; border-radius: 8px; display: grid; place-items: center; flex: none;
  background: var(--g); color: #fff; }
.pmp .grade.B, .pmp .grade.C { background: var(--paper); color: var(--text); border: 2px solid var(--line-strong); }
.pmp .pick .ttl { margin: 0; font: 700 var(--t-md)/1.3 var(--f-body); }
/* YES / NO side tags: identical styling (symmetric, B7). */
.pmp .pside { display: inline-block; font: 900 12px/1 var(--f-head); letter-spacing: .06em; padding: 4px 7px 3px; border-radius: 6px; border: 2px solid var(--line-strong); color: var(--text); background: var(--paper); margin-right: 6px; vertical-align: 1px; }
.pmp .vs { display: grid; gap: 5px; font-size: var(--t-xs); font-weight: 700; }
.pmp .vs .ln { display: grid; grid-template-columns: 58px minmax(0, 1fr) 52px; gap: 8px; align-items: center; }
.pmp .vs .ln b { text-align: right; font-variant-numeric: tabular-nums; }
.pmp .vs .track { height: 8px; border-radius: 4px; background: var(--paper); overflow: hidden; }
.pmp .vs .track i { display: block; height: 100%; border-radius: 4px; }
.pmp .vs .mdl i { background: var(--g); } .pmp .vs .mkt i { background: var(--line-strong); }
.pmp .edge-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pmp .edge-row .ev-line { margin: 0; }
.pmp ul.why { margin: 0; padding-left: 18px; font-size: var(--t-sm); color: var(--muted); display: grid; gap: 3px; }
.pmp .foot { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 10px; }
.pmp .foot .stake { font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmp .foot .stake b { display: block; color: var(--text); font: 900 var(--t-fig)/1 var(--f-head); margin: 2px 0; font-variant-numeric: tabular-nums; }
.pmp .foot .row-acts { flex-wrap: wrap; }
.pmp .sub { font-size: var(--t-xs); color: var(--muted); margin-top: 3px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.pmp .cttl { font-weight: 700; }
.pmp .why2 { font-size: var(--t-xs); color: var(--muted); max-width: 300px; display: block; }
.pmp .stk b { display: block; } .pmp .stk small { color: var(--muted); font-size: var(--t-xs); }
.pmp .cmp-wrap { overflow-x: auto; }
.pmp .cmp td.vc { text-align: center; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pmp .cmp td.vc button { border: 0; background: none; font: inherit; color: inherit; cursor: pointer; padding: 2px; border-radius: 6px; }
.pmp .cmp td.vc button:hover { text-decoration: underline; }
.pmp .cmp td.vc small { display: block; font: 600 11px var(--f-body); color: var(--muted); }
.pmp .cmp th.vc { text-align: center; }
.pmp .save { font-size: var(--t-xs); color: var(--pos); font-weight: 800; white-space: nowrap; }
.pmp .sec-note { margin: -6px 0 6px; font-size: var(--t-sm); color: var(--muted); }
.pmp .legend { margin: 8px 0 0; font-size: var(--t-xs); color: var(--muted); }
.pmp .head-actions .toolbar.fb { margin-bottom: 0; }
.pmp .how-sec { margin-top: 28px; }
@media (max-width: 1100px) { .pmp .top3 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 860px) {
  .pmp .why2 { max-width: none; }
  .pmp .cmp td.vc { text-align: right; }
  .pmp .foot .row-acts { width: 100%; justify-content: flex-start; }
  .pmp .foot .bet-action { flex: 1 1 auto; justify-content: center; }
}`;

export default function render(root, ctx) {
  const { api, ui, store, odds } = ctx;
  const pm = api.prediction;
  if (!document.getElementById('css-pm-picks')) {
    const s = document.createElement('style'); s.id = 'css-pm-picks'; s.textContent = CSS; document.head.appendChild(s);
  }
  const v = ui.view('pm-picks');
  const st = { side: v.get('side', 'YES') === 'NO' ? 'NO' : 'YES' };
  const GR = { 'A+': 5, A: 4, 'B+': 3, B: 2, 'C+': 1 };
  const c$ = (c) => ui.fmtCents(c);
  const venueName = (id) => pm.VENUE_NAMES[id];

  root.innerHTML = `<div class="pmp">
    ${ui.pageHead({ title: 'AI Market Picks', tool: 'pm-picks', live: { label: 'Re-priced live' },
      subtitle: 'AI prediction market picks. Our model prices every contract on Kalshi, Polymarket, ProphetX and Novig, compares it with the live market price and the sportsbook board, and tells you what to buy, where it is cheapest and how much to stake.',
      actions: '<div data-fb></div>', facts: [] })}
    <section class="top-sec"><h2 class="kick">Top picks right now</h2><div class="top3" data-top data-bf-list></div></section>
    <section class="sec">
      <div class="sec-head"><h2>All AI picks</h2></div>
      <p class="sec-note">Model probability vs market price, edge, grade and suggested stake from your bankroll.</p>
      <div data-table></div><div data-more></div>
    </section>
    <section class="sec cmp">
      <div class="sec-head"><h2>Cross-venue price comparison</h2><div class="sec-actions">${ui.seg('side', [['YES', 'YES price'], ['NO', 'NO price']], st.side)}</div></div>
      <p class="sec-note">The same outcome priced on every venue and the best sportsbook. The cheapest venue is highlighted.</p>
      <div class="cmp-wrap"><table class="t stack-sm" data-cmp></table></div>
      <p class="legend"><span class="price best">Best</span> cheapest venue for this side · — not listed there</p>
    </section>
    ${ui.how({ summary: 'Our model prices each contract; when the market is cheaper than the model, that gap is the edge.',
      checks: ['Edge is model fair minus price, per contract', 'Grades run from C+ to A+ by the size of the edge',
        `Stakes use ${ui.term('kelly_fraction', 'your Kelly fraction')} and are capped at 5% of your ${ui.term('bankroll')}`,
        'We show where each pick is cheapest; you place the order on the venue'] })}
  </div>`;

  // ---------- filters (in the head, so the first pick sits high) ----------
  const fb = ui.filterBar({
    id: 'pm-picks',
    fields: [
      { key: 'venue', type: 'select', label: 'Venue', default: 'All', options: [['All', 'All venues'], ...pm.VENUES.map((x) => [x, venueName(x)])], query: true },
      { key: 'grade', type: 'select', label: 'Grade', default: 'All', options: [['All', 'All grades'], ['A', 'A and up'], ['B+', 'B+ and up']] },
      { key: 'category', type: 'select', label: 'Category', default: 'All', options: ['All', ...pm.CATEGORIES], query: true },
    ],
    onChange: () => { pg.reset(); compute(); paintFacts(); paintTop(); mountTable(); renderCompare(); },
  });
  root.querySelector('[data-fb]').append(fb.el);

  let picks = [];
  const gradeOk = (g) => fb.values.grade === 'All' || GR[g] >= GR[fb.values.grade];
  const compute = () => { picks = pm.aiPicks({ venue: fb.values.venue, category: fb.values.category }).filter((p) => gradeOk(p.grade)); };
  const evOf = (p) => (p.edge / (p.marketPrice / 100)) * p.stake;    // expected profit on the suggested stake

  const vsBars = (p) => `<div class="vs" role="img" aria-label="Model ${Math.round(p.modelProb * 100)}% vs market ${p.marketPrice}%">
      <div class="ln mdl"><span>Model</span><span class="track"><i style="width:${(p.modelProb * 100).toFixed(1)}%"></i></span><b>${Math.round(p.modelProb * 100)}%</b></div>
      <div class="ln mkt"><span>Market</span><span class="track"><i style="width:${p.marketPrice}%"></i></span><b>${c$(p.marketPrice)}</b></div></div>`;
  const sub = (m) => `${ui.book(m.venue)} ${m.sport ? ui.sport(m.sport) : ui.tag(m.category)} <span>${ui.esc(m.kind)}</span> ${m.live ? ui.liveDot() : ''}`;
  // The one primary per pick: buy that side at the venue, sized from your bankroll.
  const buy = (p, size = 'sm') => ui.betAction({ verb: `Buy ${p.side}`, amount: `${ui.money(p.stake, 0)} · ${venueName(p.market.venue)} ↗`, act: 'buy', size,
    attrs: { 'data-pick': p.id }, title: `Open in ${venueName(p.market.venue)}` });

  function paintFacts() {
    const bank = store.get().bankroll;
    const totStake = picks.slice(0, 10).reduce((a, p) => a + p.stake, 0);
    const venues = {};
    picks.forEach((p) => { venues[p.market.venue] = (venues[p.market.venue] || 0) + 1; });
    const topV = Object.entries(venues).sort((a, b) => b[1] - a[1])[0];
    const html = ui.facts([
      { label: 'Live AI picks', value: picks.length, note: `${picks.filter((p) => GR[p.grade] >= 4).length} graded A or better` },
      { label: 'Average edge', term: 'edge', value: picks.length ? `+${(picks.reduce((a, p) => a + p.edge, 0) / picks.length * 100).toFixed(1)}¢` : ui.na('No picks'), note: 'model fair minus price, per contract', tone: 'pos' },
      { label: 'Stake on top 10', value: ui.money(totStake, 0), note: `${ui.pct(totStake / bank, 0)} of ${ui.money(bank, 0)} · Kelly-sized` },
      { label: 'Cheapest venue most often', value: topV ? venueName(topV[0]) : ui.na('No picks'), note: topV ? `${topV[1]} of ${picks.length} picks` : '' },
    ]);
    const head = root.querySelector('.page-head');
    const el = head.querySelector('.facts');
    if (el) { if (el.outerHTML !== html) el.outerHTML = html; } else head.insertAdjacentHTML('beforeend', html);
  }

  let topHtml = '';
  function paintTop() {
    const top = picks.slice(0, 3);
    const html = top.map((p) => `<article class="pick" data-key="${p.id}">
      <div class="hd">${ui.risk('pm', { short: true })} ${sub(p.market)}<span class="grade ${p.grade[0]}" title="Grade ${p.grade}: by size of edge">${p.grade}</span></div>
      <p class="ttl"><span class="pside">${p.side}</span>${ui.esc(p.market.title)}</p>
      ${vsBars(p)}
      <div class="edge-row">${ui.edge(p.edge, { label: 'Edge' })} ${ui.evLine({ prob: p.modelProb, payout: p.contracts, ev: evOf(p) })}</div>
      <ul class="why">${p.reasons.map((r) => `<li>${ui.esc(r)}</li>`).join('')}</ul>
      <div class="foot"><div class="stake">${ui.esc(ui.kellyLabel())}<b>${ui.money(p.stake, 0)}</b>${p.contracts.toLocaleString()} contracts @ ${c$(p.marketPrice)}</div>
        ${ui.actions(buy(p), [['log', 'Log']])}</div></article>`).join('')
      || ui.empty({ title: 'No picks for these filters', msg: 'The model has no edge at this grade, venue and category right now.',
        actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Prediction Traders', href: '#/prediction-traders' }, { label: 'Browse markets', href: '#/pm-markets' }] });
    // Repaint only when something changed, so hover and focus on the buttons survive quiet ticks.
    if (html !== topHtml) { topHtml = html; root.querySelector('[data-top]').innerHTML = html; }
  }

  // ---------- all picks: a keyed, sortable table, paged (static list) ----------
  const pg = ui.pager('pm-picks', { step: 20 });
  const COLS = [
    { key: 'contract', label: 'Contract', render: (p) => `<div class="cttl">${ui.esc(p.market.title)}</div><div class="sub">${ui.risk('pm', { short: true })} ${sub(p.market)}</div>` },
    { key: 'pick', label: 'Pick', render: (p) => `<span class="pside">${p.side}</span>` },
    { key: 'model', label: 'Model', align: 'r', sort: (p) => p.modelProb, title: 'Model win chance', render: (p) => `${(p.modelProb * 100).toFixed(1)}%` },
    { key: 'price', label: 'Price', align: 'r', sort: (p) => p.marketPrice, title: ui.termTitle('cents'), trend: (p) => p.marketPrice, render: (p) => ui.cents(p.marketPrice) },
    { key: 'edge', label: 'Edge', align: 'r', sort: (p) => p.edge, title: ui.termTitle('ev'), render: (p) => ui.edge(p.edge) },
    { key: 'grade', label: 'Grade', sort: (p) => GR[p.grade], render: (p) => `<b>${p.grade}</b> ${ui.meter(p.confidence, `Confidence ${ui.pct(p.confidence, 0)}`)}` },
    { key: 'why', label: 'Why', pri: 3, render: (p) => `<span class="why2">${ui.esc(p.reasons[0])}</span>` },
    { key: 'stake', label: 'Stake', align: 'r', sort: (p) => p.stake, title: ui.kellyLabel(), render: (p) => `<span class="stk"><b>${ui.money(p.stake, 0)}</b><small>${p.contracts.toLocaleString()} ct</small></span>` },
  ];
  let t = null;
  function sortedPicks() {
    const s = t?.sortState() || { key: 'edge', dir: 'desc' };
    const c = COLS.find((x) => x.key === s.key);
    if (!c?.sort) return picks;
    const m = s.dir === 'asc' ? 1 : -1;
    return [...picks].sort((a, b) => (c.sort(a) - c.sort(b)) * m);
  }
  // The table is rebuilt (not patched) when filters, sort or the page size change, so rows that only left
  // the current page never show as "Gone"; ticks patch it in place.
  function mountTable(focusSort) {
    t?.destroy();
    t = ui.table({
      id: 'pm-picks', caption: 'All AI picks', rowKey: (p) => p.id, columns: COLS, sort: { key: 'edge', dir: 'desc' },
      action: (p) => ui.actions(buy(p), [['log', 'Log']]),
      onAction: { buy: (p) => openPick(p), log: (p) => logPick(p) },
      mobile: { areas: ['contract contract edge', 'pick price stake', 'grade grade model', 'act act act'], cols: 'minmax(0,1fr) auto auto' },
      empty: () => ui.empty({ title: 'No picks for these filters', msg: 'Loosen the grade or pick another venue or category.',
        actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Browse markets', href: '#/pm-markets' }] }),
    });
    const slot = root.querySelector('[data-table]');
    slot.replaceChildren(t.el);
    t.update(pg.slice(sortedPicks()));
    root.querySelector('[data-more]').innerHTML = pg.more(picks.length);
    t.el.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => { pg.reset(); mountTable(b.dataset.sort); }));
    if (focusSort) t.el.querySelector(`[data-sort="${focusSort}"]`)?.focus({ preventScroll: true });
  }
  pg.onMore(() => mountTable());
  const patchTable = () => { t.update(pg.slice(sortedPicks())); root.querySelector('[data-more]').innerHTML = pg.more(picks.length); };

  // ---------- cross-venue comparison ----------
  function renderCompare() {
    const keys = [...new Set(picks.map((p) => p.key))].slice(0, 18);
    const rows = keys.map((k) => pm.compare(k)).filter(Boolean);
    const vs = fb.values.venue === 'All' ? pm.VENUES : [fb.values.venue];
    const price = (r) => (st.side === 'YES' ? r.yes : r.no);
    root.querySelector('[data-cmp]').innerHTML = `<thead><tr><th>Contract (${st.side})</th>${vs.map((x) => `<th class="vc">${venueName(x)}</th>`).join('')}<th class="vc">Sportsbook</th><th class="r">Model fair</th><th class="r">Save</th></tr></thead><tbody data-bf-nodata>
      ${rows.map((c) => {
        const best = st.side === 'YES' ? c.cheapestYes : c.cheapestNo;
        const worst = c.rows.reduce((a, b) => (price(b) > price(a) ? b : a));
        const fair = st.side === 'YES' ? c.fairProb : 1 - c.fairProb;
        const sb = c.sportsbook && st.side === 'YES' ? c.sportsbook : null;
        return `<tr><td data-label="Contract"><div class="cttl">${ui.esc(c.title)}</div><div class="sub">${c.sport ? ui.sport(c.sport) : ui.tag(c.category)}</div></td>
          ${vs.map((x) => { const r = c.rows.find((y) => y.venue === x); const isBest = r && r.marketId === best.marketId; return `<td class="vc" data-label="${venueName(x)}">${r ? `<button type="button" data-open="${r.marketId}" data-side="${st.side}" title="Open in ${venueName(x)}${isBest ? ' · cheapest' : ''}">${ui.cents(price(r), { best: isBest })}</button>` : ui.na('Not listed on this venue')}</td>`; }).join('')}
          <td class="vc" data-label="Sportsbook">${sb ? `${ui.price(sb.american)}<small>${ui.esc(api.bookById[sb.book].short)} · ${Math.round(sb.implied * 100)}% implied</small>` : ui.na('No sportsbook price')}</td>
          <td class="r" data-label="Model fair">${(fair * 100).toFixed(1)}%</td>
          <td class="r" data-label="Save"><span class="save">${price(worst) - price(best)}¢ at ${ui.esc(api.bookById[best.venue].short)}</span></td></tr>`;
      }).join('')}</tbody>`;
  }

  // ---------- actions ----------
  const pickById = (id) => picks.find((x) => x.id === id);
  function openPick(p) {
    const d = pm.deepLink(p.marketId, p.side);
    ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${p.side} @ ${d.price}¢ · ${ui.money(p.stake, 0)}`);
  }
  function logPick(p) {
    const m = p.market;
    ui.logBet({ kind: 'prediction', book: m.venue, sport: m.sport || m.category, market: 'Prediction', selection: `${m.title} · ${p.side} @ ${p.marketPrice}¢`, price: odds.probToAmerican(p.marketPrice / 100), stake: p.stake || 25 });
  }
  ui.onAction(root.querySelector('[data-top]'), {
    buy: (id) => { const p = pickById(id); if (p) openPick(p); },
    log: (id) => { const p = pickById(id); if (p) logPick(p); },
    reset: () => fb.reset(),
  });
  root.querySelector('[data-table]').addEventListener('click', (e) => { if (e.target.closest('[data-act="reset"]')) fb.reset(); });
  root.querySelector('[data-cmp]').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (!o) return;
    const d = pm.deepLink(o.dataset.open, o.dataset.side);
    ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${o.dataset.side} @ ${d.price}¢`);
  });
  ui.onSeg(root, 'side', (val) => {
    st.side = val; v.set({ side: val });
    root.querySelectorAll('[data-seg="side"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === val));
    renderCompare();
  });

  compute(); paintFacts(); paintTop(); mountTable(); renderCompare();
  // Ticks: picks re-price every tick (patched in place); the comparison every tick too.
  const tick = () => { compute(); paintFacts(); paintTop(); patchTable(); renderCompare(); ui.setLiveStatus(root, { updated: Date.now() }); };
  let n = 0;
  const unsub = pm.subscribe(() => { if (++n % 2 === 0) tick(); else renderCompare(); });
  const unStore = store.subscribe(() => { compute(); paintFacts(); paintTop(); patchTable(); });
  return () => { unsub(); unStore(); t?.destroy(); fb.destroy?.(); };
}
