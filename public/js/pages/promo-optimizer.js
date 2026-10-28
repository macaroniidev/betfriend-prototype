// Promo Optimizer: the best sports promo optimiser. Every promo in the user's state ranked by expected cash value,
// with filters, a claim plan and one-click conversion.

const CSS = `
.po .po-title { font-weight: 600; }
.po .po-terms { font-size: 12px; color: var(--muted); margin-top: 3px; max-width: 520px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.po td.pcell { min-width: 240px; }
.po .po-meta { gap: 5px; margin-top: 5px; }
@media (max-width: 860px) { .po .po-meta { justify-content: flex-end; } }
.po .rk { font: 600 13px var(--serif); color: var(--muted); margin-right: 4px; }
.po td.nw { white-space: nowrap; }
@media (max-width: 860px) { .po td.pcell { min-width: 0; } }
.po tr.claimed td { opacity: .5; }
.po tr.claimed .po-title { text-decoration: line-through; }
.po .val { font: 600 16px var(--serif); color: var(--pos); font-variant-numeric: tabular-nums; }
.po .hero { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 18px 20px; margin-bottom: 16px; }
.po .hero .big { font: 600 34px var(--serif); color: var(--lime); line-height: 1.1; }
.po .hero p { margin: 4px 0 0; opacity: .8; }
.po .plan-step { display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--line-2); align-items: start; }
.po .plan-step:last-child { border-bottom: 0; }
.po .plan-step .n { position: relative; width: 20px; height: 20px; font-size: 0; }
.po .plan-step .n::before { content: ""; position: absolute; left: 3px; top: 4px; width: 11px; height: 6px; border-left: 3px solid var(--g); border-bottom: 3px solid var(--g); transform: rotate(-45deg); }
.po .plan-step .t1 { font-size: 13px; font-weight: 600; }
.po .plan-step .t2 { font-size: 12px; color: var(--muted); margin-top: 2px; }
.po .plan-step .cum { text-align: right; font-size: 12px; color: var(--muted); }
.po .plan-step .cum strong { display: block; color: var(--pos); font-size: 14px; }
.po .bybook { display: grid; grid-template-columns: 70px 1fr 64px; gap: 8px; align-items: center; font-size: 13px; }
.po .bybook .bar i { background: var(--bk, var(--accent)); }
@media (max-width: 860px) { .po .hero .big { font-size: 28px; } .po .po-terms { display: none; } }`;

const PRIORITY = { 'bonus-bet': 1, referral: 5, 'deposit-match': 3, 'no-sweat': 2, 'second-chance': 2, 'profit-boost': 4, 'odds-boost': 4, 'casino-credit': 6 };

