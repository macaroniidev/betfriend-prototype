// Fair Odds Builder: build your own fair-odds formula (reference books, weights, devig method)
// and preview the +EV bets it finds against the default formula.

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

const CSS = `
.evb .evb-grid { display:grid; grid-template-columns:390px minmax(0,1fr); gap:16px; align-items:start; }
.evb .evb-form { position:sticky; top:72px; }
.evb .evb-sec { padding:14px 16px; border-bottom:1px solid var(--line-2); }
.evb .evb-sec:last-child { border-bottom:0; }
.evb .evb-sec h3 { font-size:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.evb .ref { display:grid; grid-template-columns:auto minmax(0,1fr) 46px; gap:4px 10px; align-items:center; padding:7px 0; }
.evb .ref .rn { display:flex; gap:8px; align-items:center; min-width:0; }
.evb .ref .rn small { color:var(--muted); font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.evb .ref input[type=range] { grid-column:1 / span 2; width:100%; accent-color:var(--accent); margin:0; }
.evb .ref .w { grid-column:3; grid-row:1 / span 2; text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
.evb .ref.off .rn, .evb .ref.off .w { opacity:.45; }
.evb .shares { display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--line); margin-top:6px; }
.evb .shares i { display:block; height:100%; }
.evb .mdesc { font-size:12.5px; color:var(--muted); margin:8px 0 0; }
.evb .evb-cmp { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; }
.evb .evb-cmp .stat strong { font-size:28px; }
.evb .evb-cmp .stat.mine { background:var(--ink); border-color:var(--ink); }
.evb .evb-cmp .stat.mine span, .evb .evb-cmp .stat.mine small { color:#9fc0b0; }
.evb .evb-cmp .stat.mine strong { color:var(--lime); }
.evb .ex .t td, .evb .ex .t th { padding:6px 8px; font-size:12.5px; }
.evb .delta { font-size:12px; font-weight:600; }
.evb .sel-name { font-weight:600; } .evb .sel-sub { font-size:12px; color:var(--muted); }
.evb .tag.new { background:var(--lime); color:var(--ink); border-color:transparent; }
@media (max-width:1100px){ .evb .evb-grid { grid-template-columns:1fr; } .evb .evb-form { position:static; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds } = ctx;
  if (!document.getElementById('css-ev-builder')) document.head.insertAdjacentHTML('beforeend', `<style id="css-ev-builder">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };

  const fromStore = () => Object.fromEntries(REF_BOOKS.map(([b]) => [b, (store.get().sharpRefs || []).includes(b) ? 100 : 0]));
  let weights = fromStore();
  try { const saved = JSON.parse(localStorage.getItem(W_KEY) || 'null'); if (saved && typeof saved === 'object') weights = { ...weights, ...saved }; } catch { /* ignore */ }
  const st = { method: store.get().devigMethod || 'multiplicative', minEv: 1, market: 'All', live: false, limit: 40 };

  root.innerHTML = `<div class="evb">
    ${ui.header({ title: 'Fair Odds Builder', subtitle: 'Build your own fair-odds formula: pick the sharp books you trust, weight them, choose how the vig comes out, and see every +EV bet your formula finds in real time.', tool: 'ev-builder',
      actions: '<button class="btn" id="evb-reset">Reset</button><button class="btn primary" id="evb-save">Save as my default</button>' })}
    <div class="evb-grid">
      <aside class="card evb-form">
        <div class="evb-sec"><h3>Reference books <span class="muted" style="font:12px var(--sans)">weight</span></h3><div id="evb-refs"></div><div class="shares" id="evb-shares"></div></div>
        <div class="evb-sec"><h3>Devig method</h3>${ui.seg('method', Object.entries(METHOD_INFO).map(([k, [l]]) => [k, l]), st.method)}<p class="mdesc" id="evb-mdesc"></p></div>
        <div class="evb-sec"><h3>Filters</h3><div class="toolbar" style="margin:0">
          ${ui.numberInput('minev', st.minEv, 'Min EV %', { step: 0.5, min: 0 })}
          ${ui.select('market', MARKETS, st.market, 'Market')}
          <div class="field"><span>Board</span>${ui.seg('board', [['pre', 'Pre-match'], ['live', 'Live']], 'pre')}</div></div></div>
        <div class="evb-sec ex"><h3>How your formula prices a line</h3><div id="evb-ex"></div></div>
      </aside>
      <div>
        <div class="evb-cmp" id="evb-cmp" style="margin-bottom:16px"></div>
        <div id="evb-stats"></div>
        <div class="card"><header><h3>Live preview · bets your formula finds</h3><span class="muted" id="evb-note" style="font-size:12.5px"></span></header><div id="evb-table"></div></div>
      </div>
    </div></div>`;
  const $ = (s) => root.querySelector(s);
  const books = () => store.get().books;
  const active = () => Object.entries(weights).filter(([, w]) => w > 0);

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
    const f = { books: books(), minEdge: st.minEv / 100, market: st.market, live: st.live };
    if (act.length && act.every(([, w]) => w === act[0][1])) return api.ev({ ...f, refs: act.map(([b]) => b), method: fn });
    const out = [];
    for (const line of api.lines({ market: st.market, live: st.live })) {
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
    $('#evb-refs').querySelectorAll('[data-ref]').forEach((inp) => inp.addEventListener('input', (e) => {
      weights[inp.dataset.ref] = Number(e.target.value);
      const t = active().reduce((a, [, w]) => a + w, 0) || 1;
      $('#evb-refs').querySelectorAll('[data-w]').forEach((el) => {
        const w = weights[el.dataset.w];
        el.textContent = w ? `${Math.round((w / t) * 100)}%` : 'Off';
        el.closest('.ref').classList.toggle('off', !w);
      });
      drawShares();
      update();
    }));
  }
  function drawShares() {
    $('#evb-shares').innerHTML = active().map(([b, w]) => `<i style="flex:${w};background:${api.bookById[b].color}" title="${api.bookById[b].name}"></i>`).join('');
  }

  function drawExample() {
    const fn = methods[st.method];
    const line = api.lines({ market: st.market === 'All' ? 'Moneyline' : st.market, live: st.live })
      .find((l) => active().filter(([b]) => l.prices[b]).length >= Math.min(2, active().length)) || api.lines({ market: 'Moneyline' })[0];
    if (!line) { $('#evb-ex').innerHTML = ''; return; }
    const act = active().filter(([b]) => line.prices[b]);
    const tot = act.reduce((a, [, w]) => a + w, 0) || 1;
    const fair = weightedFair(line, fn);
    const e = api.eventById(line.eventId);
    const short = (s) => (s.length > 14 ? `${s.split(' ').slice(-1)[0]}` : s);
    $('#evb-ex').innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:6px">${ui.esc(e.away)} @ ${ui.esc(e.home)} · ${ui.esc(line.label)}</div>
      <table class="t"><thead><tr><th>Book</th><th class="num-cell">Wt</th>${line.outcomes.map((o) => `<th class="num-cell">${ui.esc(short(o))}</th>`).join('')}</tr></thead><tbody>
      ${act.map(([b, w]) => { const f = fn(line.prices[b].map(odds.impliedProb)); return `<tr><td>${ui.book(b)}</td><td class="num-cell">${Math.round((w / tot) * 100)}%</td>${line.prices[b].map((p, i) => `<td class="num-cell mono">${odds.fmtAmerican(p)}<br><span class="muted">${odds.pct(f[i])}</span></td>`).join('')}</tr>`; }).join('')}
      <tr style="background:color-mix(in srgb, var(--lime) 30%, transparent)"><td><strong>Fair</strong></td><td></td>${fair.map((p) => `<td class="num-cell mono"><strong>${odds.fmtAmerican(odds.probToAmerican(p))}</strong><br><span class="muted">${odds.pct(p)}</span></td>`).join('')}</tr></tbody></table>`;
  }

  function update() {
    const mine = findMine();
    const def = api.ev({ books: books(), minEdge: st.minEv / 100, market: st.market, live: st.live });
    const defMap = new Map(def.map((o) => [o.id, o]));
    const diff = mine.length - def.length;
    const avg = (arr) => (arr.length ? arr.reduce((a, o) => a + o.edge, 0) / arr.length : 0);
    const onlyMine = mine.filter((o) => !defMap.has(o.id)).length;
    $('#evb-cmp').innerHTML = `<div class="stat mine"><span>Your formula finds</span><strong>${mine.length}</strong><small>+EV bets · avg +${(avg(mine) * 100).toFixed(2)}%</small></div>
      <div class="stat"><span>Default formula finds</span><strong>${def.length}</strong><small>Circa + Novig + ProphetX · multiplicative · <span class="delta" style="color:${diff >= 0 ? 'var(--pos)' : 'var(--neg)'}">${diff >= 0 ? '+' : ''}${diff} with yours</span></small></div>`;
    $('#evb-stats').innerHTML = ui.stats([
      { label: 'Only your formula finds', value: onlyMine, tone: 'pos', note: 'Bets the default misses' },
      { label: 'Top edge', value: mine[0] ? `+${(mine[0].edge * 100).toFixed(2)}%` : '—', tone: 'pos', note: mine[0] ? ui.esc(mine[0].legs[0].outcome) : '' },
      { label: 'Games covered', value: new Set(mine.map((o) => o.eventId)).size, note: `${active().length} reference book${active().length === 1 ? '' : 's'}` },
    ]);
    $('#evb-note').textContent = `${METHOD_INFO[st.method][0]} devig · min EV ${st.minEv}% · ${st.live ? 'live' : 'pre-match'}`;
    const shown = mine.slice(0, st.limit);
    $('#evb-table').innerHTML = shown.length ? `<div class="table-wrap"><table class="t stack-sm"><thead><tr><th>Your EV</th><th class="num-cell">Default EV</th><th>Bet</th><th>Book · price</th><th class="num-cell">Your fair</th><th></th></tr></thead><tbody>
      ${shown.map((o) => {
        const leg = o.legs[0];
        const d = defMap.get(o.id);
        return `<tr><td data-label="Your EV">${ui.edge(o.edge)}</td>
          <td class="num-cell" data-label="Default EV">${d ? `<span class="muted">+${(d.edge * 100).toFixed(2)}%</span>` : ui.tag('Only yours', 'new')}</td>
          <td data-label="Bet"><div><div class="sel-name">${ui.esc(leg.outcome)} <span class="muted" style="font-weight:400;font-size:12px">${o.label === o.market ? ui.esc(o.market) : ui.esc(o.label)}</span></div>
            <div class="sel-sub">${o.live ? `${ui.liveDot()} ` : ''}${ui.esc(o.sport)} · ${ui.esc(o.event)} · ${ui.when(o.start)}</div></div></td>
          <td data-label="Book · price"><span style="white-space:nowrap">${ui.book(leg.book)} ${ui.price(leg.price, { best: true })}</span></td>
          <td class="num-cell mono" data-label="Your fair">${odds.fmtAmerican(odds.probToAmerican(o.meta.fairProb))}</td>
          <td data-label="">${ui.betBtn(leg.book)}</td></tr>`;
      }).join('')}</tbody></table></div>
      ${mine.length > st.limit ? `<div style="padding:12px;text-align:center"><button class="btn" id="evb-more">Show more (${mine.length - st.limit})</button></div>` : ''}`
      : ui.empty('Your formula finds no bets at this threshold. Lower min EV or add a reference book.');
    ui.wireBetButtons($('#evb-table'));
    $('#evb-more')?.addEventListener('click', () => { st.limit += 40; update(); });
    $('#evb-mdesc').textContent = METHOD_INFO[st.method][1];
    drawExample();
  }

  // ---------- wiring ----------
  ui.onSeg(root, 'method', (v) => {
    st.method = v;
    root.querySelectorAll('[data-seg="method"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    update();
  });
  ui.onSeg(root, 'board', (v) => {
    st.live = v === 'live';
    root.querySelectorAll('[data-seg="board"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    update();
  });
  ui.onNumber(root, 'minev', (v) => { st.minEv = v; update(); });
  ui.onSelect(root, 'market', (v) => { st.market = v; update(); });
  $('#evb-save').addEventListener('click', () => {
    const refs = active().map(([b]) => b);
    if (!refs.length) { ui.toast('Add at least one reference book'); return; }
    try { localStorage.setItem(W_KEY, JSON.stringify(weights)); } catch { /* ignore */ }
    store.set({ sharpRefs: refs, devigMethod: st.method });
    ui.toast('Saved. Positive EV, Sportsbook Screen and Parlay Builder now price with your formula.');
  });
  $('#evb-reset').addEventListener('click', () => {
    weights = Object.fromEntries(REF_BOOKS.map(([b]) => [b, ['circa', 'novig', 'px'].includes(b) ? 100 : 0]));
    st.method = 'multiplicative';
    root.querySelectorAll('[data-seg="method"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.method));
    drawRefs(); update();
  });

  drawRefs();
  update();
  const offTick = api.onTick(() => update());
  const offStore = store.subscribe(() => update());
  return () => { offTick(); offStore(); };
}
