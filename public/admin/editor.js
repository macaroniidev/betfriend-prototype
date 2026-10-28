// BetFriend visual editor (parent window). The site loads in an iframe in edit mode; frame.js inside it
// handles clicks, inline text editing and on-page block moves, and reports every change here.
// This window owns the draft documents, autosaves them, keeps undo history, and publishes.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));

const api = async (path, { method = 'GET', body, raw, headers = {} } = {}) => {
  const r = await fetch(`/admin/api/${path}`, {
    method, credentials: 'same-origin',
    headers: { 'X-BF-Admin': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  if (r.status === 401) { location.href = '/admin'; throw new Error('Logged out'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
};

// ---------- state ----------
const S = {
  docs: { landing: null, app: null },
  codeBlocks: [],
  page: 'landing',          // 'landing' or 'app:<route>'
  device: 'desktop',
  mode: 'edit',
  frame: null,              // frame API once ready
  selection: null,
  undo: [], redo: [],
  dirty: new Set(),
  saving: false,
  unpublished: { landing: false, app: false },
  routes: [],
};
const docKey = () => (S.page === 'landing' ? 'landing' : 'app');
const appRoute = () => (S.page.startsWith('app:') ? S.page.slice(4) : null);

function emptyDoc(page) {
  return page === 'landing' ? { order: [], blocks: {}, regions: {} } : { text: {}, layout: {}, custom: {}, images: {}, plans: {} };
}

// ---------- toast / status ----------
let toastT;
function toast(msg, { error = false } = {}) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('err', error); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), error ? 4200 : 2200);
}
function status() {
  const el = $('#status');
  if (S.saving) { el.textContent = 'Saving draft…'; el.className = 'ed-status'; return; }
  if (S.dirty.size) { el.textContent = 'Unsaved changes…'; el.className = 'ed-status'; return; }
  const pending = S.unpublished.landing || S.unpublished.app;
  el.textContent = pending ? 'Draft saved · not published yet' : 'All changes are live';
  el.className = `ed-status${pending ? ' warn' : ''}`;
  $('#undo').disabled = !S.undo.length;
  $('#redo').disabled = !S.redo.length;
}

// ---------- saving ----------
let saveT;
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(flush, 700); status(); }
/** Save every changed draft. Safe to call any time: concurrent calls wait for the save in progress. */
let savePromise = null;
async function flush() {
  clearTimeout(saveT);
  while (savePromise) await savePromise;
  if (!S.dirty.size) return;
  savePromise = (async () => {
    S.saving = true; status();
    const pages = [...S.dirty]; S.dirty.clear();
    try {
      for (const p of pages) { await api(`draft/${p}`, { method: 'PUT', body: S.docs[p] }); S.unpublished[p] = true; }
    } catch (e) {
      pages.forEach((p) => S.dirty.add(p));
      toast(`Couldn't save: ${e.message}`, { error: true });
    } finally { S.saving = false; savePromise = null; status(); }
  })();
  await savePromise;
}
window.addEventListener('beforeunload', (e) => { if (S.dirty.size || S.saving) { flush(); e.preventDefault(); e.returnValue = ''; } });

/** Every edit goes through here: snapshot for undo, mutate, autosave. */
function change(page, mutate, { reload = false } = {}) {
  S.undo.push({ page, doc: clone(S.docs[page]) });
  if (S.undo.length > 80) S.undo.shift();
  S.redo = [];
  S.docs[page] = S.docs[page] || emptyDoc(page);
  mutate(S.docs[page]);
  S.dirty.add(page);
  scheduleSave();
  if (reload) reloadFrame(); else if (page === 'app') S.frame?.setAppDoc?.(S.docs.app);
  renderBlocks();
}
async function undoRedo(from, to) {
  const step = from.pop();
  if (!step) return;
  to.push({ page: step.page, doc: clone(S.docs[step.page]) });
  S.docs[step.page] = step.doc;
  S.dirty.add(step.page);
  await flush();
  reloadFrame();
  status();
}

// ---------- frame ----------
function frameUrl() {
  const flag = S.mode === 'preview' ? 'bf_preview=1' : 'bf_edit=1';
  if (S.page === 'landing') return `/?${flag}`;
  return `/app/?${flag}#/${appRoute()}`;
}
async function reloadFrame() {
  await flush();
  S.frame = null;
  const f = $('#frame');
  const keep = (() => { try { return f.contentWindow.scrollY; } catch { return 0; } })();
  const want = frameUrl();
  // Same URL (only the #hash could match) would not reload, so reload explicitly.
  try { if (f.contentWindow.location.pathname + f.contentWindow.location.search + f.contentWindow.location.hash === want) f.contentWindow.location.reload(); else f.src = want; } catch { f.src = want; }
  f.addEventListener('load', () => { try { f.contentWindow.scrollTo(0, keep); } catch { /* */ } }, { once: true });
}
function showPage() {
  const f = $('#frame');
  const want = frameUrl();
  // Switching between app screens only changes the hash (no reload needed).
  try {
    const cur = f.contentWindow?.location;
    if (S.frame && S.page.startsWith('app:') && cur && cur.pathname === '/app/' && cur.search.includes('bf_edit') && S.mode !== 'preview') {
      cur.hash = `#/${appRoute()}`;
      return;
    }
  } catch { /* cross-origin never happens here */ }
  S.frame = null;
  f.src = want;
}

// Called by frame.js
window.BFEditor = {
  page: () => docKey(),
  mode: () => S.mode,
  doc: (page) => S.docs[page] || (S.docs[page] = emptyDoc(page)),
  change,
  frameReady(frameApi) {
    S.frame = frameApi;
    frameApi.setInteract?.(S.mode === 'interact');
    renderBlocks();
    select(null);
  },
  routeChanged(route) {
    if (!route || S.page === `app:${route}`) return;
    S.page = `app:${route}`;
    $('#page').value = S.page;
    renderBlocks();
  },
  blocksChanged: () => renderBlocks(),
  select: (info) => select(info),
  openPlans: () => openPlans(),
  codeLabel: (id) => S.codeBlocks.find((b) => b.id === id)?.label || id,
  uploadImage,
  toast,
};

// ---------- page picker ----------
function buildPagePicker(nav) {
  const sel = $('#page');
  sel.innerHTML = `<option value="landing">Landing page (betfriend.bet)</option>${nav.map((g) => `<optgroup label="App · ${esc(g.group)}">${g.items.map(([id, label]) => `<option value="app:${id}">${esc(label)}</option>`).join('')}</optgroup>`).join('')}`;
  sel.value = S.page;
  sel.addEventListener('change', () => { S.page = sel.value; select(null); showPage(); renderBlocks(); renderAdd(); });
}

// ---------- tabs ----------
function tab(name) {
  $$('.ed-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.ed-tab').forEach((s) => { s.hidden = s.id !== `tab-${name}`; });
}
$$('.ed-tabs [role=tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));

// ---------- blocks panel ----------
function renderBlocks() {
  const box = $('#tab-blocks');
  if (S.mode === 'preview') { box.innerHTML = '<p class="hint">Preview shows the draft exactly as visitors will see it after you publish. Switch back to <b>Edit</b> to change things.</p>'; return; }
  const list = S.frame?.listBlocks?.() || [];
  const title = S.page === 'landing' ? 'Landing page blocks' : `${$('#page').selectedOptions[0]?.textContent || 'Screen'} · panels`;
  const groups = {};
  for (const b of list) (groups[b.parentKey ?? ''] ||= []).push(b);
  const item = (b) => `<li draggable="true" data-key="${esc(b.key)}" data-parent="${esc(b.parentKey ?? '')}" class="${b.hidden ? 'is-hidden' : ''}${S.selection?.blockKey === b.key ? ' sel' : ''}${b.depth ? ' bl-sub' : ''}" style="${b.depth ? `margin-left:${b.depth * 16}px` : ''}">
      <span class="grip" title="Drag to reorder">⋮⋮</span><span class="bl-name" title="${esc(b.label)}">${esc(b.label)}</span>
      ${b.custom ? '<span class="bl-tag">Added</span>' : ''}${b.hidden ? '<span class="bl-tag">Hidden</span>' : ''}
      <button class="ib" data-act="up" title="Move up" aria-label="Move up">↑</button>
      <button class="ib" data-act="down" title="Move down" aria-label="Move down">↓</button>
      ${b.canDuplicate ? '<button class="ib" data-act="dup" title="Duplicate" aria-label="Duplicate">⧉</button>' : ''}
      <button class="ib" data-act="hide" title="${b.hidden ? 'Show' : 'Hide'}">${b.hidden ? 'Show' : 'Hide'}</button>
      <button class="ib" data-act="del" title="Delete" aria-label="Delete">✕</button></li>`;
  const deleted = S.frame?.listDeleted?.() || [];
  box.innerHTML = `<h3>${esc(title)}</h3>
    <p class="hint">Drag blocks to reorder them, or hover a block on the page and use its toolbar. Click any text on the page to edit it.</p>
    ${list.length ? `<ul class="bl">${list.map(item).join('')}</ul>` : '<p class="hint">Loading blocks…</p>'}
    ${deleted.length ? `<div class="bl-group-label">Deleted</div><ul class="bl">${deleted.map((b) => `<li data-key="${esc(b.key)}"><span class="bl-name">${esc(b.label)}</span><button class="ib" data-act="restore">Restore</button></li>`).join('')}</ul>` : ''}
    <div class="row" style="margin-top:6px"><button class="btn sm danger" id="reset-page">Reset ${S.page === 'landing' ? 'landing page' : 'all app edits'} to original</button></div>`;

  box.querySelectorAll('.bl li').forEach((li) => {
    li.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      const key = li.dataset.key;
      if (!S.frame) return;
      if (act === 'up') S.frame.moveBlock(key, -1);
      else if (act === 'down') S.frame.moveBlock(key, 1);
      else if (act === 'dup') S.frame.duplicateBlock(key);
      else if (act === 'hide') S.frame.toggleHidden(key);
      else if (act === 'del') S.frame.deleteBlock(key);
      else if (act === 'restore') S.frame.restoreBlock(key);
      else S.frame.selectBlock(key);
    });
  });
  // Drag & drop reorder (within the same parent group).
  let dragKey = null, dragParent = null;
  box.querySelectorAll('.bl li[draggable]').forEach((li) => {
    li.addEventListener('dragstart', (e) => { dragKey = li.dataset.key; dragParent = li.dataset.parent; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragKey); });
    li.addEventListener('dragend', () => { li.classList.remove('dragging'); box.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after')); });
    li.addEventListener('dragover', (e) => {
      if (!dragKey || li.dataset.parent !== dragParent || li.dataset.key === dragKey) return;
      e.preventDefault();
      const r = li.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
      box.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
      li.classList.add(after ? 'drop-after' : 'drop-before');
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragKey || li.dataset.parent !== dragParent) return;
      const r = li.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
      S.frame?.moveBlockTo(dragKey, li.dataset.key, after);
      dragKey = null;
    });
  });
  $('#reset-page')?.addEventListener('click', () => confirmDialog({
    title: 'Reset to original?',
    body: S.page === 'landing' ? 'This removes every change to the landing page from your draft. The live site stays the same until you publish.' : 'This removes every change to the app screens (text, panels, added blocks, images, plans & prices) from your draft. The live site stays the same until you publish.',
    ok: 'Reset draft', danger: true,
    onOk: () => change(docKey(), (d) => { for (const k of Object.keys(d)) delete d[k]; Object.assign(d, emptyDoc(docKey())); }, { reload: true }),
  }));
}

