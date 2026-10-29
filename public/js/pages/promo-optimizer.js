// Promo Optimizer: every sports promo in the user's state ranked by the cash it converts to, with filters,
// a claim plan that orders them and one-click conversion (Promo Converter).
//
// Layout (UX rebuild items B1, B2, B7, B12, C5):
//   head      results-first: 4 money facts (available, welcome, existing-user, claimed)
//   results   filter bar (audience / type / sportsbook / hide claimed) + a keyed, sortable table; one primary
//             (Convert) per row, the cash value as the hero figure, a Claimed status tag instead of a fade
//   aside     the claim plan on a green tile (lime "Start claim plan"), value by sportsbook
// Editor contract: headings are static, counts and values sit in nodata nodes, rows in [data-bf-list].

const CSS = `
.po .po-grid { display: grid; gap: 0 24px; grid-template-columns: minmax(0, 1fr); }
.po .po-grid > .sec { margin-top: 24px; min-width: 0; }
.po .po-grid > .sec:first-child { margin-top: 0; }
@media (min-width: 1360px) {
  .po .po-grid { grid-template-columns: minmax(0, 1fr) 340px; grid-template-areas: "res plan" "res book" "how book" "how ."; grid-template-rows: auto auto auto 1fr; align-items: start; }
  .po .po-res { grid-area: res; }
  .po .po-plan { grid-area: plan; margin-top: 0 !important; }
  .po .po-book { grid-area: book; }
  .po .po-how { grid-area: how; }
  .po .po-start-m { display: none; }
}
.po .po-count { font-size: var(--t-sm); color: var(--muted); font-weight: 700; }
.po .po-count b { color: var(--text); font-variant-numeric: tabular-nums; }

/* table cells */
.po td.pcell { min-width: 260px; }
.po .po-title { font-weight: 700; }
.po .rk { font: 900 var(--t-sm) var(--f-head); color: var(--muted); margin-right: 6px; font-variant-numeric: tabular-nums; }
.po .po-meta { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-top: 5px; }
.po .po-terms { font-size: var(--t-xs); color: var(--muted); margin-top: 4px; max-width: 520px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.po td.nw { white-space: nowrap; }
.po tr.claimed .po-title { text-decoration: line-through; color: var(--muted); }
.po .ui-t .hero-fig b { font-size: var(--t-xl); }
.po .ui-t td[data-col="claimed"] input { width: 18px; height: 18px; }
.po .po-claim-l { display: none; }

/* claim plan: a green tile (lime only on green) */
.po .po-plan { background: var(--g); color: var(--on-green-soft); border-radius: 16px; border-top: 0; padding: 18px 18px 8px; }
.po .po-plan h2 { color: #FFFFFF; }
.po .po-plan .sec-head { margin-bottom: 4px; }
.po .po-plan .note { font-size: var(--t-sm); font-weight: 600; }
.po .po-plan .po-avail { font: 900 var(--t-fig)/1.05 var(--f-head); color: var(--lime); text-transform: uppercase; margin: 6px 0 4px; }
.po .po-plan .po-avg { margin: 0 0 12px; font-size: var(--t-sm); }
.po .po-plan .po-avg b { color: #FFFFFF; }
.po .po-plan .cta { margin-bottom: 8px; }
.po .plan-step { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 8px 10px; padding: 12px 0; border-top: 1px solid rgba(255, 255, 255, .2); align-items: start; }
.po .plan-step .ck { width: 11px; height: 6px; margin-top: 7px; border-left: 3px solid var(--lime); border-bottom: 3px solid var(--lime); transform: rotate(-45deg); }
.po .plan-step .t1 { font-size: var(--t-sm); font-weight: 700; color: #FFFFFF; display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
.po .plan-step .t2 { font-size: var(--t-xs); margin-top: 3px; }
.po .plan-step .acts { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.po .plan-step .cum { text-align: right; font-size: var(--t-xs); font-variant-numeric: tabular-nums; }
.po .plan-step .cum strong { display: block; color: var(--lime); font: 900 var(--t-md) var(--f-head); }
.po .po-plan .btn.outline { background: transparent; color: #FFFFFF; border-color: rgba(255, 255, 255, .6); box-shadow: none; }
.po .po-plan .btn.outline:hover { border-color: var(--lime); }
.po .po-plan .btn.ghost { color: #FFFFFF; }
.po .po-plan .empty { color: #FFFFFF; border-color: rgba(255, 255, 255, .4); }

/* value by sportsbook */
.po .bybook { display: grid; grid-template-columns: 70px 1fr 64px; gap: 8px; align-items: center; font-size: var(--t-sm); }
/* Brand-green bars; book identity comes from the chip dot, not the bar fill. */
.po .bybook .bar i { background: var(--accent); }
.po .bybook .num-cell { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.po .po-book .stack > * + * { margin-top: 8px; }

@media (max-width: 860px) {
  .po td.pcell { min-width: 0; }
  .po .po-terms { display: none; }
  .po .page-head .head-actions { width: 100%; }
  .po .po-claim-l { display: inline; color: var(--muted); font-weight: 700; }
}`;

