// Sharp Money: volume spikes on Novig / ProphetX, matched to the best US sportsbook or fantasy-app price,
// with exactly what and how much to bet.
//
// Layout (UX rebuild, items B1–B17 + C4): results-first head (facts + live status), one filter row,
// a keyed live table (Edge · Bet · Best @ book · Stake, then Spike× · volume · move · age, one Bet
// primary + Calc · Log · Alert), the collapsed "how" explainer, then the graded record as flat sections.
// The spike drawer is a bet slip with a stale-price guard.

const CSS = `
/* ---- feed table: compact two-line cells, rows ~48px ---- */
.bf-sharp .tbl[data-density="compact"] .ui-t th { padding:8px 8px; white-space:normal; line-height:1.15; vertical-align:bottom; }
.bf-sharp .tbl[data-density="compact"] .ui-t td { padding:6px 8px; }
.bf-sharp .ui-t td { vertical-align:middle; }
.bf-sharp td.act .row-acts { gap:2px; }
.bf-sharp td.act .btn.ghost { padding-inline:4px; font-size:14px; }
.bf-sharp .feed-sec { margin-top:16px; }
.bf-sharp .feed-sec .sec-actions { flex:1 1 auto; justify-content:flex-end; gap:4px 12px; }
.bf-sharp .feed-sec .tbl-tools { padding:0; flex-wrap:nowrap; }
.bf-sharp .feed-sec .tbl-tools .spacer { display:none; }
.bf-sharp .sz-line { margin:0; font-size:var(--t-sm); color:var(--muted); }
.bf-sharp .sz-line b { color:var(--text); }
.bf-sharp .c2 { display:flex; flex-direction:column; gap:1px; min-width:0; line-height:1.2; }
.bf-sharp .c2 > small { font-size:var(--t-xs); color:var(--muted); white-space:nowrap; }
.bf-sharp .sel { display:flex; align-items:center; gap:6px; min-width:0; }
.bf-sharp .sel b { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.bf-sharp .sel .tag { flex:none; }
.bf-sharp .evn { display:flex; align-items:center; gap:6px; min-width:0; font-size:var(--t-xs); color:var(--muted); white-space:nowrap; }
.bf-sharp .evn > span { overflow:hidden; text-overflow:ellipsis; min-width:0; }
.bf-sharp .evn .live-dot { flex:none; }
.bf-sharp .edge-c { align-items:flex-start; gap:2px; }
.bf-sharp .edge-c .risk { padding:0 6px; line-height:15px; font-size:11px; }
/* the Bet column takes the space left over (ellipsis), so the table never runs wider than the page */
.bf-sharp td[data-col="bet"] { width:30%; max-width:0; min-width:150px; }
.bf-sharp .tbl.scrolls .ui-t th { top:0; }
/* NEW marker sits under the edge (not beside it) so a new row never widens the table */
.bf-sharp .ui-t tr.is-new td:first-child::after { display:block; width:max-content; margin:2px 0 0; }
.bf-sharp .bp { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.bf-sharp .stk { white-space:nowrap; align-items:flex-end; }
.bf-sharp .stk > span { line-height:1.1; }
.bf-sharp .stk b { font:900 var(--t-md)/1 var(--f-head); font-variant-numeric:tabular-nums; }
.bf-sharp .stk small { color:var(--muted); font-size:var(--t-xs); margin-left:4px; }
.bf-sharp .stk .ev-line { margin:0; font-size:var(--t-xs); line-height:1.2; white-space:nowrap; }
.bf-sharp .sel .tag { padding:0 6px; line-height:16px; }
.bf-sharp .spx-c { align-items:flex-end; }
.bf-sharp .spx { font-weight:800; color:var(--sx-ink); white-space:nowrap; }
.bf-sharp .spx-c .meter { width:44px; height:5px; }
.bf-sharp .vol, .bf-sharp .mv { white-space:nowrap; }
.bf-sharp .vol .book { margin-right:2px; }
.bf-sharp .mv .was { color:var(--muted); text-decoration:line-through; font-size:var(--t-xs); }
/* ---- graded record: flat sections side by side ---- */
.bf-sharp .rec-grid { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:0 32px; align-items:start; }
.bf-sharp .rec-grid > .sec { margin-top:24px; }
.bf-sharp .rec-top { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.2fr); gap:12px 24px; align-items:center; }
.bf-sharp .rec-curve svg { width:100%; height:64px; display:block; }
.bf-sharp .rec-curve small { display:block; color:var(--muted); font-size:var(--t-xs); margin-top:2px; }
.bf-sharp .mini { width:100%; border-collapse:collapse; font-size:var(--t-sm); margin-top:14px; }
.bf-sharp .mini th, .bf-sharp .mini td { padding:6px 4px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.bf-sharp .mini th { color:var(--muted); font-size:var(--t-xs); font-weight:700; }
.bf-sharp .mini td:first-child, .bf-sharp .mini th:first-child { text-align:left; }
.bf-sharp .mini .up { color:var(--pos); font-weight:700; }
.bf-sharp .graded td { vertical-align:middle; }
.bf-sharp .graded td:first-child b { display:block; font-weight:700; }
.bf-sharp .graded td:first-child small { color:var(--muted); font-size:var(--t-xs); }
.bf-sharp .graded td:last-child { width:1%; white-space:nowrap; }
:root { --sx-ink:#8a5300; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sx-ink:#f1c36a; } }
:root[data-theme="dark"] { --sx-ink:#f1c36a; }
@media (max-width:1100px) { .bf-sharp .rec-grid { grid-template-columns:minmax(0,1fr); } }
@media (max-width:860px) {
  .bf-sharp .ui-t tbody tr { gap:2px 10px; padding:8px 2px; }
  .bf-sharp td[data-col="bet"] { width:auto; max-width:none; min-width:0; }
  .bf-sharp .rec-top { grid-template-columns:minmax(0,1fr); }
  .bf-sharp .stk { text-align:right; }
  /* Phone row 2 is Edge · Best price · Bet this: the price + book chip keep their width (auto track) and the
     stake cell takes what's left, so "wins ~48% · worth +$0.26" wraps under the stake instead of running
     left over the book chip. */
  .bf-sharp .stk, .bf-sharp .stk > span { white-space:normal; min-width:0; }
  .bf-sharp .ui-t .stk .ev-line { white-space:normal; overflow:visible; text-overflow:clip; }
  .bf-sharp .stk .ev-line .nw { white-space:nowrap; } /* breaks only between "wins ~48%" and "worth +$0.26" */
}
/* ---- spike drawer ---- */
.sharp-dr .chart { width:100%; height:auto; display:block; }
.sharp-dr .chart text { font-size:10px; fill:var(--muted); font-family:var(--f-body); }
.sharp-dr h3 { font-size:var(--t-md); margin:4px 0 8px; }
.sharp-dr .bk-t { width:100%; border-collapse:collapse; font-size:var(--t-sm); }
.sharp-dr .bk-t td { padding:7px 4px; border-bottom:1px solid var(--line-2); }
.sharp-dr .bk-t td:last-child { text-align:right; }
.sharp-dr .bk-t td.ty { color:var(--muted); font-size:var(--t-xs); }
.sharp-dr .legend { display:flex; gap:12px; font-size:var(--t-xs); color:var(--muted); margin-top:4px; flex-wrap:wrap; }
.sharp-dr .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
.sharp-dr .sizer { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap; }
.sharp-dr .sizer small { color:var(--muted); font-size:var(--t-xs); }
.sharp-dr .foot-note { color:var(--muted); font-size:var(--t-sm); margin:0; }`;

