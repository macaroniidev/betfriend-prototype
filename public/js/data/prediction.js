// Prediction-market sample data: contracts on Kalshi, Polymarket, ProphetX and Novig, the
// algorithmically selected traders, their recommendations, AI picks, user positions and exit alerts.
// Prices tick on core onTick. Real venue feeds replace this module through adapter.js (same shapes).

import { rng, pick, EVENTS, LINES, eventById, onTick } from './core.js';
import { fairProbs } from '../lib/opportunities.js';
import { impliedProb } from '../lib/odds.js';
import { store } from '../store.js';

export const VENUES = ['kalshi', 'poly', 'px', 'novig'];
export const VENUE_NAMES = { kalshi: 'Kalshi', poly: 'Polymarket', px: 'ProphetX', novig: 'Novig' };
export const CATEGORIES = ['Sports', 'Economics', 'Politics', 'Culture'];

const HOUR = 3600e3, DAY = 24 * HOUR;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const gauss = (r) => (r() + r() + r() + r() - 2) * 1.73;
const NICK2 = ['Crimson Tide', 'Golden Knights', 'Maple Leafs', 'Nittany Lions', 'Fighting Irish', 'Golden State Warriors'];
function nick(team) {
  for (const n of NICK2) if (team.endsWith(n)) return n === 'Golden State Warriors' ? 'Warriors' : n;
  if (['Arsenal', 'Liverpool', 'Chelsea'].includes(team)) return team;
  const map = { 'Manchester City': 'Man City', 'Tottenham Hotspur': 'Spurs', 'Newcastle United': 'Newcastle' };
  return map[team] || team.split(' ').slice(-1)[0];
}
const abbr = (s) => s.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- contracts ----------
const R = rng(5150);
const lineById = Object.fromEntries(LINES.map((l) => [l.id, l]));
const MARKETS = [];
const byId = {};
const GROUPS = {};
let seq = 0;

function addGroup(g) {
  const group = { ...g, fair: g.fair, marketIds: [] };
  GROUPS[g.key] = group;
  const now = Date.now();
  for (const venue of g.venues) {
    const mispriced = R() < 0.32;
    let bias = mispriced ? (R() < 0.5 ? -1 : 1) * (0.035 + R() * 0.05) : (R() - 0.5) * 0.024;
    bias += venue === 'poly' ? -0.004 : venue === 'kalshi' ? 0.005 : 0;
    const spread = venue === 'poly' ? 1 : venue === 'kalshi' ? 1 + (R() < 0.35 ? 1 : 0) : 1 + (R() < 0.6 ? 1 : 0) + (R() < 0.15 ? 1 : 0);
    const prefix = { kalshi: 'KX', poly: 'PM', px: 'PX', novig: 'NV' }[venue];
    const m = {
      id: `${venue}-${g.key}`, key: g.key, venue, category: g.category, sport: g.sport || null, kind: g.kind,
      title: g.title, eventId: g.eventId || null, lineId: g.lineId || null, outcomeIdx: g.outcomeIdx ?? 0, live: !!g.live,
      fairProb: g.fair, bias, mid: clamp(g.fair + bias, 0.03, 0.97), spread, closesAt: g.closesAt,
      volume24h: Math.round(g.vol * (0.4 + R() * 1.2) * (venue === 'poly' ? 1.3 : venue === 'kalshi' ? 1.1 : 0.55)),
      openInterest: 0, ticker: `${prefix}${venue === 'kalshi' ? '' : '-'}${g.ticker}`, seed: seq++, createdAt: now - g.age * (0.7 + R() * 0.6),
      yesPrice: 50, noPrice: 50, edge: 0, noEdge: 0, change24h: 0, orderbook: null, history: [],
    };
    m.openInterest = Math.round(m.volume24h * (1.5 + R() * 4));
    reprice(m);
    m.history = genHistory(m);
    const dayAgo = m.history.find((p) => p.t >= now - DAY) || m.history[0];
    m.change24h = Math.round(m.mid * 100 - dayAgo.p);
    m.orderbook = buildBook(m, rng(m.seed * 13 + 1));
    MARKETS.push(m);
    byId[m.id] = m;
    group.marketIds.push(m.id);
  }
}

function reprice(m) {
  m.yesPrice = clamp(Math.round(m.mid * 100 + m.spread / 2), 2, 99);
  m.noPrice = clamp(100 - (m.yesPrice - m.spread), 2, 99);
  m.edge = m.fairProb - m.yesPrice / 100;
  m.noEdge = (1 - m.fairProb) - m.noPrice / 100;
}

