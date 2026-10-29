// UI kit reference screen (#/ui-kit). Not in the nav: a living test page that renders every ui.js
// primitive with the adapter's sample data, in whatever theme is active. QA and screen builders use it
// to check the kit in both themes; qa/ui-kit.md documents each primitive with the same examples.

import { money, pct, arbStakes } from '../lib/odds.js';

export default function render(root, ctx) {
  const { api, store, ui } = ctx;
  const s = store.get();
  const st = { total: s.arbStake || 1000 };
  const arbs = () => api.arbs({ books: store.get().books });
  const first = arbs()[0];

  root.innerHTML = `<div class="kit">
    ${ui.pageHead({
      title: 'UI kit',
      subtitle: 'Every shared primitive from js/ui.js, rendered with sample data. Screens compose these instead of styling their own heads, tables, filters, drawers and states, so the whole app reads as one product in both themes.',
      details: '<p>Docs with usage examples: <code>qa/ui-kit.md</code>. This page is not in the nav.</p>',
      live: true,
      actions: ui.modeSwitch([['pre', 'Pre-match', 12], ['live', 'Live', 4]], ui.initialMode(ctx.params, 'pre', ['pre', 'live'])),
      facts: [
        { label: 'Arbs now', value: String(arbs().length), note: 'at your books' },
        { label: 'Best ROI', value: first ? `+${pct(first.edge, 2)}` : '—', tone: 'pos', term: 'roi' },
        { label: 'Bankroll', value: money(s.bankroll, 0), act: 'sizing' },
        { label: 'Plans', value: 'See', href: '#/pricing' },
      ],
    })}
    <div data-setup></div>

    ${ui.sec('Filter bar and table', '<div data-fb></div><div data-table></div>', { actions: ui.ghost('reset-sort', 'Reset sort') })}

    ${ui.sec('Money actions and risk', `
      <div class="row">${ui.betAction({ verb: 'Bet both', amount: money(st.total, 0) })}
        ${ui.betAction({ verb: 'Bet', amount: '$250', book: 'b365' })}
        ${ui.actions('', [['calc', 'Calc'], ['log', 'Log'], ['alert', 'Alert']])}
        ${ui.heroFig('+$33.70', 'if both fill')} ${ui.heroFig('-$4.10', 'expected cost', { tone: '' })}</div>
      <div class="row" style="margin-top:12px">${['arb', 'lowhold', 'ev', 'sharp'].map((k) => ui.risk(k)).join(' ')}</div>
      <div class="row" style="margin-top:12px">${ui.status('Won', 'ok')} ${ui.status('Lost', 'bad')} ${ui.status('Pending', 'warn')} ${ui.status('Live', 'live')} ${ui.status('Void', 'muted')}
        <span>Line ${ui.price(-110)}${ui.dir(1)}</span> <span>Fair ${ui.na()}</span> ${ui.book('b365')} ${ui.book('hr')} ${ui.book('dk')}</div>
      ${first ? `<div style="margin-top:12px;max-width:520px">${ui.slipLegs(first.legs.map((l, i) => ({ ...l, side: l.outcome, stake: arbStakes(first.legs.map((x) => x.price), st.total).stakes[i] })))}
        ${ui.cashNeeded(first.legs.map((l, i) => ({ book: l.book, stake: arbStakes(first.legs.map((x) => x.price), st.total).stakes[i] })))}</div>` : ''}
      ${ui.evLine({ prob: 0.45, payout: 96, ev: 5.4 })}
      <p class="muted">${ui.kellyLabel()} · ${ui.riskWin(100, 150)} · ${ui.riskWinCents(40, 40)} · Odds: ${ui.price(150)} ${ui.cents(40)}</p>
      <div class="row">${ui.calcLink({ tab: 'arb', a: 150, b: -140, stake: 1000 })} ${ui.related([['sharp-money', 'Sharp Money'], ['bettor-signals', 'Pro Bettor Signals']])}</div>`)}

    ${ui.sec('Words', `<p>Every jargon word is one interaction away: ${ui.term('ev')}, ${ui.term('hold')}, ${ui.term('kelly', 'Kelly')}, ${ui.term('clv', 'CLV')}, ${ui.term('devig')}, ${ui.term('unit', 'units')} and ${ui.term('cents', '¢')}.</p>`)}

    ${ui.how({ summary: 'Bet both sides at two books; the price gap is the profit if both legs fill.', checks: ['Find two books that disagree on a price', 'Bet both sides with the exact stakes we show', 'Whichever side wins, the payout covers both bets'], example: ui.slip({ caption: 'Worked example at $1,000', tag: 'Hedged', legs: [{ title: 'Over 47.5', sub: 'bet365', odds: '+110', stake: '$488' }, { title: 'Under 47.5', sub: 'Fanatics', odds: '-102', stake: '$512' }], result: '+$13.20 if both fill', math: '$488 × 2.10 = $1,024.80 back either way.' }) })}

    ${ui.sec('States', `<div class="grid g2">
      ${ui.empty({ title: 'No arbs match right now', msg: 'Your filters hide every current arb. Loosen them, switch to live, or get pinged when one appears.', actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Switch to Live (4)', href: '#/arbitrage?mode=live' }, { label: 'Alert me', href: '#/alerts' }], near: first ? ui.slipLegs(first.legs.map((l) => ({ ...l, side: l.outcome }))) : '', mate: true })}
      <div>${ui.empty('Old signature: a plain message still works.')}${ui.skeleton({ rows: 3, cols: 4 })}</div></div>
      ${ui.lockCard({ tool: 'arbitrage', count: 17, noun: 'arbs' })}
      <div data-more></div>`)}

    ${ui.sec('Coach Mate, slips and checks', `<div class="grid g2">${ui.mate('<h3>Start with the hedged ones</h3><p>They pay whichever side wins, if both legs fill.</p>', { pose: 'gameplan' })}
      <div>${ui.checks(['No tips, just the math', 'Exact stake for every book', 'You place every bet yourself'])}
      ${ui.cta('Open the Daily Card', 'Sample data. Prices and profits are examples.', { href: '#/daily' })}</div></div>`)}

    ${ui.sec('Drawers and the two-step Bet both', `<div class="row">
      <button type="button" class="btn" data-act="drawer">Open slip drawer</button>
      <button type="button" class="btn" data-act="legflow">Start a Bet both</button>
      <button type="button" class="btn ghost" data-act="sizing">Bet sizing</button></div>
      ${ui.actionBar(`<span class="muted">Sticky action bar (decision screens only)</span>${ui.betAction({ verb: 'Place parlay', amount: '$25', size: '' })}`)}`)}
  </div>`;

  // First-run card (shows only while store.onboarded is false).
  const setup = ui.setupCard(root.querySelector('[data-setup]'));

  // Filter bar + table, proven with the live arb feed.
  const fb = ui.filterBar({
    id: 'kit',
    fields: [
      { key: 'sort', type: 'sort', default: 'roi', options: [['roi', 'Best ROI'], ['profit', 'Most profit'], ['age', 'Newest']] },
      { key: 'books', type: 'books', label: 'Books' },
      { key: 'minRoi', type: 'number', label: 'Min ROI %', default: 0, step: 0.25 },
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
      { key: 'market', type: 'select', label: 'Market', default: 'All', options: ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'] },
      { key: 'mode', type: 'mode', default: 'pre', options: [['pre', 'Pre-match'], ['live', 'Live']], query: true },
      { key: 'devig', type: 'select', label: 'Fair odds from', default: 'multiplicative', options: [['multiplicative', 'Multiplicative'], ['additive', 'Additive'], ['power', 'Power']], advanced: true },
    ],
    onChange: () => paint(),
  });
  root.querySelector('[data-fb]').append(fb.el);

  const seen = new Map();
  const load = () => {
    const f = fb.values;
    return api.arbs({ books: store.get().books, live: f.mode === 'live', sport: f.sport, market: f.market })
      .filter((o) => o.edge * 100 >= (+f.minRoi || 0))
      .map((o) => { if (!seen.has(o.id)) seen.set(o.id, Date.now()); return o; });
  };
  const profit = (o) => arbStakes(o.legs.map((l) => l.price), st.total).profit;
  const t = ui.table({
    id: 'kit-arbs',
    caption: 'Arbitrage opportunities',
    rowKey: (o) => o.id,
    columns: [
      { key: 'roi', label: 'ROI', sort: (o) => o.edge, trend: (o) => o.edge, render: (o) => ui.edge(o.edge), title: ui.termTitle('roi') },
      { key: 'event', label: 'Event', render: (o) => `${ui.eventCell(o.eventId)}` },
      { key: 'legs', label: 'Legs', render: (o) => ui.slipLegs(o.legs.map((l, i) => ({ ...l, side: l.outcome, stake: arbStakes(o.legs.map((x) => x.price), st.total).stakes[i] }))) },
      { key: 'risk', label: 'Risk', pri: 3, render: (o) => ui.risk(o.kind || 'arb', { short: true }) },
      { key: 'market', label: 'Market', pri: 3, render: (o) => `${ui.esc(o.label)} <span class="muted">${ui.esc(o.market)}</span>` },
      { key: 'profit', label: 'Profit', align: 'r', sort: profit, render: (o) => ui.heroFig(`+${money(profit(o))}`, 'if both fill') },
      { key: 'age', label: 'Age', align: 'r', sort: (o) => -seen.get(o.id), render: (o) => `<span class="muted">${ui.age(seen.get(o.id))}</span>` },
    ],
    mobile: { areas: ['roi event age', 'legs legs profit', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
    action: (o) => ui.actions(ui.betAction({ verb: 'Bet both', amount: money(st.total, 0) }), [['calc', 'Calc'], ['log', 'Log']]),
    onAction: {
      bet: (o) => openSlip(o),
      calc: (o) => openSlip(o),
      log: () => ui.toast('Logged (demo)'),
    },
    onOpen: (o) => openSlip(o),
    sort: { key: 'roi', dir: 'desc' },
    empty: () => ui.empty({ title: 'No arbs match right now', msg: 'Loosen the filters or switch to live.', actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Switch to Live', act: 'live' }] }),
  });
  root.querySelector('[data-table]').append(t.el);
  const paint = () => {
    const sortKey = fb.values.sort;
    if (t.sortState()?.key !== sortKey) t.setSort({ key: sortKey, dir: sortKey === 'age' ? 'desc' : 'desc' });
    t.update(load());
  };
  paint();

  // Paging on a static list.
  const pg = ui.pager('kit-more', { step: 5 });
  const list = api.lines({}).slice(0, 23);
  const paintMore = () => {
    root.querySelector('[data-more]').innerHTML = `<ul class="muted">${pg.slice(list).map((l) => `<li>${ui.esc(l.label)} · ${ui.esc(l.market)}</li>`).join('')}</ul>${pg.more(list.length)}`;
  };
  pg.onMore(paintMore);
  paintMore();

  function openSlip(o) {
    const lines = (opp) => {
      const r = arbStakes(opp.legs.map((l) => l.price), st.total);
      return `${ui.slipLegs(opp.legs.map((l, i) => ({ ...l, side: l.outcome, stake: r.stakes[i] })))}
        ${ui.cashNeeded(opp.legs.map((l, i) => ({ book: l.book, stake: r.stakes[i] })))}
        <p>${ui.heroFig(`+${money(r.profit)}`, 'if both fill')}</p>
        <div class="row">${opp.legs.map((l, i) => ui.betAction({ verb: `Leg ${i + 1}`, amount: api.bookById[l.book].short, act: 'leg', book: l.book, size: 'sm', autofocus: i === 0, attrs: { 'data-leg': i } })).join('')}</div>
        <div class="row">${ui.calcLink({ tab: 'arb', a: opp.legs[0].price, b: opp.legs[1]?.price, stake: st.total })}</div>`;
    };
    const body = ui.drawer('Arbitrage slip', `<div data-lines>${lines(o)}</div>`, {
      risk: 'arb',
      kicker: ui.esc(o.event || ''),
      footer: `${ui.betAction({ verb: 'Bet both', amount: money(st.total, 0), size: '' })}${ui.ghost('log', 'Log')}${ui.ghost('alert', 'Alert')}`,
    });
    ui.onAction(body.panel, {
      bet: () => { startFlow(o); ui.toast('Leg 1 next: use the banner or the leg buttons'); },
      leg: (_, el) => { if (!ui.legFlow.get()) startFlow(o); ui.legFlow.open(+el.dataset.leg); },
      log: () => ui.toast('Logged (demo)'),
      alert: () => ui.toast('Alert set (demo)'),
    });
    ui.liveGuard(body, {
      read: () => arbs().find((x) => x.id === o.id) || null,
      onUpdate: (n) => { body.querySelector('[data-lines]').innerHTML = lines(n); return `Price moved: stakes updated, profit now +${money(profit(n))}`; },
    });
  }
  function startFlow(o) {
    const r = arbStakes(o.legs.map((l) => l.price), st.total);
    ui.legFlow.start({
      id: o.id, title: `${o.event || 'Arb'} · Bet both`, exclusive: true,
      legs: o.legs.map((l, i) => ({ book: l.book, label: l.outcome, stake: r.stakes[i], bet: { kind: 'arb', book: l.book, selection: l.outcome, price: l.price, stake: Math.round(r.stakes[i] * 100) / 100, event: o.event } })),
    });
  }

  ui.onAction(root.querySelector('.kit'), {
    drawer: () => first && openSlip(first),
    legflow: () => first && startFlow(first),
    sizing: () => window.dispatchEvent(new CustomEvent('bf:open-sizing')),
    reset: () => fb.reset(),
    live: () => fb.set({ mode: 'live' }),
    'reset-sort': () => t.setSort({ key: 'roi', dir: 'desc' }),
  });
  ui.onMode(root, () => {}, { def: 'pre' });

  const off = api.onTick(() => paint());
  return () => { off(); setup.destroy(); fb.destroy?.(); t.destroy(); };
}
