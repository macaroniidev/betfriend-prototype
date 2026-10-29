// THE DATA ADAPTER. Every screen reads data only through `api`.
// To connect real feeds, replace the implementations behind these functions (keep the shapes);
// screens do not need to change. Sample generators live in ./core.js and the domain files.

import * as core from './core.js';
import * as opp from '../lib/opportunities.js';
import { tracker } from './tracker.js';
import * as promos from './promos.js';
import * as sharp from './sharp.js';
import * as bettors from './bettors.js';
import * as picks from './picks.js';
import * as prediction from './prediction.js';
import * as research from './research.js';

export const api = {
  source: 'sample', // 'sample' | 'live' once real feeds are connected

  // Reference data
  books: core.BOOKS,
  sportsbooks: core.SPORTSBOOKS,
  bookById: core.bookById,
  states: core.STATES,
  sports: core.SPORTS,
  events: () => core.EVENTS,
  eventById: (id) => core.eventById[id],

  // Odds board: lines with per-book prices. Filter: { sport, market, live, eventId }
  lines(filter = {}) {
    return core.LINES.filter((l) =>
      (!filter.sport || filter.sport === 'All' || l.sport === filter.sport) &&
      (!filter.market || filter.market === 'All' || l.market === filter.market) &&
      (filter.live === undefined || l.live === filter.live) &&
      (!filter.eventId || l.eventId === filter.eventId));
  },
  lineById: (id) => core.LINES.find((l) => l.id === id),

  // Opportunity engine (same shape for every tool so the Daily Card can rank them together)
  arbs: (f = {}) => opp.findArbs(api.lines(f), f),
  ev: (f = {}) => opp.findEV(api.lines(f), f),
  middles: (f = {}) => opp.findMiddles(api.lines(f), f),
  lowHolds: (f = {}) => opp.findLowHolds(api.lines(f), f),
  bestPrices: opp.bestPrices,
  fairProbs: opp.fairProbs,

  // Live updates: callback fires on every odds/score tick. Returns an unsubscribe function.
  // Ticks skip hidden tabs and stop while paused (one shared pause for every live screen).
  onTick: core.onTick,
  tickMs: core.TICK_MS,
  setPaused: core.setPaused,
  isPaused: core.isPaused,
  onPauseChange: core.onPauseChange,

  // Domain modules
  tracker,
  promos,
  sharp,
  bettors,
  picks,
  prediction,
  research,
};
