// Sportsbook Screen: every market at every book in real time, with the sharp no-vig fair price, the sharp
// references (Circa / Novig / ProphetX) beside it, the best price as a Bet action and the market's hold.
//
// Layout (UX rebuild, items B1/B2/B4/B7/B9/B12/B13 + C3):
//   - results-first head: static H1, live status with the shared Pause, 4 clickable facts
//   - ui.filterBar (Market → Sport → toggles → Books), a search box, Best only, Columns menu, legend
//   - one keyed price grid: rows are patched cell by cell on each tick (no rebuild, no row jumps), the
//     order freezes while the pointer/focus is in the grid, moved prices get a 0.6s tint + ▲/▼
//   - every price is a button that opens that book's bet slip; the event name opens the line history
//   - phones under 600px get per-market cards with a scroll-snap books strip, plus a Grid toggle
import { rng } from '../data/core.js';
import { icon } from '../icons.js';

const MARKETS = ['Moneyline', 'Spread', 'Total', 'Player Prop'];
const SHARP_COLS = ['circa', 'novig', 'px'];
const SHARP = new Set(SHARP_COLS);
const FIXED = new Set(['ev', 'best', 'fair']); // never hideable
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const nick = (team) => String(team).split(' ').slice(-1)[0]; // "Cincinnati Bengals" → "Bengals" (full name in the title)
const LOW_HOLD = 0.02;

