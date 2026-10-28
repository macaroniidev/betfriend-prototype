# BetFriend app: UX review and final build list

Date: 2026-10-28 · Arbiter: product lead · Inputs: 7 expert audits, the merged proposal, the devil's advocate (DA) review and the engineering-risk (ENG) review.
Evidence: `qa/shots/ux-before/<theme>-<width>-<route>.png` (top of every screen) and `qa/shots/ux-audit/<role>-*.png` (deeper captures).

---

## 1. Summary

The app has the brand's colours but still has the old prototype's layout. On every tool, the money sits below a stack of chrome: a title, a multi-line subtitle, "Included in" plan tags, four boxed KPI tiles, a refresh bar and a wall of filters. The first opportunity starts around y≈520–580 at 1440, and on a phone it can be thousands of pixels down. When a result does show up, the action to take on it is unnamed or inconsistent ("Calculator", "Convert →", "Bet [FD]", or nothing at all). Profit is a small cell. The Daily Card offers a one-leg Bet on two-leg arbs. Phones get squeezed desktop tables made of 340–430px label/value cards. The shell hides a third of the nav, and there is no visible theme toggle. Live tables rebuild every 4s, so rows jump under the cursor. Beginners get no definitions and no "can I lose this?" answer. Basic accessibility fails in the shared kit. The sample data contains same-book arbs and an arbitrage tracker showing −58.8%. The fix keeps every tool, calculation and column, and rebuilds the shared head, action, table, drawer and shell components so that each screen leads with the money and one clearly named action.

---

## 2. Expert findings (key points with evidence)

### Senior product designer
- It still looks like an admin template. Every panel is a 2px box, there are about 30 font sizes with a 14px body, and the landing page's slips, check lists, top-ruled sections and Coach Mate never appear. Evidence: `ux-before/light-1440-arbitrage.png`, `ux-audit/designer-full-ai-picks…`, `designer-full-ev-builder.png`, `designer-full-low-holds.png`.
- Buttons break DESIGN.md: lime Figtree on white ("Calculator", "Convert"), and white on #118A4C at 14px fails AA. Evidence: `ux-before/light-1440-promo-converter.png`, `light-1440-parlay-builder.png`.
- Pricing breaks four landing hard rules, and its CTA sits at y=1716 on mobile. Evidence: `designer-full-pricing.png`, `ux-before/light-390-pricing.png`.
- The dark sidebar is #041009 and loses the brand green. Glyph and emoji icons look cheap. Evidence: `designer-sidebar-bottom.png`, `ux-before/dark-1440-daily.png`.
- The Daily Card is 45 identical numbered rows (numbered circles are banned). Evidence: `designer-full-daily.png`.

### UX researcher
- First result sits at y≈518–584 at 1440 on every tool. KPI tiles out-shout results and are not clickable. Evidence: `uxr-ev-rowclick-1440.png`, `uxr-arb-drawer-1440.png`.
- An empty filtered scanner looks broken: it shows "—/$0.00" with no reset or recovery. Evidence: `uxr-arb-empty-1440.png`. The 404/error view is a dead end: `uxr-404-1440.png`.
- Daily sums mixed units (locked $, EV, pnlPct×100) into one misleading total, and "Open" loses the item. Evidence: `uxr-daily-full-1440.png`.
- The mobile nav hides Tracker and Settings, and there is no page title on mobile. Evidence: `uxr-nav-open-390.png`, `uxr-arb-scrolled-390.png`.

### Beginner bettor
- Jargon (EV, hold, Kelly, CLV, devig, units, ¢) is never defined, and nothing separates "guaranteed if both fill" from "can lose". Evidence: `beginner-ev-row-click.png`, `beginner-calc-kelly.png`.
- The Daily Card offers a one-leg Bet on two-sided plays, which risks a half-arb. Evidence: `beginner-daily-open-promo.png`.
- Defaults ($5k bankroll, $1k arbs, $2.5k hedges) feel like the app isn't for them, and there is no setup. Evidence: `beginner-account.png`, `beginner-promo-convert-drawer.png`.
- Copy contradicts the numbers on Middles and Low Holds. Evidence: `beginner-middle-calc.png`, `ux-before/light-1440-low-holds.png`.

### Sharp power user
- Nothing sorts, the sticky header doesn't stick, and rows reorder and flash under the cursor every tick. Evidence: `sharp-user-scrolled-arbitrage-1440.png`, `sharp-user-arbitrage-live-1440.png`, `sharp-user-scrolled-positive-ev-1440.png`.
- Sample data has same-book arbs and an arbitrage P&L of −58.8%, which ends the evaluation. Evidence: `ux-before/light-1440-tracker.png`.
- Legs and stakes sit in separate columns, so a bet takes about 450px of eye travel and a drawer step. Evidence: `sharp-user-arb-calc-drawer-1440.png`.
- Sportsbook Screen has no actionable price, and the sharp references are off-screen. Evidence: `sharp-user-screen-390.png`, `ux-before/light-1440-screen.png`.
- Sharp Money rows are 110px tall, so 3 fit. Evidence: `sharp-user-scrolled-sharp-money-1440.png`.

### Mobile UX specialist
- stack-sm cards are 340–430px tall, so 0–1 opportunities show per viewport. Pages run 9k–43k px. Evidence: `mobile-arb-table.png`, `mobile-ev-table.png`, `mobile-evb-table.png`, `designer-m-scroll-*.png`.
- The drawer isn't a bottom sheet and the action is at the bottom of the analysis. Evidence: `mobile-arb-drawer.png`, `mobile-arb-drawer-bottom.png`.
- Tap targets are under 44px, and inputs under 16px make iOS zoom (AI Chat composer is cut off). Evidence: `mobile-ai-chat.png`, `mobile-live-ai.png`.
- Nested scroll traps exist on pm-markets .mlist, alerts .feed and live-ai. Evidence: `designer-m-scroll-pm-markets.png`.

