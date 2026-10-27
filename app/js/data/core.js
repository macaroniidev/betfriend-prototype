// Sample market data: books, states, events and a live-ticking odds board.
// Everything here is generated from a seeded RNG so the prototype is stable between reloads.
// Real feeds replace this through adapter.js; nothing else imports this file directly.

import { probToAmerican } from '../lib/odds.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export const BOOKS = [
  { id: 'dk', name: 'DraftKings', short: 'DK', color: '#53d337', type: 'sportsbook', vig: 0.045 },
  { id: 'fd', name: 'FanDuel', short: 'FD', color: '#1493ff', type: 'sportsbook', vig: 0.042 },
  { id: 'mgm', name: 'BetMGM', short: 'MGM', color: '#c5a562', type: 'sportsbook', vig: 0.05 },
  { id: 'czr', name: 'Caesars', short: 'CZR', color: '#0d4d3f', type: 'sportsbook', vig: 0.05 },
  { id: 'espn', name: 'ESPN BET', short: 'ESPN', color: '#e03a3e', type: 'sportsbook', vig: 0.048 },
  { id: 'fan', name: 'Fanatics', short: 'FAN', color: '#0047bb', type: 'sportsbook', vig: 0.046 },
  { id: 'br', name: 'BetRivers', short: 'BR', color: '#1b365d', type: 'sportsbook', vig: 0.052 },
  { id: 'hr', name: 'Hard Rock Bet', short: 'HR', color: '#7b2cbf', type: 'sportsbook', vig: 0.047 },
  { id: 'b365', name: 'bet365', short: '365', color: '#027b5b', type: 'sportsbook', vig: 0.04 },
  { id: 'fliff', name: 'Fliff', short: 'FLF', color: '#ff7a00', type: 'sportsbook', vig: 0.055 },
  { id: 'circa', name: 'Circa Sports', short: 'CIR', color: '#8a8f98', type: 'sharp', vig: 0.025 },
  { id: 'novig', name: 'Novig', short: 'NVG', color: '#00b386', type: 'exchange', vig: 0.012 },
  { id: 'px', name: 'ProphetX', short: 'PX', color: '#5a3ff2', type: 'exchange', vig: 0.015 },
  { id: 'pp', name: 'PrizePicks', short: 'PP', color: '#6f2dbd', type: 'dfs', vig: 0.06 },
  { id: 'ud', name: 'Underdog', short: 'UD', color: '#f2c200', type: 'dfs', vig: 0.06 },
  { id: 'kalshi', name: 'Kalshi', short: 'KAL', color: '#00c08b', type: 'prediction', vig: 0.02 },
  { id: 'poly', name: 'Polymarket', short: 'POLY', color: '#2e5cff', type: 'prediction', vig: 0.015 },
];
export const SPORTSBOOKS = BOOKS.filter((b) => b.type === 'sportsbook');
export const SHARP_REFS = ['circa', 'novig', 'px'];
export const bookById = Object.fromEntries(BOOKS.map((b) => [b.id, b]));

