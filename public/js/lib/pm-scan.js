// Cross-venue prediction-market scanner (item C14 / 45). Pure functions over the market list from the data
// adapter (api.prediction.markets()), so a live venue feed with the same shapes works unchanged.
//
// Markets that describe the same outcome share a `key` (e.g. "ml-<event>"). For every key listed on two or
// more venues this returns one row: the cheapest YES and NO venue, how far the venues disagree, the
// combined cost of YES at one venue + NO at another (under 100¢ means both sides together pay more than
// they cost, before fees, if both orders fill) and the larger model edge of the two sides.

/**
 * scanMarkets(markets, { minVenues }) → [{
 *   key, title, category, sport, kind, live, closesAt, fair (0–1), venues: [{ venue, marketId, yes, no, volume24h }],
 *   cheapYes: { venue, marketId, yes }, cheapNo: { venue, marketId, no }, gap (¢ between the dearest and
 *   cheapest YES), both (¢: cheapest YES + cheapest NO on different venues, or null), bestSide 'YES'|'NO',
 *   bestEdge (fair − price for that side, 0–1), bestMarketId, volume24h (sum) }]
 */
export function scanMarkets(markets, { minVenues = 2 } = {}) {
  const groups = new Map();
  for (const m of markets) {
    if (!groups.has(m.key)) groups.set(m.key, []);
    groups.get(m.key).push(m);
  }
  const out = [];
  for (const [key, ms] of groups) {
    if (ms.length < minVenues) continue;
    const venues = ms.map((m) => ({ venue: m.venue, marketId: m.id, yes: m.yesPrice, no: m.noPrice, volume24h: m.volume24h }));
    const cheapYes = venues.reduce((a, b) => (b.yes < a.yes ? b : a));
    const cheapNo = venues.reduce((a, b) => (b.no < a.no ? b : a));
    const dearYes = venues.reduce((a, b) => (b.yes > a.yes ? b : a));
    // Both sides only count as a cross-venue pair when they sit on different venues.
    const noElsewhere = venues.filter((v) => v.venue !== cheapYes.venue).reduce((a, b) => (!a || b.no < a.no ? b : a), null);
    const yesElsewhere = venues.filter((v) => v.venue !== cheapNo.venue).reduce((a, b) => (!a || b.yes < a.yes ? b : a), null);
    const both = Math.min(noElsewhere ? cheapYes.yes + noElsewhere.no : Infinity, yesElsewhere ? yesElsewhere.yes + cheapNo.no : Infinity);
    const fair = ms[0].fairProb;
    const yesEdge = fair - cheapYes.yes / 100;
    const noEdge = (1 - fair) - cheapNo.no / 100;
    const yesBest = yesEdge >= noEdge;
    out.push({
      key, title: ms[0].title, category: ms[0].category, sport: ms[0].sport, kind: ms[0].kind, live: ms.some((m) => m.live), closesAt: ms[0].closesAt,
      fair, venues, cheapYes, cheapNo, gap: dearYes.yes - cheapYes.yes, both: Number.isFinite(both) ? both : null,
      bestSide: yesBest ? 'YES' : 'NO', bestEdge: yesBest ? yesEdge : noEdge, bestMarketId: yesBest ? cheapYes.marketId : cheapNo.marketId,
      volume24h: venues.reduce((s, v) => s + v.volume24h, 0),
    });
  }
  return out;
}

/** Filter scanner rows: category ('All' = any), minimum YES gap in ¢, only rows with a positive model edge. */
export function filterScan(rows, { category = 'All', minGap = 0, edgeOnly = false } = {}) {
  return rows.filter((r) => (category === 'All' || r.category === category) && r.gap >= minGap && (!edgeOnly || r.bestEdge > 0));
}
