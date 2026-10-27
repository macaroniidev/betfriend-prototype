// Middles finder: Over a low number at one book + Under a higher number at another.
// Either you roughly break even, or the result lands in the middle and both sides win.

import { toDecimal, fmtAmerican, money, pct } from '../lib/odds.js';

const CSS = `
.bf-mid .t .r { text-align:right; font-variant-numeric:tabular-nums; }
.bf-mid .width { display:inline-flex; flex-direction:column; align-items:flex-start; gap:2px; }
.bf-mid .width b { font:600 18px var(--serif); }
.bf-mid .width small { color:var(--muted); font-size:11.5px; font-variant-numeric:tabular-nums; }
.bf-mid .hit { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
.bf-mid .win { color:var(--pos); font-weight:700; font-variant-numeric:tabular-nums; }
.bf-mid .cost { color:var(--neg); font-weight:600; font-variant-numeric:tabular-nums; }
.bf-mid .leg .oc { font-weight:600; font-size:12.5px; }
.midcalc .ruler { position:relative; height:34px; margin:6px 4px 22px; }
.midcalc .ruler .ln { position:absolute; left:0; right:0; top:16px; height:2px; background:var(--line); }
.midcalc .ruler .mz { position:absolute; top:8px; height:18px; background:color-mix(in srgb, var(--lime) 70%, transparent); border:1px solid var(--lime-2); border-radius:5px; }
.midcalc .ruler .tk { white-space:nowrap; position:absolute; top:30px; transform:translateX(-50%); font-size:11.5px; color:var(--muted); font-variant-numeric:tabular-nums; }
@media (max-width:860px) { .bf-mid table.stack-sm td.evc { flex-direction:column; text-align:left; } .bf-mid table.stack-sm td .legs { align-items:flex-end; } }
.midcalc .sc { width:100%; border-collapse:collapse; font-size:13px; }
.midcalc .sc td, .midcalc .sc th { padding:8px 6px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.midcalc .sc th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
.midcalc .sc td:first-child, .midcalc .sc th:first-child { text-align:left; }
.midcalc .sc tr.mid td { background:color-mix(in srgb, var(--lime) 35%, transparent); font-weight:700; }
.midcalc .big { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.midcalc .big > div { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.midcalc .big span { display:block; font-size:11.5px; color:var(--muted); }
.midcalc .big strong { font:600 19px var(--serif); font-variant-numeric:tabular-nums; }
.midcalc .pos { color:var(--pos); } .midcalc .neg { color:var(--neg); }
.midcalc .lg { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line-2); flex-wrap:wrap; }
.midcalc .lg input { width:96px; border:1px solid var(--line); border-radius:8px; padding:6px 8px; background:var(--paper); }
@media (max-width:520px) { .midcalc .big strong { font-size:16px; } }`;

/** Stakes / outcomes for a middle with a total stake split for equal single-side payouts. */
export function middleMath(prices, total, p, round = 0) {
  const d = prices.map(toDecimal);
  const inv = 1 / d[0] + 1 / d[1];
  let stakes = d.map((x) => (total / x) / inv);
  if (round) stakes = stakes.map((s) => Math.max(round, Math.round(s / round) * round));
  const staked = stakes[0] + stakes[1];
  const overOnly = stakes[0] * d[0] - staked;
  const underOnly = stakes[1] * d[1] - staked;
  const both = stakes[0] * d[0] + stakes[1] * d[1] - staked;
  const worst = Math.min(overOnly, underOnly);
  const evv = p * both + (1 - p) * ((overOnly + underOnly) / 2);
  return { stakes, staked, overOnly, underOnly, both, worst, ev: evv };
}

