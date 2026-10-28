// Pro Bettor Signals: leaderboard of verified profitable bettors, follow them, and act on their bets
// at the best price available right now.

const CSS = `
.bf-pros .t .rt { text-align:right; font-variant-numeric:tabular-nums; }
.bf-pros .av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:12px; color:#fff; background:hsl(var(--h) 45% 38%); flex:none; }
.bf-pros .av.lg { width:56px; height:56px; font-size:18px; }
.bf-pros .who { display:flex; align-items:center; gap:10px; min-width:0; }
.bf-pros .who b { display:block; font-size:14px; }
.bf-pros .who small { color:var(--muted); font-size:11.5px; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.bf-pros .rank { font:600 15px var(--serif); color:var(--muted); width:22px; text-align:center; }
.bf-pros .ck { color:var(--accent); font-size:12px; }
.bf-pros .btn.following { background:var(--pos-bg); color:var(--pos); border-color:transparent; }
.bf-pros .pos-n { color:var(--pos); font-weight:700; }
.bf-pros .neg-n { color:var(--neg); font-weight:700; }
.bf-pros .sig { display:grid; grid-template-columns:minmax(180px,1.1fr) minmax(200px,1.5fr) minmax(220px,1.4fr) auto; gap:14px; align-items:center; padding:14px 16px; border-bottom:1px solid var(--line-2); }
.bf-pros .sig.flash { animation:flash 1.4s ease; }
.bf-pros .sig:last-child { border-bottom:0; }
.bf-pros .sig .sel { font-weight:700; }
.bf-pros .sig .meta { font-size:12px; color:var(--muted); display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:3px; }
.bf-pros .px { display:grid; grid-template-columns:auto 1fr; gap:4px 10px; font-size:12.5px; align-items:center; }
.bf-pros .px span { color:var(--muted); }
.bf-pros .px div { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.bf-pros .rec { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.bf-pros .rec strong { font:600 17px var(--serif); font-variant-numeric:tabular-nums; }
.bf-pros .rec .btns { display:flex; gap:6px; }
.bf-pros .feed-h { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.bf-pros .t td { vertical-align:middle; }
.bf-pros .stat strong { overflow-wrap:anywhere; }
.bf-pros .wait { font:600 15px var(--serif); }
@media (max-width:1100px) { .bf-pros .sig { grid-template-columns:1fr 1fr; } .bf-pros .rec { align-items:flex-start; } }
@media (max-width:860px) {
  .bf-pros .sig { grid-template-columns:1fr; gap:10px; }
  .bf-pros .rec { flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; }
  .bf-pros table.stack-sm td.first { display:flex; justify-content:space-between; border-bottom:1px solid var(--line-2); padding-bottom:10px; }
  .bf-pros table.stack-sm td.first::before { display:none; }
  .bf-pros table.stack-sm td.act::before { display:none; }
  .bf-pros table.stack-sm td.act { justify-content:flex-end; }
}
.pro-dr .chart { width:100%; height:auto; display:block; }
.pro-dr .chart text { font-size:10px; fill:var(--muted); font-family:var(--sans); }
.pro-dr h3 { font-size:15px; margin:4px 0 8px; }
.pro-dr .top { display:flex; gap:14px; align-items:center; }
.pro-dr .top .av { width:56px; height:56px; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:18px; color:#fff; background:hsl(var(--h) 45% 38%); flex:none; }
.pro-dr .sb { display:grid; grid-template-columns:70px 1fr auto; gap:8px; align-items:center; font-size:13px; margin-bottom:6px; }
.pro-dr .hist { width:100%; border-collapse:collapse; font-size:12.5px; }
.pro-dr .hist td { padding:7px 4px; border-bottom:1px solid var(--line-2); vertical-align:top; }
.pro-dr .hist td:last-child { text-align:right; white-space:nowrap; }`;

