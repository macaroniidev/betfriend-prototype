// Bet tracker + account health. Any screen can log a bet with api.tracker.add(...).
import { rng, pick, SPORTSBOOKS } from './core.js';
import { toDecimal } from '../lib/odds.js';

const KEY = 'bf-proto-tracker-v1';
const subs = new Set();

function seed() {
  const r = rng(42);
  const kinds = ['arb', 'ev', 'promo', 'sharp', 'signal', 'ai-pick', 'middle', 'prediction'];
  const markets = ['Moneyline', 'Spread', 'Total', 'Player Prop'];
  const out = [];
  const now = Date.now();
  for (let i = 0; i < 64; i++) {
    const price = pick(r, [-130, -115, -110, -105, 100, 105, 115, 125, 140, 165, 210]);
    const stake = Math.round((25 + r() * 225) / 5) * 5;
    const settled = i > 5;
    const win = r() < 0.53;
    const clv = (r() - 0.35) * 0.06;
    out.push({
      id: `b${i}`, placedAt: now - i * 9.3 * 3600e3, kind: pick(r, kinds), book: pick(r, SPORTSBOOKS).id,
      sport: pick(r, ['NFL', 'NBA', 'NHL', 'NCAAF', 'MLB']), market: pick(r, markets),
      selection: pick(r, ['Chiefs -3', 'Over 224.5', 'Tatum Over 27.5 Pts', 'Lions ML', 'Under 45.5', 'McDavid Over 1.5 Pts', 'Dodgers ML']),
      price, stake, clv, status: settled ? (win ? 'won' : 'lost') : 'open',
      pnl: settled ? (win ? stake * (toDecimal(price) - 1) : -stake) : 0,
    });
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

export const tracker = {
  list: () => bets,
  add(bet) {
    bets = [{ id: `b${Date.now()}`, placedAt: Date.now(), status: 'open', pnl: 0, clv: 0, ...bet }, ...bets];
    save();
  },
  settle(id, status) {
    bets = bets.map((b) => (b.id === id ? { ...b, status, pnl: status === 'won' ? b.stake * (toDecimal(b.price) - 1) : status === 'lost' ? -b.stake : 0 } : b));
    save();
  },
  remove(id) { bets = bets.filter((b) => b.id !== id); save(); },
  subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
  health: () => health,
  setHealth(book, patch) { health[book] = { ...health[book], ...patch }; subs.forEach((cb) => cb(bets)); },
  summary() {
    const settled = bets.filter((b) => b.status !== 'open');
    const staked = settled.reduce((a, b) => a + b.stake, 0);
    const pnl = settled.reduce((a, b) => a + b.pnl, 0);
    const clv = bets.reduce((a, b) => a + (b.clv || 0), 0) / Math.max(1, bets.length);
    return { count: bets.length, open: bets.length - settled.length, staked, pnl, roi: staked ? pnl / staked : 0, clv,
      winRate: settled.length ? settled.filter((b) => b.status === 'won').length / settled.length : 0 };
  },
};
