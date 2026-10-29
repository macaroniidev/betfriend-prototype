// Pro Bettor Signals: leaderboard of verified profitable bettors, follow them, and act on their bets
// at the best price available right now.
//
// Layout (UX rebuild, items B1–B17 + C8): results-first head (facts + live status); the live signal feed
// as a keyed ui.table (Time · Bettor · Bet · They bet · Best now · Edge · Status · Stake · actions);
// the leaderboard in a right rail at ≥1280px and behind tabs below that. The bettor drawer doubles as
// the signal slip (Bet / Log / Alert in its footer) with a stale-price guard.

const CSS = `
/* ---- layout: feed + leaderboard rail (≥1280), tabs below ---- */
.bf-pros .pros-layout { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:0 24px; align-items:start; margin-top:16px; }
.bf-pros .pros-layout > .sec { margin-top:0; min-width:0; }
.bf-pros .pros-tabs { display:none; margin-top:16px; }
@media (max-width:1279px) {
  .bf-pros .pros-layout { grid-template-columns:minmax(0,1fr); margin-top:12px; }
  .bf-pros .pros-tabs { display:inline-flex; }
  .bf-pros .pros-layout[data-tab="feed"] > .pros-board, .bf-pros .pros-layout[data-tab="board"] > .pros-feed { display:none; }
}
.bf-pros .feed-sec .sec-actions { flex:1 1 auto; justify-content:flex-end; gap:4px 12px; }
.bf-pros .feed-sec .tbl-tools { padding:0; flex-wrap:nowrap; }
.bf-pros .feed-sec .tbl-tools .spacer { display:none; }
.bf-pros .st-legend { display:flex; gap:10px; align-items:center; font-size:var(--t-xs); color:var(--muted); }

/* ---- avatars (darkened per A6: white initials ≥4.5:1) ---- */
.bf-pros .av, .pro-dr .av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:12px; color:#fff; background:hsl(var(--h) 45% 28%); flex:none; }
.bf-pros .av.sm { width:24px; height:24px; font-size:10px; }
.pro-dr .av.lg { width:56px; height:56px; font-size:18px; }
.bf-pros .ck, .pro-dr .ck { color:var(--accent); font-size:12px; }
.bf-pros .btn.following, .pro-dr .btn.following { background:var(--pos-bg); color:var(--pos); border-color:transparent; }
.bf-pros .up-n, .pro-dr .up-n { color:var(--pos); font-weight:700; }
.bf-pros .dn-n, .pro-dr .dn-n { color:var(--neg); font-weight:700; }

/* ---- feed table: compact two-line cells ---- */
.bf-pros .tbl[data-density="compact"] .ui-t th { padding:8px 6px; white-space:normal; line-height:1.15; vertical-align:bottom; }
.bf-pros .tbl[data-density="compact"] .ui-t td { padding:6px 6px; }
.bf-pros .ui-t td { vertical-align:middle; }
.bf-pros .c2 { display:flex; flex-direction:column; gap:1px; min-width:0; line-height:1.2; }
.bf-pros .c2 > small { font-size:var(--t-xs); color:var(--muted); white-space:nowrap; }
.bf-pros .c2 .book { align-self:flex-start; }
.bf-pros .who-btn { display:flex; align-items:center; gap:6px; min-width:0; border:0; background:none; padding:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
.bf-pros .who-btn b { display:block; min-width:0; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
/* Desktop: the whole handle is shown (the Bet cell takes the squeeze and ellipsizes instead). */
@media (min-width:860px) { .bf-pros .who-btn b { flex:none; overflow:visible; } }
.bf-pros .who-btn:hover b { color:var(--accent); text-decoration:underline; }
.bf-pros .who-c .took { padding-left:30px; }
.bf-pros .who-c .took .price { font-size:var(--t-xs); }
.bf-pros td[data-col="bet"] { width:30%; max-width:0; min-width:120px; }   /* takes the leftover width, ellipsis */
.bf-pros td[data-col="best"] .c2 { align-items:flex-start; }
/* The kit's sticky head offsets inside a sideways scroller; keep it in place there. */
.bf-pros .tbl.scrolls .ui-t th { top:0; }
/* Status: icon + tooltip on desktop (legend in the section head), full text on phones. */
@media (min-width:860px) {
  .bf-pros td[data-col="status"] .st { padding:3px; }
  .bf-pros td[data-col="status"] .st > span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
}
.bf-pros .sel { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bf-pros .evn { font-size:var(--t-xs); color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bf-pros .evn .live-dot { margin-right:4px; }
.bf-pros .edge-c { align-items:flex-start; gap:2px; }
.bf-pros .edge-c .risk { padding:0 6px; line-height:15px; font-size:11px; }
.bf-pros .stk { align-items:flex-end; white-space:nowrap; }
.bf-pros .stk b { font:900 var(--t-md)/1 var(--f-head); font-variant-numeric:tabular-nums; }
.bf-pros .stk .ev-line { margin:0; font-size:11.5px; line-height:1.2; }
.bf-pros .stk .tgt { font:900 var(--t-cell)/1.25 var(--f-head); }
.bf-pros .stk:has(.tgt) { gap:3px; }   /* heavy Barlow figures need air above the muted note */
/* Desktop: Bet on top, the labelled Calc · Log · Alert ghosts under it (keeps the feed beside the rail). */
@media (min-width:860px) {
  .bf-pros td.act .row-acts { display:grid; grid-template-columns:repeat(3, auto); justify-content:end; gap:0 2px; }
  .bf-pros td.act .row-acts > .bet-action { grid-column:1 / -1; justify-self:end; }
  .bf-pros td.act .row-acts .btn.ghost { min-height:24px; padding:0 4px; font-size:13px; }
}
@media (max-width:859px) {
  .bf-pros .st-legend { display:none; }
  .bf-pros .ui-t tbody tr { gap:4px 10px; padding:8px 2px; }
  .bf-pros td[data-col="best"] .c2, .bf-pros .edge-c { flex-direction:row; align-items:center; gap:6px; }
  .bf-pros td[data-col="bet"] { width:auto; max-width:none; min-width:0; }
  .bf-pros .who-btn { max-width:none; }
  /* No-edge stake (Target / alert when back): clear of the Signal chip and with room between its two lines. */
  .bf-pros .tbl[data-density] .ui-t tbody td[data-col="edge"] { padding-left:0; padding-right:0; }
  .bf-pros .edge-c { gap:4px; }
  .bf-pros .stk:has(.tgt) { gap:5px; }
  .bf-pros .stk .tgt { line-height:1.3; }
}

/* ---- leaderboard: a table from 860–1279px; the same DOM as compact grid rows in the rail and on phones ---- */
.bf-pros .board { width:100%; }
.bf-pros .board td { vertical-align:middle; }
.bf-pros .board .rt { text-align:right; font-variant-numeric:tabular-nums; }
.bf-pros .board .rank { font:900 var(--t-md) var(--f-head); color:var(--muted); width:22px; text-align:center; }
.bf-pros .board .who { display:flex; align-items:center; gap:10px; min-width:0; }
.bf-pros .board .who b { display:block; font-size:var(--t-cell); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bf-pros .board .who small { color:var(--muted); font-size:var(--t-xs); display:flex; gap:4px; align-items:center; flex-wrap:nowrap; white-space:nowrap; overflow:hidden; }
.bf-pros .board .who small > span { overflow:hidden; text-overflow:ellipsis; min-width:0; }
.bf-pros .board .who small .tag { flex:none; }
.bf-pros .board .who > div { min-width:0; }
.bf-pros .board-more { text-align:center; padding-top:10px; }
.bf-pros .board-sort { margin-bottom:10px; }
/* Rail + phone rows: line 1 = rank · bettor · Follow (full kit-size button, never next to a figure);
   lines 2–3 = two rows of three equal stat cells (Profit ROI CLV / Win Bets Record), so no two values
   can run into each other. Flex + order instead of grid areas: the bettor line needs an auto-width
   button column that the stat lines must not inherit. */
@media (min-width:1280px), (max-width:859px) {
  .bf-pros .board, .bf-pros .board tbody { display:block; }
  .bf-pros .board thead { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
  .bf-pros .board tbody tr { --ind:26px; display:flex; flex-wrap:wrap; align-items:center; row-gap:4px; padding:10px 0 10px var(--ind); border-bottom:1px solid var(--line-2); }
  .bf-pros .board tbody td { display:block; padding:0; border:0; min-width:0; font-size:var(--t-xs); text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bf-pros .board td.rank { order:0; flex:0 0 var(--ind); margin-left:calc(-1 * var(--ind)); width:auto; text-align:left; }
  .bf-pros .board td.c-who { order:1; flex:1 1 0; overflow:visible; padding-right:8px; }
  .bf-pros .board .who { gap:8px; }
  .bf-pros .board .who .av { width:30px; height:30px; font-size:11px; }
  .bf-pros .board td.act { order:2; flex:none; overflow:visible; }
  .bf-pros .board td.act .btn { white-space:nowrap; }
  /* forced line break after the Follow button (a flex item ordered between the bettor line and the stats) */
  .bf-pros .board tbody tr::after { content:""; order:3; flex:0 0 100%; height:0; }
  /* stat cells: three per line in fixed columns (30/32/38%: the last holds the long W-L-P record), left-aligned */
  .bf-pros .board td.c-profit, .bf-pros .board td.c-roi, .bf-pros .board td.c-clv,
  .bf-pros .board td.c-win, .bf-pros .board td.c-bets, .bf-pros .board td.c-rec { flex:0 0 32%; padding-right:6px; text-align:left; }
  .bf-pros .board td.c-profit, .bf-pros .board td.c-win { flex-basis:30%; }
  .bf-pros .board td.c-clv, .bf-pros .board td.c-rec { flex-basis:38%; }
  .bf-pros .board td.c-profit { order:4; margin-top:2px; font:900 var(--t-md)/1 var(--f-head); }
  .bf-pros .board td.c-roi { order:5; margin-top:2px; } .bf-pros .board td.c-clv { order:6; margin-top:2px; }
  .bf-pros .board td.c-win { order:7; } .bf-pros .board td.c-bets { order:8; } .bf-pros .board td.c-rec { order:9; padding-right:0; }
  .bf-pros .board td.c-spk { display:none; }   /* the 12-month ROI is the drawer's Monthly ROI chart */
  .bf-pros .board td.lb::before { content:attr(data-s) " "; color:var(--muted); font-weight:600; }
}
@media (max-width:859px) {
  .bf-pros .board tbody tr { --ind:30px; }
}
/* 860–1279px: the full table scrolls sideways inside its panel instead of widening the page. */
@media (min-width:860px) and (max-width:1279px) { .bf-pros [data-board] { overflow-x:auto; } }
/* the rail itself */
@media (min-width:1280px) {
  .bf-pros .pros-board { padding:12px; }
  .bf-pros .board tbody tr { --ind:22px; }
  .bf-pros .board .who { gap:6px; }
  .bf-pros .board .who .av { width:26px; height:26px; font-size:10px; }
  .bf-pros .board td.c-who { padding-right:6px; }
  .bf-pros .board td.c-rec.lb::before { content:none; }   /* the rail is tight: record shows as 1178-943-32 (title says Record) */
  .bf-pros .pros-board .sec-head { margin-bottom:8px; }
  .bf-pros .pros-board .sec-head h2 { font-size:var(--t-xl); }
  .bf-pros .board tbody tr:last-child { border-bottom:0; }
  .bf-pros .board td.act .btn.sm { font-size:14px; padding:4px 8px; }   /* kit height, a touch narrower so the full handle fits */
}

/* ---- bettor drawer ---- */
.pro-dr .chart { width:100%; height:auto; display:block; }
.pro-dr .chart text { font-size:10px; fill:var(--muted); font-family:var(--f-body); }
.pro-dr h3 { font-size:var(--t-md); margin:4px 0 8px; }
.pro-dr h3 .muted { font:400 var(--t-sm) var(--f-body); }
.pro-dr .top { display:flex; gap:14px; align-items:center; }
.pro-dr .top h2 { font-size:var(--t-xl); }
.pro-dr .top .meta { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:4px; font-size:var(--t-xs); color:var(--muted); }
.pro-dr .sb { display:grid; grid-template-columns:70px 1fr auto; gap:8px; align-items:center; font-size:var(--t-sm); margin-bottom:6px; }
.pro-dr .hist { width:100%; border-collapse:collapse; font-size:var(--t-sm); }
.pro-dr .hist td { padding:7px 4px; border-bottom:1px solid var(--line-2); vertical-align:top; }
.pro-dr .hist td small { display:block; color:var(--muted); font-size:var(--t-xs); }
.pro-dr .hist td:last-child { text-align:right; white-space:nowrap; }
.pro-dr .sig-note { margin:0; font-size:var(--t-sm); color:var(--muted); }`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-bettor-signals')) document.head.insertAdjacentHTML('beforeend', `<style id="css-bettor-signals">${CSS}</style>`);

  const B = api.bettors;
  const st = { sort: 'units', showAll: false };
  const money0 = (x) => odds.money(x, 0);
  const bookName = (id) => api.bookById[id]?.name || id;
  const avatar = (b, cls = '') => `<span class="av ${cls}" style="--h:${b.hue}" aria-hidden="true">${ui.esc(b.avatarInitials)}</span>`;
  // Follow buttons: the verb is a static, overridable span inside the nodata list.
  const followBtn = (b) => B.isFollowing(b.id)
    ? `<button type="button" class="btn sm following" data-follow="${b.id}" aria-pressed="true"><span data-bf-text>✓ Following</span></button>`
    : `<button type="button" class="btn sm outline" data-follow="${b.id}" aria-pressed="false"><span data-bf-text>+ Follow</span></button>`;
  const signed = (x, d = 1) => `<span class="${x >= 0 ? 'up-n' : 'dn-n'}">${x >= 0 ? '+' : '−'}${odds.pct(Math.abs(x), d)}</span>`;

  // Tab (below 1280px): ?tab=board → remembered → feed.
  const view = ui.view();
  st.sort = ['units', 'roi', 'clv', 'winRate'].includes(view.get('boardSort')) ? view.get('boardSort') : 'units'; // remembered (B9)
  let tab = params?.tab === 'board' || params?.tab === 'feed' ? params.tab : view.get('tab', 'feed');

  root.innerHTML = `<div class="bf-pros">
    ${ui.pageHead({
      title: 'Pro Bettor Signals',
      tool: 'bettor-signals',
      subtitle: 'Follow verified, long-term profitable sports bettors. When they bet, you see it instantly with the best price still available and exactly how much to stake.',
      live: { label: 'Live signals' },
      facts: [],
    })}
    <div class="seg pros-tabs" role="tablist" aria-label="Pro Bettor Signals views">
      <button type="button" role="tab" id="pros-tab-feed" aria-controls="pros-feed" data-tab="feed">Live signals</button>
      <button type="button" role="tab" id="pros-tab-board" aria-controls="pros-board" data-tab="board">Leaderboard</button>
    </div>
    <div class="pros-layout" data-tab="${tab}">
      ${ui.sec('Live signals', '<div data-filters></div><div data-table></div><div data-lock></div>', {
        cls: 'feed-sec pros-feed', id: 'pros-feed',
        actions: `<span class="st-legend" aria-hidden="true">${ui.status('Still available', 'ok')}${ui.status('Line moved', 'warn')}</span><span data-tools-slot></span>`,
      })}
      ${ui.sec('Leaderboard', `<div class="board-sort">${ui.seg('sort', [['units', 'Profit'], ['roi', 'ROI'], ['clv', 'CLV'], ['winRate', 'Win rate']], st.sort)}</div><div data-board></div>`, { cls: 'aside pros-board', id: 'pros-board' })}
    </div>
    ${ui.how({
      title: 'How following pros works',
      summary: 'We track verified bettors’ records and show their new bets at the best price you can still get.',
      checks: [
        `Every bettor here has a long, verified record. We rank them by profit, ${ui.term('roi', 'ROI')}, ${ui.term('clv', 'CLV')} and win rate.`,
        'Follow the ones you trust. Their new bets show up in Live signals the moment they are placed.',
        `We find the best price for the same bet at your books right now, and size a stake from your ${ui.term('unit', 'unit')}, their stake and their record.`,
        `If the price has moved past where they bet, set a price alert and we tell you when it is back. Every pick is a ${ui.term('signal')}: it can lose.`,
      ],
    })}
  </div>`;

  // ---------------------------------------------------------------------------------------------
  // Tabs (only visible below 1280px; the rail shows both at once above that).
  // ---------------------------------------------------------------------------------------------
  const layout = root.querySelector('.pros-layout');
  function setTab(t, { persist = true } = {}) {
    tab = t;
    layout.dataset.tab = t;
    root.querySelectorAll('.pros-tabs [role="tab"]').forEach((b) => {
      const on = b.dataset.tab === t;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (persist) { view.set({ tab: t }); ui.setQuery({ tab: t === 'feed' ? null : t }); }
  }
  root.querySelector('.pros-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  root.querySelector('.pros-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = tab === 'feed' ? 'board' : 'feed';
    setTab(next);
    root.querySelector(`.pros-tabs [data-tab="${next}"]`).focus();
  });
  root.querySelector('#pros-feed').setAttribute('role', 'tabpanel');
  root.querySelector('#pros-feed').setAttribute('aria-labelledby', 'pros-tab-feed');
  root.querySelector('#pros-board').setAttribute('role', 'tabpanel');
  root.querySelector('#pros-board').setAttribute('aria-labelledby', 'pros-tab-board');
  setTab(tab, { persist: false });

  // ---------------------------------------------------------------------------------------------
  // Filters: Feed (Following / All pros) → Sport → Books. Feed + sport go into the hash.
  // ---------------------------------------------------------------------------------------------
  const fb = ui.filterBar({
    id: 'pros',
    fields: [
      { key: 'feed', type: 'mode', label: 'Feed', default: 'following', options: [['following', 'Following'], ['all', 'All pros']], query: true },
      { key: 'sport', type: 'select', label: 'Sport', default: 'All', options: [['All', 'All sports'], ...api.sports.map((s) => [s, s])], query: true },
      { key: 'books', type: 'books' },
    ],
    onChange: () => { paintFeed(); paintBoard(); paintStats(); },
  });
  root.querySelector('[data-filters]').append(fb.el);
  const f = fb.values;

  function recStake(sig, b) {
    const s = store.get();
    const roiF = Math.min(1.6, Math.max(0.6, 1 + b.record.roi * 3));
    return Math.max(5, Math.round((s.unit * sig.stakeUnits * (0.5 + sig.confidence * 0.7) * roiF) / 5) * 5);
  }
  const allSignals = () => B.signals({ books: store.get().books, sport: f.sport });
  const readSignal = (id) => B.signals({ books: store.get().books }).find((x) => x.id === id) || null;
  // Latest 25 of the chosen feed (the window, not a bet going away: rows leaving it are dropped quietly).
  const feedRows = () => (f.feed === 'following' ? allSignals().filter((s) => B.isFollowing(s.bettorId)) : allSignals()).slice(0, 25);

  // ---------------------------------------------------------------------------------------------
  // Facts strip
  // ---------------------------------------------------------------------------------------------
  let lastFacts = '';
  function paintStats() {
    const fol = B.following().map(B.bettorById).filter(Boolean);
    const today = B.signals({ since: Date.now() - 24 * 3600e3, books: store.get().books });
    const folSigs = today.filter((s) => B.isFollowing(s.bettorId));
    const avgRoi = fol.reduce((a, b) => a + b.record.roi, 0) / Math.max(1, fol.length);
    const top = B.bettors()[0];
    const html = ui.facts([
      { label: 'Following', value: String(fol.length), note: `of ${B.bettors().length} verified pros` },
      { label: 'Signals today', value: String(folSigs.length), note: `${today.length} from all pros` },
      // Hidden instead of "+0.0%" when nobody is followed (B8).
      fol.length && { label: 'Avg ROI of who you follow', value: `+${odds.pct(avgRoi)}`, tone: 'pos', note: 'lifetime, verified', term: 'roi' },
      { label: 'Top bettor', value: ui.esc(top.handle), note: `+${top.record.units}u · ${odds.pct(top.record.roi)} ROI`, act: 'top-pro' },
    ]);
    if (html === lastFacts) return;
    lastFacts = html;
    const old = root.querySelector('.page-head .facts');
    if (old) old.outerHTML = html; else root.querySelector('.page-head').insertAdjacentHTML('beforeend', html);
  }
  // Facts "Top bettor" opens that bettor.
  ui.onAction(root.querySelector('.page-head'), { 'top-pro': () => openPro(B.bettors()[0].id) });

  // ---------------------------------------------------------------------------------------------
  // Live signals: keyed table
  // ---------------------------------------------------------------------------------------------
  const statusOf = (s) => (s.stillGood ? `<span title="Still available">${ui.status('Still available', 'ok')}</span>` : `<span title="Line moved">${ui.status('Line moved', 'warn')}</span>`);
  const t = ui.table({
    id: 'pros-feed',
    caption: 'Latest bets from tracked pro bettors',
    rowKey: (s) => s.id,
    goneMs: -1, // signals only leave the latest-25 window; nothing was pulled, so they drop without a "Gone" state
    columns: [
      { key: 'age', label: 'Time', sort: (s) => s.placedAt, render: (s) => `<span class="muted" title="Placed ${ui.ago(s.placedAt)}">${ui.age(s.placedAt)}</span>` },
      { key: 'bettor', label: 'Bettor · They bet', render: (s) => {
        const b = B.bettorById(s.bettorId);
        // Who, and what they took: "+121 at PX · 0.5u" (their price, book and stake).
        return `<div class="c2 who-c"><button type="button" class="who-btn" data-act="pro" title="${ui.esc(b.handle)} · ${ui.esc(b.tier)} · +${odds.pct(b.record.roi)} ROI" aria-label="Open ${ui.esc(b.handle)}’s record">${avatar(b, 'sm')}<b>${ui.esc(b.handle)}</b></button>
          <small class="took">${ui.price(s.priceTaken)} at ${ui.esc(api.bookById[s.bookTaken]?.short || s.bookTaken)} · ${s.stakeUnits}u</small></div>`;
      } },
      { key: 'bet', label: 'Bet', render: (s) => {
        const ev = api.eventById(s.eventId);
        return `<div class="c2"><span class="sel" title="${ui.esc(s.selection)}">${ui.esc(s.selection)}</span><span class="evn">${ev.live ? ui.liveDot() : ''}${ui.esc(s.sport)} · ${ui.esc(ev.away)} @ ${ui.esc(ev.home)}${ev.live ? '' : ` · ${ui.when(ev.start)}`}</span></div>`;
      } },
      { key: 'best', label: 'Best now', sort: (s) => s.bestPriceNow, trend: (s) => s.bestPriceNow,
        render: (s) => `<div class="c2">${ui.price(s.bestPriceNow, { best: true })}${ui.book(s.bestBookNow)}</div>` },
      { key: 'edge', label: 'Edge', sort: (s) => s.edge, trend: (s) => s.edge, title: ui.termTitle('ev'),
        render: (s) => `<div class="c2 edge-c">${ui.edge(s.edge)}${ui.risk('pro', { short: true })}</div>` },
      { key: 'status', label: 'Status', align: 'c', title: 'Still available, or the line moved past their price', render: statusOf },
      { key: 'stake', label: 'Stake', align: 'r', sort: (s) => (s.edge > 0 ? recStake(s, B.bettorById(s.bettorId)) : -1), render: (s) => {
        if (s.edge <= 0) return `<div class="c2 stk" title="We alert you when it’s back"><span class="tgt">Target ${ui.fmtOdds(s.priceTaken)}</span><small>alert when back</small></div>`;
        const stake = recStake(s, B.bettorById(s.bettorId));
        return `<div class="c2 stk" title="Recommended stake"><span><b>${money0(stake)}</b> <small class="muted">${(stake / store.get().unit).toFixed(1)}u</small></span>${ui.evLine({ prob: s.fairProb, ev: stake * s.edge }).replace(' · ', '<br>')}</div>`;
      } },
    ],
    action: (s) => (s.edge > 0
      ? ui.actions(ui.betAction({ verb: 'Bet', amount: money0(recStake(s, B.bettorById(s.bettorId))), book: s.bestBookNow, title: `Bet at ${bookName(s.bestBookNow)}` }), [['calc', 'Calc'], ['log', 'Log'], ['alert', 'Alert']])
      : ui.actions(ui.betAction({ verb: 'Set price alert', act: 'alert', tone: 'outline' }), [['calc', 'Calc']])),
    onAction: {
      pro: (s) => openPro(s.bettorId, s.id),
      bet: (s) => ui.toast(`Opening ${bookName(s.bestBookNow)} bet slip…`),
      calc: (s) => { location.hash = calcHref(s, recStake(s, B.bettorById(s.bettorId))); },
      log: (s) => logSignal(s, recStake(s, B.bettorById(s.bettorId))),
      alert: (s) => alertSignal(s),
    },
    onOpen: (s) => openPro(s.bettorId, s.id),
    sort: { key: 'age', dir: 'desc' },
    // Phones: 4 tracks so the bettor line and the price line don't share a first column (a long handle
    // used to widen "Best now" and squeeze Edge into the Stake cell).
    mobile: { areas: ['bettor bettor status age', 'bet bet bet bet', 'best edge edge stake', 'act act act act'], cols: 'auto auto minmax(0,1fr) auto' },
    empty: () => emptyFeed(),
  });
  root.querySelector('[data-table]').append(t.el);
  const tools = t.el.querySelector('.tbl-tools');
  if (tools) root.querySelector('[data-tools-slot]').replaceWith(tools);

  function emptyFeed() {
    const following = f.feed === 'following';
    const near = allSignals().slice(0, 3).map((s) => { const b = B.bettorById(s.bettorId); return `<p><b>${ui.esc(b.handle)}</b> · ${ui.esc(s.selection)} · ${ui.price(s.bestPriceNow)} at ${ui.esc(bookName(s.bestBookNow))}</p>`; }).join('');
    return ui.empty({
      title: following ? 'No bets from the pros you follow yet' : 'No signals match these filters',
      msg: following ? 'Follow a few pros from the leaderboard and their bets show up here the moment they place them.' : 'No signals for this sport yet today. New ones appear here the moment they are placed.',
      actions: [
        following ? { label: 'Show all pros', act: 'feed-all' } : { label: 'Reset filters', act: 'reset' },
        { label: 'See the leaderboard', act: 'to-board' },
        { label: 'Sharp Money', href: '#/sharp-money' },
      ],
      near: following ? near : '', nearLabel: 'Latest from all pros', mate: true,
    });
  }
  ui.onAction(root.querySelector('.pros-feed'), {
    reset: () => fb.reset(),
    'feed-all': () => fb.set({ feed: 'all' }),
    'to-board': () => { setTab('board'); root.querySelector('#pros-board').scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  });

  let lastLock = '';
  function paintFeed() {
    const rows = feedRows();
    const { rows: shown, card } = ui.lockRows(rows, 'bettor-signals', { n: 3, noun: 'signals' });
    if (card !== lastLock) { root.querySelector('[data-lock]').innerHTML = card; lastLock = card; }
    t.update(shown);
  }

  // ---------------------------------------------------------------------------------------------
  // Leaderboard (static list: repainted on sort / sport / follow changes, not on ticks)
  // ---------------------------------------------------------------------------------------------
  const boardEl = root.querySelector('[data-board]');
  function paintBoard() {
    let list = B.bettors().filter((b) => f.sport === 'All' || b.specialty.includes(f.sport));
    const key = { units: (b) => b.record.units, roi: (b) => b.record.roi, clv: (b) => b.record.clv, winRate: (b) => b.record.winRate }[st.sort];
    list = [...list].sort((a, b) => key(b) - key(a));
    const shown = st.showAll ? list : list.slice(0, 10);
    if (!list.length) {
      boardEl.innerHTML = ui.empty({ title: 'No tracked pros for this sport yet', msg: 'Pick another sport, or follow the money on Sharp Money.', actions: [{ label: 'All sports', act: 'reset' }, { label: 'Sharp Money', href: '#/sharp-money' }] });
      return;
    }
    boardEl.innerHTML = `<table class="t board"><caption class="sr-only">Leaderboard of verified pro bettors</caption><thead><tr>
      <th>#</th><th>Bettor</th><th class="rt">Bets</th><th class="rt">Record</th><th class="rt">Win %</th><th class="rt" title="${ui.termTitle('roi')}">ROI</th><th class="rt">Profit</th><th class="rt" title="${ui.termTitle('clv')}">CLV</th><th>12-mo ROI</th><th><span class="sr-only">Follow</span></th></tr></thead>
      <tbody data-bf-list data-bf-nodata>${shown.map((b, k) => `<tr class="click" data-pro="${b.id}" tabindex="0">
        <td class="rank">${k + 1}</td>
        <td class="c-who"><div class="who">${avatar(b)}<div><b>${ui.esc(b.handle)} <span class="ck" title="Verified">✔</span></b><small>${ui.tag(b.tier, 'dark')} <span>${b.specialty.map((s) => ui.esc(s)).join(' · ')} · ${ui.esc(b.streak)}</span></small></div></div></td>
        <td class="rt c-bets lb" data-label="Bets" data-s="Bets">${b.record.bets.toLocaleString()}</td>
        <td class="rt c-rec lb" data-label="Record" data-s="W-L" title="Record (won-lost-push)">${b.record.wins}-${b.record.losses}${b.record.pushes ? `-${b.record.pushes}` : ''}</td>
        <td class="rt c-win lb" data-label="Win %" data-s="Win">${odds.pct(b.record.winRate)}</td>
        <td class="rt c-roi lb" data-label="ROI" data-s="ROI">${signed(b.record.roi)}</td>
        <td class="rt c-profit" data-label="Profit"><span class="up-n">+${b.record.units}u</span></td>
        <td class="rt c-clv lb" data-label="CLV" data-s="CLV">${signed(b.record.clv)}</td>
        <td class="c-spk" data-label="12-mo ROI" title="12-month ROI">${ui.spark(b.monthly.map((m) => m.roi), { w: 100, h: 26 })}</td>
        <td class="act">${followBtn(b)}</td></tr>`).join('')}
      </tbody></table>
      ${list.length > 10 ? `<div class="board-more"><button type="button" class="btn sm outline" data-more>${st.showAll ? 'Show top 10' : `Show all ${list.length}`}</button></div>` : ''}`;
  }
  boardEl.addEventListener('click', (e) => {
    const fbtn = e.target.closest('[data-follow]');
    if (fbtn) { toggleFollow(fbtn.dataset.follow); return; }
    if (e.target.closest('[data-more]')) { st.showAll = !st.showAll; paintBoard(); return; }
    if (e.target.closest('[data-act="reset"]')) { fb.reset(); return; }
    const tr = e.target.closest('tr[data-pro]');
    if (tr) openPro(tr.dataset.pro);
  });
  boardEl.addEventListener('keydown', (e) => {
    const tr = e.target.matches?.('tr[data-pro]') ? e.target : null;
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPro(tr.dataset.pro); }
  });
  ui.onSeg(root, 'sort', (v) => { st.sort = v; view.set({ boardSort: v }); root.querySelectorAll('[data-seg="sort"] button').forEach((x) => x.classList.toggle('on', x.dataset.v === v)); paintBoard(); });

  function toggleFollow(id) {
    const b = B.bettorById(id);
    if (B.isFollowing(id)) { B.unfollow(id); ui.toast(`Unfollowed ${b.handle}`); } else { B.follow(id); ui.toast(`Following ${b.handle}. Their bets now appear in your feed.`); }
  }

  // ---------------------------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------------------------
  function calcHref(s, stake) {
    // Kelly calculator, prefilled: a = best price now, b = fair price, stake.
    return `#/calculators?tab=kelly&a=${s.bestPriceNow}&b=${odds.probToAmerican(s.fairProb)}&stake=${Math.round(stake)}`;
  }
  function logSignal(s, stake) {
    ui.logBet({ kind: 'signal', book: s.bestBookNow, sport: s.sport, market: s.market, selection: s.selection, price: s.bestPriceNow, stake });
  }
  function alertSignal(s) {
    ui.toast(`Alert set: ${s.selection} at ${ui.fmtOdds(s.priceTaken)} or better`);
  }

  // ---------------------------------------------------------------------------------------------
  // Bettor drawer. Opened from a signal it starts with that bet as a slip (Bet / Log / Alert in the
  // sticky footer, stale-price guard); from the leaderboard it starts with their latest open bet.
  // ---------------------------------------------------------------------------------------------
  function openPro(id, sigId = null) {
    const b = B.bettorById(id);
    if (!b) return;
    const hist = B.history(id);
    const recent = hist.slice(0, 12);
    const last25 = hist.reduce((a, h) => a + h.pnlUnits, 0);
    let sig = sigId ? readSignal(sigId) : null;
    const latest = sig || B.signals({ books: store.get().books, bettorId: id })[0] || null;
    let stake = sig ? recStake(sig, b) : latest ? recStake(latest, b) : store.get().unit;

    const slipHtml = (s) => {
      if (!s) return '';
      const win = stake * (odds.toDecimal(s.bestPriceNow) - 1);
      return `${ui.slip({
        caption: sig ? 'This bet' : 'Their latest bet', tag: s.stillGood ? 'Still available' : 'Line moved',
        legs: [{ title: ui.esc(s.selection), sub: `They bet ${ui.fmtOdds(s.priceTaken)} at ${ui.esc(bookName(s.bookTaken))} · ${s.stakeUnits}u · best now at ${ui.esc(bookName(s.bestBookNow))}`, odds: ui.fmtOdds(s.bestPriceNow), stake: money0(stake) }],
        result: s.edge > 0 ? `To win ${money0(win)} · worth +${odds.money(stake * s.edge)} on average` : `No edge at ${ui.fmtOdds(s.bestPriceNow)} right now · target ${ui.fmtOdds(s.priceTaken)}`,
        math: `Edge ${s.edge >= 0 ? '+' : ''}${odds.pct(s.edge, 2)} · confidence ${odds.pct(s.confidence, 0)} · ${ui.riskWin(stake, s.bestPriceNow)}.${s.edge > 0 ? '' : ' Set a price alert and we tell you when it’s back.'}`,
      })}
      <div class="row">${ui.calcLink({ tab: 'kelly', a: s.bestPriceNow, b: odds.probToAmerican(s.fairProb), stake })}</div>`;
    };
    const footer = (s) => (!s ? `${ui.calcLink({ tab: 'kelly', cls: 'btn ghost' })}`
      : s.edge > 0 ? `${ui.betAction({ verb: 'Bet', amount: `${money0(stake)} at ${ui.esc(bookName(s.bestBookNow))}`, book: s.bestBookNow, size: '', autofocus: true })}${ui.ghost('log', 'Log')}${ui.ghost('alert', 'Alert')}`
        : `${ui.betAction({ verb: 'Set price alert', act: 'alert', size: '', tone: 'outline', autofocus: true })}${ui.ghost('log', 'Log')}`);

    const body = ui.drawer(b.handle, `<div class="pro-dr stack">
      <div class="top">${avatar(b, 'lg')}<div style="flex:1;min-width:0">
        <div class="meta"><span class="ck">✔ Verified</span> ${ui.tag(b.tier, 'dark')} ${b.specialty.map(ui.sport).join(' ')}</div>
        <div class="meta">Tracked since ${b.since} · ${b.followers.toLocaleString()} followers</div></div>
        <div data-fbtn>${followBtn(b)}</div></div>
      <div data-slip>${slipHtml(latest)}</div>
      <p style="margin:0">${ui.esc(b.bio)}</p>
      ${ui.facts([
        { label: 'ROI', value: `+${odds.pct(b.record.roi)}`, tone: 'pos', term: 'roi' },
        { label: 'Profit', value: `+${b.record.units}u`, tone: 'pos', term: 'unit' },
        { label: 'Win rate', value: odds.pct(b.record.winRate), note: `${b.record.wins}-${b.record.losses}` },
        { label: 'Avg CLV', value: `+${odds.pct(b.record.clv)}`, term: 'clv' },
      ])}
      <dl class="kv"><dt>Bets tracked</dt><dd>${b.record.bets.toLocaleString()}</dd><dt>Avg odds</dt><dd>${ui.fmtOdds(b.avgOdds)}</dd><dt>Avg stake</dt><dd>${money0(b.avgStake)}</dd><dt>Current streak</dt><dd>${ui.esc(b.streak)}</dd><dt>Favorite markets</dt><dd>${b.markets.map(ui.esc).join(', ')}</dd></dl>
      <div><h3>Monthly ROI</h3>${roiChart(b.monthly)}</div>
      <div><h3>By sport</h3>${b.sportBreakdown.map((s) => `<div class="sb"><span>${ui.sport(s.sport)}</span><div class="bar"><i style="width:${Math.min(100, (s.bets / b.record.bets) * 100)}%"></i></div><span class="muted">${s.bets} bets · ${signed(s.roi)}</span></div>`).join('')}</div>
      <div><h3>Recent bets <span class="muted">Last 25: ${last25 >= 0 ? '+' : '−'}${Math.abs(last25).toFixed(1)}u</span></h3><table class="hist"><tbody data-bf-nodata>
        ${recent.map((h) => `<tr><td><b>${ui.esc(h.selection)}</b><small>${ui.esc(h.sport)} · ${ui.esc(h.market)} · ${ui.ago(h.date)} · CLV ${h.clv >= 0 ? '+' : '−'}${odds.pct(Math.abs(h.clv))}</small></td>
          <td>${ui.price(h.price)} ${ui.book(h.book)}<small>${h.units}u</small></td>
          <td>${h.result === 'won' ? ui.status(`Won +${h.pnlUnits}u`, 'ok') : h.result === 'lost' ? ui.status(`Lost ${h.pnlUnits}u`, 'bad') : ui.status('Push', 'muted')}</td></tr>`).join('')}
      </tbody></table></div>
      ${ui.related([['sharp-money', 'Sharp Money'], ['ai-picks', 'AI Sports Picks'], ['deposit-optimizer', 'Deposit Optimizer']])}
    </div>`, { risk: latest ? 'pro' : '', kicker: latest ? ui.esc(latest.selection) : '', footer: footer(latest) });

    const fbox = body.querySelector('[data-fbtn]');
    fbox.addEventListener('click', (e) => {
      if (!e.target.closest('[data-follow]')) return;
      toggleFollow(id);
      fbox.innerHTML = followBtn(b);
    });
    const cur = () => sig || latest;
    ui.onAction(body.panel, {
      bet: () => ui.toast(`Opening ${bookName(cur().bestBookNow)} bet slip…`),
      log: () => logSignal(cur(), stake),
      alert: () => alertSignal(cur()),
    });
    if (latest) {
      // Stale-price guard on the bet in the slip.
      ui.liveGuard(body, {
        read: () => readSignal(latest.id),
        sig: (x) => `${x.bestBookNow}:${x.bestPriceNow}`,
        onUpdate: (n, prev) => {
          if (sig) sig = n;
          Object.assign(latest, n);
          body.querySelector('[data-slip]').innerHTML = slipHtml(n);
          body.setFooter(footer(n));
          return `Price moved ${ui.fmtOdds(prev.bestPriceNow)} → ${ui.fmtOdds(n.bestPriceNow)} at ${bookName(n.bestBookNow)}`;
        },
        goneMsg: 'This bet is no longer listed. Nothing was placed.',
      });
    }
  }

  function roiChart(months) {
    const W = 480, H = 150, top = 12, bottom = 20;
    const vals = months.map((m) => m.roi);
    const max = Math.max(0.05, ...vals), min = Math.min(0, ...vals);
    const y = (v) => top + ((max - v) / (max - min)) * (H - top - bottom);
    const bw = (W - 8) / months.length;
    // Losing months are hatched (not red), so the chart never relies on colour alone.
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly ROI">
      <defs><pattern id="pro-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--panel)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="2"/></pattern></defs>
      <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>
      ${months.map((m, k) => {
        const yv = y(m.roi), y0 = y(0);
        return `<rect x="${4 + k * bw + 3}" y="${Math.min(yv, y0)}" width="${bw - 6}" height="${Math.max(1, Math.abs(y0 - yv))}" rx="2" fill="${m.roi >= 0 ? 'var(--pos)' : 'url(#pro-hatch)'}"${m.roi >= 0 ? '' : ' stroke="var(--muted)"'}><title>${m.month}: ${(m.roi * 100).toFixed(1)}%</title></rect>
          <text x="${4 + k * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${m.month}</text>`;
      }).join('')}
      <text x="4" y="${top + 2}">${(max * 100).toFixed(0)}%</text></svg>`;
  }

  paintStats(); paintFeed(); paintBoard();
  // Deep link (#/bettor-signals?id=sg12 or ?pro=<bettor id>) opens that drawer.
  if (params?.id || params?.pro) setTimeout(() => {
    const s = params.id ? readSignal(params.id) : null;
    if (s) openPro(s.bettorId, s.id);
    else if (params.pro && B.bettorById(params.pro)) openPro(params.pro);
    else if (params.id) ui.toast('That signal has gone. Here are the latest ones.');
  }, 0);
  const unF = B.onFollowChange(() => { paintStats(); paintFeed(); paintBoard(); });
  const unT = api.onTick(() => { paintFeed(); paintStats(); });
  const unS = store.subscribe(() => { paintFeed(); paintStats(); });
  return () => { unF(); unT(); unS(); fb.destroy?.(); t.destroy(); };
}
