// Bet tracker + account health. Any screen can log a bet with api.tracker.add(...) or a linked
// set of legs with api.tracker.addGroup(...).
//
// Bet shape: { id, placedAt, kind, book, sport, market, selection, price, stake, status, pnl, clv,
//              event?, group?, exclusive?, bonus? }
// - `group` links the legs of one play (arb, middle, low hold, promo conversion). The tracker screen
//   shows a group as one row whose P&L is the sum of its legs; for an arb that is the locked profit.
// - `exclusive` marks groups whose legs are opposite sides of one market (arb, low hold, promo
//   conversion): exactly one leg can win, so settling one leg settles the rest.
// - `bonus` marks a bonus-bet leg: the stake is site credit, so a win pays profit only and a loss costs $0.
import { rng, pick, SPORTSBOOKS } from './core.js';
import { toDecimal, arbStakes } from '../lib/odds.js';

const KEY = 'bf-proto-tracker-v3'; // v2: linked leg groups and bonus-bet legs; v3: sport/market/event match each selection
const subs = new Set();

/** P&L of one leg for a settle status, honouring bonus-bet semantics. */
function legPnl(b, status) {
  if (status === 'won') return b.stake * (toDecimal(b.price) - 1);
  if (status === 'lost') return b.bonus ? 0 : -b.stake;
  return 0; // open or push
}

// Sample plays. Each entry fixes the sport, market and event so a selection always matches its
// labels (NBA totals with NBA, "ML" with Moneyline, "-3" with Spread, "Over N Pts" with Player Prop).
// Arb and promo pairs are opposite sides of the same line (exactly one leg can win). Middle pairs sit
// on different numbers, so both legs can win.
const ARB_PLAYS = [
  { sport: 'NFL', market: 'Moneyline', event: 'Packers @ Lions', sel: ['Lions ML', 'Packers ML'] },
  { sport: 'NBA', market: 'Total', event: 'Knicks @ Celtics', sel: ['Over 224.5', 'Under 224.5'] },
  { sport: 'NFL', market: 'Spread', event: 'Bills @ Chiefs', sel: ['Chiefs -2.5', 'Bills +2.5'] },
  { sport: 'MLB', market: 'Moneyline', event: 'Yankees @ Dodgers', sel: ['Dodgers ML', 'Yankees ML'] },
  { sport: 'NHL', market: 'Moneyline', event: 'Panthers @ Rangers', sel: ['Rangers ML', 'Panthers ML'] },
];
const MIDDLE_PLAYS = [
  { sport: 'NBA', market: 'Total', event: 'Knicks @ Celtics', sel: ['Over 224.5', 'Under 227.5'] },
  { sport: 'NFL', market: 'Total', event: 'Bills @ Chiefs', sel: ['Over 44.5', 'Under 46.5'] },
  { sport: 'NFL', market: 'Spread', event: 'Bills @ Chiefs', sel: ['Chiefs -2.5', 'Bills +3.5'] },
  { sport: 'NHL', market: 'Total', event: 'Oilers @ Stars', sel: ['Over 5.5', 'Under 6.5'] },
  { sport: 'NCAAF', market: 'Total', event: 'Alabama @ Georgia', sel: ['Over 52.5', 'Under 55.5'] },
];
const PROMO_PLAYS = [
  { sport: 'NFL', market: 'Moneyline', event: 'Bills @ Chiefs', sel: ['Bills ML', 'Chiefs ML'] },
  { sport: 'NBA', market: 'Moneyline', event: 'Knicks @ Celtics', sel: ['Knicks ML', 'Celtics ML'] },
  { sport: 'NHL', market: 'Moneyline', event: 'Panthers @ Rangers', sel: ['Panthers ML', 'Rangers ML'] },
  { sport: 'NCAAF', market: 'Moneyline', event: 'Michigan @ Ohio State', sel: ['Michigan ML', 'Ohio State ML'] },
];
const SINGLE_PLAYS = [
  { sport: 'NFL', market: 'Spread', event: 'Bills @ Chiefs', sel: 'Chiefs -3' },
  { sport: 'NBA', market: 'Total', event: 'Knicks @ Celtics', sel: 'Over 224.5' },
  { sport: 'NBA', market: 'Player Prop', event: 'Knicks @ Celtics', sel: 'Jaylen Brown Over 24.5 Pts' },
  { sport: 'NFL', market: 'Moneyline', event: 'Packers @ Lions', sel: 'Lions ML' },
  { sport: 'NFL', market: 'Total', event: 'Packers @ Lions', sel: 'Under 45.5' },
  { sport: 'NHL', market: 'Player Prop', event: 'Oilers @ Stars', sel: 'McDavid Over 1.5 Pts' },
  { sport: 'MLB', market: 'Moneyline', event: 'Yankees @ Dodgers', sel: 'Dodgers ML' },
  { sport: 'NCAAF', market: 'Spread', event: 'Alabama @ Georgia', sel: 'Georgia -6.5' },
];