// ---------- selection panel ----------
function select(info) {
  S.selection = info;
  const box = $('#tab-edit');
  if (!info) {
    box.innerHTML = '<p class="hint">Click any text, image, button or link on the page to edit it. Hover a block to move, hide, duplicate or delete it.</p>';
    return;
  }
  tab('edit');
  const parts = [`<div class="sel-card"><div class="sel-kind">${esc(info.kindLabel)}</div>`];
  if (info.text !== undefined) parts.push(`<p class="hint">Type directly on the page. Press Enter or click elsewhere to keep the change, Esc to cancel.</p><div class="hint"><b>Current text:</b> ${esc(info.text).slice(0, 300)}</div>`);
  if (info.href !== undefined) parts.push(`<label class="field">Link goes to <input id="sel-href" value="${esc(info.href)}" placeholder="https://… or /app/#/pricing"></label>`);
  if (info.image) parts.push(`<img class="sel-img" src="${esc(info.image)}" alt=""><div class="row"><button class="btn sm primary" id="sel-replace">Replace image</button></div>`);
  if (info.alt !== undefined) parts.push(`<label class="field">Image description (alt text) <input id="sel-alt" value="${esc(info.alt)}"></label>`);
  if (info.note) parts.push(`<p class="hint">${info.note}</p>`);
  if (info.blockKey) parts.push(`<div class="row"><button class="btn sm" data-b="up">Move up</button><button class="btn sm" data-b="down">Move down</button>${info.canDuplicate ? '<button class="btn sm" data-b="dup">Duplicate</button>' : ''}<button class="btn sm" data-b="hide">${info.hidden ? 'Show' : 'Hide'}</button><button class="btn sm danger" data-b="del">Delete</button></div>`);
  parts.push('</div>');
  box.innerHTML = parts.join('');
  $('#sel-href')?.addEventListener('change', (e) => info.setHref?.(e.target.value.trim()));
  $('#sel-alt')?.addEventListener('change', (e) => info.setAlt?.(e.target.value));
  $('#sel-replace')?.addEventListener('click', async () => { const url = await uploadImage(); if (url) info.setImage?.(url); });
  box.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => {
    const k = info.blockKey, a = b.dataset.b;
    if (a === 'up') S.frame?.moveBlock(k, -1); else if (a === 'down') S.frame?.moveBlock(k, 1);
    else if (a === 'dup') S.frame?.duplicateBlock(k); else if (a === 'hide') S.frame?.toggleHidden(k); else if (a === 'del') S.frame?.deleteBlock(k);
  }));
  renderBlocks();
}

