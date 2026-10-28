// Arbitrage finder: pre-match and live arbs across the user's sportsbooks, with an exact bet calculator.
// Also exports `openArbCalc` (used by Low Holds) so every two/three-sided calculator behaves the same.

import { toDecimal, fmtAmerican, money, pct } from '../lib/odds.js';

const CSS = `
.bf-arb .t .r { text-align:right; font-variant-numeric:tabular-nums; }
.bf-arb .live-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:var(--r); background:var(--paper); border:1px solid var(--line); margin-bottom:14px; font-size:13px; }
.bf-arb .live-bar .on-dot { width:9px; height:9px; border-radius:50%; background:var(--pos); box-shadow:0 0 0 4px var(--pos-bg); animation: pulse 1.4s infinite; }
.bf-arb .live-bar.paused .on-dot { background:var(--muted); box-shadow:0 0 0 4px var(--line-2); animation:none; }
.bf-arb .live-bar strong { color:var(--text); }
.bf-arb .roi-cell .edge { font-size:14px; padding:4px 9px; }
.bf-arb .stake-list { display:flex; flex-direction:column; gap:4px; font-variant-numeric:tabular-nums; }
.bf-arb .stake-list div { display:flex; gap:6px; align-items:center; justify-content:flex-end; white-space:nowrap; }
.bf-arb .profit { color:var(--pos); font-weight:700; font-variant-numeric:tabular-nums; }
.bf-arb .leg .oc { color:var(--muted); font-size:12.5px; overflow:hidden; text-overflow:ellipsis; max-width:210px; }
.bf-arb .hero-note { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
@media (max-width:860px) {
  .bf-arb .leg .oc { max-width:150px; }
  .bf-arb table.stack-sm td .legs, .bf-arb table.stack-sm td .stake-list { align-items:flex-end; }
  .bf-arb table.stack-sm td.evc { flex-direction:column; text-align:left; }
}
.arbcalc .calc-legs { width:100%; border-collapse:collapse; }
.arbcalc .calc-legs th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); padding:6px 6px; border-bottom:1px solid var(--line); }
.arbcalc .calc-legs td.r { text-align:right; font-variant-numeric:tabular-nums; }
.arbcalc .calc-legs td { padding:8px 6px; border-bottom:1px solid var(--line-2); vertical-align:middle; }
.arbcalc .calc-legs input { width:86px; border:1px solid var(--line); border-radius:8px; padding:6px 8px; background:var(--paper); font-variant-numeric:tabular-nums; }
.arbcalc .calc-legs input.anch { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.arbcalc .calc-legs .oc { font-weight:600; font-size:13px; }
.arbcalc .big { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.arbcalc .big > div { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.arbcalc .big span { display:block; font-size:11.5px; color:var(--muted); }
.arbcalc .big strong { font:600 20px var(--serif); font-variant-numeric:tabular-nums; }
.arbcalc .big strong.pos { color:var(--pos); } .arbcalc .big strong.neg { color:var(--neg); }
.arbcalc .ctl { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
.arbcalc .anchor-note { font-size:12.5px; color:var(--muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.arbcalc h3 { margin:6px 0 8px; font-size:15px; }
.arbcalc .sc { width:100%; border-collapse:collapse; font-size:13px; }
.arbcalc .sc td, .arbcalc .sc th { padding:7px 6px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.arbcalc .sc th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
.arbcalc .sc td:first-child, .arbcalc .sc th:first-child { text-align:left; }
@media (max-width:520px) {
  .arbcalc .calc-legs thead { display:none; }
  .arbcalc .calc-legs tr { display:grid; grid-template-columns:1fr auto; gap:6px 10px; padding:10px 0; border-bottom:1px solid var(--line-2); }
  .arbcalc .calc-legs td { border:0; padding:0; }
  .arbcalc .calc-legs td[data-label]::before { content:attr(data-label) " "; color:var(--muted); font-size:11.5px; margin-right:4px; }
  .arbcalc .big strong { font-size:17px; }
}`;
export function ensureCalcCss() {
  if (!document.getElementById('css-arbitrage')) document.head.insertAdjacentHTML('beforeend', `<style id="css-arbitrage">${CSS}</style>`);
}

