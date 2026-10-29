// Live AI Analysis: in-game win probability, momentum, AI commentary, key moments, projected final
// and live bet suggestions priced against every book. Updates on every odds/score tick.
//
// Rebuild notes (B1 head + live status, B2 money actions, B6 flat sections, B8 states, B12 how/dollarised
// line, B14 no nested scroll on phones, C13 sweep):
// - Desktop: games and the game read (scoreboard, win probability, commentary, key moments) on the left;
//   the money (Live bet suggestions, then Projected final) in a right column that starts at the top.
//   Phones: one column ordered game strip → scoreboard → suggestions → the rest.
// - Suggestions patch in place each tick (keyed by id) and keep their order while hovered or focused.

const CSS = `
.lai .lai-cols { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:20px; align-items:start; }
.lai .lai-left, .lai .lai-right { display:grid; gap:20px; min-width:0; }
.lai .lai-left > .sec, .lai .lai-right > .sec, .lai .lai-two > .sec { margin-top:0; }
.lai .lai-games { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
.lai .gm { text-align:left; border:2px solid var(--line); background:var(--paper); border-radius:12px; padding:8px 10px; cursor:pointer; display:grid; gap:3px; color:var(--text); min-width:0; font:inherit; }
.lai .gm:hover { border-color:var(--g); }
.lai .gm.on { border-color:var(--g); background:var(--soft); box-shadow:inset 0 0 0 1px var(--g); }
.lai .gm-top { display:flex; justify-content:space-between; align-items:center; font-size:var(--t-xs); font-weight:700; gap:6px; color:var(--muted); }
.lai .gm-row { display:flex; justify-content:space-between; gap:8px; font-weight:700; font-size:var(--t-sm); }
.lai .gm-row span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lai .gm-row b { font-variant-numeric:tabular-nums; }
.lai .gm .bar { height:5px; }
/* Scoreboard: a flat band (data, not an editable panel). */
.lai .board { display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; padding:14px 0; border-top:4px solid var(--g); border-bottom:2px solid var(--line); }
.lai .tm { display:grid; gap:2px; min-width:0; }
.lai .tm.h { text-align:right; }
.lai .tm .nm { font:900 var(--t-lg)/1.1 var(--f-head); text-transform:uppercase; }
.lai .tm .sc { font:900 44px/1 var(--f-head); font-variant-numeric:tabular-nums; }
.lai .tm .wp { font-size:var(--t-xs); color:var(--muted); font-weight:700; }
.lai .mid { text-align:center; display:grid; gap:6px; justify-items:center; }
.lai .mid .clk { font-weight:800; font-variant-numeric:tabular-nums; }
.lai .board-foot { grid-column:1 / -1; display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:var(--t-sm); color:var(--muted); font-weight:600; }
.lai .board-foot .spacer { flex:1; }
.lai .chart { position:relative; width:100%; }
.lai .chart svg { display:block; overflow:visible; max-width:100%; height:auto; }
.lai .ax { fill:var(--muted); font-size:11px; font-family:var(--sans); }
.lai .chart .tip { position:absolute; pointer-events:none; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow); border-radius:8px; padding:6px 9px; font-size:12px; white-space:nowrap; transform:translate(-50%, -115%); opacity:0; transition:opacity .1s; z-index:var(--z-raised, 1); }
.lai .sec-note { font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.lai .mom { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center; font-size:var(--t-xs); font-weight:700; margin-top:14px; }
.lai .mom-track { position:relative; height:12px; border-radius:6px; background:var(--panel); border:1px solid var(--line); overflow:hidden; }
.lai .mom-track::after { content:""; position:absolute; left:50%; top:0; bottom:0; width:2px; background:var(--muted); opacity:.5; }
.lai .mom-fill { position:absolute; top:0; bottom:0; transition:all .5s ease; }
.lai .mom-fill.home { left:50%; background:var(--accent); border-radius:0 6px 6px 0; }
.lai .mom-fill.away { right:50%; background:var(--gold); border-radius:6px 0 0 6px; }
.lai .mom-txt { font-size:var(--t-xs); color:var(--muted); font-weight:600; text-align:center; margin-top:6px; }
.lai .lai-two { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; }
.lai .feed { list-style:none; margin:0; padding:0; max-height:340px; overflow-y:auto; }
.lai .feed li { padding:9px 0; border-bottom:1px solid var(--line-2); display:grid; grid-template-columns:auto 1fr; gap:10px; font-size:var(--t-sm); }
.lai .feed li.new { animation: lai-in 1.4s ease; }
@keyframes lai-in { from { background:var(--hl); } to { background:transparent; } }
.lai .feed .ai { width:24px; height:24px; border-radius:7px; background:var(--g); color:#FFFFFF; display:grid; place-items:center; font-size:11px; font-weight:800; }
.lai .feed .ai.edge { background:var(--deep); }
.lai .feed time { display:block; font-size:11px; color:var(--muted); margin-top:2px; }
.lai .moments { list-style:none; margin:0; padding:2px 0 6px; max-height:340px; overflow-y:auto; }
.lai .moments li { position:relative; padding:8px 0 8px 20px; border-left:2px solid var(--line); margin-left:5px; font-size:var(--t-sm); }
.lai .moments li::before { content:""; position:absolute; left:-7px; top:12px; width:12px; height:12px; border-radius:50%; background:var(--paper); border:2px solid var(--accent); }
.lai .moments li.lead::before { background:var(--g); border-color:var(--deep); }
.lai .moments li.swing::before { border-color:var(--gold); }
.lai .moments .mt { font-size:11px; color:var(--muted); display:flex; gap:8px; }
.lai .proj { display:grid; gap:8px; }
.lai .proj .ps { display:flex; justify-content:space-between; align-items:baseline; font-weight:700; }
.lai .proj .ps b { font:900 28px/1 var(--f-head); font-variant-numeric:tabular-nums; }
.lai .proj .kv { margin-top:4px; }
/* Live bet suggestions: flat rows, one primary each. */
.lai .sugg { display:grid; }
.lai .sg { padding:12px 0; border-bottom:1px solid var(--line-2); display:grid; gap:7px; }
.lai .sg:first-child { padding-top:2px; }
.lai .sg-h { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
.lai .sg-n { margin:0; font:900 var(--t-md)/1.15 var(--f-head); text-transform:uppercase; }
.lai .sg-s { margin:2px 0 0; font-size:var(--t-xs); color:var(--muted); font-weight:600; }
.lai .sg-p { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.lai .sg .ev-line { margin:0; }
.lai .sg .row-acts { justify-content:flex-start; }
.lai .ask-block { margin-top:4px; }
@media (max-width:1100px) {
  .lai .lai-cols { display:flex; flex-direction:column; gap:20px; }
  .lai .lai-left, .lai .lai-right { display:contents; }
  .lai .o-games { order:1; } .lai .o-board { order:2; } .lai .o-sugg { order:3; } .lai .o-wp { order:4; }
  .lai .o-proj { order:5; } .lai .o-two { order:6; } .lai .o-ask { order:7; }
}
@media (max-width:860px) {
  .lai .lai-games { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:4px; scrollbar-width:none; margin:0 -16px; padding-inline:16px; }
  .lai .gm { flex:0 0 150px; scroll-snap-align:start; }
  .lai .lai-two { grid-template-columns:1fr; }
  .lai .lai-cols { gap:14px; }
  .lai .gm { padding:6px 9px; gap:2px; }
  .lai .board { padding:10px 0; gap:8px; }
  .lai .tm .sc { font-size:32px; } .lai .tm .nm { font-size:var(--t-sm); }
  .lai .lai-right .sec, .lai .lai-left .sec { padding-top:10px; }
  .lai .o-sugg .sec-head { margin-bottom:6px; }
  .lai .o-sugg .sec-head h2 { font-size:var(--t-xl); }
  /* No nested scroll areas on phones (B14): the feeds grow with the page. */
  .lai .feed, .lai .moments { max-height:none; overflow:visible; }
}
`;

