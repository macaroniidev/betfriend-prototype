// AI Market Picks: model fair probability vs market price on Kalshi, Polymarket, ProphetX and Novig,
// graded with reasons and sized from your bankroll, plus a cross-venue price comparison per contract.

const CSS = `
.pmp .top3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.pmp .pick { padding: 16px; display: grid; gap: 10px; align-content: start; }
.pmp .pick .hd { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
.pmp .grade { margin-left: auto; font: 700 15px var(--serif); width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--lime); color: var(--ink); flex: none; }
.pmp .grade.B, .pmp .grade.C { background: var(--panel); color: var(--text); border: 1px solid var(--line); }
.pmp .pick h3 { font: 600 16px var(--sans); }
.pmp .pside { font: 700 11px var(--sans); padding: 2px 7px; border-radius: 6px; margin-right: 4px; }
.pmp .pside.YES { background: var(--pos-bg); color: var(--pos); } .pmp .pside.NO { background: var(--neg-bg); color: var(--neg); }
.pmp .vs { display: grid; gap: 5px; font-size: 12.5px; }
.pmp .vs .ln { display: grid; grid-template-columns: 74px minmax(0, 1fr) 40px; gap: 8px; align-items: center; }
.pmp .vs .ln b { text-align: right; font-variant-numeric: tabular-nums; }
.pmp .vs .track { height: 8px; border-radius: 4px; background: var(--line-2); overflow: hidden; }
.pmp .vs .track i { display: block; height: 100%; border-radius: 4px; }
.pmp .vs .mdl i { background: var(--accent); } .pmp .vs .mkt i { background: var(--muted); opacity: .6; }
.pmp ul.why { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--muted); display: grid; gap: 3px; }
.pmp .foot { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--line-2); padding-top: 10px; }
.pmp .foot .stake { margin-right: auto; font-size: 11.5px; color: var(--muted); }
.pmp .foot .stake strong { display: block; color: var(--text); font: 600 18px var(--serif); }
.pmp .r { text-align: right; font-variant-numeric: tabular-nums; }
.pmp .ttl { font-weight: 600; } .pmp .sub { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.pmp td.why2 { font-size: 12px; color: var(--muted); max-width: 300px; }
.pmp .acts { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.pmp .cmp td.vc { text-align: center; font-family: var(--mono); font-weight: 600; white-space: nowrap; }
.pmp .cmp td.vc.best span { background: var(--lime); color: var(--ink); border-radius: 6px; padding: 2px 7px; }
.pmp .cmp td.vc .na { color: var(--muted); font-weight: 400; }
.pmp .cmp td.vc button { border: 0; background: none; font: inherit; color: inherit; cursor: pointer; padding: 0; }
.pmp .cmp td.vc small { display: block; font: 500 11px var(--sans); color: var(--muted); }
.pmp .cmp th.vc { text-align: center; }
.pmp .save { font-size: 12px; color: var(--pos); font-weight: 600; }
.pmp section.card > header h2 { font-size: 18px; }
.pmp section.card > header p { margin: 3px 0 0; color: var(--muted); font-size: 12.5px; }
@media (max-width: 1100px) { .pmp .top3 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 860px) {
  .pmp td.why2 { max-width: none; }
  .pmp .acts { justify-content: flex-end; }
  .pmp .cmp td.vc { text-align: right; }
  .pmp section.card > header { flex-wrap: wrap; }
}`;

