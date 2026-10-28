// Bet Tracker & Account Health: P&L, ROI, CLV, bets table with settle/delete, add-bet, CSV export,
// per-tool breakdown and sportsbook account health (healthy / limited / restricted).

const CSS = `
.tk .chart { width: 100%; display: block; }
.tk .chart text { fill: var(--muted); font-size: 11px; font-family: var(--sans); }
.tk .chart .grid line { stroke: var(--line-2); }
.tk .chart .zero { stroke: var(--line); stroke-dasharray: 3 3; }
.tk .chart .ln { fill: none; stroke: var(--accent); stroke-width: 2; }
.tk .chart .ar { fill: color-mix(in srgb, var(--accent) 14%, transparent); }
.tk .chart .dot { fill: var(--accent); stroke: var(--paper); stroke-width: 2; }
.tk .kind-row { display: grid; grid-template-columns: 92px 1fr 80px 62px; gap: 10px; align-items: center; font-size: 13px; padding: 7px 0; border-bottom: 1px solid var(--line-2); }
.tk .kind-row:last-child { border-bottom: 0; }
.tk .kind-row .num-cell { font-weight: 600; }
.tk .dbar { position: relative; height: 8px; background: var(--panel); border-radius: 4px; }
.tk .dbar i { position: absolute; top: 0; bottom: 0; border-radius: 4px; }
.tk .dbar::after { content: ""; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1px; background: var(--line); }
.tk .sel-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.tk .acts { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.tk .hstat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--line-2); }
.tk .hstat div { background: var(--panel); border-radius: 10px; padding: 10px 12px; }
.tk .hstat span { font-size: 12px; color: var(--muted); display: block; }
.tk .hstat strong { font: 600 20px var(--serif); }
.tk .more { display: flex; justify-content: center; padding: 12px; }
.tk-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tk-form .full { grid-column: 1 / -1; }
@media (max-width: 860px) { .tk .hstat { grid-template-columns: 1fr; } .tk .kind-row { grid-template-columns: 80px 1fr 72px 52px; } }`;

const KINDS = [['arb', 'Arbitrage'], ['ev', '+EV'], ['middle', 'Middles'], ['promo', 'Promos'], ['sharp', 'Sharp money'], ['signal', 'Bettor signals'], ['ai-pick', 'AI picks'], ['prediction', 'Prediction mkts']];
const kindLabel = (k) => (KINDS.find(([v]) => v === k) || [k, k])[1];

