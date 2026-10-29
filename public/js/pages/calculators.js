// Calculator hub: arbitrage, +EV / no-vig, Kelly, parlay, hold, odds converter, bonus bet and middles.
// Everything recalculates as you type. Layout (C12): a tab list, then the form (60%) beside the result
// (40%), which is a landing-style bet slip with its result and math lines (B16) plus the full breakdown.
// Deep links (B17): #/calculators?tab=arb&a=+150&b=-140&stake=1000 prefills a tab; see QUERY below.

import { toDecimal, toAmerican, impliedProb, fmtAmerican, devig, devigAdditive, devigPower, hold, ev, kelly,
  arbStakes, parlay, convertBonusBet, money, pct } from '../lib/odds.js';
import { middleMath } from '../slips.js';

const CSS = `
.bf-calc .calc-tabs { display:flex; gap:2px; border-bottom:2px solid var(--line); margin:0 0 18px; overflow-x:auto; scrollbar-width:none; overscroll-behavior-x:contain; }
.bf-calc .calc-tabs::-webkit-scrollbar { display:none; }
.bf-calc .calc-tabs [role=tab] { flex:none; border:0; background:none; cursor:pointer; color:var(--muted); font:900 17px/1 var(--f-head); text-transform:uppercase; letter-spacing:.01em;
  padding:12px 14px 11px; border-radius:10px 10px 0 0; box-shadow:inset 0 -4px 0 transparent; margin-bottom:-2px; min-height:44px; white-space:nowrap; }
.bf-calc .calc-tabs [role=tab]:hover { color:var(--text); background:var(--panel); }
.bf-calc .calc-tabs [role=tab][aria-selected=true] { color:var(--accent); box-shadow:inset 0 -4px 0 var(--g); }
.bf-calc .calc-panel { display:grid; grid-template-columns:minmax(0,3fr) minmax(0,2fr); gap:28px; align-items:start; }
.bf-calc .calc-form { min-width:0; display:grid; gap:16px; align-content:start; }
.bf-calc .calc-for { margin:0; font-size:16px; line-height:1.5; max-width:62ch; }
.bf-calc .calc-for-h { font-size:var(--t-h3); margin-bottom:6px; }
.bf-calc .inputs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 16px; }
.bf-calc .inputs .full { grid-column:1 / -1; }
.bf-calc .inputs .field > span { font-size:13px; }
.bf-calc .inputs .field .num, .bf-calc .inputs input.input { min-height:44px; font-size:16px; }
.bf-calc .calc-acts { display:flex; gap:8px 12px; flex-wrap:wrap; align-items:center; padding-top:14px; border-top:1px solid var(--line); }
.bf-calc .prefill { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; }
.bf-calc .pleg { display:flex; gap:8px; align-items:flex-end; }
.bf-calc .pleg .field { flex:1; }
.bf-calc .pleg .icon-btn { width:44px; height:44px; flex:none; }

/* result column: hero figure, secondary figures, slip, breakdown */
.bf-calc .calc-out { position:sticky; top:calc(var(--topbar-h) + 16px); min-width:0; display:grid; gap:14px; }
.bf-calc .res-top { display:grid; gap:4px; border-top:4px solid var(--g); padding-top:12px; }
.bf-calc .res-l { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; font-weight:800; color:var(--muted); }
.bf-calc .res-fig { font:900 44px/1 var(--f-head); color:var(--accent); font-variant-numeric:tabular-nums; letter-spacing:.005em; }
.bf-calc .res-fig.pos { color:var(--pos); }
.bf-calc .res-fig.muted { color:var(--muted); }
.bf-calc .figs { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:10px 16px; padding:10px 0; border-block:1px solid var(--line); }
.bf-calc .figs span { display:block; font-size:12px; font-weight:700; color:var(--muted); }
.bf-calc .figs strong { display:block; font:900 22px/1.05 var(--f-head); font-variant-numeric:tabular-nums; margin-top:3px; }
.bf-calc .figs strong.pos { color:var(--pos); } .bf-calc .figs strong.neg { color:var(--neg); } .bf-calc .figs strong.muted { color:var(--muted); }
.bf-calc .bf2-slip li { grid-template-columns:minmax(0,1fr) auto auto; }
.bf-calc .breakdown h3 { font-size:15px; margin:0 0 6px; color:var(--muted); }
.bf-calc .mini { width:100%; border-collapse:collapse; font-size:var(--t-cell); }
.bf-calc .mini th { text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:800; padding:7px 8px; border-bottom:2px solid var(--line); }
.bf-calc .mini td { padding:7px 8px; border-bottom:1px solid var(--line-2); font-variant-numeric:tabular-nums; }
.bf-calc .mini td.r, .bf-calc .mini th.r { text-align:right; }
.bf-calc .mini tr.hl td { background:var(--hl); font-weight:800; }
.bf-calc .pos { color:var(--pos); } .bf-calc .neg { color:var(--neg); }
.bf-calc .kv { margin-top:10px; font-size:14px; }
.bf-calc .note { margin:8px 0 0; font-size:14px; color:var(--muted); line-height:1.45; }
@media (max-width:979px) {
  .bf-calc .calc-panel { grid-template-columns:1fr; gap:20px; }
  .bf-calc .calc-out { position:static; }
  .bf-calc .calc-tabs { margin-inline:-16px; padding-inline:12px; }
}
@media (max-width:520px) { .bf-calc .res-fig { font-size:38px; } .bf-calc .inputs { gap:12px; } }`;