function seed() {
  const r = rng(42);
  const out = [];
  const now = Date.now();
  let n = 0, middles = 0;
  const two = () => { const a = pick(r, SPORTSBOOKS).id; let b = a; while (b === a) b = pick(r, SPORTSBOOKS).id; return [a, b]; };
  const leg = (i, extra) => ({ id: `b${n++}`, placedAt: now - i * 9.3 * 3600e3, clv: 0, status: 'open', pnl: 0, ...extra });
  const settle = (bet, status) => { bet.status = status; bet.pnl = legPnl(bet, status); };
  const labels = ({ sport, market, event }) => ({ sport, market, event });

  for (let i = 0; i < 64; i++) {
    const kind = pick(r, ['arb', 'ev', 'promo', 'sharp', 'signal', 'ai-pick', 'middle', 'prediction']);
    const settled = i > 5;
    const group = `g${i}`;
    if (kind === 'arb') {
      // Opposite sides at two books whose combined implied probability is under 100%.
      const [p1, p2] = pick(r, [[105, -101], [110, -105], [-108, 115], [120, -112], [150, -140], [102, 102]]);
      const total = Math.round((400 + r() * 1100) / 50) * 50;
      const { stakes } = arbStakes([p1, p2], total);
      const [b1, b2] = two();
      const play = pick(r, ARB_PLAYS);
      const winner = r() < 0.5 ? 0 : 1;
      const base = { kind, group, exclusive: true, ...labels(play) };
      [[b1, p1, stakes[0], play.sel[0]], [b2, p2, stakes[1], play.sel[1]]].forEach(([book, price, stake, selection], k) => {
        const bet = leg(i, { ...base, book, price, stake: Math.round(stake * 100) / 100, selection, clv: (r() - 0.3) * 0.02 });
        if (settled) settle(bet, k === winner ? 'won' : 'lost');
        out.push(bet);
      });
    } else if (kind === 'middle') {
      // One side of the low number at one book, the other side of the high number at another
      // (Over 44.5 + Under 46.5, or Chiefs -2.5 + Bills +3.5). Usually one side wins.
      const play = pick(r, MIDDLE_PLAYS);
      const [b1, b2] = two();
      const stake = Math.round((150 + r() * 350) / 5) * 5;
      const roll = r();
      const base = { kind, group, ...labels(play) };
      const o = leg(i, { ...base, book: b1, price: -110, stake, selection: play.sel[0] });
      const u = leg(i, { ...base, book: b2, price: -105, stake, selection: play.sel[1] });
      if (settled) {
        if (++middles % 6 === 2) { settle(o, 'won'); settle(u, 'won'); } // landed in the middle (about 1 in 6, not every week)
        else if (roll < 0.54) { settle(o, 'won'); settle(u, 'lost'); }
        else { settle(o, 'lost'); settle(u, 'won'); }
      }
      out.push(o, u);
    } else if (kind === 'promo') {
      // Bonus bet converted to cash: bonus stake on the plus-price underdog, cash hedge on the favourite elsewhere.
      const amount = pick(r, [50, 100, 200, 250]);
      const [bp, hp] = pick(r, [[250, -260], [300, -320], [200, -210], [400, -450]]);
      const hedge = (amount * (toDecimal(bp) - 1)) / toDecimal(hp);
      const [b1, b2] = two();
      const play = pick(r, PROMO_PLAYS);
      const base = { kind, group, exclusive: true, ...labels(play) };
      const p = leg(i, { ...base, book: b1, price: bp, stake: amount, bonus: true, selection: `${play.sel[0]} (bonus bet)` });
      const h = leg(i, { ...base, book: b2, price: hp, stake: Math.round(hedge * 100) / 100, selection: `${play.sel[1]} (hedge)` });
      if (settled) { const pw = r() < 0.3; settle(p, pw ? 'won' : 'lost'); settle(h, pw ? 'lost' : 'won'); }
      out.push(p, h);
    } else {
      const price = pick(r, [-130, -115, -110, -105, 100, 105, 115, 125, 140, 165, 210]);
      const stake = Math.round((25 + r() * 225) / 5) * 5;
      const win = r() < 0.53;
      const play = pick(r, SINGLE_PLAYS);
      const bet = leg(i, { kind, book: pick(r, SPORTSBOOKS).id, price, stake, clv: (r() - 0.35) * 0.06, ...labels(play), selection: play.sel });
      if (settled) settle(bet, win ? 'won' : 'lost');
      out.push(bet);
    }
  }
  return out;
}

