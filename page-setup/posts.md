# BetFriend Facebook Page: launch set

Profile picture, cover photo, Page details and the first 9 posts. These all go live before the first ad runs.
Cold traffic from an ad often taps the Page name before the link. In those few seconds the Page should show a real,
active product that does more than one trick. Each post backs one ad angle from `strategy.md`, so the Page agrees
with whichever ad sent the visitor.

- Images: `assets/` (rebuild with `node page-setup/scripts/build.mjs` from `betfriend-meta-ads/`).
- Review everything in one place: open `preview.html`.
- Facts come from `betfriend-prototype/public/landing/COPY.md` (examples and FAQ) and `public/js/plans.js` (prices).
  The dollar examples are the same recomputed ones the landing page uses.

## 1. Profile picture + cover: final choice

**Use pair A: `profile-A.png` + `cover-C.png`.** (Decided 2026-10-27: the product-wall cover is the stronger hook.)

- **Profile picture, `profile-A.png`:** Mate's face on I4 green, the same mark as the logo tile. It fills the circle, so it
  stays readable at the ~40px size it shows next to every ad.
- **Cover, `cover-C.png`:** "25 betting tools. One membership." over five framed app screens (Promos, Arbitrage, Sharp
  money, Live AI, Traders). It shows the breadth of the product at a glance.

Alternatives kept for later tests: `cover-A.png` ("Every betting edge. One membership." + tool chips + Arbitrage screen),
`profile-B.png` + `cover-B.png` (Coach Mate + "Every bet gets a second opinion."), and `profile-C.png` (app icon on lime).

**Specs used.** Cover rendered at 1640×624, which is 2× the 820×312 desktop view. Phones show only the centre 16:9
slice (640×360), about x 265–1375 of this file, and every word sits inside x 300–1340. Profile pictures are
1080×1080 masters, shown as a circle (about 170–180px on the Page, about 40px next to ads). Meta doesn't publish one
official number set, and third-party guides disagree by a few pixels. After uploading, check the cover crop on a
phone and use drag-to-reposition if needed.

Upload notes: upload the PNG (not a JPEG) so the text stays sharp. Don't add text to the cover's description field
beyond the line below; it shows when people open the photo.
- Cover description: `BetFriend: 25 betting tools, one membership. 21+ only. Gambling problem? Call 1-800-GAMBLER. BetFriend is software, not a sportsbook.`

## 2. Page details