// [id, tab label, glossary-aware "what it's for" (built at render), live tool route, live tool name]
const TABS = [['arb', 'Arbitrage', 'arbitrage', 'Arbitrage'], ['ev', '+EV & No-vig', 'positive-ev', 'Positive EV'], ['kelly', 'Kelly', 'positive-ev', 'Positive EV'],
  ['parlay', 'Parlay', 'parlay-builder', 'Parlay Builder'], ['hold', 'Hold', 'low-holds', 'Low Holds'], ['convert', 'Odds converter', 'screen', 'Sportsbook Screen'],
  ['bonus', 'Bonus bet', 'promo-converter', 'Promo Converter'], ['middle', 'Middle', 'middles', 'Middles']];

// Values survive tab switches during the session.
const V = {
  arb: { ways: 2, o1: 112, o2: 103, o3: 410, total: null },
  ev: { a: -118, b: 102, mine: 110, method: 'multiplicative' },
  kelly: { prob: 55, price: -105, bank: null, mult: null },
  parlay: { legs: [-110, 145, -125], stake: 25 },
  hold: { ways: 2, o1: -110, o2: -110, o3: 250 },
  convert: { am: 150 },
  bonus: { amt: 500, bp: 410, hp: -480 },
  middle: { o: -105, u: -110, low: 44.5, high: 47.5, total: 1000, prob: 9 },
};
// "Try an example": typical numbers for each calculator (illustrative, not live prices).
const EXAMPLES = {
  arb: { ways: 2, o1: 150, o2: -140, total: 1000 },
  ev: { a: -125, b: 105, mine: 115, method: 'multiplicative' },
  kelly: { prob: 52.5, price: 110 },
  parlay: { legs: [-110, -110, -110], stake: 20 },
  hold: { ways: 2, o1: -105, o2: -115 },
  convert: { am: -150 },
  bonus: { amt: 250, bp: 350, hp: -420 },
  middle: { o: -110, u: -110, low: 44.5, high: 46.5, total: 1000, prob: 6 },
};
// Deep-link params per tab (ui.calcLink emits tab, a, b, stake). Any field key (o1, low, prob, mine …) also
// works directly, e.g. #/calculators?tab=middle&a=-105&b=-110&low=44.5&high=47.5&stake=1000.
//   arb / hold: a, b, c = side 1, 2, 3 odds (c makes it 3-way), stake = total stake
//   ev: a, b = sharp prices for sides A and B, mine = your price on side A
//   kelly: a = odds, prob = win %, stake = bankroll · parlay: legs=-110,145 (or a, b), stake
//   convert: a = American odds · bonus: a = bonus-bet odds, b = hedge odds, stake = bonus amount
//   middle: a = Over odds, b = Under odds, low, high, prob = hit %, stake = total stake
const QUERY = {
  arb: { a: 'o1', b: 'o2', c: 'o3', stake: 'total' }, hold: { a: 'o1', b: 'o2', c: 'o3' }, ev: {},
  kelly: { a: 'price', stake: 'bank' }, parlay: { stake: 'stake' }, convert: { a: 'am' },
  bonus: { a: 'bp', b: 'hp', stake: 'amt' }, middle: { a: 'o', b: 'u', stake: 'total' },
};

const n = (k, v, label, opt = {}) => `<label class="field${opt.full ? ' full' : ''}"><span>${label}</span><div class="num">${opt.prefix ? `<em>${opt.prefix}</em>` : ''}<input type="number" inputmode="decimal" data-k="${k}" value="${v}" step="${opt.step || 1}"></div></label>`;
const signed = (x, f = money) => `${x >= 0 ? '+' : '−'}${f(Math.abs(x))}`;
const am = (x) => fmtAmerican(x).replace('-', '−');
const okAm = (x) => Number.isFinite(x) && Math.abs(x) >= 100;
const bad = '<div class="callout">Enter American odds like -110 or +150.</div>';

