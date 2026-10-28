// Owner content for the app, saved from the visual editor (/admin) and injected by the server as
// window.__BF_CONTENT.app. Screens keep rendering from code + live data; this layer then applies:
//   text    – wording changes, per screen ("_shell" = sidebar + top bar), matched on the original text
//   layout  – panel order and hidden panels, per screen
//   custom  – blocks added from the editor's library
//   images  – replaced images
//   plans   – plan names, prices, taglines, bullets (applied to plans.js data before anything renders)
// Live data redraws are watched with a MutationObserver so edits stay applied.

const BOOT = window.__BF_CONTENT || {};
let doc = normalize(BOOT.app);
let route = null;
let observer = null;
let scheduled = false;
const orig = new WeakMap(); // text node -> original (code) text
const origSrc = new WeakMap(); // img -> original src
export const mode = BOOT.mode || 'live';

function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  return { text: d.text || {}, layout: d.layout || {}, custom: d.custom || {}, images: d.images || {}, plans: d.plans || {} };
}

/** Apply plan overrides in place, before the shell or any screen reads PLANS / ALL_ACCESS. */
export function applyPlans(PLANS, ALL_ACCESS, plans = doc.plans) {
  const all = [...PLANS, ALL_ACCESS];
  for (const p of all) {
    if (!p.__code) Object.defineProperty(p, '__code', { value: JSON.parse(JSON.stringify(p)), enumerable: false });
    const base = p.__code, o = plans[p.id] || {};
    for (const f of ['name', 'tagline', 'monthly', 'annual', 'popular']) p[f] = o[f] ?? base[f];
    if (base.bullets) p.bullets = Array.isArray(o.bullets) ? [...o.bullets] : [...base.bullets];
    if (base.bonus) p.bonus = base.bonus.map((b, i) => ({ ...b, ...(o.bonus?.[i] || {}), tool: b.tool }));
  }
}

// ---------- blocks (panels) ----------
const NOT_BLOCK = 'style,script,template';
const GROUPISH = '.card,section,article,aside,.stack,.callout,.stats';

/** The screen's root element (unwraps single wrapper divs). */
export function screenRoot() {
  let root = document.querySelector('#view > div');
  while (root) {
    const kids = [...root.children].filter((c) => !c.matches(NOT_BLOCK));
    if (kids.length === 1 && /^(DIV|SECTION|MAIN)$/.test(kids[0].tagName) && !kids[0].matches('.card,.callout,.stats')) root = kids[0];
    else break;
  }
  return root;
}

/** Original (code) text of an element, ignoring owner overrides. */
export function origText(el) {
  let s = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) s += orig.has(n) ? orig.get(n) : n.nodeValue;
  return s.replace(/\s+/g, ' ').trim();
}

