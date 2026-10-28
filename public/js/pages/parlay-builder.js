// Parlay Builder: +EV and Sharp Money legs, priced at every book, pointing to the book paying most.
import { rng } from '../data/core.js';

const SLIP_KEY = 'bf-parlay-slip-v1';
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
let slip = [];
let seeded = false;
try { seeded = localStorage.getItem(SLIP_KEY) !== null; } catch { /* ignore */ }
try { slip = JSON.parse(localStorage.getItem(SLIP_KEY) || '[]'); if (!Array.isArray(slip)) slip = []; } catch { slip = []; }
const saveSlip = () => { try { localStorage.setItem(SLIP_KEY, JSON.stringify(slip)); } catch { /* ignore */ } };

const CSS = `
.pb .pb-list { display:flex; flex-direction:column; }
.pb .pb-leg { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:12px; align-items:center; padding:11px 16px; border-bottom:1px solid var(--line-2); }
.pb .pb-leg:last-child { border-bottom:0; }
.pb .pb-leg.in { background:color-mix(in srgb, var(--lime) 22%, transparent); }
.pb .pb-sel { font-weight:600; }
.pb .pb-meta { font-size:12px; color:var(--muted); margin-top:2px; display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.pb .pb-px { text-align:right; white-space:nowrap; }
.pb .pb-px small { display:block; font-size:11.5px; color:var(--muted); }
.pb .pb-add { width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:var(--paper); cursor:pointer; font-size:18px; line-height:1; font-weight:700; color:var(--accent); }
.pb .pb-add.on { background:var(--ink); color:var(--lime); border-color:var(--ink); }
.pb .pb-add:disabled { opacity:.35; cursor:not-allowed; }
.pb .pb-tabs { padding:12px 16px; border-bottom:1px solid var(--line-2); display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
.pb .pb-search { padding:12px 16px; border-bottom:1px solid var(--line-2); }
.pb .pb-search input { width:100%; }
.pb .pb-line { padding:12px 16px; border-bottom:1px solid var(--line-2); }
.pb .pb-line .ocs { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
.pb .pb-oc { display:inline-flex; gap:8px; align-items:center; border:1px solid var(--line); background:var(--paper); border-radius:9px; padding:6px 10px; cursor:pointer; font-size:13px; }
.pb .pb-oc.on { background:var(--ink); color:#fff; border-color:var(--ink); }
.pb .pb-oc.on .price { color:var(--lime); }
.pb .slip { position:sticky; top:72px; }
.pb .slip-leg { display:flex; gap:10px; align-items:flex-start; padding:10px 16px; border-bottom:1px solid var(--line-2); }
.pb .slip-leg .x { margin-left:auto; border:0; background:transparent; cursor:pointer; color:var(--muted); font-size:15px; }
.pb .slip-body { padding:14px 16px; display:grid; gap:12px; }
.pb .pb-hero { background:var(--ink); color:#e9f3ec; border-radius:var(--r); padding:14px; }
.pb .pb-hero .big { font:600 28px var(--serif); color:var(--lime); }
.pb .pb-hero .kv dt { color:#9fc0b0; } .pb .pb-hero .kv dd { color:#fff; }
.pb .pb-hero .btn { margin-top:12px; width:100%; background:var(--lime); color:var(--ink); border-color:var(--lime); }
.pb .pb-hero .btn .book { background:rgba(0,0,0,.08); }
.pb .pb-books td, .pb .pb-books th { padding:7px 10px; font-size:13px; }
.pb .pb-books tr.best td { background:color-mix(in srgb, var(--lime) 30%, transparent); }
.pb .sharp-bar { display:inline-flex; gap:4px; align-items:center; font-size:11.5px; }
.pb .num-badge { display:inline-grid; place-items:center; min-width:22px; height:22px; border-radius:999px; background:var(--lime); color:var(--ink); font-weight:700; font-size:12px; padding:0 6px; }
@media (max-width:860px){ .pb .slip { position:static; } .pb .pb-leg { grid-template-columns:minmax(0,1fr) auto; } .pb .pb-leg .pb-px { grid-column:1; grid-row:2; text-align:left; } .pb .pb-leg .pb-px small { display:inline; margin-left:6px; } .pb .pb-leg .pb-add { grid-column:2; grid-row:1 / span 2; } }
`;

