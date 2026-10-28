// Sportsbook Screen: every market at every book in real time, with no-vig fair and hold.
import { rng } from '../data/core.js';

const MARKETS = ['Moneyline', 'Spread', 'Total', 'Player Prop'];
const SHARP_COLS = ['circa', 'novig', 'px'];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const CSS = `
.scr .scr-bar { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:14px; }
.scr .scr-bar .field input[type=search] { min-width:220px; }
.scr .scr-auto { display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--muted); background:var(--paper); border:1px solid var(--line); border-radius:999px; padding:5px 11px; }
.scr .scr-auto i { width:8px; height:8px; border-radius:50%; background:var(--pos); animation:pulse 1.4s infinite; }
.scr .scr-auto.off i { background:var(--muted); animation:none; }
.scr .grid-wrap { overflow:auto; max-height:calc(100vh - 260px); min-height:320px; border-radius:var(--r); }
.scr table.og { border-collapse:separate; border-spacing:0; width:100%; font-size:13px; }
.scr .og th { position:sticky; top:0; z-index:2; background:var(--panel); font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); padding:9px 8px; border-bottom:1px solid var(--line); white-space:nowrap; text-align:center; }
.scr .og th.sh { background:color-mix(in srgb, var(--ink) 10%, var(--panel)); }
.scr .og td { padding:6px 8px; border-bottom:1px solid var(--line-2); text-align:center; white-space:nowrap; font-family:var(--mono); font-variant-numeric:tabular-nums; }
.scr .og .stk { position:sticky; left:0; z-index:1; background:var(--paper); text-align:left; font-family:var(--sans); min-width:230px; max-width:260px; white-space:normal; border-right:1px solid var(--line); }
.scr .og th.stk { z-index:3; background:var(--panel); }
.scr .og tr.grp td { border-top:1px solid var(--line); }
.scr .og tbody tr { cursor:pointer; }
.scr .og tbody tr:hover td { background:var(--panel); }
.scr .og td.sh { background:color-mix(in srgb, var(--ink) 4%, transparent); }
.scr .og td.fair { font-weight:700; color:var(--accent); }
.scr .og td.na { color:var(--line); }
.scr .og td.ev { color:var(--pos); font-weight:700; }
.scr .og .oname { font-weight:600; font-size:13px; }
.scr .og .lname { font-size:11.5px; color:var(--muted); margin-top:2px; }
.scr .og .evn { font-size:12px; color:var(--muted); display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:3px; }
.scr .og .evn b { color:var(--text); font-weight:600; }
.scr .og .hold { font-size:12px; }
.scr .og .hold.lo { color:var(--pos); font-weight:700; }
.scr .og td.up { animation: scrUp 1.6s ease; }
.scr .og td.down { animation: scrDown 1.6s ease; }
@keyframes scrUp { from { background: color-mix(in srgb, var(--pos) 35%, transparent); } to { background: transparent; } }
@keyframes scrDown { from { background: color-mix(in srgb, var(--neg) 35%, transparent); } to { background: transparent; } }
.scr .og .price.best { padding:1px 4px; }
.scr .legend { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); padding:10px 14px; border-top:1px solid var(--line-2); align-items:center; }
.scr .legend .sw { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
.scr-d .chart { width:100%; height:auto; display:block; }
.scr-d .chart text { font: 10px var(--sans); fill: var(--muted); }
.scr-d .lg { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 0; }
.scr-d .lg button { border:1px solid var(--line); background:var(--paper); border-radius:999px; padding:2px 8px 2px 6px; font-size:11.5px; cursor:pointer; display:inline-flex; gap:5px; align-items:center; }
.scr-d .lg button.off { opacity:.4; }
.scr-d .lg i { width:9px; height:9px; border-radius:3px; display:inline-block; }
.scr-d section { margin-bottom:22px; }
.scr-d h3 { font-size:15px; margin-bottom:8px; }
.scr-d .t td, .scr-d .t th { padding:7px 10px; font-size:13px; }
@media (max-width:860px){ .scr .scr-bar .field, .scr .scr-bar .field input[type=search] { min-width:0; width:100%; } .scr .scr-bar > * { flex:1 1 140px; } .scr .og .stk { min-width:150px; max-width:170px; } .scr .grid-wrap { max-height:none; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-screen')) document.head.insertAdjacentHTML('beforeend', `<style id="css-screen">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const st = { sport: params.sport || 'All', market: params.market || 'Moneyline', live: params.live === '1', q: '', mine: false, auto: true, limit: 60 };
  let prevPrices = new Map();
  let shown = [];

  root.innerHTML = `<div class="scr">
    ${ui.header({ title: 'Sportsbook Screen', subtitle: 'See every market in real time so you can implement your own strategy. Find bets yourself with real-time data.', tool: 'screen',
      actions: '<button class="scr-auto" id="scr-auto" style="cursor:pointer"><i></i><span>Auto refresh on</span></button>' })}
    <div id="scr-stats"></div>
    <div class="scr-bar">
      ${ui.select('sport', ['All', ...api.sports], st.sport, 'Sport')}
      <div class="field"><span>Market</span>${ui.seg('market', MARKETS, st.market)}</div>
      <label class="field"><span>Search</span><input type="search" class="input" id="scr-q" placeholder="Team or player"></label>
      <label class="check"><input type="checkbox" id="scr-live" ${st.live ? 'checked' : ''}> Live only</label>
      <label class="check"><input type="checkbox" id="scr-mine"> My books only</label>
    </div>
    <div class="card"><div class="grid-wrap" id="scr-grid"></div>
      <div class="legend"><span><span class="sw" style="background:var(--lime)"></span>Best price</span>
        <span><span class="sw" style="background:color-mix(in srgb, var(--pos) 35%, transparent)"></span>Price moved up</span>
        <span><span class="sw" style="background:color-mix(in srgb, var(--neg) 35%, transparent)"></span>Price moved down</span>
        <span><b style="color:var(--pos)">Green</b> = beats no-vig fair</span><span>Click any row for line movement</span></div></div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  const cols = () => {
    const sb = api.sportsbooks.filter((b) => !st.mine || store.get().books.includes(b.id)).map((b) => b.id);
    return [...sb, ...SHARP_COLS];
  };
  const fairFor = (line) => api.fairProbs(line, store.get().sharpRefs, methods[store.get().devigMethod] || odds.devig);

  function filtered() {
    const q = st.q.trim().toLowerCase();
    return api.lines({ sport: st.sport, market: st.market, live: st.live ? true : undefined }).filter((l) => {
      if (!q) return true;
      const e = api.eventById(l.eventId);
      return `${e.home} ${e.away} ${l.player || ''} ${l.label}`.toLowerCase().includes(q);
    }).sort((a, b) => (b.live - a.live) || (api.eventById(a.eventId).start - api.eventById(b.eventId).start));
  }

  function drawStats(lines) {
    const books = store.get().books;
    let lowHold = 0, edges = 0;
    for (const l of lines) {
      const best = api.bestPrices(l, books);
      if (best.every(Boolean) && odds.hold(best.map((b) => b.price)) < 0.02) lowHold++;
      const f = fairFor(l);
      if (books.some((b) => l.prices[b]?.some((p, i) => odds.ev(f[i], p) > 0.01))) edges++;
    }
    $('#scr-stats').innerHTML = ui.stats([
      { label: 'Markets on screen', value: lines.length, note: `${new Set(lines.map((l) => l.eventId)).size} games · ${cols().length} books` },
      { label: 'Live markets', value: lines.filter((l) => l.live).length, note: 'Updating every 4s' },
      { label: 'Markets with a +EV price', value: edges, tone: 'pos', note: 'vs sharp no-vig fair' },
      { label: 'Low-hold markets', value: lowHold, note: 'Best-price hold under 2%' },
    ]);
  }

  function draw(flash) {
    const lines = filtered();
    shown = lines.slice(0, st.limit);
    drawStats(lines);
    const C = cols();
    const books = store.get().books;
    const next = new Map();
    if (!shown.length) { $('#scr-grid').innerHTML = ui.empty('No markets match. Try another sport, market or search.'); prevPrices = next; return; }
    const body = shown.map((l) => {
      const e = api.eventById(l.eventId);
      const fair = fairFor(l);
      const best = api.bestPrices(l, st.mine ? books : undefined);
      const h = best.every(Boolean) ? odds.hold(best.map((b) => b.price)) : null;
      return l.outcomes.map((name, i) => {
        const cells = C.map((b) => {
          const p = l.prices[b]?.[i];
          const key = `${l.id}|${b}|${i}`;
          if (p === undefined) return `<td class="na${SHARP_COLS.includes(b) ? ' sh' : ''}">—</td>`;
          next.set(key, p);
          const old = prevPrices.get(key);
          const mv = flash && old !== undefined && old !== p ? (p > old ? ' up' : ' down') : '';
          const isBest = best[i] && best[i].book === b;
          const evc = !SHARP_COLS.includes(b) && !isBest && odds.ev(fair[i], p) > 0 ? ' ev' : '';
          return `<td class="${SHARP_COLS.includes(b) ? 'sh' : ''}${mv}${evc}">${isBest ? ui.price(p, { best: true }) : odds.fmtAmerican(p)}</td>`;
        }).join('');
        const first = i === 0;
        const head = first
          ? `<div class="evn">${e.live ? ui.liveDot() : ''}<b>${ui.esc(e.away)} @ ${ui.esc(e.home)}</b></div>`
          : '';
        return `<tr class="${first ? 'grp' : ''}" data-line="${l.id}">
          <td class="stk">${head}<div class="oname">${ui.esc(name)}</div>${first ? `<div class="lname">${ui.esc(l.sport)} · ${ui.esc(l.label)}${e.live ? ` · ${ui.esc(e.clock)}` : ` · ${ui.when(e.start)}`}</div>` : ''}</td>
          <td class="fair">${odds.fmtAmerican(odds.probToAmerican(fair[i]))}</td>
          ${first ? `<td rowspan="${l.outcomes.length}" class="hold ${h !== null && h < 0.02 ? 'lo' : ''}">${h === null ? '—' : odds.pct(h, 1)}</td>` : ''}
          ${cells}</tr>`;
      }).join('');
    }).join('');
    const gw = $('#scr-grid');
    const keep = [gw.scrollTop, gw.scrollLeft];
    requestAnimationFrame(() => { gw.scrollTop = keep[0]; gw.scrollLeft = keep[1]; });
    gw.innerHTML = `<table class="og"><thead><tr><th class="stk">Event / selection</th><th>Fair</th><th>Hold</th>
      ${C.map((b) => `<th class="${SHARP_COLS.includes(b) ? 'sh' : ''}">${ui.book(b)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
      ${lines.length > st.limit ? `<div style="padding:12px;text-align:center;position:sticky;left:0"><button class="btn" id="scr-more">Show more (${lines.length - st.limit} markets)</button></div>` : ''}`;
    prevPrices = next;
    $('#scr-grid').querySelectorAll('tr[data-line]').forEach((tr) => tr.addEventListener('click', () => openDrawer(tr.dataset.line)));
    $('#scr-more')?.addEventListener('click', () => { st.limit += 60; draw(false); });
  }

  // ---------- line-movement history (sample, seeded per line) ----------
  function genHistory(line, n = 36) {
    const r = rng(hash(line.id));
    const k = line.outcomes.length;
    // shared market drift (bridged so it ends at 0), plus per-book noise
    const drift = []; let w = 0;
    for (let t = 0; t < n; t++) { if (r() < 0.45) w += (r() - 0.45) * 0.02; drift.push(w); }
    const bridge = drift.map((d, t) => d - drift[n - 1] * (t / (n - 1)));
    const books = Object.keys(line.prices);
    const series = {};
    for (const b of books) {
      const now = line.prices[b].map(odds.impliedProb);
      const lagN = api.bookById[b].type === 'sportsbook' ? 1 + Math.floor(r() * 4) : 0;
      // book-specific wander: a small, smooth walk that also ends at today's price
      const wk = []; let v = (r() - 0.5) * 0.01;
      for (let t = 0; t < n; t++) { if (r() < 0.3) v += (r() - 0.5) * 0.006; wk.push(v); }
      const own = wk.map((x, t) => x - wk[n - 1] * (t / (n - 1)));
      series[b] = Array.from({ length: n }, (_, t) => now.map((p, i) => {
        const tt = Math.max(0, t - lagN);
        const d = (i === 0 ? 1 : -1 / Math.max(1, k - 1)) * (bridge[tt] + own[t]);
        return Math.min(0.97, Math.max(0.03, p + d));
      }));
    }
    const holdHist = Array.from({ length: n }, (_, t) => {
      let s = 0;
      for (let i = 0; i < k; i++) s += Math.min(...books.filter((b) => api.bookById[b].type === 'sportsbook').map((b) => series[b][t][i]));
      return s - 1;
    });
    return { series, holdHist, n };
  }

  function lineChart(series, idx, hidden, n) {
    const W = 760, H = 260, L = 46, R = 10, T = 10, B = 24;
    const bks = Object.keys(series).filter((b) => !hidden.has(b));
    const all = bks.flatMap((b) => series[b].map((pt) => pt[idx]));
    if (!all.length) return '<svg class="chart" viewBox="0 0 760 260"></svg>';
    let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * 0.1 || 0.01; lo -= pad; hi += pad;
    const x = (t) => L + (t / (n - 1)) * (W - L - R);
    const y = (p) => T + (1 - (p - lo) / (hi - lo)) * (H - T - B);
    const ticks = Array.from({ length: 5 }, (_, i) => lo + (i / 4) * (hi - lo));
    const grid = ticks.map((p) => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(p) + 3}" text-anchor="end">${odds.fmtAmerican(odds.probToAmerican(p))}</text>`).join('');
    const xl = [[0, '-12h'], [Math.round((n - 1) / 2), '-6h'], [n - 1, 'Now']].map(([t, l]) => `<text x="${x(t)}" y="${H - 6}" text-anchor="${t === 0 ? 'start' : t === n - 1 ? 'end' : 'middle'}">${l}</text>`).join('');
    const paths = bks.map((b) => {
      const sharp = api.bookById[b].type !== 'sportsbook';
      return `<polyline fill="none" stroke="${api.bookById[b].color}" stroke-width="${sharp ? 2.4 : 1.5}" ${sharp ? 'stroke-dasharray="5 3"' : ''} stroke-linejoin="round" points="${series[b].map((pt, t) => `${x(t).toFixed(1)},${y(pt[idx]).toFixed(1)}`).join(' ')}"><title>${api.bookById[b].name}</title></polyline>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line movement by book">${grid}${xl}${paths}</svg>`;
  }

  function holdChart(hh, n) {
    const W = 760, H = 130, L = 46, R = 10, T = 10, B = 22;
    let lo = Math.min(0, ...hh), hi = Math.max(...hh) * 1.15 || 0.05;
    const x = (t) => L + (t / (n - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = hh.map((v, t) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ticks = [lo, (lo + hi) / 2, hi].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${(v * 100).toFixed(1)}%</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hold history">${ticks}
      <polygon fill="color-mix(in srgb, var(--accent) 18%, transparent)" points="${x(0)},${y(lo)} ${pts} ${x(n - 1)},${y(lo)}"/>
      <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts}"/>
      <text x="${x(0)}" y="${H - 5}">-12h</text><text x="${x(n - 1)}" y="${H - 5}" text-anchor="end">Now</text></svg>`;
  }

  function openDrawer(lineId) {
    const line = api.lineById(lineId);
    if (!line) return;
    const e = api.eventById(line.eventId);
    const { series, holdHist, n } = genHistory(line);
    const hidden = new Set();
    let idx = 0;
    const fair = fairFor(line);
    const best = api.bestPrices(line);
    const body = ui.drawer(`${e.away} @ ${e.home} · ${line.label}`, `<div class="scr-d">
      <section>${ui.stats([
        { label: 'Best-price hold', value: best.every(Boolean) ? odds.pct(odds.hold(best.map((b) => b.price)), 2) : '—', note: `12h ago ${odds.pct(holdHist[0], 2)}` },
        ...line.outcomes.slice(0, 2).map((o, i) => ({ label: `Fair · ${o}`, value: odds.fmtAmerican(odds.probToAmerican(fair[i])), note: best[i] ? `Best ${odds.fmtAmerican(best[i].price)} ${api.bookById[best[i].book].short}` : '' })),
      ])}</section>
      <section><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">Line movement by book</h3>
        ${ui.seg('oc', line.outcomes.map((o, i) => [i, o.length > 22 ? `${o.slice(0, 20)}…` : o]), 0)}</div>
        <div id="sd-chart"></div><div class="lg" id="sd-lg"></div>
        <p class="muted" style="font-size:12px;margin:6px 0 0">Dashed lines are sharp books and exchanges (Circa, Novig, ProphetX). Retail books that lag the sharp move show up as the gap.</p></section>
      <section><h3>Hold history</h3>${holdChart(holdHist, n)}</section>
      <section><h3>Current prices</h3><div class="table-wrap"><table class="t"><thead><tr><th>Book</th>${line.outcomes.map((o) => `<th class="num-cell">${ui.esc(o)}</th>`).join('')}<th class="num-cell">Hold</th></tr></thead>
        <tbody>${Object.keys(line.prices).map((b) => `<tr><td>${ui.book(b, { full: true })}</td>${line.prices[b].map((p, i) => `<td class="num-cell">${ui.price(p, { best: best[i]?.book === b })}</td>`).join('')}
          <td class="num-cell">${odds.pct(odds.hold(line.prices[b]), 1)}</td></tr>`).join('')}</tbody></table></div></section></div>`, { wide: true });
    const drawChart = () => {
      body.querySelector('#sd-chart').innerHTML = lineChart(series, idx, hidden, n);
      body.querySelector('#sd-lg').innerHTML = Object.keys(series).map((b) => `<button data-b="${b}" class="${hidden.has(b) ? 'off' : ''}"><i style="background:${api.bookById[b].color}"></i>${api.bookById[b].short}</button>`).join('');
      body.querySelectorAll('#sd-lg [data-b]').forEach((btn) => btn.addEventListener('click', () => {
        const b = btn.dataset.b; hidden.has(b) ? hidden.delete(b) : hidden.add(b); drawChart();
      }));
    };
    drawChart();
    ui.onSeg(body, 'oc', (v) => {
      idx = Number(v);
      body.querySelectorAll('[data-seg="oc"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      drawChart();
    });
  }

  // ---------- wiring ----------
  ui.onSelect(root, 'sport', (v) => { st.sport = v; st.limit = 60; draw(false); });
  ui.onSeg(root, 'market', (v) => {
    st.market = v; st.limit = 60;
    root.querySelectorAll('[data-seg="market"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    draw(false);
  });
  $('#scr-q').addEventListener('input', (e) => { st.q = e.target.value; draw(false); });
  $('#scr-live').addEventListener('change', (e) => { st.live = e.target.checked; draw(false); });
  $('#scr-mine').addEventListener('change', (e) => { st.mine = e.target.checked; draw(false); });
  $('#scr-auto').addEventListener('click', () => {
    st.auto = !st.auto;
    $('#scr-auto').classList.toggle('off', !st.auto);
    $('#scr-auto span').textContent = st.auto ? 'Auto refresh on' : 'Auto refresh paused';
    if (st.auto) draw(false);
  });

  draw(false);
  const offTick = api.onTick(() => { if (st.auto) draw(true); });
  const offStore = store.subscribe(() => draw(false));
  return () => { offTick(); offStore(); };
}