### Accessibility specialist
- Rows can't be reached by keyboard (about 500 money rows fail 2.1.1). Evidence: `a11y-1440-light-focus-table.png`, `a11y-1440-light-first-focus.png`.
- The drawer is not a dialog: no Escape, no focus trap. Evidence: `a11y-1440-light-drawer.png`. Tab reaches the hidden mobile nav: `a11y-390-tab-into-hidden-nav.png`.
- Dark callouts and highlight rows fall to 1.4–3:1, and Buy YES/NO in dark is 1.63/2.21:1. Evidence: `a11y-1440-dark-calculators-callout-lime.png`, `a11y-1440-dark-ev-builder-highlight-row.png`, `a11y-1440-dark-prediction-traders.png`.
- Seg controls have no pressed state and outline:none (app.css:179) removes focus. Evidence: `a11y-1440-dark-seg-keyboard-focus.png`, `a11y-1440-dark-calculators-seg-focus.png`.

### Senior front-end engineer
- Shared components are duplicated per page (stats, live bars, tables, toolbars, hundreds of inline styles), so the brand restyle only half lands. Evidence: `frontend-arb-scrolled-1440.png`.
- Theme lives only in account.js (`bf-theme`), with a wrong-theme flash and a hard-coded theme-color. Evidence: `frontend-settings-dark-1440.png`.
- Per-tick innerHTML rebuilds re-attach listeners and trigger content.js apply() about once a second. Evidence: `frontend-arb-drawer-1440.png`, `public/js/content.js`.

---

## 3. Debate: challenges and how they were settled

| Topic | Challenge (DA / ENG) | Ruling |
|---|---|---|
| "Guaranteed" / "lock" wording | DA: legal/compliance risk; false on voids, limits and line moves; contradicts DESIGN.md "no bet is a sure thing". | **DA wins.** Risk label "Hedged · both sides" with a tooltip "profit locked if both legs fill at these prices". CTA "Bet both" plus a separate hero figure "+$33.70 if both fill". Filter "Hedged only". |
| "Bet both" opens two deep links | DA and ENG: browsers allow one window.open per gesture, so leg 2 is popup-blocked, a silent half-arb, and both legs get logged. | **Rejected as specified.** "Bet both" opens the slip drawer with two leg buttons (one gesture each), a "Leg 1 opened ✓ → now leg 2" state and a persistent banner until leg 2 is placed or dismissed. Log only after the user confirms. |
| Per-leg Bet buttons in rows | Sharp wants them. ENG: doubles targets in a table that re-renders every 4s. | **ENG wins on desktop rows.** Rows show legs as slip lines (book · price · side · stake) with no per-leg button. Per-leg buttons live in the drawer, and the leg-1 button gets focus on open, so it is still 2 clicks. |
| Theme default and placement | DA: light default overrides OS-dark. ENG: shots.mjs makes dark shots only via media emulation. A11y: labelled button group in the sidebar. | **Owner wins:** a top-bar sun/moon icon at all widths, defaulting to light, with System kept in Settings. shots.mjs sets `bf-theme` per theme in the same commit. At ≤520px the avatar moves into the sidebar so the toggle fits. |
| Button colour | Proposal: darken --btn to #0E7A42 globally. ENG: diverges from the landing page; Barlow 900 ≥18.66px counts as large text, so #118A4C passes. | **ENG wins.** Primary CTA Barlow 900 uppercase 19px on #118A4C (same as landing). `.btn.sm` (table rows, 15px) uses #0E7A42. One primary per row. Lime only on green. |
| Table cell size | Type-scale wanted 15px cells. DA: +7% width at 1280. | **DA wins.** Body 15px, compact cells 14px tabular, comfortable density 15px. |
| Sticky header method | Proposal allowed a max-height inner scroller. DA and ENG: nested scroll trap, breaks find. | **No inner vertical scroller.** `th{position:sticky; top:var(--topbar-h)}` with `overflow-x:clip` when the table fits. Otherwise horizontal scroll with a sticky first column. |
| Auto-hide priority columns <1280 | DA: hides Age/Fair/Win prob on the most common sharp laptop. | **Rejected.** A remembered "Columns ▾" menu instead. Age is never hidden on arbitrage, EV or middles. |
| Mobile cards | DA: one DOM via matchMedia. ENG: one `<table>` restyled with CSS grid areas, because separate articles become per-row content.js blocks. | **ENG wins.** One table DOM with `grid-template-areas` under 860px, low-priority cells in a details toggle, the container marked `data-bf-list`, and Age on line 1. Target ≤150px per row. |
| Shell nav collapse | DA: collapsing every group except the active one hides 20 tools; the real bug is a sidebar that doesn't scroll. ENG: qa regex depends on the tuple shape; live counts cost ticks; palette is extra. | **Merged.** First ship `.side{overflow-y:auto}` with a sticky footer. Groups expanded by default and collapsible by hand (state remembered). Screen sits in EDGES. Tuple shape `[id,label,iconKey]` kept, and qa scripts import nav.js. Counts only for Arbitrage and Exit Alerts. Palette moved to a late item (C). |
| Bottom tab bar | DA: about 230px of chrome at 390, picks favourites, clashes with the one-CTA rule. ENG: modify. | **Rejected.** Replaced by a "Recent tools" row (last 4) at the top of the mobile sidebar, plus the mobile title and bankroll chip. Revisit with data later. |
| Demo pill as a 6px dot | DA: hides the honesty disclosure on a screen showing dollar profits. | **DA wins.** A short "Sample data" text pill. On mobile it moves into the sidebar header. |
| Plan locks and blur | DA: hides features in demos. ENG: store.plan defaults to all-access, so locks never get seen. | **Merged.** Default stays All-Access, so nothing is hidden. Locks appear when the plan is switched in Settings or Pricing: real rows 1–3 plus a lock card, no blur. QA adds a plan=free run. Fix plansForTool now. |
| How-it-makes-money | DA and ENG: 20 expanded explainers undo results-first; numbered steps are banned. | **Collapsed by default** to a one-line `<details>`. Expanded on first visit only if onboarding chose the beginner goal. Check bullets, no numbers. On mobile it sits after the first result. |
| First-run setup | DA: pushes the hero down; "1/3" is a numbered step. ENG: QA profiles; don't change defaults. | **Compact expandable one-row card** with check-mark progress, skippable. Defaults unchanged and labelled "Using sample settings". QA sets `onboarded=true`. |
| Keyboard layer | DA and ENG: single-key Bet on a reordering list risks wrong bets; conflicts with the editor. | **Rows focusable, with Enter/Space/Esc now.** j/k, / and the ? cheat sheet come later and skip inputs, contentEditable and editor mode. **Single-key Bet rejected.** |
| Keyed updates | DA: gone rows still clickable. ENG: nodeValue patching makes content.js restore stale text; drawer works on a snapshot. | Gone rows show a disabled "Gone" action. Patch through cell textContent/innerHTML, never nodeValue. The drawer re-reads the opp by id each tick ("Price moved: stakes updated" / "Arb gone"). document.hidden skip goes centrally in core.onTick. |
| Token rename | DA and ENG: pure churn, silent colour changes. | **Rejected.** DESIGN.md names are added as aliases. Inline styles move one screen at a time with a `[style]` ratchet. |
| Type-scale sweep | ENG: wide diff. | Tokens and 16px coarse-pointer inputs now. Per-page sizes converge during each screen's migration, with a distinct-font-size ratchet. |
| Paging | DA: paging live re-sorting scanners hides the best new row. | Page only static or long lists (prop-research, pm-picks, ai-picks). Live scanners stay complete and sorted. |
| Daily game plan | DA and ENG: L-size, ?id across 11 tools, unverifiable "Captured". | **Staged in 4 steps.** Lanes by risk with every item still listed. "Marked done", not "Captured". Done/Skip in localStorage keyed by date. |
| PM scanner and ¢ bridge | DA: the scanner is a new view; a bridge on every price triples density. | ¢↔odds via a **global odds-format preference** plus "You risk $X to win $Y" on the ticket, first. Scanner tab accepted as a late item (data already grouped by key). |
| Buy NO grey vs YES green | DA: asymmetric nudge on a trading screen. | **DA wins.** Symmetric YES/NO styling. Green only for gain/P&L. |
| "Feed down" red | DA: flag red banned outside Coach Mate. | --warn plus an icon, not red. |
| Bettor leaderboard | ENG: tabs (fewer layouts). DA: tabs hide it. | Right rail at ≥1280, tabs below. The leaderboard is a researched feature and stays visible on desktop. |
| Screen compare tray | DA: scope creep. | Rejected for now. Clickable prices, legend and Columns menu stay. |
| Nav hints and "Start here" | DA: doubles nav height, duplicates links. ENG: breaks the tuple. | Hints in a separate `HINTS` map, shown as tooltips and in palette results. No "Start here" group; onboarding pins 3 tools inside Daily. |
| Persistent variance banner | DA: clutter for sharps. | Moved into the risk-tag tooltip and the how panel. The dollarised "wins ~45% · pays $96 · worth +$5.40" line stays. |
| Sticky action bar | DA: duplicates the per-row CTA on list screens (§6.16). | Only in drawers/sheets, parlay slip, PM ticket, pricing (hidden while an in-page CTA is visible) and deposit-optimizer. Never on opportunity lists. |
| Glossary in table heads | DA and ENG: nested interactive elements in sortable th. | Title attribute in heads. `ui.term` in drawers, facts labels and copy. Glossary page under ME. |