function genHistory(m) {
  const r = rng(31337 + m.seed * 7);
  const now = Date.now();
  const ts = [];
  for (let t = m.createdAt; t < now - 7 * DAY; t += 12 * HOUR) ts.push(t);
  for (let t = Math.max(m.createdAt, now - 7 * DAY); t < now - DAY; t += 2 * HOUR) ts.push(t);
  for (let t = Math.max(m.createdAt, now - DAY); t < now - HOUR; t += 15 * 60e3) ts.push(t);
  for (let t = now - HOUR; t <= now; t += 60e3) ts.push(t);
  const volH = m.live ? 2.6 : m.category === 'Sports' ? 0.7 : 0.45;
  const anchor = clamp(m.fairProb * 100 + (r() - 0.5) * 18, 4, 96);
  const out = new Array(ts.length);
  let p = m.mid * 100;
  for (let i = ts.length - 1; i >= 0; i--) {
    out[i] = { t: ts[i], p: Math.round(p * 10) / 10 };
    const dt = i > 0 ? ts[i] - ts[i - 1] : HOUR;
    const pv = Math.max(0.3, 2 * Math.sqrt((p / 100) * (1 - p / 100)));
    p = clamp(p + gauss(r) * Math.sqrt(Math.min(dt, 4 * HOUR) / HOUR) * volH * pv + (anchor - p) * 0.02, 2, 98);
  }
  return out;
}

function buildBook(m, r) {
  const base = clamp(m.volume24h / 300, 150, 30000);
  const bids = [], asks = [];
  for (let i = 0; i < 10; i++) {
    const bp = m.yesPrice - m.spread - i;
    if (bp >= 1) bids.push({ price: bp, size: Math.round(base * (0.35 + r() * 1.3) * (1 + i * 0.22)) });
    const ap = m.yesPrice + i;
    if (ap <= 99) asks.push({ price: ap, size: Math.round(base * (0.35 + r() * 1.3) * (1 + i * 0.22)) });
  }
  return { bids, asks };
}

function sportsbookImplied(line, idx) {
  if (!line) return null;
  let best = null;
  for (const [b, prices] of Object.entries(line.prices)) {
    if (!['dk', 'fd', 'mgm', 'czr', 'espn', 'fan', 'br', 'hr', 'b365', 'fliff'].includes(b)) continue;
    if (!best || prices[idx] > best.american) best = { book: b, american: prices[idx] };
  }
  return best && { ...best, implied: impliedProb(best.american) };
}

// Sports game contracts from the shared events/odds board.
const unit = { NHL: 'goals', EPL: 'goals', MLB: 'runs' };
for (const ev of EVENTS) {
  const lines = LINES.filter((l) => l.eventId === ev.id);
  const ml = lines.find((l) => l.market === 'Moneyline');
  const usSport = ev.sport !== 'EPL';
  const closes = ev.start + 3 * HOUR;
  const base = { category: 'Sports', sport: ev.sport, eventId: ev.id, live: ev.live, closesAt: closes, age: 9 * DAY };
  const tk = `${ev.sport}GAME-${abbr(nick(ev.away))}${abbr(nick(ev.home))}`;
  if (ml) {
    addGroup({ ...base, key: `ml-${ev.id}`, kind: 'Game winner', lineId: ml.id, outcomeIdx: 0, fair: fairProbs(ml)[0],
      title: `${nick(ev.home)} beat ${ev.sport === 'EPL' ? '' : 'the '}${nick(ev.away)}`.replace('beat  ', 'beat '),
      venues: usSport ? VENUES : ['kalshi', 'poly'], ticker: tk, vol: ev.sport === 'NFL' ? 520000 : ev.sport === 'NBA' ? 260000 : 120000 });
  }
  const tot = lines.find((l) => l.market === 'Total');
  if (tot && R() < 0.65) {
    addGroup({ ...base, key: `tot-${tot.id}`, kind: 'Total', lineId: tot.id, outcomeIdx: 0, fair: fairProbs(tot)[0],
      title: `${nick(ev.away)}–${nick(ev.home)} over ${tot.point} ${unit[ev.sport] || 'points'}`,
      venues: ['kalshi', 'px', 'novig', ...(R() < 0.5 ? ['poly'] : [])], ticker: `${tk}-T${tot.point}`, vol: 90000 });
  }
  const prop = lines.find((l) => l.market === 'Player Prop');
  if (prop) {
    const t = prop.stat === 'Anytime TD' ? `${prop.player} anytime TD` : `${prop.player} over ${prop.point} ${prop.stat.toLowerCase()}`;
    addGroup({ ...base, key: `prop-${prop.id}`, kind: 'Player prop', lineId: prop.id, outcomeIdx: 0, fair: fairProbs(prop)[0],
      title: t, venues: ['kalshi', 'px', 'novig'], ticker: `${tk}-${abbr(prop.player)}`, vol: 45000 });
  }
}

