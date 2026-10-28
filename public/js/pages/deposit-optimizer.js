// Deposit Optimizer: split a deposit across the user's sportsbooks by promo value, open opportunities and account health.

const CSS = `
.do .alloc { display: grid; grid-template-columns: 92px 1fr 150px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line-2); }
.do .alloc:last-child { border-bottom: 0; }
.do .track { height: 22px; border-radius: 6px; background: var(--panel); border: 1px solid var(--line); display: flex; overflow: hidden; }
.do .track .bal { background: color-mix(in srgb, var(--muted) 30%, transparent); }
.do .track .dep { background: var(--bk); }
.do .amt { text-align: right; font-variant-numeric: tabular-nums; font-size: 13px; }
.do .amt strong { font: 600 16px var(--serif); display: block; }
.do .legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); margin-top: 10px; flex-wrap: wrap; }
.do .legend i { display: inline-block; width: 12px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.do .why { font-size: 12.5px; color: var(--muted); }
.do .why b { color: var(--text); font-weight: 600; }
.do .newbook { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--line-2); }
.do .newbook:last-child { border-bottom: 0; }
@media (max-width: 860px) { .do .alloc { grid-template-columns: 70px 1fr; } .do .alloc .amt { grid-column: 1 / -1; display: flex; justify-content: space-between; text-align: left; } .do .alloc .amt strong { display: inline; } }`;