| Field | Value |
|---|---|
| Page name | BetFriend |
| Username | `@betfriend` `[FILL: check it's free; fall back to @betfriendapp]` |
| Category | Software (second: Sports) |
| Bio / intro (≤101 characters) | Every bet gets a second opinion. Betting software for US sports bettors. 21+. Not a sportsbook. (95) |
| Action button | **Sign up** → `{LP}?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_button` |
| Website | `{LP}` |
| About → Additional info | BetFriend is betting software for US sports bettors: arbitrage, +EV, middles, low holds, promo conversion, sharp money, pro bettor signals, AI picks, Live AI and prediction-market traders, ranked for your books every morning. You place every bet yourself, at your own books, with your own money. We never take bets or hold funds. 21+ only. Gambling problem? Call 1-800-GAMBLER. |
| Email / legal name / address | `[FILL: support email]` · `[FILL: company legal name]` (Meta's gambling authorization asks for both) |

`{LP}` = `https://macaroniidev.github.io/betfriend-prototype/` today. Swap every link to the owned domain once it is live
(prespend blocker 🔴 4). Edit the posts before ads start, because Meta's review crawls the Page.

## 3. Posting order

The Page should look active before the first ad runs, without dumping 9 posts in one hour. Plan: one post a day for
the 9 days before launch, in this order, so the newest posts are the strongest. Publish the pinned carousel last and
pin it straight away.

| # | When | Post | Format | Supports ad angle | Link lands on |
|---|---|---|---|---|---|
| P1 | Launch −9 days | Meet Coach Mate | Single image 4:5 | Brand (all) | `/` |
| P2 | −8 | Arbitrage: +$42 or +$44 | Single image 4:5 | TOF-1, TOF-V1, MOF-1, BOF-2 | `/?h=both` |
| P3 | −7 | Promo converter: $200 bonus → $110 cash | Single image 4:5 | TOF-2, TOF-V2 | `/?h=promo` |
| P4 | −6 | Sharp money: −125 vs −105 | Single image 4:5 | TOF-3, MOF-V2 | `/?h=sharp` |
| P5 | −5 | AI picks + Live AI, graded A+ to C | Single image 4:5 | MOF-5, MOF-V1 | `/#ai` |
| P6 | −4 | Prediction traders: 54¢ → 66¢ | Single image 4:5 | TOF-5, BOF-V2 | `/?h=traders` |
| P7 | −3 | Sound too good to be true? Ask. | Single image 4:5 | MOF-1 (objection) | `/#faq` |
| P8 | −2 | $1,350 of tools for $199.99 | Single image 4:5 | TOF-4, MOF-4, BOF-5 | `/?h=stack` |
| P9 | −1, **pinned** | What's inside BetFriend | 6-photo post, 1:1 | BOF-1, BOF-4, BOF-V1 | `/?h=stack` |

Every link carries `utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=<post id>` so Page
traffic shows separately from paid traffic. (The landing page's source line doesn't handle `facebook` yet; see prespend §2.)

## 4. Posts

All captions use US English. The first line is the hook, because Facebook cuts the caption after about 2–3 lines.
Every post ends with the responsible-gambling line.

---

### P1 · Meet Coach Mate
Image: `assets/P1-meet-coach-mate.png`

> Every bet gets a second opinion. 🎧
>
> Meet Coach Mate. He checks the price of every bet across every book before you place it. If another book pays more for the same bet, you'll know. If a bet is priced to lose, you'll know that too.
>
> BetFriend is betting software for US sports bettors: 25 tools in one membership, from arbitrage and +EV to sharp money, AI picks and prediction-market traders.
>
> See how it works → {LP}?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P1
>
> 21+ only. Gambling problem? Call 1-800-GAMBLER. BetFriend is software, not a sportsbook.

---

### P2 · Arbitrage
Image: `assets/P2-arbitrage.png`

> Two sportsbooks. Same bet. Different prices. That gap is yours.
>
> Example: Book A has Over 0.5 made threes at +183. Book B has the Under at −130. Bet $187 on the Over and $300 on the Under. Whichever side hits, you get back about $530 on $487: +$42 or +$44.
>
> You don't need to follow the team, or even the sport. BetFriend scans every book you use, pre-match and live, and gives you the exact bet size for each side.
>
> Find your first arb → {LP}?h=both&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P2
>
> Example only; prices move fast. 21+ only. Gambling problem? Call 1-800-GAMBLER.

---

### P3 · Promo converter
Image: `assets/P3-promo-converter.png`

> Got bonus bets sitting in your sportsbook app? You can't withdraw them. You can convert them.
>
> Example: a $200 bonus bet on the Mavericks at +275, and $440 of your own cash on the Nuggets at −400 at another book. Mavericks win: +$110. Nuggets win: +$110. That's $110 of withdrawable cash either way, 55% of the bonus.
>
> BetFriend ranks every promo in your state and gives you the exact two bets for each one.
>
> Convert my bonus bets → {LP}?h=promo&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P3
>
> Example only. Promos vary by state and book. 21+ only. Gambling problem? Call 1-800-GAMBLER.

---

### P4 · Sharp money
Image: `assets/P4-sharp-money.png`

> Sportsbooks limit winning bettors. So the sharps moved to exchanges, where every bet is public.
>
> When a line on Novig or ProphetX suddenly spikes, BetFriend finds you the same bet at a US book that hasn't moved yet. Example: the exchange jumps from −105 to −125 on Over 24.5 points. Book A still has −105. That's an 8.5% edge, about +$8.47 per $100. We size it too: $45 on a $2,000 bankroll.
>
> Pro Bettor Signals does the same for individual bettors, ranked by profit, ROI and closing-line value.
>
> Show me the sharp money → {LP}?h=sharp&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P4
>
> Example only. No bet is guaranteed. 21+ only. Gambling problem? Call 1-800-GAMBLER.

---

### P5 · AI picks + Live AI
Image: `assets/P5-ai-picks.png`

> An AI pick should show its work. Ours does.
>
> BetFriend's model prices every game and prop, compares it with every book, and grades the best plays A+ to C. Example: projection 27.8 points against a 24.5 line, a 58% model win chance, Over at −110. That's +$10.73 per $100 at the best price.
>
> Live AI does it in-game: win probability, momentum, and the live bets books are slowest to move.
>
> See today's A-grade plays → {LP}?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P5#ai
>
> Example only. No bet is guaranteed. 21+ only. Gambling problem? Call 1-800-GAMBLER.

---

### P6 · Prediction traders
Image: `assets/P6-prediction-traders.png`

> Kalshi and Polymarket have traders who keep winning. Now you can follow them, and know when to sell.
>
> Example: a top trader buys Chiefs YES at 54¢. You buy 100 contracts for $54. Third quarter, the price hits 66¢ and your exit alert fires. Sell all 100: $66 back, +$12, before the final whistle.
>
> BetFriend picks traders on Kalshi, Polymarket, ProphetX and Novig, sizes every trade, and deep-links you straight to it. AI Market Picks shows fair value against the market price.
>
> Follow the top traders → {LP}?h=traders&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P6
>
> Example only, before venue fees. 21+ only. Gambling problem? Call 1-800-GAMBLER.

---

### P7 · Honest answers
Image: `assets/P7-honest-answers.png`

> "Sounds too good to be true." Fair. Here are straight answers.
>
> Is BetFriend a sportsbook? No. It's software. You place every bet at your own books, with your own money. We never take bets or hold your money.
> Is it a picks service? No. You see both prices, both stakes and what comes back before you bet anything.
> Do I need to know sports? No. Arbitrage and promo conversion are math, not opinions.
> Is anything guaranteed? No. Prices move fast. We show you the math so you decide.
>
> Got another question? Ask it in the comments. Coach Mate answers every one.
>
> All the answers → {LP}?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P7#faq
>
> 21+ only. Gambling problem? Call 1-800-GAMBLER.

(The comments invite helps the Page look active. Someone must answer the comments within a day; see §5.)

---

### P8 · Stack price
Image: `assets/P8-stack-price.png`

> $1,349.95 a month. That's what comparable betting tools cost when you buy them one by one.
>
> BetFriend All-Access puts all 25 in one membership for $199.99/mo: arbitrage and live arbs, +EV, middles, low holds, promo conversion, profit boosts, sharp money, pro bettor signals, the parlay builder, AI picks, Live AI, prop research, prediction traders, AI market picks, exit alerts and the Daily Card that ranks it all.
>
> Only want one tool? Single-tool plans start at $29.99/mo.
>
> Get every tool → {LP}?h=stack&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P8
>
> 7 days free, card required, $0 today. Then $199.99/mo unless you cancel. 21+ only. Gambling problem? Call 1-800-GAMBLER.

`[PROOF: date the competitor prices behind $1,349.95 were checked, and the list of tools in the sum. Meta reviewers and commenters may ask; prespend §6 lists it too.]`

---

### P9 · What's inside BetFriend (pinned, 6 photos)
Images, in order: `assets/P9-1-cover.png` → `P9-2-gaps.png` → `P9-3-money.png` → `P9-4-ai.png` → `P9-5-markets.png` → `P9-6-offer.png`

> New here? Start with this. 👇 Everything inside BetFriend, in 6 swipes.
>
> 1. 25 tools, one membership.
> 2. Find the gaps: arbitrage, +EV, middles and low holds, with every stake worked out.
> 3. Follow the money: sharp money alerts and pro bettor signals.
> 4. AI that shows its work: AI picks graded A+ to C, plus Live AI.
> 5. Bonus bets to cash, and prediction-market traders to copy, with exit alerts.
> 6. Every tool free for 7 days.
>
> Every morning the Daily Card ranks it all for your books and your state. Open it, work it from the top, done.
>
> Start your free week → {LP}?h=stack&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_launch&utm_content=P9
>
> 7 days free, card required, $0 today. Then $199.99/mo for All-Access unless you cancel. 21+ only. Gambling problem? Call 1-800-GAMBLER. BetFriend is software, not a sportsbook.

Per-photo descriptions (optional; they show when someone opens a photo):
1. 25 tools. One membership.
2. Arbitrage, +EV, middles and low holds, across every book, pre-match and live.
3. Sharp Money and Pro Bettor Signals: the best price on the bet the pros just made.
4. AI Sports Picks and Live AI Analysis.
5. Promo Converter and Prediction Traders.
6. 7 days free, card required, $0 today.

## 5. Before ads go live: Page checks

- [ ] `profile-A.png` and `cover-C.png` uploaded; cover checked on a phone and a desktop.
- [ ] Bio, category, Sign up button and About filled in (§2). The `[FILL]` fields are done.
- [ ] All 9 posts published in order, P9 pinned.
- [ ] Every link points to the owned domain, not `macaroniidev.github.io` (prespend 🔴 4).
- [ ] Someone owns the comments: answer within 24 hours. Hide spam and "DM me for picks" tout replies, which are common on betting Pages.
- [ ] Meta gambling authorization applied for with this Page (prespend 🔴 3). Reviewers look at the Page as well as the ads.
- [ ] Ads keep the post ID when winners move to scale (test-plan step 2), so likes and comments carry over.

## 6. Placeholders to fill

1. `[FILL: username]`: check that `@betfriend` is free.
2. `[FILL: support email]` and `[FILL: company legal name]`: needed for the Page and for authorization.
3. `[PROOF: competitor price check date + tool list]` behind $1,349.95 (P8).
4. Swap `{LP}` to the owned domain (all posts, the button, the website field).

What's deliberately left out: no member counts, testimonials, win records or press. None exist yet. The screenshots are
cropped to leave out the sample "Model ROI", "Signal record" and "Your betting" profit figures in the prototype, so no
image implies a track record.
