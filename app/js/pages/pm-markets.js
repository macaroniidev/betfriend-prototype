// Markets & Order Book: browse contracts on Kalshi, Polymarket, ProphetX and Novig, then see price
// history, the full order book ladder and a trade ticket that deep links to the venue.

const CSS = `
.pmm { --bid: var(--pos); --bid-bg: color-mix(in srgb, var(--pos) 16%, transparent); --ask: var(--neg); --ask-bg: color-mix(in srgb, var(--neg) 14%, transparent); }
.pmm .layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 16px; align-items: start; }
.pmm .browser { position: sticky; top: 70px; }
.pmm .browser .filters { padding: 12px; display: grid; gap: 8px; border-bottom: 1px solid var(--line-2); }
.pmm .browser input.input { width: 100%; }
.pmm .browser .row2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.pmm .browser .field, .pmm .browser .field select { min-width: 0; width: 100%; }
.pmm .browser .field select { width: 100%; }
.pmm .mlist { max-height: calc(100vh - 290px); min-height: 280px; overflow-y: auto; }
.pmm .mrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line-2); cursor: pointer; width: 100%; text-align: left; background: none; border-left: 3px solid transparent; border-top: 0; border-right: 0; }
.pmm .mrow:hover { background: var(--panel); }
.pmm .mrow.on { background: var(--panel); border-left-color: var(--accent); }
.pmm .mrow .ttl { font-weight: 600; font-size: 13px; line-height: 1.3; }
.pmm .mrow .meta { display: flex; gap: 6px; align-items: center; margin-top: 4px; font-size: 11.5px; color: var(--muted); flex-wrap: wrap; }
.pmm .mrow .px { text-align: right; font-family: var(--mono); font-weight: 700; font-size: 15px; }
.pmm .mrow .px small { display: block; font-family: var(--sans); font-weight: 600; font-size: 11px; }
.pmm .up { color: var(--pos); } .pmm .down { color: var(--neg); }
.pmm .dhead { padding: 16px; display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap; align-items: flex-start; border-bottom: 1px solid var(--line-2); }
.pmm .dhead h2 { font-size: 21px; }
.pmm .dhead .chips { margin-top: 8px; align-items: center; }
.pmm .quote { display: flex; gap: 10px; }
.pmm .quote div { border: 1px solid var(--line); border-radius: 10px; padding: 8px 14px; text-align: center; min-width: 92px; }
.pmm .quote .y { background: var(--bid-bg); border-color: transparent; }
.pmm .quote .n { background: var(--ask-bg); border-color: transparent; }
.pmm .quote span { display: block; font-size: 11.5px; color: var(--muted); font-weight: 600; }
.pmm .quote strong { font: 700 24px var(--mono); }
.pmm .kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-bottom: 1px solid var(--line-2); }
.pmm .kpis div { padding: 10px 16px; border-right: 1px solid var(--line-2); }
.pmm .kpis div:last-child { border-right: 0; }
.pmm .kpis span { display: block; font-size: 11.5px; color: var(--muted); }
.pmm .kpis strong { font-variant-numeric: tabular-nums; }
.pmm .chartbox { padding: 12px 16px 6px; position: relative; }
.pmm .chartbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.pmm .chartbar .chg { font-weight: 600; font-size: 13px; }
.pmm svg.pchart { display: block; width: 100%; overflow: visible; }
.pmm .pchart .grid line { stroke: var(--line-2); }
.pmm .pchart text { fill: var(--muted); font-size: 11px; font-family: var(--sans); }
.pmm .pchart .fairline { stroke: var(--gold); stroke-dasharray: 4 4; stroke-width: 1.5; }
.pmm .tip { position: absolute; pointer-events: none; background: var(--ink); color: #fff; font-size: 12px; padding: 5px 8px; border-radius: 7px; white-space: nowrap; transform: translate(-50%, -110%); display: none; box-shadow: var(--shadow); }
.pmm .lower { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 0; border-top: 1px solid var(--line-2); }
.pmm .obook { padding: 12px 16px 16px; border-right: 1px solid var(--line-2); }
.pmm .obook h3, .pmm .ticket h3 { font-family: var(--sans); font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 8px; display: flex; justify-content: space-between; }
.pmm .ladder { font-variant-numeric: tabular-nums; font-size: 13px; }
.pmm .ladder .lr { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr 1.2fr; padding: 3px 8px; border-radius: 4px; }
.pmm .ladder .lr > span { text-align: right; } .pmm .ladder .lr > span:first-child { text-align: left; }
.pmm .ladder .lh { font-size: 11px; color: var(--muted); font-weight: 600; }
.pmm .ladder .lvl { background: linear-gradient(to left, var(--bar) var(--d), transparent var(--d)); cursor: pointer; }
.pmm .ladder .lvl:hover { outline: 1px solid var(--line); }
.pmm .ladder .ask { --bar: var(--ask-bg); } .pmm .ladder .bid { --bar: var(--bid-bg); }
.pmm .ladder .ask > span:first-child { color: var(--ask); font-weight: 700; font-family: var(--mono); }
.pmm .ladder .bid > span:first-child { color: var(--bid); font-weight: 700; font-family: var(--mono); }
.pmm .ladder .mid { text-align: center; color: var(--muted); font-size: 12px; padding: 6px; margin: 3px 0; border-top: 1px dashed var(--line); border-bottom: 1px dashed var(--line); }
.pmm .ticket { padding: 12px 16px 16px; display: grid; gap: 10px; align-content: start; }
.pmm .ticket .seg { width: 100%; }
.pmm .ticket .seg button { flex: 1; }
.pmm .ticket .sideY.on { background: var(--pos); color: #fff; }
.pmm .ticket .sideN.on { background: var(--neg); color: #fff; }
.pmm .ticket .kv dd.big { font-size: 16px; }
.pmm .comp { padding: 12px 16px 16px; border-top: 1px solid var(--line-2); }
.pmm .comp .chips { gap: 8px; }
.pmm .vbtn { display: inline-flex; gap: 8px; align-items: center; border: 1px solid var(--line); border-radius: 9px; padding: 6px 10px; background: var(--paper); cursor: pointer; font-weight: 600; }
.pmm .vbtn.cheap { border-color: var(--pos); background: var(--pos-bg); }
.pmm .vbtn .mono { font-weight: 700; }
@media (max-width: 1100px) { .pmm .layout { grid-template-columns: minmax(0, 1fr); } .pmm .browser { position: static; } .pmm .mlist { max-height: 300px; min-height: 0; } }
@media (max-width: 860px) {
  .pmm .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmm .kpis div { border-bottom: 1px solid var(--line-2); }
  .pmm .lower { grid-template-columns: minmax(0, 1fr); }
  .pmm .ladder .lr { grid-template-columns: .8fr 1.2fr 1fr 1.1fr; font-size: 12.5px; }
  .pmm .comp .vbtn { flex-wrap: wrap; }
  .pmm .obook { border-right: 0; border-bottom: 1px solid var(--line-2); }
  .pmm .quote { width: 100%; } .pmm .quote div { flex: 1; }
}`;

