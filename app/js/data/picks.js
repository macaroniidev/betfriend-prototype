// AI picks engine (sample): pre-match model picks, graded record, live game analysis and the
// "Ask BetFriend AI" responder. Built on core EVENTS/LINES so every pick matches a real event and
// live prices in the app. Seeded, so the model view is stable between reloads.

import { rng, pick, EVENTS, LINES, eventById, bookById, SPORTSBOOKS, onTick } from './core.js';
import { bestPrices, fairProbs, findArbs, findEV, findMiddles, findLowHolds } from '../lib/opportunities.js';
import { impliedProb, ev as evFn, toDecimal, parlay, fmtAmerican } from '../lib/odds.js';
import * as promosMod from './promos.js';
import * as sharpMod from './sharp.js';
import * as bettorsMod from './bettors.js';
import * as predictionMod from './prediction.js';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r1 = (x) => Math.round(x * 10) / 10;
const nick = (team) => team.split(' ').slice(-1)[0];
const pctS = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

export const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
const GRADE_MIN = [0.11, 0.085, 0.068, 0.055, 0.043, 0.032, 0.022, 0.012];
const GRADE_UNITS = { 'A+': 2.5, A: 2, 'A-': 1.75, 'B+': 1.5, B: 1.25, 'B-': 1, 'C+': 0.75, C: 0.5 };
export const gradeFor = (edge) => GRADES[GRADE_MIN.findIndex((m) => edge >= m)] || 'C';
export const gradeRank = (g) => GRADES.indexOf(g);

const SCORE = {
  NFL: { total: 45, margin: 26, dp: 0 }, NCAAF: { total: 54, margin: 40, dp: 0 }, NBA: { total: 226, margin: 28, dp: 0 },
  NHL: { total: 6.2, margin: 3, dp: 1 }, MLB: { total: 8.6, margin: 3.2, dp: 1 }, EPL: { total: 2.7, margin: 2.4, dp: 1 },
};
const fmtScore = (x, sport) => (SCORE[sport].dp ? x.toFixed(1) : String(Math.round(x)));

// ---------------- reasons ----------------
const REASONS = {
  NBA: {
    side: [
      (r) => `Pace-adjusted offensive rating +${(2 + r() * 6).toFixed(1)} vs league (L10)`,
      (r) => `Opponent allows ${(112 + r() * 9).toFixed(1)} PPG on the road over the last 8`,
      (r) => `Rest edge: ${pick(r, ['2 days vs back-to-back', '1 day vs 3-in-4 nights', 'home after 4-game road trip'])}`,
      (r) => `Net rating with projected starters +${(3 + r() * 7).toFixed(1)}`,
      (r) => `Turnover rate gap ${(1.5 + r() * 3).toFixed(1)}% favours this side`,
      (r) => `Market moved ${(0.5 + r() * 1.5).toFixed(1)} pts toward this side at sharp books`,
    ],
    total: [
      (r) => `Combined pace ${(98 + r() * 6).toFixed(1)} possessions, ${(r() * 3 + 1).toFixed(1)} above league avg`,
      (r) => `Both teams top-10 in 3PA rate (L15)`,
      (r) => `Referee crew averages ${(41 + r() * 6).toFixed(1)} fouls per game`,
      (r) => `Defensive efficiency down ${(2 + r() * 4).toFixed(1)} pts without key rim protector`,
    ],
    prop: [
      (r) => `Usage rate ${(26 + r() * 9).toFixed(1)}% over last 10 games`,
      (r) => `Opponent allows ${(24 + r() * 6).toFixed(1)} PPG to guards (L10)`,
      (r) => `Projected minutes ${(33 + r() * 5).toFixed(1)} with teammate questionable`,
      (r) => `Hit this line in ${7 + Math.floor(r() * 3)} of last 10`,
      (r) => `Matchup ranks ${26 + Math.floor(r() * 4)}th in defensive rating vs position`,
    ],
  },
  NFL: {
    side: [
      (r) => `EPA/play differential +${(0.04 + r() * 0.1).toFixed(2)} over last 4 weeks`,
      (r) => `Pass-block win rate ${(60 + r() * 10).toFixed(1)}% vs opponent pressure rate ${(28 + r() * 10).toFixed(1)}%`,
      (r) => `Opponent ${pick(r, ['missing 2 starting OL', 'starting backup QB', 'without top CB', 'on short week'])}`,
      (r) => `Red-zone TD rate ${(58 + r() * 12).toFixed(0)}% vs league ${(55).toFixed(0)}%`,
      (r) => `Sharp handle ${(55 + r() * 20).toFixed(0)}% on this side vs ${(30 + r() * 15).toFixed(0)}% of tickets`,
    ],
    total: [
      (r) => `Wind ${Math.floor(4 + r() * 14)} mph forecast, ${pick(r, ['dome', 'open-air'])} venue`,
      (r) => `Combined neutral pace ${(27 + r() * 4).toFixed(1)} sec/play`,
      (r) => `Both defenses bottom-10 in success rate allowed`,
      (r) => `Early-down pass rate ${(52 + r() * 8).toFixed(1)}% for both teams`,
    ],
    prop: [
      (r) => `Target share ${(22 + r() * 10).toFixed(1)}% over last 4 games`,
      (r) => `Opponent allows ${(7.2 + r() * 1.6).toFixed(1)} yards per attempt`,
      (r) => `Snap share ${(78 + r() * 18).toFixed(0)}% with route participation up`,
      (r) => `Cleared this number in ${6 + Math.floor(r() * 4)} of last 10`,
    ],
  },
  NHL: {
    side: [
      (r) => `5v5 xGF% ${(52 + r() * 6).toFixed(1)} over last 10`,
      (r) => `Goalie edge: GSAx +${(3 + r() * 8).toFixed(1)} season to date`,
      (r) => `Power play ${(23 + r() * 6).toFixed(1)}% vs PK ${(74 + r() * 5).toFixed(1)}%`,
      (r) => `Opponent on second night of back-to-back`,
    ],
    total: [
      (r) => `Combined high-danger chances ${(22 + r() * 6).toFixed(1)} per 60`,
      (r) => `Both starters below .900 save % (L5)`,
      (r) => `Shot attempts per 60 up ${(4 + r() * 6).toFixed(1)}% this month`,
    ],
    prop: [
      (r) => `Averaging ${(3.4 + r() * 1.6).toFixed(1)} shots on goal (L10)`,
      (r) => `PP1 time on ice ${(3 + r() * 1.5).toFixed(1)} min per game`,
      (r) => `Opponent allows ${(32 + r() * 4).toFixed(1)} shots per game`,
    ],
  },
  NCAAF: {
    side: [
      (r) => `Success rate +${(4 + r() * 6).toFixed(1)}% vs opponent on early downs`,
      (r) => `Havoc rate ${(18 + r() * 6).toFixed(1)}%, top-15 nationally`,
      (r) => `Returning production edge: ${(70 + r() * 15).toFixed(0)}% vs ${(50 + r() * 12).toFixed(0)}%`,
      (r) => `Explosive play rate ${(12 + r() * 4).toFixed(1)}% allowed by opponent`,
    ],
    total: [
      (r) => `Plays per game ${(70 + r() * 8).toFixed(1)} combined pace`,
      (r) => `Both offenses top-20 in points per drive`,
      (r) => `Weather: ${pick(r, ['clear, 61°F', 'light rain', 'wind 12 mph'])}`,
    ],
    prop: [(r) => `Usage up ${(10 + r() * 10).toFixed(0)}% over last 3`],
  },
  MLB: {
    side: [
      (r) => `Starter xFIP ${(3 + r() * 0.8).toFixed(2)} vs ${(4 + r() * 0.8).toFixed(2)}`,
      (r) => `Bullpen fully rested; opponent used ${(9 + r() * 5).toFixed(0)} IP last 2 days`,
      (r) => `Lineup wRC+ ${(108 + r() * 14).toFixed(0)} vs handedness`,
    ],
    total: [
      (r) => `Wind blowing ${pick(r, ['out', 'in'])} at ${Math.floor(6 + r() * 10)} mph`,
      (r) => `Park factor ${(98 + r() * 8).toFixed(0)} for runs`,
    ],
    prop: [(r) => `Strikeout rate ${(25 + r() * 6).toFixed(1)}% (L5 starts)`],
  },
  EPL: {
    side: [
      (r) => `xG difference +${(0.4 + r() * 0.8).toFixed(2)} per match (L6)`,
      (r) => `Opponent rotating after midweek European fixture`,
      (r) => `Home xGA ${(0.8 + r() * 0.4).toFixed(2)} per match this season`,
    ],
    total: [
      (r) => `Combined xG ${(2.6 + r() * 0.8).toFixed(2)} per match`,
      (r) => `Both sides press high, PPDA under ${(9 + r() * 2).toFixed(1)}`,
    ],
    prop: [(r) => `Shots per 90 ${(2.8 + r() * 1.5).toFixed(1)}`],
  },
};
function reasonsFor(line, side, r) {
  const set = REASONS[line.sport] || REASONS.NBA;
  const list = line.market === 'Player Prop' ? set.prop : line.market === 'Total' ? set.total : set.side;
  const pool = [...list, ...set.side];
  const out = [];
  while (out.length < 3 + (r() < 0.5 ? 1 : 0) && pool.length) out.push(pool.splice(Math.floor(r() * Math.min(pool.length, list.length + 1)), 1)[0](r));
  if (line.market === 'Player Prop' && /Under/.test(line.outcomes[side])) out[0] = out[0].replace('Hit this line', 'Stayed under this line');
  return out;
}

