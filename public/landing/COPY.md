# BetFriend landing page: copy deck (All-Access + standalone plans)

**What this is:** every word for the BetFriend sales page, in page order. Build it in the BF097 visual style (green I4 hero, white page,
lime buttons, Barlow Condensed uppercase headlines, Figtree body, example cards with a "Example" tag and a math line under them).
Sell it the way OddsJam's ad pages do: one promise in the H1, one dollar example above the fold, a stats row, the mechanism, the tools,
the plans, the FAQ and a final CTA. Every button goes to checkout or to the matching prototype screen.

**Rules used throughout**
- `BetFriend` is never in an uppercase headline (H1/H2/H3 render uppercase). It sits in the kicker, body, plans and FAQ.
- Prices come from `public/js/plans.js`. Competitor prices come from the owner's tier research. Product facts (25 tools, 17 books,
  8 calculators) come from the prototype (`js/app.js` NAV, `js/data/core.js` BOOKS, README).
- No member counts, testimonials, revenue or win rates. Where proof belongs there is a `[FILL: …]`.
- Example cards use "Book A / Book B" for US sportsbooks (as BF097 does). Exchanges and prediction markets are named because the
  mechanism depends on them (Novig, ProphetX, Kalshi, Polymarket).
- Offer line: the prototype pricing page says "7-day free trial on every paid plan". If this page runs on the BF097 funnel, swap
  "7 days" for `{trial}`, the price for `{charge}` and the plan for `{plan}` so the offer tokens in `offer.ts` flow through.
- Format: **Element** _(purpose)_ then the copy.

---

## 0. Sticky top bar

- **Logo** _(brand)_: BetFriend wordmark + Coach Mate tile
- **Button** _(always-on path to checkout)_: Try it free
- **Mobile sticky bottom button** _(appears after the hero scrolls away)_: Get every tool free for 7 days

---

## 1. Hero