const fmtVol = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
const fmtClose = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function priceChart(points, { width = 640, height = 240, fair = null } = {}) {
  if (points.length < 2) return '';
  const pad = { l: 34, r: 10, t: 10, b: 22 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const vals = points.map((p) => p.p).concat(fair != null ? [fair] : []);
  const step = Math.max(5, Math.ceil((Math.max(...vals) - Math.min(...vals) + 6) / 4 / 5) * 5);
  let lo = Math.max(0, Math.floor((Math.min(...vals) - 3) / 5) * 5);
  if (lo + 4 * step > 100) lo = Math.max(0, 100 - 4 * step);
  const hi = lo + 4 * step;
  const t0 = points[0].t, t1 = points[points.length - 1].t, ts = t1 - t0 || 1;
  const x = (t) => pad.l + ((t - t0) / ts) * w, y = (v) => pad.t + h - ((v - lo) / (hi - lo)) * h;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.p).toFixed(1)}`).join('');
  const area = `${line}L${x(t1).toFixed(1)},${pad.t + h}L${pad.l},${pad.t + h}Z`;
  const grid = [0, 1, 2, 3, 4].map((i) => { const v = lo + step * i; return `<line x1="${pad.l}" x2="${pad.l + w}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}¢</text>`; }).join('');
  const span = ts;
  const fmtT = (t) => (span <= 2 * 3600e3 ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : span <= 2 * 86400e3 ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric' }) : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const xt = [0, 0.33, 0.66, 1].map((f) => { const t = t0 + ts * f; return `<text x="${x(t)}" y="${height - 4}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${fmtT(t)}</text>`; }).join('');
  const lastP = points[points.length - 1];
  const up = lastP.p >= points[0].p;
  const col = up ? 'var(--pos)' : 'var(--neg)';
  return `<svg class="pchart" viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="Price history">
    <defs><linearGradient id="pmm-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".18"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <g class="grid">${grid}</g>${xt}
    ${fair != null ? `<line class="fairline" x1="${pad.l}" x2="${pad.l + w}" y1="${y(fair)}" y2="${y(fair)}"/><text x="${pad.l + 6}" y="${y(fair) - 5}" text-anchor="start" style="fill:var(--gold)">Model fair ${Math.round(fair)}¢</text>` : ''}
    <path d="${area}" fill="url(#pmm-g)"/>
    <path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(lastP.t)}" cy="${y(lastP.p)}" r="4" fill="${col}" stroke="var(--paper)" stroke-width="2"/>
    <line class="xh" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + h}" stroke="var(--muted)" stroke-dasharray="3 3" style="display:none"/>
    <circle class="xd" r="4" fill="${col}" stroke="var(--paper)" stroke-width="2" style="display:none"/>
    <rect class="hit" x="${pad.l}" y="${pad.t}" width="${w}" height="${h}" fill="transparent"/>
  </svg>`;
}

