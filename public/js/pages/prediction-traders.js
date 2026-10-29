// Prediction Traders: algorithmically selected traders on Kalshi, Polymarket, ProphetX and Novig, with
// pre-match and live recommendations, Kelly sizing from your bankroll and deep links to each venue.
// Results-first (B1): live status, mode switch and 4 facts in the head, then the calls as flat rows with
// ONE merged primary per call (B2: "Buy NO · $110 · Novig ↗"), the leaderboard as a right rail.
// Editor contract: headings are static; the call list is one [data-bf-list] and every live value is nodata.

const CSS = `
/* Tighter head-to-results spacing so the first result sits within the 300px target at 1440 (B1). */
.pmt .page-head.ph { margin-bottom: 6px; }
.pmt .page-head.ph > .facts { margin-top: 2px; }
.pmt .layout .sec-head .seg button, .pmt .layout .sec-head .btn.sm { padding-block: 3px; }
.pmt .layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; align-items: start; }
.pmt .layout > .sec { margin-top: 0; padding-top: 8px; }
/* Section labels in the PM family are small kickers, so the first call sits high (B1). */
.pmt .layout > .sec > .sec-head { margin-bottom: 8px; }
/* Section headings use the shared .sec scale (app.css .sec-head h2), like every other screen. */
.pmt .sec-head .h-l { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.pmt .feed-sub { margin: 0; font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmt .feed { display: grid; }
.pmt .rec { display: grid; gap: 7px; padding: 14px 4px 14px 14px; border-bottom: 1px solid var(--line); border-left: 4px solid transparent; }
.pmt .rec:first-child { border-top: 1px solid var(--line); }
.pmt .rec.exit-now { border-left-color: var(--warn); background: color-mix(in srgb, var(--warn-bg) 55%, transparent); }
.pmt .rec .top { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmt .rec .top .stt { margin-left: auto; }
.pmt .rec .ttl { margin: 0; font: 700 var(--t-md)/1.3 var(--f-body); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
/* YES / NO side tags: identical styling (symmetric, B7). The word carries the meaning. */
.pmt .pside, .pmt-drawer .pside { display: inline-block; font: 900 12px/1 var(--f-head); letter-spacing: .06em; padding: 4px 7px 3px; border-radius: 6px; border: 2px solid var(--line-strong); color: var(--text); background: var(--paper); }
.pmt .by { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: var(--t-xs); color: var(--muted); }
.pmt .handle { font: inherit; font-weight: 700; color: var(--accent); background: none; border: 0; padding: 0; cursor: pointer; }
.pmt .handle:hover { text-decoration: underline; }
.pmt .nums { display: grid; grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr)) minmax(150px, 1.3fr); gap: 4px 14px; align-items: end; }
.pmt .nums > div > span { display: block; font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmt .nums strong { font-variant-numeric: tabular-nums; font-size: var(--t-body); white-space: nowrap; }
.pmt .nums small { white-space: nowrap; }
.pmt .nums small { font-weight: 700; font-size: var(--t-xs); }
.pmt .pos { color: var(--pos); } .pmt .neg { color: var(--neg); }
.pmt .meter { margin-left: 4px; vertical-align: middle; }
/* Entry / stop / target track: neutral (no red-to-green colour coding), labelled marks. */
.pmt .range { position: relative; height: 30px; margin: 0 8px; }
.pmt .range .track { position: absolute; left: 0; right: 0; top: 19px; height: 4px; border-radius: 2px; background: var(--line); }
.pmt .range .mk { position: absolute; top: 14px; width: 2px; height: 14px; background: var(--line-strong); transform: translateX(-1px); }
.pmt .range .now { position: absolute; top: 15px; width: 12px; height: 12px; border-radius: 50%; background: var(--g); border: 2px solid var(--paper); transform: translateX(-6px); box-shadow: 0 0 0 1px var(--g); transition: left .5s ease; }
.pmt .range small { position: absolute; top: 0; font-size: 10.5px; font-weight: 700; color: var(--muted); transform: translateX(-50%); white-space: nowrap; }
.pmt .foot { display: flex; gap: 8px 14px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.pmt .stake { display: grid; gap: 1px; min-width: 0; }
.pmt .stake > span { font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmt .stake .fig { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.pmt .stake .fig b { font: 900 var(--t-fig)/1 var(--f-head); font-variant-numeric: tabular-nums; }
.pmt .stake .fig small { font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmt .stake .ev-line { margin: 0; }
.pmt .row-acts { flex-wrap: wrap; }

/* Leaderboard rail: flat rows on the page ground; the score explainer is one click away. */
.pmt .lb .lb-sub { margin: 0 0 8px; font-size: var(--t-sm); color: var(--muted); }
.pmt .weights { margin-bottom: 8px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.pmt .weights > summary { cursor: pointer; padding: 9px 0; font-size: var(--t-sm); font-weight: 800; color: var(--accent); list-style: none; display: flex; justify-content: space-between; }
.pmt .weights > summary::-webkit-details-marker { display: none; }
.pmt .weights[open] .wchev { transform: rotate(180deg); }
.pmt .weights .wbody { display: grid; gap: 6px; padding: 0 0 12px; }
.pmt .weights .w { display: grid; grid-template-columns: minmax(0, 1fr) 90px 34px; gap: 8px; align-items: center; font-size: var(--t-xs); }
.pmt .weights .w b { text-align: right; font-variant-numeric: tabular-nums; }
.pmt .weights p { margin: 2px 0 0; font-size: var(--t-xs); color: var(--muted); }
.pmt .trow { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 9px 4px; border-bottom: 1px solid var(--line-2); cursor: pointer; }
.pmt .trow:hover { background: var(--panel); }
.pmt .trow .rk { font: 900 var(--t-md)/1 var(--f-head); color: var(--muted); text-align: center; }
.pmt .trow .nm { display: block; max-width: 100%; font-weight: 800; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.pmt .trow .sub { font-size: var(--t-xs); color: var(--muted); display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; align-items: center; }
.pmt .score { text-align: right; } .pmt .score strong { font: 900 var(--t-lg)/1 var(--f-head); display: block; }
.pmt .score small { font-size: 11px; color: var(--muted); font-weight: 700; }
.pmt .fbtn { min-width: 92px; }
.pmt .how-sec { margin-top: 28px; }

.pmt-drawer .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 6px; border-top: 1px solid var(--line); }
.pmt-drawer .kpis > div { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--line); }
.pmt-drawer .kpis span { display: block; font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmt-drawer .kpis strong { font-variant-numeric: tabular-nums; }
.pmt-drawer h3 { font: 900 var(--t-md)/1 var(--f-head); text-transform: uppercase; margin: 18px 0 8px; }
.pmt-drawer .pnl svg { display: block; width: 100%; }
.pmt-drawer .pnl text { fill: var(--muted); font-size: 11px; }
.pmt-drawer .readout { font-size: var(--t-sm); min-height: 20px; }
.pmt-drawer .bars { display: grid; gap: 7px; }
.pmt-drawer .bars .b { display: grid; grid-template-columns: 170px minmax(0, 1fr) 36px; gap: 8px; align-items: center; font-size: var(--t-sm); }
.pmt-drawer .bars .b b { text-align: right; }
.pmt-drawer .r { text-align: right; font-variant-numeric: tabular-nums; }
.pmt-drawer .pos { color: var(--pos); } .pmt-drawer .neg { color: var(--neg); }
.pmt-drawer .call { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line-2); font-size: var(--t-sm); }
.pmt-drawer .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
@media (max-width: 1180px) { .pmt .nums { grid-template-columns: repeat(4, minmax(0, 1fr)); } .pmt .nums .range { grid-column: 1 / -1; } }
@media (max-width: 1100px) { .pmt .layout { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 860px) {
  .pmt .rec { padding: 12px 0 12px 10px; }
  .pmt .nums { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmt .foot .row-acts { width: 100%; justify-content: flex-start; }
  .pmt .foot .bet-action { flex: 1 1 100%; justify-content: center; }
  .pmt-drawer .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmt-drawer .bars .b { grid-template-columns: 120px minmax(0, 1fr) 30px; }
}`;