- **Source line** _(ad match; from `sources.ts`, only on paid/organic visits)_: From Instagram: here's the math behind the ad.
- **Kicker** _(says what it is in the first line; name lives here, not in the H1)_: BetFriend: betting software for US sports bettors · 25 tools, one membership
- **H1** _(one promise, uppercase-safe, 35 chars)_: **Every betting edge. One membership.**
- **Subhead** _(names the tools and the payoff in one breath)_: Arbitrage, +EV, middles, promo conversion, sharp money, pro bettor signals, AI picks and prediction-market traders, all ranked for your books every morning. We tell you exactly what to bet, where, and how much.
- **Hero worked example (green proof strip)** _(one real-looking bet in dollars, OddsJam's opener)_: Example: $487 across two books. +$42 if the Over hits, +$44 if the Under hits.
- **Hero example card (right of the H1, Coach Mate holding it)** _(shows the product doing the work)_:
  - Title: Player prop · Made threes · Over/Under 0.5
  - Leg 1: Over 0.5 · Book A · +183 · stake $187
  - Leg 2: Under 0.5 · Book B · −130 · stake $300
  - Result: +$42 to +$44 on $487, whichever side hits
  - Math: $187 at +183 pays back $529.21. $300 at −130 pays back $530.77. You put in $487, so you keep $42.21 or $43.77.
- **Primary CTA** _(action + reward, not "sign up")_: Show me today's edges
- **CTA microcopy** _(offer spelled out after the value)_: 7 days free, then $199.99/mo for All-Access unless you cancel. Card required, $0 today. Cancel anytime.
- **Secondary link** _(for visitors who only want one tool)_: Just want one tool? See standalone plans from $29.99 →  (anchor: `#plans`)

---

## 2. Stats / facts row (4 tiles)

_(OddsJam's stats-row slot, filled with product facts instead of user counts)_

| Big claim | Proof line |
|---|---|
| **25 tools, one login** | Arbitrage to prediction markets, plus the Daily Card that ranks them all. |
| **17 books, exchanges & markets** | DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, Fanatics, BetRivers, Hard Rock Bet, bet365, Fliff, Circa, Novig, ProphetX, PrizePicks, Underdog, Kalshi, Polymarket. |
| **Live arbs pay 2 to 3x more** | Books must adjust odds in real time, so live gaps open wider than pre-match ones. |
| **$199.99 for everything** | Buying the same tools separately runs $1,349.95 a month. |

- **Book logo marquee** _(OddsJam's section 3; recognition)_: the 17 names above, two rows scrolling in opposite directions. `[FILL: confirm logo-use rights before showing marks; plain wordmarks in Figtree are the fallback]`

---

## 3. How it works

- **H2** _(the mechanism in one line)_: **Place two bets. One wins. You keep the gap.**
- **Body** _(arbitrage explained with the hero numbers, no jargon)_: Two sportsbooks priced the same bet differently, so you take one side at each. If the Over hits you make $42. If the Under hits you make $44. You don't need to follow the team, or even the sport. Lock in profit by betting on both sides before the game starts, no promos needed.
- **Step 1** _(we find it)_: **We scan every book you use.** BetFriend compares every line across your books, exchanges and prediction markets, pre-match and live.
- **Step 2** _(we size it)_: **We tell you exactly what and how much to bet.** The exact bet size for each book, already worked out, with a one-tap link to the bet slip.
- **Step 3** _(you collect)_: **You place it. You keep the difference.** Your money stays in your own accounts. Every bet lands in your bet tracker automatically.
- **Worked example card** _(the typical pre-match gap, so the hero's 9% sits next to the everyday case)_:
  - Title: NBA · Total points · Over/Under 214.5 · Pre-match
  - Over 214.5 · Book A · +137 · $217
  - Under 214.5 · Book B · −122 · $283
  - Result: **+$14 to +$15 on $500, whichever side hits**
  - Math: $217 at +137 pays back $514.29. $283 at −122 pays back $514.97. You put in $500, so you keep $14.29 or $14.97. Do it five times before tip-off and that's $71 to $75.
- **CTA** _(first mid-page conversion point)_: Find my first arb
- **Microcopy**: 7 days free. Cancel anytime.

---

## 4. Tool family: Arbitrage, Middles & Low Holds

- **Eyebrow pill** _(tool family label)_: Arbitrage · Middles · Low Holds
- **H2** _(owner's language, outcome first)_: **Pairs of bets that make guaranteed profit.**
- **Pitch** _(what + why live matters)_: We give you the exact bet size for each book, so you keep the difference either way. And because books must adjust odds in real time, live arbs are 2 to 3x more profitable, so BetFriend runs them pre-match and live, with industry-leading auto refresh.
- **Bullets** _(the three tools in one family)_:
  - **Arbitrage, pre-match and live:** lock in profit by betting on both sides, before the game or while it's on.
  - **Middles:** pairs of bets that either cancel out, or both win. Over the low number, Under the high number.
  - **Low Holds:** bet large sums with low risk to get VIP status, fast. Run your playthrough for pennies on the dollar.
- **Example card A — live arb** _(proves the 2–3x claim with numbers)_:
  - Title: NBA · Live total · Over/Under 221.5 · 3rd quarter
  - Over 221.5 · Book A · +125 · $238
  - Under 221.5 · Book B · +105 · $262
  - Result: **+$35 to +$37 on $500, whichever side hits**
  - Math: $238 at +125 pays back $535.50. $262 at +105 pays back $537.10. You put in $500, so you keep $35.50 or $37.10, about 7%. The pre-match gap above paid 2.9%: this one pays about 2.5x more.
- **Example card B — middle** _(the "both win" payoff)_:
  - Title: NFL · Total points · Over 44.5 / Under 47.5
  - Over 44.5 · Book A · +100 · $100
  - Under 47.5 · Book B · −105 · $105
  - Result: **Lands on 45, 46 or 47: +$200. Anywhere else: $0 or −$5.**
  - Math: In the middle, both bets win: $200 + $205 back on $205 staked = +$200. Under only: $205 back = $0. Over only: $200 back = −$5.
- **Example card C — low hold** _(VIP / playthrough angle)_:
  - Title: MLB · Run line · both sides at −102
  - Side 1 · Book A · −102 · $500
  - Side 2 · Book B · −102 · $500
  - Result: **$1,000 of playthrough for $9.80**
  - Math: $500 at −102 pays back $990.20 whichever side wins. You put in $1,000 and get $990.20 back: $1,000 of action toward your bonus rollover and VIP tier for under a penny per dollar.
- **CTA** _(to the matching screen)_: See live arbs now → `/#/arbitrage`
- **Text links under the CTA**: Middles → `/#/middles` · Low Holds → `/#/low-holds`
- **Plan line** _(cross-sell)_: In Live Arbitrage & EV ($149.99/mo), Pre-Match Arbitrage & EV ($79.99/mo) and All-Access.

---

## 5. Tool family: Positive EV, Parlay Builder & Sportsbook Screen

- **Eyebrow pill**: Positive EV · Parlay Builder · Sportsbook Screen
- **H2** _(owner's language)_: **Data-driven bets that pay more than they should.**
- **Pitch**: Positive EV finds the bets a book is paying out higher than they should, priced against sharp no-vig fair odds, and sizes each one for your bankroll. Live +EV bets are 2 to 3x more profitable too: the volume makes this a staple for nearly every pro.
- **Bullets**:
  - **Positive EV, pre-match and live:** every +EV bet across your books, with Kelly bet sizing set to your bankroll.
  - **Parlay Builder:** +EV and Sharp Money legs, pointed to the book paying most for them.
  - **Sportsbook Screen + Fair Odds Builder:** find bets yourself with real-time data. Build your own fair-odds formula from the sharp books you trust.
- **Example card** _(+EV math + sizing)_:
  - Title: NFL · Total points · Over 47.5
  - Fair price (sharp books, vig removed): +100 (a 50% chance)
  - Best price: Over 47.5 · Book A · +110
  - Bet size: **$23** (quarter-Kelly on a $2,000 bankroll)
  - Result: **+5% edge: +$5 per $100, every time you take this price**
  - Math: At +110 you win $110 half the time and lose $100 half the time, so each $100 averages +$5. Full Kelly is 4.5% of bankroll; a quarter of that on $2,000 is $22.73, rounded to $23.
- **CTA**: See today's +EV bets → `/#/positive-ev`
- **Text links**: Parlay Builder → `/#/parlay-builder` · Sportsbook Screen → `/#/screen` · Fair Odds Builder → `/#/ev-builder`
- **Plan line**: Pre-Match +EV is a $199-value bonus in Pre-Match Arbitrage & EV. Live +EV ($319 value), Screen and Parlay Builder come with Live Arbitrage & EV. All of it is in All-Access.

---

## 6. Tool family: Promos

- **Eyebrow pill**: Promo Converter · Promo Optimizer · Profit Boosts · Deposit Optimizer
- **H2** _(owner's language)_: **Convert bonus bets into withdrawable cash.**
- **Pitch**: We tell you which books have the best promos in your state and link you to the exact two-sided bets that turn each one into dollars. Bonus bets can't be withdrawn. Converted, they can.
- **Bullets**:
  - **Promo Optimizer:** every offer in your state ranked by the cash it converts to, with a claim plan that orders them for you.
  - **Profit Boosts:** every boost posted today, priced against sharp fair odds, with the hedge at another book.
  - **Deposit Optimizer:** tell us your deposit; we split it so every promo is funded and your money sits where today's arbs are.
- **Example card** _(conversion in dollars)_:
  - Title: NBA · Moneyline · $200 bonus bet
  - Mavericks (bonus bet) · Book A · +275 · $200 bonus
  - Nuggets (your cash) · Book B · −400 · $440
  - Result: **+$110 withdrawable cash, whichever team wins**
  - Math: Mavericks win: the bonus pays $550 (the $200 bonus itself isn't returned), minus the $440 hedge = +$110. Nuggets win: $440 at −400 pays back $550, so +$110. You keep 55% of the bonus as cash.
- **CTA**: Convert my bonus bets → `/#/promo-converter`
- **Text links**: Promo Optimizer → `/#/promo-optimizer` · Profit Boosts → `/#/boosts` · Deposit Optimizer → `/#/deposit-optimizer`
- **Plan line**: Promo Converter plan, $29.99/mo, with the Low Hold Tool ($69 value) as a bonus. Included in both Arbitrage plans and All-Access.

---

## 7. Tool family: Sharp Money & Pro Bettor Signals

- **Eyebrow pill**: Sharp Money · Pro Bettor Signals
- **H2** _(owner's language)_: **Bet where the pros actually put their money.**
- **Pitch**: Sportsbooks limit sharp bettors, so they bet big on Novig and ProphetX, where every bet is public. When a line there suddenly spikes in volume, we find you the best price on the same bet, and tell you exactly what and how much to bet.
- **Bullets**:
  - **Follows whole lines, not individuals:** like LeBron over 20 points, on US sportsbooks and fantasy apps (PrizePicks, Underdog).
  - **Pro Bettor Signals:** follow bettors ranked by profit, ROI and closing-line value. Instant signal when they bet, with the best price available now.
  - **Optimal bet sizing** based on confidence and history, on every signal.
- **Example card** _(spike → price → stake)_:
  - Title: NBA · Player points · Over 24.5 · Sharp Money alert
  - Signal: volume spike on Novig and ProphetX; the exchange price jumps from −105 to −125 (55.6%)
  - Best US price: Over 24.5 · Book A · −105
  - Bet size: **$45** (quarter-Kelly on a $2,000 bankroll)
  - Result: **+8.5% edge: about +$8.47 per $100**
  - Math: At −105 a win pays $95.24 per $100. 55.56% × $95.24 − 44.44% × $100 = +$8.47. You're betting at the old price before Book A catches up.
- **Pro Bettor Signals card** _(leaderboard row + signal; numbers must be real feed data)_:
  - Bettor row: `[FILL: real leaderboard row from the live feed — rank, profit, ROI, CLV, bets tracked]`
  - Signal: They took Over 8.5 runs at −110. Best price now: Book B −105. Suggested stake: 1 unit.
- **CTA**: Show me the sharp money → `/#/sharp-money`
- **Text link**: Pro Bettor Signals → `/#/bettor-signals`
- **Plan line**: Sharp Money $79.99/mo (Parlay Builder bonus, $99 value). Pro Bettor Signals $79.99/mo (Sharp Money lite bonus, $79 value). Both in All-Access.

---

## 8. Tool family: AI Picks & Live AI

- **Eyebrow pill**: AI Sports Picks · Live AI · Prop Research · Ask BetFriend AI
- **H2** _(outcome; avoids the word "picks" in the headline per brand research)_: **Every game priced by AI. Graded A+ to C.**
- **Pitch**: Our model prices every game and prop, compares it with every book, and grades the best plays A+ to C. Each one shows the projection, the edge at the best available price and the factors behind it.
- **Bullets**:
  - **AI picks** for sides, totals and player props, with confidence grades and a graded record.
  - **Live AI Analysis:** win probability, momentum, play-by-play reads and the live bets where books are slowest to react.
  - **Prop Research + Ask BetFriend AI:** hit rates, game logs and splits next to the best Over and Under prices, and an AI analyst that answers with live prices from every book.
- **Example card** _(model output with the math)_:
  - Title: NBA · Player points · Grade **A**
  - Model projection: 27.8 points · Line: 24.5
  - Best price: Over 24.5 · Book A · −110
  - Model win chance: 58%
  - Result: **+$10.73 per $100 at the best price**
  - Math: At −110 a win pays $90.91 per $100. 58% × $90.91 − 42% × $100 = +$10.73.
- **Record line** _(proof slot)_: `[FILL: graded AI record — bets graded, units, ROI, date range — from the live grading feed]`
- **CTA**: See today's A-grade plays → `/#/ai-picks`
- **Text links**: Live AI → `/#/live-ai` · Prop Research → `/#/prop-research` · Ask BetFriend AI → `/#/ai-chat`
- **Plan line**: AI Picks & Live Analysis, $39.99/mo, with Prop Research ($59 value). Included in All-Access.

---

## 9. Tool family: Prediction Markets

- **Eyebrow pill**: Prediction Traders · AI Market Picks · Order Book · Exit Alerts
- **H2**: **Copy the traders who keep winning.**
- **Pitch**: Unlimited pre-match and live recommendations from algorithmically-selected traders on Kalshi, Polymarket, ProphetX and Novig, with optimal bet sizing based on confidence and history. Deep links take you straight to the trade.
- **Bullets**:
  - **Deep links directly to Kalshi, Polymarket, Prophet X & Novig.** One tap from signal to order.
  - **AI Market Picks + full order book:** model fair value vs market price on every contract, plus price history, bids and asks without leaving the tool.
  - **Exit alerts: we tell you when to sell early.** We watch every position you hold and ping you the moment it's time to take profit.
- **Example card** _(buy → exit alert → profit)_:
  - Title: NFL · Chiefs to win · YES contract
  - Trader signal: buy YES at 54¢ · AI fair value: 60¢
  - Position: 100 contracts = **$54**
  - Exit alert: price hits 66¢ in the 3rd quarter → sell all 100
  - Result: **+$12 taken off the table before the final whistle (22% on $54)**
  - Math: 100 × 66¢ = $66 back on $54 in. Hold to a YES win instead and it pays $100 (+$46). Figures before venue fees.
- **CTA**: Follow the top traders → `/#/prediction-traders`
- **Text links**: AI Market Picks → `/#/pm-picks` · Markets & Order Book → `/#/pm-markets` · Exit Alerts → `/#/exit-alerts`
- **Plan line**: Prediction Markets, $99.99/mo, with AI Prediction-Market Picks ($149 value). Included in All-Access.

---

## 10. Daily Card

- **Eyebrow pill**: Daily Card
- **H2** _(the All-Access reason to buy)_: **Everything in one ranked list.**
- **Body**: Every arb, +EV bet, promo, sharp move, pro signal, AI pick and prediction-market trade, ranked for your books and your state. Open it with your coffee. Work it from the top. Done.
- **Example card** _(sample morning card; reuses the numbers above so the page stays consistent)_:
  1. Live arb · NBA total 221.5 · +$35 to +$37 on $500
  2. Bonus conversion · $200 bonus bet · +$110 cash
  3. Sharp Money · Over 24.5 points at −105 · bet $45
  4. AI grade A · Over 24.5 points · +$10.73 per $100
  5. Prediction trader · Chiefs YES at 54¢ · AI fair 60¢
- **Caption**: Top 3 free on every account. The full card comes with All-Access.
- **CTA**: Open today's Daily Card → `/#/daily`

---

## 11. Also inside (feature strip)

_(small icon tiles; answers "what else do I get")_
- **Bet Tracker & Accounts:** every bet from every tool in one ledger: P&L, ROI and closing-line value. → `/#/tracker`
- **Alerts:** get pinged the second an opportunity matching your rules appears. → `/#/alerts`
- **8 calculators:** results update as you type, using your bankroll and Kelly settings. → `/#/calculators`

---

## 12. Comparison: the stack vs BetFriend

- **H2**: **The tools pros stack. One price.**
- **Sub**: What it costs to buy the same tools from the brands most bettors use, each billed monthly.

| What you get | Bought separately | In BetFriend |
|---|---|---|
| Pre-match + live arbitrage, +EV, middles, low holds | OddsJam Live Arbitrage & EV · $499.99 | ✓ (or $149.99 standalone) |
| Sharp money | OddsJam Sharp Money · $199.99 | ✓ (or $79.99) |
| Prediction-market traders | OddsJam Prediction Traders · $449.99 | ✓ (or $99.99) |
| AI sports picks | Rithmm Pro · $49.99 | ✓ |
| Prop research + live tools | Outlier Pro + React Live · $79.99 | ✓ |
| Game ratings for every matchup | BetQL All Access · $70.00 | ✓ |
| Pro bettor signals | — | ✓ (or $79.99) |
| Daily Card: every tool ranked | — | ✓ |
| **Monthly total** | **$1,349.95** | **$199.99** |

- **Savings line** _(the number to remember)_: Save **$1,149.96 every month**: 85% less than the stack.
- **Footnote** _(keeps the total honest-to-math)_: Promo conversion is in BetFriend too; OddsJam sells it alone as Promo Arbitrage ($79.99), left out of the total because their Live plan covers it. Prices as listed on each brand's site, `[FILL: date checked]`.
- **CTA**: Get every tool for $199.99
- **Microcopy**: 7 days free. Cancel anytime.

---

## 13. Plans

- **Anchor**: `#plans`
- **H2**: **Pick one tool, or get them all.**
- **Sub**: Every paid plan starts with 7 days free. Card required, $0 today, cancel anytime.
- **Toggle**: Monthly · Annual (save up to 33%)

### All-Access (hero card, full width, lime border, "Best value" ribbon)
- **Name**: BetFriend All-Access
- **Tagline**: Every tool. One membership. One price.
- **Price**: $199.99/mo · or $1,599.99/yr ($133.33/mo, save 33%)
- **Value line** _(anchors against our own plans)_: Every standalone plan below adds up to $559.93/mo. All-Access saves you $359.94 a month.
- **Bullets**:
  - All 25 tools, pre-match and live
  - The full Daily Card, ranked for your books and state
  - Arbitrage, +EV, middles, low holds, promos, sharp money, pro signals, AI and prediction markets
  - Alerts, bet tracker and all 8 calculators
- **CTA**: Start All-Access free
- **Microcopy**: 7 days free, then $199.99/mo unless you cancel.

### Standalone plans (cards, 2–3 per row; "Most popular" ribbon on Live)

| Plan | Price (monthly · annual) | Tagline | Bonus tools |
|---|---|---|---|
| **Promo Converter** | $29.99 · $239.99/yr | Convert bonus bets into withdrawable cash. | Low Hold Tool ($69 value) |
| **Pre-Match Arbitrage & EV** | $79.99 · $639.99/yr | Lock in profit by betting on both sides before the game starts. No promos needed. | Pre-Match +EV ($199) · Middles ($99) · Low Holds ($69) · Promo Converter ($79) · Parlay Builder ($99): **$545 value** |
| **Live Arbitrage & EV** ★ Most popular | $149.99 · $1,199.99/yr | Everything in Pre-Match, plus arbs and +EV while games are live. | Live +EV ($319) · Sportsbooks Screen ($99) · Promo Converter ($79) · Parlay Builder ($99): **$596 value** |
| **Sharp Money** | $79.99 · $639.99/yr | Bet where the pros actually put their money. | Parlay Builder ($99 value) |
| **Pro Bettor Signals** | $79.99 · $639.99/yr | Betting signals from profitable sports bettors. | Sharp Money feed lite ($79 value) |
| **Prediction Markets** | $99.99 · $799.99/yr | Copy algorithmically selected traders and get AI picks on Kalshi, Polymarket, ProphetX and Novig. | AI Prediction-Market Picks ($149 value) |
| **AI Picks & Live Analysis** | $39.99 · $319.99/yr | AI sports picks and live in-game AI analysis. | Prop Research ($59 value) |

- **Card bullets** _(use `bullets` from plans.js verbatim; key ones)_:
  - Pre-Match: Pairs of bets that make guaranteed profit · We give you the exact bet size for each book, so you keep the difference either way
  - Live: Everything in Pre-Match · Lock in profit while games are live · Live arbs are 2 to 3x more profitable because books adjust odds in real time · Industry-leading auto refresh
  - Sharp Money: Novig/ProphetX volume spikes → best US price · Follows whole lines, not bettors · Works on US sportsbooks and fantasy apps · We tell you exactly what and how much to bet
  - Prediction Markets: Unlimited pre-match and live recommendations · Optimal sizing · Deep links to Kalshi, Polymarket, Prophet X & Novig · Full order book · Exit alerts
- **Card CTA**: Start free trial
- **Card microcopy**: 7 days free, then {plan price}/mo.
- **Upgrade line under the grid** _(nudges up to All-Access)_: Want two or more? All-Access costs less than Live Arbitrage plus Sharp Money ($229.98).
- **Free plan line** _(catches non-buyers)_: Not ready? Free forever: Daily Card top 3, bet tracker with CLV, every calculator and a delayed Sportsbook Screen. **Create free account**

---

## 14. Proof

- **Eyebrow pill**: Real results
- **H2**: **Real months from real accounts.**
- **Body**: `[FILL: one full month of a real BetFriend member's daily results as a month calendar (OddsJam's format), with handle, tool used and month, shown with permission. Add 4–6 member posts or bet-tracker screenshots below it. Leave this section out until they exist.]`
- **Fallback if no members yet** _(product proof instead of people)_: H2 "See it before you pay." · Body: Every screen in BetFriend is open for 7 days. Watch today's arbs, sharp moves and trader signals update live, with the stakes already worked out. · CTA: Show me today's edges

---

## 15. FAQ

- **H2**: **Sound too good to be true? Ask.**

1. **Do I need to know sports?** _(removes the "I'm not an expert" objection)_
   No. Arbitrage, middles, low holds and promo conversion are math, not opinions: you bet both sides at the stakes we give you. For one-sided bets, the tools tell you what to bet and how much.
2. **How much money do I need to start?** _(sets a reachable entry)_
   About $200 and the bonus bets already in your accounts gets you started with Promo Converter. For arbitrage and +EV, about $2,000 spread across 3 or more books. Your money stays in your own sportsbook accounts the whole time.
3. **How much time does it take?** _(effort objection)_
   Open the Daily Card and work it from the top. Promo conversion is a couple of weekend afternoons. Pre-match arbitrage is 30 to 60 minutes a day, best in the hour before games start. Live tools are for when you're watching anyway.
4. **Which sportsbooks and apps does BetFriend cover?** _(fit)_
   DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, Fanatics, BetRivers, Hard Rock Bet, bet365, Fliff, Circa, the exchanges Novig and ProphetX, the fantasy apps PrizePicks and Underdog, and the prediction markets Kalshi and Polymarket. Set your state and your books once, and every tool shows only what you can bet. `[FILL: states BetFriend is available in]`
5. **What's the difference between All-Access and a standalone plan?** _(plan choice)_
   A standalone plan gives you one tool family plus its bonus tools. All-Access gives you all 25 tools and the full Daily Card for $199.99, less than the $559.93 every standalone plan costs together.
6. **Is this a picks service?** _(tout distrust)_
   No. You see both prices, both stakes and what comes back before you bet anything, and the prices come straight from the books. Sharp Money and Pro Bettor Signals follow real money and real records; our AI shows its projection and its graded record.
7. **Is BetFriend a sportsbook?** _(trust; where the money goes)_
   No. BetFriend is betting software. You place every bet yourself, at your own books, with your own money. We never take bets or hold your money.
8. **Can I use it on my phone?** _(Meta/IG traffic is mobile)_
   Yes. Every screen works on your phone, alerts ping you the moment an opportunity appears, and deep links open the bet slip or the market directly.
9. **Can I switch plans later?** _(lowers commitment)_
   Yes. Start with one tool and move up to All-Access any time from your account. `[FILL: proration rule on upgrade]`
10. **What if it's not for me?** _(trial/cancel; last, as OddsJam does)_
    You get full access for 7 days, every edge exactly as a paying member sees it. Cancel from your account any time in those 7 days and you pay nothing. `[FILL: where cancel lives in the account, and the refund policy]`

- **CTA under the FAQ**: Start free trial
- **Microcopy**: 7 days free. Cancel anytime.

---

## 16. Final CTA (green band, Coach Mate waving)

- **H2** _(echoes the hero promise)_: **Stop guessing. Start betting the math.**
- **Body**: Open the Daily Card, take the top few edges and watch them settle in your own accounts. Every tool, ranked for your books, for 7 days free. If it's not for you, cancel and keep whatever you made.
- **CTA**: Get every tool free for 7 days
- **Microcopy**: Then $199.99/mo for All-Access unless you cancel. Card required, $0 today.
- **Tagline** _(brand sign-off)_: Every bet gets a second opinion.

---

## 17. Footer

- **One line** _(the only compliance line, per owner direction)_: 21+ only. Gambling problem? Call 1-800-GAMBLER. BetFriend is software, not a sportsbook.
- **Links**: Plans · Daily Card · Arbitrage · Sharp Money · Prediction Traders · Terms `[FILL: Terms link]` · Privacy `[FILL: Privacy link]`
- **Legal**: © 2026 `[FILL: company legal name]`

---

## 18. A/B hero angles (5)

Each swaps the kicker, H1, subhead, hero example and CTA; everything below the hero stays. Match each to an ad hook via `?h=`.

| Code | H1 (chars) | Subhead | Hero example strip | CTA | Default plan |
|---|---|---|---|---|---|
| `both` | **Bet both sides. Keep the gap.** (29) | Two books priced the same bet differently. We give you the exact bet size for each, so you keep the difference either way. | $487 across two books: +$42 or +$44, whichever side hits. | Find my first arb | Pre-Match Arbitrage & EV |
| `sharp` | **Bet where the pros put their money.** (35) | Sharps bet big on Novig and ProphetX, where every bet is public. When a line spikes, we find you the best price on the same bet and tell you how much to bet. | Exchange jumps to −125; Book A still at −105. Bet $45 at +8.5% edge. | Show me the sharp money | Sharp Money |
| `promo` | **Turn bonus bets into cash.** (26) | We rank every promo in your state and give you the exact two-sided bets that turn each one into withdrawable dollars. | $200 bonus bet → +$110 cash, whichever team wins. | Convert my bonus bets | Promo Converter |
| `stack` | **$1,350 of betting tools for $199.99.** (36) | Arbitrage, +EV, sharp money, AI and prediction-market traders: the same tools pros pay $1,349.95 a month for, in one membership. | Save $1,149.96 every month vs buying them separately. | Get every tool | All-Access |
| `traders` | **Copy the traders who keep winning.** (34) | Algorithmically selected traders on Kalshi, Polymarket, ProphetX and Novig. Deep links to every trade, and exit alerts that tell you when to sell early. | Buy YES at 54¢, sell at 66¢ on the exit alert: +$12 on $54. | Follow the top traders | Prediction Markets |

---

## Production notes (not page copy)

- **Math check:** every example above was recomputed: $529.21/$530.77; $514.29/$514.97; $535.50/$537.10; middle +$200/$0/−$5; low hold $990.20 back on $1,000; +EV +$5/$100 and quarter-Kelly $22.73; Sharp +$8.47/$100 and quarter-Kelly $44.50; AI +$10.73/$100; promo $550 − $440 = $110; PM 100 × 66¢ − $54 = $12. Stack $1,349.95; savings $1,149.96 (85.2%); standalone sum $559.93; All-Access annual $133.33/mo; annual saves 33% on every plan.
- **Ad review:** OddsJam's research list flags "guaranteed profit" as Meta ad-review risk (`oddsjam-lp/research.md` "Language … must NOT be copied"). The owner chose to use it on the page. If Meta rejects the ad → page pair, swap the §4 H2 to "Bet both sides. Keep the difference." and the Pre-Match bullet to "Pairs of bets that profit whichever side wins."
- **Competitor table:** OddsJam Promo Arbitrage is kept out of the $1,349.95 total to avoid double-counting with their Live plan. If the owner's tier files show Live does not include promo conversion, add it back: $1,429.94 total, $1,229.95 saved.

### Every [FILL]
1. Book logo-use rights (§2 marquee)
2. Pro Bettor Signals leaderboard row (§7)
3. Graded AI record (§8)
4. Date competitor prices were checked (§12)
5. Member results calendar + posts (§14)
6. States BetFriend is available in (FAQ 4)
7. Upgrade proration rule (FAQ 9)
8. Cancel location + refund policy (FAQ 10)
9. Terms link, Privacy link (§17)
10. Company legal name (§17)