const D = (s) => new Date(s).getTime();
const FUTURES = [
  ['NFL', 'Chiefs win Super Bowl LXI', 0.14, '2027-02-07T23:30:00Z', 'SB-KC'], ['NFL', 'Eagles win Super Bowl LXI', 0.13, '2027-02-07T23:30:00Z', 'SB-PHI'],
  ['NFL', 'Bills win Super Bowl LXI', 0.11, '2027-02-07T23:30:00Z', 'SB-BUF'], ['NFL', 'Lions win Super Bowl LXI', 0.1, '2027-02-07T23:30:00Z', 'SB-DET'],
  ['NFL', 'Josh Allen wins 2026 NFL MVP', 0.18, '2027-02-04T02:00:00Z', 'MVP-JA'], ['NFL', 'Patrick Mahomes wins 2026 NFL MVP', 0.15, '2027-02-04T02:00:00Z', 'MVP-PM'],
  ['NBA', 'Thunder win the 2027 NBA Finals', 0.24, '2027-06-20T00:00:00Z', 'NBA-OKC'], ['NBA', 'Celtics win the 2027 NBA Finals', 0.12, '2027-06-20T00:00:00Z', 'NBA-BOS'],
  ['NBA', 'Knicks win the 2027 NBA Finals', 0.1, '2027-06-20T00:00:00Z', 'NBA-NYK'], ['NHL', 'Oilers win the 2027 Stanley Cup', 0.12, '2027-06-18T00:00:00Z', 'NHL-EDM'],
  ['NHL', 'Panthers win the 2027 Stanley Cup', 0.11, '2027-06-18T00:00:00Z', 'NHL-FLA'], ['MLB', 'Dodgers win the 2026 World Series', 0.58, '2026-11-02T04:00:00Z', 'WS-LAD'],
  ['NCAAF', 'Ohio State win the CFP national title', 0.19, '2027-01-19T01:00:00Z', 'CFP-OSU'], ['NCAAF', 'Texas win the CFP national title', 0.17, '2027-01-19T01:00:00Z', 'CFP-TEX'],
  ['NCAAF', 'Georgia win the CFP national title', 0.15, '2027-01-19T01:00:00Z', 'CFP-UGA'],
];
for (const [sport, title, fair, close, tk] of FUTURES) {
  addGroup({ key: `fut-${slug(tk)}`, kind: 'Futures', category: 'Sports', sport, title, fair, closesAt: D(close), age: 120 * DAY,
    venues: VENUES.filter(() => R() < 0.85).concat(['kalshi']).filter((v, i, a) => a.indexOf(v) === i), ticker: tk, vol: 1800000 });
}
const OTHER = [
  ['Economics', 'Fed cuts rates at the December 2026 meeting', 0.62, '2026-12-09T19:00:00Z', 'FED-26DEC-CUT', 4200000],
  ['Economics', 'October CPI (YoY) prints above 2.8%', 0.44, '2026-11-12T13:30:00Z', 'CPI-26OCT-2.8', 1300000],
  ['Economics', 'Unemployment rate 4.5% or higher in November jobs report', 0.31, '2026-12-04T13:30:00Z', 'U3-26NOV-4.5', 650000],
  ['Economics', 'S&P 500 closes 2026 above 7,000', 0.57, '2026-12-31T21:00:00Z', 'SPX-26-7000', 2100000],
  ['Economics', 'US recession declared in 2026', 0.08, '2026-12-31T23:59:00Z', 'REC-26', 900000],
  ['Politics', 'Democrats win the House in the 2026 midterms', 0.71, '2026-11-04T12:00:00Z', 'HOUSE-26-D', 28000000],
  ['Politics', 'Republicans keep Senate control in 2026', 0.68, '2026-11-04T12:00:00Z', 'SENATE-26-R', 21000000],
  ['Politics', 'Democrats win 230+ House seats', 0.34, '2026-11-06T12:00:00Z', 'HOUSE-26-D230', 3400000],
  ['Politics', 'Democrats win the North Carolina Senate race', 0.57, '2026-11-04T12:00:00Z', 'SEN-NC-D', 5200000],
  ['Politics', 'Democrats win the Maine Senate race', 0.55, '2026-11-04T12:00:00Z', 'SEN-ME-D', 4100000],
  ['Culture', 'Avengers: Doomsday opens above $250M domestic', 0.41, '2026-12-21T18:00:00Z', 'BO-AVDD-250', 700000],
  ['Culture', 'GTA VI wins Game of the Year at The Game Awards', 0.52, '2026-12-11T04:00:00Z', 'TGA-GOTY-GTA6', 1100000],
  ['Culture', 'Taylor Swift is Spotify Wrapped 2026 top global artist', 0.37, '2026-12-03T14:00:00Z', 'SPOT-26-TS', 800000],
  ['Culture', 'Time Person of the Year 2026 is a tech executive', 0.29, '2026-12-08T13:00:00Z', 'TIME-POY-TECH', 450000],
];
for (const [category, title, fair, close, tk, vol] of OTHER) {
  addGroup({ key: `x-${slug(tk)}`, kind: category, category, title, fair, closesAt: D(close), age: 70 * DAY, venues: ['kalshi', 'poly'], ticker: tk, vol });
}

