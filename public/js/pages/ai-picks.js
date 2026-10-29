// AI Sports Picks: model picks with grades, edge vs market, projections and reasons + graded record.
//
// Rebuild notes (B1 results-first head, B2 money actions, B5 risk label, B6 flat surfaces, B8 states,
// B12 how/glossary/dollarised line, B14 paging, B17 cross-tool paths, C13 sweep):
// - Head: static H1, one-line subtitle, live status, one Today / Results switch (?tab=results) and a
//   facts strip. Filters use the shared filter bar (Sport → Market → Min grade → Books → Sort by).
// - Picks are flat tiles (one card level). Each has one primary ("Bet $125", legality-aware), a hero edge
//   figure, "Win chance" model vs market bars, the dollarised line and labelled ghosts Calc · Log · Ask.
// - Ticks patch each tile's live parts in place (no re-render, no reorder); new picks wait behind a
//   "N new picks · show" chip and closed ones turn into a disabled "Gone".

const MARKETS = [['All', 'All markets'], ['Moneyline', 'Moneyline'], ['Spread', 'Spread'], ['Total', 'Total'], ['Player Prop', 'Player props']];
const GRADE_OPTS = [['All', 'Any grade'], ['A+', 'A+ only'], ['A-', 'A- or better'], ['B', 'B or better'], ['C+', 'C+ or better']];
const SORTS = [['edge', 'Best'], ['conf', 'Confidence'], ['start', 'Start time']];

