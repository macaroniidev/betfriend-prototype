# BetFriend UI kit (`public/js/ui.js`)

Every screen gets the kit as `ctx.ui` (or `import * as ui from '../ui.js'`). Screens **compose** these primitives;
they don't restyle them. All CSS lives in `public/css/app.css` under "UI kit primitives". A live reference page
renders every primitive with sample data: **`/app/#/ui-kit`** (`pages/ui-kit.js`, not in the nav). Check it in both
themes after changing the kit.

Rules every primitive already follows (keep them when composing):

- **Editor contract.** h1/h2/h3 are static text. Live values go in `<b data-bf-nodata>` or a nodata `<tbody>`.
  Static verbs inside nodata are `<span data-bf-text>` islands. Results sit in one `[data-bf-list]`. Panels are
  `section`/`.sec`/`.card` with the heading first.
- **Brand.** No pill shapes (tags 6–8px, buttons 10px), no red buttons or fills (`--neg` is for negative P&L
  *text* only), lime only on green grounds, no numbered steps (check marks), no monospace, and never
  "guaranteed", "risk-free" or "lock".
- **Old signatures still work:** `header`, `stats`, `empty('msg')`, `seg/onSeg`, `select/onSelect`,
  `numberInput/onNumber`, `betBtn/wireBetButtons`, `drawer(title, html, {wide})`, `closeDrawer`, `toast`, `logBet`,
  `spark`, `meter`, `cta`, `price`, `book`, `edge`, `eventCell`, `getQuery/setQuery`, `announce`.

`ui.startKit()` is called once by the shell (app.js). It installs the live-status clock, Pause, glossary
popovers, pagers, subtitle "More" toggles, back-to-top and the leg banner. Screens never call it.

---

## Page head

### `ui.pageHead({ title, subtitle, details, detailsLabel, tool, live, actions, facts, cls })`
This is the results-first head (B1). It has a static H1, a **one-line** subtitle (the "More" toggle appears only
when the line overflows), and an optional native `<details>` for the long explanation. Live status sits on the
title row and actions on the right. The plan chip shows **only when the tool is locked** (B10), and the facts
strip sits underneath.

```js
root.innerHTML = `${ui.pageHead({
  title: 'Arbitrage', tool: 'arbitrage',
  subtitle: 'Bet both sides at two books. The profit is yours if both legs fill at these prices.',
  details: ui.checks(['We scan every book you use', 'Stakes are sized so either side pays the same']),
  live: true,                                   // or { label: 'Live', staleMs: 12000 }
  actions: ui.modeSwitch([['pre', 'Pre-match', n1], ['live', 'Live', n2]], mode),
  facts: [{ label: 'Arbs now', value: n }, { label: 'Best ROI', value: '+3.4%', tone: 'pos', term: 'roi' }],
})}`;
```

`ui.header({ title, subtitle, tool, actions })` is the old call. It now renders through `pageHead` with the
same `<header class="page-head"><h1>` root.

### `ui.facts(items)`
This is a flat, ruled strip of 3–4 money facts. It keeps `.stats` / `.stat strong`, the figures are nodata, and
it scrolls sideways on phones. Each item is `{ label, value, note, tone: 'pos'|'neg', href, act, term }`. `href`
makes a fact a link, and `act` makes it a `data-act` button (wire it with `ui.onAction`). `term` turns the label
into a glossary term.

```js
ui.facts([{ label: 'Profit at $1,000', value: money(p), tone: 'pos', act: 'sort-profit' }, { label: 'Your books', value: '8', href: '#/account' }])
```

`ui.stats(items)` keeps the old boxed tiles. Migrate screens to `facts`.

### `ui.liveStatus({ label, updated, staleMs, feed })` · `ui.setLiveStatus(elOrRoot, { updated, feed })`
This shows "Live · updated 3s ago" with a **Pause** button. Pause drives the shared `api.setPaused`, so every
live screen pauses, and the router resumes on each route change. Its states are Live, Paused, Stale (no update
for 3 ticks) and Feed down (`feed: 'down'`, shown in `--warn`, never red). With no `updated`, it follows the
last core tick. Remove a screen's old `.live-bar` only once it shows `liveStatus`.

