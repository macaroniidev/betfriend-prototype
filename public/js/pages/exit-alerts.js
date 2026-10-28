// Exit Alerts: your open prediction-market positions with live P&L, and alerts telling you
// when to sell early (target hit, trailing stop, trader exited, edge gone, news, price spike).

const CSS = `
.pmx .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
.pmx .col { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }
.pmx section.card > header h2 { font-size: 18px; }
.pmx section.card > header p { margin: 3px 0 0; color: var(--muted); font-size: 12.5px; }
.pmx .alerts { display: grid; }
.pmx .al { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--line-2); }
.pmx .al.fresh { animation: pmx-in 1.6s ease; }
@keyframes pmx-in { from { background: color-mix(in srgb, var(--lime) 45%, transparent); } to { background: transparent; } }
.pmx .aic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; font-size: 17px; font-weight: 700; }
.pmx .aic.sell { background: var(--neg-bg); color: var(--neg); } .pmx .aic.trim { background: var(--warn-bg); color: var(--warn); }
.pmx .al .msg { font-weight: 600; }
.pmx .al .msg em { font-style: normal; }
.pmx .al .meta { font-size: 12px; color: var(--muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 3px; }
.pmx .al .acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.pmx .up { color: var(--pos); } .pmx .down { color: var(--neg); }
.pmx .r { text-align: right; font-variant-numeric: tabular-nums; }
.pmx .pside { font: 700 11px var(--sans); padding: 2px 7px; border-radius: 6px; }
.pmx .pside.YES { background: var(--pos-bg); color: var(--pos); } .pmx .pside.NO { background: var(--neg-bg); color: var(--neg); }
@media (min-width: 861px) { .pmx [data-pos] td:first-child { min-width: 280px; } }
.pmx .lvls { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
.pmx .ttl { font-weight: 600; } .pmx .sub { font-size: 12px; color: var(--muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 3px; }
.pmx .set { padding: 16px; display: grid; gap: 14px; }
.pmx .set .sl { display: grid; gap: 6px; }
.pmx .set .sl label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }
.pmx .set .sl label b { font-variant-numeric: tabular-nums; color: var(--accent); }
.pmx .set input[type=range] { width: 100%; accent-color: var(--accent); }
.pmx .set .sl small { color: var(--muted); font-size: 12px; }
.pmx .tg { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; }
.pmx .tg small { display: block; color: var(--muted); font-size: 12px; }
.pmx .sw { position: relative; width: 40px; height: 22px; flex: none; }
.pmx .sw input { opacity: 0; width: 0; height: 0; position: absolute; }
.pmx .sw i { position: absolute; inset: 0; border-radius: 999px; background: var(--line); transition: background .15s; cursor: pointer; }
.pmx .sw i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--paper); transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.pmx .sw input:checked + i { background: var(--accent); }
.pmx .sw input:checked + i::after { transform: translateX(18px); }
.pmx .sw input:focus-visible + i { outline: 2px solid var(--accent); outline-offset: 2px; }
.pmx .chan { display: flex; gap: 6px; flex-wrap: wrap; }
@media (max-width: 1100px) { .pmx .layout { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 860px) {
  .pmx .al { grid-template-columns: 36px minmax(0, 1fr); }
  .pmx .al .acts { grid-column: 1 / -1; justify-content: stretch; }
  .pmx .al .acts .btn { flex: 1; }
  .pmx .aic { width: 36px; height: 36px; }
}`;

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

  const toggle = (key, label, note) => `<div class="tg"><div>${label}<small>${note}</small></div><label class="sw"><input type="checkbox" data-tg="${key}" ${cfg[key] ? 'checked' : ''} aria-label="${label}"><i></i></label></div>`;
  root.innerHTML = `<div class="pmx">
    ${ui.header({ title: 'Exit Alerts', tool: 'exit-alerts',
      subtitle: 'Exit alerts: we tell you when to sell early. We watch every position you hold on Kalshi, Polymarket, ProphetX and Novig and ping you the moment it is time to take profit, with a one-click link to sell.',
      actions: `<span class="tag pos">${ui.liveDot()} Watching positions</span>` })}
    <div data-stats></div>
    <div class="layout">
      <div class="col">
        <section class="card"><header><div><h2>Alerts</h2><p>Newest first. New alerts arrive as prices move.</p></div><button class="btn sm ghost" data-clear>Dismiss all</button></header>
          <div class="alerts" data-alerts></div></section>
        <section class="card"><header><div><h2>Open positions</h2><p>Live mark-to-market from each venue.</p></div><a class="btn sm" href="#/pm-markets">Browse markets</a></header>
          <div class="table-wrap"><table class="t stack-sm" data-pos></table></div></section>
      </div>
      <section class="card"><header><div><h2>Alert settings</h2><p>Applied to every open position.</p></div></header>
        <div class="set">
          <div class="sl"><label for="pmx-target">Take-profit target <b data-v="targetPct">+${cfg.targetPct}%</b></label><input id="pmx-target" type="range" min="5" max="100" step="5" value="${cfg.targetPct}" data-range="targetPct"><small>Sell now when a position is up this much from entry.</small></div>
          <div class="sl"><label for="pmx-trail">Trailing stop <b data-v="trailingPct">${cfg.trailingPct}%</b></label><input id="pmx-trail" type="range" min="5" max="40" step="1" value="${cfg.trailingPct}" data-range="trailingPct"><small>Sell when price falls this far from its peak after a gain.</small></div>
          ${toggle('followTraders', 'Follow trader exits', 'Alert when the trader behind a recommendation sells.')}
          ${toggle('edgeGone', 'Edge gone', 'Trim when the price reaches our model fair value.')}
          ${toggle('spikes', 'Price spikes', 'Trim into sharp moves of 4¢ or more.')}
          ${toggle('news', 'News moves', 'Breaking news on politics, economics and culture markets.')}
          <div class="tg"><div>Deliver to<small>Alerts also land on your Daily Card.</small></div></div>
          <div class="chan">${['Push', 'SMS', 'Email', 'Discord'].map((c, i) => `<button type="button" class="chip ${i < 2 ? 'on' : ''}" data-chan>${c}</button>`).join('')}</div>
        </div></section>
    </div></div>`;

  function venueName(v) { return pm.VENUE_NAMES[v]; }

  function renderStats() {
    const ps = pm.positions();
    const value = ps.reduce((a, p) => a + p.value, 0), cost = ps.reduce((a, p) => a + p.cost, 0);
    const pnl = value - cost;
    const act = pm.exitAlerts();
    root.querySelector('[data-stats]').innerHTML = ui.stats([
      { label: 'Open positions', value: ps.length, note: `across ${new Set(ps.map((p) => p.venue)).size} venues` },
      { label: 'Market value', value: ui.money(value, 0), note: `cost ${ui.money(cost, 0)}` },
      { label: 'Unrealized P&L', value: `${pnl >= 0 ? '+' : ''}${ui.money(pnl, 0)}`, tone: pnl >= 0 ? 'pos' : 'neg', note: `${pnl >= 0 ? '+' : ''}${((pnl / Math.max(1, cost)) * 100).toFixed(1)}% on cost` },
      { label: 'Active alerts', value: act.length, tone: act.length ? 'neg' : '', note: `${act.filter((a) => a.action === 'Sell now').length} say sell now` },
    ]);
  }

  function renderAlerts() {
    const list = pm.exitAlerts();
    const held = new Set(pm.positions().map((p) => p.id));
    root.querySelector('[data-alerts]').innerHTML = list.length ? list.map((a) => {
      const [icon, text] = REASON[a.reason] || ['!', a.reason];
      const fresh = !seen.has(a.id);
      seen.add(a.id);
      const sold = !held.has(a.positionId);
      return `<div class="al ${fresh ? 'fresh' : ''}" data-alert="${a.id}">
        <span class="aic ${a.action === 'Sell now' ? 'sell' : 'trim'}" aria-hidden="true">${icon}</span>
        <div style="min-width:0"><div class="msg">${a.action}: ${ui.esc(text)} at ${a.now}¢, <em class="${a.pnlPct >= 0 ? 'up' : 'down'}">${a.pnlPct >= 0 ? '+' : ''}${(a.pnlPct * 100).toFixed(0)}%</em></div>
          <div class="meta"><span class="pside ${a.side}">${a.side}</span> ${ui.esc(a.title)} · ${ui.book(a.venue)} · entry ${a.entry}¢ · ${ui.ago(a.at)}</div></div>
        <div class="acts">${sold ? ui.tag('Sold', 'pos') : `<button class="btn sm primary" data-sell="${a.positionId}" data-alertid="${a.id}" data-trim="${a.action === 'Trim 50%' ? 1 : ''}">${a.action === 'Trim 50%' ? 'Trim 50%' : 'Sell'} on ${venueName(a.venue)} ↗</button>`}
          <button class="btn sm ghost" data-dismiss="${a.id}">Dismiss</button></div></div>`;
    }).join('') : `<div class="pad">${ui.empty('All clear. We will alert you the moment a position should be sold.')}</div>`;
  }

  function renderPositions() {
    const ps = pm.positions();
    root.querySelector('[data-pos]').innerHTML = `<thead><tr><th>Position</th><th class="r">Contracts</th><th class="r">Entry</th><th class="r">Now</th><th class="r">P&L</th><th>1D</th><th>Exit levels</th><th></th></tr></thead><tbody>
      ${ps.map((p) => {
        const h = pm.history(p.marketId, '1D').map((x) => (p.side === 'YES' ? x.p : 100 - x.p));
        return `<tr><td data-label="Position"><div class="ttl"><span class="pside ${p.side}">${p.side}</span> ${ui.esc(p.title)}</div><div class="sub">${ui.book(p.venue)} ${p.market.sport ? ui.sport(p.market.sport) : ui.tag(p.market.category)} ${p.market.live ? ui.liveDot() : ''} <span>opened ${ui.ago(p.openedAt)}</span></div></td>
        <td class="r" data-label="Contracts">${p.contracts.toLocaleString()}</td>
        <td class="r mono" data-label="Entry">${p.entry}¢</td>
        <td class="r mono" data-label="Now"><b>${p.now}¢</b></td>
        <td class="r ${p.pnl >= 0 ? 'up' : 'down'}" data-label="P&L"><b>${p.pnl >= 0 ? '+' : ''}${ui.money(p.pnl, 0)}</b><div style="font-size:11.5px">${p.pnlPct >= 0 ? '+' : ''}${(p.pnlPct * 100).toFixed(1)}%</div></td>
        <td data-label="1D">${ui.spark(h, { w: 90, h: 28, color: p.pnl >= 0 ? 'var(--pos)' : 'var(--neg)' })}</td>
        <td data-label="Exit levels"><div class="lvls">Target ${p.targetPrice}¢ · Trail ${p.trailStop}¢</div></td>
        <td data-label=""><button class="btn sm" data-sell="${p.id}">Sell on ${venueName(p.venue)} ↗</button></td></tr>`;
      }).join('') || `<tr><td colspan="8">${ui.empty('No open positions.')}</td></tr>`}</tbody>`;
  }

  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sell]');
    if (s) {
      const p = pm.positions().find((x) => x.id === s.dataset.sell);
      if (!p) return;
      const m = p.market;
      const bid = p.side === 'YES' ? m.yesPrice - m.spread : 100 - m.yesPrice;
      const qty = s.dataset.trim ? Math.floor(p.contracts / 2) : p.contracts;
      ui.toast(`Opening ${venueName(p.venue)} · ${m.ticker} · Sell ${qty.toLocaleString()} ${p.side} @ ${bid}¢`);
      if (!s.dataset.trim) pm.sellPosition(p.id);
      if (s.dataset.alertid) pm.dismissAlert(s.dataset.alertid);
      renderAll();
      return;
    }
    const d = e.target.closest('[data-dismiss]');
    if (d) { pm.dismissAlert(d.dataset.dismiss); renderAll(); return; }
    if (e.target.closest('[data-clear]')) { pm.exitAlerts().forEach((a) => pm.dismissAlert(a.id)); renderAll(); return; }
    const c = e.target.closest('[data-chan]');
    if (c) c.classList.toggle('on');
  });
  root.querySelectorAll('[data-range]').forEach((inp) => inp.addEventListener('input', () => {
    const k = inp.dataset.range;
    pm.setAlertSettings({ [k]: +inp.value });
    root.querySelector(`[data-v="${k}"]`).textContent = k === 'targetPct' ? `+${inp.value}%` : `${inp.value}%`;
    renderPositions();
  }));
  root.querySelectorAll('[data-tg]').forEach((inp) => inp.addEventListener('change', () => {
    pm.setAlertSettings({ [inp.dataset.tg]: inp.checked });
    ui.toast(`${inp.closest('.tg').firstElementChild.firstChild.textContent.trim()} ${inp.checked ? 'on' : 'off'}`);
  }));

  function renderAll() { renderStats(); renderAlerts(); renderPositions(); }
  renderAll();
  const unsub = pm.subscribe(() => {
    const before = seen.size;
    renderAll();
    const fresh = pm.exitAlerts().find((a) => a.at > Date.now() - 5000);
    if (seen.size > before && fresh) ui.toast(`${fresh.action}: ${fresh.title}`);
  });
  void store;
  return () => unsub();
}