export default function render(root, { api, store, ui, odds, navigate }) {
  if (!document.getElementById('css-do')) document.head.insertAdjacentHTML('beforeend', `<style id="css-do">${CSS}</style>`);
  const P = api.promos;
  const S = { amount: 2000, mode: 'balanced' };

  root.innerHTML = `<div class="do">
    ${ui.header({ title: 'Deposit Optimizer', tool: 'deposit-optimizer',
      subtitle: 'Tell us how much you are depositing. We split it across your books so every promo is funded and your money sits where today’s arbs, +EV and low holds are.' })}
    <section class="card pad" style="margin-bottom:16px"><div class="toolbar" style="margin:0" id="do-form"></div></section>
    <div id="do-stats"></div>
    <div class="split">
      <div class="stack">
        <section class="card"><header><h3>Recommended allocation</h3><span class="muted" id="do-sum"></span></header><div class="pad" id="do-chart"></div></section>
        <section class="card"><header><h3>Reasoning by book</h3></header><div id="do-table"></div></section>
      </div>
      <div class="stack">
        <section class="card"><header><h3>Open a new account</h3><span class="muted" style="font-size:12px">Welcome value you are missing</span></header><div id="do-new"></div></section>
        <section class="card pad"><h3 style="margin-bottom:8px">How we weigh it</h3><dl class="kv" id="do-weights"></dl></section>
      </div>
    </div></div>`;
  const $ = (s) => root.querySelector(s);

  $('#do-form').innerHTML = `${ui.numberInput('amount', S.amount, 'Deposit amount', { prefix: '$', step: 100 })}
    ${ui.seg('mode', [['promos', 'Promos first'], ['balanced', 'Balanced'], ['opps', 'Opportunities first']], S.mode)}
    <button class="btn primary" id="do-apply">Log deposits to my balances</button>`;
  ui.onNumber($('#do-form'), 'amount', (v) => { S.amount = v; draw(); });
  ui.onSeg($('#do-form'), 'mode', (v) => { S.mode = v; $('#do-form').querySelectorAll('[data-seg="mode"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); draw(); });
  let last = [];
  $('#do-apply').addEventListener('click', () => {
    for (const r of last) if (r.dep > 0) api.tracker.setHealth(r.book, { balance: r.balance + r.dep });
    ui.toast('Balances updated in Account Health'); draw();
  });

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
    if (r.status === 'restricted') return `<b>Restricted</b> (max ${odds.money(r.maxStake || 5, 0)}): no new money. Withdraw the ${odds.money(r.balance, 0)} balance.`;
    const bits = [];
    if (r.promoValue > 0) bits.push(`<b>${odds.money(r.promoValue, 0)}</b> in ${r.promos.length} open promo${r.promos.length > 1 ? 's' : ''}`);
    if (r.oppN) bits.push(`<b>${r.oppN}</b> live opportunities (${r.counts.arb} arb · ${r.counts.ev} +EV · ${r.counts.lowhold} low hold)`);
    if (r.status === 'limited') bits.push(`<b>limited</b> to ${odds.money(r.maxStake, 0)}/bet: keep it lean`);
    if (r.balance > 600) bits.push(`already holds ${odds.money(r.balance, 0)}`);
    return bits.join(' · ') || 'Keep a small float for line shopping.';
  }

  function draw() {
    const { rows, mine, inState, promos, st } = compute();
    last = rows;
    const max = Math.max(...rows.map((r) => r.balance + r.dep), 1);
    const funded = rows.filter((r) => r.dep > 0);
    $('#do-stats').innerHTML = ui.stats([
      { label: 'Deposit', value: odds.money(S.amount, 0), note: `split across ${funded.length} books` },
      { label: 'Promo value unlocked', value: odds.money(funded.reduce((a, r) => a + r.promoValue, 0), 0), tone: 'pos', note: 'converted at benchmark rates' },
      { label: 'Opportunities covered', value: String(funded.reduce((a, r) => a + r.oppN, 0)), note: 'arb / +EV / low-hold legs' },
      { label: 'Total bankroll after', value: odds.money(rows.reduce((a, r) => a + r.balance + r.dep, 0), 0), note: `${mine.length} books in ${st}` },
    ]);
    $('#do-sum').textContent = `${odds.money(S.amount, 0)} deposit`;
    $('#do-chart').innerHTML = rows.map((r) => `<div class="alloc">${ui.book(r.book)}
      <div class="track" style="--bk:${api.bookById[r.book].color}" title="Balance ${odds.money(r.balance, 0)} + deposit ${odds.money(r.dep, 0)}"><i class="bal" style="width:${(r.balance / max) * 100}%"></i><i class="dep" style="width:${(r.dep / max) * 100}%"></i></div>
      <div class="amt"><strong>${r.dep > 0 ? '+' + odds.money(r.dep, 0) : '$0'}</strong><span class="muted">${odds.pct(r.dep / (S.amount || 1), 0)} · bal ${odds.money(r.balance + r.dep, 0)}</span></div></div>`).join('') +
      `<div class="legend"><span><i style="background:color-mix(in srgb, var(--muted) 30%, transparent)"></i>Current balance</span><span><i style="background:var(--accent)"></i>Recommended deposit (book colour)</span></div>`;
    $('#do-table').innerHTML = `<table class="t stack-sm"><thead><tr><th>Book</th><th>Status</th><th class="num-cell">Promo value</th><th class="num-cell">Opps</th><th class="num-cell">Deposit</th><th>Why</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td data-label="Book">${ui.book(r.book, { full: true })}</td>
        <td data-label="Status">${ui.tag(r.status, r.status === 'healthy' ? 'pos' : r.status === 'limited' ? 'warn' : 'neg')}</td>
        <td data-label="Promo value" class="num-cell">${odds.money(r.promoValue, 0)}</td>
        <td data-label="Opps" class="num-cell">${r.oppN}</td>
        <td data-label="Deposit" class="num-cell"><strong>${odds.money(r.dep, 0)}</strong></td>
        <td data-label="Why" class="why"><div>${reason(r)}</div></td></tr>`).join('')}</tbody></table>`;
    const missing = inState.filter((b) => !mine.includes(b)).map((b) => ({ b, p: promos.filter((x) => x.book === b && x.newUserOnly) }))
      .filter((x) => x.p.length).sort((a, b) => b.p[0].estValue - a.p[0].estValue);
    $('#do-new').innerHTML = missing.length ? missing.map(({ b, p }) => `<div class="newbook"><div>${ui.book(b, { full: true })}<div class="why" style="margin-top:4px">${ui.esc(p[0].title)}</div></div>
      <div style="text-align:right"><strong style="color:var(--pos)">${odds.money(p[0].estValue, 0)}</strong><br><button class="btn sm" data-add="${b}">Add book</button></div></div>`).join('')
      : `<div class="pad muted">You already have every book licensed in ${st}.</div>`;
    $('#do-new').querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => { store.set({ books: [...store.get().books, btn.dataset.add] }); ui.toast(`${api.bookById[btn.dataset.add].name} added to your books`); }));
    const W = { promos: ['High', 'Low'], balanced: ['Medium', 'Medium'], opps: ['Low', 'High'] }[S.mode];
    $('#do-weights').innerHTML = `<dt>Promo value</dt><dd>${W[0]}</dd><dt>Opportunity flow</dt><dd>${W[1]}</dd><dt>Healthy account</dt><dd>× 1.0</dd><dt>Limited account</dt><dd>× 0.35</dd><dt>Restricted account</dt><dd>× 0</dd><dt>Existing balance</dt><dd>reduces need</dd>`;
  }

  draw();
  const off1 = store.subscribe(() => draw());
  const off2 = P.subscribe(() => draw());
  return () => { off1(); off2(); };
}