function fracOf(dec) {
  const x = dec - 1;
  let best = [Math.round(x), 1], err = Infinity;
  for (let d = 1; d <= 40; d++) { const nn = Math.round(x * d); const e = Math.abs(x - nn / d); if (e < err - 1e-9) { err = e; best = [nn, d]; } if (e < 1e-6) break; }
  return `${best[0]}/${best[1]}`;
}

export default function render(root, ctx) {
  const { store, ui, params } = ctx;
  if (!document.getElementById('css-calculators')) document.head.insertAdjacentHTML('beforeend', `<style id="css-calculators">${CSS}</style>`);
  const s0 = store.get();
  if (V.arb.total == null) V.arb.total = s0.arbStake || 1000;
  let tab = TABS.some(([t]) => t === params.tab) ? params.tab : 'arb';
  const prefilled = applyQuery(tab, params);
  const t = (key, label) => ui.term(key, label);

  // ---------- result building blocks ----------
  const top = (label, value, tone = '', extra = '') => `<div class="res-top"><span class="res-l">${label}${extra}</span><b class="res-fig ${tone}" data-bf-nodata>${value}</b></div>`;
  const figs = (items) => `<div class="figs">${items.map(([l, v, tone]) => `<div><span>${l}</span><strong class="${tone || ''}" data-bf-nodata>${v}</strong></div>`).join('')}</div>`;
  const breakdown = (html) => `<div class="breakdown"><h3>Breakdown</h3>${html}</div>`;

  // ---------- each calculator: what it's for, inputs html, output html ----------
  const C = {
    arb: {
      for: `Bet both sides of a market at two books so either result pays the same. Enter the best price for each side and we give you the exact stake for each book. Learn more: ${t('arb', 'arbitrage')}.`,
      inputs: (v) => `<div class="full">${ui.seg('ways', [[2, '2-way'], [3, '3-way']], v.ways)}</div>
        ${n('o1', v.o1, 'Side 1 odds')}${n('o2', v.o2, 'Side 2 odds')}${v.ways == 3 ? n('o3', v.o3, 'Side 3 odds (draw)') : ''}
        ${n('total', v.total, 'Total stake', { prefix: '$', step: 50, full: v.ways != 3 })}`,
      out(v) {
        const ps = [v.o1, v.o2, ...(v.ways == 3 ? [v.o3] : [])];
        if (!ps.every(okAm) || !(v.total > 0)) return bad;
        const r = arbStakes(ps, v.total), h = hold(ps), ok = r.profit >= 0;
        return `${top(ok ? 'Profit if both fill' : 'Cost (not an arb)', signed(r.profit), ok ? 'pos' : 'muted', ok ? ui.risk('arb', { short: true }) : '')}
          ${figs([['ROI', signed(r.roi, (x) => pct(x, 2)), ok ? 'pos' : 'neg'], ['Market hold', pct(h, 2)]])}
          ${ui.slip({ caption: `Your bets · ${ps.length}-way`, tag: 'Arbitrage',
            legs: ps.map((p, i) => ({ title: `Side ${i + 1}${v.ways == 3 && i === 2 ? ' (draw)' : ''}`, sub: `pays back ${money(r.payout)}`, odds: am(p), stake: money(r.stakes[i]) })),
            result: ok ? `${signed(r.profit)} if both fill, whichever side wins` : `Not an arb: this costs ${money(-r.profit)} whichever side wins`,
            math: ps.map((p, i) => `${money(r.stakes[i])} at ${am(p)} pays back ${money(r.payout)}`).join('; ') + `. Total staked ${money(v.total)}.` })}
          ${breakdown(`<table class="mini"><thead><tr><th>Side</th><th class="r">Odds</th><th class="r">Stake</th><th class="r">Payout</th></tr></thead><tbody>
            ${ps.map((p, i) => `<tr><td>Side ${i + 1}</td><td class="r">${am(p)}</td><td class="r"><strong>${money(r.stakes[i])}</strong></td><td class="r">${money(r.payout)}</td></tr>`).join('')}</tbody></table>
            <p class="note">${ok ? `If both bets fill at these prices you keep ${money(r.profit)} whichever side wins. Place both quickly: prices move, and a leg that doesn’t fill leaves you with a one-sided bet.` : `Combined implied probability is ${pct(1 + h, 2)}. Find a better price on one side to turn this into an arb.`}</p>`)}`;
      },
    },
    ev: {
      for: `Remove the ${t('vig', 'vig')} from a sharp two-sided market (Circa or Novig, say) to get ${t('fair', 'fair odds')}, then see the ${t('ev', 'EV')} and ${t('kelly', 'Kelly')} stake of the price you can bet.`,
      inputs: (v) => `${n('a', v.a, 'Sharp price · Side A')}${n('b', v.b, 'Sharp price · Side B')}
        ${n('mine', v.mine, 'Your price on Side A', { full: true })}
        <div class="full"><div class="field"><span id="nv-lbl">No-vig method</span><div role="group" aria-labelledby="nv-lbl">${ui.seg('method', [['multiplicative', 'Multiplicative'], ['additive', 'Additive'], ['power', 'Power']], v.method)}</div></div></div>`,
      out(v) {
        if (![v.a, v.b, v.mine].every(okAm)) return bad;
        const imp = [impliedProb(v.a), impliedProb(v.b)];
        const fn = v.method === 'additive' ? devigAdditive : v.method === 'power' ? devigPower : devig;
        const fair = fn(imp);
        const e = ev(fair[0], v.mine);
        const { bankroll, kellyMult } = store.get();
        const k = kelly(fair[0], v.mine, kellyMult);
        const stake = Math.max(0, k * bankroll);
        const payout = stake * toDecimal(v.mine);
        return `${top('EV on your price', signed(e, (x) => pct(x, 2)), e >= 0 ? 'pos' : 'muted', ui.risk('ev', { short: true }))}
          ${figs([['Fair odds · A', am(toAmerican(1 / fair[0]))], [ui.esc(ui.kellyLabel(kellyMult)), money(stake), stake > 0 ? 'pos' : '']])}
          ${ui.slip({ caption: 'Your bet · Side A', tag: '+EV',
            legs: [{ title: 'Side A at your price', sub: `fair ${am(toAmerican(1 / fair[0]))} · ${v.method}`, odds: am(v.mine), stake: stake > 0 ? money(stake) : '—' }],
            result: stake > 0 ? `wins ~${Math.round(fair[0] * 100)}% · pays ${money(payout)} · worth ${signed(e * stake)}` : 'No edge at this price: the suggested stake is $0',
            math: `Fair win chance ${pct(fair[0], 2)} vs ${pct(impliedProb(v.mine), 2)} implied by ${am(v.mine)}. It can lose; the edge shows up over many bets.` })}
          ${breakdown(`<table class="mini"><thead><tr><th>Side</th><th class="r">Price</th><th class="r">Implied</th><th class="r">No-vig prob</th><th class="r">Fair odds</th></tr></thead><tbody>
            ${['A', 'B'].map((sd, i) => `<tr><td>Side ${sd}</td><td class="r">${am(i ? v.b : v.a)}</td><td class="r">${pct(imp[i], 2)}</td><td class="r"><strong>${pct(fair[i], 2)}</strong></td><td class="r">${am(toAmerican(1 / fair[i]))}</td></tr>`).join('')}
            </tbody></table>
            <dl class="kv"><dt>Market vig</dt><dd>${pct(imp[0] + imp[1] - 1, 2)}</dd><dt>Expected profit per $100</dt><dd class="${e >= 0 ? 'pos' : 'neg'}">${signed(e * 100)}</dd>
            <dt>Full Kelly</dt><dd>${pct(kelly(fair[0], v.mine, 1), 2)} of bankroll</dd><dt>Bankroll (Settings)</dt><dd><a href="#/account">${money(bankroll, 0)}</a></dd></dl>`)}`;
      },
    },
    kelly: {
      for: `Size a bet from your edge and your ${t('bankroll', 'bankroll')}. Kelly grows a bankroll fastest on paper; most pros bet a ${t('kelly_fraction', 'fraction of Kelly')} to smooth the ride.`,
      inputs: (v) => `${n('prob', v.prob, 'Win probability %', { step: 0.5 })}${n('price', v.price, 'Odds (American)')}
        ${n('bank', v.bank, 'Bankroll', { prefix: '$', step: 100 })}${n('mult', v.mult, 'Kelly multiplier', { step: 0.05 })}`,
      out(v) {
        if (!okAm(v.price) || !(v.prob > 0 && v.prob < 100)) return bad;
        const p = v.prob / 100, full = kelly(p, v.price, 1), frac = full * v.mult, e = ev(p, v.price);
        const stake = Math.max(0, frac * v.bank);
        return `${top('Recommended stake', money(stake), stake > 0 ? 'pos' : 'muted')}
          ${figs([['Fraction of bankroll', pct(Math.max(0, frac), 2)], ['Edge', signed(e, (x) => pct(x, 2)), e >= 0 ? 'pos' : 'neg']])}
          ${ui.slip({ caption: `Your bet · ${v.mult}× Kelly`, tag: 'Kelly',
            legs: [{ title: `Win chance ${v.prob}%`, sub: `bankroll ${money(v.bank, 0)}`, odds: am(v.price), stake: stake > 0 ? money(stake) : '—' }],
            result: stake > 0 ? `Stake ${money(stake)}: ${pct(frac, 2)} of your bankroll` : 'No edge: Kelly says don’t bet',
            math: `Full Kelly is ${pct(full, 2)} of bankroll; × ${v.mult} = ${pct(Math.max(0, frac), 2)}. Edge ${signed(e, (x) => pct(x, 2))} per $1 staked.` })}
          ${breakdown(`<table class="mini"><thead><tr><th>Kelly</th><th class="r">% bankroll</th><th class="r">Stake</th></tr></thead><tbody>
            ${[1, 0.5, 0.25, 0.1].map((m) => `<tr${Math.abs(m - v.mult) < 1e-9 ? ' class="hl"' : ''}><td>${m === 1 ? 'Full' : `${m}x`}</td><td class="r">${pct(Math.max(0, full * m), 2)}</td><td class="r">${money(Math.max(0, full * m * v.bank))}</td></tr>`).join('')}</tbody></table>
            <p class="note">How to read this: Full Kelly is the stake that grows a bankroll fastest if your win chance is exactly right. It swings hard, and win chances are estimates, so most bettors use ½ or ¼ Kelly: a little less growth for much smaller drawdowns.${[1, 0.5, 0.25, 0.1].some((m) => Math.abs(m - v.mult) < 1e-9) ? ' Your multiplier is highlighted.' : ''}</p>
            <dl class="kv"><dt>Break-even probability</dt><dd>${pct(impliedProb(v.price), 2)}</dd><dt>Fair odds at ${v.prob}%</dt><dd>${am(toAmerican(1 / p))}</dd></dl>`)}`;
      },
    },
    parlay: {
      for: `Combine legs into one ${t('parlay', 'parlay')} price. Add or remove legs and see the payout instantly.`,
      inputs: (v) => `${v.legs.map((p, i) => `<div class="pleg full">${n(`leg${i}`, p, `Leg ${i + 1} odds`)}<button type="button" class="icon-btn" data-rm="${i}" aria-label="Remove leg ${i + 1}" ${v.legs.length <= 2 ? 'disabled' : ''}>✕</button></div>`).join('')}
        <div class="full"><button type="button" class="btn sm outline" data-add>+ Add leg</button></div>${n('stake', v.stake, 'Stake', { prefix: '$', step: 5, full: true })}`,
      out(v) {
        if (!v.legs.every(okAm)) return bad;
        const r = parlay(v.legs), ip = v.legs.reduce((a, p) => a * impliedProb(p), 1);
        return `${top('Payout', money(v.stake * r.decimal), 'pos', ui.risk('parlay', { short: true }))}
          ${figs([['Parlay odds', am(r.american)], ['Profit', money(v.stake * (r.decimal - 1)), 'pos']])}
          ${ui.slip({ caption: `Your parlay · ${v.legs.length} legs`, tag: 'Parlay',
            legs: v.legs.map((p, i) => ({ title: `Leg ${i + 1}`, sub: `implied ${pct(impliedProb(p), 1)}`, odds: am(p), stake: i === v.legs.length - 1 ? money(v.stake) : '' })),
            result: `${money(v.stake)} pays ${money(v.stake * r.decimal)} if every leg wins`,
            math: `${v.legs.map((p) => toDecimal(p).toFixed(3)).join(' × ')} = ${r.decimal.toFixed(3)} decimal. Every leg must win.` })}
          ${breakdown(`<dl class="kv"><dt>Decimal odds</dt><dd>${r.decimal.toFixed(3)}</dd><dt>Implied probability</dt><dd>${pct(ip, 2)}</dd><dt>Legs</dt><dd>${v.legs.length}</dd></dl>`)}`;
      },
    },
    hold: {
      for: `How much the book keeps on a market: its ${t('hold', 'hold')}. Lower means better prices for you, and below zero the two sides form an ${t('arb', 'arb')}.`,
      inputs: (v) => `<div class="full">${ui.seg('ways', [[2, '2-way'], [3, '3-way']], v.ways)}</div>${n('o1', v.o1, 'Side 1 odds')}${n('o2', v.o2, 'Side 2 odds')}${v.ways == 3 ? n('o3', v.o3, 'Side 3 odds') : ''}`,
      out(v) {
        const ps = [v.o1, v.o2, ...(v.ways == 3 ? [v.o3] : [])];
        if (!ps.every(okAm)) return bad;
        const imp = ps.map(impliedProb), h = hold(ps), fair = devig(imp);
        return `${top('Book’s margin (negative = arb)', pct(h, 2), h < 0 ? 'pos' : '')}
          ${figs([['Overround', pct(1 + h, 2)], h < 0 ? ['Is it an arb?', 'Yes', 'pos'] : ['Book edge per $100', money(h / (1 + h) * 100)]])}
          ${breakdown(`<table class="mini"><thead><tr><th>Side</th><th class="r">Odds</th><th class="r">Implied</th><th class="r">No-vig</th><th class="r">Fair odds</th></tr></thead><tbody>
            ${ps.map((p, i) => `<tr><td>Side ${i + 1}</td><td class="r">${am(p)}</td><td class="r">${pct(imp[i], 2)}</td><td class="r">${pct(fair[i], 2)}</td><td class="r">${am(toAmerican(1 / fair[i]))}</td></tr>`).join('')}</tbody></table>
            <p class="note">${h < 0 ? `The sides add up to under 100%: bet both in the <a href="#/calculators?tab=arb">Arbitrage calculator</a> for the stakes.` : `The implied chances add up to ${pct(1 + h, 2)}; the extra ${pct(h, 2)} is the book’s cut.`}</p>`)}`;
      },
    },
    convert: {
      for: `Type in any format: ${t('american', 'American')}, ${t('decimal', 'decimal')}, fractional or ${t('implied', 'implied probability')}. The rest update instantly.`,
      inputs: (v) => {
        const d = toDecimal(v.am);
        return `<label class="field"><span>American</span><input class="input" inputmode="decimal" data-cv="am" value="${fmtAmerican(v.am)}"></label>
          <label class="field"><span>Decimal</span><input class="input" inputmode="decimal" data-cv="dec" value="${d.toFixed(3)}"></label>
          <label class="field"><span>Fractional</span><input class="input" data-cv="frac" value="${fracOf(d)}"></label>
          <label class="field"><span>Implied %</span><input class="input" inputmode="decimal" data-cv="imp" value="${(100 / d).toFixed(2)}"></label>`;
      },
      out(v) {
        const d = toDecimal(v.am);
        return `${top('American', am(v.am))}
          ${figs([['Decimal', d.toFixed(3)], ['Fractional', fracOf(d)], ['Implied', pct(1 / d, 2)]])}
          ${breakdown(`<dl class="kv"><dt>Profit on $100</dt><dd>${money(100 * (d - 1))}</dd><dt>Stake to win $100</dt><dd>${money(100 / (d - 1))}</dd></dl>`)}`;
      },
    },
    bonus: {
      for: `Turn a ${t('bonus_bet', 'bonus bet')} into cash: bet the bonus on a longshot and ${t('hedge', 'hedge')} the other side with cash. The share you keep is the ${t('conversion', 'conversion rate')}.`,
      inputs: (v) => `${n('amt', v.amt, 'Bonus bet amount', { prefix: '$', step: 25, full: true })}${n('bp', v.bp, 'Bonus bet odds')}${n('hp', v.hp, 'Hedge odds')}`,
      out(v) {
        if (![v.bp, v.hp].every(okAm) || !(v.amt > 0)) return bad;
        const r = convertBonusBet(v.amt, v.bp, v.hp);
        const win = v.amt * (toDecimal(v.bp) - 1);
        const hedgeWin = r.hedgeStake * (toDecimal(v.hp) - 1);
        return `${top('Cash you keep if both fill', money(r.kept), 'pos', ui.risk('conversion', { short: true }))}
          ${figs([['Conversion rate', pct(r.rate, 1), r.rate >= 0.7 ? 'pos' : ''], ['Hedge stake', money(r.hedgeStake)]])}
          ${ui.slip({ caption: 'Your bets · bonus conversion', tag: 'Bonus bet',
            legs: [{ title: 'Bonus bet (longshot)', sub: 'stake is the bonus, not cash', odds: am(v.bp), stake: money(v.amt) }, { title: 'Hedge with cash', sub: 'the other side, another book', odds: am(v.hp), stake: money(r.hedgeStake) }],
            result: `Keep ${money(r.kept)} (${pct(r.rate, 1)} of the bonus) whichever side wins`,
            math: `Bonus side wins ${money(win)} minus the ${money(r.hedgeStake)} hedge; hedge side wins ${money(hedgeWin)}. A bonus bet’s stake is never returned.` })}
          ${breakdown(`<table class="mini"><thead><tr><th>If this wins</th><th class="r">Bonus bet</th><th class="r">Hedge</th><th class="r">Net</th></tr></thead><tbody>
            <tr><td>Bonus side</td><td class="r pos">+${money(win)}</td><td class="r">−${money(r.hedgeStake)}</td><td class="r"><strong class="pos">+${money(r.kept)}</strong></td></tr>
            <tr><td>Hedge side</td><td class="r">$0.00</td><td class="r pos">+${money(hedgeWin)}</td><td class="r"><strong class="pos">+${money(hedgeWin)}</strong></td></tr></tbody></table>
            <p class="note">Aim for +300 to +500 on the bonus side and the lowest hold you can find on the hedge for 70%+ conversion. Next: clear playthrough with <a href="#/low-holds">Low Holds</a>.</p>`)}`;
      },
    },
    middle: {
      for: `Bet Over the low number and Under the high number at two books. Usually one side wins and you pay a little; if the result lands in between, both win. Learn more: ${t('middle', 'middle')}.`,
      inputs: (v) => `${n('low', v.low, 'Over line', { step: 0.5 })}${n('o', v.o, 'Over odds')}${n('high', v.high, 'Under line', { step: 0.5 })}${n('u', v.u, 'Under odds')}
        ${n('total', v.total, 'Total stake', { prefix: '$', step: 50 })}${n('prob', v.prob, 'Middle hit %', { step: 0.5 })}`,
      out(v) {
        if (![v.o, v.u].every(okAm) || !(v.total > 0)) return bad;
        const m = middleMath([v.o, v.u], v.total, v.prob / 100);
        const side = (1 - v.prob / 100) / 2;
        return `${top('If it misses (likely)', signed(m.worst), m.worst >= 0 ? 'pos' : 'muted', ui.risk('middle', { short: true }))}
          ${figs([['Chance it hits', pct(v.prob / 100, 1)], ['If it hits', signed(m.both), 'pos'], ['Average', signed(m.ev), m.ev >= 0 ? 'pos' : 'muted']])}
          ${ui.slip({ caption: `Your bets · ${Math.max(0, v.high - v.low)}-point window`, tag: 'Middle',
            legs: [{ title: `Over ${v.low}`, sub: 'at one book', odds: am(v.o), stake: money(m.stakes[0]) }, { title: `Under ${v.high}`, sub: 'at another book', odds: am(v.u), stake: money(m.stakes[1]) }],
            result: `${signed(m.both)} if it lands ${v.low}–${v.high} · ${signed(m.worst)} if it misses`,
            math: `Hits about ${pct(v.prob / 100, 1)} of the time, so the average is ${signed(m.ev)} per ${money(v.total, 0)} middle. It can lose.` })}
          ${breakdown(`<table class="mini"><thead><tr><th>Result</th><th class="r">Chance</th><th class="r">Profit</th></tr></thead><tbody>
            <tr><td>Under ${v.low}</td><td class="r">${pct(side, 1)}</td><td class="r ${m.underOnly >= 0 ? 'pos' : 'muted'}">${signed(m.underOnly)}</td></tr>
            <tr class="hl"><td>${v.low} – ${v.high} · both win</td><td class="r">${pct(v.prob / 100, 1)}</td><td class="r pos">${signed(m.both)}</td></tr>
            <tr><td>Over ${v.high}</td><td class="r">${pct(side, 1)}</td><td class="r ${m.overOnly >= 0 ? 'pos' : 'muted'}">${signed(m.overOnly)}</td></tr></tbody></table>
            <dl class="kv"><dt>Over stake</dt><dd>${money(m.stakes[0])}</dd><dt>Under stake</dt><dd>${money(m.stakes[1])}</dd><dt>Width</dt><dd>${Math.max(0, v.high - v.low)} pts</dd></dl>`)}`;
      },
    },
  };

  root.innerHTML = `<div class="bf-calc">
    ${ui.pageHead({ title: 'Calculators', tool: 'calculators', subtitle: 'Every betting calculator in one place. Results update as you type, using your bankroll and Kelly settings.' })}
    <section class="calc-body" aria-labelledby="calc-h"><h2 class="sr-only" id="calc-h">Calculator</h2>
    <div class="tabs calc-tabs" role="tablist" aria-label="Calculators" data-tabs>${TABS.map(([id, label]) =>
      `<button type="button" role="tab" id="ctab-${id}" data-v="${id}" aria-controls="calc-panel" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}">${ui.esc(label)}</button>`).join('')}</div>
    <div class="calc-panel" id="calc-panel" role="tabpanel" aria-labelledby="ctab-${tab}" data-panel></div>
    </section>
  </div>`;
  const panel = root.querySelector('[data-panel]');
  const tabsEl = root.querySelector('[data-tabs]');

  function selectTab(next, { focus = false } = {}) {
    tab = next;
    tabsEl.querySelectorAll('[role=tab]').forEach((b) => { const on = b.dataset.v === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    panel.setAttribute('aria-labelledby', `ctab-${tab}`);
    // Keep the tab in the link; drop the prefill params that belonged to the previous tab.
    ui.setQuery({ tab, a: null, b: null, c: null, stake: null, legs: null });
    paintPanel();
  }
  tabsEl.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b && b.dataset.v !== tab) selectTab(b.dataset.v); });
  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  tabsEl.addEventListener('keydown', (e) => {
    const ids = TABS.map(([id]) => id);
    const i = ids.indexOf(tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    selectTab(ids[(to + ids.length) % ids.length], { focus: true });
  });

  function paintPanel(note = '') {
    const c = C[tab], v = V[tab];
    const [, , liveRoute, liveName] = TABS.find(([id]) => id === tab);
    if (tab === 'kelly') { if (v.bank == null) v.bank = store.get().bankroll; if (v.mult == null) v.mult = store.get().kellyMult; }
    panel.innerHTML = `<div class="calc-form">
        <div><h2 class="calc-for-h">What it’s for</h2><p class="calc-for">${c.for}</p></div>
        ${note ? `<div class="prefill">${note}</div>` : ''}
        <div class="inputs">${c.inputs(v)}</div>
        <div class="calc-acts"><button type="button" class="btn sm outline" data-example>Try an example</button>
          <a class="btn sm ghost" href="#/${liveRoute}">Find live ones in ${ui.esc(liveName)} →</a></div>
      </div>
      <div class="calc-out" data-out>${c.out(v)}</div>`;
    const out = panel.querySelector('[data-out]');
    const repaint = () => { out.innerHTML = c.out(v); };
    panel.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('input', () => {
      const x = parseFloat(inp.value);
      if (Number.isNaN(x)) return;
      const k = inp.dataset.k;
      if (k.startsWith('leg')) v.legs[Number(k.slice(3))] = x; else v[k] = x;
      repaint();
    }));
    ui.onSeg(panel, 'ways', (w) => { v.ways = Number(w); paintPanel(); });
    ui.onSeg(panel, 'method', (m) => { v.method = m; panel.querySelectorAll('[data-seg="method"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === m)); repaint(); });
    panel.querySelector('[data-add]')?.addEventListener('click', () => { v.legs.push(-110); paintPanel(); });
    panel.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { v.legs.splice(Number(b.dataset.rm), 1); paintPanel(); }));
    panel.querySelector('[data-example]').addEventListener('click', () => {
      const ex = EXAMPLES[tab];
      Object.assign(v, JSON.parse(JSON.stringify(ex)));
      paintPanel(ui.status('Example numbers loaded', 'info'));
    });
    // Odds converter: any field drives the others.
    panel.querySelectorAll('[data-cv]').forEach((inp) => inp.addEventListener('input', () => {
      const raw = inp.value.trim();
      let dec = NaN;
      if (inp.dataset.cv === 'am') { const a = parseFloat(raw); if (okAm(a)) dec = toDecimal(a); }
      if (inp.dataset.cv === 'dec') { const d = parseFloat(raw); if (d > 1) dec = d; }
      if (inp.dataset.cv === 'frac') { const [a, b] = raw.split('/').map(Number); if (a > 0 && b > 0) dec = 1 + a / b; }
      if (inp.dataset.cv === 'imp') { const p = parseFloat(raw); if (p > 0 && p < 100) dec = 100 / p; }
      if (!Number.isFinite(dec)) return;
      v.am = toAmerican(dec);
      const set = { am: fmtAmerican(v.am), dec: dec.toFixed(3), frac: fracOf(dec), imp: (100 / dec).toFixed(2) };
      panel.querySelectorAll('[data-cv]').forEach((o) => { if (o !== inp) o.value = set[o.dataset.cv]; });
      repaint();
    }));
  }

  paintPanel(prefilled ? ui.status('Filled in from the link', 'info') : '');
  // +EV sizing reads bankroll and Kelly from Settings / the sizing popover: keep it current.
  const off = store.subscribe(() => { if (tab === 'ev') { const o = panel.querySelector('[data-out]'); if (o) o.innerHTML = C.ev.out(V.ev); } });
  return () => off();
}

/** Copy deep-link params (?a&b&c&stake, legs, or any field key) into the tab's values. Returns true if any applied. */
function applyQuery(tab, params = {}) {
  const v = V[tab], map = QUERY[tab] || {};
  let hit = false;
  const num = (x) => { const f = parseFloat(String(x).replace('−', '-')); return Number.isFinite(f) ? f : null; };
  for (const [k, raw] of Object.entries(params)) {
    if (k === 'tab') continue;
    if (k === 'legs' && tab === 'parlay') {
      const legs = String(raw).split(',').map(num).filter((x) => x !== null);
      if (legs.length >= 2) { v.legs = legs; hit = true; }
      continue;
    }
    const key = map[k] || (k in v ? k : null);
    const x = num(raw);
    if (!key || x === null || Array.isArray(v[key])) continue;
    v[key] = x; hit = true;
    if (key === 'o3' && 'ways' in v) v.ways = 3;
  }
  if (tab === 'parlay' && (params.a || params.b) && !params.legs) {
    const legs = [params.a, params.b].map(num).filter((x) => x !== null);
    if (legs.length) { v.legs = legs.length >= 2 ? legs : [legs[0], ...v.legs.slice(1)]; hit = true; }
  }
  return hit;
}
