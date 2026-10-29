// Sidebar navigation, grouped by what the money is: hedged profit first, then bonuses, edges, prediction
// markets, research tools and your own account. Shared by the app shell, the editor's page picker
// (public/admin/editor.js) and the QA scripts (qa/cdp.mjs), so keep the shape:
//   { id, group, items: [[routeId, label, iconKey], ...] }
// `group` is the visible heading; `id` is a stable key used to remember collapsed groups.
// iconKey names an SVG in js/icons.js. No emoji or glyph icons here.
export const NAV = [
  { id: 'today', group: 'Today', items: [
    ['daily', 'Daily Card', 'daily'], ['alerts', 'Alerts', 'bell'],
  ] },
  { id: 'hedged', group: 'Hedged profit', items: [
    ['arbitrage', 'Arbitrage', 'arb'], ['middles', 'Middles', 'middle'], ['low-holds', 'Low Holds', 'lowhold'],
  ] },
  { id: 'bonuses', group: 'Bonuses', items: [
    ['promo-converter', 'Promo Converter', 'promo'], ['promo-optimizer', 'Promo Optimizer', 'map'],
    ['boosts', 'Profit Boosts', 'boost'], ['deposit-optimizer', 'Deposit Optimizer', 'deposit'],
  ] },
  { id: 'edges', group: 'Edges', items: [
    ['positive-ev', 'Positive EV', 'ev'], ['screen', 'Sportsbook Screen', 'screen'], ['sharp-money', 'Sharp Money', 'sharp'],
    ['bettor-signals', 'Pro Bettor Signals', 'bettors'], ['ai-picks', 'AI Sports Picks', 'spark'], ['live-ai', 'Live AI Analysis', 'pulse'],
  ] },
  { id: 'pm', group: 'Prediction markets', items: [
    ['prediction-traders', 'Prediction Traders', 'traders'], ['pm-picks', 'AI Market Picks', 'scale'],
    ['pm-markets', 'Markets & Order Book', 'book'], ['exit-alerts', 'Exit Alerts', 'exit'],
  ] },
  { id: 'research', group: 'Research & tools', items: [
    ['prop-research', 'Prop Research', 'search'], ['ai-chat', 'Ask BetFriend AI', 'chat'], ['parlay-builder', 'Parlay Builder', 'layers'],
    ['ev-builder', 'Fair Odds Builder', 'sliders'], ['calculators', 'Calculators', 'calc'],
  ] },
  { id: 'me', group: 'Me', items: [
    ['tracker', 'Bet Tracker & Accounts', 'tracker'], ['pricing', 'Plans & Pricing', 'tag'], ['account', 'Settings', 'settings'],
    ['glossary', 'Glossary', 'glossary'], // item B12: every term behind ui.term, linked from each term popover
  ] },
];

/** One-line "what is this for" per tool: sidebar tooltips (title) and, later, command-palette results. */
export const HINTS = {
  daily: 'Every tool ranked in one list for today',
  alerts: 'Rules that ping you when a matching opportunity appears',
  arbitrage: 'Bet both sides at two books; profit if both legs fill',
  middles: 'Two bets that can both win if the score lands in the gap',
  'low-holds': 'Near-free two-sided bets to clear playthrough and VIP volume',
  'promo-converter': 'Turn bonus bets and site credit into cash',
  'promo-optimizer': 'The best sign-up and reload offers in your state',
  boosts: 'Which profit boosts are worth taking, and the hedge',
  'deposit-optimizer': 'Where to put your next deposit for the most value',
  'positive-ev': 'Prices better than fair odds, sized for your bankroll',
  screen: 'Every book’s price on one board',
  'sharp-money': 'Volume spikes on Novig and ProphetX, matched to the best US price',
  'bettor-signals': 'Profitable bettors and their live picks',
  'ai-picks': 'Model picks with a graded record',
  'live-ai': 'In-game analysis as the score changes',
  'prediction-traders': 'Selected prediction-market traders and how much to follow',
  'pm-picks': 'Model picks across Kalshi, Polymarket and the exchanges',
  'pm-markets': 'Market prices, charts and the order book',
  'exit-alerts': 'When to sell a prediction-market position',
  'prop-research': 'Player prop hit rates and trends',
  'ai-chat': 'Ask questions about games, odds and your bets',
  'parlay-builder': 'Build a parlay and see its fair price',
  'ev-builder': 'Work out fair odds from the sharp books',
  calculators: 'Arbitrage, hedge, Kelly, odds and more',
  tracker: 'Your bets, profit and account health',
  pricing: 'Plans, prices and what each includes',
  account: 'State, books, bankroll, sizing and theme',
  glossary: 'What every betting term means',
};

/** The only nav items that show a live count (each one costs work on every tick). */
export const COUNTED = ['arbitrage', 'exit-alerts'];