```js
ui.liveStatus()                                      // in pageHead({ live: true })
ui.setLiveStatus(root, { updated: Date.now() })      // after your own refresh
ui.setLiveStatus(root, { feed: 'down' })             // adapter error
```

## Mode switch and persisted views

### `ui.modeSwitch(options, value, { name, label })` · `ui.onMode(root, cb, { name, param, def })` · `ui.initialMode(params, def, allowed)` · `ui.setModeCount(root, value, n)`
This is the one Pre-match / Live control (B9). Options are `[value, label, count?]`, and counts are nodata
badges. `onMode` moves the on-state, writes `?mode=live` into the hash (the default value is dropped),
remembers the mode per route, then calls `cb`.

```js
const mode = ui.initialMode(ctx.params, 'pre', ['pre', 'live']);   // ?mode= → remembered → default
html += ui.modeSwitch([['pre', 'Pre-match', pre.length], ['live', 'Live', live.length]], mode);
ui.onMode(root, (m) => { st.mode = m; refresh(); }, { def: 'pre' });
ui.setModeCount(root, 'live', liveCount);   // on each tick
```

### `ui.view(route?)` → `{ get(key, def), set(patch), all() }`
This is per-route view memory in localStorage (`bf-views`), with every access wrapped in try/catch. The table
and the filter bar already use it. Use it for anything else a reload should restore.

## Filters and tables

### `ui.filterBar({ id, fields, onChange, sticky })` → `{ el, values, set(patch), reset(), activeCount(), mode, destroy() }`
The order is fixed: **Mode → Sport → Market → threshold → Books → Sort**. The order comes from each field's
role, not from the order of the array. The bar shows "n filters · Reset", keeps the `.toolbar` class and puts
`advanced` fields behind a remembered "Advanced" disclosure with an active count. Values are remembered per
route, and `query: true` fields go into the hash, so a link reproduces the view. On phones the bar shows
`[Mode] [Filters · n] [Sort]` plus removable chips, and the fields move into a bottom sheet. The `books` field
opens a popover that edits `store.books` (shared by every tool). Books not legal in the state are struck
through.

Field types are `mode`, `select`, `number`, `toggle`, `books` and `sort`. Field keys are `key`, `label`,
`options`, `default`, `query`, `advanced`, `prefix`, `step`, `min`, `chip(v)` and `count:false`.

```js
const fb = ui.filterBar({ id: 'arb', fields: [
  { key: 'mode', type: 'mode', default: 'pre', options: [['pre', 'Pre-match'], ['live', 'Live']], query: true },
  { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: ['All', ...api.sports], query: true },
  { key: 'market', type: 'select', label: 'Market', default: 'All', options: ['All', 'Moneyline', 'Spread', 'Total'] },
  { key: 'minRoi', type: 'number', label: 'Min ROI %', default: 0, step: 0.25 },
  { key: 'books', type: 'books' },
  { key: 'sort', type: 'sort', default: 'roi', options: [['roi', 'Best ROI'], ['profit', 'Most profit']] },
  { key: 'devig', type: 'select', label: 'Fair odds from', default: 'multiplicative', options: [...], advanced: true },
], onChange: (v, key) => refresh() });
root.querySelector('[data-filters]').append(fb.el);
// read fb.values.sport etc.; an empty state's "Reset filters" calls fb.reset()
```

### `ui.table(opts)` → `{ el, update(rows), rows(), sortState(), setSort(s), destroy() }`
This is a keyed table for live lists (A14 + B4). On every tick call `update(rows)`. Rows are patched in place
through whole-cell `innerHTML` (never `nodeValue`), only when a cell's HTML changed. The other behaviours are:

- **Sorting:** sortable heads are `<th aria-sort><button>`, and the sort is remembered.
- **Sticky header:** the header sticks under the top bar, with no inner scroller. When a table is too wide it
  scrolls sideways with a sticky first column and an edge fade.
- **Density:** Compact or Comfortable, remembered.
- **Columns:** a remembered **Columns** menu. Age and the first column can never be hidden.
- **Keyboard:** rows are focusable, and Enter or Space opens the row.
- **Accessibility:** `caption.sr-only`, and `th scope=col`.
- **Live order:** the order freezes while the pointer or focus is in the rows, and an "N new · updates · apply"
  chip appears instead. New rows get a **NEW** marker.
- **Gone rows:** they are struck through, their action becomes a disabled **Gone**, and they are removed after
  5s.
