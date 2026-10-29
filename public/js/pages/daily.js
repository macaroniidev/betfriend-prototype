// Daily Card: today's best moves across every BetFriend tool, for the user's state, books and bankroll.
//
// Layout (ux-review C6, staged):
//   (1) Separate units: "$X hedged today · $Y expected over time · $Z to protect · N moves". Exit alerts are
//       scored as dollars to protect, never mixed into a profit total. No numbered circles.
//   (2) A green hero with Coach Mate and a lime CTA, then lanes by risk as <section class="sec"> with static
//       h2s: Do these first / Hedged profit / Bonuses / Edges / Prediction markets / Manage positions. Every
//       item stays listed exactly once. A sticky chip row filters; rows expand in place ("Details").
//   (3) "Open" deep-links to the item in its tool (#/tool?id=…; promos use ?promo=, markets ?id=).
//   (4) Done / Skip ("Marked done") remembered per viewer in localStorage for today's date, with progress.
//
// Money-action contract (B2): each row has one primary with a static verb + a live amount, a hero figure on
// the right, and labelled ghosts (Open · Done · Skip). Two-sided plays (arbs, middles, promo conversions)
// never get a one-leg Bet: "Bet both" opens the shared slip from ../slips.js so both legs are sized together.
//
// Editor contract: headings are static; every list is [data-bf-list][data-bf-nodata]; static verbs inside
// lists are <span data-bf-text> islands (via ui.betAction / ui.ghost / ui.heroFig).
import { openSlip, openPromoSlip, middleMath } from '../slips.js';

const CSS = `
/* ---------- hero: green band, separate units, Coach Mate, lime CTA ---------- */
.daily .welcome { display:grid; grid-template-columns:minmax(0,1fr) auto 112px; gap:18px 28px; align-items:center; background:var(--hero-g); color:#fff; border-radius:18px; padding:18px 26px; margin-bottom:12px; }
:where(:root[data-theme="dark"]) .daily .welcome { background:var(--deep); }
@media (prefers-color-scheme: dark) { :where(:root:not([data-theme="light"])) .daily .welcome { background:var(--deep); } }
.daily .welcome h1 { color:#fff; font-size:clamp(34px,3.6vw,48px); }
.daily .dh-sub { margin:6px 0 0; color:#fff; max-width:62ch; }
.daily .dh-sub b { color:#fff; }
.daily .dh-cta { display:flex; align-items:center; gap:10px 14px; flex-wrap:wrap; margin-top:14px; }
.daily .dh-prog { display:flex; align-items:center; gap:8px; font-size:var(--t-sm); font-weight:700; color:var(--on-green-soft); }
.daily .dh-bar { width:110px; height:8px; border-radius:4px; background:rgba(255,255,255,.22); overflow:hidden; }
.daily .dh-bar i { display:block; height:100%; background:var(--lime); border-radius:4px; }
.daily .dh-figs { display:grid; grid-template-columns:repeat(2,minmax(120px,auto)); gap:12px 26px; }
.daily .dh-fig { display:flex; flex-direction:column; gap:3px; border-left:4px solid var(--lime); padding-left:10px; }
.daily .dh-fig span { font-size:var(--t-xs); font-weight:700; color:var(--on-green-soft); text-transform:none; }
.daily .dh-fig b { font:900 30px/1 var(--f-head); color:var(--lime); font-variant-numeric:tabular-nums; white-space:nowrap; }
.daily .dh-fig b.w { color:#fff; }
.daily .dh-fig small { font-size:var(--t-xs); color:var(--on-green-soft); } /* 4.8:1 on --hero-g */
.daily .dh-mate { width:112px; height:112px; align-self:end; margin-bottom:-6px; }

/* ---------- sticky filter chips (one row, scrolls sideways on phones) ---------- */
.daily .dchips { position:sticky; top:var(--topbar-h); z-index:var(--z-toolbar); background:var(--bg); display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:6px 0; margin-bottom:2px; }
.daily .dchips .chip { flex:none; white-space:nowrap; }
.daily .dchips .chip b { font-weight:800; }
.daily .dchips .sep { flex:none; width:2px; height:22px; background:var(--line); margin:0 4px; }

/* ---------- lanes and rows: flat, ruled, compact ---------- */
.daily .lane { margin-top:18px; }
.daily .lane:first-of-type { margin-top:4px; }
.daily .lane .sec-head { margin-bottom:2px; }
.daily .lane .sec-head h2 { font-size:var(--t-xl); }
.daily .lane-sum { font-size:var(--t-sm); font-weight:700; color:var(--muted); }
.daily .lane-sum b { color:var(--text); font-variant-numeric:tabular-nums; }
.daily .lane-note { margin:0 0 4px; font-size:var(--t-sm); color:var(--muted); }
.daily .lane h3 { font-size:var(--t-md); margin:12px 0 0; color:var(--muted); }
.daily .dlist { display:flex; flex-direction:column; }
.daily .drow { display:grid; grid-template-columns:minmax(0,1fr) auto auto; grid-template-areas:"main fig acts" "det det det"; gap:2px 18px; align-items:center; padding:9px 4px; border-bottom:1px solid var(--line); }
.daily .drow:last-child { border-bottom:0; }
.daily .drow:hover { background:var(--panel); }
.daily .dr-main { grid-area:main; min-width:0; }
.daily .dr-fig { grid-area:fig; text-align:right; }
.daily .bp { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
.daily .dr-acts { grid-area:acts; }
.daily .dr-det { grid-area:det; }
.daily .dr-meta { display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:var(--t-xs); color:var(--muted); }
.daily .dr-tool { font-weight:700; }
.daily .dr-title { font:700 var(--t-body)/1.3 var(--f-body); margin:3px 0 2px; overflow-wrap:anywhere; }
.daily .dr-sub { display:flex; gap:5px; align-items:center; flex-wrap:wrap; font-size:var(--t-sm); color:var(--muted); }
.daily .dr-fig .hero-fig b { font-size:var(--t-xl); }
.daily .row-acts { gap:2px; }
.daily .dr-more { display:inline-flex; align-items:center; gap:3px; }
.daily .dr-more svg { transition:transform .15s; }
.daily .dr-more[aria-expanded="true"] svg { transform:rotate(180deg); }
.daily .drow[data-state] .dr-title { color:var(--muted); }
.daily .drow[data-state] .hero-fig b { color:var(--muted); }

/* ---------- inline details ---------- */
.daily .dr-det { margin:6px 0 2px; padding:12px 14px; background:var(--panel); border-radius:10px; display:grid; gap:8px; font-size:var(--t-sm); }
.daily .dr-det[hidden] { display:none; }
.daily .dr-det p { margin:0; }
.daily .dr-det .bf2-checks { gap:4px; font-weight:500; }
.daily .dr-det .bf2-checks li::before { margin-top:6px; }
.daily .dr-det .ev-line { margin:0; }
.daily .dr-links { display:flex; gap:4px 14px; flex-wrap:wrap; align-items:center; }
.daily .dr-links .btn.ghost { padding-inline:0; }
.daily .dr-gone { color:var(--muted); }

/* ---------- aside: flat panels on --panel ---------- */
.daily .daily-side { display:grid; gap:14px; }
.daily .daily-side .aside h3 { margin-bottom:8px; }
.daily .daily-side .facts { display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; margin-bottom:12px; overflow:visible; }
.daily .daily-side .facts .stat { border-right:0; margin:0; padding:0; }
.daily .daily-side .facts .stat strong { font-size:var(--t-lg); }
.daily .health-row { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--line-2); }
.daily .health-row:last-of-type { border-bottom:0; }
.daily .health-tip { margin:8px 0 0; font-size:var(--t-sm); color:var(--muted); }
.daily .daily-side p.muted { margin:0 0 10px; }

@media (max-width:1100px) { .daily .daily-side { grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); } }
@media (max-width:860px) {
  .daily .welcome { grid-template-columns:minmax(0,1fr) 64px; padding:18px 16px; gap:12px; }
  .daily .welcome h1 { font-size:34px; }
  .daily .dh-copy { grid-column:1; grid-row:1; }
  .daily .dh-mate { grid-column:2; grid-row:1; width:64px; height:64px; align-self:start; margin:0; }
  .daily .dh-figs { grid-column:1/-1; grid-row:2; gap:10px 16px; }
  .daily .dh-fig b { font-size:24px; }
  .daily .dh-cta-wrap { grid-column:1/-1; grid-row:3; }
  .daily .dh-cta { margin-top:0; }
  .daily .dh-cta .btn { flex:1 1 auto; }
  .daily .dh-sub { font-size:var(--t-sm); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .daily .dchips { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; margin-inline:-16px; padding-inline:16px; }
  .daily .dchips::-webkit-scrollbar { display:none; }
  .daily .lane-note { display:none; }
  .daily .lane .sec-head h2 { font-size:var(--t-lg); }
  .daily .drow { grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"main fig" "acts acts" "det det"; gap:4px 10px; padding:8px 0; }
  .daily .drow:hover { background:none; }
  .daily .dr-fig { align-self:start; }
  .daily .dr-acts .row-acts { justify-content:flex-start; flex-wrap:wrap; }
}
`;

