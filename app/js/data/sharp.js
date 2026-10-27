// Sharp Money sample data: volume spikes on the public exchanges (Novig, ProphetX).
// Sportsbooks limit winning bettors, so sharp money shows up as sudden volume on the exchanges,
// where every matched bet is public. We follow whole lines (e.g. "LeBron Over 20.5 Points"),
// then find the best price for the same bet across the user's US sportsbooks and fantasy apps.
//
// Built from core LINES so events, players and prices match every other screen.

import { rng, pick, LINES, eventById, SPORTS, onTick } from './core.js';
import { bestPrices, fairProbs } from '../lib/opportunities.js';
import { impliedProb, devig, ev as evFn, kelly, probToAmerican, toDecimal } from '../lib/odds.js';

const MIN = 60e3;
export const EXCHANGES = ['novig', 'px'];
// Fantasy pick'em apps priced as an effective per-leg American price (5/6-pick flex break-even).
export const DFS_PRICES = { pp: -119, ud: -122 };

const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const round5 = (x) => Math.max(0, Math.round(x / 5) * 5);

let seq = 0;
function makeSpike(r, line, detectedAt) {
  const outcomeIndex = line.outcomes.length === 3 ? pick(r, [0, 2]) : (r() < 0.5 ? 0 : 1);
  const exchange = pick(r, EXCHANGES);
  const window = pick(r, [5, 10, 10, 15, 20, 30]);
  const spikeX = Math.round((2.1 + r() ** 1.6 * 8.4) * 10) / 10;
  const isProp = line.market === 'Player Prop';
  const baseline = Math.round((isProp ? 1800 + r() * 9000 : 5000 + r() * 26000) * (window / 10));
  const volume = Math.round(baseline * spikeX / 100) * 100;
  const moveCents = Math.round(6 + r() * 22); // how far the money moved the exchange price
  // How much information the money carries: bigger & sharper spikes move fair value more.
  const fairBump = 0.008 + Math.min(0.03, spikeX * 0.0028) + r() * 0.012;
  return { id: `sp${++seq}`, lineId: line.id, outcomeIndex, exchange, window, spikeX, baseline, volume, moveCents, fairBump, detectedAt, seed: hashStr(line.id + seq) };
}

function seedSpikes() {
  const r = rng(5150);
  const now = Date.now();
  const pool = LINES.filter((l) => l.market !== 'Total' || r() < 0.6);
  const out = [];
  const used = new Set();
  for (let i = 0; i < 34; i++) {
    let line = pick(r, pool);
    let guard = 0;
    while (used.has(line.id) && guard++ < 20) line = pick(r, pool);
    used.add(line.id);
    // Weight toward props (most of the sharp action on exchanges is player props now).
    if (line.market !== 'Player Prop' && r() < 0.35) {
      const props = pool.filter((l) => l.market === 'Player Prop' && !used.has(l.id));
      if (props.length) { line = pick(r, props); used.add(line.id); }
    }
    out.push(makeSpike(r, line, now - (2 + r() ** 1.4 * 170) * MIN));
  }
  return out.sort((a, b) => b.detectedAt - a.detectedAt);
}

const SPIKES = seedSpikes();

// New spikes arrive while the app is open.
let tickR = rng(9001);
onTick((n) => {
  if (n % 3 !== 1) return;
  const live = LINES.filter((l) => !SPIKES.slice(0, 12).some((s) => s.lineId === l.id));
  const line = tickR() < 0.45 ? pick(tickR, live.filter((l) => l.market === 'Player Prop')) : pick(tickR, live);
  if (!line) return;
  SPIKES.unshift(makeSpike(tickR, line, Date.now()));
  if (SPIKES.length > 80) SPIKES.pop();
});

const lineById = Object.fromEntries(LINES.map((l) => [l.id, l]));

/** Exchange price before the spike: the money shortened the price by `moveCents` cents. */
function priceBeforeFor(s, now) {
  const p = Math.max(0.05, impliedProb(now) - s.moveCents / 1000);
  return probToAmerican(p);
}

function derive(s, { books, includeDfs = true, bankroll = 5000, kellyMult = 0.25 } = {}) {
  const line = lineById[s.lineId];
  const ev = eventById[line.eventId];
  const i = s.outcomeIndex;
  const exPrices = line.prices[s.exchange] || line.prices.novig;
  const priceNow = exPrices[i];
  const priceBefore = priceBeforeFor(s, priceNow);
  const exFair = devig(exPrices.map(impliedProb))[i];
  const fairProb = Math.min(0.93, Math.max(fairProbs(line)[i], exFair) + s.fairBump);

  let best = bestPrices(line, books)[i];
  const isProp = line.market === 'Player Prop';
  if (isProp && includeDfs) {
    for (const [b, p] of Object.entries(DFS_PRICES)) if (!best || p > best.price) best = { book: b, price: p };
  }
  if (!best) return null;
  const edge = evFn(fairProb, best.price);
  const confidence = Math.min(0.97, 0.38 + Math.min(0.3, s.spikeX * 0.035) + Math.min(0.18, s.volume / 900000) + Math.max(0, edge) * 2.2);
  const k = kelly(fairProb, best.price, kellyMult);
  const recommendedStake = Math.min(round5(bankroll * 0.05), round5(bankroll * k * (0.55 + confidence * 0.6)));
  const selection = isProp ? `${line.player} ${line.outcomes[i]} ${line.stat}` : line.outcomes[i] + (line.market === 'Moneyline' && line.outcomes[i] !== 'Draw' ? ' ML' : '');
  return {
    id: s.id, lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market, label: line.label,
    player: line.player || null, stat: line.stat || null, selection, outcome: line.outcomes[i], outcomeIndex: i,
    exchange: s.exchange, window: s.window, volume: s.volume, baseline: s.baseline, spikeX: s.spikeX,
    priceBefore, priceNow, detectedAt: s.detectedAt, live: !!ev.live,
    bestBook: best.book, bestPrice: best.price, fairProb, fairPrice: probToAmerican(fairProb), edge,
    recommendedStake, toWin: recommendedStake * (toDecimal(best.price) - 1), confidence,
  };
}