Gaps that were **added** to the plan from the DA and ENG "missing" lists: compliance copy in the app shell (21+ · 1-800-GAMBLER · not a sportsbook · no bet is a sure thing), state legality wired to Bet buttons, a stale-price and max-stake guard in slips, "cash needed at each book" lines (balance tracking itself is not built), a global odds format, content.js hardening (nodata skip, `data-bf-list`, no-edits fast path, mutation filter), QA hardening (nav import, theme per shot, deterministic flags, blocks.mjs, parity gate, first-row-y), stable opportunity ids, `ui.setQuery`, central pause, `js/slips.js`, porting the landing CSS into app.css, a z-index scale and a performance budget.

---

## 4. Final decision list (build order)

Each item lists what changes, the files, the screens and an acceptance check. Merge gate for every item: `qa/check.mjs`, `qa/shots.mjs` to `qa/shots/ux-after/`, `qa/blocks.mjs` (block keys stable from t=0 to t=+10s, no headingless blocks), `qa/editor-walkthrough.mjs`, and the per-screen feature-parity checklist (every column, control, calculation and action from ux-before is still present).

### (A) Foundation: QA, contract, tokens, theme, shell, UI kit

**A1. QA harness hardening and parity inventory.** qa/check.mjs and qa/shots.mjs import `NAV` from nav.js instead of using a regex, and assert 27 routes. shots.mjs sets `localStorage bf-theme` per theme before reload, plus deterministic flags (`onboarded`, `plan`, dismissed explainers). New `qa/blocks.mjs`, a first-row-y measurement per route at 390 and 1440, a 360px no-horizontal-scroll check, a contrast audit (.callout, .price.best, .btn in both themes), an edit-mode smoke test, and `qa/parity/<route>.json` generated from the current DOM (columns, controls, actions). *Accept:* the scripts report 27 routes, dark shots are dark, and the parity files exist for all routes.