// tool id → [label, route, risk kind]. Labels are the filter chips (kept for parity with the old card).
const TOOLS = {
  arb: ['Arbitrage', 'arbitrage', 'arb'], ev: ['Positive EV', 'positive-ev', 'ev'], middle: ['Middle', 'middles', 'middle'],
  promo: ['Promo', 'promo-converter', 'promo'], boost: ['Profit Boost', 'boosts', 'boost'], sharp: ['Sharp Money', 'sharp-money', 'sharp'],
  signal: ['Pro Bettor', 'bettor-signals', 'pro'], pick: ['AI Pick', 'ai-picks', 'ai'], pm: ['Prediction Market', 'prediction-traders', 'pm'],
  exit: ['Exit Alert', 'exit-alerts', 'pm'],
};
// Lanes in risk order. "first" is filled with the top-scored open moves; every other item sits in its lane.
const LANES = [
  ['first', 'Do these first', ''],
  ['hedged', 'Hedged profit', 'Both sides bet at two books: the profit is locked in if both legs fill at these prices.'],
  ['bonus', 'Bonuses', 'Turn sportsbook promos into cash by betting the other side at a second book.'],
  ['edges', 'Edges', 'Worth more than they cost on average over many bets. Any single bet can lose.'],
  ['pm', 'Prediction markets', 'Contracts picked by the traders and models we follow. They can lose.'],
  ['manage', 'Manage positions', 'Open positions with an exit signal. Act on these before the price moves again.'],
];
const LANE_OF = { arb: 'hedged', promo: 'bonus', ev: 'edges', middle: 'edges', boost: 'edges', sharp: 'edges', signal: 'edges', pick: 'edges', pm: 'pm', exit: 'manage' };
// Value units (never added together): locked-in hedged profit, long-run expected value, dollars to protect.
const UNIT_OF = { arb: 'hedged', promo: 'hedged', exit: 'protect' };
const FIRST_N = 5;
const FIRST_PER_TOOL = 2; // "Do these first" mixes tools: at most two moves from any one tool

