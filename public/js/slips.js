// Shared bet slips for two- and three-sided plays: arbitrage, low holds, middles and promo conversions.
// Any screen opens one with the screen ctx ({ ui, store, api }), so a play is always bet as a set and
// never as a single leg. ui.js stays free of page imports: pages and the Daily Card import this module.
//
//   openSlip(opp, ctx, opts)       dispatch on opp.kind ('arb' | 'lowhold' | 'middle')
//   openArbCalc(opp, ctx, opts)    arb / low-hold calculator (exact stake per book, anchor, rounding)
//   openMidCalc(opp, ctx, total)   middle calculator (scenarios, chance it hits, average)
//   openPromoSlip(promo, ctx)      best two-sided conversion for one promo
//   middleMath(prices, total, p)   middle stakes and outcomes (also used by Calculators)
//   ensureSlipCss()                inject the slip styles once (ensureCalcCss is the old name)
//
// Every slip logs its legs as one linked group in the Bet Tracker (api.tracker.addGroup).

import { toDecimal, fmtAmerican, money, pct } from './lib/odds.js';

const CSS = `
.arbcalc .calc-legs { width:100%; border-collapse:collapse; }
.arbcalc .calc-legs th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); padding:6px 6px; border-bottom:1px solid var(--line); }
.arbcalc .calc-legs td.r { text-align:right; font-variant-numeric:tabular-nums; }
.arbcalc .calc-legs td { padding:8px 6px; border-bottom:1px solid var(--line-2); vertical-align:middle; }
.arbcalc .calc-legs input { width:86px; border:1px solid var(--line); border-radius:8px; padding:6px 8px; background:var(--paper); font-variant-numeric:tabular-nums; }
.arbcalc .calc-legs input.anch { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }
.arbcalc .calc-legs .oc { font-weight:600; font-size:13px; }
.arbcalc .big, .midcalc .big, .pslip .big { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.arbcalc .big > div, .midcalc .big > div, .pslip .big > div { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.arbcalc .big span, .midcalc .big span, .pslip .big span { display:block; font-size:11.5px; color:var(--muted); }
.arbcalc .big strong { font:600 20px var(--serif); font-variant-numeric:tabular-nums; }
.arbcalc .big strong.pos { color:var(--pos); } .arbcalc .big strong.neg { color:var(--neg); }
.arbcalc .ctl { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
.arbcalc .anchor-note { font-size:12.5px; color:var(--muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.arbcalc h3 { margin:6px 0 8px; font-size:15px; }
.arbcalc .sc, .midcalc .sc, .pslip .sc { width:100%; border-collapse:collapse; font-size:13px; }
.arbcalc .sc td, .arbcalc .sc th, .pslip .sc td, .pslip .sc th { padding:7px 6px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.arbcalc .sc th, .midcalc .sc th, .pslip .sc th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
.arbcalc .sc td:first-child, .arbcalc .sc th:first-child, .midcalc .sc td:first-child, .midcalc .sc th:first-child, .pslip .sc td:first-child, .pslip .sc th:first-child { text-align:left; }
.midcalc .ruler { position:relative; height:34px; margin:6px 4px 22px; }
.midcalc .ruler .ln { position:absolute; left:0; right:0; top:16px; height:2px; background:var(--line); }
.midcalc .ruler .mz { position:absolute; top:8px; height:18px; background:var(--hl); border:2px solid var(--lime-2); border-radius:5px; }
.midcalc .ruler .tk { white-space:nowrap; position:absolute; top:30px; transform:translateX(-50%); font-size:11.5px; color:var(--muted); font-variant-numeric:tabular-nums; }
.midcalc .sc td, .midcalc .sc th { padding:8px 6px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.midcalc .sc tr.mid td { background:var(--hl); font-weight:700; }
.midcalc .big strong, .pslip .big strong { font:600 19px var(--serif); font-variant-numeric:tabular-nums; }
.midcalc .pos, .pslip .pos { color:var(--pos); } .midcalc .neg, .pslip .neg { color:var(--neg); }
.midcalc .lg, .pslip .lg { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line-2); flex-wrap:wrap; }
.midcalc .lg input { width:96px; border:1px solid var(--line); border-radius:8px; padding:6px 8px; background:var(--paper); }
.pslip .lg .amt { font-weight:700; font-size:17px; font-variant-numeric:tabular-nums; }
.pslip .lg .sub { font-size:12px; color:var(--muted); }
@media (max-width:520px) {
  .arbcalc .calc-legs thead { display:none; }
  .arbcalc .calc-legs tr { display:grid; grid-template-columns:1fr auto; gap:6px 10px; padding:10px 0; border-bottom:1px solid var(--line-2); }
  .arbcalc .calc-legs td { border:0; padding:0; }
  .arbcalc .calc-legs td[data-label]::before { content:attr(data-label) " "; color:var(--muted); font-size:11.5px; margin-right:4px; }
  .arbcalc .big strong { font-size:17px; }
  .midcalc .big strong, .pslip .big strong { font-size:16px; }
}`;

