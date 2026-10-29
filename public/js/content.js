// Owner content for the app, saved from the visual editor (/admin) and injected by the server as
// window.__BF_CONTENT.app. Screens keep rendering from code + live data; this layer then applies:
//   text    – wording changes, per screen ("_shell" = sidebar + top bar), matched on the original text
//   layout  – panel order and hidden panels, per screen
//   custom  – blocks added from the editor's library
//   images  – replaced images
//   plans   – plan names, prices, taglines, bullets (applied to plans.js data before anything renders)
// Live data redraws are watched with a MutationObserver so edits stay applied.
//
// Markup contract for screens (keeps the editor working while data ticks):
//   - Page and panel headings (h1/h2/h3) are static text: no live counts or amounts inside them. Put a
//     dynamic part next to the heading, or inside it as <b data-bf-nodata>...</b>.
//   - Live values (amounts, odds, counts, timers) go in elements marked data-bf-nodata (e.g.
//     <b data-bf-nodata>$33.70</b>, or the whole <tbody data-bf-nodata>). Text overrides, block detection and
//     the change watcher all skip nodata subtrees, and the editor never makes them editable.
//   - Static words inside a nodata subtree (a row's "Bet both" verb) can opt back in with data-bf-text:
//     <span data-bf-text>Bet both</span>. Owner overrides apply there, also after the rows re-render.
//   - A panel is a <section> / .sec / .card with its heading first, so the editor can name, move and hide it.
//   - A repeated list of results (table rows, feed items, cards) sits in one container marked data-bf-list:
//     it is one block, never split into per-item blocks.
//   - Shell widgets that must not be edited or selected (theme toggle, command palette, drawers) are excluded
//     in public/admin/frame.js; mark any other one with data-bf-noedit.
// With no owner edits for the current screen, nothing is re-applied on data ticks (no-edits fast path).

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
const GROUPISH = '.card,.sec,section,article,aside,.stack,.callout,.stats';
const NODATA = '[data-bf-nodata]';
const LIST = '[data-bf-list]';
const ISLAND = '[data-bf-text]'; // static text inside a nodata subtree that overrides still apply to
// Mutations in here never need a re-apply: the editor's own toolbar, the screen-reader live region.
const IGNORE = '#bf-tb,#bf-drop,#sr-live,[data-bf-ignore]';
const DRAWERS = '.drawer-wrap,[data-bf-drawer]';

