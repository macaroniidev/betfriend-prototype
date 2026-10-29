// Ask BetFriend AI: chat over the app's live data (arbs, +EV, picks, sharps, promos, live games, markets).
//
// Layout (items C11 / B16 / B17):
// - One chat column. Suggestions live only in the empty state, next to Coach Mate on a green tile, with
//   "What I can do" as a check list (no duplicate chip rows in the composer or a side rail).
// - Phones: the chat is a 100dvh column with a sticky composer (16px input, 48px Send), so it never zooms.
// - Answer cards follow the money-action contract: one primary per card (Bet both for two-sided plays,
//   which opens the shared slip instead of a single leg), labelled ghosts, one risk label.

import { openSlip } from '../slips.js';

const KEY = 'bf-ai-chat-v1';
const DEFAULT_PROMPTS = ['Best arb right now', 'Best +EV bet', 'Top AI picks today', 'What are the sharps on?', 'Best promo in NJ', 'Lakers tonight', 'Parlay ideas', 'Prediction market picks', 'Explain CLV', 'Explain middles'];
// Card kind -> [tag text, tag style]. Live games use the live dot instead of a tag (no red fills).
const KIND = { arb: ['Arb', 'dark'], ev: ['+EV', 'pos'], middle: ['Middle', ''], lowhold: ['Low hold', ''], 'ai-pick': ['AI pick', 'dark'], live: ['Live edge', ''],
  sharp: ['Sharp', 'warn'], signal: ['Pro bettor', 'warn'], promo: ['Promo', 'pos'], prediction: ['Market', ''], line: ['Line', ''] };
// Two-sided plays: always bet (and logged) as a set through the shared slip, never one leg at a time.
const TWO_SIDED = { arb: 'arbs', middle: 'middles', lowhold: 'lowHolds' };
const CAN_DO = [
  'Find the best arb, +EV bet, middle or low-hold market right now',
  'Grade any team, game or player prop against our model',
  'Show what sharps and top bettors are on',
  'Rank promos in your state by cash value',
  'Read live games and suggest in-game bets',
  'Pick prediction-market contracts with edge',
  'Explain arbitrage, +EV, CLV, Kelly and more',
];

