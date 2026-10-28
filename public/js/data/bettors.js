// Pro Bettor Signals sample data: verified profitable bettors, their latest bets, and follows.
// Signals are built from core LINES so the same events and current prices appear everywhere.

import { rng, pick, LINES, eventById, SPORTS, onTick } from './core.js';
import { bestPrices, fairProbs } from '../lib/opportunities.js';
import { ev as evFn, toDecimal, impliedProb, probToAmerican } from '../lib/odds.js';

const HANDLES = [
  ['PropProphet', 'Builds NBA player-prop projections from tracking data. Bets early, before books adjust to injury news.'],
  ['ClosingLineCarl', 'Former trading-desk analyst. Beats the close on NFL sides and totals more than anyone we track.'],
  ['IceColdEdges', 'NHL shots and points specialist. Lives on goalie confirmation news.'],
  ['SaturdaySharp', 'College football totals and spreads. Weather and pace models.'],
  ['MarketMaven', 'Multi-sport line shopper. Bets steam on exchanges before books move.'],
  ['TheQuantGuy', 'Simulation-driven NBA sides and totals. High volume, small edges.'],
  ['RedZoneRita', 'NFL receiving props and anytime TDs. Snap-count and target-share models.'],
  ['DimeDropper', 'NBA assists and rebounds props. Rotation and minutes forecasting.'],
  ['PuckLineKing', 'NHL moneylines and puck lines. Backs road dogs at the right number.'],
  ['UnderdogUnion', 'Plus-money specialist across NFL and NCAAF.'],
  ['OverUnderOracle', 'Totals only. Every sport, every night.'],
  ['TouchdownTess', 'NFL anytime-TD and rushing props.'],
  ['HoopsHedge', 'NBA live bettor. Fades bad rotations in real time.'],
  ['BoxScoreBandit', 'Player props across NBA and NFL. Usage-based projections.'],
  ['PitchCountPete', 'MLB sides and totals, bullpen fatigue model.'],
  ['PremierPunter', 'EPL 1X2 and totals. Lineup leaks before kickoff.'],
  ['SteamChaser', 'Reacts to exchange volume within seconds. Pre-game NFL and NBA.'],
  ['FadeThePublic', 'Contrarian sides when the public piles in. NFL and NBA.'],
  ['GridironGrind', 'NFL spreads with a key-number focus.'],
  ['ThreePointTom', 'NBA threes props. Shot-quality model.'],
  ['ColdCallCole', 'NHL totals and shots. Back-to-back fatigue edges.'],
  ['VigKiller', 'Only bets into the lowest-hold market on the board.'],
];
const SPORT_PREF = {
  PropProphet: ['NBA'], ClosingLineCarl: ['NFL'], IceColdEdges: ['NHL'], SaturdaySharp: ['NCAAF'], MarketMaven: ['NFL', 'NBA', 'NHL'],
  TheQuantGuy: ['NBA'], RedZoneRita: ['NFL'], DimeDropper: ['NBA'], PuckLineKing: ['NHL'], UnderdogUnion: ['NFL', 'NCAAF'],
  OverUnderOracle: ['NBA', 'NFL', 'NHL', 'MLB'], TouchdownTess: ['NFL'], HoopsHedge: ['NBA'], BoxScoreBandit: ['NBA', 'NFL'],
  PitchCountPete: ['MLB'], PremierPunter: ['EPL'], SteamChaser: ['NFL', 'NBA'], FadeThePublic: ['NFL', 'NBA'], GridironGrind: ['NFL', 'NCAAF'],
  ThreePointTom: ['NBA'], ColdCallCole: ['NHL'], VigKiller: ['NFL', 'NBA', 'NHL', 'EPL'],
};
const BOOK_IDS = ['dk', 'fd', 'mgm', 'czr', 'espn', 'fan', 'b365', 'br', 'hr', 'novig', 'px'];
const MONTHS = (() => {
  const d = new Date();
  return Array.from({ length: 12 }, (_, k) => {
    const m = new Date(d.getFullYear(), d.getMonth() - 11 + k, 1);
    return m.toLocaleString('en-US', { month: 'short' });
  });
})();

