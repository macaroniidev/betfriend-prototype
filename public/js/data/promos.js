// Promos, profit boosts and promo conversion maths.
// Sample generators are seeded (rng from ./core.js) so the same state shows the same offers on reload.
// Real feeds replace promos()/boosts() behind adapter.js; keep the shapes.

import { rng, pick, LINES, SPORTSBOOKS, bookById, eventById, STATES } from './core.js';
import { fairProbs } from '../lib/opportunities.js';
import { toDecimal, toAmerican, convertBonusBet, boostHedge, ev as evFn, impliedProb } from '../lib/odds.js';

const DAY = 86400e3;
const HOUR = 3600e3;

export const PROMO_TYPES = [
  ['bonus-bet', 'Bonus bet'], ['deposit-match', 'Deposit match'], ['no-sweat', 'No-sweat'], ['profit-boost', 'Profit boost'],
  ['odds-boost', 'Odds boost'], ['second-chance', 'Second chance'], ['referral', 'Referral'], ['casino-credit', 'Casino credit'],
];
export const typeLabel = (t) => (PROMO_TYPES.find(([v]) => v === t) || [t, t])[1];

/** Conversion-rate benchmarks per promo type (cash kept / promo amount). */
export const BENCHMARKS = {
  'bonus-bet': { good: 0.6, great: 0.66, elite: 0.72, note: 'Bonus bet on a +200 to +400 underdog, hedge the favourite with cash.' },
  'no-sweat': { good: 0.35, great: 0.45, elite: 0.52, note: 'Cash bet on a long shot; the refund is then converted too.' },
  'deposit-match': { good: 0.55, great: 0.65, elite: 0.72, note: 'Issued as bonus bets; rollover cleared on Low Holds.' },
  'profit-boost': { good: 0.15, great: 0.25, elite: 0.35, note: 'Boost a +150 to +300 price, hedge the other side.' },
};

// Which sportsbooks operate in each state (sample footprint).
const NOT_IN = {
  b365: ['CT', 'DC', 'IL', 'MA', 'MD', 'MI', 'NY', 'WY'],
  hr: ['CT', 'DC', 'LA', 'MA', 'MD', 'NY', 'PA', 'WY'],
  fliff: ['AZ', 'CT', 'IA', 'KY', 'LA', 'MA', 'MD', 'MI', 'NJ', 'NY', 'OH', 'PA'],
  br: ['MA', 'NC', 'KS', 'KY', 'TN', 'WY'],
  espn: ['DC'],
  fan: ['DC', 'WY'],
  czr: [],
  mgm: ['DC'],
  dk: [],
  fd: [],
};
export const booksInState = (state) => SPORTSBOOKS.filter((b) => !(NOT_IN[b.id] || []).includes(state)).map((b) => b.id);

