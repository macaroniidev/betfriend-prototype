// Markets & Order Book: browse contracts on Kalshi, Polymarket, ProphetX and Novig, then see the order book
// and trade ticket side by side (C9), the price history and the same outcome on other venues.
// Phones: the market list pages (no inner scroll trap, B14) and the book + ticket open in a bottom sheet
// from a sticky action bar (B15), one tap from anywhere on the page.
// Editor contract: section headings are static ("Browse markets", "Selected market"); the market title and
// every live figure sit in nodata nodes; the market list is one [data-bf-list].
// Views (?view=): Markets (browse + order book + ticket) and the Cross-venue scanner (item 45): one row per
// outcome listed on 2+ venues (js/lib/pm-scan.js) in a keyed ui.table; its action opens that venue's ticket.

import { scanMarkets, filterScan } from '../lib/pm-scan.js';

const CSS = `
.pmm .layout { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 24px; align-items: start; }
.pmm .layout > .sec { margin-top: 0; }
.pmm .sec-head { margin-bottom: 10px; }
.pmm .browser { position: sticky; top: calc(var(--topbar-h) + 12px); }
.pmm .browser .filters { display: grid; gap: 8px; padding-bottom: 10px; border-bottom: 2px solid var(--line); }
.pmm .browser input.input { width: 100%; }
.pmm .browser .row2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.pmm .browser .field, .pmm .browser .field select { min-width: 0; width: 100%; }
.pmm .browser .count { font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmm .mlist { max-height: calc(100vh - var(--topbar-h) - 230px); min-height: 280px; overflow-y: auto; overscroll-behavior: contain; }
.pmm .mrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 9px 10px 9px 8px; width: 100%; text-align: left; cursor: pointer; color: var(--text);
  background: none; border: 0; border-bottom: 1px solid var(--line-2); border-left: 4px solid transparent; font: inherit; }
.pmm .mrow:hover { background: var(--panel); }
.pmm .mrow.on { background: var(--panel); border-left-color: var(--g); }
.pmm .mrow .ttl { font-weight: 700; font-size: var(--t-sm); line-height: 1.3; }
.pmm .mrow .meta { display: flex; gap: 6px; align-items: center; margin-top: 4px; font-size: var(--t-xs); color: var(--muted); flex-wrap: wrap; }
.pmm .mrow .px { text-align: right; font-weight: 800; font-size: var(--t-cell); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pmm .mrow .px small { display: block; font-weight: 700; font-size: var(--t-xs); margin-top: 2px; }
.pmm .up { color: var(--pos); } .pmm .down { color: var(--warn); }

/* Selected market: a small static kicker heading, the market title as data under it. */
/* Section headings use the shared .sec scale (app.css .sec-head h2), like every other screen. */
.pmm .browser .sec-head { margin-bottom: 8px; }
.pmm .dhead { display: flex; gap: 14px 20px; justify-content: space-between; flex-wrap: wrap; align-items: flex-start; padding-bottom: 14px; }
.pmm .dhead .who { min-width: 0; flex: 1 1 320px; }
.pmm .mtitle { margin: 0; font: 900 var(--t-xl)/1.15 var(--f-head); text-transform: uppercase; letter-spacing: .01em; }
.pmm .dhead .chips { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.pmm .dhead .ticker { font-size: var(--t-xs); color: var(--muted); font-weight: 700; letter-spacing: .03em; }
.pmm .dhead .ev { margin-top: 6px; font-size: var(--t-sm); color: var(--muted); }
/* Quote tiles: YES and NO are styled the same (symmetric, B7); the ticket's side gets the green rule. */
.pmm .quote { display: flex; gap: 8px; }
.pmm .qbtn { display: grid; gap: 2px; min-width: 104px; padding: 8px 14px 9px; border: 2px solid var(--line-strong); border-radius: 10px; background: var(--paper); color: var(--text); text-align: center; cursor: pointer; font: inherit; }
.pmm .qbtn span { font-size: var(--t-xs); font-weight: 800; color: var(--muted); }
.pmm .qbtn strong { font: 900 var(--t-fig)/1 var(--f-head); font-variant-numeric: tabular-nums; }
.pmm .qbtn:hover { border-color: var(--g); }
.pmm .qbtn.on { border-color: var(--g); box-shadow: inset 0 -4px 0 var(--g); }

/* Order book + ticket, side by side above the chart (C9). */
.pmm .trade { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 0; border-top: 2px solid var(--line); border-bottom: 2px solid var(--line); }
.pmm .obook { padding: 12px 18px 14px 0; border-right: 1px solid var(--line); min-width: 0; }
.pmm .ticket { padding: 12px 0 14px 18px; display: grid; gap: 10px; align-content: start; }
.pmm .trade h3 { font: 900 var(--t-md)/1 var(--f-head); text-transform: uppercase; letter-spacing: .02em; margin: 0 0 8px; display: flex; justify-content: space-between; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.pmm .trade h3 small { font: 700 var(--t-xs) var(--f-body); text-transform: none; letter-spacing: 0; color: var(--muted); }
.pmm .ladder { font-variant-numeric: tabular-nums; font-size: var(--t-sm); }
.pmm .ladder .lr { display: grid; grid-template-columns: 1fr 1.1fr 1.1fr 1.1fr; padding: 2px 8px; border-radius: 4px; }
.pmm .ladder .lr > span { text-align: right; } .pmm .ladder .lr > span:first-child { text-align: left; }
.pmm .ladder .lh { font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmm .ladder .grp { display: flex; justify-content: space-between; font-size: var(--t-xs); font-weight: 800; color: var(--muted); padding: 6px 8px 2px; }
.pmm .ladder .lvl { background: linear-gradient(to left, var(--bar) var(--d), transparent var(--d)); cursor: pointer; width: 100%; border: 0; font: inherit; color: var(--text); }
.pmm .ladder .lvl:hover { outline: 1px solid var(--line-strong); }
.pmm .ladder .ask { --bar: color-mix(in srgb, var(--muted) 15%, transparent); } .pmm .ladder .bid { --bar: color-mix(in srgb, var(--pos) 17%, transparent); }
.pmm .ladder .lvl > span:first-child { font-weight: 800; }
.pmm .ladder .bid > span:first-child { color: var(--pos); }
.pmm .ladder .mid { text-align: center; color: var(--muted); font-size: var(--t-xs); font-weight: 600; padding: 5px; margin: 3px 0; border-top: 1px dashed var(--line-strong); border-bottom: 1px dashed var(--line-strong); }
.pmm .ticket .seg { width: 100%; display: flex; }
.pmm .ticket .seg button { flex: 1; }
.pmm .ticket .field { width: 100%; } .pmm .ticket .field .num { width: 100%; } .pmm .ticket .field .num input { width: 100%; }
.pmm .ticket .qty { display: flex; gap: 6px; flex-wrap: wrap; }
.pmm .ticket dl.kv { margin: 0; row-gap: 4px; }
.pmm .ticket dl.kv dd { font-variant-numeric: tabular-nums; }
.pmm .ticket dd small { color: var(--muted); font-weight: 600; }
.pmm .ticket dd.big { font: 900 var(--t-lg)/1 var(--f-head); }
.pmm .ticket .rw { margin: 0; font-size: var(--t-sm); color: var(--muted); }
.pmm .ticket .rw b { color: var(--text); }
.pmm .ticket .cta-row { display: grid; gap: 4px; }
.pmm .ticket .bet-action { width: 100%; justify-content: center; }
.pmm .ticket .bet-action[hidden] { display: none; }

/* Market facts: a flat ruled strip, no boxes. */
.pmm .kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-bottom: 1px solid var(--line); }
.pmm .kpis > div { padding: 10px 14px 10px 0; }
.pmm .kpis > div + div { padding-left: 14px; border-left: 1px solid var(--line); }
.pmm .kpis span { display: block; font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
.pmm .kpis strong { font-variant-numeric: tabular-nums; font-size: var(--t-body); }
.pmm .chartbox { padding: 12px 0 6px; position: relative; }
.pmm .chartbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.pmm .chartbar .chg { font-weight: 700; font-size: var(--t-sm); }
.pmm svg.pchart { display: block; width: 100%; overflow: visible; }
.pmm .pchart .grid line { stroke: var(--line-2); }
.pmm .pchart text { fill: var(--muted); font-size: 11px; font-family: var(--f-body); }
.pmm .pchart .fairline { stroke: var(--gold); stroke-dasharray: 4 4; stroke-width: 1.5; }
.pmm .tip { position: absolute; pointer-events: none; background: var(--ink); color: #fff; font-size: var(--t-xs); padding: 5px 8px; border-radius: 7px; white-space: nowrap; transform: translate(-50%, -110%); display: none; box-shadow: var(--shadow); z-index: var(--z-raised); }
.pmm .comp { padding: 12px 0 4px; border-top: 1px solid var(--line); }
.pmm .comp h3 { font: 900 var(--t-md)/1 var(--f-head); text-transform: uppercase; margin: 0 0 10px; }
.pmm .comp .vlist { display: flex; gap: 8px; flex-wrap: wrap; }
.pmm .vbtn { display: inline-flex; gap: 8px; align-items: center; border: 2px solid var(--line); border-radius: 10px; padding: 6px 10px; background: var(--paper); cursor: pointer; font: inherit; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.pmm .vbtn:hover { border-color: var(--g); }
.pmm .vbtn.cheap { border-color: var(--g); background: var(--pos-bg); }
.pmm .vbtn.here { box-shadow: inset 0 -3px 0 var(--g); }
.pmm .vbtn.sb { cursor: default; border-style: dashed; }
.pmm .how-sec { margin-top: 28px; }

/* Phone action bar: hidden on desktop (the ticket is on screen). */
.pmm .pmm-bar { display: none; }
/* Cross-venue scanner view. */
.pmm [data-pane][hidden] { display: none; }
.pmm.is-scan .pmm-bar { display: none !important; }

.pmm .scan .count { font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmm .scan-sub { margin: 0 0 10px; color: var(--muted); font-size: var(--t-sm); max-width: 80ch; }
.pmm .scan .sm-t { font-weight: 700; font-size: var(--t-sm); line-height: 1.3; }
.pmm .scan .sm-m { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 3px; font-size: var(--t-xs); color: var(--muted); }
.pmm .scan .vp { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 800; }
.pmm .scan .sub2 { display: block; font-size: var(--t-xs); color: var(--muted); font-weight: 600; margin-top: 2px; white-space: nowrap; }
.pmm .scan .vchips { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.pmm .scan .sub2.pos { color: var(--pos); font-weight: 800; }
@media (min-width: 861px) { .pmm .scan td[data-col="event"] { min-width: 230px; } .pmm .scan td[data-col="event"] .sm-t { white-space: normal; } }
.pmm-sheet .trade { grid-template-columns: minmax(0, 1fr); border: 0; }
.pmm-sheet .ticket { order: -1; padding: 0 0 14px; }
.pmm-sheet .obook { padding: 12px 0 0; border-right: 0; border-top: 2px solid var(--line); }

@media (max-width: 1180px) { .pmm .trade { grid-template-columns: minmax(0, 1fr) 300px; } }
@media (max-width: 1100px) {
  .pmm .layout { grid-template-columns: minmax(0, 1fr); }
  .pmm .browser { position: static; }
}
@media (max-width: 860px) {
  .pmm .mlist { max-height: none; min-height: 0; overflow: visible; }      /* no nested scroll on phones (B14) */
  .pmm .detail .trade-slot { display: none; }                                /* book + ticket open in the sheet */
  .pmm .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmm .kpis > div, .pmm .kpis > div + div { padding: 8px 0; border-left: 0; border-bottom: 1px solid var(--line-2); }
  .pmm .kpis > div:nth-child(even) { padding-left: 12px; border-left: 1px solid var(--line-2); }
  .pmm .quote { width: 100%; } .pmm .qbtn { flex: 1; }
  .pmm .pmm-bar { display: flex; flex-wrap: nowrap; margin: 20px -16px 0; padding-inline: 16px; }
  .pmm .pmm-bar .bar-sum { min-width: 0; flex: 1; font-size: var(--t-xs); color: var(--muted); font-weight: 700; }
  .pmm .pmm-bar .bar-h { font: 700 var(--t-xs)/1.2 var(--f-body); text-transform: none; letter-spacing: 0; color: var(--muted); margin: 0; }
  .pmm .pmm-bar .bar-sum b { display: block; color: var(--text); font-size: var(--t-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pmm .pmm-bar .bar-btns { display: flex; gap: 6px; flex: none; }
  .pmm .pmm-bar .btn { padding-inline: 12px; }
  .pmm-sheet .ladder .lr { grid-template-columns: .9fr 1.2fr 1fr 1.1fr; font-size: var(--t-xs); }
}`;

