// Ask BetFriend AI: chat over the app's live data (arbs, +EV, picks, sharps, promos, live games, markets).

const KEY = 'bf-ai-chat-v1';
const DEFAULT_PROMPTS = ['Best arb right now', 'Best +EV bet', 'Top AI picks today', 'What are the sharps on?', 'Best promo in NJ', 'Lakers tonight', 'Parlay ideas', 'Prediction market picks', 'Explain CLV', 'Explain middles'];
const KIND = { arb: ['Arb', 'dark'], ev: ['+EV', 'pos'], middle: ['Middle', ''], lowhold: ['Low hold', ''], 'ai-pick': ['AI pick', 'dark'], live: ['Live', 'neg'],
  sharp: ['Sharp', 'warn'], signal: ['Pro bettor', 'warn'], promo: ['Promo', 'pos'], prediction: ['Market', ''], line: ['Line', ''] };

const CSS = `
.aic .chat { display:flex; flex-direction:column; height:calc(100vh - 230px); min-height:460px; }
.aic .msgs { flex:1; overflow-y:auto; padding:18px 16px; display:flex; flex-direction:column; gap:16px; }
.aic .msg { display:flex; gap:10px; max-width:100%; }
.aic .msg.user { justify-content:flex-end; }
.aic .av { flex:0 0 30px; height:30px; border-radius:9px; background:var(--ink); color:var(--lime); display:grid; place-items:center; font:700 14px var(--serif); }
.aic .bub { border-radius:14px; padding:10px 14px; max-width:min(680px, 100%); min-width:0; }
.aic .msg.user .bub { background:var(--ink); color:#fff; border-bottom-right-radius:4px; }
.aic .msg.ai .bub { background:var(--panel); border:1px solid var(--line); border-top-left-radius:4px; }
.aic .msg.ai .body { flex:1; min-width:0; display:grid; gap:10px; max-width:720px; }
.aic .txt p { margin:0 0 8px; } .aic .txt p:last-child { margin:0; }
.aic .cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:10px; }
.aic .oc { padding:11px 12px; display:grid; gap:7px; font-size:13px; }
.aic .oc-top { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.aic .oc-top .edge { margin-left:auto; }
.aic .oc-t { font-weight:600; font-size:14px; line-height:1.3; }
.aic .oc-e { font-size:12px; color:var(--muted); }
.aic .oc-legs { display:grid; gap:4px; }
.aic .oc-leg { display:flex; gap:6px; align-items:center; font-size:12.5px; min-width:0; }
.aic .oc-leg span.o { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
.aic .oc-n { font-size:12px; color:var(--muted); }
.aic .oc-a { display:flex; gap:6px; flex-wrap:wrap; }
.aic .fu { display:flex; gap:6px; flex-wrap:wrap; }
.aic .typing { display:inline-flex; gap:4px; padding:4px 2px; }
.aic .typing i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation: aic-b 1s infinite; }
.aic .typing i:nth-child(2) { animation-delay:.15s; } .aic .typing i:nth-child(3) { animation-delay:.3s; }
@keyframes aic-b { 0%, 80%, 100% { opacity:.25; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
.aic .composer { border-top:1px solid var(--line); padding:12px; display:grid; gap:10px; }
.aic .composer form { display:flex; gap:8px; }
.aic .composer input { flex:1; min-width:0; border:1px solid var(--line); background:var(--paper); border-radius:10px; padding:10px 12px; color:var(--text); font-size:14px; }
.aic .composer input:focus { outline:2px solid var(--lime-2); border-color:var(--accent); }
.aic .sugg { display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
.aic .sugg .chip { flex:0 0 auto; }
.aic .welcome { text-align:center; padding:28px 12px 8px; display:grid; gap:8px; justify-items:center; }
.aic .welcome .av { width:48px; height:48px; flex-basis:48px; font-size:24px; border-radius:14px; }
.aic .aic-side { padding:16px; display:grid; gap:14px; }
.aic .aic-side ul { margin:0; padding-left:18px; display:grid; gap:6px; font-size:13px; }
.aic .aic-side .chips .chip { text-align:left; }
@media (max-width:1100px) { .aic .side-col { display:none; } }
@media (max-width:860px) {
  .aic .chat { height:calc(100vh - 170px); min-height:420px; }
  .aic .msgs { padding:14px 10px; }
  .aic .cards { grid-template-columns:1fr; }
  .aic .msg.ai .av { display:none; }
  .aic .bub { max-width:100%; }
  .aic .page-head .sub { display:none; }
}
`;