// Promo templates: welcome offers (new users) and existing-user promos per book.
// value = expected cash value as a share of `amount` (before state scaling).
const WELCOME = {
  dk: { type: 'bonus-bet', title: 'Bet $5, Get {$} in Bonus Bets — instantly', amount: 200, minOdds: -500, playthrough: 1, terms: 'Place a $5+ first bet at -500 or longer. Receive 8 × $25 bonus bets, win or lose. Bonus bets expire in 7 days; stake not returned.' },
  fd: { type: 'bonus-bet', title: 'Bet $5, Get {$} in Bonus Bets if it wins', amount: 300, minOdds: -500, playthrough: 1, terms: 'First $5+ bet must win. 6 × $50 bonus bets credited on settlement. Expires in 7 days; stake not returned.' },
  mgm: { type: 'no-sweat', title: 'First Bet Offer up to {$} back in Bonus Bets', amount: 1500, minOdds: -400, playthrough: 1, terms: 'If your first wager loses, get the stake back in bonus bets up to {$} (5 × 20% tokens). 7-day expiry.' },
  czr: { type: 'no-sweat', title: 'First Bet on Caesars up to {$}', amount: 1000, minOdds: -1000, playthrough: 1, terms: 'Losing first bet refunded as a single bonus bet up to {$}. Bonus bet expires in 14 days.' },
  espn: { type: 'bonus-bet', title: 'Bet $10, Get {$} in Bonus Bets', amount: 150, minOdds: -500, playthrough: 1, terms: 'First $10+ cash bet at -500 or longer. {$} in bonus bets issued instantly.' },
  fan: { type: 'bonus-bet', title: 'Bet $30, Get {$} in FanCash over 10 days', amount: 300, minOdds: -500, playthrough: 1, terms: 'Place a $30+ bet each day for 10 days and receive a matching $30 bonus bet daily.' },
  br: { type: 'second-chance', title: 'Second-Chance Bet up to {$}', amount: 500, minOdds: -500, playthrough: 1, terms: 'If your first bet loses, get it back as site credit up to {$} with 1× playthrough.' },
  hr: { type: 'no-sweat', title: 'Bet $5, Get $150 or No-Sweat Bet up to {$}', amount: 1000, minOdds: -500, playthrough: 1, terms: 'Choose $150 in bonus bets or a first-bet refund up to {$} in bonus bets.' },
  b365: { type: 'bonus-bet', title: 'Bet $5, Get {$} in Bonus Bets', amount: 200, minOdds: -500, playthrough: 1, terms: 'Place a $5+ qualifying bet; receive {$} in bonus bets, win or lose. 7-day expiry.' },
  fliff: { type: 'deposit-match', title: '100% Deposit Match up to {$} + Fliff Cash', amount: 100, minOdds: -200, playthrough: 1, terms: 'Match credited as Fliff Cash bonus with 1× playthrough on odds of -200 or longer.' },
};
const EXISTING = [
  { type: 'profit-boost', title: '50% Profit Boost — any NFL game line', amount: 25, boostPct: 0.5, minOdds: -200, terms: 'Max wager {$}. Boost applies to winnings. One per account.' },
  { type: 'profit-boost', title: '30% Boost on any NBA bet today', amount: 50, boostPct: 0.3, minOdds: -250, terms: 'Max wager {$} on any NBA pregame bet.' },
  { type: 'profit-boost', title: '100% Profit Boost Token — Sunday Night Football', amount: 10, boostPct: 1, minOdds: -150, terms: 'Max wager {$}. Single bets only.' },
  { type: 'no-sweat', title: 'No-Sweat Same Game Parlay', amount: 25, minOdds: 200, terms: 'If your 3+ leg SGP loses, get your stake back as a bonus bet up to {$}.' },
  { type: 'no-sweat', title: 'No-Sweat Player Prop up to {$} — NBA', amount: 50, minOdds: -200, terms: 'Losing first NBA prop refunded as a bonus bet up to {$}.' },
  { type: 'bonus-bet', title: 'Bet $50 on NHL, get a {$} bonus bet', amount: 10, minOdds: -300, terms: 'Opt in, wager $50+ on NHL today.' },
  { type: 'bonus-bet', title: 'Parlay Insurance: 5+ legs, one loses → bonus bet', amount: 20, minOdds: 300, terms: 'One leg short? Get your stake back up to {$}.' },
  { type: 'deposit-match', title: 'Reload: 20% Deposit Match up to {$}', amount: 100, minOdds: -300, playthrough: 3, terms: 'Deposit $500+, receive 20% as bonus bets. 3× playthrough on bonus funds.' },
  { type: 'odds-boost', title: 'Daily Odds Boost: Mahomes 2+ Pass TDs', amount: 50, boostPct: 0.22, minOdds: null, terms: 'Boosted price shown at the book. Max wager {$}.' },
  { type: 'referral', title: 'Refer a friend: get {$} in bonus bets each', amount: 100, minOdds: null, terms: 'Friend signs up with your code and bets $5+. Up to 10 referrals.' },
  { type: 'casino-credit', title: 'Casino: Play $5, get 500 Bonus Spins', amount: 50, minOdds: null, terms: '500 × $0.10 spins on selected slots. Winnings paid as cash.' },
  { type: 'casino-credit', title: 'Casino lossback up to {$}', amount: 1000, minOdds: null, terms: 'Net losses in the first 24h returned as casino credit, 1× playthrough.' },
];

