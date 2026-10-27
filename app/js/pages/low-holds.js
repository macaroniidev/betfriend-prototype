// Low hold finder + VIP / rollover planner.
// Arbs where you break even. Useful for winning playthrough bonuses with low risk.

import { openArbCalc, ensureCalcCss } from './arbitrage.js';
import { toDecimal, hold as holdOf, money, pct, fmtAmerican } from '../lib/odds.js';

const CSS = `
.bf-lh .t .r { text-align:right; font-variant-numeric:tabular-nums; }
.bf-lh .range { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--muted); min-width:200px; }
.bf-lh .range input { accent-color:var(--accent); width:100%; }
.bf-lh .range b { color:var(--text); }
.bf-lh .holdv { font:600 17px var(--serif); font-variant-numeric:tabular-nums; }
.bf-lh .holdv.zero { color:var(--pos); }
.bf-lh .cost { font-weight:700; font-variant-numeric:tabular-nums; }
.bf-lh .planner .grid { align-items:end; }
.bf-lh .plan-sum { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:12px 0; }
.bf-lh .plan-sum > div { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.bf-lh .plan-sum span { display:block; font-size:11.5px; color:var(--muted); }
.bf-lh .plan-sum strong { font:600 20px var(--serif); font-variant-numeric:tabular-nums; }
.bf-lh .bar { margin-top:6px; }
@media (max-width:860px) { .bf-lh table.stack-sm td.evc { flex-direction:column; text-align:left; } .bf-lh table.stack-sm td .legs { align-items:flex-end; } .bf-lh .plan-sum strong { font-size:16px; } }`;

/** Best low-hold pairings where one leg sits on `bookId` (the book you need playthrough on). */
function rolloverLines(api, bookId, myBooks, maxHold) {
  const out = [];
  for (const line of api.lines()) {
    const mine = line.prices[bookId];
    if (!mine || line.outcomes.length !== 2) continue;
    for (let i = 0; i < 2; i++) {
      const j = 1 - i;
      let hedge = null;
      for (const b of myBooks) {
        if (b === bookId || !line.prices[b] || api.bookById[b]?.type !== 'sportsbook') continue;
        if (!hedge || line.prices[b][j] > hedge.price) hedge = { book: b, price: line.prices[b][j] };
      }
      if (!hedge) continue;
      const h = holdOf([mine[i], hedge.price]);
      if (h > maxHold + 0.015) continue;
      const e = api.eventById(line.eventId);
      const legs = [];
      legs[i] = { outcome: line.outcomes[i], book: bookId, price: mine[i] };
      legs[j] = { outcome: line.outcomes[j], book: hedge.book, price: hedge.price };
      out.push({ id: `ro-${line.id}-${i}-${hedge.book}`, kind: 'lowhold', lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market,
        label: line.label, event: `${e.away} @ ${e.home}`, start: e.start, live: line.live, legs, edge: -h, meta: { hold: h, mineIdx: i } });
    }
  }
  return out.sort((a, b) => a.meta.hold - b.meta.hold);
}

/** Cost per $1 of playthrough on the target leg: hedge sized so both outcomes return the same. */
function costPerDollar(o) {
  const i = o.meta.mineIdx, j = 1 - i;
  const pay = toDecimal(o.legs[i].price);
  const hedge = pay / toDecimal(o.legs[j].price);
  return { cost: 1 + hedge - pay, hedge };
}

/** Cost display: a negative cost is profit (the line is actually an arb). */
const costHtml = (c) => (c < -0.005 ? `<span class="cost" style="color:var(--pos)">+${money(-c)}</span>` : `<span class="cost">${money(Math.max(0, c))}</span>`);
const pctCost = (x) => (x < -0.00005 ? `+${pct(-x, 2)} profit` : `${pct(Math.max(0, x), 2)} of volume`);

