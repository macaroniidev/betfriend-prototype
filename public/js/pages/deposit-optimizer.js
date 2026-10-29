// Deposit Optimizer: split a deposit across the user's sportsbooks by promo value, open opportunities and account health.
//
// Layout (UX rebuild items B1, B6, B12, B15, B17, C5, C13):
//   head        results-first: 4 money facts (deposit, promo value unlocked, opportunities covered, bankroll after)
//   form        deposit amount + weighting (Promos first / Balanced / Opportunities first), recomputed as you type
//   allocation  bars per book (current balance + recommended deposit) and the in-page "Log deposits" CTA
//   reasoning   one row per book: status tag (✓ / ! / ✗, never colour alone), promo value, opportunities, why
//   aside       new accounts worth opening, how the weighting works
//   action bar  sticky "Log deposits to my balances" (decision screen), hidden while the in-page CTA is visible
// Editor contract: headings are static, live values sit in nodata nodes, rows sit in [data-bf-list].

const CSS = `
.do .do-form { display: flex; gap: 10px 14px; align-items: flex-end; flex-wrap: wrap; margin: 4px 0 0; }
.do .do-form .field .num { width: 160px; }
.do .do-form .do-weight { display: grid; gap: 4px; font-size: var(--t-xs); font-weight: 700; color: var(--muted); }
.do .do-grid { display: grid; gap: 0 24px; grid-template-columns: minmax(0, 1fr); margin-top: 24px; }
.do .do-grid > .sec { margin-top: 24px; min-width: 0; }
.do .do-grid > .sec:first-child { margin-top: 0; }
@media (min-width: 1360px) {
  .do .do-grid { grid-template-columns: minmax(0, 1fr) 340px; grid-template-areas: "alloc new" "alloc weigh" "why weigh" "how ."; grid-template-rows: auto auto auto 1fr; align-items: start; }
  .do .do-alloc { grid-area: alloc; margin-top: 0 !important; }
  .do .do-why { grid-area: why; }
  .do .do-new { grid-area: new; margin-top: 0 !important; }
  .do .do-weigh { grid-area: weigh; }
  .do .do-how { grid-area: how; }
}
.do .do-sum { font-size: var(--t-sm); font-weight: 700; color: var(--muted); }
.do .alloc { display: grid; grid-template-columns: 92px 1fr 150px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line-2); }
.do .alloc:last-child { border-bottom: 0; }
.do .track { height: 22px; border-radius: 6px; background: var(--panel); border: 1px solid var(--line); display: flex; overflow: hidden; }
.do .track .bal { background: color-mix(in srgb, var(--muted) 30%, transparent); }
/* Deposit fill is brand green for every book; the book's own colour lives only in the chip dot (raw book reds/blues read as warnings and clash with the brand). */
.do .track .dep { background: var(--accent); }
.do .amt { text-align: right; font-variant-numeric: tabular-nums; font-size: var(--t-sm); }
.do .amt strong { font: 900 var(--t-lg) var(--f-head); display: block; color: var(--text); }
.do .legend { display: flex; gap: 14px; font-size: var(--t-xs); color: var(--muted); margin-top: 10px; flex-wrap: wrap; }
.do .legend i { display: inline-block; width: 12px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.do .legend .lg-bal { background: color-mix(in srgb, var(--muted) 30%, transparent); }
.do .legend .lg-dep { background: var(--accent); }
.do .do-cta { display: flex; align-items: center; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 2px solid var(--line); }
.do .do-cta .cta { margin: 0; }
.do .why { font-size: var(--t-sm); color: var(--muted); }
.do .why b { color: var(--text); font-weight: 700; }
.do td[data-col="why"] { min-width: 220px; }
.do .ui-t .hero-fig b { font-size: var(--t-lg); }
.do .newbook { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line-2); }
.do .newbook:last-child { border-bottom: 0; }
.do .nb-t { margin-top: 4px; }
.do .newbook .val { text-align: right; display: grid; gap: 6px; justify-items: end; }
.do .newbook .val strong { color: var(--pos); font-variant-numeric: tabular-nums; }
.do .do-weigh .kv { margin: 0; }
.do .actionbar .ab-sum { font-size: var(--t-sm); font-weight: 700; color: var(--muted); }
.do .actionbar .ab-sum b { color: var(--text); font-variant-numeric: tabular-nums; }
@media (max-width: 860px) {
  .do .alloc { grid-template-columns: 62px minmax(0, 1fr) auto; gap: 10px; padding: 6px 0; }
  .do .alloc .amt { font-size: var(--t-xs); }
  .do .alloc .amt strong { font-size: var(--t-md); }
  .do td[data-col="why"] { min-width: 0; }
  .do .actionbar .btn { flex: 1 1 100%; }
}`;