- **Value changes:** changed values get a 1s tint and ▲/▼ (`trend`).
- **Editor contract:** the tbody is `data-bf-list data-bf-nodata`.
- **Phones:** under 860px the table is the same DOM laid out as CSS grid rows. The layout comes from
  `mobile.areas`, and `pri: 3` cells move behind a per-row **Details** toggle.

```js
const t = ui.table({
  id: 'arbs', caption: 'Arbitrage opportunities', rowKey: (o) => o.id,
  columns: [
    { key: 'roi', label: 'ROI', sort: (o) => o.edge, trend: (o) => o.edge, render: (o) => ui.edge(o.edge), title: ui.termTitle('roi') },
    { key: 'event', label: 'Event', render: (o) => ui.eventCell(o.eventId) },
    { key: 'legs', label: 'Legs', render: (o) => ui.slipLegs(legsWithStakes(o)) },
    { key: 'market', label: 'Market', pri: 3, render: (o) => ui.esc(o.label) },
    { key: 'profit', label: 'Profit', align: 'r', sort: profit, render: (o) => ui.heroFig(`+${money(profit(o))}`, 'if both fill') },
    { key: 'age', label: 'Age', align: 'r', sort: (o) => -seenAt(o), render: (o) => ui.age(seenAt(o)) },
  ],
  action: (o) => ui.actions(ui.betAction({ verb: 'Bet both', amount: money(stake, 0) }), [['calc', 'Calc'], ['log', 'Log']]),
  onAction: { bet: (o) => openSlip(o), calc: (o) => openSlip(o), log: (o) => logIt(o) },
  onOpen: (o) => openSlip(o),
  sort: { key: 'roi', dir: 'desc' },
  mobile: { areas: ['roi event age', 'legs legs profit', 'act act act'], cols: 'auto minmax(0,1fr) auto' },
  empty: () => ui.empty({ title: 'No arbs match right now', msg: '…', actions: [{ label: 'Reset filters', act: 'reset' }, { label: 'Switch to Live', href: '#/arbitrage?mode=live' }] }),
});
root.querySelector('[data-table]').append(t.el);
api.onTick(() => t.update(load()));
```

Tips:

- Keep phone rows at 150px or less: put the first line as `'risk/roi event age'`, keep the event to one line, and
  put the legs beside the hero figure.
- The auto layout (no `mobile`) puts the first column and Age on line 1, then the others in pairs, then the
  actions.

## Money actions

### `ui.betAction({ verb, amount, act, book, size, tone, disabled, title, autofocus, attrs })`
This is the row's **one** primary (B2), for example `<button class="btn primary sm bet-action" data-act="bet"><span
data-bf-text>Bet both</span> <b data-bf-nodata>$1,000</b></button>`. There is no book chip inside the button. When
`book` is given and that book isn't legal in the selected state, the button is `aria-disabled` and its tooltip
says "bet365 doesn't take bets in NY" (B13).

### `ui.ghost(act, label, { href, iconKey })` · `ui.actions(primary, [[act, label], …])`
These are labelled text-only secondaries (Calc · Log · Alert), plus a right-aligned action group.

### `ui.heroFig(value, note, { tone })`
This is the hero result figure: Barlow 26px, right-aligned, e.g. `ui.heroFig('+$33.70', 'if both fill')`. The tone
is `'pos'` (default), `''` (neutral, e.g. an expected cost) or `'neg'` (negative P&L text only).

### `ui.onAction(root, { act: (key, el, event) => … })`
This adds **one** delegated listener per root for every `[data-act]`. `key` is the closest `[data-key]`. It stops
propagation (so a row's open handler doesn't fire) and ignores `aria-disabled` actions (it toasts their title).
An unhandled `bet` shows the deep-link placeholder. Calling it again on the same root merges the handlers.
`ui.table` has its own `onAction` option, which works the same way.

```js
root.innerHTML = cards.map((c) => `<article class="card" data-key="${c.id}">… ${ui.betAction({ verb: 'Hedge', amount: money(c.hedge) })}${ui.ghost('log', 'Log')}</article>`).join('');
ui.onAction(root, { bet: (id) => openHedge(id), log: (id) => logIt(id) });
```

`ui.betBtn(book, label)` / `ui.wireBetButtons(root)` are the old helpers. They now honour state legality too.

## Risk, words, odds and states

### `ui.risk(kind, { short })` · `ui.riskOf(kind)` · `ui.RISK`
Every opportunity carries exactly one risk label (B5), and the tooltip holds the variance note. The mapping is
central:

| Label | Opportunity kinds |
|---|---|
| **Hedged · both sides** | arb, promo, conversion, hedged-boost |
| **Low-cost rollover** | lowhold |
| **Long-run edge · can lose** | ev, middle, boost, parlay |
| **Signal · can lose** | sharp, pro, ai, pm, trader, prop |

Unknown kinds get "Signal · can lose". Each label has its own icon, so the meaning never depends on colour.

```js
ui.risk('arb')           // Hedged · both sides
ui.risk(o.kind, { short: true })
```

### `ui.term(key, label?)` · `ui.termTitle(key)` · `js/glossary.js`
A glossary term in copy, drawers or facts labels shows its definition on hover, focus or tap, with a link to
`#/glossary?t=key` (B12). In sortable table heads use `title: ui.termTitle('roi')` instead, never a nested button.
`glossary.js` exports `GLOSSARY`, `lookup(key)` and `groups()` (for the Glossary page). It covers EV, hold, vig,
devig, fair odds, Kelly and the Kelly fraction, CLV, units, ¢, American, decimal and implied odds, arb, middle,
low hold, bonus bet, conversion, playthrough, limits, sharp, volume spike, order book, bid/ask, trailing stop and
the four risk labels.