const fmtK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `$${Math.round(v / 1e3)}k` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}k` : `$${Math.round(v)}`);

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-sharp-money')) document.head.insertAdjacentHTML('beforeend', `<style id="css-sharp-money">${CSS}</style>`);

  const rec = api.sharp.record();
  const money0 = (x) => odds.money(x, 0);
  const bookName = (id) => api.bookById[id]?.name || id;
  const exName = (id) => api.bookById[id]?.name || id;

  // ---------------------------------------------------------------------------------------------
  // Head: static H1, one-line subtitle (full explanation behind "How it works"), live status, facts.
  // ---------------------------------------------------------------------------------------------
  root.innerHTML = `<div class="bf-sharp">
    ${ui.pageHead({
      title: 'Sharp Money',
      tool: 'sharp-money',
      subtitle: 'Bet where the pros actually put their money: volume spikes on Novig and ProphetX, matched to the best price at your books.',
      live: { label: 'Watching exchanges' },
      facts: factsFor([]),
    })}
    ${ui.sec('Live spike feed', '<div data-filters></div><div data-table></div><div data-lock></div>', {
      cls: 'feed-sec',
      // The sizing line and the table tools (updates · apply, density, Columns) share the heading row.
      actions: '<p class="sz-line" data-sizing></p><span data-tools-slot></span>',
    })}
    ${ui.how({
      title: 'Follow the money, not the touts',
      summary: 'How it works: sharps get limited at sportsbooks, so they bet on public exchanges, and we follow the money.',
      checks: [
        'Bet where the pros actually put their money. Sportsbooks limit sharp bettors, so they bet big on Novig and ProphetX, where every bet is public. When a line there suddenly spikes in volume, we find you the best price on the same bet, and tell you exactly what and how much to bet.',
        'Sharp bettors get limited at regular sportsbooks, so they move their action to the exchanges. Every matched bet on <strong>Novig</strong> and <strong>ProphetX</strong> is public.',
        'We watch volume on every line, from sides and totals to player props like <em>LeBron over 20.5 points</em>. We follow whole lines, not individual bettors.',
        `When a line trades several times its normal volume, that is sharp money: a ${ui.term('steam', 'volume spike')}.`,
        `We find the best price on the same bet at your US sportsbooks and fantasy apps (PrizePicks, Underdog), and size the bet from your ${ui.term('bankroll')} with ${ui.term('kelly', 'Kelly')}, scaled by the strength of the spike.`,
        `Every spike is a ${ui.term('signal')}: it can lose. The graded record below shows how they have done. Change your bankroll, Kelly and books in <a href="#/account">Settings</a>.`,
      ],
    })}
    <div class="rec-grid">
      ${ui.sec('Graded record · last 90 days', recordHtml(), { actions: ui.status(`${odds.pct(rec.overall.roi)} ROI`, 'ok') })}
      ${ui.sec('Recently graded', `<table class="mini graded"><caption class="sr-only">Recently graded spikes</caption><tbody data-bf-nodata>
        ${rec.recent.slice(0, 8).map((g) => `<tr><td><b>${ui.esc(g.selection)}</b><small>${ui.esc(g.sport)} · ${g.spikeX}× spike · ${ui.ago(g.gradedAt)}</small></td><td>${ui.price(g.price)}</td><td>${g.result === 'won' ? ui.status('Won', 'ok') : ui.status('Lost', 'bad')}</td></tr>`).join('')}
      </tbody></table>${ui.related([['bettor-signals', 'Pro Bettor Signals'], ['positive-ev', 'Positive EV'], ['tracker', 'Bet Tracker']])}`)}
    </div>
  </div>`;

  function recordHtml() {
    const o = rec.overall;
    return `<div class="rec-top">
        <dl class="kv" data-bf-nodata>
          <dt>Signals graded</dt><dd>${o.signals.toLocaleString()}</dd>
          <dt>Record</dt><dd>${o.wins.toLocaleString()}-${o.losses.toLocaleString()} (${odds.pct(o.winRate)})</dd>
          <dt>Profit</dt><dd class="pos">+${o.units}u</dd>
          <dt>Avg closing line value</dt><dd>+${odds.pct(o.clv)}</dd>
        </dl>
        <div class="rec-curve">${curveSvg(rec.curve)}<small>Cumulative units, last 90 days</small></div>
      </div>
      <table class="mini"><thead><tr><th>Sport</th><th>Signals</th><th>Win %</th><th>ROI</th><th title="${ui.termTitle('clv')}">CLV</th></tr></thead><tbody data-bf-nodata>
        ${rec.bySport.map((s) => `<tr><td>${ui.esc(s.sport)}</td><td>${s.signals}</td><td>${odds.pct(s.winRate)}</td><td class="up">+${odds.pct(s.roi)}</td><td>+${odds.pct(s.clv)}</td></tr>`).join('')}
      </tbody></table>
      <table class="mini"><thead><tr><th>Market</th><th>Signals</th><th>ROI</th><th title="${ui.termTitle('clv')}">CLV</th></tr></thead><tbody data-bf-nodata>
        ${rec.byMarket.map((s) => `<tr><td>${ui.esc(s.market)}</td><td>${s.signals}</td><td class="up">+${odds.pct(s.roi)}</td><td>+${odds.pct(s.clv)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  function curveSvg(vals) {
    const w = 300, h = 56, min = Math.min(0, ...vals), max = Math.max(...vals), span = max - min || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 10)}`);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Cumulative units, last 90 days">
      <polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="var(--pos-bg)"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--pos)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // Facts strip (max 4 money facts). The old feed-card header counts live in the notes.
  function factsFor(rows) {
    const hourAgo = Date.now() - 3600e3;
    const lastHour = rows.filter((r) => r.detectedAt >= hourAgo);
    const biggest = rows.reduce((a, r) => (!a || r.spikeX > a.spikeX ? r : a), null);
    const avgEdge = rows.reduce((a, r) => a + r.edge, 0) / Math.max(1, rows.length);
    const top10 = rows.slice(0, 10).reduce((a, r) => a + r.recommendedStake, 0);
    const latest = rows.reduce((a, r) => Math.max(a, r.detectedAt), 0);
    return [
      { label: 'Spikes in the last hour', value: String(lastHour.length), note: rows.length ? `${rows.length} actionable · last ${ui.ago(latest)}` : 'none match your filters' },
      // Hidden instead of "—" when nothing matches (B8).
      biggest && { label: 'Biggest spike', value: `${biggest.spikeX}×`, note: ui.esc(biggest.selection) },
      rows.length && { label: 'Avg edge at best price', value: `+${odds.pct(avgEdge)}`, tone: 'pos', note: `${money0(top10)} suggested on the top 10`, term: 'ev' },
      { label: 'Signal record (90d)', value: odds.pct(rec.overall.winRate), note: `+${odds.pct(rec.overall.roi)} ROI · +${rec.overall.units}u` },
    ];
  }

  // ---------------------------------------------------------------------------------------------
  // Filters: one row (Timing → Sport → Market → Exchange → Min spike → fantasy apps → Books).
  // Timing is the shared mode switch, so ?mode=live works here too.
  // ---------------------------------------------------------------------------------------------
  const fb = ui.filterBar({
    id: 'sharp',
    fields: [
      { key: 'mode', type: 'mode', label: 'Timing', default: 'all', options: [['all', 'All'], ['pre', 'Pre-game'], ['live', 'Live']], query: true },
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: [['All', 'All sports'], ...api.sports.map((s) => [s, s])], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: [['All', 'All markets'], ['Player Prop', 'Player props'], ['Moneyline', 'Moneyline'], ['Spread', 'Spread'], ['Total', 'Total']], query: true },
      { key: 'exchange', type: 'select', label: 'Exchange', default: 'all', options: [['all', 'Both'], ['novig', 'Novig'], ['px', 'ProphetX']] },
      { key: 'minSpike', type: 'select', label: 'Min spike', default: '2', options: [['2', '2×'], ['3', '3×'], ['5', '5×'], ['8', '8×']], chip: (v) => `Spike ${v}×+` },
      { key: 'includeDfs', type: 'toggle', label: 'Include fantasy apps (PrizePicks, Underdog)', default: true, chip: () => 'No fantasy apps' },
      { key: 'books', type: 'books' },
    ],
    onChange: () => paint(),
  });
  root.querySelector('[data-filters]').append(fb.el);
  const f = fb.values;

  const sizeOpts = () => { const s = store.get(); return { books: s.books, bankroll: s.bankroll, kellyMult: s.kellyMult }; };
  const query = () => api.sharp.spikes({
    sport: f.sport, exchange: f.exchange, minSpike: Number(f.minSpike), market: f.market, includeDfs: !!f.includeDfs,
    live: f.mode === 'all' ? undefined : f.mode === 'live', ...sizeOpts(),
  }).filter((x) => x.edge > 0);
  const readSpike = (id) => api.sharp.spikes({ ...sizeOpts(), includeDfs: !!f.includeDfs }).find((x) => x.id === id) || null;

  // ---------------------------------------------------------------------------------------------
  // The live table (keyed, frozen under the cursor, NEW / Gone markers, tick tints).
  // ---------------------------------------------------------------------------------------------
  const betCell = (r) => {
    const ev = api.eventById(r.eventId);
    return `<div class="c2"><span class="sel"><b title="${ui.esc(r.selection)}">${ui.esc(r.selection)}</b>${r.market === 'Player Prop' ? ui.tag('Prop') : ''}</span>
      <span class="evn"><span>${ui.esc(r.sport)} · ${ui.esc(ev.away)} @ ${ui.esc(ev.home)}</span>${ev.live ? ui.liveDot() : `<span>${ui.when(ev.start)}</span>`}</span></div>`;
  };
  // Stake + the dollarised line ("wins ~51% · worth +$3.03"); the payout is on the drawer slip.
  const stakeCell = (r) => `<div class="c2 stk"><span><b>${money0(r.recommendedStake)}</b><small>to win ${money0(r.toWin)}</small></span>${ui.evLine({ prob: r.fairProb, ev: r.recommendedStake * r.edge }).replace(/(wins ~\d+%|worth [+-]\$[\d,.]+)/g, '<span class="nw">$1</span>')}</div>`;

  const t = ui.table({
    id: 'sharp-spikes',
    caption: 'Live volume spikes and the best price for each',
    rowKey: (r) => r.id,
    columns: [
      { key: 'edge', label: 'Edge', sort: (r) => r.edge, trend: (r) => r.edge, title: ui.termTitle('ev'),
        render: (r) => `<div class="c2 edge-c">${ui.edge(r.edge)}${ui.risk('sharp', { short: true })}</div>` },
      { key: 'bet', label: 'Bet', render: betCell },
      { key: 'best', label: 'Best price', sort: (r) => r.bestPrice, trend: (r) => r.bestPrice,
        render: (r) => `<span class="bp" title="Best price at ${ui.esc(bookName(r.bestBook))}">${ui.price(r.bestPrice, { best: true })}${ui.book(r.bestBook)}</span>` },
      { key: 'stake', label: 'Bet this', align: 'r', sort: (r) => r.recommendedStake, title: ui.kellyLabel(), render: stakeCell },
      { key: 'spike', label: 'Spike', align: 'r', sort: (r) => r.spikeX, title: ui.termTitle('steam'),
        render: (r) => `<div class="c2 spx-c"><span class="spx" title="${r.spikeX}× normal volume">${r.spikeX}×</span>${ui.meter(r.confidence, `Confidence ${odds.pct(r.confidence, 0)}`)}</div>` },
      { key: 'volume', label: 'Exchange volume', sort: (r) => r.volume,
        render: (r) => `<div class="c2 vol"><span>${ui.book(r.exchange)}<b>${fmtK(r.volume)}</b></span><small>in ${r.window} min</small></div>` },
      { key: 'move', label: 'Exchange price',
        render: (r) => `<div class="c2 mv"><span class="was" title="Before the spike">${ui.fmtOdds(r.priceBefore)}</span><span>→ ${ui.price(r.priceNow)} ${ui.dir(odds.impliedProb(r.priceNow) - odds.impliedProb(r.priceBefore))}</span></div>` },
      { key: 'age', label: 'Age', align: 'r', sort: (r) => r.detectedAt, render: (r) => `<span class="muted" title="Spike detected ${ui.ago(r.detectedAt)}">${ui.age(r.detectedAt)}</span>` },
    ],
    action: (r) => ui.actions(
      ui.betAction({ verb: 'Bet', amount: money0(r.recommendedStake), book: r.bestBook, title: `Bet ${money0(r.recommendedStake)} at ${bookName(r.bestBook)}` }),
      [['calc', 'Calc'], ['log', 'Log'], ['alert', 'Alert']],
    ),
    onAction: {
      bet: (r) => ui.toast(`Opening ${bookName(r.bestBook)} bet slip…`),
      calc: (r) => { location.hash = calcHref(r, r.recommendedStake); },
      log: (r) => logSpike(r, r.recommendedStake),
      alert: (r) => alertSpike(r),
    },
    onOpen: (r) => openSpike(r.id),
    sort: { key: 'age', dir: 'desc' },
    mobile: { areas: ['bet bet bet age', 'edge best stake stake', 'act act act act'], cols: 'auto auto minmax(0,1fr) auto' },
    empty: () => emptyHtml(),
  });
  root.querySelector('[data-table]').append(t.el);
  const tools = t.el.querySelector('.tbl-tools');
  if (tools) root.querySelector('[data-tools-slot]').replaceWith(tools);

  function emptyHtml() {
    // Nearest matches: the best spikes with every filter relaxed (same books and sizing).
    const near = api.sharp.spikes({ ...sizeOpts(), includeDfs: true }).filter((x) => x.edge > 0)
      .sort((a, b) => b.edge - a.edge).slice(0, 3)
      .map((r) => `<p><b>${ui.esc(r.selection)}</b> · ${r.spikeX}× · ${ui.price(r.bestPrice)} at ${ui.esc(bookName(r.bestBook))} · ${ui.edge(r.edge)}</p>`).join('');
    const acts = [{ label: 'Reset filters', act: 'reset' }];
    if (f.mode !== 'all') acts.push({ label: 'Show all timings', act: 'all-timing' });
    acts.push({ label: 'Alert me', href: '#/alerts' }, { label: 'Pro Bettor Signals', href: '#/bettor-signals' });
    return ui.empty({ title: 'No spikes match these filters', msg: 'Nothing is spiking with these filters right now. New spikes appear here the moment they hit.', actions: acts, near, mate: true });
  }
  ui.onAction(root.querySelector('.feed-sec'), {
    reset: () => fb.reset(),
    'all-timing': () => fb.set({ mode: 'all' }),
  });

  // ---------------------------------------------------------------------------------------------
  // Paint (every tick + store / filter changes): facts, sizing line, rows (locked preview if needed).
  // ---------------------------------------------------------------------------------------------
  const sizingEl = root.querySelector('[data-sizing]');
  const lockEl = root.querySelector('[data-lock]');
  let lastFacts = '', lastSizing = '', lastLock = '';
  function paint() {
    const rows = query();
    // Repaint the facts / sizing line only when their HTML changed (keeps the editor watcher quiet).
    const fHtml = ui.facts(factsFor(rows));
    const fEl = root.querySelector('.page-head > .facts');
    if (fEl && lastFacts !== fHtml) { fEl.outerHTML = fHtml; lastFacts = fHtml; }
    const s = store.get();
    const sz = `Stakes sized from your <b data-bf-nodata>${money0(s.bankroll)}</b> bankroll · <b data-bf-nodata>${s.kellyMult}× Kelly</b>, scaled by signal confidence · <button type="button" class="linkish" data-open-sizing>Change</button>`;
    if (lastSizing !== sz) { sizingEl.innerHTML = sz; lastSizing = sz; }
    const { rows: shown, card } = ui.lockRows(rows, 'sharp-money', { n: 3, noun: 'spikes' });
    if (lastLock !== card) { lockEl.innerHTML = card; lastLock = card; }
    t.update(shown);
  }

  // ---------------------------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------------------------
  function calcHref(r, stake) {
    // Kelly calculator, prefilled: a = your price, b = fair price, stake.
    return `#/calculators?tab=kelly&a=${r.bestPrice}&b=${r.fairPrice}&stake=${Math.round(stake)}`;
  }
  function logSpike(r, stake) {
    ui.logBet({ kind: 'sharp', book: r.bestBook, sport: r.sport, market: r.market, selection: r.selection, price: r.bestPrice, stake });
  }
  function alertSpike(r) {
    ui.toast(`Alert set: ${r.selection} at ${ui.fmtOdds(r.bestPrice)} or better`);
  }

  // ---------------------------------------------------------------------------------------------
  // Spike drawer: a bet slip (order, stake, Bet / Log / Alert in the sticky footer), the evidence
  // (volume + exchange price charts, every price) and a stale-price guard.
  // ---------------------------------------------------------------------------------------------
  function openSpike(id) {
    const s = store.get();
    let r = readSpike(id);
    if (!r) { ui.toast('That spike has gone'); return; }
    const h = api.sharp.history(id);
    const line = api.lineById(r.lineId);
    const ev = api.eventById(r.eventId);
    const typeLbl = (b) => ({ exchange: 'Exchange', sharp: 'Sharp book', dfs: 'Fantasy app', sportsbook: 'Sportsbook' }[api.bookById[b]?.type] || '');
    let stake = r.recommendedStake;

    const allPrices = (x) => {
      const ps = Object.entries(line.prices).map(([b, p]) => ({ b, p: p[x.outcomeIndex] }));
      if (x.market === 'Player Prop' && f.includeDfs) ps.push({ b: 'pp', p: -119 }, { b: 'ud', p: -122 });
      return ps.sort((a, b) => b.p - a.p);
    };
    const orderHtml = (x) => {
      const win = stake * (odds.toDecimal(x.bestPrice) - 1);
      return ui.slip({
        caption: 'Your bet', tag: `${x.spikeX}× spike`,
        legs: [{ title: ui.esc(x.selection), sub: `${ui.esc(bookName(x.bestBook))} · ${ui.esc(line.label)}`, odds: ui.fmtOdds(x.bestPrice), stake: money0(stake) }],
        result: `To win ${money0(win)} · worth ${x.edge >= 0 ? '+' : '-'}${odds.money(Math.abs(stake * x.edge))} on average`,
        math: `Fair odds ${ui.fmtOdds(x.fairPrice)} · edge +${odds.pct(x.edge, 2)} · confidence ${odds.pct(x.confidence, 0)}. ${ui.riskWin(stake, x.bestPrice)}.`,
      });
    };
    const factsHtml = (x) => ui.facts([
      { label: `${exName(x.exchange)} volume`, value: fmtK(x.volume), note: `in ${x.window} min` },
      { label: 'vs normal', value: `${x.spikeX}×`, note: `baseline ${fmtK(x.baseline)}`, term: 'steam' },
      { label: 'Exchange move', value: `${ui.fmtOdds(x.priceBefore)} → ${ui.fmtOdds(x.priceNow)}`, note: ui.ago(x.detectedAt) },
    ]);
    const pricesHtml = (x) => allPrices(x).map(({ b, p }) => `<tr><td>${ui.book(b, { full: true })} ${s.books.includes(b) ? ui.tag('Your book') : ''}</td><td class="ty">${typeLbl(b)}</td><td>${ui.price(p, { best: b === x.bestBook })}</td></tr>`).join('');
    const footer = (x) => `${ui.betAction({ verb: 'Bet now at', amount: `${ui.esc(api.bookById[x.bestBook]?.short || bookName(x.bestBook))} ${ui.fmtOdds(x.bestPrice)}`, book: x.bestBook, size: '', autofocus: true })}${ui.ghost('log', 'Log bet')}${ui.ghost('alert', 'Alert')}`;

    const body = ui.drawer('Sharp money signal', `<div class="sharp-dr stack">
      <div>${ui.eventCell(r.eventId)}</div>
      <div data-order>${orderHtml(r)}</div>
      <div class="sizer">${ui.numberInput('stake', stake, 'Stake', { prefix: '$', step: 5 })}
        <small data-bf-nodata data-sugg>${ui.esc(ui.kellyLabel())}: ${money0(r.recommendedStake)}</small></div>
      <div data-facts>${factsHtml(r)}</div>
      <div><h3>Volume traded (5-min buckets, last 2h)</h3>${volChart(h)}
        <div class="legend"><span><i style="background:var(--sx-ink)"></i>Spike</span><span><i style="background:var(--line)"></i>Normal</span><span>- - - Normal volume</span></div></div>
      <div><h3>${ui.esc(exName(r.exchange))} price</h3>${priceChart(h)}</div>
      <div><h3>Every price on this bet</h3><table class="bk-t"><tbody data-prices data-bf-nodata>${pricesHtml(r)}</tbody></table></div>
      <div class="row">${ui.calcLink({ tab: 'kelly', a: r.bestPrice, b: r.fairPrice, stake })}</div>
      <p class="foot-note">${ui.esc(ev.away)} @ ${ui.esc(ev.home)} · ${ui.esc(line.label)} · Stake = ${s.kellyMult}× ${ui.term('kelly', 'Kelly')} at ${ui.term('fair', 'fair odds')}, scaled by signal confidence. Sportsbooks may limit how much you can bet at this price.</p>
      ${ui.related([['bettor-signals', 'Pro Bettor Signals'], ['positive-ev', 'Positive EV'], ['deposit-optimizer', 'Deposit Optimizer']])}
    </div>`, { risk: 'sharp', kicker: ui.esc(r.selection), footer: footer(r) });

    const repaint = () => {
      body.querySelector('[data-order]').innerHTML = orderHtml(r);
      body.querySelector('[data-facts]').innerHTML = factsHtml(r);
      body.querySelector('[data-prices]').innerHTML = pricesHtml(r);
      const cl = body.querySelector('[data-calc-link]');
      if (cl) cl.setAttribute('href', calcHref(r, stake));
    };
    ui.onNumber(body, 'stake', (v) => { stake = v; repaint(); });
    ui.onAction(body.panel, {
      bet: () => ui.toast(`Opening ${bookName(r.bestBook)} bet slip…`),
      log: () => logSpike(r, stake),
      alert: () => alertSpike(r),
    });
    // Stale-price guard: re-read the spike every tick; say when the price moved or it's gone.
    ui.liveGuard(body, {
      read: () => readSpike(id),
      sig: (x) => `${x.bestBook}:${x.bestPrice}`,
      onUpdate: (n, prev) => {
        r = n;
        repaint();
        body.setFooter(footer(n));
        return `Price moved ${ui.fmtOdds(prev.bestPrice)} → ${ui.fmtOdds(n.bestPrice)} at ${bookName(n.bestBook)}: edge now ${n.edge >= 0 ? '+' : ''}${odds.pct(n.edge, 2)}`;
      },
      goneMsg: 'This spike is gone: the best price no longer beats fair odds. Nothing was placed.',
    });
  }

  function volChart(h) {
    const W = 480, H = 150, pad = 18, n = h.buckets.length, bw = (W - 8) / n;
    const max = Math.max(...h.buckets.map((b) => b.volume)) * 1.08;
    const y = (v) => H - pad - (v / max) * (H - pad - 8);
    const bars = h.buckets.map((b, k) => `<rect x="${4 + k * bw + 1.5}" y="${y(b.volume)}" width="${bw - 3}" height="${H - pad - y(b.volume)}" rx="2" fill="${b.spike ? 'var(--sx-ink)' : 'var(--line)'}"><title>${fmtK(b.volume)}</title></rect>`).join('');
    const bl = y(h.baselinePerBucket);
    const top = h.buckets[n - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume per 5 minutes">${bars}
      <line x1="0" x2="${W}" y1="${bl}" y2="${bl}" stroke="var(--muted)" stroke-dasharray="4 4"/>
      <text x="${W - 4}" y="${y(top.volume) - 4}" text-anchor="end" style="fill:var(--text);font-weight:700">${fmtK(top.volume)}</text>
      <text x="4" y="${H - 4}">−2h</text><text x="${W / 2}" y="${H - 4}" text-anchor="middle">−1h</text><text x="${W - 4}" y="${H - 4}" text-anchor="end">now</text></svg>`;
  }
  function priceChart(h) {
    const W = 480, H = 120, pad = 18;
    const ps = h.prices.map((p) => p.prob);
    const min = Math.min(...ps) - 0.01, max = Math.max(...ps) + 0.01;
    const x = (k) => 34 + (k / (ps.length - 1)) * (W - 40);
    const y = (p) => H - pad - ((p - min) / (max - min)) * (H - pad - 10);
    const pts = ps.map((p, k) => `${x(k)},${y(p)}`).join(' ');
    const first = h.prices[0], last = h.prices[h.prices.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Exchange price over time">
      <line x1="34" x2="${W}" y1="${y(first.prob)}" y2="${y(first.prob)}" stroke="var(--line)" stroke-dasharray="3 3"/>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="${x(ps.length - 1)}" cy="${y(last.prob)}" r="4" fill="var(--accent)"/>
      <text x="0" y="${y(first.prob) + 3}">${ui.fmtOdds(first.price)}</text>
      <text x="${x(ps.length - 1) - 8}" y="${y(last.prob) - 8}" text-anchor="end" style="fill:var(--text);font-weight:700">${ui.fmtOdds(last.price)}</text>
      <text x="34" y="${H - 4}">−2h</text><text x="${W - 4}" y="${H - 4}" text-anchor="end">now</text></svg>`;
  }

  paint();
  // Deep link (#/sharp-money?id=sp12) opens that spike's drawer; a gone spike just shows the list.
  if (params?.id) setTimeout(() => { if (readSpike(params.id)) openSpike(params.id); else ui.toast('That spike has gone. Here are the live ones.'); }, 0);
  const unTick = api.onTick(() => paint());
  const unStore = store.subscribe(() => paint());
  return () => { unTick(); unStore(); fb.destroy?.(); t.destroy(); };
}
