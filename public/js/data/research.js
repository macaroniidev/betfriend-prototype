// Player prop research sample data: game logs, hit rates and splits for every player with a prop
// on today's board (core LINES). Player averages are anchored to the posted lines, so the research
// lines up with the odds shown everywhere else.

import { rng, pick, LINES, EVENTS, eventById } from './core.js';
import { bestPrices, fairProbs } from '../lib/opportunities.js';
import { ev as evFn } from '../lib/odds.js';

const STATS = {
  NBA: { Points: [24, 6.5], Rebounds: [7, 2.6], Assists: [5.5, 2.2], Threes: [2.6, 1.4] },
  NFL: { 'Passing Yards': [250, 52], 'Rushing Yards': [66, 26], 'Receiving Yards': [68, 28], Receptions: [5.4, 2], 'Anytime TD': [0.55, 0] },
  NHL: { 'Shots on Goal': [3.4, 1.5], Points: [1.05, 0] },
};
const DERIVED = { 'Pts+Reb+Ast': ['Points', 'Rebounds', 'Assists'] };
const COUNT_STATS = new Set(['Anytime TD', 'Points|NHL', 'Threes', 'Receptions', 'Shots on Goal', 'Rebounds', 'Assists']);
const TEAMMATES = {
  NBA: ['the starting center', 'the No. 2 scorer', 'the starting point guard'],
  NFL: ['the WR1', 'the starting RB', 'the starting LT'],
  NHL: ['the top-line center', 'the PP1 defenseman', 'the No. 1 winger'],
};

const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const normal = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const poisson = (r, lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
const statsFor = (sport) => [...Object.keys(STATS[sport] || {}), ...(sport === 'NBA' ? Object.keys(DERIVED) : [])];

/** Today's player props (one per line), with event context. */
export function props() {
  return LINES.filter((l) => l.market === 'Player Prop').map((l) => {
    const ev = eventById[l.eventId];
    const t = team(l.player);
    return { lineId: l.id, eventId: l.eventId, sport: l.sport, player: l.player, stat: l.stat, point: l.point, team: t.team, opponent: t.opponent, home: t.home, live: l.live, start: ev.start };
  });
}

/** Players with props today, with their sport and team. */
export function players() {
  const seen = new Map();
  for (const p of props()) if (!seen.has(p.player)) seen.set(p.player, { player: p.player, sport: p.sport, team: p.team, opponent: p.opponent, home: p.home, eventId: p.eventId });
  return [...seen.values()].sort((a, b) => a.player.localeCompare(b.player));
}

const teamCache = {};
/** Assign a player to one side of their (first) event today, deterministically. */
export function team(player) {
  if (teamCache[player]) return teamCache[player];
  const line = LINES.find((l) => l.player === player);
  if (!line) return { team: '', opponent: '', home: true };
  const ev = eventById[line.eventId];
  const home = hashStr(player) % 2 === 0;
  return (teamCache[player] = { team: home ? ev.home : ev.away, opponent: home ? ev.away : ev.home, home, eventId: ev.id, sport: ev.sport });
}

const meanCache = {};
/** Per-stat mean & sd for a player, anchored to posted lines (fair Over prob shifts the mean). */
function profile(player) {
  if (meanCache[player]) return meanCache[player];
  const t = team(player);
  const sport = t.sport;
  const r = rng(hashStr(player + '|profile'));
  const base = STATS[sport] || {};
  const out = {};
  for (const [stat, [m, sd]] of Object.entries(base)) out[stat] = { mean: m * (0.75 + r() * 0.5), sd: sd || 0 };
  const myLines = LINES.filter((l) => l.player === player);
  const anchored = {};
  for (const l of myLines) {
    if (DERIVED[l.stat]) continue;
    const fo = fairProbs(l)[0];
    const sd = out[l.stat]?.sd || 0;
    const z = (fo - 0.5) * 2.6 + (r() - 0.5) * 0.5;
    (anchored[l.stat] ||= []).push(Math.max(0.2, l.point + z * (sd || Math.max(0.6, l.point * 0.6))));
  }
  for (const [stat, ms] of Object.entries(anchored)) out[stat] = { mean: ms.reduce((a, b) => a + b, 0) / ms.length, sd: out[stat]?.sd || 0 };
  for (const l of myLines) {
    if (!DERIVED[l.stat]) continue;
    const parts = DERIVED[l.stat];
    const free = parts.filter((s) => !anchored[s]);
    if (!free.length) continue;
    const fixed = parts.filter((s) => anchored[s]).reduce((a, s) => a + out[s].mean, 0);
    const freeSum = free.reduce((a, s) => a + out[s].mean, 0);
    const target = l.point + (fairProbs(l)[0] - 0.5) * 2.6 * 7.5;
    const k = Math.max(0.4, (target - fixed) / freeSum);
    free.forEach((s) => { out[s].mean *= k; });
  }
  return (meanCache[player] = out);
}

function draw(r, player, stat, sport, mean, sd) {
  if (stat === 'Anytime TD') return poisson(r, mean);
  if (sport === 'NHL' && stat === 'Points') return poisson(r, mean);
  if (COUNT_STATS.has(stat)) return Math.max(0, Math.round(mean + normal(r) * sd));
  return Math.max(0, Math.round(mean + normal(r) * sd));
}

const logCache = {};
/** Last 20 game logs (newest first): { date, opponent, home, minutes, withTeammate, stats: {stat: value} } */
export function playerLogs(player) {
  if (logCache[player]) return logCache[player];
  const t = team(player);
  const sport = t.sport;
  if (!sport) return [];
  const r = rng(hashStr(player + '|logs'));
  const prof = profile(player);
  const opps = [...new Set(EVENTS.filter((e) => e.sport === sport).flatMap((e) => [e.home, e.away]))].filter((x) => x !== t.team);
  const gap = sport === 'NFL' || sport === 'NCAAF' ? 7 : 2.2;
  const logs = Array.from({ length: 20 }, (_, k) => {
    const withTeammate = r() > 0.22;
    const home = r() < 0.5;
    const opponent = k === 6 || k === 15 ? t.opponent : pick(r, opps);
    const form = 1 + (r() - 0.5) * 0.12 + (withTeammate ? 0 : 0.07) + (home ? 0.025 : -0.025);
    const stats = {};
    for (const [stat, { mean, sd }] of Object.entries(prof)) stats[stat] = draw(r, player, stat, sport, mean * form, sd);
    if (sport === 'NBA') stats['Pts+Reb+Ast'] = stats.Points + stats.Rebounds + stats.Assists;
    const minutes = sport === 'NBA' ? Math.round(30 + r() * 9) : sport === 'NHL' ? Math.round(16 + r() * 7) : null;
    return { date: Date.now() - (k + 1) * gap * 86400e3, opponent, home, minutes, withTeammate, stats };
  });
  return (logCache[player] = logs);
}

export const statList = (player) => statsFor(team(player).sport);

/** Hit rate of the Over on `line` over the last `n` games. */
export function hitRate(player, stat, line, n = 20) {
  const logs = playerLogs(player).slice(0, n);
  const vals = logs.map((g) => g.stats[stat]).filter((v) => v !== undefined);
  const hits = vals.filter((v) => v > line).length;
  const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  const sorted = [...vals].sort((a, b) => a - b);
  return { hits, n: vals.length, rate: vals.length ? hits / vals.length : 0, avg, median: sorted[Math.floor(sorted.length / 2)] ?? 0, high: sorted[sorted.length - 1] ?? 0, low: sorted[0] ?? 0 };
}

/** Splits: home/away, vs today's opponent, with/without a key teammate. */
export function splits(player, stat, line) {
  const t = team(player);
  const logs = playerLogs(player);
  const mate = TEAMMATES[t.sport]?.[hashStr(player) % 3] || 'key teammate';
  const make = (label, rows) => {
    const vals = rows.map((g) => g.stats[stat]);
    const hits = vals.filter((v) => v > line).length;
    return { label, n: vals.length, hits, rate: vals.length ? hits / vals.length : 0, avg: vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length) };
  };
  return [
    make('Home', logs.filter((g) => g.home)),
    make('Away', logs.filter((g) => !g.home)),
    make(`vs ${t.opponent}`, logs.filter((g) => g.opponent === t.opponent)),
    make(`With ${mate}`, logs.filter((g) => g.withTeammate)),
    make(`Without ${mate}`, logs.filter((g) => !g.withTeammate)),
  ];
}

