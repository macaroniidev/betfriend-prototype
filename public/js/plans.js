// Packages: standalone plans (OddsJam-style, with bonus tools) and one All-Access membership.
// Prices are proposed. `tools` are route ids; `bonus` lists bonus tools with their stated value.

export const PLANS = [
  {
    id: 'free', name: 'Free', monthly: 0, annual: 0, tagline: 'Start here: track bets, run calculators, see the top of today\'s card.',
    tools: ['daily', 'tracker', 'calculators', 'screen'], bonus: [],
    bullets: ['Daily Card preview (top 3)', 'Bet tracker with CLV', 'All betting calculators', 'Sportsbook Screen (delayed)'],
  },
  {
    id: 'promo', name: 'Promo Converter', monthly: 29.99, annual: 239.99,
    tagline: 'Convert bonus bets into withdrawable cash.',
    tools: ['promo-converter', 'promo-optimizer', 'deposit-optimizer', 'boosts'],
    bullets: ['We tell you which books have the best promos in your state', 'Exact two-sided bets to convert each promo', 'Profit-boost hedges', 'Deposit optimizer'],
    bonus: [{ tool: 'low-holds', name: 'Low Hold Tool', value: 69, desc: 'Arbs where you break even. Clear playthrough bonuses with low risk.' }],
  },
  {
    id: 'prematch', name: 'Pre-Match Arbitrage & EV', monthly: 79.99, annual: 639.99, popular: false,
    tagline: 'Lock in profit by betting on both sides before the game starts. No promos needed.',
    tools: ['arbitrage', 'calculators'],
    bullets: ['Pairs of bets that make guaranteed profit', 'We give you the exact bet size for each book, so you keep the difference either way'],
    bonus: [
      { tool: 'positive-ev', name: 'Pre-Match +EV Tool', value: 199, desc: 'We find bets paying out higher than they should.' },
      { tool: 'middles', name: 'Middles Tool', value: 99, desc: 'Break even or both sides win for a huge payout.' },
      { tool: 'low-holds', name: 'Low Hold Tool', value: 69, desc: 'Arbs where you break even. Useful for playthrough bonuses.' },
      { tool: 'promo-converter', name: 'Promo Converter', value: 79, desc: 'Best promos plus the exact two-sided bets to convert them.' },
      { tool: 'parlay-builder', name: 'Parlay Builder', value: 99, desc: '+EV and Sharp Money legs at the book paying most.' },
    ],
  },
  {
    id: 'live', name: 'Live Arbitrage & EV', monthly: 149.99, annual: 1199.99, popular: true,
    tagline: 'Everything in Pre-Match, plus arbs and +EV while games are live.',
    tools: ['arbitrage', 'positive-ev', 'middles', 'low-holds', 'promo-converter', 'parlay-builder', 'screen', 'ev-builder', 'calculators'],
    bullets: ['Everything in Pre-Match Arbitrage & EV', 'Lock in profit by betting on both sides while games are live', 'Live arbs are 2 to 3x more profitable because books adjust odds in real time', 'Industry-leading auto refresh'],
    bonus: [
      { tool: 'positive-ev', name: 'Live +EV Tool', value: 319, desc: 'Live +EV bets: the volume makes this a staple for nearly every pro.' },
      { tool: 'screen', name: 'Sportsbooks Screen', value: 99, desc: 'See every market in real time to run your own strategy.' },
      { tool: 'promo-converter', name: 'Promo Converter', value: 79, desc: 'Best promos plus the exact two-sided bets to convert them.' },
      { tool: 'parlay-builder', name: 'Parlay Builder', value: 99, desc: '+EV and Sharp Money legs at the book paying most.' },
    ],
  },
  {
    id: 'sharp', name: 'Sharp Money', monthly: 79.99, annual: 639.99,
    tagline: 'Bet where the pros actually put their money.',
    tools: ['sharp-money'],
    bullets: ['Sportsbooks limit sharp bettors, so they bet big on Novig and Prophet X, where every bet is public', 'When a line there spikes in volume, we find you the best price on the same bet', 'Follows whole lines (like LeBron over 20 points), not individual bettors', 'Works on U.S. sportsbooks and fantasy apps', 'We tell you exactly what and how much to bet'],
    bonus: [{ tool: 'parlay-builder', name: 'Parlay Builder', value: 99, desc: '+EV and Sharp Money legs at the book paying most.' }],
  },
  {
    id: 'signals', name: 'Pro Bettor Signals', monthly: 79.99, annual: 639.99,
    tagline: 'Betting signals from profitable sports bettors.',
    tools: ['bettor-signals'],
    bullets: ['Follow bettors ranked by profit, ROI and closing-line value', 'Instant signal when they bet, with the best price available now', 'Optimal bet sizing based on confidence and history'],
    bonus: [{ tool: 'sharp-money', name: 'Sharp Money feed (lite)', value: 79, desc: 'Volume spikes from Novig and Prophet X on the bettors\' markets.' }],
  },
  {
    id: 'prediction', name: 'Prediction Markets', monthly: 99.99, annual: 799.99,
    tagline: 'Copy algorithmically selected traders and get AI picks on Kalshi, Polymarket, Prophet X and Novig.',
    tools: ['prediction-traders', 'pm-picks', 'pm-markets', 'exit-alerts'],
    bullets: ['Unlimited pre-match and live recommendations from algorithmically selected traders', 'Optimal bet sizing based on confidence and history', 'Deep links directly to Kalshi, Polymarket, Prophet X & Novig', 'Full order book data: price history, bids and asks without leaving the tool', 'Exit alerts: we tell you when to sell early'],
    bonus: [{ tool: 'pm-picks', name: 'AI Prediction-Market Picks', value: 149, desc: 'Model fair value vs market price on every contract.' }],
  },
  {
    id: 'ai', name: 'AI Picks & Live Analysis', monthly: 39.99, annual: 319.99,
    tagline: 'AI sports picks and live in-game AI analysis.',
    tools: ['ai-picks', 'live-ai', 'ai-chat', 'prop-research'],
    bullets: ['AI picks for sides, totals and player props with confidence grades', 'Live AI game analysis with win probability and momentum', 'Ask the AI analyst about any bet', 'Prop research with trends and splits'],
    bonus: [{ tool: 'prop-research', name: 'Prop Research', value: 59, desc: 'Player trends, splits and hit rates.' }],
  },
];

export const ALL_ACCESS = {
  id: 'all-access', name: 'BetFriend All-Access', monthly: 199.99, annual: 1599.99,
  tagline: 'Every tool. One membership. One price.',
};

export const allTools = () => [...new Set(PLANS.flatMap((p) => [...p.tools, ...p.bonus.map((b) => b.tool)]))];
/** Plans (standalone) that include a given tool, as headline or bonus. */
export const plansForTool = (tool) => PLANS.filter((p) => p.id !== 'free' && (p.tools.includes(tool) || p.bonus.some((b) => b.tool === tool)));
export const standaloneTotal = (period = 'monthly') => PLANS.filter((p) => p.id !== 'free').reduce((a, p) => a + p[period], 0);
