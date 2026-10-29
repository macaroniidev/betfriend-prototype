// Parlay Builder: +EV and Sharp Money legs, priced at every book, pointing to the book paying most.
//
// Layout (UX rebuild, items B1/B2/B12/B15 + C13):
//   - results-first head: static H1, live status, 3 facts (the last one jumps to your slip)
//   - "Pick your legs": one leg source switch (?tab=, remembered), one Add action per leg row
//   - "Your parlay": a sticky slip on --panel with the best payout on a green tile and its Bet CTA
//   - a sticky action bar repeats the slip's CTA while the slip itself is off screen (phones)
import { rng } from '../data/core.js';

const SLIP_KEY = 'bf-parlay-slip-v1';
const TABS = [['ev', '+EV legs'], ['sharp', 'Sharp Money legs'], ['check', 'Check my parlay']];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
let slip = [];
let seeded = false;
try { seeded = localStorage.getItem(SLIP_KEY) !== null; } catch { /* ignore */ }
try { slip = JSON.parse(localStorage.getItem(SLIP_KEY) || '[]'); if (!Array.isArray(slip)) slip = []; } catch { slip = []; }
const saveSlip = () => { try { localStorage.setItem(SLIP_KEY, JSON.stringify(slip)); } catch { /* ignore */ } };

