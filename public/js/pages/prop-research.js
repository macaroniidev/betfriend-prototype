// Prop Research: game logs, hit rates, splits and matchup notes for every player prop on today's board,
// with the best Over/Under prices and a +EV flag when the sharp fair odds support it.
//
// Rebuild notes (B1 head, B6 flat sections, B7/item 21 colour discipline, B12 how + glossary, B14 paging,
// B17 cross-tool paths, C13 sweep):
// - The selected prop is the page's result: a flat hero band (player, line, projection, best Over/Under
//   with one Bet each) directly under the picker, then the hit-rate facts, game log, splits and notes.
// - Hit rates carry ✓ (clears the line often) / ✗ (rarely) cues; Unders in the game log are hatched,
//   never red. Headings are static ("Last 20 games"); the line and counts sit in nodata notes.
// - "All props today" is the shared keyed table (sortable, Columns, phone grid rows) paged 20 at a time.

const CSS = `
.bf-props .pr-pick { margin-bottom:14px; align-items:flex-end; }
.bf-props .search { display:flex; flex-direction:column; gap:4px; font-size:var(--t-xs); font-weight:700; color:var(--muted); }
.bf-props .search input { border:2px solid var(--line-strong); background:var(--paper); border-radius:10px; padding:8px 12px; color:var(--text); font-size:var(--t-body); width:260px; max-width:100%; min-height:40px; }
.bf-props .stat-seg .seg { max-width:100%; overflow-x:auto; scrollbar-width:none; }
/* The selected prop: a flat band with a green top rule (no card-in-card). */
.bf-props .pr-hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr); gap:16px 24px; align-items:center; border-top:4px solid var(--g); padding:16px 0 14px; }
.bf-props .pr-team { margin:0; color:var(--muted); font-size:var(--t-sm); font-weight:600; }
.bf-props .pr-player { margin:2px 0 0; font:900 34px/1 var(--f-head); text-transform:uppercase; letter-spacing:.01em; }
.bf-props .pr-meta { display:flex; gap:6px; flex-wrap:wrap; align-items:center; color:var(--muted); font-size:var(--t-sm); font-weight:600; margin-top:8px; }
.bf-props .pr-line { margin-top:10px; display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; color:var(--muted); font-weight:600; }
.bf-props .bigline { font:900 44px/1 var(--f-head); font-variant-numeric:tabular-nums; color:var(--text); }
.bf-props .pr-line strong { color:var(--text); }
.bf-props .pr-links { display:flex; gap:4px 10px; flex-wrap:wrap; align-items:center; margin-top:10px; }
.bf-props .ou { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.bf-props .ou > div { border:2px solid var(--line); border-radius:12px; padding:10px 12px; background:var(--paper); display:grid; gap:6px; }
.bf-props .ou > div.ev { border-color:var(--g); background:var(--pos-bg); }
.bf-props .ou .lbl { font-size:var(--t-sm); font-weight:800; display:flex; justify-content:space-between; gap:6px; align-items:center; }
.bf-props .ou .fair { font-size:var(--t-xs); color:var(--muted); font-weight:700; }
.bf-props .ou .p { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.bf-props .ou .p .price { font-size:18px; }
.bf-props .ou .btn { justify-self:start; }
.bf-props .ou-note { font-size:var(--t-xs); color:var(--muted); font-weight:600; margin:8px 0 0; }
/* Hit-rate facts: ✓ / ✗ cues next to the figure. */
.bf-props .pr-facts .stats.facts { margin-top:0; }
.bf-props .pr-facts .stat strong { white-space:nowrap; }
.bf-props .hr-cue { display:inline; font-size:.7em; margin-left:4px; vertical-align:.15em; }
.bf-props .hr-cue.hot { color:var(--pos); }
.bf-props .hr-cue.cold { color:var(--muted); }
.bf-props .pr-grid { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:0 24px; align-items:start; }
.bf-props .pr-grid > .sec, .bf-props .pr-side > .sec:first-child { margin-top:24px; }
.bf-props .sec-note { font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.bf-props .legend { display:flex; gap:12px; font-size:var(--t-xs); color:var(--muted); font-weight:700; flex-wrap:wrap; align-items:center; }
.bf-props .legend i { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:4px; vertical-align:-2px; }
.bf-props .legend i.ov { background:var(--pos); }
.bf-props .legend i.un { background:repeating-linear-gradient(45deg, var(--muted) 0 2px, transparent 2px 5px); border:1px solid var(--muted); }
.bf-props .chart-wrap { overflow-x:auto; }
.bf-props .chart { width:100%; height:auto; display:block; min-width:520px; }
.bf-props .chart text { font-size:10px; fill:var(--muted); font-family:var(--sans); }
.bf-props .chart text.v { font-size:10.5px; fill:var(--text); font-weight:700; }
.bf-props .sp { width:100%; border-collapse:collapse; font-size:var(--t-sm); }
.bf-props .sp td, .bf-props .sp th { padding:7px 4px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.bf-props .sp th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:700; }
.bf-props .sp td:first-child, .bf-props .sp th:first-child { text-align:left; }
.bf-props .hrp { font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
.bf-props .hrp.hi { color:var(--pos); }
.bf-props .pr-notes .bf2-checks { font-size:var(--t-sm); gap:8px; }
.bf-props .pb { display:inline-flex; gap:6px; align-items:center; white-space:nowrap; }
.bf-props .pl-n { font-weight:800; }
.bf-props .pl-m { color:var(--muted); font-size:var(--t-xs); font-weight:600; }
.bf-props tr.sel td { background:var(--hl); }
@media (max-width:1100px) { .bf-props .pr-grid { grid-template-columns:1fr; } }
@media (max-width:860px) {
  .bf-props .pr-hero { grid-template-columns:1fr; padding-top:12px; }
  .bf-props .pr-player { font-size:28px; }
  .bf-props .bigline { font-size:36px; }
  .bf-props .search, .bf-props .search input { width:100%; }
  .bf-props .pr-pick > * { flex:1 1 100%; }
  /* Phones: tapping a row opens its research, so the row keeps only the Details toggle. */
  .bf-props .tbl td.act [data-act="open"] { display:none; }
}
`;

