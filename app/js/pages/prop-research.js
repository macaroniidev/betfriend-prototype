// Prop Research: game logs, hit rates, splits and matchup notes for every player prop on today's board,
// with the best Over/Under prices and a +EV flag when the sharp fair odds support it.

const CSS = `
.bf-props .t .rt { text-align:right; font-variant-numeric:tabular-nums; }
.bf-props .hero { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:16px; padding:16px; align-items:center; }
.bf-props .hero h2 { font-size:24px; }
.bf-props .hero .meta { display:flex; gap:6px; flex-wrap:wrap; align-items:center; color:var(--muted); font-size:12.5px; margin-top:6px; }
.bf-props .ou { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.bf-props .ou > div { border:1px solid var(--line); border-radius:10px; padding:10px 12px; background:var(--panel); }
.bf-props .ou .lbl { font-size:12px; color:var(--muted); display:flex; justify-content:space-between; gap:6px; }
.bf-props .ou .p { display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap; }
.bf-props .ou .p .price { font-size:18px; }
.bf-props .ou > div.ev { border-color:var(--pos); background:var(--pos-bg); }
.bf-props .bigline { font:600 30px var(--serif); font-variant-numeric:tabular-nums; }
.bf-props .hr-tiles { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin:16px 0; }
.bf-props .hr-tiles .stat strong.hot { color:var(--pos); } .bf-props .hr-tiles .stat strong.cold { color:var(--neg); }
.bf-props .chart { width:100%; height:auto; display:block; }
.bf-props .chart text { font-size:10px; fill:var(--muted); font-family:var(--sans); }
.bf-props .chart text.v { font-size:10.5px; fill:var(--text); font-weight:700; }
.bf-props .sp { width:100%; border-collapse:collapse; font-size:13px; }
.bf-props .sp td, .bf-props .sp th { padding:7px 4px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.bf-props .sp th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; }
.bf-props .sp td:first-child, .bf-props .sp th:first-child { text-align:left; }
.bf-props .notes { margin:0; padding-left:18px; font-size:13px; }
.bf-props .notes li + li { margin-top:6px; }
.bf-props .search { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--muted); }
.bf-props .search input { border:1px solid var(--line); background:var(--paper); border-radius:9px; padding:7px 10px; color:var(--text); font-size:14px; width:240px; max-width:100%; }
.bf-props th.sortable { cursor:pointer; user-select:none; }
.bf-props th.sortable.on { color:var(--text); }
.bf-props .hrp { font-weight:700; font-variant-numeric:tabular-nums; }
.bf-props .hrp.hi { color:var(--pos); } .bf-props .hrp.lo { color:var(--neg); }
.bf-props tr.sel td { background:color-mix(in srgb, var(--lime) 30%, transparent); }
.bf-props .legend { display:flex; gap:14px; font-size:11.5px; color:var(--muted); flex-wrap:wrap; }
.bf-props .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
.bf-props .stat-seg .seg { max-width:100%; }
.bf-props .pb { display:inline-flex; gap:6px; align-items:center; white-space:nowrap; }
@media (max-width:1100px) { .bf-props .hr-tiles { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:860px) {
  .bf-props .hero { grid-template-columns:1fr; }
  .bf-props .hr-tiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .bf-props .search input { width:100%; }
  .bf-props .search { width:100%; }
  .bf-props table.stack-sm td.first { display:block; text-align:left; border-bottom:1px solid var(--line-2); padding-bottom:8px; }
  .bf-props table.stack-sm td.first::before { display:none; }
}`;