**A2. Trust fixes to the sample data and labels.** `lib/opportunities.js` rejects same-book legs for arbs and low holds. `tracker.js` generates arb and middle bets as linked leg groups whose P&L equals the locked profit, with bonus-bet semantics for promos and grouped expandable rows. low-holds.js:138 shows Expected cost vs Expected result with a sign, "Free" for 0.00%, and drops the duplicate % of volume. Middles copy and columns become "If it misses (likely) / Chance it hits / If it hits / Average". *Accept:* a node assertion finds no duplicate books in any arb, arb profit ≥ 0, and tracker arb group P&L equals the locked profit. Tracker shows no negative arbitrage.

**A3. Shared slips module and the Daily two-leg safety fix.** Lift openArbCalc and ensureCalcCss from arbitrage.js into `public/js/slips.js` (arb, middle, low-hold and promo slips), so ui.js never imports pages. daily.js:123-124 replaces the one-leg betBtn on two-sided items with "Bet both", which opens that slip. Verify that opportunity ids stay stable across ticks in core.js and opportunities.js. *Accept:* no single-leg Bet anywhere on Daily for arb, middle, low-hold or promo items, and ids persist across 3 ticks.

**A4. content.js / frame.js contract hardening.** applyText and blocks() skip `[data-bf-nodata]` subtrees (aligned with frame.js DATA_SEL). isGroup() never descends into `[data-bf-list]`. Add `.sec` to GROUPISH. Early return when there are no edits. Ignore mutations whose targets are all inside nodata. Exclude `#theme-toggle`, drawers in edit mode and the palette from frame.js selection. Rules for all new markup: static h1/h2/h3 (no live counts), live amounts in `<b data-bf-nodata>`, panels as `section`/`.card` with the heading first. *Accept:* blocks.mjs is stable on arbitrage, daily and sharp-money, apply() runs 0 times per idle tick with no edits, and the editor walkthrough passes.

**A5. Theme module and an always-visible toggle.** New `public/js/theme.js` (get, effective, set, `bf:theme` event, matchMedia and storage listeners, meta theme-color). An inline pre-paint script in the app `index.html` head that keeps the `auto` path. A 40px (44 on coarse pointers) SVG sun/moon `.icon-btn#theme-toggle` in `.top-right` with aria-label, aria-pressed and a tooltip. Default light, with System in Settings. account.js becomes a Light/Dark/System seg calling theme.set and listening for `bf:theme`. The avatar moves into the sidebar at ≤520px. *Accept:* the toggle is visible at 390 and 1440 on every route, there is no flash on reload in either theme, Settings and the top bar stay in sync, and dark shots still render dark.

**A6. Tokens, dark contrast and colour aliases.** Add DESIGN.md names as aliases (no renames). New tokens: `--line-strong`, `--callout-bg/--callout-line`, `--hl`, `--on-pos/--on-neg`, `--on-green-mute`, type-scale tokens (`--t-xs 12 … --t-h1 clamp(36px,4vw,52px)`) and a z-index scale (topbar < sticky toolbar < sticky thead < actionbar < drawer < toast). Replace inline `color-mix(lime…)` in calculators.js:191, ev-builder.js:143, middles.js:24, parlay-builder.js:16/42 and positive-ev.js:27 with `--hl`. Dark `--side-bg` becomes `--pitch-deep`. Darken bettor avatars, set `--live` to #C4261A. *Accept:* the contrast audit shows ≥4.5:1 for callout text, .price.best and Buy YES/NO in both themes.

**A7. Brand buttons, CTA helper and landing components.** `.btn.primary` is Barlow 900 uppercase 19px on `--g` (large text, so AA), with a 10px radius and a hard `0 4px 0 --deep` shadow. `.btn.sm` is Barlow 15px on #0E7A42 with a 2px shadow, min-height 32px (44px on coarse pointers). `.btn.outline` and ghost variants. Lime only on green surfaces. Never pills, never red. `ui.cta(label, terms)` renders the 13px terms line. Port `.bf2-slip`, `.bf2-plan`, `.bf2-checks` and `.bf2-cta` rules into app.css (don't link landing.css). *Accept:* the shots.mjs audit finds no lime-on-white buttons, no pills and no red buttons, and every .btn passes AA.

**A8. Branded controls and focus.** `.range` with webkit and moz thumbs (--g fill, --deep thumb), `--line-strong` borders on input, select, seg, chip and icon-btn. Remove outline:none at app.css:179 in favour of a 3px `--focus` ring. Dark `.seg button.on` is lime on pitch-deep. 16px inputs on `(pointer:coarse)`. 44px tap targets on coarse pointers (btn, chip/seg 40px plus hit area, icon-btn 44, sidebar rows 48). *Accept:* no browser-blue sliders, visible focus everywhere, and no iOS zoom on focus.

**A9. Shell: scrolling sidebar, regrouped nav, SVG icons, landmarks.** Step 1 (ship immediately): `.side{overflow-y:auto}` with a sticky footer. Then regroup nav.js (TODAY · HEDGED PROFIT · BONUSES · EDGES (Screen included) · PREDICTION MARKETS · RESEARCH & TOOLS · ME (adds Glossary)), keeping the `[id,label,iconKey]` tuples and a separate `HINTS` map (tooltips). Groups are `<details>`, expanded by default and collapsible by hand, with state remembered. `icons.js` holds 18px 2px-stroke SVGs (aria-hidden). Count badges only for Arbitrage and Exit Alerts. Add a "Recent tools" row on the mobile sidebar. Skip link, `<header>`, nav aria-label, aria-current, a mobile sidebar that is inert below 860px only when closed, Escape and focus return. *Accept:* every nav item is reachable at 1440×800 and 390×844, editor.js's page picker still works, there is no emoji in the nav, and Tab never enters the closed mobile nav.