```js
`<p>Sized at ${ui.term('kelly_fraction', '¼ Kelly')} of your ${ui.term('bankroll')}.</p>`
```

### Odds format (B13): `ui.fmtOdds(am)` · `ui.fmtCents(c)` · `ui.price(am, {best})` · `ui.cents(c, {best})` · `ui.riskWin(stake, am)` · `ui.riskWinCents(stake, c)` · `ui.ODDS_FORMATS` · `ui.oddsFormat()`
The global preference `store.oddsFormat` is `american` (default), `decimal`, `implied` or `cents`. It is set in
the top-bar **Bet sizing** popover; the Settings owner should add a control too. `ui.price` uses it, with the
American price in the tooltip. Prediction-market screens should render prices with `ui.cents(c)` /
`ui.fmtCents(c)`. **When the format or the state changes, the shell re-renders the current screen** (keeping
the scroll position), so every price and Bet button updates.

```js
ui.price(-110)            // "-110" | "1.91" | "52.4%" | "52¢"
ui.cents(40)              // "40¢"  | "+150" | "2.50" | "40%"
ui.riskWin(100, 150)      // You risk $100.00 to win $150.00
```

### State legality: `ui.bookLegal(id, state?)` · `ui.illegalNote(id)`
These read the sample footprint `api.promos.booksInState`. `ui.book()` strikes through a book that isn't legal
in the state, and `betAction`, `betBtn` and `legFlow` disable it. Exchanges and prediction markets have no state
data, so they are never flagged.

### `ui.empty(msgOrOptions)` · `ui.skeleton({ rows, cols })` · `ui.errorState({ title, msg, tools, retry })`
`empty('text')` is the old dashed box. `empty({ title, msg, actions, near, nearLabel, mate })` builds an empty
state with a static h3, **two or more actions** (links via `href` or `data-act` buttons), the nearest matches and,
on scanner empties only, Coach Mate (B8). `skeleton` replaces "Loading…", and the router already uses it.
`errorState` is the router's 404/error view, with Retry, Daily and a tool finder.

```js
ui.empty({ title: 'No arbs match right now', msg: 'Your filters hide every current arb.',
  actions: [{ label: 'Reset filters', act: 'reset' }, { label: `Switch to Live (${n})`, href: '#/arbitrage?mode=live' }, { label: 'Alert me', href: '#/alerts' }],
  near: nearest.map(row).join(''), mate: true })
```

### `ui.pager(key, { step })` · `ui.more({ key, shown, total, step })`
These add paging to **static** lists only (prop-research, pm-picks, ai-picks), never to live scanners (B14). The
page size survives ticks and re-renders.

```js
const pg = ui.pager('prop-research', { step: 20 });
const paint = () => { list.innerHTML = pg.slice(rows).map(card).join('') + pg.more(rows.length); };
pg.onMore(paint);
```