const CSS = `
.aic .page-head.ph { margin-bottom: 12px; }
.aic .chat { display:flex; flex-direction:column; height:calc(100dvh - var(--topbar-h) - 170px); min-height:480px;
  border:2px solid var(--line); border-radius:var(--r); background:var(--paper); overflow:hidden; }
.aic .msgs { flex:1; overflow-y:auto; overscroll-behavior:contain; padding:20px 20px 12px; display:flex; flex-direction:column; gap:18px; }
.aic .msg { display:flex; gap:10px; max-width:100%; }
.aic .msg.user { justify-content:flex-end; }
.aic .av { flex:0 0 32px; height:32px; border-radius:9px; background:var(--g); display:grid; place-items:center; }
.aic .av img { width:22px; height:22px; display:block; }
.aic .bub { border-radius:14px; padding:10px 14px; max-width:min(680px, 100%); min-width:0; font-size:var(--t-body); line-height:1.5; }
.aic .msg.user .bub { background:var(--deep); color:#FFFFFF; border-bottom-right-radius:4px; font-weight:600; }
.aic .msg.ai .bub { background:var(--panel); border-top-left-radius:4px; }
.aic .msg.ai .body { flex:1; min-width:0; display:grid; gap:10px; max-width:760px; }
.aic .txt p { margin:0 0 8px; } .aic .txt p:last-child { margin:0; }
/* Answer cards: flat, one level, ruled; the primary is the only filled button. */
.aic .cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px; }
.aic .oc { padding:12px 14px; display:grid; gap:8px; font-size:var(--t-sm); border:2px solid var(--line); border-radius:12px; background:var(--paper); }
.aic .oc-top { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.aic .oc-top .edge { margin-left:auto; }
.aic .oc-t { font:900 var(--t-md)/1.2 var(--f-head); text-transform:uppercase; letter-spacing:.01em; }
.aic .oc-e { font-size:var(--t-xs); color:var(--muted); margin-top:2px; }
.aic .oc-legs { display:grid; gap:4px; }
.aic .oc-leg { display:flex; gap:8px; align-items:center; min-width:0; }
.aic .oc-leg span.o { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; font-weight:600; }
.aic .oc-n { font-size:var(--t-xs); color:var(--muted); }
.aic .oc .row-acts { justify-content:flex-start; flex-wrap:wrap; border-top:1px solid var(--line-2); padding-top:8px; }
.aic .fu { display:flex; gap:6px; flex-wrap:wrap; }
.aic .typing { display:inline-flex; gap:4px; padding:4px 2px; }
.aic .typing i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation: aic-b 1s infinite; }
.aic .typing i:nth-child(2) { animation-delay:.15s; } .aic .typing i:nth-child(3) { animation-delay:.3s; }
@keyframes aic-b { 0%, 80%, 100% { opacity:.25; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
/* Composer: sticky at the bottom of the column; 16px input so phones never zoom, 48px Send. */
.aic .composer { border-top:2px solid var(--line); padding:12px; background:var(--paper); position:sticky; bottom:0; }
.aic .composer form { display:flex; gap:8px; align-items:stretch; }
.aic .composer input { flex:1; min-width:0; min-height:48px; border:2px solid var(--line-strong); background:var(--paper); border-radius:10px; padding:10px 14px; color:var(--text); font-size:16px; }
.aic .composer .btn { min-height:48px; padding-inline:22px; }
/* Empty state: Coach Mate on a green tile, then "Try asking" and "What I can do". */
.aic .aic-empty { display:grid; gap:18px; max-width:980px; width:100%; margin:0 auto; }
.aic .aic-empty .mate-tile h2 { font-size:30px; margin:0 0 6px; }
.aic .aic-empty .mate-tile p { margin:0; max-width:56ch; }
.aic .aic-empty-grid { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:18px 28px; }
.aic .aic-empty-grid h3 { font-size:var(--t-lg); margin:0 0 10px; }
.aic .aic-try .chips { gap:8px; }
.aic .aic-try .chip { font-size:var(--t-sm); padding:7px 12px; }
.aic .aic-can .bf2-checks { gap:8px; font-size:var(--t-sm); }
.aic .aic-empty .related { margin-top:0; }
@media (max-width:860px) {
  /* Head stays one row (title + New chat); the subtitle is behind the clamp's More. */
  .aic .page-head.ph { grid-template-columns:minmax(0,1fr) auto; align-items:center; margin-bottom:10px; }
  .aic .page-head.ph .ph-sub { display:none; }
  .aic .chat { height:calc(100dvh - var(--topbar-h) - 108px); min-height:400px; margin:0 -6px; }
  .aic .msgs { padding:14px 10px; gap:14px; }
  .aic .cards { grid-template-columns:1fr; }
  .aic .msg.ai .av { display:none; }
  .aic .bub { max-width:100%; }
  .aic .aic-empty-grid { grid-template-columns:1fr; }
  .aic .aic-empty .mate-tile { padding:14px; gap:12px; }
  .aic .aic-empty .mate-tile h2 { font-size:var(--t-xl); }
  .aic .composer { padding:10px; }
}
`;