// ---------- public market API ----------
export function markets({ venue, category, sport, q } = {}) {
  const s = (q || '').toLowerCase();
  return MARKETS.filter((m) => (!venue || venue === 'All' || m.venue === venue)
    && (!category || category === 'All' || m.category === category)
    && (!sport || sport === 'All' || m.sport === sport)
    && (!s || m.title.toLowerCase().includes(s) || m.ticker.toLowerCase().includes(s)));
}
export const market = (id) => byId[id];
export const orderbook = (id) => byId[id]?.orderbook;
export function history(id, range = 'All') {
  const m = byId[id];
  if (!m) return [];
  const since = { '1H': HOUR, '1D': DAY, '1W': 7 * DAY }[range];
  return since ? m.history.filter((p) => p.t >= Date.now() - since) : m.history;
}
/** Cross-venue comparison for the same outcome, plus the sportsbook implied price. */
export function compare(keyOrMarketId) {
  const key = byId[keyOrMarketId]?.key || keyOrMarketId;
  const g = GROUPS[key];
  if (!g) return null;
  const rows = g.marketIds.map((id) => byId[id]).map((m) => ({ venue: m.venue, marketId: m.id, yes: m.yesPrice, no: m.noPrice, volume24h: m.volume24h }));
  const cheapestYes = rows.reduce((a, b) => (b.yes < a.yes ? b : a));
  const cheapestNo = rows.reduce((a, b) => (b.no < a.no ? b : a));
  const sb = g.lineId ? sportsbookImplied(lineById[g.lineId], g.outcomeIdx) : null;
  return { key, title: g.title, category: g.category, sport: g.sport, fairProb: g.fair, rows, cheapestYes, cheapestNo, sportsbook: sb };
}
export function deepLink(marketId, side = 'YES') {
  const m = byId[marketId];
  if (!m) return null;
  const s = slug(m.title);
  const url = {
    kalshi: `https://kalshi.com/markets/${m.ticker.toLowerCase()}`,
    poly: `https://polymarket.com/event/${s}`,
    px: `https://www.prophetx.co/event/${s}`,
    novig: `https://app.novig.us/market/${s}`,
  }[m.venue];
  const price = side === 'YES' ? m.yesPrice : m.noPrice;
  return { venue: m.venue, name: VENUE_NAMES[m.venue], url, ticker: m.ticker, side, price, label: `Open in ${VENUE_NAMES[m.venue]}` };
}