const CSS = `
.pb .pb-grid { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:24px; align-items:start; }
.pb .pb-src { display:flex; gap:8px 14px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:8px; }
.pb .pb-count { font-size:var(--t-sm); color:var(--muted); font-weight:700; }
.pb .pb-search { margin-bottom:8px; }
.pb .pb-search input { width:100%; }
.pb .pb-list { display:flex; flex-direction:column; }
.pb .pb-leg { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:6px 14px; align-items:center; padding:9px 4px; border-bottom:1px solid var(--line-2); }
.pb .pb-leg.in { background:var(--hl); }
.pb .pb-sel { font-weight:700; }
.pb .pb-meta { font-size:12.5px; color:var(--muted); margin-top:2px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.pb .pb-px { text-align:right; white-space:nowrap; }
.pb .pb-px small { display:block; font-size:12px; color:var(--muted); margin-top:2px; }
.pb .pb-add { min-width:84px; justify-content:center; }
.pb .pb-line { padding:10px 4px; border-bottom:1px solid var(--line-2); }
.pb .pb-line .ocs { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
.pb .pb-oc { display:inline-flex; gap:8px; align-items:center; min-height:36px; border:2px solid var(--line-strong); background:var(--paper); border-radius:8px; padding:4px 10px; cursor:pointer; font-size:13.5px; font-weight:700; color:var(--text); }
.pb .pb-oc:hover { border-color:var(--g); }
.pb .pb-oc[aria-pressed="true"] { background:var(--ink); color:#FFFFFF; border-color:var(--ink); }
.pb .pb-oc[aria-pressed="true"] .price { color:var(--lime); }
.pb .pb-oc:disabled { cursor:not-allowed; color:var(--muted); border-style:dashed; }
.pb .sharp-bar { display:inline-flex; gap:4px; align-items:center; font-size:12px; }
/* slip */
.pb .slip { position:sticky; top:calc(var(--topbar-h) + 12px); padding:0; border-top:4px solid var(--g);
  /* Never taller than the window: a long slip scrolls on its own, so its bottom (odds at every book) stays reachable. */
  max-height:calc(100vh - var(--topbar-h) - 24px); overflow-y:auto; overscroll-behavior:contain; }
.pb .slip-h { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 16px 10px; }
.pb .slip-h h2 { font-size:var(--t-fig); }
.pb .num-badge { display:inline-grid; place-items:center; min-width:26px; height:26px; border-radius:6px; background:var(--deep); color:#FFFFFF; font-weight:800; font-size:13px; padding:0 7px; }
.pb .slip-leg { display:flex; gap:10px; align-items:flex-start; padding:9px 16px; border-top:1px solid var(--line); }
.pb .slip-leg .x { margin-left:auto; flex:none; }
.pb .slip-body { padding:14px 16px 16px; display:grid; gap:14px; border-top:1px solid var(--line); }
.pb .pb-hero { background:var(--g); color:var(--on-green-soft); border-radius:var(--r); padding:14px; }
.pb .pb-hero .hero-top { display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:700; }
.pb .pb-hero .edge { background:rgba(255,255,255,.14); color:#FFFFFF; }
.pb .pb-hero .big { font:900 40px/1 var(--f-head); color:var(--lime); margin-top:6px; font-variant-numeric:tabular-nums; }
.pb .pb-hero .kv { margin-top:8px; }
.pb .pb-hero .kv dt { color:var(--on-green-mute); } .pb .pb-hero .kv dd { color:#FFFFFF; }
.pb .pb-hero .ev-line { color:var(--on-green-mute); }
.pb .pb-hero .bet-action { width:100%; justify-content:center; margin-top:12px; }
.pb .pb-hero .btn.ghost { width:100%; justify-content:center; margin-top:6px; color:#FFFFFF; }
.pb .slip-body h3 { font-size:var(--t-h3); margin-bottom:6px; }
.pb .pb-books { background:var(--paper); }
.pb .pb-books td, .pb .pb-books th { padding:6px 9px; font-size:13px; position:static; }
.pb .pb-books .nl { color:var(--muted); font-size:11.5px; }
.pb .actionbar .ab-txt { display:flex; flex-direction:column; font-size:var(--t-sm); color:var(--muted); font-weight:700; }
.pb .actionbar .ab-txt b { color:var(--text); font-size:var(--t-md); font-variant-numeric:tabular-nums; }
.pb .actionbar[hidden] { display:none; }
@media (max-width:1100px) { .pb .pb-grid { grid-template-columns:minmax(0,1fr); } .pb .slip { position:static; max-height:none; overflow:visible; } }
@media (max-width:860px) {
  .pb .pb-leg { grid-template-columns:minmax(0,1fr) auto; }
  .pb .pb-leg .pb-px { grid-column:1; grid-row:2; text-align:left; }
  .pb .pb-leg .pb-px small { display:inline; margin-left:6px; }
  .pb .pb-leg .pb-add { grid-column:2; grid-row:1 / span 2; }
}
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-parlay-builder')) document.head.insertAdjacentHTML('beforeend', `<style id="css-parlay-builder">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const st = { tab: ui.initialMode(params, 'ev', TABS.map(([v]) => v), 'tab'), q: '', stake: store.get().unit || 50 };

  const fairFor = (line) => api.fairProbs(line, store.get().sharpRefs, methods[store.get().devigMethod] || odds.devig);
  const inSlip = (lineId, idx) => slip.some((l) => l.lineId === lineId && l.idx === idx);
  const lineInSlip = (lineId) => slip.some((l) => l.lineId === lineId);

  root.innerHTML = `<div class="pb">
    ${ui.pageHead({
      title: 'Parlay Builder', tool: 'parlay-builder', live: true,
      subtitle: 'We find the +EV and Sharp Money legs and point you to the book paying most for them.',
      facts: [{ label: 'Your parlay', value: '0' }],
    })}
    <div class="pb-grid">
      ${ui.sec('Pick your legs', `<div class="pb-src">${ui.modeSwitch(TABS, st.tab, { name: 'tab', label: 'Leg source' })}<span class="pb-count" data-bf-nodata id="pb-count"></span></div>
        <div class="pb-search" id="pb-search" hidden><input type="search" class="input" id="pb-q" placeholder="Search any team, player or market (e.g. Celtics, Mahomes, Total)" aria-label="Search markets"></div>
        <div id="pb-list" class="pb-list" data-bf-list data-bf-nodata></div>`, { cls: 'pb-legs' })}
      <aside class="aside slip" id="pb-slip" aria-label="Your parlay"></aside>
    </div>
    ${ui.how({
      title: 'How a +EV parlay works',
      summary: 'Every leg beats the sharp fair price, and books pay very differently for the same parlay.',
      checks: [
        `Each leg is priced against the sharp ${ui.term('fair', 'fair')} odds; ${ui.term('ev', '+EV')} legs pay more than their true chance is worth`,
        'Multiplying +EV legs compounds the edge, and the swings: most parlays lose, a few pay big',
        'The same legs pay differently at every book, so we price the whole parlay everywhere and point you to the best',
        'Same-game legs move together; books price those as a same-game parlay',
      ],
      example: ui.related([['positive-ev', 'Positive EV'], ['sharp-money', 'Sharp Money'], ['calculators', 'Parlay calculator']]),
    })}
    <div class="actionbar" data-actionbar hidden></div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  // ---------- leg sources ----------
  function evLegs() {
    const seen = new Set();
    return api.ev({ books: store.get().books, live: false, minEdge: 0.01, refs: store.get().sharpRefs, method: methods[store.get().devigMethod] })
      .filter((o) => { const k = `${o.lineId}|${o.legs[0].outcome}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 30)
      .map((o) => { const line = api.lineById(o.lineId); return { lineId: o.lineId, idx: line.outcomes.indexOf(o.legs[0].outcome), edge: o.edge, book: o.legs[0].book, price: o.legs[0].price }; });
  }

  function sharpLegs() {
    // Prefer the Sharp Money module when it is available.
    try {
      const src = typeof api.sharp?.spikes === 'function' ? api.sharp.spikes() : null;
      if (Array.isArray(src)) {
        const mapped = src.map((s) => {
          const line = api.lineById(s.lineId);
          if (!line) return null;
          const idx = Number.isInteger(s.outcomeIndex) ? s.outcomeIndex : Number.isInteger(s.idx) ? s.idx : line.outcomes.indexOf(s.outcome ?? s.side ?? s.selection);
          if (idx < 0 || idx >= line.outcomes.length) return null;
          return { lineId: line.id, idx, money: s.moneyPct ?? s.handle ?? s.money ?? null, tickets: s.ticketPct ?? s.tickets ?? null, move: s.move ?? null };
        }).filter(Boolean);
        if (mapped.length >= 3) return mapped.slice(0, 30);
      }
    } catch { /* fall back to derived */ }
    // Derived: exchange prices (Novig/ProphetX) stronger than the retail consensus = where sharp money sits.
    const out = [];
    for (const line of api.lines({ live: false })) {
      const ex = ['novig', 'px'].filter((b) => line.prices[b]);
      const sb = Object.keys(line.prices).filter((b) => api.bookById[b].type === 'sportsbook');
      if (!ex.length || sb.length < 3) continue;
      const avg = (bs) => line.outcomes.map((_, i) => bs.reduce((a, b) => a + odds.devig(line.prices[b].map(odds.impliedProb))[i], 0) / bs.length);
      const exP = avg(ex), sbP = avg(sb);
      line.outcomes.forEach((_, i) => {
        const diff = exP[i] - sbP[i];
        if (diff > 0.012) {
          const r = rng(hash(`${line.id}${i}`));
          const money = Math.round(55 + diff * 900 + r() * 12);
          out.push({ lineId: line.id, idx: i, diff, money: Math.min(92, money), tickets: Math.max(18, Math.round(money - 18 - r() * 25)), move: Math.round(diff * 1000) / 10 });
        }
      });
    }
    return out.sort((a, b) => b.diff - a.diff).slice(0, 30);
  }

  function bestFor(line, idx) {
    const b = api.bestPrices(line, store.get().books)[idx];
    return b || api.bestPrices(line)[idx];
  }

  /** The row's one action: Add (or Added ✓). Another side of the same market can't be added. */
  function addBtn(lineId, idx, on, blocked) {
    return `<button type="button" class="btn sm ${on ? 'primary' : 'outline'} pb-add" data-act="add" data-add="${lineId}|${idx}" aria-pressed="${on}"${blocked ? ' aria-disabled="true" title="Another side of this market is already in your parlay"' : ''}><span data-bf-text>${on ? 'Added ✓' : 'Add'}</span></button>`;
  }

  function legRow(L, extra) {
    const line = api.lineById(L.lineId);
    if (!line) return '';
    const e = api.eventById(line.eventId);
    const best = bestFor(line, L.idx);
    const on = inSlip(L.lineId, L.idx);
    const blocked = !on && lineInSlip(L.lineId);
    const fp = fairFor(line)[L.idx];
    return `<div class="pb-leg ${on ? 'in' : ''}">
      <div><div class="pb-sel">${ui.esc(line.outcomes[L.idx])}</div>
        <div class="pb-meta">${e.live ? ui.liveDot() : ''}${ui.esc(e.away)} @ ${ui.esc(e.home)} · ${ui.esc(line.label)} · <span>${ui.when(e.start)}</span></div>
        <div class="pb-meta">${extra}</div></div>
      <div class="pb-px">${best ? `${ui.book(best.book)} ${ui.price(best.price, { best: true })}` : ''}<small>Fair ${ui.esc(ui.fmtOdds(odds.probToAmerican(fp)))}</small></div>
      ${addBtn(L.lineId, L.idx, on, blocked)}</div>`;
  }

  function drawList() {
    const list = $('#pb-list');
    $('#pb-search').hidden = st.tab !== 'check';
    let html = '';
    if (st.tab === 'ev') {
      const legs = evLegs();
      $('#pb-count').textContent = `${legs.length} +EV legs at your books`;
      html = legs.map((L) => legRow(L, `${ui.edge(L.edge, { label: 'EV' })} ${ui.risk('ev', { short: true })}`)).join('')
        || ui.empty({ title: 'No +EV legs right now', msg: 'Nothing at your books beats the sharp fair price. Try Sharp Money legs or price any line yourself.', actions: [{ label: 'Sharp Money legs', act: 'tab-sharp' }, { label: 'Check my parlay', act: 'tab-check' }] });
    } else if (st.tab === 'sharp') {
      const legs = sharpLegs();
      $('#pb-count').textContent = `${legs.length} Sharp Money legs`;
      html = legs.map((L) => legRow(L, `${ui.risk('sharp', { short: true })} ${L.money != null ? `<span class="sharp-bar">${L.money}% money ${ui.meter(L.money / 100)} ${L.tickets != null ? `<span class="muted">${L.tickets}% tickets</span>` : ''}</span>` : ''}${L.move ? ` <span class="muted">· exchange +${L.move}pts</span>` : ''}`)).join('')
        || ui.empty({ title: 'No sharp moves right now', msg: 'No exchange is leaning away from the books at the moment.', actions: [{ label: '+EV legs', act: 'tab-ev' }, { label: 'Sharp Money', href: '#/sharp-money' }] });
    } else {
      const q = st.q.trim().toLowerCase();
      const lines = api.lines({}).filter((l) => {
        if (!q) return l.market === 'Moneyline';
        const e = api.eventById(l.eventId);
        return `${e.home} ${e.away} ${l.player || ''} ${l.label} ${l.market} ${l.sport}`.toLowerCase().includes(q);
      }).slice(0, 30);
      $('#pb-count').textContent = q ? `${lines.length} markets match` : 'Pick any line to price your parlay';
      html = lines.map((l) => {
        const e = api.eventById(l.eventId);
        return `<div class="pb-line"><div class="pb-sel">${ui.esc(e.away)} @ ${ui.esc(e.home)}</div>
          <div class="pb-meta">${ui.sport(l.sport)} ${e.live ? ui.liveDot() : ''} ${ui.esc(l.label)} · ${ui.when(e.start)}</div>
          <div class="ocs">${l.outcomes.map((o, i) => {
            const b = bestFor(l, i);
            const on = inSlip(l.id, i);
            const dis = !on && lineInSlip(l.id);
            return `<button type="button" class="pb-oc" data-act="add" data-add="${l.id}|${i}" aria-pressed="${on}"${dis ? ' disabled title="Another side of this market is already in your parlay"' : ''}>${ui.esc(o)} ${b ? ui.price(b.price) : ''}</button>`;
          }).join('')}</div></div>`;
      }).join('') || ui.empty({ title: 'No markets match that search', msg: 'Try a team, a player or a market such as Total.', actions: [{ label: 'Clear search', act: 'clear-q' }, { label: '+EV legs', act: 'tab-ev' }] });
    }
    list.innerHTML = html;
  }

  function toggle(key) {
    const [lineId, i] = key.split('|');
    const idx = Number(i);
    if (inSlip(lineId, idx)) slip = slip.filter((l) => !(l.lineId === lineId && l.idx === idx));
    else if (!lineInSlip(lineId)) slip = [...slip, { lineId, idx }];
    saveSlip();
    drawList();
    drawSlip();
    drawFacts();
  }

  // ---------- slip ----------
  let top = null;
  let legsNow = [];
  let offBar = () => {};
  function drawSlip() {
    const el = $('#pb-slip');
    slip = slip.filter((L) => api.lineById(L.lineId));
    const legs = slip.map((L) => ({ ...L, line: api.lineById(L.lineId) }));
    legsNow = legs;
    top = null;
    const head = `<div class="slip-h"><h2>Your parlay</h2><span class="num-badge" data-bf-nodata>${legs.length}</span></div>`;
    if (!legs.length) {
      el.innerHTML = `${head}<div class="slip-body"><div class="callout"><strong>Start with a leg.</strong><p class="muted" style="margin:4px 0 0">Tap <b>Add</b> on any +EV or Sharp Money leg, or use “Check my parlay” to price any lines you like at every book.</p></div></div>`;
      paintBar(legs);
      return;
    }
    const fairP = legs.reduce((a, L) => a * fairFor(L.line)[L.idx], 1);
    const myBooks = store.get().books;
    const rows = api.sportsbooks.map((b) => {
      const missing = legs.filter((L) => !L.line.prices[b.id]).length;
      if (missing) return { b: b.id, missing, mine: myBooks.includes(b.id) };
      const p = odds.parlay(legs.map((L) => L.line.prices[b.id][L.idx]));
      return { b: b.id, missing: 0, dec: p.decimal, am: p.american, ev: fairP * p.decimal - 1, mine: myBooks.includes(b.id) };
    });
    const priced = rows.filter((r) => !r.missing).sort((a, b) => b.dec - a.dec);
    const mine = priced.filter((r) => r.mine);
    top = legs.length >= 2 ? (mine[0] || priced[0] || null) : null;
    const games = {};
    legs.forEach((L) => (games[L.line.eventId] ||= []).push(L));
    const sgp = Object.values(games).filter((g) => g.length > 1);
    const name = (b) => api.bookById[b].name;

    // Legs sit in one list container so the owner editor treats them as a single block
    // (repeated items must not become one editor block each).
    el.innerHTML = `${head}
      <div class="slip-legs" data-bf-list data-bf-nodata>${legs.map((L) => {
        const e = api.eventById(L.line.eventId);
        const fp = fairFor(L.line)[L.idx];
        return `<div class="slip-leg"><div><div class="pb-sel">${ui.esc(L.line.outcomes[L.idx])}</div>
          <div class="pb-meta">${ui.esc(e.away)} @ ${ui.esc(e.home)} · ${ui.esc(L.line.label)}</div>
          <div class="pb-meta">Fair ${ui.esc(ui.fmtOdds(odds.probToAmerican(fp)))} · ${odds.pct(fp)} to win</div></div>
          <button type="button" class="icon-btn x" data-act="rm" data-add="${L.lineId}|${L.idx}" aria-label="Remove ${ui.esc(L.line.outcomes[L.idx])}">✕</button></div>`;
      }).join('')}</div>
      <div class="slip-body">
        ${legs.length < 2 ? '<div class="callout">Add one more leg to price the parlay at every book.</div>' : `
        ${sgp.length ? `<div class="callout lime"><strong>Same-game legs.</strong> ${sgp.map((g) => g.map((L) => ui.esc(L.line.outcomes[L.idx])).join(' + ')).join('; ')} come from the same game. Correlated outcomes are priced as a same-game parlay at the book; legs that move together raise the true parlay probability above the product shown here.</div>` : ''}
        ${ui.numberInput('stake', st.stake, 'Stake', { prefix: '$', step: 5, min: 1 })}
        ${top ? `<div class="pb-hero on-green"><div class="hero-top"><span>Best payout · ${ui.esc(name(top.b))}</span>${ui.edge(top.ev)}</div>
          <div class="big" data-bf-nodata>${ui.esc(ui.fmtOdds(top.am))}</div>
          <dl class="kv"><dt>Fair parlay odds</dt><dd data-bf-nodata>${ui.esc(ui.fmtOdds(odds.probToAmerican(fairP)))} · ${odds.pct(fairP, 2)}</dd>
            <dt>Payout on ${odds.money(st.stake, 0)}</dt><dd data-bf-nodata>${odds.money(st.stake * top.dec)}</dd>
            <dt>Parlay EV</dt><dd data-bf-nodata>${top.ev < 0 ? '-' : ''}${odds.money(Math.abs(st.stake * top.ev))} (${top.ev >= 0 ? '+' : ''}${(top.ev * 100).toFixed(2)}%)</dd>
            ${priced.length > 1 ? `<dt>vs worst book</dt><dd data-bf-nodata>+${odds.money(st.stake * (top.dec - priced[priced.length - 1].dec), 0)} more</dd>` : ''}</dl>
          ${ui.evLine({ prob: fairP, payout: st.stake * top.dec, ev: st.stake * top.ev })}
          ${ui.betAction({ verb: 'Bet at', amount: `${ui.esc(name(top.b))} ${ui.esc(ui.fmtOdds(top.am))}`, book: top.b, size: '', tone: 'lime', attrs: { id: 'pb-cta' } })}
          ${ui.ghost('log', 'Log parlay', { attrs: { id: 'pb-log' } })}</div>` : '<div class="callout">No single book posts every leg. Swap a leg to price it.</div>'}
        <div><h3>Parlay odds at every book</h3>
          <table class="t pb-books"><thead><tr><th>Book</th><th class="num-cell">Odds</th><th class="num-cell">Payout</th><th class="num-cell">EV</th></tr></thead><tbody data-bf-nodata>
          ${priced.map((r) => `<tr class="${r === top ? 'hl' : ''}"><td>${ui.book(r.b)}${r.mine ? '' : ' <span class="nl">not linked</span>'}</td>
            <td class="num-cell">${ui.price(r.am, { best: r === top })}</td><td class="num-cell">${odds.money(st.stake * r.dec, 0)}</td><td class="num-cell">${ui.edge(r.ev)}</td></tr>`).join('')}
          ${rows.filter((r) => r.missing).map((r) => `<tr><td>${ui.book(r.b)}</td><td colspan="3" class="muted" style="font-size:12px">Missing ${r.missing} leg${r.missing > 1 ? 's' : ''}</td></tr>`).join('')}
          </tbody></table></div>
        ${ui.calcLink({ tab: 'parlay', label: 'Open in parlay calculator', stake: st.stake })}`}
      </div>`;
    ui.onNumber(el, 'stake', (v) => { st.stake = v; drawSlipKeepFocus(); });
    paintBar(legs);
  }

  /** Sticky action bar: the slip's CTA, shown only while the in-slip CTA is off screen. */
  function paintBar(legs) {
    const bar = $('[data-actionbar]');
    offBar();
    if (!top) { bar.hidden = true; bar.innerHTML = ''; offBar = () => {}; return; }
    bar.hidden = false;
    bar.innerHTML = `<span class="ab-txt">Your parlay · ${legs.length} legs <b data-bf-nodata>${ui.esc(ui.fmtOdds(top.am))} · pays ${odds.money(st.stake * top.dec, 0)}</b></span>
      ${ui.betAction({ verb: 'Bet at', amount: `${ui.esc(api.bookById[top.b].name)} ${ui.esc(ui.fmtOdds(top.am))}`, book: top.b, size: '' })}`;
    offBar = ui.wireActionBar(bar, $('#pb-cta'));
  }

  function drawSlipKeepFocus() {
    const inp = root.querySelector('[data-num="stake"]');
    const pos = inp?.selectionStart;
    drawSlip();
    const n = root.querySelector('[data-num="stake"]');
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* number inputs */ } }
  }

  function setTab(v) {
    st.tab = v;
    root.querySelectorAll('[data-seg="tab"] button').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    ui.setQuery({ tab: v === 'ev' ? null : v });
    ui.view().set({ tab: v });
    drawList();
    if (v === 'check') $('#pb-q').focus();
  }

  function drawFacts() {
    const html = ui.facts([
      { label: '+EV legs', value: String(evLegs().length), note: 'at your books', act: 'tab-ev' },
      { label: 'Sharp Money legs', value: String(sharpLegs().length), note: 'exchange money moving', act: 'tab-sharp' },
      { label: 'Your parlay', value: top ? ui.esc(ui.fmtOdds(top.am)) : `${legsNow.length} ${legsNow.length === 1 ? 'leg' : 'legs'}`, tone: top && top.ev >= 0 ? 'pos' : '', note: top ? `${legsNow.length} legs · best at ${ui.esc(api.bookById[top.b].name)}` : 'Add 2+ legs to price it', act: 'slip' },
    ]);
    const cur = $('.ph .facts');
    if (cur && cur.outerHTML !== html) cur.outerHTML = html;
  }

  // ---------- wiring (one delegated listener) ----------
  ui.onAction(root.querySelector('.pb'), {
    add: (_, el) => toggle(el.dataset.add),
    rm: (_, el) => toggle(el.dataset.add),
    bet: (_, el) => ui.toast(`Opening ${api.bookById[el.dataset.book]?.name || 'the book’s'} bet slip…`),
    log: () => {
      if (!top) return;
      ui.logBet({ kind: 'parlay', book: top.b, sport: legsNow[0].line.sport, market: 'Parlay', selection: legsNow.map((L) => L.line.outcomes[L.idx]).join(' + '), price: top.am, stake: st.stake });
    },
    slip: () => $('#pb-slip').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }),
    'tab-ev': () => setTab('ev'),
    'tab-sharp': () => setTab('sharp'),
    'tab-check': () => setTab('check'),
    'clear-q': () => { st.q = ''; $('#pb-q').value = ''; drawList(); },
  });
  ui.onSeg(root, 'tab', (v) => setTab(v));
  $('#pb-q').addEventListener('input', (e) => { st.q = e.target.value; drawList(); });

  if (!seeded && !slip.length) {
    // First visit: start the slip with the top +EV legs from three different games.
    const evs = new Set();
    for (const L of evLegs()) {
      const ev = api.lineById(L.lineId).eventId;
      if (evs.has(ev)) continue;
      evs.add(ev); slip.push({ lineId: L.lineId, idx: L.idx });
      if (slip.length === 3) break;
    }
    seeded = true; saveSlip();
  }
  drawList();
  drawSlip();
  drawFacts();
  const offTick = api.onTick(() => { if (!root.querySelector('[data-num="stake"]:focus')) drawSlip(); drawFacts(); });
  const offStore = store.subscribe(() => { drawList(); drawSlip(); drawFacts(); });
  return () => { offTick(); offStore(); offBar(); };
}