export default function render(root, { api, store, ui, odds }) {
  if (!document.getElementById('css-tk')) document.head.insertAdjacentHTML('beforeend', `<style id="css-tk">${CSS}</style>`);
  const T = api.tracker;
  const F = { status: 'all', kind: 'All', book: 'All', sport: 'All', limit: 20 };

  root.innerHTML = `<div class="tk">
    ${ui.header({ title: 'Bet Tracker & Accounts', tool: 'tracker',
      subtitle: 'Every bet from every tool in one ledger: P&L, ROI and closing-line value, plus the health of each sportsbook account.',
      actions: '<button class="btn" id="tk-csv">Copy as CSV</button><button class="btn primary" id="tk-add">+ Add bet</button>' })}
    <div id="tk-stats"></div>
    <div class="grid g2" style="margin-bottom:16px">
      <section class="card"><header><h3>P&amp;L over time</h3><span class="muted" id="tk-range"></span></header><div class="pad" id="tk-chart"></div></section>
      <section class="card"><header><h3>Breakdown by tool</h3><span class="muted" style="font-size:12px">P&amp;L · ROI</span></header><div class="pad" id="tk-kinds" style="padding-top:6px;padding-bottom:6px"></div></section>
    </div>
    <section class="card" style="margin-bottom:16px"><header><h3>Bets</h3><span class="muted" id="tk-count"></span></header>
      <div class="pad" style="padding-bottom:0"><div class="toolbar" id="tk-filters"></div></div><div id="tk-bets"></div></section>
    <section class="card" id="tk-health"></section></div>`;
  const $ = (s) => root.querySelector(s);

  function drawStats() {
    const s = T.summary();
    $('#tk-stats').innerHTML = ui.stats([
      { label: 'Profit / loss', value: odds.money(s.pnl), tone: s.pnl >= 0 ? 'pos' : 'neg', note: `on ${odds.money(s.staked, 0)} settled` },
      { label: 'ROI', value: odds.pct(s.roi), tone: s.roi >= 0 ? 'pos' : 'neg' },
      { label: 'Avg CLV', value: `${s.clv >= 0 ? '+' : ''}${odds.pct(s.clv, 2)}`, tone: s.clv >= 0 ? 'pos' : 'neg', note: 'beat the closing line' },
      { label: 'Win rate', value: odds.pct(s.winRate), note: `${s.count - s.open} settled` },
      { label: 'Open bets', value: String(s.open), note: odds.money(T.list().filter((b) => b.status === 'open').reduce((a, b) => a + b.stake, 0), 0) + ' at risk' },
    ]);
  }

  function drawChart() {
    const el = $('#tk-chart');
    const settled = T.list().filter((b) => b.status !== 'open').sort((a, b) => a.placedAt - b.placedAt);
    if (settled.length < 2) { el.innerHTML = ui.empty('Settle a few bets to see your curve.'); return; }
    let c = 0;
    const pts = settled.map((b) => ({ t: b.placedAt, v: (c += b.pnl) }));
    pts.unshift({ t: pts[0].t - 3600e3, v: 0 });
    const W = Math.max(280, el.clientWidth - 32 || 600), H = 262, L = 52, R = 12, Tp = 12, B = 26;
    const minV = Math.min(0, ...pts.map((p) => p.v)), maxV = Math.max(0, ...pts.map((p) => p.v));
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
    const x = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v) => Tp + (1 - (v - minV) / (maxV - minV || 1)) * (H - Tp - B);
    const step = niceStep((maxV - minV) / 4);
    const ticks = [];
    for (let v = Math.ceil(minV / step) * step; v <= maxV; v += step) ticks.push(v);
    const days = 4;
    const xt = Array.from({ length: days + 1 }, (_, i) => t0 + ((t1 - t0) * i) / days);
    const line = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const lastP = pts[pts.length - 1];
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cumulative profit and loss">
      <g class="grid">${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${odds.money(v, 0)}</text>`).join('')}</g>
      <line class="zero" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
      <polygon class="ar" points="${x(t0)},${y(0)} ${line} ${x(t1)},${y(0)}"/>
      <polyline class="ln" points="${line}"/>
      <circle class="dot" cx="${x(lastP.t)}" cy="${y(lastP.v)}" r="4"/>
      ${xt.map((t, i) => `<text x="${x(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === days ? 'end' : 'middle'}">${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`).join('')}
    </svg>`;
    $('#tk-range').textContent = `${settled.length} settled · ${odds.money(lastP.v)}`;
  }
  const niceStep = (s) => { const p = 10 ** Math.floor(Math.log10(Math.max(1, s))); return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= s) || p * 10; };

  function drawKinds() {
    const by = {};
    for (const b of T.list()) {
      const k = (by[b.kind] ||= { n: 0, staked: 0, pnl: 0 });
      k.n++;
      if (b.status !== 'open') { k.staked += b.stake; k.pnl += b.pnl; }
    }
    const rows = KINDS.filter(([k]) => by[k]).map(([k, l]) => ({ k, l, ...by[k] })).sort((a, b) => b.pnl - a.pnl);
    const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
    $('#tk-kinds').innerHTML = rows.map((r) => {
      const w = (Math.abs(r.pnl) / max) * 50;
      return `<div class="kind-row"><span>${ui.esc(r.l)} <span class="muted">${r.n}</span></span>
        <div class="dbar"><i style="${r.pnl >= 0 ? `left:50%;width:${w}%;background:var(--pos)` : `right:50%;width:${w}%;background:var(--neg)`}"></i></div>
        <span class="num-cell" style="color:${r.pnl >= 0 ? 'var(--pos)' : 'var(--neg)'}">${odds.money(r.pnl, 0)}</span>
        <span class="num-cell muted">${odds.pct(r.staked ? r.pnl / r.staked : 0, 1)}</span></div>`;
    }).join('');
  }

  function drawFilters() {
    const list = T.list();
    const books = [...new Set(list.map((b) => b.book))];
    const sports = [...new Set(list.map((b) => b.sport))];
    $('#tk-filters').innerHTML = `${ui.seg('status', [['all', 'All'], ['open', 'Open'], ['won', 'Won'], ['lost', 'Lost'], ['push', 'Push']], F.status)}
      ${ui.select('kind', [['All', 'All tools'], ...KINDS], F.kind, 'Tool')}
      ${ui.select('book', [['All', 'All books'], ...books.map((b) => [b, api.bookById[b]?.name || b])], F.book, 'Book')}
      ${ui.select('sport', ['All', ...sports], F.sport, 'Sport')}`;
    ui.onSeg($('#tk-filters'), 'status', (v) => { F.status = v; F.limit = 20; drawFilters(); drawBets(); });
    ui.onSelect($('#tk-filters'), 'kind', (v) => { F.kind = v; F.limit = 20; drawBets(); });
    ui.onSelect($('#tk-filters'), 'book', (v) => { F.book = v; F.limit = 20; drawBets(); });
    ui.onSelect($('#tk-filters'), 'sport', (v) => { F.sport = v; F.limit = 20; drawBets(); });
  }

  const filtered = () => T.list().filter((b) => (F.status === 'all' || b.status === F.status) && (F.kind === 'All' || b.kind === F.kind)
    && (F.book === 'All' || b.book === F.book) && (F.sport === 'All' || b.sport === F.sport));

  function drawBets() {
    const list = filtered();
    $('#tk-count').textContent = `${list.length} bets`;
    const shown = list.slice(0, F.limit);
    $('#tk-bets').innerHTML = list.length ? `<table class="t stack-sm"><thead><tr><th>Placed</th><th>Bet</th><th>Tool</th><th>Book</th><th class="num-cell">Odds</th><th class="num-cell">Stake</th><th class="num-cell">CLV</th><th>Status</th><th class="num-cell">P&amp;L</th><th></th></tr></thead><tbody>
      ${shown.map((b) => `<tr>
        <td data-label="Placed" class="muted">${new Date(b.placedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td data-label="Bet"><div><div style="font-weight:600">${ui.esc(b.selection)}</div><div class="sel-sub">${ui.esc(b.sport || '')} · ${ui.esc(b.market || '')}</div></div></td>
        <td data-label="Tool">${ui.tag(kindLabel(b.kind))}</td>
        <td data-label="Book">${ui.book(b.book)}</td>
        <td data-label="Odds" class="num-cell">${ui.price(b.price)}</td>
        <td data-label="Stake" class="num-cell">${odds.money(b.stake)}</td>
        <td data-label="CLV" class="num-cell">${b.clv ? ui.edge(b.clv) : '<span class="muted">—</span>'}</td>
        <td data-label="Status">${ui.tag(b.status, b.status === 'won' ? 'pos' : b.status === 'lost' ? 'neg' : b.status === 'open' ? 'warn' : '')}</td>
        <td data-label="P&L" class="num-cell" style="font-weight:600;color:${b.pnl > 0 ? 'var(--pos)' : b.pnl < 0 ? 'var(--neg)' : 'inherit'}">${b.status === 'open' ? '—' : odds.money(b.pnl)}</td>
        <td data-label=""><div class="acts">${b.status === 'open' ? `<button class="btn sm" data-s="won" data-id="${b.id}">Won</button><button class="btn sm" data-s="lost" data-id="${b.id}">Lost</button><button class="btn sm" data-s="push" data-id="${b.id}">Push</button>` : ''}<button class="btn sm ghost" data-del="${b.id}" aria-label="Delete bet">✕</button></div></td></tr>`).join('')}
      </tbody></table>${list.length > F.limit ? `<div class="more"><button class="btn" id="tk-more">Show ${Math.min(20, list.length - F.limit)} more</button></div>` : ''}`
      : `<div class="pad">${ui.empty('No bets match these filters.')}</div>`;
    $('#tk-bets').querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { T.settle(b.dataset.id, b.dataset.s); ui.toast(`Settled as ${b.dataset.s}`); }));
    $('#tk-bets').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { T.remove(b.dataset.del); ui.toast('Bet deleted'); }));
    $('#tk-more')?.addEventListener('click', () => { F.limit += 20; drawBets(); });
  }

  function oppCounts() {
    const f = { live: undefined };
    const opps = [...api.arbs(f), ...api.ev({ minEdge: 0.02 }), ...api.middles(f), ...api.lowHolds(f)];
    const by = {};
    for (const o of opps) for (const l of o.legs) by[l.book] = (by[l.book] || 0) + 1;
    return by;
  }

  function drawHealth() {
    const H = T.health();
    const counts = oppCounts();
    const books = api.sportsbooks.map((b) => b.id);
    const sum = (st) => books.filter((b) => (H[b]?.status || 'healthy') === st).reduce((a, b) => a + (counts[b] || 0), 0);
    const healthyN = sum('healthy'), limN = sum('limited') + sum('restricted');
    $('#tk-health').innerHTML = `<header><h3>Account health</h3><span class="muted" style="font-size:12px">Status, limits and balances per sportsbook</span></header>
      <div class="hstat"><div><span>Opportunities on healthy books</span><strong style="color:var(--pos)">${healthyN}</strong></div>
        <div><span>On limited / restricted books</span><strong style="color:var(--warn)">${limN}</strong></div>
        <div><span>Total balance</span><strong>${odds.money(books.reduce((a, b) => a + (H[b]?.balance || 0), 0), 0)}</strong></div></div>
      <table class="t stack-sm"><thead><tr><th>Sportsbook</th><th>Status</th><th class="num-cell">Max stake</th><th class="num-cell">Balance</th><th class="num-cell">Open opps</th><th>Since</th><th></th></tr></thead><tbody>
      ${books.map((b) => { const h = H[b] || { status: 'healthy' }; return `<tr>
        <td data-label="Sportsbook">${ui.book(b, { full: true })}</td>
        <td data-label="Status">${ui.tag(h.status, h.status === 'healthy' ? 'pos' : h.status === 'limited' ? 'warn' : 'neg')}</td>
        <td data-label="Max stake" class="num-cell">${h.maxStake ? odds.money(h.maxStake, 0) : '<span class="muted">No limit</span>'}</td>
        <td data-label="Balance" class="num-cell">${odds.money(h.balance || 0, 0)}</td>
        <td data-label="Open opps" class="num-cell">${counts[b] || 0}</td>
        <td data-label="Since" class="muted">${h.since ? ui.ago(h.since) : '—'}</td>
        <td data-label=""><div class="acts">${h.status === 'healthy' ? `<button class="btn sm" data-lim="${b}">Mark limited</button>` : `<button class="btn sm" data-ok="${b}">Mark healthy</button>`}${h.status !== 'restricted' ? `<button class="btn sm ghost" data-rest="${b}">Restricted</button>` : ''}</div></td></tr>`; }).join('')}
      </tbody></table>`;
    $('#tk-health').querySelectorAll('[data-lim]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.lim;
      const body = ui.drawer(`Mark ${api.bookById[id].name} limited`, `<p class="muted" style="margin-top:0">Enter the max stake the book now accepts. BetFriend sizes every arb, +EV and promo leg at this book to fit.</p>
        ${ui.numberInput('max', 50, 'Max stake per bet', { prefix: '$', step: 5 })}<div class="row" style="margin-top:14px"><button class="btn primary" id="tk-lim-ok">Save limit</button></div>`);
      body.querySelector('#tk-lim-ok').addEventListener('click', () => {
        T.setHealth(id, { status: 'limited', maxStake: Math.max(1, parseFloat(body.querySelector('[data-num="max"]').value) || 50), since: Date.now() });
        ui.closeDrawer(); ui.toast('Account marked limited');
      });
    }));
    $('#tk-health').querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', () => { T.setHealth(b.dataset.ok, { status: 'healthy', maxStake: null, since: null }); ui.toast('Account marked healthy'); }));
    $('#tk-health').querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', () => { T.setHealth(b.dataset.rest, { status: 'restricted', maxStake: 5, since: Date.now() }); ui.toast('Account marked restricted'); }));
  }

  function addBet() {
    const body = ui.drawer('Add a bet', `<form class="tk-form" id="tk-f">
      <label class="field full"><span>Selection</span><input class="input" name="selection" required placeholder="e.g. Chiefs -3"></label>
      ${ui.select('book', api.sportsbooks.map((b) => [b.id, b.name]), store.get().books[0] || 'dk', 'Sportsbook')}
      ${ui.select('kind', KINDS, 'ev', 'Tool')}
      ${ui.select('sport', api.sports, 'NFL', 'Sport')}
      ${ui.select('market', ['Moneyline', 'Spread', 'Total', 'Player Prop', 'Parlay'], 'Moneyline', 'Market')}
      ${ui.numberInput('price', -110, 'Odds (American)', { step: 5, min: -10000 })}
      ${ui.numberInput('stake', store.get().unit || 50, 'Stake', { prefix: '$', step: 5 })}
      ${ui.numberInput('clv', 0, 'CLV % (optional)', { step: 0.5, min: -100 })}
      <div class="full row"><button class="btn primary" type="submit">Add to tracker</button><button class="btn" type="button" data-close-form>Cancel</button></div></form>`);
    body.querySelector('[data-close-form]').addEventListener('click', ui.closeDrawer);
    body.querySelector('#tk-f').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (s) => body.querySelector(s).value;
      const price = parseFloat(q('[data-num="price"]'));
      const stake = parseFloat(q('[data-num="stake"]'));
      if (!(Math.abs(price) >= 100) || !(stake > 0)) { ui.toast('Enter valid odds (±100 or more) and a stake'); return; }
      T.add({ selection: q('[name="selection"]'), book: q('[data-sel="book"]'), kind: q('[data-sel="kind"]'), sport: q('[data-sel="sport"]'), market: q('[data-sel="market"]'),
        price, stake, clv: (parseFloat(q('[data-num="clv"]')) || 0) / 100 });
      ui.toast('Bet added'); ui.closeDrawer();
    });
  }

  function exportCsv() {
    const cols = ['id', 'placedAt', 'kind', 'book', 'sport', 'market', 'selection', 'price', 'stake', 'status', 'pnl', 'clv'];
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered().map((b) => cols.map((c) => cell(c === 'placedAt' ? new Date(b.placedAt).toISOString() : c === 'book' ? api.bookById[b.book]?.name || b.book : c === 'pnl' ? b.pnl.toFixed(2) : c === 'clv' ? (b.clv || 0).toFixed(4) : b[c])).join(','));
    // Copy to the clipboard (file downloads are blocked when the app is shared as a page).
    const csv = [cols.join(','), ...rows].join('\n');
    const fallback = () => {
      const body = ui.drawer('Your bets as CSV', `<p class="muted" style="margin-top:0">Select all and copy, then paste into a spreadsheet.</p><textarea class="input" style="width:100%;height:60vh;font-family:var(--mono);font-size:12px" readonly>${ui.esc(csv)}</textarea>`, { wide: true });
      const ta = body.querySelector('textarea'); ta.focus(); ta.select();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(csv).then(() => ui.toast(`Copied ${rows.length} bets as CSV`), fallback);
    } else fallback();
  }

  $('#tk-add').addEventListener('click', addBet);
  $('#tk-csv').addEventListener('click', exportCsv);
  const all = () => { drawStats(); drawChart(); drawKinds(); drawFilters(); drawBets(); drawHealth(); };
  all();
  const off = T.subscribe(() => all());
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(drawChart, 150); };
  window.addEventListener('resize', onResize);
  return () => { off(); window.removeEventListener('resize', onResize); clearTimeout(rt); };
}