const PRIORITY = { 'bonus-bet': 1, referral: 5, 'deposit-match': 3, 'no-sweat': 2, 'second-chance': 2, 'profit-boost': 4, 'odds-boost': 4, 'casino-credit': 6 };

export default function render(root, { api, store, ui, odds, navigate }) {
  if (!document.getElementById('css-po')) document.head.insertAdjacentHTML('beforeend', `<style id="css-po">${CSS}</style>`);
  const P = api.promos;
  const money = odds.money;
  const convert = (id) => navigate(`promo-converter?promo=${id}`);
  const all = () => P.promos({ state: store.get().state });

  root.innerHTML = `<div class="po">
    ${ui.pageHead({ title: 'Promo Optimizer', tool: 'promo-optimizer',
      subtitle: 'The best sign-up and reload offers in your state, ranked by the cash each one converts to, with a claim plan that orders them for you.',
      actions: `<button type="button" class="btn sm primary po-start-m" data-act="start">Start claim plan →</button><a class="btn sm outline" href="#/promo-converter">${ui.icon('promo', { size: 16 })}<span>Promo Converter</span></a>`,
      facts: factItems() })}
    <div class="po-grid">
      <section class="sec po-res"><div class="sec-head"><h2>Promos ranked by cash value</h2><span class="po-count" id="po-count" data-bf-nodata></span></div>
        <div id="po-tools"></div><div id="po-table"></div></section>
      <section class="sec po-plan on-green" id="po-plan-sec"><div class="sec-head"><h2>Claim plan</h2><span class="note">Best order to work through</span></div><div id="po-plan"></div></section>
      <section class="sec po-book"><div class="sec-head"><h2>Value by sportsbook</h2></div><div id="po-bybook" class="stack" data-bf-nodata></div></section>
      <div class="po-how" data-how></div>
    </div></div>`;
  const $ = (s) => root.querySelector(s);

  // ------------------------------------------------------------------ head facts
  function factItems() {
    const list = all();
    const st = store.get().state;
    const avail = P.totalValue(list);
    const nu = list.filter((p) => p.newUserOnly && !p.claimed).reduce((a, p) => a + p.estValue, 0);
    const claimed = list.filter((p) => p.claimed);
    return [
      { label: `Available in ${st}`, value: money(avail, 0), note: `${list.filter((p) => !p.claimed).length} open offers · ${new Set(list.map((p) => p.book)).size} sportsbooks` },
      { label: 'Welcome offers', value: money(nu, 0), note: 'new-user value open' },
      { label: 'Existing-user promos', value: money(avail - nu, 0), note: 'refreshes daily' },
      { label: 'Claimed so far', value: money(claimed.reduce((a, p) => a + p.estValue, 0), 0), tone: 'pos', note: `${claimed.length} promos` },
    ];
  }
  let factsHtml = '';
  function drawFacts() {
    const h = ui.facts(factItems());
    if (h === factsHtml) return;
    factsHtml = h;
    const el = root.querySelector('.page-head .facts');
    if (el) el.outerHTML = h;
  }

  // ------------------------------------------------------------------ filters (remembered per route)
  let fb = null;
  function drawTools() {
    fb?.destroy?.();
    const books = P.booksInState(store.get().state);
    fb = ui.filterBar({ id: 'po', fields: [
      { key: 'aud', type: 'mode', label: 'Audience', default: 'all', options: [['all', 'All'], ['new', 'New user'], ['existing', 'Existing user']] },
      { key: 'type', type: 'select', label: 'Type', default: 'All', options: [['All', 'All types'], ...P.PROMO_TYPES] },
      { key: 'book', type: 'select', label: 'Sportsbook', default: 'All', options: [['All', 'All books'], ...books.map((b) => [b, api.bookById[b].name])] },
      { key: 'hide', type: 'toggle', label: 'Hide claimed', default: false },
    ], onChange: () => drawTable() });
    $('#po-tools').replaceChildren(fb.el);
  }
  const filtered = () => {
    const F = fb.values;
    return all().filter((p) => (F.aud === 'all' || (F.aud === 'new' ? p.newUserOnly : !p.newUserOnly))
      && (F.type === 'All' || p.type === F.type) && (F.book === 'All' || p.book === F.book) && (!F.hide || !p.claimed));
  };

  // ------------------------------------------------------------------ the ranked table
  const table = ui.table({
    id: 'po-promos', caption: 'Promos in your state ranked by cash value', rowKey: (p) => p.id,
    sort: null, // data order is the ranking (cash value)
    // A filtered static list: rows that leave the view go at once (no 'Gone' strike), no NEW markers.
    goneMs: -1, newMs: 0,
    rowClass: (p) => (p.claimed ? 'claimed' : ''),
    columns: [
      { key: 'claimed', label: 'Claimed', align: 'c', render: (p) => `<label class="check po-claim"><input type="checkbox" data-claim="${ui.esc(p.id)}" ${p.claimed ? 'checked' : ''} aria-label="Claimed: ${ui.esc(p.title)}"><span class="po-claim-l" aria-hidden="true">Claimed</span></label>` },
      { key: 'promo', label: 'Promo', cls: 'pcell', render: (p) => `<div class="po-title"><span class="rk">${p._rank}</span>${ui.esc(p.title)}</div>
        <div class="po-meta">${ui.book(p.book)} ${ui.tag(P.typeLabel(p.type))}${p.newUserOnly ? ui.tag('New user', 'dark') : ''}${p.claimed ? ui.status('Claimed', 'ok') : ''}</div><div class="po-terms">${ui.esc(p.terms)}</div>` },
      { key: 'amount', label: 'Amount', align: 'r', mlabel: true, sort: (p) => p.amount, render: (p) => money(p.amount, 0) },
      { key: 'expires', label: 'Expires', cls: 'nw', mlabel: true, sort: (p) => -p.expires, render: (p) => `<span class="muted">${ui.when(p.expires)}</span>` },
      { key: 'value', label: 'Cash value', align: 'r', sort: (p) => p.estValue, render: (p) => ui.heroFig(money(p.estValue, 0), '', { tone: p.claimed ? '' : 'pos' }) },
    ],
    action: (p) => ui.actions(ui.betAction({ verb: 'Convert →', act: 'conv', tone: p.claimed ? 'outline' : 'primary' })),
    onAction: { conv: (p) => convert(p.id) },
    onOpen: (p) => convert(p.id),
    mobile: { areas: ['promo promo value', 'expires expires amount', 'claimed act act'], cols: 'auto minmax(0,1fr) auto' },
    empty: () => ui.empty({ title: 'No promos match these filters', msg: 'Your filters hide every offer in your state.',
      actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Open Promo Converter', href: '#/promo-converter' }] }),
  });
  $('#po-table').append(table.el);
  table.el.addEventListener('change', (e) => {
    const c = e.target.closest('[data-claim]');
    if (!c) return;
    P.claim(c.dataset.claim, c.checked);
    ui.toast(c.checked ? 'Marked claimed' : 'Marked open');
  });
  ui.onAction($('.po-res'), { reset: () => fb.reset() });

  function drawTable() {
    const list = filtered().map((p, i) => ({ ...p, _rank: i + 1 }));
    const sum = list.filter((p) => !p.claimed).reduce((a, p) => a + p.estValue, 0);
    $('#po-count').innerHTML = `<b>${list.length}</b> promos · <b>${money(sum, 0)}</b> unclaimed in view`;
    table.update(list);
  }

  // ------------------------------------------------------------------ claim plan
  function cashNeeded(p) {
    if (p.newUserOnly && p.type === 'bonus-bet') return Number((p.title.match(/Bet \$(\d+)/) || [0, 10])[1]) || 10;
    if (p.type === 'no-sweat' || p.type === 'second-chance') return p.amount * 1.45;
    if (p.type === 'deposit-match') return p.title.includes('20%') ? p.amount * 5 : p.amount;
    if (p.type === 'profit-boost' || p.type === 'odds-boost') return p.amount * 2.2;
    if (p.type === 'bonus-bet' || p.type === 'referral') return p.amount * 1.4; // hedge cash
    return 5;
  }
  function plan() {
    return all().filter((p) => !p.claimed && p.type !== 'casino-credit')
      .sort((a, b) => (PRIORITY[a.type] - PRIORITY[b.type]) || (b.newUserOnly - a.newUserOnly) || (b.estValue / cashNeeded(b) - a.estValue / cashNeeded(a)))
      .slice(0, 8);
  }
  function drawPlan() {
    let cum = 0;
    const steps = plan();
    const st = store.get().state;
    const why = (p) => (p.type === 'bonus-bet' ? (p.newUserOnly ? 'Instant bonus bets: claim first' : 'Qualify, then convert the bonus bet')
      : p.type === 'no-sweat' || p.type === 'second-chance' ? 'Bet a long shot, convert the refund'
        : p.type === 'deposit-match' ? 'Clear rollover on Low Holds'
          : p.type === 'referral' ? 'Stack with a friend’s welcome offer' : 'Hedge both sides of the boost');
    $('#po-plan').innerHTML = `<p class="po-avail" data-bf-nodata>${money(P.totalValue(all()), 0)} in promos available in ${ui.esc(st)}</p>
      <p class="po-avg">Avg conversion <b data-bf-nodata>68%</b> · bonus bets via Promo Converter</p>
      ${steps.length ? `${ui.cta('Start claim plan →', '', { tone: 'lime', attrs: 'data-act="start"' })}
      <div data-bf-list data-bf-nodata>${steps.map((p) => {
        cum += p.estValue;
        return `<div class="plan-step" data-key="${ui.esc(p.id)}"><span class="ck" aria-hidden="true"></span><div><div class="t1">${ui.book(p.book)}<span>${ui.esc(p.title)}</span></div>
          <div class="t2">${ui.esc(why(p))} · cash needed ≈ ${money(cashNeeded(p), 0)}</div>
          <div class="acts"><button type="button" class="btn sm outline" data-act="conv"><span data-bf-text>Convert</span></button><button type="button" class="btn sm ghost" data-act="done"><span data-bf-text>✓ Done</span></button></div></div>
          <div class="cum">+${money(p.estValue, 0)}<strong>${money(cum, 0)}</strong></div></div>`;
      }).join('')}</div>` : ui.empty('Every promo is claimed. New existing-user offers drop daily.')}`;
  }
  // Start claim plan: the first step, straight into the converter (head button on phones, lime CTA on the tile).
  const start = () => { const s = plan()[0]; if (s) convert(s.id); };
  ui.onAction($('#po-plan-sec'), { start, conv: (id) => convert(id), done: (id) => { P.claim(id, true); ui.toast('Step complete'); } });
  ui.onAction(root.querySelector('.page-head'), { start });

  function drawByBook() {
    const by = {};
    for (const p of all()) if (!p.claimed) by[p.book] = (by[p.book] || 0) + p.estValue;
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const max = rows[0]?.[1] || 1;
    $('#po-bybook').innerHTML = rows.map(([b, v]) => `<div class="bybook">${ui.book(b)}<div class="bar" role="img" aria-label="${ui.esc(api.bookById[b].name)}: ${money(v, 0)}"><i style="width:${(v / max) * 100}%"></i></div><span class="num-cell">${money(v, 0)}</span></div>`).join('');
  }

  function drawHow() {
    $('[data-how]').innerHTML = ui.how({
      summary: 'Claim the offers in the right order, then convert each one to cash.',
      checks: [
        `Instant ${ui.term('bonus_bet', 'bonus bets')} come first: small qualifying bet, quick cash after ${ui.term('conversion', 'conversion')}`,
        `${ui.term('no_sweat', 'No-sweat')} and second-chance offers next: bet a long shot, convert any refund`,
        `${ui.term('deposit_match', 'Deposit matches')} carry ${ui.term('playthrough', 'playthrough')}: clear it with Low Holds`,
        'Cash value is what each promo converts to at typical rates, not its face amount',
      ],
      example: ui.related([['promo-converter', 'Promo Converter'], ['deposit-optimizer', 'Deposit Optimizer'], ['low-holds', 'Low Holds'], ['boosts', 'Profit Boosts']], 'Tools for each step'),
    });
  }

  const drawAll = () => { drawFacts(); drawTools(); drawTable(); drawPlan(); drawByBook(); };
  drawAll(); drawHow();
  const off1 = P.subscribe(() => { drawFacts(); drawTable(); drawPlan(); drawByBook(); });
  let lastState = store.get().state;
  const off2 = store.subscribe((s) => { if (s.state !== lastState) { lastState = s.state; drawAll(); } });
  return () => { off1(); off2(); fb?.destroy?.(); table.destroy(); };
}