// ---------- image upload ----------
function uploadImage() {
  return new Promise((resolve) => {
    const input = $('#file');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return resolve(null);
      if (file.size > 8 * 1024 * 1024) { toast('That image is over 8 MB. Use a smaller one.', { error: true }); return resolve(null); }
      try {
        toast('Uploading image…');
        const r = await api('upload', { method: 'POST', raw: file, headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name) } });
        toast('Image uploaded');
        resolve(r.url);
      } catch (e) { toast(e.message, { error: true }); resolve(null); }
    };
    input.click();
  });
}

// ---------- block library ----------
const IMG_PLACEHOLDER = '/img/app-daily.png';
const LIB = {
  landing: [
    { name: 'Text section', desc: 'Headline and a paragraph on white.', html: `<section><div class="bf2-wrap bf2-sec"><h2>Your headline here</h2><p class="bf2-sub">Write a short paragraph that explains the point of this section in plain words.</p></div></section>` },
    { name: 'Green call to action', desc: 'Big green band with a lime button.', html: `<section class="bf2-final"><div class="bf2-wrap bf2-sec"><div class="bf2-final-copy"><h2>Start betting the math</h2><p>Every tool, ranked for your books, free for 7 days.</p><a class="bf2-cta bf2-cta-lime" href="/app/#/pricing">Start free trial</a><p class="bf2-terms">Card required, $0 today. Cancel anytime.</p></div></div></section>` },
    { name: 'Check list', desc: 'Headline with green check-mark points.', html: `<section><div class="bf2-wrap bf2-sec"><h2>Why bettors switch</h2><ul class="bf2-checks"><li>First point in plain words</li><li>Second point in plain words</li><li>Third point in plain words</li></ul></div></section>` },
    { name: 'Mint highlight', desc: 'Calm mint panel for a key message.', html: `<section class="bf2-mint"><div class="bf2-wrap bf2-sec"><h2>No tips. Just the math.</h2><p class="bf2-sub">One clear message, explained in a sentence or two.</p></div></section>` },
    { name: 'Image and text', desc: 'Screenshot in a frame next to text.', html: `<section><div class="bf2-wrap bf2-sec" style="display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:center"><div style="display:grid;gap:12px"><h2>Show the product</h2><p class="bf2-sub">Describe what the screenshot shows and why it matters.</p><a class="bf2-cta bf2-cta-green" href="/app/#/daily">See it free</a></div><figure class="bf2-shot"><div class="bf2-shot-bar" aria-hidden="true"><i></i><i></i><i></i><span>Daily Card</span></div><img src="${IMG_PLACEHOLDER}" alt="BetFriend Daily Card" loading="lazy"></figure></div></section>` },
    { name: 'Stats row', desc: 'Four big figures with short notes.', html: `<section><div class="bf2-wrap"><div class="bf2-facts"><div><b>17 books</b><span>Sportsbooks, exchanges and prediction markets.</span></div><div><b>Every 2s</b><span>Prices refresh.</span></div><div><b>7 days</b><span>Free trial.</span></div><div><b>$0 today</b><span>Cancel anytime.</span></div></div></div></section>` },
  ],
  app: [
    { name: 'Text card', desc: 'A card with a title and a paragraph.', html: `<section class="card pad stack"><h3>Card title</h3><p class="muted">Explain something useful for this screen.</p></section>` },
    { name: 'Highlight message', desc: 'Light green notice.', html: `<div class="callout lime"><strong>Tip:</strong> write a short, helpful message here.</div>` },
    { name: 'Dark banner', desc: 'Deep green banner with a lime link.', html: `<div class="callout dark"><strong>All-Access</strong> unlocks every tool on this screen. <a href="#/pricing">See plans →</a></div>` },
    { name: 'Call to action', desc: 'Card with a button.', html: `<section class="card pad stack"><h3>Get every tool</h3><p class="muted">One membership for arbitrage, +EV, sharp money, AI picks and prediction markets.</p><a class="btn primary" href="#/pricing">See plans</a></section>` },
    { name: 'Image card', desc: 'A card with an image and a caption.', html: `<section class="card pad stack"><img src="${IMG_PLACEHOLDER}" alt="" style="width:100%;border-radius:10px"><p class="muted">Image caption.</p></section>` },
  ],
};
function renderAdd() {
  const box = $('#tab-add');
  const lib = LIB[docKey()];
  box.innerHTML = `<h3>Add a block</h3><p class="hint">New blocks go below the block you selected (or at the end). Every block follows the BetFriend brand.</p>
    <div class="lib">${lib.map((b, i) => `<button data-i="${i}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></button>`).join('')}</div>`;
  box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    if (!S.frame) return toast('The page is still loading.', { error: true });
    if (S.mode !== 'edit') setMode('edit');
    const t = lib[Number(b.dataset.i)];
    S.frame.insertBlock(t.html, t.name);
    toast(`${t.name} added`);
    tab('blocks');
  }));
}