export default function render(root, ctx) {
  const { api, store, ui, odds } = ctx;
  if (!document.getElementById('css-bettor-signals')) document.head.insertAdjacentHTML('beforeend', `<style id="css-bettor-signals">${CSS}</style>`);

  const B = api.bettors;
  const st = { sort: 'units', sport: 'All', feed: 'following', showAll: false };
  const seen = new Set();
  let firstPaint = true;
  const avatar = (b, cls = '') => `<span class="av ${cls}" style="--h:${b.hue}">${ui.esc(b.avatarInitials)}</span>`;
  const followBtn = (b) => B.isFollowing(b.id)
    ? `<button class="btn sm following" data-follow="${b.id}">✓ Following</button>`
    : `<button class="btn sm" data-follow="${b.id}">+ Follow</button>`;
  const signed = (x, d = 1) => `<span class="${x >= 0 ? 'pos-n' : 'neg-n'}">${x >= 0 ? '+' : ''}${odds.pct(x, d)}</span>`;

  root.innerHTML = `<div class="bf-pros">
    ${ui.header({
      title: 'Pro Bettor Signals',
      subtitle: 'Follow verified, long-term profitable sports bettors. When they bet, you see it instantly with the best price still available and exactly how much to stake.',
      tool: 'bettor-signals',
    })}
    <div data-stats></div>
    <section class="card" style="margin-bottom:16px">
      <header><div class="feed-h"><h2>Live signals</h2>${ui.seg('feed', [['following', 'Following'], ['all', 'All pros']], st.feed)}</div><span class="muted" data-fcount></span></header>
      <div data-feed></div>
    </section>
    <section class="card">
      <header><h2>Leaderboard</h2><div class="row">
        ${ui.select('sport', [['All', 'All sports'], ...api.sports.map((s) => [s, s])], st.sport)}
        ${ui.seg('sort', [['units', 'Profit'], ['roi', 'ROI'], ['clv', 'CLV'], ['winRate', 'Win rate']], st.sort)}
      </div></header>
      <div data-board></div>
    </section>
  </div>`;

  const statsEl = root.querySelector('[data-stats]');
  const boardEl = root.querySelector('[data-board]');
  const feedEl = root.querySelector('[data-feed]');

  function recStake(sig, b) {
    const s = store.get();
    const roiF = Math.min(1.6, Math.max(0.6, 1 + b.record.roi * 3));
    return Math.max(5, Math.round((s.unit * sig.stakeUnits * (0.5 + sig.confidence * 0.7) * roiF) / 5) * 5);
  }

  function paintStats() {
    const fol = B.following().map(B.bettorById).filter(Boolean);
    const today = B.signals({ since: Date.now() - 24 * 3600e3, books: store.get().books });
    const folSigs = today.filter((s) => B.isFollowing(s.bettorId));
    const avgRoi = fol.reduce((a, b) => a + b.record.roi, 0) / Math.max(1, fol.length);
    const top = B.bettors()[0];
    statsEl.innerHTML = ui.stats([
      { label: 'Following', value: String(fol.length), note: `of ${B.bettors().length} verified pros` },
      { label: 'Signals today', value: String(folSigs.length), note: `${today.length} from all pros` },
      { label: 'Avg ROI of who you follow', value: `+${odds.pct(avgRoi)}`, tone: 'pos', note: 'lifetime, verified' },
      { label: 'Top bettor', value: ui.esc(top.handle), note: `+${top.record.units}u · ${odds.pct(top.record.roi)} ROI` },
    ]);
  }

  function paintBoard() {
    let list = B.bettors().filter((b) => st.sport === 'All' || b.specialty.includes(st.sport));
    const key = { units: (b) => b.record.units, roi: (b) => b.record.roi, clv: (b) => b.record.clv, winRate: (b) => b.record.winRate }[st.sort];
    list = [...list].sort((a, b) => key(b) - key(a));
    const shown = st.showAll ? list : list.slice(0, 10);
    boardEl.innerHTML = list.length ? `<div class="table-wrap"><table class="t stack-sm"><thead><tr>
      <th>#</th><th>Bettor</th><th class="rt">Bets</th><th class="rt">Record</th><th class="rt">Win %</th><th class="rt">ROI</th><th class="rt">Profit</th><th class="rt">CLV</th><th>12-mo ROI</th><th></th></tr></thead><tbody>
      ${shown.map((b, k) => `<tr class="click" data-pro="${b.id}">
        <td class="rank" data-label="Rank">${k + 1}</td>
        <td class="first"><div class="who">${avatar(b)}<div><b>${ui.esc(b.handle)} <span class="ck" title="Verified">✔</span></b><small>${ui.tag(b.tier, 'dark')} ${b.specialty.map(ui.sport).join(' ')} <span>${b.streak}</span></small></div></div></td>
        <td class="rt" data-label="Bets">${b.record.bets.toLocaleString()}</td>
        <td class="rt" data-label="Record">${b.record.wins}-${b.record.losses}${b.record.pushes ? `-${b.record.pushes}` : ''}</td>
        <td class="rt" data-label="Win %">${odds.pct(b.record.winRate)}</td>
        <td class="rt" data-label="ROI">${signed(b.record.roi)}</td>
        <td class="rt" data-label="Profit"><span class="pos-n">+${b.record.units}u</span></td>
        <td class="rt" data-label="CLV">${signed(b.record.clv)}</td>
        <td data-label="12-mo ROI">${ui.spark(b.monthly.map((m) => m.roi), { w: 100, h: 26 })}</td>
        <td class="act">${followBtn(b)}</td></tr>`).join('')}
      </tbody></table></div>
      ${list.length > 10 ? `<div class="pad" style="text-align:center"><button class="btn sm" data-more>${st.showAll ? 'Show top 10' : `Show all ${list.length}`}</button></div>` : ''}`
      : `<div class="pad">${ui.empty('No tracked pros specialize in this sport yet.')}</div>`;
    boardEl.querySelectorAll('[data-pro]').forEach((tr) => tr.addEventListener('click', () => openPro(tr.dataset.pro)));
    boardEl.querySelector('[data-more]')?.addEventListener('click', () => { st.showAll = !st.showAll; paintBoard(); });
    wireFollow(boardEl);
  }

  function paintFeed() {
    const all = B.signals({ books: store.get().books, sport: st.sport });
    const added = new Set();
    for (const s of all) if (!seen.has(s.id)) { seen.add(s.id); if (!firstPaint) added.add(s.id); }
    firstPaint = false;
    const rows = (st.feed === 'following' ? all.filter((s) => B.isFollowing(s.bettorId)) : all).slice(0, 25);
    root.querySelector('[data-fcount]').textContent = `${rows.length} latest${st.feed === 'following' ? ` from ${B.following().length} followed` : ''}`;
    if (!rows.length) {
      feedEl.innerHTML = `<div class="pad">${ui.empty(st.feed === 'following' ? 'Follow a few pros from the leaderboard below and their bets show up here instantly.' : 'No signals for this sport yet today.')}</div>`;
      return;
    }
    feedEl.innerHTML = rows.map((s) => {
      const b = B.bettorById(s.bettorId);
      const stake = recStake(s, b);
      const ev = api.eventById(s.eventId);
      return `<div class="sig${added.has(s.id) ? ' flash' : ''}">
        <div class="who" data-pro="${b.id}" style="cursor:pointer">${avatar(b)}<div><b>${ui.esc(b.handle)}</b><small>${ui.tag(b.tier, 'dark')} +${odds.pct(b.record.roi)} ROI</small></div></div>
        <div><div class="sel">${ui.esc(s.selection)} ${added.has(s.id) ? ui.tag('NEW', 'pos') : ''}</div>
          <div class="meta">${ui.sport(s.sport)} ${ui.esc(ev.away)} @ ${ui.esc(ev.home)} ${ev.live ? ui.liveDot() : `· ${ui.when(ev.start)}`} · ${ui.ago(s.placedAt)}</div></div>
        <div class="px">
          <span>They bet</span><div>${ui.price(s.priceTaken)} at ${ui.book(s.bookTaken)} · ${s.stakeUnits}u</div>
          <span>Best now</span><div>${ui.price(s.bestPriceNow, { best: true })} at ${ui.book(s.bestBookNow)} ${s.stillGood ? ui.tag('Still available', 'pos') : ui.tag('Line moved', 'warn')}</div>
          <span>Edge</span><div>${ui.edge(s.edge)} ${ui.meter(s.confidence, `Confidence ${odds.pct(s.confidence, 0)}`)}</div>
        </div>
        ${s.edge > 0 ? `<div class="rec"><div style="text-align:right"><strong>${odds.money(stake, 0)}</strong><div class="muted" style="font-size:11.5px">recommended · ${(stake / store.get().unit).toFixed(1)}u</div></div>
          <div class="btns"><button class="btn sm" data-log="${s.id}" data-stake="${stake}">Log</button>${ui.betBtn(s.bestBookNow)}</div></div>`
        : `<div class="rec"><div style="text-align:right"><span class="wait">Target ${odds.fmtAmerican(s.priceTaken)}</span><div class="muted" style="font-size:11.5px">we alert you when it's back</div></div>
          <div class="btns"><button class="btn sm" data-alert="${s.id}">Set price alert</button></div></div>`}
      </div>`;
    }).join('');
    ui.wireBetButtons(feedEl);
    feedEl.querySelectorAll('[data-pro]').forEach((el) => el.addEventListener('click', () => openPro(el.dataset.pro)));
    feedEl.querySelectorAll('[data-alert]').forEach((btn) => btn.addEventListener('click', () => {
      const s = rows.find((x) => x.id === btn.dataset.alert);
      ui.toast(`Alert set: ${s.selection} at ${odds.fmtAmerican(s.priceTaken)} or better`);
    }));
    feedEl.querySelectorAll('[data-log]').forEach((btn) => btn.addEventListener('click', () => {
      const s = rows.find((x) => x.id === btn.dataset.log);
      ui.logBet({ kind: 'signal', book: s.bestBookNow, sport: s.sport, market: s.market, selection: s.selection, price: s.bestPriceNow, stake: Number(btn.dataset.stake) });
    }));
  }

  function wireFollow(el) {
    el.querySelectorAll('[data-follow]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.follow;
      const b = B.bettorById(id);
      if (B.isFollowing(id)) { B.unfollow(id); ui.toast(`Unfollowed ${b.handle}`); } else { B.follow(id); ui.toast(`Following ${b.handle}. Their bets now appear in your feed.`); }
    }));
  }

  function openPro(id) {
    const b = B.bettorById(id);
    const hist = B.history(id);
    const recent = hist.slice(0, 12);
    const last25 = hist.reduce((a, h) => a + h.pnlUnits, 0);
    const body = ui.drawer(b.handle, `<div class="pro-dr stack">
      <div class="top"><span class="av" style="--h:${b.hue}">${ui.esc(b.avatarInitials)}</span><div style="flex:1;min-width:0"><h2>${ui.esc(b.handle)} <span style="color:var(--accent);font-size:14px">✔</span></h2>
        <div class="row" style="margin-top:4px">${ui.tag(b.tier, 'dark')} ${b.specialty.map(ui.sport).join(' ')} <span class="muted" style="font-size:12px">Tracked since ${b.since} · ${b.followers.toLocaleString()} followers</span></div></div>
        <div data-fbtn>${followBtn(b)}</div></div>
      <p style="margin:0">${ui.esc(b.bio)}</p>
      ${ui.stats([
        { label: 'ROI', value: `+${odds.pct(b.record.roi)}`, tone: 'pos' },
        { label: 'Profit', value: `+${b.record.units}u`, tone: 'pos' },
        { label: 'Win rate', value: odds.pct(b.record.winRate), note: `${b.record.wins}-${b.record.losses}` },
        { label: 'Avg CLV', value: `+${odds.pct(b.record.clv)}` },
      ])}
      <dl class="kv"><dt>Bets tracked</dt><dd>${b.record.bets.toLocaleString()}</dd><dt>Avg odds</dt><dd>${odds.fmtAmerican(b.avgOdds)}</dd><dt>Avg stake</dt><dd>${odds.money(b.avgStake, 0)}</dd><dt>Current streak</dt><dd>${b.streak}</dd><dt>Favorite markets</dt><dd>${b.markets.join(', ')}</dd></dl>
      <div><h3>Monthly ROI</h3>${roiChart(b.monthly)}</div>
      <div><h3>By sport</h3>${b.sportBreakdown.map((s) => `<div class="sb"><span>${ui.sport(s.sport)}</span><div class="bar"><i style="width:${Math.min(100, (s.bets / b.record.bets) * 100)}%"></i></div><span class="muted">${s.bets} bets · ${signed(s.roi)}</span></div>`).join('')}</div>
      <div><h3>Recent bets <span class="muted" style="font-family:var(--sans);font-size:12.5px;font-weight:400">Last 25: ${last25 >= 0 ? '+' : ''}${last25.toFixed(1)}u</span></h3><table class="hist"><tbody>
        ${recent.map((h) => `<tr><td><div style="font-weight:600">${ui.esc(h.selection)}</div><div class="muted" style="font-size:11.5px">${ui.esc(h.sport)} · ${ui.esc(h.market)} · ${ui.ago(h.date)} · CLV ${h.clv >= 0 ? '+' : ''}${odds.pct(h.clv)}</div></td>
          <td>${ui.price(h.price)} ${ui.book(h.book)}<div class="muted" style="font-size:11.5px">${h.units}u</div></td>
          <td>${ui.tag(h.result === 'won' ? `+${h.pnlUnits}u` : h.result === 'lost' ? `${h.pnlUnits}u` : 'Push', h.result === 'won' ? 'pos' : h.result === 'lost' ? 'neg' : '')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`);
    const wire = () => body.querySelector('[data-fbtn]').querySelectorAll('[data-follow]').forEach((btn) => btn.addEventListener('click', () => {
      if (B.isFollowing(id)) B.unfollow(id); else { B.follow(id); ui.toast(`Following ${b.handle}`); }
      body.querySelector('[data-fbtn]').innerHTML = followBtn(b);
      wire();
    }));
    wire();
  }

  function roiChart(months) {
    const W = 480, H = 150, top = 12, bottom = 20;
    const vals = months.map((m) => m.roi);
    const max = Math.max(0.05, ...vals), min = Math.min(0, ...vals);
    const y = (v) => top + ((max - v) / (max - min)) * (H - top - bottom);
    const bw = (W - 8) / months.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly ROI">
      <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)"/>
      ${months.map((m, k) => {
        const yv = y(m.roi), y0 = y(0);
        return `<rect x="${4 + k * bw + 3}" y="${Math.min(yv, y0)}" width="${bw - 6}" height="${Math.max(1, Math.abs(y0 - yv))}" rx="2" fill="${m.roi >= 0 ? 'var(--pos)' : 'var(--neg)'}"><title>${m.month}: ${(m.roi * 100).toFixed(1)}%</title></rect>
          <text x="${4 + k * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${m.month}</text>`;
      }).join('')}
      <text x="4" y="${top + 2}">${(max * 100).toFixed(0)}%</text></svg>`;
  }

  ui.onSeg(root, 'feed', (v) => { st.feed = v; root.querySelectorAll('[data-seg="feed"] button').forEach((x) => x.classList.toggle('on', x.dataset.v === v)); paintFeed(); });
  ui.onSeg(root, 'sort', (v) => { st.sort = v; root.querySelectorAll('[data-seg="sort"] button').forEach((x) => x.classList.toggle('on', x.dataset.v === v)); paintBoard(); });
  ui.onSelect(root, 'sport', (v) => { st.sport = v; paintBoard(); paintFeed(); });

  paintStats(); paintFeed(); paintBoard();
  const unF = B.onFollowChange(() => { paintStats(); paintFeed(); paintBoard(); });
  const unT = api.onTick(() => { paintFeed(); paintStats(); });
  const unS = store.subscribe(() => paintFeed());
  return () => { unF(); unT(); unS(); };
}