// ---------------- model view (stable per line) ----------------
const MODEL = new Map();
function modelFor(line) {
  if (MODEL.has(line.id)) return MODEL.get(line.id);
  const r = rng(hash(`model-${line.id}`));
  const active = r() < 0.62;
  const side = line.outcomes.length === 3 ? pick(r, [0, 2, 0, 1]) : (r() < 0.5 ? 0 : 1);
  const adj = 0.006 + r() ** 1.6 * 0.042;
  const conf = 0.5 + r() * 0.42;
  const m = { active, side, adj, conf, reasons: reasonsFor(line, side, r), seed: r() };
  MODEL.set(line.id, m);
  return m;
}

function selectionText(line, i) {
  const o = line.outcomes[i];
  if (line.market === 'Player Prop') return `${line.player} ${o} ${line.stat}`;
  if (line.market === 'Moneyline') return o === 'Draw' ? 'Draw' : `${o} ML`;
  return o;
}

function projectionFor(line, side, modelProb, m) {
  const e = eventById[line.eventId];
  const S = SCORE[line.sport];
  if (line.market === 'Player Prop') {
    if (line.stat === 'Anytime TD') return { text: `${pctS(modelProb, 0)} TD probability`, value: modelProb };
    const scale = line.point * 0.22 + 0.6;
    const v = line.point + (side === 0 ? 1 : -1) * (0.25 + (modelProb - 0.5) * 2.2) * scale;
    return { text: `Proj ${v.toFixed(1)} ${line.stat}`, value: v };
  }
  const totLine = LINES.find((l) => l.eventId === e.id && l.market === 'Total');
  let total = totLine ? totLine.point : S.total;
  if (line.market === 'Total') total = line.point + (side === 0 ? 1 : -1) * (0.04 + m.adj) * S.total * 0.18;
  let homeP = e.homeProb;
  if (line.market === 'Moneyline') homeP = line.outcomes[side] === e.home ? modelProb : line.outcomes[side] === e.away ? 1 - modelProb : homeP;
  let margin = (homeP - 0.5) * S.margin;
  if (line.market === 'Spread') {
    const homeCovers = side === 0;
    const need = -line.point; // home must win by more than this
    margin = homeCovers ? Math.max(margin, need + S.margin * 0.08 * (1 + m.adj * 10)) : Math.min(margin, need - S.margin * 0.08 * (1 + m.adj * 10));
  }
  const home = (total + margin) / 2, away = (total - margin) / 2;
  return { text: `${nick(e.home)} ${fmtScore(home, e.sport)} – ${nick(e.away)} ${fmtScore(away, e.sport)}`, home, away, total };
}

/** AI sports picks for upcoming games. Filter: { sport, market, books, minGrade } */
export function picks({ sport = 'All', market = 'All', books, minGrade } = {}) {
  const out = [];
  for (const line of LINES) {
    if (line.live) continue;
    if (sport !== 'All' && line.sport !== sport) continue;
    if (market !== 'All' && line.market !== market) continue;
    const m = modelFor(line);
    if (!m.active) continue;
    const best = bestPrices(line, books)[m.side];
    if (!best) continue;
    const fair = fairProbs(line);
    const marketProb = fair[m.side];
    const modelProb = clamp(marketProb + m.adj, 0.03, 0.97);
    const edge = evFn(modelProb, best.price);
    if (edge < 0.012 || edge > 0.2) continue;
    const grade = gradeFor(edge);
    const ev = eventById[line.eventId];
    out.push({
      id: `pk-${line.id}`, kind: 'ai-pick', eventId: line.eventId, lineId: line.id, sport: line.sport, market: line.market,
      event: `${ev.away} @ ${ev.home}`, start: ev.start, label: line.label, player: line.player,
      selection: selectionText(line, m.side), outcome: line.outcomes[m.side], outcomeIndex: m.side,
      modelProb, marketProb, impliedProb: impliedProb(best.price), edge, grade,
      confidence: clamp(m.conf + (edge - 0.04) * 2, 0.35, 0.97),
      bestBook: best.book, bestPrice: best.price,
      legs: [{ outcome: line.outcomes[m.side], book: best.book, price: best.price }],
      projection: projectionFor(line, m.side, modelProb, m), reasons: m.reasons, stakeUnits: GRADE_UNITS[grade],
    });
  }
  const min = minGrade && minGrade !== 'All' ? gradeRank(minGrade) : GRADES.length;
  return out.filter((p) => gradeRank(p.grade) <= min).sort((a, b) => b.edge * b.confidence - a.edge * a.confidence);
}