// Expected cash value per $ of promo amount.
const VALUE = { 'bonus-bet': 0.72, 'no-sweat': 0.44, 'deposit-match': 0.66, 'second-chance': 0.5, referral: 0.72, 'casino-credit': 0.3 };
function estimate(p) {
  if (p.type === 'profit-boost' || p.type === 'odds-boost') return p.amount * (p.boostPct || 0.3) * 1.6 * 0.42;
  if (p.type === 'casino-credit' && p.amount > 200) return p.amount * 0.08 + 25; // lossback: value comes from variance
  return p.amount * (VALUE[p.type] || 0.5);
}

const fill = (s, amt) => s.replaceAll('{$}', `$${amt.toLocaleString('en-US')}`);
const hashStr = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---------- claimed state ----------
const KEY = 'bf-proto-promos-claimed-v1';
let claimedSet;
try { claimedSet = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { claimedSet = new Set(); }
const subs = new Set();
export function claim(id, on = true) {
  if (on) claimedSet.add(id); else claimedSet.delete(id);
  try { localStorage.setItem(KEY, JSON.stringify([...claimedSet])); } catch { /* ignore */ }
  subs.forEach((cb) => cb());
}
export const isClaimed = (id) => claimedSet.has(id);
export function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }

// ---------- promos ----------
const cache = {};
function buildPromos(state) {
  const r = rng(hashStr(`promos-${state}`));
  const now = Date.now();
  const books = booksInState(state);
  const lowCap = ['NY', 'MA', 'CT'].includes(state); // stricter promo markets
  const launch = ['NC', 'KY', 'VT'].includes(state); // newer markets run bigger offers
  const out = [];
  for (const b of books) {
    const w = WELCOME[b];
    if (w) {
      const scale = lowCap ? 0.5 : launch ? 1.5 : 1;
      const amount = Math.round((w.amount * scale) / 25) * 25;
      out.push({ id: `${state}-${b}-welcome`, book: b, states: [state], newUserOnly: true, ...w, amount,
        title: fill(w.title, amount), terms: fill(w.terms, amount),
        expires: now + (7 + Math.floor(r() * 50)) * DAY });
    }
    const n = 2 + Math.floor(r() * 3);
    const pool = [...EXISTING];
    for (let i = 0; i < n; i++) {
      const t = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const amount = Math.max(5, Math.round((t.amount * (0.6 + r() * 0.9)) / 5) * 5);
      out.push({ id: `${state}-${b}-x${i}`, book: b, states: [state], newUserOnly: false, playthrough: 1, ...t, amount,
        title: fill(t.title, amount), terms: fill(t.terms, amount),
        expires: now + (2 + r() * 70) * HOUR });
    }
  }
  for (const p of out) {
    p.estValue = Math.round(estimate(p) * 100) / 100;
  }
  return out;
}

/** Current promos for a US state, ranked by expected cash value. */
export function promos({ state = 'NJ', book, type, newUser } = {}) {
  const list = (cache[state] ||= buildPromos(state));
  return list
    .filter((p) => (!book || p.book === book) && (!type || p.type === type) && (newUser === undefined || p.newUserOnly === newUser))
    .map((p) => ({ ...p, claimed: claimedSet.has(p.id) }))
    .sort((a, b) => b.estValue - a.estValue);
}
export function promoById(id) {
  const state = String(id).split('-')[0];
  if (!STATES.some((s) => s.code === state)) return null;
  return promos({ state }).find((p) => p.id === id) || null;
}
export const totalValue = (list) => list.reduce((a, p) => a + (p.claimed ? 0 : p.estValue), 0);

// ---------- profit boosts ----------
const boostCache = {};
const BOOST_BOOKS = ['dk', 'fd', 'mgm', 'czr', 'espn', 'fan', 'br', 'hr', 'b365', 'fliff'];
function shade(am, r) { const d = toDecimal(am); return toAmerican(1 + (d - 1) * (0.93 + r() * 0.06)); }
function boostedFrom(am, pctBoost) { return toAmerican(1 + (toDecimal(am) - 1) * (1 + pctBoost)); }