export default function render(root, ctx) {
  const { api, store, ui, odds } = ctx;
  if (!document.getElementById('css-parlay-builder')) document.head.insertAdjacentHTML('beforeend', `<style id="css-parlay-builder">${CSS}</style>`);
  const methods = { multiplicative: odds.devig, power: odds.devigPower, additive: odds.devigAdditive };
  const st = { tab: 'ev', q: '', stake: store.get().unit || 50 };

  const fairFor = (line) => api.fairProbs(line, store.get().sharpRefs, methods[store.get().devigMethod] || odds.devig);
  const inSlip = (lineId, idx) => slip.some((l) => l.lineId === lineId && l.idx === idx);
  const lineInSlip = (lineId) => slip.some((l) => l.lineId === lineId);

  root.innerHTML = `<div class="pb">
    ${ui.header({ title: 'Parlay Builder', subtitle: 'We find the +EV and Sharp Money legs and point you to the book paying most for them.', tool: 'parlay-builder' })}
    <div class="split">
      <div class="card"><div class="pb-tabs">${ui.seg('tab', [['ev', '+EV legs'], ['sharp', 'Sharp Money legs'], ['check', 'Check my parlay']], st.tab)}
        <span class="muted" id="pb-count" style="font-size:12.5px"></span></div>
        <div class="pb-search" id="pb-search" hidden><input type="search" class="input" id="pb-q" placeholder="Search any team, player or market (e.g. Celtics, Mahomes, Total)"></div>
        <div id="pb-list"></div></div>
      <aside class="card slip" id="pb-slip"></aside>
    </div></div>`;
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
          let idx = Number.isInteger(s.outcomeIndex) ? s.outcomeIndex : Number.isInteger(s.idx) ? s.idx : line.outcomes.indexOf(s.outcome ?? s.side ?? s.selection);
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
        <div class="pb-meta" style="margin-top:5px">${extra}</div></div>
      <div class="pb-px">${best ? `${ui.book(best.book)} ${ui.price(best.price, { best: true })}` : ''}<small>Fair ${odds.fmtAmerican(odds.probToAmerican(fp))}</small></div>
      <button class="pb-add ${on ? 'on' : ''}" data-add="${L.lineId}|${L.idx}" ${blocked ? 'disabled title="Another side of this market is already in your slip"' : ''} aria-label="${on ? 'Remove' : 'Add'} leg">${on ? '✓' : '+'}</button></div>`;
  }

  function drawList() {
    const list = $('#pb-list');
    $('#pb-search').hidden = st.tab !== 'check';
    let html = '';
    if (st.tab === 'ev') {
      const legs = evLegs();
      $('#pb-count').textContent = `${legs.length} +EV legs at your books`;
      html = legs.map((L) => legRow(L, `${ui.edge(L.edge, { label: 'EV' })} ${ui.tag('+EV', 'pos')}`)).join('') || ui.empty('No +EV legs right now.');
    } else if (st.tab === 'sharp') {
      const legs = sharpLegs();
      $('#pb-count').textContent = `${legs.length} Sharp Money legs`;
      html = legs.map((L) => legRow(L, `${ui.tag('Sharp Money', 'dark')} ${L.money != null ? `<span class="sharp-bar">${L.money}% money ${ui.meter(L.money / 100)} ${L.tickets != null ? `<span class="muted">${L.tickets}% tickets</span>` : ''}</span>` : ''}${L.move ? ` <span class="muted">· exchange +${L.move}pts</span>` : ''}`)).join('') || ui.empty('No sharp moves right now.');
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
            return `<button class="pb-oc ${on ? 'on' : ''}" data-add="${l.id}|${i}" ${dis ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>${ui.esc(o)} ${b ? ui.price(b.price) : ''}</button>`;
          }).join('')}</div></div>`;
      }).join('') || ui.empty('No markets match that search.');
    }
    list.innerHTML = `<div class="pb-list">${html}</div>`;
    list.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.add)));
  }

  function toggle(key) {
    const [lineId, i] = key.split('|');
    const idx = Number(i);
    if (inSlip(lineId, idx)) slip = slip.filter((l) => !(l.lineId === lineId && l.idx === idx));
    else if (!lineInSlip(lineId)) slip = [...slip, { lineId, idx }];
    saveSlip();
    drawList();
    drawSlip();
  }

  // ---------- slip ----------
  function drawSlip() {
    const el = $('#pb-slip');
    slip = slip.filter((L) => api.lineById(L.lineId));
    const legs = slip.map((L) => ({ ...L, line: api.lineById(L.lineId) }));
    const head = `<header><h2>Your parlay</h2><span class="num-badge">${legs.length}</span></header>`;
    if (!legs.length) {
      el.innerHTML = `${head}<div class="slip-body"><div class="callout"><strong>Start with a leg.</strong><p class="muted" style="margin:4px 0 0">Tap <b>+</b> on any +EV or Sharp Money leg, or use “Check my parlay” to price any lines you like at every book.</p></div></div>`;
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
    const top = mine[0] || priced[0];
    const games = {};
    legs.forEach((L) => (games[L.line.eventId] ||= []).push(L));
    const sgp = Object.values(games).filter((g) => g.length > 1);

    el.innerHTML = `${head}
      ${legs.map((L) => {
        const e = api.eventById(L.line.eventId);
        const fp = fairFor(L.line)[L.idx];
        return `<div class="slip-leg"><div><div class="pb-sel">${ui.esc(L.line.outcomes[L.idx])}</div>
          <div class="pb-meta">${ui.esc(e.away)} @ ${ui.esc(e.home)} · ${ui.esc(L.line.label)}</div>
          <div class="pb-meta">Fair ${odds.fmtAmerican(odds.probToAmerican(fp))} · ${odds.pct(fp)} to win</div></div>
          <button class="x" data-rm="${L.lineId}|${L.idx}" aria-label="Remove">✕</button></div>`;
      }).join('')}
      <div class="slip-body">
        ${legs.length < 2 ? '<div class="callout">Add one more leg to price the parlay at every book.</div>' : `
        ${sgp.length ? `<div class="callout lime"><strong>Same-game legs.</strong> ${sgp.map((g) => g.map((L) => ui.esc(L.line.outcomes[L.idx])).join(' + ')).join('; ')} come from the same game. Correlated outcomes are priced as a same-game parlay at the book; legs that move together raise the true parlay probability above the product shown here.</div>` : ''}
        ${numberInputHTML()}
        ${top ? `<div class="pb-hero"><div class="row" style="justify-content:space-between"><span>Best payout · ${api.bookById[top.b].name}</span>${ui.edge(top.ev)}</div>
          <div class="big">${odds.fmtAmerican(top.am)}</div>
          <dl class="kv" style="margin-top:8px"><dt>Fair parlay odds</dt><dd>${odds.fmtAmerican(odds.probToAmerican(fairP))} · ${odds.pct(fairP, 2)}</dd>
            <dt>Payout on ${odds.money(st.stake, 0)}</dt><dd>${odds.money(st.stake * top.dec)}</dd>
            <dt>Parlay EV</dt><dd>${odds.money(st.stake * top.ev)} (${top.ev >= 0 ? '+' : ''}${(top.ev * 100).toFixed(2)}%)</dd>
            ${priced.length > 1 ? `<dt>vs worst book</dt><dd>+${odds.money(st.stake * (top.dec - priced[priced.length - 1].dec), 0)} more</dd>` : ''}</dl>
          <button class="btn" data-bet="${top.b}">Bet at ${ui.book(top.b)} ${odds.fmtAmerican(top.am)}</button>
          <button class="btn ghost" id="pb-log" style="margin-top:8px;background:transparent;color:#e9f3ec;border-color:rgba(255,255,255,.25)">Log parlay</button></div>` : '<div class="callout">No single book posts every leg. Swap a leg to price it.</div>'}
        <div><h3 style="font-size:15px;margin-bottom:6px">Parlay odds at every book</h3>
          <table class="t pb-books"><thead><tr><th>Book</th><th class="num-cell">Odds</th><th class="num-cell">Payout</th><th class="num-cell">EV</th></tr></thead><tbody>
          ${priced.map((r) => `<tr class="${r === top ? 'best' : ''}"><td>${ui.book(r.b)}${r.mine ? '' : ' <span class="muted" style="font-size:11px">not linked</span>'}</td>
            <td class="num-cell">${ui.price(r.am, { best: r === top })}</td><td class="num-cell">${odds.money(st.stake * r.dec, 0)}</td><td class="num-cell">${ui.edge(r.ev)}</td></tr>`).join('')}
          ${rows.filter((r) => r.missing).map((r) => `<tr><td>${ui.book(r.b)}</td><td colspan="3" class="muted" style="font-size:12px">Missing ${r.missing} leg${r.missing > 1 ? 's' : ''}</td></tr>`).join('')}
          </tbody></table></div>`}
      </div>`;
    el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => toggle(b.dataset.rm)));
    ui.onNumber(el, 'stake', (v) => { st.stake = v; drawSlipKeepFocus(); });
    ui.wireBetButtons(el);
    el.querySelector('#pb-log')?.addEventListener('click', () => {
      ui.logBet({ kind: 'parlay', book: top.b, sport: legs[0].line.sport, market: 'Parlay', selection: legs.map((L) => L.line.outcomes[L.idx]).join(' + '), price: top.am, stake: st.stake });
    });
  }
  const numberInputHTML = () => ui.numberInput('stake', st.stake, 'Stake', { prefix: '$', step: 5, min: 1 });
  function drawSlipKeepFocus() {
    const inp = root.querySelector('[data-num="stake"]');
    const pos = inp?.selectionStart;
    drawSlip();
    const n = root.querySelector('[data-num="stake"]');
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* number inputs */ } }
  }

  // ---------- wiring ----------
  ui.onSeg(root, 'tab', (v) => {
    st.tab = v;
    root.querySelectorAll('[data-seg="tab"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    drawList();
    if (v === 'check') $('#pb-q').focus();
  });
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
  const offTick = api.onTick(() => { if (!root.querySelector('[data-num="stake"]:focus')) drawSlip(); });
  const offStore = store.subscribe(() => { drawList(); drawSlip(); });
  return () => { offTick(); offStore(); };
}