function buildBettors() {
  const r = rng(424242);
  return HANDLES.map(([handle, bio], k) => {
    const sports = SPORT_PREF[handle] || [pick(r, SPORTS)];
    const bets = Math.round(380 + r() * 2600);
    const winRate = 0.515 + r() * 0.07;
    const wins = Math.round(bets * winRate);
    const pushes = Math.round(bets * 0.015);
    const roi = 0.03 + r() ** 1.3 * 0.12;
    const avgStake = pick(r, [250, 500, 750, 1000, 1500, 2500, 5000]);
    const units = Math.round(bets * roi * (0.9 + r() * 0.3) * 10) / 10;
    const monthly = MONTHS.map((month) => ({ month, roi: Math.round((roi + (r() - 0.45) * 0.14) * 1000) / 1000, bets: Math.round(bets / 12 * (0.6 + r() * 0.8)) }));
    const sportBreakdown = sports.map((s, j) => {
      const share = j === 0 ? 0.55 + r() * 0.3 : (1 - 0.7) / Math.max(1, sports.length - 1);
      return { sport: s, bets: Math.round(bets * share), roi: roi + (r() - 0.5) * 0.04, winRate: winRate + (r() - 0.5) * 0.03 };
    });
    const streakN = 1 + Math.floor(r() * 7);
    return {
      id: `bt${k + 1}`, handle, avatarInitials: handle.replace(/[^A-Z]/g, '').slice(0, 2) || handle.slice(0, 2).toUpperCase(),
      hue: Math.floor(r() * 360), specialty: sports, bio,
      record: { bets, wins, losses: bets - wins - pushes, pushes, winRate: wins / (bets - pushes), roi, units, clv: 0.012 + r() * 0.038 },
      streak: r() < 0.68 ? `W${streakN}` : `L${Math.min(3, streakN)}`,
      followers: Math.round(400 + r() ** 2 * 38000),
      avgOdds: pick(r, [-112, -108, -105, 102, 105, 112, 118, 126, 140]),
      avgStake, monthly, sportBreakdown, verified: true,
      since: new Date(Date.now() - (300 + r() * 1400) * 86400e3).getFullYear(),
      markets: pick(r, [['Player Prop'], ['Spread', 'Total'], ['Moneyline', 'Spread'], ['Total'], ['Player Prop', 'Total']]),
    };
  }).sort((a, b) => b.record.units - a.record.units).map((b, i, arr) => ({ ...b, rank: i + 1, tier: i < 3 ? 'Top 0.1%' : i < 8 ? 'Top 1%' : i < 15 ? 'Top 3%' : 'Top 5%', _n: arr.length }));
}

const BETTORS = buildBettors();
const byId = Object.fromEntries(BETTORS.map((b) => [b.id, b]));
const lineById = Object.fromEntries(LINES.map((l) => [l.id, l]));

/** All tracked profitable bettors (sorted by profit units). */
export const bettors = () => BETTORS;
export const bettorById = (id) => byId[id];

// ---------- signals ----------
let sigSeq = 0;
function makeSignal(r, bettor, placedAt) {
  const pool = LINES.filter((l) => bettor.specialty.includes(l.sport) && (bettor.markets.includes(l.market) || r() < 0.25));
  const line = pick(r, pool.length ? pool : LINES.filter((l) => bettor.specialty.includes(l.sport))) || pick(r, LINES);
  const i = line.outcomes.length === 3 ? pick(r, [0, 2]) : (r() < 0.5 ? 0 : 1);
  const books = Object.keys(line.prices).filter((b) => BOOK_IDS.includes(b));
  const bookTaken = pick(r, books);
  // They got in early: their price was typically better than today's best.
  const drift = (r() - 0.25) * 0.035;
  const priceTaken = probToAmerican(Math.min(0.95, Math.max(0.05, impliedProb(line.prices[bookTaken][i]) - drift)));
  return { id: `sg${++sigSeq}`, bettorId: bettor.id, lineId: line.id, eventId: line.eventId, outcomeIndex: i, priceTaken, bookTaken,
    stakeUnits: pick(r, [0.5, 1, 1, 1, 1.5, 2, 2, 3]), placedAt, conviction: r(), edgeBump: 0.006 + r() * 0.022 };
}
function seedSignals() {
  const r = rng(8080);
  const now = Date.now();
  const out = [];
  for (let k = 0; k < 46; k++) {
    const b = BETTORS[Math.floor(r() ** 1.4 * BETTORS.length)];
    out.push(makeSignal(r, b, now - (1 + r() ** 1.5 * 600) * 60e3));
  }
  return out.sort((a, b) => b.placedAt - a.placedAt);
}
const SIGNALS = seedSignals();
const tickR = rng(6060);
onTick((n) => {
  if (n % 4 !== 2) return;
  const b = BETTORS[Math.floor(tickR() ** 1.3 * BETTORS.length)];
  SIGNALS.unshift(makeSignal(tickR, b, Date.now()));
  if (SIGNALS.length > 90) SIGNALS.pop();
});