function buildBoosts(state) {
  const r = rng(hashStr(`boosts-${state}-${new Date().toDateString()}`));
  const inState = booksInState(state);
  const cand = LINES.filter((l) => !l.live && l.outcomes.length === 2 && ['Moneyline', 'Player Prop', 'Spread', 'Total'].includes(l.market));
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < 18 && guard++ < 400) {
    const line = pick(r, cand);
    if (used.has(line.id)) continue;
    const books = Object.keys(line.prices).filter((b) => bookById[b].type === 'sportsbook' && inState.includes(b) && BOOST_BOOKS.includes(b));
    if (!books.length) continue;
    const book = pick(r, books);
    const side = line.prices[book][0] > line.prices[book][1] ? 0 : 1; // boost the plus-money side
    const orig = shade(line.prices[book][side], r); // books shade the base price before boosting
    if (orig < -160 || orig > 600) continue;
    used.add(line.id);
    const boostPct = pick(r, [0.1, 0.15, 0.2, 0.2, 0.25, 0.25, 0.3, 0.33, 0.5, 0.5, 1]);
    out.push({
      id: `bst-${state}-${line.id}-${book}`, book, eventId: line.eventId, lineId: line.id, side, sport: line.sport, market: line.market,
      selection: `${line.outcomes[side]}${line.market === 'Player Prop' ? ` · ${line.stat}` : line.market === 'Moneyline' ? ' ML' : ''}`,
      title: line.player ? `${line.player} ${line.outcomes[side]} ${line.stat}` : `${line.outcomes[side]}${line.market === 'Moneyline' ? ' to win' : ''}`,
      originalPrice: orig, boostedPrice: boostedFrom(orig, boostPct), boostPct,
      maxStake: boostPct >= 0.5 ? pick(r, [10, 25, 25, 50]) : pick(r, [25, 50, 50, 100, 250]),
      expires: (eventById[line.eventId]?.start) || Date.now() + 6 * HOUR,
    });
  }
  return out;
}

/** Hedge for a boost: best price on the opposite outcome at any other sportsbook/exchange (optionally limited to `books`). */
export function hedgeFor(b, books) {
  const line = LINES.find((l) => l.id === b.lineId);
  if (!line) return null;
  const other = 1 - b.side;
  let best = null;
  for (const [bk, prices] of Object.entries(line.prices)) {
    const type = bookById[bk].type;
    if (bk === b.book || !(type === 'sportsbook' || type === 'exchange')) continue;
    if (books && type === 'sportsbook' && !books.includes(bk)) continue;
    if (!best || prices[other] > best.price) best = { book: bk, price: prices[other], outcome: line.outcomes[other] };
  }
  return best;
}

/** Today's profit / odds boosts with live hedge, fair odds and locked profit. */
export function boosts({ state = 'NJ', books } = {}) {
  const defs = (boostCache[state] ||= buildBoosts(state));
  return defs.map((b) => {
    const line = LINES.find((l) => l.id === b.lineId);
    const fair = line ? fairProbs(line)[b.side] : impliedProb(b.originalPrice);
    const hedge = hedgeFor(b, books);
    const lock = hedge ? boostHedge(b.maxStake, b.boostedPrice, hedge.price) : null;
    return { ...b, fairProb: fair, fairPrice: toAmerican(1 / fair), ev: evFn(fair, b.boostedPrice),
      hedge: hedge && { ...hedge, stake: lock.hedgeStake, profit: lock.profit, roi: lock.profit / (b.maxStake + lock.hedgeStake) } };
  }).sort((a, b) => b.ev - a.ev);
}

// ---------- conversions ----------
/** Normalise any promo type to one of the four conversion strategies. */
export const strategyFor = (type) => ({ 'second-chance': 'no-sweat', referral: 'bonus-bet', 'casino-credit': 'bonus-bet', 'odds-boost': 'profit-boost' }[type] || type);

