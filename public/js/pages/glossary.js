// Glossary (item B12): every betting term the app uses, in plain English, grouped like js/glossary.js.
// Reached from the sidebar (Me → Glossary), the command palette and the "Glossary" link in every term
// popover (ui.term). #/glossary?t=<key> scrolls to that entry and highlights it.
//
// Editor contract: the H1 and the group h2s are static text; each group is a <section class="sec"> panel;
// the filter field only hides entries (never rewrites their text), so owner text overrides stay applied.

import { groups, lookup } from '../glossary.js';

const STYLE = `
.gl .gl-find { display: flex; align-items: flex-end; gap: 10px 14px; flex-wrap: wrap; margin: 0 0 6px; }
.gl .gl-find .field { flex: 0 1 360px; }
.gl .gl-find input { width: 100%; min-height: 40px; }
.gl .gl-count { font-size: var(--t-sm); font-weight: 700; color: var(--muted); padding-bottom: 10px; }
.gl .gl-list { margin: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
.gl .gl-item { display: grid; grid-template-columns: minmax(160px, 240px) minmax(0, 1fr); gap: 4px 20px; padding: 10px 8px; border-bottom: 1px solid var(--line-2); border-radius: 8px; scroll-margin-top: calc(var(--topbar-h) + 16px); }
.gl .gl-item[hidden] { display: none; }
.gl .gl-item.is-target { background: var(--hl); box-shadow: inset 4px 0 0 var(--g); }
.gl .gl-item dt { margin: 0; font-weight: 800; font-size: var(--t-body); }
.gl .gl-item dd { margin: 0; font-size: var(--t-body); line-height: 1.5; max-width: 72ch; }
.gl .gl-item .gl-long { display: block; margin-top: 4px; color: var(--muted); font-size: var(--t-sm); }
.gl .gl-see { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 6px; font-size: var(--t-sm); color: var(--muted); font-weight: 700; }
.gl .sec[hidden] { display: none; }
.gl .gl-none[hidden] { display: none; }
@media (max-width: 860px) {
  .gl .gl-item { grid-template-columns: minmax(0, 1fr); padding: 10px 4px; }
}
`;

export default function render(root, ctx) {
  const { ui, params } = ctx;
  if (!document.getElementById('css-glossary')) {
    const s = document.createElement('style'); s.id = 'css-glossary'; s.textContent = STYLE; document.head.appendChild(s);
  }
  const all = groups();
  const total = all.reduce((n, g) => n + g.items.length, 0);
  const seeLinks = (keys = []) => keys.map((k) => lookup(k)).filter(Boolean)
    .map((e) => `<a href="#/glossary?t=${ui.esc(e.key)}" data-gl-jump="${ui.esc(e.key)}">${ui.esc(e.term)}</a>`).join('');

  root.innerHTML = `<div class="gl">
    ${ui.pageHead({
      title: 'Glossary',
      subtitle: 'Every betting term BetFriend uses, in plain English. Tap a dotted term anywhere in the app for the short version.',
    })}
    <div class="gl-find" role="search">
      <label class="field"><span>Find a term</span><input type="search" class="input" data-gl-q placeholder="e.g. hold, Kelly, CLV" autocomplete="off"></label>
      <span class="gl-count" data-gl-count data-bf-nodata aria-live="polite">${total} terms</span>
    </div>
    ${all.map((g) => ui.sec(g.group, `<dl class="gl-list">${g.items.map((e) => `
      <div class="gl-item" id="term-${ui.esc(e.key)}" data-gl-key="${ui.esc(e.key)}">
        <dt>${ui.esc(e.term)}</dt>
        <dd>${ui.esc(e.short)}${e.long ? `<span class="gl-long">${ui.esc(e.long)}</span>` : ''}${e.see?.length ? `<span class="gl-see"><span>See also</span>${seeLinks(e.see)}</span>` : ''}</dd>
      </div>`).join('')}</dl>`, { cls: 'gl-group' })).join('')}
    <div class="gl-none" data-gl-none hidden>${ui.empty({ title: 'No term matches', msg: 'Try a shorter word, or clear the search to see every term.', actions: [{ label: 'Clear search', act: 'gl-clear' }] })}</div>
  </div>`;

  const q = root.querySelector('[data-gl-q]');
  const items = [...root.querySelectorAll('.gl-item')];
  // Filter on the code text (term + definition); hiding only, so owner wording overrides stay applied.
  const hay = new Map(items.map((el) => [el, el.textContent.toLowerCase()]));
  function filter() {
    const v = q.value.trim().toLowerCase();
    let n = 0;
    for (const el of items) { const on = !v || hay.get(el).includes(v); el.hidden = !on; if (on) n++; }
    root.querySelectorAll('.gl-group').forEach((s) => { s.hidden = ![...s.querySelectorAll('.gl-item')].some((el) => !el.hidden); });
    root.querySelector('[data-gl-count]').textContent = v ? `${n} of ${total} terms` : `${total} terms`;
    root.querySelector('[data-gl-none]').hidden = n > 0;
  }
  q.addEventListener('input', filter);
  ui.onAction(root, { 'gl-clear': () => { q.value = ''; filter(); q.focus(); } });

  // #/glossary?t=<key>: scroll to the entry and mark it (also for "See also" links on this page).
  function target(key, { smooth = false } = {}) {
    const e = lookup(key);
    const el = e && root.querySelector(`[data-gl-key="${CSS.escape(e.key)}"]`);
    items.forEach((x) => x.classList.toggle('is-target', x === el));
    if (!el) return;
    if (el.hidden) { q.value = ''; filter(); }
    el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  }
  root.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-gl-jump]');
    if (!a) return;
    ev.preventDefault();
    history.replaceState(null, '', `#/glossary?t=${encodeURIComponent(a.dataset.glJump)}`);
    target(a.dataset.glJump, { smooth: true });
  });
  // After the router's scroll-to-top for a fresh render.
  let raf = 0;
  if (params.t) raf = requestAnimationFrame(() => target(params.t));
  return () => cancelAnimationFrame(raf);
}