let bets;
try { bets = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { bets = null; }
if (!Array.isArray(bets)) bets = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bets)); } catch { /* ignore */ } subs.forEach((cb) => cb(bets)); };

// Account health per book: open / limited (with max stake) / restricted.
const r = rng(99);
const health = Object.fromEntries(SPORTSBOOKS.map((b) => {
  // Fixed sample mix so Account Health shows every status.
  const status = { fd: 'limited', b365: 'limited', fliff: 'restricted' }[b.id] || 'healthy';
  return [b.id, { status, maxStake: status === 'healthy' ? null : status === 'limited' ? Math.round(20 + r() * 180) : 5, balance: Math.round(r() * 1500), since: status === 'healthy' ? null : Date.now() - r() * 40 * 86400e3 }];
}));

const newBet = (bet, i = 0) => ({ id: `b${Date.now()}${i ? `-${i}` : ''}`, placedAt: Date.now(), status: 'open', pnl: 0, clv: 0, ...bet });

export const tracker = {
  list: () => bets,
  add(bet) {
    bets = [newBet(bet), ...bets];
    save();
  },
  /** Log the legs of one play as a linked group. opts: { exclusive } (true for arbs, low holds, promo conversions). */
  addGroup(legs, { exclusive = false } = {}) {
    const group = `g${Date.now()}`;
    bets = [...legs.map((l, i) => newBet({ ...l, group, exclusive }, i + 1)), ...bets];
    save();
    return group;
  },
  /** Legs that share a group id with this bet (including itself). */
  groupOf(id) {
    const b = bets.find((x) => x.id === id);
    return b?.group ? bets.filter((x) => x.group === b.group) : b ? [b] : [];
  },
  settle(id, status) {
    const target = bets.find((b) => b.id === id);
    if (!target) return;
    const next = new Map([[id, status]]);
    // Opposite sides of one market: one winner means the other legs lost, and in a two-leg group a
    // loser means the other leg won. Keeps an arb group's P&L equal to its locked profit.
    if (target.group && target.exclusive) {
      const others = bets.filter((b) => b.group === target.group && b.id !== id && b.status === 'open');
      if (status === 'won') others.forEach((b) => next.set(b.id, 'lost'));
      else if (status === 'lost' && others.length === 1 && tracker.groupOf(id).length === 2) next.set(others[0].id, 'won');
    }
    bets = bets.map((b) => (next.has(b.id) ? { ...b, status: next.get(b.id), pnl: legPnl(b, next.get(b.id)) } : b));
    save();
  },
  remove(id) { bets = bets.filter((b) => b.id !== id); save(); },
  /** Remove every leg of a group. */
  removeGroup(group) { bets = bets.filter((b) => b.group !== group); save(); },
  subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
  health: () => health,
  setHealth(book, patch) { health[book] = { ...health[book], ...patch }; subs.forEach((cb) => cb(bets)); },
  summary() {
    const settled = bets.filter((b) => b.status !== 'open');
    // Cash at risk only: a bonus-bet stake is site credit, not money staked.
    const staked = settled.reduce((a, b) => a + (b.bonus ? 0 : b.stake), 0);
    const pnl = settled.reduce((a, b) => a + b.pnl, 0);
    const clv = bets.reduce((a, b) => a + (b.clv || 0), 0) / Math.max(1, bets.length);
    return { count: bets.length, open: bets.length - settled.length, staked, pnl, roi: staked ? pnl / staked : 0, clv,
      winRate: settled.length ? settled.filter((b) => b.status === 'won').length / settled.length : 0 };
  },
};
