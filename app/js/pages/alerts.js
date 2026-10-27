// Alerts: rules for any tool, delivered by push / SMS / email / Discord, plus a live notification feed
// that fires when a matching opportunity appears on the odds tick.

const CSS = `
.al .rule { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; padding: 12px 16px; border-bottom: 1px solid var(--line-2); }
.al .rule:last-child { border-bottom: 0; }
.al .rule.off { opacity: .55; }
.al .rule .t1 { font-weight: 600; }
.al .rule .t2 { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.al .sw { position: relative; width: 38px; height: 22px; flex: none; display: inline-block; }
.al .sw input { opacity: 0; width: 0; height: 0; position: absolute; }
.al .sw span { position: absolute; inset: 0; background: var(--line); border-radius: 999px; cursor: pointer; transition: background .15s; }
.al .sw span::after { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: var(--paper); border-radius: 50%; transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.al .sw input:checked + span { background: var(--accent); }
.al .sw input:checked + span::after { transform: translateX(16px); }
.al .sw input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.al .form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.al .form .full { grid-column: 1 / -1; }
.al .chan { display: flex; gap: 14px; flex-wrap: wrap; }
.al .feed { max-height: 760px; overflow-y: auto; }
.al .note { display: grid; grid-template-columns: 34px 1fr; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line-2); cursor: pointer; }
.al .note:hover { background: var(--panel); }
.al .note.new { animation: al-in .9s ease; }
@keyframes al-in { from { background: color-mix(in srgb, var(--lime) 60%, transparent); } to { background: transparent; } }
.al .note .ic { width: 34px; height: 34px; border-radius: 10px; background: var(--ink); color: var(--lime); display: grid; place-items: center; font-size: 15px; }
.al .note .t1 { font-weight: 600; font-size: 13.5px; }
.al .note .t2 { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.al .note .t3 { font-size: 11.5px; color: var(--muted); margin-top: 5px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
@media (max-width: 860px) { .al .form { grid-template-columns: 1fr 1fr; } .al .rule { grid-template-columns: auto 1fr; } .al .rule .acts { grid-column: 1 / -1; } }`;

const TOOLS = [
  { id: 'arbitrage', label: 'Arbitrage', ic: '⇄', cond: 'Min ROI %', def: 1 },
  { id: 'positive-ev', label: '+EV', ic: '↗', cond: 'Min EV %', def: 3 },
  { id: 'middles', label: 'Middles', ic: '⇔', cond: 'Min width (pts)', def: 1 },
  { id: 'low-holds', label: 'Low holds', ic: '≈', cond: 'Max hold %', def: 1 },
  { id: 'sharp-money', label: 'Sharp money', ic: '◆', cond: 'Min sharp edge %', def: 2 },
  { id: 'bettor-signals', label: 'Pro bettor signals', ic: '◉', cond: 'Min bettor ROI %', def: 5 },
  { id: 'ai-picks', label: 'AI picks', ic: '✧', cond: 'Min confidence %', def: 60 },
  { id: 'prediction-traders', label: 'Prediction traders', ic: '⟁', cond: 'Min trader win rate %', def: 58 },
  { id: 'exit-alerts', label: 'Exit alerts', ic: '⏏', cond: 'Min price move %', def: 8 },
  { id: 'boosts', label: 'Profit boosts', ic: '⚡', cond: 'Min boost EV %', def: 5 },
];
const toolById = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
const CHANNELS = [['push', 'Push'], ['sms', 'SMS'], ['email', 'Email'], ['discord', 'Discord']];
const KEY = 'bf-proto-alerts-v1';
const DEFAULT_RULES = [
  { id: 'r1', name: 'Arbs over 1.5%', tool: 'arbitrage', min: 1.5, sports: [], books: [], channels: { push: true, sms: true, email: false, discord: true }, on: true },
  { id: 'r2', name: 'NBA +EV 4%+', tool: 'positive-ev', min: 4, sports: ['NBA'], books: [], channels: { push: true, sms: false, email: false, discord: false }, on: true },
  { id: 'r3', name: 'Lockable boosts', tool: 'boosts', min: 8, sports: [], books: [], channels: { push: true, sms: false, email: true, discord: false }, on: true },
  { id: 'r4', name: 'Sharp steam (NFL)', tool: 'sharp-money', min: 2.5, sports: ['NFL'], books: [], channels: { push: true, sms: true, email: false, discord: false }, on: false },
];
const loadRules = () => { try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(r) ? r : DEFAULT_RULES; } catch { return DEFAULT_RULES; } };
const saveRules = (r) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ } };

export default function render(root, { api, store, ui, odds, navigate }) {
  if (!document.getElementById('css-al')) document.head.insertAdjacentHTML('beforeend', `<style id="css-al">${CSS}</style>`);
  let rules = loadRules();
  const D = { tool: 'arbitrage', min: 1, sports: [], books: [], channels: { push: true, sms: false, email: false, discord: false }, name: '' };
  const feed = [];
  const seen = new Set();
  let seq = 0;

  root.innerHTML = `<div class="al">
    ${ui.header({ title: 'Alerts', tool: 'alerts',
      subtitle: 'Get pinged the second an opportunity matching your rules appears: arbs, +EV, middles, sharp money, bettor signals, AI picks, prediction-market traders, exit alerts and boosts.' })}
    <div id="al-stats"></div>
    <div class="split">
      <div class="stack">
        <section class="card"><header><h3>New alert rule</h3></header><div class="pad" id="al-form"></div></section>
        <section class="card"><header><h3>Your rules</h3><span class="muted" id="al-rc"></span></header><div id="al-rules"></div></section>
      </div>
      <section class="card"><header><h3>Live notifications</h3>${ui.liveDot()}</header><div class="feed" id="al-feed"></div></section>
    </div></div>`;
  const $ = (s) => root.querySelector(s);

  // ---- matching: every tool returns [{ key, title, detail, value, sport, books, route }] ----
  function candidates(rule) {
    const books = rule.books.length ? rule.books : store.get().books;
    const sp = (s) => !rule.sports.length || rule.sports.includes(s);
    const evt = (o) => o.event || '';
    const fromOpp = (o, title) => ({ key: o.id, title, detail: `${evt(o)} · ${o.label}`, sport: o.sport, legs: o.legs });
    const min = rule.min / 100;
    switch (rule.tool) {
      case 'arbitrage': return api.arbs({ books }).filter((o) => o.edge >= min && sp(o.sport)).map((o) => ({ ...fromOpp(o, `${odds.pct(o.edge, 2)} arbitrage`), value: o.edge }));
      case 'positive-ev': return api.ev({ books, minEdge: min }).filter((o) => sp(o.sport)).slice(0, 30).map((o) => ({ ...fromOpp(o, `+${odds.pct(o.edge, 1)} EV: ${o.legs[0].outcome} ${odds.fmtAmerican(o.legs[0].price)}`), value: o.edge }));
      case 'middles': return api.middles({ books }).filter((o) => o.meta.width >= rule.min && sp(o.sport)).map((o) => ({ ...fromOpp(o, `${o.meta.width}-pt middle ${o.meta.low}–${o.meta.high}`), value: o.meta.width / 100 }));
      case 'low-holds': return api.lowHolds({ books, maxHold: min }).filter((o) => sp(o.sport)).map((o) => ({ ...fromOpp(o, `${odds.pct(o.meta.hold, 2)} hold market`), value: -o.meta.hold }));
      case 'boosts': return api.promos.boosts({ state: store.get().state, books }).filter((b) => b.ev >= min && sp(b.sport)).map((b) => ({ key: b.id, title: `${odds.pct(b.ev, 1)} EV boost: ${b.title}`, detail: `${api.bookById[b.book].name} ${odds.fmtAmerican(b.originalPrice)} → ${odds.fmtAmerican(b.boostedPrice)}${b.hedge ? ` · lock ${odds.money(b.hedge.profit)}` : ''}`, sport: b.sport, legs: [{ book: b.book }], value: b.ev }));
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
        'ai-picks': [conf * 100 >= rule.min, `AI pick: ${leg.outcome} ${odds.fmtAmerican(leg.price)}`, `${Math.round(conf * 100)}% model confidence · ${o.event}`],
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

  function drawStats() {
    const on = rules.filter((r) => r.on);
    const today = feed.length;
    $('#al-stats').innerHTML = ui.stats([
      { label: 'Active rules', value: `${on.length} / ${rules.length}` },
      { label: 'Alerts this session', value: String(today), tone: 'pos' },
      { label: 'Channels in use', value: String(CHANNELS.filter(([c]) => on.some((r) => r.channels[c])).length), note: CHANNELS.filter(([c]) => on.some((r) => r.channels[c])).map(([, l]) => l).join(' · ') || 'none' },
      { label: 'Median delivery', value: '1.4s', note: 'from odds change to push' },
    ]);
  }

  function drawForm() {
    const t = toolById[D.tool];
    $('#al-form').innerHTML = `<div class="form">
      ${ui.select('tool', TOOLS.map((x) => [x.id, x.label]), D.tool, 'Tool')}
      ${ui.numberInput('min', D.min, t.cond, { step: 0.5 })}
      <label class="field"><span>Rule name</span><input class="input" id="al-name" placeholder="${ui.esc(`${t.label} ${t.cond.replace(/ %| \(pts\)/, '')} ${D.min}`)}" value="${ui.esc(D.name)}"></label>
      <div class="field full"><span>Sports (none = all)</span><div class="chips">${api.sports.map((s) => `<button type="button" class="chip${D.sports.includes(s) ? ' on' : ''}" data-sport="${s}">${s}</button>`).join('')}</div></div>
      <div class="field full"><span>Books (none = my books)</span><div class="chips">${api.sportsbooks.map((b) => `<button type="button" class="chip${D.books.includes(b.id) ? ' on' : ''}" data-book="${b.id}">${b.short}</button>`).join('')}</div></div>
      <div class="field full"><span>Deliver via</span><div class="chan">${CHANNELS.map(([c, l]) => `<label class="check"><span class="sw"><input type="checkbox" data-ch="${c}" ${D.channels[c] ? 'checked' : ''}><span></span></span>${l}</label>`).join('')}</div></div>
      <div class="full row"><button class="btn primary" id="al-create">Create alert</button><span class="muted" style="font-size:12px">Matches are checked on every odds update.</span></div></div>`;
    const f = $('#al-form');
    ui.onSelect(f, 'tool', (v) => { D.tool = v; D.min = toolById[v].def; drawForm(); });
    ui.onNumber(f, 'min', (v) => { D.min = v; });
    f.querySelector('#al-name').addEventListener('input', (e) => { D.name = e.target.value; });
    f.querySelectorAll('[data-sport]').forEach((b) => b.addEventListener('click', () => { const s = b.dataset.sport; D.sports = D.sports.includes(s) ? D.sports.filter((x) => x !== s) : [...D.sports, s]; b.classList.toggle('on'); }));
    f.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => { const s = b.dataset.book; D.books = D.books.includes(s) ? D.books.filter((x) => x !== s) : [...D.books, s]; b.classList.toggle('on'); }));
    f.querySelectorAll('[data-ch]').forEach((c) => c.addEventListener('change', () => { D.channels[c.dataset.ch] = c.checked; }));
    f.querySelector('#al-create').addEventListener('click', () => {
      const t2 = toolById[D.tool];
      const rule = { id: `r${Date.now()}`, name: D.name.trim() || `${t2.label} · ${t2.cond} ${D.min}`, tool: D.tool, min: D.min, sports: [...D.sports], books: [...D.books], channels: { ...D.channels }, on: true };
      rules = [rule, ...rules]; saveRules(rules);
      D.name = ''; D.sports = []; D.books = [];
      const n = candidates(rule).length;
      drawForm(); drawRules(); drawStats();
      ui.toast(`Alert created · ${n} current match${n === 1 ? '' : 'es'}`);
    });
  }

  function drawRules() {
    $('#al-rc').textContent = `${rules.filter((r) => r.on).length} on`;
    $('#al-rules').innerHTML = rules.length ? rules.map((r) => {
      const t = toolById[r.tool] || { label: r.tool, ic: '•', cond: 'Min' };
      return `<div class="rule${r.on ? '' : ' off'}"><label class="sw" title="On/off"><input type="checkbox" data-tog="${r.id}" ${r.on ? 'checked' : ''} aria-label="Toggle ${ui.esc(r.name)}"><span></span></label>
        <div><div class="t1">${t.ic} ${ui.esc(r.name)}</div>
          <div class="t2">${ui.tag(t.label)} <span>${ui.esc(t.cond)} ≥ ${r.min}</span> · <span>${r.sports.length ? r.sports.join(', ') : 'All sports'}</span> · <span>${r.books.length ? r.books.map((b) => api.bookById[b]?.short).join(', ') : 'My books'}</span></div>
          <div class="t2">${CHANNELS.filter(([c]) => r.channels[c]).map(([, l]) => ui.tag(l, 'pos')).join(' ') || '<span>No channel</span>'}</div></div>
        <div class="acts"><button class="btn sm ghost" data-del="${r.id}">Delete</button></div></div>`;
    }).join('') : `<div class="pad">${ui.empty('No rules yet. Create one above.')}</div>`;
    $('#al-rules').querySelectorAll('[data-tog]').forEach((c) => c.addEventListener('change', () => {
      rules = rules.map((r) => (r.id === c.dataset.tog ? { ...r, on: c.checked } : r)); saveRules(rules); drawRules(); drawStats();
    }));
    $('#al-rules').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      rules = rules.filter((r) => r.id !== b.dataset.del); saveRules(rules); drawRules(); drawStats(); ui.toast('Rule deleted');
    }));
  }

  function drawFeed() {
    $('#al-feed').innerHTML = feed.length ? feed.map((n) => {
      const t = toolById[n.rule.tool] || { ic: '•', id: 'daily' };
      const legBooks = [...new Set((n.c.legs || []).map((l) => l.book).filter(Boolean))];
      return `<div class="note${n.fresh ? ' new' : ''}" data-go="${t.id}"><span class="ic">${t.ic}</span><div>
        <div class="t1">${ui.esc(n.c.title)}</div><div class="t2">${ui.esc(n.c.detail)}</div>
        <div class="t3">${n.c.sport ? ui.sport(n.c.sport) : ''} ${legBooks.map((b) => ui.book(b)).join(' ')} <span>· ${ui.esc(n.rule.name)}</span> <span>· ${ui.ago(n.ts)}</span> <span>· ${CHANNELS.filter(([c]) => n.rule.channels[c]).map(([, l]) => l).join(', ')}</span></div></div></div>`;
    }).join('') : `<div class="pad">${ui.empty('Waiting for the next match…')}</div>`;
    feed.forEach((n) => { n.fresh = false; });
    $('#al-feed').querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.go)));
  }

  scan(true);
  drawStats(); drawForm(); drawRules(); drawFeed();
  const off = api.onTick(() => { if (scan(false)) { drawFeed(); drawStats(); } });
  return () => off();
}
