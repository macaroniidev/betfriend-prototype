// Sharp Money: volume spikes on Novig / ProphetX, matched to the best US sportsbook or fantasy-app price,
// with exactly what and how much to bet.

const CSS = `
.bf-sharp .live-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 14px; border-radius:var(--r); background:var(--paper); border:1px solid var(--line); margin-bottom:14px; font-size:13px; }
.bf-sharp .on-dot { width:9px; height:9px; border-radius:50%; background:var(--pos); box-shadow:0 0 0 4px var(--pos-bg); animation:pulse 1.4s infinite; flex:none; }
.bf-sharp .sel { font-weight:700; font-size:14px; }
.bf-sharp .sel-meta { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:4px; font-size:12px; color:var(--muted); }
.bf-sharp .vol { display:flex; flex-direction:column; gap:3px; }
.bf-sharp .vol strong { font-variant-numeric:tabular-nums; }
.bf-sharp .spx { display:inline-flex; align-items:center; gap:4px; font-weight:700; font-size:12px; color:var(--sx-ink); background:var(--sx-bg); border-radius:6px; padding:1px 7px; width:max-content; }
.bf-sharp .mv { display:flex; align-items:center; gap:6px; white-space:nowrap; }
.bf-sharp .mv .was { color:var(--muted); text-decoration:line-through; font-family:var(--mono); font-size:12.5px; }
.bf-sharp .stake strong { font:600 17px var(--serif); font-variant-numeric:tabular-nums; }
.bf-sharp .stake small { display:block; color:var(--muted); font-size:11.5px; }
.bf-sharp .new { background:var(--lime); color:var(--ink); border-color:transparent; }
.bf-sharp .t td { vertical-align:top; }
.bf-sharp .below { grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr); margin-top:16px; align-items:start; }
.bf-sharp .sel-meta .evn { color:var(--text); }
@media (max-width:1100px) { .bf-sharp .below { grid-template-columns:minmax(0,1fr) minmax(0,1fr); } }
.bf-sharp .t td.act { vertical-align:middle; }
.bf-sharp .rec-curve { margin:6px 0 10px; }
.bf-sharp .rec-curve svg { width:100%; height:56px; }
.bf-sharp .mini { width:100%; border-collapse:collapse; font-size:12.5px; }
.bf-sharp .mini th, .bf-sharp .mini td { padding:6px 4px; border-bottom:1px solid var(--line-2); text-align:right; font-variant-numeric:tabular-nums; }
.bf-sharp .mini th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; }
.bf-sharp .mini td:first-child, .bf-sharp .mini th:first-child { text-align:left; }
.bf-sharp .how p { margin:6px 0 0; font-size:13px; line-height:1.5; color:#d3e4d9; }
.bf-sharp .how h3 { color:#fff; }
.bf-sharp .how ol { margin:8px 0 0; padding-left:18px; font-size:13px; color:#d3e4d9; }
.bf-sharp .how li + li { margin-top:4px; }
.bf-sharp .fchk { display:flex; align-items:center; gap:6px; font-size:13px; padding:8px 0; cursor:pointer; }
:root { --sx-bg:#fdecc8; --sx-ink:#8a5300; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sx-bg:#3b2a0c; --sx-ink:#f1c36a; } }
:root[data-theme="dark"] { --sx-bg:#3b2a0c; --sx-ink:#f1c36a; }
.sharp-dr .order { font-size:15px; line-height:1.5; }
.sharp-dr .order strong { font-size:17px; }
.sharp-dr .chart { width:100%; height:auto; display:block; }
.sharp-dr .chart text { font-size:10px; fill:var(--muted); font-family:var(--sans); }
.sharp-dr h3 { font-size:15px; margin:4px 0 8px; }
.sharp-dr .bk-t { width:100%; border-collapse:collapse; font-size:13px; }
.sharp-dr .bk-t td { padding:7px 4px; border-bottom:1px solid var(--line-2); }
.sharp-dr .bk-t td:last-child { text-align:right; }
.sharp-dr .actions { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
.sharp-dr .legend { display:flex; gap:12px; font-size:11.5px; color:var(--muted); margin-top:4px; flex-wrap:wrap; }
.sharp-dr .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
@media (max-width:860px) {
  .bf-sharp .below { grid-template-columns:minmax(0,1fr); }
  .bf-sharp table.stack-sm td { align-items:center; }
  .bf-sharp table.stack-sm td.first { display:block; text-align:left; border-bottom:1px solid var(--line-2); padding-bottom:10px; }
  .bf-sharp table.stack-sm td.first::before { display:none; }
  .bf-sharp table.stack-sm td.act { justify-content:flex-end; }
  .bf-sharp table.stack-sm td.act::before { display:none; }
  .bf-sharp .vol { align-items:flex-end; }
}`;