// ---------- dialogs ----------
const dlg = $('#dlg');
function openDialog(html, wire) {
  $('#dlg-body').innerHTML = html;
  wire?.($('#dlg-body'));
  dlg.showModal();
}
function confirmDialog({ title, body, ok = 'OK', danger = false, onOk }) {
  openDialog(`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="foot"><button class="btn" value="cancel">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="dlg-ok" type="button">${esc(ok)}</button></div>`,
    (r) => $('#dlg-ok', r).addEventListener('click', async () => { dlg.close(); await onOk(); }));
}

// Plans & prices
let CODE_PLANS = null;
async function openPlans() {
  if (!CODE_PLANS) {
    const m = await import('/app/js/plans.js');
    CODE_PLANS = [...m.PLANS, m.ALL_ACCESS].map((p) => clone({ id: p.id, name: p.name, tagline: p.tagline, monthly: p.monthly, annual: p.annual, popular: p.popular, bullets: p.bullets, bonus: p.bonus }));
  }
  const o = S.docs.app?.plans || {};
  const val = (p, f) => (o[p.id]?.[f] ?? p[f]);
  const rows = CODE_PLANS.map((p) => {
    const changed = o[p.id] && Object.keys(o[p.id]).length;
    return `<fieldset class="plan-ed" data-plan="${esc(p.id)}" style="margin:0">
      <h3>${esc(val(p, 'name'))}${changed ? '<span class="changed">Edited</span>' : ''}</h3>
      <div class="grid">
        <label class="field">Name <input data-f="name" value="${esc(val(p, 'name'))}"></label>
        <label class="field">Monthly ($) <input data-f="monthly" type="number" min="0" step="0.01" value="${esc(val(p, 'monthly'))}"></label>
        <label class="field">Yearly ($) <input data-f="annual" type="number" min="0" step="0.01" value="${esc(val(p, 'annual'))}"></label>
      </div>
      <label class="field">Tagline <input data-f="tagline" value="${esc(val(p, 'tagline') || '')}"></label>
      ${p.bullets ? `<label class="field">Bullet points (one per line) <textarea data-f="bullets" rows="${Math.min(8, (val(p, 'bullets') || []).length + 1)}">${esc((val(p, 'bullets') || []).join('\n'))}</textarea></label>` : ''}
      ${p.id !== 'all-access' && p.id !== 'free' ? `<label class="field" style="display:flex;gap:8px;align-items:center"><input data-f="popular" type="checkbox" style="width:auto" ${val(p, 'popular') ? 'checked' : ''}> Show "Most popular" badge</label>` : ''}
    </fieldset>`;
  }).join('');
  openDialog(`<h2>Plans &amp; prices</h2><p class="hint">Changes here update the pricing screen, the sidebar button, the "Included in" tags and the comparison table everywhere in the app. Prices on the landing page are text: click them on the landing page to edit.</p>${rows}
    <div class="foot"><button class="btn" value="cancel">Cancel</button><button class="btn primary" type="button" id="plans-save">Save plans</button></div>`, (r) => {
    $('#plans-save', r).addEventListener('click', () => {
      const next = {};
      for (const fs of r.querySelectorAll('[data-plan]')) {
        const code = CODE_PLANS.find((p) => p.id === fs.dataset.plan);
        const ov = {};
        for (const inp of fs.querySelectorAll('[data-f]')) {
          const f = inp.dataset.f;
          let v = inp.type === 'checkbox' ? inp.checked : inp.value;
          if (f === 'monthly' || f === 'annual') { v = Math.round(parseFloat(v) * 100) / 100; if (!Number.isFinite(v)) continue; }
          if (f === 'bullets') v = v.split('\n').map((s) => s.trim()).filter(Boolean);
          if (f === 'name' || f === 'tagline') v = v.trim();
          if (JSON.stringify(v) !== JSON.stringify(f === 'popular' ? !!code[f] : code[f] ?? (f === 'tagline' ? '' : code[f]))) ov[f] = v;
        }
        if (Object.keys(ov).length) next[code.id] = ov;
      }
      dlg.close();
      change('app', (d) => { d.plans = next; }, { reload: !!S.page.startsWith('app:') });
      toast('Plans & prices saved to draft');
    });
  });
}