function openMidCalc(o, ctx, total0) {
  const { ui } = ctx;
  const st = { total: total0, round: 0, prices: o.legs.map((l) => l.price), p: o.meta.middleProb };
  const { low, high } = o.meta;
  const body = ui.drawer('Middle calculator', `<div class="midcalc stack">
    ${ui.eventCell(o.eventId)}
    <div class="row">${ui.tag(`${o.meta.width} pt middle`, 'dark')} ${ui.tag(o.market)} ${o.live ? ui.liveDot() : ''}</div>
    <div><div class="muted" style="font-size:12px">Middle zone: both bets win</div><div class="ruler"><div class="ln"></div><div class="mz" style="left:33%;width:34%"></div><span class="tk" style="left:0;transform:none">Under wins</span><span class="tk" style="left:33%">${low}</span><span class="tk" style="left:50%;color:var(--pos);font-weight:700">BOTH WIN</span><span class="tk" style="left:67%">${high}</span><span class="tk" style="left:auto;right:0;transform:none">Over wins</span></div></div>
    <div class="callout lime">Special arbs where you either break even or both sides win for a huge payout.</div>
    <div class="row">
      ${ui.numberInput('mtotal', st.total, 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Round stakes</span>${ui.seg('mround', [[0, 'Exact'], [1, '$1'], [5, '$5']], 0)}</label>
      ${ui.numberInput('mprob', (st.p * 100).toFixed(1), 'Middle hit %', { step: 0.1 })}
    </div>
    <div>${o.legs.map((l, i) => `<div class="lg"><div><div style="font-weight:600">${ui.esc(l.outcome)}</div><div class="row" style="margin-top:4px">${ui.book(l.book, { full: true })}
      <input data-mp="${i}" value="${fmtAmerican(l.price)}" aria-label="Odds"></div></div>
      <div style="text-align:right"><div class="muted" style="font-size:11.5px">Stake</div><strong data-ms="${i}" style="font-size:17px"></strong><div style="margin-top:6px">${ui.betBtn(l.book)}</div></div></div>`).join('')}</div>
    <div class="big"><div><span>Worst case</span><strong data-o="worst"></strong></div><div><span>If middle hits</span><strong data-o="both" class="pos"></strong></div><div><span>Expected value</span><strong data-o="ev"></strong></div></div>
    <div><h3 style="font-size:15px;margin:4px 0 8px">Scenarios</h3><table class="sc"><thead><tr><th>Final result</th><th>Chance</th><th>Profit</th></tr></thead><tbody data-o="sc"></tbody></table></div>
    <div class="row"><button class="btn primary" data-log>Log both bets</button></div>
  </div>`);
  const paint = () => {
    const m = middleMath(st.prices, st.total, st.p, st.round);
    m.stakes.forEach((s, i) => { body.querySelector(`[data-ms="${i}"]`).textContent = money(s, st.round ? 0 : 2); });
    const set = (k, v, tone) => { const el = body.querySelector(`[data-o="${k}"]`); el.textContent = v; if (tone !== undefined) el.className = tone; };
    set('worst', `${m.worst >= 0 ? '+' : ''}${money(m.worst)}`, m.worst >= 0 ? 'pos' : 'neg');
    set('both', `+${money(m.both)}`);
    set('ev', `${m.ev >= 0 ? '+' : ''}${money(m.ev)}`, m.ev >= 0 ? 'pos' : 'neg');
    const side = (1 - st.p) / 2;
    const row = (label, ch, v, cls = '') => `<tr class="${cls}"><td>${label}</td><td>${pct(ch, 1)}</td><td class="${v >= 0 ? 'pos' : 'neg'}" style="font-weight:700">${v >= 0 ? '+' : ''}${money(v)}</td></tr>`;
    body.querySelector('[data-o="sc"]').innerHTML =
      row(`Under ${low} → Under wins`, side, m.underOnly) +
      row(`Between ${low} and ${high} → Middle hits, both win`, st.p, m.both, 'mid') +
      row(`Over ${high} → Over wins`, side, m.overOnly);
  };
  ui.onNumber(body, 'mtotal', (v) => { st.total = v; paint(); });
  ui.onNumber(body, 'mprob', (v) => { st.p = Math.min(0.9, Math.max(0, v / 100)); paint(); });
  ui.onSeg(body, 'mround', (v) => { st.round = Number(v); body.querySelectorAll('[data-seg="mround"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); paint(); });
  body.querySelectorAll('[data-mp]').forEach((inp) => inp.addEventListener('input', () => {
    const v = parseFloat(inp.value); if (Number.isNaN(v) || Math.abs(v) < 100) return;
    st.prices[Number(inp.dataset.mp)] = v; paint();
  }));
  body.querySelector('[data-log]').addEventListener('click', () => {
    const m = middleMath(st.prices, st.total, st.p, st.round);
    o.legs.forEach((l, i) => ui.logBet({ kind: 'middle', book: l.book, sport: o.sport, market: o.market, selection: l.outcome, price: st.prices[i], stake: Math.round(m.stakes[i] * 100) / 100, event: o.event }));
    ui.toast(`Logged both sides of the ${o.meta.width} pt middle`);
  });
  ui.wireBetButtons(body);
  paint();
}

export default function render(root, ctx) {
  const { api, store, ui, params } = ctx;
  if (!document.getElementById('css-middles')) document.head.insertAdjacentHTML('beforeend', `<style id="css-middles">${CSS}</style>`);
  const st = { mode: params.mode === 'live' ? 'live' : 'pre', sport: 'All', stake: store.get().arbStake || 1000, sort: 'ev' };
  let rows = [];

  root.innerHTML = `<div class="bf-mid">
    ${ui.header({ title: 'Middles', tool: 'middles',
      subtitle: 'Special arbs where you either break even or both sides win for a huge payout. Bet the Over on the low number and the Under on the high number.',
      actions: ui.seg('mode', [['pre', 'Pre-match'], ['live', 'Live']], st.mode) })}
    <div data-stats></div>
    <div class="toolbar">
      ${ui.select('sport', ['All', ...api.sports], st.sport, 'Sport')}
      ${ui.numberInput('stake', st.stake, 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Sort by</span>${ui.seg('sort', [['ev', 'Best EV'], ['width', 'Widest'], ['cost', 'Lowest cost']], st.sort)}</label>
    </div>
    <div class="card"><div data-table></div></div>
  </div>`;
  const q = (s) => root.querySelector(s);

  function refresh(flash = new Set()) {
    rows = api.middles({ books: store.get().books, live: st.mode === 'live', sport: st.sport })
      .map((o) => ({ o, m: middleMath(o.legs.map((l) => l.price), st.stake, o.meta.middleProb) }));
    rows.sort((a, b) => st.sort === 'width' ? b.o.meta.width - a.o.meta.width || b.m.ev - a.m.ev
      : st.sort === 'cost' ? b.m.worst - a.m.worst : b.m.ev - a.m.ev);
    const best = rows.reduce((a, r) => Math.max(a, r.m.ev), -Infinity);
    const widest = rows.reduce((a, r) => Math.max(a, r.o.meta.width), 0);
    q('[data-stats]').innerHTML = ui.stats([
      { label: st.mode === 'live' ? 'Live middles' : 'Pre-match middles', value: rows.length, note: 'across your books' },
      { label: 'Widest middle', value: rows.length ? `${widest} pts` : '—' },
      { label: 'Biggest middle payout', value: rows.length ? money(Math.max(...rows.map((r) => r.m.both))) : '—', tone: 'pos', note: `at ${money(st.stake, 0)} total` },
      { label: 'Best EV', value: rows.length ? `${best >= 0 ? '+' : ''}${money(best)}` : '—', tone: best >= 0 ? 'pos' : '' },
    ]);
    if (!rows.length) { q('[data-table]').innerHTML = `<div class="pad">${ui.empty('No middles for this filter right now.')}</div>`; return; }
    q('[data-table]').innerHTML = `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      <th>Width</th><th>Event</th><th>Legs</th><th class="r">Worst case</th><th class="r">Middle hit</th><th class="r">EV</th><th class="r">If middle hits</th><th></th></tr></thead><tbody>
      ${rows.map(({ o, m }) => `<tr class="click${flash.has(o.id) ? ' flash' : ''}" data-id="${o.id}">
        <td data-label="Width"><span class="width"><b>${o.meta.width} pt${o.meta.width === 1 ? '' : 's'}</b><small>${o.meta.low} – ${o.meta.high}</small></span></td>
        <td data-label="Event" class="evc"><div>${ui.eventCell(o.eventId)}<div class="muted" style="font-size:12px;margin-top:2px">${ui.esc(o.market === 'Player Prop' ? o.label : 'Game total')}</div></div></td>
        <td data-label="Legs"><div class="legs">${o.legs.map((l) => `<div class="leg">${ui.book(l.book)} ${ui.price(l.price)} <span class="oc">${ui.esc(l.outcome)}</span></div>`).join('')}</div></td>
        <td data-label="Worst case" class="r"><span class="${m.worst >= 0 ? 'win' : 'cost'}">${m.worst >= 0 ? '+' : ''}${money(m.worst)}</span></td>
        <td data-label="Middle hit" class="r"><span class="hit">${ui.meter(Math.min(1, o.meta.middleProb * 4))} ${pct(o.meta.middleProb, 1)}</span></td>
        <td data-label="EV" class="r"><span class="${m.ev >= 0 ? 'win' : 'cost'}">${m.ev >= 0 ? '+' : ''}${money(m.ev)}</span></td>
        <td data-label="If middle hits" class="r"><span class="win">+${money(m.both)}</span></td>
        <td data-label=""><button class="btn sm lime">Calculator</button></td></tr>`).join('')}
      </tbody></table></div>`;
    q('[data-table]').querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => {
      const r = rows.find((x) => x.o.id === tr.dataset.id); if (r) openMidCalc(r.o, ctx, st.stake);
    }));
  }

  ui.onSeg(root, 'mode', (v) => { st.mode = v; root.querySelectorAll('[data-seg="mode"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); refresh(); });
  ui.onSeg(root, 'sort', (v) => { st.sort = v; root.querySelectorAll('[data-seg="sort"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); refresh(); });
  ui.onSelect(root, 'sport', (v) => { st.sport = v; refresh(); });
  ui.onNumber(root, 'stake', (v) => { st.stake = v; refresh(); });
  refresh();
  let prevKey = new Map(rows.map((r) => [r.o.id, r.o.legs.map((l) => l.price).join()]));
  const offTick = api.onTick(() => {
    if (st.mode !== 'live') return;
    const before = prevKey;
    refresh();
    const changed = new Set(rows.filter((r) => before.get(r.o.id) !== r.o.legs.map((l) => l.price).join()).map((r) => r.o.id));
    prevKey = new Map(rows.map((r) => [r.o.id, r.o.legs.map((l) => l.price).join()]));
    if (changed.size) refresh(changed);
  });
  const offStore = store.subscribe(() => refresh());
  return () => { offTick(); offStore(); };
}