**A10. Top bar: mobile title, sizing popover, bell, honesty pill, compliance line.** Under 520px show the 24px mark plus the page title (Barlow 20px, truncated). Remove the crumb on desktop. The bankroll chip ("$5k" on mobile) opens a sizing popover or sheet (bankroll, Kelly fraction, arb stake, rounding, state), committing on change or blur. An alerts bell with unread count links to #/alerts. A short "Sample data" text pill (in the sidebar header on mobile). ☰ is 44px with aria-expanded and aria-controls. A sidebar-footer and page-foot compliance line: "21+ · 1-800-GAMBLER · BetFriend is not a sportsbook and doesn't hold your money · No bet is a sure thing." *Accept:* at 390 the title, bankroll chip, bell, theme toggle and ☰ fit without overflow, and the compliance line is present on every route.

**A11. Core live plumbing.** `core.onTick` gets a central pause, a document.hidden skip and `api.tickMs`. `ui.setQuery(patch)` merges via replaceState (no hashchange re-render). `#sr-live` sits outside `#app` with `ui.announce` throttled to ≥15s and off by default for live tables. Stop-loss hits use role=alert. A global prefers-reduced-motion block. *Accept:* ticks stop in a hidden tab, the query updates without a re-render, and no animations run under reduced motion.

**A12. Drawer as an accessible slip dialog and bottom sheet.** `ui.drawer` gets role=dialog, aria-modal and aria-labelledby, stores the opener, sets inert on #app (cleared unconditionally in closeDrawer, skipped in editor mode), traps focus, closes on Escape and returns focus (falling back to #view). A `{footer}` option for a sticky action footer (primary + Log + Alert). Under 860px it is a bottom sheet (92dvh, 18px radius, 4px --g top rule, grab handle, swipe only from the handle). It returns the body element with `.close` and `.footer` attached (backward compatible). *Accept:* the keyboard can open, trap, Escape and return, a route change never leaves the app inert, and the primary is visible without scrolling at 390.

**A13. UI-kit primitives.** In ui.js:
- `ui.pageHead`. `ui.header` stays as a wrapper with the same `<header class="page-head"><h1>` root and a static H1. The subtitle is a 1-line clamp plus a native `<details>`.
- A facts strip that keeps the `.stats` / `.stat strong` classes, with nodata figures, `.scroll-x` on mobile and clickable facts.
- `ui.liveStatus` with a Pause button and Live / Stale / Feed down states (Feed down uses --warn, not red).
- `ui.modeSwitch`.
- `ui.betAction`: `<button class="btn primary sm" data-act="bet"><span>Bet both</span> <b data-bf-nodata>…</b>`, wired through one delegated listener per root that calls stopPropagation.
- `ui.risk(kind)`, mapped centrally.
- `ui.term` plus `public/js/glossary.js`.
- `ui.empty(msgOrOptions)`.
- `ui.more`.
- `ui.cta`.
- An odds-format preference (American / decimal / implied / ¢) in store, with a formatter.

*Accept:* old call signatures still work, and a unit page renders every primitive in both themes.

**A14. ui.table and ui.filterBar components.**
- `ui.table({columns:[{key,label,align,sort,pri,render}], rowKey, rows, onOpen, action})`.
- Keyed `Map<id,tr>` patching through cell textContent/innerHTML, never nodeValue.
- `<th><button>` with aria-sort, and sort state in page state.
- Sticky th via top:var(--topbar-h) and overflow-x:clip when the table fits, otherwise horizontal scroll with a sticky first column and an edge fade. No inner vertical scroller.
- Compact (≤44 / ≤56px) and comfortable density, remembered.
- A "Columns ▾" menu, remembered (Age is never hidden on arb, EV or middles).
- Rows focusable with Enter/Space to open.
- `caption.sr-only`, scope.
- Under 860px a CSS grid-template-areas row layout (≤150px, Age on line 1, extras in a details toggle).
- `data-bf-list` and `data-bf-nodata` on the tbody.

`ui.filterBar({fields, values, onChange})` has a fixed order: Mode → Sport → Market → threshold → Books popover → Sort. It shows "n filters · Reset", keeps the `.toolbar` class, puts Advanced (devig/fair source) behind a remembered disclosure with an active chip, and is sticky on desktop only when the thead is not. On mobile: `[Mode] [Filters · n] [Sort]` plus removable chips plus a sheet. *Accept:* proven on arbitrage (C1), then positive-ev, before any other migration.

### (B) Cross-screen patterns (applied to each screen during its migration)

**B1. Results-first head.** pageHead plus facts strip (max 3–4 money facts) plus liveStatus on the title row. The `.live-bar` and auto-refresh bars are removed only on a screen that already has liveStatus. The "Included in" row is shown only when locked. *Accept:* the first opportunity row is at ≤300px at 1440 and ≤600px at 390 on every tool route (measured by A1).

**B2. Money-action contract.** One primary per row naming the verb (Bet both / Bet $70 at 365 / Convert / Hedge / Buy NO on Novig ↗), plus a hero result figure in Barlow 22–26px --deep, right-aligned ("+$33.70 if both fill"). Secondaries are labelled text ghosts in a fixed order: **Calc · Log · Alert**. Calc stays labelled and first-class. Remove the book chip inside the button. Merge Prediction Traders' two CTAs. Add a Best price → Bet to Screen. *Accept:* every opportunity row on the listed screens has exactly one primary, and the verb text is an override-able static span.

**B3. Legs as slip lines plus a two-step Bet both.** On arbitrage, middles, low-holds, promo-converter and boosts, each leg renders as book · price · side · stake (bold tabular), and the separate Stake column is folded in. Bet both opens the slip drawer with per-leg buttons, "Leg 1 opened ✓ → now leg 2", a persistent banner, logging only on confirm, and a "Cash needed: $436 at bet365 · $564 at Fanatics" line. *Accept:* no flow calls window.open twice per gesture, and an abandoned leg 2 keeps the banner visible.

