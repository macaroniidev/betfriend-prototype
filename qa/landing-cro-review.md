# BetFriend landing page: CRO review (paid social, cold US bettor)

Reviewed 2026-10-27 at 1440 and 390 (`qa/landing-check.mjs --sections`, crops in `qa/landing-crops-before/`),
plus the plan toggle, FAQ, calculator, tabs, sticky bar and mobile menu via CDP. Baseline QA: no console errors,
no page overflow, no broken images, all maths and prices check out (standalone sum $559.93, stack $1,349.95,
savings $1,149.96 / 85%, annual 33%).

Visitor model: someone who tapped an Instagram/Meta ad about a +$42/+$44 arb, on a phone, with 5 to 15 seconds of
patience before deciding whether this is real and what it costs.

## Issues ranked by expected conversion impact

### 1. Product screenshots are unreadable at 1440 (and cut off the money on mobile)
- **What's wrong:** each 1192px app screen renders at ~610px (51%), so the table text is ~6px. The numbers that sell
  the tool (stake per book, locked profit, edge, "bet $25") are illegible. On phones the 168% top-left crop cuts off
  the right-hand columns, which is exactly where profit/edge live (e.g. Daily Card "$660 cash value" clipped).
- **Why it costs conversions:** paid-social visitors judge "is this real software?" from the screenshot. A blurry
  table reads as a mock-up; the proof the copy promises is never visible.
- **Fix:** magnified "lens" callouts that crop the key row of the real screen at 100%+ (arbitrage legs → stakes →
  locked profit; sharp-money spike → best price → edge → bet size), with a one-line plain-English reading of the row.
  Give the screenshot column more width on desktop.