export default function render(root, { api, store, ui, odds, navigate }) {
  if (!document.getElementById('css-po')) document.head.insertAdjacentHTML('beforeend', `<style id="css-po">${CSS}</style>`);
  const P = api.promos;
  const F = { aud: 'all', type: 'All', book: 'All', hide: false };

  root.innerHTML = `<div class="po">
    ${ui.header({ title: 'Promo Optimizer', tool: 'promo-optimizer',
      subtitle: 'The best sports promo optimiser: every offer in your state ranked by the cash it converts to, with a claim plan that orders them for you.',
      actions: '<a class="btn" href="#/promo-converter">$ Promo Converter</a>' })}
    <div id="po-hero"></div>
    <div class="split">
      <div class="stack">
        <div class="toolbar" id="po-tools"></div>
        <section class="card" id="po-table"></section>
      </div>
      <div class="stack">
        <section class="card"><header><h3>Claim plan</h3><span class="muted" style="font-size:12px">Best order to work through</span></header><div id="po-plan"></div></section>
        <section class="card pad"><h3 style="margin-bottom:12px">Value by sportsbook</h3><div id="po-bybook" class="stack"></div></section>
      </div>
    </div></div>`;
  const $ = (s) => root.querySelector(s);

  const all = () => P.promos({ state: store.get().state });
  const filtered = () => all().filter((p) => (F.aud === 'all' || (F.aud === 'new' ? p.newUserOnly : !p.newUserOnly))
    && (F.type === 'All' || p.type === F.type) && (F.book === 'All' || p.book === F.book) && (!F.hide || !p.claimed));

  function cashNeeded(p) {
    if (p.newUserOnly && p.type === 'bonus-bet') return Number((p.title.match(/Bet \$(\d+)/) || [0, 10])[1]) || 10;
    if (p.type === 'no-sweat' || p.type === 'second-chance') return p.amount * 1.45;
    if (p.type === 'deposit-match') return p.title.includes('20%') ? p.amount * 5 : p.amount;
    if (p.type === 'profit-boost' || p.type === 'odds-boost') return p.amount * 2.2;
    if (p.type === 'bonus-bet' || p.type === 'referral') return p.amount * 1.4; // hedge cash
    return 5;
  }

  function drawHero() {
    const list = all();
    const st = store.get().state;
    const stName = api.states.find((s) => s.code === st)?.name || st;
    const avail = P.totalValue(list);
    const nu = list.filter((p) => p.newUserOnly && !p.claimed).reduce((a, p) => a + p.estValue, 0);
    const claimed = list.filter((p) => p.claimed).reduce((a, p) => a + p.estValue, 0);
    $('#po-hero').innerHTML = `<div class="callout dark hero"><div><div class="big">${odds.money(avail, 0)} in promos available in ${ui.esc(st)}</div>
      <p>${list.filter((p) => !p.claimed).length} open offers across ${new Set(list.map((p) => p.book)).size} sportsbooks licensed in ${ui.esc(stName)}.</p></div>
      <button class="btn lime" id="po-start">Start claim plan →</button></div>
      ${ui.stats([
        { label: 'Welcome offers', value: odds.money(nu, 0), note: 'new-user value open' },
        { label: 'Existing-user promos', value: odds.money(avail - nu, 0), note: 'refreshes daily' },
        { label: 'Claimed so far', value: odds.money(claimed, 0), tone: 'pos', note: `${list.filter((p) => p.claimed).length} promos` },
        { label: 'Avg conversion', value: '68%', note: 'bonus bets via Promo Converter' },
      ])}`;
    $('#po-start').addEventListener('click', () => { const s = plan()[0]; if (s) navigate(`promo-converter?promo=${s.id}`); });
  }

  function drawTools() {
    const books = P.booksInState(store.get().state);
    if (F.book !== 'All' && !books.includes(F.book)) F.book = 'All';
    $('#po-tools').innerHTML = `${ui.seg('aud', [['all', 'All'], ['new', 'New user'], ['existing', 'Existing user']], F.aud)}
      ${ui.select('type', [['All', 'All types'], ...P.PROMO_TYPES], F.type, 'Type')}
      ${ui.select('book', [['All', 'All books'], ...books.map((b) => [b, api.bookById[b].name])], F.book, 'Sportsbook')}
      <label class="check" style="padding-bottom:8px"><input type="checkbox" id="po-hide" ${F.hide ? 'checked' : ''}> Hide claimed</label>`;
    ui.onSeg($('#po-tools'), 'aud', (v) => { F.aud = v; drawTools(); drawTable(); });
    ui.onSelect($('#po-tools'), 'type', (v) => { F.type = v; drawTable(); });
    ui.onSelect($('#po-tools'), 'book', (v) => { F.book = v; drawTable(); });
    $('#po-hide').addEventListener('change', (e) => { F.hide = e.target.checked; drawTable(); });
  }

  function drawTable() {
    const list = filtered();
    const sum = list.filter((p) => !p.claimed).reduce((a, p) => a + p.estValue, 0);
    $('#po-table').innerHTML = `<header><h3>${list.length} promos ranked by cash value</h3><span class="muted">${odds.money(sum, 0)} unclaimed in view</span></header>
      ${list.length ? `<div class="table-wrap"><table class="t stack-sm"><thead><tr><th>Claimed</th><th>Promo</th><th class="num-cell">Amount</th><th>Expires</th><th class="num-cell">Cash value</th><th></th></tr></thead><tbody>
      ${list.map((p, i) => `<tr class="${p.claimed ? 'claimed' : ''}">
        <td data-label="Claimed"><input type="checkbox" data-claim="${p.id}" ${p.claimed ? 'checked' : ''} aria-label="Claimed"></td>
        <td data-label="Promo" class="pcell"><div><div class="po-title"><span class="rk">${i + 1}.</span>${ui.esc(p.title)}</div><div class="row po-meta">${ui.book(p.book)} ${ui.tag(P.typeLabel(p.type))}${p.newUserOnly ? ui.tag('New user', 'dark') : ''}</div><div class="po-terms">${ui.esc(p.terms)}</div></div></td>
        <td data-label="Amount" class="num-cell">${odds.money(p.amount, 0)}</td>
        <td data-label="Expires" class="muted nw">${ui.when(p.expires)}</td>
        <td data-label="Cash value" class="num-cell"><span class="val">${odds.money(p.estValue, 0)}</span></td>
        <td data-label=""><button class="btn sm ${p.claimed ? '' : 'lime'}" data-conv="${p.id}">Convert →</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="pad">${ui.empty('No promos match these filters.')}</div>`}`;
    $('#po-table').querySelectorAll('[data-claim]').forEach((c) => c.addEventListener('change', () => { P.claim(c.dataset.claim, c.checked); ui.toast(c.checked ? 'Marked claimed' : 'Marked open'); }));
    $('#po-table').querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => navigate(`promo-converter?promo=${b.dataset.conv}`)));
  }

  function plan() {
    return all().filter((p) => !p.claimed && p.type !== 'casino-credit')
      .sort((a, b) => (PRIORITY[a.type] - PRIORITY[b.type]) || (b.newUserOnly - a.newUserOnly) || (b.estValue / cashNeeded(b) - a.estValue / cashNeeded(a)))
      .slice(0, 8);
  }

  function drawPlan() {
    let cum = 0;
    const steps = plan();
    $('#po-plan').innerHTML = steps.length ? steps.map((p, i) => {
      cum += p.estValue;
      const why = p.type === 'bonus-bet' ? (p.newUserOnly ? 'Instant bonus bets: claim first' : 'Qualify, then convert the bonus bet') : p.type === 'no-sweat' || p.type === 'second-chance' ? 'Bet a long shot, convert the refund' : p.type === 'deposit-match' ? 'Clear rollover on Low Holds' : p.type === 'referral' ? 'Stack with a friend’s welcome offer' : 'Hedge for locked profit';
      return `<div class="plan-step"><span class="n">${i + 1}</span><div><div class="t1">${ui.book(p.book)} ${ui.esc(p.title)}</div>
        <div class="t2">${why} · cash needed ≈ ${odds.money(cashNeeded(p), 0)}</div>
        <div class="row" style="margin-top:6px;gap:6px"><button class="btn sm" data-conv="${p.id}">Convert</button><button class="btn sm ghost" data-done="${p.id}">✓ Done</button></div></div>
        <div class="cum">+${odds.money(p.estValue, 0)}<strong>${odds.money(cum, 0)}</strong></div></div>`;
    }).join('') : `<div class="pad">${ui.empty('Every promo is claimed. New existing-user offers drop daily.')}</div>`;
    $('#po-plan').querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => navigate(`promo-converter?promo=${b.dataset.conv}`)));
    $('#po-plan').querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => { P.claim(b.dataset.done, true); ui.toast('Step complete'); }));
  }

  function drawByBook() {
    const by = {};
    for (const p of all()) if (!p.claimed) by[p.book] = (by[p.book] || 0) + p.estValue;
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const max = rows[0]?.[1] || 1;
    $('#po-bybook').innerHTML = rows.map(([b, v]) => `<div class="bybook">${ui.book(b)}<div class="bar" style="--bk:${api.bookById[b].color}"><i style="width:${(v / max) * 100}%"></i></div><span class="num-cell">${odds.money(v, 0)}</span></div>`).join('');
  }

  const drawAll = () => { drawHero(); drawTools(); drawTable(); drawPlan(); drawByBook(); };
  drawAll();
  const off1 = P.subscribe(() => { drawHero(); drawTable(); drawPlan(); drawByBook(); });
  let lastState = store.get().state;
  const off2 = store.subscribe((s) => { if (s.state !== lastState) { lastState = s.state; drawAll(); } });
  return () => { off1(); off2(); };
}