export default function render(root, ctx) {
  const { api, ui, store, odds } = ctx;
  const pm = api.prediction;
  if (!document.getElementById('css-pm-picks')) {
    const s = document.createElement('style'); s.id = 'css-pm-picks'; s.textContent = CSS; document.head.appendChild(s);
  }
  const st = { venue: 'All', category: 'All', side: 'YES', minGrade: 'All' };
  const GR = { 'A+': 5, A: 4, 'B+': 3, B: 2, 'C+': 1 };

  root.innerHTML = `<div class="pmp">
    ${ui.header({ title: 'AI Market Picks', tool: 'pm-picks',
      subtitle: 'AI prediction market picks. Our model prices every contract on Kalshi, Polymarket, ProphetX and Novig, compares it with the live market price and the sportsbook board, and tells you what to buy, where it is cheapest and how much to stake.',
      actions: `<span class="tag pos">${ui.liveDot()} Re-priced every tick</span>` })}
    <div class="toolbar">
      ${ui.select('venue', [['All', 'All venues'], ...pm.VENUES.map((v) => [v, pm.VENUE_NAMES[v]])], st.venue, 'Venue')}
      ${ui.select('grade', [['All', 'All grades'], ['A', 'A and up'], ['B+', 'B+ and up']], st.minGrade, 'Grade')}
      <div class="field"><span>Category</span>${ui.seg('cat', ['All', ...pm.CATEGORIES], st.category)}</div>
    </div>
    <div data-stats></div>
    <div class="top3" data-top></div>
    <section class="card" style="margin-bottom:16px">
      <header><div><h2>All AI picks</h2><p>Model probability vs market price, edge, grade and optimal stake from your bankroll.</p></div></header>
      <div class="table-wrap"><table class="t stack-sm" data-table></table></div>
    </section>
    <section class="card cmp">
      <header><div><h2>Cross-venue price comparison</h2><p>The same outcome priced on every venue and the best sportsbook. Cheapest venue highlighted.</p></div>${ui.seg('side', [['YES', 'YES price'], ['NO', 'NO price']], st.side)}</header>
      <div class="table-wrap"><table class="t stack-sm" data-cmp></table></div>
    </section>
  </div>`;

  let picks = [];
  const gradeOk = (g) => st.minGrade === 'All' || GR[g] >= GR[st.minGrade];
  const compute = () => { picks = pm.aiPicks({ venue: st.venue, category: st.category }).filter((p) => gradeOk(p.grade)); };

  function vsBars(p) {
    return `<div class="vs"><div class="ln mdl"><span>Model</span><span class="track"><i style="width:${(p.modelProb * 100).toFixed(1)}%"></i></span><b>${Math.round(p.modelProb * 100)}%</b></div>
      <div class="ln mkt"><span>Market</span><span class="track"><i style="width:${p.marketPrice}%"></i></span><b>${p.marketPrice}¢</b></div></div>`;
  }
  const sub = (m) => `${ui.book(m.venue)} ${m.sport ? ui.sport(m.sport) : ui.tag(m.category)} <span>${ui.esc(m.kind)}</span> ${m.live ? ui.liveDot() : ''}`;
  const openBtn = (p, cls = 'primary') => `<button class="btn sm ${cls}" data-open="${p.marketId}" data-side="${p.side}" data-stake="${p.stake}">Open in ${pm.VENUE_NAMES[p.market.venue]} ↗</button>`;

  function renderAll() {
    compute();
    const bank = store.get().bankroll;
    const totStake = picks.slice(0, 10).reduce((a, p) => a + p.stake, 0);
    const venues = {};
    picks.forEach((p) => { venues[p.market.venue] = (venues[p.market.venue] || 0) + 1; });
    const topV = Object.entries(venues).sort((a, b) => b[1] - a[1])[0];
    root.querySelector('[data-stats]').innerHTML = ui.stats([
      { label: 'Live AI picks', value: picks.length, note: `${picks.filter((p) => GR[p.grade] >= 4).length} graded A or better` },
      { label: 'Average edge', value: picks.length ? `+${(picks.reduce((a, p) => a + p.edge, 0) / picks.length * 100).toFixed(1)}¢` : '—', note: 'model fair minus price, per contract', tone: 'pos' },
      { label: 'Stake on top 10', value: ui.money(totStake, 0), note: `${ui.pct(totStake / bank, 0)} of ${ui.money(bank, 0)} · Kelly-sized` },
      { label: 'Cheapest venue most often', value: topV ? pm.VENUE_NAMES[topV[0]] : '—', note: topV ? `${topV[1]} of ${picks.length} picks` : '' },
    ]);
    root.querySelector('[data-top]').innerHTML = picks.slice(0, 3).map((p) => `<article class="card pick">
      <div class="hd">${sub(p.market)}<span class="grade ${p.grade[0]}">${p.grade}</span></div>
      <h3><span class="pside ${p.side}">${p.side}</span>${ui.esc(p.market.title)}</h3>
      ${vsBars(p)}
      <div class="row">${ui.edge(p.edge, { label: 'Edge' })} <span class="muted" style="font-size:12px">EV ${ui.money((p.edge / (p.marketPrice / 100)) * p.stake, 2)} on the stake</span></div>
      <ul class="why">${p.reasons.map((r) => `<li>${ui.esc(r)}</li>`).join('')}</ul>
      <div class="foot"><div class="stake">Stake<strong>${ui.money(p.stake, 0)}</strong>${p.contracts.toLocaleString()} contracts @ ${p.marketPrice}¢</div>
        ${openBtn(p)}<button class="btn sm ghost" data-log="${p.id}">Log</button></div></article>`).join('') || ui.empty('No picks for these filters.');
    root.querySelector('[data-table]').innerHTML = `<thead><tr><th>Contract</th><th>Pick</th><th class="r">Model</th><th class="r">Price</th><th class="r">Edge</th><th>Grade</th><th>Why</th><th class="r">Stake</th><th></th></tr></thead><tbody>
      ${picks.map((p) => `<tr><td data-label="Contract"><div class="ttl">${ui.esc(p.market.title)}</div><div class="sub">${sub(p.market)}</div></td>
        <td data-label="Pick"><span class="pside ${p.side}">${p.side}</span></td>
        <td class="r" data-label="Model">${(p.modelProb * 100).toFixed(1)}%</td>
        <td class="r mono" data-label="Price">${p.marketPrice}¢</td>
        <td class="r" data-label="Edge">${ui.edge(p.edge)}</td>
        <td data-label="Grade"><b>${p.grade}</b> ${ui.meter(p.confidence)}</td>
        <td class="why2" data-label="Why">${ui.esc(p.reasons[0])}</td>
        <td class="r" data-label="Stake"><b>${ui.money(p.stake, 0)}</b><div class="muted" style="font-size:11.5px">${p.contracts.toLocaleString()} ct</div></td>
        <td data-label=""><div class="acts">${openBtn(p, '')}<button class="btn sm ghost" data-log="${p.id}">Log</button></div></td></tr>`).join('')}</tbody>`;
    renderCompare();
  }

  function renderCompare() {
    const keys = [...new Set(picks.map((p) => p.key))].slice(0, 18);
    const rows = keys.map((k) => pm.compare(k)).filter(Boolean);
    const vs = st.venue === 'All' ? pm.VENUES : [st.venue];
    root.querySelector('[data-cmp]').innerHTML = `<thead><tr><th>Contract (${st.side})</th>${vs.map((v) => `<th class="vc">${pm.VENUE_NAMES[v]}</th>`).join('')}<th class="vc">Sportsbook</th><th class="r">Model fair</th><th class="r">Save</th></tr></thead><tbody>
      ${rows.map((c) => {
        const price = (r) => (st.side === 'YES' ? r.yes : r.no);
        const best = st.side === 'YES' ? c.cheapestYes : c.cheapestNo;
        const worst = c.rows.reduce((a, b) => (price(b) > price(a) ? b : a));
        const fair = st.side === 'YES' ? c.fairProb : 1 - c.fairProb;
        const sb = c.sportsbook && st.side === 'YES' ? c.sportsbook : null;
        return `<tr><td data-label="Contract"><div class="ttl">${ui.esc(c.title)}</div><div class="sub">${c.sport ? ui.sport(c.sport) : ui.tag(c.category)}</div></td>
          ${vs.map((v) => { const r = c.rows.find((x) => x.venue === v); return `<td class="vc ${r && r.marketId === best.marketId ? 'best' : ''}" data-label="${pm.VENUE_NAMES[v]}">${r ? `<button type="button" data-open="${r.marketId}" data-side="${st.side}" title="Open in ${pm.VENUE_NAMES[v]}"><span>${price(r)}¢</span></button>` : '<span class="na">—</span>'}</td>`; }).join('')}
          <td class="vc" data-label="Sportsbook">${sb ? `${Math.round(sb.implied * 100)}¢<small>${ui.esc(api.bookById[sb.book].short)} ${ui.fmtAmerican(sb.american)}</small>` : '<span class="na">—</span>'}</td>
          <td class="r" data-label="Model fair">${(fair * 100).toFixed(1)}%</td>
          <td class="r" data-label="Save"><span class="save">${price(worst) - price(best)}¢ at ${ui.esc(api.bookById[best.venue].short)}</span></td></tr>`;
      }).join('')}</tbody>`;
  }

  root.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const d = pm.deepLink(o.dataset.open, o.dataset.side);
      ui.toast(`Opening ${d.name} · ${d.ticker} · Buy ${o.dataset.side} @ ${d.price}¢${o.dataset.stake ? ` · ${ui.money(+o.dataset.stake, 0)}` : ''}`);
      return;
    }
    const l = e.target.closest('[data-log]');
    if (l) {
      const p = picks.find((x) => x.id === l.dataset.log);
      if (!p) return;
      const m = p.market;
      ui.logBet({ kind: 'prediction', book: m.venue, sport: m.sport || m.category, market: 'Prediction', selection: `${m.title} · ${p.side} @ ${p.marketPrice}¢`, price: odds.probToAmerican(p.marketPrice / 100), stake: p.stake || 25 });
    }
  });
  ui.onSelect(root, 'venue', (v) => { st.venue = v; renderAll(); });
  ui.onSelect(root, 'grade', (v) => { st.minGrade = v; renderAll(); });
  ui.onSeg(root, 'cat', (v) => { st.category = v; root.querySelectorAll('[data-seg="cat"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); renderAll(); });
  ui.onSeg(root, 'side', (v) => { st.side = v; root.querySelectorAll('[data-seg="side"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); renderCompare(); });

  renderAll();
  let n = 0;
  const unsub = pm.subscribe(() => { if (++n % 2 === 0) renderAll(); else renderCompare(); });
  const unStore = store.subscribe(renderAll);
  return () => { unsub(); unStore(); };
}
