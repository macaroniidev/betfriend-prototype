// Small UI kit shared by all screens. Screens build HTML strings and use these helpers
// so every page looks and behaves the same. CSS classes live in css/app.css.

import { api } from './data/adapter.js';
import { fmtAmerican, pct, money } from './lib/odds.js';
import { plansForTool } from './plans.js';

/** Escaped text for an uppercase Barlow heading: keeps the capital F in "BetFriend" (DESIGN.md §0). */
export const headText = (s) => esc(s).replace(/BetFriend/g, '<span class="bf-name">BetFriend</span>');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { fmtAmerican, pct, money };

/** Book chip with brand color. */
export function book(id, { full = false } = {}) {
  const b = api.bookById[id];
  if (!b) return `<span class="book">${esc(id)}</span>`;
  return `<span class="book" style="--bk:${b.color}" title="${esc(b.name)}"><i></i>${esc(full ? b.name : b.short)}</span>`;
}
export const price = (am, { best = false } = {}) => `<span class="price${best ? ' best' : ''}">${fmtAmerican(am)}</span>`;
export const edge = (x, { label } = {}) => `<span class="edge ${x >= 0 ? 'pos' : 'neg'}">${label ? esc(label) + ' ' : ''}${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%</span>`;
export const sport = (s) => `<span class="tag sport">${esc(s)}</span>`;
export const tag = (text, kind = '') => `<span class="tag ${kind}">${esc(text)}</span>`;
export const liveDot = () => `<span class="live-dot">LIVE</span>`;

export function when(ts) {
  const d = ts - Date.now();
  if (d < 0) return 'Started';
  const h = d / 3600e3;
  if (h < 1) return `in ${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `in ${Math.round(h)}h`;
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}
export const ago = (ts) => {
  const m = (Date.now() - ts) / 60e3;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

/** Event cell: "Away @ Home" with sport + time/live. */
export function eventCell(eventId) {
  const e = api.eventById(eventId);
  if (!e) return '';
  return `<div class="evt"><div class="evt-name">${esc(e.away)} <span class="muted">@</span> ${esc(e.home)}</div>
    <div class="evt-meta">${sport(e.sport)} ${e.live ? `${liveDot()} <span class="muted">${esc(e.clock)} · ${e.score.away}-${e.score.home}</span>` : `<span class="muted">${when(e.start)}</span>`}</div></div>`;
}

/** Page header. `tool` = route id, used to show which plans include this tool. */
export function header({ title, subtitle = '', tool, actions = '' }) {
  const plans = tool ? plansForTool(tool) : [];
  return `<header class="page-head">
    <div><h1>${headText(title)}</h1>${subtitle ? `<p class="sub">${subtitle}</p>` : ''}
    ${plans.length ? `<div class="incl">Included in ${plans.map((p) => `<a href="#/pricing" class="tag plan">${esc(p.name)}</a>`).join(' ')} <a href="#/pricing" class="tag plan aa">All-Access</a></div>` : ''}</div>
    <div class="head-actions">${actions}</div></header>`;
}

/** Segmented control. Returns HTML; wire with onSeg(root, name, cb). */
export function seg(name, options, value) {
  return `<div class="seg" data-seg="${esc(name)}">${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" data-v="${esc(v)}" class="${String(v) === String(value) ? 'on' : ''}">${esc(l)}</button>`;
  }).join('')}</div>`;
}
export function onSeg(root, name, cb) {
  root.querySelectorAll(`[data-seg="${name}"] button`).forEach((b) => b.addEventListener('click', () => cb(b.dataset.v)));
}

/** Select control. */
export function select(name, options, value, label = '') {
  return `<label class="field">${label ? `<span>${esc(label)}</span>` : ''}<select data-sel="${esc(name)}">${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('')}</select></label>`;
}
export function onSelect(root, name, cb) {
  root.querySelector(`[data-sel="${name}"]`)?.addEventListener('change', (e) => cb(e.target.value));
}

export function numberInput(name, value, label, { prefix = '', step = 1, min = 0 } = {}) {
  return `<label class="field"><span>${esc(label)}</span><div class="num">${prefix ? `<em>${esc(prefix)}</em>` : ''}<input type="number" data-num="${esc(name)}" value="${esc(value)}" step="${step}" min="${min}"></div></label>`;
}
export function onNumber(root, name, cb) {
  root.querySelector(`[data-num="${name}"]`)?.addEventListener('input', (e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) cb(v); });
}

/** KPI tiles row: [{label, value, note}] */
export const stats = (items) => `<div class="stats">${items.map((s) => `<div class="stat"><span>${esc(s.label)}</span><strong class="${s.tone || ''}">${s.value}</strong>${s.note ? `<small>${s.note}</small>` : ''}</div>`).join('')}</div>`;

export const empty = (msg) => `<div class="empty">${esc(msg)}</div>`;

/** Button that opens the sportsbook / market (deep link placeholder). */
export const betBtn = (bookId, label = 'Bet') => `<button class="btn sm primary" data-bet="${esc(bookId)}">${esc(label)} ${book(bookId)}</button>`;
export function wireBetButtons(root) {
  root.querySelectorAll('[data-bet]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    toast(`Opening ${api.bookById[b.dataset.bet]?.name || 'book'} bet slip…`);
  }));
}

/** Slide-over drawer for detail views. Returns the drawer body element. */
export function drawer(title, html, { wide = false } = {}) {
  closeDrawer();
  const el = document.createElement('div');
  el.className = 'drawer-wrap';
  el.innerHTML = `<div class="drawer-bg"></div><aside class="drawer${wide ? ' wide' : ''}" role="dialog" aria-label="${esc(title)}">
    <header><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></header><div class="drawer-body">${html}</div></aside>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  el.querySelector('.drawer-bg').addEventListener('click', closeDrawer);
  el.querySelector('[data-close]').addEventListener('click', closeDrawer);
  return el.querySelector('.drawer-body');
}
export function closeDrawer() { document.querySelectorAll('.drawer-wrap').forEach((d) => d.remove()); }

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2400);
}

/** "Log bet" helper: adds to the tracker and confirms. */
export function logBet(bet) {
  api.tracker.add(bet);
  toast('Added to your Bet Tracker');
}

/** Mini sparkline SVG from numbers. */
export function spark(values, { w = 120, h = 32, color = 'var(--accent)' } = {}) {
  if (!values.length) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1 || 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.6" points="${pts}"/></svg>`;
}

/** Confidence meter 0..1 */
export const meter = (x, label = '') => `<span class="meter" title="${esc(label || pct(x, 0))}"><i style="width:${Math.round(x * 100)}%"></i></span>`;
