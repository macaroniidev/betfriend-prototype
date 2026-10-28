// Promo Converter: convert bonus bets, no-sweat bets, deposit matches and profit boosts into withdrawable cash.
// Ranks exact two-sided bets (promo book + hedge at another of the user's books) by conversion rate.

const CSS = `
.pc .pc-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; align-items: end; }
.pc .pc-form .wide { grid-column: span 2; }
.pc .pc-hero { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.pc .pc-hero > div { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.pc .pc-hero span { display: block; font-size: 12px; color: var(--muted); }
.pc .pc-hero strong { font: 600 22px var(--serif); font-variant-numeric: tabular-nums; }
.pc .rank { font: 600 15px var(--serif); color: var(--muted); }
.pc tr.top td { background: color-mix(in srgb, var(--lime) 22%, transparent); }
.pc .rate { font: 700 15px var(--sans); font-variant-numeric: tabular-nums; }
.pc td .leg { justify-content: flex-end; }
@media (min-width: 861px) { .pc td .leg { justify-content: flex-start; } }
.pc .leg-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.pc .promo-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 16px; border-bottom: 1px solid var(--line-2); }
.pc .promo-item:last-child { border-bottom: 0; }
.pc .promo-item .grow { flex: 1; min-width: 0; }
.pc .promo-item .t1 { font-weight: 600; font-size: 13px; }
.pc .promo-item.claimed .t1 { text-decoration: line-through; color: var(--muted); }
.pc .promo-item.sel { background: color-mix(in srgb, var(--lime) 30%, transparent); }
.pc .bench { display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px 12px; font-size: 13px; align-items: center; }
.pc .bench .h { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.pc .bench .n { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.callout.lime .book { background: rgba(255,255,255,.55); border-color: transparent; color: var(--ink); }
.pc-steps { counter-reset: s; list-style: none; padding: 0; margin: 0; }
.pc-steps { border-top: 4px solid var(--g); padding-top: 14px !important; }
.pc-steps li { position: relative; padding: 0 0 14px 28px; }
.pc-steps li::before { content: ""; position: absolute; left: 2px; top: 5px; width: 11px; height: 6px; border-left: 3px solid var(--g); border-bottom: 3px solid var(--g); transform: rotate(-45deg); }
.pc-steps li strong { display: block; }
@media (max-width: 860px) {
  .pc .pc-form { grid-template-columns: 1fr 1fr; }
  .pc .pc-hero { grid-template-columns: 1fr; }
  .pc .pc-hero strong { font-size: 19px; }
}`;