const abbr = (team) => { const w = team.split(' '); const last = w[w.length - 1]; return (w.length > 2 && last.length <= 4 ? w[w.length - 2] : last).slice(0, 3).toUpperCase(); };

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-prop-research')) document.head.insertAdjacentHTML('beforeend', `<style id="css-prop-research">${CSS}</style>`);
  const R = api.research;
  const allProps = R.props();
  const players = R.players();

  const startProp = allProps.find((p) => p.player === params.player) || allProps.find((p) => p.player === 'LeBron James') || allProps.find((p) => p.sport === 'NBA') || allProps[0];
  const st = { player: startProp.player, stat: params.stat || startProp.stat, line: null, lineId: null };
  let tSport = 'All';
  const pg = ui.pager('prop-research', { step: 20 });

  root.innerHTML = `<div class="bf-props">
    ${ui.pageHead({
      title: 'Prop Research',
      subtitle: 'Every player prop on today\'s board with hit rates, game logs, splits and matchup notes, next to the best Over and Under prices across your books.',
      tool: 'prop-research',
    })}
    <div class="toolbar pr-pick">
      <label class="search"><span>Player</span><input list="pr-players" data-player placeholder="Search players with props today" value="${ui.esc(st.player)}" autocomplete="off">
        <datalist id="pr-players">${players.map((p) => `<option value="${ui.esc(p.player)}">${ui.esc(p.sport)} · ${ui.esc(p.team)}</option>`).join('')}</datalist></label>
      <label class="field stat-seg"><span>Stat</span><div data-statseg></div></label>
      <div data-linefield></div>
    </div>
    <div data-bf-list class="pr-result"><div class="pr-hero" data-hero data-bf-nodata></div></div>
    <div class="pr-facts" data-hr></div>
    <div class="pr-grid">
      ${ui.sec('Last 20 games', '<div class="chart-wrap" data-chart data-bf-nodata></div>', { actions: `<div class="legend"><span><i class="ov"></i>Over</span><span><i class="un"></i>Under</span><span>- - - Line <b data-bf-nodata data-line-note></b></span></div>` })}
      <div class="pr-side">
        ${ui.sec('Splits', `<table class="sp"><thead><tr><th>Split</th><th>Games</th><th>Avg</th><th>Hit</th></tr></thead><tbody data-splits data-bf-nodata></tbody></table>`, { actions: '<span class="sec-note" data-bf-nodata data-split-note></span>' })}
        ${ui.sec('Matchup notes', '<div data-notes data-bf-nodata></div>', { cls: 'pr-notes', actions: '<span data-bf-nodata data-rank></span>' })}
      </div>
    </div>
    ${ui.sec('All props today', '<div data-table></div><div data-more></div>', { actions: `${ui.select('tsport', [['All', 'All sports'], ...['NBA', 'NFL', 'NHL'].map((s) => [s, s])], 'All', 'Sport')}<span class="sec-note" data-bf-nodata data-tcount></span>` })}
    ${ui.how({ title: 'How to read a prop', summary: 'Hit rates show how often he clears the line; prices show which book pays most.',
      checks: [`A hit rate is how many of his recent games went over the line. ✓ means 60% or more, ✗ means 40% or less.`,
        `${ui.term('fair', 'Fair odds')} come from sharp books with the margin removed (${ui.term('devig', 'no-vig')}). A best price above fair is ${ui.term('ev', '+EV')}.`,
        'Splits and matchup notes explain the hit rate. Any single prop can lose.'] })}
    ${ui.related([['ai-picks', 'AI Sports Picks'], ['ai-chat', 'Ask BetFriend AI'], ['positive-ev', 'Positive EV']])}
  </div>`;
  const $ = (s) => root.querySelector(s);

  const propLineFor = (player, stat) => allProps.find((p) => p.player === player && p.stat === stat);
  const fairAm = (p) => odds.probToAmerican(Math.min(0.99, Math.max(0.01, p)));
  /** ✓ / ✗ cue for a hit rate (non-colour signal, item 21). */
  const cue = (rate) => (rate >= 0.6 ? '<span class="hr-cue hot" aria-label="clears the line often">✓</span>' : rate <= 0.4 ? '<span class="hr-cue cold" aria-label="rarely clears the line">✗</span>' : '');
  const hrSpan = (rate, text) => `<span class="hrp ${rate >= 0.6 ? 'hi' : ''}">${text}${cue(rate)}</span>`;

  function paintControls() {
    const stats = R.statList(st.player);
    const withLine = new Set(allProps.filter((p) => p.player === st.player).map((p) => p.stat));
    if (!stats.includes(st.stat)) st.stat = [...withLine][0] || stats[0];
    $('[data-statseg]').innerHTML = ui.seg('stat', stats.map((s) => [s, withLine.has(s) ? `${s} •` : s]), st.stat);
    ui.onSeg(root, 'stat', (v) => { st.stat = v; st.line = null; paintAll(); });
    const pl = propLineFor(st.player, st.stat);
    st.lineId = pl ? pl.lineId : null;
    if (st.line === null) st.line = pl ? pl.point : Math.floor(R.hitRate(st.player, st.stat, 0, 10).avg) + 0.5;
    $('[data-linefield]').innerHTML = ui.numberInput('line', st.line, pl ? `Line (posted ${pl.point})` : 'Test a line', { step: 0.5, min: 0 });
    ui.onNumber(root, 'line', (v) => { st.line = v; paintMain(); });
  }

  function paintMain() {
    const p = st.player, stat = st.stat, line = st.line;
    const t = R.team(p);
    const ev = api.eventById(t.eventId);
    const logs = R.playerLogs(p);
    const h5 = R.hitRate(p, stat, line, 5), h10 = R.hitRate(p, stat, line, 10), h20 = R.hitRate(p, stat, line, 20);
    const mu = R.matchup(p, stat);
    const mk = st.lineId ? R.market(st.lineId, store.get().books) : null;
    const posted = mk && mk.line.point === line;
    const aiPick = st.lineId ? (api.picks?.picks?.({ books: store.get().books }) || []).find((x) => x.lineId === st.lineId) : null;
    const ask = `#/ai-chat?q=${encodeURIComponent(`Should I bet ${p} ${stat.toLowerCase()} ${line}?`)}`;

    let ouHtml;
    if (mk) {
      const [o, u] = mk.best;
      const [eo, eu] = mk.edges;
      const better = (eo ?? -1) >= (eu ?? -1) ? 0 : 1;
      const box = (side, lbl, b, e, fair, i) => {
        const isEv = posted && e > 0.005;
        return `<div class="${isEv ? 'ev' : ''}"><div class="lbl"><span>${lbl}</span>${isEv ? ui.tag(`+EV ${odds.pct(e)}`, 'pos') : `<span class="fair">fair ${ui.fmtOdds(fairAm(fair))}</span>`}</div>
          <div class="p">${b ? `${ui.price(b.price, { best: true })} ${ui.book(b.book)}` : '<span class="muted">Not offered</span>'}</div>
          ${b ? ui.betAction({ verb: `Bet ${side}`, book: b.book, tone: i === better ? 'primary' : 'outline' }) : ''}</div>`;
      };
      ouHtml = `<div class="ou">${box('Over', `Over ${mk.line.point}`, o, eo, mk.fair[0], 0)}${box('Under', `Under ${mk.line.point}`, u, eu, mk.fair[1], 1)}</div>
        <p class="ou-note">${ui.term('fair', 'Fair odds')} from Circa, Novig and ProphetX, ${ui.term('devig', 'no-vig')}. ${posted ? '' : `Showing posted line ${mk.line.point}; hit rates use your test line ${line}.`}</p>`;
    } else {
      ouHtml = `<div class="callout">No ${ui.esc(stat.toLowerCase())} line posted for ${ui.esc(p)} yet. Hit rates use your test line of <strong>${line}</strong>. We alert you the moment books post it.</div>`;
    }

    $('[data-hero]').innerHTML = `
      <div>
        <p class="pr-team">${ui.esc(t.team)} · ${t.home ? 'vs' : '@'} ${ui.esc(t.opponent)}</p>
        <p class="pr-player">${ui.esc(p)}</p>
        <div class="pr-meta">${ui.sport(t.sport)} ${ev.live ? `${ui.liveDot()} ${ui.esc(ev.clock)}` : ui.when(ev.start)} · ${ui.esc(stat)} ${ui.risk('prop', { short: true })}</div>
        <div class="pr-line"><span class="bigline">${line}</span><span>${ui.esc(stat)} line · projection <strong>${mu.projection != null ? mu.projection.toFixed(1) : '—'}</strong></span></div>
        <div class="pr-links">${aiPick ? `<a class="btn sm ghost" href="#/ai-picks"><span data-bf-text>AI pick</span>&nbsp;<b>${ui.esc(aiPick.grade)} · ${ui.esc(aiPick.outcome)}</b></a>` : ''}<a class="btn sm ghost" href="${ask}"><span data-bf-text>Ask AI about this prop</span></a></div>
      </div>
      <div>${ouHtml}</div>`;

    $('[data-hr]').innerHTML = ui.facts([
      ...[['Last 5', h5], ['Last 10', h10], ['Last 20', h20]].map(([label, h]) => ({ label: `Hit rate · ${label}`, value: `${odds.pct(h.rate, 0)}${cue(h.rate)}`, tone: h.rate >= 0.6 ? 'pos' : '', note: `${h.hits} of ${h.n} over · avg ${h.avg.toFixed(1)}` })),
      { label: 'Average (L10 / L20)', value: h10.avg.toFixed(1), note: `${h20.avg.toFixed(1)} over 20 · median ${h20.median}` },
      { label: 'Range (L20)', value: `${h20.low}–${h20.high}`, note: `vs line ${line}` },
    ]);
    $('[data-line-note]').textContent = `(${line})`;
    $('[data-chart]').innerHTML = barChart(logs.slice(0, 20).reverse(), stat, line);
    $('[data-split-note]').textContent = `Over ${line}`;
    $('[data-splits]').innerHTML = R.splits(p, stat, line).map((s) => `<tr><td>${ui.esc(s.label)}</td><td>${s.n}</td><td>${s.n ? s.avg.toFixed(1) : ui.na()}</td><td>${s.n ? hrSpan(s.rate, `${s.hits}/${s.n}`) : ui.na()}</td></tr>`).join('');
    $('[data-rank]').innerHTML = ui.tag(`Opp. rank ${mu.oppRank}`, mu.oppRank > 20 ? 'pos' : mu.oppRank < 10 ? 'warn' : '');
    $('[data-notes]').innerHTML = ui.checks(mu.notes.map(ui.esc));
  }

  function barChart(games, stat, line) {
    const W = 720, H = 230, top = 18, bottom = 34, left = 6;
    const vals = games.map((g) => g.stats[stat] ?? 0);
    const max = Math.max(line * 1.25, ...vals) * 1.08 || 1;
    const bw = (W - left * 2) / (games.length || 1);
    const y = (v) => top + (1 - v / max) * (H - top - bottom);
    const ly = y(line);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.esc(stat)} in the last ${games.length} games versus the line">
      <defs><pattern id="pr-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--panel)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="2.5"/></pattern></defs>
      <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
      ${games.map((g, k) => {
        const v = g.stats[stat] ?? 0;
        const over = v > line;
        const x = left + k * bw;
        const yy = y(v);
        const d = new Date(g.date);
        return `<g><rect x="${x + bw * 0.14}" y="${yy}" width="${bw * 0.72}" height="${Math.max(1.5, H - bottom - yy)}" rx="3" fill="${over ? 'var(--pos)' : 'url(#pr-hatch)'}" ${over ? '' : 'stroke="var(--muted)" stroke-width="1"'}><title>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${g.home ? 'vs' : '@'} ${g.opponent}: ${v} (${over ? 'over' : 'under'})</title></rect>
          <text class="v" x="${x + bw / 2}" y="${yy - 4}" text-anchor="middle">${v}</text>
          <text x="${x + bw / 2}" y="${H - bottom + 13}" text-anchor="middle">${g.home ? '' : '@'}${abbr(g.opponent)}</text>
          <text x="${x + bw / 2}" y="${H - bottom + 26}" text-anchor="middle">${d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</text></g>`;
      }).join('')}
      <line x1="0" x2="${W}" y1="${ly}" y2="${ly}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <rect x="${W - 40}" y="${ly - 9}" width="38" height="18" rx="4" fill="var(--text)"/>
      <text x="${W - 21}" y="${ly + 4}" text-anchor="middle" style="fill:var(--paper);font-weight:700">${line}</text></svg>`;
  }

  // ---------- all props table (keyed, sortable, paged) ----------
  function tableRows() {
    const books = store.get().books;
    return allProps.filter((p) => tSport === 'All' || p.sport === tSport).map((p) => {
      const mk = R.market(p.lineId, books);
      const h5 = R.hitRate(p.player, p.stat, p.point, 5), h10 = R.hitRate(p.player, p.stat, p.point, 10), h20 = R.hitRate(p.player, p.stat, p.point, 20);
      const [eo, eu] = mk.edges;
      const side = (eo ?? -1) >= (eu ?? -1) ? 0 : 1;
      return { ...p, mk, h5: h5.rate, h10: h10.rate, h20: h20.rate, avg: h10.avg, edge: side === 0 ? eo ?? -1 : eu ?? -1, side };
    });
  }
  const hr = (x) => hrSpan(x, odds.pct(x, 0));
  const priceCell = (b) => (b ? `<span class="pb">${ui.price(b.price)} ${ui.book(b.book)}</span>` : ui.na('No price'));
  const columns = [
    { key: 'player', label: 'Player', sort: (r) => r.player, render: (r) => { const ev = api.eventById(r.eventId); return `<div class="pl-n">${ui.esc(r.player)}</div><div class="pl-m">${ui.sport(r.sport)} ${abbr(r.team)} ${r.home ? 'vs' : '@'} ${abbr(r.opponent)} · ${ev.live ? 'Live' : ui.when(ev.start)}</div>`; } },
    { key: 'stat', label: 'Stat', sort: (r) => r.stat, mlabel: true, render: (r) => ui.esc(r.stat) },
    { key: 'point', label: 'Line', align: 'r', sort: (r) => r.point, mlabel: true, render: (r) => `<strong>${r.point}</strong>` },
    { key: 'over', label: 'Best Over', mlabel: true, render: (r) => priceCell(r.mk.best[0]) },
    { key: 'under', label: 'Best Under', mlabel: true, render: (r) => priceCell(r.mk.best[1]) },
    { key: 'h5', label: 'L5', align: 'r', sort: (r) => r.h5, title: 'Hit rate over the last 5 games', render: (r) => hr(r.h5) },
    { key: 'h10', label: 'L10', align: 'r', sort: (r) => r.h10, mlabel: true, title: 'Hit rate over the last 10 games', render: (r) => hr(r.h10) },
    { key: 'h20', label: 'L20', align: 'r', sort: (r) => r.h20, title: 'Hit rate over the last 20 games', render: (r) => hr(r.h20) },
    { key: 'avg', label: 'Avg L10', align: 'r', sort: (r) => r.avg - r.point, title: 'Average over the last 10 games', render: (r) => r.avg.toFixed(1) },
    { key: 'edge', label: 'Best edge', align: 'r', sort: (r) => r.edge, title: ui.termTitle('ev'), render: (r) => (r.edge > 0.005 ? ui.edge(r.edge, { label: r.side === 0 ? 'O' : 'U' }) : ui.na('No edge')) },
  ];
  const tbl = ui.table({
    id: 'props', caption: 'All player props today', rowKey: (r) => r.lineId, columns,
    sort: { key: 'edge', dir: 'desc' },
    // A static, paged board: rows that leave the page go at once, nothing is marked NEW, order never freezes.
    freeze: false, newMs: 0, goneMs: -1,
    rowClass: (r) => (r.player === st.player && r.stat === st.stat ? 'sel' : ''),
    action: () => ui.ghost('open', 'Research'),
    onAction: { open: (r) => openRow(r) },
    onOpen: (r) => openRow(r),
    mobile: { areas: ['player player edge', 'stat point h10', 'over under act'], cols: 'minmax(0,1fr) minmax(0,1fr) auto' },
    empty: () => ui.empty({ title: 'No props in this sport today', msg: 'Books haven’t posted player props for this sport yet.', actions: [{ label: 'All sports', act: 'all-sports' }, { label: 'AI Sports Picks', href: '#/ai-picks' }] }),
  });
  $('[data-table]').append(tbl.el);
  function openRow(r) {
    st.player = r.player; st.stat = r.stat; st.line = r.point;
    $('[data-player]').value = st.player;
    paintAll();
    $('.pr-pick')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /** Sort the whole board the way the table is sorted, then show the current page. */
  function paintTable() {
    const all = tableRows();
    const s = tbl.sortState();
    const col = s && columns.find((c) => c.key === s.key);
    const sorted = col ? all.map((r, i) => [r, col.sort(r), i]).sort((a, b) => {
      const x = a[1], y = b[1];
      return x === y ? a[2] - b[2] : (typeof x === 'string' ? x.localeCompare(y) : x - y) * (s.dir === 'asc' ? 1 : -1);
    }).map((x) => x[0]) : all;
    tbl.update(pg.slice(sorted));
    $('[data-more]').innerHTML = pg.more(sorted.length);
    $('[data-tcount]').textContent = `${sorted.length} props`;
  }
  // A new sort re-pages from the full board (the table's own handler runs first).
  tbl.el.addEventListener('click', (e) => { if (e.target.closest('[data-sort]')) paintTable(); });
  pg.onMore(() => paintTable());
  ui.onAction(root, { 'all-sports': () => { tSport = 'All'; const s = $('[data-sel="tsport"]'); if (s) s.value = 'All'; pg.reset(); paintTable(); } });

  function paintAll() { paintControls(); paintMain(); paintTable(); }

  const input = $('[data-player]');
  const choose = () => {
    const v = input.value.trim().toLowerCase();
    const m = players.find((x) => x.player.toLowerCase() === v) || (v.length >= 3 ? players.find((x) => x.player.toLowerCase().includes(v)) : null);
    if (m && m.player !== st.player) { st.player = m.player; st.stat = null; st.line = null; input.value = m.player; paintAll(); }
  };
  input.addEventListener('change', choose);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') choose(); });
  ui.onSelect(root, 'tsport', (v) => { tSport = v; pg.reset(); paintTable(); });

  paintAll();
  const unS = store.subscribe(() => { paintMain(); paintTable(); });
  return () => { unS(); tbl.destroy(); };
}