export default function render(root, ctx) {
  const { api, store, ui, params } = ctx;
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
    ${ui.header({ title: 'Ask BetFriend AI', tool: 'ai-chat',
      subtitle: 'Ask anything: the best bet right now, a team or player, what the sharps are on, a promo in your state, or what a term means. Answers use live prices from every book.',
      actions: '<button class="btn sm" id="aic-clear">New chat</button>' })}
    <div class="split">
      <section class="card chat">
        <div class="msgs" id="aic-msgs" aria-live="polite"></div>
        <div class="composer">
          <div class="sugg" id="aic-sugg"></div>
          <form id="aic-form"><input id="aic-in" type="text" autocomplete="off" placeholder="Ask about a bet, team, player or strategy…" aria-label="Message"><button class="btn primary" type="submit">Send</button></form>
        </div>
      </section>
      <aside class="side-col"><div class="card aic-side">
        <h3>What I can do</h3>
        <ul><li>Find the best arb, +EV bet, middle or low-hold market right now</li><li>Grade any team, game or player prop against our model</li>
          <li>Show what sharps and top bettors are on</li><li>Rank promos in your state by cash value</li><li>Read live games and suggest in-game bets</li><li>Pick prediction-market contracts with edge</li><li>Explain arbitrage, +EV, CLV, Kelly and more</li></ul>
        <h3>Try asking</h3><div class="chips" id="aic-side-chips"></div>
      </div></aside>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);

  const fmt = (t) => ui.esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`).join('');

  function card(c, mi, ci) {
    const [kl, kc] = KIND[c.kind] || [c.kind, ''];
    const leg0 = c.legs?.[0];
    const pricedLegs = (c.legs || []).filter((l) => typeof l.price === 'number');
    const ev = c.eventId ? api.eventById(c.eventId) : null;
    return `<div class="card oc">
      <div class="oc-top">${ui.tag(kl, kc)}${c.grade ? ` ${ui.tag(c.grade, 'dark')}` : ''}${c.sport ? ` ${ui.sport(c.sport)}` : ''}${ev?.live ? ` ${ui.liveDot()}` : ''}${typeof c.edge === 'number' ? ui.edge(c.edge) : ''}</div>
      <div><div class="oc-t">${ui.esc(c.title)}</div>${c.event ? `<div class="oc-e">${ui.esc(c.event)}${c.label && c.label !== c.title && c.kind !== 'ai-pick' ? ` · ${ui.esc(c.label)}` : ''}</div>` : ''}</div>
      ${c.legs?.length ? `<div class="oc-legs">${c.legs.map((l) => `<div class="oc-leg">${ui.book(l.book)}<span class="o">${ui.esc(l.outcome)}</span>${typeof l.price === 'number' ? ui.price(l.price, { best: true }) : typeof l.cents === 'number' ? `<span class="price">${l.cents}¢</span>` : ''}</div>`).join('')}</div>` : ''}
      ${c.note ? `<div class="oc-n">${ui.esc(c.note)}</div>` : ''}
      <div class="oc-a">${leg0 ? ui.betBtn(leg0.book, c.kind === 'promo' ? 'Claim' : c.kind === 'prediction' ? 'Trade' : 'Bet') : ''}
        ${pricedLegs.length ? `<button class="btn sm" data-log="${mi}:${ci}">+ Log</button>` : ''}</div>
    </div>`;
  }

  function draw() {
    const el = $('#aic-msgs');
    if (!msgs.length && !typing) {
      el.innerHTML = `<div class="welcome"><span class="av">B</span><h2>What are we betting on?</h2>
        <p class="muted" style="margin:0;max-width:440px">I watch every book, the sharps and our pick model in real time. Ask me anything, or start with a suggestion below.</p>
        <div class="chips" style="justify-content:center;margin-top:8px">${prompts().slice(0, 6).map((p) => `<button class="chip" data-ask="${ui.esc(p)}">${ui.esc(p)}</button>`).join('')}</div></div>`;
    } else {
      el.innerHTML = msgs.map((m, mi) => (m.role === 'user'
        ? `<div class="msg user"><div class="bub">${ui.esc(m.text)}</div></div>`
        : `<div class="msg ai"><span class="av">B</span><div class="body"><div class="bub txt">${fmt(m.text)}</div>
            ${m.cards?.length ? `<div class="cards">${m.cards.map((c, ci) => card(c, mi, ci)).join('')}</div>` : ''}
            ${m.followUps?.length && mi === msgs.length - 1 ? `<div class="fu">${m.followUps.map((f) => `<button class="chip" data-ask="${ui.esc(f)}">${ui.esc(f)}</button>`).join('')}</div>` : ''}
          </div></div>`)).join('') + (typing ? '<div class="msg ai"><span class="av">B</span><div class="bub"><span class="typing" aria-label="BetFriend AI is typing"><i></i><i></i><i></i></span></div></div>' : '');
    }
    el.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.ask)));
    ui.wireBetButtons(el);
    el.querySelectorAll('[data-log]').forEach((b) => b.addEventListener('click', () => {
      const [mi, ci] = b.dataset.log.split(':').map(Number);
      const c = msgs[mi]?.cards?.[ci];
      if (!c) return;
      const kind = { 'ai-pick': 'ai-pick', live: 'ai-pick', sharp: 'sharp', signal: 'signal', arb: 'arb', ev: 'ev', middle: 'middle', prediction: 'prediction' }[c.kind] || 'ai-pick';
      for (const l of c.legs.filter((x) => typeof x.price === 'number')) {
        api.tracker.add({ kind, book: l.book, sport: c.sport || 'NBA', market: c.market || 'Moneyline', selection: c.kind === 'arb' || c.kind === 'middle' ? `${l.outcome} (${c.label || c.title})` : c.title, price: l.price, stake: store.get().unit, eventId: c.eventId });
      }
      ui.toast(c.legs.length > 1 ? `Logged ${c.legs.length} legs to your Bet Tracker` : 'Added to your Bet Tracker');
      b.textContent = '✓ Logged'; b.disabled = true;
    }));
    el.scrollTop = el.scrollHeight;
  }

  function chips() {
    const html = prompts().map((p) => `<button class="chip" data-ask="${ui.esc(p)}">${ui.esc(p)}</button>`).join('');
    $('#aic-sugg').innerHTML = html;
    $('#aic-side-chips').innerHTML = html;
    root.querySelectorAll('#aic-sugg [data-ask], #aic-side-chips [data-ask]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.ask)));
  }

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
      res ||= { text: 'I couldn\'t pull that up just now. Try one of the suggestions below.', cards: [], followUps: prompts().slice(0, 4) };
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

  chips();
  draw();
  if (params.q) {
    try { history.replaceState(null, '', '#ai-chat'); } catch { /* not allowed in some frames */ }
    ask(params.q);
  }
  const unsub = store.subscribe(() => chips());
  return () => { clearTimeout(timer); unsub(); };
}
