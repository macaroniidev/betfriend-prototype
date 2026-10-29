// Exit Alerts: your open prediction-market positions with live P&L, and alerts telling you when to sell
// early (target hit, trailing stop, trader exited, edge gone, news, price spike).
// Results-first (B1): live status + 4 facts in the head, then the alert feed. Each alert and position has
// ONE primary (B2: "Sell $732 on Polymarket ↗" / "Trim 50% …") and labelled ghosts. No red fills (B7): the
// action word and icon carry the meaning. Exit levels sit in the position's meta line (C9).

const CSS = `
/* Tighter head-to-results spacing so the first result sits within the 300px target at 1440 (B1). */
.pmx .page-head.ph { margin-bottom: 6px; }
.pmx .page-head.ph > .facts { margin-top: 2px; }
.pmx .layout .sec-head .seg button, .pmx .layout .sec-head .btn.sm { padding-block: 3px; }
.pmx .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: start; }
.pmx .col { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; min-width: 0; }
.pmx .layout > .sec, .pmx .col > .sec:first-child { margin-top: 0; }
.pmx .layout .sec { padding-top: 8px; }
/* Section labels in the PM family are small kickers, so the first alert sits high (B1). */
.pmx .layout .sec-head { margin-bottom: 8px; }
/* Section headings use the shared .sec scale (app.css .sec-head h2), like every other screen. */
.pmx .sec-head .h-l { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.pmx .sec-note { margin: 0; font-size: var(--t-xs); color: var(--muted); font-weight: 600; }
.pmx .aside .sec-note { margin: -4px 0 12px; }
.pmx .alerts { display: grid; border-top: 1px solid var(--line); }
.pmx .al { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 11px 4px; border-bottom: 1px solid var(--line); }
.pmx .al.fresh { animation: pmx-in 1.6s ease; }
@keyframes pmx-in { from { background: var(--hl); } to { background: transparent; } }
.pmx .aic { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 17px; font-weight: 800; }
.pmx .aic.sell { background: var(--warn-bg); color: var(--warn); }
.pmx .aic.trim { background: var(--soft); color: var(--accent); }
.pmx .al .msg { margin: 0; font-weight: 700; }
.pmx .al .msg .act { font: 900 var(--t-md)/1 var(--f-head); text-transform: uppercase; letter-spacing: .02em; }
.pmx .al .meta { font-size: var(--t-xs); color: var(--muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.pmx .pos { color: var(--pos); } .pmx .neg { color: var(--neg); }
/* YES / NO side tags: identical styling (symmetric, B7). */
.pmx .pside { display: inline-block; font: 900 12px/1 var(--f-head); letter-spacing: .06em; padding: 4px 7px 3px; border-radius: 6px; border: 2px solid var(--line-strong); color: var(--text); background: var(--paper); }
.pmx .pttl { font-weight: 700; display: flex; gap: 6px; align-items: baseline; }
.pmx .psub { font-size: var(--t-xs); color: var(--muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.pmx .lvls { font-weight: 700; color: var(--text); }
.pmx .pnl b { display: block; font: 900 var(--t-lg)/1 var(--f-head); font-variant-numeric: tabular-nums; }
.pmx .pnl small { font-size: var(--t-xs); font-weight: 700; }
.pmx .spark { display: block; }

/* Settings rail (aside on --panel, B6). */
.pmx .set { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.pmx .set > *, .pmx .set .sl > * { min-width: 0; }
.pmx .layout > .sec.aside { min-width: 0; }
.pmx .set small .term { display: block; margin-top: 2px; text-align: left; }
@media (min-width: 861px) { .pmx [data-tbl="pmx-pos"] td[data-col="position"] { min-width: 210px; } }
.pmx .set .sl { display: grid; gap: 4px; }
.pmx .set .sl label { display: flex; justify-content: space-between; font-size: var(--t-sm); font-weight: 700; }
.pmx .set .sl label b { font-variant-numeric: tabular-nums; color: var(--accent); }
.pmx .set .sl small, .pmx .tg small { color: var(--muted); font-size: var(--t-xs); }
.pmx .tg { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: var(--t-sm); font-weight: 700; }
.pmx .tg small { display: block; font-weight: 500; margin-top: 2px; }
.pmx .sw { position: relative; width: 44px; height: 24px; flex: none; }
.pmx .sw input { opacity: 0; width: 100%; height: 100%; position: absolute; inset: 0; margin: 0; cursor: pointer; z-index: 1; }
.pmx .sw i { position: absolute; inset: 0; border-radius: 12px; background: var(--line-strong); transition: background .15s; }
.pmx .sw i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--paper); transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.pmx .sw input:checked + i { background: var(--g); }
.pmx .sw input:checked + i::after { transform: translateX(20px); }
.pmx .sw input:focus-visible + i { outline: 3px solid var(--focus); outline-offset: 2px; }
.pmx .chan { display: flex; gap: 6px; flex-wrap: wrap; }
.pmx .how-sec { margin-top: 28px; }
@media (max-width: 1100px) { .pmx .layout { grid-template-columns: minmax(0, 1fr); } .pmx .layout > .sec.aside { margin-top: 24px; } }
@media (max-width: 860px) {
  .pmx .al { grid-template-columns: 34px minmax(0, 1fr); padding: 10px 0; }
  .pmx .al .row-acts { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; }
  .pmx .al .bet-action { flex: 1 1 auto; justify-content: center; }
  .pmx .aic { width: 34px; height: 34px; }
}`;