**B4. Live-safe updates and stale-price guard.** Keyed patching. Row order freezes while hovered or focused, with an "N updates · apply" chip. New rows get a NEW marker. Gone rows are struck through for 5s with a disabled "Gone" action. A 1s cell tint plus ▲/▼ replaces the row flash, and screen.js up/down becomes 0.6s at 15%. The open drawer re-reads its opp each tick ("Price moved +137 → +125, profit now $12" / "This arb is gone") and shows a max-stake/limit note. *Accept:* during 60s of hovering, the hovered row never moves, focus is never lost, and long tasks stay within the budget in §6.

**B5. Risk labels.** "Hedged · both sides" (arb, promo conversion, hedged boost), "Low-cost rollover" (low holds), "Long-run edge · can lose" (+EV, middles, unhedged boosts), "Signal · can lose" (sharp, pros, AI, PM). The tooltip holds the variance note. Shown on rows, Daily and drawer headers, with a "Hedged only" filter on Daily. 6–8px radius, no red fills. *Accept:* every opportunity carries exactly one label, and the word "guaranteed" appears nowhere in the app UI.

**B6. Surface system.** `<section class="sec">` with a 4px --g top rule and an h2 first (Barlow 26px) for page sections. Tables are flat. `.card` only for clickable objects. Asides on --panel. Remove card-in-card per screen. *Accept:* each migrated screen has no nested bordered boxes, and blocks.mjs still finds every panel.

**B7. Colour discipline.** --neg only for negative P&L text. Symmetric YES/NO. Hatched losses in tracker. Middles worst case in --muted with "−". Non-colour cues (▲ beats fair plus a legend, Ask/Bid labels, ✓/✗ hit rates). A Closed/Paused/Claimed tag replaces opacity fades. td.na gets aria-label "No price". *Accept:* no element relies on colour alone on audited screens, and there are no red fills.

**B8. States.** `ui.empty` for filtered-out results: Reset filters / Switch to Live (n) / Alert me (a prefilled rule), plus the 3 nearest matches, and hidden stats instead of "—/$0.00". Skeleton rows replace "Loading…". 404/error has Daily, palette/search and Retry. Static h3 with the dynamic parts in nodata spans. *Accept:* `uxr-arb-empty`-style states always offer ≥2 actions.

**B9. Persisted views and the shared mode switch.** Remember views[route] (filters, sort, density, columns, mode) in localStorage (try/catch). Key filters go into the hash via ui.setQuery. `?mode=live` works everywhere. modeSwitch replaces the 5 variants. It ships only after the filter bar shows the active count and Reset. *Accept:* reloading restores the view, the link reproduces it, and a persisted strict filter always shows "n filters · Reset".

**B10. Plan awareness.** Fix plansForTool (plans.js:79) so Free tools show Free. Show the plan chip only when the plan lacks the tool. Locked preview is rows 1–3 plus a lock card ("Unlock 17 more arbs · $79.99/mo · 7-day trial"), no blur. Lock glyph in the nav. The sidebar footer reflects store.plan. Default stays All-Access. *Accept:* the plan=free QA run shows locks, and the default demo shows every feature with no upsell.

**B11. First-run setup.** Store `onboarded`. A compact expandable card at the top of Daily: state plus books, bankroll presets, risk preset, goal, and "Do you hold a bonus bet?" deep-linked to Promo Converter. Check-mark progress, skippable. A "Using sample settings: NJ, 8 books, $5,000" line until done, linked to the sizing popover. Defaults unchanged. *Accept:* the first-run shot shows the card at ≤120px collapsed, and other shots are unaffected.

**B12. How this makes money, glossary, dollarised EV line.** A collapsed one-line `<details class="how">` inside a section with an h2 on 20 tools (check bullets, worked example at your stake, landing copy), expanded only for the beginner goal and placed after the first result on mobile. It replaces Sharp Money's one-off button. `ui.term` in drawers, facts labels and copy (title attributes in table heads). Glossary page under ME. EV, AI and signal rows get a muted 13.5px "wins ~45% · pays $96 · worth +$5.40" line, and stakes are labelled "Suggested stake (¼ Kelly)". *Accept:* every jargon term from the list has a definition reachable within 1 interaction, and no explainer pushes the first row past the B1 target.

**B13. Odds format and state legality.** Use the global odds-format preference wherever ¢ or American prices appear (pm-markets, prediction-traders, pm-picks, exit-alerts, all books). "You risk $X to win $Y" on tickets. Books not legal in the selected state are flagged and their Bet action disabled, with a tooltip. *Accept:* switching the format updates every price, and switching state to one without bet365 disables its Bet buttons.

**B14. Paging and scroll traps.** `ui.more` (page state survives ticks) on prop-research, pm-picks and ai-picks only. Back-to-top after 2 viewports. Under 860px, remove the inner max-height scroll on pm-markets .mlist, alerts .feed and live-ai .feed/.moments. *Accept:* prop-research at 390 is under 6,000px, and no nested scroll exists under 860px.

**B15. Sticky action bar (decision screens only)** as the drawer footer plus `.actionbar` in parlay-builder, the pm-markets ticket, pricing (hidden while an in-page CTA is visible, per §6.16) and deposit-optimizer. Never on opportunity lists. *Accept:* never two CTAs visible at once on pricing, and the parlay slip CTA is visible at 390 without scrolling.

**B16. Coach Mate, slips and check lists.** At most one Mate per screen, always on a green tile (Daily hero gameplan, Pricing touchdown, AI Chat empty state, scanner empty states only). Calculator results become slips with result and math lines. Bulleted lists become checks. *Accept:* no Mate on a scanner except in its empty state.

