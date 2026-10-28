// Daily Card: one ranked list of today's best moves across every BetFriend tool,
// for the user's state, books and bankroll. Ranked by expected dollar value at your stake.
const CSS = `
.daily .welcome { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; background:var(--ink); color:#e8f2ec; border-radius:18px; padding:22px 24px; margin-bottom:18px; }
.daily .welcome h1 { color:#fff; }
.daily .welcome p { margin:6px 0 0; color:#b9d0c4; }
.daily .welcome .big { font:600 34px var(--serif); color:var(--lime); }
.daily .feed { display:flex; flex-direction:column; gap:10px; }
.daily .item { display:grid; grid-template-columns:34px minmax(0,1fr) auto; gap:14px; align-items:center; padding:14px 16px; }
.daily .rank { width:34px; height:34px; border-radius:10px; background:var(--panel); border:1px solid var(--line); display:grid; place-items:center; font-weight:700; }
.daily .item:nth-child(-n+3) .rank { background:var(--lime); color:var(--ink); border-color:var(--lime-2); }
.daily .item h3 { font:600 15px var(--sans); margin:3px 0; }
.daily .item .meta { display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:12.5px; color:var(--muted); }
.daily .val { text-align:right; }
.daily .val strong { display:block; font:600 20px var(--serif); color:var(--pos); }
.daily .val .row { justify-content:flex-end; margin-top:6px; }
.daily aside .stats { grid-template-columns:1fr 1fr; }
.daily aside .stat strong { font-size:19px; }
.daily .health div { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--line-2); }
@media (max-width:860px){ .daily .item { grid-template-columns:28px minmax(0,1fr); } .daily .val { grid-column:1/-1; text-align:left; display:flex; justify-content:space-between; align-items:center; } .daily .val .row { margin:0; flex-wrap:nowrap; } .daily .val strong { font-size:17px; } }
`;

const TOOLS = {
  arb: ['Arbitrage', 'arbitrage'], ev: ['Positive EV', 'positive-ev'], middle: ['Middle', 'middles'], promo: ['Promo', 'promo-converter'],
  boost: ['Profit Boost', 'boosts'], sharp: ['Sharp Money', 'sharp-money'], signal: ['Pro Bettor', 'bettor-signals'],
  pick: ['AI Pick', 'ai-picks'], pm: ['Prediction Market', 'prediction-traders'], exit: ['Exit Alert', 'exit-alerts'],
};
const safe = (fn) => { try { const v = fn(); return Array.isArray(v) ? v : []; } catch { return []; } };

