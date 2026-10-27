// AI Sports Picks: model picks with grades, edge vs market, projections and reasons + graded record.

const MARKETS = [['All', 'All markets'], ['Moneyline', 'Moneyline'], ['Spread', 'Spread'], ['Total', 'Total'], ['Player Prop', 'Player props']];
const GRADE_OPTS = [['All', 'Any grade'], ['A+', 'A+ only'], ['A-', 'A- or better'], ['B', 'B or better'], ['C+', 'C+ or better']];

const CSS = `
.aip .aip-top { display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:14px; }
.aip .aip-filters { padding:12px 16px; margin-bottom:16px; }
.aip .aip-filters .toolbar { margin:0; }
.aip .aip-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:14px; }
.aip .pk { padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
.aip .pk-top { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.aip .pk-top .when { margin-left:auto; font-size:12px; color:var(--muted); }
.aip .pk-sel { font:600 17px/1.25 var(--serif); }
.aip .pk-evt { font-size:12.5px; color:var(--muted); margin-top:2px; }
.aip .pk-price { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.aip .pk-probs { display:grid; gap:5px; }
.aip .pk-prob { display:grid; grid-template-columns:62px 1fr 48px; gap:8px; align-items:center; font-size:12px; color:var(--muted); }
.aip .pk-prob b { color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }
.aip .pk-prob .bar i.mkt { background:var(--muted); opacity:.55; }
.aip .pk-meta { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; padding:9px 10px; background:var(--panel); border-radius:9px; font-size:12px; }
.aip .pk-meta span { display:block; color:var(--muted); font-size:11px; }
.aip .pk-meta strong { font-variant-numeric:tabular-nums; }
.aip .pk-why { border-top:1px solid var(--line-2); padding-top:8px; }
.aip .pk-why button { background:none; border:0; padding:0; color:var(--accent); font-weight:600; cursor:pointer; font-size:12.5px; }
.aip .pk-why ul { margin:8px 0 0; padding-left:18px; font-size:12.5px; display:grid; gap:4px; }
.aip .pk-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.aip .pk-acts .ask { margin-left:auto; font-size:12.5px; }
.grade { display:inline-grid; place-items:center; min-width:30px; height:24px; padding:0 6px; border-radius:7px; font:700 12.5px var(--sans); }
.grade.ga { background:var(--ink); color:var(--lime); }
.grade.gb { background:var(--pos-bg); color:var(--pos); }
.grade.gc { background:var(--panel); color:var(--muted); border:1px solid var(--line); }
.aip .rec-side { padding:16px; display:grid; gap:12px; position:sticky; top:70px; }
.aip .rec-big { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
.aip .rec-big strong { font:600 30px var(--serif); color:var(--pos); }
.aip td.rt, .aip th.rt { text-align:right; font-variant-numeric:tabular-nums; }
.aip .mini-t td, .aip .mini-t th { padding:6px 8px; font-size:12.5px; }
.aip .chart { position:relative; width:100%; }
.aip .chart svg { display:block; overflow:visible; max-width:100%; height:auto; }
.aip .chart .tip { position:absolute; pointer-events:none; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow); border-radius:8px; padding:6px 9px; font-size:12px; white-space:nowrap; transform:translate(-50%, -110%); opacity:0; transition:opacity .1s; z-index:2; }
.aip .chart .tip b { display:block; font-variant-numeric:tabular-nums; }
.aip .ax { fill:var(--muted); font-size:11px; font-family:var(--sans); }
.aip .res-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:16px; margin-top:16px; }
.aip .roi-bar { display:flex; align-items:center; gap:8px; }
.aip .roi-bar .bar { flex:1; min-width:50px; }
.aip .st-won { color:var(--pos); font-weight:700; } .aip .st-lost { color:var(--neg); font-weight:700; } .aip .st-push { color:var(--muted); font-weight:700; }
.aip .hero-callout { display:flex; gap:14px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
.aip .hero-callout .big { font:600 20px var(--serif); }
@media (max-width:860px) {
  .aip .aip-cards { grid-template-columns:1fr; }
  .aip .res-grid { grid-template-columns:1fr; }
  .aip .rec-side { position:static; }
  .aip .aip-top .seg { width:100%; } .aip .aip-top .seg button { flex:1; }
  .aip .aip-filters .toolbar > * { flex:1 1 140px; }
  .aip .aip-filters .toolbar > label:last-child { flex-basis:100%; }
  .aip .aip-filters .seg { display:flex; flex-wrap:nowrap; } .aip .aip-filters .seg button { flex:1; padding:6px 6px; }
}
`;