**B17. Cross-tool paths.** Tracker breakdown links, plain-English CLV and limit copy linking to Deposit Optimizer, drawer and empty-state links (Sharp ↔ Pro Signals, AI Picks ↔ Prop Research ↔ Ask AI ?q=), "Open in calculator" (?tab&a&b&stake) from every drawer, and Promo → "Next: clear playthrough with Low Holds". *Accept:* every drawer has an Open in calculator link that pre-fills.

### (C) Per-screen changes (migration order)

**C1. Arbitrage (reference migration).** ui.table, filterBar (Books popover replaces ✎), pageHead/facts/liveStatus, slip-line legs, betAction, B3 drawer, keyed updates, risk label, Age column as "seen 12s" (amber past the threshold), mobile grid rows. *Accept:* first row ≤300px at 1440, ≥3 opportunities per 390 viewport, parity checklist green.

**C2. Positive EV.** Same migration. The Bet/Log from positive-ev.js:228 moves into the drawer footer, with a label that follows the Kelly slider. The chip wall becomes the Books popover. The dollarised line. *Accept:* as C1.

**C3. Sportsbook Screen.** Price cells are delegated buttons that open the book slip, and the history drawer moves to the event cell. Sticky column 180px (110px mobile) with one-line abbreviations. CIR/NVG/PX beside Fair. Columns menu, an optional "Best only" toggle (off by default), legend, "Show +EV cells" link, and per-market cards with a scroll-snap books strip plus a Grid toggle under 600px. *Accept:* every price is clickable, and best and fair are visible at 1440 without horizontal scroll.

**C4. Sharp Money.** Columns Edge · Bet · Best @ book · Stake · Bet, then trailing Spike×, volume/time and move (all visible). The feed card header is removed (counts move to the facts strip). Segs merge into one chip row. *Accept:* rows 44–52px, ≥8 spikes visible at 1440.

**C5. Promo Converter (+ Optimizer, Deposit Optimizer).** A "What do you have?" card picker until first choice, then a remembered seg. Plain renames ("Where we'll place the other side", "Cash you need at the second book" plus a balance warning). The best conversion is shown inline with check bullets. Row CTA "Show me the 2 bets · keep $672". Bonus and hedge figures in bold. Subtitles separate the three promo tools. *Accept:* a first-time user reaches the 2 bets in ≤2 clicks.

**C6. Daily Card (staged).**
- (1) Separate units ("$X hedged today · $Y expected over time · N moves"), exit alerts scored as $ to protect, numbered circles removed, the feed marked `data-bf-list`.
- (2) A --g hero with Coach Mate and a lime CTA. Lanes by risk as `<section>`s with static h2s: Do these first / Hedged profit / Bonuses (welcome offers grouped) / Edges / Prediction markets / Manage positions. Every item stays listed. A sticky chip tab row. Rows expand in place.
- (3) `#/tool?id=` deep links that open the drawer, or a "gone, here are similar" state, rolled out per tool.
- (4) Done/Skip ("Marked done") in localStorage by date, plus progress.

*Accept:* no mixed-unit total, all 45 items still reachable, deep links open the right drawer.

**C7. Middles, Low Holds, Profit Boosts.** The C1 migration plus A2 copy. The hedge Cost sign is consistent. Boost CTA is "Hedge" with the hedged amount. *Accept:* parity green, copy matches the numbers.

**C8. Pro Bettor Signals.** A ui.table feed (Time · Bettor · Bet · They bet · Best now · Edge · Status · Stake · actions). Leaderboard in a right rail at ≥1280, tabs below. *Accept:* the leaderboard is visible at 1440 without scrolling.

**C9. Prediction markets (pm-markets, prediction-traders, pm-picks, exit-alerts).** In pm-markets detail, the order book and Trade Ticket sit side by side above the chart. On mobile, book and ticket open in a sheet. Symmetric YES/NO with --on-pos/--on-neg. Risk/win line. One merged CTA on Traders. Exit levels move into the position meta line. *Accept:* the ticket is above the fold at 1440 and one tap away at 390.

**C10. Pricing.** A --g hero with touchdown, a lime CTA and the terms line. Plans `class="plan bf2-plan"` (keeping .hero and .price-big). The recommended plan uses `.on` plus a "Most popular" tag. Check lists, price in Barlow 48px. Compare table with a sticky tool column and no horizontal scroll at 1440. Mobile shows price, saving and CTA first, a plan carousel, a plan picker replacing the 10-column table, and a §6.16 sticky bar. `.strike` contrast ≥4.5:1. *Accept:* the editor walkthrough opens the plan panel, and the CTA is ≤700px at 390.