export default function render(root, ctx) {
  const { api, store, ui } = ctx;
  ensureCalcCss();
  if (!document.getElementById('css-low-holds')) document.head.insertAdjacentHTML('beforeend', `<style id="css-low-holds">${CSS}</style>`);
  const myBooks = () => store.get().books;
  const st = { mode: 'pre', sport: 'All', maxHold: 0.02, amount: 1000, req: 5000, book: myBooks()[0] || 'dk', maxBet: 500 };
  let rows = [];

  root.innerHTML = `<div class="bf-lh">
    ${ui.header({ title: 'Low Holds', tool: 'low-holds',
      subtitle: 'Arbs where you break even. Useful for winning playthrough bonuses with low risk. Run your rollover for pennies on the dollar.',
      actions: ui.seg('mode', [['pre', 'Pre-match'], ['live', 'Live']], st.mode) })}
    <div data-stats></div>
    <div class="split">
      <div>
        <div class="toolbar">
          <label class="range"><span>Max hold <b data-hv>${pct(st.maxHold, 1)}</b></span><input type="range" min="0" max="3" step="0.1" value="${st.maxHold * 100}" data-hold></label>
          ${ui.select('sport', ['All', ...api.sports], st.sport, 'Sport')}
          ${ui.numberInput('amount', st.amount, 'Playthrough to run', { prefix: '$', step: 100 })}
        </div>
        <div class="card"><div data-table></div></div>
      </div>
      <aside class="card pad planner stack">
        <div><h2>VIP / rollover planner</h2><p class="muted" style="margin:6px 0 0">Tell us what you need to roll over and where. We find the lowest-hold lines on that book and hedge them at your other books.</p></div>
        <div class="grid g2">
          ${ui.numberInput('req', st.req, 'Playthrough required', { prefix: '$', step: 500 })}
          ${ui.select('pbook', myBooks().map((b) => [b, api.bookById[b]?.name || b]), st.book, 'On book')}
        </div>
        ${ui.numberInput('maxbet', st.maxBet, 'Max bet per line', { prefix: '$', step: 50 })}
        <div data-plan></div>
      </aside>
    </div>
  </div>`;
  const q = (s) => root.querySelector(s);

  function paintTable() {
    rows = api.lowHolds({ books: myBooks(), live: st.mode === 'live', sport: st.sport, maxHold: st.maxHold });
    const X = st.amount;
    const costs = rows.map((o) => -ctx.odds.arbStakes(o.legs.map((l) => l.price), X).profit);
    q('[data-stats]').innerHTML = ui.stats([
      { label: 'Low-hold lines', value: rows.length, note: `hold ≤ ${pct(st.maxHold, 1)}` },
      { label: 'Lowest hold', value: rows.length ? pct(rows[0].meta.hold, 2) : '—', tone: 'pos', note: rows[0] ? ui.esc(rows[0].label) : '' },
      { label: `Cheapest cost per ${money(X, 0)}`, value: rows.length ? (Math.min(...costs) < -0.005 ? `+${money(-Math.min(...costs))}` : money(Math.max(0, Math.min(...costs)))) : '—', tone: 'pos', note: 'of playthrough' },
      { label: 'Avg hold', value: rows.length ? pct(rows.reduce((a, o) => a + o.meta.hold, 0) / rows.length, 2) : '—' },
    ]);
    if (!rows.length) { q('[data-table]').innerHTML = `<div class="pad">${ui.empty('No lines under this hold. Slide the max hold up a little.')}</div>`; return; }
    q('[data-table]').innerHTML = `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      <th>Hold</th><th>Event</th><th>Legs</th><th class="r">Cost to run ${money(X, 0)}</th><th></th></tr></thead><tbody>
      ${rows.map((o, k) => `<tr class="click" data-id="${o.id}">
        <td data-label="Hold"><span class="holdv${o.meta.hold < 0.005 ? ' zero' : ''}">${pct(o.meta.hold, 2)}</span></td>
        <td data-label="Event" class="evc"><div>${ui.eventCell(o.eventId)}<div class="muted" style="font-size:12px;margin-top:2px">${ui.esc(o.label)}</div></div></td>
        <td data-label="Legs"><div class="legs">${o.legs.map((l) => `<div class="leg">${ui.book(l.book)} ${ui.price(l.price)} <span class="muted" style="font-size:12.5px">${ui.esc(l.outcome)}</span></div>`).join('')}</div></td>
        <td data-label="Cost to run" class="r"><div>${costHtml(costs[k])}<div class="muted" style="font-size:11.5px">${pctCost(costs[k] / X)}</div></div></td>
        <td data-label=""><button class="btn sm lime">Calculator</button></td></tr>`).join('')}
      </tbody></table></div>`;
    q('[data-table]').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => {
      const o = rows.find((x) => x.id === tr.dataset.id); if (o) openArbCalc(o, ctx, { kind: 'lowhold', total: st.amount });
    }));
  }

  function paintPlan() {
    const cands = rolloverLines(api, st.book, myBooks(), st.maxHold).slice(0, 40);
    let left = st.req, cost = 0;
    const steps = [];
    for (const o of cands) {
      if (left <= 0) break;
      const s = Math.min(st.maxBet, left);
      const c = costPerDollar(o);
      steps.push({ o, stake: s, hedge: c.hedge * s, cost: c.cost * s });
      cost += c.cost * s; left -= s;
    }
    const done = st.req - Math.max(0, left);
    const bk = api.bookById[st.book];
    q('[data-plan]').innerHTML = !steps.length ? ui.empty(`No hedgeable lines on ${bk?.name || st.book} right now.`) : `
      <div class="plan-sum">
        <div><span>Bets needed</span><strong>${steps.length}</strong></div>
        <div><span>Expected cost</span><strong style="color:var(--${cost <= 0 ? 'pos' : 'text'})">${money(Math.abs(cost))}${cost <= 0 ? ' profit' : ''}</strong></div>
        <div><span>${cost <= 0 ? 'Profit' : 'Cost'} / $100</span><strong style="color:var(--${cost <= 0 ? 'pos' : 'text'})">${money(Math.abs(cost / Math.max(1, done)) * 100)}</strong></div>
      </div>
      <div class="muted" style="font-size:12px">${money(done, 0)} of ${money(st.req, 0)} rolled over on ${ui.book(st.book)}</div>
      <div class="bar"><i style="width:${Math.min(100, (done / st.req) * 100)}%"></i></div>
      <table class="t stack-sm" style="margin-top:12px"><thead><tr><th>#</th><th>Bet on ${ui.esc(bk?.short || '')}</th><th>Hedge</th><th class="r">Cost</th></tr></thead><tbody>
      ${steps.slice(0, 8).map((x, k) => {
        const i = x.o.meta.mineIdx, j = 1 - i;
        return `<tr class="click" data-pid="${x.o.id}">
          <td data-label="Bet">${k + 1}</td>
          <td data-label="On ${ui.esc(bk?.short || '')}"><div><div style="font-weight:600;font-size:13px">${ui.esc(x.o.legs[i].outcome)} ${ui.price(x.o.legs[i].price)}</div><div class="muted" style="font-size:12px">${money(x.stake, 0)} · ${ui.esc(x.o.event.split(' @ ')[1] || x.o.event)}</div></div></td>
          <td data-label="Hedge"><div><div>${ui.book(x.o.legs[j].book)} ${ui.price(x.o.legs[j].price)}</div><div class="muted" style="font-size:12px">${money(x.hedge)}</div></div></td>
          <td data-label="Cost" class="r"><div>${costHtml(x.cost)}<div class="muted" style="font-size:11.5px">hold ${pct(x.o.meta.hold, 2)}</div></div></td></tr>`;
      }).join('')}</tbody></table>
      ${steps.length > 8 ? `<p class="muted" style="font-size:12px;margin:8px 0 0">+ ${steps.length - 8} more bets in this plan</p>` : ''}
      <button class="btn primary block" data-logplan style="margin-top:12px">Log first bet pair</button>`;
    q('[data-plan]').querySelectorAll('tr[data-pid]').forEach((tr) => tr.addEventListener('click', () => {
      const x = steps.find((s) => s.o.id === tr.dataset.pid); if (x) openArbCalc(x.o, ctx, { kind: 'lowhold', total: x.stake + x.hedge });
    }));
    q('[data-logplan]')?.addEventListener('click', () => {
      const x = steps[0]; const i = x.o.meta.mineIdx, j = 1 - i;
      ui.logBet({ kind: 'lowhold', book: x.o.legs[i].book, sport: x.o.sport, market: x.o.market, selection: x.o.legs[i].outcome, price: x.o.legs[i].price, stake: x.stake, event: x.o.event });
      api.tracker.add({ kind: 'lowhold', book: x.o.legs[j].book, sport: x.o.sport, market: x.o.market, selection: x.o.legs[j].outcome, price: x.o.legs[j].price, stake: Math.round(x.hedge * 100) / 100, event: x.o.event });
      ui.toast(`Logged ${fmtAmerican(x.o.legs[i].price)} on ${bk?.short} + hedge`);
    });
  }

  const refresh = () => { paintTable(); paintPlan(); };
  ui.onSeg(root, 'mode', (v) => { st.mode = v; root.querySelectorAll('[data-seg="mode"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); paintTable(); });
  q('[data-hold]').addEventListener('input', (e) => { st.maxHold = Number(e.target.value) / 100; q('[data-hv]').textContent = pct(st.maxHold, 1); refresh(); });
  ui.onSelect(root, 'sport', (v) => { st.sport = v; paintTable(); });
  ui.onNumber(root, 'amount', (v) => { st.amount = v; paintTable(); });
  ui.onNumber(root, 'req', (v) => { if (v > 0) { st.req = v; paintPlan(); } });
  ui.onNumber(root, 'maxbet', (v) => { if (v > 0) { st.maxBet = v; paintPlan(); } });
  ui.onSelect(root, 'pbook', (v) => { st.book = v; paintPlan(); });
  refresh();
  const offTick = api.onTick(() => { if (st.mode === 'live') paintTable(); });
  const offStore = store.subscribe(() => refresh());
  return () => { offTick(); offStore(); };
}