The shell's back-to-top button appears after two screens of scrolling, with no wiring needed.

## Drawers, slips and the two-step Bet both

### `ui.drawer(title, html, { wide, footer, kicker, risk, onClose })` → body element
This is the accessible slip dialog (A12). It is `role=dialog aria-modal aria-labelledby`. It traps focus,
closes on Escape and returns focus to the opener (or to `#view`). While it is open `#app` is inert, except in the
owner editor, and `closeDrawer()` **always** clears the inert state, so a route change can't strand it. Under
860px it is a bottom sheet (92dvh, 18px radius, green top rule, grab handle). It only swipes down from the
handle. The returned body is backward compatible and also has:

- `body.close()`;
- `body.footer` and `body.setFooter(html)`: the sticky footer for the primary + Log + Alert, so the primary is
  visible without scrolling on a phone;
- `body.status(html, tone)`: a polite status line, `'info'|'warn'|'ok'`;
- `body.whenClosed(fn)`;
- `body.panel`.

Put `data-autofocus` on the element that should get focus first, such as the leg-1 button (`betAction({ autofocus: true })`).

```js
const body = ui.drawer('Arbitrage slip', slipHtml(o), { risk: 'arb', kicker: ui.esc(o.event),
  footer: `${ui.betAction({ verb: 'Bet both', amount: money(total, 0), size: '' })}${ui.ghost('log', 'Log')}${ui.ghost('alert', 'Alert')}` });
ui.onAction(body.panel, { bet: () => startFlow(o), leg: (_, el) => ui.legFlow.open(+el.dataset.leg), log: () => … });
```

### `ui.liveGuard(body, { read, sig, onUpdate, goneMsg })`
This is the stale-price guard for an open drawer (B4). It re-reads the opportunity on every tick. When prices
change it calls `onUpdate(opp, prev)`, which re-renders your numbers and returns a message such as "Price moved:
profit now +$12". When the opportunity is gone it shows "This one is gone…" and disables the drawer's bet
actions. It stops when the drawer closes.

```js
ui.liveGuard(body, { read: () => api.arbs({ books }).find((x) => x.id === o.id) || null,
  onUpdate: (n) => { body.querySelector('[data-lines]').innerHTML = lines(n); return `Price moved: profit now +${money(profit(n))}`; } });
```

### `ui.legFlow` (B3): `start({ id, title, legs, exclusive })` · `open(i)` · `opened(i)` · `confirm()` · `clear()` · `get()`
A persistent banner tracks a multi-leg play: "Leg 1 opened ✓ → now leg 2 at FanDuel". Each gesture opens
**one** leg (one deep link). The play is logged **only** on confirm (`api.tracker.addGroup(bets, { exclusive })`).
The banner survives route changes (sessionStorage) and stays until the person logs or dismisses it. Each leg is
`{ book, label, stake, bet }`, where `bet` is the tracker record.

```js
ui.legFlow.start({ id: o.id, title: `${o.event} · Bet both`, exclusive: true,
  legs: o.legs.map((l, i) => ({ book: l.book, label: l.outcome, stake: s[i], bet: { kind: 'arb', book: l.book, selection: l.outcome, price: l.price, stake: s[i] } })) });
// per-leg buttons in the slip: ui.betAction({ verb: 'Leg 1', amount: 'bet365', act: 'leg', book, attrs: { 'data-leg': 0 }, autofocus: true })
```

### `ui.slipLegs(legs)` · `ui.cashNeeded(legs)`
These render legs as slip lines. Each line is book · price · side · stake, in one aligned grid with no per-leg
button. Per-leg buttons go in the drawer. `cashNeeded` gives "Cash needed: $436 at bet365 · $564 at Fanatics".

### `ui.calcLink({ tab, a, b, stake, label })` · `ui.related([[route, label], …])`
These are cross-tool paths (B17). Every drawer gets a prefilled "Open in calculator"
(`#/calculators?tab=arb&a=150&b=-140&stake=1000`). The Calculators owner reads `a`, `b` and `stake`. `related`
gives a "Related:" link row for drawers and empties.

## Surfaces and brand blocks