// ---------- traders ----------
const HANDLES = [
  ['gridiron_quant', ['kalshi', 'px'], ['NFL', 'NCAAF']], ['fed_whisperer', ['kalshi', 'poly'], ['Economics']],
  ['hoopstheory', ['novig', 'kalshi'], ['NBA']], ['swingstate_sam', ['poly', 'kalshi'], ['Politics']],
  ['closingline_kid', ['px', 'novig'], ['NFL', 'NBA', 'NHL']], ['bayes_or_bust', ['poly'], ['Politics', 'Culture']],
  ['puckluck', ['novig', 'px'], ['NHL']], ['tape_reader', ['kalshi', 'poly', 'px'], ['NFL', 'Futures']],
  ['nightowl_mm', ['kalshi', 'novig'], ['NBA', 'NHL', 'Live']], ['fadethepublic', ['px', 'kalshi'], ['NFL', 'NCAAF', 'Live']],
  ['kelly_criterion', ['poly', 'kalshi'], ['Economics', 'Futures']], ['boxoffice_bri', ['kalshi', 'poly'], ['Culture']],
];
const TR = rng(808);
const TRADERS = HANDLES.map(([handle, venues, specialties], i) => {
  const roi = 0.05 + TR() * 0.32;
  const trades = Math.round(180 + TR() * 2400);
  const winRate = 0.52 + TR() * 0.15;
  const clv = 0.01 + TR() * 0.045;
  const consistency = 0.55 + TR() * 0.43;
  const recency = 0.5 + TR() * 0.5;
  const parts = {
    roi: Math.min(1, roi / 0.3), consistency, clv: Math.min(1, clv / 0.05), sample: Math.min(1, Math.log10(trades) / 3.4), recency,
  };
  const score = Math.round(100 * (0.3 * parts.roi + 0.2 * parts.consistency + 0.2 * parts.clv + 0.15 * parts.sample + 0.15 * parts.recency));
  const turnover = 40000 + TR() * 900000;
  const pnl = Math.round(turnover * roi);
  const series = [];
  let v = 0;
  for (let d = 0; d < 90; d++) { v += (pnl / 90) * (1 + gauss(TR) * 2.2); series.push(Math.round(v)); }
  const scale = pnl / (series[89] || 1);
  return {
    id: `t${i + 1}`, handle, venues, venue: venues[0], specialties, score, scoreParts: parts, pnl, roi, winRate, trades, clv,
    avgHold: pick(TR, ['38m', '2.4h', '6h', '1.2d', '3.5d', '9d']), sharpe: Math.round((1.1 + TR() * 2.2) * 100) / 100,
    followers: Math.round(300 + TR() * 18000), series: series.map((x) => Math.round(x * scale)), maxDrawdown: -(0.06 + TR() * 0.18),
    activeSince: Date.now() - (200 + TR() * 900) * DAY,
  };
}).sort((a, b) => b.score - a.score);
TRADERS.forEach((t, i) => { t.rank = i + 1; });
const traderById = Object.fromEntries(TRADERS.map((t) => [t.id, t]));

export const SELECTION_WEIGHTS = [
  ['roi', 'Risk-adjusted ROI', 0.3], ['consistency', 'Consistency (monthly win streaks)', 0.2],
  ['clv', 'Beats the closing price', 0.2], ['sample', 'Sample size', 0.15], ['recency', 'Recent form (30d)', 0.15],
];
export const traders = () => TRADERS;
export const trader = (id) => traderById[id];

const FKEY = 'bf-pm-follow-v1';
let followSet;
try { followSet = new Set(JSON.parse(localStorage.getItem(FKEY) || 'null') || ['t1', 't3']); } catch { followSet = new Set(); }
if (!followSet.size) followSet = new Set([TRADERS[0].id, TRADERS[2].id]);
export const following = () => [...followSet];
export function toggleFollow(id) {
  if (followSet.has(id)) followSet.delete(id); else followSet.add(id);
  try { localStorage.setItem(FKEY, JSON.stringify([...followSet])); } catch { /* ignore */ }
  return followSet.has(id);
}

const sidePrice = (m, side) => (side === 'YES' ? m.yesPrice : m.noPrice);
const sideMark = (m, side) => (side === 'YES' ? Math.round(m.mid * 100) : 100 - Math.round(m.mid * 100));
const sideFair = (m, side) => (side === 'YES' ? m.fairProb : 1 - m.fairProb);

const tradeCache = {};
export function traderTrades(id) {
  if (tradeCache[id]) return tradeCache[id];
  const t = traderById[id];
  const r = rng(id.length * 977 + parseInt(id.slice(1), 10) * 31);
  const pool = MARKETS.filter((m) => t.venues.includes(m.venue));
  const out = [];
  for (let i = 0; i < 10; i++) {
    const m = pick(r, pool);
    const side = r() < 0.7 ? 'YES' : 'NO';
    const entry = clamp(Math.round(sidePrice(m, side) - 4 - r() * 14), 3, 95);
    const win = r() < t.winRate;
    const exit = clamp(win ? entry + Math.round(4 + r() * 22) : entry - Math.round(3 + r() * 12), 1, 99);
    const size = Math.round(200 + r() * 4000);
    out.push({ marketId: m.id, title: m.title, venue: m.venue, side, entry, exit, size, pnl: Math.round(((exit - entry) / 100) * size), at: Date.now() - (i + r()) * 0.9 * DAY, status: i < 2 ? 'open' : 'closed' });
  }
  return (tradeCache[id] = out);
}