export default function render(root, ctx) {
  const { api, store, ui, odds } = ctx;
  if (!document.getElementById('css-daily')) document.head.insertAdjacentHTML('beforeend', `<style id="css-daily">${CSS}</style>`);
  let filter = 'all';

  function collect() {
    const s = store.get();
    const books = s.books;
    const items = [];
    const kellyStake = (p, price) => Math.min(s.bankroll * 0.05, s.bankroll * odds.kelly(p, price, s.kellyMult));

    for (const a of api.arbs({ books }).slice(0, 6)) {
      const r = odds.arbStakes(a.legs.map((l) => l.price), s.arbStake);
      items.push({ tool: 'arb', title: `${a.label}: ${a.event}`, sub: a.legs.map((l) => `${ui.book(l.book)} ${ui.price(l.price)}`).join(' + '),
        value: r.profit, valueLabel: `${odds.money(r.profit)} locked`, edge: a.edge, live: a.live, bookId: a.legs[0].book, sport: a.sport });
    }
    for (const e of api.ev({ books, minEdge: 0.02 }).slice(0, 8)) {
      const stake = kellyStake(e.meta.fairProb, e.legs[0].price);
      items.push({ tool: 'ev', title: `${e.legs[0].outcome} ${ui.esc(e.market === 'Player Prop' ? e.label : '')}`.trim(), sub: `${e.event} · ${ui.book(e.legs[0].book)} ${ui.price(e.legs[0].price)}`,
        value: stake * e.edge, valueLabel: `Bet ${odds.money(stake, 0)}`, edge: e.edge, live: e.live, bookId: e.legs[0].book, sport: e.sport });
    }
    for (const m of api.middles({ books }).slice(0, 3)) {
      items.push({ tool: 'middle', title: `${m.label} middle ${m.meta.low}–${m.meta.high}`, sub: `${m.event} · ${m.legs.map((l) => `${ui.book(l.book)} ${ui.price(l.price)}`).join(' + ')}`,
        value: s.arbStake * (m.meta.middleProb * 0.95 + (1 - m.meta.middleProb) * m.edge), valueLabel: `${m.meta.width}-pt window`, edge: m.edge, live: m.live, bookId: m.legs[0].book, sport: m.sport });
    }
    for (const p of safe(() => api.promos.promos?.({ state: s.state })).filter((p) => !p.claimed && books.includes(p.book)).slice(0, 5)) {
      items.push({ tool: 'promo', title: p.title, sub: `${ui.book(p.book)} · ${ui.esc(p.type)}${p.expires ? ` · expires ${ui.when(p.expires)}` : ''}`,
        value: p.estValue || 0, valueLabel: `${odds.money(p.estValue || 0, 0)} cash value`, bookId: p.book, href: `promo-converter?promo=${p.id}` });
    }
    for (const b of safe(() => api.promos.boosts?.({ state: s.state })).slice(0, 3)) {
      items.push({ tool: 'boost', title: b.selection, sub: `${ui.book(b.book)} ${ui.price(b.originalPrice)} → ${ui.price(b.boostedPrice, { best: true })}`,
        value: (b.maxStake || 25) * (b.boostPct || 0.25) * 0.5, valueLabel: `Boost ${Math.round((b.boostPct || 0) * 100)}%`, bookId: b.book });
    }
    for (const x of safe(() => api.sharp.spikes?.({})).slice(0, 5)) {
      items.push({ tool: 'sharp', title: x.selection, sub: `${ui.book(x.exchange)} ${x.spikeX ? `${Number(x.spikeX).toFixed(1)}× volume` : 'volume spike'} → best ${x.bestBook ? ui.book(x.bestBook) : ''} ${x.bestPrice ? ui.price(x.bestPrice) : ''}`,
        value: (x.recommendedStake || s.unit) * (x.edge || 0.03), valueLabel: `Bet ${odds.money(x.recommendedStake || s.unit, 0)}`, edge: x.edge, bookId: x.bestBook, sport: x.sport, live: x.live });
    }
    const bettors = Object.fromEntries(safe(() => api.bettors.bettors?.()).map((b) => [b.id, b]));
    for (const g of safe(() => api.bettors.signals?.({})).slice(0, 4)) {
      const who = bettors[g.bettorId];
      items.push({ tool: 'signal', title: g.selection, sub: `${ui.esc(who?.handle || 'Pro bettor')}${who?.record ? ` · ${(who.record.roi * 100).toFixed(1)}% ROI` : ''} · now ${g.bestBookNow ? ui.book(g.bestBookNow) : ''} ${g.bestPriceNow ? ui.price(g.bestPriceNow) : ''}`,
        value: (g.stakeUnits || 1) * s.unit * 0.04 * (g.confidence || 0.6), valueLabel: `${g.stakeUnits || 1}u`, bookId: g.bestBookNow });
    }
    for (const p of safe(() => api.picks.picks?.({})).filter((p) => /A/.test(p.grade || '')).slice(0, 5)) {
      items.push({ tool: 'pick', title: p.selection, sub: `Grade ${ui.esc(p.grade)} · model ${odds.pct(p.modelProb || 0)} vs market ${odds.pct(p.marketProb || 0)} · ${p.bestBook ? ui.book(p.bestBook) : ''} ${p.bestPrice ? ui.price(p.bestPrice) : ''}`,
        value: (p.stakeUnits || 1) * s.unit * (p.edge || 0.03), valueLabel: `${p.stakeUnits || 1}u`, edge: p.edge, bookId: p.bestBook });
    }
    const markets = Object.fromEntries(safe(() => api.prediction.markets?.({})).map((m) => [m.id, m]));
    for (const r of safe(() => api.prediction.recommendations?.({})).filter((r) => r.status !== 'closed').slice(0, 4)) {
      const m = markets[r.marketId];
      items.push({ tool: 'pm', title: `${r.side} · ${m?.title || 'Contract'}`, sub: `${m ? ui.book(m.venue) : ''} entry ${r.entryPrice}¢ · now ${r.currentPrice}¢ · confidence ${Math.round((r.confidence || 0) * 100)}%`,
        value: (r.sizing || s.unit) * 0.05 * (r.confidence || 0.6), valueLabel: `Bet ${odds.money(r.sizing || s.unit, 0)}`, bookId: m?.venue });
    }
    for (const x of safe(() => api.prediction.exitAlerts?.()).slice(0, 2)) {
      items.push({ tool: 'exit', title: `${x.action}: ${markets[x.marketId]?.title || 'position'}`, sub: `${ui.esc(x.reason)} · ${x.entry}¢ → ${x.now}¢`,
        value: Math.abs(x.pnlPct || 0) * 100, valueLabel: `${x.pnlPct >= 0 ? '+' : ''}${Math.round((x.pnlPct || 0) * 100)}%`, bookId: markets[x.marketId]?.venue });
    }
    // Rank by value, with a diversity decay so one tool can't fill the whole top of the card.
    const seen = {};
    return items
      .sort((a, b) => b.value - a.value)
      .map((i) => { const k = (seen[i.tool] = (seen[i.tool] || 0) + 1) - 1; return { ...i, score: i.value / (1 + 1.5 * k) }; })
      .sort((a, b) => b.score - a.score);
  }

  function draw() {
    const s = store.get();
    const all = collect();
    const items = filter === 'all' ? all : all.filter((i) => i.tool === filter);
    const total = all.reduce((a, i) => a + (i.tool === 'exit' ? 0 : i.value), 0);
    const health = safe(() => Object.entries(api.tracker.health()));
    const sum = api.tracker.summary();
    const counts = all.reduce((a, i) => ((a[i.tool] = (a[i.tool] || 0) + 1), a), {});
    root.innerHTML = `<div class="daily">
      <section class="welcome">
        <div><h1>Today's Daily Card</h1><p>Every arb, +EV bet, promo, sharp move, pro signal, AI pick and prediction-market trade, ranked for your books in ${ui.esc(s.state)}.</p></div>
        <div style="text-align:right"><div class="big">${odds.money(total, 0)}</div><small style="color:#b9d0c4">expected value across ${all.length} moves at your stakes</small></div>
      </section>
      <div class="split">
        <div>
          <div class="chips" style="margin-bottom:12px">
            <button class="chip ${filter === 'all' ? 'on' : ''}" data-f="all">All · ${all.length}</button>
            ${Object.entries(TOOLS).filter(([k]) => counts[k]).map(([k, [label]]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${label} · ${counts[k]}</button>`).join('')}
          </div>
          <div class="feed">${items.map((i, n) => `
            <article class="card item">
              <div class="rank">${n + 1}</div>
              <div style="min-width:0">
                <div class="meta">${ui.tag(TOOLS[i.tool][0], i.tool === 'arb' || i.tool === 'promo' ? 'dark' : '')} ${i.sport ? ui.sport(i.sport) : ''} ${i.live ? ui.liveDot() : ''} ${i.edge !== undefined ? ui.edge(i.edge) : ''}</div>
                <h3>${i.title}</h3>
                <div class="meta">${i.sub}</div>
              </div>
              <div class="val"><strong>${i.valueLabel}</strong><div class="row">
                <a class="btn sm" href="#/${i.href || TOOLS[i.tool][1]}">Open</a>
                ${i.bookId ? ui.betBtn(i.bookId) : ''}</div></div>
            </article>`).join('') || ui.empty('No moves for this filter right now.')}</div>
        </div>
        <aside class="stack">
          <section class="card pad">
            <h3 style="margin-bottom:10px">Your betting</h3>
            ${ui.stats([
              { label: 'Profit', value: odds.money(sum.pnl, 0), tone: sum.pnl >= 0 ? 'pos' : 'neg' },
              { label: 'ROI', value: odds.pct(sum.roi), tone: sum.roi >= 0 ? 'pos' : 'neg' },
              { label: 'Avg CLV', value: odds.pct(sum.clv, 2), tone: sum.clv >= 0 ? 'pos' : 'neg' },
              { label: 'Open bets', value: String(sum.open) },
            ])}
            <a class="btn sm block" href="#/tracker">Open Bet Tracker</a>
          </section>
          <section class="card pad health">
            <h3 style="margin-bottom:6px">Account health</h3>
            ${health.filter(([id]) => s.books.includes(id)).map(([id, h]) => `<div>${ui.book(id, { full: true })}<span>${ui.tag(h.status === 'healthy' ? 'Healthy' : h.status === 'limited' ? `Limited · max $${h.maxStake}` : 'Restricted', h.status === 'healthy' ? 'pos' : h.status === 'limited' ? 'warn' : 'neg')}</span></div>`).join('')}
          </section>
          <section class="card pad">
            <h3>Unlock every tool</h3>
            <p class="muted">All-Access includes every tool on this card for one price.</p>
            <a class="btn primary block" href="#/pricing">See plans</a>
          </section>
        </aside>
      </div></div>`;
    root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; draw(); }));
    ui.wireBetButtons(root);
  }

  draw();
  let n = 0;
  const offTick = api.onTick(() => { if (++n % 4 === 0) draw(); }); // refresh every ~16s
  const offStore = store.subscribe(draw);
  return () => { offTick(); offStore(); };
}