// ---------------- graded record ----------------
let RECORD = null;
const WIN = { 'A+': 0.64, A: 0.618, 'A-': 0.603, 'B+': 0.588, B: 0.574, 'B-': 0.563, 'C+': 0.552, C: 0.543 };
export function record() { return (RECORD ||= buildRecord(RECORD_SEED)); }
export const RECORD_SEED = 11;
export function buildRecord(seed) {
  const r = rng(seed);
  const teamsBy = {};
  for (const e of EVENTS) (teamsBy[e.sport] ||= []).push(e.home, e.away);
  const playersBy = {};
  for (const l of LINES) if (l.player) (playersBy[l.sport] ||= new Set()).add(`${l.player}|${l.stat}|${l.point}`);
  const now = Date.now(), DAY = 86400e3, DAYS = 60;
  const graded = [];
  const sportW = ['NFL', 'NFL', 'NBA', 'NBA', 'NBA', 'NHL', 'NCAAF', 'MLB', 'EPL'];
  const gradeW = ['A+', 'A', 'A', 'A-', 'A-', 'B+', 'B+', 'B', 'B', 'B', 'B-', 'B-', 'C+', 'C'];
  for (let d = DAYS; d >= 1; d--) {
    const n = 5 + Math.floor(r() * 7);
    for (let k = 0; k < n; k++) {
      const sport = pick(r, sportW);
      const grade = pick(r, gradeW);
      const mk = pick(r, ['Moneyline', 'Spread', 'Spread', 'Total', 'Player Prop', 'Player Prop']);
      const team = pick(r, teamsBy[sport] || ['Home']);
      let selection;
      if (mk === 'Player Prop' && playersBy[sport]) {
        const [pl, stat, pt] = pick(r, [...playersBy[sport]]).split('|');
        selection = `${pl} ${r() < 0.55 ? 'Over' : 'Under'} ${pt} ${stat}`;
      } else if (mk === 'Moneyline') selection = `${team} ML`;
      else if (mk === 'Spread') selection = `${team} ${pick(r, ['-3.5', '+2.5', '-6.5', '+7', '-1.5', '+4.5'])}`;
      else selection = `${nick(team)} game ${r() < 0.5 ? 'Over' : 'Under'} ${({ NFL: 44.5, NCAAF: 53.5, NBA: 225.5, NHL: 6.5, MLB: 8.5, EPL: 2.5 })[sport]}`;
      const price = mk === 'Moneyline' ? pick(r, [-135, -125, -115, 105, 110, 120]) : pick(r, [-120, -115, -112, -110, -108, -105, 100, 104]);
      graded.push({ id: `g${graded.length}`, ts: now - d * DAY + r() * DAY * 0.6, sport, grade, market: mk, selection, price, stake: GRADE_UNITS[grade], status: 'lost', units: 0, clv: (r() - 0.3) * 0.05 });
    }
  }
  // Settle with a stratified hit rate per grade so the record reflects the model's calibration.
  for (const g of GRADES) {
    const rows = graded.filter((x) => x.grade === g).map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const pushes = Math.round(rows.length * 0.02);
    const wins = Math.round((rows.length - pushes) * WIN[g]);
    rows.forEach((x, i) => {
      x.status = i < pushes ? 'push' : i < pushes + wins ? 'won' : 'lost';
      x.units = x.status === 'won' ? x.stake * (toDecimal(x.price) - 1) : x.status === 'lost' ? -x.stake : 0;
    });
  }
  const agg = (rows) => {
    const bets = rows.filter((x) => x.status !== 'push');
    const wins = bets.filter((x) => x.status === 'won').length;
    const units = rows.reduce((a, x) => a + x.units, 0);
    const risked = rows.reduce((a, x) => a + x.stake, 0);
    return { bets: rows.length, wins, losses: bets.length - wins, pushes: rows.length - bets.length, units, roi: risked ? units / risked : 0, winRate: bets.length ? wins / bets.length : 0, clv: rows.reduce((a, x) => a + x.clv, 0) / Math.max(1, rows.length) };
  };
  const by = (key, keys) => keys.map((k) => ({ key: k, ...agg(graded.filter((g) => g[key] === k)) })).filter((x) => x.bets);
  const daily = [];
  let cum = 0;
  for (let d = DAYS; d >= 1; d--) {
    const dayStart = now - d * DAY;
    const u = graded.filter((g) => g.ts >= dayStart && g.ts < dayStart + DAY).reduce((a, g) => a + g.units, 0);
    cum += u;
    daily.push({ date: dayStart, units: u, cum });
  }
  return {
    overall: agg(graded),
    last7: agg(graded.filter((g) => g.ts > now - 7 * DAY)),
    last30d: agg(graded.filter((g) => g.ts > now - 30 * DAY)),
    bySport: by('sport', ['NFL', 'NBA', 'NHL', 'NCAAF', 'MLB', 'EPL']),
    byGrade: by('grade', GRADES),
    byMarket: by('market', ['Moneyline', 'Spread', 'Total', 'Player Prop']),
    daily,
    last30: [...graded].sort((a, b) => b.ts - a.ts).slice(0, 30),
    all: graded,
  };
}

// ---------------- live analysis ----------------
const LIVE = new Map();
const PERIODS = { NBA: [4, 12], NFL: [4, 15], NHL: [3, 20], MLB: [9, 0], EPL: [1, 90] };

function progress(e, ticks) {
  const c = e.clock || '';
  let f = 0.5;
  const m = c.match(/^(?:Q|P)(\d)\s+(\d+):(\d+)/);
  if (m) {
    const [n, len] = PERIODS[e.sport] || [4, 12];
    f = (Number(m[1]) - 1 + (len - Math.min(len, Number(m[2]) + Number(m[3]) / 60)) / len) / n;
  } else if (/^(Top|Bot)\s(\d+)/.test(c)) {
    const mm = c.match(/^(Top|Bot)\s(\d+)/);
    f = (Number(mm[2]) - 1 + (mm[1] === 'Bot' ? 0.5 : 0)) / 9;
  } else if (/^(\d+)'/.test(c)) f = Number(c.match(/^(\d+)'/)[1]) / 90;
  return clamp(f + ticks * 0.004, 0.05, 0.97);
}

function teamName(e, side) { return side === 'home' ? nick(e.home) : nick(e.away); }