// ---------- recommendations ----------
const RR = rng(4242);
const liveMarkets = MARKETS.filter((m) => m.live && m.category === 'Sports');
const preMarkets = MARKETS.filter((m) => !m.live);
const RECS = [];
function mkRec(m, live, i) {
  const side = m.edge > m.noEdge ? 'YES' : 'NO';
  const cur = sideMark(m, side);
  const entry = clamp(cur - Math.round((RR() - 0.35) * 12), 4, 94);
  const specialists = TRADERS.filter((t) => t.venues.includes(m.venue));
  const pool = specialists.length ? specialists : TRADERS;
  const n = 1 + Math.floor(RR() * 3);
  const traderIds = [...new Set(Array.from({ length: n }, () => pick(RR, pool.slice(0, 8)).id))];
  RECS.push({
    id: `r${i + 1}`, traderIds, marketId: m.id, side, entryPrice: entry, confidence: Math.round((0.56 + RR() * 0.36) * 100) / 100,
    targetExit: clamp(entry + Math.round((100 - entry) * (0.28 + RR() * 0.22)), entry + 3, 98), stopLevel: clamp(Math.round(entry * (0.72 + RR() * 0.08)), 1, entry - 2),
    live, createdAt: Date.now() - (live ? RR() * 50 * 60e3 : (0.5 + RR() * 30) * HOUR), traderExited: false, closed: false,
  });
}
let ri = 0;
[...liveMarkets].sort(() => RR() - 0.5).slice(0, 9).forEach((m) => mkRec(m, true, ri++));
[...preMarkets].sort((a, b) => Math.max(b.edge, b.noEdge) - Math.max(a.edge, a.noEdge)).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i).slice(0, 14).forEach((m) => mkRec(m, false, ri++));
RECS[RECS.length - 1].closed = true;

function sizing(c, q, bankroll, kellyMult) {
  const f = c < 1 ? Math.max(0, (q - c) / (1 - c)) : 0;
  const stake = Math.min(bankroll * 0.05, bankroll * f * kellyMult);
  return { stake: Math.round(stake), contracts: Math.floor(stake / Math.max(0.01, c)), kellyPct: f, modelProb: q, edge: q - c };
}
const defaults = () => { const s = store.get(); return { bankroll: s.bankroll || 5000, kellyMult: s.kellyMult || 0.25 }; };

export function recommendations({ live, bankroll, kellyMult } = {}) {
  const d = defaults();
  bankroll ??= d.bankroll; kellyMult ??= d.kellyMult;
  return RECS.filter((r) => live === undefined || r.live === live).map((r) => {
    const m = byId[r.marketId];
    const cur = sideMark(m, r.side);
    const buy = sidePrice(m, r.side);
    const ts = r.traderIds.map((id) => traderById[id]);
    const hist = ts.reduce((a, t) => a + t.winRate, 0) / ts.length / 0.55;
    const q = clamp(buy / 100 + 0.015 + 0.1 * (r.confidence - 0.5) * hist, 0.02, 0.97);
    const status = r.closed ? 'closed' : (cur >= r.targetExit || cur <= r.stopLevel || r.traderExited) ? 'exit-now' : 'open';
    return { ...r, currentPrice: cur, buyPrice: buy, pnlPct: (cur - r.entryPrice) / r.entryPrice, status, ...(() => { const z = sizing(buy / 100, q, bankroll, kellyMult); return { sizing: z.stake, contracts: z.contracts, kellyPct: z.kellyPct, modelProb: z.modelProb, sizingDetail: z }; })(), market: m };
  }).sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || b.confidence - a.confidence);
}

