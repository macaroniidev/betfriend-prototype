// Sidebar navigation: groups of [route id, label, icon]. Shared by the app shell and the editor's page picker.
export const NAV = [
  { group: 'Home', items: [
    ['daily', 'Daily Card', '◎'], ['pricing', 'Plans & Pricing', '★'],
  ] },
  { group: 'Arbitrage & EV', items: [
    ['arbitrage', 'Arbitrage', '⇄'], ['positive-ev', 'Positive EV', '↗'], ['middles', 'Middles', '⇔'],
    ['low-holds', 'Low Holds', '≈'], ['screen', 'Sportsbook Screen', '▦'], ['parlay-builder', 'Parlay Builder', '⧉'],
    ['ev-builder', 'Fair Odds Builder', '⚙'],
  ] },
  { group: 'Promos', items: [
    ['promo-converter', 'Promo Converter', '$'], ['promo-optimizer', 'Promo Optimizer', '✦'], ['boosts', 'Profit Boosts', '⚡'],
    ['deposit-optimizer', 'Deposit Optimizer', '⊕'],
  ] },
  { group: 'Signals', items: [
    ['sharp-money', 'Sharp Money', '◆'], ['bettor-signals', 'Pro Bettor Signals', '◉'],
  ] },
  { group: 'AI', items: [
    ['ai-picks', 'AI Sports Picks', '✧'], ['live-ai', 'Live AI Analysis', '◐'], ['prop-research', 'Prop Research', '☰'],
    ['ai-chat', 'Ask BetFriend AI', '✎'],
  ] },
  { group: 'Prediction Markets', items: [
    ['prediction-traders', 'Prediction Traders', '⟁'], ['pm-picks', 'AI Market Picks', '◇'], ['pm-markets', 'Markets & Order Book', '▤'],
    ['exit-alerts', 'Exit Alerts', '⏏'],
  ] },
  { group: 'My Betting', items: [
    ['tracker', 'Bet Tracker & Accounts', '▣'], ['alerts', 'Alerts', '🔔'], ['calculators', 'Calculators', '∑'], ['account', 'Settings', '☺'],
  ] },
];
