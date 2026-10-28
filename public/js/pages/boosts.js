// Profit Boosts: today's boosts with boosted vs fair odds, boost EV, and the hedge that locks profit.

const CSS = `
.bo .nw { white-space: nowrap; }
.bo .arrow { color: var(--muted); margin: 0 4px; }
.bo .strike { text-decoration: line-through; color: var(--muted); font-family: var(--mono); font-size: 12.5px; }
.bo .lock { font: 600 15px var(--serif); color: var(--pos); font-variant-numeric: tabular-nums; }
.bo .bo-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.bo .boostpct { background: var(--warn-bg); color: var(--warn); }
.bo-calc .callout.lime .book { background: rgba(255,255,255,.55); border-color: transparent; color: var(--ink); }
.bo-calc .grid { margin-bottom: 14px; }
.bo-calc .res { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.bo-calc .res > div { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--panel); }
.bo-calc .res span { display: block; font-size: 12px; color: var(--muted); }
.bo-calc .res strong { font: 600 20px var(--serif); font-variant-numeric: tabular-nums; }
@media (max-width: 860px) { .bo-calc .res { grid-template-columns: 1fr; } }`;

export default function render(root, { api, store, ui, odds }) {
  if (!document.getElementById('css-bo')) document.head.insertAdjacentHTML('beforeend', `<style id="css-bo">${CSS}</style>`);
  const P = api.promos;
  const F = { book: 'All', sport: 'All', mode: 'all' };

  root.innerHTML = `<div class="bo">
    ${ui.header({ title: 'Profit Boosts', tool: 'boosts',
      subtitle: 'Every boost posted today, priced against sharp fair odds. Hedge the other side at another book and lock the profit before kickoff.' })}
    <div id="bo-stats"></div>
    <div class="toolbar" id="bo-tools"></div>
    <section class="card" id="bo-table"></section></div>`;
  const $ = (s) => root.querySelector(s);
  let list = [];

  const load = () => { list = P.boosts({ state: store.get().state, books: store.get().books }); };
  const view = () => list.filter((b) => (F.book === 'All' || b.book === F.book) && (F.sport === 'All' || b.sport === F.sport)
    && (F.mode === 'all' || (F.mode === 'ev' ? b.ev > 0 : b.hedge && b.hedge.profit > 0)));

  function drawTools() {
    const books = [...new Set(list.map((b) => b.book))];
    const sports = [...new Set(list.map((b) => b.sport))];
    $('#bo-tools').innerHTML = `${ui.seg('mode', [['all', 'All boosts'], ['ev', '+EV only'], ['lock', 'Lockable profit']], F.mode)}
      ${ui.select('book', [['All', 'All books'], ...books.map((b) => [b, api.bookById[b].name])], F.book, 'Sportsbook')}
      ${ui.select('sport', ['All', ...sports], F.sport, 'Sport')}`;
    ui.onSeg($('#bo-tools'), 'mode', (v) => { F.mode = v; drawTools(); draw(); });
    ui.onSelect($('#bo-tools'), 'book', (v) => { F.book = v; draw(); });
    ui.onSelect($('#bo-tools'), 'sport', (v) => { F.sport = v; draw(); });
  }

  function draw() {
    const v = view();
    const lockable = list.filter((b) => b.hedge && b.hedge.profit > 0);
    const best = [...list].sort((a, b) => b.ev - a.ev)[0];
    $('#bo-stats').innerHTML = ui.stats([
      { label: 'Boosts today', value: String(list.length), note: `${new Set(list.map((b) => b.book)).size} books in ${store.get().state}` },
      { label: 'Positive EV', value: String(list.filter((b) => b.ev > 0).length), note: 'vs sharp fair odds' },
      { label: 'Profit you can lock', value: odds.money(lockable.reduce((a, b) => a + b.hedge.profit, 0)), tone: 'pos', note: `${lockable.length} hedgeable boosts at max stake` },
      { label: 'Best boost EV', value: best ? odds.pct(best.ev) : '—', tone: 'pos', note: best ? `${api.bookById[best.book].short} · ${ui.esc(best.title).slice(0, 26)}` : '' },
    ]);
    $('#bo-table').innerHTML = v.length ? `<table class="t stack-sm"><thead><tr><th>Boost</th><th>Book</th><th>Odds</th><th class="num-cell">Fair</th><th class="num-cell">Boost EV</th><th class="num-cell">Max stake</th><th>Hedge</th><th class="num-cell">Locked profit</th><th></th></tr></thead><tbody>
      ${v.map((b) => `<tr class="click" data-id="${b.id}">
        <td data-label="Boost"><div><div class="evt-name">${ui.esc(b.title)}</div><div class="bo-sub">${ui.esc(eventName(b.eventId))} · ${ui.sport(b.sport)}</div></div></td>
        <td data-label="Book">${ui.book(b.book)}</td>
        <td data-label="Odds"><div class="nw"><span class="strike">${odds.fmtAmerican(b.originalPrice)}</span><span class="arrow">→</span>${ui.price(b.boostedPrice, { best: true })} <span class="tag boostpct">+${Math.round(b.boostPct * 100)}%</span></div></td>
        <td data-label="Fair" class="num-cell"><span class="price">${odds.fmtAmerican(b.fairPrice)}</span></td>
        <td data-label="Boost EV" class="num-cell">${ui.edge(b.ev)}</td>
        <td data-label="Max stake" class="num-cell">${odds.money(b.maxStake, 0)}</td>
        <td data-label="Hedge">${b.hedge ? `<div><div class="leg">${ui.book(b.hedge.book)} ${ui.price(b.hedge.price)}</div><div class="bo-sub">${odds.money(b.hedge.stake)} on ${ui.esc(b.hedge.outcome)}</div></div>` : '<span class="muted">—</span>'}</td>
        <td data-label="Locked profit" class="num-cell">${b.hedge ? `<span class="lock" style="${b.hedge.profit < 0 ? 'color:var(--neg)' : ''}">${odds.money(b.hedge.profit)}</span>` : '—'}</td>
        <td data-label=""><button class="btn sm lime">Calculator</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="pad">${ui.empty('No boosts match these filters.')}</div>`;
    $('#bo-table').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openCalc(list.find((x) => x.id === tr.dataset.id))));
  }
  const eventName = (id) => { const e = api.eventById(id); return e ? `${e.away} @ ${e.home}` : ''; };

  function openCalc(b) {
    const C = { stake: b.maxStake, boosted: b.boostedPrice, hedge: b.hedge?.price ?? -110 };
    const body = ui.drawer('Boost calculator', `<div class="bo-calc">
      <div class="callout lime" style="margin-bottom:14px"><strong>${ui.esc(b.title)}</strong><div style="font-size:12.5px;margin-top:4px">${ui.esc(eventName(b.eventId))} · ${ui.book(b.book, { full: true })} boosted ${odds.fmtAmerican(b.originalPrice)} → ${odds.fmtAmerican(b.boostedPrice)}</div></div>
      <div class="grid g3">
        ${ui.numberInput('stake', C.stake, `Stake (max ${odds.money(b.maxStake, 0)})`, { prefix: '$', step: 5 })}
        ${ui.numberInput('boosted', C.boosted, 'Boosted odds', { step: 5, min: -10000 })}
        ${ui.numberInput('hedge', C.hedge, 'Hedge odds', { step: 5, min: -10000 })}
      </div>
      <div id="bo-out"></div>
      <div class="row" style="margin-top:6px">${ui.betBtn(b.book, 'Boost at')} ${b.hedge ? ui.betBtn(b.hedge.book, 'Hedge at') : ''}</div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="bo-log">Log both bets</button><button class="btn" id="bo-ride">Log boost only</button></div></div>`);
    const out = () => {
      const h = odds.boostHedge(C.stake, C.boosted, C.hedge);
      const ride = C.stake * odds.ev(b.fairProb, C.boosted);
      body.querySelector('#bo-out').innerHTML = `<div class="res">
        <div><span>Hedge stake ${b.hedge ? `at ${api.bookById[b.hedge.book].short}` : ''}</span><strong>${odds.money(h.hedgeStake)}</strong></div>
        <div><span>Locked profit (either result)</span><strong style="color:${h.profit >= 0 ? 'var(--pos)' : 'var(--neg)'}">${odds.money(h.profit)}</strong></div>
        <div><span>Return on cash outlay</span><strong>${odds.pct(h.profit / (C.stake + h.hedgeStake))}</strong></div>
        <div><span>Let it ride: expected value</span><strong>${odds.money(ride)}</strong></div></div>
        <dl class="kv"><dt>Boost wins</dt><dd>${odds.money(C.stake * (odds.toDecimal(C.boosted) - 1) - h.hedgeStake)}</dd>
        <dt>Hedge wins</dt><dd>${odds.money(h.hedgeStake * (odds.toDecimal(C.hedge) - 1) - C.stake)}</dd>
        <dt>Fair odds (sharp)</dt><dd>${odds.fmtAmerican(b.fairPrice)}</dd><dt>Boost EV</dt><dd>${odds.pct(odds.ev(b.fairProb, C.boosted))}</dd></dl>`;
    };
    ui.onNumber(body, 'stake', (v) => { C.stake = Math.min(v, b.maxStake * 4); out(); });
    ui.onNumber(body, 'boosted', (v) => { if (Math.abs(v) >= 100) { C.boosted = v; out(); } });
    ui.onNumber(body, 'hedge', (v) => { if (Math.abs(v) >= 100) { C.hedge = v; out(); } });
    out();
    ui.wireBetButtons(body);
    const base = { kind: 'promo', sport: b.sport, market: b.market };
    body.querySelector('#bo-log').addEventListener('click', () => {
      const h = odds.boostHedge(C.stake, C.boosted, C.hedge);
      api.tracker.add({ ...base, book: b.book, selection: `${b.title} (boost)`, price: C.boosted, stake: C.stake });
      if (b.hedge) api.tracker.add({ ...base, book: b.hedge.book, selection: `${b.hedge.outcome} (hedge)`, price: C.hedge, stake: Math.round(h.hedgeStake * 100) / 100 });
      ui.toast('Both bets logged to your Bet Tracker'); ui.closeDrawer();
    });
    body.querySelector('#bo-ride').addEventListener('click', () => { ui.logBet({ ...base, book: b.book, selection: `${b.title} (boost)`, price: C.boosted, stake: C.stake }); ui.closeDrawer(); });
  }

  load(); drawTools(); draw();
  const offTick = api.onTick(() => { load(); draw(); });
  let st = store.get().state;
  const offStore = store.subscribe((s) => { if (s.state !== st) { st = s.state; F.book = 'All'; load(); drawTools(); draw(); } });
  return () => { offTick(); offStore(); };
}