### 2. Above the fold: offer and next step are buried in a long sentence
- **What's wrong:** kicker is two lines of meta ("betting software for US sports bettors · 25 tools, one membership"),
  the lead is a 40-word list of eight features, and trial terms are a grey paragraph. The CTA ("Show me today's
  edges") doesn't say it's free.
- **Why it costs conversions:** cold traffic scans, it doesn't read. The three facts that drive the click
  (what it is, it's free to try, $0 today) need to be scannable in one glance.
- **Fix:** short kicker; lead cut to one promise ("we tell you exactly what to bet, where and how much"); the feature
  list as scannable chips (all owner features named: arbitrage, +EV, middles, low holds, promos, sharp money, pro
  signals, AI picks, live AI, prediction markets, Daily Card); CTA says "free"; terms as a check row
  ($0 today · cancel anytime · then $199.99/mo All-Access, card required).

### 3. Six tool sections are hard to self-select and scan
- **What's wrong:** after "How it works" the visitor is dropped into six long sections in fixed order. Someone who
  came from a promo-conversion or prediction-market ad has to scroll ~8 screens (mobile ~20) to find their tool.
  Pills list four product names and wrap to two lines; pitches run 50+ words.
- **Why it costs conversions:** message match. If the ad's promise isn't found fast, the bounce happens.
- **Fix:** a "Pick your edge" chooser right after How it works: seven tiles (six families + Daily Card), each with
  the one-line outcome and the worked example number, jumping to its section. Shorter pills.

### 4. Mobile: product proof comes after a wall of copy, and the page is ~34 screens long
- **What's wrong:** at 390 each tool section shows pill, H2, pitch, three long bullets, CTA, links and plan line
  before the screenshot. Example slips stack vertically (three in arbitrage, two in sharp). Seven standalone plan
  cards stack at full height (~5 screens). Total height 28,742px.
- **Why it costs conversions:** fatigue and loss of momentum; on mobile the screenshot is the hook and it arrives
  too late. Plan cards at full height make the decision feel like work.
- **Fix:** on mobile, reorder each tool section so the screen follows the headline + pitch; turn example slips into
  a swipe row; collapse standalone plan details behind one "show what's in each plan" toggle (price, bonus value
  and CTA stay visible).

### 5. Plan section: All-Access anchoring stops at the hero card
- **What's wrong:** the All-Access card is strong, but the seven standalone cards then compete on equal footing,
  and "Most popular" on Live Arbitrage pulls attention away. Nothing in a standalone card shows how close it is
  to everything.
- **Why it costs conversions:** the cheapest upsell moment is when the visitor is looking at a $149.99 card and
  learns All-Access is only $50.00 more.
- **Fix:** an upgrade-delta line on every standalone card ("$50.00/mo more gets you All-Access: all 25 tools"),
  computed live for monthly and annual. Keep standalone CTAs available.

### 6. "Real results" band with no results damages trust
- **What's wrong:** the pill says "Real results" but the band only contains a CTA and a [FILL] note.
- **Why it costs conversions:** promising proof and not delivering it reads as evasive, right before the FAQ.
- **Fix:** relabel it honestly ("Try it before you pay") and add trust elements that need no fabricated proof:
  every example shows its math, your money stays in your own accounts, prices come straight from the books,
  $0 today and cancel from your account.

### 7. CTA hierarchy and copy
- **What's wrong:** 14 primary-size CTAs, most with the same "7 days free. Cancel anytime." line, and the hero CTA
  doesn't mention free. Tool CTAs are good (specific), header/hero/final are generic.
- **Fix:** hero CTA names the free trial; tool CTAs stay specific; plan CTAs gain the upgrade nudge as the
  secondary path.

### 8. Sticky bar
- **What's wrong:** works correctly (hides at top, over plans and final CTA). On mobile the copy is a 12px grey line.
- **Fix:** minor; left as is (it's the correct behaviour). Noted for testing a bolder "$0 today" line.

### 9. Visual polish / consistency
- Promo pill wraps to two lines at 1440; AI and prediction pills are near full width. Shortened.
- Arbitrage and Sharp sections leave ~400px of empty green/white under the screenshot at 1440 (copy column is much
  taller). The lens callouts fill that space with useful proof.
- [FILL] placeholders are visible to visitors (logo rights, date checked, leaderboard row, AI record, legal). They're
  owner placeholders, kept, but must be resolved before ads go live.

### 10. Page length / fatigue (desktop)
- 17,644px at 1440. Acceptable for a $199.99/mo product with multiple CTAs, but the chooser (issue 3) lets
  visitors skip, and the mobile reductions (issue 4) cut most of the length where it hurts most.

---

## Applied

1. **Zoom lens callouts on the real screens (issue 1).** `.bf2-lens` crops the key row of the 2x screenshot
   at 100%+ and overlaps the frame bottom (desktop) / sits under it (mobile): Arbitrage (both legs → $436.16 +
   $563.84 → +$33.70, verified 436.16 × 2.37 = 1,033.70 and 563.84 × 1.8333 = 1,033.71) and Sharp Money
   ($30k on Novig in 5 min, 3.9× normal → bet365 +199, +4.31% edge, $25 to win $50). Percent-based background
   maths keeps the crop exact at any width; mobile uses a narrower crop so text stays readable. The sharp lens hides
   while the Pro Bettor Signals tab is showing. Only numbers read straight off the screen; no record/ROI claims
   amplified.
2. **Wider screenshot column** on desktop (.78fr / 1.22fr instead of .84 / 1.16).
3. **Hero clarity (issue 2).** Kicker cut to "25 betting tools · 17 books · one membership"; lead cut to one promise;
   all 11 owner features as scannable chips (Daily Card highlighted lime); CTA now "See today's edges free"; trial
   terms as a check row ("$0 today, 7 days free · Cancel anytime · Then $199.99/mo for All-Access… Card required").
4. **"Pick your edge" chooser (issue 3)** right after How it works: 7 tiles with the outcome and the page's own worked
   example number, jumping to each section; nav "Tools" now lands here. Daily Card tile spans two columns in green.
5. **Shorter section pills** (no more two-line pill at 1440).
6. **Mobile/tablet reorder (issue 4):** below 980px each tool section shows pill → H2 → pitch → screenshot (+ lens/slip)
   → bullets → CTA, via `display: contents` (no DOM duplication).
7. **Mobile example slips become a swipe row** (86% cards with the next one peeking).
8. **Compact standalone plans on phones:** bullets and bonus-tool lists hide behind one
   "Show what's in each plan" toggle; price, bonus value, CTA and terms stay visible.
9. **All-Access upgrade nudge (issue 5)** on every standalone card, computed live per billing period:
   $170.00 / $120.00 / $50.00 / $120.00 / $120.00 / $100.00 / $160.00 per month; $1,360.00 / $960.00 / $400.00 /
   $960.00 / $960.00 / $800.00 / $1,280.00 per year. Links to checkout. Plus a "Or pick one tool family" bar
   separating All-Access from the standalone grid.
10. **Trust band (issue 6):** "Real results" pill replaced ("Why bettors trust it"); four trust tiles that need no
    fabricated proof (every number shows its math, money stays in your accounts, prices straight from the books,
    $0 today / cancel in your account).
11. **QA script:** excludes intentional internal scrollers/crops from the "wide" check, and now asserts the upgrade
    nudges (both periods), the mobile plan toggle and the lens hide/show on tab switch.

**QA after:** 1440 / 1024 / 768 / 390 — 0 console errors, 0 horizontal overflow, 0 broken images, no NaN/undefined,
calculator / plan toggle / FAQ / tabs / sticky bar / mobile menu all pass; prices unchanged
($199.99, $29.99, $79.99, $149.99, $79.99, $79.99, $99.99, $39.99; annual $133.33/mo etc.).
Before/after crops: `qa/landing-crops-before/` and `qa/landing-crops/`.

## Not applied (and why)

- **Testimonials, member counts, results calendar:** not invented (brief). The [FILL] slots for the real calendar,
  leaderboard row and graded AI record stay; they're the biggest remaining trust lever once real data exists.
- **Resolving the visible [FILL] notes** (logo rights, date checked, states, proration, refund policy, legal name,
  Terms/Privacy): owner facts I can't supply. Must be done before ad spend.
- **Lenses on +EV, Promos, AI, Prediction screens:** those already carry a readable worked-example slip over the
  screenshot; a second overlay would clutter. Candidates if the lens tests well.
- **Hero H1 rewrite:** kept "Every betting edge. One membership." because it carries the All-Access positioning,
  and `?h=` angle variants already exist for ad-matched headlines (both / sharp / promo / stack / traders).
  Recommend running ads with the matching `?h=` param.
- **Removing per-section CTAs or the "Also see" links:** they're specific and match intent; cutting them is a test,
  not a fix.
- **Sticky bar copy change:** current behaviour is correct; bolder "$0 today" is a test idea, not a defect.
- **Risk / limits / tax caveats:** excluded per owner direction.
- **Desktop page length** grew ~1,000px (chooser + lenses); the chooser lets visitors skip straight to their tool,
  so net scroll-to-intent is shorter. Mobile height is roughly flat (chooser added, plans/examples condensed).