export const gradeBadge = (g) => `<span class="grade ${g?.[0] === 'A' ? 'ga' : g?.[0] === 'B' ? 'gb' : 'gc'}" title="Model grade">${g}</span>`;

/** Line chart with crosshair tooltip, sized to its container. */
function lineChart(el, { values, labels, fmt, zero = null, height = 200, color = 'var(--accent)', fill = true }) {
  const W = Math.max(260, el.clientWidth || 600), H = height, padL = 44, padR = 10, padT = 10, padB = 24;
  let min = Math.min(...values), max = Math.max(...values);
  if (zero !== null) { min = Math.min(min, zero); max = Math.max(max, zero); }
  const span = max - min || 1; min -= span * 0.06; max += span * 0.06;
  const x = (i) => padL + (i / (values.length - 1 || 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);
  const xt = [0, Math.floor((values.length - 1) / 2), values.length - 1];
  const base = zero !== null ? y(zero) : H - padB;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart">
    ${ticks.map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-2)"/><text class="ax" x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t, true)}</text>`).join('')}
    ${zero !== null ? `<line x1="${padL}" x2="${W - padR}" y1="${base}" y2="${base}" stroke="var(--muted)" stroke-dasharray="3 3" opacity=".6"/>` : ''}
    ${fill ? `<polygon points="${x(0)},${base} ${pts} ${x(values.length - 1)},${base}" fill="${color}" opacity=".1"/>` : ''}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    ${xt.map((i) => `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'}">${labels[i] || ''}</text>`).join('')}
    <line class="xh" x1="0" x2="0" y1="${padT}" y2="${H - padB}" stroke="var(--muted)" opacity="0"/>
    <circle class="dot" r="4.5" fill="${color}" stroke="var(--paper)" stroke-width="2" opacity="0"/>
    <rect x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent" class="hit"/>
  </svg><div class="tip"></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh'), dot = el.querySelector('.dot');
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(values.length - 1, Math.round(((clientX - rect.left - padL) / (W - padL - padR)) * (values.length - 1))));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', '.5');
    dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(values[i])); dot.setAttribute('opacity', '1');
    tip.innerHTML = `<span class="muted">${labels[i] || ''}</span><b>${fmt(values[i])}</b>`;
    tip.style.left = `${Math.min(W - 60, Math.max(60, x(i)))}px`; tip.style.top = `${y(values[i])}px`; tip.style.opacity = '1';
  };
  const hide = () => { xh.setAttribute('opacity', '0'); dot.setAttribute('opacity', '0'); tip.style.opacity = '0'; };
  const hit = el.querySelector('.hit');
  hit.addEventListener('mousemove', (e) => show(e.clientX));
  hit.addEventListener('touchmove', (e) => show(e.touches[0].clientX), { passive: true });
  hit.addEventListener('mouseleave', hide);
  hit.addEventListener('touchend', hide);
}