// When we first saw each opportunity (drives the "age" column). Seeded so the first load looks realistic.
const seen = new Map();
function firstSeen(o) {
  if (!seen.has(o.id)) {
    let h = 0;
    for (const c of o.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const back = o.live ? 4e3 + (h % 80) * 1e3 : 60e3 + (h % 50) * 60e3;
    seen.set(o.id, Date.now() - (readyModes.has(o.live) ? 0 : back));
  }
  return seen.get(o.id);
}
const readyModes = new Set();
const age = (ts) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
};

/** Full bet calculator in a drawer. `opp` uses the shared opportunity shape. */
export function openArbCalc(opp, ctx, { kind = 'arb', total: total0 } = {}) {
  ensureCalcCss();
  const { ui, store, api } = ctx;
  const st = {
    prices: opp.legs.map((l) => l.price),
    total: total0 ?? store.get().arbStake ?? 1000,
    anchor: -1, anchorStake: 0, round: 0,
  };
  const ev = api.eventById(opp.eventId);
  const body = ui.drawer(kind === 'lowhold' ? 'Low hold calculator' : 'Arbitrage calculator', `<div class="arbcalc stack">
    ${ui.eventCell(opp.eventId)}
    <div class="row">${ui.tag(opp.label)} ${ui.tag(opp.market)} ${opp.live ? ui.liveDot() : ''}</div>
    <div class="callout lime">${kind === 'lowhold' ? 'Arbs where you break even. Useful for winning playthrough bonuses with low risk.' : 'We give you the exact bet size for each book, so you keep the difference either way.'}</div>
    <div class="ctl">
      ${ui.numberInput('ctotal', Math.round(st.total), 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Round stakes</span>${ui.seg('round', [[0, 'Exact'], [1, '$1'], [5, '$5']], 0)}</label>
    </div>
    <table class="calc-legs"><thead><tr><th>Outcome</th><th>Odds</th><th>Stake</th><th>Payout</th><th></th></tr></thead><tbody>
      ${opp.legs.map((l, i) => `<tr>
        <td><div class="oc">${ui.esc(l.outcome)}</div><div style="margin-top:3px">${ui.book(l.book, { full: true })}</div></td>
        <td data-label="Odds"><input data-price="${i}" value="${fmtAmerican(st.prices[i])}" inputmode="numeric" aria-label="Odds"></td>
        <td data-label="Stake"><input data-stake="${i}" type="number" step="1" min="0" aria-label="Stake"></td>
        <td data-label="Payout" class="r" data-pay="${i}"></td>
        <td>${ui.betBtn(l.book)}</td></tr>`).join('')}
    </tbody></table>
    <div class="anchor-note" data-anchor-note></div>
    <div class="big"><div><span>Total staked</span><strong data-o="staked"></strong></div><div><span data-o="plabel">Guaranteed profit</span><strong data-o="profit"></strong></div><div><span>ROI</span><strong data-o="roi"></strong></div></div>
    <div><h3>Payout by outcome</h3><table class="sc"><thead><tr><th>If this wins</th><th>Payout</th><th>Profit</th></tr></thead><tbody data-o="sc"></tbody></table></div>
    <div class="row"><button class="btn primary" data-log>Log ${opp.legs.length === 2 ? 'both' : 'all'} bets</button><button class="btn" data-balance>Balance stakes</button>
      <span class="muted" style="font-size:12px">${ev ? ui.esc(ev.sport) : ''} · ${ev?.live ? 'Live' : ui.when(opp.start)}</span></div>
  </div>`);

  const compute = () => {
    const decs = st.prices.map(toDecimal);
    let stakes;
    if (st.anchor >= 0) {
      const pay = st.anchorStake * decs[st.anchor];
      stakes = decs.map((d) => pay / d);
    } else {
      const inv = decs.reduce((a, d) => a + 1 / d, 0);
      stakes = decs.map((d) => (st.total / d) / inv);
    }
    if (st.round) stakes = stakes.map((s, i) => (i === st.anchor ? s : Math.max(st.round, Math.round(s / st.round) * st.round)));
    const staked = stakes.reduce((a, b) => a + b, 0);
    const pays = stakes.map((s, i) => s * decs[i]);
    const profits = pays.map((p) => p - staked);
    return { stakes, staked, pays, profits, min: Math.min(...profits) };
  };
  const paint = () => {
    const r = compute();
    const active = document.activeElement;
    r.stakes.forEach((s, i) => {
      const inp = body.querySelector(`[data-stake="${i}"]`);
      inp.classList.toggle('anch', i === st.anchor);
      if (inp !== active) inp.value = s.toFixed(st.round ? 0 : 2);
      body.querySelector(`[data-pay="${i}"]`).textContent = money(r.pays[i]);
    });
    const tot = body.querySelector('[data-num="ctotal"]');
    if (tot !== active) tot.value = Math.round(r.staked * 100) / 100;
    body.querySelector('[data-o="staked"]').textContent = money(r.staked);
    const pr = body.querySelector('[data-o="profit"]');
    body.querySelector('[data-o="plabel"]').textContent = r.min >= 0 ? 'Guaranteed profit' : 'Cost to run';
    pr.textContent = money(r.min >= 0 ? r.min : -r.min);
    pr.className = r.min >= 0 ? 'pos' : 'neg';
    const roi = body.querySelector('[data-o="roi"]');
    roi.textContent = `${r.min >= 0 ? '+' : ''}${pct(r.min / r.staked, 2)}`;
    roi.className = r.min >= 0 ? 'pos' : 'neg';
    body.querySelector('[data-o="sc"]').innerHTML = opp.legs.map((l, i) => `<tr><td>${ui.esc(l.outcome)} <span class="muted">· ${ui.esc(api.bookById[l.book]?.short || l.book)}</span></td><td>${money(r.pays[i])}</td><td style="color:var(${r.profits[i] >= 0 ? '--pos' : '--neg'});font-weight:700">${r.profits[i] >= 0 ? '+' : ''}${money(r.profits[i])}</td></tr>`).join('');
    body.querySelector('[data-anchor-note]').innerHTML = st.anchor >= 0
      ? `⚓ Anchored on ${ui.book(opp.legs[st.anchor].book)} at ${money(st.anchorStake)} (book max bet). Other legs sized to match.`
      : 'Tip: type a stake on any leg to anchor on it, e.g. when a book caps your max bet.';
    return r;
  };

  ui.onNumber(body, 'ctotal', (v) => { st.total = v; st.anchor = -1; paint(); });
  ui.onSeg(body, 'round', (v) => {
    st.round = Number(v);
    body.querySelectorAll('[data-seg="round"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    paint();
  });
  body.querySelectorAll('[data-stake]').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    if (Number.isNaN(v) || v <= 0) return;
    st.anchor = Number(inp.dataset.stake); st.anchorStake = v; paint();
  }));
  body.querySelectorAll('[data-price]').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    if (Number.isNaN(v) || Math.abs(v) < 100) return;
    st.prices[Number(inp.dataset.price)] = v; paint();
  }));
  body.querySelector('[data-balance]').addEventListener('click', () => { const r = compute(); st.total = Math.round(r.staked); st.anchor = -1; paint(); });
  body.querySelector('[data-log]').addEventListener('click', () => {
    const r = compute();
    opp.legs.forEach((l, i) => ui.logBet({ kind, book: l.book, sport: opp.sport, market: opp.market, selection: l.outcome, price: st.prices[i], stake: Math.round(r.stakes[i] * 100) / 100, event: opp.event }));
    ui.toast(`Logged ${opp.legs.length} bets · ${r.min >= 0 ? 'locked' : 'cost'} ${money(Math.abs(r.min))}`);
  });
  ui.wireBetButtons(body);
  paint();
}

