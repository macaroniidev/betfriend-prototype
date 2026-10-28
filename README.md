# BetFriend prototype

A working, clickable prototype of the full BetFriend product for the US market. It covers every tool and every plan: standalone OddsJam-style packages plus one All-Access membership.

## Run it

```
cd SportsBetting/betfriend-prototype
node server.mjs
```

Open http://127.0.0.1:4400/. It needs no installs (Node 24, zero dependencies). Set `PORT` to use another port.

## Screens (27)

| Area | Screens |
|---|---|
| Home | Daily Card (every tool ranked in one list), Plans & Pricing |
| Arbitrage & EV | Arbitrage (pre-match + live, auto refresh, exact stake per book), Positive EV (pre-match + live, Kelly sizing), Middles, Low Holds (VIP/playthrough planner), Sportsbook Screen, Parlay Builder, Fair Odds Builder |
| Promos | Promo Converter, Promo Optimizer (by state), Profit Boosts, Deposit Optimizer |
| Signals | Sharp Money (Novig/ProphetX volume spikes → best US price, what and how much to bet), Pro Bettor Signals (profitable bettors leaderboard + live signals) |
| AI | AI Sports Picks (graded record), Live AI Analysis, Prop Research, Ask BetFriend AI (chat) |
| Prediction Markets | Prediction Traders (algorithmically selected traders, sizing, deep links), AI Market Picks (cross-venue prices), Markets & Order Book, Exit Alerts |
| My Betting | Bet Tracker & Account Health, Alerts, Calculators (8), Settings (state, books, bankroll, theme) |

## Plans (proposed prices, `public/js/plans.js`)

| Plan | Monthly | Annual |
|---|---|---|
| Free | $0 | $0 |
| Promo Converter | $29.99 | $239.99 |
| Pre-Match Arbitrage & EV | $79.99 | $639.99 |
| Live Arbitrage & EV | $149.99 | $1,199.99 |
| Sharp Money | $79.99 | $639.99 |
| Pro Bettor Signals | $79.99 | $639.99 |
| Prediction Markets | $99.99 | $799.99 |
| AI Picks & Live Analysis | $39.99 | $319.99 |
| **All-Access** | **$199.99** | **$1,599.99** |

Edit the prices, bullets and bonus tools in `public/js/plans.js`. The pricing page, the "Included in" badges and the comparison table all update from that file.

## Connecting real data

- **Adapter:** every screen reads data only through `api` in `public/js/data/adapter.js`.
- **Sample generators** are in `public/js/data/`:
  - `core.js`: books, events, odds lines, live ticks
  - `promos.js`, `sharp.js`, `bettors.js`, `picks.js`, `prediction.js`, `research.js`
  - `tracker.js`: bets and account health
- **To connect your feeds,** replace the functions behind `api` and keep the same return shapes. Then set `api.source = 'live'`, which removes the "Sample data" label.
- **Opportunity engine:** `public/js/lib/opportunities.js` turns any odds feed into arbs, +EV, middles and low holds. All the odds maths is in `public/js/lib/odds.js`.

## Structure

- `server.mjs`: static server
- `public/js/app.js`: shell, navigation, router
- `public/js/ui.js`: shared UI kit
- `public/css/app.css`: design system (light and dark)
- `public/js/pages/<route>.js`: one file per screen

## QA

`node qa/check.mjs` (with the server running) opens all 27 screens at 1440px and a true 390px phone width. It reports console errors, horizontal overflow and broken values, and saves phone screenshots to `qa/`. Last run: 54 checks, 0 problems.
