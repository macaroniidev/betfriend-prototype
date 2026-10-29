// Promo Converter: turn a bonus bet, no-sweat bet, deposit match or profit boost you already hold into cash.
// Ranks exact two-sided bets (the promo at its book + a cash hedge at another of the user's books) by conversion rate.
//
// Layout (UX rebuild items B1–B6, B9, B12, B17, C5):
//   head      results-first: live status + 4 money facts (cash kept, conversion, cash at the 2nd book, open promos)
//   setup     "What do you have?" cards until the first choice, then a remembered seg + the promo form
//   results   the best conversion inline (check bullets + "Show me the 2 bets · keep $672"), then the ranked table
//   drawer    the two bets as slip lines with one button per leg, a two-step "Bet both" (ui.legFlow) and logging
//             only on confirm, outcomes, Open in calculator and Next: Low Holds
//   aside     My open promos + conversion benchmarks
// Editor contract: headings are static, live values sit in nodata nodes, results sit in [data-bf-list].

const CSS = `
.pc .pc-grid { display: grid; gap: 0 24px; grid-template-columns: minmax(0, 1fr); }
.pc .pc-grid > .sec { margin-top: 24px; min-width: 0; }
.pc .pc-grid > .sec:first-child { margin-top: 0; }
@media (min-width: 1360px) {
  .pc .pc-grid { grid-template-columns: minmax(0, 1fr) 320px; grid-template-areas: "res setup" "res promos" "how bench" "how ."; grid-template-rows: auto auto auto 1fr; align-items: start; }
  .pc .pc-setup { grid-area: setup; margin-top: 0 !important; }
  .pc .pc-res { grid-area: res; margin-top: 0 !important; }
  .pc .pc-how { grid-area: how; }
  .pc .pc-promos { grid-area: promos; }
  .pc .pc-bench { grid-area: bench; }
}

/* What do you have? — cards until the first choice */
.pc .pc-picks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.pc .pc-pick { display: grid; gap: 2px; text-align: left; padding: 10px 12px; border: 2px solid var(--line-strong); border-radius: 10px; background: var(--paper); color: var(--text); cursor: pointer; font: inherit; min-width: 0; }
.pc .pc-pick:hover { border-color: var(--g); }
.pc .pc-pick b { font: 900 var(--t-md)/1.05 var(--f-head); text-transform: uppercase; }
.pc .pc-pick small { font-size: var(--t-xs); color: var(--muted); font-weight: 600; line-height: 1.3; }
.pc .pc-pick[aria-pressed="true"] { border-color: var(--g); box-shadow: inset 0 0 0 1px var(--g); background: var(--hl); }
.pc .pc-seg { margin-bottom: 12px; }
.pc .pc-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px 12px; align-items: end; }
.pc .pc-form .field select, .pc .pc-form .field .num { width: 100%; }
.pc .pc-other { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; padding-top: 2px; }
.pc .pc-other .field { gap: 2px; }
.pc .pc-other .field b { color: var(--text); font-size: var(--t-sm); }
.pc .pc-other .field a { font-size: var(--t-xs); }

/* The best conversion, inline */
.pc .pc-best { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 20px; padding: 14px 16px; border: 2px solid var(--g); border-radius: 14px; background: var(--paper); box-shadow: 0 4px 0 var(--line); margin-bottom: 16px; }
.pc .pc-best-top { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--t-sm); }
.pc .pc-best-top .evt { display: inline; }
.pc .pc-best-ev { font-weight: 800; }
.pc .pc-best .bf2-checks { gap: 6px; font-weight: 500; font-size: var(--t-body); }
.pc .pc-best .bf2-checks b { font-weight: 800; font-variant-numeric: tabular-nums; }
.pc .pc-best-side { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 12px; }
.pc .pc-best-acts { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
.pc .pc-best-acts .bet-action { flex: 0 1 auto; }
.pc .pc-cash { margin: 0; font-size: var(--t-sm); color: var(--muted); font-weight: 600; }
.pc .pc-cash b { color: var(--text); font-variant-numeric: tabular-nums; }
.pc .pc-cash .st { margin-right: 4px; vertical-align: 1px; }

/* Ranked table */
.pc .pc-count { font-size: var(--t-sm); color: var(--muted); font-weight: 700; }
.pc td .leg-sub { font-size: var(--t-xs); color: var(--muted); margin-top: 3px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pc td .slip-lines { font-size: var(--t-sm); }
.pc td .sl-side { max-width: 104px; }
.pc td.pc-ev { min-width: 140px; }
.pc td.pc-ev .evt-name { font-weight: 700; }
.pc .ui-t td.act .row-acts { flex-wrap: wrap; justify-content: flex-end; width: 150px; margin-left: auto; row-gap: 2px; }
.pc .pc-conv { display: block; margin-top: 4px; font-size: var(--t-xs); font-weight: 600; color: var(--muted); text-align: right; white-space: nowrap; }
.pc .ui-t td.act .bet-action { flex: 1 1 100%; }
.pc .ui-t tr.top td { background: var(--hl); }
.pc .pc-mrisk { display: none; }
.pc .ui-t .hero-fig b { font-size: var(--t-xl); }

/* My open promos */
.pc .promo-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--line-2); }
.pc .promo-item:last-of-type { border-bottom: 0; }
.pc .promo-item .t1 { font-weight: 700; font-size: var(--t-sm); }
.pc .promo-item.claimed .t1 { text-decoration: line-through; color: var(--muted); }
.pc .promo-item.sel { background: var(--hl); margin: 0 -10px; padding: 10px; border-radius: 10px; border-bottom-color: transparent; }
.pc .promo-item .meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; font-size: var(--t-xs); color: var(--muted); }
.pc .promo-item input { margin-top: 3px; }
.pc .pc-more { margin: 10px 0 0; font-size: var(--t-sm); }

/* Benchmarks */
.pc .bench { display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px 14px; font-size: var(--t-sm); align-items: center; }
.pc .bench .h { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 800; }
.pc .bench .n { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.pc .bench .on { background: var(--hl); border-radius: 6px; padding: 0 6px; margin: 0 -6px; font-weight: 800; }
.pc .bench-note { color: var(--muted); font-size: var(--t-sm); margin: 12px 0 0; }

/* Drawer: the two bets */
.pcd { display: grid; gap: 16px; }
.pcd .callout strong { display: block; }
.pcd .callout .meta { font-size: var(--t-sm); margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pcd .stats.facts { margin: 0; }
.pcd-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
.pcd-steps > li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 4px 10px; padding: 12px 0; border-top: 1px solid var(--line-2); }
.pcd-steps > li:first-child { border-top: 0; padding-top: 0; }
.pcd-steps .ck { width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--line-strong); display: grid; place-items: center; color: var(--g); margin-top: 1px; }
.pcd-steps .ck svg { visibility: hidden; }
.pcd-steps li.done .ck { background: var(--g); border-color: var(--g); color: #FFFFFF; }
.pcd-steps li.done .ck svg { visibility: visible; }
.pcd-steps li.tick .ck { border: 0; }
.pcd-steps li.tick .ck::before { content: ""; width: 11px; height: 6px; border-left: 3px solid var(--g); border-bottom: 3px solid var(--g); transform: translateY(-2px) rotate(-45deg); }
.pcd-steps strong { display: block; font-weight: 800; }
.pcd-steps .what { color: var(--muted); font-size: var(--t-sm); margin-top: 2px; }
.pcd-steps .what b { color: var(--text); font-variant-numeric: tabular-nums; }
.pcd-steps .slip-lines { margin-top: 8px; }
.pcd-steps .leg-btn { margin-top: 10px; }
.pcd h3 { font-size: var(--t-lg); margin: 0 0 8px; }
.pcd .sc { width: 100%; border-collapse: collapse; font-size: var(--t-sm); }
.pcd .sc th, .pcd .sc td { padding: 7px 6px; border-bottom: 1px solid var(--line-2); text-align: right; font-variant-numeric: tabular-nums; }
.pcd .sc th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; font-weight: 800; }
.pcd .sc th:first-child, .pcd .sc td:first-child { text-align: left; }
.pcd .sc td.net { font-weight: 800; color: var(--pos); }
.pcd .pcd-when { font-size: var(--t-xs); color: var(--muted); }
.pcd .pcd-links { display: grid; gap: 10px; }

@media (max-width: 860px) {
  /* The head link repeats the facts' "Open promos" link and the promos list link: phones keep the page short. */
  .pc .page-head .head-actions { display: none; }
  .pc .pc-best { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .pc .pc-best-side { flex-direction: row; align-items: center; }
  .pc .pc-best-acts .bet-action { flex: 1 1 100%; }
  .pc td .sl-side { max-width: 130px; }
  .pc .ui-t td.act .row-acts { max-width: none; flex-wrap: nowrap; }
  .pc .ui-t td.act .bet-action { flex: 1 1 auto; }
  .pc td.pc-ev { min-width: 0; }
  .pc .ui-t tr.top { background: var(--hl); padding-inline: 8px; border-radius: 10px; }
  .pc .ui-t tr.top td { background: none; }
  .pc .pc-drisk { display: none; }
  .pc .ui-t td.act { justify-content: space-between !important; align-items: center; gap: 8px; }
  .pc .pc-mrisk { display: inline-flex; }
  .pc .ui-t td.act .row-acts { width: auto; margin-left: 0; }
  .pc .pc-best-side > div { display: flex; align-items: baseline; gap: 10px; }
  .pc .pc-best .pc-conv { display: inline; text-align: left; }
  .pc .promo-item.sel { margin: 0 -8px; padding: 10px 8px; }
}
@media (max-width: 420px) {
  .pc .pc-pick { padding: 8px 10px; }
  .pc .pc-pick small { display: none; }
}`;