const CSS = `
.scr .scr-bar { display:flex; gap:10px 14px; align-items:flex-end; flex-wrap:wrap; margin:4px 0 10px; }
.scr .scr-bar .toolbar { margin:0; }
.scr .scr-search { flex:1 1 170px; max-width:260px; }
.scr .scr-search input { width:100%; }
.scr .scr-right { display:flex; gap:6px 10px; align-items:center; flex-wrap:wrap; margin-left:auto; min-height:40px; }
.scr .scr-layout { display:none; }
.scr .legend { display:flex; gap:6px 16px; flex-wrap:wrap; align-items:center; font-size:var(--t-sm); color:var(--muted); margin:10px 0 0; }
.scr .legend > span { display:inline-flex; align-items:center; gap:5px; }
.scr .legend .price.best { font-size:12px; }
.scr .legend .bt-k { color:var(--pos); font-weight:800; font-size:11px; }
.scr .legend .sh-k { display:inline-block; width:14px; height:12px; border-radius:3px; background:var(--panel); border:1px dashed var(--line-strong); }
/* ---- grid ---- */
.scr .og-wrap { overflow-x:clip; }
.scr .og-wrap.scrolls { overflow-x:auto; -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent); mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent); }
.scr table.og { border-collapse:separate; border-spacing:0; width:100%; font-size:var(--t-cell); }
.scr .og th { position:sticky; top:var(--topbar-h); z-index:var(--z-thead); background:var(--paper); font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:800; padding:8px 2px; border-bottom:2px solid var(--line); white-space:nowrap; text-align:center; }
.scr .og-wrap.scrolls .og th { top:0; }
.scr .og th .book { background:none; border:0; padding:0; font-size:11.5px; }
.scr .og td { padding:3px 2px; height:44px; border-bottom:1px solid var(--line-2); text-align:center; white-space:nowrap; font-variant-numeric:tabular-nums; }
.scr .og tr.grp td { border-top:2px solid var(--line); }
.scr .og tbody tr:first-child td { border-top:0; }
.scr .og .c-ev { position:sticky; left:0; z-index:var(--z-raised); background:var(--paper); text-align:left; width:180px; min-width:180px; max-width:180px; padding-left:8px; border-right:2px solid var(--line); }
.scr .og th.c-ev { z-index:calc(var(--z-thead) + 1); }
.scr .og .c-best { text-align:left; padding-left:10px; }
.scr .og .c-fair { font-weight:800; color:var(--accent); border-right:1px solid var(--line-2); }
.scr .og .sh { background:var(--panel); }
.scr .og th.sh { background:var(--panel); }
.scr .og .c-novig, .scr .og .c-px { border-left:1px dashed var(--line); }
.scr .og .c-hold { border-left:1px solid var(--line-2); border-right:1px solid var(--line-2); font-size:var(--t-sm); }
.scr .og tbody tr:hover td { background:var(--panel); }
.scr .og tbody tr:hover td.sh { background:var(--soft); }
.scr .ev-cell { display:grid; gap:1px; min-width:0; }
.scr .evh { display:flex; align-items:center; gap:5px; min-width:0; border:0; background:none; padding:0; font:700 12px/1.25 var(--f-body); color:var(--accent); cursor:pointer; text-align:left; }
.scr .evh span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.scr .evh:hover span { text-decoration:underline; }
.scr .evh svg { flex:none; }
.scr .evh .live-dot { flex:none; }
.scr .sel { font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.scr .meta { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.scr .bestc { display:inline-flex; align-items:center; gap:4px; }
.scr .bestc .book { background:none; border:0; padding:0; min-width:40px; }
.scr .bestc .bet-action { min-height:30px; padding:3px 9px; }
/* price buttons: the whole cell is the hit area */
.scr .pc { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:2px; min-width:40px; min-height:30px; padding:2px 2px; border:1px solid transparent; border-radius:6px; background:none; color:var(--text); font:600 var(--t-cell)/1 var(--f-body); font-variant-numeric:tabular-nums; cursor:pointer; }
.scr .pc:hover { border-color:var(--line-strong); background:var(--paper); }
.scr .pc .price { font-weight:600; }
.scr .pc .price.best { font-weight:800; }
.scr .pc.beats .price { color:var(--pos); font-weight:800; }
.scr .pc .bt { font-size:9px; color:var(--pos); font-style:normal; }
.scr .hold.lo { color:var(--pos); font-weight:800; }
.scr .c-hold small { display:block; font-size:10.5px; font-weight:800; color:var(--pos); text-transform:uppercase; letter-spacing:.03em; }
/* moved prices: 0.6s tint at 15% + ▲/▼ (non-colour cue) */
.scr [data-c].tk-up { animation:scrUp .6s ease; }
.scr [data-c].tk-down { animation:scrDown .6s ease; }
.scr .tk-ar { font-size:9px; font-style:normal; margin-left:1px; }
.scr .tk-up .tk-ar { color:var(--pos); } .scr .tk-down .tk-ar { color:var(--warn); }
@keyframes scrUp { from { background:color-mix(in srgb, var(--pos) 15%, transparent); } to { background:transparent; } }
@keyframes scrDown { from { background:color-mix(in srgb, var(--warn) 15%, transparent); } to { background:transparent; } }
.scr .og-more { padding:12px; text-align:center; position:sticky; left:0; }
/* ---- phone cards (<600px) ---- */
.scr .mk-list { display:block; }
.scr .mk { border-top:2px solid var(--line); padding:10px 0 8px; }
.scr .mk:first-child { border-top:0; }
.scr .mk-h { display:flex; align-items:baseline; gap:4px 10px; flex-wrap:wrap; margin-bottom:6px; }
.scr .mk-h .evh { font-size:14px; }
.scr .mk-h .meta { flex:1 1 auto; }
.scr .mk-h .hold { margin-left:auto; font-size:12px; color:var(--muted); font-weight:700; }
.scr .mk-h .hold.lo { color:var(--pos); }
.scr .mk-oc + .mk-oc { margin-top:6px; }
.scr .mk-top { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; align-items:center; }
.scr .mk-fair { font-size:12px; color:var(--muted); font-weight:700; white-space:nowrap; }
.scr .mk-fair b { color:var(--accent); }
.scr .mk-strip { position:relative; display:flex; gap:6px; overflow-x:auto; scroll-snap-type:x proximity; padding:6px 0 2px; scrollbar-width:none; }
.scr .mk-strip::-webkit-scrollbar { display:none; }
.scr .mk-p { position:relative; flex:none; scroll-snap-align:start; display:flex; flex-direction:column; align-items:center; gap:2px; padding:3px 4px; border:1px solid var(--line); border-radius:8px; background:var(--paper); }
.scr .mk-p.sh { background:var(--panel); border-style:dashed; }
.scr .mk-p .book { background:none; border:0; padding:0; font-size:11px; }
.scr .mk-p .pc { min-height:28px; }
/* ---- line history drawer ---- */
.scr-d .chart { width:100%; height:auto; display:block; }
.scr-d .chart text { font:10px var(--f-body); fill:var(--muted); }
.scr-d .lg { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 0; }
.scr-d .lg button { border:1px solid var(--line-strong); background:var(--paper); color:var(--text); border-radius:6px; padding:3px 8px 3px 6px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; gap:5px; align-items:center; }
.scr-d .lg button[aria-pressed="false"] { color:var(--muted); text-decoration:line-through; border-style:dashed; }
.scr-d .lg i { width:9px; height:9px; border-radius:3px; display:inline-block; }
.scr-d section { margin-bottom:22px; }
.scr-d h3 { font-size:var(--t-h3); margin-bottom:8px; }
.scr-d .sd-head { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
.scr-d .sd-head h3 { margin:0; }
.scr-d .t td, .scr-d .t th { padding:7px 10px; font-size:13px; }
.scr-d .t th { position:static; }
.scr-d .note { font-size:12.5px; margin:6px 0 0; }
.scr-d .related { margin-top:6px; }
.scr-s .bf2-slip { margin-bottom:12px; }
.scr-s .cmp { font-size:14px; color:var(--muted); margin:8px 0 0; }
.scr-s .cmp b { color:var(--text); }
@media (max-width:860px) {
  .scr .og .c-ev { width:110px; min-width:110px; max-width:110px; padding-left:4px; }
  .scr .og .meta { display:none; }
  .scr .scr-search { max-width:none; }
}
@media (max-width:599px) {
  .scr .scr-layout { display:inline-flex; }
}
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-screen')) document.head.insertAdjacentHTML('beforeend', `<style id="css-screen">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const vw = ui.view();
  const st = {
    q: params.q || '',
    market: ui.initialMode(params, 'Moneyline', MARKETS, 'market'), // ?market= → remembered → Moneyline
    limit: 60,
    bestOnly: !!vw.get('bestOnly', false),
    hidden: new Set(vw.get('hiddenCols', [])),
    layout: vw.get('layout', 'cards'), // phones only: 'cards' | 'grid'
  };
  const phone = matchMedia('(max-width: 599px)');
  const useCards = () => phone.matches && st.layout !== 'grid';

  root.innerHTML = `<div class="scr">
    ${ui.pageHead({
      title: 'Sportsbook Screen', tool: 'screen', live: true,
      subtitle: 'See every market in real time so you can implement your own strategy. Find bets yourself with real-time data.',
      actions: ui.modeSwitch(MARKETS.map((m) => [m, m]), st.market, { name: 'market', label: 'Market' }),
      facts: [{ label: 'Markets on screen', value: '0' }],
    })}
    <div class="scr-bar">
      <div data-filters></div>
      <label class="field scr-search"><span>Search</span><input type="search" class="input" id="scr-q" placeholder="Team or player" value="${ui.esc(st.q)}"></label>
      <div class="scr-right">
        <button type="button" class="tbl-pending" data-apply hidden><b data-bf-nodata></b> <span>· apply</span></button>
        <label class="check" title="Show only Best, Fair, the sharp books and Hold"><input type="checkbox" id="scr-best"${st.bestOnly ? ' checked' : ''}> Best only</label>
        <div class="tbl-cols"><button type="button" class="btn sm ghost" data-cols aria-expanded="false" aria-haspopup="true">${icon('columns', { size: 14 })}<span>Columns</span>${icon('chevron', { size: 12 })}</button>
          <div class="tbl-colmenu" role="group" aria-label="Show columns" hidden data-bf-noedit></div></div>
        <div class="scr-layout">${ui.seg('layout', [['cards', 'Cards'], ['grid', 'Grid']], st.layout)}</div>
      </div>
    </div>
    <div id="scr-grid"></div>
    <div class="legend" aria-label="Legend">
      <span>${ui.price(-110, { best: true })} Best price</span>
      <span><i class="bt-k" aria-hidden="true">▲</i> <b class="pos">Green</b> = beats no-vig fair</span>
      <span>▲ ▼ Price moved</span>
      <span><i class="sh-k" aria-hidden="true"></i> Sharp books &amp; exchanges</span>
      <span>— No price</span>
      <button type="button" class="linkish" data-act="evonly">Show +EV cells</button>
      <span>Tap a price for its bet slip, an event for line movement</span>
    </div>
    <div data-lock></div>
    ${ui.how({
      title: 'How to read the screen',
      summary: 'Compare every book with the sharp no-vig price, then bet the best number.',
      checks: [
        `${ui.term('fair', 'Fair')} is the sharp ${ui.term('devig', 'no-vig')} price: what Circa, Novig and ProphetX say the true chance is, with their margin removed`,
        'Circa, Novig and ProphetX sit beside Fair so you can see where the sharp money is',
        'When a book pays more than Fair, the price is green with ▲: that bet is worth more than it costs over time',
        'Best is the highest price at your books; its Bet button opens that book',
        `${ui.term('hold', 'Hold')} is the book’s margin at the best prices; under 2% is a low-hold market`,
        'Click an event for 12 hours of line movement at every book and the hold history',
      ],
      example: ui.related([['positive-ev', 'Positive EV'], ['low-holds', 'Low Holds'], ['ev-builder', 'Fair Odds Builder'], ['calculators', 'Calculators']]),
    })}
  </div>`;
  const $ = (s) => root.querySelector(s);
  const scr = $('.scr');

  // ---------- filters (remembered per route; sport / market / live go into the hash) ----------
  const fb = ui.filterBar({
    id: 'screen',
    fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'live', type: 'toggle', label: 'Live only', default: false, query: true },
      { key: 'mine', type: 'toggle', label: 'My books only', default: false },
      { key: 'evOnly', type: 'toggle', label: '+EV only', default: false },
      { key: 'books', type: 'books', label: 'Books' },
    ],
    onChange: () => { st.limit = 60; refresh(true); },
  });
  $('[data-filters]').append(fb.el);
  if (params.mode === 'live' && !fb.values.live) fb.set({ live: true }, { silent: true });
  const F = fb.values;

  // ---------- data ----------
  const books = () => store.get().books;
  const fairFor = (line) => api.fairProbs(line, store.get().sharpRefs, methods[store.get().devigMethod] || odds.devig);
  const hasEdge = (line, fair) => books().some((b) => line.prices[b]?.some((p, i) => odds.ev(fair[i], p) > 0.01));

  function filtered() {
    const q = st.q.trim().toLowerCase();
    return api.lines({ sport: F.sport, market: st.market, live: F.live ? true : undefined }).filter((l) => {
      if (q) {
        const e = api.eventById(l.eventId);
        if (!`${e.home} ${e.away} ${l.player || ''} ${l.label}`.toLowerCase().includes(q)) return false;
      }
      return !F.evOnly || hasEdge(l, fairFor(l));
    }).sort((a, b) => (b.live - a.live) || (api.eventById(a.eventId).start - api.eventById(b.eventId).start));
  }
  /** Book columns in display order: sharp references beside Fair, then Hold, then the sportsbooks. */
  function columns() {
    const sb = api.sportsbooks.filter((b) => !F.mine || books().includes(b.id)).map((b) => b.id);
    const all = ['ev', 'best', 'fair', ...SHARP_COLS, 'hold', ...(st.bestOnly ? [] : sb)];
    return all.filter((c) => FIXED.has(c) || !st.hidden.has(c));
  }
  function lineCtx(l) {
    const fair = fairFor(l);
    const best = api.bestPrices(l, F.mine ? books() : undefined);
    const h = best.every(Boolean) ? odds.hold(best.map((b) => b.price)) : null;
    return { line: l, e: api.eventById(l.eventId), fair, best, hold: h };
  }

  // ---------- cell renderers (shared by grid and cards) ----------
  const fairAm = (p) => odds.probToAmerican(p);
  function priceBtn(c, b, i) {
    const p = c.line.prices[b]?.[i];
    if (p === undefined) return ui.na('No price');
    const isBest = c.best[i]?.book === b;
    const beats = !SHARP.has(b) && !isBest && odds.ev(c.fair[i], p) > 0;
    const label = `${api.bookById[b].name} · ${c.line.outcomes[i]} ${odds.fmtAmerican(p)}${isBest ? ' · best price' : ''}${beats ? ' · beats fair' : ''}`;
    return `<button type="button" class="pc${beats ? ' beats' : ''}" data-act="slip" data-b="${b}" data-i="${i}" aria-label="${ui.esc(label)}">${ui.price(p, { best: isBest })}${beats ? '<i class="bt" aria-hidden="true">▲</i>' : ''}</button>`;
  }
  function evButton(c) {
    const { e } = c;
    return `<button type="button" class="evh" data-act="hist" title="${ui.esc(`${e.away} @ ${e.home}`)}: line movement">${e.live ? ui.liveDot() : ''}<span>${ui.esc(nick(e.away))} @ ${ui.esc(nick(e.home))}</span>${icon('pulse', { size: 12 })}</button>`;
  }
  const metaText = (c) => `${c.line.sport} · ${c.line.label} · ${c.e.live ? c.e.clock : ui.when(c.e.start)}`;
  function holdHtml(c) {
    if (c.hold === null) return ui.na('No hold: a side has no price');
    const lo = c.hold < LOW_HOLD;
    return `<span class="hold${lo ? ' lo' : ''}">${odds.pct(c.hold, 1)}</span>${lo ? '<small>low</small>' : ''}`;
  }
  function bestHtml(c, i) {
    const bp = c.best[i];
    if (!bp) return ui.na('No price');
    return `<div class="bestc">${ui.book(bp.book)}${ui.betAction({ verb: 'Bet', amount: ui.fmtOdds(bp.price), book: bp.book, attrs: { 'data-b': bp.book, 'data-i': i } })}</div>`;
  }
  /** Inner HTML of one keyed cell. col: ev | best | fair | hold | <book> | (cards) mkh | sel */
  function cellHtml(col, c, i, cards) {
    if (col === 'ev') {
      const sel = `<div class="sel" title="${ui.esc(c.line.outcomes[i])}">${ui.esc(c.line.outcomes[i])}</div>`;
      if (i === 0) return `<div class="ev-cell">${evButton(c)}${sel}</div>`;
      if (i === 1) return `<div class="ev-cell">${sel}<div class="meta">${ui.esc(metaText(c))}</div></div>`;
      return `<div class="ev-cell">${sel}</div>`;
    }
    if (col === 'mkh') return `${evButton(c)}<span class="meta">${ui.esc(metaText(c))}</span><span class="hold${c.hold !== null && c.hold < LOW_HOLD ? ' lo' : ''}">Hold ${c.hold === null ? '—' : odds.pct(c.hold, 1)}</span>`;
    if (col === 'sel') return ui.esc(c.line.outcomes[i]);
    if (col === 'best') return bestHtml(c, i);
    if (col === 'fair') {
      const f = c.fair[i];
      return cards ? `Fair <b title="${odds.pct(f)} chance">${ui.fmtOdds(fairAm(f))}</b>` : `<span title="No-vig fair · ${odds.pct(f)} chance">${ui.fmtOdds(fairAm(f))}</span>`;
    }
    if (col === 'hold') return i === 0 ? holdHtml(c) : '';
    return cards ? `${ui.book(col)}${priceBtn(c, col, i)}` : priceBtn(c, col, i);
  }

  // ---------- structure: built when the market list / columns change, then patched cell by cell ----------
  let shown = [];
  let builtSig = '';
  let cells = new Map();   // "lineId|col|i" -> element
  const htmlCache = new Map();
  const numCache = new Map();
  let frozen = false;      // pointer / focus inside the results: keep the order still

  const thHtml = (c) => {
    if (c === 'ev') return '<th class="c-ev" scope="col">Event / selection</th>';
    if (c === 'best') return '<th class="c-best" scope="col" title="Highest price at your books">Best</th>';
    if (c === 'fair') return `<th class="c-fair" scope="col" title="${ui.termTitle('fair')}">Fair</th>`;
    if (c === 'hold') return `<th class="c-hold" scope="col" title="${ui.termTitle('hold')}">Hold</th>`;
    return `<th class="c-${c}${SHARP.has(c) ? ' sh' : ''}" scope="col">${ui.book(c)}</th>`;
  };
  const tdCls = (c) => (c === 'ev' || c === 'best' || c === 'fair' || c === 'hold' ? `c-${c}` : `c-${c}${SHARP.has(c) ? ' sh' : ''}`);

  function build(list, C) {
    const grid = $('#scr-grid');
    cells = new Map(); htmlCache.clear(); numCache.clear();
    if (!list.length) {
      grid.innerHTML = ui.empty({
        title: 'No markets match',
        msg: 'Nothing on the board matches these filters and this search. Clear them, or try another sport or market.',
        actions: [{ label: 'Reset filters', act: 'reset' }, ...(st.q ? [{ label: 'Clear search', act: 'clear-q' }] : []), ...(!F.live ? [] : [{ label: 'Show pre-match too', act: 'all-games' }]), { label: 'Positive EV', href: '#/positive-ev' }],
      });
      return;
    }
    const more = allCount > list.length ? `<div class="og-more"><button type="button" class="btn" data-act="more">Show more (${allCount - list.length} markets)</button></div>` : '';
    if (useCards()) {
      const bookCols = C.filter((c) => !['ev', 'best', 'fair', 'hold'].includes(c));
      grid.innerHTML = `<div class="mk-list" data-bf-list data-bf-nodata>${list.map((l) => `<article class="mk" data-line="${l.id}">
        <div class="mk-h" data-c="${l.id}|mkh|0"></div>
        ${l.outcomes.map((_, i) => `<div class="mk-oc"><div class="mk-top"><b class="sel" data-c="${l.id}|sel|${i}"></b><span class="mk-fair" data-c="${l.id}|fair|${i}"></span><span data-c="${l.id}|best|${i}"></span></div>
          <div class="mk-strip" role="group" aria-label="Prices at every book">${bookCols.map((b) => `<span class="mk-p${SHARP.has(b) ? ' sh' : ''}" data-c="${l.id}|${b}|${i}"></span>`).join('')}</div></div>`).join('')}
      </article>`).join('')}</div>${more}`;
    } else {
      grid.innerHTML = `<div class="og-wrap"><table class="og"><caption class="sr-only">Prices for every market at every book</caption>
        <thead><tr>${C.map(thHtml).join('')}</tr></thead>
        <tbody data-bf-list data-bf-nodata>${list.map((l) => l.outcomes.map((_, i) => `<tr class="${i === 0 ? 'grp' : ''}" data-line="${l.id}" data-i="${i}">${C.map((c) => `<td class="${tdCls(c)}" data-c="${l.id}|${c}|${i}"></td>`).join('')}</tr>`).join('')).join('')}</tbody></table></div>${more}`;
    }
    grid.querySelectorAll('[data-c]').forEach((el) => cells.set(el.dataset.c, el));
    requestAnimationFrame(fit);
  }

  /** Patch every keyed cell whose HTML changed; moved prices get a short tint + ▲/▼. */
  function patch(list, flash) {
    const cards = useCards();
    const cx = new Map(list.map((l) => [l.id, lineCtx(l)]));
    for (const [key, el] of cells) {
      const [lid, col, si] = key.split('|');
      const c = cx.get(lid);
      if (!c) continue;
      const i = Number(si);
      const h = cellHtml(col, c, i, cards);
      if (htmlCache.get(key) === h) continue;
      el.innerHTML = h; // whole-cell innerHTML, never nodeValue (content.js contract)
      htmlCache.set(key, h);
      if (api.bookById[col]) {
        const p = c.line.prices[col]?.[i];
        const old = numCache.get(key);
        if (flash && old !== undefined && p !== undefined && old !== p) tint(el, p > old ? 'up' : 'down');
        numCache.set(key, p);
      }
    }
  }
  function tint(el, d) {
    el.classList.remove('tk-up', 'tk-down');
    void el.offsetWidth; // restart the animation
    el.classList.add(`tk-${d}`);
    el.insertAdjacentHTML('beforeend', `<i class="tk-ar" aria-hidden="true">${d === 'up' ? '▲' : '▼'}</i>`);
    clearTimeout(el._tt);
    el._tt = setTimeout(() => { el.classList.remove('tk-up', 'tk-down'); el.querySelector('.tk-ar')?.remove(); }, 1200);
  }

  // Sticky header against the page when the grid fits; otherwise horizontal scroll with a sticky first column.
  function fit() {
    const wrap = $('.og-wrap');
    if (!wrap) return;
    wrap.classList.remove('scrolls');
    wrap.classList.toggle('scrolls', wrap.scrollWidth > wrap.clientWidth + 1);
  }

  function drawFacts(lines) {
    let lowHold = 0, edges = 0;
    for (const l of lines) {
      const best = api.bestPrices(l, books());
      if (best.every(Boolean) && odds.hold(best.map((b) => b.price)) < LOW_HOLD) lowHold++;
      if (hasEdge(l, fairFor(l))) edges++;
    }
    const C = columns().filter((c) => api.bookById[c]);
    const html = ui.facts([
      { label: 'Markets on screen', value: String(lines.length), note: `${new Set(lines.map((l) => l.eventId)).size} games · ${C.length} books` },
      { label: 'Live markets', value: String(lines.filter((l) => l.live).length), note: F.live ? 'Showing live only' : 'Updating every 4s', act: 'live' },
      { label: 'Markets with a +EV price', value: String(edges), tone: 'pos', note: F.evOnly ? 'Showing these only' : 'vs sharp no-vig fair', act: 'evonly' },
      { label: 'Low-hold markets', value: String(lowHold), note: 'Best-price hold under 2%', href: '#/low-holds' },
    ]);
    const cur = $('.ph .facts');
    if (cur && cur.outerHTML !== html) cur.outerHTML = html;
  }

  let allCount = 0;
  function refresh(force = false, flash = false) {
    let lines = filtered();
    drawFacts(lines);
    const locked = ui.isLocked('screen');
    allCount = lines.length;
    const visible = locked ? lines.slice(0, 3) : lines.slice(0, st.limit);
    if (locked) allCount = visible.length;
    $('[data-lock]').innerHTML = locked && lines.length > 3 ? ui.lockCard({ tool: 'screen', count: lines.length - 3, noun: 'markets' }) : '';
    const C = columns();
    const sig = `${useCards() ? 'cards' : 'grid'}#${C.join(',')}#${visible.map((l) => l.id).join(',')}#${allCount}`;
    const apply = $('[data-apply]');
    if (sig !== builtSig) {
      if (frozen && !force && builtSig) {
        // Don't move rows under the cursor: say what's waiting instead.
        const was = new Set(shown.map((l) => l.id));
        const n = visible.filter((l) => !was.has(l.id)).length;
        apply.hidden = false;
        apply.querySelector('b').textContent = n ? `${n} new ${n === 1 ? 'market' : 'markets'}` : 'Markets changed';
        lines = shown; // keep patching what's on screen
        patch(shown.map((l) => api.lineById(l.id)).filter(Boolean), flash);
        return;
      }
      shown = visible;
      builtSig = sig;
      apply.hidden = true;
      build(visible, C);
      patch(visible, false);
      return;
    }
    shown = visible;
    patch(visible, flash);
  }

  // ---------- columns menu ----------
  function paintColMenu() {
    const opts = ['hold', ...SHARP_COLS, ...api.sportsbooks.map((b) => b.id)];
    $('.tbl-colmenu').innerHTML = opts.map((c) => `<label class="check"><input type="checkbox" data-col="${c}"${st.hidden.has(c) ? '' : ' checked'}> ${ui.esc(c === 'hold' ? 'Hold' : api.bookById[c].name)}</label>`).join('');
  }
  paintColMenu();
  const colBtn = $('[data-cols]');
  const colMenu = $('.tbl-colmenu');
  const closeCols = () => { colMenu.hidden = true; colBtn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outsideCols); document.removeEventListener('keydown', escCols, true); };
  const outsideCols = (e) => { if (!e.target.closest('.tbl-cols')) closeCols(); };
  const escCols = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeCols(); colBtn.focus(); } };
  colBtn.addEventListener('click', () => {
    if (!colMenu.hidden) { closeCols(); return; }
    colMenu.hidden = false; colBtn.setAttribute('aria-expanded', 'true');
    colMenu.querySelector('input')?.focus();
    setTimeout(() => { document.addEventListener('pointerdown', outsideCols); document.addEventListener('keydown', escCols, true); }, 0);
  });
  colMenu.addEventListener('change', (e) => {
    const c = e.target.dataset.col;
    if (!c) return;
    if (e.target.checked) st.hidden.delete(c); else st.hidden.add(c);
    vw.set({ hiddenCols: [...st.hidden] });
    refresh(true);
  });

  // ---------- line history (sample, seeded per line) ----------
  function genHistory(line, n = 36) {
    const r = rng(hash(line.id));
    const k = line.outcomes.length;
    // shared market drift (bridged so it ends at 0), plus per-book noise
    const drift = []; let w = 0;
    for (let t = 0; t < n; t++) { if (r() < 0.45) w += (r() - 0.45) * 0.02; drift.push(w); }
    const bridge = drift.map((d, t) => d - drift[n - 1] * (t / (n - 1)));
    const bks = Object.keys(line.prices);
    const series = {};
    for (const b of bks) {
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
      for (let i = 0; i < k; i++) s += Math.min(...bks.filter((b) => api.bookById[b].type === 'sportsbook').map((b) => series[b][t][i]));
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
    const grid = ticks.map((p) => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(p) + 3}" text-anchor="end">${ui.esc(ui.fmtOdds(odds.probToAmerican(p)))}</text>`).join('');
    const xl = [[0, '-12h'], [Math.round((n - 1) / 2), '-6h'], [n - 1, 'Now']].map(([t, l]) => `<text x="${x(t)}" y="${H - 6}" text-anchor="${t === 0 ? 'start' : t === n - 1 ? 'end' : 'middle'}">${l}</text>`).join('');
    const paths = bks.map((b) => {
      const sharp = api.bookById[b].type !== 'sportsbook';
      return `<polyline fill="none" stroke="${api.bookById[b].color}" stroke-width="${sharp ? 2.4 : 1.5}" ${sharp ? 'stroke-dasharray="5 3"' : ''} stroke-linejoin="round" points="${series[b].map((pt, t) => `${x(t).toFixed(1)},${y(pt[idx]).toFixed(1)}`).join(' ')}"><title>${api.bookById[b].name}</title></polyline>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line movement by book">${grid}${xl}${paths}</svg>`;
  }

  function holdChart(hh, n) {
    const W = 760, H = 130, L = 46, R = 10, T = 10, B = 22;
    const lo = Math.min(0, ...hh), hi = Math.max(...hh) * 1.15 || 0.05;
    const x = (t) => L + (t / (n - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = hh.map((v, t) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ticks = [lo, (lo + hi) / 2, hi].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${(v * 100).toFixed(1)}%</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hold history">${ticks}
      <polygon fill="color-mix(in srgb, var(--g) 16%, transparent)" points="${x(0)},${y(lo)} ${pts} ${x(n - 1)},${y(lo)}"/>
      <polyline fill="none" stroke="var(--g)" stroke-width="2" points="${pts}"/>
      <text x="${x(0)}" y="${H - 5}">-12h</text><text x="${x(n - 1)}" y="${H - 5}" text-anchor="end">Now</text></svg>`;
  }

  function openHistory(lineId) {
    const line = api.lineById(lineId);
    if (!line) return;
    const e = api.eventById(line.eventId);
    const { series, holdHist, n } = genHistory(line);
    const hidden = new Set();
    let idx = 0;
    const fair = fairFor(line);
    const best = api.bestPrices(line);
    const bestHold = best.every(Boolean) ? odds.hold(best.map((b) => b.price)) : null;
    const footer = () => {
      const bp = best[idx];
      return `${bp ? ui.betAction({ verb: `Bet ${line.outcomes[idx]}`, amount: `${ui.fmtOdds(bp.price)} · ${api.bookById[bp.book].short}`, book: bp.book, size: '' }) : ''}
        ${line.outcomes.length === 2 && best.every(Boolean) ? ui.calcLink({ tab: 'hold', a: best[0].price, b: best[1].price }) : ''}`;
    };
    const body = ui.drawer(`${e.away} @ ${e.home} · ${line.label}`, `<div class="scr-d">
      <section>${ui.facts([
        { label: 'Best-price hold', value: bestHold === null ? '—' : odds.pct(bestHold, 2), note: `12h ago ${odds.pct(holdHist[0], 2)}`, term: 'hold' },
        ...line.outcomes.slice(0, 2).map((o, i) => ({ label: `Fair · ${o}`, value: ui.fmtOdds(fairAm(fair[i])), note: best[i] ? `Best ${ui.fmtOdds(best[i].price)} ${api.bookById[best[i].book].short}` : '' })),
      ])}</section>
      <section><div class="sd-head"><h3>Line movement by book</h3>
        ${ui.seg('oc', line.outcomes.map((o, i) => [i, o.length > 22 ? `${o.slice(0, 20)}…` : o]), 0)}</div>
        <div id="sd-chart"></div><div class="lg" id="sd-lg" role="group" aria-label="Books on the chart"></div>
        <p class="muted note">Dashed lines are sharp books and exchanges (Circa, Novig, ProphetX). Retail books that lag the sharp move show up as the gap.</p></section>
      <section><h3>Hold history</h3>${holdChart(holdHist, n)}</section>
      <section><h3>Current prices</h3><div class="table-wrap"><table class="t"><thead><tr><th>Book</th>${line.outcomes.map((o) => `<th class="num-cell">${ui.esc(o)}</th>`).join('')}<th class="num-cell">Hold</th></tr></thead>
        <tbody>${Object.keys(line.prices).map((b) => `<tr><td>${ui.book(b, { full: true })}</td>${line.prices[b].map((p, i) => `<td class="num-cell">${ui.price(p, { best: best[i]?.book === b })}</td>`).join('')}
          <td class="num-cell">${odds.pct(odds.hold(line.prices[b]), 1)}</td></tr>`).join('')}</tbody></table></div>
        ${ui.related([['positive-ev', 'Positive EV'], ['low-holds', 'Low Holds'], ['sharp-money', 'Sharp Money']])}</section></div>`,
    { wide: true, kicker: ui.esc(`${line.sport} · ${e.live ? `Live · ${e.clock}` : ui.when(e.start)}`), footer: footer() });
    const drawChart = () => {
      body.querySelector('#sd-chart').innerHTML = lineChart(series, idx, hidden, n);
      body.querySelector('#sd-lg').innerHTML = Object.keys(series).map((b) => `<button type="button" data-b="${b}" aria-pressed="${!hidden.has(b)}"><i style="background:${api.bookById[b].color}"></i>${api.bookById[b].short}</button>`).join('');
    };
    body.querySelector('#sd-lg').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-b]');
      if (!btn) return;
      const b = btn.dataset.b; hidden.has(b) ? hidden.delete(b) : hidden.add(b); drawChart();
    });
    drawChart();
    ui.onSeg(body, 'oc', (v) => {
      idx = Number(v);
      body.querySelectorAll('[data-seg="oc"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      drawChart();
      body.setFooter?.(footer());
    });
    ui.onAction(body.panel || body, { bet: (_, el) => ui.toast(`Opening ${api.bookById[el.dataset.book]?.name || 'the book’s'} bet slip…`) });
  }

  // ---------- one book's bet slip (every price cell) ----------
  function openSlip(lineId, b, i) {
    const line0 = api.lineById(lineId);
    if (!line0 || line0.prices[b]?.[i] === undefined) return;
    const e = api.eventById(line0.eventId);
    const stake = store.get().unit || 50;
    const bk = api.bookById[b];
    const slipHtml = (line) => {
      const p = line.prices[b][i];
      const f = fairFor(line)[i];
      const edge = odds.ev(f, p);
      const bp = api.bestPrices(line, books())[i];
      return `${ui.slip({
        caption: bk.name, tag: line.label,
        legs: [{ title: ui.esc(line.outcomes[i]), sub: ui.esc(`${e.away} @ ${e.home}`), odds: ui.esc(ui.fmtOdds(p)), stake: odds.money(stake) }],
        result: ui.riskWin(stake, p),
        math: `${ui.term('fair', 'No-vig fair')} ${ui.esc(ui.fmtOdds(fairAm(f)))} (${odds.pct(f)} chance) · this price is ${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(2)}% vs fair`,
      })}
      ${ui.evLine({ prob: f, payout: stake * odds.toDecimal(p), ev: stake * edge })}
      ${bp && bp.book !== b ? `<p class="cmp">Best at your books: <b>${ui.esc(ui.fmtOdds(bp.price))}</b> at ${ui.esc(api.bookById[bp.book].name)}</p>` : bp ? '<p class="cmp"><b>This is the best price at your books.</b></p>' : ''}`;
    };
    const footer = (line) => `${ui.betAction({ verb: 'Bet', amount: `${ui.fmtOdds(line.prices[b][i])} at ${bk.short}`, book: b, size: '' })}${ui.ghost('log', 'Log')}
      ${ui.calcLink({ tab: 'ev', a: line.prices[b][i], b: fairAm(fairFor(line)[i]), stake })}`;
    const edge0 = odds.ev(fairFor(line0)[i], line0.prices[b][i]);
    const body = ui.drawer('Bet slip', `<div class="scr-s" data-slip>${slipHtml(line0)}</div>`, {
      kicker: ui.esc(`${e.away} @ ${e.home} · ${line0.label}`),
      risk: edge0 > 0 ? 'ev' : '',
      footer: footer(line0),
    });
    let cur = line0;
    ui.onAction(body.panel || body, {
      bet: (_, el) => ui.toast(`Opening ${api.bookById[el.dataset.book]?.name || 'the book’s'} bet slip…`),
      log: () => ui.logBet({ kind: 'ev', book: b, sport: cur.sport, market: cur.market, selection: cur.outcomes[i], price: cur.prices[b][i], stake, event: `${e.away} @ ${e.home}` }),
    });
    ui.liveGuard(body, {
      read: () => { const l = api.lineById(lineId); return l && l.prices[b]?.[i] !== undefined ? { legs: [{ book: b, price: l.prices[b][i] }], line: l } : null; },
      onUpdate: (n, prev) => {
        cur = n.line;
        body.querySelector('[data-slip]').innerHTML = slipHtml(n.line);
        body.setFooter?.(footer(n.line));
        return `Price moved ${ui.fmtOdds(prev.legs[0].price)} → ${ui.fmtOdds(n.legs[0].price)}`;
      },
      goneMsg: 'This price is gone from the board. Nothing was placed.',
    });
  }

  // ---------- wiring ----------
  // One delegated listener for the page: price cells, Bet, line history, facts, legend, empty state.
  ui.onAction(scr, {
    slip: (_, el) => { const ln = el.closest('[data-line]'); openSlip(ln.dataset.line, el.dataset.b, Number(el.dataset.i ?? ln.dataset.i ?? 0)); },
    bet: (_, el) => ui.toast(`Opening ${api.bookById[el.dataset.book]?.name || 'the book’s'} bet slip…`),
    hist: (_, el) => openHistory(el.closest('[data-line]').dataset.line),
    live: () => fb.set({ live: !F.live }),
    evonly: () => fb.set({ evOnly: !F.evOnly }),
    reset: () => { st.q = ''; $('#scr-q').value = ''; ui.setQuery({ q: null }); fb.reset(); },
    'clear-q': () => { st.q = ''; $('#scr-q').value = ''; ui.setQuery({ q: null }); refresh(true); },
    'all-games': () => fb.set({ live: false }),
    more: () => { st.limit += 60; refresh(true); },
  });
  // Clicking anywhere else on a grid row (Fair, Hold, the selection) opens the line history too.
  $('#scr-grid').addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, label')) return;
    const tr = e.target.closest('tr[data-line]');
    if (tr) openHistory(tr.dataset.line);
  });
  // Freeze the row order while the pointer or keyboard focus is in the results.
  const gridEl = $('#scr-grid');
  gridEl.addEventListener('mouseenter', () => { frozen = true; });
  gridEl.addEventListener('mouseleave', () => { frozen = false; });
  gridEl.addEventListener('focusin', () => { frozen = true; });
  gridEl.addEventListener('focusout', (e) => { if (!gridEl.contains(e.relatedTarget)) frozen = false; });
  $('[data-apply]').addEventListener('click', () => { frozen = false; refresh(true); });

  let qTimer;
  $('#scr-q').addEventListener('input', (e) => {
    st.q = e.target.value; st.limit = 60;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => ui.setQuery({ q: st.q.trim() || null }), 300);
    refresh(true);
  });
  $('#scr-best').addEventListener('change', (e) => { st.bestOnly = e.target.checked; vw.set({ bestOnly: st.bestOnly }); refresh(true); });
  ui.onMode(root, (v) => { st.market = v; st.limit = 60; refresh(true); }, { name: 'market', param: 'market', def: 'Moneyline' });
  ui.onSeg(root, 'layout', (v) => {
    st.layout = v; vw.set({ layout: v });
    root.querySelectorAll('[data-seg="layout"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    refresh(true);
  });
  const onPhone = () => refresh(true);
  phone.addEventListener('change', onPhone);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => requestAnimationFrame(fit)) : null;
  ro?.observe(gridEl);

  refresh(true);
  const offTick = api.onTick(() => refresh(false, true));
  const offStore = store.subscribe(() => refresh(true));
  return () => { offTick(); offStore(); fb.destroy?.(); phone.removeEventListener('change', onPhone); ro?.disconnect(); clearTimeout(qTimer); closeCols(); };
}