| Primitive | What it renders |
|---|---|
| `ui.sec(title, html, { cls, id, actions })` | `<section class="sec">` with a 4px green top rule and the h2 first (B6). Tables inside are flat; `.card` is only for clickable objects; asides use `.aside` (on `--panel`). |
| `ui.how({ title, summary, checks, example, open })` | A collapsed one-line "How this makes money" `<details>` in its own section (B12). It opens only for `store.goal === 'beginner'`, and never in QA (`bf-qa`). On phones, place it after the first result. |
| `ui.checks(items)` | A check-mark list (never numbers). |
| `ui.slip({ caption, tag, legs, result, math })` | The landing-style bet slip for calculator results and worked examples. |
| `ui.mate(html, { pose })` | Coach Mate on a green tile. Use at most one per screen: Daily hero, Pricing, AI chat empty state, scanner empties. The poses are `touchdown`, `flag`, `film`, `gameplan` and `plain`. |
| `ui.cta(label, terms, { href, tone, block })` | A primary with its terms line under it. |
| `ui.actionBar(html)` + `ui.wireActionBar(bar, inPageCta)` | A sticky bottom bar for **decision screens only** (parlay slip, PM ticket, pricing, deposit optimizer), never on opportunity lists. It hides while the in-page CTA is visible (B15). |
| `ui.status(text, 'ok'\|'bad'\|'warn'\|'info'\|'live'\|'muted')` | A status tag with an icon cue (✓ / ✗). Use it instead of opacity fades. "Lost" is never red. |
| `ui.dir(x)` | ▲ / ▼ with screen-reader text. |
| `ui.na()` | An "—" with `aria-label="Not available"`. |
| `.loss-hatch` (CSS) | Hatched loss areas for bars, so a loss doesn't rely on colour. |
| `ui.evLine({ prob, payout, ev })` | The muted line "wins ~45% · pays $96 · worth +$5.40". |
| `ui.kellyLabel(mult)` | "Suggested stake (¼ Kelly)". |
| `ui.age(ts)` | "12s" / "4m" / "2h". |

## Plans and first run

### Plan awareness (B10): `ui.hasTool(tool)` · `ui.isLocked(tool)` · `ui.planChip(tool)` · `ui.lockRows(rows, tool, { n, noun })` · `ui.lockCard({ tool, count, noun })` · `ui.currentPlan()` · `ui.planName(id)`
The default plan is All-Access, which shows everything with no upsell. `plans.js` has these helpers:

- `plansForTool` now lists Free for free tools.
- `paidPlansForTool`, `planHasTool`, `isFreeTool`, `planName` and `cheapestPlanFor`.

The shell shows a lock glyph on nav items the plan lacks. The sidebar footer follows `store.plan`: "Your plan"
on All-Access, and the upgrade CTA on any other plan.

```js
const { rows: shown, card } = ui.lockRows(rows, 'arbitrage', { n: 3, noun: 'arbs' });
t.update(shown); lockSlot.innerHTML = card;     // "Unlock the full list · 17 more arbs with … · $79.99/mo · 7-day free trial"
```

### First-run setup (B11): `ui.setupCard(container)` → `{ el, destroy }` · `ui.sampleSettingsLine()`
This is a compact, skippable card (113px collapsed at 390). It covers the state and books, bankroll presets, a
risk preset, the goal, and "Do you hold a bonus bet?" (which links to Promo Converter). Progress is shown with
check marks. It hides once `store.onboarded` is true, and QA sets `onboarded: true`.

The store fields are `onboarded`, `goal`, `riskPreset` and `setupDone`. The sizing defaults are unchanged.
`sampleSettingsLine()` gives "Using sample settings: NJ, 8 books, $5,000 · Change"; the Change link opens the
top-bar sizing popover through the window event `bf:open-sizing`.

**The Daily owner mounts it** at the top of Daily:

```js
const setup = ui.setupCard(root.querySelector('[data-setup]'));   // cleanup: setup.destroy()
```

## Other shell hooks

| Hook | What it does |
|---|---|
| `window.dispatchEvent(new CustomEvent('bf:open-sizing'))` | Opens the Bet sizing popover. It holds bankroll, arb stake, Kelly, rounding, state and **odds format**. |
| `ui.getQuery()` / `ui.setQuery(patch)` | Hash query without a re-render. |
| `ui.announce(msg, { key, force, assertive, live })` | Throttled screen-reader messages. |