const TYPES = [
  ['bonus-bet', 'Bonus bet', 'Site credit: you keep the winnings, not the stake'],
  ['no-sweat', 'No-sweat', 'A cash bet refunded as a bonus bet if it loses'],
  ['deposit-match', 'Deposit match', 'Bonus funds on your deposit, with playthrough'],
  ['profit-boost', 'Profit boost', 'Extra winnings on one bet'],
];
const TYPE_IDS = TYPES.map(([t]) => t);
const PROMO_WORD = { 'bonus-bet': 'bonus bet', 'no-sweat': 'no-sweat cash bet', 'deposit-match': 'bonus funds', 'profit-boost': 'profit boost' };
const AMOUNT_LABEL = { 'profit-boost': 'Max stake', 'no-sweat': 'No-sweat stake', 'deposit-match': 'Promo amount', 'bonus-bet': 'Promo amount' };
// The glossary entry for each promo type (ui.term).
const TYPE_TERM = { 'bonus-bet': 'bonus_bet', 'no-sweat': 'no_sweat', 'deposit-match': 'deposit_match', 'profit-boost': 'boost' };

export default function render(root, { api, store, ui, odds, params }) {
  if (!document.getElementById('css-pc')) document.head.insertAdjacentHTML('beforeend', `<style id="css-pc">${CSS}</style>`);
  const P = api.promos;
  const v = ui.view('promo-converter');
  const S = { type: 'bonus-bet', amount: 200, book: 'dk', boostPct: 50, promoId: null, playthrough: 1 };
  let picked = !!v.get('picked', false); // "What do you have?" cards until the first choice, then a seg
  let results = [];
  const money = odds.money;
  const bookName = (id) => api.bookById[id]?.name || id;
  const stateBooks = () => P.booksInState(store.get().state);
  const userBooks = () => store.get().books;

  const fromPromo = (p) => {
    if (!p) return;
    S.promoId = p.id; S.book = p.book; S.amount = p.amount; S.playthrough = p.playthrough || 1;
    S.type = TYPE_IDS.includes(P.strategyFor(p.type)) ? P.strategyFor(p.type) : 'bonus-bet';
    if (p.boostPct) S.boostPct = Math.round(p.boostPct * 100);
  };
  const firstOpen = (types) => P.promos({ state: store.get().state }).find((p) => !p.claimed && types.includes(P.strategyFor(p.type)));

  // Where to start: ?promo= → ?type/book/amount (a shared link) → the remembered type → the first open promo.
  if (params.promo && P.promoById(params.promo)) fromPromo(P.promoById(params.promo));
  else if (TYPE_IDS.includes(params.type)) {
    S.type = params.type;
    const p = firstOpen([S.type]);
    if (p) fromPromo(p);
    if (params.book && stateBooks().includes(params.book)) S.book = params.book;
    if (Number.isFinite(+params.amount) && +params.amount > 0) S.amount = +params.amount;
    if (params.book || params.amount) S.promoId = null;
  } else if (picked && TYPE_IDS.includes(v.get('type'))) {
    S.type = v.get('type');
    const p = firstOpen([S.type]);
    if (p) fromPromo(p);
  } else fromPromo(firstOpen(['bonus-bet', 'no-sweat']));

  // Mirror the form into the hash so a link (or a reload) reproduces it (B9).
  const syncQuery = () => ui.setQuery({ promo: S.promoId, type: S.promoId ? null : S.type, book: S.promoId ? null : S.book, amount: S.promoId ? null : S.amount });

  root.innerHTML = `<div class="pc">
    ${ui.pageHead({ title: 'Promo Converter', tool: 'promo-converter', live: true,
      subtitle: 'Turn a bonus bet or promo you already hold into cash you can withdraw: we find the two bets and the exact stakes.',
      actions: `<a class="btn sm outline" href="#/promo-optimizer">${ui.icon('map', { size: 16 })}<span>All promos in your state</span></a>`,
      facts: factItems(null) })}
    <div class="pc-grid">
      <section class="sec pc-setup" id="pc-form"><div class="sec-head"><h2>What do you have?</h2></div><div data-setup></div></section>
      <section class="sec pc-res"><div class="sec-head"><h2>Best conversions right now</h2><span class="pc-count" data-bf-nodata id="pc-count"></span></div>
        <div id="pc-best" data-bf-list data-bf-nodata></div>
        <div id="pc-results"></div></section>
      <div class="pc-how" data-how></div>
      <section class="sec pc-promos"><div class="sec-head"><h2>My open promos</h2><span class="tag" id="pc-state" data-bf-nodata></span></div><div id="pc-promos"></div></section>
      <section class="sec pc-bench"><div class="sec-head"><h2>Conversion benchmarks</h2></div><div id="pc-bench"></div></section>
    </div></div>`;

  const $ = (s) => root.querySelector(s);

  // ------------------------------------------------------------------ facts (head)
  function factItems(best) {
    const open = P.promos({ state: store.get().state }).filter((p) => !p.claimed);
    const [g] = best ? P.grade(S.type, best.rate) : ['—'];
    return [
      { label: 'Cash kept', value: best ? money(best.kept) : '—', tone: best ? 'pos' : '', note: 'whichever side wins' },
      { label: 'Conversion rate', term: 'conversion', value: best ? odds.pct(best.rate) : '—', note: best ? `${g} for a ${PROMO_WORD[S.type]}` : '' },
      { label: 'Cash you need at the second book', value: best ? money(best.hedgeLeg.stake) : '—', note: best ? `at ${ui.esc(bookName(best.hedgeLeg.book))}` : '' },
      { label: `Open promos in ${store.get().state}`, value: String(open.length), note: `≈ ${money(P.totalValue(open), 0)} cash value`, href: '#/promo-optimizer' },
    ];
  }
  let factsHtml = '';
  function paintFacts(best) {
    const h = ui.facts(factItems(best));
    if (h === factsHtml) return;
    factsHtml = h;
    const el = root.querySelector('.page-head .facts');
    if (el) el.outerHTML = h;
  }

  // ------------------------------------------------------------------ setup: what do you have + the form
  function drawForm() {
    const books = stateBooks();
    if (!books.includes(S.book)) S.book = books[0];
    const picker = picked
      ? `<div class="pc-seg">${ui.seg('type', TYPES.map(([t, l]) => [t, l]), S.type)}</div>`
      : `<div class="pc-picks" role="group" aria-label="What do you have?">${TYPES.map(([t, l, d]) => `<button type="button" class="pc-pick" data-pick="${t}" aria-pressed="${t === S.type}"><b>${ui.esc(l)}</b><small>${ui.esc(d)}</small></button>`).join('')}</div>`;
    const third = S.type === 'profit-boost' ? ui.numberInput('boost', S.boostPct, 'Boost %', { step: 5 })
      : S.type === 'deposit-match' ? ui.numberInput('pt', S.playthrough, 'Playthrough ×', { step: 1, min: 1 }) : '';
    $('#pc-form [data-setup]').innerHTML = `${picker}
      <div class="pc-form">
        ${ui.select('book', books.map((b) => [b, bookName(b)]), S.book, 'Promo sportsbook')}
        ${ui.numberInput('amount', S.amount, AMOUNT_LABEL[S.type], { prefix: '$', step: 5 })}
        ${third}
        <div class="pc-other">
          <div class="field"><span>Where we’ll place the other side</span><b data-bf-nodata>${userBooks().length} of your books + exchanges</b><a href="#/account">Change your books</a></div>
          <button type="button" class="btn sm outline" id="pc-go">Find conversions</button>
        </div>
      </div>`;
    const form = $('#pc-form');
    const choose = (t) => {
      S.type = t; S.promoId = null;
      if (!picked) { picked = true; }
      v.set({ picked: true, type: t });
      syncQuery(); drawForm(); compute(); drawPromos(); drawBench();
    };
    form.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      choose(b.dataset.pick);
      // Keep focus on the control that replaced the card (the seg button for the same type).
      form.querySelector(`[data-seg="type"] button[data-v="${window.CSS.escape(S.type)}"]`)?.focus();
    }));
    ui.onSeg(form, 'type', (t) => choose(t));
    ui.onSelect(form, 'book', (b) => { S.book = b; S.promoId = null; syncQuery(); compute(); drawPromos(); });
    ui.onNumber(form, 'amount', (n) => { S.amount = n; S.promoId = null; syncQuery(); compute(); });
    ui.onNumber(form, 'boost', (n) => { S.boostPct = n; compute(); });
    ui.onNumber(form, 'pt', (n) => { S.playthrough = n; compute(); });
    $('#pc-go').addEventListener('click', () => { compute(); ui.toast(`${results.length} conversions found`); });
  }

  const spec = () => ({ type: S.type, amount: S.amount, book: S.book, boostPct: S.boostPct / 100, playthrough: S.playthrough });
  const keyOf = (c) => `${c.lineId}|${c.promoLeg.outcome}`;
  const calcHref = (c) => `#/calculators?${new URLSearchParams({ tab: 'bonus', a: String(c.promoLeg.price), b: String(c.hedgeLeg.price), stake: String(S.amount) })}`;
  const promoNote = (c) => (S.type === 'profit-boost' ? `boosted from ${ui.fmtOdds(c.promoLeg.basePrice)}` : S.type === 'no-sweat' ? 'cash' : 'bonus');

  // ------------------------------------------------------------------ ranked table (keyed, live)
  const table = ui.table({
    id: 'pc-conv', caption: 'Best conversions for your promo', rowKey: keyOf, tools: true,
    sort: { key: 'kept', dir: 'desc' },
    rowClass: (c) => (c._rank === 1 ? 'top' : ''),
    columns: [
      { key: 'event', label: 'Event', cls: 'pc-ev', render: (c) => `${ui.eventCell(c.eventId)}<div class="leg-sub"><span class="pc-drisk">${ui.risk('promo', { short: true })}</span><span>${ui.esc(c.label)}</span></div>` },
      { key: 'legs', label: 'Promo bet · Hedge bet', title: 'The promo bet at its book, then the cash hedge at a second book', render: (c) => ui.slipLegs([
        { book: c.promoLeg.book, price: c.promoLeg.price, side: c.promoLeg.outcome, stake: `${money(c.promoLeg.stake, 0)} <small class="muted">${ui.esc(promoNote(c))}</small>` },
        { book: c.hedgeLeg.book, price: c.hedgeLeg.price, side: c.hedgeLeg.outcome, stake: c.hedgeLeg.stake },
      ]) },
      { key: 'kept', label: 'Cash kept', align: 'r', title: `Cash you keep whichever side wins, and the conversion rate: ${ui.termTitle('conversion')}`, sort: (c) => c.kept, trend: (c) => c.kept,
        render: (c) => `${ui.heroFig(money(c.kept))}<small class="pc-conv">${odds.pct(c.rate)} conversion · ${ui.esc(P.grade(S.type, c.rate)[0])}</small>` },
    ],
    // Phones show the risk label in the action row (keeps rows short); wider screens show it under the event.
    action: () => `<span class="pc-mrisk">${ui.risk('promo', { short: true })}</span>${ui.actions(ui.betAction({ verb: 'Convert', act: 'convert' }), [['calc', 'Calc'], ['log', 'Log']])}`,
    onAction: { convert: (c) => openSteps(c), calc: (c) => { location.hash = calcHref(c); }, log: (c) => logBoth(c) },
    onOpen: (c) => openSteps(c),
    mobile: { areas: ['event kept', 'legs legs', 'act act'], cols: 'minmax(0,1fr) auto' },
    empty: () => ui.empty({ title: 'No two-sided bets for this promo right now',
      msg: `Nothing at ${ui.esc(bookName(S.book))} pairs with a hedge at your books at the moment. Try another sportsbook or promo type.`,
      actions: [{ label: 'Try another book', act: 'focus-book' }, { label: 'All promos in your state', href: '#/promo-optimizer' }, { label: 'Change your books', href: '#/account' }] }),
  });
  $('#pc-results').append(table.el);
  ui.onAction($('#pc-results'), { 'focus-book': () => $('#pc-form select[data-sel="book"], #pc-form select')?.focus() });

  // ------------------------------------------------------------------ the best conversion, inline
  function bestHtml(c) {
    const pb = bookName(c.promoLeg.book), hb = bookName(c.hedgeLeg.book);
    const [g, gk] = P.grade(S.type, c.rate);
    const health = api.tracker.health()[c.hedgeLeg.book];
    const short = health ? c.hedgeLeg.stake - (health.balance || 0) : 0;
    const cash = !health ? '' : short > 0.005
      ? `<p class="pc-cash">${ui.status('Top up first', 'warn')}You have <b>${money(health.balance || 0, 0)}</b> at ${ui.esc(hb)}: add <b>${money(short, 0)}</b> before the hedge. <a href="#/deposit-optimizer">Plan the deposit</a></p>`
      : `<p class="pc-cash">${ui.status('Covered', 'ok')}You have <b>${money(health.balance || 0, 0)}</b> at ${ui.esc(hb)}, enough for the hedge.</p>`;
    return `<article class="pc-best" data-key="${ui.esc(keyOf(c))}">
      <div class="pc-best-top">${ui.risk('promo')}${ui.tag(g, gk)}<span class="pc-best-ev">${ui.esc(eventName(c.eventId))}</span><span class="muted">${ui.esc(c.label)}</span></div>
      ${ui.checks([
        `Bet your <b>${money(c.promoLeg.stake, 0)}</b> ${ui.esc(PROMO_WORD[S.type])} on <b>${ui.esc(c.promoLeg.outcome)}</b> at ${ui.esc(pb)} (${ui.esc(ui.fmtOdds(c.promoLeg.price))})`,
        `Hedge <b>${money(c.hedgeLeg.stake)}</b> cash on <b>${ui.esc(c.hedgeLeg.outcome)}</b> at ${ui.esc(hb)} (${ui.esc(ui.fmtOdds(c.hedgeLeg.price))})`,
        `Keep about <b>${money(c.kept)}</b> whichever side wins`,
      ])}
      <div class="pc-best-side"><div>${ui.heroFig(money(c.kept))}<small class="pc-conv">${odds.pct(c.rate)} conversion</small></div></div>
      ${cash}
      <div class="pc-best-acts">${ui.betAction({ verb: 'Show me the 2 bets', amount: `· keep ${money(c.kept, 0)}`, act: 'convert', size: '' })}${ui.ghost('calc', 'Calc', { href: calcHref(c) })}${ui.ghost('log', 'Log')}</div>
    </article>`;
  }
  const eventName = (id) => { const e = api.eventById(id); return e ? `${e.away} @ ${e.home}` : ''; };
  let bestCache = '';
  ui.onAction($('#pc-best'), {
    convert: () => results[0] && openSteps(results[0]),
    log: () => results[0] && logBoth(results[0]),
  });

  // ------------------------------------------------------------------ compute + paint (every tick)
  function compute() {
    results = P.bestConversions(spec(), api.lines(), { books: userBooks(), limit: 12 });
    results.forEach((c, i) => { c._rank = i + 1; });
    const best = results[0];
    paintFacts(best);
    const cnt = `${results.length} ranked bets · updates live`;
    if ($('#pc-count').textContent !== cnt) $('#pc-count').textContent = cnt;
    const h = best ? bestHtml(best) : '';
    if (h !== bestCache) { bestCache = h; $('#pc-best').innerHTML = h; }
    $('#pc-best').hidden = !best;
    table.update(results);
  }

  // ------------------------------------------------------------------ logging (one linked group, bonus-aware)
  function legBets(c) {
    const base = { kind: 'promo', sport: c.sport, market: c.market };
    const bonusLeg = S.type === 'bonus-bet' || S.type === 'deposit-match';
    return [
      { ...base, book: c.promoLeg.book, selection: `${c.promoLeg.outcome} (${PROMO_WORD[S.type]})`, price: c.promoLeg.price, stake: Math.round(c.promoLeg.stake * 100) / 100, bonus: bonusLeg },
      { ...base, book: c.hedgeLeg.book, selection: `${c.hedgeLeg.outcome} (hedge)`, price: c.hedgeLeg.price, stake: Math.round(c.hedgeLeg.stake * 100) / 100 },
    ];
  }
  function logBoth(c) {
    api.tracker.addGroup(legBets(c), { exclusive: true });
    const promo = S.promoId ? P.promoById(S.promoId) : null;
    if (promo) P.claim(promo.id, true);
    ui.toast('Both bets logged to your Bet Tracker');
  }

  // ------------------------------------------------------------------ drawer: the two bets, step by step
  function openSteps(c0) {
    let c = c0;
    const flowId = `pc-${keyOf(c)}`;
    const promo = S.promoId ? P.promoById(S.promoId) : null;
    const e = api.eventById(c.eventId);
    const total = () => (S.type === 'no-sweat' || S.type === 'profit-boost' ? c.promoLeg.stake : 0) + c.hedgeLeg.stake;
    const flow = () => { const f = ui.legFlow.get(); return f && f.id === flowId ? f : null; };
    const opened = (i) => !!flow()?.legs[i]?.opened;

    const factsHtml_ = () => ui.facts([
      { label: 'Cash kept', value: money(c.kept), tone: 'pos' },
      { label: 'Conversion', term: 'conversion', value: odds.pct(c.rate) },
      { label: 'Total cash out', value: money(total()) },
    ]);
    const legWhat = (i) => (i === 0
      ? `${ui.esc(c.promoLeg.outcome)} at <b>${ui.esc(ui.fmtOdds(c.promoLeg.price))}</b> for <b>${money(c.promoLeg.stake, 0)}</b>${S.type === 'profit-boost' ? ` with your ${S.boostPct}% boost applied (base ${ui.esc(ui.fmtOdds(c.promoLeg.basePrice))})` : ''}.`
      : `${ui.esc(c.hedgeLeg.outcome)} at <b>${ui.esc(ui.fmtOdds(c.hedgeLeg.price))}</b> for <b>${money(c.hedgeLeg.stake)}</b> cash.`);
    const legBtn = (i) => {
      const bk = i === 0 ? c.promoLeg.book : c.hedgeLeg.book;
      return ui.betAction({ verb: opened(i) ? 'Opened ✓ · open again' : 'Open bet slip', amount: ui.esc(bookName(bk)), act: 'leg', book: bk, tone: opened(i) ? 'ghost' : 'outline', autofocus: i === 0, attrs: { 'data-leg': i } });
    };
    const outcomes = () => `<table class="sc"><thead><tr><th>If this wins</th><th>Promo leg</th><th>Hedge leg</th><th>Net</th></tr></thead><tbody>
        <tr><td>${ui.esc(c.promoLeg.outcome)}</td><td>${money(c.promoLeg.stake * (odds.toDecimal(c.promoLeg.price) - 1))}</td><td>${money(-c.hedgeLeg.stake)}</td><td class="net">${money(c.ifWin)}</td></tr>
        <tr><td>${ui.esc(c.hedgeLeg.outcome)}</td><td>${S.type === 'no-sweat' ? `${money(-c.promoLeg.stake)} <span class="muted">+ refund</span>` : S.type === 'profit-boost' ? money(-c.promoLeg.stake) : '$0.00'}</td><td>${money(c.hedgeLeg.stake * (odds.toDecimal(c.hedgeLeg.price) - 1))}</td><td class="net">${money(c.ifLose)}</td></tr>
      </tbody></table>`;

    const body = ui.drawer('Convert step by step', `<div class="pcd">
      ${promo ? `<div class="callout lime"><strong>${ui.esc(promo.title)}</strong><div class="meta">${ui.book(promo.book, { full: true })} · ${ui.esc(P.typeLabel(promo.type))}</div></div>` : ''}
      <div data-facts>${factsHtml_()}</div>
      <ul class="pcd-steps">
        <li data-step="0"><span class="ck" aria-hidden="true">${ui.icon('check', { size: 14 })}</span><div><strong>Open ${ui.esc(bookName(c.promoLeg.book))} and place the <span>${ui.term(TYPE_TERM[S.type], PROMO_WORD[S.type])}</span></strong>
          <div class="what" data-what="0">${legWhat(0)}</div><div class="leg-btn" data-legbtn="0">${legBtn(0)}</div></div></li>
        <li data-step="1"><span class="ck" aria-hidden="true">${ui.icon('check', { size: 14 })}</span><div><strong>Hedge at ${ui.esc(bookName(c.hedgeLeg.book))}</strong>
          <div class="what" data-what="1">${legWhat(1)}</div><div class="leg-btn" data-legbtn="1">${legBtn(1)}</div></div></li>
        <li class="tick"><span class="ck" aria-hidden="true"></span><div><strong>Confirm both prices before submitting</strong><div class="what">If either price has moved, this slip says so: the stakes recalculate on every update.</div></div></li>
        <li class="tick"><span class="ck" aria-hidden="true"></span><div><strong>Collect <span data-bf-nodata data-keep>${money(c.kept)}</span> whichever side wins</strong><div class="what">${S.type === 'no-sweat' ? 'If the cash bet loses, the refund bonus bet lands in your account. Convert it here at ~70% to complete the profit.' : 'Withdraw or roll the cash into your next promo.'}</div></div></li>
      </ul>
      <div data-cash>${ui.cashNeeded([{ book: c.promoLeg.book, stake: S.type === 'no-sweat' || S.type === 'profit-boost' ? c.promoLeg.stake : 0 }, { book: c.hedgeLeg.book, stake: c.hedgeLeg.stake }].filter((l) => l.stake > 0))}</div>
      <section><h3>Outcomes</h3><div data-outcomes>${outcomes()}</div></section>
      <div class="pcd-links">
        <div class="row">${ui.calcLink({ tab: 'bonus', a: c.promoLeg.price, b: c.hedgeLeg.price, stake: S.amount })}<span class="spacer"></span><span class="pcd-when">${ui.esc(e?.sport || '')} · ${ui.when(e?.start || Date.now())}</span></div>
        ${ui.related([['low-holds', 'Next: clear playthrough with Low Holds'], ['deposit-optimizer', 'Fund the second book'], ['promo-optimizer', 'All promos in your state']], 'Next')}
      </div>
    </div>`, { risk: 'promo', kicker: ui.esc(`${eventName(c.eventId)} · ${c.label}`) });

    // Footer: one primary that walks the two steps (Bet both → Open leg 2 → Log both bets).
    function paintFoot() {
      const f = flow();
      const next = f ? f.legs.findIndex((l) => !l.opened) : 0;
      let primary;
      if (!f) primary = ui.betAction({ verb: 'Bet both', amount: money(total()), act: 'both', size: '', book: c.promoLeg.book });
      else if (next >= 0) {
        const bk = next === 0 ? c.promoLeg.book : c.hedgeLeg.book;
        primary = ui.betAction({ verb: `Open leg ${next + 1}`, amount: ui.esc(bookName(bk)), act: 'leg', size: '', book: bk, attrs: { 'data-leg': next } });
      } else primary = ui.betAction({ verb: 'Log both bets', act: 'log', size: '' });
      const claim = promo && !P.isClaimed(promo.id) ? ui.ghost('claim', 'Mark promo claimed') : '';
      body.setFooter(`${primary}${f && next < 0 ? '' : ui.ghost('log', 'Log both bets')}${claim}`);
      [0, 1].forEach((i) => {
        body.querySelector(`[data-step="${i}"]`)?.classList.toggle('done', opened(i));
        const slot = body.querySelector(`[data-legbtn="${i}"]`);
        if (slot) slot.innerHTML = legBtn(i);
      });
    }
    const startFlow = () => {
      if (flow()) return;
      const bets = legBets(c);
      ui.legFlow.start({ id: flowId, title: `${eventName(c.eventId)} · convert ${PROMO_WORD[S.type]}`, exclusive: true,
        legs: [{ book: c.promoLeg.book, label: c.promoLeg.outcome, stake: c.promoLeg.stake, bet: bets[0] }, { book: c.hedgeLeg.book, label: c.hedgeLeg.outcome, stake: c.hedgeLeg.stake, bet: bets[1] }] });
    };
    const finish = () => {
      if (flow()) ui.legFlow.confirm(); else logBoth(c);
      if (promo) P.claim(promo.id, true);
      ui.closeDrawer();
    };
    ui.onAction(body.panel, {
      both: () => { startFlow(); ui.legFlow.open(0); paintFoot(); },
      leg: (_, el) => { startFlow(); ui.legFlow.open(+el.dataset.leg); paintFoot(); },
      log: () => finish(),
      claim: (_, el) => { P.claim(promo.id, true); el.remove(); ui.toast('Promo marked claimed'); },
    });
    paintFoot();

    // Stale-price guard: re-read this conversion every tick; numbers update in place, buttons keep focus.
    ui.liveGuard(body, {
      read: () => P.bestConversions(spec(), api.lines(), { books: userBooks(), limit: 40 }).find((x) => keyOf(x) === keyOf(c0)) || null,
      sig: (x) => `${x.promoLeg.price}|${x.hedgeLeg.book}:${x.hedgeLeg.price}`,
      onUpdate: (n, prev) => {
        c = n;
        body.querySelector('[data-facts]').innerHTML = factsHtml_();
        [0, 1].forEach((i) => { body.querySelector(`[data-what="${i}"]`).innerHTML = legWhat(i); });
        body.querySelector('[data-keep]').textContent = money(c.kept);
        body.querySelector('[data-outcomes]').innerHTML = outcomes();
        body.querySelector('[data-cash]').innerHTML = ui.cashNeeded([{ book: c.promoLeg.book, stake: S.type === 'no-sweat' || S.type === 'profit-boost' ? c.promoLeg.stake : 0 }, { book: c.hedgeLeg.book, stake: c.hedgeLeg.stake }].filter((l) => l.stake > 0));
        if (!flow()) paintFoot();
        return `Price moved: you now keep ${money(n.kept)} (was ${money(prev?.kept ?? n.kept)})`;
      },
    });
  }

  // ------------------------------------------------------------------ aside: my open promos + benchmarks
  function drawPromos() {
    const st = store.get().state;
    $('#pc-state').textContent = st;
    const list = P.promos({ state: st }).filter((p) => ['bonus-bet', 'no-sweat', 'deposit-match', 'profit-boost', 'second-chance', 'referral', 'odds-boost'].includes(p.type)).slice(0, 9);
    $('#pc-promos').innerHTML = `<div data-bf-list data-bf-nodata>${list.map((p) => `<div class="promo-item${p.claimed ? ' claimed' : ''}${p.id === S.promoId ? ' sel' : ''}">
        <input type="checkbox" data-claim="${ui.esc(p.id)}" ${p.claimed ? 'checked' : ''} aria-label="Mark claimed: ${ui.esc(p.title)}">
        <div><div class="t1">${ui.esc(p.title)}</div><div class="meta">${ui.book(p.book)} ${ui.tag(P.typeLabel(p.type))} <span>≈ ${money(p.estValue, 0)}</span>${p.claimed ? ui.status('Claimed', 'ok') : ''}</div></div>
        <button type="button" class="btn sm ${p.id === S.promoId ? 'ghost' : 'outline'}" data-use="${ui.esc(p.id)}"${p.id === S.promoId ? ' aria-pressed="true"' : ''}><span data-bf-text>${p.id === S.promoId ? 'Selected' : 'Use'}</span></button></div>`).join('')}</div>
      <p class="pc-more"><a href="#/promo-optimizer">See every promo in ${ui.esc(st)} →</a></p>`;
    $('#pc-promos').querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => {
      fromPromo(P.promoById(b.dataset.use));
      if (!picked) { picked = true; }
      v.set({ picked: true, type: S.type });
      syncQuery(); drawForm(); compute(); drawPromos(); drawBench();
    }));
    $('#pc-promos').querySelectorAll('[data-claim]').forEach((c) => c.addEventListener('change', () => P.claim(c.dataset.claim, c.checked)));
  }

  function drawBench() {
    $('#pc-bench').innerHTML = `<div class="bench"><span class="h">Promo</span><span class="h n">Good</span><span class="h n">Great</span><span class="h n">Elite</span>
      ${Object.entries(P.BENCHMARKS).map(([k, b]) => { const on = k === S.type ? ' on' : ''; return `<span class="${on.trim()}">${ui.esc(P.typeLabel(k))}</span><span class="n">${odds.pct(b.good, 0)}</span><span class="n">${odds.pct(b.great, 0)}</span><span class="n">${odds.pct(b.elite, 0)}+</span>`; }).join('')}</div>
      <p class="bench-note">${ui.esc(P.BENCHMARKS[S.type]?.note || '')}</p>`;
  }

  // ------------------------------------------------------------------ how this makes money (collapsed)
  function drawHow() {
    const c = results[0];
    const example = c ? ui.slip({ caption: 'Worked example', tag: 'Sample prices',
      legs: [
        { title: ui.esc(c.promoLeg.outcome), sub: `${ui.esc(bookName(c.promoLeg.book))} · your ${ui.esc(PROMO_WORD[S.type])}`, odds: ui.esc(ui.fmtOdds(c.promoLeg.price)), stake: money(c.promoLeg.stake, 0) },
        { title: ui.esc(c.hedgeLeg.outcome), sub: `${ui.esc(bookName(c.hedgeLeg.book))} · cash hedge`, odds: ui.esc(ui.fmtOdds(c.hedgeLeg.price)), stake: money(c.hedgeLeg.stake) },
      ],
      result: `Keep about ${money(c.kept)} whichever side wins`,
      math: `${odds.pct(c.rate)} of a ${money(S.amount, 0)} ${ui.esc(PROMO_WORD[S.type])}` }) : '';
    $('[data-how]').innerHTML = ui.how({ cls: 'pc-how-in',
      summary: 'Bet the promo on one side, cover the other side with cash, keep the difference.',
      checks: [
        `A ${ui.term('bonus_bet', 'bonus bet')} pays only its winnings, so bet it on a longer price at the promo book`,
        `Bet the other side with cash at a second book, sized so both outcomes pay about the same (a ${ui.term('hedge', 'hedge')})`,
        `What you keep, as a share of the promo, is the ${ui.term('conversion', 'conversion rate')}; 70% or more is strong for a bonus bet`,
        `Deposit matches carry ${ui.term('playthrough', 'playthrough')}: clear it cheaply with Low Holds`,
      ],
      example });
  }

  drawForm(); compute(); drawPromos(); drawBench(); drawHow();
  const offTick = api.onTick(() => compute());
  const offPromo = P.subscribe(() => { drawPromos(); paintFacts(results[0]); });
  const offStore = store.subscribe(() => { drawForm(); compute(); drawPromos(); });
  return () => { offTick(); offPromo(); offStore(); table.destroy(); };
}
