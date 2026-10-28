// Live AI Analysis: in-game win probability, momentum, AI commentary, key moments, projected final
// and live bet suggestions priced against every book. Updates on every odds/score tick.

const CSS = `
.lai .lai-games { display:grid; grid-template-columns:repeat(auto-fill, minmax(178px, 1fr)); gap:10px; margin-bottom:16px; }
.lai .gm { text-align:left; border:1px solid var(--line); background:var(--paper); border-radius:var(--r); padding:10px 12px; cursor:pointer; display:grid; gap:4px; box-shadow:var(--shadow); color:var(--text); min-width:0; }
.lai .gm:hover { border-color:var(--accent); }
.lai .gm.on { border-color:var(--ink); box-shadow:0 0 0 2px var(--lime-2); }
.lai .gm-top { display:flex; justify-content:space-between; align-items:center; font-size:11.5px; gap:6px; }
.lai .gm-row { display:flex; justify-content:space-between; gap:8px; font-weight:600; font-size:13px; }
.lai .gm-row span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lai .gm-row b { font-variant-numeric:tabular-nums; }
.lai .gm .bar { height:5px; }
.lai .board { padding:16px; display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; }
.lai .tm { display:grid; gap:2px; }
.lai .tm.h { text-align:right; }
.lai .tm .nm { font:600 17px var(--serif); }
.lai .tm .sc { font:700 34px var(--serif); font-variant-numeric:tabular-nums; line-height:1.1; }
.lai .tm .wp { font-size:12px; color:var(--muted); }
.lai .mid { text-align:center; display:grid; gap:6px; justify-items:center; }
.lai .mid .clk { font-weight:700; font-variant-numeric:tabular-nums; }
.lai .board-foot { grid-column:1 / -1; display:flex; gap:10px; align-items:center; flex-wrap:wrap; border-top:1px solid var(--line-2); padding-top:12px; }
.lai .board-foot .spacer { flex:1; }
.lai .chart { position:relative; width:100%; }
.lai .chart svg { display:block; overflow:visible; max-width:100%; height:auto; }
.lai .ax { fill:var(--muted); font-size:11px; font-family:var(--sans); }
.lai .chart .tip { position:absolute; pointer-events:none; background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow); border-radius:8px; padding:6px 9px; font-size:12px; white-space:nowrap; transform:translate(-50%, -115%); opacity:0; transition:opacity .1s; z-index:2; }
.lai .mom { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center; font-size:12px; font-weight:600; }
.lai .mom-track { position:relative; height:12px; border-radius:6px; background:var(--panel); border:1px solid var(--line); overflow:hidden; }
.lai .mom-track::after { content:""; position:absolute; left:50%; top:0; bottom:0; width:2px; background:var(--muted); opacity:.5; }
.lai .mom-fill { position:absolute; top:0; bottom:0; transition:all .5s ease; }
.lai .mom-fill.home { left:50%; background:var(--accent); border-radius:0 6px 6px 0; }
.lai .mom-fill.away { right:50%; background:var(--gold); border-radius:6px 0 0 6px; }
.lai .feed { list-style:none; margin:0; padding:0; max-height:340px; overflow-y:auto; }
.lai .feed li { padding:10px 16px; border-bottom:1px solid var(--line-2); display:grid; grid-template-columns:auto 1fr; gap:10px; font-size:13px; }
.lai .feed li.new { animation: lai-in 1.4s ease; }
@keyframes lai-in { from { background:color-mix(in srgb, var(--lime) 50%, transparent); } to { background:transparent; } }
.lai .feed .ai { width:24px; height:24px; border-radius:7px; background:var(--ink); color:var(--lime); display:grid; place-items:center; font-size:12px; font-weight:700; }
.lai .feed .ai.edge { background:var(--lime); color:var(--ink); }
.lai .feed time { display:block; font-size:11px; color:var(--muted); margin-top:2px; }
.lai .moments { list-style:none; margin:0; padding:6px 16px 10px; max-height:340px; overflow-y:auto; }
.lai .moments li { position:relative; padding:8px 0 8px 20px; border-left:2px solid var(--line); margin-left:5px; font-size:13px; }
.lai .moments li::before { content:""; position:absolute; left:-7px; top:12px; width:12px; height:12px; border-radius:50%; background:var(--paper); border:2px solid var(--accent); }
.lai .moments li.lead::before { background:var(--lime); border-color:var(--ink); }
.lai .moments li.swing::before { border-color:var(--gold); }
.lai .moments .mt { font-size:11px; color:var(--muted); display:flex; gap:8px; }
.lai .proj { padding:16px; display:grid; gap:10px; }
.lai .proj .ps { display:flex; justify-content:space-between; align-items:baseline; font-size:15px; }
.lai .proj .ps b { font:700 24px var(--serif); font-variant-numeric:tabular-nums; }
.lai .sg { padding:12px 16px; border-bottom:1px solid var(--line-2); display:grid; gap:8px; }
.lai .sg:last-child { border-bottom:0; }
.lai .sg-h { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
.lai .sg-n { font-weight:600; }
.lai .sg-s { font-size:12px; color:var(--muted); }
.lai .sg-a { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.lai .two { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:16px; }
.lai .stack16 > * + * { margin-top:16px; }
@media (max-width:860px) {
  .lai .lai-games { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:4px; scrollbar-width:none; }
  .lai .gm { flex:0 0 170px; scroll-snap-align:start; }
  .lai .two { grid-template-columns:1fr; }
  .lai .tm .sc { font-size:28px; } .lai .tm .nm { font-size:15px; }
  .lai .board { padding:14px 12px; }
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
  const { api, store, ui, params } = ctx;
  if (!document.getElementById('css-live-ai')) document.head.insertAdjacentHTML('beforeend', `<style id="css-live-ai">${CSS}</style>`);
  const P = api.picks || {};
  const lives = () => api.events().filter((e) => e.live);
  let sel = (lives().find((e) => e.id === params.id) || lives()[0])?.id;
  let seenComments = 0;
  let seenMoments = 0;
  const logged = new Set();
  const time = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  root.innerHTML = `<div class="lai">
    ${ui.header({ title: 'Live AI Analysis', tool: 'live-ai',
      subtitle: 'Every live game, read by our in-game model: win probability, momentum, play-by-play commentary and the live bets where books are slowest to react.',
      actions: `<span class="tag pos" id="lai-count"></span>` })}
    <div class="lai-games" id="lai-games" role="tablist" aria-label="Live games"></div>
    <div id="lai-main"></div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  function games() {
    const list = lives();
    $('#lai-count').innerHTML = `${ui.liveDot()} ${list.length} games live`;
    $('#lai-games').innerHTML = list.map((e) => `<button class="gm ${e.id === sel ? 'on' : ''}" data-ev="${e.id}" role="tab" aria-selected="${e.id === sel}">
      <div class="gm-top">${ui.sport(e.sport)}<span class="muted">${ui.esc(e.clock)}</span></div>
      <div class="gm-row"><span>${ui.esc(nick(e.away))}</span><b>${e.score.away}</b></div>
      <div class="gm-row"><span>${ui.esc(nick(e.home))}</span><b>${e.score.home}</b></div>
      <div class="bar" title="${ui.esc(nick(e.home))} win probability"><i style="width:${Math.round(e.homeProb * 100)}%"></i></div>
    </button>`).join('');
    $('#lai-games').querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', () => {
      sel = b.dataset.ev; seenComments = 0; seenMoments = 0;
      try { history.replaceState(null, '', `#/live-ai?id=${sel}`); } catch { /* not allowed in some frames */ }
      games(); main(true);
    }));
  }

  function main(full) {
    const a = sel && P.liveAnalysis?.(sel, { books: store.get().books });
    if (!a) { $('#lai-main').innerHTML = ui.empty('No live games right now. Live analysis starts automatically at tip-off.'); return; }
    const e = a.event;
    const hp = a.homeProb;
    const q = `How is ${nick(e.home)} vs ${nick(e.away)} going? Any live bets?`;
    if (full || !$('#lai-board')) {
      $('#lai-main').innerHTML = `<div class="split">
        <div class="stack16">
          <section class="card board" id="lai-board"></section>
          <section class="card"><header><h3>Win probability</h3><span class="muted" style="font-size:12px" id="lai-wpnote"></span></header>
            <div class="pad"><div class="chart" id="lai-chart"></div>
            <div class="mom" style="margin-top:14px"><span>${ui.esc(nick(e.away))}</span><div class="mom-track" aria-label="Momentum"><div class="mom-fill" id="lai-mom"></div></div><span>${ui.esc(nick(e.home))}</span></div>
            <div class="muted" style="font-size:12px;text-align:center;margin-top:6px" id="lai-momtxt"></div></div></section>
          <div class="two">
            <section class="card"><header><h3>AI commentary</h3>${ui.liveDot()}</header><ul class="feed" id="lai-feed"></ul></section>
            <section class="card"><header><h3>Key moments</h3></header><ul class="moments" id="lai-moments"></ul></section>
          </div>
        </div>
        <div class="stack16">
          <section class="card proj" id="lai-proj"></section>
          <section class="card"><header><h3>Live bet suggestions</h3><span class="muted" style="font-size:12px">Best price · your books</span></header><div id="lai-sugg"></div></section>
          <a class="btn primary block" href="#/ai-chat?q=${encodeURIComponent(q)}">✎ Ask AI about this game</a>
        </div>
      </div>`;
    }
    $('#lai-board').innerHTML = `
      <div class="tm"><span class="nm">${ui.esc(e.away)}</span><span class="sc">${e.score.away}</span><span class="wp">${Math.round((1 - hp) * 100)}% to win</span></div>
      <div class="mid">${ui.liveDot()}<span class="clk">${ui.esc(e.clock)}</span>${ui.sport(e.sport)}</div>
      <div class="tm h"><span class="nm">${ui.esc(e.home)}</span><span class="sc">${e.score.home}</span><span class="wp">${Math.round(hp * 100)}% to win</span></div>
      <div class="board-foot"><span class="muted" style="font-size:12.5px">Game ${Math.round(a.progress * 100)}% complete · model ${ui.pct(a.modelHomeProb, 0)} ${ui.esc(nick(e.home))}</span><span class="spacer"></span>
        <a class="btn sm" href="#/ai-chat?q=${encodeURIComponent(q)}">✎ Ask AI about this game</a></div>`;
    const swing = a.winProb.length > 1 ? hp - a.winProb[a.winProb.length - 2] : 0;
    $('#lai-wpnote').textContent = `${nick(e.home)} ${Math.round(hp * 100)}% · ${swing >= 0 ? '+' : ''}${(swing * 100).toFixed(1)} last update`;
    wpChart($('#lai-chart'), a.winProb, nick(e.home));
    const m = a.currentMomentum;
    const mf = $('#lai-mom');
    mf.className = `mom-fill ${m >= 0 ? 'home' : 'away'}`;
    mf.style.width = `${Math.max(2, Math.abs(m) * 50)}%`;
    mf.style.left = m >= 0 ? '50%' : ''; mf.style.right = m < 0 ? '50%' : '';
    $('#lai-momtxt').textContent = Math.abs(m) < 0.08 ? 'Momentum neutral' : `Momentum: ${m >= 0 ? nick(e.home) : nick(e.away)} (${Math.abs(m) > 0.4 ? 'strong' : 'moderate'})`;

    const com = [...a.commentary].reverse();
    const newC = Math.max(0, a.commentary.length - seenComments);
    $('#lai-feed').innerHTML = com.map((c, i) => `<li class="${seenComments && i < newC ? 'new' : ''}"><span class="ai ${c.tone === 'edge' ? 'edge' : ''}">AI</span><div>${ui.esc(c.text)}<time>${time(c.ts)}</time></div></li>`).join('');
    seenComments = a.commentary.length;
    const km = a.keyMoments;
    $('#lai-moments').innerHTML = km.map((k, i) => `<li class="${k.type}${seenMoments && i === 0 && km.length !== seenMoments ? ' new' : ''}"><div>${ui.esc(k.text)}</div>
      <div class="mt"><span>${ui.esc(k.clock || '')}</span><span>${time(k.ts)}</span>${k.swing ? `<span>WP ${k.swing > 0 ? '+' : ''}${(k.swing * 100).toFixed(1)}</span>` : ''}</div></li>`).join('');
    seenMoments = km.length;

    const pr = a.projected;
    $('#lai-proj').innerHTML = `<div class="row" style="justify-content:space-between"><h3>Projected final</h3>${ui.tag('AI model', 'dark')}</div>
      <div class="ps"><span>${ui.esc(e.away)}</span><b>${e.sport === 'NBA' || e.sport === 'NFL' || e.sport === 'NCAAF' ? Math.round(pr.away) : pr.away.toFixed(1)}</b></div>
      <div class="ps"><span>${ui.esc(e.home)}</span><b>${e.sport === 'NBA' || e.sport === 'NFL' || e.sport === 'NCAAF' ? Math.round(pr.home) : pr.home.toFixed(1)}</b></div>
      <dl class="kv"><dt>Projected total</dt><dd>${pr.total.toFixed(1)}</dd><dt>Projected margin</dt><dd>${nick(pr.margin >= 0 ? e.home : e.away)} by ${Math.abs(pr.margin).toFixed(1)}</dd>
      <dt>${ui.esc(nick(e.home))} win prob</dt><dd>${ui.pct(hp, 0)}</dd></dl>`;

    const sugg = a.suggestions;
    $('#lai-sugg').innerHTML = sugg.length ? sugg.map((s) => `<div class="sg">
      <div class="sg-h"><div><div class="sg-n">${ui.esc(s.selection)}</div><div class="sg-s">${ui.esc(s.label)} · model ${ui.pct(s.modelProb)} vs ${ui.pct(s.impliedProb)} implied</div></div>${ui.edge(s.edge)}</div>
      <div class="sg-a">${ui.book(s.bestBook)} ${ui.price(s.bestPrice, { best: true })}<span class="spacer"></span>${ui.betBtn(s.bestBook)}
        <button class="btn sm" data-log="${s.id}" ${logged.has(s.id) ? 'disabled' : ''}>${logged.has(s.id) ? '✓ Logged' : '+ Log'}</button></div></div>`).join('') : ui.empty('No live edges this second.');
    ui.wireBetButtons($('#lai-sugg'));
    $('#lai-sugg').querySelectorAll('[data-log]').forEach((b) => b.addEventListener('click', () => {
      const s = sugg.find((x) => x.id === b.dataset.log);
      if (!s) return;
      ui.logBet({ kind: 'ai-pick', book: s.bestBook, sport: s.sport, market: s.market, selection: `${s.selection} (live)`, price: s.bestPrice, stake: store.get().unit, eventId: s.eventId });
      logged.add(s.id); b.textContent = '✓ Logged'; b.disabled = true;
    }));
  }

  games();
  main(true);
  const unsub = api.onTick(() => {
    if (!sel || !lives().some((e) => e.id === sel)) sel = lives()[0]?.id;
    games(); main(false);
  });
  let rt = null;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => main(false), 150); };
  window.addEventListener('resize', onResize);
  return () => { unsub(); clearTimeout(rt); window.removeEventListener('resize', onResize); };
}