function signature(el) {
  if (el.dataset.bfCustom) return `custom:${el.dataset.bfCustom}`;
  const h = el.matches('h1,h2,h3') ? el : el.querySelector('h1,h2,h3,header strong');
  const title = h ? origText(h).slice(0, 40) : '';
  const cls = (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '') || '';
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${title ? '|' + title : ''}`;
}

const LAYOUT = '.split,.grid,.g2,.g3,.g4,.stack,.plans,aside';
const isGroup = (el) => !el.matches('.card,.callout,.stats,.page-head,.toolbar,table,ul,ol,form,header')
  && [...el.children].filter((c) => !c.matches(NOT_BLOCK)).length >= 2
  && (el.matches(LAYOUT) || [...el.children].filter((c) => c.matches(GROUPISH)).length >= 2);

/** Tree of movable blocks on the current screen: [{ el, key, parentKey, group }] */
export function blocks() {
  const root = screenRoot();
  if (!root) return [];
  const out = [];
  const visit = (parent, parentKey, depth) => {
    const seen = {};
    for (const el of parent.children) {
      if (el.matches(NOT_BLOCK)) continue;
      const sig = signature(el);
      seen[sig] = (seen[sig] || 0) + 1;
      const key = `${parentKey}/${sig}${seen[sig] > 1 ? '#' + seen[sig] : ''}`;
      el.dataset.bfKey = key;
      const group = depth < 3 && isGroup(el);
      out.push({ el, key, parentKey, group });
      if (group) visit(el, key, depth + 1);
    }
  };
  root.dataset.bfKey = '';
  visit(root, '', 0);
  return out;
}

function groupEl(key) {
  const root = screenRoot();
  if (!root) return null;
  if (!key) return root;
  return [...root.querySelectorAll('[data-bf-key]')].find((e) => e.dataset.bfKey === key) || null;
}

// ---------- apply ----------
function applyText(root, map) {
  if (!root) return;
  const has = map && Object.keys(map).length;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const editing = window.__BF_EDITING;
  for (let n; (n = w.nextNode());) {
    const p = n.parentElement;
    if (!p || p.closest('script,style,[data-bf-custom]') || (editing && editing.contains(n))) continue;
    const raw = orig.has(n) ? orig.get(n) : n.nodeValue;
    const key = raw.trim();
    if (!key) continue;
    if (has && Object.prototype.hasOwnProperty.call(map, key)) {
      if (!orig.has(n)) orig.set(n, raw);
      const next = raw.replace(key, map[key]);
      if (n.nodeValue !== next) n.nodeValue = next;
    } else if (orig.has(n)) {
      if (n.nodeValue !== raw) n.nodeValue = raw; // override removed: back to the code text
      orig.delete(n);
    }
  }
}

function applyImages() {
  for (const img of document.querySelectorAll('#app img, .drawer-wrap img')) {
    const src = origSrc.get(img) || img.getAttribute('src');
    const next = doc.images[src];
    if (next) { if (!origSrc.has(img)) origSrc.set(img, src); if (img.getAttribute('src') !== next) img.setAttribute('src', next); }
    else if (origSrc.has(img)) { img.setAttribute('src', origSrc.get(img)); origSrc.delete(img); }
  }
}

function applyLayout() {
  const L = doc.layout[route] || { order: {}, hidden: [] };
  const custom = doc.custom[route] || [];
  // Custom blocks first, so they take part in ordering.
  let list = blocks();
  for (const c of custom) {
    if (document.querySelector(`[data-bf-custom="${CSS.escape(c.id)}"]`)) continue;
    const parent = groupEl(c.parent || '') || screenRoot();
    if (!parent) continue;
    const tpl = document.createElement('template');
    tpl.innerHTML = c.html;
    const el = tpl.content.firstElementChild;
    if (!el) continue;
    el.dataset.bfCustom = c.id;
    const after = list.find((b) => b.key === c.after && b.el.parentElement === parent)?.el;
    parent.insertBefore(el, after ? after.nextSibling : (c.after === null ? parent.firstChild : null));
    list = blocks();
  }
  for (const el of document.querySelectorAll('[data-bf-custom]')) if (!custom.some((c) => c.id === el.dataset.bfCustom)) el.remove();
  list = blocks();
  // Order within each group.
  for (const [parentKey, order] of Object.entries(L.order || {})) {
    const parent = groupEl(parentKey);
    if (!parent || !order?.length) continue;
    const kids = list.filter((b) => b.parentKey === parentKey && b.el.parentElement === parent);
    const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 1e6 : i; };
    const sorted = [...kids].sort((a, b) => rank(a.key) - rank(b.key) || kids.indexOf(a) - kids.indexOf(b));
    if (sorted.every((b, i) => b === kids[i])) continue;
    const slots = kids.map((b) => b.el);
    const markers = slots.map((el) => { const m = document.createComment(''); el.before(m); return m; });
    sorted.forEach((b, i) => markers[i].replaceWith(b.el));
  }
  const hidden = new Set(L.hidden || []), deleted = new Set(L.deleted || []);
  const mark = (el, attr, on) => { if (on && !el.hasAttribute(attr)) el.setAttribute(attr, ''); else if (!on && el.hasAttribute(attr)) el.removeAttribute(attr); };
  for (const b of blocks()) { mark(b.el, 'data-bf-hidden', hidden.has(b.key)); mark(b.el, 'data-bf-deleted', deleted.has(b.key)); }
}

export function apply() {
  scheduled = false;
  if (observer) observer.disconnect();
  try {
    const shell = document.querySelectorAll('.side, .topbar');
    shell.forEach((el) => applyText(el, doc.text._shell));
    applyText(document.getElementById('view'), doc.text[route]);
    document.querySelectorAll('.drawer-wrap').forEach((el) => applyText(el, doc.text[route]));
    applyImages();
    applyLayout();
  } catch (err) { console.warn('content apply failed', err); }
  if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.dispatchEvent(new CustomEvent('bf:applied'));
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(apply);
}

export function setRoute(r) { route = r; schedule(); }
export function start() {
  if (!document.getElementById('bf-content-css')) {
    const st = document.createElement('style');
    st.id = 'bf-content-css';
    st.textContent = mode === 'edit' ? '[data-bf-deleted]{display:none!important}' : '[data-bf-hidden],[data-bf-deleted]{display:none!important}';
    document.head.appendChild(st);
  }
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}

// The editor (inside the preview frame) reads and updates content through this handle.
window.BFContent = {
  get doc() { return doc; },
  setDoc(d) { doc = normalize(d); schedule(); },
  get route() { return route; },
  blocks, screenRoot, origText, apply, applyPlans,
  origOf: (n) => (orig.has(n) ? orig.get(n) : n.nodeValue),
  setOrig: (n, v) => { orig.set(n, v); },
  origSrcOf: (img) => origSrc.get(img) || img.getAttribute('src'),
};