// ---------- AI picks ----------
const REASONS = {
  'Game winner': ['Sharp sportsbook consensus (Circa, Novig, ProphetX) is {f} vs {p}¢ here', 'Injury-adjusted power rating favours this side', 'Late money moved the sportsbook line; this venue has not caught up'],
  Total: ['Pace and weather model projects {f} on this outcome', 'Sportsbook totals moved 1+ point since this contract last traded', 'Both teams top-10 in tempo over the last 5 games'],
  'Player prop': ['Projection model: {f} hit rate from usage and matchup', 'Minutes/snap share trending up in last 3 games', 'Opponent allows the 4th-most to this position'],
  Futures: ['Season simulation (10,000 runs) gives {f}', 'Schedule strength and roster health improve the path', 'Priced {d} below the de-vigged sportsbook futures board'],
  Economics: ['Nowcast and fed funds futures imply {f}', 'Last 3 Fed communications lean toward this outcome', 'Consensus economist forecasts cluster on this side'],
  Politics: ['Polling-average model gives {f}', 'Fundraising and generic-ballot trends support this side', 'Cross-venue prices disagree by {d}; the cheaper venue lags news'],
  Culture: ['Tracking data and comps imply {f}', 'Social and search volume trending toward this outcome', 'Price has not moved after a favourable industry report'],
};
export function aiPicks({ venue, category, bankroll, kellyMult, minEdge = 0.025 } = {}) {
  const d = defaults();
  bankroll ??= d.bankroll; kellyMult ??= d.kellyMult;
  const out = [];
  for (const g of Object.values(GROUPS)) {
    if (category && category !== 'All' && g.category !== category) continue;
    const ms = g.marketIds.map((id) => byId[id]).filter((m) => !venue || venue === 'All' || m.venue === venue);
    if (!ms.length) continue;
    let best = null;
    for (const m of ms) for (const side of ['YES', 'NO']) {
      const e = sideFair(m, side) - sidePrice(m, side) / 100;
      if (!best || e > best.edge) best = { m, side, edge: e };
    }
    if (best.edge < minEdge) continue;
    const { m, side, edge } = best;
    const modelProb = sideFair(m, side);
    const price = sidePrice(m, side);
    const grade = edge >= 0.085 ? 'A+' : edge >= 0.065 ? 'A' : edge >= 0.05 ? 'B+' : edge >= 0.035 ? 'B' : 'C+';
    const tpl = REASONS[g.kind] || REASONS[g.category];
    const fill = (s) => s.replace('{f}', `${Math.round(modelProb * 100)}%`).replace('{p}', price).replace('{d}', `${Math.round(edge * 100)}¢`);
    const sz = sizing(price / 100, modelProb, bankroll, kellyMult);
    out.push({ id: `ai-${m.id}-${side}`, marketId: m.id, key: g.key, side, modelProb, marketPrice: price, edge, grade,
      confidence: clamp(0.55 + edge * 4, 0.55, 0.95), reasons: tpl.map(fill), stake: sz.stake, contracts: sz.contracts, kellyPct: sz.kellyPct, market: m });
  }
  return out.sort((a, b) => b.edge - a.edge);
}

// ---------- positions & exit alerts ----------
const PR = rng(1212);
const POSITIONS = [];
function addPos(m, side, offsetPct, contracts, recId) {
  if (!m) return;
  const now = sideMark(m, side);
  const entry = clamp(Math.round(now / (1 + offsetPct)), 3, 96);
  POSITIONS.push({ id: `p${POSITIONS.length + 1}`, marketId: m.id, venue: m.venue, side, entry, contracts, recId: recId || null,
    openedAt: Date.now() - (1 + PR() * 40) * HOUR, peak: Math.max(entry, now), last: now, flags: {} });
}
const liveRecs = RECS.filter((r) => r.live);
const preRecs = RECS.filter((r) => !r.live && !r.closed);
liveRecs.slice(0, 3).forEach((r, i) => addPos(byId[r.marketId], r.side, [0.21, 0.07, -0.08][i], [1200, 800, 1500][i], r.id));
preRecs.slice(0, 2).forEach((r, i) => addPos(byId[r.marketId], r.side, [0.12, -0.04][i], [900, 2000][i], r.id));
addPos(byId['kalshi-x-house-26-d'], 'YES', 0.09, 2500);
addPos(byId['poly-x-fed-26dec-cut'], 'YES', 0.3, 1800);
addPos(byId['kalshi-fut-sb-kc'], 'YES', -0.11, 3000);

const SETTINGS_KEY = 'bf-pm-alert-settings-v1';
let settings = { targetPct: 25, trailingPct: 15, followTraders: true, edgeGone: true, news: true, spikes: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* ignore */ }
export const alertSettings = () => ({ ...settings });
export function setAlertSettings(patch) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export function positions() {
  return POSITIONS.filter((p) => !p.sold).map((p) => {
    const m = byId[p.marketId];
    const now = sideMark(m, p.side);
    const cost = (p.entry / 100) * p.contracts;
    const value = (now / 100) * p.contracts;
    return { ...p, market: m, title: m.title, now, cost, value, pnl: value - cost, pnlPct: (now - p.entry) / p.entry, fairProb: sideFair(m, p.side),
      targetPrice: Math.min(99, Math.round(p.entry * (1 + settings.targetPct / 100))), trailStop: Math.round(p.peak * (1 - settings.trailingPct / 100)) };
  });
}
export function sellPosition(id) { const p = POSITIONS.find((x) => x.id === id); if (p) p.sold = true; }