export default function render(root, ctx) {
  const { api, ui, store, odds, params } = ctx;
  const pm = api.prediction;
  if (!document.getElementById('css-prediction-traders')) {
    const s = document.createElement('style'); s.id = 'css-prediction-traders'; s.textContent = CSS; document.head.appendChild(s);
  }
  const v = ui.view('prediction-traders');
  const st = { live: ui.initialMode(params, 'pre', ['pre', 'live']) === 'live', scope: v.get('scope', 'all') === 'following' ? 'following' : 'all' };
  const T = (id) => pm.trader(id);
  const c$ = (c) => ui.fmtCents(c);       // prices follow the odds-format preference (B13)
  const venueName = (id) => pm.VENUE_NAMES[id];
  const bank = () => store.get().bankroll;
  // One definition of the counts for the mode switch, the facts strip and the feed header:
  // "open" = calls you can still act on (not closed); closed calls stay in the feed for the record.
  const tally = (recs) => { const open = recs.filter((r) => r.status !== 'closed'); return { open, closed: recs.length - open.length }; };
  const count = (live) => tally(pm.recommendations({ live })).open.length;

  root.innerHTML = `<div class="pmt">
    ${ui.pageHead({ title: 'Prediction Traders', tool: 'prediction-traders', live: true,
      subtitle: 'Unlimited pre-match and live recommendations from algorithmically-selected traders. Optimal bet sizing based on confidence and history. Deep links directly to Kalshi, Polymarket, Prophet X &amp; Novig. Exit alerts: we tell you when to sell early.',
      actions: ui.modeSwitch([['pre', 'Pre-match', count(false)], ['live', 'Live', count(true)]], st.live ? 'live' : 'pre'),
      facts: factsData() })}
    <div class="layout">
      <section class="sec">
        <div class="sec-head"><div class="h-l"><h2>Recommendations</h2><p class="feed-sub" data-feedsub data-bf-nodata></p></div>
          <div class="sec-actions">${ui.seg('scope', [['all', 'All selected traders'], ['following', 'Following']], st.scope)}</div></div>
        <div class="feed" data-calls data-bf-list></div>
      </section>
      <section class="sec lb">
        <div class="sec-head"><h2>Trader leaderboard</h2></div>
        <p class="lb-sub">Re-ranked nightly from every settled trade on the four venues.</p>
        <details class="weights"><summary><span>How the selection score works</span>${ui.icon('chevron', { size: 16, cls: 'wchev' })}</summary>
          <div class="wbody">${pm.SELECTION_WEIGHTS.map(([, label, w]) => `<div class="w"><span>${label}</span><span class="bar"><i style="width:${w * 100 / 0.3}%"></i></span><b>${Math.round(w * 100)}%</b></div>`).join('')}
          <p>Traders need 150+ settled trades and a positive closing-price edge to be selected. Top 12 shown.</p></div></details>
        <div data-lb data-bf-list></div>
      </section>
    </div>
    ${ui.how({ summary: 'We follow traders with a long, profitable record and size each of their calls to your bankroll.',
      checks: ['Traders need 150+ settled trades and a positive closing-price edge to be selected',
        'When several selected traders agree, confidence and the suggested stake go up',
        `Stakes use ${ui.term('kelly_fraction', 'your Kelly fraction')} and are capped at 5% of your ${ui.term('bankroll')}`,
        'Every call has a target and a stop; Exit Alerts tell you when to sell early'] })}
  </div>`;

  const feedEl = root.querySelector('[data-calls]');

  // ---------- head facts ----------
  function factsData() {
    const recs = pm.recommendations({ live: st.live });
    const { open, closed } = tally(recs);
    const exitN = recs.filter((r) => r.status === 'exit-now').length;
    const totalStake = open.filter((r) => r.status === 'open').reduce((a, r) => a + r.sizing, 0);
    return [
      { label: st.live ? 'Live recommendations' : 'Pre-match recommendations', value: open.length, note: `open now · ${closed} closed today` },
      { label: 'Avg confidence', value: ui.pct(open.reduce((a, r) => a + r.confidence, 0) / Math.max(1, open.length), 0), note: 'blended across agreeing traders' },
      { label: 'Suggested exposure', value: ui.money(totalStake, 0), note: `${ui.pct(totalStake / bank(), 1)} of your ${ui.money(bank(), 0)} bankroll` },
      { label: 'Exit signals', value: exitN, note: 'Open Exit Alerts →', href: '#/exit-alerts' },
    ];
  }
  function renderStats() {
    const el = root.querySelector('.page-head .facts');
    const html = ui.facts(factsData());
    if (el && el.outerHTML !== html) el.outerHTML = html;
    ui.setModeCount(root, 'pre', count(false));
    ui.setModeCount(root, 'live', count(true));
  }

  // ---------- one call ----------
  function recCard(r) {
    const m = r.market;
    const lo = Math.min(r.stopLevel, r.currentPrice) - 2, hi = Math.max(r.targetExit, r.currentPrice) + 2;
    const pos = (x) => `${(((x - lo) / (hi - lo)) * 100).toFixed(1)}%`;
    const statusTag = r.status === 'exit-now' ? ui.status('Exit now', 'warn') : r.status === 'closed' ? ui.status('Closed', 'muted') : ui.status('Open', 'ok');
    const ev = m.eventId ? api.eventById(m.eventId) : null;
    const venue = venueName(m.venue);
    // One merged primary (B2): buy at the venue with the suggested stake, sell on an exit signal.
    let primary;
    if (r.status === 'exit-now') {
      primary = ui.betAction({ verb: 'Sell', amount: `${r.side} on ${venue} ↗`, act: 'sell', title: `Sell on ${venue} ↗` });
    } else {
      primary = ui.betAction({ verb: `Buy ${r.side}`, amount: `${ui.money(r.sizing, 0)} · ${venue} ↗`, act: 'buy', disabled: r.status === 'closed',
        title: r.status === 'closed' ? 'This call is closed' : `Bet ${ui.money(r.sizing, 0)}: open in ${venue} ↗` });
    }
    const winsIf = r.contracts;  // each contract pays $1
    const evDollars = r.modelProb * winsIf - r.sizing;
    return `<article class="rec ${r.status}" data-key="${r.id}">
      <div class="top">${ui.risk('trader', { short: true })} ${ui.book(m.venue, { full: true })} ${m.sport ? ui.sport(m.sport) : ui.tag(m.category)} <span>${ui.esc(m.kind)}</span>
        ${r.live ? ui.liveDot() : ''} ${ev && ev.live ? `<span>${ui.esc(ev.clock)} · ${ev.score.away}-${ev.score.home}</span>` : ev ? `<span>${ui.when(ev.start)}</span>` : ''}
        <span class="stt">${statusTag}</span></div>
      <p class="ttl"><span class="pside">${r.side}</span> ${ui.esc(m.title)}</p>
      <div class="by">Called by ${r.traderIds.map((id) => `<button type="button" class="handle" data-trader="${id}">@${ui.esc(T(id).handle)}</button>`).join(' · ')}
        <span>· ${ui.ago(r.createdAt)}</span>${r.traderIds.length > 1 ? ui.status(`${r.traderIds.length} traders agree`, 'info') : ''}</div>
      <div class="nums">
        <div><span>Entry → now</span><strong>${c$(r.entryPrice)} → ${c$(r.currentPrice)}</strong> <small class="${r.pnlPct >= 0 ? 'pos' : 'neg'}">${ui.dir(r.pnlPct)}${r.pnlPct >= 0 ? '+' : ''}${(r.pnlPct * 100).toFixed(0)}%</small></div>
        <div><span>Confidence</span><strong>${ui.pct(r.confidence, 0)}</strong>${ui.meter(r.confidence)}</div>
        <div><span>Target exit</span><strong>${c$(r.targetExit)}</strong></div>
        <div><span>Stop level</span><strong>${c$(r.stopLevel)}</strong></div>
        <div class="range" role="img" aria-label="Now ${c$(r.currentPrice)}; stop ${c$(r.stopLevel)}, entry ${c$(r.entryPrice)}, target ${c$(r.targetExit)}"><div class="track"></div>
          <i class="mk" style="left:${pos(r.stopLevel)}"></i><small style="left:${pos(r.stopLevel)}">stop</small>
          <i class="mk" style="left:${pos(r.entryPrice)}"></i><small style="left:${pos(r.entryPrice)}">entry</small>
          <i class="mk" style="left:${pos(r.targetExit)}"></i><small style="left:${pos(r.targetExit)}">target</small>
          <i class="now" style="left:${pos(r.currentPrice)}"></i></div>
      </div>
      <div class="foot">
        <div class="stake"><span>${ui.esc(ui.kellyLabel())} · ${ui.pct(r.sizing / bank(), 1)} of bankroll</span>
          <div class="fig"><b>${ui.money(r.sizing, 0)}</b><small>${r.contracts.toLocaleString()} ${r.side} @ ${c$(r.buyPrice)}</small></div>
          ${r.status === 'open' && r.sizing > 0 ? ui.evLine({ prob: r.modelProb, payout: winsIf, ev: evDollars }) : ''}</div>
        ${ui.actions(primary, [['book', 'Order book', { href: `#/pm-markets?id=${encodeURIComponent(m.id)}` }], ['log', 'Log']])}
      </div></article>`;
  }

  // Keyed patching: only calls whose HTML changed are replaced, so hover and focus survive ticks (B4).
  const cache = new Map();
  function renderFeed() {
    let recs = pm.recommendations({ live: st.live });
    const fol = new Set(pm.following());
    if (st.scope === 'following') recs = recs.filter((r) => r.traderIds.some((id) => fol.has(id)));
    const t = tally(recs);
    root.querySelector('[data-feedsub]').textContent = `${t.open.length} open${t.closed ? ` · ${t.closed} closed` : ''}${st.scope === 'following' ? ' from traders you follow' : ''} · prices update in real time`;
    if (!recs.length) {
      cache.clear();
      feedEl.innerHTML = ui.empty({ title: 'No calls from traders you follow', msg: 'None of the traders you follow have an open call here yet.',
        actions: [{ label: 'Show all selected traders', act: 'scope-all' }, { label: st.live ? 'Switch to Pre-match' : 'Switch to Live', act: 'other-mode' }] });
      return;
    }
    const ids = recs.map((r) => r.id);
    const same = ids.length === cache.size && ids.every((id, i) => feedEl.children[i]?.dataset.key === id);
    if (!same) {
      cache.clear();
      feedEl.innerHTML = recs.map((r) => { const h = recCard(r); cache.set(r.id, h); return h; }).join('');
      return;
    }
    recs.forEach((r, i) => {
      const h = recCard(r);
      if (cache.get(r.id) === h) return;
      cache.set(r.id, h);
      const keepFocus = feedEl.children[i].contains(document.activeElement) ? document.activeElement.dataset.act || document.activeElement.dataset.trader : null;
      feedEl.children[i].outerHTML = h;
      if (keepFocus) feedEl.children[i].querySelector(`[data-act="${keepFocus}"], [data-trader="${keepFocus}"]`)?.focus({ preventScroll: true });
    });
  }

  function renderLb() {
    const fol = new Set(pm.following());
    root.querySelector('[data-lb]').innerHTML = pm.traders().map((t) => `<div class="trow" data-trader="${t.id}">
      <span class="rk">${t.rank}</span>
      <div style="min-width:0"><button type="button" class="handle nm" data-trader="${t.id}" title="Open @${ui.esc(t.handle)}’s profile">@${ui.esc(t.handle)}</button>
        <div class="sub">${t.venues.map((x) => ui.book(x)).join('')} <span>ROI <b class="${t.roi >= 0 ? 'pos' : 'neg'}">${t.roi >= 0 ? '+' : ''}${(t.roi * 100).toFixed(1)}%</b></span><span>Win ${ui.pct(t.winRate, 0)}</span><span>${t.trades.toLocaleString()} trades</span></div></div>
      <div class="score"><strong>${t.score}</strong><small>score</small></div>
      <button type="button" class="btn sm ${fol.has(t.id) ? '' : 'outline'} fbtn" data-follow="${t.id}" aria-pressed="${fol.has(t.id)}">${fol.has(t.id) ? 'Following ✓' : 'Follow'}</button>
    </div>`).join('');
  }

  function pnlChart(series, width) {
    const h = 180, pad = { l: 52, r: 8, t: 10, b: 20 };
    const w = width - pad.l - pad.r, ih = h - pad.t - pad.b;
    const min = Math.min(0, ...series), max = Math.max(...series);
    const x = (i) => pad.l + (i / (series.length - 1)) * w, y = (val) => pad.t + ih - ((val - min) / (max - min || 1)) * ih;
    const line = series.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
    const ticks = [0, 0.5, 1].map((f) => min + (max - min) * f);
    return `<svg viewBox="0 0 ${width} ${h}" height="${h}" role="img" aria-label="90-day cumulative P&L">
      ${ticks.map((val) => `<line x1="${pad.l}" x2="${pad.l + w}" y1="${y(val)}" y2="${y(val)}" stroke="var(--line-2)"/><text x="${pad.l - 6}" y="${y(val) + 4}" text-anchor="end">${ui.money(val, 0).replace(/,000$/, 'K')}</text>`).join('')}
      <line x1="${pad.l}" x2="${pad.l + w}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-width="1"/>
      <path d="${line}L${x(series.length - 1)},${y(0)}L${pad.l},${y(0)}Z" fill="var(--pos)" opacity=".12"/>
      <path d="${line}" fill="none" stroke="var(--pos)" stroke-width="2" stroke-linejoin="round"/>
      <text x="${pad.l}" y="${h - 4}">90d ago</text><text x="${pad.l + w}" y="${h - 4}" text-anchor="end">Today</text>
      <line class="xh" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--muted)" stroke-dasharray="3 3" style="display:none"/>
      <circle class="xd" r="4" fill="var(--pos)" stroke="var(--paper)" stroke-width="2" style="display:none"/>
      <rect class="hit" x="${pad.l}" y="${pad.t}" width="${w}" height="${ih}" fill="transparent" data-pad="${pad.l}" data-w="${w}" data-min="${min}" data-max="${max}" data-ih="${ih}" data-t="${pad.t}"/></svg>`;
  }

  // ---------- trader profile drawer ----------
  function openTrader(id) {
    const t = T(id);
    const following = () => new Set(pm.following()).has(id);
    const followBtn = () => `<button type="button" class="btn ${following() ? 'outline' : 'primary'}" data-act="dfollow" aria-pressed="${following()}">${following() ? 'Following ✓' : 'Follow'}</button>`;
    const trades = pm.traderTrades(id);
    const recs = pm.recommendations().filter((r) => r.traderIds.includes(id) && r.status !== 'closed');
    const body = ui.drawer(`@${t.handle}`, `<div class="pmt-drawer">
      <div class="chips">${t.venues.map((x) => ui.book(x, { full: true })).join('')} ${t.specialties.map((s) => ui.tag(s)).join('')}</div>
      <div class="kpis" data-bf-nodata>
        <div><span>Selection score</span><strong>${t.score} · #${t.rank}</strong></div><div><span>All-time P&L</span><strong class="${t.pnl >= 0 ? 'pos' : 'neg'}">${t.pnl >= 0 ? '+' : ''}${ui.money(t.pnl, 0)}</strong></div>
        <div><span>${ui.term('roi', 'ROI')}</span><strong>${t.roi >= 0 ? '+' : ''}${(t.roi * 100).toFixed(1)}%</strong></div><div><span>Win rate</span><strong>${ui.pct(t.winRate, 1)}</strong></div>
        <div><span>Sharpe</span><strong>${t.sharpe}</strong></div><div><span>Trades</span><strong>${t.trades.toLocaleString()}</strong></div>
        <div><span>Avg hold</span><strong>${t.avgHold}</strong></div><div><span>Followers</span><strong>${t.followers.toLocaleString()}</strong></div>
      </div>
      <h3>90-day P&L</h3><div class="readout" data-readout data-bf-nodata>${ui.money(t.series[t.series.length - 1], 0)} over 90 days · max drawdown ${ui.pct(t.maxDrawdown, 1)}</div>
      <div class="pnl" data-pnl data-bf-nodata></div>
      <h3>Score breakdown</h3><div class="bars">${pm.SELECTION_WEIGHTS.map(([k, label, w]) => `<div class="b"><span>${label}</span><span class="bar"><i style="width:${Math.round(t.scoreParts[k] * 100)}%"></i></span><b>${Math.round(t.scoreParts[k] * w * 100)}</b></div>`).join('')}</div>
      ${recs.length ? `<h3>Open calls</h3><div data-bf-nodata>${recs.map((r) => `<div class="call"><span><span class="pside">${r.side}</span> ${ui.esc(r.market.title)}</span><span>${c$(r.entryPrice)} → ${c$(r.currentPrice)}</span></div>`).join('')}</div>` : ''}
      <h3>Recent trades</h3>
      <table class="t stack-sm"><thead><tr><th>Market</th><th>Side</th><th class="r">Entry</th><th class="r">Exit</th><th class="r">P&L</th></tr></thead><tbody data-bf-nodata>
      ${trades.map((x) => `<tr><td data-label="Market"><div style="font-weight:700">${ui.esc(x.title)}</div><div class="muted" style="font-size:12px">${ui.book(x.venue)} ${ui.ago(x.at)}</div></td>
        <td data-label="Side"><span class="pside">${x.side}</span></td><td class="r" data-label="Entry">${c$(x.entry)}</td>
        <td class="r" data-label="Exit">${x.status === 'open' ? ui.status('Open', 'info') : c$(x.exit)}</td>
        <td class="r ${x.pnl >= 0 ? 'pos' : 'neg'}" data-label="P&L">${x.status === 'open' ? ui.na('Still open') : `${x.pnl >= 0 ? '+' : '-'}${ui.money(Math.abs(x.pnl), 0)}`}</td></tr>`).join('')}
      </tbody></table>
      ${ui.related([['pm-markets', 'Markets & Order Book'], ['exit-alerts', 'Exit Alerts'], ['pm-picks', 'AI Market Picks']])}</div>`,
    { wide: true, risk: 'trader', kicker: `Rank #${t.rank} of ${pm.traders().length} selected traders`, footer: followBtn() });
    const box = body.querySelector('[data-pnl]');
    box.innerHTML = pnlChart(t.series, Math.max(300, box.clientWidth || 600));
    const svg = box.querySelector('svg'), hit = svg.querySelector('.hit');
    const ro = body.querySelector('[data-readout]');
    const base = ro.innerHTML;
    hit.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const sx = ((e.clientX - rect.left) / rect.width) * vb.width;
      const P = +hit.dataset.pad, W = +hit.dataset.w, mn = +hit.dataset.min, mx = +hit.dataset.max, ih = +hit.dataset.ih, top = +hit.dataset.t;
      const i = Math.max(0, Math.min(t.series.length - 1, Math.round(((sx - P) / W) * (t.series.length - 1))));
      const px = P + (i / (t.series.length - 1)) * W, py = top + ih - ((t.series[i] - mn) / (mx - mn || 1)) * ih;
      const xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd');
      xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.style.display = '';
      xd.setAttribute('cx', px); xd.setAttribute('cy', py); xd.style.display = '';
      ro.innerHTML = `<b>${ui.money(t.series[i], 0)}</b> cumulative · ${new Date(Date.now() - (t.series.length - 1 - i) * 86400e3).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    });
    hit.addEventListener('pointerleave', () => { svg.querySelector('.xh').style.display = 'none'; svg.querySelector('.xd').style.display = 'none'; ro.innerHTML = base; });
    ui.onAction(body.panel, {
      dfollow: () => {
        const on = pm.toggleFollow(id);
        body.setFooter(followBtn());
        body.footer.querySelector('[data-act="dfollow"]')?.focus();
        ui.toast(on ? `Following @${t.handle}. Their calls will appear in your feed and Daily Card.` : `Unfollowed @${t.handle}`);
        renderLb(); renderFeed();
      },
    });
  }

  // ---------- actions ----------
  const recById = (id) => pm.recommendations().find((x) => x.id === id);
  const feedActions = {
    buy: (id) => {
      const r = recById(id); if (!r) return;
      const d = pm.deepLink(r.market.id, r.side);
      ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${r.side} @ ${d.price}¢ · ${ui.money(r.sizing, 0)}`);
    },
    sell: (id) => {
      const r = recById(id); if (!r) return;
      const m = pm.market(r.market.id);
      const d = pm.deepLink(m.id, r.side);
      const sellPx = r.side === 'YES' ? m.yesPrice - m.spread : 100 - m.yesPrice;
      ui.toast(`Opening ${d.name} · ${d.ticker} · Sell ${r.side} @ ${sellPx}¢`);
    },
    log: (id) => {
      const r = recById(id); if (!r) return;
      const m = r.market;
      ui.logBet({ kind: 'prediction', book: m.venue, sport: m.sport || m.category, market: 'Prediction', selection: `${m.title} · ${r.side} @ ${r.buyPrice}¢`, price: odds.probToAmerican(r.buyPrice / 100), stake: r.sizing || 25 });
    },
    'scope-all': () => setScope('all'),
    'other-mode': () => root.querySelector(`.page-head [data-seg="mode"] button[data-v="${st.live ? 'pre' : 'live'}"]`)?.click(),
  };
  ui.onAction(feedEl, feedActions);
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) {
      e.stopPropagation();
      const on = pm.toggleFollow(f.dataset.follow);
      ui.toast(on ? `Following @${T(f.dataset.follow).handle}` : `Unfollowed @${T(f.dataset.follow).handle}`);
      renderLb(); renderFeed();
      root.querySelector(`[data-follow="${f.dataset.follow}"]`)?.focus();
      return;
    }
    const t = e.target.closest('[data-trader]');
    if (t) openTrader(t.dataset.trader);
  });
  ui.onMode(root, (val) => { st.live = val === 'live'; cache.clear(); renderStats(); renderFeed(); }, { def: 'pre' });
  function setScope(val) {
    st.scope = val; v.set({ scope: val });
    root.querySelectorAll('[data-seg="scope"] button').forEach((b) => { const on = b.dataset.v === val; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    renderFeed();
  }
  ui.onSeg(root, 'scope', setScope);

  renderStats(); renderFeed(); renderLb();
  // Deep link from the Daily Card: #/prediction-traders?id=<call id> opens that call in a drawer (Buy / Sell /
  // Log work there too; trader handles open their profile) and marks its card in the feed.
  ui.deepLink(root, params.id, {
    noun: 'call',
    gone: 'That call has closed. Here are the open ones.',
    find: (id) => { const r = recById(id); return r && r.status !== 'closed' ? r : null; },
    open: (r) => {
      if (st.live !== !!r.live) root.querySelector(`.page-head [data-seg="mode"] button[data-v="${r.live ? 'live' : 'pre'}"]`)?.click();
      const body = ui.drawer(r.market.title, `<div class="pmt">${recCard(r)}</div>`, { risk: 'trader', kicker: `${r.side} · ${venueName(r.market.venue)}` });
      ui.onAction(body.panel, feedActions);
      body.panel.addEventListener('click', (e) => { const t = e.target.closest('[data-trader]'); if (t) openTrader(t.dataset.trader); });
    },
  });
  const unsub = pm.subscribe(() => { renderStats(); renderFeed(); ui.setLiveStatus(root, { updated: Date.now() }); });
  const unStore = store.subscribe(() => { renderStats(); renderFeed(); });
  return () => { unsub(); unStore(); };
}