export const STATES = [
  ['AZ', 'Arizona'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['NJ', 'New Jersey'], ['NY', 'New York'], ['NC', 'North Carolina'], ['OH', 'Ohio'], ['PA', 'Pennsylvania'], ['TN', 'Tennessee'],
  ['VA', 'Virginia'], ['WY', 'Wyoming'], ['DC', 'Washington DC'], ['AZ2', 'Other'],
].slice(0, 21).map(([code, name]) => ({ code, name }));

const TEAMS = {
  NFL: ['Kansas City Chiefs', 'Buffalo Bills', 'Philadelphia Eagles', 'Detroit Lions', 'Baltimore Ravens', 'San Francisco 49ers',
    'Dallas Cowboys', 'Green Bay Packers', 'Cincinnati Bengals', 'Houston Texans', 'Miami Dolphins', 'Los Angeles Chargers',
    'Minnesota Vikings', 'Pittsburgh Steelers', 'Seattle Seahawks', 'Tampa Bay Buccaneers'],
  NBA: ['Boston Celtics', 'Denver Nuggets', 'Oklahoma City Thunder', 'New York Knicks', 'Milwaukee Bucks', 'Minnesota Timberwolves',
    'Dallas Mavericks', 'Los Angeles Lakers', 'Phoenix Suns', 'Cleveland Cavaliers', 'Golden State Warriors', 'Miami Heat',
    'Indiana Pacers', 'Sacramento Kings'],
  NHL: ['Florida Panthers', 'Edmonton Oilers', 'New York Rangers', 'Dallas Stars', 'Colorado Avalanche', 'Vegas Golden Knights',
    'Toronto Maple Leafs', 'Carolina Hurricanes', 'Winnipeg Jets', 'Boston Bruins'],
  NCAAF: ['Georgia Bulldogs', 'Ohio State Buckeyes', 'Texas Longhorns', 'Oregon Ducks', 'Alabama Crimson Tide', 'Penn State Nittany Lions',
    'Notre Dame Fighting Irish', 'Michigan Wolverines'],
  MLB: ['Los Angeles Dodgers', 'New York Yankees'],
  EPL: ['Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Tottenham Hotspur', 'Newcastle United'],
};
// Players by team, with NFL role so props match the player.
const ROSTERS = {
  'Boston Celtics': ['Jaylen Brown', 'Derrick White'], 'Denver Nuggets': ['Nikola Jokic', 'Jamal Murray'],
  'Oklahoma City Thunder': ['Shai Gilgeous-Alexander', 'Jalen Williams'], 'New York Knicks': ['Jalen Brunson', 'Karl-Anthony Towns'],
  'Milwaukee Bucks': ['Giannis Antetokounmpo'], 'Minnesota Timberwolves': ['Anthony Edwards', 'Julius Randle'],
  'Dallas Mavericks': ['Anthony Davis', 'Cooper Flagg'], 'Los Angeles Lakers': ['Luka Doncic', 'LeBron James'],
  'Phoenix Suns': ['Devin Booker'], 'Cleveland Cavaliers': ['Donovan Mitchell', 'Evan Mobley'], 'Golden State Warriors': ['Stephen Curry', 'Jimmy Butler'],
  'Miami Heat': ['Bam Adebayo', 'Tyler Herro'], 'Indiana Pacers': ['Pascal Siakam'], 'Sacramento Kings': ['Domantas Sabonis', 'Zach LaVine'],
  'Kansas City Chiefs': [['Patrick Mahomes', 'QB'], ['Travis Kelce', 'WR']], 'Buffalo Bills': [['Josh Allen', 'QB'], ['James Cook', 'RB']],
  'Philadelphia Eagles': [['Jalen Hurts', 'QB'], ['Saquon Barkley', 'RB'], ['A.J. Brown', 'WR']], 'Detroit Lions': [['Jared Goff', 'QB'], ['Amon-Ra St. Brown', 'WR'], ['Jahmyr Gibbs', 'RB']],
  'Baltimore Ravens': [['Lamar Jackson', 'QB'], ['Derrick Henry', 'RB']], 'San Francisco 49ers': [['Brock Purdy', 'QB'], ['Christian McCaffrey', 'RB']],
  'Dallas Cowboys': [['Dak Prescott', 'QB'], ['CeeDee Lamb', 'WR']], 'Green Bay Packers': [['Jordan Love', 'QB'], ['Josh Jacobs', 'RB']],
  'Cincinnati Bengals': [['Joe Burrow', 'QB'], ["Ja'Marr Chase", 'WR']], 'Houston Texans': [['C.J. Stroud', 'QB'], ['Nico Collins', 'WR']],
  'Miami Dolphins': [['Tua Tagovailoa', 'QB'], ['Tyreek Hill', 'WR']], 'Los Angeles Chargers': [['Justin Herbert', 'QB'], ['Ladd McConkey', 'WR']],
  'Minnesota Vikings': [['Justin Jefferson', 'WR']], 'Pittsburgh Steelers': [['DK Metcalf', 'WR']],
  'Seattle Seahawks': [['Jaxon Smith-Njigba', 'WR']], 'Tampa Bay Buccaneers': [['Baker Mayfield', 'QB'], ['Mike Evans', 'WR']],
  'Florida Panthers': ['Matthew Tkachuk', 'Aleksander Barkov'], 'Edmonton Oilers': ['Connor McDavid', 'Leon Draisaitl'], 'New York Rangers': ['Artemi Panarin'],
  'Dallas Stars': ['Jason Robertson'], 'Colorado Avalanche': ['Nathan MacKinnon', 'Cale Makar'], 'Vegas Golden Knights': ['Jack Eichel'],
  'Toronto Maple Leafs': ['Auston Matthews', 'William Nylander'], 'Carolina Hurricanes': ['Sebastian Aho'], 'Winnipeg Jets': ['Kyle Connor'], 'Boston Bruins': ['David Pastrnak'],
};
const ROLE_STATS = { QB: ['Passing Yards', 'Rushing Yards', 'Anytime TD'], WR: ['Receiving Yards', 'Receptions', 'Anytime TD'], RB: ['Rushing Yards', 'Receptions', 'Anytime TD'] };
const rosterFor = (ev) => [...(ROSTERS[ev.home] || []), ...(ROSTERS[ev.away] || [])].map((p) => (Array.isArray(p) ? p : [p, null]));
export const teamOfPlayer = Object.fromEntries(Object.entries(ROSTERS).flatMap(([team, ps]) => ps.map((p) => [Array.isArray(p) ? p[0] : p, team])));
const PROP_MARKETS = {
  NBA: [['Points', [18.5, 34.5]], ['Rebounds', [4.5, 12.5]], ['Assists', [3.5, 9.5]], ['Threes', [1.5, 4.5]], ['Pts+Reb+Ast', [28.5, 48.5]]],
  NFL: [['Passing Yards', [224.5, 289.5]], ['Rushing Yards', [44.5, 99.5]], ['Receiving Yards', [49.5, 94.5]], ['Receptions', [3.5, 7.5]], ['Anytime TD', [0.5, 0.5]]],
  NHL: [['Shots on Goal', [2.5, 4.5]], ['Points', [0.5, 1.5]]],
};

const HOUR = 3600e3;
export const SPORTS = ['NFL', 'NBA', 'NHL', 'NCAAF', 'MLB', 'EPL'];

function buildEvents() {
  const r = rng(20261027);
  const now = Date.now();
  const events = [];
  let id = 1;
  for (const sport of SPORTS) {
    const teams = [...TEAMS[sport]];
    const n = Math.floor(teams.length / 2);
    for (let i = 0; i < n; i++) {
      const home = teams.splice(Math.floor(r() * teams.length), 1)[0];
      const away = teams.splice(Math.floor(r() * teams.length), 1)[0];
      const live = i < Math.max(1, Math.round(n * 0.3)) && sport !== 'NCAAF';
      const start = live ? now - (0.4 + r()) * HOUR : now + (1 + r() * 96) * HOUR;
      const homeStrength = 0.3 + r() * 0.4;
      events.push({
        id: `e${id++}`, sport, home, away, start, live,
        homeProb: homeStrength,
        score: live ? { home: Math.floor(r() * 24), away: Math.floor(r() * 24) } : null,
        clock: live ? liveClock(sport, r) : null,
      });
    }
  }
  return events.sort((a, b) => a.start - b.start);
}
function liveClock(sport, r) {
  const p = 1 + Math.floor(r() * (sport === 'NBA' || sport === 'NFL' ? 4 : 3));
  const label = sport === 'NBA' || sport === 'NFL' ? `Q${p}` : sport === 'NHL' ? `P${p}` : sport === 'MLB' ? `${['Top', 'Bot'][p % 2]} ${p + 3}` : `${p * 25}'`;
  return `${label} ${Math.floor(r() * 12)}:${String(Math.floor(r() * 60)).padStart(2, '0')}`;
}

export const EVENTS = buildEvents();
export const eventById = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// ---------- odds board ----------
// A "line" is one market at one point (e.g. Celtics -4.5 spread). Each line has 2 (or 3) outcomes
// with a fair probability and a price per book.

function priceFor(r, book, fair, n, skew) {
  // Spread the vig over outcomes, add noise, and sometimes a stale/soft price that creates edges.
  const vig = book.vig * (0.7 + r() * 0.5);
  let p = fair * (1 + vig) + (r() - 0.5) * 0.012;
  if (r() < 0.045 && book.type === 'sportsbook') p -= 0.018 + r() * 0.022; // soft line
  p += skew;
  p = Math.min(0.97, Math.max(0.03, p));
  return probToAmerican(p);
}

function buildLines() {
  const r = rng(777);
  const lines = [];
  let lid = 1;
  for (const ev of EVENTS) {
    const books = BOOKS.filter((b) => b.type === 'sportsbook' || b.type === 'sharp' || b.type === 'exchange');
    const add = (market, label, outcomes, point = null, player = null, extra = {}) => {
      const prices = {};
      for (const b of books) {
        if (player && b.type === 'sharp' && r() < 0.4) continue;
        if (r() < 0.12 && b.type === 'sportsbook') continue; // not every book posts every line
        prices[b.id] = outcomes.map((o) => priceFor(r, b, o.fair, outcomes.length, 0));
      }
      lines.push({ id: `l${lid++}`, eventId: ev.id, sport: ev.sport, market, label, point, player,
        outcomes: outcomes.map((o) => o.name), fair: outcomes.map((o) => o.fair), prices, live: ev.live, ...extra });
    };
    const ph = ev.homeProb;
    if (ev.sport === 'EPL') {
      const draw = 0.24 + r() * 0.06;
      add('Moneyline', '1X2', [{ name: ev.home, fair: ph * (1 - draw) }, { name: 'Draw', fair: draw }, { name: ev.away, fair: (1 - ph) * (1 - draw) }]);
    } else {
      add('Moneyline', 'Moneyline', [{ name: ev.home, fair: ph }, { name: ev.away, fair: 1 - ph }]);
    }
    const spreadUnit = { NFL: 13, NBA: 14, NHL: 1.5, NCAAF: 20, MLB: 1.5, EPL: 1 }[ev.sport];
    const sp = ev.sport === 'NHL' || ev.sport === 'MLB' ? (ph > 0.5 ? -1.5 : 1.5) : Math.round(((0.5 - ph) * spreadUnit * 2) * 2) / 2 || -0.5;
    add('Spread', `Spread ${sp > 0 ? '+' : ''}${sp}`, [{ name: `${ev.home} ${sp > 0 ? '+' : ''}${sp}`, fair: 0.5 }, { name: `${ev.away} ${-sp > 0 ? '+' : ''}${-sp}`, fair: 0.5 }], sp);
    const totBase = { NFL: 45.5, NBA: 224.5, NHL: 6.5, NCAAF: 52.5, MLB: 8.5, EPL: 2.5 }[ev.sport];
    const tot = totBase + Math.round((r() - 0.5) * (ev.sport === 'NBA' ? 20 : 4)) ;
    add('Total', `Total ${tot}`, [{ name: `Over ${tot}`, fair: 0.5 }, { name: `Under ${tot}`, fair: 0.5 }], tot);
    // Alternate totals so middles exist (books disagree on the number).
    if (ev.sport !== 'EPL') {
      const step = ev.sport === 'NBA' ? 1.5 : ev.sport === 'NFL' || ev.sport === 'NCAAF' ? 1 : 0.5;
      add('Total', `Total ${tot + step}`, [{ name: `Over ${tot + step}`, fair: 0.46 }, { name: `Under ${tot + step}`, fair: 0.54 }], tot + step);
    }
    const props = PROP_MARKETS[ev.sport];
    if (props) {
      const roster = rosterFor(ev);
      const used = new Set();
      for (let k = 0; k < (roster.length ? 6 : 0) && used.size < 4; k++) {
        const [player, role] = pick(r, roster);
        const fit = role ? props.filter(([st]) => ROLE_STATS[role].includes(st)) : props;
        let [stat, [lo, hi]] = pick(r, fit);
        if (role === 'QB' && stat === 'Rushing Yards') [lo, hi] = [12.5, 44.5];
        if (role === 'RB' && stat === 'Receptions') [lo, hi] = [1.5, 4.5];
        if (used.has(`${player}|${stat}`)) continue; // one line per player and stat
        used.add(`${player}|${stat}`);
        const pt = Math.round((lo + r() * (hi - lo)) * 2) / 2;
        const point = Number.isInteger(pt) ? pt + 0.5 : pt;
        const fo = 0.42 + r() * 0.16;
        add('Player Prop', `${player} ${stat}`, [{ name: `Over ${point}`, fair: fo }, { name: `Under ${point}`, fair: 1 - fo }], point, player, { stat });
        // Some books hang a slightly higher number on yardage and points props, which creates prop middles.
        if (stat !== 'Anytime TD' && r() < 0.35) {
          const alt = point + (/Yards/.test(stat) ? 4 : 1);
          add('Player Prop', `${player} ${stat}`, [{ name: `Over ${alt}`, fair: fo - 0.06 }, { name: `Under ${alt}`, fair: 1 - fo + 0.06 }], alt, player, { stat });
        }
      }
    }
  }
  return lines;
}

export const LINES = buildLines();

// ---------- live ticking ----------
const listeners = new Set();
let tickN = 0;
export function onTick(cb) { listeners.add(cb); return () => listeners.delete(cb); }

setInterval(() => {
  tickN++;
  const r = rng(1000 + tickN);
  for (const ev of EVENTS) {
    if (!ev.live) continue;
    if (r() < 0.25) ev.score[r() < ev.homeProb ? 'home' : 'away'] += ev.sport === 'NBA' ? 2 + Math.floor(r() * 2) : ev.sport === 'NFL' ? pick(r, [3, 7]) : 1;
    ev.homeProb = Math.min(0.95, Math.max(0.05, ev.homeProb + (r() - 0.5) * 0.04));
  }
  for (const line of LINES) {
    if (!line.live) continue;
    const ev = eventById[line.eventId];
    if (line.market === 'Moneyline' && line.fair.length === 2) line.fair = [ev.homeProb, 1 - ev.homeProb];
    for (const bid of Object.keys(line.prices)) {
      if (r() < 0.35) {
        const b = bookById[bid];
        line.prices[bid] = line.fair.map((f) => priceFor(r, b, f, line.fair.length, 0));
      }
    }
  }
  // Pre-match lines drift slowly too.
  for (let i = 0; i < 25; i++) {
    const line = pick(r, LINES);
    const bid = pick(r, Object.keys(line.prices));
    line.prices[bid] = line.fair.map((f) => priceFor(r, bookById[bid], f, line.fair.length, 0));
  }
  listeners.forEach((cb) => cb(tickN));
}, 4000);
