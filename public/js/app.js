// App shell: sidebar navigation, top bar and hash router.
// Each screen is a module in js/pages/<route>.js exporting `default function render(root, ctx)`
// that may return a cleanup function (clear timers / unsubscribe).

import { api } from './data/adapter.js';
import { store } from './store.js';
import * as ui from './ui.js';
import * as odds from './lib/odds.js';
import { PLANS, ALL_ACCESS } from './plans.js';

export const NAV = [
  { group: 'Home', items: [
    ['daily', 'Daily Card', '◎'], ['pricing', 'Plans & Pricing', '★'],
  ] },
  { group: 'Arbitrage & EV', items: [
    ['arbitrage', 'Arbitrage', '⇄'], ['positive-ev', 'Positive EV', '↗'], ['middles', 'Middles', '⇔'],
    ['low-holds', 'Low Holds', '≈'], ['screen', 'Sportsbook Screen', '▦'], ['parlay-builder', 'Parlay Builder', '⧉'],
    ['ev-builder', 'Fair Odds Builder', '⚙'],
  ] },
  { group: 'Promos', items: [
    ['promo-converter', 'Promo Converter', '$'], ['promo-optimizer', 'Promo Optimizer', '✦'], ['boosts', 'Profit Boosts', '⚡'],
    ['deposit-optimizer', 'Deposit Optimizer', '⊕'],
  ] },
  { group: 'Signals', items: [
    ['sharp-money', 'Sharp Money', '◆'], ['bettor-signals', 'Pro Bettor Signals', '◉'],
  ] },
  { group: 'AI', items: [
    ['ai-picks', 'AI Sports Picks', '✧'], ['live-ai', 'Live AI Analysis', '◐'], ['prop-research', 'Prop Research', '☰'],
    ['ai-chat', 'Ask BetFriend AI', '✎'],
  ] },
  { group: 'Prediction Markets', items: [
    ['prediction-traders', 'Prediction Traders', '⟁'], ['pm-picks', 'AI Market Picks', '◇'], ['pm-markets', 'Markets & Order Book', '▤'],
    ['exit-alerts', 'Exit Alerts', '⏏'],
  ] },
  { group: 'My Betting', items: [
    ['tracker', 'Bet Tracker & Accounts', '▣'], ['alerts', 'Alerts', '🔔'], ['calculators', 'Calculators', '∑'], ['account', 'Settings', '☺'],
  ] },
];
const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map(([id, label]) => [id, label])));

function shell() {
  const s = store.get();
  document.getElementById('app').innerHTML = `
  <aside class="side" id="side">
    <a class="brand" href="#daily" aria-label="BetFriend home"><img src="../img/mate-face-deep.svg" width="34" height="34" alt=""><span class="bf-word" aria-hidden="true">Bet<span>Friend</span></span></a>
    <nav>${NAV.map((g) => `<div class="nav-group"><div class="nav-h">${g.group}</div>${g.items.map(([id, label, ic]) =>
      `<a href="#${id}" data-route="${id}"><span class="ic">${ic}</span>${label}</a>`).join('')}</div>`).join('')}</nav>
    <div class="side-foot"><a href="#pricing" class="btn lime block">All-Access · $${ALL_ACCESS.monthly}/mo</a></div>
  </aside>
  <div class="side-bg" id="side-bg"></div>
  <div class="main">
    <div class="topbar">
      <button class="icon-btn menu" id="menu" aria-label="Menu">☰</button>
      <div class="crumb" id="crumb"></div>
      <div class="top-right">
        <span class="pill demo" title="Prototype running on sample data. Real feeds connect in js/data/adapter.js">Prototype · sample data</span>
        <label class="top-field">State <select id="top-state">${api.states.map((st) => `<option ${st.code === s.state ? 'selected' : ''}>${st.code}</option>`).join('')}</select></label>
        <a class="top-field bank" href="#account">Bankroll <strong id="top-bank">${odds.money(s.bankroll, 0)}</strong></a>
        <a class="avatar" href="#account" aria-label="Settings">JD</a>
      </div>
    </div>
    <main id="view" tabindex="-1"></main>
  </div>`;
  document.getElementById('menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  document.getElementById('side-bg').addEventListener('click', () => document.body.classList.remove('nav-open'));
  document.getElementById('top-state').addEventListener('change', (e) => store.set({ state: e.target.value }));
  store.subscribe((st) => { document.getElementById('top-bank').textContent = odds.money(st.bankroll, 0); document.getElementById('top-state').value = st.state; });
}

let cleanup = null;
let renderSeq = 0;

async function route() {
  const hash = location.hash.replace(/^#\/?/, '') || 'daily';
  const [id, qs] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  document.body.classList.remove('nav-open');
  ui.closeDrawer();
  document.querySelectorAll('[data-route]').forEach((a) => a.classList.toggle('on', a.dataset.route === id));
  document.getElementById('crumb').textContent = TITLES[id] || 'BetFriend';
  document.title = `${TITLES[id] || 'BetFriend'} · BetFriend`;
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const view = document.getElementById('view');
  const seq = ++renderSeq;
  view.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const mod = await import(`./pages/${id}.js`);
    if (seq !== renderSeq) return;
    view.innerHTML = '';
    const page = document.createElement('div');
    view.appendChild(page);
    const ctx = { api, store, ui, odds, plans: { PLANS, ALL_ACCESS }, params, navigate: (to) => { location.hash = to.includes('?') ? `#/${to}` : `#${to}`; } };
    cleanup = mod.default(page, ctx) || null;
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    if (seq !== renderSeq) return;
    view.innerHTML = `${ui.header({ title: TITLES[id] || 'Not found' })}${ui.empty('This screen could not load.')}`;
  }
}

try {
  const t = localStorage.getItem('bf-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch { /* storage unavailable */ }
shell();
window.addEventListener('hashchange', route);
route();