const safe = (fn) => { try { const v = fn(); return Array.isArray(v) ? v : []; } catch { return []; } };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Done / Skip marks, per viewer and per day (localStorage, wrapped: it can be missing or throw).
const MARK_KEY = 'bf-daily-marks';
function readMarks() {
  try { const m = JSON.parse(localStorage.getItem(MARK_KEY) || 'null'); return m && m.date === today() ? m.items || {} : {}; } catch { return {}; }
}
function writeMarks(items) {
  try { localStorage.setItem(MARK_KEY, JSON.stringify({ date: today(), items })); } catch { /* private mode: marks last for this visit */ }
}

export default function render(root, ctx) {
  const { api, store, ui, odds, params = {} } = ctx;
  if (!document.getElementById('css-daily')) document.head.insertAdjacentHTML('beforeend', `<style id="css-daily">${CSS}</style>`);
  const view = ui.view('daily');
  const FILTERS = ['all', 'hedged', ...Object.keys(TOOLS)];
  const pick = (v) => (FILTERS.includes(v) ? v : null);
  let filter = pick(params.f) || pick(view.get('f')) || (store.get().riskPreset === 'hedged' ? 'hedged' : 'all');
  let marks = readMarks();
  const open = new Set();        // keys of rows whose details are expanded (survives redraws)
  let byKey = new Map();         // key → item, for the delegated actions
  let pending = false;           // a refresh arrived while the person was pointing at / focused in the lists
  const money = odds.money;
  const signed = (x, d = 2) => `${x >= 0 ? '+' : '−'}${money(Math.abs(x), d)}`;

  // ---------------------------------------------------------------------------------------------------
  // Collect every move. Each item: { key, tool, title, sub, value (in its own unit), fig, note, primary,
  // href, detail(), sport, live, edge, book }. `value` ranks items; units are summed separately.
  // ---------------------------------------------------------------------------------------------------
  function collect() {
    const s = store.get();
    const books = s.books;
    const items = [];
    const kellyStake = (p, price) => Math.max(0, Math.min(s.bankroll * 0.05, s.bankroll * odds.kelly(p, price, s.kellyMult)));
    // Book chip + price never split across lines.
    const bp = (bk, pr, o) => (bk || pr ? `<span class="bp">${bk ? ui.book(bk) : ''} ${pr ? ui.price(pr, o) : ''}</span>` : '');
    const legsLine = (legs) => legs.map((l) => bp(l.book, l.price)).join(' + ');

    for (const a of safe(() => api.arbs({ books })).slice(0, 6)) {
      const prices = a.legs.map((l) => l.price);
      const r = odds.arbStakes(prices, s.arbStake);
      const legs = a.legs.map((l, i) => ({ book: l.book, price: l.price, side: l.outcome, stake: r.stakes[i] }));
      items.push({ key: a.id, tool: 'arb', title: `${ui.esc(a.label)}: ${ui.esc(a.event)}`, sub: legsLine(a.legs), value: r.profit,
        fig: `+${money(r.profit)}`, note: `if ${a.legs.length === 2 ? 'both' : 'all'} fill`, edge: a.edge, live: a.live, sport: a.sport,
        primary: { verb: a.legs.length === 2 ? 'Bet both' : `Bet all ${a.legs.length}`, amount: money(s.arbStake, 0), slip: { opp: a } },
        href: `arbitrage?id=${encodeURIComponent(a.id)}`,
        detail: () => `${ui.slipLegs(legs)}${ui.cashNeeded(legs)}
          <div class="dr-links">${prices.length === 2 ? ui.calcLink({ tab: 'arb', a: prices[0], b: prices[1], stake: s.arbStake }) : ''}</div>` });
    }
    for (const e of safe(() => api.ev({ books, minEdge: 0.02 })).slice(0, 8)) {
      const leg = e.legs[0];
      const stake = kellyStake(e.meta.fairProb, leg.price);
      const ev = stake * e.edge;
      items.push({ key: e.id, tool: 'ev', title: `${ui.esc(leg.outcome)}${e.market === 'Player Prop' ? ` ${ui.esc(e.label)}` : ''}`, sub: `${ui.esc(e.event)} · ${bp(leg.book, leg.price)}`,
        value: ev, fig: signed(ev), note: 'expected', edge: e.edge, live: e.live, sport: e.sport, book: leg.book,
        primary: { verb: 'Bet', amount: money(stake, 0), book: leg.book }, href: `positive-ev?id=${encodeURIComponent(e.id)}`,
        detail: () => `${ui.evLine({ prob: e.meta.fairProb, payout: stake * odds.toDecimal(leg.price), ev })}
          <p>${ui.esc(ui.kellyLabel(s.kellyMult))}: <b data-bf-nodata>${money(stake)}</b> at ${ui.book(leg.book, { full: true })}</p>
          <div class="dr-links">${ui.calcLink({ tab: 'ev', a: leg.price, stake })}</div>` });
    }
    for (const m of safe(() => api.middles({ books })).slice(0, 3)) {
      const prices = m.legs.map((l) => l.price);
      const mm = middleMath(prices, s.arbStake, m.meta.middleProb);
      const legs = m.legs.map((l, i) => ({ book: l.book, price: l.price, side: l.outcome, stake: mm.stakes[i] }));
      items.push({ key: m.id, tool: 'middle', title: `${ui.esc(m.label)} middle ${m.meta.low}–${m.meta.high}`, sub: `${ui.esc(m.event)} · ${legsLine(m.legs)}`,
        value: mm.ev, fig: signed(mm.ev), note: 'average', live: m.live, sport: m.sport,
        primary: { verb: 'Bet both', amount: money(s.arbStake, 0), slip: { opp: m } }, href: `middles?id=${encodeURIComponent(m.id)}`,
        detail: () => `${ui.slipLegs(legs)}${ui.checks([
            `If it misses (likely): <b data-bf-nodata>${signed(mm.worst)}</b> at worst`,
            `Chance it hits: <b data-bf-nodata>${odds.pct(m.meta.middleProb, 1)}</b> (a ${m.meta.width}-pt window)`,
            `If it hits: <b data-bf-nodata>${signed(mm.both)}</b>`])}
          ${ui.cashNeeded(legs)}<div class="dr-links">${ui.calcLink({ tab: 'middle', a: prices[0], b: prices[1], stake: s.arbStake })}</div>` });
    }
    for (const p of safe(() => api.promos.promos?.({ state: s.state })).filter((p) => !p.claimed && books.includes(p.book)).slice(0, 5)) {
      const v = p.estValue || 0;
      items.push({ key: `promo-${p.id}`, tool: 'promo', welcome: !!p.newUserOnly, title: ui.esc(p.title), sub: `${ui.book(p.book)} · ${ui.esc(p.type)}${p.expires ? ` · expires ${ui.when(p.expires)}` : ''}`,
        value: v, fig: money(v, 0), note: 'cash value', primary: { verb: 'Bet both', amount: '', slip: { promo: p } },
        href: `promo-converter?promo=${encodeURIComponent(p.id)}`,
        detail: () => `<p>${ui.esc(p.terms || '')}</p>${ui.checks([
            `Promo amount: <b data-bf-nodata>${money(p.amount || 0, 0)}</b>`,
            `Playthrough: <b data-bf-nodata>${p.playthrough || 1}×</b>${p.minOdds ? ` · min odds <b data-bf-nodata>${ui.price(p.minOdds)}</b>` : ''}`,
            `${p.newUserOnly ? 'New customers only' : 'Existing customers'}`])}
          <div class="dr-links"><a class="btn sm ghost" href="#/low-holds">${ui.icon('lowhold', { size: 14 })}<span data-bf-text>Next: clear playthrough with Low Holds</span></a></div>` });
    }
    for (const b of safe(() => api.promos.boosts?.({ state: s.state })).slice(0, 3)) {
      const stake = b.maxStake || 25;
      const ev = stake * (Number.isFinite(b.ev) ? b.ev : 0);
      items.push({ key: b.id || `boost-${b.book}-${b.selection}`, tool: 'boost', title: ui.esc(b.title || b.selection), sub: `${ui.book(b.book)} ${ui.price(b.originalPrice)} → ${ui.price(b.boostedPrice, { best: true })} · boost ${Math.round((b.boostPct || 0) * 100)}%`,
        value: ev, fig: signed(ev), note: 'expected', sport: b.sport, book: b.book,
        primary: { verb: 'Bet', amount: money(stake, 0), book: b.book }, href: `boosts?id=${encodeURIComponent(b.id || '')}`,
        detail: () => `<p>Max stake <b data-bf-nodata>${money(stake, 0)}</b> at ${ui.book(b.book, { full: true })}${b.fairPrice ? ` · fair price <b data-bf-nodata>${ui.price(b.fairPrice)}</b>` : ''}</p>
          ${b.hedge ? `<p>Or hedge it: ${ui.book(b.hedge.book)} ${ui.price(b.hedge.price)} on ${ui.esc(b.hedge.outcome)} for <b data-bf-nodata>${money(b.hedge.stake)}</b>, about <b data-bf-nodata>${signed(b.hedge.profit)}</b> either way if both fill.</p>` : ''}
          <div class="dr-links">${b.hedge ? ui.calcLink({ tab: 'arb', a: b.boostedPrice, b: b.hedge.price, stake }) : ''}</div>` });
    }
    for (const x of safe(() => api.sharp.spikes?.({})).slice(0, 5)) {
      const stake = x.recommendedStake || s.unit;
      const ev = stake * (x.edge || 0);
      items.push({ key: x.id, tool: 'sharp', title: ui.esc(x.selection), sub: `${ui.book(x.exchange)} ${x.spikeX ? `${Number(x.spikeX).toFixed(1)}× volume` : 'volume spike'} → best ${bp(x.bestBook, x.bestPrice)}`,
        value: ev, fig: signed(ev), note: 'expected', edge: x.edge, sport: x.sport, live: x.live, book: x.bestBook,
        primary: { verb: 'Bet', amount: money(stake, 0), book: x.bestBook }, href: `sharp-money?id=${encodeURIComponent(x.id)}`,
        detail: () => `${ui.evLine({ prob: x.fairProb, payout: x.bestPrice ? stake * odds.toDecimal(x.bestPrice) : NaN, ev })}
          <p>Volume <b data-bf-nodata>${money(x.volume || 0, 0)}</b> in ${x.window || 15} min vs a usual <b data-bf-nodata>${money(x.baseline || 0, 0)}</b>${x.priceBefore ? ` · price moved ${ui.price(x.priceBefore)} → ${ui.price(x.priceNow)}` : ''}</p>
          ${ui.related([['bettor-signals', 'Pro Bettor Signals']])}` });
    }
    const bettors = Object.fromEntries(safe(() => api.bettors.bettors?.()).map((b) => [b.id, b]));
    for (const g of safe(() => api.bettors.signals?.({})).slice(0, 4)) {
      const who = bettors[g.bettorId];
      const stake = (g.stakeUnits || 1) * s.unit;
      const evPct = Number.isFinite(g.fairProb) && g.bestPriceNow ? odds.ev(g.fairProb, g.bestPriceNow) : (g.edge || 0);
      const ev = stake * evPct;
      items.push({ key: g.id, tool: 'signal', title: ui.esc(g.selection), sub: `${ui.esc(who?.handle || 'Pro bettor')}${who?.record ? ` · ${(who.record.roi * 100).toFixed(1)}% ROI` : ''} · now ${bp(g.bestBookNow, g.bestPriceNow)}`,
        value: ev, fig: signed(ev), note: 'expected', sport: g.sport, live: g.live, book: g.bestBookNow,
        primary: { verb: 'Bet', amount: money(stake, 0), book: g.bestBookNow }, href: `bettor-signals?id=${encodeURIComponent(g.id)}`,
        detail: () => `<p>${ui.esc(who?.handle || 'This bettor')} bet <b data-bf-nodata>${g.stakeUnits || 1}u</b> at ${g.bookTaken ? ui.book(g.bookTaken) : ''} ${g.priceTaken ? ui.price(g.priceTaken) : ''}${g.stillGood === false ? ' · the price has moved since' : ''}.</p>
          ${ui.evLine({ prob: g.fairProb, payout: g.bestPriceNow ? stake * odds.toDecimal(g.bestPriceNow) : NaN, ev })}
          ${ui.related([['sharp-money', 'Sharp Money']])}` });
    }
    for (const p of safe(() => api.picks.picks?.({})).filter((p) => /A/.test(p.grade || '')).slice(0, 5)) {
      const stake = (p.stakeUnits || 1) * s.unit;
      const ev = stake * (p.edge || 0);
      items.push({ key: p.id, tool: 'pick', title: ui.esc(p.selection), sub: `Grade ${ui.esc(p.grade)} · model ${odds.pct(p.modelProb || 0)} vs market ${odds.pct(p.marketProb || 0)} · ${bp(p.bestBook, p.bestPrice)}`,
        value: ev, fig: signed(ev), note: 'expected', edge: p.edge, sport: p.sport, book: p.bestBook,
        primary: { verb: 'Bet', amount: money(stake, 0), book: p.bestBook }, href: `ai-picks?id=${encodeURIComponent(p.id)}`,
        detail: () => `${ui.evLine({ prob: p.modelProb, payout: p.bestPrice ? stake * odds.toDecimal(p.bestPrice) : NaN, ev })}
          ${Array.isArray(p.reasons) && p.reasons.length ? ui.checks(p.reasons.slice(0, 3).map(ui.esc)) : ''}
          ${ui.related([['prop-research', 'Prop Research'], ['ai-chat', 'Ask BetFriend AI']])}` });
    }
    const markets = Object.fromEntries(safe(() => api.prediction.markets?.({})).map((m) => [m.id, m]));
    for (const r of safe(() => api.prediction.recommendations?.({})).filter((r) => r.status !== 'closed').slice(0, 4)) {
      const m = markets[r.marketId];
      const stake = r.sizing || s.unit;
      const c = (r.buyPrice || r.currentPrice || 50) / 100;
      const ev = Number.isFinite(r.modelProb) ? stake * (r.modelProb / c - 1) : 0;
      items.push({ key: r.id, tool: 'pm', title: `${ui.esc(r.side)} · ${ui.esc(m?.title || 'Contract')}`, sub: `${m ? ui.book(m.venue) : ''} entry ${ui.fmtCents(r.entryPrice)} · now ${ui.fmtCents(r.currentPrice)} · confidence ${Math.round((r.confidence || 0) * 100)}%`,
        value: ev, fig: signed(ev), note: 'expected', book: m?.venue,
        primary: { verb: `Buy ${r.side}`, amount: money(stake, 0), book: m?.venue }, href: `prediction-traders?id=${encodeURIComponent(r.id)}`,
        detail: () => `<p>${ui.riskWinCents ? ui.esc(ui.riskWinCents(stake, r.buyPrice || r.currentPrice)) : ''}</p>
          ${ui.checks([`Target exit <b data-bf-nodata>${ui.fmtCents(r.targetExit)}</b> · stop <b data-bf-nodata>${ui.fmtCents(r.stopLevel)}</b>`,
            `Model gives this side <b data-bf-nodata>${odds.pct(r.modelProb || 0, 0)}</b>`])}
          <div class="dr-links">${m ? `<a class="btn sm ghost" href="#/pm-markets?id=${encodeURIComponent(m.id)}"><span data-bf-text>View market and order book</span></a>` : ''}</div>` });
    }
    const positions = Object.fromEntries(safe(() => api.prediction.positions?.()).map((p) => [p.id, p]));
    for (const x of safe(() => api.prediction.exitAlerts?.()).filter((x) => !x.dismissed).slice(0, 2)) {
      const pos = positions[x.positionId];
      const title = markets[x.marketId]?.title || x.title || 'position';
      const atStake = pos ? pos.value : 0; // dollars sitting in the position right now
      items.push({ key: x.id, tool: 'exit', title: `${ui.esc(x.action)}: ${ui.esc(title)}`, sub: `${ui.esc(x.reason)} · ${ui.fmtCents(x.entry)} → ${ui.fmtCents(x.now)} · ${x.pnlPct >= 0 ? '+' : ''}${Math.round((x.pnlPct || 0) * 100)}%`,
        value: atStake, fig: atStake ? money(atStake, 0) : `${x.pnlPct >= 0 ? '+' : ''}${Math.round((x.pnlPct || 0) * 100)}%`, note: atStake ? 'to protect' : 'open P&L', tone: '',
        book: x.venue || markets[x.marketId]?.venue, primary: { verb: x.action || 'Sell', amount: '', book: x.venue || markets[x.marketId]?.venue },
        href: `exit-alerts?id=${encodeURIComponent(x.id)}`,
        detail: () => `${pos ? ui.checks([`<b data-bf-nodata>${pos.contracts}</b> ${ui.esc(pos.side)} contracts, cost <b data-bf-nodata>${money(pos.cost, 0)}</b>, worth <b data-bf-nodata>${money(pos.value, 0)}</b> now`,
            `Open P&L <b data-bf-nodata>${signed(pos.pnl, 0)}</b>${pos.trailStop ? ` · trailing stop <b data-bf-nodata>${ui.fmtCents(pos.trailStop)}</b>` : ''}`]) : ''}
          <div class="dr-links"><a class="btn sm ghost" href="#/pm-markets?id=${encodeURIComponent(x.marketId)}"><span data-bf-text>View market and order book</span></a></div>` });
    }

    // Rank by value, with a diversity decay so one tool can't fill the whole top of the card.
    const seen = {};
    return items
      .sort((a, b) => b.value - a.value)
      .map((i) => { const k = (seen[i.tool] = (seen[i.tool] || 0) + 1) - 1; return { ...i, unit: UNIT_OF[i.tool] || 'expected', score: i.value / (1 + 1.5 * k) }; })
      .sort((a, b) => b.score - a.score);
  }

  // ---------------------------------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------------------------------
  const matches = (i) => filter === 'all' || (filter === 'hedged' ? ui.riskOf(TOOLS[i.tool][2]) === 'hedged' : i.tool === filter);

  function rowHtml(i) {
    const [label, route, kind] = TOOLS[i.tool];
    const mark = marks[i.key];
    const locked = ui.isLocked(route);
    const p = i.primary;
    let primary;
    if (locked) primary = `<a class="btn sm outline" href="#/pricing">${ui.icon('lock', { size: 14 })}<span data-bf-text>Unlock</span></a>`;
    else if (p.slip) primary = ui.betAction({ verb: p.verb, amount: p.amount, act: 'slip' });
    else primary = ui.betAction({ verb: p.verb, amount: p.amount, book: p.book });
    const ghosts = `<a class="btn sm ghost" href="#/${i.href || route}"><span data-bf-text>Open</span></a>${mark
      ? ui.ghost('undo', 'Undo')
      : `${ui.ghost('done', 'Done')}${ui.ghost('skip', 'Skip')}`}`;
    const isOpen = open.has(i.key);
    const detId = `dd-${String(i.key).replace(/[^\w-]/g, '_')}`;
    return `<article class="drow" data-key="${ui.esc(i.key)}" data-tool="${i.tool}"${mark ? ` data-state="${mark}"` : ''}>
      <div class="dr-main">
        <div class="dr-meta">${ui.risk(kind, { short: true })}<span class="dr-tool">${ui.esc(label)}</span>${i.sport ? ui.sport(i.sport) : ''}${i.live ? ui.liveDot() : ''}${i.edge !== undefined && i.tool !== 'middle' ? ui.edge(i.edge) : ''}${mark === 'done' ? ui.status('Marked done', 'ok') : mark === 'skip' ? ui.status('Skipped', 'muted') : ''}${locked ? ui.status('Not in your plan', 'muted') : ''}</div>
        <div class="dr-title">${i.title}</div>
        <div class="dr-sub">${i.sub}</div>
      </div>
      <div class="dr-fig">${ui.heroFig(i.fig, i.note, { tone: i.tone ?? (i.value >= 0 ? 'pos' : '') })}</div>
      <div class="dr-acts"><div class="row-acts">${mark ? '' : primary}${ghosts}<button type="button" class="btn sm ghost dr-more" data-act="more" aria-expanded="${isOpen}" aria-controls="${detId}"><span data-bf-text>Details</span>${ui.icon('chevron', { size: 14 })}</button></div></div>
      <div class="dr-det" id="${detId}"${isOpen ? '' : ' hidden'}>${isOpen ? i.detail() : ''}</div>
    </article>`;
  }

  /** Lane sections: "first" takes the top open moves; every other item sits in its own lane (once). */
  function lanesHtml(all) {
    const shown = all.filter(matches);
    const order = (list) => [...list.filter((i) => !marks[i.key]), ...list.filter((i) => marks[i.key])];
    const firstKeys = new Set();
    if (filter === 'all') {
      const per = {};
      for (const i of shown) {
        if (firstKeys.size >= FIRST_N) break;
        if (i.tool === 'exit' || marks[i.key] || (per[i.tool] || 0) >= FIRST_PER_TOOL) continue;
        per[i.tool] = (per[i.tool] || 0) + 1;
        firstKeys.add(i.key);
      }
    }
    const groups = Object.fromEntries(LANES.map(([id]) => [id, []]));
    for (const i of shown) groups[firstKeys.has(i.key) ? 'first' : LANE_OF[i.tool]].push(i);
    const sum = (list, unit) => list.filter((i) => i.unit === unit).reduce((a, i) => a + i.value, 0);
    const laneSum = (id, list) => {
      if (id === 'manage') return `<b data-bf-nodata>${money(sum(list, 'protect'), 0)}</b> to protect`;
      if (id === 'hedged' || id === 'bonus') return `<b data-bf-nodata>${money(sum(list, 'hedged'), 0)}</b> if every leg fills`;
      if (id === 'first') return `<b data-bf-nodata>${list.length}</b> moves`;
      return `<b data-bf-nodata>${signed(sum(list, 'expected'), 0)}</b> expected`;
    };
    const list = (rows) => `<div class="dlist" data-bf-list data-bf-nodata>${rows.map(rowHtml).join('')}</div>`;
    const html = LANES.map(([id, title, note]) => {
      const rows = groups[id];
      if (!rows.length) return '';
      let body;
      if (id === 'bonus' && rows.some((r) => r.welcome) && rows.some((r) => !r.welcome)) {
        body = `<h3>Welcome offers</h3>${list(order(rows.filter((r) => r.welcome)))}<h3>Other promos</h3>${list(order(rows.filter((r) => !r.welcome)))}`;
      } else body = list(id === 'first' ? rows : order(rows));
      return `<section class="sec lane" data-lane="${id}" id="lane-${id}">
        <div class="sec-head"><h2>${title}</h2><span class="lane-sum">${laneSum(id, rows)}</span></div>
        ${note ? `<p class="lane-note">${note}</p>` : ''}${body}</section>`;
    }).join('');
    if (html) return html;
    const label = TOOLS[filter]?.[0];
    return ui.empty({ title: 'Nothing here right now', msg: label ? `No ${ui.esc(label)} moves for your books at the moment. New ones show up as prices move.` : 'No hedged moves for your books at the moment. New ones show up as prices move.',
      actions: [{ label: 'Show all moves', act: 'reset' }, label ? { label: `Open ${label}`, href: `#/${TOOLS[filter][1]}` } : { label: 'Open Arbitrage', href: '#/arbitrage' }, { label: 'Alert me', href: '#/alerts' }] });
  }

  function heroFigs(all) {
    const by = (u) => all.filter((i) => i.unit === u);
    const hedged = by('hedged').reduce((a, i) => a + i.value, 0);
    const expected = by('expected').reduce((a, i) => a + i.value, 0);
    const protect = by('protect');
    const protectSum = protect.reduce((a, i) => a + i.value, 0);
    const done = all.filter((i) => marks[i.key] === 'done').length;
    const fig = (label, value, note, cls = '') => `<div class="dh-fig"><span>${label}</span><b class="${cls}" data-bf-nodata>${value}</b><small data-bf-nodata>${note}</small></div>`;
    // Hidden instead of "$0" when a unit has nothing in it (B8).
    return [
      hedged > 0 ? fig('Hedged today', money(hedged, 0), 'if every leg fills') : '',
      expected ? fig('Expected over time', signed(expected, 0), 'average, can lose') : '',
      protectSum > 0 ? fig('To protect', money(protectSum, 0), `in ${protect.length} position${protect.length === 1 ? '' : 's'}`, 'w') : '',
      fig('Moves today', String(all.length), `${done} marked done`, 'w'),
    ].join('');
  }

  function chipsHtml(all) {
    const counts = all.reduce((a, i) => ((a[i.tool] = (a[i.tool] || 0) + 1), a), {});
    const hedgedN = all.filter((i) => ui.riskOf(TOOLS[i.tool][2]) === 'hedged').length;
    const chip = (f, label, n) => `<button type="button" class="chip${filter === f ? ' on' : ''}" data-f="${f}" aria-pressed="${filter === f}"><span data-bf-text>${label}</span> · <b data-bf-nodata>${n}</b></button>`;
    return `${chip('all', 'All', all.length)}${chip('hedged', 'Hedged only', hedgedN)}<span class="sep" aria-hidden="true"></span>
      ${Object.entries(TOOLS).filter(([k]) => counts[k]).map(([k, [label]]) => chip(k, label, counts[k])).join('')}`;
  }

  function sideHtml() {
    const s = store.get();
    const sum = api.tracker.summary();
    const health = safe(() => Object.entries(api.tracker.health())).filter(([id]) => s.books.includes(id));
    const st = (h) => (h.status === 'healthy' ? ui.status('Healthy', 'ok') : h.status === 'limited' ? ui.status(`Limited · max $${h.maxStake}`, 'warn') : ui.status('Restricted', 'bad'));
    const allAccess = ui.currentPlan() === 'all-access';
    return `<section class="aside">
        <h3>Your betting</h3>
        ${ui.facts([
          { label: 'Profit', value: money(sum.pnl, 0), tone: sum.pnl >= 0 ? 'pos' : 'neg' },
          { label: 'ROI', value: odds.pct(sum.roi), tone: sum.roi >= 0 ? 'pos' : 'neg', term: 'roi' },
          { label: 'Avg CLV', value: odds.pct(sum.clv, 2), tone: sum.clv >= 0 ? 'pos' : 'neg', term: 'clv' },
          { label: 'Open bets', value: String(sum.open) },
        ])}
        <a class="btn sm outline block" href="#/tracker">Open Bet Tracker</a>
      </section>
      <section class="aside health">
        <h3>Account health</h3>
        <div data-bf-nodata>${health.map(([id, h]) => `<div class="health-row">${ui.book(id, { full: true })}${st(h)}</div>`).join('')}</div>
        ${health.some(([, h]) => h.status !== 'healthy') ? '<p class="health-tip">Limited at a book? <a href="#/deposit-optimizer">Spread your action with Deposit Optimizer</a>.</p>' : ''}
      </section>
      <section class="aside">
        <h3>Unlock every tool</h3>
        ${allAccess
          ? '<p class="muted">Your All-Access plan includes every tool on this card.</p><a class="btn sm ghost" href="#/pricing">See plans</a>'
          : '<p class="muted">All-Access includes every tool on this card for one price.</p><a class="btn primary block" href="#/pricing">See plans</a>'}
      </section>`;
  }

  // Static frame (built once): setup card mount, hero, sticky chips, lanes, aside. Live parts are patched.
  const s0 = store.get();
  root.innerHTML = `<div class="daily">
    <div data-setup></div>
    <header class="page-head welcome on-green">
      <div class="dh-copy">
        <h1>Today's Daily Card</h1>
        <p class="dh-sub">Every arb, +EV bet, promo, sharp move, pro signal, AI pick and prediction-market trade, ranked for your books in <b data-bf-nodata data-dh-state>${ui.esc(s0.state)}</b>.</p>
      </div>
      <div class="dh-figs" data-dh-figs></div>
      <img class="dh-mate" src="../img/coach-mate-gameplan.svg" alt="" width="112" height="112">
      <div class="dh-cta-wrap"><div class="dh-cta">
        <button type="button" class="btn lime" data-start><span data-bf-text>Start with the top move</span></button>
        <div class="dh-prog" data-dh-prog></div>
      </div></div>
    </header>
    <nav class="dchips" aria-label="Filter the Daily Card" data-dchips></nav>
    <div class="split">
      <!-- "stack": the editor treats the lanes as a group even when a filter leaves one lane, so a hidden lane stays hidden. -->
      <div class="dlanes stack" data-lanes></div>
      <aside class="daily-side" data-side></aside>
    </div></div>`;
  // The hero CTA sits under the copy on desktop: move it into the copy column there (one DOM, two layouts).
  const heroEl = root.querySelector('.welcome');
  const ctaWrap = root.querySelector('.dh-cta-wrap');
  const mq = matchMedia('(min-width: 861px)');
  const placeCta = () => { if (mq.matches) root.querySelector('.dh-copy').append(ctaWrap); else heroEl.append(ctaWrap); };
  placeCta();
  mq.addEventListener?.('change', placeCta);

  const setup = ui.setupCard(root.querySelector('[data-setup]'));
  const lanesEl = root.querySelector('[data-lanes]');
  const chipsEl = root.querySelector('[data-dchips]');
  let all = [];

  function paint() {
    pending = false;
    all = collect();
    byKey = new Map(all.map((i) => [i.key, i]));
    const s = store.get();
    root.querySelector('[data-dh-state]').textContent = s.state;
    root.querySelector('[data-dh-figs]').innerHTML = heroFigs(all);
    const done = all.filter((i) => marks[i.key]).length;
    root.querySelector('[data-dh-prog]').innerHTML = `<span class="dh-bar" aria-hidden="true"><i style="width:${all.length ? Math.round((done / all.length) * 100) : 0}%"></i></span><span data-bf-nodata>${done} of ${all.length} done or skipped</span>`;
    chipsEl.innerHTML = chipsHtml(all);
    // Keep focus on the same control across the repaint (live refreshes and Done/Skip).
    const f = document.activeElement;
    const fKey = lanesEl.contains(f) ? f.closest('[data-key]')?.dataset.key : null;
    const fAct = fKey ? f.dataset.act || (f.matches('a') ? 'open' : null) : null;
    // The hidden heading is always first, whatever the filter or data: the owner editor names the .split and
    // .dlanes groups after their first heading, so saved layout edits (hidden/moved lanes and side panels) keep
    // the same keys when a visitor switches chips or "Do these first" is empty. data-bf-ignore: not a block.
    lanesEl.innerHTML = `<h2 class="sr-only" data-bf-ignore>Today's moves</h2>${lanesHtml(all)}`;
    if (fKey) {
      const row = lanesEl.querySelector(`[data-key="${CSS_escape(fKey)}"]`);
      const el = row && (row.querySelector(fAct === 'open' ? 'a.ghost' : `[data-act="${fAct}"]`) || row.querySelector('[data-act]'));
      el?.focus({ preventScroll: true });
    }
    root.querySelector('[data-side]').innerHTML = sideHtml();
  }
  const CSS_escape = (v) => (window.CSS?.escape ? window.CSS.escape(v) : String(v).replace(/"/g, '\\"'));

  // Don't reorder rows under the pointer or keyboard focus: hold the refresh until they leave (B4 spirit).
  const busy = () => lanesEl.matches(':hover') || lanesEl.contains(document.activeElement);
  const refresh = () => { if (busy()) { pending = true; return; } paint(); };
  lanesEl.addEventListener('pointerleave', () => { if (pending && !lanesEl.contains(document.activeElement)) paint(); });
  lanesEl.addEventListener('focusout', (e) => { if (pending && !lanesEl.contains(e.relatedTarget) && !lanesEl.matches(':hover')) paint(); });

  const setFilter = (f) => {
    filter = pick(f) || 'all';
    view.set({ f: filter });
    ui.setQuery({ f: filter === 'all' ? null : filter });
    paint();
  };
  const setMark = (key, v) => {
    marks = readMarks();
    if (v) marks[key] = v; else delete marks[key];
    writeMarks(marks);
    paint();
  };

  chipsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) setFilter(b.dataset.f); });
  root.querySelector('[data-start]').addEventListener('click', () => {
    if (filter !== 'all') setFilter('all');
    const row = lanesEl.querySelector('.drow:not([data-state])');
    if (!row) { ui.toast('Everything on today’s card is marked. Nice work.'); return; }
    if (!open.has(row.dataset.key)) { open.add(row.dataset.key); paint(); }
    const r = lanesEl.querySelector(`[data-key="${CSS_escape(row.dataset.key)}"]`);
    r?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    r?.querySelector('.bet-action, [data-act]')?.focus({ preventScroll: true });
  });
  ui.onAction(lanesEl, {
    slip: (key) => {
      const x = byKey.get(key)?.primary?.slip;
      if (x?.promo) openPromoSlip(x.promo, ctx);
      else if (x?.opp) openSlip(x.opp, ctx, { total: store.get().arbStake });
    },
    more: (key, el) => {
      if (open.has(key)) open.delete(key); else open.add(key);
      const row = el.closest('.drow');
      const det = row.querySelector('.dr-det');
      const on = open.has(key);
      det.innerHTML = on ? byKey.get(key)?.detail() || '' : '';
      det.hidden = !on;
      el.setAttribute('aria-expanded', String(on));
    },
    done: (key) => { setMark(key, 'done'); ui.toast('Marked done for today'); },
    skip: (key) => setMark(key, 'skip'),
    undo: (key) => setMark(key, null),
    reset: () => setFilter('all'),
  });

  paint();
  let n = 0;
  const offTick = api.onTick(() => { if (++n % 4 === 0) refresh(); }); // refresh every ~16s
  const offStore = store.subscribe(() => paint());
  return () => { offTick(); offStore(); setup.destroy?.(); mq.removeEventListener?.('change', placeCta); };
}