function initLive(e) {
  const r = rng(hash(`live-${e.id}`));
  const N = 28;
  const p0 = clamp(e.homeProb + (r() - 0.5) * 0.3, 0.2, 0.8);
  const wp = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const bridge = p0 + (e.homeProb - p0) * t;
    wp.push(clamp(bridge + Math.sin(t * Math.PI) * (r() - 0.5) * 0.18, 0.04, 0.96));
  }
  wp[N - 1] = e.homeProb;
  const st = { wp, momentum: [], moments: [], commentary: [], ticks: 0, lastScore: { ...e.score }, lastWp: e.homeProb, r, lean: (r() - 0.5) * 0.05 };
  st.momentum = wp.map((_, i) => momentumAt(wp, i));
  // Backfilled key moments
  const per = e.sport === 'NBA' || e.sport === 'NFL' ? 'Q' : e.sport === 'NHL' ? 'P' : '';
  const lead = e.score.home === e.score.away ? null : e.score.home > e.score.away ? 'home' : 'away';
  const trail = lead === 'home' ? 'away' : 'home';
  const ago = (min) => Date.now() - min * 60e3;
  const unit = { NBA: 'run', NFL: 'drive', NHL: 'shift', MLB: 'inning', EPL: 'spell' }[e.sport] || 'run';
  st.moments.push({ ts: ago(38), clock: per ? `${per}1 ${Math.floor(3 + r() * 8)}:${String(Math.floor(r() * 60)).padStart(2, '0')}` : 'Early', text: `${teamName(e, 'away')} open with a ${e.sport === 'NBA' ? '9-2 run' : e.sport === 'NFL' ? '75-yard TD drive' : 'goal against the run of play'}`, type: 'score', swing: -0.06 });
  st.moments.push({ ts: ago(27), clock: per ? `${per}${Math.min(2, Number((e.clock || 'Q2').match(/\d/)?.[0] || 2))} ${Math.floor(1 + r() * 10)}:${String(Math.floor(r() * 60)).padStart(2, '0')}` : 'Mid', text: `${teamName(e, 'home')} ${e.sport === 'NBA' ? 'answer with three straight threes' : e.sport === 'NFL' ? 'force a turnover in the red zone' : 'equalise from a set piece'}`, type: 'swing', swing: 0.09 });
  if (lead) st.moments.push({ ts: ago(14), clock: 'Recent', text: `${teamName(e, lead)} take the lead and hold it, ${e.score[lead]}-${e.score[trail]}`, type: 'lead', swing: lead === 'home' ? 0.07 : -0.07 });
  st.moments.push({ ts: ago(6), clock: e.clock, text: `Win probability settles at ${pctS(e.homeProb, 0)} for ${teamName(e, 'home')}`, type: 'model', swing: 0 });
  st.commentary = [
    { ts: ago(30), text: `Pre-game model had ${teamName(e, 'home')} at ${pctS(p0, 0)}. Early ${unit} shifted the number ${Math.abs(wp[8] - p0) > 0.05 ? 'sharply' : 'only modestly'}.`, tone: 'info' },
    { ts: ago(18), text: `${teamName(e, e.homeProb >= 0.5 ? 'home' : 'away')} controlling tempo; shot quality on our tracking is ${(1.04 + r() * 0.1).toFixed(2)} expected pts per possession-equivalent.`, tone: 'info' },
    { ts: ago(8), text: `Live markets are ${r() < 0.5 ? 'slow' : 'quick'} to react this game: books lagged our win probability by ~${Math.floor(10 + r() * 30)}s on the last swing.`, tone: 'edge' },
  ];
  LIVE.set(e.id, st);
  return st;
}
function momentumAt(wp, i) {
  const a = wp[Math.max(0, i - 3)], b = wp[i];
  return clamp((b - a) * 9, -1, 1);
}

const COMMENT = [
  (e, s, d) => `${teamName(e, d > 0 ? 'home' : 'away')} stringing together quality possessions; win prob ${d > 0 ? 'up' : 'down'} ${pctS(Math.abs(d))} for ${teamName(e, 'home')}.`,
  (e) => `Shot profile tilting toward ${teamName(e, e.homeProb >= 0.5 ? 'home' : 'away')}: higher-value looks on ${Math.floor(55 + Math.random() * 20)}% of recent trips.`,
  (e) => `Pace tracking ${Math.random() < 0.5 ? 'above' : 'below'} pre-game projection; live total looks ${Math.random() < 0.5 ? 'short' : 'rich'} at most books.`,
  (e) => `Model still sees value on ${teamName(e, e.homeProb >= 0.5 ? 'home' : 'away')} relative to the live board.`,
  (e) => `Fatigue signal: ${teamName(e, Math.random() < 0.5 ? 'home' : 'away')} rotation tightening, starters' minutes load up ${Math.floor(8 + Math.random() * 10)}% vs average.`,
];

function stepLive(e, st) {
  st.ticks++;
  const d = e.homeProb - st.lastWp;
  st.wp.push(e.homeProb);
  if (st.wp.length > 90) st.wp.shift();
  st.momentum.push(momentumAt(st.wp, st.wp.length - 1));
  if (st.momentum.length > 90) st.momentum.shift();
  const dh = e.score.home - st.lastScore.home, da = e.score.away - st.lastScore.away;
  const now = Date.now();
  if (dh || da) {
    const side = dh ? 'home' : 'away';
    const pts = dh || da;
    const wasLead = Math.sign(st.lastScore.home - st.lastScore.away), isLead = Math.sign(e.score.home - e.score.away);
    const leadChange = wasLead !== 0 && isLead !== 0 && wasLead !== isLead;
    const what = e.sport === 'NBA' ? `${pts === 3 ? 'three' : 'bucket'} (+${pts})` : e.sport === 'NFL' ? (pts === 7 ? 'touchdown (+7)' : 'field goal (+3)') : 'goal';
    st.moments.unshift({ ts: now, clock: e.clock, text: `${teamName(e, side)} ${what} · ${e.score.away}-${e.score.home}${leadChange ? ' · lead change' : ''}`, type: leadChange ? 'lead' : 'score', swing: d });
    st.commentary.push({ ts: now, text: leadChange
      ? `Lead change. ${teamName(e, side)} go in front; win probability swings ${pctS(Math.abs(d))} and live prices are catching up.`
      : `${teamName(e, side)} ${what}. Win prob for ${teamName(e, 'home')} now ${pctS(e.homeProb, 0)} (${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}).`, tone: Math.abs(d) > 0.02 ? 'edge' : 'info' });
  } else if (Math.abs(d) > 0.016) {
    st.commentary.push({ ts: now, text: COMMENT[0](e, st, d), tone: 'info' });
    if (Math.abs(d) > 0.025) st.moments.unshift({ ts: now, clock: e.clock, text: `Win probability swing ${d > 0 ? '+' : ''}${(d * 100).toFixed(1)} toward ${teamName(e, d > 0 ? 'home' : 'away')}`, type: 'swing', swing: d });
  } else {
    st.commentary.push({ ts: now, text: pick(st.r, COMMENT.slice(1))(e, st, d), tone: 'info' });
  }
  if (st.commentary.length > 60) st.commentary.shift();
  if (st.moments.length > 24) st.moments.pop();
  st.lastScore = { ...e.score };
  st.lastWp = e.homeProb;
}

onTick(() => { for (const e of EVENTS) if (e.live) stepLive(e, LIVE.get(e.id) || initLive(e)); });

export const liveEvents = () => EVENTS.filter((e) => e.live);