const fmtVol = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
const fmtClose = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Price-history chart (cents axis: the contract's native 0–100 scale). Rising lines are --pos, falling --warn
 * (never red: a price move isn't a loss). Exported for reuse.
 */
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
  const col = up ? 'var(--pos)' : 'var(--warn)';
  return `<svg class="pchart" viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="Price history, ${up ? 'up' : 'down'} over the period">
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
  const v = ui.view('pm-markets');
  const all = pm.markets();
  const defaultId = [...all].filter((m) => m.category === 'Sports' && m.kind === 'Game winner').sort((a, b) => b.volume24h - a.volume24h)[0].id;
  const remembered = v.get('id');
  const st = {
    q: v.get('q', ''), venue: v.get('venue', 'All'), category: v.get('category', 'All'),
    id: params.id && pm.market(params.id) ? params.id : remembered && pm.market(remembered) ? remembered : defaultId,
    range: v.get('range', '1D'), side: v.get('side', 'YES'), contracts: v.get('contracts', 100),
  };
  if (!pm.VENUES.includes(st.venue)) st.venue = 'All';
  if (!pm.CATEGORIES.includes(st.category)) st.category = 'All';
  const remember = (patch) => { Object.assign(st, patch); v.set(patch); };
  let pane = ui.initialMode(params, 'markets', ['markets', 'scanner'], 'view');
  const isPhone = () => matchMedia('(max-width: 860px)').matches;
  const venueName = (id) => pm.VENUE_NAMES[id];
  const c$ = (c) => ui.fmtCents(c);   // a price in the person's odds format (B13)

  root.innerHTML = `<div class="pmm${pane === 'scanner' ? ' is-scan' : ''}">
    ${ui.pageHead({ title: 'Markets & Order Book', tool: 'pm-markets', live: true,
      actions: ui.modeSwitch([['markets', 'Markets'], ['scanner', 'Cross-venue scanner', '']], pane, { name: 'view', label: 'View' }),
      subtitle: 'Full order book data: see price history, bids, and asks without leaving the tool. Every contract on Kalshi, Polymarket, ProphetX and Novig in one place, with a one-tap deep link to trade.' })}
    <div class="layout" data-pane="markets"${pane === 'scanner' ? ' hidden' : ''}>
      <section class="sec browser">
        <div class="sec-head"><h2>Browse markets</h2><span class="count" data-count data-bf-nodata></span></div>
        <div class="filters">
          <input class="input" type="search" placeholder="Search markets or tickers" data-q aria-label="Search markets" value="${ui.esc(st.q)}">
          <div class="row2">${ui.select('venue', [['All', 'All venues'], ...pm.VENUES.map((x) => [x, venueName(x)])], st.venue)}
            ${ui.select('category', [['All', 'All categories'], ...pm.CATEGORIES], st.category)}</div>
        </div>
        <div class="mlist" data-list data-bf-list></div>
      </section>
      <section class="sec detail">
        <div class="sec-head"><h2>Selected market</h2></div>
        <div data-detail></div>
      </section>
    </div>
    <section class="sec scan" data-pane="scanner"${pane === 'scanner' ? '' : ' hidden'}>
      <div class="sec-head"><h2>Cross-venue scanner</h2><span class="count" data-scan-count data-bf-nodata></span></div>
      <p class="scan-sub">The same outcome on every venue that lists it: the cheapest place to buy each side, how far the venues disagree, and the cost of YES on one venue plus NO on another.</p>
      <div data-scan-fb></div>
      <div data-scan-tbl></div>
    </section>
    ${ui.how({ summary: 'A contract pays $1 if it happens. Buy below the model’s fair price and sell when the edge is gone.',
      checks: ['The price in cents is the market’s chance: 54¢ means 54%', 'Buy YES if you think it happens, NO if you think it doesn’t',
        'Bids are buy offers and asks are sell offers; the gap between them is the spread', 'Sell early on the venue any time, or hold to the result'],
      example: ui.slip({ caption: 'Worked example', tag: 'Signal · can lose', legs: [{ title: 'Buy 100 YES', sub: 'at 54¢ each', odds: '54¢', stake: '$54.00' }],
        result: 'Pays $100 if YES: +$46 profit', math: 'If NO, the $54 is lost. Your odds format changes how prices show, not what they pay.' }) })}
    ${ui.actionBar(`<div class="bar-sum"><h2 class="bar-h">Trade this market</h2><b data-bar-title data-bf-nodata></b></div>
      <div class="bar-btns" data-bf-nodata><button type="button" class="btn sm primary" data-act="sheet" data-side="YES"><span data-bf-text>Buy YES</span> <b data-bar-yes></b></button>
        <button type="button" class="btn sm primary" data-act="sheet" data-side="NO"><span data-bf-text>Buy NO</span> <b data-bar-no></b></button></div>`, { cls: 'pmm-bar' })}
  </div>`;

  const listEl = root.querySelector('[data-list]');
  const detailEl = root.querySelector('[data-detail]');
  const pg = ui.pager('pm-markets', { step: 8 });
  let tradeEl = null;     // the order book + ticket block (moves into the sheet on phones)
  let sheet = null;       // the open bottom sheet body, if any
  const $ = (sel) => detailEl.querySelector(sel) || tradeEl?.querySelector(sel);

  // ---------- market list ----------
  function filtered() { return pm.markets({ venue: st.venue, category: st.category, q: st.q }).sort((a, b) => b.volume24h - a.volume24h); }
  const pxHtml = (m) => `${c$(m.yesPrice)}<small class="${m.change24h >= 0 ? 'up' : 'down'}">${ui.dir(m.change24h) || '·'} ${Math.abs(m.change24h)}¢ 24h</small>`;
  function renderList() {
    const ms = filtered();
    root.querySelector('[data-count]').textContent = `${ms.length} markets · sorted by 24h volume`;
    // Desktop scrolls inside the sticky browser; phones page instead (no nested scroll, B14).
    const shown = isPhone() ? pg.slice(ms) : ms.slice(0, 120);
    listEl.innerHTML = ms.length ? shown.map((m) => `<button type="button" class="mrow ${m.id === st.id ? 'on' : ''}" data-id="${m.id}" aria-current="${m.id === st.id}">
      <div><div class="ttl">${ui.esc(m.title)}</div><div class="meta">${ui.book(m.venue)} ${m.sport ? ui.esc(m.sport) : ui.esc(m.category)} ${m.live ? ui.liveDot() : ''} · ${fmtVol(m.volume24h)}</div></div>
      <div class="px" title="YES price">${pxHtml(m)}</div></button>`).join('') + (isPhone() ? pg.more(ms.length) : '')
      : ui.empty({ title: 'No markets match', msg: 'Nothing matches this search and these filters.',
        actions: [{ label: 'Clear search and filters', act: 'reset-list' }, { label: 'AI Market Picks', href: '#/pm-picks' }] });
  }
  pg.onMore(renderList);
  function renderListPrices() {
    listEl.querySelectorAll('[data-id]').forEach((b) => {
      const m = pm.market(b.dataset.id);
      const px = b.querySelector('.px');
      const h = pxHtml(m);
      if (px && px.innerHTML !== h) px.innerHTML = h;
    });
  }

  // ---------- selected market ----------
  function renderDetail() {
    if (sheet) sheet.close();
    const m = pm.market(st.id);
    const ev = m.eventId ? api.eventById(m.eventId) : null;
    detailEl.innerHTML = `
      <div class="dhead">
        <div class="who" data-bf-nodata>
          <p class="mtitle">${ui.esc(m.title)}</p>
          <div class="chips">${ui.book(m.venue, { full: true })} ${ui.risk('pm', { short: true })} ${ui.tag(m.kind)} ${m.sport ? ui.sport(m.sport) : ui.tag(m.category)} ${m.live ? ui.liveDot() : ''}
            <span class="ticker">${ui.esc(m.ticker)}</span></div>
          ${ev ? `<div class="ev">${ui.esc(ev.away)} @ ${ui.esc(ev.home)} · ${ev.live ? `${ui.esc(ev.clock)} · ${ev.score.away}-${ev.score.home}` : ui.when(ev.start)}</div>` : ''}
        </div>
        <div class="quote" role="group" aria-label="Choose a side">
          <button type="button" class="qbtn" data-quote="YES" aria-pressed="false"><span>Buy YES</span><strong data-yes data-bf-nodata></strong></button>
          <button type="button" class="qbtn" data-quote="NO" aria-pressed="false"><span>Buy NO</span><strong data-no data-bf-nodata></strong></button>
        </div>
      </div>
      <div class="trade-slot" data-trade-slot></div>
      <div class="kpis" data-kpis data-bf-nodata></div>
      <div class="chartbox"><div class="chartbar"><span class="chg" data-chg data-bf-nodata></span>${ui.seg('range', ['1H', '1D', '1W', 'All'], st.range)}</div>
        <div data-chart data-bf-nodata></div><div class="tip" data-tip></div></div>
      <div class="comp"><h3>Same outcome on other venues</h3><div class="vlist" data-comp data-bf-nodata></div></div>`;

    // Order book + trade ticket: one block, so the phone sheet can borrow it and give it back.
    tradeEl = document.createElement('div');
    tradeEl.className = 'trade';
    tradeEl.innerHTML = `
      <div class="obook"><h3>Order book · YES <small data-spread data-bf-nodata></small></h3><div class="ladder" data-ladder data-bf-nodata></div></div>
      <div class="ticket">
        <h3>Trade ticket <small>${ui.term('cents', 'How prices work')}</small></h3>
        <div class="seg" data-seg="side" role="group" aria-label="Side"><button type="button" class="sideY" data-v="YES">Buy YES</button><button type="button" class="sideN" data-v="NO">Buy NO</button></div>
        ${ui.numberInput('contracts', st.contracts, 'Contracts', { step: 10, min: 1 })}
        <div class="qty">${[50, 100, 250, 500, 1000].map((n) => `<button type="button" class="chip" data-qty="${n}" aria-pressed="false">${n}</button>`).join('')}</div>
        <dl class="kv" data-ticket data-bf-nodata></dl>
        <p class="rw" data-rw></p>
        <div class="cta-row">
          ${['YES', 'NO'].map((s) => ui.betAction({ verb: `Buy ${s}`, amount: '—', act: 'open', size: '', attrs: { 'data-cta': s, title: `Open in ${venueName(m.venue)}` } })).join('')}
          ${ui.ghost('log', 'Log to Bet Tracker')}
        </div>
      </div>`;
    detailEl.querySelector('[data-trade-slot]').append(tradeEl);
    wireTrade(m);

    ui.onSeg(detailEl, 'range', (val) => { remember({ range: val }); detailEl.querySelectorAll('[data-seg="range"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === val)); updateLive(); });
    detailEl.querySelectorAll('[data-quote]').forEach((b) => b.addEventListener('click', () => {
      setSide(b.dataset.quote);
      if (isPhone()) openSheet();
    }));
    updateLive();
  }

  function wireTrade(m) {
    ui.onSeg(tradeEl, 'side', (val) => setSide(val));
    ui.onNumber(tradeEl, 'contracts', (val) => { remember({ contracts: Math.max(1, Math.round(val)) }); updateTicket(); });
    tradeEl.querySelectorAll('[data-qty]').forEach((b) => b.addEventListener('click', () => {
      remember({ contracts: +b.dataset.qty });
      tradeEl.querySelector('[data-num="contracts"]').value = st.contracts;
      updateTicket();
    }));
    // Clicking a level loads that side: an ask is a YES you can buy, a bid is the NO side of it.
    tradeEl.querySelector('[data-ladder]').addEventListener('click', (e) => {
      const lv = e.target.closest('.lvl');
      if (lv) setSide(lv.dataset.kind === 'ask' ? 'YES' : 'NO');
    });
    ui.onAction(tradeEl, {
      open: () => {
        const d = pm.deepLink(m.id, st.side);
        ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${st.contracts} ${st.side} @ ${d.price}¢`);
      },
      log: () => {
        const c = st.side === 'YES' ? m.yesPrice : m.noPrice;
        ui.logBet({ kind: 'prediction', book: m.venue, sport: m.sport || m.category, market: 'Prediction', selection: `${m.title} · ${st.side} @ ${c}¢`, price: odds.probToAmerican(c / 100), stake: Math.round(st.contracts * c) / 100 });
      },
    });
  }

  // The ticket's side: updateTicket repaints the side seg, the quote tiles and the CTA.
  function setSide(side) {
    remember({ side });
    updateTicket();
  }

  // Phones: the order book + ticket open in a bottom sheet (one tap from the action bar or a quote tile).
  function openSheet(side) {
    if (side) setSide(side);
    if (!tradeEl || sheet) return;
    const m = pm.market(st.id);
    sheet = ui.drawer('Trade ticket', '<div class="pmm pmm-sheet" data-sheet></div>', { kicker: ui.esc(m.title), risk: 'pm' });
    sheet.querySelector('[data-sheet]').append(tradeEl);
    // The drawer focuses [data-autofocus] on the next frame: start on the chosen side.
    tradeEl.querySelector(`[data-seg="side"] button[data-v="${st.side}"]`)?.setAttribute('data-autofocus', '');
    const body = sheet;
    body.whenClosed(() => {
      tradeEl?.querySelector('[data-autofocus]')?.removeAttribute('data-autofocus');
      const slot = detailEl.querySelector('[data-trade-slot]');
      if (slot && tradeEl && !slot.contains(tradeEl)) slot.append(tradeEl);
      if (sheet === body) sheet = null;
    });
  }
  ui.onAction(root.querySelector('.pmm-bar'), { sheet: (_, el) => openSheet(el.dataset.side) });

  // ---------- live parts (every tick) ----------
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
    if (!m || !tradeEl) return;
    $('[data-yes]').textContent = c$(m.yesPrice);
    $('[data-no]').textContent = c$(m.noPrice);
    const bar = root.querySelector('.pmm-bar');
    bar.querySelector('[data-bar-title]').textContent = m.title;
    bar.querySelector('[data-bar-yes]').textContent = c$(m.yesPrice);
    bar.querySelector('[data-bar-no]').textContent = c$(m.noPrice);
    const ob = pm.orderbook(m.id);
    const bestBid = ob.bids[0]?.price ?? 0, bestAsk = ob.asks[0]?.price ?? 100;
    detailEl.querySelector('[data-kpis]').innerHTML = [
      [ui.term('implied', 'Implied prob'), `${m.yesPrice}%`], [ui.term('fair', 'Model fair'), `${Math.round(m.fairProb * 100)}%`],
      ['24h volume', fmtVol(m.volume24h)], ['Open interest', fmtVol(m.openInterest)], ['Closes', fmtClose(m.closesAt)],
    ].map(([k, val]) => `<div><span>${k}</span><strong>${val}</strong></div>`).join('');
    const pts = pm.history(m.id, st.range);
    const box = detailEl.querySelector('[data-chart]');
    const width = Math.max(300, Math.round(box.clientWidth || 640));
    box.innerHTML = priceChart(pts, { width, height: width < 500 ? 190 : 230, fair: m.fairProb * 100 });
    wireHover(box, pts);
    const d = pts.length ? pts[pts.length - 1].p - pts[0].p : 0;
    detailEl.querySelector('[data-chg]').innerHTML = `<span class="${d >= 0 ? 'up' : 'down'}">${ui.dir(d)} ${Math.abs(d).toFixed(1)}¢</span> <span class="muted">${st.range === 'All' ? 'since listing' : `past ${st.range}`}</span>`;
    // Order book ladder with cumulative depth bars. Asks and bids are labelled (not colour-only, B7).
    const asks = ob.asks.slice(0, 8), bids = ob.bids.slice(0, 8);
    let ca = 0, cb = 0;
    const askRows = asks.map((l) => ({ ...l, cum: (ca += l.size) }));
    const bidRows = bids.map((l) => ({ ...l, cum: (cb += l.size) }));
    const maxCum = Math.max(ca, cb, 1);
    const row = (l, kind) => `<button type="button" class="lr lvl ${kind}" data-kind="${kind}" style="--d:${((l.cum / maxCum) * 100).toFixed(1)}%" title="${kind === 'ask' ? 'Ask: buy YES here' : 'Bid: sell YES here (buy NO)'}"><span>${c$(l.price)}</span><span>${l.size.toLocaleString()}</span><span>${ui.money((l.size * l.price) / 100, 0)}</span><span>${l.cum.toLocaleString()}</span></button>`;
    tradeEl.querySelector('[data-ladder]').innerHTML = `<div class="lr lh"><span>Price</span><span>Contracts</span><span>Value</span><span>Total</span></div>
      <div class="grp"><span>Asks · sell offers</span><span>buy YES here ▲</span></div>
      ${[...askRows].reverse().map((l) => row(l, 'ask')).join('')}
      <div class="mid">Spread ${bestAsk - bestBid}¢ · Mid ${c$((bestAsk + bestBid) / 2)} · Last ${c$(Math.round(m.mid * 100))}</div>
      ${bidRows.map((l) => row(l, 'bid')).join('')}
      <div class="grp"><span>Bids · buy offers</span><span>sell YES here ▼</span></div>`;
    tradeEl.querySelector('[data-spread]').textContent = `Bid ${c$(bestBid)} / Ask ${c$(bestAsk)}`;
    const cmp = pm.compare(m.id);
    detailEl.querySelector('[data-comp]').innerHTML = cmp.rows.map((r) => {
      const cheap = r.marketId === cmp.cheapestYes.marketId;
      return `<button type="button" class="vbtn ${cheap ? 'cheap' : ''} ${r.marketId === m.id ? 'here' : ''}" data-go="${r.marketId}" aria-current="${r.marketId === m.id}">${ui.book(r.venue)} <span>YES ${c$(r.yes)}</span><span class="muted">NO ${c$(r.no)}</span>${cheap ? ui.status('Cheapest YES', 'ok') : ''}</button>`;
    }).join('')
      + (cmp.sportsbook ? `<span class="vbtn sb">${ui.book(cmp.sportsbook.book)} ${ui.price(cmp.sportsbook.american)}<span class="muted">= ${Math.round(cmp.sportsbook.implied * 100)}% implied</span></span>` : '');
    updateTicket();
  }

  function updateTicket() {
    const m = pm.market(st.id);
    if (!m || !tradeEl) return;
    const c = st.side === 'YES' ? m.yesPrice : m.noPrice;
    const fair = st.side === 'YES' ? m.fairProb : 1 - m.fairProb;
    const cost = (st.contracts * c) / 100, payout = st.contracts;
    const edge = fair - c / 100;
    const native = ui.oddsFormat() === 'cents' ? '' : ` <small>(${c}¢)</small>`;
    tradeEl.querySelector('[data-ticket]').innerHTML = `
      <dt>Avg price</dt><dd>${c$(c)}${native}</dd>
      <dt>Implied probability</dt><dd>${c}%</dd>
      <dt>Model fair</dt><dd>${(fair * 100).toFixed(1)}% ${ui.edge(edge)}</dd>
      <dt>Cost</dt><dd class="big">${ui.money(cost)}</dd>
      <dt>Payout if ${st.side}</dt><dd class="big">${ui.money(payout)}</dd>
      <dt>Profit</dt><dd class="up">+${ui.money(payout - cost)} (${Math.round(((payout - cost) / cost) * 100)}%)</dd>
      <dt>Of bankroll</dt><dd>${((cost / store.get().bankroll) * 100).toFixed(1)}%</dd>`;
    tradeEl.querySelector('[data-rw]').innerHTML = ui.riskWinCents(cost, c);
    // Two static CTAs (Buy YES / Buy NO); only the ticket's side shows. The amount is live (nodata).
    tradeEl.querySelectorAll('[data-cta]').forEach((b) => {
      const on = b.dataset.cta === st.side;
      b.hidden = !on;
      const amt = `${ui.money(cost)} on ${venueName(m.venue)} ↗`;
      const bEl = b.querySelector('b[data-bf-nodata]');
      if (bEl && bEl.textContent !== amt) bEl.textContent = amt;
    });
    tradeEl.querySelectorAll('[data-qty]').forEach((b) => { const on = +b.dataset.qty === st.contracts; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    tradeEl.querySelectorAll('[data-seg="side"] button').forEach((b) => { const on = b.dataset.v === st.side; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    detailEl.querySelectorAll('[data-quote]').forEach((b) => { const on = b.dataset.quote === st.side; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }

  function select(id) {
    remember({ id });
    ui.setQuery({ id });
    renderList();
    renderDetail();
    if (window.innerWidth < 1100) root.querySelector('.detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  listEl.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) select(b.dataset.id); });
  detailEl.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b && b.dataset.go !== st.id) select(b.dataset.go); });
  const qEl = root.querySelector('[data-q]');
  qEl.addEventListener('input', () => { remember({ q: qEl.value }); pg.reset(); renderList(); });
  ui.onSelect(root, 'venue', (val) => { remember({ venue: val }); pg.reset(); renderList(); });
  ui.onSelect(root, 'category', (val) => { remember({ category: val }); pg.reset(); renderList(); });
  ui.onAction(listEl, {
    'reset-list': () => {
      remember({ q: '', venue: 'All', category: 'All' });
      qEl.value = '';
      root.querySelector('[data-sel="venue"]').value = 'All';
      root.querySelector('[data-sel="category"]').value = 'All';
      renderList();
    },
  });
  if (params.id) remember({ id: st.id });

  // ---------- cross-venue scanner (?view=scanner) ----------
  const scanFb = ui.filterBar({
    id: 'pm-scan',
    fields: [
      { key: 'category', type: 'select', label: 'Category', default: 'All', options: [['All', 'All categories'], ...pm.CATEGORIES], query: true },
      { key: 'minGap', type: 'number', label: 'Min venue gap (¢)', default: 0, step: 1, min: 0 },
      { key: 'edgeOnly', type: 'toggle', label: 'Only with a model edge', default: false },
    ],
    onChange: () => paintScan(),
  });
  root.querySelector('[data-scan-fb]').append(scanFb.el);
  const scanRows = () => filterScan(scanMarkets(pm.markets()), scanFb.values);
  const sidePrice = (r, side) => (side === 'YES' ? r.cheapYes.yes : r.cheapNo.no);
  const sideVenue = (r, side) => (side === 'YES' ? r.cheapYes.venue : r.cheapNo.venue);
  let scanTbl = null;
  function mountScan() {
    scanTbl = ui.table({
      id: 'pm-scan',
      caption: 'Same outcome across prediction-market venues',
      rowKey: (r) => r.key,
      sort: { key: 'edge', dir: 'desc' },
      columns: [
        { key: 'event', label: 'Market', sort: (r) => r.title, render: (r) => `<div class="sm-t">${ui.esc(r.title)}</div>
          <div class="sm-m">${ui.risk('pm', { short: true })} ${r.sport ? ui.sport(r.sport) : ui.tag(r.category)} ${ui.esc(r.kind)} ${r.live ? ui.liveDot() : ''}</div>` },
        { key: 'yes', label: 'Cheapest YES', align: 'r', mlabel: true, sort: (r) => r.cheapYes.yes, trend: (r) => r.cheapYes.yes,
          render: (r) => `<span class="vp">${ui.book(r.cheapYes.venue)} ${c$(r.cheapYes.yes)}</span>` },
        { key: 'no', label: 'Cheapest NO', align: 'r', mlabel: true, sort: (r) => r.cheapNo.no, trend: (r) => r.cheapNo.no,
          render: (r) => `<span class="vp">${ui.book(r.cheapNo.venue)} ${c$(r.cheapNo.no)}</span>` },
        { key: 'gap', label: 'Venue gap', align: 'r', mlabel: true, sort: (r) => r.gap, title: 'How far apart the venues price YES, in cents',
          render: (r) => `${r.gap}¢<span class="sub2">${r.venues.length} venues</span>` },
        { key: 'both', label: 'YES + NO', align: 'r', mlabel: true, sort: (r) => (r.both ?? 999),
          title: 'Cheapest YES on one venue plus cheapest NO on another. Under 100¢ pays more than it costs if both orders fill, before fees.',
          render: (r) => (r.both == null ? ui.na('Only one venue per side') : `${r.both}¢${r.both < 100 ? '<span class="sub2 pos">✓ under 100¢</span>' : '<span class="sub2">pays 100¢</span>'}`) },
        { key: 'edge', label: 'Model edge', align: 'r', sort: (r) => r.bestEdge, title: 'Model fair chance minus the price, for the better side',
          render: (r) => `${ui.edge(r.bestEdge, { label: r.bestSide })}<span class="sub2">fair ${Math.round((r.bestSide === 'YES' ? r.fair : 1 - r.fair) * 100)}%</span>` },
        { key: 'venues', label: 'Venues', pri: 3, hidden: true, render: (r) => `<span class="vchips">${r.venues.map((x) => ui.book(x.venue)).join('')}</span>` },
        { key: 'vol', label: '24h volume', align: 'r', pri: 3, sort: (r) => r.volume24h, render: (r) => fmtVol(r.volume24h) },
      ],
      // One primary per row: it opens that venue's trade ticket on the better side. No order is placed here.
      action: (r) => ui.actions(ui.betAction({ verb: `Buy ${r.bestSide}`, amount: `${c$(sidePrice(r, r.bestSide))} · ${ui.esc(api.bookById[sideVenue(r, r.bestSide)]?.short || venueName(sideVenue(r, r.bestSide)))}`,
        act: 'ticket', title: `Open the ${venueName(sideVenue(r, r.bestSide))} trade ticket` })),
      onAction: { ticket: (r) => openMarket(r.bestMarketId, r.bestSide) },
      onOpen: (r) => openMarket(r.bestMarketId, r.bestSide),
      mobile: { areas: ['event edge', 'yes no', 'act act'], cols: 'minmax(0,1fr) minmax(0,1fr)' }, // gap, YES + NO: behind Details
      empty: () => ui.empty({ title: 'No outcomes match', msg: 'No outcome listed on two or more venues matches these filters.',
        actions: [{ label: 'Reset filters', act: 'scan-reset' }, { label: 'Browse all markets', act: 'scan-markets' }] }),
    });
    root.querySelector('[data-scan-tbl]').append(scanTbl.el);
    ui.onAction(scanTbl.el.querySelector('.tbl-empty'), { 'scan-reset': () => scanFb.reset(), 'scan-markets': () => setPane('markets') });
  }
  function paintScan() {
    const rows = scanRows();
    ui.setModeCount(root, 'scanner', rows.length, 'view');
    root.querySelector('[data-scan-count]').textContent = `${rows.length} outcomes on 2+ venues`;
    if (pane !== 'scanner') return;
    if (!scanTbl) mountScan();
    scanTbl.update(rows);
  }
  function setPane(p) {
    pane = p;
    root.querySelector('.pmm').classList.toggle('is-scan', p === 'scanner');
    root.querySelector('[data-pane="markets"]').hidden = p !== 'markets';
    root.querySelector('[data-pane="scanner"]').hidden = p !== 'scanner';
    root.querySelectorAll('[data-seg="view"] button').forEach((b) => { const on = b.dataset.v === p; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    ui.setQuery({ view: p === 'markets' ? null : p });
    v.set({ view: p });
    if (p === 'scanner') paintScan(); else updateLive();
  }
  /** From the scanner: show that venue's market with the ticket on the chosen side. */
  function openMarket(id, side) {
    setPane('markets');
    remember({ side });
    select(id);
    if (isPhone()) openSheet(side);
  }
  ui.onMode(root.querySelector('.page-head'), (p) => setPane(p), { name: 'view', param: 'view', def: 'markets' });

  renderList();
  renderDetail();
  paintScan();
  // Re-layout on resize (chart width) and when crossing the phone breakpoint (list paging, sheet).
  let wasPhone = isPhone();
  const onResize = () => {
    const now = isPhone();
    if (now !== wasPhone) { wasPhone = now; if (!now && sheet) sheet.close(); renderList(); }
    updateLive();
  };
  window.addEventListener('resize', onResize);
  const unsub = pm.subscribe(() => { renderListPrices(); updateLive(); paintScan(); ui.setLiveStatus(root, { updated: Date.now() }); });
  return () => { unsub(); scanTbl?.destroy(); window.removeEventListener('resize', onResize); if (sheet) sheet.close(); };
}
