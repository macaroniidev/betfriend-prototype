// Plain-English definitions for the betting jargon used across the app (EV, hold, Kelly, CLV, devig,
// units, ¢ …). One source for three places:
//   - ui.term(key)       an inline, focusable term in copy, drawers and facts labels (definition on hover,
//                        focus or tap, plus a link to the Glossary page)
//   - ui.termTitle(key)  the short definition as plain text, for title="" on table headings (no nested
//                        interactive elements inside sortable <th> buttons)
//   - the Glossary page  (#/glossary, item B12) lists every entry, grouped by `group`
//
// Keep definitions short, factual and honest: no "guaranteed", "risk-free" or "lock". `short` is one
// sentence (tooltips); `long` is optional extra detail for the Glossary page; `see` names related keys.

export const GLOSSARY = {
  // ---------- prices and odds ----------
  american: { term: 'American odds', group: 'Prices', short: '+150 means a $100 bet wins $150; -150 means you bet $150 to win $100.' },
  decimal: { term: 'Decimal odds', group: 'Prices', short: 'Total return per $1 staked, stake included: 2.50 returns $2.50 for every $1.' },
  implied: { term: 'Implied probability', group: 'Prices', short: 'The win chance a price implies once you ignore the book’s margin: -150 implies 60%.', see: ['vig'] },
  cents: { term: '¢ (cents) price', group: 'Prices', short: 'Prediction-market price per $1 contract: 40¢ pays $1 if it happens, so it implies about a 40% chance.', see: ['implied'] },
  fair: { term: 'Fair odds', group: 'Prices', short: 'The price with the book’s margin taken out, usually built from sharp books and exchanges.', see: ['devig', 'sharp'] },
  devig: { term: 'Devig', group: 'Prices', short: 'Removing the book’s margin from both sides of a market to estimate the true chance of each side.', long: 'Methods (multiplicative, additive, power) differ in how they spread the margin across favourites and underdogs.', see: ['vig', 'fair'] },
  vig: { term: 'Vig (juice)', group: 'Prices', short: 'The book’s built-in margin: why both sides of a market add up to more than 100%.', see: ['hold'] },
  hold: { term: 'Hold', group: 'Prices', short: 'How much a market keeps across both sides at the best prices. Low hold = cheap to bet both sides; negative hold = an arb.', see: ['vig', 'lowhold', 'arb'] },
  odds_format: { term: 'Odds format', group: 'Prices', short: 'How prices are shown: American (+150), decimal (2.50), implied % (40%) or cents (40¢). Change it in Bet sizing.' },

  // ---------- strategies ----------
  arb: { term: 'Arbitrage (arb)', group: 'Strategies', short: 'Betting every side of a market at different books so one leg pays more than you staked in total, if both legs fill at these prices.', long: 'Voided legs, limits and price moves before the second bet can change the result.', see: ['hold', 'hedged'] },
  middle: { term: 'Middle', group: 'Strategies', short: 'Two bets on different lines (e.g. Over 44.5 and Under 47.5) that can both win if the result lands in the gap. Usually costs a little when it misses.', see: ['ev'] },
  lowhold: { term: 'Low hold', group: 'Strategies', short: 'A two-sided bet that costs very little to place, used to clear playthrough or build VIP volume.', see: ['hold', 'playthrough'] },
  ev: { term: 'EV (expected value)', group: 'Strategies', short: 'What a bet is worth on average over many repeats. +EV means the price beats the fair odds; any single bet can still lose.', see: ['fair', 'kelly'] },
  hedge: { term: 'Hedge', group: 'Strategies', short: 'A bet on the other side that reduces or removes the risk of your first bet.' },
  boost: { term: 'Profit boost', group: 'Strategies', short: 'A book promo that raises the payout on one bet. Hedging the other side can turn it into a small, steadier profit.' },
  parlay: { term: 'Parlay', group: 'Strategies', short: 'One bet made of several legs; every leg must win for it to pay.' },

  // ---------- promos ----------
  bonus_bet: { term: 'Bonus bet', group: 'Promos', short: 'Site credit you can bet with: if it wins you keep the profit, not the stake.', see: ['conversion'] },
  conversion: { term: 'Conversion rate', group: 'Promos', short: 'How much cash you keep from a bonus bet after hedging it, as a share of its face value (e.g. 70%).' },
  no_sweat: { term: 'No-sweat bet', group: 'Promos', short: 'A cash bet that is refunded as a bonus bet if it loses.' },
  playthrough: { term: 'Playthrough (rollover)', group: 'Promos', short: 'How much you must bet before a bonus or deposit match can be withdrawn.', see: ['lowhold'] },
  deposit_match: { term: 'Deposit match', group: 'Promos', short: 'A bonus equal to part of your deposit, usually paid as bonus bets with playthrough.' },

  // ---------- sizing and results ----------
  kelly: { term: 'Kelly stake', group: 'Sizing', short: 'A bet size based on your edge and bankroll. Most bettors use a fraction (¼ Kelly) to keep swings smaller.', see: ['bankroll', 'ev'] },
  kelly_fraction: { term: 'Kelly fraction', group: 'Sizing', short: 'The share of the full Kelly stake you actually bet: ¼ Kelly bets a quarter of it.' },
  bankroll: { term: 'Bankroll', group: 'Sizing', short: 'The money you set aside for betting. Suggested stakes are sized from it.' },
  unit: { term: 'Unit', group: 'Sizing', short: 'Your standard bet size, often 1% of bankroll. Records in units compare bettors with different bankrolls.' },
  roi: { term: 'ROI', group: 'Sizing', short: 'Profit as a share of the money staked. For an arb, the profit if both legs fill divided by the total stake.' },
  clv: { term: 'CLV (closing line value)', group: 'Sizing', short: 'How your price compares with the final price before the game. Beating the close is a sign of real edge.', see: ['limit'] },
  limit: { term: 'Limited account', group: 'Sizing', short: 'A book capping how much you can bet, often after winning or beating the closing line.', see: ['clv'] },

  // ---------- markets and signals ----------
  sharp: { term: 'Sharp', group: 'Markets', short: 'A bettor or book with a long record of beating the closing line. Sharp prices are used to estimate fair odds.' },
  steam: { term: 'Volume spike', group: 'Markets', short: 'A sudden burst of money on one side at an exchange (Novig, ProphetX), often from sharp bettors.' },
  exchange: { term: 'Exchange', group: 'Markets', short: 'A market where bettors trade against each other instead of against a book (Novig, ProphetX).' },
  order_book: { term: 'Order book', group: 'Markets', short: 'The list of open bids (buy offers) and asks (sell offers) at each price in a prediction market.' },
  bid_ask: { term: 'Bid / Ask', group: 'Markets', short: 'Bid: the best price someone will pay. Ask: the best price someone will sell at. The gap is the spread.' },
  trailing_stop: { term: 'Trailing stop', group: 'Markets', short: 'An exit level that follows the price up and alerts you if it falls back by a set amount.' },
  signal: { term: 'Signal', group: 'Markets', short: 'A suggested bet from a model, a bettor or market activity. Signals can lose; size them small.' },

  // ---------- risk labels (ui.risk) ----------
  hedged: { term: 'Hedged · both sides', group: 'Risk labels', short: 'Profit is locked in if both legs fill at the shown prices. Voids, limits and price moves can change it.' },
  rollover: { term: 'Low-cost rollover', group: 'Risk labels', short: 'Costs a small, known amount on average; used to clear playthrough or earn rewards.' },
  edge: { term: 'Long-run edge · can lose', group: 'Risk labels', short: 'Worth more than it costs on average over many bets, but any single bet can lose.' },
  signal_risk: { term: 'Signal · can lose', group: 'Risk labels', short: 'Follows a model, a bettor or market money. It can lose; results vary bet to bet.' },
};

/** Entry for a key (case-insensitive, spaces/dashes as underscores), or null. */
export function lookup(key) {
  const k = String(key || '').toLowerCase().replace(/[\s-]+/g, '_');
  return GLOSSARY[k] ? { key: k, ...GLOSSARY[k] } : null;
}

/** Every entry as a list, grouped in display order (for the Glossary page). */
export function groups() {
  const out = new Map();
  for (const [key, e] of Object.entries(GLOSSARY)) {
    if (!out.has(e.group)) out.set(e.group, []);
    out.get(e.group).push({ key, ...e });
  }
  return [...out].map(([group, items]) => ({ group, items }));
}