/** Live game analysis. Evolves on each api.onTick. */
export function liveAnalysis(eventId, { books } = {}) {
  const e = eventById[eventId];
  if (!e || !e.live) return null;
  const st = LIVE.get(e.id) || initLive(e);
  const S = SCORE[e.sport] || SCORE.NBA;
  const f = progress(e, st.ticks);
  const curTotal = e.score.home + e.score.away;
  const projTotal = curTotal + S.total * (1 - f) * (0.92 + st.lean * 2 + 0.16 * (st.momentum.at(-1) > 0 ? 0.5 : 0.4));
  const curMargin = e.score.home - e.score.away;
  const projMargin = curMargin + (e.homeProb - 0.5) * S.margin * (1 - f);
  const home = (projTotal + projMargin) / 2, away = (projTotal - projMargin) / 2;
  const mom = st.momentum.at(-1) || 0;
  const modelHome = clamp(e.homeProb + st.lean + mom * 0.02, 0.03, 0.97);

  const sugg = [];
  for (const line of LINES) {
    if (line.eventId !== e.id || line.market === 'Player Prop') continue;
    const best = bestPrices(line, books);
    let model;
    if (line.market === 'Moneyline') {
      if (line.outcomes.length === 3) {
        const fair = fairProbs(line);
        model = [fair[0] + st.lean, fair[1], fair[2] - st.lean];
      } else model = [modelHome, 1 - modelHome];
    } else if (line.market === 'Total') {
      const sc = { NBA: 34, NFL: 22, NCAAF: 26, NHL: 3.2, MLB: 5, EPL: 2.2 }[e.sport] || 20;
      const over = clamp(0.5 + (projTotal - line.point) / sc, 0.08, 0.92);
      model = [over, 1 - over];
    } else {
      const sc = { NBA: 26, NFL: 20, NCAAF: 24, NHL: 3, MLB: 4, EPL: 2 }[e.sport] || 20;
      const hc = clamp(0.5 + (projMargin + line.point) / sc, 0.08, 0.92);
      model = [hc, 1 - hc];
    }
    const mkt = fairProbs(line);
    model = model.map((p, i) => clamp(mkt[i] + clamp(p - mkt[i], -0.055, 0.055), 0.03, 0.97));
    best.forEach((b, i) => {
      if (!b) return;
      const ed = evFn(model[i], b.price);
      sugg.push({ id: `lv-${line.id}-${i}`, kind: 'live', eventId: e.id, lineId: line.id, sport: e.sport, market: line.market, label: line.label,
        event: `${e.away} @ ${e.home}`, live: true, selection: selectionText(line, i), outcome: line.outcomes[i], outcomeIndex: i,
        modelProb: model[i], impliedProb: impliedProb(b.price), edge: ed, bestBook: b.book, bestPrice: b.price,
        legs: [{ outcome: line.outcomes[i], book: b.book, price: b.price }] });
    });
  }
  sugg.sort((a, b) => b.edge - a.edge);
  const suggestions = sugg.filter((s) => s.edge > 0).slice(0, 5);
  if (suggestions.length < 2) suggestions.push(...sugg.filter((s) => !suggestions.includes(s)).slice(0, 2 - suggestions.length));

  return {
    event: e, progress: f, homeProb: e.homeProb, modelHomeProb: modelHome,
    winProb: [...st.wp], momentum: [...st.momentum], currentMomentum: mom,
    keyMoments: st.moments.slice(0, 10), commentary: [...st.commentary],
    projected: { home, away, total: projTotal, margin: projMargin, text: `${nick(e.home)} ${fmtScore(home, e.sport)} – ${nick(e.away)} ${fmtScore(away, e.sport)}` },
    suggestions, ticks: st.ticks,
  };
}

// ---------------- Ask BetFriend AI ----------------
const TERMS = {
  arbitrage: ['Arbitrage', 'An arbitrage ("arb") is when two or more books disagree enough that betting every outcome locks in profit. Example: Over 224.5 at +105 on DraftKings and Under 224.5 at +102 on FanDuel. Stake each side so the payout is equal and you win either way. Our Arbitrage screen sizes the stakes for you.'],
  middle: ['Middle', 'A middle is when you bet Over a low number at one book and Under a higher number at another (or both sides of different spreads). If the result lands between the two numbers, both bets win. If it misses, you lose only a small amount of vig. Wider gaps hit more often.'],
  'low hold': ['Low hold', 'Hold is the bookmaker\'s margin built into a market. A low-hold market (best prices across books add up to under ~2% hold) is the cheapest place to bet both sides — ideal for clearing rollover, promo conversion and hedging.'],
  ev: ['+EV (positive expected value)', '+EV means the price you\'re getting pays more than the true probability deserves. We estimate the true (no-vig) probability from sharp books like Circa, Novig and ProphetX, then flag soft-book prices above it. Over a large sample, consistently betting +EV is how pros grow a bankroll.'],
  clv: ['CLV (closing line value)', 'CLV measures whether you beat the closing price. If you bet the Lions at +120 and they close at +105, you captured CLV. Consistently positive CLV is the best single indicator that your bets are sharp, long before results catch up.'],
  kelly: ['Kelly criterion', 'Kelly sizes each bet by your edge: stake fraction = (b·p − q) / b, where b is net decimal odds, p your win probability and q = 1 − p. Most pros use fractional Kelly (¼ Kelly is our default) to smooth swings while compounding growth.'],
  hold: ['Hold', 'Hold (overround) is the total implied probability of all outcomes minus 100%. At -110/-110 the hold is 4.76%. Lower hold means cheaper betting.'],
  vig: ['Vig', 'Vig (juice) is the commission the sportsbook charges, baked into prices. Removing it ("de-vigging") gives fair odds, which is how we price every +EV bet.'],
  sharp: ['Sharp money', 'Sharp money is wagering from professional, winning bettors. Books respect it and move lines quickly. We track steam moves, reverse line movement and handle-vs-ticket splits to see which side the pros are on.'],
  parlay: ['Parlay', 'A parlay combines legs into one bet that pays only if all win. Price is the product of each leg\'s decimal odds. Building parlays from +EV legs (and correlated same-game legs books under-price) is where the value is.'],
};

function topPicks(n, f = {}) { return picks(f).slice(0, n); }
function toCard(o, extra = {}) {
  const leg = o.legs?.[0];
  return { kind: o.kind, title: o.selection || (o.legs?.length > 1 ? o.label : leg?.outcome) || o.label, event: o.event, eventId: o.eventId,
    sport: o.sport, market: o.market, label: o.label, legs: o.legs || [], edge: o.edge, grade: o.grade, live: o.live, start: o.start,
    modelProb: o.modelProb, lineId: o.lineId, ...extra };
}
function findTeamEvents(q) {
  const ql = q.toLowerCase();
  return EVENTS.filter((e) => [e.home, e.away].some((t) => { const n = nick(t).toLowerCase(); return ql.includes(n) || ql.includes(t.toLowerCase()) || (n.length > 4 && ql.includes(n.slice(0, -1))); }));
}
function findPlayer(q) {
  const ql = q.toLowerCase();
  const names = [...new Set(LINES.filter((l) => l.player).map((l) => l.player))];
  return names.find((n) => ql.includes(n.toLowerCase()) || ql.includes(n.split(' ').slice(-1)[0].toLowerCase()));
}

