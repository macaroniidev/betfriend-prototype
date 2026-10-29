// Settings: state, plan, bankroll and sizing, books, theme and odds format — used by every tool.
// One column of top-ruled sections (B6). Every control writes to the store as you change it; the screen
// never re-renders itself on its own input. Changes made elsewhere (top-bar sizing popover, theme toggle,
// first-run card, another tab) are mirrored into the fields in place, so the two always agree.
// Theme lives in js/theme.js; the Light / Dark / System seg and the top-bar toggle sync through `bf:theme`.
import * as themeMod from '../theme.js';
import { kelly, money as fmtMoney } from '../lib/odds.js';

const CSS = `
.settings { display:grid; grid-template-columns:minmax(0,820px) 200px; gap:0 40px; align-items:start; }
.settings .set-main { min-width:0; }
.settings .sec { margin-top:28px; }
.settings .sec:first-child { margin-top:4px; }
.settings .sec-note { margin:-4px 0 14px; color:var(--muted); font-size:14px; max-width:62ch; }
.settings .fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px 16px; align-items:end; }
.settings .fields.two { grid-template-columns:repeat(2,minmax(0,1fr)); }
.settings .field > span { font-size:13px; }
.settings .field select, .settings .field .num { min-height:42px; font-size:15px; }
.settings .kelly-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 16px; align-items:center; margin-top:16px; }
.settings .kelly-row input { grid-column:1 / -1; }
.settings .kelly-l { font-size:13px; font-weight:700; color:var(--muted); }
.settings .kelly-row output { font:900 22px/1 var(--f-head); color:var(--accent); font-variant-numeric:tabular-nums; }
.settings .kelly-ticks { display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:var(--muted); }
.settings .sizing-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; align-items:start; margin-top:16px; }
.settings .round-field { display:grid; gap:6px; font-size:13px; font-weight:700; color:var(--muted); }
.settings .plan-line { margin:10px 0 0; font-size:14px; color:var(--muted); }
.settings .plan-line b { color:var(--text); }

/* books as tiles: name, kind, state flag; pressed = in your books */
.settings .book-group + .book-group { margin-top:16px; }
.settings .book-group h3 { font-size:17px; margin-bottom:8px; }
.settings .tiles { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:8px; }
.settings .tile { position:relative; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:2px 10px; min-height:52px; padding:8px 12px;
  border:2px solid var(--line-strong); border-radius:12px; background:var(--paper); color:var(--text); text-align:left; cursor:pointer; font:inherit; }
.settings .tile:hover { border-color:var(--g); }
.settings .tile i { width:12px; height:12px; border-radius:4px; background:var(--bk, var(--line)); }
.settings .tile b { font-weight:800; font-size:14px; line-height:1.2; }
.settings .tile small { grid-column:2; font-size:12px; font-weight:600; color:var(--muted); line-height:1.2; }
.settings .tile .tick { grid-row:1 / span 2; grid-column:3; width:22px; height:22px; border-radius:6px; border:2px solid var(--line-strong); display:grid; place-items:center; color:transparent; }
.settings .tile[aria-pressed="true"] { border-color:var(--g); background:var(--soft); }
.settings .tile[aria-pressed="true"] .tick { background:var(--g); border-color:var(--g); color:#FFFFFF; }
.settings .tile.off small { color:var(--warn); }
.settings .books-acts { display:flex; gap:6px; flex-wrap:wrap; }

.settings .toggle-row { display:flex; gap:12px; align-items:flex-start; margin-top:14px; font-size:14px; font-weight:600; }
.settings .toggle-row input { width:20px; height:20px; margin:1px 0 0; flex:none; }
.settings .toggle-row small { display:block; color:var(--muted); font-weight:500; }
.settings .data-line { margin:0; font-size:14px; color:var(--muted); }
.settings .danger-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:14px; }

/* "On this page" (wide screens only) */
.settings .set-toc { position:sticky; top:calc(var(--topbar-h) + 24px); display:grid; gap:2px; padding-left:14px; border-left:2px solid var(--line); }
.settings .set-toc h2 { font:800 12px/1.2 var(--f-body); text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:6px; }
.settings .set-toc a { font-size:14px; padding:4px 0; color:var(--muted); }
.settings .set-toc a:hover { color:var(--accent); }

@media (max-width:1180px) { .settings { grid-template-columns:minmax(0,820px); } .settings .set-toc { display:none; } }
@media (max-width:760px) {
  .settings .fields, .settings .fields.two, .settings .sizing-grid { grid-template-columns:1fr; }
  .settings .tiles { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .settings .tile { min-height:56px; padding:8px 10px; }
}`;

