// Fair Odds Builder: build your own fair-odds formula (reference books, weights, devig method)
// and preview the +EV bets it finds against the default formula.
//
// Layout (UX rebuild, items B1/B2/B6/B7/B9/B12/B15 + C13):
//   - results-first head: static H1, live status, Reset / Save, 4 facts (yours vs the default formula)
//   - the live preview is a keyed ui.table (one Bet per row, sortable, mobile grid rows, no overflow)
//   - the formula builder is a flat aside on --panel (no card-in-card); on phones it follows the results
//   - "Save as my default" also lives in a sticky action bar that hides while the head button is visible

const W_KEY = 'bf-evb-weights-v1';
const REF_BOOKS = [
  ['circa', 'Sharp book · high limits'], ['novig', 'Exchange · peer-to-peer'], ['px', 'Exchange · peer-to-peer'],
  ['fd', 'Retail market maker on props'], ['b365', 'Low-vig retail'], ['dk', 'Retail volume leader'],
];
const METHOD_INFO = {
  multiplicative: ['Multiplicative', 'Scales every outcome by the same factor. The industry default for two-way markets.'],
  power: ['Power', 'Removes more vig from longshots, matching how books shade favorite-longshot bias. Best for props and lopsided lines.'],
  additive: ['Additive', 'Subtracts an equal share of the vig from each side. Useful on tight, near-even markets.'],
};
const MARKETS = ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'];
const DEFAULT_REFS = ['circa', 'novig', 'px'];