function sharpSide(books) {
  let ext = null;
  try { ext = sharpMod.spikes?.({ books, live: false }); } catch { ext = null; }
  if (ext?.length) {
    return [...ext].sort((a, b) => b.spikeX * Math.max(0.01, b.edge) - a.spikeX * Math.max(0.01, a.edge)).slice(0, 4).map((x) => {
      const ev = eventById[x.eventId];
      return { kind: 'sharp', title: x.selection, event: `${ev.away} @ ${ev.home}`, eventId: x.eventId, sport: x.sport, market: x.market, lineId: x.lineId,
        legs: [{ outcome: x.outcome, book: x.bestBook, price: x.bestPrice }], edge: x.edge,
        note: `${x.spikeX.toFixed(1)}x volume spike on ${bookById[x.exchange]?.name || x.exchange} · $${Math.round(x.volume / 1000)}K matched` };
    });
  }
  // Fallback: sides where sharp references price an outcome well above retail consensus.
  const out = [];
  for (const l of LINES) {
    if (l.market === 'Player Prop' || l.live) continue;
    const sharpF = fairProbs(l, ['circa', 'novig', 'px']);
    const retailF = fairProbs(l, SPORTSBOOKS.map((b) => b.id));
    sharpF.forEach((p, i) => {
      const gap = p - retailF[i];
      if (gap > 0.004) {
        const best = bestPrices(l)[i];
        const ev = eventById[l.eventId];
        if (best) out.push({ kind: 'sharp', title: selectionText(l, i), event: `${ev.away} @ ${ev.home}`, eventId: l.eventId, sport: l.sport, market: l.market, lineId: l.id,
          legs: [{ outcome: l.outcomes[i], ...best }], edge: evFn(p, best.price), gap, note: `Sharp books ${pctS(gap)} higher than retail · ${Math.round(58 + gap * 900)}% of handle` });
      }
    });
  }
  return out.sort((a, b) => b.gap - a.gap).slice(0, 4);
}

const PROMO_FALLBACK = [
  ['dk', 'Bet $5, Get $200 in Bonus Bets', 200, 0.72], ['fd', 'Bet $5, Get $300 in Bonus Bets if you win', 300, 0.7],
  ['mgm', 'First bet offer up to $1,500 back in bonus bets', 1500, 0.55], ['czr', '100% profit boost tokens x10', 250, 0.6],
  ['fan', 'Bet & Get $1,000 in FanCash over 10 days', 1000, 0.5], ['espn', 'Bet $10, Get $150 in bonus bets', 150, 0.71],
];
function promoCards(state) {
  let ext = null;
  try { ext = promosMod.promos?.({ state }); } catch { ext = null; }
  if (ext?.length) {
    return ext.filter((p) => !p.claimed).slice(0, 4).map((p) => ({ kind: 'promo', title: p.title, event: bookById[p.book]?.name || p.book,
      legs: [{ outcome: promosMod.typeLabel?.(p.type) || p.type || 'Offer', book: p.book, price: null }], edge: null, value: p.estValue,
      note: `Est. value $${Math.round(p.estValue)}${p.newUserOnly ? ' · new users' : ''}` }));
  }
  return PROMO_FALLBACK.map(([book, title, amt, rate]) => ({ kind: 'promo', title, event: bookById[book].name, legs: [{ outcome: 'New-user offer', book, price: null }], edge: null,
    value: amt * rate, note: `Converts at ~${Math.round(rate * 100)}% → ~$${Math.round(amt * rate)} guaranteed` })).sort((a, b) => b.value - a.value).slice(0, 4);
}
const api_bookName = (id) => bookById[id]?.name || id || '';

function predictionCards() {
  let ext = null;
  try { ext = predictionMod.aiPicks?.({}); } catch { ext = null; }
  if (ext?.length) {
    return ext.slice(0, 4).map((x) => ({ kind: 'prediction', title: `${x.market?.title || x.key} — ${x.side}`, event: `${bookById[x.market?.venue]?.name || x.market?.venue || ''}${x.market?.category ? ` · ${x.market.category}` : ''}`,
      eventId: x.market?.eventId || null, legs: [{ outcome: x.side, book: x.market?.venue || 'kalshi', price: null, cents: x.marketPrice }], edge: x.edge, grade: x.grade, modelProb: x.modelProb,
      note: `Model ${pctS(x.modelProb, 0)} vs ${x.marketPrice}¢ · grade ${x.grade}` }));
  }
  return topPicks(30, { market: 'Moneyline' }).slice(0, 4).map((p, i) => {
    const venue = i % 2 ? 'poly' : 'kalshi';
    const cents = Math.round((p.marketProb + 0.01) * 100);
    return { kind: 'prediction', title: `Will the ${nick(p.outcome)} win? — YES`, event: p.event, eventId: p.eventId, sport: p.sport,
      legs: [{ outcome: 'YES', book: venue, price: null, cents }], edge: p.modelProb - cents / 100, modelProb: p.modelProb,
      note: `Model ${pctS(p.modelProb, 0)} vs ${cents}¢ on ${bookById[venue].name}` };
  });
}

const FOLLOW = {
  default: ['Best arb right now', 'Best +EV bet', 'Top AI picks today', 'What are the sharps on?'],
};