/**
 * Rank exact two-sided bets that convert a promo to cash.
 * spec: { type, amount, book, boostPct?, playthrough?, refundRate? }  lines: odds lines  opts: { books, limit }
 * Returns [{ lineId, eventId, sport, market, label, promoLeg:{book, outcome, price, stake}, hedgeLeg:{book, outcome, price, stake}, kept, rate, outcomes }]
 */
export function bestConversions(spec, lines = LINES, { books, limit = 12 } = {}) {
  const strat = strategyFor(spec.type);
  const amount = +spec.amount || 0;
  const out = [];
  if (!amount || !spec.book) return out;
  for (const line of lines) {
    if (line.outcomes.length !== 2) continue;
    const pp = line.prices[spec.book];
    if (!pp) continue;
    for (const side of [0, 1]) {
      const promoPrice = pp[side];
      // hedge: best opposite price at a different book among the user's books (exchanges allowed)
      let hedge = null;
      for (const [bk, prices] of Object.entries(line.prices)) {
        const t = bookById[bk].type;
        if (bk === spec.book || !(t === 'sportsbook' || t === 'exchange')) continue;
        if (books && !books.includes(bk) && t === 'sportsbook') continue;
        if (!hedge || prices[1 - side] > hedge.price) hedge = { book: bk, price: prices[1 - side] };
      }
      if (!hedge) continue;
      const d1 = toDecimal(promoPrice), d2 = toDecimal(hedge.price);
      let stake = amount, hedgeStake, kept, ifWin, ifLose;
      if (strat === 'bonus-bet' || strat === 'deposit-match') {
        if (promoPrice < 120) continue;
        const c = convertBonusBet(amount, promoPrice, hedge.price);
        hedgeStake = c.hedgeStake; kept = c.kept;
        if (strat === 'deposit-match') kept -= amount * Math.max(0, (spec.playthrough || 1) - 1) * 0.02; // extra rollover on Low Holds
        ifWin = amount * (d1 - 1) - hedgeStake; ifLose = hedgeStake * (d2 - 1);
      } else if (strat === 'no-sweat') {
        if (promoPrice < 150) continue;
        const refund = amount * (spec.refundRate ?? 0.7); // refund bonus bet converted at ~70%
        hedgeStake = (amount * d1 - refund) / d2;
        kept = amount * (d1 - 1) - hedgeStake;
        ifWin = kept; ifLose = hedgeStake * (d2 - 1) - amount + refund;
      } else if (strat === 'profit-boost') {
        if (promoPrice < -200 || promoPrice > 500) continue;
        const boosted = boostedFrom(promoPrice, spec.boostPct ?? 0.5);
        const h = boostHedge(amount, boosted, hedge.price);
        hedgeStake = h.hedgeStake; kept = h.profit;
        ifWin = kept; ifLose = kept;
        out.push(mkConv(line, side, spec.book, boosted, stake, hedge, hedgeStake, kept, kept / amount, ifWin, ifLose, promoPrice));
        continue;
      } else continue;
      out.push(mkConv(line, side, spec.book, promoPrice, stake, hedge, hedgeStake, kept, kept / amount, ifWin, ifLose));
    }
  }
  return out.sort((a, b) => b.rate - a.rate).slice(0, limit);
}
function mkConv(line, side, book, price, stake, hedge, hedgeStake, kept, rate, ifWin, ifLose, basePrice) {
  return {
    id: `cv-${line.id}-${side}-${book}-${hedge.book}`, lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market, label: line.label, live: line.live,
    promoLeg: { book, outcome: line.outcomes[side], price, basePrice: basePrice ?? price, stake },
    hedgeLeg: { book: hedge.book, outcome: line.outcomes[1 - side], price: hedge.price, stake: hedgeStake },
    kept, rate, ifWin, ifLose,
  };
}

/** Grade a conversion rate against the benchmark for its type. */
export function grade(type, rate) {
  const b = BENCHMARKS[strategyFor(type)] || BENCHMARKS['bonus-bet'];
  return rate >= b.elite ? ['Elite', 'pos'] : rate >= b.great ? ['Great', 'pos'] : rate >= b.good ? ['Good', ''] : ['Below target', 'warn'];
}