// History
async function openHistory() {
  const { versions } = await api('versions');
  const pageName = { landing: 'Landing page', app: 'App' };
  openDialog(`<h2>Version history</h2><p class="hint">Every publish is saved. Restoring a version makes it live right away (and becomes a new entry here).</p>
    ${versions.length ? `<div style="overflow:auto;max-height:55vh"><table class="vers"><thead><tr><th>#</th><th>Page</th><th>Published</th><th>Note</th><th></th></tr></thead><tbody>${versions.map((v) => `<tr>
      <td>${v.id}</td><td>${esc(pageName[v.page] || v.page)}</td><td>${new Date(v.created_at).toLocaleString()}<br><span class="hint">by ${esc(v.created_by || '')}</span></td>
      <td>${esc(v.note || '')} ${v.live ? '<span class="live-badge">Live now</span>' : ''}</td>
      <td>${v.live ? '' : `<button class="btn sm" type="button" data-restore="${v.id}">Restore</button>`}</td></tr>`).join('')}</tbody></table></div>`
    : '<p>Nothing published yet.</p>'}
    <div class="foot"><button class="btn" value="cancel">Close</button></div>`, (r) => {
    r.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Restoring…';
      try {
        await flush();
        const res = await api(`versions/${b.dataset.restore}/restore`, { method: 'POST', body: {} });
        await loadState();
        dlg.close();
        toast(`Version #${b.dataset.restore} is live again`);
        S.undo = []; S.redo = [];
        if ((res.page === 'landing') === (S.page === 'landing')) reloadFrame();
      } catch (e) { toast(e.message, { error: true }); b.disabled = false; b.textContent = 'Restore'; }
    }));
  });
}