const nick = (t) => t.split(' ').slice(-1)[0];

function wpChart(el, values, homeName) {
  const W = Math.max(260, el.clientWidth || 600), H = 210, padL = 40, padR = 10, padT = 10, padB = 22;
  const x = (i) => padL + (i / (values.length - 1 || 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - v) * (H - padT - padB);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${homeName} win probability">
    <defs><clipPath id="lai-top"><rect x="0" y="0" width="${W}" height="${y(0.5)}"/></clipPath><clipPath id="lai-bot"><rect x="0" y="${y(0.5)}" width="${W}" height="${H}"/></clipPath></defs>
    ${[0, 0.25, 0.5, 0.75, 1].map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-2)" ${t === 0.5 ? 'stroke-dasharray="4 3" stroke="var(--muted)" opacity=".7"' : ''}/><text class="ax" x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${Math.round(t * 100)}%</text>`).join('')}
    <polygon clip-path="url(#lai-top)" points="${x(0)},${y(0.5)} ${pts} ${x(last)},${y(0.5)}" fill="var(--accent)" opacity=".16"/>
    <polygon clip-path="url(#lai-bot)" points="${x(0)},${y(0.5)} ${pts} ${x(last)},${y(0.5)}" fill="var(--gold)" opacity=".18"/>
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(last)}" cy="${y(values[last])}" r="5" fill="var(--accent)" stroke="var(--paper)" stroke-width="2"/>
    <text class="ax" x="${padL}" y="${H - 5}">Tip-off</text><text class="ax" x="${W - padR}" y="${H - 5}" text-anchor="end">Now</text>
    <line class="xh" x1="0" x2="0" y1="${padT}" y2="${H - padB}" stroke="var(--muted)" opacity="0"/>
    <circle class="dot" r="4.5" fill="var(--accent)" stroke="var(--paper)" stroke-width="2" opacity="0"/>
    <rect class="hit" x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent"/>
  </svg><div class="tip"></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh'), dot = el.querySelector('.dot');
  const show = (cx) => {
    const r = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(last, Math.round(((cx - r.left - padL) / (W - padL - padR)) * last)));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', '.5');
    dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(values[i])); dot.setAttribute('opacity', '1');
    tip.innerHTML = `${homeName} <b>${Math.round(values[i] * 100)}%</b>`;
    tip.style.left = `${Math.min(W - 50, Math.max(50, x(i)))}px`; tip.style.top = `${y(values[i])}px`; tip.style.opacity = '1';
  };
  const hide = () => { xh.setAttribute('opacity', '0'); dot.setAttribute('opacity', '0'); tip.style.opacity = '0'; };
  const hit = el.querySelector('.hit');
  hit.addEventListener('mousemove', (e) => show(e.clientX));
  hit.addEventListener('touchmove', (e) => show(e.touches[0].clientX), { passive: true });
  hit.addEventListener('mouseleave', hide);
  hit.addEventListener('touchend', hide);
}

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-live-ai')) document.head.insertAdjacentHTML('beforeend', `<style id="css-live-ai">${CSS}</style>`);
  const P = api.picks || {};
  const lives = () => api.events().filter((e) => e.live);
  let sel = (lives().find((e) => e.id === params.id) || lives()[0])?.id;
  let seenComments = 0;
  let seenMoments = 0;
  const logged = new Set();
  let sugg = [];              // suggestions currently shown
  const time = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const askHref = (e) => `#/ai-chat?q=${encodeURIComponent(`How is ${nick(e.home)} vs ${nick(e.away)} going? Any live bets?`)}`;

  root.innerHTML = `<div class="lai">
    ${ui.pageHead({ title: 'Live AI Analysis', tool: 'live-ai', live: true,
      subtitle: 'Every live game, read by our in-game model: win probability, momentum, play-by-play commentary and the live bets where books are slowest to react.',
      actions: '<span class="tag pos" id="lai-count" data-bf-nodata></span>' })}
    <div id="lai-main"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  function games() {
    const list = lives();
    $('#lai-count').innerHTML = `${ui.liveDot()} ${list.length} games live`;
    const strip = $('#lai-games');
    if (!strip) return;
    const inner = (e) => `<span class="gm-top">${ui.sport(e.sport)}<span>${ui.esc(e.clock)}</span></span>
      <span class="gm-row"><span>${ui.esc(nick(e.away))}</span><b>${e.score.away}</b></span>
      <span class="gm-row"><span>${ui.esc(nick(e.home))}</span><b>${e.score.home}</b></span>
      <span class="bar" title="${ui.esc(nick(e.home))} win probability"><i style="width:${Math.round(e.homeProb * 100)}%"></i></span>`;
    // Same games in the same order: patch each chip in place so keyboard focus survives the tick.
    const same = strip.children.length === list.length && list.every((e, i) => strip.children[i].dataset.ev === e.id);
    if (!same) strip.innerHTML = list.map((e) => `<button type="button" class="gm" data-ev="${e.id}" role="tab"></button>`).join('');
    list.forEach((e, i) => {
      const b = strip.children[i];
      const h = inner(e);
      if (b._h !== h) { b.innerHTML = h; b._h = h; }
      b.classList.toggle('on', e.id === sel);
      b.setAttribute('aria-selected', String(e.id === sel));
    });
  }

  /** The page frame for one game (static headings; live parts are filled by paint()). */
  function frame() {
    $('#lai-main').innerHTML = `<div class="lai-cols">
      <div class="lai-left">
        <div class="lai-games o-games" id="lai-games" role="tablist" aria-label="Live games" data-bf-nodata></div>
        <div class="board o-board" id="lai-board" data-bf-nodata></div>
        <section class="sec o-wp"><div class="sec-head"><h2>Win probability</h2><span class="sec-note" id="lai-wpnote" data-bf-nodata></span></div>
          <div class="chart" id="lai-chart"></div>
          <div class="mom" data-bf-nodata><span id="lai-mom-a"></span><div class="mom-track" role="img" aria-label="Momentum"><div class="mom-fill" id="lai-mom"></div></div><span id="lai-mom-h"></span></div>
          <div class="mom-txt" id="lai-momtxt" data-bf-nodata></div></section>
        <div class="lai-two o-two">
          <section class="sec"><div class="sec-head"><h2>AI commentary</h2>${ui.liveDot()}</div><ul class="feed" id="lai-feed" data-bf-nodata></ul></section>
          <section class="sec"><div class="sec-head"><h2>Key moments</h2></div><ul class="moments" id="lai-moments" data-bf-nodata></ul></section>
        </div>
      </div>
      <div class="lai-right">
        <section class="sec o-sugg"><div class="sec-head"><h2>Live bet suggestions</h2><span class="sec-note">Best price · your books</span></div>
          <div class="sugg" id="lai-sugg" data-bf-list></div><div id="lai-sugg-empty"></div></section>
        <section class="sec proj o-proj"><div class="sec-head"><h2>Projected final</h2>${ui.tag('AI model', 'dark')}</div><div id="lai-proj" data-bf-nodata></div></section>
        <div class="o-ask">${ui.how({ summary: 'Books move live lines slowly; the model reprices every play.',
          checks: ['The model updates each team’s chance to win after every score, possession and clock tick.',
            'It compares that chance with every book’s live price and keeps the gaps at the best book.',
            'Live edges close fast and any single bet can lose. Bet the suggested size, not more.'] })}</div>
      </div>
    </div>`;
  }

  // ---------- suggestions (keyed, patched in place) ----------
  const unit = () => store.get().unit;
  const calcHref = (s) => `#/calculators?${new URLSearchParams({ tab: 'ev', a: String(s.bestPrice), b: String(odds.probToAmerican(Math.min(0.99, Math.max(0.01, s.modelProb)))), stake: String(unit()) })}`;
  const sgParts = (s) => ({
    head: `<div><p class="sg-n">${ui.esc(s.selection)}</p><p class="sg-s">${ui.esc(s.label)} · win chance: model ${ui.pct(s.modelProb)} vs ${ui.pct(s.impliedProb)} implied</p></div>${ui.heroFig(`${s.edge >= 0 ? '+' : ''}${ui.pct(s.edge)}`, 'edge')}`,
    price: `<span class="sg-p">${ui.price(s.bestPrice, { best: true })} ${ui.book(s.bestBook)} ${ui.risk('live', { short: true })}</span>${ui.evLine({ prob: s.modelProb, payout: unit() * odds.toDecimal(s.bestPrice), ev: unit() * odds.ev(s.modelProb, s.bestPrice) })}`,
    acts: ui.actions(ui.betAction({ verb: 'Bet', amount: ui.money(unit(), 0), book: s.bestBook }),
      [['calc', 'Calc', { href: calcHref(s) }], logged.has(s.id) ? ['log', 'Logged', { attrs: { 'aria-disabled': 'true' } }] : ['log', 'Log']]),
  });
  function paintSugg(list, e) {
    const box = $('#lai-sugg');
    sugg = list;
    const busy = box.matches(':hover') || box.contains(document.activeElement);
    const have = new Map([...box.children].map((el) => [el.dataset.key, el]));
    for (const s of list) {
      let el = have.get(s.id);
      if (!el) {
        if (busy && have.size) continue; // don't insert under the cursor; it lands on the next tick
        el = document.createElement('div');
        el.className = 'sg';
        el.dataset.key = s.id;
        el.innerHTML = '<div class="sg-h" data-p="head"></div><div data-p="price"></div><div data-p="acts"></div>';
        box.appendChild(el);
      }
      for (const [k, html] of Object.entries(sgParts(s))) {
        const r = el.querySelector(`[data-p="${k}"]`);
        if (r._h !== html) { r.innerHTML = html; r._h = html; }
      }
      have.delete(s.id);
    }
    if (!busy) {
      for (const el of have.values()) el.remove();
      list.forEach((s, i) => { const el = [...box.children].find((x) => x.dataset.key === s.id); if (el && box.children[i] !== el) box.insertBefore(el, box.children[i] || null); });
    }
    $('#lai-sugg-empty').innerHTML = list.length ? '' : ui.empty({ title: 'No live edges this second', msg: 'Books are in line with the model right now. New edges show up as the game moves.',
      actions: [{ label: 'Ask AI about this game', href: askHref(e) }, { label: 'See pre-game AI picks', href: '#/ai-picks' }] });
  }

  function paint(full) {
    const a = sel && P.liveAnalysis?.(sel, { books: store.get().books });
    if (!a) {
      $('#lai-main').innerHTML = ui.empty({ title: 'No live games right now', msg: 'Live analysis starts automatically at tip-off.',
        actions: [{ label: 'See today’s AI picks', href: '#/ai-picks' }, { label: 'Ask BetFriend AI', href: '#/ai-chat' }, { label: 'Set an alert', href: '#/alerts' }] });
      $('#lai-count').innerHTML = `${ui.liveDot()} 0 games live`;
      return;
    }
    if (full || !$('#lai-board')) frame();
    games();
    const e = a.event;
    const hp = a.homeProb;
    $('#lai-board').innerHTML = `
      <div class="tm"><span class="nm">${ui.esc(e.away)}</span><span class="sc">${e.score.away}</span><span class="wp">${Math.round((1 - hp) * 100)}% to win</span></div>
      <div class="mid">${ui.liveDot()}<span class="clk">${ui.esc(e.clock)}</span>${ui.sport(e.sport)}</div>
      <div class="tm h"><span class="nm">${ui.esc(e.home)}</span><span class="sc">${e.score.home}</span><span class="wp">${Math.round(hp * 100)}% to win</span></div>
      <div class="board-foot"><span>Game ${Math.round(a.progress * 100)}% complete · model ${ui.pct(a.modelHomeProb, 0)} ${ui.esc(nick(e.home))}</span><span class="spacer"></span>
        <a class="btn sm outline" href="${askHref(e)}"><span data-bf-text>Ask AI about this game</span></a></div>`;
    const swing = a.winProb.length > 1 ? hp - a.winProb[a.winProb.length - 2] : 0;
    $('#lai-wpnote').textContent = `${nick(e.home)} ${Math.round(hp * 100)}% · ${swing >= 0 ? '+' : ''}${(swing * 100).toFixed(1)} last update`;
    wpChart($('#lai-chart'), a.winProb, nick(e.home));
    $('#lai-mom-a').textContent = nick(e.away);
    $('#lai-mom-h').textContent = nick(e.home);
    const m = a.currentMomentum;
    const mf = $('#lai-mom');
    mf.className = `mom-fill ${m >= 0 ? 'home' : 'away'}`;
    mf.style.width = `${Math.max(2, Math.abs(m) * 50)}%`;
    mf.style.left = m >= 0 ? '50%' : ''; mf.style.right = m < 0 ? '50%' : '';
    $('#lai-momtxt').textContent = Math.abs(m) < 0.08 ? 'Momentum neutral' : `Momentum: ${m >= 0 ? nick(e.home) : nick(e.away)} (${Math.abs(m) > 0.4 ? 'strong' : 'moderate'})`;

    const com = [...a.commentary].reverse();
    const newC = Math.max(0, a.commentary.length - seenComments);
    $('#lai-feed').innerHTML = com.map((c, i) => `<li class="${seenComments && i < newC ? 'new' : ''}"><span class="ai ${c.tone === 'edge' ? 'edge' : ''}" aria-hidden="true">AI</span><div>${ui.esc(c.text)}<time>${time(c.ts)}</time></div></li>`).join('');
    seenComments = a.commentary.length;
    const km = a.keyMoments;
    $('#lai-moments').innerHTML = km.map((k, i) => `<li class="${k.type}${seenMoments && i === 0 && km.length !== seenMoments ? ' new' : ''}"><div>${ui.esc(k.text)}</div>
      <div class="mt"><span>${ui.esc(k.clock || '')}</span><span>${time(k.ts)}</span>${k.swing ? `<span>WP ${ui.dir(k.swing)} ${k.swing > 0 ? '+' : ''}${(k.swing * 100).toFixed(1)}</span>` : ''}</div></li>`).join('');
    seenMoments = km.length;

    const pr = a.projected;
    const whole = e.sport === 'NBA' || e.sport === 'NFL' || e.sport === 'NCAAF';
    $('#lai-proj').innerHTML = `
      <div class="ps"><span>${ui.esc(e.away)}</span><b>${whole ? Math.round(pr.away) : pr.away.toFixed(1)}</b></div>
      <div class="ps"><span>${ui.esc(e.home)}</span><b>${whole ? Math.round(pr.home) : pr.home.toFixed(1)}</b></div>
      <dl class="kv"><dt>Projected total</dt><dd>${pr.total.toFixed(1)}</dd><dt>Projected margin</dt><dd>${nick(pr.margin >= 0 ? e.home : e.away)} by ${Math.abs(pr.margin).toFixed(1)}</dd>
      <dt>${ui.esc(nick(e.home))} win prob</dt><dd>${ui.pct(hp, 0)}</dd></dl>`;

    paintSugg(a.suggestions, e);
  }

  // Game strip + suggestion actions: delegated once on the root.
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ev]');
    if (!b) return;
    sel = b.dataset.ev; seenComments = 0; seenMoments = 0;
    ui.setQuery({ id: sel });
    paint(true);
  });
  ui.onAction(root, {
    log: (id, el) => {
      const s = sugg.find((x) => x.id === id);
      if (!s || logged.has(id)) return;
      ui.logBet({ kind: 'ai-pick', book: s.bestBook, sport: s.sport, market: s.market, selection: `${s.selection} (live)`, price: s.bestPrice, stake: unit(), eventId: s.eventId });
      logged.add(id);
      const row = el.closest('.sg');
      const r = row?.querySelector('[data-p="acts"]');
      if (r) { r._h = sgParts(s).acts; r.innerHTML = r._h; }
    },
  });

  paint(true);
  const unsub = api.onTick(() => {
    if (!sel || !lives().some((e) => e.id === sel)) { sel = lives()[0]?.id; paint(true); return; }
    paint(false);
  });
  let rt = null;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => paint(false), 150); };
  window.addEventListener('resize', onResize);
  return () => { unsub(); clearTimeout(rt); window.removeEventListener('resize', onResize); };
}