let ALERTS = [];
let alertSeq = 0;
function pushAlert(p, reason, action, at = Date.now()) {
  const m = byId[p.marketId];
  const now = sideMark(m, p.side);
  ALERTS.unshift({ id: `x${++alertSeq}`, positionId: p.id, recId: p.recId, marketId: m.id, venue: m.venue, title: m.title, side: p.side,
    reason, entry: p.entry, now, pnlPct: (now - p.entry) / p.entry, action, at, dismissed: false });
  ALERTS = ALERTS.slice(0, 40);
}
// Seed a few alerts that already fired earlier today (each consistent with the position's state).
const posBy = (mid) => POSITIONS.find((p) => p.marketId === mid);
const seedAlert = (p, reason, action, mins, flag) => { if (!p) return; pushAlert(p, reason, action, Date.now() - mins * 60e3); if (flag) p.flags[flag] = true; };
seedAlert(POSITIONS[3], 'news', 'Trim 50%', 46);
seedAlert(posBy('kalshi-x-house-26-d'), 'edge gone', 'Trim 50%', 22, 'edge');
seedAlert(POSITIONS[1], 'trader exited', 'Sell now', 9, 'trader');
if (POSITIONS[1]) { const rec = RECS.find((x) => x.id === POSITIONS[1].recId); if (rec) rec.traderExited = true; }
seedAlert(posBy('poly-x-fed-26dec-cut'), 'target hit', 'Sell now', 3, 'target');

export const exitAlerts = ({ all = false } = {}) => ALERTS.filter((a) => all || !a.dismissed);
export function dismissAlert(id) { const a = ALERTS.find((x) => x.id === id); if (a) a.dismissed = true; }

function checkAlerts(r) {
  for (const p of POSITIONS) {
    if (p.sold) continue;
    const m = byId[p.marketId];
    const now = sideMark(m, p.side);
    const prev = p.last;
    p.last = now;
    p.peak = Math.max(p.peak, now);
    const pnl = (now - p.entry) / p.entry;
    if (pnl * 100 >= settings.targetPct && !p.flags.target) { p.flags.target = true; pushAlert(p, 'target hit', 'Sell now'); continue; }
    if (p.peak > p.entry * 1.08 && now <= p.peak * (1 - settings.trailingPct / 100) && !p.flags.trail) { p.flags.trail = true; pushAlert(p, 'trailing stop', 'Sell now'); continue; }
    if (settings.spikes && now - prev >= 4 && (!p.flags.spikeAt || Date.now() - p.flags.spikeAt > 60e3)) { p.flags.spikeAt = Date.now(); pushAlert(p, 'price spike', 'Trim 50%'); continue; }
    if (settings.edgeGone && pnl > 0.05 && sideFair(m, p.side) * 100 <= now && !p.flags.edge) { p.flags.edge = true; pushAlert(p, 'edge gone', 'Trim 50%'); continue; }
    if (settings.followTraders && p.recId && r() < 0.025 && !p.flags.trader) { p.flags.trader = true; const rec = RECS.find((x) => x.id === p.recId); if (rec) rec.traderExited = true; pushAlert(p, 'trader exited', 'Sell now'); continue; }
    if (settings.news && m.category !== 'Sports' && r() < 0.012) pushAlert(p, 'news', 'Trim 50%');
  }
}

// ---------- ticking ----------
const subs = new Set();
export function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }

onTick((n) => {
  const r = rng(9000 + n);
  const now = Date.now();
  for (const g of Object.values(GROUPS)) {
    const line = g.lineId && lineById[g.lineId];
    if (line && line.live) g.fair = fairProbs(line)[g.outcomeIdx];
    else if (r() < 0.25) g.fair = clamp(g.fair + (r() - 0.5) * 0.008, 0.02, 0.98);
    for (const id of g.marketIds) {
      const m = byId[id];
      m.fairProb = g.fair;
      m.bias = clamp(m.bias + (r() - 0.5) * 0.004, -0.09, 0.09);
      const vol = m.live ? 0.02 : m.category === 'Sports' ? 0.004 : 0.003;
      m.mid = clamp(m.mid + (g.fair + m.bias - m.mid) * 0.12 + (r() - 0.5) * 2 * vol, 0.02, 0.98);
      reprice(m);
      m.volume24h += Math.round(r() * m.volume24h * 0.0015);
      m.orderbook = buildBook(m, rng(m.seed * 13 + n));
      m.history.push({ t: now, p: Math.round(m.mid * 1000) / 10 });
      if (m.history.length > 900) m.history.splice(m.history.length - 840, 1);
    }
  }
  checkAlerts(r);
  subs.forEach((cb) => cb(n));
});