// Reason → [glyph, plain words]. The glyph is decoration; the action word ("Sell now" / "Trim 50%") and the
// reason text carry the meaning (not colour-only, B7).
const REASON = {
  'target hit': ['◎', 'target hit'], 'trailing stop': ['↘', 'trailing stop triggered'], 'trader exited': ['⟁', 'the trader you copied just exited'],
  'edge gone': ['≈', 'price reached model fair, edge gone'], news: ['✦', 'breaking news moved this market'], 'price spike': ['⚡', 'price spiked'],
};

export default function render(root, ctx) {
  const { api, ui, store } = ctx;
  const pm = api.prediction;
  if (!document.getElementById('css-exit-alerts')) {
    const s = document.createElement('style'); s.id = 'css-exit-alerts'; s.textContent = CSS; document.head.appendChild(s);
  }
  const seen = new Set(pm.exitAlerts({ all: true }).map((a) => a.id));
  const cfg = pm.alertSettings();
  const v = ui.view('exit-alerts');
  const chans = v.get('channels', ['Push', 'SMS']);
  const c$ = (c) => ui.fmtCents(c);       // prices follow the odds-format preference (B13)
  const venueName = (id) => pm.VENUE_NAMES[id];
  // What a sell fills at right now (the bid for your side) and the cash it returns.
  const bidFor = (p) => { const m = p.market; return p.side === 'YES' ? m.yesPrice - m.spread : 100 - m.yesPrice; };
  const proceeds = (p, trim) => ((trim ? Math.floor(p.contracts / 2) : p.contracts) * bidFor(p)) / 100;

  const toggle = (key, label, note) => `<div class="tg"><div>${label}<small>${note}</small></div><label class="sw"><input type="checkbox" role="switch" data-tg="${key}" ${cfg[key] ? 'checked' : ''} aria-label="${label}"><i></i></label></div>`;
  root.innerHTML = `<div class="pmx">
    ${ui.pageHead({ title: 'Exit Alerts', tool: 'exit-alerts', live: { label: 'Watching positions' },
      subtitle: 'Exit alerts: we tell you when to sell early. We watch every position you hold on Kalshi, Polymarket, ProphetX and Novig and ping you the moment it is time to take profit, with a one-click link to sell.',
      facts: factsData() })}
    <div class="layout">
      <div class="col">
        <section class="sec">
          <div class="sec-head"><div class="h-l"><h2>Alerts</h2><p class="sec-note">Newest first. New alerts arrive as prices move.</p></div><div class="sec-actions">${ui.ghost('clear', 'Dismiss all')}</div></div>
          <div class="alerts" data-alerts data-bf-list></div>
        </section>
        <section class="sec">
          <div class="sec-head"><div class="h-l"><h2>Open positions</h2><p class="sec-note">Live mark-to-market from each venue.</p></div><div class="sec-actions"><a class="btn sm outline" href="#/pm-markets">Browse markets</a></div></div>
          <div data-pos></div>
        </section>
      </div>
      <section class="sec aside">
        <div class="sec-head"><h2>Alert settings</h2></div>
        <p class="sec-note">Applied to every open position.</p>
        <div class="set">
          <div class="sl"><label for="pmx-target">Take-profit target <b data-v="targetPct" data-bf-nodata>+${cfg.targetPct}%</b></label><input id="pmx-target" type="range" min="5" max="100" step="5" value="${cfg.targetPct}" data-range="targetPct"><small>Sell now when a position is up this much from entry.</small></div>
          <div class="sl"><label for="pmx-trail">Trailing stop <b data-v="trailingPct" data-bf-nodata>${cfg.trailingPct}%</b></label><input id="pmx-trail" type="range" min="5" max="40" step="1" value="${cfg.trailingPct}" data-range="trailingPct"><small>Sell when price falls this far from its peak after a gain. ${ui.term('trailing_stop', 'What’s a trailing stop?')}</small></div>
          ${toggle('followTraders', 'Follow trader exits', 'Alert when the trader behind a recommendation sells.')}
          ${toggle('edgeGone', 'Edge gone', 'Trim when the price reaches our model fair value.')}
          ${toggle('spikes', 'Price spikes', 'Trim into sharp moves of 4¢ or more.')}
          ${toggle('news', 'News moves', 'Breaking news on politics, economics and culture markets.')}
          <div class="tg"><div>Deliver to<small>Alerts also land on your Daily Card.</small></div></div>
          <div class="chan" role="group" aria-label="Deliver to">${['Push', 'SMS', 'Email', 'Discord'].map((c) => `<button type="button" class="chip ${chans.includes(c) ? 'on' : ''}" data-chan="${c}" aria-pressed="${chans.includes(c)}">${c}</button>`).join('')}</div>
        </div>
      </section>
    </div>
    ${ui.how({ summary: 'We watch every position you hold and tell you when selling early beats holding to the result.',
      checks: ['Take-profit: sell when a position is up your target from entry',
        `${ui.term('trailing_stop', 'Trailing stop')}: sell when the price falls your trail from its peak after a gain`,
        'Trader exits, edge gone, price spikes and news suggest a 50% trim', 'Each alert links to the venue; you place the sell yourself'] })}
  </div>`;

  // ---------- facts ----------
  function factsData() {
    const ps = pm.positions();
    const value = ps.reduce((a, p) => a + p.value, 0), cost = ps.reduce((a, p) => a + p.cost, 0);
    const pnl = value - cost;
    const act = pm.exitAlerts();
    return [
      { label: 'Open positions', value: ps.length, note: `across ${new Set(ps.map((p) => p.venue)).size} venues` },
      { label: 'Market value', value: ui.money(value, 0), note: `cost ${ui.money(cost, 0)}` },
      { label: 'Unrealized P&L', value: `${pnl >= 0 ? '+' : '-'}${ui.money(Math.abs(pnl), 0)}`, tone: pnl >= 0 ? 'pos' : 'neg', note: `${pnl >= 0 ? '+' : ''}${((pnl / Math.max(1, cost)) * 100).toFixed(1)}% on cost` },
      { label: 'Active alerts', value: act.length, note: `${act.filter((a) => a.action === 'Sell now').length} say sell now` },
    ];
  }
  function renderStats() {
    const el = root.querySelector('.page-head .facts');
    const html = ui.facts(factsData());
    if (el && el.outerHTML !== html) el.outerHTML = html;
  }

  // ---------- alerts (keyed rows) ----------
  function alertRow(a, held, fresh) {
    const [glyph, text] = REASON[a.reason] || ['!', a.reason];
    const p = held.get(a.positionId);
    const trim = a.action === 'Trim 50%';
    const venue = venueName(a.venue);
    const primary = p
      ? ui.betAction({ verb: trim ? 'Trim 50%' : 'Sell', amount: `${ui.money(proceeds(p, trim), 0)} on ${venue} ↗`, act: 'sell', title: `${trim ? 'Trim 50%' : 'Sell'} on ${venue} ↗`,
        attrs: { 'data-pos': a.positionId, 'data-trim': trim ? '1' : undefined } })
      : ui.status('Sold', 'ok');
    return `<div class="al ${fresh ? 'fresh' : ''}${a.id === targetId ? ' is-target' : ''}" data-key="${a.id}">
      <span class="aic ${trim ? 'trim' : 'sell'}" aria-hidden="true">${glyph}</span>
      <div style="min-width:0"><p class="msg"><span class="act">${a.action}</span>: ${ui.esc(text)} at ${c$(a.now)}, <span class="${a.pnlPct >= 0 ? 'pos' : 'neg'}">${a.pnlPct >= 0 ? '+' : ''}${(a.pnlPct * 100).toFixed(0)}%</span></p>
        <div class="meta"><span class="pside">${a.side}</span> ${ui.esc(a.title)} · ${ui.book(a.venue)} · entry ${c$(a.entry)} · ${ui.ago(a.at)}</div></div>
      ${ui.actions(primary, [['dismiss', 'Dismiss']])}</div>`;
  }
  const alertCache = new Map();
  function renderAlerts() {
    const box = root.querySelector('[data-alerts]');
    const list = pm.exitAlerts();
    const held = new Map(pm.positions().map((p) => [p.id, p]));
    if (!list.length) {
      alertCache.clear();
      box.innerHTML = ui.empty({ title: 'All clear', msg: 'We will alert you the moment a position should be sold.',
        actions: [{ label: 'Browse markets', href: '#/pm-markets' }, { label: 'Prediction Traders', href: '#/prediction-traders' }] });
      return;
    }
    const rows = list.map((a) => { const fresh = !seen.has(a.id); seen.add(a.id); return [a.id, alertRow(a, held, fresh)]; });
    const same = rows.length === alertCache.size && rows.every(([id], i) => box.children[i]?.dataset.key === id);
    if (!same) {
      alertCache.clear();
      rows.forEach(([id, h]) => alertCache.set(id, h));
      box.innerHTML = rows.map(([, h]) => h).join('');
      return;
    }
    rows.forEach(([id, h], i) => {
      if (alertCache.get(id) === h) return;
      alertCache.set(id, h);
      const focused = box.children[i].contains(document.activeElement) ? document.activeElement.dataset.act : null;
      box.children[i].outerHTML = h;
      if (focused) box.children[i].querySelector(`[data-act="${focused}"]`)?.focus({ preventScroll: true });
    });
  }

  // ---------- positions (ui.table: keyed, sortable, phone grid rows) ----------
  const posTable = ui.table({
    id: 'pmx-pos', caption: 'Open positions', rowKey: (p) => p.id, sort: { key: 'pnl', dir: 'desc' },
    columns: [
      { key: 'position', label: 'Position', render: (p) => `<div class="pttl"><span class="pside">${p.side}</span> <span>${ui.esc(p.title)}</span></div>
        <div class="psub">${ui.book(p.venue)} ${p.market.sport ? ui.sport(p.market.sport) : ui.tag(p.market.category)} ${p.market.live ? ui.liveDot() : ''} <span>opened ${ui.ago(p.openedAt)}</span></div>
        <div class="psub">Exit levels: <span class="lvls">target ${c$(p.targetPrice)} · trail ${c$(p.trailStop)}</span></div>` },
      { key: 'contracts', label: 'Contracts', align: 'r', sort: (p) => p.contracts, render: (p) => p.contracts.toLocaleString() },
      { key: 'entry', label: 'Entry', align: 'r', sort: (p) => p.entry, render: (p) => c$(p.entry) },
      { key: 'now', label: 'Now', align: 'r', sort: (p) => p.now, trend: (p) => p.now, render: (p) => `<b>${c$(p.now)}</b>` },
      { key: 'pnl', label: 'P&L', align: 'r', sort: (p) => p.pnl, render: (p) => `<span class="pnl ${p.pnl >= 0 ? 'pos' : 'neg'}"><b>${p.pnl >= 0 ? '+' : '-'}${ui.money(Math.abs(p.pnl), 0)}</b><small>${ui.dir(p.pnlPct)}${p.pnlPct >= 0 ? '+' : ''}${(p.pnlPct * 100).toFixed(1)}%</small></span>` },
      { key: 'spark', label: '1D', pri: 2, render: (p) => ui.spark(pm.history(p.marketId, '1D').map((x) => (p.side === 'YES' ? x.p : 100 - x.p)), { w: 72, h: 26, color: p.pnl >= 0 ? 'var(--pos)' : 'var(--warn)' }) },
    ],
    // The venue is on the position's meta line, so the row button stays short enough for the table to fit.
    action: (p) => ui.actions(ui.betAction({ verb: 'Sell', amount: `${ui.money(proceeds(p, false), 0)} ↗`, act: 'sell', title: `Sell on ${venueName(p.venue)} ↗`, attrs: { 'data-pos': p.id } }), []),
    onAction: { sell: (p) => sell(p.id, false) },
    mobile: { areas: ['position position pnl', 'contracts entry now', 'act act act'], cols: 'minmax(0,1fr) auto auto' },
    empty: () => ui.empty({ title: 'No open positions', msg: 'Positions you open from Prediction Traders, AI Market Picks or the order book show up here.',
      actions: [{ label: 'Browse markets', href: '#/pm-markets' }, { label: 'AI Market Picks', href: '#/pm-picks' }] }),
  });
  root.querySelector('[data-pos]').append(posTable.el);
  const renderPositions = () => posTable.update(pm.positions());

  // ---------- actions ----------
  function sell(posId, trim, alertId) {
    const p = pm.positions().find((x) => x.id === posId);
    if (!p) return;
    const qty = trim ? Math.floor(p.contracts / 2) : p.contracts;
    ui.toast(`Opening ${venueName(p.venue)} · ${p.market.ticker} · Sell ${qty.toLocaleString()} ${p.side} @ ${bidFor(p)}¢`);
    if (!trim) pm.sellPosition(p.id);
    if (alertId) pm.dismissAlert(alertId);
    renderAll();
  }
  ui.onAction(root.querySelector('[data-alerts]'), {
    sell: (alertId, el) => sell(el.dataset.pos, !!el.dataset.trim, alertId),
    dismiss: (alertId) => { pm.dismissAlert(alertId); renderAll(); },
  });
  ui.onAction(root.querySelector('.col > .sec'), { clear: () => { pm.exitAlerts().forEach((a) => pm.dismissAlert(a.id)); renderAll(); } });
  root.querySelectorAll('[data-chan]').forEach((c) => c.addEventListener('click', () => {
    const on = !c.classList.contains('on');
    c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on));
    v.set({ channels: [...root.querySelectorAll('[data-chan].on')].map((x) => x.dataset.chan) });
  }));
  root.querySelectorAll('[data-range]').forEach((inp) => inp.addEventListener('input', () => {
    const k = inp.dataset.range;
    pm.setAlertSettings({ [k]: +inp.value });
    root.querySelector(`[data-v="${k}"]`).textContent = k === 'targetPct' ? `+${inp.value}%` : `${inp.value}%`;
    renderPositions();
  }));
  root.querySelectorAll('[data-tg]').forEach((inp) => inp.addEventListener('change', () => {
    pm.setAlertSettings({ [inp.dataset.tg]: inp.checked });
    ui.toast(`${inp.getAttribute('aria-label')} ${inp.checked ? 'on' : 'off'}`);
  }));

  function renderAll() { renderStats(); renderAlerts(); renderPositions(); }
  // Deep link from the Daily Card: #/exit-alerts?id=<alert id> marks that alert (kept across re-renders) and
  // scrolls to it; an alert that has cleared gets a "gone" toast.
  const targetId = ctx.params?.id || null;
  renderAll();
  ui.deepLink(root, targetId, { noun: 'alert', gone: 'That exit alert has cleared. Here are the open ones.', find: (id) => pm.exitAlerts().find((a) => a.id === id) || null });
  const unsub = pm.subscribe(() => {
    const before = seen.size;
    renderAll();
    ui.setLiveStatus(root, { updated: Date.now() });
    const fresh = pm.exitAlerts().find((a) => a.at > Date.now() - 5000);
    if (seen.size > before && fresh) ui.toast(`${fresh.action}: ${fresh.title}`);
  });
  const unStore = store.subscribe(() => renderPositions());
  return () => { unsub(); unStore(); posTable.destroy(); };
}