export function ensureSlipCss() {
  if (!document.getElementById('css-slips')) document.head.insertAdjacentHTML('beforeend', `<style id="css-slips">${CSS}</style>`);
}
export const ensureCalcCss = ensureSlipCss;

/** Signed money for a play's result: "+$4.20", "-$12.30", or "Free" when it rounds to zero. */
export const signedMoney = (x) => (Math.abs(x) < 0.005 ? 'Free' : `${x > 0 ? '+' : ''}${money(x)}`);

/** "both" for two legs, "all 3" for three. */
const bothWord = (n) => (n === 2 ? 'both' : `all ${n}`);

/** Open the right slip for an opportunity. opts: { total } (stake to size the play at). */
export function openSlip(opp, ctx, opts = {}) {
  if (opp.kind === 'middle') return openMidCalc(opp, ctx, opts.total ?? ctx.store.get().arbStake ?? 1000);
  return openArbCalc(opp, ctx, { kind: opp.kind === 'lowhold' ? 'lowhold' : 'arb', total: opts.total });
}

/** Full arb / low-hold calculator in a drawer. `opp` uses the shared opportunity shape. */
export function openArbCalc(opp, ctx, { kind = 'arb', total: total0 } = {}) {
  ensureSlipCss();
  const { ui, store, api } = ctx;
  const st = {
    prices: opp.legs.map((l) => l.price),
    total: total0 ?? store.get().arbStake ?? 1000,
    // Default rounding comes from the top-bar sizing popover (store.stakeRound: 0 = exact, 1 or 5 dollars).
    anchor: -1, anchorStake: 0, round: [0, 1, 5].includes(+store.get().stakeRound) ? +store.get().stakeRound : 0,
  };
  const ev = api.eventById(opp.eventId);
  const n = opp.legs.length;
  const body = ui.drawer(kind === 'lowhold' ? 'Low hold calculator' : 'Arbitrage calculator', `<div class="arbcalc stack">
    ${ui.eventCell(opp.eventId)}
    <div class="row">${ui.tag(opp.label)} ${ui.tag(opp.market)} ${opp.live ? ui.liveDot() : ''}</div>
    <div class="callout lime">${kind === 'lowhold'
      ? 'A low hold costs a little whichever side wins, which makes it the cheapest way to clear playthrough on a bonus.'
      : `We give you the exact bet size for each book, so you keep the difference whichever side wins, as long as ${bothWord(n)} legs fill at these prices.`}</div>
    <div class="ctl">
      ${ui.numberInput('ctotal', Math.round(st.total), 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Round stakes</span>${ui.seg('round', [[0, 'Exact'], [1, '$1'], [5, '$5']], st.round)}</label>
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
    <div class="big"><div><span>Total staked</span><strong data-o="staked"></strong></div><div><span data-o="plabel">Profit if ${bothWord(n)} fill</span><strong data-o="profit"></strong></div><div><span>ROI</span><strong data-o="roi"></strong></div></div>
    <div><h3>Payout by outcome</h3><table class="sc"><thead><tr><th>If this wins</th><th>Payout</th><th>Profit</th></tr></thead><tbody data-o="sc"></tbody></table></div>
    <div class="row"><button class="btn primary" data-log>Log ${bothWord(n)} bets</button><button class="btn" data-balance>Balance stakes</button>
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
    // Worst-case result with its sign: profit when every outcome pays more than was staked, cost otherwise.
    const pr = body.querySelector('[data-o="profit"]');
    body.querySelector('[data-o="plabel"]').textContent = r.min >= 0 ? `Profit if ${bothWord(n)} fill` : 'Cost to run';
    pr.textContent = signedMoney(r.min);
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
    // Opposite sides of one market: exactly one leg can win, so the group settles together.
    api.tracker.addGroup(opp.legs.map((l, i) => ({ kind, book: l.book, sport: opp.sport, market: opp.market, selection: l.outcome,
      price: st.prices[i], stake: Math.round(r.stakes[i] * 100) / 100, event: opp.event })), { exclusive: true });
    ui.toast(`Logged ${n} linked bets · ${r.min >= 0 ? 'profit' : 'cost'} ${money(Math.abs(r.min))} if ${bothWord(n)} fill`);
  });
  ui.wireBetButtons(body);
  paint();
}

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

/** Middle calculator in a drawer. */
export function openMidCalc(o, ctx, total0) {
  ensureSlipCss();
  const { ui, api } = ctx;
  const st = { total: total0, round: 0, prices: o.legs.map((l) => l.price), p: o.meta.middleProb };
  const { low, high } = o.meta;
  const body = ui.drawer('Middle calculator', `<div class="midcalc stack">
    ${ui.eventCell(o.eventId)}
    <div class="row">${ui.tag(`${o.meta.width} pt middle`, 'dark')} ${ui.tag(o.market)} ${o.live ? ui.liveDot() : ''}</div>
    <div><div class="muted" style="font-size:12px">Middle zone: both bets win</div><div class="ruler"><div class="ln"></div><div class="mz" style="left:33%;width:34%"></div><span class="tk" style="left:0;transform:none">Under wins</span><span class="tk" style="left:33%">${low}</span><span class="tk" style="left:50%;color:var(--pos);font-weight:700">BOTH WIN</span><span class="tk" style="left:67%">${high}</span><span class="tk" style="left:auto;right:0;transform:none">Over wins</span></div></div>
    <div class="callout lime">Most of the time one side wins and you lose a little. If the result lands between ${low} and ${high}, both bets win.</div>
    <div class="row">
      ${ui.numberInput('mtotal', st.total, 'Total stake', { prefix: '$', step: 50 })}
      <label class="field"><span>Round stakes</span>${ui.seg('mround', [[0, 'Exact'], [1, '$1'], [5, '$5']], 0)}</label>
      ${ui.numberInput('mprob', (st.p * 100).toFixed(1), 'Chance it hits %', { step: 0.1 })}
    </div>
    <div>${o.legs.map((l, i) => `<div class="lg"><div><div style="font-weight:600">${ui.esc(l.outcome)}</div><div class="row" style="margin-top:4px">${ui.book(l.book, { full: true })}
      <input data-mp="${i}" value="${fmtAmerican(l.price)}" aria-label="Odds"></div></div>
      <div style="text-align:right"><div class="muted" style="font-size:11.5px">Stake</div><strong data-ms="${i}" style="font-size:17px"></strong><div style="margin-top:6px">${ui.betBtn(l.book)}</div></div></div>`).join('')}</div>
    <div class="big"><div><span>If it misses (likely)</span><strong data-o="worst"></strong></div><div><span>If it hits</span><strong data-o="both" class="pos"></strong></div><div><span>Average</span><strong data-o="ev"></strong></div></div>
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
    // Both legs of a middle can win, so the group is not exclusive.
    api.tracker.addGroup(o.legs.map((l, i) => ({ kind: 'middle', book: l.book, sport: o.sport, market: o.market, selection: l.outcome,
      price: st.prices[i], stake: Math.round(m.stakes[i] * 100) / 100, event: o.event })));
    ui.toast(`Logged both sides of the ${o.meta.width} pt middle`);
  });
  ui.wireBetButtons(body);
  paint();
}