export default function render(root, { api, store, ui, odds, params, navigate }) {
  if (!document.getElementById('css-pc')) document.head.insertAdjacentHTML('beforeend', `<style id="css-pc">${CSS}</style>`);
  const P = api.promos;
  const S = { type: 'bonus-bet', amount: 200, book: 'dk', boostPct: 50, promoId: null, playthrough: 1 };
  let results = [];

  const fromPromo = (p) => {
    if (!p) return;
    S.promoId = p.id; S.book = p.book; S.amount = p.amount; S.playthrough = p.playthrough || 1;
    S.type = ['bonus-bet', 'no-sweat', 'deposit-match', 'profit-boost'].includes(P.strategyFor(p.type)) ? P.strategyFor(p.type) : 'bonus-bet';
    if (p.boostPct) S.boostPct = Math.round(p.boostPct * 100);
  };
  if (params.promo) fromPromo(P.promoById(params.promo));
  else {
    const first = P.promos({ state: store.get().state }).find((p) => !p.claimed && ['bonus-bet', 'no-sweat'].includes(P.strategyFor(p.type)));
    if (first) fromPromo(first);
  }

  root.innerHTML = `<div class="pc">
    ${ui.header({ title: 'Promo Converter', tool: 'promo-converter',
      subtitle: 'Convert bonus bets into withdrawable cash. We tell you which books have the best promos and link you to the exact two-sided bets to convert them to dollars.',
      actions: `<a class="btn" href="#/promo-optimizer">✦ All promos in your state</a>` })}
    <div class="split">
      <div class="stack">
        <section class="card pad" id="pc-form"></section>
        <section class="card"><header><h3>Best conversions right now</h3><span class="muted" id="pc-count"></span></header>
          <div id="pc-results"></div></section>
      </div>
      <div class="stack">
        <section class="card"><header><h3>My open promos</h3><span class="tag" id="pc-state"></span></header><div id="pc-promos"></div></section>
        <section class="card pad"><h3 style="margin-bottom:10px">Conversion benchmarks</h3><div id="pc-bench"></div></section>
      </div>
    </div></div>`;

  const $ = (s) => root.querySelector(s);
  const userBooks = () => store.get().books;
  const stateBooks = () => P.booksInState(store.get().state);

  function drawForm() {
    const books = stateBooks();
    if (!books.includes(S.book)) S.book = books[0];
    $('#pc-form').innerHTML = `
      <div class="row" style="margin-bottom:12px">${ui.seg('type', [['bonus-bet', 'Bonus bet'], ['no-sweat', 'No-sweat'], ['deposit-match', 'Deposit match'], ['profit-boost', 'Profit boost']], S.type)}</div>
      <div class="pc-form">
        ${ui.select('book', books.map((b) => [b, api.bookById[b].name]), S.book, 'Promo sportsbook')}
        ${ui.numberInput('amount', S.amount, S.type === 'profit-boost' ? 'Max stake' : S.type === 'no-sweat' ? 'No-sweat stake' : 'Promo amount', { prefix: '$', step: 5 })}
        ${S.type === 'profit-boost' ? ui.numberInput('boost', S.boostPct, 'Boost %', { step: 5 }) : S.type === 'deposit-match' ? ui.numberInput('pt', S.playthrough, 'Playthrough ×', { step: 1, min: 1 }) : `<div class="field"><span>Hedge books</span><div class="muted" style="padding:8px 0">${userBooks().length} of your books + exchanges</div></div>`}
        <button class="btn primary" id="pc-go">Find conversions</button>
      </div>
      <div class="pc-hero" id="pc-hero"></div>`;
    ui.onSeg($('#pc-form'), 'type', (v) => { S.type = v; S.promoId = null; drawForm(); compute(); drawPromos(); drawBench(); });
    ui.onSelect($('#pc-form'), 'book', (v) => { S.book = v; S.promoId = null; compute(); drawPromos(); });
    ui.onNumber($('#pc-form'), 'amount', (v) => { S.amount = v; compute(); });
    ui.onNumber($('#pc-form'), 'boost', (v) => { S.boostPct = v; compute(); });
    ui.onNumber($('#pc-form'), 'pt', (v) => { S.playthrough = v; compute(); });
    $('#pc-go').addEventListener('click', () => { compute(); ui.toast(`${results.length} conversions found`); });
  }

  const spec = () => ({ type: S.type, amount: S.amount, book: S.book, boostPct: S.boostPct / 100, playthrough: S.playthrough });

  function compute() {
    results = P.bestConversions(spec(), api.lines(), { books: userBooks(), limit: 12 });
    const best = results[0];
    const [g, gk] = best ? P.grade(S.type, best.rate) : ['—', ''];
    $('#pc-hero').innerHTML = `
      <div><span>Guaranteed cash kept</span><strong style="color:var(--pos)">${best ? odds.money(best.kept) : '—'}</strong></div>
      <div><span>Best conversion rate</span><strong>${best ? odds.pct(best.rate) : '—'}</strong> ${best ? ui.tag(g, gk) : ''}</div>
      <div><span>Hedge stake needed</span><strong>${best ? odds.money(best.hedgeLeg.stake) : '—'}</strong></div>`;
    $('#pc-count').textContent = `${results.length} ranked bets · updates live`;
    if (!results.length) { $('#pc-results').innerHTML = `<div class="pad">${ui.empty(`No two-sided bets at ${api.bookById[S.book]?.name} right now — try another book.`)}</div>`; return; }
    $('#pc-results').innerHTML = `<table class="t stack-sm"><thead><tr><th>#</th><th>Event</th><th>Promo bet</th><th>Hedge bet</th><th class="num-cell">Cash kept</th><th class="num-cell">Conversion</th><th></th></tr></thead><tbody>
      ${results.map((c, i) => `<tr class="click${i === 0 ? ' top' : ''}" data-i="${i}">
        <td data-label="Rank"><span class="rank">${i + 1}</span></td>
        <td data-label="Event"><div>${ui.eventCell(c.eventId)}<div class="leg-sub">${ui.esc(c.label)}</div></div></td>
        <td data-label="Promo bet"><div><div class="leg">${ui.book(c.promoLeg.book)} ${ui.price(c.promoLeg.price, { best: true })}</div><div class="leg-sub">${ui.esc(c.promoLeg.outcome)} · ${odds.money(c.promoLeg.stake, 0)} ${S.type === 'profit-boost' ? `boosted from ${odds.fmtAmerican(c.promoLeg.basePrice)}` : S.type === 'no-sweat' ? 'cash' : 'bonus'}</div></div></td>
        <td data-label="Hedge bet"><div><div class="leg">${ui.book(c.hedgeLeg.book)} ${ui.price(c.hedgeLeg.price)}</div><div class="leg-sub">${ui.esc(c.hedgeLeg.outcome)} · ${odds.money(c.hedgeLeg.stake)}</div></div></td>
        <td data-label="Cash kept" class="num-cell"><strong style="color:var(--pos)">${odds.money(c.kept)}</strong></td>
        <td data-label="Conversion" class="num-cell"><span class="rate">${odds.pct(c.rate)}</span></td>
        <td data-label=""><button class="btn sm lime" data-steps="${i}">Convert →</button></td></tr>`).join('')}
      </tbody></table>`;
    $('#pc-results').querySelectorAll('tr[data-i]').forEach((tr) => tr.addEventListener('click', () => openSteps(results[+tr.dataset.i])));
  }

  function openSteps(c) {
    const pb = api.bookById[c.promoLeg.book], hb = api.bookById[c.hedgeLeg.book];
    const e = api.eventById(c.eventId);
    const promo = S.promoId ? P.promoById(S.promoId) : null;
    const promoWord = { 'bonus-bet': 'bonus bet', 'no-sweat': 'no-sweat cash bet', 'deposit-match': 'bonus funds', 'profit-boost': 'profit boost' }[S.type];
    const body = ui.drawer('Convert step by step', `
      ${promo ? `<div class="callout lime" style="margin-bottom:14px"><strong>${ui.esc(promo.title)}</strong><div style="font-size:12.5px;margin-top:4px">${ui.book(promo.book, { full: true })} · ${ui.esc(P.typeLabel(promo.type))}</div></div>` : ''}
      ${ui.stats([
        { label: 'Cash kept', value: odds.money(c.kept), tone: 'pos' },
        { label: 'Conversion', value: odds.pct(c.rate) },
        { label: 'Total cash out', value: odds.money((S.type === 'no-sweat' || S.type === 'profit-boost' ? c.promoLeg.stake : 0) + c.hedgeLeg.stake) },
      ])}
      <div style="margin-bottom:12px">${ui.eventCell(c.eventId)}<div class="muted" style="font-size:12.5px;margin-top:4px">${ui.esc(c.label)}</div></div>
      <ol class="pc-steps">
        <li><strong>Open ${ui.esc(pb.name)} and place the ${promoWord}</strong>${ui.esc(c.promoLeg.outcome)} at ${odds.fmtAmerican(c.promoLeg.price)} for ${odds.money(c.promoLeg.stake, 0)}${S.type === 'profit-boost' ? ` with your ${S.boostPct}% boost applied (base ${odds.fmtAmerican(c.promoLeg.basePrice)})` : ''}.<div style="margin-top:8px">${ui.betBtn(pb.id, 'Open bet slip')}</div></li>
        <li><strong>Hedge at ${ui.esc(hb.name)}</strong>${ui.esc(c.hedgeLeg.outcome)} at ${odds.fmtAmerican(c.hedgeLeg.price)} for <strong style="display:inline">${odds.money(c.hedgeLeg.stake)}</strong> cash.<div style="margin-top:8px">${ui.betBtn(hb.id, 'Open bet slip')}</div></li>
        <li><strong>Confirm both prices before submitting</strong>If either price has moved, reopen this drawer: the stake recalculates on every tick.</li>
        <li><strong>Collect ${odds.money(c.kept)} whichever side wins</strong>${S.type === 'no-sweat' ? 'If the cash bet loses, the refund bonus bet lands in your account. Convert it here at ~70% to complete the profit.' : 'Withdraw or roll the cash into your next promo.'}</li>
      </ol>
      <h3 style="margin:6px 0 8px">Outcomes</h3>
      <table class="t stack-sm"><thead><tr><th>If this wins</th><th class="num-cell">Promo leg</th><th class="num-cell">Hedge leg</th><th class="num-cell">Net</th></tr></thead><tbody>
        <tr><td data-label="If this wins">${ui.esc(c.promoLeg.outcome)}</td><td data-label="Promo leg" class="num-cell">${odds.money(c.promoLeg.stake * (odds.toDecimal(c.promoLeg.price) - 1))}</td><td data-label="Hedge leg" class="num-cell">${odds.money(-c.hedgeLeg.stake)}</td><td data-label="Net" class="num-cell"><strong style="color:var(--pos)">${odds.money(c.ifWin)}</strong></td></tr>
        <tr><td data-label="If this wins">${ui.esc(c.hedgeLeg.outcome)}</td><td data-label="Promo leg" class="num-cell">${S.type === 'no-sweat' ? `${odds.money(-c.promoLeg.stake)} <span class="muted">+ refund</span>` : S.type === 'profit-boost' ? odds.money(-c.promoLeg.stake) : '$0.00'}</td><td data-label="Hedge leg" class="num-cell">${odds.money(c.hedgeLeg.stake * (odds.toDecimal(c.hedgeLeg.price) - 1))}</td><td data-label="Net" class="num-cell"><strong style="color:var(--pos)">${odds.money(c.ifLose)}</strong></td></tr>
      </tbody></table>
      <div class="row" style="margin-top:16px"><button class="btn primary" id="pc-log">Log both bets</button>${promo && !promo.claimed ? '<button class="btn" id="pc-claim">Mark promo claimed</button>' : ''}<span class="spacer"></span><span class="muted" style="font-size:12px">${ui.esc(e?.sport || '')} · ${ui.when(e?.start || Date.now())}</span></div>`, { wide: false });
    ui.wireBetButtons(body);
    body.querySelector('#pc-log').addEventListener('click', () => {
      const base = { kind: 'promo', sport: c.sport, market: c.market };
      api.tracker.add({ ...base, book: c.promoLeg.book, selection: `${c.promoLeg.outcome} (${promoWord})`, price: c.promoLeg.price, stake: Math.round(c.promoLeg.stake * 100) / 100 });
      api.tracker.add({ ...base, book: c.hedgeLeg.book, selection: `${c.hedgeLeg.outcome} (hedge)`, price: c.hedgeLeg.price, stake: Math.round(c.hedgeLeg.stake * 100) / 100 });
      if (promo) P.claim(promo.id, true);
      ui.toast('Both bets logged to your Bet Tracker');
      ui.closeDrawer();
    });
    body.querySelector('#pc-claim')?.addEventListener('click', (ev) => { P.claim(promo.id, true); ev.target.remove(); ui.toast('Promo marked claimed'); });
  }

  function drawPromos() {
    const st = store.get().state;
    $('#pc-state').textContent = st;
    const list = P.promos({ state: st }).filter((p) => ['bonus-bet', 'no-sweat', 'deposit-match', 'profit-boost', 'second-chance', 'referral', 'odds-boost'].includes(p.type)).slice(0, 9);
    $('#pc-promos').innerHTML = list.map((p) => `<div class="promo-item${p.claimed ? ' claimed' : ''}${p.id === S.promoId ? ' sel' : ''}">
        <input type="checkbox" data-claim="${p.id}" ${p.claimed ? 'checked' : ''} aria-label="Mark claimed" style="margin-top:3px">
        <div class="grow"><div class="t1">${ui.esc(p.title)}</div><div class="row" style="gap:6px;margin-top:4px">${ui.book(p.book)} ${ui.tag(P.typeLabel(p.type))} <span class="muted" style="font-size:12px">≈ ${odds.money(p.estValue, 0)}</span></div></div>
        <button class="btn sm" data-use="${p.id}">${p.id === S.promoId ? 'Selected' : 'Use'}</button></div>`).join('') +
      `<div class="pad" style="padding-top:8px"><a href="#/promo-optimizer">See every promo in ${st} →</a></div>`;
    $('#pc-promos').querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => { fromPromo(P.promoById(b.dataset.use)); drawForm(); compute(); drawPromos(); }));
    $('#pc-promos').querySelectorAll('[data-claim]').forEach((c) => c.addEventListener('change', () => P.claim(c.dataset.claim, c.checked)));
  }

  function drawBench() {
    $('#pc-bench').innerHTML = `<div class="bench"><span class="h">Promo</span><span class="h n">Good</span><span class="h n">Great</span><span class="h n">Elite</span>
      ${Object.entries(P.BENCHMARKS).map(([k, b]) => `<span>${ui.esc(P.typeLabel(k))}</span><span class="n">${odds.pct(b.good, 0)}</span><span class="n">${odds.pct(b.great, 0)}</span><span class="n" style="color:var(--pos)">${odds.pct(b.elite, 0)}+</span>`).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin:12px 0 0">${ui.esc(P.BENCHMARKS[S.type]?.note || '')}</p>`;
  }

  drawForm(); compute(); drawPromos(); drawBench();
  const offTick = api.onTick(() => compute());
  const offPromo = P.subscribe(() => drawPromos());
  const offStore = store.subscribe(() => { drawForm(); compute(); drawPromos(); });
  return () => { offTick(); offPromo(); offStore(); };
}