**C11. AI Chat.** Suggestions only in the empty state (remove the #aic-side-chips duplicate, ai-chat.js:141-142). Coach Mate gameplan empty state. "What I can do" as checks. Mobile 100dvh column with a sticky composer (16px input, 48px Send). *Accept:* the composer is fully visible at 390, no zoom.

**C12. Calculators and Settings.** Calculators: a tab list at ≥980, form and slip result 60/40, "What it's for" plus "Try an example", "Find live ones →", the Kelly table explained, "Book's margin (negative = arb)", and `?tab&a&b&stake`. Settings: one column of `.sec` sections (Location & plan, Bankroll & sizing with a live example, Books as tiles, Theme seg, Odds format), synced to the store without re-rendering on its own input. *Accept:* deep-link prefill works, and Settings stays in sync with the top-bar popover and theme toggle.

**C13. Remaining screens sweep:** ai-picks (one card level, units and grades defined, Model vs Market labelled as win chance), live-ai, prop-research (✓/✗ hit rates, paging), tracker (leg groups, sortable, breakdown links), alerts (Books popover, Paused tag), ev-builder (overflow fix, mode switch), parlay-builder (sticky slip), deposit-optimizer. Each gets the B1–B9 patterns and type-scale convergence. *Accept:* parity green, first-row target met, no inline-style increase.

**C14. Late items (after C1–C13).** ⌘K / "/" command palette (screens, calculator tabs, settings, hints shown in results). The keyboard scan layer (j/k, /, ? cheat sheet, g+letter), ignored in inputs, contentEditable and editor mode, never with single-key Bet. The PM cross-venue Scanner tab (lib helper grouping markets by key, rendered with ui.table). *Accept:* none of these bind a money action to one key, and the palette is excluded from frame.js selection.

---

## 5. Rejected (and why)

- **Bottom tab bar.** About 230px of chrome at 390 stacked with the top bar, filter bar and action bar. It picks 4 favourites out of 27 tools and clashes with the one-visible-CTA rule. Replaced by "Recent tools" in the mobile sidebar plus the mobile title (A9/A10).
- **"Guaranteed profit" / "lock $X" / "Risk-free only" wording.** Compliance and trust risk, and false on voids, limits and line moves. It contradicts DESIGN.md's "no bet is a sure thing". Replaced by "Hedged · both sides" and "+$X if both fill".
- **Bet both opening two deep links in sequence.** Popup blockers kill leg 2, which creates a silent half-arb. Replaced by the two-step slip (B3).
- **Per-leg Bet buttons inside desktop table rows.** They double the click targets in a table that re-renders. Per-leg buttons go in the drawer.
- **Calculator demoted to an unlabeled icon.** It demotes a researched feature. It stays as a labelled "Calc" ghost.
- **Darkening the green globally to #0E7A42.** It diverges from the landing page. Large Barlow CTAs pass AA on #118A4C, and only .btn.sm uses the darker green.
- **Renaming existing tokens and mass-moving inline styles.** Silent colour regressions and churn with no user value. Aliases and a per-screen ratchet instead.
- **Inner vertical scroller for sticky table heads.** It creates a nested scroll trap and breaks find.
- **Auto-hiding priority columns under 1280px.** It hides freshness and fair odds on sharp laptops. Columns menu instead.
- **A second DOM (table plus cards) for mobile.** It doubles content.js work and breaks keyed rows. Replaced by one table restyled with CSS grid.
- **Accordion nav with only the active group open.** It hides 20 tools. Groups stay open by default.
- **Default blur and locks in the demo.** They hide researched features. Locks only appear when the plan is switched.
- **Demo pill as a 6px dot.** It hides the honesty disclosure.
- **"Start here" nav group and second-line nav hints.** They duplicate links and double nav height. Tooltips plus Daily pins instead.
- **Persistent variance banner on 5 screens.** Clutter for sharps. Moved into the risk tooltip and the how panel.
- **Explainers expanded on first visit of every tool.** They undo results-first. Collapsed by default.
- **Numbered steps** ("1/3", "1 Bet Over… 2… 3…", "4 steps"). Banned by DESIGN.md. Check marks instead.
- **Single-key Bet shortcuts (1/2, L) from lists.** High risk of a wrong bet on reordering rows.
- **Paging live scanners.** The best new row could land on page 2.
- **Red "Feed down" state and red fills.** Flag red is reserved for Coach Mate.
- **Asymmetric YES/NO styling.** It nudges toward one side on a trading screen.
- **Screen shift-click compare tray.** New-feature scope, not part of the UI rebuild. Revisit later.
- **Sticky action bar on opportunity lists.** It duplicates the per-row CTA (§6.16).
- **Per-book balance tracking.** There is no balance data source. Only "cash needed at each book" from stakes is shown.
- **Glossary abbr popovers inside sortable table headers.** Nested interactive elements. Title text there instead.

---

## 6. Risks and guards

| Risk | Guard |
|---|---|
| Feature loss during the rebuild ("not a feature cut") | `qa/parity/<route>.json` from ux-before (columns, controls, calculations, actions) as a merge gate for every screen PR (A1). |
| content.js overrides or layout keys churning on live text | A4 hardening (nodata skip, data-bf-list, mutation filter, fast path). Static headings. Live amounts in `<b data-bf-nodata>`. blocks.mjs t=0 vs t=+10s per route. |
| frame.js editor broken by new shell pieces | Exclude the toggle, palette and inert drawers in edit mode. Keep `.pricing .plan/.hero/.price-big`. editor-walkthrough.mjs each step. |
| QA silently checking nothing | nav.js import with an assertion of 27 routes. Theme set per shot. Deterministic flags. A plan=free run. |
| Half-placed arbs | One gesture per leg, a persistent leg-2 banner, logging only on confirm, never a single-leg Bet on two-sided Daily items (A3, B3). |
| Stale prices before a bet | The drawer re-validates each tick, "Price moved / Arb gone", gone rows disabled, stale state on liveStatus (B4). |
| Performance (4s ticks × 15 tables × observer) | Keyed patching, no-edit fast path, document.hidden skip. Budget: no long task over 50ms per tick on arbitrage at 1440 with 60 rows, measured before and after via CDP Performance. |
| Compliance and legal copy | No "guaranteed" or "risk-free" in the UI (a grep in check.mjs). Compliance line in the shell. State legality disables Bet (A10, B13). |
| Brand drift or banned patterns | shots.mjs audit for pills, red buttons, lime on white, italics, numbered steps, monospace. The contrast audit in both themes. |
| Chrome stacking on phones | z-index scale tokens. A single sticky element (filter bar or thead). No tab bar. First-row-y budget enforced (B1). |
| Big-bang regressions | Migration order C1 → C2 → … one screen per PR. `ui.header` and `ui.empty` keep their old signatures. Re-shoot `qa/shots/ux-after` after each step. 360px no-horizontal-scroll check. |
| Theme regressions | The pre-paint script keeps the `auto` path, `bf:theme` sync, and dark shots verified dark. |