const CSS = `
.aip .aip-new { margin:0 0 10px; }
.aip .aip-new[hidden] { display:none; }
.aip .aip-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:20px; align-items:start; }
.aip .aip-main .toolbar { margin-bottom:12px; }
.aip .aip-rail { display:grid; gap:16px; }
/* Facts as a 2 x 2 block in the rail (a ruled strip on phones). */
.aip .aip-rail .stats.facts { display:grid; grid-template-columns:1fr 1fr; gap:14px 16px; margin:0; padding:0 0 14px; overflow:visible; }
.aip .aip-rail .facts .stat { border-right:0; margin:0; padding:0; }
.aip .aip-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(310px, 1fr)); gap:12px; }
/* One card level: a flat ruled tile, no boxes inside it. */
.aip .pk { border:2px solid var(--line); border-radius:12px; background:var(--paper); padding:12px 14px; display:flex; flex-direction:column; gap:9px; min-width:0; }
.aip .pk.gone { opacity:1; border-style:dashed; }
.aip .pk.gone .pk-sel { text-decoration:line-through; }
.aip .pk-top { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.aip .pk-top .when { margin-left:auto; font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.aip .pk-head { display:flex; gap:12px; align-items:flex-start; justify-content:space-between; }
.aip .pk-id { min-width:0; }
.aip .pk-sel { margin:0; font:900 var(--t-lg)/1.15 var(--f-head); text-transform:uppercase; letter-spacing:.01em; }
.aip .pk-evt { margin:2px 0 0; font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.aip .pk-price { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:var(--t-sm); }
.aip .pk-price .lbl { color:var(--muted); font-weight:700; font-size:var(--t-xs); }
.aip .pk-probs { display:grid; gap:4px; }
.aip .pk-probs-h { font-size:var(--t-xs); font-weight:700; color:var(--muted); }
.aip .pk-prob { display:grid; grid-template-columns:56px 1fr 48px; gap:8px; align-items:center; font-size:var(--t-xs); font-weight:600; color:var(--muted); }
.aip .pk-prob b { color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }
.aip .pk-prob .bar i.mkt { background:var(--muted); opacity:.55; }
.aip .pk-meta { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; margin:0; padding:8px 0 0; border-top:1px solid var(--line-2); font-size:var(--t-sm); }
.aip .pk-meta dt { color:var(--muted); font-size:var(--t-xs); font-weight:700; }
.aip .pk-meta dd { margin:2px 0 0; font-weight:700; font-variant-numeric:tabular-nums; }
.aip .pk .ev-line { margin:0; }
.aip .pk-why > summary { cursor:pointer; font-weight:700; color:var(--accent); font-size:var(--t-sm); list-style:none; display:inline-flex; gap:6px; align-items:center; min-height:28px; }
.aip .pk-why > summary::-webkit-details-marker { display:none; }
.aip .pk-why > summary::before { content:"▸"; }
.aip .pk-why[open] > summary::before { content:"▾"; }
.aip .pk-why .bf2-checks { margin-top:6px; font-size:var(--t-sm); gap:6px; }
.aip .pk .row-acts { justify-content:flex-start; flex-wrap:wrap; border-top:1px solid var(--line-2); padding-top:9px; margin-top:auto; }
.grade { display:inline-grid; place-items:center; min-width:30px; height:24px; padding:0 6px; border-radius:7px; font:800 12.5px var(--sans); cursor:help; }
.grade.ga { background:var(--ink); color:var(--lime); }
.grade.gb { background:var(--pos-bg); color:var(--pos); }
.grade.gc { background:var(--panel); color:var(--muted); border:1px solid var(--line-strong); }
/* Record rail: an aside on --panel, not a card. */
.aip .rec-side { display:grid; gap:12px; }
.aip .rec-side h2 { font-size:var(--t-xl); margin:0; }
.aip .rec-big { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
.aip .rec-big strong { font:900 32px/1 var(--f-head); color:var(--pos); }
.aip .rec-side .muted { font-size:var(--t-xs); }
.aip .rec-legend { margin:0; font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.aip td.rt, .aip th.rt { text-align:right; font-variant-numeric:tabular-nums; }
.aip .mini-t td, .aip .mini-t th { padding:6px 8px; font-size:var(--t-sm); }
.aip .chart { position:relative; width:100%; }
.aip .chart svg { display:block; overflow:visible; max-width:100%; height:auto; }
.aip .chart .tip { position:absolute; pointer-events:none; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow); border-radius:8px; padding:6px 9px; font-size:12px; white-space:nowrap; transform:translate(-50%, -110%); opacity:0; transition:opacity .1s; z-index:var(--z-raised, 1); }
.aip .chart .tip b { display:block; font-variant-numeric:tabular-nums; }
.aip .ax { fill:var(--muted); font-size:11px; font-family:var(--sans); }
.aip .res-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:0 24px; }
.aip .res-grid > .sec { margin-top:24px; }
/* Last 30: one line per pick (pick name + sport + market inline) so rows stay compact. */
.aip .aip-last .pick { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.aip .aip-last .pick b { font-weight:700; }
.aip .aip-last .pick .muted { font-size:var(--t-xs); }
.aip .roi-bar { display:flex; align-items:center; gap:8px; }
.aip .roi-bar .bar { flex:1; min-width:50px; }
.aip .st-won { color:var(--pos); font-weight:700; } .aip .st-lost { color:var(--neg); font-weight:700; } .aip .st-push { color:var(--muted); font-weight:700; }
.aip .sec-note { font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.aip .pk-near { display:grid; gap:6px; }
.aip .pk-near > div { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:var(--t-sm); font-weight:600; }
@media (max-width:1100px) {
  .aip .aip-layout { display:flex; flex-direction:column; gap:16px; }
  .aip .aip-rail { display:contents; }
  .aip .aip-facts { order:-1; min-width:0; }
  .aip .aip-main { order:1; min-width:0; }
  .aip .rec-side { order:2; }
  .aip .aip-rail .stats.facts { display:flex; gap:0; padding:0 0 8px; overflow-x:auto; }
  .aip .aip-rail .facts .stat { padding:2px 14px 0 0; margin:0 14px 0 0; border-right:1px solid var(--line); }
  .aip .aip-rail .facts .stat:last-child { border-right:0; }
}
@media (max-width:860px) {
  .aip .page-head.ph .head-actions { flex-wrap:nowrap; gap:4px; }
  .aip .page-head.ph .mode-switch button { padding-inline:9px; }
  .aip .page-head.ph .head-actions > .btn.ghost { padding-inline:6px; white-space:nowrap; }
  .aip .aip-cards { grid-template-columns:1fr; gap:10px; }
  .aip .res-grid { grid-template-columns:1fr; }
  .aip .pk { padding:11px 12px; gap:8px; }
  .aip .pk-sel { font-size:var(--t-md); }
  /* Last 30: one grid row per pick instead of label/value cards. */
  .aip .aip-last thead { display:none; }
  .aip .aip-last tr { display:grid; grid-template-columns:minmax(0,1fr) auto auto; grid-template-areas:"pick pick units" "date grade res" "price stake ."; gap:2px 10px; padding:9px 0; border-bottom:1px solid var(--line-2); }
  .aip .aip-last td { padding:0; border:0; }
  .aip .aip-last td[data-label="Pick"] { grid-area:pick; }
  .aip .aip-last td[data-label="Units"] { grid-area:units; }
  .aip .aip-last td[data-label="Date"] { grid-area:date; }
  .aip .aip-last td[data-label="Grade"] { grid-area:grade; }
  .aip .aip-last td[data-label="Result"] { grid-area:res; justify-self:end; }
  .aip .aip-last td[data-label="Price"] { grid-area:price; text-align:left; }
  .aip .aip-last td[data-label="Stake"] { grid-area:stake; }
  .aip .aip-last td[data-label="Price"]::before, .aip .aip-last td[data-label="Stake"]::before { content:attr(data-label) " "; color:var(--muted); font-size:var(--t-xs); font-weight:700; }
}
`;