function deriveSignal(s, books) {
  const line = lineById[s.lineId];
  const b = byId[s.bettorId];
  const i = s.outcomeIndex;
  const best = bestPrices(line, books)[i];
  if (!best) return null;
  const fairProb = Math.min(0.93, fairProbs(line)[i] + s.edgeBump + b.record.clv * 0.25);
  const edge = evFn(fairProb, best.price);
  const confidence = Math.min(0.97, 0.35 + s.conviction * 0.25 + b.record.roi * 2 + b.record.clv * 3 + s.stakeUnits * 0.04);
  const sel = line.player ? `${line.player} ${line.outcomes[i]} ${line.stat}` : line.outcomes[i] + (line.market === 'Moneyline' && line.outcomes[i] !== 'Draw' ? ' ML' : '');
  return {
    id: s.id, bettorId: s.bettorId, eventId: s.eventId, lineId: s.lineId, sport: line.sport, market: line.market,
    selection: sel, outcomeIndex: i, priceTaken: s.priceTaken, bookTaken: s.bookTaken,
    bestPriceNow: best.price, bestBookNow: best.book, stakeUnits: s.stakeUnits, placedAt: s.placedAt,
    confidence, fairProb, edge, live: !!eventById[line.eventId]?.live,
    stillGood: best.price >= s.priceTaken - 8,
  };
}

/** Latest bets from tracked bettors. Filters: { since (ms ts), bettorId, followedOnly, sport, books } */
export function signals(f = {}) {
  const fol = new Set(following());
  return SIGNALS.map((s) => deriveSignal(s, f.books)).filter((s) => s &&
    (!f.since || s.placedAt >= f.since) &&
    (!f.bettorId || s.bettorId === f.bettorId) &&
    (!f.followedOnly || fol.has(s.bettorId)) &&
    (!f.sport || f.sport === 'All' || s.sport === f.sport));
}

// ---------- follows ----------
const FKEY = 'bf-proto-following-v1';
let follows;
try { follows = JSON.parse(localStorage.getItem(FKEY) || 'null'); } catch { follows = null; }
if (!Array.isArray(follows)) follows = [BETTORS[0].id, BETTORS[1].id, BETTORS[3].id];
const fsubs = new Set();
const saveF = () => { try { localStorage.setItem(FKEY, JSON.stringify(follows)); } catch { /* ignore */ } fsubs.forEach((cb) => cb(follows)); };
export const following = () => follows;
export const isFollowing = (id) => follows.includes(id);
export function follow(id) { if (!follows.includes(id)) { follows = [...follows, id]; saveF(); } }
export function unfollow(id) { follows = follows.filter((x) => x !== id); saveF(); }
export function onFollowChange(cb) { fsubs.add(cb); return () => fsubs.delete(cb); }

/** Recent graded bets for a bettor. */
export function history(bettorId) {
  const b = byId[bettorId];
  if (!b) return [];
  const r = rng(Number(bettorId.slice(2)) * 977);
  const pool = LINES.filter((l) => b.specialty.includes(l.sport));
  let t = Date.now();
  return Array.from({ length: 25 }, (_, k) => {
    const line = pick(r, pool.length ? pool : LINES);
    const i = r() < 0.5 ? 0 : Math.min(1, line.outcomes.length - 1);
    const price = pick(r, [-130, -120, -115, -110, -108, -105, 100, 105, 110, 115, 125, 140, 165]);
    const units = pick(r, [0.5, 1, 1, 1.5, 2, 3]);
    const roll = r();
    const result = roll < b.record.winRate + 0.02 ? 'won' : roll < 0.985 ? 'lost' : 'push';
    const pnl = result === 'won' ? units * (toDecimal(price) - 1) : result === 'lost' ? -units : 0;
    return { id: `${bettorId}-h${k}`, date: (t -= (6 + r() * 22) * 3600e3), sport: line.sport, market: line.market,
      selection: line.player ? `${line.player} ${line.outcomes[i]} ${line.stat}` : line.outcomes[i],
      price, book: pick(r, BOOK_IDS), units, result, pnlUnits: Math.round(pnl * 100) / 100, clv: (r() - 0.3) * 0.07 };
  });
}