export default function render(root, ctx) {
  const { api, store, ui, params } = ctx;
  if (!document.getElementById('css-ai-picks')) document.head.insertAdjacentHTML('beforeend', `<style id="css-ai-picks">${CSS}</style>`);
  const P = api.picks || {};
  const st = { tab: params.tab === 'results' ? 'results' : 'today', sport: params.sport || 'All', market: params.market || 'All', grade: 'All', sort: 'edge', resSport: 'All' };
  const open = new Set();
  const logged = new Set();
  const fmtU = (u, axis) => `${u >= 0 ? '+' : ''}${u.toFixed(axis ? 0 : 1)}u`;
  const day = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  root.innerHTML = `<div class="aip">
    ${ui.header({ title: 'AI Sports Picks', tool: 'ai-picks',
      subtitle: 'Our model prices every game and prop, compares it with every book, and grades the best plays A+ to C. Each pick shows the projection, the edge at the best available price and the factors behind it.',
      actions: `<a class="btn" href="#/ai-chat?q=${encodeURIComponent('Top AI picks today')}">✎ Ask BetFriend AI</a>` })}
    <div class="aip-top">${ui.seg('tab', [['today', 'Today’s picks'], ['results', 'Results & record']], st.tab)}<span class="muted" id="aip-upd"></span></div>
    <div id="aip-body"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  ui.onSeg(root, 'tab', (v) => { st.tab = v; root.querySelectorAll('[data-seg="tab"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); draw(); });

  const getPicks = () => {
    const books = store.get().books;
    let list = P.picks?.({ sport: st.sport, market: st.market, books, minGrade: st.grade }) || [];
    if (st.sort === 'conf') list = [...list].sort((a, b) => b.confidence - a.confidence);
    if (st.sort === 'start') list = [...list].sort((a, b) => a.start - b.start);
    return list;
  };

  function pickCard(p) {
    const e = api.eventById(p.eventId);
    const isOpen = open.has(p.id);
    const q = `Should I bet ${p.selection}?`;
    return `<article class="card pk" data-id="${p.id}">
      <div class="pk-top">${gradeBadge(p.grade)} ${ui.sport(p.sport)} ${ui.tag(p.market === 'Player Prop' ? 'Prop' : p.market)} <span class="when">${ui.when(e.start)}</span></div>
      <div><div class="pk-sel">${ui.esc(p.selection)}</div><div class="pk-evt">${ui.esc(e.away)} @ ${ui.esc(e.home)}</div></div>
      <div class="pk-price">${ui.book(p.bestBook)} ${ui.price(p.bestPrice, { best: true })} ${ui.edge(p.edge, { label: 'Edge' })}</div>
      <div class="pk-probs">
        <div class="pk-prob">Model <div class="bar"><i style="width:${(p.modelProb * 100).toFixed(1)}%"></i></div><b>${ui.pct(p.modelProb)}</b></div>
        <div class="pk-prob">Market <div class="bar"><i class="mkt" style="width:${(p.marketProb * 100).toFixed(1)}%"></i></div><b>${ui.pct(p.marketProb)}</b></div>
      </div>
      <div class="pk-meta">
        <div><span>Projection</span><strong>${ui.esc(p.projection.text)}</strong></div>
        <div><span>Confidence</span><strong>${ui.meter(p.confidence)} ${Math.round(p.confidence * 100)}</strong></div>
        <div><span>Stake</span><strong>${p.stakeUnits}u · ${ui.money(p.stakeUnits * store.get().unit, 0)}</strong></div>
      </div>
      <div class="pk-why"><button type="button" data-why="${p.id}" aria-expanded="${isOpen}">${isOpen ? '▾' : '▸'} Why the model likes it</button>
        ${isOpen ? `<ul>${p.reasons.map((r) => `<li>${ui.esc(r)}</li>`).join('')}</ul>` : ''}</div>
      <div class="pk-acts">${ui.betBtn(p.bestBook)}<button class="btn sm" data-log="${p.id}" ${logged.has(p.id) ? 'disabled' : ''}>${logged.has(p.id) ? '✓ Logged' : '+ Log bet'}</button><a class="ask" href="#/ai-chat?q=${encodeURIComponent(q)}">Ask AI →</a></div>
    </article>`;
  }

  function recordSide() {
    const rec = P.record?.();
    if (!rec) return '';
    const o = rec.overall;
    return `<aside class="card rec-side">
      <div><div class="muted" style="font-size:12px">AI picks record · last 60 days</div>
        <div class="rec-big"><strong>${fmtU(o.units)}</strong><span>${o.wins}-${o.losses}${o.pushes ? `-${o.pushes}` : ''} · ${ui.pct(o.roi)} ROI</span></div></div>
      <div class="chart" id="aip-side-chart"></div>
      <table class="t mini-t"><thead><tr><th>Grade</th><th class="rt">Record</th><th class="rt">ROI</th></tr></thead><tbody>
        ${rec.byGrade.map((g) => `<tr><td>${gradeBadge(g.key)}</td><td class="rt">${g.wins}-${g.losses}</td><td class="rt"><span class="${g.roi >= 0 ? 'st-won' : 'st-lost'}">${g.roi >= 0 ? '+' : ''}${ui.pct(g.roi)}</span></td></tr>`).join('')}
      </tbody></table>
      <button class="btn sm" data-goto-results>Full results →</button>
    </aside>`;
  }

  function drawToday(keepFilters) {
    const list = getPicks();
    const rec = P.record?.();
    const aCount = list.filter((p) => p.grade.startsWith('A')).length;
    const avgEdge = list.length ? list.reduce((a, p) => a + p.edge, 0) / list.length : 0;
    if (!keepFilters) {
      $('#aip-body').innerHTML = `
        ${ui.stats([
          { label: 'Picks on the board', value: String(list.length), note: 'Across your books' },
          { label: 'A-grade plays', value: String(aCount), note: 'Highest conviction' },
          { label: 'Average edge', value: ui.pct(avgEdge), tone: 'pos', note: 'Model vs best price' },
          { label: 'Model ROI (60d)', value: rec ? `${rec.overall.roi >= 0 ? '+' : ''}${ui.pct(rec.overall.roi)}` : '—', tone: 'pos', note: rec ? `${fmtU(rec.overall.units)} on ${rec.overall.bets} picks` : '' },
        ])}
        <div class="card aip-filters"><div class="toolbar">
          ${ui.select('sport', ['All', ...api.sports].map((s) => [s, s === 'All' ? 'All sports' : s]), st.sport, 'Sport')}
          ${ui.select('market', MARKETS, st.market, 'Market')}
          ${ui.select('grade', GRADE_OPTS, st.grade, 'Min grade')}
          <label class="field"><span>Sort by</span>${ui.seg('sort', [['edge', 'Best'], ['conf', 'Confidence'], ['start', 'Start time']], st.sort)}</label>
        </div></div>
        <div class="split"><div><div id="aip-list"></div></div>${recordSide()}</div>`;
      ui.onSelect(root, 'sport', (v) => { st.sport = v; drawToday(); });
      ui.onSelect(root, 'market', (v) => { st.market = v; drawToday(); });
      ui.onSelect(root, 'grade', (v) => { st.grade = v; drawToday(); });
      ui.onSeg(root, 'sort', (v) => { st.sort = v; drawToday(); });
      root.querySelector('[data-goto-results]')?.addEventListener('click', () => { st.tab = 'results'; root.querySelectorAll('[data-seg="tab"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'results')); draw(); });
      const sc = $('#aip-side-chart');
      if (sc && rec) lineChart(sc, { values: rec.daily.map((d) => d.cum), labels: rec.daily.map((d) => day(d.date)), fmt: fmtU, zero: 0, height: 130, color: 'var(--pos)' });
    } else {
      const tiles = root.querySelectorAll('.stats .stat strong');
      if (tiles[1]) tiles[1].textContent = aCount;
      if (tiles[2]) tiles[2].textContent = ui.pct(avgEdge);
    }
    $('#aip-list').innerHTML = list.length ? `<div class="aip-cards">${list.slice(0, 30).map(pickCard).join('')}</div>` : ui.empty('No picks match these filters right now. Try a lower minimum grade.');
    wireList(list);
  }

  function wireList(list) {
    const el = $('#aip-list');
    ui.wireBetButtons(el);
    el.querySelectorAll('[data-why]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.why;
      open.has(id) ? open.delete(id) : open.add(id);
      drawToday(true);
    }));
    el.querySelectorAll('[data-log]').forEach((b) => b.addEventListener('click', () => {
      const p = list.find((x) => x.id === b.dataset.log);
      if (!p) return;
      ui.logBet({ kind: 'ai-pick', book: p.bestBook, sport: p.sport, market: p.market, selection: p.selection, price: p.bestPrice,
        stake: Math.round(p.stakeUnits * store.get().unit), eventId: p.eventId, note: `AI grade ${p.grade}` });
      logged.add(p.id); b.textContent = '✓ Logged'; b.disabled = true;
    }));
  }

  function drawResults() {
    const rec = P.record?.();
    if (!rec) { $('#aip-body').innerHTML = ui.empty('Results are loading.'); return; }
    const o = rec.overall;
    const maxRoi = Math.max(...rec.bySport.map((s) => Math.abs(s.roi)), ...rec.byGrade.map((s) => Math.abs(s.roi)), 0.01);
    const roiRow = (r, label, kind) => `<tr><td data-label="${kind}">${label}</td><td class="rt" data-label="Record">${r.wins}-${r.losses}${r.pushes ? `-${r.pushes}` : ''}</td>
      <td class="rt" data-label="Units"><span class="${r.units >= 0 ? 'st-won' : 'st-lost'}">${fmtU(r.units)}</span></td>
      <td data-label="ROI"><div class="roi-bar"><div class="bar"><i style="width:${(Math.max(0, r.roi) / maxRoi) * 100}%;background:${r.roi >= 0 ? 'var(--pos)' : 'var(--neg)'}"></i></div><b>${r.roi >= 0 ? '+' : ''}${ui.pct(r.roi)}</b></div></td></tr>`;
    const last = rec.last30.filter((g) => st.resSport === 'All' || g.sport === st.resSport);
    $('#aip-body').innerHTML = `
      ${ui.stats([
        { label: 'Record', value: `${o.wins}-${o.losses}`, note: `${ui.pct(o.winRate)} win rate` },
        { label: 'Units', value: fmtU(o.units), tone: o.units >= 0 ? 'pos' : 'neg', note: `${ui.money(o.units * store.get().unit, 0)} at your ${ui.money(store.get().unit, 0)} unit` },
        { label: 'ROI', value: `${o.roi >= 0 ? '+' : ''}${ui.pct(o.roi)}`, tone: 'pos', note: `${o.bets} graded picks` },
        { label: 'Last 7 days', value: fmtU(rec.last7.units), tone: rec.last7.units >= 0 ? 'pos' : 'neg', note: `${rec.last7.wins}-${rec.last7.losses}` },
        { label: 'Avg CLV', value: `+${ui.pct(o.clv)}`, tone: 'pos', note: 'Beat the closing line' },
      ])}
      <div class="card"><header><h3>Cumulative units · last 60 days</h3><span class="muted" style="font-size:12px">Every pick graded at the price we posted</span></header>
        <div class="pad"><div class="chart" id="aip-units"></div></div></div>
      <div class="res-grid">
        <div class="card"><header><h3>By sport</h3></header><div class="table-wrap"><table class="t stack-sm"><thead><tr><th>Sport</th><th class="rt">Record</th><th class="rt">Units</th><th>ROI</th></tr></thead>
          <tbody>${rec.bySport.map((s) => roiRow(s, ui.sport(s.key), "Sport")).join('')}</tbody></table></div></div>
        <div class="card"><header><h3>By grade</h3></header><div class="table-wrap"><table class="t stack-sm"><thead><tr><th>Grade</th><th class="rt">Record</th><th class="rt">Units</th><th>ROI</th></tr></thead>
          <tbody>${rec.byGrade.map((s) => roiRow(s, gradeBadge(s.key), "Grade")).join('')}</tbody></table></div></div>
      </div>
      <div class="card" style="margin-top:16px"><header><h3>Last 30 graded picks</h3>${ui.select('ressport', ['All', ...api.sports], st.resSport)}</header>
        <div class="table-wrap"><table class="t stack-sm"><thead><tr><th>Date</th><th>Pick</th><th>Grade</th><th class="rt">Price</th><th class="rt">Stake</th><th>Result</th><th class="rt">Units</th></tr></thead><tbody>
        ${last.map((g) => `<tr><td data-label="Date" class="muted">${day(g.ts)}</td><td data-label="Pick"><div class="evt-name">${ui.esc(g.selection)}</div><div class="evt-meta">${ui.sport(g.sport)} <span class="muted">${ui.esc(g.market)}</span></div></td>
          <td data-label="Grade">${gradeBadge(g.grade)}</td><td class="rt" data-label="Price">${ui.price(g.price)}</td><td class="rt" data-label="Stake">${g.stake}u</td>
          <td data-label="Result"><span class="st-${g.status}">${g.status === 'won' ? 'Won' : g.status === 'lost' ? 'Lost' : 'Push'}</span></td>
          <td class="rt" data-label="Units"><span class="${g.units > 0 ? 'st-won' : g.units < 0 ? 'st-lost' : 'st-push'}">${fmtU(g.units)}</span></td></tr>`).join('') || `<tr><td colspan="7">${ui.empty('No graded picks for this sport in the last 30.')}</td></tr>`}
        </tbody></table></div></div>`;
    lineChart($('#aip-units'), { values: rec.daily.map((d) => d.cum), labels: rec.daily.map((d) => day(d.date)), fmt: fmtU, zero: 0, height: 240, color: 'var(--pos)' });
    ui.onSelect(root, 'ressport', (v) => { st.resSport = v; drawResults(); });
  }

  function draw() { if (st.tab === 'results') drawResults(); else drawToday(); stamp(); }
  let lastUpd = Date.now();
  const stamp = () => { const el = $('#aip-upd'); if (el) el.textContent = st.tab === 'today' ? `Prices refreshed ${ui.ago(lastUpd)} · ${store.get().books.length} books` : 'Graded nightly at closing prices'; };
  draw();

  const unsub = api.onTick(() => { lastUpd = Date.now(); if (st.tab === 'today' && $('#aip-list')) drawToday(true); stamp(); });
  let rt = null;
  let vw = window.innerWidth;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(window.innerWidth - vw) > 30) { vw = window.innerWidth; draw(); } }, 150); };
  window.addEventListener('resize', onResize);
  return () => { unsub(); clearTimeout(rt); window.removeEventListener('resize', onResize); };
}