/** The screen's root element (unwraps single wrapper divs). */
export function screenRoot() {
  let root = document.querySelector('#view > div');
  while (root) {
    const kids = [...root.children].filter((c) => !c.matches(NOT_BLOCK));
    if (kids.length === 1 && /^(DIV|SECTION|MAIN)$/.test(kids[0].tagName) && !kids[0].matches(`.card,.sec,.callout,.stats,${LIST},${NODATA}`)) root = kids[0];
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

/** First static heading of a block (never one inside live data, so keys don't churn with the data). */
function headingOf(el) {
  if (el.matches(NODATA)) return null;
  if (el.matches('h1,h2,h3')) return el;
  for (const h of el.querySelectorAll('h1,h2,h3,header strong')) if (!h.closest(NODATA)) return h;
  return null;
}

function signature(el) {
  if (el.dataset.bfCustom) return `custom:${el.dataset.bfCustom}`;
  const h = headingOf(el);
  const title = h ? origText(h).slice(0, 40) : '';
  const cls = (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '') || '';
  return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${title ? '|' + title : ''}`;
}

const LAYOUT = '.split,.grid,.g2,.g3,.g4,.stack,.plans,aside';
// A group is a layout wrapper whose children are panels. Lists of results and live data are never split.
const isGroup = (el) => !el.matches(`.card,.callout,.stats,.page-head,.toolbar,table,ul,ol,form,header,${LIST},${NODATA}`)
  && [...el.children].filter((c) => !c.matches(NOT_BLOCK)).length >= 2
  && (el.matches(LAYOUT) || [...el.children].filter((c) => c.matches(GROUPISH)).length >= 2);

// Never blocks: the router's loading skeleton, editor/shell widgets, and empty mounts (a [data-setup] or
// [data-lock-slot] that a screen fills later). An empty mount has no text and no media or controls (it may
// hold an empty, hidden placeholder); it becomes a block (with its own heading) once it has content, so it
// never shows up as a nameless "Panel".
const NOT_PANEL = '[data-bf-ignore],[data-bf-noedit],.skel';
const MEDIA = 'img,svg,hr,canvas,iframe,video,picture,input,select,textarea,button,table';
const isEmptyMount = (el) => !el.textContent.trim() && !el.matches(MEDIA) && !el.querySelector(MEDIA);

/**
 * Editor name for a block without a heading (shared by public/admin/frame.js and qa/blocks.mjs), or ''.
 * Class names first, then what the block holds (a table, a results list).
 */
const BLOCK_NAMES = { 'page-head': 'Page title', stats: 'Stats row', toolbar: 'Filters', 'fb-host': 'Filters', 'live-bar': 'Live status bar', chips: 'Filter chips',
  dchips: 'Jump to section', feed: 'Feed', callout: 'Message', 'table-wrap': 'Table', tbl: 'Table', welcome: 'Welcome banner', actionbar: 'Action bar',
  legend: 'Legend', related: 'Related tools', seg: 'View switch', 'mode-switch': 'View switch', 'lock-card': 'Plan lock', 'pr-result': 'Prop result',
  'pr-facts': 'Prop facts', results: 'Results', how: 'How this makes money', 'gl-find': 'Search', 'slip-leg': 'Parlay leg' };
export function blockName(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/) : [];
  for (const c of cls) if (BLOCK_NAMES[c]) return BLOCK_NAMES[c];
  if (cls.some((c) => /-bar$/.test(c))) return 'Filters'; // per-screen filter rows (.scr-bar, .mid-bar, .lh-bar, .bo-bar …)
  if (el.matches('table') || el.querySelector('table')) return 'Table';
  if (el.matches(LIST) || el.querySelector(LIST)) return 'Results';
  return '';
}

/** Tree of movable blocks on the current screen: [{ el, key, parentKey, group }] */
export function blocks() {
  const root = screenRoot();
  // While a screen loads, #view only holds the skeleton: there are no blocks yet.
  if (!root || root.matches('.skel') || root.closest('.skel')) return [];
  const out = [];
  const visit = (parent, parentKey, depth) => {
    const seen = {};
    for (const el of parent.children) {
      if (el.matches(NOT_BLOCK) || el.matches(NOT_PANEL) || isEmptyMount(el)) continue;
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
// Text nodes that overrides may touch: everything except scripts, added blocks and live-data (nodata)
// subtrees; static islands ([data-bf-text]) inside live data are visited on their own.
function textNodesOf(root) {
  const out = [];
  const islands = [];
  const editing = window.__BF_EDITING;
  const walk = (start, island) => {
    const w = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 3) return NodeFilter.FILTER_ACCEPT;
        if (n.matches('script,style,[data-bf-custom]')) return NodeFilter.FILTER_REJECT;
        if (n.matches(NODATA)) {
          if (!island) islands.push(...n.querySelectorAll(ISLAND));
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });
    for (let n; (n = w.nextNode());) if (!(editing && editing.contains(n))) out.push(n);
  };
  walk(root, false);
  for (const el of islands) if (!el.closest('[data-bf-custom]')) walk(el, true);
  return out;
}

function applyText(root, map) {
  if (!root) return;
  const has = map && Object.keys(map).length;
  for (const n of textNodesOf(root)) {
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
  for (const img of document.querySelectorAll(`#app img, ${DRAWERS.split(',').map((s) => `${s} img`).join(', ')}`)) {
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
    document.querySelectorAll(DRAWERS).forEach((el) => applyText(el, doc.text[route]));
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

const nonEmpty = (o) => !!o && typeof o === 'object' && Object.keys(o).length > 0;
/** Whether data redraws on the current screen need a re-apply: owner edits exist for it, or the editor is open. */
export function needsApply() {
  if (mode === 'edit') return true; // the editor refreshes its block list on 'bf:applied'
  const L = doc.layout[route];
  return nonEmpty(doc.text._shell) || nonEmpty(doc.text[route]) || nonEmpty(doc.images) || nonEmpty(doc.custom[route])
    || (!!L && (nonEmpty(L.hidden) || nonEmpty(L.deleted) || Object.values(L.order || {}).some(nonEmpty)));
}

// A mutation matters unless it happened entirely inside live data (nodata) or the editor's own UI. Nodes
// added inside live data still matter when they carry static text islands that overrides apply to.
const isEl = (n) => n.nodeType === 1;
const hasIsland = (n) => isEl(n) && (n.matches(ISLAND) || !!n.querySelector(ISLAND));
function relevant(rec) {
  const el = isEl(rec.target) ? rec.target : rec.target.parentElement;
  if (!el || !el.isConnected) return false;
  if (el.closest(IGNORE)) return false;
  if (el.closest(ISLAND)) return true;
  if (el.closest(NODATA)) return rec.type === 'childList' && [...rec.addedNodes].some(hasIsland);
  if (rec.type !== 'childList') return true;
  // Children swapped in a normal element: ignore when every node is a live-data element or whitespace.
  const quiet = (n) => (n.nodeType === 3 ? !n.nodeValue.trim() : !isEl(n) || (n.matches(NODATA) && !hasIsland(n)));
  return ![...rec.addedNodes, ...rec.removedNodes].every(quiet);
}
function onMutations(records) {
  if (scheduled || !needsApply()) return;
  if (records.some(relevant)) schedule();
}

export function setRoute(r) { route = r; schedule(); }
export function start() {
  if (!document.getElementById('bf-content-css')) {
    const st = document.createElement('style');
    st.id = 'bf-content-css';
    st.textContent = mode === 'edit' ? '[data-bf-deleted]{display:none!important}' : '[data-bf-hidden],[data-bf-deleted]{display:none!important}';
    document.head.appendChild(st);
  }
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}

// The editor (inside the preview frame) reads and updates content through this handle.
window.BFContent = {
  get doc() { return doc; },
  setDoc(d) { doc = normalize(d); schedule(); },
  get route() { return route; },
  blocks, blockName, screenRoot, origText, apply, applyPlans, needsApply,
  origOf: (n) => (orig.has(n) ? orig.get(n) : n.nodeValue),
  setOrig: (n, v) => { orig.set(n, v); },
  origSrcOf: (img) => origSrc.get(img) || img.getAttribute('src'),
};
