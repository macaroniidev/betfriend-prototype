// Alerts: rules for any tool, delivered by push / SMS / email / Discord, plus a live notification feed
// that fires when a matching opportunity appears on the odds tick.
//
// Layout (UX rebuild, items B1/B6/B7/B8/B14, C13): results-first head with live status and a flat facts
// strip; the feed (the results) leads, with "Your rules" and "New alert rule" beside it on desktop and
// below it on phones. No inner scroll anywhere: the feed pages with "Show more". Paused rules carry a
// Paused tag (no opacity fade), books are picked from a popover instead of a chip wall.
//
// Prefill from other screens ("Alert me"): #/alerts?tool=arbitrage&min=1.5&sport=NBA&book=dk&name=…

const CSS = `
/* The facts strip lives inside the page head (one editor block with the title). */
.al .al-facts { grid-column: 1 / -1; margin-top: 4px; }
.al .al-facts .facts { margin-bottom: 0; }
.al > .page-head { margin-bottom: 18px; }
.al .al-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-areas: "feed rules" "feed new"; gap: 0 32px; align-items: start; }
.al .al-feed-sec { grid-area: feed; }
.al .al-grid > .sec { margin-top: 0; }
.al .al-rules-sec { grid-area: rules; }
.al .al-grid > .al-new-sec { grid-area: new; margin-top: 28px; }
.al .sec-head .muted { font-size: var(--t-sm); font-weight: 700; }

/* Feed: one line of meaning per notification; the whole row links to the tool. */
.al .feed { display: grid; }
.al .note { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 4px 12px; padding: 11px 6px; border-bottom: 1px solid var(--line-2); color: inherit; text-decoration: none; border-radius: 0; }
.al .note:first-child { padding-top: 4px; }
.al .note:hover { background: var(--panel); }
.al .note:hover .t1 { color: var(--accent); }
.al .note .ic { grid-row: span 3; width: 36px; height: 36px; border-radius: 10px; background: var(--deep); color: var(--lime); display: grid; place-items: center; }
.al .note .t1 { font-weight: 800; font-size: var(--t-body); line-height: 1.3; min-width: 0; }
.al .note .t2 { grid-column: 2 / -1; font-size: var(--t-sm); color: var(--muted); line-height: 1.35; }
.al .note .t3 { grid-column: 2 / -1; display: flex; gap: 4px 8px; flex-wrap: wrap; align-items: center; font-size: var(--t-xs); color: var(--muted); font-weight: 600; margin-top: 2px; }
.al .note .when { font-size: var(--t-xs); font-weight: 700; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.al .note .new-tag { display: inline-block; margin-right: 6px; padding: 0 5px; border-radius: 4px; background: var(--soft); color: var(--accent); font: 900 10px/16px var(--f-body); vertical-align: 2px; }
.al .note.is-new { box-shadow: inset 4px 0 0 var(--g); background: var(--hl); }

/* Rules */
.al .rules { display: grid; }
.al .rule { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 11px 0; border-bottom: 1px solid var(--line-2); }
.al .rule:first-child { padding-top: 2px; }
.al .rule .t1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 800; font-size: var(--t-body); }
.al .rule .t1 svg { flex: none; color: var(--accent); }
.al .rule.off .t1 svg { color: var(--muted); }
.al .rule .t2 { font-size: var(--t-xs); color: var(--muted); margin-top: 4px; display: flex; gap: 4px 6px; flex-wrap: wrap; align-items: center; font-weight: 600; }
.al .rule .t2 b { color: var(--text); font-weight: 700; }

/* Square-cornered switch (no pill shapes in the brand). */
.al .sw { position: relative; width: 40px; height: 24px; flex: none; display: inline-block; margin-top: 1px; }
.al .sw input { opacity: 0; width: 100%; height: 100%; position: absolute; inset: 0; margin: 0; cursor: pointer; z-index: 1; }
.al .sw span { position: absolute; inset: 0; background: var(--panel); border: 2px solid var(--line-strong); border-radius: 7px; transition: background .15s, border-color .15s; }
.al .sw span::after { content: ""; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: var(--muted); border-radius: 4px; transition: transform .15s, background .15s; }
.al .sw input:checked + span { background: var(--g); border-color: var(--g); }
.al .sw input:checked + span::after { transform: translateX(16px); background: #FFFFFF; }
.al .sw input:focus-visible + span { outline: 3px solid var(--focus); outline-offset: 2px; }

/* New rule form */
.al .form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.al .form .full { grid-column: 1 / -1; }
.al .form .field > span { display: block; }
.al .chan { display: flex; gap: 10px 18px; flex-wrap: wrap; }
.al .chan .check { font-size: var(--t-sm); gap: 8px; }
.al .al-books { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.al .al-books .fb-pop { width: min(420px, 86vw); }
.al .al-books .check b { display: inline-block; min-width: 2.6em; font-weight: 800; }
.al .al-books .btn b:empty { display: none; }
.al .al-books-sum { font-size: var(--t-sm); color: var(--muted); font-weight: 600; }
.al .pop-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line-2); font-size: var(--t-sm); }
.al .create { display: flex; align-items: center; gap: 10px 14px; flex-wrap: wrap; }
.al .create .muted { font-size: var(--t-sm); }

@media (max-width: 1100px) {
  .al .al-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: "feed" "rules" "new"; }
  .al .al-grid > .al-rules-sec { margin-top: 28px; }
}
@media (max-width: 860px) {
  .al .note { grid-template-columns: 32px minmax(0, 1fr) auto; gap: 3px 10px; padding: 10px 2px; }
  .al .note .ic { width: 32px; height: 32px; }
  .al .rule .acts .btn { padding-inline: 4px; }
}
@media (max-width: 520px) { .al .form { grid-template-columns: minmax(0, 1fr); } }`;