// Publish
function openPublish() {
  const pending = ['landing', 'app'].filter((p) => S.unpublished[p] || S.dirty.has(p));
  if (!pending.length) return toast('Nothing new to publish: the live site already matches your draft.');
  openDialog(`<h2>Publish changes?</h2><p>Your draft for the <b>${pending.map((p) => (p === 'landing' ? 'landing page' : 'app')).join(' and ')}</b> goes live for every visitor right away. You can undo it later from History.</p>
    <label class="field">Note (optional) <input id="pub-note" placeholder="e.g. New hero headline"></label>
    <div class="foot"><button class="btn" value="cancel">Cancel</button><button class="btn lime" type="button" id="pub-go">Publish now</button></div>`, (r) => {
    $('#pub-go', r).addEventListener('click', async () => {
      const b = $('#pub-go', r); b.disabled = true; b.textContent = 'Publishing…';
      try {
        await flush();
        const res = await api('publish', { method: 'POST', body: { note: $('#pub-note', r).value } });
        S.unpublished = { landing: false, app: false };
        dlg.close(); status();
        toast(res.published.length ? 'Published. Your changes are live.' : 'Nothing new to publish.');
      } catch (e) { toast(e.message, { error: true }); b.disabled = false; b.textContent = 'Publish now'; }
    });
  });
}