const fmtK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `$${Math.round(v / 1e3)}k` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}k` : `$${Math.round(v)}`);

export default function render(root, ctx) {
  const { api, store, ui, odds } = ctx;
  if (!document.getElementById('css-sharp-money')) document.head.insertAdjacentHTML('beforeend', `<style id="css-sharp-money">${CSS}</style>`);

  const f = { sport: 'All', exchange: 'all', minSpike: 2, market: 'All', timing: 'all', includeDfs: true };
  const seen = new Map(); // id -> first painted at (null = present on first load)
  let firstPaint = true;
  const rec = api.sharp.record();

  const query = () => {
    const s = store.get();
    return api.sharp.spikes({
      sport: f.sport, exchange: f.exchange, minSpike: f.minSpike, market: f.market, includeDfs: f.includeDfs,
      live: f.timing === 'all' ? undefined : f.timing === 'live', books: s.books, bankroll: s.bankroll, kellyMult: s.kellyMult,
    }).filter((x) => x.edge > 0);
  };

  root.innerHTML = `<div class="bf-sharp">
    ${ui.header({
      title: 'Sharp Money',
      subtitle: 'Bet where the pros actually put their money. Sportsbooks limit sharp bettors, so they bet big on Novig and ProphetX, where every bet is public. When a line there suddenly spikes in volume, we find you the best price on the same bet, and tell you exactly what and how much to bet.',
      tool: 'sharp-money',
      actions: `<button class="btn" data-how>How it works</button>`,
    })}
    <div data-stats></div>
    <div class="live-bar"><span class="on-dot"></span><strong>Watching Novig &amp; ProphetX</strong><span class="muted" data-livetxt></span><span class="spacer"></span><span class="muted">Stakes sized from your ${odds.money(store.get().bankroll, 0)} bankroll · ${store.get().kellyMult}× Kelly</span></div>
    <div class="toolbar">
      ${ui.select('sport', [['All', 'All sports'], ...api.sports.map((s) => [s, s])], f.sport, 'Sport')}
      ${ui.select('market', [['All', 'All markets'], ['Player Prop', 'Player props'], ['Moneyline', 'Moneyline'], ['Spread', 'Spread'], ['Total', 'Total']], f.market, 'Market')}
      <label class="field"><span>Exchange</span>${ui.seg('exchange', [['all', 'Both'], ['novig', 'Novig'], ['px', 'ProphetX']], f.exchange)}</label>
      <label class="field"><span>Min spike</span>${ui.seg('minSpike', [['2', '2×'], ['3', '3×'], ['5', '5×'], ['8', '8×']], f.minSpike)}</label>
      <label class="field"><span>Timing</span>${ui.seg('timing', [['all', 'All'], ['pre', 'Pre-game'], ['live', 'Live']], f.timing)}</label>
      <label class="fchk"><input type="checkbox" data-dfs checked> Include fantasy apps (PrizePicks, Underdog)</label>
    </div>
    <section class="card">
      <header><h2>Live spike feed</h2><span class="muted" data-count></span></header>
      <div data-feed></div>
    </section>
    <div class="grid below">
        <div class="callout dark how">
          <h3>Follow the money, not the touts</h3>
          <p>Sharp bettors get limited at regular sportsbooks, so they move their action to the exchanges. Every matched bet on Novig and ProphetX is public.</p>
          <ol><li>We watch volume on every line, from sides and totals to player props like <em>LeBron over 20.5 points</em>.</li>
          <li>When a line trades several times its normal volume, that is sharp money.</li>
          <li>We find the best price on the same bet at your US sportsbooks and fantasy apps, and size the bet from your bankroll.</li></ol>
        </div>
        <section class="card">
          <header><h3>Graded record · last 90 days</h3>${ui.tag(`${odds.pct(rec.overall.roi)} ROI`, 'pos')}</header>
          <div class="pad">
            <dl class="kv">
              <dt>Signals graded</dt><dd>${rec.overall.signals.toLocaleString()}</dd>
              <dt>Record</dt><dd>${rec.overall.wins.toLocaleString()}-${rec.overall.losses.toLocaleString()} (${odds.pct(rec.overall.winRate)})</dd>
              <dt>Profit</dt><dd class="pos" style="color:var(--pos)">+${rec.overall.units}u</dd>
              <dt>Avg closing line value</dt><dd>+${odds.pct(rec.overall.clv)}</dd>
            </dl>
            <div class="rec-curve">${curveSvg(rec.curve)}</div>
            <table class="mini"><thead><tr><th>Sport</th><th>Signals</th><th>Win %</th><th>ROI</th><th>CLV</th></tr></thead><tbody>
              ${rec.bySport.map((s) => `<tr><td>${ui.esc(s.sport)}</td><td>${s.signals}</td><td>${odds.pct(s.winRate)}</td><td style="color:var(--pos)">+${odds.pct(s.roi)}</td><td>+${odds.pct(s.clv)}</td></tr>`).join('')}
            </tbody></table>
            <table class="mini" style="margin-top:10px"><thead><tr><th>Market</th><th>Signals</th><th>ROI</th><th>CLV</th></tr></thead><tbody>
              ${rec.byMarket.map((s) => `<tr><td>${ui.esc(s.market)}</td><td>${s.signals}</td><td style="color:var(--pos)">+${odds.pct(s.roi)}</td><td>+${odds.pct(s.clv)}</td></tr>`).join('')}
            </tbody></table>
          </div>
        </section>
        <section class="card">
          <header><h3>Recently graded</h3></header>
          <div class="pad"><table class="mini"><tbody>
            ${rec.recent.slice(0, 8).map((g) => `<tr><td><div style="font-weight:600">${ui.esc(g.selection)}</div><div class="muted" style="font-size:11.5px">${ui.esc(g.sport)} · ${g.spikeX}× spike · ${ui.ago(g.gradedAt)}</div></td><td>${ui.price(g.price)}</td><td>${ui.tag(g.result === 'won' ? 'Won' : 'Lost', g.result === 'won' ? 'pos' : 'neg')}</td></tr>`).join('')}
          </tbody></table></div>
        </section>
    </div>
  </div>`;

  function curveSvg(vals) {
    const w = 300, h = 56, min = Math.min(0, ...vals), max = Math.max(...vals), span = max - min || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 10)}`);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Cumulative units, last 90 days">
      <polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="var(--pos-bg)"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--pos)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  const statsEl = root.querySelector('[data-stats]');
  const feedEl = root.querySelector('[data-feed]');

  function paint() {
    const now = Date.now();
    const added = new Set();
    for (const x of api.sharp.spikes({ includeDfs: true })) if (!seen.has(x.id)) { seen.set(x.id, firstPaint ? null : now); if (!firstPaint) added.add(x.id); }
    const rows = query();
    const hourAgo = Date.now() - 3600e3;
    const lastHour = rows.filter((r) => r.detectedAt >= hourAgo);
    const biggest = rows.reduce((a, r) => (!a || r.spikeX > a.spikeX ? r : a), null);
    const avgEdge = rows.reduce((a, r) => a + r.edge, 0) / Math.max(1, rows.length);
    const totalStake = rows.slice(0, 10).reduce((a, r) => a + r.recommendedStake, 0);
    statsEl.innerHTML = ui.stats([
      { label: 'Spikes in the last hour', value: String(lastHour.length), note: `${rows.length} actionable today` },
      { label: 'Biggest spike', value: biggest ? `${biggest.spikeX}×` : '—', note: biggest ? ui.esc(biggest.selection) : '' },
      { label: 'Avg edge at best price', value: `+${odds.pct(avgEdge)}`, tone: 'pos', note: 'vs. sharp fair odds' },
      { label: 'Signal record (90d)', value: odds.pct(rec.overall.winRate), note: `+${odds.pct(rec.overall.roi)} ROI · +${rec.overall.units}u` },
    ]);
    root.querySelector('[data-count]').textContent = `${rows.length} signals · ${odds.money(totalStake, 0)} recommended on the top 10`;
    root.querySelector('[data-livetxt]').textContent = `Last spike ${rows[0] ? ui.ago(rows[0].detectedAt) : '—'}`;
    if (!rows.length) { feedEl.innerHTML = `<div class="pad">${ui.empty('No spikes match these filters right now. New ones appear here the moment they hit.')}</div>`; return; }
    feedEl.innerHTML = `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      <th>Bet</th><th>Exchange volume</th><th>Exchange price</th><th>Best price</th><th>Edge</th><th>Bet this</th><th></th></tr></thead><tbody>
      ${rows.map((r) => {
        const justIn = added.has(r.id);
        const isNew = !!seen.get(r.id) && now - seen.get(r.id) < 45e3;
        const ev = api.eventById(r.eventId);
        return `<tr class="click${justIn ? ' flash' : ''}" data-id="${r.id}">
          <td class="first"><div class="sel">${ui.esc(r.selection)} ${isNew ? ui.tag('NEW', 'new') : ''}</div>
            <div class="sel-meta">${ui.sport(r.sport)} <span class="evn">${ui.esc(ev.away)} @ ${ui.esc(ev.home)}</span> ${ev.live ? ui.liveDot() : `<span>${ui.when(ev.start)}</span>`} ${r.market === 'Player Prop' ? ui.tag('Prop') : ''}</div></td>
          <td data-label="Exchange volume"><div class="vol">${ui.book(r.exchange)}<span><strong>${fmtK(r.volume)}</strong> in ${r.window} min</span><span class="spx">${r.spikeX}× normal</span><span class="muted" style="font-size:11.5px">${ui.ago(r.detectedAt)}</span></div></td>
          <td data-label="Exchange price"><div class="mv"><span class="was">${odds.fmtAmerican(r.priceBefore)}</span>→ ${ui.price(r.priceNow)}</div></td>
          <td data-label="Best price"><div class="mv">${ui.book(r.bestBook)} ${ui.price(r.bestPrice, { best: true })}</div></td>
          <td data-label="Edge">${ui.edge(r.edge)}</td>
          <td data-label="Bet this" class="stake"><div><strong>${odds.money(r.recommendedStake, 0)}</strong><small>to win ${odds.money(r.toWin, 0)}</small>${ui.meter(r.confidence, `Confidence ${odds.pct(r.confidence, 0)}`)}</div></td>
          <td class="act">${ui.betBtn(r.bestBook)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    firstPaint = false;
    ui.wireBetButtons(feedEl);
    feedEl.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openSpike(tr.dataset.id)));
  }

  function openSpike(id) {
    const s = store.get();
    const r = api.sharp.spikes({ books: s.books, bankroll: s.bankroll, kellyMult: s.kellyMult, includeDfs: f.includeDfs }).find((x) => x.id === id);
    if (!r) return;
    const h = api.sharp.history(id);
    const line = api.lineById(r.lineId);
    const ev = api.eventById(r.eventId);
    const i = r.outcomeIndex;
    const allPrices = Object.entries(line.prices).map(([b, p]) => ({ b, p: p[i] }));
    if (r.market === 'Player Prop' && f.includeDfs) allPrices.push({ b: 'pp', p: -119 }, { b: 'ud', p: -122 });
    allPrices.sort((a, b) => b.p - a.p);
    const typeLbl = (b) => ({ exchange: 'Exchange', sharp: 'Sharp book', dfs: 'Fantasy app', sportsbook: 'Sportsbook' }[api.bookById[b]?.type] || '');

    const body = ui.drawer('Sharp money signal', `<div class="sharp-dr stack">
      <div>${ui.eventCell(r.eventId)}</div>
      <div class="callout lime order">Bet <strong>${odds.money(r.recommendedStake, 0)}</strong> on <strong>${ui.esc(r.selection)}</strong> at <strong>${ui.esc(api.bookById[r.bestBook].name)}</strong> <strong class="mono">${odds.fmtAmerican(r.bestPrice)}</strong><br><span style="font-size:13px">To win ${odds.money(r.toWin, 0)} · fair odds ${odds.fmtAmerican(r.fairPrice)} · edge +${odds.pct(r.edge, 2)} · confidence ${odds.pct(r.confidence, 0)}</span></div>
      ${ui.stats([
        { label: `${api.bookById[r.exchange].name} volume`, value: fmtK(r.volume), note: `in ${r.window} min` },
        { label: 'vs normal', value: `${r.spikeX}×`, note: `baseline ${fmtK(r.baseline)}` },
        { label: 'Exchange move', value: `${odds.fmtAmerican(r.priceBefore)} → ${odds.fmtAmerican(r.priceNow)}`, note: ui.ago(r.detectedAt) },
      ])}
      <div><h3>Volume traded (5-min buckets, last 2h)</h3>${volChart(h)}
        <div class="legend"><span><i style="background:var(--sx-ink)"></i>Spike</span><span><i style="background:var(--line)"></i>Normal</span><span>- - - Normal volume</span></div></div>
      <div><h3>${ui.esc(api.bookById[r.exchange].name)} price</h3>${priceChart(h)}</div>
      <div><h3>Every price on this bet</h3><table class="bk-t"><tbody>
        ${allPrices.map(({ b, p }) => `<tr><td>${ui.book(b, { full: true })} ${s.books.includes(b) ? ui.tag('Your book') : ''}</td><td class="muted" style="font-size:12px">${typeLbl(b)}</td><td>${ui.price(p, { best: b === r.bestBook })}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="actions">${ui.numberInput('stake', r.recommendedStake, 'Stake', { prefix: '$', step: 5 })}
        <button class="btn" data-log>Log bet</button>${ui.betBtn(r.bestBook, 'Bet now at')}</div>
      <p class="muted" style="font-size:12.5px;margin:0">${ui.esc(ev.away)} @ ${ui.esc(ev.home)} · ${ui.esc(line.label)} · Stake = ${store.get().kellyMult}× Kelly at fair odds, scaled by signal confidence.</p>
    </div>`, { wide: false });
    let stake = r.recommendedStake;
    ui.onNumber(body, 'stake', (v) => { stake = v; });
    ui.wireBetButtons(body);
    body.querySelector('[data-log]').addEventListener('click', () => ui.logBet({
      kind: 'sharp', book: r.bestBook, sport: r.sport, market: r.market, selection: r.selection, price: r.bestPrice, stake,
    }));
  }

  function volChart(h) {
    const W = 480, H = 150, pad = 18, n = h.buckets.length, bw = (W - 8) / n;
    const max = Math.max(...h.buckets.map((b) => b.volume)) * 1.08;
    const y = (v) => H - pad - (v / max) * (H - pad - 8);
    const bars = h.buckets.map((b, k) => `<rect x="${4 + k * bw + 1.5}" y="${y(b.volume)}" width="${bw - 3}" height="${H - pad - y(b.volume)}" rx="2" fill="${b.spike ? 'var(--sx-ink)' : 'var(--line)'}"><title>${fmtK(b.volume)}</title></rect>`).join('');
    const bl = y(h.baselinePerBucket);
    const top = h.buckets[n - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume per 5 minutes">${bars}
      <line x1="0" x2="${W}" y1="${bl}" y2="${bl}" stroke="var(--muted)" stroke-dasharray="4 4"/>
      <text x="${W - 4}" y="${y(top.volume) - 4}" text-anchor="end" style="fill:var(--text);font-weight:700">${fmtK(top.volume)}</text>
      <text x="4" y="${H - 4}">−2h</text><text x="${W / 2}" y="${H - 4}" text-anchor="middle">−1h</text><text x="${W - 4}" y="${H - 4}" text-anchor="end">now</text></svg>`;
  }
  function priceChart(h) {
    const W = 480, H = 120, pad = 18;
    const ps = h.prices.map((p) => p.prob);
    const min = Math.min(...ps) - 0.01, max = Math.max(...ps) + 0.01;
    const x = (k) => 34 + (k / (ps.length - 1)) * (W - 40);
    const y = (p) => H - pad - ((p - min) / (max - min)) * (H - pad - 10);
    const pts = ps.map((p, k) => `${x(k)},${y(p)}`).join(' ');
    const first = h.prices[0], last = h.prices[h.prices.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Exchange price over time">
      <line x1="34" x2="${W}" y1="${y(first.prob)}" y2="${y(first.prob)}" stroke="var(--line)" stroke-dasharray="3 3"/>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="${x(ps.length - 1)}" cy="${y(last.prob)}" r="4" fill="var(--accent)"/>
      <text x="0" y="${y(first.prob) + 3}">${odds.fmtAmerican(first.price)}</text>
      <text x="${x(ps.length - 1) - 8}" y="${y(last.prob) - 8}" text-anchor="end" style="fill:var(--text);font-weight:700">${odds.fmtAmerican(last.price)}</text>
      <text x="34" y="${H - 4}">−2h</text><text x="${W - 4}" y="${H - 4}" text-anchor="end">now</text></svg>`;
  }

  // Filters
  ui.onSelect(root, 'sport', (v) => { f.sport = v; paint(); });
  ui.onSelect(root, 'market', (v) => { f.market = v; paint(); });
  const segs = { exchange: (v) => (f.exchange = v), minSpike: (v) => (f.minSpike = Number(v)), timing: (v) => (f.timing = v) };
  for (const [name, set] of Object.entries(segs)) {
    ui.onSeg(root, name, (v) => {
      set(v);
      root.querySelectorAll(`[data-seg="${name}"] button`).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      paint();
    });
  }
  root.querySelector('[data-dfs]').addEventListener('change', (e) => { f.includeDfs = e.target.checked; paint(); });
  root.querySelector('[data-how]').addEventListener('click', () => ui.drawer('How Sharp Money works', `<div class="stack">
    <p>Sportsbooks limit sharp bettors, so they bet big on <strong>Novig</strong> and <strong>ProphetX</strong>, where every bet is public.</p>
    <p>When a line there suddenly spikes in volume, we find you the best price on the same bet across your U.S. sportsbooks and fantasy apps (PrizePicks, Underdog).</p>
    <p>We follow whole lines (like <em>LeBron over 20.5 points</em>), not individual bettors, so you see the market's sharpest money the moment it moves.</p>
    <p>Every signal tells you exactly what to bet, where, and how much, sized from your bankroll and the strength of the spike.</p>
    <div class="callout lime">Change your bankroll, Kelly multiplier and books in <a href="#/account">Settings</a>.</div></div>`));

  paint();
  const unTick = api.onTick(() => paint());
  const unStore = store.subscribe(() => paint());
  return () => { unTick(); unStore(); };
}