/**
 * Volume spikes on Novig and ProphetX.
 * Filters: { sport, live, exchange, minSpike, market, includeDfs, books, bankroll, kellyMult, minEdge }
 */
export function spikes(f = {}) {
  return SPIKES.map((s) => derive(s, f)).filter((s) => s &&
    (!f.sport || f.sport === 'All' || s.sport === f.sport) &&
    (f.live === undefined || f.live === null || s.live === f.live) &&
    (!f.exchange || f.exchange === 'all' || s.exchange === f.exchange) &&
    (!f.minSpike || s.spikeX >= f.minSpike) &&
    (!f.market || f.market === 'All' || s.market === f.market) &&
    (f.minEdge === undefined || s.edge >= f.minEdge));
}

export const spikeById = (id, f) => { const s = SPIKES.find((x) => x.id === id); return s ? derive(s, f) : null; };

/** Volume (per 5-minute bucket) and exchange price over the last 2 hours for a spike. */
export function history(spikeId) {
  const s = SPIKES.find((x) => x.id === spikeId);
  if (!s) return { buckets: [], prices: [] };
  const r = rng(s.seed);
  const line = lineById[s.lineId];
  const now = (line.prices[s.exchange] || line.prices.novig)[s.outcomeIndex];
  const before = priceBeforeFor(s, now);
  const n = 24;
  const spikeBuckets = Math.max(1, Math.round(s.window / 5));
  const per = s.baseline / Math.max(1, s.window / 5);
  const buckets = [];
  const prices = [];
  const w = Array.from({ length: spikeBuckets }, () => 0.75 + r() * 0.5);
  const wSum = w.reduce((a, b) => a + b, 0);
  const pBefore = impliedProb(before), pNow = impliedProb(now);
  for (let k = 0; k < n; k++) {
    const t = s.detectedAt - (n - 1 - k) * 5 * MIN;
    const inSpike = k >= n - spikeBuckets;
    const vol = inSpike ? s.volume * (w[k - (n - spikeBuckets)] / wSum) : per * (0.45 + r() * 1.1);
    buckets.push({ t, volume: Math.round(vol), spike: inSpike });
    const frac = inSpike ? (k - (n - spikeBuckets) + 1) / spikeBuckets : 0;
    const p = k === n - 1 ? pNow : k === 0 ? pBefore : pBefore + (pNow - pBefore) * frac + (r() - 0.5) * 0.006;
    prices.push({ t, price: k === n - 1 ? now : k === 0 ? before : probToAmerican(Math.min(0.95, Math.max(0.05, p))), prob: p });
  }
  return { buckets, prices, baselinePerBucket: per };
}

/** Graded record of past sharp signals (last 90 days). */
export function record() {
  const r = rng(31337);
  const bySport = SPORTS.map((sport) => {
    const signals = Math.round(60 + r() * 380);
    const winRate = 0.52 + r() * 0.06;
    const wins = Math.round(signals * winRate);
    const roi = 0.025 + r() * 0.07;
    return { sport, signals, wins, losses: signals - wins, winRate: wins / signals, roi, clv: 0.018 + r() * 0.03, units: Math.round(signals * roi * 10) / 10 };
  });
  const byMarket = ['Player Prop', 'Moneyline', 'Spread', 'Total'].map((market) => {
    const signals = Math.round(120 + r() * 600);
    const roi = 0.02 + r() * 0.075;
    return { market, signals, winRate: 0.52 + r() * 0.06, roi, clv: 0.015 + r() * 0.035 };
  });
  const tot = bySport.reduce((a, s) => ({ signals: a.signals + s.signals, wins: a.wins + s.wins, units: a.units + s.units }), { signals: 0, wins: 0, units: 0 });
  const roi = bySport.reduce((a, s) => a + s.roi * s.signals, 0) / tot.signals;
  const clv = bySport.reduce((a, s) => a + s.clv * s.signals, 0) / tot.signals;
  // Cumulative units over the last 90 days for a chart.
  let u = 0;
  const curve = Array.from({ length: 90 }, () => { u += (r() - 0.43) * 6; return Math.round(u * 10) / 10; });
  const scale = tot.units / (curve[curve.length - 1] || 1);
  const recent = Array.from({ length: 12 }, (_, k) => {
    const line = pick(r, LINES);
    const i = r() < 0.5 ? 0 : Math.min(1, line.outcomes.length - 1);
    const won = r() < 0.56;
    const price = pick(r, [-125, -115, -110, -105, 100, 104, 110, 120, 135]);
    return { id: `g${k}`, sport: line.sport, selection: line.player ? `${line.player} ${line.outcomes[i]} ${line.stat}` : line.outcomes[i], price, result: won ? 'won' : 'lost', clv: (r() - 0.25) * 0.06, gradedAt: Date.now() - (k + 1) * (5 + r() * 9) * 3600e3, spikeX: Math.round((2 + r() * 7) * 10) / 10 };
  });
  return {
    overall: { signals: tot.signals, wins: tot.wins, losses: tot.signals - tot.wins, winRate: tot.wins / tot.signals, roi, clv, units: Math.round(tot.units * 10) / 10 },
    bySport, byMarket, curve: curve.map((c) => Math.round(c * scale * 10) / 10), recent,
  };
}