const CSS = `
.evb .evb-grid { display:grid; grid-template-columns:320px minmax(0,1fr); grid-template-areas:"form main"; gap:24px; align-items:start; }
.evb .evb-main { grid-area:main; min-width:0; }
.evb .evb-form { grid-area:form; position:sticky; top:calc(var(--topbar-h) + 12px); padding:0;
  /* Never taller than the window, so the bottom of the form stays reachable on short laptop screens. */
  max-height:calc(100vh - var(--topbar-h) - 24px); overflow-y:auto; overscroll-behavior:contain; }
.evb .evb-part { padding:14px 16px; border-top:2px solid var(--line); }
.evb .evb-part:first-child { border-top:4px solid var(--g); }
.evb .evb-part h2 { font-size:var(--t-xl); margin-bottom:10px; display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
.evb .evb-part h2 small { font:700 var(--t-xs) var(--f-body); color:var(--muted); text-transform:none; letter-spacing:0; }
.evb .ref { display:grid; grid-template-columns:minmax(0,1fr) 46px; gap:2px 10px; align-items:center; padding:6px 0; }
.evb .ref .rn { display:flex; gap:8px; align-items:center; min-width:0; }
.evb .ref .rn small { color:var(--muted); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.evb .ref input[type=range] { grid-column:1; width:100%; margin:0; }
.evb .ref .w { grid-column:2; grid-row:1 / span 2; text-align:right; font-weight:800; font-variant-numeric:tabular-nums; }
.evb .ref.off .rn small, .evb .ref.off .w { color:var(--muted); }
.evb .ref.off .w { font-weight:700; }
.evb .shares { display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--line); margin-top:8px; }
.evb .shares i { display:block; height:100%; }
.evb .mdesc { font-size:var(--t-sm); color:var(--muted); margin:8px 0 0; }
.evb .ex-ev { font-size:12.5px; color:var(--muted); margin-bottom:6px; }
.evb .ex .t { background:var(--paper); }
.evb .ex .t td, .evb .ex .t th { padding:6px 8px; font-size:12.5px; position:static; }
.evb .ex .t td small { display:block; color:var(--muted); font-weight:600; }
.evb .res-note { display:flex; gap:4px 14px; flex-wrap:wrap; align-items:center; font-size:var(--t-sm); color:var(--muted); margin:0 0 8px; }
.evb .res-note b { color:var(--text); font-variant-numeric:tabular-nums; }
.evb .sel-name { font-weight:700; } .evb .sel-sub { font-size:12px; color:var(--muted); }
.evb .bet-c { max-width:270px; min-width:0; }
.evb .bet-c .sel-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
@media (max-width:860px) { .evb .bet-c { max-width:none; } }
.evb .ex-scroll { overflow-x:auto; }
.evb .sel-name small { font-weight:500; color:var(--muted); font-size:12px; }
.evb .evb-tbl .ev-line { font-size:12.5px; }
.evb .evb-more { text-align:center; padding:10px 0 0; }
.evb .actionbar .ab-txt { font-size:var(--t-sm); color:var(--muted); font-weight:700; }
.evb .actionbar .ab-acts { display:flex; gap:8px; margin-left:auto; }
.evb-d .cmp { width:100%; margin-top:10px; }
.evb-d .cmp td, .evb-d .cmp th { position:static; padding:7px 10px; }
@media (max-width:1100px) {
  .evb .evb-grid { grid-template-columns:minmax(0,1fr); grid-template-areas:"main" "form"; }
  .evb .evb-form { position:static; max-height:none; overflow:visible; }
}
@media (min-width:1101px) { .evb .actionbar { display:none; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-ev-builder')) document.head.insertAdjacentHTML('beforeend', `<style id="css-ev-builder">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };

  const fromStore = () => Object.fromEntries(REF_BOOKS.map(([b]) => [b, (store.get().sharpRefs || []).includes(b) ? 100 : 0]));
  let weights = fromStore();
  try { const saved = JSON.parse(localStorage.getItem(W_KEY) || 'null'); if (saved && typeof saved === 'object') weights = { ...weights, ...saved }; } catch { /* ignore */ }
  const st = { method: store.get().devigMethod || 'multiplicative', limit: 40 };
  const stake = () => store.get().unit || 50;

  root.innerHTML = `<div class="evb">
    ${ui.pageHead({
      title: 'Fair Odds Builder', tool: 'ev-builder', live: true,
      subtitle: 'Build your own fair-odds formula: pick the sharp books you trust, weight them, choose how the vig comes out, and see every +EV bet your formula finds in real time.',
      actions: `<button type="button" class="btn outline" data-act="reset">Reset</button><button type="button" class="btn primary" data-act="save" id="evb-save">Save as my default</button>`,
      facts: [{ label: 'Your formula finds', value: '0' }],
    })}
    <div class="evb-grid">
      <div class="evb-main">
        ${ui.sec('Live preview · bets your formula finds', `<div data-filters></div>
          <p class="res-note" id="evb-note"></p>
          <div class="evb-tbl" data-table></div>
          <div class="evb-more" data-more></div>`)}
      </div>
      <aside class="aside evb-form" aria-label="Your formula">
        <section class="evb-part"><h2>Reference books <small>Weight</small></h2><div id="evb-refs"></div><div class="shares" id="evb-shares" aria-hidden="true"></div></section>
        <section class="evb-part"><h2>Devig method</h2>${ui.seg('method', Object.entries(METHOD_INFO).map(([k, [l]]) => [k, l]), st.method)}<p class="mdesc" id="evb-mdesc"></p></section>
        <section class="evb-part ex"><h2>How your formula prices a line</h2><div id="evb-ex"></div></section>
      </aside>
    </div>
    ${ui.how({
      title: 'How fair odds work',
      summary: 'Your formula decides what “fair” is; every price that beats it is a +EV bet.',
      checks: [
        `Each reference book’s prices include a margin (the ${ui.term('vig')}). The ${ui.term('devig', 'devig method')} takes it out to get that book’s true chances`,
        'Your weights blend the books into one fair price. Sharp books and exchanges usually deserve the most weight',
        `A sportsbook price above ${ui.term('fair', 'fair')} is ${ui.term('ev', '+EV')}: worth more than it costs over many bets. Any single bet can lose`,
        'Save it as your default and Positive EV, Sportsbook Screen and Parlay Builder price with your formula',
      ],
      example: ui.related([['positive-ev', 'Positive EV'], ['screen', 'Sportsbook Screen'], ['calculators', 'Calculators']]),
    })}
    ${ui.actionBar(`<span class="ab-txt">Your formula: <b data-bf-nodata id="evb-ab-n"></b></span><div class="ab-acts">${ui.ghost('reset', 'Reset')}${ui.betAction({ verb: 'Save as my default', act: 'save', size: '' })}</div>`)}
  </div>`;
  const $ = (s) => root.querySelector(s);
  const books = () => store.get().books;
  const active = () => Object.entries(weights).filter(([, w]) => w > 0);

  // ---------- filters: Board (Pre-match / Live, ?mode=live) → Market → Min EV % ----------
  const fb = ui.filterBar({
    id: 'ev-builder',
    fields: [
      { key: 'mode', type: 'mode', label: 'Board', default: 'pre', options: [['pre', 'Pre-match'], ['live', 'Live']], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: MARKETS, query: true },
      { key: 'minEv', type: 'number', label: 'Min EV %', default: 1, step: 0.5, min: 0 },
      { key: 'books', type: 'books', label: 'Books' },
    ],
    onChange: () => { st.limit = 40; update(); },
  });
  $('[data-filters]').append(fb.el);
  const F = fb.values;
  const isLive = () => F.mode === 'live';

  // ---------- the formula ----------
  function weightedFair(line, fn) {
    let tot = 0;
    const sums = line.outcomes.map(() => 0);
    for (const [b, w] of active()) {
      if (!line.prices[b]) continue;
      fn(line.prices[b].map(odds.impliedProb)).forEach((p, i) => (sums[i] += p * w));
      tot += w;
    }
    return tot ? sums.map((s) => s / tot) : api.fairProbs(line, [], fn);
  }

  function findMine() {
    const fn = methods[st.method];
    const act = active();
    const f = { books: books(), minEdge: (+F.minEv || 0) / 100, market: F.market, live: isLive() };
    if (act.length && act.every(([, w]) => w === act[0][1])) return api.ev({ ...f, refs: act.map(([b]) => b), method: fn });
    const out = [];
    for (const line of api.lines({ market: F.market, live: isLive() })) {
      const fair = weightedFair(line, fn);
      const e = api.eventById(line.eventId);
      for (const b of Object.keys(line.prices)) {
        if (api.bookById[b].type !== 'sportsbook' || !f.books.includes(b)) continue;
        line.prices[b].forEach((price, i) => {
          const edge = odds.ev(fair[i], price);
          if (edge >= f.minEdge) out.push({ id: `ev-${line.id}-${b}-${i}`, kind: 'ev', lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market, label: line.label, event: `${e.away} @ ${e.home}`, start: e.start, live: line.live, legs: [{ outcome: line.outcomes[i], book: b, price }], edge, meta: { fairProb: fair[i] } });
        });
      }
    }
    return out.sort((a, b) => b.edge - a.edge);
  }

  function drawRefs() {
    const tot = active().reduce((a, [, w]) => a + w, 0) || 1;
    $('#evb-refs').innerHTML = REF_BOOKS.map(([b, desc]) => `<div class="ref ${weights[b] ? '' : 'off'}">
      <div class="rn">${ui.book(b, { full: true })}<small>${desc}</small></div>
      <div class="w" data-w="${b}">${weights[b] ? `${Math.round((weights[b] / tot) * 100)}%` : 'Off'}</div>
      <input type="range" min="0" max="100" step="5" value="${weights[b]}" data-ref="${b}" aria-label="${api.bookById[b].name} weight"></div>`).join('');
    drawShares();
  }
  // One delegated listener: slider input re-labels the weights without rebuilding the sliders.
  $('#evb-refs').addEventListener('input', (e) => {
    const inp = e.target.closest('[data-ref]');
    if (!inp) return;
    weights[inp.dataset.ref] = Number(inp.value);
    const t = active().reduce((a, [, w]) => a + w, 0) || 1;
    $('#evb-refs').querySelectorAll('[data-w]').forEach((el) => {
      const w = weights[el.dataset.w];
      el.textContent = w ? `${Math.round((w / t) * 100)}%` : 'Off';
      el.closest('.ref').classList.toggle('off', !w);
    });
    drawShares();
    update();
  });
  function drawShares() {
    $('#evb-shares').innerHTML = active().map(([b, w]) => `<i style="flex:${w};background:${api.bookById[b].color}" title="${api.bookById[b].name}"></i>`).join('');
  }

  function drawExample() {
    const fn = methods[st.method];
    const line = api.lines({ market: F.market === 'All' ? 'Moneyline' : F.market, live: isLive() })
      .find((l) => active().filter(([b]) => l.prices[b]).length >= Math.min(2, active().length)) || api.lines({ market: 'Moneyline' })[0];
    if (!line) { $('#evb-ex').innerHTML = ''; return; }
    const act = active().filter(([b]) => line.prices[b]);
    const tot = act.reduce((a, [, w]) => a + w, 0) || 1;
    const fair = weightedFair(line, fn);
    const e = api.eventById(line.eventId);
    const short = (s) => (s.length > 14 ? `${s.split(' ').slice(-1)[0]}` : s);
    const html = `<div class="ex-ev">${ui.esc(e.away)} @ ${ui.esc(e.home)} · ${ui.esc(line.label)}</div>
      <div class="ex-scroll"><table class="t"><thead><tr><th>Book</th><th class="num-cell">Wt</th>${line.outcomes.map((o) => `<th class="num-cell">${ui.esc(short(o))}</th>`).join('')}</tr></thead><tbody data-bf-nodata>
      ${act.map(([b, w]) => { const f = fn(line.prices[b].map(odds.impliedProb)); return `<tr><td>${ui.book(b)}</td><td class="num-cell">${Math.round((w / tot) * 100)}%</td>${line.prices[b].map((p, i) => `<td class="num-cell">${ui.esc(ui.fmtOdds(p))}<small>${odds.pct(f[i])}</small></td>`).join('')}</tr>`; }).join('')}
      <tr class="hl"><td><strong>Fair</strong></td><td></td>${fair.map((p) => `<td class="num-cell"><strong>${ui.esc(ui.fmtOdds(odds.probToAmerican(p)))}</strong><small>${odds.pct(p)}</small></td>`).join('')}</tr></tbody></table></div>`;
    const el = $('#evb-ex');
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
  }

  // ---------- live preview table ----------
  let defMap = new Map();
  const fairAm = (p) => ui.fmtOdds(odds.probToAmerican(p));
  const t = ui.table({
    id: 'evb', caption: 'Bets your formula finds', rowKey: (o) => o.id,
    columns: [
      { key: 'yours', label: 'Your EV', sort: (o) => o.edge, trend: (o) => o.edge, title: ui.termTitle('ev'), render: (o) => ui.edge(o.edge) },
      { key: 'def', label: 'Default EV', align: 'r', sort: (o) => defMap.get(o.id)?.edge ?? -1, render: (o) => { const d = defMap.get(o.id); return d ? `<span class="muted">+${(d.edge * 100).toFixed(2)}%</span>` : ui.status('Only yours', 'info'); } },
      { key: 'bet', label: 'Bet', render: (o) => {
        const leg = o.legs[0];
        return `<div class="bet-c"><div class="sel-name">${ui.esc(leg.outcome)} <small>${ui.esc(o.label === o.market ? o.market : o.label)}</small></div>
          <div class="sel-sub">${o.live ? `${ui.liveDot()} ` : ''}${ui.esc(o.sport)} · ${ui.esc(o.event)} · ${ui.when(o.start)}</div>
          ${ui.evLine({ prob: o.meta.fairProb, payout: stake() * odds.toDecimal(leg.price), ev: stake() * o.edge })}</div>`;
      } },
      { key: 'book', label: 'Book · price', render: (o) => `<span style="white-space:nowrap">${ui.book(o.legs[0].book)} ${ui.price(o.legs[0].price, { best: true })}</span>` },
      { key: 'fair', label: 'Your fair', align: 'r', title: ui.termTitle('fair'), render: (o) => ui.esc(fairAm(o.meta.fairProb)) },
    ],
    action: (o) => ui.actions(ui.betAction({ verb: 'Bet', amount: ui.fmtOdds(o.legs[0].price), book: o.legs[0].book })),
    onAction: { bet: (o) => ui.toast(`Opening ${api.bookById[o.legs[0].book].name} bet slip…`) },
    onOpen: (o) => openSlip(o),
    sort: { key: 'yours', dir: 'desc' },
    mobile: { areas: ['bet bet yours', 'bet bet def', 'book fair act'], cols: 'minmax(0,1fr) auto auto' },
    empty: () => ui.empty({
      title: 'Your formula finds no bets here',
      msg: 'Nothing clears your minimum EV with these reference books. Lower the minimum, add a reference book, or try the other board.',
      actions: [{ label: 'Reset filters', act: 'reset-filters' }, { label: isLive() ? 'Show pre-match' : 'Show live', act: 'other-board' }, { label: 'Positive EV', href: '#/positive-ev' }],
    }),
  });
  $('[data-table]').append(t.el);

  function openSlip(o) {
    const leg = o.legs[0];
    const d = defMap.get(o.id);
    const s = stake();
    const body = ui.drawer('Bet slip', `<div class="evb-d">${ui.slip({
      caption: api.bookById[leg.book].name, tag: o.label,
      legs: [{ title: ui.esc(leg.outcome), sub: ui.esc(o.event), odds: ui.esc(ui.fmtOdds(leg.price)), stake: odds.money(s) }],
      result: ui.riskWin(s, leg.price),
      math: `Your ${ui.term('fair', 'fair')} ${ui.esc(fairAm(o.meta.fairProb))} · ${ui.term('ev', 'EV')} ${o.edge >= 0 ? '+' : ''}${(o.edge * 100).toFixed(2)}%`,
    })}
      ${ui.evLine({ prob: o.meta.fairProb, payout: s * odds.toDecimal(leg.price), ev: s * o.edge })}
      <table class="t cmp"><thead><tr><th>Formula</th><th class="num-cell">Fair</th><th class="num-cell">EV</th></tr></thead><tbody data-bf-nodata>
        <tr class="hl"><td>Yours</td><td class="num-cell">${ui.esc(fairAm(o.meta.fairProb))}</td><td class="num-cell">${ui.edge(o.edge)}</td></tr>
        <tr><td>Default</td><td class="num-cell">${d ? ui.esc(fairAm(d.meta.fairProb)) : ui.na()}</td><td class="num-cell">${d ? ui.edge(d.edge) : ui.status('Below minimum', 'muted')}</td></tr></tbody></table></div>`, {
      kicker: ui.esc(o.event), risk: 'ev',
      footer: `${ui.betAction({ verb: 'Bet', amount: `${ui.fmtOdds(leg.price)} at ${api.bookById[leg.book].short}`, book: leg.book, size: '' })}${ui.ghost('log', 'Log')}
        ${ui.calcLink({ tab: 'ev', a: leg.price, b: odds.probToAmerican(o.meta.fairProb), stake: s })}`,
    });
    ui.onAction(body.panel, {
      bet: () => ui.toast(`Opening ${api.bookById[leg.book].name} bet slip…`),
      log: () => ui.logBet({ kind: 'ev', book: leg.book, sport: o.sport, market: o.market, selection: leg.outcome, price: leg.price, stake: s, event: o.event }),
    });
  }

  function update() {
    const mine = findMine();
    const def = api.ev({ books: books(), minEdge: (+F.minEv || 0) / 100, market: F.market, live: isLive() });
    defMap = new Map(def.map((o) => [o.id, o]));
    const diff = mine.length - def.length;
    const avg = (arr) => (arr.length ? arr.reduce((a, o) => a + o.edge, 0) / arr.length : 0);
    const onlyMine = mine.filter((o) => !defMap.has(o.id)).length;
    const facts = ui.facts([
      { label: 'Your formula finds', value: String(mine.length), tone: 'pos', note: `+EV bets · avg +${(avg(mine) * 100).toFixed(2)}%` },
      { label: 'Default formula finds', value: String(def.length), note: `Circa + Novig + ProphetX · multiplicative · ${diff >= 0 ? '+' : '−'}${Math.abs(diff)} with yours` },
      { label: 'Only your formula finds', value: String(onlyMine), note: 'Bets the default misses' },
      { label: 'Top edge', value: mine[0] ? `+${(mine[0].edge * 100).toFixed(2)}%` : '—', tone: 'pos', note: mine[0] ? ui.esc(mine[0].legs[0].outcome) : '' },
    ]);
    const cur = $('.ph .facts');
    if (cur && cur.outerHTML !== facts) cur.outerHTML = facts;
    const games = new Set(mine.map((o) => o.eventId)).size;
    const note = `${METHOD_INFO[st.method][0]} devig · min EV ${+F.minEv || 0}% · ${isLive() ? 'live' : 'pre-match'} · Games covered <b>${games}</b> · ${active().length} reference book${active().length === 1 ? '' : 's'}`;
    if ($('#evb-note')._h !== note) { $('#evb-note').innerHTML = `<span data-bf-nodata>${note}</span>`; $('#evb-note')._h = note; }
    $('#evb-ab-n').textContent = `${mine.length} +EV bets`;
    t.update(mine.slice(0, st.limit));
    const more = mine.length > st.limit ? `<button type="button" class="btn" data-act="more">Show more (${mine.length - st.limit})</button>` : '';
    if ($('[data-more]')._h !== more) { $('[data-more]').innerHTML = more; $('[data-more]')._h = more; }
    $('#evb-mdesc').textContent = METHOD_INFO[st.method][1];
    drawExample();
  }

  // ---------- wiring ----------
  function save() {
    const refs = active().map(([b]) => b);
    if (!refs.length) { ui.toast('Add at least one reference book'); return; }
    try { localStorage.setItem(W_KEY, JSON.stringify(weights)); } catch { /* ignore */ }
    store.set({ sharpRefs: refs, devigMethod: st.method });
    ui.toast('Saved. Positive EV, Sportsbook Screen and Parlay Builder now price with your formula.');
  }
  function reset() {
    weights = Object.fromEntries(REF_BOOKS.map(([b]) => [b, DEFAULT_REFS.includes(b) ? 100 : 0]));
    st.method = 'multiplicative';
    root.querySelectorAll('[data-seg="method"] button').forEach((b) => { const on = b.dataset.v === st.method; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    drawRefs(); update();
  }
  ui.onAction(root.querySelector('.evb'), {
    save, reset,
    more: () => { st.limit += 40; update(); },
    'reset-filters': () => fb.reset(),
    'other-board': () => fb.set({ mode: isLive() ? 'pre' : 'live' }),
  });
  ui.onSeg(root, 'method', (v) => {
    st.method = v;
    root.querySelectorAll('[data-seg="method"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    update();
  });
  const offBar = ui.wireActionBar(root.querySelector('[data-actionbar]'), $('#evb-save'));

  drawRefs();
  update();
  const offTick = api.onTick(() => update());
  const offStore = store.subscribe(() => update());
  return () => { offTick(); offStore(); offBar(); fb.destroy?.(); t.destroy(); };
}