// ---------- modes ----------
function setMode(m) {
  const wasPreview = S.mode === 'preview';
  S.mode = m;
  $$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  if (m === 'preview' || wasPreview) { reloadFrame(); renderBlocks(); return; }
  S.frame?.setInteract?.(m === 'interact');
}
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-device]').forEach((b) => b.addEventListener('click', () => {
  S.device = b.dataset.device;
  $$('[data-device]').forEach((x) => x.classList.toggle('on', x === b));
  $('#frame-wrap').classList.toggle('phone', S.device === 'phone');
}));
$('#undo').addEventListener('click', () => undoRedo(S.undo, S.redo));
$('#redo').addEventListener('click', () => undoRedo(S.redo, S.undo));
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.target.closest?.('input,textarea')) return;
  e.preventDefault(); undoRedo(e.shiftKey ? S.redo : S.undo, e.shiftKey ? S.undo : S.redo);
});
$('#plans-btn').addEventListener('click', openPlans);
$('#history-btn').addEventListener('click', () => openHistory().catch((e) => toast(e.message, { error: true })));
$('#publish-btn').addEventListener('click', openPublish);
$('#logout').addEventListener('click', async () => { await flush(); await api('logout', { method: 'POST', body: {} }).catch(() => {}); location.href = '/admin'; });

// ---------- boot ----------
async function loadState() {
  const st = await api('state');
  for (const p of ['landing', 'app']) {
    S.docs[p] = st.pages[p].draft || emptyDoc(p);
    S.unpublished[p] = st.pages[p].hasUnpublished;
  }
  S.codeBlocks = st.pages.landing.codeBlocks;
  status();
}
(async () => {
  try {
    await loadState();
    const { NAV } = await import('/app/js/nav.js');
    buildPagePicker(NAV);
    const start = new URLSearchParams(location.search).get('page');
    if (start && $(`#page option[value="${CSS.escape(start)}"]`)) { S.page = start; $('#page').value = start; }
    renderAdd();
    select(null);
    showPage();
  } catch (e) { toast(e.message, { error: true }); }
})();
