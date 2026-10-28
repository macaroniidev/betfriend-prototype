// Positive EV: pre-match and live +EV bets priced against sharp fair odds.
import { rng, SHARP_REFS } from '../data/core.js';

const MARKETS = ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'];
const METHOD_LABEL = { multiplicative: 'Multiplicative', power: 'Power', additive: 'Additive' };
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const CSS = `
.pev .pev-auto { display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--muted); background:var(--paper); border:2px solid var(--line); border-radius:8px; padding:5px 11px; font-weight:700; }
.pev .pev-auto i { width:8px; height:8px; border-radius:50%; background:var(--pos); animation: pulse 1.4s infinite; }
.pev .pev-auto b { color:var(--text); font-weight:600; }
.pev .pev-filters { padding:14px 16px; display:grid; gap:12px; margin-bottom:16px; }
.pev .pev-filters .toolbar { margin:0; }
.pev .pev-lab { font-size:12px; color:var(--muted); margin-bottom:5px; display:flex; gap:8px; align-items:center; }
.pev .pev-lab a { font-size:12px; cursor:pointer; }
.pev .sel-name { font-weight:600; }
.pev .sel-sub { font-size:12px; color:var(--muted); margin-top:2px; }
.pev .bookprice { display:inline-flex; gap:6px; align-items:center; white-space:nowrap; }
.pev .pev-hero { display:flex; gap:12px; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; }
.pev .pev-foot { padding:12px 16px; display:flex; justify-content:center; }
.pev .pev-banner { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
.pev-d section { margin-bottom:20px; }
.pev-d h3 { font-size:15px; margin-bottom:8px; }
.pev-d .spark { width:100%; height:auto; }
.pev-d .t td, .pev-d .t th { padding:7px 10px; font-size:13px; }
.pev-d .t td:first-child { white-space:nowrap; }
.pev-d tr.hl td { background:color-mix(in srgb, var(--lime) 30%, transparent); }
.pev-d .hist-meta { display:flex; justify-content:space-between; font-size:12px; color:var(--muted); margin-top:4px; }
.pev-d input[type=range] { width:100%; accent-color: var(--accent); }
.pev-d .acts { display:flex; gap:8px; flex-wrap:wrap; }
.pev-d .callout.lime .kv dt, .pev-d .callout.lime .kv dd { color:inherit; }
.pev-d .callout.lime .kv dt { opacity:.75; }
.pev-d .big { font: 600 22px var(--serif); }
@media (max-width:860px){ .pev .pev-hero .seg { width:100%; } .pev .pev-hero .seg button { flex:1; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-positive-ev')) document.head.insertAdjacentHTML('beforeend', `<style id="css-positive-ev">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const s0 = store.get();
  const st = {
    mode: params.mode === 'live' ? 'live' : 'pre',
    sport: params.sport || 'All', market: 'All', minEv: 1,
    refs: [...(s0.sharpRefs?.length ? s0.sharpRefs : SHARP_REFS)],
    books: [...s0.books], limit: 50,
  };
  let rows = [];
  let prev = null;
  let lastUpdate = Date.now();

  const subtitle = () => (st.mode === 'live'
    ? 'Like live arbs, live +EV bets are 2 to 3x more profitable. The volume makes this a staple for nearly every pro.'
    : 'Data-driven bets. We find bets paying out higher than they should, priced against sharp no-vig fair odds.');

  root.innerHTML = `<div class="pev">
    ${ui.header({ title: 'Positive EV', subtitle: `<span id="pev-sub">${subtitle()}</span>`, tool: 'positive-ev',
      actions: `<span class="pev-auto"><i></i>Auto refresh · <b id="pev-ago">just now</b></span>` })}
    <div class="pev-banner">${ui.seg('mode', [['pre', 'Pre-match'], ['live', 'Live +EV']], st.mode)}
      <span class="muted" id="pev-modenote"></span></div>
    <div id="pev-stats"></div>
    <div class="card pev-filters">
      <div class="toolbar">
        ${ui.select('sport', ['All', ...api.sports], st.sport, 'Sport')}
        ${ui.select('market', MARKETS, st.market, 'Market')}
        ${ui.numberInput('minev', st.minEv, 'Min EV %', { step: 0.5, min: 0 })}
        <div><div class="pev-lab">Fair odds source</div><div class="chips" id="pev-refs"></div></div>
      </div>
      <div><div class="pev-lab">Books <a data-allbooks>All</a><a data-mybooks>My books</a></div><div class="chips" id="pev-books"></div></div>
    </div>
    <div class="card"><div id="pev-table"></div></div>
  </div>`;

  const $ = (sel) => root.querySelector(sel);

  function chips() {
    $('#pev-refs').innerHTML = [...new Set([...SHARP_REFS, ...st.refs])].filter((r) => api.bookById[r]).map((r) => `<button class="chip ${st.refs.includes(r) ? 'on' : ''}" data-ref="${r}">${ui.esc(api.bookById[r].name)}</button>`).join('');
    $('#pev-books').innerHTML = api.sportsbooks.map((b) => `<button class="chip ${st.books.includes(b.id) ? 'on' : ''}" data-book="${b.id}">${ui.esc(b.short)}</button>`).join('');
    $('#pev-refs').querySelectorAll('[data-ref]').forEach((b) => b.addEventListener('click', () => {
      const r = b.dataset.ref;
      if (st.refs.includes(r)) { if (st.refs.length > 1) st.refs = st.refs.filter((x) => x !== r); } else st.refs.push(r);
      chips(); refresh(false);
    }));
    $('#pev-books').querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.book;
      if (st.books.includes(id)) { if (st.books.length > 1) st.books = st.books.filter((x) => x !== id); } else st.books.push(id);
      chips(); refresh(false);
    }));
  }
  root.querySelector('[data-allbooks]').addEventListener('click', () => { st.books = api.sportsbooks.map((b) => b.id); chips(); refresh(false); });
  root.querySelector('[data-mybooks]').addEventListener('click', () => { st.books = [...store.get().books]; chips(); refresh(false); });

  const method = () => methods[store.get().devigMethod] || odds.devig;
  const stakeFor = (o, mult = store.get().kellyMult) => Math.round(store.get().bankroll * odds.kelly(o.meta.fairProb, o.legs[0].price, mult));

  function compute() {
    rows = api.ev({ sport: st.sport, market: st.market, live: st.mode === 'live', books: st.books, minEdge: st.minEv / 100, refs: st.refs, method: method() });
  }

  function drawStats() {
    const top = rows[0];
    const avg = rows.length ? rows.reduce((a, o) => a + o.edge, 0) / rows.length : 0;
    const shown = rows.slice(0, st.limit);
    const staked = shown.reduce((a, o) => a + stakeFor(o), 0);
    const exp = shown.reduce((a, o) => a + stakeFor(o) * o.edge, 0);
    $('#pev-stats').innerHTML = ui.stats([
      { label: st.mode === 'live' ? 'Live +EV bets' : '+EV bets found', value: rows.length, note: `${new Set(rows.map((o) => o.eventId)).size} games` },
      { label: 'Top edge', value: top ? `+${(top.edge * 100).toFixed(2)}%` : '—', tone: 'pos', note: top ? ui.esc(top.legs[0].outcome) : '' },
      { label: 'Average edge', value: `+${(avg * 100).toFixed(2)}%`, tone: 'pos' },
      { label: 'Expected profit', value: odds.money(exp, 0), tone: 'pos', note: `on ${odds.money(staked, 0)} Kelly stakes` },
    ]);
    $('#pev-modenote').textContent = st.mode === 'live'
      ? `${api.events().filter((e) => e.live).length} games in play · prices refresh every 4s`
      : `Fair odds: ${st.refs.map((r) => api.bookById[r].short).join(' + ')} · ${METHOD_LABEL[store.get().devigMethod] || 'Multiplicative'} devig`;
  }

  function drawTable(flash) {
    const shown = rows.slice(0, st.limit);
    if (!shown.length) { $('#pev-table').innerHTML = ui.empty('No bets above your minimum EV right now. Lower the threshold or add books.'); return; }
    $('#pev-table').innerHTML = `<table class="t stack-sm"><thead><tr>
      <th>EV</th><th>Event</th><th>Bet</th><th>Book · price</th><th class="num-cell">Fair odds</th><th class="num-cell">Win prob</th><th class="num-cell">Stake</th><th></th></tr></thead>
      <tbody>${shown.map((o) => {
        const leg = o.legs[0];
        const fp = o.meta.fairProb;
        const isNew = flash && prev && (!prev.has(o.id) || Math.abs(prev.get(o.id) - o.edge) > 0.0005);
        return `<tr class="click${isNew ? ' flash' : ''}" data-id="${ui.esc(o.id)}">
          <td data-label="EV">${ui.edge(o.edge)}</td>
          <td data-label="Event">${ui.eventCell(o.eventId)}</td>
          <td data-label="Bet"><div><div class="sel-name">${ui.esc(leg.outcome)}</div><div class="sel-sub">${o.label === o.market ? ui.esc(o.market) : `${ui.esc(o.market)} · ${ui.esc(o.label)}`}</div></div></td>
          <td data-label="Book · price"><span class="bookprice">${ui.book(leg.book)} ${ui.price(leg.price, { best: true })}</span></td>
          <td class="num-cell mono" data-label="Fair odds">${odds.fmtAmerican(odds.probToAmerican(fp))}</td>
          <td class="num-cell" data-label="Win prob">${odds.pct(fp)}</td>
          <td class="num-cell" data-label="Stake"><strong>${odds.money(stakeFor(o), 0)}</strong></td>
          <td data-label="">${ui.betBtn(leg.book)}</td></tr>`;
      }).join('')}</tbody></table>
      ${rows.length > st.limit ? `<div class="pev-foot"><button class="btn" data-more>Show ${Math.min(50, rows.length - st.limit)} more of ${rows.length - st.limit}</button></div>` : ''}`;
    ui.wireBetButtons($('#pev-table'));
    $('#pev-table').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => {
      const o = rows.find((x) => x.id === tr.dataset.id);
      if (o) openDrawer(o);
    }));
    $('#pev-table').querySelector('[data-more]')?.addEventListener('click', () => { st.limit += 50; drawTable(false); drawStats(); });
  }

  function refresh(flash) {
    compute();
    drawStats();
    drawTable(flash);
    prev = new Map(rows.map((o) => [o.id, o.edge]));
    lastUpdate = Date.now();
    $('#pev-ago').textContent = 'just now';
  }

  // ---------- detail drawer ----------
  function history(seedKey, price, n = 28) {
    const r = rng(hash(seedKey));
    const end = odds.impliedProb(price);
    const out = [];
    let p = end + (r() - 0.45) * 0.05;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      p += (r() - 0.5) * 0.012;
      out.push(p * (1 - t) + end * t);
    }
    out[n - 1] = end;
    return out.map((x) => odds.probToAmerican(Math.min(0.97, Math.max(0.03, x))));
  }

  function openDrawer(o) {
    const line = api.lineById(o.lineId);
    if (!line) return;
    const leg = o.legs[0];
    const idx = line.outcomes.indexOf(leg.outcome);
    const m = method();
    const fp = o.meta.fairProb;
    const s = store.get();
    let mult = s.kellyMult;

    const bookIds = Object.keys(line.prices);
    const sbBest = Math.max(...bookIds.filter((b) => api.bookById[b].type === 'sportsbook').map((b) => line.prices[b][idx]));
    const priceRows = bookIds.map((b) => ({ b, p: line.prices[b][idx], other: line.prices[b].filter((_, i) => i !== idx) }))
      .sort((a, b) => b.p - a.p);
    const refRows = SHARP_REFS.filter((r) => line.prices[r]).map((r) => {
      const imp = line.prices[r].map(odds.impliedProb);
      return { r, prices: line.prices[r], over: imp.reduce((a, b) => a + b, 0) - 1, fair: m(imp)[idx], used: st.refs.includes(r) };
    });
    const methodRows = Object.entries(methods).map(([k, fn]) => {
      const f = api.fairProbs(line, st.refs, fn)[idx];
      return { k, f, e: odds.ev(f, leg.price), on: (s.devigMethod || 'multiplicative') === k };
    });
    const hist = history(`${line.id}|${leg.book}|${idx}`, leg.price);
    const typeTag = (b) => { const t = api.bookById[b].type; return t === 'sharp' ? ui.tag('Sharp', 'dark') : t === 'exchange' ? ui.tag('Exchange', 'dark') : ''; };

    const body = ui.drawer(`${leg.outcome} · ${api.bookById[leg.book].name}`, `<div class="pev-d">
      <section class="callout lime"><div class="row" style="justify-content:space-between">
        <div><div class="muted" style="color:inherit;opacity:.75">${ui.esc(o.event)} · ${ui.esc(o.label)}</div>
        <div class="big">${ui.esc(leg.outcome)} ${odds.fmtAmerican(leg.price)}</div></div>${ui.edge(o.edge)}</div>
        <dl class="kv" style="margin-top:10px"><dt>Fair odds</dt><dd>${odds.fmtAmerican(odds.probToAmerican(fp))} (${odds.pct(fp)})</dd>
        <dt>Book</dt><dd>${api.bookById[leg.book].name}</dd><dt>Expected value per $100</dt><dd>${odds.money(o.edge * 100)}</dd></dl></section>

      <section><h3>Line history · ${api.bookById[leg.book].short}</h3>
        ${ui.spark(hist.map((a) => -odds.impliedProb(a)), { w: 480, h: 70, color: 'var(--accent)' })}
        <div class="hist-meta"><span>Open ${odds.fmtAmerican(hist[0])}</span><span>12h</span><span>Now ${odds.fmtAmerican(leg.price)}</span></div></section>

      <section><h3>Price at every book</h3><table class="t"><thead><tr><th>Book</th><th class="num-cell">${ui.esc(leg.outcome)}</th><th class="num-cell">Other side</th><th class="num-cell">EV</th></tr></thead>
        <tbody>${priceRows.map(({ b, p, other }) => `<tr class="${api.bookById[b].type === 'sportsbook' && p === sbBest ? 'hl' : ''}">
          <td>${ui.book(b)} ${typeTag(b)}</td><td class="num-cell">${ui.price(p, { best: api.bookById[b].type === 'sportsbook' && p === sbBest })}</td>
          <td class="num-cell mono muted">${other.map(odds.fmtAmerican).join(' / ')}</td><td class="num-cell">${ui.edge(odds.ev(fp, p))}</td></tr>`).join('')}</tbody></table></section>

      <section><h3>Fair odds by sharp reference</h3><table class="t"><thead><tr><th>Source</th><th class="num-cell">Prices</th><th class="num-cell">Vig</th><th class="num-cell">Fair</th></tr></thead>
        <tbody>${refRows.map((x) => `<tr><td>${ui.book(x.r, { full: true })} ${x.used ? ui.tag('In blend', 'pos') : ''}</td>
          <td class="num-cell mono">${x.prices.map(odds.fmtAmerican).join(' / ')}</td><td class="num-cell">${odds.pct(x.over)}</td>
          <td class="num-cell mono"><strong>${odds.fmtAmerican(odds.probToAmerican(x.fair))}</strong></td></tr>`).join('')}
          <tr class="hl"><td><strong>Blended fair</strong></td><td></td><td></td><td class="num-cell mono"><strong>${odds.fmtAmerican(odds.probToAmerican(fp))}</strong></td></tr></tbody></table></section>

      <section><h3>Devig breakdown</h3><table class="t"><thead><tr><th>Method</th><th class="num-cell">Fair prob</th><th class="num-cell">Fair odds</th><th class="num-cell">EV</th></tr></thead>
        <tbody>${methodRows.map((x) => `<tr class="${x.on ? 'hl' : ''}"><td>${METHOD_LABEL[x.k]} ${x.on ? ui.tag('Active', 'pos') : ''}</td>
          <td class="num-cell">${odds.pct(x.f, 2)}</td><td class="num-cell mono">${odds.fmtAmerican(odds.probToAmerican(x.f))}</td><td class="num-cell">${ui.edge(x.e)}</td></tr>`).join('')}</tbody></table>
        <p class="muted" style="font-size:12px;margin:6px 0 0">Change your method and reference weights in the <a href="#/ev-builder">Fair Odds Builder</a>.</p></section>

      <section><h3>Kelly sizing</h3>
        <div class="row" style="justify-content:space-between"><span class="muted">Kelly multiplier</span><strong id="pd-mult"></strong></div>
        <input type="range" min="0.05" max="1" step="0.05" value="${mult}" id="pd-range">
        <dl class="kv" style="margin-top:8px"><dt>Full Kelly</dt><dd>${odds.pct(odds.kelly(fp, leg.price, 1), 2)} of bankroll</dd>
          <dt>Recommended stake</dt><dd id="pd-stake"></dd><dt>Expected profit</dt><dd id="pd-exp" style="color:var(--pos)"></dd>
          <dt>Bankroll</dt><dd>${odds.money(s.bankroll, 0)}</dd></dl></section>

      <div class="acts">${ui.betBtn(leg.book, 'Bet at')}<button class="btn lime" id="pd-log">Log bet</button></div></div>`);

    const upd = () => {
      const stake = Math.round(s.bankroll * odds.kelly(fp, leg.price, mult));
      body.querySelector('#pd-mult').textContent = `${mult.toFixed(2)}×`;
      body.querySelector('#pd-stake').textContent = odds.money(stake, 0);
      body.querySelector('#pd-exp').textContent = odds.money(stake * o.edge, 2);
      return stake;
    };
    upd();
    body.querySelector('#pd-range').addEventListener('input', (e) => { mult = parseFloat(e.target.value); upd(); });
    ui.wireBetButtons(body);
    body.querySelector('#pd-log').addEventListener('click', () => {
      ui.logBet({ kind: 'ev', book: leg.book, sport: o.sport, market: o.market, selection: `${leg.outcome}${o.market === 'Player Prop' ? ` · ${o.label}` : ''}`, price: leg.price, stake: upd() || store.get().unit });
    });
  }

  // ---------- wiring ----------
  ui.onSeg(root, 'mode', (v) => {
    st.mode = v; st.limit = 50; prev = null;
    root.querySelectorAll('[data-seg="mode"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    $('#pev-sub').textContent = subtitle();
    refresh(false);
  });
  ui.onSelect(root, 'sport', (v) => { st.sport = v; refresh(false); });
  ui.onSelect(root, 'market', (v) => { st.market = v; refresh(false); });
  ui.onNumber(root, 'minev', (v) => { st.minEv = v; refresh(false); });

  chips();
  refresh(false);
  const offTick = api.onTick(() => refresh(true));
  const offStore = store.subscribe((s) => { st.books = [...s.books]; chips(); refresh(false); });
  const agoTimer = setInterval(() => {
    const sec = Math.round((Date.now() - lastUpdate) / 1000);
    const el = $('#pev-ago'); if (el) el.textContent = sec < 2 ? 'just now' : `${sec}s ago`;
  }, 1000);
  return () => { offTick(); offStore(); clearInterval(agoTimer); };
}