export default function render(root, ctx) {
  const { api, store, ui, odds, params } = ctx;
  if (!document.getElementById('css-ai-chat')) document.head.insertAdjacentHTML('beforeend', `<style id="css-ai-chat">${CSS}</style>`);
  let msgs = [];
  try { msgs = JSON.parse(sessionStorage.getItem(KEY) || '[]'); if (!Array.isArray(msgs)) msgs = []; } catch { msgs = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch { /* storage unavailable */ } };
  let typing = false;
  let timer = null;
  const prompts = () => {
    const st = store.get().state;
    return (api.picks?.SUGGESTED || DEFAULT_PROMPTS).map((p) => p.replace(/in NJ$/, `in ${st}`));
  };

  root.innerHTML = `<div class="aic">
    ${ui.pageHead({ title: 'Ask BetFriend AI', tool: 'ai-chat',
      subtitle: 'Ask anything: the best bet right now, a team or player, what the sharps are on, a promo in your state, or what a term means. Answers use live prices from every book.',
      actions: '<button type="button" class="btn sm outline" id="aic-clear">New chat</button>' })}
    <div class="chat">
      <div class="msgs" id="aic-msgs" aria-live="polite"></div>
      <div class="composer">
        <form id="aic-form"><input id="aic-in" type="text" autocomplete="off" enterkeyhint="send" placeholder="Ask about a bet, team, player or strategy…" aria-label="Message"><button class="btn primary" type="submit">Send</button></form>
      </div>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  // Wording guard: the sample answer engine (data/picks.js) still says "guaranteed" / "locks in" in a few
  // answers. The app never promises a sure thing (DESIGN.md, item B5), so those phrases are rewritten
  // for display. The numbers are untouched.
  const tidy = (t) => String(t || '')
    .replace(/for a guaranteed (\*\*[^*]+\*\*) return/g, 'for a $1 return if both legs fill')
    .replace(/locks in about (\*\*[^*]+\*\*)/g, 'pays about $1 if both legs fill')
    .replace(/betting every outcome locks in profit/g, 'betting every outcome pays a profit if every leg fills')
    .replace(/ranked by guaranteed value/g, 'ranked by cash value')
    .replace(/\b(you typically )lock in\b/gi, '$1keep')
    .replace(/\s+guaranteed\b/gi, ' if both legs fill')
    .replace(/\brisk[- ]free\b/gi, 'hedged');
  const fmt = (t) => ui.esc(tidy(t)).split(/\n{2,}/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`).join('');

  // Prop cards link to Prop Research for that player and stat (cross-tool path, B17).
  const propFor = (c) => (c.lineId ? api.research?.props?.().find((p) => p.lineId === c.lineId) : null);
  // The live two-sided opportunity behind a card (the slip re-prices it), or null when it has closed.
  const oppFor = (c) => {
    const fn = TWO_SIDED[c.kind] && api[TWO_SIDED[c.kind]];
    if (!fn) return null;
    const list = fn({ books: store.get().books }) || [];
    return list.find((o) => o.event === c.event && o.label === c.label) || list.find((o) => o.eventId === c.eventId && o.legs?.length === c.legs?.length) || null;
  };

  function card(c, mi, ci) {
    const [kl, kc] = KIND[c.kind] || [c.kind, ''];
    const leg0 = c.legs?.[0];
    const pricedLegs = (c.legs || []).filter((l) => typeof l.price === 'number');
    const ev = c.eventId ? api.eventById(c.eventId) : null;
    const two = !!TWO_SIDED[c.kind] && (c.legs?.length || 0) > 1;
    const unit = store.get().unit;
    let primary = '';
    if (two) primary = ui.betAction({ verb: c.legs.length === 2 ? 'Bet both' : `Bet all ${c.legs.length}`, act: 'slip', title: 'Opens the slip with one button per leg' });
    else if (leg0) {
      const verb = c.kind === 'promo' ? 'Claim' : c.kind === 'prediction' ? 'Trade' : 'Bet';
      primary = ui.betAction({ verb, amount: c.kind === 'promo' || c.kind === 'prediction' ? '' : odds.money(unit, 0), book: leg0.book });
    }
    const prop = c.market === 'Player Prop' ? propFor(c) : null;
    const ghosts = [];
    if (pricedLegs.length) ghosts.push(['log', 'Log']);
    if (prop) ghosts.push(['research', 'Research', { href: `#/prop-research?player=${encodeURIComponent(prop.player)}&stat=${encodeURIComponent(prop.stat)}` }]);
    return `<div class="oc" data-key="${mi}:${ci}">
      <div class="oc-top">${ui.tag(kl, kc)}${c.grade ? ` ${ui.tag(c.grade, 'dark')}` : ''}${c.sport ? ` ${ui.sport(c.sport)}` : ''}${ev?.live ? ` ${ui.liveDot()}` : ''} ${ui.risk(c.kind === 'ai-pick' || c.kind === 'line' ? 'ai' : c.kind, { short: true })}${typeof c.edge === 'number' ? ui.edge(c.edge) : ''}</div>
      <div><div class="oc-t">${ui.esc(c.title)}</div>${c.event ? `<div class="oc-e">${ui.esc(c.event)}${c.label && c.label !== c.title && c.kind !== 'ai-pick' ? ` · ${ui.esc(c.label)}` : ''}</div>` : ''}</div>
      ${c.legs?.length ? `<div class="oc-legs">${c.legs.map((l) => `<div class="oc-leg">${ui.book(l.book)}<span class="o">${ui.esc(l.outcome)}</span>${typeof l.price === 'number' ? ui.price(l.price, { best: true }) : typeof l.cents === 'number' ? ui.cents(l.cents) : ''}</div>`).join('')}</div>` : ''}
      ${c.note ? `<div class="oc-n">${ui.esc(tidy(c.note))}</div>` : ''}
      ${primary || ghosts.length ? ui.actions(primary, ghosts) : ''}
    </div>`;
  }

  function emptyState() {
    return `<div class="aic-empty">
      ${ui.mate(`<h2>What are we betting on?</h2><p>I watch every book, the sharps and our pick model in real time. Ask me anything, or start with a suggestion below.</p>`, { pose: 'gameplan' })}
      <div class="aic-empty-grid">
        <section class="aic-try"><h3>Try asking</h3><div class="chips">${prompts().map((p) => `<button type="button" class="chip" data-ask="${ui.esc(p)}">${ui.esc(p)}</button>`).join('')}</div></section>
        <section class="aic-can"><h3>What I can do</h3>${ui.checks(CAN_DO.map(ui.esc))}</section>
      </div>
      ${ui.related([['ai-picks', 'AI Sports Picks'], ['prop-research', 'Prop Research'], ['live-ai', 'Live AI Analysis']], 'Or open a tool')}
    </div>`;
  }

  function draw() {
    const el = $('#aic-msgs');
    if (!msgs.length && !typing) el.innerHTML = emptyState();
    else {
      el.innerHTML = msgs.map((m, mi) => (m.role === 'user'
        ? `<div class="msg user"><div class="bub" data-bf-nodata>${ui.esc(m.text)}</div></div>`
        : `<div class="msg ai"><span class="av" aria-hidden="true"><img src="../img/mate-face.svg" alt=""></span><div class="body"><div class="bub txt" data-bf-nodata>${fmt(m.text)}</div>
            ${m.cards?.length ? `<div class="cards" data-bf-nodata>${m.cards.map((c, ci) => card(c, mi, ci)).join('')}</div>` : ''}
            ${m.followUps?.length && mi === msgs.length - 1 ? `<div class="fu" data-bf-nodata>${m.followUps.map((f) => `<button type="button" class="chip" data-ask="${ui.esc(f)}">${ui.esc(f)}</button>`).join('')}</div>` : ''}
          </div></div>`)).join('') + (typing ? '<div class="msg ai"><span class="av" aria-hidden="true"><img src="../img/mate-face.svg" alt=""></span><div class="bub"><span class="typing" role="status" aria-label="BetFriend AI is typing"><i></i><i></i><i></i></span></div></div>' : '');
    }
    // The empty state reads from the top (Coach Mate first); a conversation sticks to its latest message.
    el.scrollTop = msgs.length || typing ? el.scrollHeight : 0;
  }

  /** Log a card: two-sided plays as one linked group (exclusive for arbs/low holds), others leg by leg. */
  function logCard(c, btn) {
    const legs = (c.legs || []).filter((x) => typeof x.price === 'number');
    if (!legs.length) return;
    const base = { sport: c.sport || 'NBA', market: c.market || 'Moneyline', eventId: c.eventId };
    if (TWO_SIDED[c.kind] && legs.length > 1) {
      const total = store.get().arbStake || 1000;
      const { stakes } = odds.arbStakes(legs.map((l) => l.price), total);
      api.tracker.addGroup(legs.map((l, i) => ({ ...base, kind: c.kind, book: l.book, price: l.price, stake: Math.round(stakes[i] * 100) / 100, selection: `${l.outcome} (${c.label || c.title})` })), { exclusive: c.kind !== 'middle' });
      ui.toast(`Logged ${legs.length} linked legs to your Bet Tracker`);
    } else {
      const kind = { 'ai-pick': 'ai-pick', live: 'ai-pick', sharp: 'sharp', signal: 'signal', ev: 'ev', prediction: 'prediction' }[c.kind] || 'ai-pick';
      for (const l of legs) api.tracker.add({ ...base, kind, book: l.book, selection: c.title, price: l.price, stake: store.get().unit });
      ui.toast(legs.length > 1 ? `Logged ${legs.length} legs to your Bet Tracker` : 'Added to your Bet Tracker');
    }
    btn.innerHTML = '<span data-bf-text>Logged</span>';
    btn.setAttribute('aria-disabled', 'true');
  }

  // One delegated listener for the whole conversation (chips, Bet, Bet both, Log).
  const msgsEl = $('#aic-msgs');
  msgsEl.addEventListener('click', (e) => {
    const askB = e.target.closest('[data-ask]');
    if (askB) ask(askB.dataset.ask);
  });
  const cardOf = (key) => { const [mi, ci] = String(key || '').split(':').map(Number); return msgs[mi]?.cards?.[ci] || null; };
  ui.onAction(msgsEl, {
    slip: (key) => {
      const c = cardOf(key);
      const o = c && oppFor(c);
      if (o) openSlip(o, ctx);
      else ui.toast('That one just closed. Ask again for the current board.');
    },
    log: (key, el) => { const c = cardOf(key); if (c) logCard(c, el); },
  });

  function ask(q) {
    q = String(q || '').trim();
    if (!q || typing) return;
    msgs.push({ role: 'user', text: q, ts: Date.now() });
    typing = true;
    save(); draw();
    clearTimeout(timer);
    timer = setTimeout(() => {
      let res;
      try { res = api.picks?.answer?.(q, { state: store.get().state, books: store.get().books }); } catch (err) { console.error(err); }
      res ||= { text: 'I couldn\'t pull that up just now. Try one of these:', cards: [], followUps: prompts().slice(0, 4) };
      msgs.push({ role: 'ai', text: res.text, cards: res.cards || [], followUps: res.followUps || [], ts: Date.now() });
      typing = false;
      save(); draw();
    }, 650 + Math.min(900, q.length * 12));
  }

  $('#aic-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#aic-in');
    ask(inp.value);
    inp.value = '';
  });
  $('#aic-clear').addEventListener('click', () => { msgs = []; typing = false; clearTimeout(timer); save(); draw(); $('#aic-in').focus(); });

  draw();
  if (params.q) {
    ui.setQuery({ q: null });
    ask(params.q);
  }
  // The state name appears in a suggestion ("Best promo in NJ"): repaint the empty state when it changes.
  const unsub = store.subscribe(() => { if (!msgs.length && !typing) draw(); });
  return () => { clearTimeout(timer); unsub(); };
}