export default function render(root, ctx) {
  const { api, ui, store, odds, params } = ctx;
  const pm = api.prediction;
  if (!document.getElementById('css-pm-markets')) {
    const s = document.createElement('style'); s.id = 'css-pm-markets'; s.textContent = CSS; document.head.appendChild(s);
  }
  const all = pm.markets();
  const st = {
    q: '', venue: 'All', category: 'All',
    id: params.id && pm.market(params.id) ? params.id : [...all].filter((m) => m.category === 'Sports' && m.kind === 'Game winner').sort((a, b) => b.volume24h - a.volume24h)[0].id,
    range: '1D', side: 'YES', contracts: 100,
  };

  root.innerHTML = `<div class="pmm">
    ${ui.header({ title: 'Markets & Order Book', tool: 'pm-markets',
      subtitle: 'Full order book data: see price history, bids, and asks without leaving the tool. Every contract on Kalshi, Polymarket, ProphetX and Novig in one place, with a one-tap deep link to trade.',
      actions: `<span class="tag pos">${ui.liveDot()} Streaming</span>` })}
    <div class="layout">
      <section class="card browser">
        <div class="filters">
          <input class="input" type="search" placeholder="Search markets or tickers" data-q aria-label="Search markets">
          <div class="row2">${ui.select('venue', [['All', 'All venues'], ...pm.VENUES.map((v) => [v, pm.VENUE_NAMES[v]])], st.venue)}
            ${ui.select('category', [['All', 'All categories'], ...pm.CATEGORIES], st.category)}</div>
          <div class="muted" style="font-size:12px" data-count></div>
        </div>
        <div class="mlist" data-list></div>
      </section>
      <section class="card detail" data-detail></section>
    </div></div>`;

  const listEl = root.querySelector('[data-list]');
  const detailEl = root.querySelector('[data-detail]');

  function filtered() { return pm.markets({ venue: st.venue, category: st.category, q: st.q }).sort((a, b) => b.volume24h - a.volume24h); }
  function renderList() {
    const ms = filtered();
    root.querySelector('[data-count]').textContent = `${ms.length} markets · sorted by 24h volume`;
    listEl.innerHTML = ms.length ? ms.slice(0, 120).map((m) => `<button type="button" class="mrow ${m.id === st.id ? 'on' : ''}" data-id="${m.id}">
      <div><div class="ttl">${ui.esc(m.title)}</div><div class="meta">${ui.book(m.venue)} ${m.sport ? ui.esc(m.sport) : ui.esc(m.category)} ${m.live ? ui.liveDot() : ''} · ${fmtVol(m.volume24h)}</div></div>
      <div class="px">${m.yesPrice}¢<small class="${m.change24h >= 0 ? 'up' : 'down'}">${m.change24h >= 0 ? '▲' : '▼'} ${Math.abs(m.change24h)}¢</small></div></button>`).join('')
      : `<div class="pad">${ui.empty('No markets match.')}</div>`;
  }

  function renderDetail() {
    const m = pm.market(st.id);
    const cmp = pm.compare(m.id);
    const ev = m.eventId ? api.eventById(m.eventId) : null;
    detailEl.innerHTML = `
      <div class="dhead"><div style="min-width:0;flex:1 1 300px">
        <h2>${ui.esc(m.title)}</h2>
        <div class="chips">${ui.book(m.venue, { full: true })} ${ui.tag(m.kind)} ${m.sport ? ui.sport(m.sport) : ui.tag(m.category)} ${m.live ? ui.liveDot() : ''}
          <span class="muted mono" style="font-size:12px">${ui.esc(m.ticker)}</span></div>
        ${ev ? `<div class="muted" style="margin-top:6px;font-size:12.5px">${ui.esc(ev.away)} @ ${ui.esc(ev.home)} · ${ev.live ? `${ui.esc(ev.clock)} · ${ev.score.away}-${ev.score.home}` : ui.when(ev.start)}</div>` : ''}
      </div>
      <div class="quote"><div class="y"><span>Buy YES</span><strong data-yes>${m.yesPrice}¢</strong></div><div class="n"><span>Buy NO</span><strong data-no>${m.noPrice}¢</strong></div></div></div>
      <div class="kpis" data-kpis></div>
      <div class="chartbox"><div class="chartbar"><span class="chg" data-chg></span>${ui.seg('range', ['1H', '1D', '1W', 'All'], st.range)}</div>
        <div data-chart></div><div class="tip" data-tip></div></div>
      <div class="lower">
        <div class="obook"><h3>Order book · YES <span data-spread></span></h3><div class="ladder" data-ladder></div></div>
        <div class="ticket">
          <h3>Trade ticket</h3>
          <div class="seg" data-seg="side"><button type="button" class="sideY ${st.side === 'YES' ? 'on' : ''}" data-v="YES">Buy YES</button><button type="button" class="sideN ${st.side === 'NO' ? 'on' : ''}" data-v="NO">Buy NO</button></div>
          ${ui.numberInput('contracts', st.contracts, 'Contracts', { step: 10, min: 1 })}
          <div class="chips">${[50, 100, 250, 500, 1000].map((n) => `<button type="button" class="chip" data-qty="${n}">${n}</button>`).join('')}</div>
          <dl class="kv" data-ticket></dl>
          <button class="btn primary block" data-open>Open in ${pm.VENUE_NAMES[m.venue]} ↗</button>
          <button class="btn block" data-log>Log to Bet Tracker</button>
        </div>
      </div>
      <div class="comp"><h3 style="font:600 13px var(--sans);text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">Same outcome on other venues</h3>
        <div class="chips" data-comp></div></div>`;
    ui.onSeg(detailEl, 'range', (v) => { st.range = v; detailEl.querySelectorAll('[data-seg="range"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); updateLive(); });
    ui.onSeg(detailEl, 'side', (v) => { st.side = v; detailEl.querySelectorAll('[data-seg="side"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); updateTicket(); });
    ui.onNumber(detailEl, 'contracts', (v) => { st.contracts = Math.max(1, Math.round(v)); updateTicket(); });
    detailEl.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => { st.contracts = +b.dataset.qty; detailEl.querySelector('[data-num="contracts"]').value = st.contracts; updateTicket(); }));
    detailEl.querySelector('[data-open]').addEventListener('click', () => {
      const d = pm.deepLink(m.id, st.side);
      ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${st.contracts} ${st.side} @ ${d.price}¢`);
    });
    detailEl.querySelector('[data-log]').addEventListener('click', () => {
      const c = st.side === 'YES' ? m.yesPrice : m.noPrice;
      ui.logBet({ kind: 'prediction', book: m.venue, sport: m.sport || m.category, market: 'Prediction', selection: `${m.title} · ${st.side} @ ${c}¢`, price: odds.probToAmerican(c / 100), stake: Math.round(st.contracts * c) / 100 });
    });
    updateLive();
    updateTicket();
    void cmp;
  }

  function wireHover(box, pts) {
    const svg = box.querySelector('svg');
    const tip = detailEl.querySelector('[data-tip]');
    if (!svg) return;
    const hit = svg.querySelector('.hit'), xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd');
    const vb = svg.viewBox.baseVal;
    hit.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * vb.width;
      const pad = 34, w = vb.width - 44;
      const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
      const t = t0 + ((sx - pad) / w) * (t1 - t0);
      let best = pts[0];
      for (const p of pts) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
      const px = pad + ((best.t - t0) / (t1 - t0 || 1)) * w;
      const yTop = +xh.getAttribute('y1'), yBot = +xh.getAttribute('y2');
      const lbls = [...svg.querySelectorAll('.grid text')].map((n) => parseFloat(n.textContent));
      const lo = lbls[0], hi = lbls[lbls.length - 1];
      const py = yBot - ((best.p - lo) / (hi - lo)) * (yBot - yTop);
      xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.style.display = '';
      xd.setAttribute('cx', px); xd.setAttribute('cy', py); xd.style.display = '';
      tip.style.display = 'block';
      tip.style.left = `${box.offsetLeft + (px / vb.width) * rect.width}px`;
      tip.style.top = `${box.offsetTop + (py / vb.height) * rect.height}px`;
      tip.innerHTML = `<b>${best.p.toFixed(1)}¢</b> · ${new Date(best.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    });
    hit.addEventListener('pointerleave', () => { xh.style.display = 'none'; xd.style.display = 'none'; tip.style.display = 'none'; });
  }

  function updateLive() {
    const m = pm.market(st.id);
    if (!m) return;
    detailEl.querySelector('[data-yes]').textContent = `${m.yesPrice}¢`;
    detailEl.querySelector('[data-no]').textContent = `${m.noPrice}¢`;
    const ob = pm.orderbook(m.id);
    const bestBid = ob.bids[0]?.price ?? 0, bestAsk = ob.asks[0]?.price ?? 100;
    detailEl.querySelector('[data-kpis]').innerHTML = [
      ['Implied prob', `${m.yesPrice}%`], ['Model fair', `${Math.round(m.fairProb * 100)}%`],
      ['24h volume', fmtVol(m.volume24h)], ['Open interest', fmtVol(m.openInterest)], ['Closes', fmtClose(m.closesAt)],
    ].map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    const pts = pm.history(m.id, st.range);
    const box = detailEl.querySelector('[data-chart]');
    const width = Math.max(300, Math.round(box.clientWidth || 640));
    box.innerHTML = priceChart(pts, { width, height: width < 500 ? 200 : 250, fair: m.fairProb * 100 });
    wireHover(box, pts);
    const d = pts.length ? pts[pts.length - 1].p - pts[0].p : 0;
    detailEl.querySelector('[data-chg]').innerHTML = `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}¢</span> <span class="muted">${st.range === 'All' ? 'since listing' : `past ${st.range}`}</span>`;
    // Order book ladder with cumulative depth bars.
    const asks = ob.asks.slice(0, 8), bids = ob.bids.slice(0, 8);
    let ca = 0, cb = 0;
    const askRows = asks.map((l) => ({ ...l, cum: (ca += l.size) }));
    const bidRows = bids.map((l) => ({ ...l, cum: (cb += l.size) }));
    const maxCum = Math.max(ca, cb, 1);
    const row = (l, kind) => `<div class="lr lvl ${kind}" data-kind="${kind}" style="--d:${((l.cum / maxCum) * 100).toFixed(1)}%"><span>${l.price}¢</span><span>${l.size.toLocaleString()}</span><span>${ui.money((l.size * l.price) / 100, 0)}</span><span>${l.cum.toLocaleString()}</span></div>`;
    detailEl.querySelector('[data-ladder]').innerHTML = `<div class="lr lh"><span>Price</span><span>Contracts</span><span>Value</span><span>Total</span></div>
      ${[...askRows].reverse().map((l) => row(l, 'ask')).join('')}
      <div class="mid">Spread ${bestAsk - bestBid}¢ · Mid ${((bestAsk + bestBid) / 2).toFixed(1)}¢ · Last ${Math.round(m.mid * 100)}¢</div>
      ${bidRows.map((l) => row(l, 'bid')).join('')}`;
    detailEl.querySelector('[data-spread]').innerHTML = `<span style="text-transform:none;letter-spacing:0">Bid ${bestBid}¢ / Ask ${bestAsk}¢</span>`;
    detailEl.querySelectorAll('.lvl').forEach((tr) => tr.addEventListener('click', () => {
      st.side = tr.dataset.kind === 'ask' ? 'YES' : 'NO';
      detailEl.querySelectorAll('[data-seg="side"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.side));
      updateTicket();
    }));
    const cmp = pm.compare(m.id);
    detailEl.querySelector('[data-comp]').innerHTML = cmp.rows.map((r) => `<button type="button" class="vbtn ${r.marketId === cmp.cheapestYes.marketId ? 'cheap' : ''} ${r.marketId === m.id ? 'on' : ''}" data-go="${r.marketId}">${ui.book(r.venue)} <span class="mono">YES ${r.yes}¢</span><span class="muted mono">NO ${r.no}¢</span>${r.marketId === cmp.cheapestYes.marketId ? '<span class="tag pos">Cheapest YES</span>' : ''}</button>`).join('')
      + (cmp.sportsbook ? `<span class="vbtn" style="cursor:default">${ui.book(cmp.sportsbook.book)} <span class="mono">${ui.fmtAmerican(cmp.sportsbook.american)}</span><span class="muted">= ${Math.round(cmp.sportsbook.implied * 100)}¢ implied</span></span>` : '');
    detailEl.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => select(b.dataset.go)));
    updateTicket();
  }

  function updateTicket() {
    const m = pm.market(st.id);
    const c = st.side === 'YES' ? m.yesPrice : m.noPrice;
    const fair = st.side === 'YES' ? m.fairProb : 1 - m.fairProb;
    const cost = (st.contracts * c) / 100, payout = st.contracts;
    const edge = fair - c / 100;
    detailEl.querySelector('[data-ticket]').innerHTML = `
      <dt>Avg price</dt><dd>${c}¢</dd>
      <dt>Implied probability</dt><dd>${c}%</dd>
      <dt>Model fair</dt><dd>${(fair * 100).toFixed(1)}% ${ui.edge(edge)}</dd>
      <dt>Cost</dt><dd class="big">${ui.money(cost)}</dd>
      <dt>Payout if ${st.side}</dt><dd class="big">${ui.money(payout)}</dd>
      <dt>Profit</dt><dd style="color:var(--pos)">${ui.money(payout - cost)} (${Math.round(((payout - cost) / cost) * 100)}%)</dd>
      <dt>Of bankroll</dt><dd>${((cost / store.get().bankroll) * 100).toFixed(1)}%</dd>`;
  }

  function select(id) {
    st.id = id;
    try { history.replaceState(null, '', `#/pm-markets?id=${encodeURIComponent(id)}`); } catch { /* ignore */ }
    renderList();
    renderDetail();
    if (window.innerWidth < 1100) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  listEl.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) select(b.dataset.id); });
  root.querySelector('[data-q]').addEventListener('input', (e) => { st.q = e.target.value; renderList(); });
  ui.onSelect(root, 'venue', (v) => { st.venue = v; renderList(); });
  ui.onSelect(root, 'category', (v) => { st.category = v; renderList(); });

  renderList();
  renderDetail();
  const onResize = () => updateLive();
  window.addEventListener('resize', onResize);
  const unsub = pm.subscribe(() => { renderListPrices(); updateLive(); });
  function renderListPrices() {
    listEl.querySelectorAll('[data-id]').forEach((b) => {
      const m = pm.market(b.dataset.id);
      const px = b.querySelector('.px');
      if (px) px.innerHTML = `${m.yesPrice}¢<small class="${m.change24h >= 0 ? 'up' : 'down'}">${m.change24h >= 0 ? '▲' : '▼'} ${Math.abs(m.change24h)}¢</small>`;
    });
  }
  return () => { unsub(); window.removeEventListener('resize', onResize); };
}
