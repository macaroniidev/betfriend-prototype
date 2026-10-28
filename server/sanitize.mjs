// Defense in depth for HTML saved by the editor: only the owner can save, but stored HTML is still
// stripped of anything that can run code, so a stolen session can't plant scripts on the live site.
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_TAGS = /<\/?(script|style|iframe|object|embed|base|meta|link|frame|frameset|applet|noscript|template)\b[^>]*>/gi;
const EVENT_ATTR = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SRCDOC = /\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const URL_ATTR = /(\s(?:href|src|action|formaction|xlink:href|poster|data)\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function safeUrl(v) {
  const s = String(v).replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  if (s.startsWith('javascript:') || s.startsWith('vbscript:')) return false;
  if (s.startsWith('data:') && !/^data:image\/(png|jpe?g|gif|webp);/.test(s)) return false;
  return true;
}

export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  let s = html.slice(0, 400_000);
  s = s.replace(DROP_WITH_CONTENT, '').replace(DROP_TAGS, '').replace(EVENT_ATTR, '').replace(SRCDOC, '');
  s = s.replace(URL_ATTR, (m, pre, _q, dq, sq, bare) => (safeUrl(dq ?? sq ?? bare ?? '') ? m : `${pre}"#"`));
  // Remove editor-only attributes if any slipped through.
  s = s.replace(/\s+(contenteditable|spellcheck|data-bf-sel|data-bf-hover|draggable)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
  return s;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e6 ? Math.round(v * 100) / 100 : undefined);
const id = (v) => (typeof v === 'string' && /^[a-z0-9_-]{1,64}$/i.test(v) ? v : null);

/** Validate + clean a landing document: { order, blocks: {id: {html?, hidden?, deleted?, label?}}, regions: {header|footer|sticky: {html}} } */
export function cleanLanding(doc) {
  if (!isObj(doc)) return { order: [], blocks: {}, regions: {} };
  const order = (Array.isArray(doc.order) ? doc.order : []).map(id).filter(Boolean).slice(0, 200);
  const blocks = {};
  for (const [k, v] of Object.entries(isObj(doc.blocks) ? doc.blocks : {})) {
    if (!id(k) || !isObj(v)) continue;
    const b = {};
    if (typeof v.html === 'string') b.html = sanitizeHtml(v.html);
    if (v.hidden === true) b.hidden = true;
    if (v.deleted === true) b.deleted = true;
    if (str(v.label, 80)) b.label = str(v.label, 80);
    blocks[k] = b;
  }
  const regions = {};
  for (const r of ['header', 'footer', 'sticky']) if (isObj(doc.regions?.[r]) && typeof doc.regions[r].html === 'string') regions[r] = { html: sanitizeHtml(doc.regions[r].html) };
  return { order, blocks, regions };
}

/** Validate + clean the app document: text overrides, block layout, custom blocks, images, plans. */
export function cleanApp(doc) {
  const out = { text: {}, layout: {}, custom: {}, images: {}, plans: {} };
  if (!isObj(doc)) return out;
  for (const [scope, map] of Object.entries(isObj(doc.text) ? doc.text : {})) {
    if (!id(scope) || !isObj(map)) continue;
    const m = {};
    for (const [from, to] of Object.entries(map)) if (from.length <= 2000 && typeof to === 'string') m[from] = to.slice(0, 2000);
    out.text[scope] = m;
  }
  for (const [route, l] of Object.entries(isObj(doc.layout) ? doc.layout : {})) {
    if (!id(route) || !isObj(l)) continue;
    const keys = (a) => (Array.isArray(a) ? a.filter((k) => typeof k === 'string' && k.length <= 200).slice(0, 300) : []);
    const order = {};
    for (const [parent, list] of Object.entries(isObj(l.order) ? l.order : {})) if (parent.length <= 200) order[parent] = keys(list);
    out.layout[route] = { order, hidden: keys(l.hidden), deleted: keys(l.deleted) };
  }
  for (const [route, list] of Object.entries(isObj(doc.custom) ? doc.custom : {})) {
    if (!id(route) || !Array.isArray(list)) continue;
    out.custom[route] = list.filter(isObj).slice(0, 50).map((c) => ({
      id: id(c.id) || `c${Math.random().toString(36).slice(2, 9)}`,
      after: typeof c.after === 'string' ? c.after.slice(0, 200) : null,
      parent: typeof c.parent === 'string' ? c.parent.slice(0, 200) : null,
      html: sanitizeHtml(c.html || ''),
      label: str(c.label, 80) || 'Custom block',
    }));
  }
  for (const [from, to] of Object.entries(isObj(doc.images) ? doc.images : {})) {
    if (from.length <= 500 && typeof to === 'string' && /^\/uploads\/[a-z0-9]+\.(png|jpe?g|webp|gif)$/i.test(to)) out.images[from] = to;
  }
  for (const [pid, p] of Object.entries(isObj(doc.plans) ? doc.plans : {})) {
    if (!id(pid) || !isObj(p)) continue;
    const c = {};
    for (const f of ['name', 'tagline']) if (str(p[f], 300) !== undefined) c[f] = str(p[f], 300);
    for (const f of ['monthly', 'annual']) if (num(p[f]) !== undefined) c[f] = num(p[f]);
    if (typeof p.popular === 'boolean') c.popular = p.popular;
    if (Array.isArray(p.bullets)) c.bullets = p.bullets.filter((b) => typeof b === 'string').map((b) => b.slice(0, 300)).slice(0, 30);
    if (Array.isArray(p.bonus)) c.bonus = p.bonus.filter(isObj).slice(0, 20).map((b) => ({ name: str(b.name, 120) || '', value: num(b.value) ?? 0, desc: str(b.desc, 300) || '' }));
    out.plans[pid] = c;
  }
  return out;
}