const TOOLS = [
  { id: 'arbitrage', label: 'Arbitrage', ic: 'arb', cond: 'Min ROI %', def: 1 },
  { id: 'positive-ev', label: '+EV', ic: 'ev', cond: 'Min EV %', def: 3 },
  { id: 'middles', label: 'Middles', ic: 'middle', cond: 'Min width (pts)', def: 1 },
  { id: 'low-holds', label: 'Low holds', ic: 'lowhold', cond: 'Max hold %', def: 1 },
  { id: 'sharp-money', label: 'Sharp money', ic: 'sharp', cond: 'Min sharp edge %', def: 2 },
  { id: 'bettor-signals', label: 'Pro bettor signals', ic: 'bettors', cond: 'Min bettor ROI %', def: 5 },
  { id: 'ai-picks', label: 'AI picks', ic: 'spark', cond: 'Min confidence %', def: 60 },
  { id: 'prediction-traders', label: 'Prediction traders', ic: 'traders', cond: 'Min trader win rate %', def: 58 },
  { id: 'exit-alerts', label: 'Exit alerts', ic: 'exit', cond: 'Min price move %', def: 8 },
  { id: 'boosts', label: 'Profit boosts', ic: 'boost', cond: 'Min boost EV %', def: 5 },
];
const toolById = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
const CHANNELS = [['push', 'Push'], ['sms', 'SMS'], ['email', 'Email'], ['discord', 'Discord']];
const KEY = 'bf-proto-alerts-v1';
const DEFAULT_RULES = [
  { id: 'r1', name: 'Arbs over 1.5%', tool: 'arbitrage', min: 1.5, sports: [], books: [], channels: { push: true, sms: true, email: false, discord: true }, on: true },
  { id: 'r2', name: 'NBA +EV 4%+', tool: 'positive-ev', min: 4, sports: ['NBA'], books: [], channels: { push: true, sms: false, email: false, discord: false }, on: true },
  { id: 'r3', name: 'Hedgeable boosts', tool: 'boosts', min: 8, sports: [], books: [], channels: { push: true, sms: false, email: true, discord: false }, on: true },
  { id: 'r4', name: 'Sharp steam (NFL)', tool: 'sharp-money', min: 2.5, sports: ['NFL'], books: [], channels: { push: true, sms: true, email: false, discord: false }, on: false },
];
const loadRules = () => { try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(r) ? r : DEFAULT_RULES; } catch { return DEFAULT_RULES; } };
const saveRules = (r) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ } };

export default function render(root, { api, store, ui, odds, params = {} }) {
  if (!document.getElementById('css-al')) document.head.insertAdjacentHTML('beforeend', `<style id="css-al">${CSS}</style>`);
  let rules = loadRules();
  const D = { tool: 'arbitrage', min: 1, sports: [], books: [], channels: { push: true, sms: false, email: false, discord: false }, name: '' };
  // Prefill from a link ("Alert me" on another screen).
  const q = { ...ui.getQuery().params, ...params };
  const prefilled = !!(q.tool && toolById[q.tool]);
  if (prefilled) {
    D.tool = q.tool;
    D.min = Number.isFinite(+q.min) && q.min !== '' ? +q.min : toolById[q.tool].def;
    if (q.sport && api.sports.includes(q.sport)) D.sports = [q.sport];
    if (q.book && api.bookById[q.book]) D.books = [q.book];
    if (q.name) D.name = String(q.name).slice(0, 80);
  } else D.min = toolById[D.tool].def;
  const feed = [];
  const seen = new Set();
  let seq = 0;
  const pg = ui.pager('alerts-feed', { step: 8 });

  root.innerHTML = `<div class="al">
    ${ui.pageHead({ title: 'Alerts', tool: 'alerts', live: { label: 'Watching' },
      subtitle: 'Get pinged the second an opportunity matching your rules appears: arbs, +EV, middles, sharp money, bettor signals, AI picks, prediction-market traders, exit alerts and boosts.',
      actions: '<button type="button" class="btn primary" data-act="new">+ New alert rule</button>' })}
    <div class="al-facts" id="al-facts"></div>
    <div class="al-grid">
      <section class="sec al-feed-sec"><div class="sec-head"><h2>Live notifications</h2><span class="muted" data-bf-nodata id="al-fc"></span></div>
        <div class="feed" id="al-feed" data-bf-list data-bf-nodata></div><div id="al-more"></div></section>
      <section class="sec al-rules-sec"><div class="sec-head"><h2>Your rules</h2><span class="muted" data-bf-nodata id="al-rc"></span></div><div id="al-rules"></div></section>
      <section class="sec al-new-sec" id="al-new"><div class="sec-head"><h2>New alert rule</h2></div><div id="al-form"></div></section>
    </div></div>`;
  const $ = (s) => root.querySelector(s);
  root.querySelector('.page-head').append($('#al-facts')); // facts strip under the title row

  // ---- matching: every tool returns [{ key, title, detail, value, sport, books, route }] ----
  function candidates(rule) {
    const books = rule.books.length ? rule.books : store.get().books;
    const sp = (s) => !rule.sports.length || rule.sports.includes(s);
    const evt = (o) => o.event || '';
    const fromOpp = (o, title) => ({ key: o.id, title, detail: `${evt(o)} · ${o.label}`, sport: o.sport, legs: o.legs });
    const min = rule.min / 100;
    switch (rule.tool) {
      case 'arbitrage': return api.arbs({ books }).filter((o) => o.edge >= min && sp(o.sport)).map((o) => ({ ...fromOpp(o, `${odds.pct(o.edge, 2)} arbitrage`), value: o.edge }));
      case 'positive-ev': return api.ev({ books, minEdge: min }).filter((o) => sp(o.sport)).slice(0, 30).map((o) => ({ ...fromOpp(o, `+${odds.pct(o.edge, 1)} EV: ${o.legs[0].outcome} ${ui.fmtOdds(o.legs[0].price)}`), value: o.edge }));
      case 'middles': return api.middles({ books }).filter((o) => o.meta.width >= rule.min && sp(o.sport)).map((o) => ({ ...fromOpp(o, `${o.meta.width}-pt middle ${o.meta.low}–${o.meta.high}`), value: o.meta.width / 100 }));
      case 'low-holds': return api.lowHolds({ books, maxHold: min }).filter((o) => sp(o.sport)).map((o) => ({ ...fromOpp(o, `${odds.pct(o.meta.hold, 2)} hold market`), value: -o.meta.hold }));
      case 'boosts': return api.promos.boosts({ state: store.get().state, books }).filter((b) => b.ev >= min && sp(b.sport)).map((b) => ({ key: b.id, title: `${odds.pct(b.ev, 1)} EV boost: ${b.title}`, detail: `${api.bookById[b.book].name} ${ui.fmtOdds(b.originalPrice)} → ${ui.fmtOdds(b.boostedPrice)}${b.hedge ? ` · hedged profit ${odds.money(b.hedge.profit)}` : ''}`, sport: b.sport, legs: [{ book: b.book }], value: b.ev }));
      default: return synth(rule, books, sp);
    }
  }
  // Signal-style tools: derive from the strongest EV edges on the board, framed per tool.
  function synth(rule, books, sp) {
    const base = api.ev({ books, minEdge: 0.015 }).filter((o) => sp(o.sport)).slice(0, 40);
    return base.map((o, i) => {
      const leg = o.legs[0];
      const h = (o.edge * 1000 + i * 7) % 1;
      const conf = Math.min(0.92, 0.55 + o.edge * 4 + h * 0.1);
      const map = {
        'sharp-money': [o.edge * 100 >= rule.min, `Sharp action: ${leg.outcome}`, `${Math.round(60 + h * 30)}% of handle at Novig/ProphetX · ${o.event}`],
        'bettor-signals': [o.edge * 100 * 3 >= rule.min, `Pro bettor on ${leg.outcome}`, `Tracked bettor (+${(o.edge * 300).toFixed(1)}% ROI, ${Math.round(400 + h * 900)} bets) · ${o.event}`],
        'ai-picks': [conf * 100 >= rule.min, `AI pick: ${leg.outcome} ${ui.fmtOdds(leg.price)}`, `${Math.round(conf * 100)}% model confidence · ${o.event}`],
        'prediction-traders': [55 + o.edge * 400 >= rule.min, `Top trader bought ${leg.outcome}`, `Trader win rate ${Math.min(81, Math.round(55 + o.edge * 400))}% · Kalshi / Polymarket`],
        'exit-alerts': [o.edge * 300 >= rule.min, `Exit now: ${leg.outcome}`, `Contract up ${(o.edge * 300).toFixed(1)}% since entry · sell into strength`],
      }[rule.tool];
      if (!map || !map[0]) return null;
      return { key: `${rule.tool}-${o.id}`, title: map[1], detail: map[2], sport: o.sport, legs: o.legs, value: o.edge };
    }).filter(Boolean);
  }

  function push(rule, c, { fresh = true, ts = Date.now() } = {}) {
    const k = `${rule.id}|${c.key}`;
    if (seen.has(k)) return false;
    seen.add(k);
    feed.unshift({ id: ++seq, rule, c, ts, fresh });
    if (feed.length > 60) feed.pop();
    return true;
  }

  function scan(initial) {
    let added = 0;
    for (const rule of rules.filter((r) => r.on)) {
      const cs = candidates(rule);
      if (initial) { cs.slice(0, 3).forEach((c, i) => push(rule, c, { fresh: false, ts: Date.now() - (i + 1) * (4 + rules.indexOf(rule) * 3) * 60e3 })); cs.forEach((c) => seen.add(`${rule.id}|${c.key}`)); continue; }
      for (const c of cs) { if (push(rule, c)) { added++; break; } } // at most one new alert per rule per tick
    }
    if (initial) feed.sort((a, b) => b.ts - a.ts);
    return added;
  }

  // ---- facts strip ----
  function drawFacts() {
    const on = rules.filter((r) => r.on);
    const used = CHANNELS.filter(([c]) => on.some((r) => r.channels[c]));
    $('#al-facts').innerHTML = ui.facts([
      { label: 'Active rules', value: `${on.length} / ${rules.length}`, note: rules.length - on.length ? `${rules.length - on.length} paused` : 'all on' },
      { label: 'Alerts this session', value: String(feed.length), tone: 'pos' },
      { label: 'Channels in use', value: String(used.length), note: used.map(([, l]) => l).join(' · ') || 'none' },
      { label: 'Median delivery', value: '1.4s', note: 'from odds change to push' },
    ]);
  }

  // ---- new rule form ----
  const booksSummary = () => (D.books.length ? D.books.map((b) => api.bookById[b]?.short || b).join(', ') : `My books (${store.get().books.length})`);
  function drawForm() {
    const t = toolById[D.tool];
    $('#al-form').innerHTML = `<div class="form">
      ${ui.select('tool', TOOLS.map((x) => [x.id, x.label]), D.tool, 'Tool')}
      ${ui.numberInput('min', D.min, t.cond, { step: 0.5 })}
      <label class="field full"><span>Rule name</span><input class="input" id="al-name" placeholder="${ui.esc(`${t.label} ${t.cond.replace(/ %| \(pts\)/, '')} ${D.min}`)}" value="${ui.esc(D.name)}"></label>
      <div class="field full"><span>Sports (none = all)</span><div class="chips" role="group" aria-label="Sports">${api.sports.map((s) => `<button type="button" class="chip${D.sports.includes(s) ? ' on' : ''}" aria-pressed="${D.sports.includes(s)}" data-sport="${s}">${s}</button>`).join('')}</div></div>
      <div class="field full"><span>Books (none = my books)</span>
        <div class="al-books fb-books"><button type="button" class="btn sm outline" data-books-btn aria-expanded="false" aria-haspopup="true">${ui.icon('filter', { size: 14 })}<span>Choose books</span> <b data-bf-nodata>${D.books.length || ''}</b></button>
          <span class="al-books-sum" data-bf-nodata>${ui.esc(booksSummary())}</span>
          <div class="fb-pop" hidden data-bf-noedit role="group" aria-label="Books for this rule"><div class="fb-pop-h">Books for this rule</div>
            <div class="fb-books-grid">${api.sportsbooks.map((b) => `<label class="check${ui.bookLegal(b.id) ? '' : ' off'}" title="${ui.esc(ui.bookLegal(b.id) ? b.name : ui.illegalNote(b.id))}"><input type="checkbox" data-book="${b.id}"${D.books.includes(b.id) ? ' checked' : ''}> <b>${ui.esc(b.short)}</b> ${ui.esc(b.name)}</label>`).join('')}</div>
            <div class="pop-foot"><span class="muted">None ticked = the books in your settings.</span><button type="button" class="btn sm ghost" data-books-clear>Use my books</button></div></div></div></div>
      <div class="field full"><span>Deliver via</span><div class="chan">${CHANNELS.map(([c, l]) => `<label class="check"><span class="sw"><input type="checkbox" data-ch="${c}" ${D.channels[c] ? 'checked' : ''}><span></span></span>${l}</label>`).join('')}</div></div>
      <div class="full create"><button type="button" class="btn primary" id="al-create">Create alert</button><span class="muted">Matches are checked on every odds update.</span></div></div>`;
    const f = $('#al-form');
    ui.onSelect(f, 'tool', (v) => { D.tool = v; D.min = toolById[v].def; drawForm(); });
    ui.onNumber(f, 'min', (v) => { D.min = v; });
    f.querySelector('#al-name').addEventListener('input', (e) => { D.name = e.target.value; });
    f.querySelectorAll('[data-sport]').forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.sport; D.sports = D.sports.includes(s) ? D.sports.filter((x) => x !== s) : [...D.sports, s];
      b.classList.toggle('on'); b.setAttribute('aria-pressed', String(b.classList.contains('on')));
    }));
    wireBooks(f);
    f.querySelectorAll('[data-ch]').forEach((c) => c.addEventListener('change', () => { D.channels[c.dataset.ch] = c.checked; }));
    f.querySelector('#al-create').addEventListener('click', () => {
      const t2 = toolById[D.tool];
      const rule = { id: `r${Date.now()}`, name: D.name.trim() || `${t2.label} · ${t2.cond} ${D.min}`, tool: D.tool, min: D.min, sports: [...D.sports], books: [...D.books], channels: { ...D.channels }, on: true };
      rules = [rule, ...rules]; saveRules(rules);
      D.name = ''; D.sports = []; D.books = [];
      const n = candidates(rule).length;
      drawForm(); drawRules(); drawFacts(); drawFeed();
      ui.toast(`Alert created · ${n} current match${n === 1 ? '' : 'es'}`);
    });
  }
  // Books popover: same look as the filter bar's Books popover; closes on outside click and Escape.
  function wireBooks(f) {
    const btn = f.querySelector('[data-books-btn]');
    const pop = btn.parentElement.querySelector('.fb-pop');
    const paint = () => { btn.querySelector('b').textContent = D.books.length || ''; f.querySelector('.al-books-sum').textContent = booksSummary(); };
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escK, true); };
    const outside = (e) => { if (!e.target.closest('.al-books')) close(); };
    const escK = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); } };
    btn.addEventListener('click', () => {
      if (!pop.hidden) { close(); return; }
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      pop.querySelector('input')?.focus();
      setTimeout(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escK, true); }, 0);
    });
    pop.addEventListener('change', (e) => {
      const id = e.target.dataset.book;
      if (!id) return;
      D.books = e.target.checked ? [...new Set([...D.books, id])] : D.books.filter((x) => x !== id);
      paint();
    });
    pop.querySelector('[data-books-clear]').addEventListener('click', () => { D.books = []; pop.querySelectorAll('[data-book]').forEach((c) => { c.checked = false; }); paint(); });
  }

  // ---- rules ----
  function drawRules() {
    const on = rules.filter((r) => r.on).length;
    $('#al-rc').textContent = rules.length ? `${on} on · ${rules.length - on} paused` : '';
    if (!rules.length) {
      $('#al-rules').innerHTML = ui.empty({ title: 'No alert rules yet', msg: 'A rule watches one tool and pings you when something clears your bar.',
        actions: [{ label: 'Create a rule', act: 'new' }, { label: 'Add the starter rules', act: 'starter' }] });
      return;
    }
    $('#al-rules').innerHTML = `<div class="rules">${rules.map((r) => {
      const t = toolById[r.tool] || { label: r.tool, ic: 'bell', cond: 'Min' };
      const ch = CHANNELS.filter(([c]) => r.channels[c]).map(([, l]) => l);
      return `<div class="rule${r.on ? '' : ' off'}"><label class="sw" title="${r.on ? 'On: click to pause' : 'Paused: click to turn on'}"><input type="checkbox" data-tog="${r.id}" ${r.on ? 'checked' : ''} aria-label="${ui.esc(r.name)} on"><span></span></label>
        <div><div class="t1">${ui.icon(t.ic, { size: 16 })}<span>${ui.esc(r.name)}</span>${r.on ? ui.status('On', 'ok') : ui.status('Paused', 'muted')}</div>
          <div class="t2">${ui.tag(t.label)} <span>${ui.esc(t.cond)} ≥ <b>${r.min}</b></span> · <span>${r.sports.length ? r.sports.join(', ') : 'All sports'}</span> · <span>${r.books.length ? r.books.map((b) => api.bookById[b]?.short).join(', ') : 'My books'}</span></div>
          <div class="t2">${ui.icon('bell', { size: 13 })}<span>${ch.length ? ch.join(' · ') : 'No channel: matches show here only'}</span></div></div>
        <div class="acts">${ui.ghost('del', 'Delete', { attrs: { 'data-del': r.id, 'aria-label': `Delete ${r.name}` } })}</div></div>`;
    }).join('')}</div>`;
    $('#al-rules').querySelectorAll('[data-tog]').forEach((c) => c.addEventListener('change', () => {
      rules = rules.map((r) => (r.id === c.dataset.tog ? { ...r, on: c.checked } : r)); saveRules(rules); drawRules(); drawFacts(); drawFeed();
    }));
  }

  // ---- feed ----
  function drawFeed() {
    $('#al-fc').textContent = feed.length ? `${feed.length} this session` : '';
    if (!feed.length) {
      const anyOn = rules.some((r) => r.on);
      $('#al-feed').innerHTML = !rules.length ? ui.empty({ title: 'Nothing to watch yet', msg: 'Create a rule and matches land here the moment the odds change.', actions: [{ label: 'Create a rule', act: 'new' }, { label: 'Add the starter rules', act: 'starter' }] })
        : !anyOn ? ui.empty({ title: 'All your rules are paused', msg: 'Paused rules don’t send anything. Turn them back on to start watching.', actions: [{ label: 'Turn all rules on', act: 'all-on' }, { label: 'New alert rule', act: 'new' }] })
        : ui.empty({ title: 'No matches yet', msg: 'Your rules are on. The next match shows up here the moment the odds change.', actions: [{ label: 'New alert rule', act: 'new' }, { label: 'Open the Daily Card', href: '#/daily' }] });
      $('#al-more').innerHTML = '';
      return;
    }
    $('#al-feed').innerHTML = pg.slice(feed).map((n) => {
      const t = toolById[n.rule.tool] || { ic: 'bell', id: 'daily', label: 'Daily Card' };
      const legBooks = [...new Set((n.c.legs || []).map((l) => l.book).filter(Boolean))];
      const ch = CHANNELS.filter(([c]) => n.rule.channels[c]).map(([, l]) => l).join(', ');
      return `<a class="note${n.fresh ? ' is-new' : ''}" href="#/${t.id}" title="Open ${ui.esc(t.label)}"><span class="ic" aria-hidden="true">${ui.icon(t.ic, { size: 18 })}</span>
        <div class="t1">${n.fresh ? '<span class="new-tag">NEW</span>' : ''}${ui.esc(n.c.title)}</div><span class="when" data-ts="${n.ts}">${ui.ago(n.ts)}</span>
        <div class="t2">${ui.esc(n.c.detail)}</div>
        <div class="t3">${n.c.sport ? ui.sport(n.c.sport) : ''} ${legBooks.map((b) => ui.book(b)).join(' ')} <span>· ${ui.esc(n.rule.name)}</span>${ch ? ` <span>· ${ui.esc(ch)}</span>` : ''}</div></a>`;
    }).join('');
    $('#al-more').innerHTML = pg.more(feed.length);
    feed.forEach((n) => { n.fresh = false; });
  }
  pg.onMore(drawFeed);
  const paintAges = () => root.querySelectorAll('.when[data-ts]').forEach((el) => { const t = ui.ago(+el.dataset.ts); if (el.textContent !== t) el.textContent = t; });

  // ---- actions shared by the head button and the empty states ----
  ui.onAction(root, {
    new: () => { const sec = $('#al-new'); sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('#al-name')?.focus({ preventScroll: true }), 350); },
    starter: () => { rules = DEFAULT_RULES.map((r) => ({ ...r })); saveRules(rules); scan(true); drawRules(); drawFacts(); drawFeed(); ui.toast('Starter rules added'); },
    'all-on': () => { rules = rules.map((r) => ({ ...r, on: true })); saveRules(rules); drawRules(); drawFacts(); drawFeed(); ui.toast('All rules on'); },
    del: (_, el) => { rules = rules.filter((r) => r.id !== el.dataset.del); saveRules(rules); drawRules(); drawFacts(); drawFeed(); ui.toast('Rule deleted'); },
  });

  scan(true);
  drawFacts(); drawForm(); drawRules(); drawFeed();
  if (prefilled) requestAnimationFrame(() => { $('#al-new').scrollIntoView({ block: 'start' }); $('#al-name')?.focus({ preventScroll: true }); });
  const off = api.onTick(() => {
    if (scan(false)) { drawFeed(); drawFacts(); } else paintAges();
    ui.setLiveStatus(root, { updated: Date.now() });
  });
  return () => off();
}