/** Rule-based AI responder over the app's data. Returns { text, cards, followUps }. */
export function answer(question, { state = 'NJ', books } = {}) {
  const q = String(question || '').trim();
  const ql = q.toLowerCase();
  if (!q) return { text: 'Ask me about arbs, +EV bets, AI picks, sharp money, promos, live games or any team or player.', cards: [], followUps: FOLLOW.default };

  // Explain a term
  const explain = /\b(explain|what is|what's|whats|what are|define|how does|meaning of)\b/.test(ql);
  const termKey = /arb/.test(ql) ? 'arbitrage' : /middl/.test(ql) ? 'middle' : /low.?hold/.test(ql) ? 'low hold' : /\bclv\b|closing line/.test(ql) ? 'clv'
    : /kelly/.test(ql) ? 'kelly' : /\+?\bev\b|expected value|positive ev/.test(ql) ? 'ev' : /\bhold\b/.test(ql) ? 'hold' : /\bvig\b|juice/.test(ql) ? 'vig' : /parlay/.test(ql) ? 'parlay' : null;
  if (explain && termKey && !/sharps? (are )?on|best|right now|today|tonight/.test(ql)) {
    const [title, body] = TERMS[termKey];
    const live = termKey === 'arbitrage' ? findArbs(LINES, { books }).slice(0, 1) : termKey === 'ev' ? findEV(LINES, { books, minEdge: 0.02 }).slice(0, 1) : termKey === 'middle' ? findMiddles(LINES, { books }).slice(0, 1) : termKey === 'low hold' ? findLowHolds(LINES, { books }).slice(0, 1) : [];
    return { text: `**${title}**\n${body}${live.length ? '\n\nHere\'s a live example from the board right now:' : ''}`, cards: live.map((o) => toCard(o)),
      followUps: termKey === 'arbitrage' ? ['Best arb right now', 'Explain middles', 'Explain low hold'] : termKey === 'ev' ? ['Best +EV bet', 'Explain CLV', 'Explain Kelly'] : ['Best +EV bet', 'Explain arbitrage', 'Top AI picks today'] };
  }

  if (/\barbs?\b|arbitrage|risk.?free|guaranteed profit/.test(ql)) {
    const live = /live/.test(ql);
    const arbs = findArbs(LINES, { books, live: live || undefined }).slice(0, 4);
    if (!arbs.length) return { text: 'No arbs open across your books this second — they come and go every few seconds. I\'ll keep scanning; the closest low-hold markets are below.', cards: findLowHolds(LINES, { books }).slice(0, 3).map((o) => toCard(o)), followUps: ['Best +EV bet', 'Explain low hold'] };
    const a = arbs[0];
    return { text: `The best ${live ? 'live ' : ''}arb right now is **${a.label}** in ${a.event} for a guaranteed **${pctS(a.edge, 2)}** return. ${a.legs.map((l) => `${l.outcome} ${fmtAmerican(l.price)} at ${bookById[l.book].name}`).join(' and ')}. On a $1,000 total stake that locks in about **$${Math.round(a.edge * 1000)}**. I found ${arbs.length} open arb${arbs.length > 1 ? 's' : ''} across your books.`,
      cards: arbs.map((o) => toCard(o)), followUps: ['Show live arbs', 'Explain arbitrage', 'Best +EV bet'] };
  }
  if (/middle/.test(ql)) {
    const ms = findMiddles(LINES, { books }).slice(0, 4);
    return { text: ms.length ? `Widest middle: **${ms[0].label}** in ${ms[0].event} — a ${ms[0].meta.width}-point window (${ms[0].meta.low}–${ms[0].meta.high}). If the result lands inside, both sides cash.` : 'No middles open right now.', cards: ms.map((o) => toCard(o)), followUps: ['Explain middles', 'Best arb right now'] };
  }
  if (/low.?hold/.test(ql)) {
    const lh = findLowHolds(LINES, { books }).slice(0, 4);
    return { text: lh.length ? `Lowest-hold market: **${lh[0].label}** in ${lh[0].event} at ${pctS(lh[0].meta.hold, 2)} hold. Ideal for rollover and promo conversion.` : 'No sub-2% markets right now.', cards: lh.map((o) => toCard(o)), followUps: ['Explain low hold', 'Best promo in ' + state] };
  }
  if (/\+\s?ev|\bev\b|positive ev|expected value|value bet/.test(ql)) {
    const live = /live/.test(ql);
    const evs = findEV(LINES, { books, minEdge: 0.015, live: live || undefined }).slice(0, 4);
    const b = evs[0];
    return { text: b ? `Top ${live ? 'live ' : ''}+EV bet: **${b.legs[0].outcome}** (${b.label}) at **${fmtAmerican(b.legs[0].price)}** on ${bookById[b.legs[0].book].name} — ${pctS(b.edge, 2)} EV against a no-vig fair probability of ${pctS(b.meta.fairProb)}. Quarter-Kelly suggests ${pctS(Math.max(0, ((toDecimal(b.legs[0].price) - 1) * b.meta.fairProb - (1 - b.meta.fairProb)) / (toDecimal(b.legs[0].price) - 1)) * 0.25, 2)} of bankroll.` : 'Nothing above 1.5% EV right now.',
      cards: evs.map((o) => toCard(o)), followUps: ['Show live +EV', 'Explain Kelly', 'Explain CLV'] };
  }
  if (/sharp|steam|pros? (are )?(on|betting)|smart money|wise ?guys/.test(ql)) {
    const cards = sharpSide(books);
    return { text: cards.length ? `Sharps are hitting **${cards[0].title}** (${cards[0].event}) hardest right now${cards[0].note ? ` (${cards[0].note})` : ''}. Here are the sides with the strongest professional action:` : 'No strong sharp moves in the last hour.', cards, followUps: ['What are profitable bettors on?', 'Top AI picks today', 'Best +EV bet'] };
  }
  if (/profitable bettor|top bettor|whale|bettor signal|tail/.test(ql)) {
    let ext = null;
    try { ext = bettorsMod.signals?.({ books }); } catch { ext = null; }
    if (ext?.length) {
      const cards = [...ext].filter((x) => !x.live && x.stillGood !== false).sort((a, b) => b.confidence - a.confidence).slice(0, 4).map((x) => {
        const ev = eventById[x.eventId];
        const bt = bettorsMod.bettorById?.(x.bettorId);
        return { kind: 'signal', title: x.selection, event: `${ev.away} @ ${ev.home}`, eventId: x.eventId, sport: x.sport, market: x.market, lineId: x.lineId,
          legs: [{ outcome: x.selection, book: x.bestBookNow, price: x.bestPriceNow }], edge: x.edge,
          note: bt ? `${bt.handle}${bt.record?.roi !== undefined ? ` · ${pctS(bt.record.roi)} ROI` : ''} · ${x.stakeUnits}u` : `${x.stakeUnits}u` };
      });
      return { text: `Here's what the most profitable tracked bettors are on right now. Top signal: **${cards[0].title}**${cards[0].note ? ` (${cards[0].note})` : ''}.`, cards, followUps: ['What are the sharps on?', 'Top AI picks today'] };
    }
    const cards = sharpSide(books).map((c) => ({ ...c, kind: 'signal', note: `${3 + Math.floor((c.gap || 0.02) * 150)} top-100 bettors on this side` }));
    return { text: 'Top-ranked bettors (by verified ROI and CLV) are concentrated on these sides:', cards, followUps: ['What are the sharps on?', 'Top AI picks today'] };
  }
  if (/promo|bonus|boost|sign.?up|offer/.test(ql)) {
    const st = (ql.match(/\bin ([a-z]{2})\b/) || [])[1]?.toUpperCase() || state;
    const cards = promoCards(st);
    return { text: `Best promos for **${st}** ranked by guaranteed value after conversion. Top pick: **${cards[0]?.title}** at ${cards[0]?.event}${cards[0]?.note ? ` — ${cards[0].note}` : ''}.`, cards, followUps: ['Explain low hold', 'How do I convert a bonus bet?', 'Best arb right now'] };
  }
  if (/convert.*bonus|bonus bet/.test(ql)) {
    return { text: 'To convert a bonus bet, place it on a longshot (around +300 to +500) and hedge the other side with cash at another book. You typically lock in 65–75% of the bonus amount as cash. The Promo Converter screen finds the best pair for you.', cards: [], followUps: ['Best promo in ' + state, 'Explain low hold'] };
  }
  if (/prediction|kalshi|polymarket|event contract|market picks/.test(ql)) {
    const cards = predictionCards();
    return { text: `Top AI prediction-market picks: **${cards[0]?.title}** — ${cards[0]?.note || 'model edge over the market price'}. Contracts priced below our model probability:`, cards, followUps: ['Top AI picks today', 'Best +EV bet'] };
  }
  if (/parlay|sgp|same.?game/.test(ql)) {
    const pool = topPicks(40);
    const seen = new Set();
    const legs = pool.filter((p) => !seen.has(p.eventId) && seen.add(p.eventId)).slice(0, 3);
    const price = parlay(legs.map((p) => p.bestPrice));
    const prob = legs.reduce((a, p) => a * p.modelProb, 1);
    const ev3 = prob * price.decimal - 1;
    return { text: `Here's a 3-leg parlay built from our highest-graded picks in different games: **${fmtAmerican(price.american)}** combined. Model hit probability ${pctS(prob)}, which makes it **${ev3 >= 0 ? '+' : ''}${pctS(ev3)} EV** at the best available prices.`,
      cards: legs.map((p) => toCard(p)), followUps: ['Top AI picks today', 'Best +EV bet', 'Explain parlay'] };
  }
  if (/live|in.?game|right now.*game/.test(ql) && !/arb|ev/.test(ql)) {
    const lives = liveEvents();
    const cards = lives.flatMap((e) => (liveAnalysis(e.id, { books })?.suggestions || []).slice(0, 1)).sort((a, b) => b.edge - a.edge).slice(0, 4).map((o) => toCard(o));
    return { text: `${lives.length} games are live. Strongest live spots from the in-game model:`, cards, followUps: lives.slice(0, 2).map((e) => `How is ${nick(e.home)} vs ${nick(e.away)} going?`) };
  }

  // Team / player questions
  const player = findPlayer(q);
  if (player) {
    const lines = LINES.filter((l) => l.player === player);
    const pp = picks({ books }).filter((p) => p.player === player);
    const ev = eventById[lines[0].eventId];
    const cards = pp.length ? pp.map((p) => toCard(p)) : lines.slice(0, 2).map((l) => { const best = bestPrices(l, books); const fair = fairProbs(l); const i = fair[0] >= fair[1] ? 0 : 1; return { kind: 'line', title: `${player} ${l.outcomes[i]} ${l.stat}`, event: `${ev.away} @ ${ev.home}`, eventId: ev.id, sport: l.sport, market: l.market, legs: best[i] ? [{ outcome: l.outcomes[i], ...best[i] }] : [], edge: best[i] ? evFn(fair[i], best[i].price) : null, lineId: l.id }; });
    const p = pp[0];
    return { text: p ? `Yes — the model likes **${p.selection}** (grade **${p.grade}**). ${p.projection.text}, model ${pctS(p.modelProb)} vs market ${pctS(p.marketProb)}. Best price ${fmtAmerican(p.bestPrice)} at ${bookById[p.bestBook].name}.\n\nWhy: ${p.reasons.slice(0, 3).join('; ')}.`
      : `${player} (${ev.away} @ ${ev.home}): the model is close to the market on his props right now, so no graded play. Lines below show the fairer side at the best price.`, cards, followUps: [`${nick(ev.home)} vs ${nick(ev.away)} prediction`, 'Top AI picks today', 'Best +EV bet'] };
  }
  const evs = findTeamEvents(q);
  if (evs.length) {
    const e = evs[0];
    if (e.live) {
      const la = liveAnalysis(e.id, { books });
      return { text: `**${e.away} @ ${e.home}** is live (${e.clock}, ${e.score.away}-${e.score.home}). ${nick(e.home)} win probability **${pctS(e.homeProb, 0)}**; projected final ${la.projected.text}. ${la.commentary.at(-1)?.text || ''}`,
        cards: la.suggestions.slice(0, 3).map((o) => toCard(o)), followUps: ['Show live +EV', 'Best arb right now'] };
    }
    const pp = picks({ books }).filter((p) => p.eventId === e.id);
    const ml = LINES.find((l) => l.eventId === e.id && l.market === 'Moneyline');
    const fair = fairProbs(ml);
    const team = [e.home, e.away].find((t) => ql.includes(nick(t).toLowerCase()) || ql.includes(t.toLowerCase())) || e.home;
    const top = pp[0];
    const intro = `**${e.away} @ ${e.home}** (${e.sport}, ${new Date(e.start).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}). Market makes ${nick(e.home)} ${pctS(fair[0], 0)} to win.`;
    const verdict = top
      ? (top.outcome.includes(team) || top.selection.includes(nick(team))
        ? ` The model agrees with a bet on the ${nick(team)}: **${top.selection}** grades **${top.grade}** at ${fmtAmerican(top.bestPrice)} (${bookById[top.bestBook].name}), ${pctS(top.edge, 1)} edge. Projected ${top.projection.text}.`
        : ` Best play in this game is **${top.selection}** (grade **${top.grade}**, ${pctS(top.edge, 1)} edge at ${fmtAmerican(top.bestPrice)} on ${bookById[top.bestBook].name}). Projected ${top.projection.text}.`)
      : ' The model is in line with the market here — no graded play.';
    return { text: intro + verdict + (top ? `\n\nWhy: ${top.reasons.slice(0, 3).join('; ')}.` : ''), cards: pp.slice(0, 4).map((p) => toCard(p)), followUps: ['Parlay ideas', 'What are the sharps on?', 'Top AI picks today'] };
  }

  if (/pick|tonight|today|best bet|lock|who (should|to) bet|recommend/.test(ql)) {
    const sp = ['NFL', 'NBA', 'NHL', 'NCAAF', 'MLB', 'EPL'].find((s) => ql.includes(s.toLowerCase())) || 'All';
    const pp = topPicks(5, { sport: sp, books });
    const rec = record();
    return { text: `Top AI picks${sp !== 'All' ? ` in ${sp}` : ''} today. Our model is **${rec.overall.units >= 0 ? '+' : ''}${rec.overall.units.toFixed(1)}u** (${pctS(rec.overall.roi)} ROI) over the last ${rec.overall.bets} graded picks. Leading play: **${pp[0]?.selection}** (${pp[0]?.grade}) — ${pp[0]?.projection.text}.`, cards: pp.map((p) => toCard(p)), followUps: ['Parlay ideas', 'Best +EV bet', 'Show the AI record'] };
  }
  if (/record|track record|roi|results|how (have|are) (you|the picks)/.test(ql)) {
    const rec = record();
    const bestG = [...rec.byGrade].sort((a, b) => b.roi - a.roi)[0];
    const bestS = [...rec.bySport].sort((a, b) => b.roi - a.roi)[0];
    return { text: `AI picks record: **${rec.overall.wins}-${rec.overall.losses}** (${pctS(rec.overall.winRate)}), **${rec.overall.units >= 0 ? '+' : ''}${rec.overall.units.toFixed(1)} units**, ${pctS(rec.overall.roi)} ROI. Last 7 days: ${rec.last7.units >= 0 ? '+' : ''}${rec.last7.units.toFixed(1)}u. Strongest grade: ${bestG.key} (${pctS(bestG.roi)} ROI). Strongest sport: ${bestS.key} (${pctS(bestS.roi)} ROI).`, cards: [], followUps: ['Top AI picks today', 'Parlay ideas'] };
  }
  if (/should i bet|bet on|worth/.test(ql)) {
    return { text: 'Tell me the team or player and I\'ll check it against the model and every book\'s price. Meanwhile, here are today\'s strongest plays:', cards: topPicks(3, { books }).map((p) => toCard(p)), followUps: ['Lakers tonight', 'Top AI picks today'] };
  }
  return { text: 'I can find arbs, +EV bets, middles, AI picks, sharp action, promos, live game edges and prediction-market picks — or break down any team or player. Try one of these:', cards: [], followUps: ['Best arb right now', 'Best +EV bet', 'What are the sharps on?', `Best promo in ${state}`, 'Parlay ideas', 'Prediction market picks'] };
}

export const SUGGESTED = ['Best arb right now', 'Best +EV bet', 'Top AI picks today', 'What are the sharps on?', 'Best promo in NJ', 'Lakers tonight', 'Parlay ideas', 'Prediction market picks', 'Explain CLV', 'Explain middles'];