export default function render(root, ctx) {
  ensureCalcCss();
  const { api, store, ui, params } = ctx;
  const st = {
    mode: params.mode === 'live' ? 'live' : 'pre',
    sport: params.sport || 'All', market: 'All', minRoi: 0,
    stake: store.get().arbStake || 1000, paused: false, updated: Date.now(),
  };
  let prev = new Map();
  let current = [];

  root.innerHTML = `<div class="bf-arb">
    ${ui.header({ title: 'Arbitrage', tool: 'arbitrage',
      subtitle: 'Pairs of bets that make guaranteed profit. Lock in profit by betting on both sides before the game starts, or while it\'s live.',
      actions: ui.seg('mode', [['pre', 'Pre-match'], ['live', 'Live']], st.mode) })}
    <div data-stats></div>
    <div class="live-bar" data-livebar></div>
    <div class="toolbar">
      ${ui.select('sport', ['All', ...api.sports], st.sport, 'Sport')}
      ${ui.select('market', ['All', 'Moneyline', 'Spread', 'Total', 'Player Prop'], st.market, 'Market')}
      ${ui.numberInput('minroi', st.minRoi, 'Min ROI %', { step: 0.25 })}
      ${ui.numberInput('stake', st.stake, 'Total stake', { prefix: '$', step: 50 })}
      <div class="spacer"></div>
      <a class="btn sm ghost" href="#/account" data-books></a>
    </div>
    <div class="card"><div data-table></div></div>
  </div>`;

  const q = (s) => root.querySelector(s);
  const load = () => {
    const books = store.get().books;
    return api.arbs({ books, live: st.mode === 'live', sport: st.sport, market: st.market })
      .filter((o) => o.edge * 100 >= st.minRoi);
  };

  function paintBar() {
    const bar = q('[data-livebar]');
    bar.classList.toggle('paused', st.paused);
    bar.innerHTML = `<span class="on-dot"></span>
      <strong>Auto refresh ${st.paused ? 'PAUSED' : 'ON'}</strong>
      <span class="muted">Updated <span data-upd>${age(st.updated)}</span> ago · ${st.mode === 'live' ? 'Because books must adjust odds in real time, these live arbs are 2 to 3x more profitable.' : 'Industry leading auto refresh, so you can hit fresh arbs instantly.'}</span>
      <span class="spacer"></span>
      <button class="btn sm" data-pause>${st.paused ? '▶ Resume' : '❚❚ Pause'}</button>`;
    q('[data-pause]').addEventListener('click', () => { st.paused = !st.paused; paintBar(); if (!st.paused) refresh(true); });
  }

  function paint(flashIds = new Set()) {
    const s = st.stake;
    const rows = current;
    const best = rows[0]?.edge || 0;
    const totalProfit = rows.reduce((a, o) => a + ctx.odds.arbStakes(o.legs.map((l) => l.price), s).profit, 0);
    q('[data-stats]').innerHTML = ui.stats([
      { label: st.mode === 'live' ? 'Live arbs now' : 'Pre-match arbs', value: rows.length, note: `across ${store.get().books.length} of your books` },
      { label: 'Best ROI', value: rows.length ? `+${pct(best, 2)}` : '—', tone: 'pos', note: rows[0] ? ui.esc(rows[0].event) : '' },
      { label: `Profit available at ${money(s, 0)}`, value: money(totalProfit), tone: 'pos', note: 'if you hit every arb' },
      { label: 'Avg ROI', value: rows.length ? `+${pct(rows.reduce((a, o) => a + o.edge, 0) / rows.length, 2)}` : '—', note: st.mode === 'live' ? 'live markets' : 'pre-match markets' },
    ]);
    q('[data-books]').textContent = `Books: ${store.get().books.map((b) => api.bookById[b]?.short).join(' · ')} ✎`;
    if (!rows.length) { q('[data-table]').innerHTML = `<div class="pad">${ui.empty('No arbs match these filters right now. Lower the min ROI or add books in Settings.')}</div>`; return; }
    q('[data-table]').innerHTML = `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      <th>ROI</th><th>Event</th><th>Market</th><th>Legs</th><th class="r">Stake per book</th><th class="r">Profit</th><th class="r">Age</th><th></th></tr></thead><tbody>
      ${rows.map((o) => {
        const r = ctx.odds.arbStakes(o.legs.map((l) => l.price), s);
        return `<tr class="click${flashIds.has(o.id) ? ' flash' : ''}" data-id="${o.id}">
          <td data-label="ROI" class="roi-cell">${ui.edge(o.edge)}</td>
          <td data-label="Event" class="evc">${ui.eventCell(o.eventId)}</td>
          <td data-label="Market"><div><div style="font-weight:600">${ui.esc(o.label)}</div><div class="muted" style="font-size:12px">${ui.esc(o.market)}</div></div></td>
          <td data-label="Legs"><div class="legs">${o.legs.map((l) => `<div class="leg">${ui.book(l.book)} ${ui.price(l.price)} <span class="oc">${ui.esc(l.outcome)}</span></div>`).join('')}</div></td>
          <td data-label="Stake per book" class="r"><div class="stake-list">${o.legs.map((l, i) => `<div>${money(r.stakes[i])} <span class="muted" style="font-size:11.5px">${ui.esc(api.bookById[l.book].short)}</span></div>`).join('')}</div></td>
          <td data-label="Profit" class="r"><span class="profit">+${money(r.profit)}</span></td>
          <td data-label="Age" class="r muted">${age(firstSeen(o))}</td>
          <td data-label=""><button class="btn sm lime" data-calc>Calculator</button></td></tr>`;
      }).join('')}</tbody></table></div>`;
    q('[data-table]').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => {
      const o = current.find((x) => x.id === tr.dataset.id);
      if (o) openArbCalc(o, ctx, { total: st.stake });
    }));
  }

  function refresh(flash = false) {
    const next = load();
    next.forEach(firstSeen);
    readyModes.add(st.mode === 'live');
    const changed = new Set();
    if (flash) for (const o of next) { const p = prev.get(o.id); if (!p || p !== o.legs.map((l) => l.price).join()) changed.add(o.id); }
    prev = new Map(next.map((o) => [o.id, o.legs.map((l) => l.price).join()]));
    current = next;
    st.updated = Date.now();
    paint(changed);
    const u = q('[data-upd]'); if (u) u.textContent = age(st.updated);
  }

  ui.onSeg(root, 'mode', (v) => {
    st.mode = v;
    root.querySelectorAll('[data-seg="mode"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    try { history.replaceState(null, '', `#/arbitrage${v === 'live' ? '?mode=live' : ''}`); } catch { /* ignore */ }
    paintBar(); refresh();
  });
  ui.onSelect(root, 'sport', (v) => { st.sport = v; refresh(); });
  ui.onSelect(root, 'market', (v) => { st.market = v; refresh(); });
  ui.onNumber(root, 'minroi', (v) => { st.minRoi = v; refresh(); });
  ui.onNumber(root, 'stake', (v) => { st.stake = v; paint(); });

  paintBar();
  refresh();
  const offTick = api.onTick(() => { if (!st.paused) refresh(true); });
  const offStore = store.subscribe(() => refresh());
  const clock = setInterval(() => {
    const u = q('[data-upd]'); if (u) u.textContent = age(st.updated);
  }, 1000);
  return () => { offTick(); offStore(); clearInterval(clock); };
}