const STATUS = { healthy: ['Healthy', 'ok'], limited: ['Limited', 'warn'], restricted: ['Restricted', 'bad'] };

export default function render(root, { api, store, ui, odds }) {
  if (!document.getElementById('css-do')) document.head.insertAdjacentHTML('beforeend', `<style id="css-do">${CSS}</style>`);
  const P = api.promos;
  const v = ui.view('deposit-optimizer');
  const q = ui.getQuery().params;
  const S = {
    amount: Number.isFinite(+q.amount) && +q.amount > 0 ? +q.amount : v.get('amount', 2000),
    mode: ['promos', 'balanced', 'opps'].includes(q.weight) ? q.weight : v.get('mode', 'balanced'),
  };
  const money = odds.money;
  const ctaLabel = 'Log deposits to my balances';

  root.innerHTML = `<div class="do">
    ${ui.pageHead({ title: 'Deposit Optimizer', tool: 'deposit-optimizer',
      subtitle: 'Where to put your next deposit: we split it across your books so every promo is funded and your money sits where today’s arbs, +EV and low holds are.',
      facts: [] })}
    <div class="do-form" id="do-form">
      <h2 class="sr-only">Your deposit</h2>
      ${ui.numberInput('amount', S.amount, 'Deposit amount', { prefix: '$', step: 100 })}
      <div class="do-weight"><span>Weight towards</span>${ui.seg('mode', [['promos', 'Promos first'], ['balanced', 'Balanced'], ['opps', 'Opportunities first']], S.mode)}</div>
    </div>
    <div class="do-grid">
      <section class="sec do-alloc"><div class="sec-head"><h2>Recommended allocation</h2><span class="do-sum" id="do-sum" data-bf-nodata></span></div>
        <div id="do-chart" data-bf-list data-bf-nodata></div>
        <div class="legend"><span><i class="lg-bal"></i>Current balance</span><span><i class="lg-dep"></i>Recommended deposit</span></div>
        <div class="do-cta" id="do-cta">${ui.cta(ctaLabel, 'Updates each book’s balance in Account Health. Nothing is moved for you.', { attrs: 'data-act="apply"' })}
          ${ui.related([['promo-optimizer', 'Promo Optimizer'], ['promo-converter', 'Promo Converter'], ['tracker', 'Account health']], 'Next')}</div></section>
      <section class="sec do-why"><div class="sec-head"><h2>Reasoning by book</h2></div><div id="do-table"></div></section>
      <section class="sec do-new aside"><div class="sec-head"><h2>Open a new account</h2><span class="do-sum">Welcome value you are missing</span></div><div id="do-new"></div></section>
      <section class="sec do-weigh aside"><div class="sec-head"><h2>How we weigh it</h2></div><dl class="kv" id="do-weights"></dl></section>
      <div class="do-how" data-how></div>
    </div>
    ${ui.actionBar(`<span class="ab-sum" data-bf-nodata id="do-ab-sum"></span>${ui.betAction({ verb: ctaLabel, act: 'apply', size: '' })}`)}
  </div>`;
  const $ = (s) => root.querySelector(s);

  // Form: recompute as you type; remember the choice and mirror it into the hash (a link reproduces it).
  const remember = () => { v.set({ amount: S.amount, mode: S.mode }); ui.setQuery({ amount: S.amount === 2000 ? null : S.amount, weight: S.mode === 'balanced' ? null : S.mode }); };
  ui.onNumber($('#do-form'), 'amount', (n) => { S.amount = n; remember(); draw(); });
  ui.onSeg($('#do-form'), 'mode', (m) => { S.mode = m; remember(); draw(); });

  let last = [];
  const apply = () => {
    for (const r of last) if (r.dep > 0) api.tracker.setHealth(r.book, { balance: r.balance + r.dep });
    ui.toast('Balances updated in Account Health'); draw();
  };
  ui.onAction(root.querySelector('.do'), { apply });
  const unwire = ui.wireActionBar(root.querySelector('[data-actionbar]'), $('#do-cta .cta'));

  function compute() {
    const st = store.get().state;
    const inState = P.booksInState(st);
    const mine = store.get().books.filter((b) => inState.includes(b));
    const health = api.tracker.health();
    const promos = P.promos({ state: st }).filter((p) => !p.claimed);
    const f = { books: mine, live: false };
    const opps = [...api.arbs(f), ...api.ev({ ...f, minEdge: 0.02 }), ...api.lowHolds(f)];
    const W = { promos: [1, 0.25], balanced: [0.6, 0.6], opps: [0.25, 1] }[S.mode];
    const rows = mine.map((b) => {
      const h = health[b] || { status: 'healthy', balance: 0 };
      const ps = promos.filter((p) => p.book === b && !p.newUserOnly || (p.book === b && p.newUserOnly && h.balance === 0));
      const promoValue = ps.reduce((a, p) => a + p.estValue, 0);
      const counts = { arb: 0, ev: 0, lowhold: 0 };
      for (const o of opps) if (o.legs.some((l) => l.book === b)) counts[o.kind]++;
      const oppN = counts.arb + counts.ev + counts.lowhold;
      const mult = h.status === 'healthy' ? 1 : h.status === 'limited' ? 0.35 : 0;
      const weight = mult * (W[0] * promoValue + W[1] * (counts.arb * 30 + counts.ev * 12 + counts.lowhold * 8)) / (1 + h.balance / 800);
      return { book: b, status: h.status, maxStake: h.maxStake, balance: h.balance, promos: ps, promoValue, counts, oppN, weight };
    });
    const total = rows.reduce((a, r) => a + r.weight, 0) || 1;
    let left = S.amount;
    rows.forEach((r) => { r.dep = Math.floor((S.amount * r.weight / total) / 10) * 10; left -= r.dep; });
    const top = [...rows].sort((a, b) => b.weight - a.weight)[0];
    if (top) top.dep += left;
    rows.sort((a, b) => b.dep - a.dep);
    return { rows, mine, inState, promos, st };
  }

  function reason(r) {
    if (r.status === 'restricted') return `<b>Restricted</b> (max ${money(r.maxStake || 5, 0)}): no new money. Withdraw the ${money(r.balance, 0)} balance.`;
    const bits = [];
    if (r.promoValue > 0) bits.push(`<b>${money(r.promoValue, 0)}</b> in ${r.promos.length} open promo${r.promos.length > 1 ? 's' : ''}`);
    if (r.oppN) bits.push(`<b>${r.oppN}</b> live opportunities (${r.counts.arb} arb · ${r.counts.ev} +EV · ${r.counts.lowhold} low hold)`);
    if (r.status === 'limited') bits.push(`<b>limited</b> to ${money(r.maxStake, 0)}/bet: keep it lean`);
    if (r.balance > 600) bits.push(`already holds ${money(r.balance, 0)}`);
    return bits.join(' · ') || 'Keep a small float for line shopping.';
  }

  const table = ui.table({
    id: 'do-books', caption: 'Recommended deposit by book, with the reasoning', rowKey: (r) => r.book, tools: false, freeze: false, goneMs: -1, newMs: 0,
    sort: { key: 'dep', dir: 'desc' },
    columns: [
      { key: 'book', label: 'Book', render: (r) => ui.book(r.book, { full: true }) },
      { key: 'status', label: 'Status', mlabel: false, render: (r) => ui.status(...(STATUS[r.status] || [r.status, 'muted'])) },
      { key: 'promo', label: 'Promo value', align: 'r', mlabel: true, sort: (r) => r.promoValue, render: (r) => money(r.promoValue, 0) },
      { key: 'opps', label: 'Opps', align: 'r', mlabel: true, sort: (r) => r.oppN, render: (r) => String(r.oppN) },
      { key: 'dep', label: 'Deposit', align: 'r', sort: (r) => r.dep, render: (r) => ui.heroFig(money(r.dep, 0), '', { tone: r.dep > 0 ? 'pos' : '' }) },
      { key: 'why', label: 'Why', render: (r) => `<div class="why">${reason(r)}</div>` },
    ],
    mobile: { areas: ['book book dep', 'status promo opps', 'why why why'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => ui.empty({ title: 'None of your books take bets in this state', msg: 'Add a sportsbook licensed in your state to get a split.',
      actions: [{ label: 'Change your books', href: '#/account' }, { label: 'Promo Optimizer', href: '#/promo-optimizer' }] }),
  });
  $('#do-table').append(table.el);

  let factsHtml = '';
  function draw() {
    const { rows, mine, inState, promos, st } = compute();
    last = rows;
    const max = Math.max(...rows.map((r) => r.balance + r.dep), 1);
    const funded = rows.filter((r) => r.dep > 0);
    const unlocked = funded.reduce((a, r) => a + r.promoValue, 0);
    const fh = ui.facts([
      { label: 'Deposit', value: money(S.amount, 0), note: `split across ${funded.length} books` },
      { label: 'Promo value unlocked', value: money(unlocked, 0), tone: 'pos', note: 'converted at benchmark rates' },
      { label: 'Opportunities covered', value: String(funded.reduce((a, r) => a + r.oppN, 0)), note: 'arb / +EV / low-hold legs' },
      { label: 'Total bankroll after', value: money(rows.reduce((a, r) => a + r.balance + r.dep, 0), 0), note: `${mine.length} books in ${ui.esc(st)}` },
    ]);
    if (fh !== factsHtml) {
      factsHtml = fh;
      const el = root.querySelector('.page-head .facts');
      if (el) el.outerHTML = fh; else root.querySelector('.page-head').insertAdjacentHTML('beforeend', fh);
    }
    $('#do-sum').textContent = `${money(S.amount, 0)} deposit`;
    $('#do-ab-sum').innerHTML = `<b>${money(S.amount, 0)}</b> across <b>${funded.length}</b> books · <b>+${money(unlocked, 0)}</b> promo value`;
    $('#do-chart').innerHTML = rows.map((r) => `<div class="alloc">${ui.book(r.book)}
      <div class="track" role="img" aria-label="${ui.esc(api.bookById[r.book].name)}: balance ${money(r.balance, 0)} plus deposit ${money(r.dep, 0)}" title="Balance ${money(r.balance, 0)} + deposit ${money(r.dep, 0)}"><i class="bal" style="width:${(r.balance / max) * 100}%"></i><i class="dep" style="width:${(r.dep / max) * 100}%"></i></div>
      <div class="amt"><strong>${r.dep > 0 ? '+' + money(r.dep, 0) : '$0'}</strong><span class="muted">${odds.pct(r.dep / (S.amount || 1), 0)} · bal ${money(r.balance + r.dep, 0)}</span></div></div>`).join('');
    table.update(rows);
    const missing = inState.filter((b) => !mine.includes(b)).map((b) => ({ b, p: promos.filter((x) => x.book === b && x.newUserOnly) }))
      .filter((x) => x.p.length).sort((a, b) => b.p[0].estValue - a.p[0].estValue);
    $('#do-new').innerHTML = missing.length ? `<div data-bf-list data-bf-nodata>${missing.map(({ b, p }) => `<div class="newbook" data-key="${ui.esc(b)}"><div>${ui.book(b, { full: true })}<div class="why nb-t">${ui.esc(p[0].title)}</div></div>
      <div class="val"><strong>${money(p[0].estValue, 0)}</strong><button type="button" class="btn sm outline" data-act="add"><span data-bf-text>Add book</span></button></div></div>`).join('')}</div>`
      : `<p class="muted">You already have every book licensed in <span data-bf-nodata>${ui.esc(st)}</span>.</p>`;
    const W = { promos: ['High', 'Low'], balanced: ['Medium', 'Medium'], opps: ['Low', 'High'] }[S.mode];
    $('#do-weights').innerHTML = `<dt>Promo value</dt><dd data-bf-nodata>${W[0]}</dd><dt>Opportunity flow</dt><dd data-bf-nodata>${W[1]}</dd><dt>Healthy account</dt><dd>× 1.0</dd><dt>${ui.term('limit', 'Limited account')}</dt><dd>× 0.35</dd><dt>Restricted account</dt><dd>× 0</dd><dt>Existing balance</dt><dd>reduces need</dd>`;
  }
  ui.onAction($('#do-new'), { add: (b) => { store.set({ books: [...store.get().books, b] }); ui.toast(`${api.bookById[b].name} added to your books`); } });

  $('[data-how]').innerHTML = ui.how({
    summary: 'Money parked at the right books is what lets you take promos and edges the moment they appear.',
    checks: [
      'Every open promo at a book needs cash there to qualify and to hedge it',
      `Arbs, +EV and ${ui.term('lowhold', 'low holds')} only pay if you have a balance at the book with the price`,
      `${ui.term('limit', 'Limited')} books get less, restricted books get nothing: withdraw from those instead`,
      'What a book already holds counts against what it needs',
    ],
    example: ui.related([['promo-converter', 'Convert a bonus bet'], ['low-holds', 'Clear playthrough'], ['arbitrage', 'Arbitrage'], ['tracker', 'Account health']], 'Put it to work'),
  });

  draw();
  const off1 = store.subscribe(() => draw());
  const off2 = P.subscribe(() => draw());
  return () => { off1(); off2(); unwire(); table.destroy(); };
}