/**
 * Promo slip: the best exact two-sided conversion for one promo (promo leg at its book + hedge at
 * another of the user's books), with both bet buttons and linked logging. Falls back to the
 * Promo Converter when no conversion is available right now.
 */
export function openPromoSlip(promo, ctx) {
  ensureSlipCss();
  const { ui, api, store } = ctx;
  const P = api.promos;
  const strat = P.strategyFor(promo.type);
  const supported = ['bonus-bet', 'no-sweat', 'deposit-match', 'profit-boost'].includes(strat);
  const conv = supported ? P.bestConversions({ type: strat, amount: promo.amount, book: promo.book, boostPct: promo.boostPct ?? 0.5, playthrough: promo.playthrough || 1 },
    api.lines(), { books: store.get().books, limit: 1 })[0] : null;
  const href = `#/promo-converter?promo=${encodeURIComponent(promo.id)}`;
  if (!conv) {
    ui.drawer('Promo slip', `<div class="pslip stack">
      <div class="callout lime"><strong>${ui.esc(promo.title)}</strong><div style="font-size:12.5px;margin-top:4px">${ui.book(promo.book, { full: true })} · ${ui.esc(P.typeLabel(promo.type))}</div></div>
      ${ui.empty('No two-sided conversion for this promo at your books right now.')}
      <div class="row"><a class="btn" href="${href}" data-close-link>Open in Promo Converter</a></div></div>`).querySelector('[data-close-link]').addEventListener('click', () => ui.closeDrawer());
    return;
  }
  const bonusLeg = strat === 'bonus-bet' || strat === 'deposit-match';
  const promoWord = { 'bonus-bet': 'bonus bet', 'no-sweat': 'no-sweat cash bet', 'deposit-match': 'bonus funds', 'profit-boost': 'profit boost' }[strat];
  const legRow = (l, what) => `<div class="lg"><div><div style="font-weight:600">${ui.esc(l.outcome)}</div><div class="sub">${ui.book(l.book, { full: true })} ${ui.price(l.price)} · ${ui.esc(what)}</div></div>
    <div style="text-align:right"><div class="amt">${money(l.stake)}</div><div style="margin-top:6px">${ui.betBtn(l.book)}</div></div></div>`;
  const body = ui.drawer('Promo slip', `<div class="pslip stack">
    <div class="callout lime"><strong>${ui.esc(promo.title)}</strong><div style="font-size:12.5px;margin-top:4px">${ui.book(promo.book, { full: true })} · ${ui.esc(P.typeLabel(promo.type))}</div></div>
    ${ui.eventCell(conv.eventId)}
    <div class="muted" style="font-size:12.5px">${ui.esc(conv.label)} · place both bets: the promo leg and the cash hedge.</div>
    <div>${legRow(conv.promoLeg, promoWord)}${legRow(conv.hedgeLeg, 'cash hedge')}</div>
    <div class="big"><div><span>Cash kept</span><strong class="pos">${money(conv.kept)}</strong></div><div><span>Conversion</span><strong>${pct(conv.rate)}</strong></div><div><span>Hedge stake</span><strong>${money(conv.hedgeLeg.stake)}</strong></div></div>
    <table class="sc"><thead><tr><th>If this wins</th><th>Net</th></tr></thead><tbody>
      <tr><td>${ui.esc(conv.promoLeg.outcome)}</td><td class="${conv.ifWin >= 0 ? 'pos' : 'neg'}" style="font-weight:700">${signedMoney(conv.ifWin)}</td></tr>
      <tr><td>${ui.esc(conv.hedgeLeg.outcome)}</td><td class="${conv.ifLose >= 0 ? 'pos' : 'neg'}" style="font-weight:700">${signedMoney(conv.ifLose)}</td></tr>
    </tbody></table>
    <div class="muted" style="font-size:12px">Confirm both prices before you submit. If either has moved, reopen this slip: stakes recalculate on every update.</div>
    <div class="row"><button class="btn primary" data-log>Log both bets</button>${promo.claimed ? '' : '<button class="btn" data-claim>Mark promo claimed</button>'}<a class="btn ghost" href="${href}" data-close-link>Open in Promo Converter</a></div>
  </div>`);
  ui.wireBetButtons(body);
  body.querySelector('[data-close-link]').addEventListener('click', () => ui.closeDrawer());
  body.querySelector('[data-log]').addEventListener('click', () => {
    const base = { kind: 'promo', sport: conv.sport, market: conv.market };
    api.tracker.addGroup([
      { ...base, book: conv.promoLeg.book, selection: `${conv.promoLeg.outcome} (${promoWord})`, price: conv.promoLeg.price, stake: Math.round(conv.promoLeg.stake * 100) / 100, bonus: bonusLeg },
      { ...base, book: conv.hedgeLeg.book, selection: `${conv.hedgeLeg.outcome} (hedge)`, price: conv.hedgeLeg.price, stake: Math.round(conv.hedgeLeg.stake * 100) / 100 },
    ], { exclusive: true });
    ui.toast('Both bets logged to your Bet Tracker');
  });
  body.querySelector('[data-claim]')?.addEventListener('click', (e) => { P.claim(promo.id, true); e.target.remove(); ui.toast('Promo marked claimed'); });
}
