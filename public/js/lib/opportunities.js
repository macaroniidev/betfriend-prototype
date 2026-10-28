// Opportunity engine: turns odds lines into arbs, +EV bets, middles and low holds.
// Every tool writes the same opportunity shape so the Daily Card can rank them together:
// { id, kind, eventId, sport, market, label, legs:[{outcome, book, price}], edge, fairProb?, live, meta }

import { impliedProb, devig, ev as evFn, hold } from './odds.js';
import { bookById, SHARP_REFS, eventById } from '../data/core.js';

const betBooks = (line, books) => Object.keys(line.prices).filter((b) => bookById[b].type === 'sportsbook' && (!books || books.includes(b)));

/** Best price per outcome among the user's books. */
export function bestPrices(line, books) {
  return line.outcomes.map((_, i) => {
    let best = null;
    for (const b of betBooks(line, books)) {
      const p = line.prices[b][i];
      if (best === null || p > best.price) best = { book: b, price: p };
    }
    return best;
  });
}

/** Fair probability from sharp references (Circa/Novig/ProphetX), falling back to market consensus. */
export function fairProbs(line, refs = SHARP_REFS, method = devig) {
  const avail = refs.filter((r) => line.prices[r]);
  const src = avail.length ? avail : Object.keys(line.prices);
  const sums = line.outcomes.map(() => 0);
  for (const b of src) {
    const fp = method(line.prices[b].map(impliedProb));
    fp.forEach((p, i) => (sums[i] += p));
  }
  return sums.map((s) => s / src.length);
}

export function findArbs(lines, { books, live } = {}) {
  const out = [];
  for (const line of lines) {
    if (live !== undefined && line.live !== live) continue;
    const best = bestPrices(line, books);
    if (best.some((b) => !b)) continue;
    const h = hold(best.map((b) => b.price));
    if (h < 0) {
      out.push(mk('arb', line, best.map((b, i) => ({ outcome: line.outcomes[i], ...b })), -h / (1 + h)));
    }
  }
  return out.sort((a, b) => b.edge - a.edge);
}

export function findLowHolds(lines, { books, live, maxHold = 0.02 } = {}) {
  const out = [];
  for (const line of lines) {
    if (live !== undefined && line.live !== live) continue;
    const best = bestPrices(line, books);
    if (best.some((b) => !b)) continue;
    const h = hold(best.map((b) => b.price));
    if (h >= 0 && h <= maxHold) out.push(mk('lowhold', line, best.map((b, i) => ({ outcome: line.outcomes[i], ...b })), -h, { hold: h }));
  }
  return out.sort((a, b) => b.edge - a.edge);
}

export function findEV(lines, { books, live, minEdge = 0.01, refs, method } = {}) {
  const out = [];
  for (const line of lines) {
    if (live !== undefined && line.live !== live) continue;
    const fair = fairProbs(line, refs, method);
    for (const b of betBooks(line, books)) {
      line.prices[b].forEach((price, i) => {
        const e = evFn(fair[i], price);
        if (e >= minEdge) out.push(mk('ev', line, [{ outcome: line.outcomes[i], book: b, price }], e, { fairProb: fair[i] }));
      });
    }
  }
  return out.sort((a, b) => b.edge - a.edge);
}

/** Middles: Over at a low number at one book + Under at a higher number elsewhere (or spread equivalents). */
export function findMiddles(lines, { books, live } = {}) {
  const out = [];
  const byKey = {};
  for (const l of lines) {
    if (l.market !== 'Total' && l.market !== 'Player Prop') continue;
    if (live !== undefined && l.live !== live) continue;
    const key = `${l.eventId}|${l.market}|${l.player || ''}|${l.stat || ''}`;
    (byKey[key] ||= []).push(l);
  }
  for (const group of Object.values(byKey)) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.point - b.point);
    const lo = group[0], hi = group[group.length - 1];
    if (hi.point <= lo.point) continue;
    const over = bestPrices(lo, books)[0];
    const under = bestPrices(hi, books)[1];
    if (!over || !under) continue;
    const cost = impliedProb(over.price) + impliedProb(under.price) - 1; // worst-case loss share
    const width = hi.point - lo.point;
    out.push(mk('middle', lo, [
      { outcome: lo.outcomes[0], book: over.book, price: over.price },
      { outcome: hi.outcomes[1], book: under.book, price: under.price },
    ], -cost, { width, low: lo.point, high: hi.point, middleProb: middleProb(lo, width) }));
  }
  return out.sort((a, b) => b.meta.width - a.meta.width || b.edge - a.edge);
}

/** Chance the result lands inside the window, by how dense scores are for that stat. */
function middleProb(line, width) {
  const label = line.label || '';
  const perUnit = /Yards/.test(label) ? 0.012 : line.market === 'Player Prop' ? 0.09 : line.sport === 'NBA' || line.sport === 'NCAAB' ? 0.022 : 0.03;
  return Math.min(0.3, perUnit * width);
}

function mk(kind, line, legs, edge, meta = {}) {
  const e = eventById[line.eventId];
  return {
    id: `${kind}-${line.id}-${legs.map((l) => l.book).join('-')}`,
    kind, lineId: line.id, eventId: line.eventId, sport: line.sport, market: line.market, label: line.label,
    event: `${e.away} @ ${e.home}`, start: e.start, live: line.live, legs, edge, meta,
  };
}