const GRADE_NOTE = 'Model grade: A+ is the biggest edge the model sees, C the smallest it still posts';
export const gradeBadge = (g) => `<span class="grade ${g?.[0] === 'A' ? 'ga' : g?.[0] === 'B' ? 'gb' : 'gc'}" title="${GRADE_NOTE}">${g}</span>`;

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
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative units chart">
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
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-ai-picks')) document.head.insertAdjacentHTML('beforeend', `<style id="css-ai-picks">${CSS}</style>`);
  const P = api.picks || {};
  const st = { tab: ui.initialMode(params, 'today', ['today', 'results'], 'tab'), resSport: 'All' };
  const open = new Set();     // ids whose "Why the model likes it" is expanded
  const logged = new Set();   // ids logged this visit
  const pg = ui.pager('ai-picks', { step: 12 });
  let fb = null;              // the Today filter bar
  let shown = new Map();      // id -> pick currently painted
  const unit = () => store.get().unit;
  const fmtU = (u, axis) => `${u >= 0 ? '+' : ''}${u.toFixed(axis ? 0 : 1)}u`;
  const signPct = (x) => `${x >= 0 ? '+' : ''}${ui.pct(x)}`;
  const day = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // Player-prop picks link to Prop Research for that player and stat (B17).
  const propByLine = new Map((api.research?.props?.() || []).map((x) => [x.lineId, x]));
  const askHref = (q) => `#/ai-chat?q=${encodeURIComponent(q)}`;

  root.innerHTML = `<div class="aip">
    ${ui.pageHead({ title: 'AI Sports Picks', tool: 'ai-picks', live: true,
      subtitle: 'Our model prices every game and prop, compares it with every book, and grades the best plays A+ to C.',
      detailsLabel: 'How grades and units work',
      details: ui.checks([
        `Each pick shows the projection, the ${ui.term('edge', 'edge')} at the best available price and the factors behind it.`,
        'Grades run A+ (the biggest edge the model sees) down to C (the smallest it still posts). Higher grades get bigger stakes.',
        `Stakes are in ${ui.term('unit', 'units')}: 1 unit is your unit size from Settings (<a href="#/account">change it</a>).`,
        '“Win chance” compares the model’s chance of winning with the market’s no-vig chance. The gap is the edge.',
      ]),
      actions: `${ui.modeSwitch([['today', 'Today’s picks'], ['results', 'Results & record']], st.tab, { name: 'tab', label: 'View' })}
        <a class="btn sm ghost" href="${askHref('Top AI picks today')}"><span data-bf-text>Ask BetFriend AI</span></a>` })}
    <div id="aip-body"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  ui.onMode(root, (v) => { st.tab = v; draw(); }, { name: 'tab', param: 'tab', def: 'today' });

  const getPicks = () => {
    const v = fb?.values || {};
    let list = P.picks?.({ sport: v.sport || 'All', market: v.market || 'All', books: store.get().books, minGrade: v.grade || 'All' }) || [];
    if (v.sort === 'conf') list = [...list].sort((a, b) => b.confidence - a.confidence);
    if (v.sort === 'start') list = [...list].sort((a, b) => a.start - b.start);
    return list;
  };

  // ---------- one pick tile ----------
  const stakeOf = (p) => p.stakeUnits * unit();
  const evOf = (p) => stakeOf(p) * odds.ev(p.modelProb, p.bestPrice);
  const calcHref = (p) => `#/calculators?${new URLSearchParams({ tab: 'ev', a: String(p.bestPrice), b: String(odds.probToAmerican(Math.min(0.99, Math.max(0.01, p.modelProb)))), stake: String(stakeOf(p)) })}`;
  const liveHero = (p) => ui.heroFig(signPct(p.edge), 'edge');
  const liveBody = (p) => `
    <div class="pk-price"><span class="lbl">Best price</span>${ui.price(p.bestPrice, { best: true })} ${ui.book(p.bestBook)}</div>
    <div class="pk-probs" role="group" aria-label="Win chance"><span class="pk-probs-h">Win chance</span>
      <div class="pk-prob"><span>Model</span><div class="bar"><i style="width:${(p.modelProb * 100).toFixed(1)}%"></i></div><b>${ui.pct(p.modelProb)}</b></div>
      <div class="pk-prob"><span>Market</span><div class="bar"><i class="mkt" style="width:${(p.marketProb * 100).toFixed(1)}%"></i></div><b>${ui.pct(p.marketProb)}</b></div>
    </div>
    <dl class="pk-meta">
      <div><dt>Projection</dt><dd>${ui.esc(p.projection.text)}</dd></div>
      <div><dt>Confidence</dt><dd>${ui.meter(p.confidence)} ${Math.round(p.confidence * 100)}</dd></div>
      <div><dt>Stake</dt><dd>${p.stakeUnits}u · ${ui.money(stakeOf(p), 0)}</dd></div>
    </dl>
    ${ui.evLine({ prob: p.modelProb, payout: stakeOf(p) * odds.toDecimal(p.bestPrice), ev: evOf(p) })}`;
  const liveActs = (p, gone = false) => {
    if (gone) return ui.actions('<button type="button" class="btn sm" aria-disabled="true" disabled>Gone</button>', [['ask', 'Ask', { href: askHref(`Should I bet ${p.selection}?`) }]]);
    const ghosts = [['calc', 'Calc', { href: calcHref(p) }],
      logged.has(p.id) ? ['log', 'Logged', { attrs: { 'aria-disabled': 'true' } }] : ['log', 'Log'],
      ['ask', 'Ask', { href: askHref(`Should I bet ${p.selection}?`) }]];
    const prop = p.player ? propByLine.get(p.lineId) : null;
    if (prop) ghosts.push(['research', 'Research', { href: `#/prop-research?player=${encodeURIComponent(prop.player)}&stat=${encodeURIComponent(prop.stat)}` }]);
    return ui.actions(ui.betAction({ verb: 'Bet', amount: ui.money(stakeOf(p), 0), book: p.bestBook }), ghosts);
  };
  function pickCard(p) {
    const e = api.eventById(p.eventId);
    return `<article class="pk" data-key="${p.id}">
      <div class="pk-top">${gradeBadge(p.grade)} ${ui.sport(p.sport)} ${ui.tag(p.market === 'Player Prop' ? 'Prop' : p.market)} ${ui.risk('ai', { short: true })}<span class="when">${ui.when(e.start)}</span></div>
      <div class="pk-head"><div class="pk-id"><p class="pk-sel">${ui.esc(p.selection)}</p><p class="pk-evt">${ui.esc(e.away)} @ ${ui.esc(e.home)}</p></div><div data-live="hero">${liveHero(p)}</div></div>
      <div class="pk-live" data-live="body">${liveBody(p)}</div>
      <details class="pk-why" data-why="${p.id}"${open.has(p.id) ? ' open' : ''}><summary>Why the model likes it</summary>${ui.checks(p.reasons.map(ui.esc))}</details>
      <div data-live="acts">${liveActs(p)}</div>
    </article>`;
  }
  /** Patch one tile's live regions (whole-region innerHTML, only when it changed). */
  function patchCard(el, p, gone = false) {
    const parts = { hero: gone ? ui.heroFig('Gone', 'no longer posted', { tone: '' }) : liveHero(p), body: liveBody(p), acts: liveActs(p, gone) };
    for (const [k, html] of Object.entries(parts)) {
      const r = el.querySelector(`[data-live="${k}"]`);
      if (r && r._h !== html) { r.innerHTML = html; r._h = html; }
    }
    el.classList.toggle('gone', gone);
  }

  function recordSide() {
    const rec = P.record?.();
    if (!rec) return '';
    const o = rec.overall;
    return `<aside class="aside rec-side">
      <h2>Model record</h2>
      <div><div class="muted">AI picks record · last 60 days</div>
        <div class="rec-big"><strong data-bf-nodata>${fmtU(o.units)}</strong><span data-bf-nodata>${o.wins}-${o.losses}${o.pushes ? `-${o.pushes}` : ''} · ${ui.pct(o.roi)} ROI</span></div></div>
      <div class="chart" id="aip-side-chart"></div>
      <table class="t mini-t mini"><thead><tr><th>Grade</th><th class="rt">Record</th><th class="rt" title="${ui.termTitle('roi')}">ROI</th></tr></thead><tbody data-bf-nodata>
        ${rec.byGrade.map((g) => `<tr><td>${gradeBadge(g.key)}</td><td class="rt">${g.wins}-${g.losses}</td><td class="rt"><span class="${g.roi >= 0 ? 'st-won' : 'st-lost'}">${signPct(g.roi)}</span></td></tr>`).join('')}
      </tbody></table>
      <p class="rec-legend">Every pick is graded at the price we posted. ${ui.term('unit', 'Units')} are your unit size; ${ui.term('roi', 'ROI')} is profit per dollar staked.</p>
      <button type="button" class="btn sm outline" data-act="results">Full results</button>
    </aside>`;
  }

  // ---------- Today ----------
  function todayFacts(list) {
    const rec = P.record?.();
    const aCount = list.filter((p) => p.grade.startsWith('A')).length;
    const avgEdge = list.length ? list.reduce((a, p) => a + p.edge, 0) / list.length : 0;
    return [
      { label: 'Picks on the board', value: String(list.length), note: 'Across your books' },
      { label: 'A-grade plays', value: String(aCount), note: 'Highest conviction', act: 'grade-a' },
      { label: 'Average edge', value: list.length ? ui.pct(avgEdge) : ui.na('No picks'), tone: 'pos', note: 'Model vs best price', term: 'edge' },
      { label: 'Model ROI (60d)', value: rec ? signPct(rec.overall.roi) : ui.na(), tone: 'pos', note: rec ? `${fmtU(rec.overall.units)} on ${rec.overall.bets} picks` : '', act: 'results' },
    ];
  }
  function drawToday() {
    fb?.destroy?.();
    // Desktop: picks on the left, a rail with today's facts and the model record on the right.
    // Phones: the rail dissolves (display:contents) so the facts sit above the filters, the record below.
    $('#aip-body').innerHTML = `
      <div class="aip-layout">
        <div class="aip-main">
          <div data-filters></div>
          <button type="button" class="btn sm outline aip-new" data-act="show-new" hidden><b data-bf-nodata></b> <span data-bf-text>· show</span></button>
          <div class="aip-cards" data-bf-list></div>
          <div data-more></div>
        </div>
        <div class="aip-rail">
          <div class="aip-facts" data-facts></div>
          ${recordSide()}
        </div>
      </div>
      ${ui.how({ summary: 'The model finds prices the books have set too long, and sizes each pick by grade.',
        checks: ['Our model prices the game or prop on its own, from form, matchups, injuries and pace.',
          'It compares that price with every book you use and keeps the gap only at the best one.',
          'Bigger gaps get higher grades and bigger stakes. Any single pick can lose; the edge shows over many.'],
        example: '<div data-aip-example data-bf-nodata></div>' })}
      ${ui.related([['prop-research', 'Prop Research'], ['live-ai', 'Live AI Analysis'], ['ai-chat', 'Ask BetFriend AI']])}`;
    fb = ui.filterBar({ id: 'ai-picks', fields: [
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: [['All', 'All sports'], ...api.sports.map((s) => [s, s])], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: MARKETS, query: true },
      { key: 'grade', type: 'select', label: 'Min grade', default: 'All', options: GRADE_OPTS, role: 'threshold' },
      { key: 'books', type: 'books' },
      { key: 'sort', type: 'sort', label: 'Sort by', default: 'edge', options: SORTS },
    ], onChange: () => { pg.reset(); paintList(); } });
    $('[data-filters]').append(fb.el);
    pg.onMore(() => paintList());
    paintList();
    const sc = $('#aip-side-chart');
    const rec = P.record?.();
    if (sc && rec) lineChart(sc, { values: rec.daily.map((d) => d.cum), labels: rec.daily.map((d) => day(d.date)), fmt: fmtU, zero: 0, height: 130, color: 'var(--pos)' });
  }
  /** Full paint of the list (filters, paging, "show new"). */
  function paintList() {
    const list = getPicks();
    $('[data-facts]').innerHTML = ui.facts(todayFacts(list));
    const page = pg.slice(list);
    shown = new Map(page.map((p) => [p.id, p]));
    const cards = $('.aip-cards');
    if (!list.length) {
      const near = (P.picks?.({ books: store.get().books }) || []).slice(0, 3);
      cards.innerHTML = '';
      $('[data-more]').innerHTML = ui.empty({ title: 'No picks match these filters', msg: 'The model has nothing at this grade for this sport and market right now. New picks post as prices move.',
        actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Show any grade', act: 'any-grade' }, { label: 'Ask BetFriend AI', href: askHref('Top AI picks today') }],
        near: near.length ? `<div class="pk-near">${near.map((p) => `<div>${gradeBadge(p.grade)} ${ui.esc(p.selection)} ${ui.price(p.bestPrice)} ${ui.book(p.bestBook)} ${ui.edge(p.edge)}</div>`).join('')}</div>` : '' });
    } else {
      cards.innerHTML = page.map(pickCard).join('');
      $('[data-more]').innerHTML = pg.more(list.length);
    }
    $('[data-act="show-new"]').hidden = true;
    const ex = $('[data-aip-example]');
    const p0 = list[0];
    if (ex) ex.innerHTML = p0 ? ui.slip({ caption: 'Worked example at your unit', tag: p0.grade,
      legs: [{ title: ui.esc(p0.selection), sub: `${ui.esc(api.bookById[p0.bestBook]?.name || p0.bestBook)} · ${p0.stakeUnits}u`, odds: ui.fmtOdds(p0.bestPrice), stake: ui.money(stakeOf(p0), 0) }],
      result: `Wins about ${Math.round(p0.modelProb * 100)}% of the time, pays ${ui.money(stakeOf(p0) * odds.toDecimal(p0.bestPrice))}, worth ${evOf(p0) >= 0 ? '+' : '-'}${ui.money(Math.abs(evOf(p0)))} on average`,
      math: 'Worth = chance to win × payout − stake. It can still lose.' }) : '';
  }
  /** Tick: patch painted tiles in place; count new picks instead of inserting them. */
  function tickToday() {
    const list = getPicks();
    const byId = new Map(list.map((p) => [p.id, p]));
    root.querySelectorAll('.aip-cards > .pk').forEach((el) => {
      const p = byId.get(el.dataset.key);
      if (p) { shown.set(p.id, p); patchCard(el, p); } else patchCard(el, shown.get(el.dataset.key), true);
    });
    const facts = root.querySelectorAll('[data-facts] .stat strong');
    todayFacts(list).forEach((f, i) => { if (facts[i] && facts[i].innerHTML !== f.value) facts[i].innerHTML = f.value; });
    const fresh = pg.slice(list).filter((p) => !shown.has(p.id)).length;
    const nb = $('[data-act="show-new"]');
    if (nb) { nb.hidden = !fresh; nb.querySelector('b').textContent = `${fresh} new ${fresh === 1 ? 'pick' : 'picks'}`; }
  }

  // ---------- Results ----------
  function drawResults() {
    fb?.destroy?.(); fb = null;
    const rec = P.record?.();
    if (!rec) { $('#aip-body').innerHTML = ui.skeleton({ rows: 6, cols: 4, label: 'Loading results' }); return; }
    const o = rec.overall;
    const u = unit();
    const maxRoi = Math.max(...rec.bySport.map((s) => Math.abs(s.roi)), ...rec.byGrade.map((s) => Math.abs(s.roi)), 0.01);
    const roiRow = (r, label, kind) => `<tr><td data-label="${kind}">${label}</td><td class="rt" data-label="Record">${r.wins}-${r.losses}${r.pushes ? `-${r.pushes}` : ''}</td>
      <td class="rt" data-label="Units"><span class="${r.units >= 0 ? 'st-won' : 'st-lost'}">${fmtU(r.units)}</span></td>
      <td data-label="ROI"><div class="roi-bar"><div class="bar"><i class="${r.roi < 0 ? 'loss-hatch' : ''}" style="width:${(Math.abs(r.roi) / maxRoi) * 100}%"></i></div><b>${signPct(r.roi)}</b></div></td></tr>`;
    const last = rec.last30.filter((g) => st.resSport === 'All' || g.sport === st.resSport);
    const result = (s) => (s === 'won' ? ui.status('Won', 'ok') : s === 'lost' ? ui.status('Lost', 'bad') : ui.status('Push', 'muted'));
    $('#aip-body').innerHTML = `
      ${ui.facts([
        { label: 'Record', value: `${o.wins}-${o.losses}`, note: `${ui.pct(o.winRate)} win rate` },
        { label: 'Units', value: fmtU(o.units), tone: o.units >= 0 ? 'pos' : 'neg', note: `${ui.money(o.units * u, 0)} at your ${ui.money(u, 0)} unit`, term: 'unit' },
        { label: 'ROI', value: signPct(o.roi), tone: o.roi >= 0 ? 'pos' : 'neg', note: `${o.bets} graded picks`, term: 'roi' },
        { label: 'Last 7 days', value: fmtU(rec.last7.units), tone: rec.last7.units >= 0 ? 'pos' : 'neg', note: `${rec.last7.wins}-${rec.last7.losses}` },
        { label: 'Avg CLV', value: `+${ui.pct(o.clv)}`, tone: 'pos', note: 'Beat the closing line', term: 'clv' },
      ])}
      ${ui.sec('Cumulative units · last 60 days', '<div class="chart" id="aip-units"></div>', { actions: '<span class="sec-note">Every pick graded at the price we posted · graded nightly at closing prices</span>' })}
      <div class="res-grid">
        ${ui.sec('By sport', `<div class="table-wrap"><table class="t"><thead><tr><th>Sport</th><th class="rt">Record</th><th class="rt">Units</th><th>ROI</th></tr></thead>
          <tbody data-bf-nodata>${rec.bySport.map((s) => roiRow(s, ui.sport(s.key), 'Sport')).join('')}</tbody></table></div>`)}
        ${ui.sec('By grade', `<div class="table-wrap"><table class="t"><thead><tr><th>Grade</th><th class="rt">Record</th><th class="rt">Units</th><th>ROI</th></tr></thead>
          <tbody data-bf-nodata>${rec.byGrade.map((s) => roiRow(s, gradeBadge(s.key), 'Grade')).join('')}</tbody></table></div>`)}
      </div>
      ${ui.sec('Last 30 graded picks', `<div class="table-wrap"><table class="t aip-last"><thead><tr><th>Date</th><th>Pick</th><th>Grade</th><th class="rt">Price</th><th class="rt">Stake</th><th>Result</th><th class="rt">Units</th></tr></thead><tbody data-bf-nodata>
        ${last.map((g) => `<tr><td data-label="Date" class="muted">${day(g.ts)}</td><td data-label="Pick"><span class="pick"><b>${ui.esc(g.selection)}</b>${ui.sport(g.sport)}<span class="muted">${ui.esc(g.market)}</span></span></td>
          <td data-label="Grade">${gradeBadge(g.grade)}</td><td class="rt" data-label="Price">${ui.price(g.price)}</td><td class="rt" data-label="Stake">${g.stake}u</td>
          <td data-label="Result">${result(g.status)}</td>
          <td class="rt" data-label="Units"><span class="${g.units > 0 ? 'st-won' : g.units < 0 ? 'st-lost' : 'st-push'}">${fmtU(g.units)}</span></td></tr>`).join('')}
        </tbody></table></div>${last.length ? '' : ui.empty({ title: 'No graded picks for this sport', msg: 'Nothing in this sport among the last 30 graded picks.', actions: [{ label: 'All sports', act: 'res-all' }, { label: 'Today’s picks', act: 'today' }] })}`,
      { actions: ui.select('ressport', [['All', 'All sports'], ...api.sports.map((s) => [s, s])], st.resSport, 'Sport') })}
      ${ui.related([['tracker', 'Your Bet Tracker'], ['prop-research', 'Prop Research'], ['ai-chat', 'Ask BetFriend AI']])}`;
    lineChart($('#aip-units'), { values: rec.daily.map((d) => d.cum), labels: rec.daily.map((d) => day(d.date)), fmt: fmtU, zero: 0, height: 240, color: 'var(--pos)' });
    ui.onSelect(root, 'ressport', (v) => { st.resSport = v; drawResults(); });
  }

  const setTab = (v) => {
    st.tab = v;
    root.querySelectorAll('[data-seg="tab"] button').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    ui.setQuery({ tab: v === 'today' ? null : v });
    ui.view().set({ tab: v });
    draw();
    window.scrollTo({ top: 0 });
  };
  function draw() { if (st.tab === 'results') drawResults(); else drawToday(); }

  // One delegated listener for every action on the screen.
  ui.onAction(root, {
    results: () => setTab('results'),
    today: () => setTab('today'),
    'grade-a': () => fb?.set({ grade: 'A-' }),
    reset: () => fb?.reset(),
    'any-grade': () => fb?.set({ grade: 'All' }),
    'res-all': () => { st.resSport = 'All'; drawResults(); },
    'show-new': () => paintList(),
    log: (id, el) => {
      const p = shown.get(id);
      if (!p || logged.has(id)) return;
      ui.logBet({ kind: 'ai-pick', book: p.bestBook, sport: p.sport, market: p.market, selection: p.selection, price: p.bestPrice,
        stake: Math.round(stakeOf(p)), eventId: p.eventId, note: `AI grade ${p.grade}` });
      logged.add(id);
      const card = el.closest('.pk');
      if (card) patchCard(card, p);
    },
  });
  // "Why the model likes it" state survives full repaints.
  root.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.matches?.('details[data-why]')) return;
    if (d.open) open.add(d.dataset.why); else open.delete(d.dataset.why);
  }, true);

  draw();
  // Deep link from the Daily Card: #/ai-picks?id=<pick id> opens the pick in a drawer (with "Why the model
  // likes it" open) and marks its tile in the list.
  ui.deepLink(root, params.id, {
    noun: 'pick',
    gone: 'That pick is no longer posted. Here are today’s picks.',
    find: (id) => (P.picks?.({ books: store.get().books }) || []).find((p) => p.id === id) || null,
    open: (p) => {
      if (st.tab !== 'today') setTab('today');
      open.add(p.id);
      const tile = [...root.querySelectorAll(".aip-cards > .pk")].find((x) => x.dataset.key === p.id)?.querySelector("details[data-why]");
      if (tile) tile.open = true;
      const body = ui.drawer(p.selection, `<div class="aip">${pickCard(p)}</div>`, { kicker: 'AI pick', risk: 'ai' });
      ui.onAction(body.panel, {
        log: (_, el) => {
          if (logged.has(p.id)) return;
          ui.logBet({ kind: 'ai-pick', book: p.bestBook, sport: p.sport, market: p.market, selection: p.selection, price: p.bestPrice,
            stake: Math.round(stakeOf(p)), eventId: p.eventId, note: `AI grade ${p.grade}` });
          logged.add(p.id);
          const card = el.closest('.pk');
          if (card) patchCard(card, p);
        },
      });
    },
  });
  const unsub = api.onTick(() => { if (st.tab === 'today' && $('.aip-cards')) tickToday(); });
  let rt = null;
  let vw = window.innerWidth;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(window.innerWidth - vw) > 30) { vw = window.innerWidth; draw(); } }, 150); };
  window.addEventListener('resize', onResize);
  return () => { unsub(); fb?.destroy?.(); clearTimeout(rt); window.removeEventListener('resize', onResize); };
}