/** Matchup notes for today's game. */
export function matchup(player, stat) {
  const t = team(player);
  const r = rng(hashStr(player + stat + '|mu'));
  const rank = 1 + Math.floor(r() * 30);
  const pace = 1 + Math.floor(r() * 30);
  const notes = [
    `${t.opponent} rank ${ordinal(rank)} in ${stat.toLowerCase()} allowed to this position over the last 10 games.`,
    t.sport === 'NBA' ? `Projected pace: ${ordinal(pace)} fastest matchup on today's slate.` : t.sport === 'NFL' ? `${t.opponent} defense ranks ${ordinal(pace)} in DVOA vs this position.` : `${t.opponent} allow ${(28 + r() * 8).toFixed(1)} shots per game (${ordinal(pace)}).`,
    `${t.home ? 'Home' : 'Road'} game; ${r() < 0.5 ? 'rested (2 days off)' : 'second game in a short week'}.`,
    `Projection: ${(profile(player)[stat]?.mean ?? (DERIVED[stat] ? DERIVED[stat].reduce((a, s) => a + profile(player)[s].mean, 0) : 0)).toFixed(1)} ${stat.toLowerCase()}.`,
  ];
  return { notes, oppRank: rank, projection: profile(player)[stat]?.mean ?? (DERIVED[stat] ? DERIVED[stat].reduce((a, s) => a + profile(player)[s].mean, 0) : null) };
}
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th'}`;

/** Market view for a prop line: best over/under, fair probs, edges. */
export function market(lineId, books) {
  const l = LINES.find((x) => x.id === lineId);
  if (!l) return null;
  const best = bestPrices(l, books);
  const fair = fairProbs(l);
  return { line: l, best, fair, edges: best.map((b, i) => (b ? evFn(fair[i], b.price) : null)) };
}