const THEME_OPTS = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'System']];
const ROUND_OPTS = [[0, 'Exact'], [1, 'To $1'], [5, 'To $5']];
const GOALS = [['', 'Not set'], ['beginner', 'I’m new: explain things'], ['promos', 'Cash out promos'], ['hedged', 'Hedged profit'], ['edges', '+EV and signals'], ['pm', 'Prediction markets']];
const RISKS = [['', 'Not set'], ['hedged', 'Hedged only'], ['balanced', 'Hedged + low-cost'], ['edges', 'Edges too (can lose)']];
const BOOK_KIND = { sportsbook: 'Sportsbook', dfs: 'Fantasy app', exchange: 'Exchange', prediction: 'Prediction market' };

// The worked sizing example: a fair 50/50 bet offered at +110 (a 5% edge). Fixed inputs, your settings.
const EX = { prob: 0.5, price: 110 };

export default function render(root, { ui, api, store, plans }) {
  if (!document.getElementById('css-account')) document.head.insertAdjacentHTML('beforeend', `<style id="css-account">${CSS}</style>`);
  const $ = (sel) => root.querySelector(sel);

  const groups = [['Sportsbooks', api.books.filter((b) => b.type === 'sportsbook')], ['Fantasy apps', api.books.filter((b) => b.type === 'dfs')],
    ['Exchanges & prediction markets', api.books.filter((b) => b.type === 'exchange' || b.type === 'prediction')]];
  const roundTo = (x, r) => (r ? Math.round(x / r) * r : x);

  const tile = (b, s) => {
    const on = s.books.includes(b.id);
    const legal = ui.bookLegal(b.id, s.state);
    return `<button type="button" class="tile${legal ? '' : ' off'}" data-book="${b.id}" aria-pressed="${on}" style="--bk:${ui.esc(b.color || '')}"${legal ? '' : ` title="${ui.esc(ui.illegalNote(b.id, s.state))}"`}>
      <i aria-hidden="true"></i><b>${ui.esc(b.name)}</b><span class="tick" aria-hidden="true">✓</span>
      <small data-bf-nodata>${legal ? ui.esc(BOOK_KIND[b.type] || '') : `Not in ${ui.esc(s.state)}`}</small></button>`;
  };

  // Live example under Bankroll & sizing: what your numbers mean for a real-looking bet.
  const exampleHtml = (s) => {
    const k = kelly(EX.prob, EX.price, s.kellyMult);
    const stake = roundTo(Math.max(0, k * s.bankroll), +s.stakeRound || 0);
    const win = stake * (EX.price / 100);
    return ui.slip({
      caption: 'Your settings on two sample bets', tag: 'Example',
      legs: [
        { title: '+EV bet at +110', sub: `Fair 50/50 · ${ui.esc(ui.kellyLabel(s.kellyMult))}`, odds: '+110', stake: fmtMoney(stake, s.stakeRound ? 0 : 2) },
        { title: 'Arbitrage, both legs', sub: 'Default arb total stake', odds: '2 books', stake: fmtMoney(s.arbStake, 0) },
      ],
      result: `1 unit = ${fmtMoney(s.unit, 0)} · ${(s.unit / s.bankroll * 100).toFixed(1)}% of bankroll`,
      math: `${fmtMoney(stake, 2)} at +110 wins ${fmtMoney(win, 2)}. That is ${(k * 100).toFixed(2)}% of your ${fmtMoney(s.bankroll, 0)} bankroll (${s.kellyMult}× Kelly).`,
    });
  };

  const draw = () => {
    const s = store.get();
    const theme = themeMod.get();
    const planOpts = [...plans.PLANS.map((p) => [p.id, p.name]), ['all-access', 'All-Access']];
    root.innerHTML = `<div class="settings">
      <div class="set-main">
      ${ui.pageHead({ title: 'Settings', subtitle: 'Your state, books and bankroll drive every tool: arbs, +EV, promos, signals and prediction markets.' })}

      ${ui.sec('Location & plan', `
        <p class="sec-note">Your state decides which books can take your bets; tools flag the rest. Switching plan here previews what that plan unlocks.</p>
        <div class="fields two">
          ${ui.select('state', api.states.map((x) => [x.code, `${x.name} (${x.code})`]), s.state, 'State')}
          ${ui.select('plan', planOpts, s.plan, 'Plan')}
        </div>
        <p class="plan-line" data-plan-line></p>`, { id: 'set-where' })}

      ${ui.sec('Bankroll & sizing', `
        <p class="sec-note">Suggested stakes everywhere come from these numbers. The same settings live in the top-bar bankroll chip.</p>
        <div class="fields">
          ${ui.numberInput('bankroll', s.bankroll, 'Bankroll', { prefix: '$', step: 100 })}
          ${ui.numberInput('arbStake', s.arbStake, 'Default arb total stake', { prefix: '$', step: 50 })}
          ${ui.numberInput('unit', s.unit, 'Unit size', { prefix: '$', step: 5 })}
        </div>
        <div class="sizing-grid">
          <div>
            <div class="kelly-row">
              <label class="kelly-l" for="kelly-range">Kelly multiplier</label>
              <output id="km" for="kelly-range" data-bf-nodata>${s.kellyMult}×</output>
              <input id="kelly-range" type="range" min="0.1" max="1" step="0.05" value="${s.kellyMult}" data-kelly aria-describedby="kelly-help">
            </div>
            <div class="kelly-ticks" aria-hidden="true"><span>0.1× careful</span><span>1× full Kelly</span></div>
            <p class="sec-note" id="kelly-help" style="margin:8px 0 0">Most bettors use ¼ to ½ ${ui.term('kelly', 'Kelly')}: smaller swings, slower growth.</p>
            <div class="round-field" style="margin-top:14px"><span id="round-lbl">Round stakes</span>
              <div role="group" aria-labelledby="round-lbl">${ui.seg('round', ROUND_OPTS, +s.stakeRound || 0)}</div></div>
          </div>
          <div data-example>${exampleHtml(s)}</div>
        </div>`, { id: 'set-sizing' })}

      ${ui.sec('My books', `
        <p class="sec-note">Tools only show bets at books you select. <b data-bf-nodata data-book-count>${s.books.length} selected</b></p>
        ${groups.map(([g, list]) => `<div class="book-group"><h3>${ui.esc(g)}</h3><div class="tiles">${list.map((b) => tile(b, s)).join('')}</div></div>`).join('')}`,
      { id: 'set-books' })}

      ${ui.sec('Theme & odds', `
        <div class="fields two">
          <div class="field"><span id="theme-lbl">Theme</span><div role="group" aria-labelledby="theme-lbl">${ui.seg('theme', THEME_OPTS, theme)}</div></div>
          ${ui.select('odds', ui.ODDS_FORMATS, s.oddsFormat || 'american', 'Odds format')}
        </div>
        <p class="sec-note" style="margin:10px 0 0">Example price in your format: <b data-bf-nodata data-odds-ex>${ui.fmtOdds(-110)} / ${ui.fmtOdds(150)}</b></p>
        <label class="toggle-row"><input type="checkbox" data-announce${s.announceLive ? ' checked' : ''}>
          <span>Read live table updates aloud<small>For screen readers: announces new and changed rows on live tools, at most every 15 seconds.</small></span></label>`,
      { id: 'set-display' })}

      ${ui.sec('Your goal', `
        <p class="sec-note">Set during first-run setup. “I’m new” opens the “How this makes money” explainers on every tool.</p>
        <div class="fields two">
          ${ui.select('goal', GOALS, s.goal || '', 'Goal')}
          ${ui.select('risk', RISKS, s.riskPreset || '', 'Risk preset')}
        </div>
        <div class="danger-row">
          <button type="button" class="btn sm outline" data-rerun>Show the setup card on Daily again</button>
          <button type="button" class="btn ghost sm" data-reset>Reset all settings</button>
        </div>
        <p class="data-line" style="margin-top:14px">Data source: <strong data-bf-nodata>${api.source === 'sample' ? 'Sample data' : 'Live feeds'}</strong>. Real feeds connect in <code>public/js/data/adapter.js</code>.</p>`,
      { id: 'set-goal' })}
      </div>
      <nav class="set-toc" aria-label="Settings sections"><h2>On this page</h2>
        <a href="#set-where" data-toc>Location &amp; plan</a><a href="#set-sizing" data-toc>Bankroll &amp; sizing</a><a href="#set-books" data-toc>My books</a>
        <a href="#set-display" data-toc>Theme &amp; odds</a><a href="#set-goal" data-toc>Your goal</a></nav>
    </div>`;
    wire();
    sync(store.get());
  };

  // Mirror the store into the form in place (never touches the field being typed in).
  const sync = (s) => {
    const put = (sel, v) => { const el = $(sel); if (el && el !== document.activeElement && String(el.value) !== String(v)) el.value = v; };
    put('[data-sel="state"]', s.state);
    put('[data-sel="plan"]', s.plan);
    put('[data-sel="odds"]', s.oddsFormat || 'american');
    put('[data-sel="goal"]', s.goal || '');
    put('[data-sel="risk"]', s.riskPreset || '');
    ['bankroll', 'arbStake', 'unit'].forEach((k) => put(`[data-num="${k}"]`, s[k]));
    const kr = $('[data-kelly]');
    if (kr && kr !== document.activeElement && +kr.value !== +s.kellyMult) {
      kr.value = s.kellyMult;
      kr.style.setProperty('--fill', `${((s.kellyMult - 0.1) / 0.9) * 100}%`); // same maths as app.js, without re-firing input
    }
    const km = $('#km'); if (km) km.textContent = `${s.kellyMult}×`;
    root.querySelectorAll('[data-seg="round"] button').forEach((b) => { const on = +b.dataset.v === (+s.stakeRound || 0); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const an = $('[data-announce]'); if (an) an.checked = !!s.announceLive;
    // Book tiles: pressed state, and the state flag (it depends on the state).
    root.querySelectorAll('[data-book]').forEach((b) => {
      const book = api.bookById[b.dataset.book];
      const legal = ui.bookLegal(b.dataset.book, s.state);
      b.setAttribute('aria-pressed', String(s.books.includes(b.dataset.book)));
      b.classList.toggle('off', !legal);
      if (legal) b.removeAttribute('title'); else b.title = ui.illegalNote(b.dataset.book, s.state);
      const sm = b.querySelector('small'); if (sm) sm.textContent = legal ? (BOOK_KIND[book?.type] || '') : `Not in ${s.state}`;
    });
    const bc = $('[data-book-count]'); if (bc) bc.textContent = `${s.books.length} selected`;
    const pl = $('[data-plan-line]');
    if (pl) {
      const locked = s.plan === 'all-access' ? 0 : lockedCount();
      pl.innerHTML = s.plan === 'all-access'
        ? 'All-Access: every tool is unlocked. <a href="#/pricing">Compare plans</a>'
        : `<b data-bf-nodata>${ui.esc(ui.planName(s.plan))}</b>: <span data-bf-nodata>${locked}</span> tools show a lock on this plan. <a href="#/pricing">Compare plans</a>`;
    }
    const ex = $('[data-example]'); if (ex) ex.innerHTML = exampleHtml(s);
    const oe = $('[data-odds-ex]'); if (oe) oe.textContent = `${ui.fmtOdds(-110, s.oddsFormat)} / ${ui.fmtOdds(150, s.oddsFormat)}`;
  };
  // Tools the current plan lacks (ui.hasTool reads the plan just saved to the store).
  const lockedCount = () => new Set(plans.PLANS.flatMap((p) => [...p.tools, ...p.bonus.map((b) => b.tool)]).filter((t) => !ui.hasTool(t))).size;

  function wire() {
    ui.onSelect(root, 'state', (v) => store.set({ state: v }));
    ui.onSelect(root, 'plan', (v) => store.set({ plan: v }));
    ui.onSelect(root, 'odds', (v) => store.set({ oddsFormat: v }));
    ui.onSelect(root, 'goal', (v) => store.set({ goal: v }));
    ui.onSelect(root, 'risk', (v) => store.set({ riskPreset: v }));
    ui.onSeg(root, 'theme', (v) => themeMod.set(v));
    ui.onSeg(root, 'round', (v) => store.set({ stakeRound: +v }));
    ['bankroll', 'arbStake', 'unit'].forEach((k) => ui.onNumber(root, k, (v) => { if (v > 0) store.set({ [k]: v }); }));
    $('[data-kelly]').addEventListener('input', (e) => { $('#km').textContent = `${e.target.value}×`; store.set({ kellyMult: parseFloat(e.target.value) }); });
    $('[data-announce]').addEventListener('change', (e) => store.set({ announceLive: e.target.checked }));
    root.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
      const cur = new Set(store.get().books);
      if (cur.has(b.dataset.book)) cur.delete(b.dataset.book); else cur.add(b.dataset.book);
      store.set({ books: [...cur] });
    }));
    $('[data-rerun]').addEventListener('click', () => { store.set({ onboarded: false }); ui.toast('The setup card is back at the top of the Daily Card'); });
    $('[data-reset]').addEventListener('click', () => { store.reset(); draw(); ui.toast('Settings reset'); });
    // In-page section links: scroll without touching the route hash.
    root.querySelectorAll('[data-toc]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  draw();
  const offStore = store.subscribe((s) => sync(s));
  // Keep the theme seg in step with the top-bar toggle (and other tabs) without re-rendering the form.
  const offTheme = themeMod.onChange(({ pref }) => {
    root.querySelectorAll('[data-seg="theme"] button').forEach((b) => {
      const on = b.dataset.v === pref;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });
  return () => { offStore(); offTheme(); };
}

/** Kept for older callers: apply and store a theme preference ('light' | 'dark' | 'auto'). */
export function applyTheme(v) { themeMod.set(v); }