const narrow = () => window.matchMedia('(max-width: 600px)').matches;
const abbr = (team) => { const w = team.split(' '); const last = w[w.length - 1]; return (w.length > 2 && last.length <= 4 ? w[w.length - 2] : last).slice(0, 3).toUpperCase(); };

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-prop-research')) document.head.insertAdjacentHTML('beforeend', `<style id="css-prop-research">${CSS}</style>`);
  const R = api.research;
  const allProps = R.props();
  const players = R.players();

  const startProp = allProps.find((p) => p.player === params.player) || allProps.find((p) => p.player === 'LeBron James') || allProps.find((p) => p.sport === 'NBA') || allProps[0];
  const st = { player: startProp.player, stat: params.stat || startProp.stat, line: null, lineId: null, sort: 'edge', dir: -1 };

  root.innerHTML = `<div class="bf-props">
    ${ui.header({
      title: 'Prop Research',
      subtitle: 'Every player prop on today\'s board with hit rates, game logs, splits and matchup notes, next to the best Over and Under prices across your books.',
      tool: 'prop-research',
    })}
    <div class="toolbar">
      <label class="search"><span>Player</span><input list="pr-players" data-player placeholder="Search players with props today" value="${ui.esc(st.player)}" autocomplete="off">
        <datalist id="pr-players">${players.map((p) => `<option value="${ui.esc(p.player)}">${ui.esc(p.sport)} · ${ui.esc(p.team)}</option>`).join('')}</datalist></label>
      <label class="field stat-seg"><span>Stat</span><div data-statseg></div></label>
      <div data-linefield></div>
    </div>
    <div data-main></div>
    <section class="card" style="margin-top:16px">
      <header><h2>All props today</h2><div class="row">${ui.select('tsport', [['All', 'All sports'], ...['NBA', 'NFL', 'NHL'].map((s) => [s, s])], 'All')}<span class="muted" data-tcount></span></div></header>
      <div data-table></div>
    </section>
  </div>`;

  const mainEl = root.querySelector('[data-main]');
  let tSport = 'All';

  function propLineFor(player, stat) {
    return allProps.find((p) => p.player === player && p.stat === stat);
  }

  function paintControls() {
    const stats = R.statList(st.player);
    const withLine = new Set(allProps.filter((p) => p.player === st.player).map((p) => p.stat));
    if (!stats.includes(st.stat)) st.stat = [...withLine][0] || stats[0];
    root.querySelector('[data-statseg]').innerHTML = ui.seg('stat', stats.map((s) => [s, withLine.has(s) ? `${s} •` : s]), st.stat);
    ui.onSeg(root, 'stat', (v) => { st.stat = v; st.line = null; paintAll(); });
    const pl = propLineFor(st.player, st.stat);
    st.lineId = pl ? pl.lineId : null;
    if (st.line === null) {
      st.line = pl ? pl.point : Math.floor(R.hitRate(st.player, st.stat, 0, 10).avg) + 0.5;
    }
    root.querySelector('[data-linefield]').innerHTML = ui.numberInput('line', st.line, pl ? `Line (posted ${pl.point})` : 'Test a line', { step: 0.5, min: 0 });
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

    let ouHtml;
    if (mk) {
      const [o, u] = mk.best;
      const [eo, eu] = mk.edges;
      const box = (lbl, b, e, fair) => `<div class="${posted && e > 0.005 ? 'ev' : ''}"><div class="lbl"><span>${lbl}</span>${posted && e > 0.005 ? ui.tag(`+EV ${odds.pct(e)}`, 'pos') : `<span>fair ${odds.fmtAmerican(fairAm(fair))}</span>`}</div>
        <div class="p">${b ? `${ui.price(b.price, { best: true })} ${ui.book(b.book)}` : '<span class="muted">Not offered</span>'}</div>
        ${b ? `<div style="margin-top:8px">${ui.betBtn(b.book)}</div>` : ''}</div>`;
      ouHtml = `<div class="ou">${box(`Over ${mk.line.point}`, o, eo, mk.fair[0])}${box(`Under ${mk.line.point}`, u, eu, mk.fair[1])}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">Fair odds from Circa, Novig and ProphetX, no-vig. ${posted ? '' : `Showing posted line ${mk.line.point}; hit rates use your test line ${line}.`}</div>`;
    } else {
      ouHtml = `<div class="callout">No ${ui.esc(stat.toLowerCase())} line posted for ${ui.esc(p)} yet. Hit rates use your test line of <strong>${line}</strong>. We alert you the moment books post it.</div>`;
    }

    mainEl.innerHTML = `
      <section class="card hero">
        <div>
          <div class="muted" style="font-size:12.5px">${ui.esc(t.team)} · ${t.home ? 'vs' : '@'} ${ui.esc(t.opponent)}</div>
          <h2>${ui.esc(p)}</h2>
          <div class="meta">${ui.sport(t.sport)} ${ev.live ? `${ui.liveDot()} ${ui.esc(ev.clock)}` : ui.when(ev.start)} · ${ui.esc(stat)}</div>
          <div style="margin-top:10px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="bigline">${line}</span><span class="muted">${ui.esc(stat)} line · projection <strong style="color:var(--text)">${mu.projection != null ? mu.projection.toFixed(1) : '—'}</strong></span></div>
        </div>
        <div>${ouHtml}</div>
      </section>
      <div class="hr-tiles">
        ${tile('Last 5', h5)}${tile('Last 10', h10)}${tile('Last 20', h20)}
        <div class="stat"><span>Average (L10 / L20)</span><strong>${h10.avg.toFixed(1)}</strong><small>${h20.avg.toFixed(1)} over 20 · median ${h20.median}</small></div>
        <div class="stat"><span>Range (L20)</span><strong>${h20.low}–${h20.high}</strong><small>vs line ${line}</small></div>
      </div>
      <div class="split">
        <section class="card">
          <header><h3>Last ${narrow() ? 10 : 20} games vs ${line}</h3><div class="legend"><span><i style="background:var(--pos)"></i>Over</span><span><i style="background:var(--neg)"></i>Under</span><span>- - - Line</span></div></header>
          <div class="pad">${barChart(logs.slice(0, narrow() ? 10 : 20).reverse(), stat, line)}</div>
        </section>
        <aside class="stack">
          <section class="card"><header><h3>Splits</h3><span class="muted" style="font-size:12px">Over ${line}</span></header>
            <div class="pad"><table class="sp"><thead><tr><th>Split</th><th>Games</th><th>Avg</th><th>Hit</th></tr></thead><tbody>
            ${R.splits(p, stat, line).map((s) => `<tr><td>${ui.esc(s.label)}</td><td>${s.n}</td><td>${s.n ? s.avg.toFixed(1) : '—'}</td><td><span class="hrp ${s.n ? (s.rate >= 0.6 ? 'hi' : s.rate <= 0.4 ? 'lo' : '') : ''}">${s.n ? `${s.hits}/${s.n}` : '—'}</span></td></tr>`).join('')}
            </tbody></table></div></section>
          <section class="card"><header><h3>Matchup notes</h3>${ui.tag(`Opp. rank ${mu.oppRank}`, mu.oppRank > 20 ? 'pos' : mu.oppRank < 10 ? 'neg' : '')}</header>
            <div class="pad"><ul class="notes">${mu.notes.map((n) => `<li>${ui.esc(n)}</li>`).join('')}</ul></div></section>
        </aside>
      </div>`;
    ui.wireBetButtons(mainEl);
  }
  const fairAm = (p) => odds.probToAmerican(Math.min(0.99, Math.max(0.01, p)));

  function tile(label, h) {
    const tone = h.rate >= 0.6 ? 'hot' : h.rate <= 0.4 ? 'cold' : '';
    return `<div class="stat"><span>Hit rate · ${label}</span><strong class="${tone}">${odds.pct(h.rate, 0)}</strong><small>${h.hits} of ${h.n} over · avg ${h.avg.toFixed(1)}</small></div>`;
  }

  function barChart(games, stat, line) {
    const W = narrow() ? 360 : 720, H = narrow() ? 220 : 230, top = 18, bottom = 34, left = 6;
    const vals = games.map((g) => g.stats[stat] ?? 0);
    const max = Math.max(line * 1.25, ...vals) * 1.08 || 1;
    const bw = (W - left * 2) / games.length;
    const y = (v) => top + (1 - v / max) * (H - top - bottom);
    const ly = y(line);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.esc(stat)} in the last 20 games versus the line">
      <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" stroke="var(--line)"/>
      ${games.map((g, k) => {
        const v = g.stats[stat] ?? 0;
        const over = v > line;
        const x = left + k * bw;
        const yy = y(v);
        return `<g><rect x="${x + bw * 0.14}" y="${yy}" width="${bw * 0.72}" height="${Math.max(1.5, H - bottom - yy)}" rx="3" fill="${over ? 'var(--pos)' : 'var(--neg)'}" opacity="${over ? 1 : 0.75}"><title>${new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${g.home ? 'vs' : '@'} ${g.opponent}: ${v}</title></rect>
          <text class="v" x="${x + bw / 2}" y="${yy - 4}" text-anchor="middle">${v}</text>
          <text x="${x + bw / 2}" y="${H - bottom + 13}" text-anchor="middle">${g.home ? '' : '@'}${abbr(g.opponent)}</text>
          <text x="${x + bw / 2}" y="${H - bottom + 26}" text-anchor="middle">${new Date(g.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</text></g>`;
      }).join('')}
      <line x1="0" x2="${W}" y1="${ly}" y2="${ly}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <rect x="${W - 40}" y="${ly - 9}" width="38" height="18" rx="9" fill="var(--text)"/>
      <text x="${W - 21}" y="${ly + 4}" text-anchor="middle" style="fill:var(--paper);font-weight:700">${line}</text></svg>`;
  }

  // ---------- all props table ----------
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
  function paintTable() {
    const keyFns = { player: (r) => r.player, stat: (r) => r.stat, point: (r) => r.point, h5: (r) => r.h5, h10: (r) => r.h10, h20: (r) => r.h20, avg: (r) => r.avg - r.point, edge: (r) => r.edge };
    const k = keyFns[st.sort];
    const rows = tableRows().sort((a, b) => { const x = k(a), y = k(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * st.dir; });
    root.querySelector('[data-tcount]').textContent = `${rows.length} props`;
    const th = (key, label, num = true) => `<th class="sortable${num ? ' rt' : ''}${st.sort === key ? ' on' : ''}" data-sort="${key}">${label}${st.sort === key ? (st.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`;
    const hr = (x) => `<span class="hrp ${x >= 0.6 ? 'hi' : x <= 0.4 ? 'lo' : ''}">${odds.pct(x, 0)}</span>`;
    root.querySelector('[data-table]').innerHTML = `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      ${th('player', 'Player', false)}${th('stat', 'Stat', false)}${th('point', 'Line')}<th>Best Over</th><th>Best Under</th>${th('h5', 'L5')}${th('h10', 'L10')}${th('h20', 'L20')}${th('avg', 'Avg L10')}${th('edge', 'Best edge')}</tr></thead><tbody>
      ${rows.map((r) => {
        const [o, u] = r.mk.best;
        const ev = api.eventById(r.eventId);
        const selected = r.player === st.player && r.stat === st.stat;
        return `<tr class="click${selected ? ' sel' : ''}" data-p="${ui.esc(r.player)}" data-s="${ui.esc(r.stat)}" data-l="${r.point}">
          <td class="first"><div style="font-weight:700">${ui.esc(r.player)}</div><div class="muted" style="font-size:12px">${ui.sport(r.sport)} ${abbr(r.team)} ${r.home ? 'vs' : '@'} ${abbr(r.opponent)} · ${ev.live ? 'Live' : ui.when(ev.start)}</div></td>
          <td data-label="Stat">${ui.esc(r.stat)}</td>
          <td class="rt" data-label="Line"><strong>${r.point}</strong></td>
          <td data-label="Best Over">${o ? `<span class="pb">${ui.price(o.price)} ${ui.book(o.book)}</span>` : '—'}</td>
          <td data-label="Best Under">${u ? `<span class="pb">${ui.price(u.price)} ${ui.book(u.book)}</span>` : '—'}</td>
          <td class="rt" data-label="L5">${hr(r.h5)}</td><td class="rt" data-label="L10">${hr(r.h10)}</td><td class="rt" data-label="L20">${hr(r.h20)}</td>
          <td class="rt" data-label="Avg L10">${r.avg.toFixed(1)}</td>
          <td class="rt" data-label="Best edge">${r.edge > 0.005 ? ui.edge(r.edge, { label: r.side === 0 ? 'O' : 'U' }) : '<span class="muted">—</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    root.querySelectorAll('[data-sort]').forEach((h) => h.addEventListener('click', () => {
      const key = h.dataset.sort;
      if (st.sort === key) st.dir *= -1; else { st.sort = key; st.dir = key === 'player' || key === 'stat' ? 1 : -1; }
      paintTable();
    }));
    root.querySelectorAll('[data-table] tr[data-p]').forEach((tr) => tr.addEventListener('click', () => {
      st.player = tr.dataset.p; st.stat = tr.dataset.s; st.line = Number(tr.dataset.l);
      root.querySelector('[data-player]').value = st.player;
      paintAll();
      root.querySelector('.bf-props .hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function paintAll() { paintControls(); paintMain(); paintTable(); }

  const input = root.querySelector('[data-player]');
  const choose = () => {
    const v = input.value.trim().toLowerCase();
    const m = players.find((x) => x.player.toLowerCase() === v) || (v.length >= 3 ? players.find((x) => x.player.toLowerCase().includes(v)) : null);
    if (m && m.player !== st.player) { st.player = m.player; st.stat = null; st.line = null; input.value = m.player; paintAll(); }
  };
  input.addEventListener('change', choose);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') choose(); });
  ui.onSelect(root, 'tsport', (v) => { tSport = v; paintTable(); });

  paintAll();
  const unS = store.subscribe(() => { paintMain(); paintTable(); });
  return () => { unS(); };
}
