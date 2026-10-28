// Builds the landing page HTML from the code version + the owner's saved layout.
// Each top-level element in <main> carries data-bf-block="<id>". Blocks the owner never touched
// come straight from the code (so code updates still show); edited blocks use the saved HTML.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

/** Split HTML into its top-level elements: [{ id, html }]. */
export function topLevel(html) {
  const out = [];
  let depth = 0, start = -1, m, rawText = null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const [, close, tagRaw, attrs, self] = m; const tag = tagRaw.toLowerCase();
    if (rawText) { if (close && tag === rawText) { rawText = null; depth--; if (depth === 0) out.push(mk(html.slice(start, TOKEN.lastIndex))); } continue; }
    if (close) { depth--; if (depth === 0 && start >= 0) { out.push(mk(html.slice(start, TOKEN.lastIndex))); start = -1; } continue; }
    if (depth === 0) start = m.index;
    if (VOID.has(tag) || self) { if (depth === 0) { out.push(mk(m[0])); start = -1; } continue; }
    if (tag === 'script' || tag === 'style') rawText = tag;
    depth++;
  }
  return out;
}
function mk(html) {
  const m = html.match(/^<[^>]*\sdata-bf-block="([^"]+)"/);
  return { id: m ? m[1] : null, html };
}

const regionRe = (r) => new RegExp(`<(header|footer|div)\\b[^>]*data-bf-region="${r}"[^>]*>`, 'i');

/** Replace a region element (header/footer/sticky) by its saved HTML. */
function replaceRegion(html, region, newHtml) {
  const open = html.match(regionRe(region));
  if (!open) return html;
  const startIdx = open.index;
  const els = topLevel(html.slice(startIdx));
  if (!els.length) return html;
  return html.slice(0, startIdx) + newHtml + html.slice(startIdx + els[0].html.length);
}

/** Code blocks of the landing page, in code order. */
export function codeBlocks(fileHtml) {
  const i = fileHtml.indexOf('<main id="main">'), j = fileHtml.lastIndexOf('</main>');
  if (i < 0 || j < 0) return [];
  return topLevel(fileHtml.slice(i + '<main id="main">'.length, j)).filter((b) => b.id);
}

/**
 * Compose the final landing HTML.
 * mode: 'live' (hidden blocks removed) | 'edit' (hidden blocks kept, marked) | 'preview'
 */
export function composeLanding(fileHtml, doc, mode = 'live') {
  if (!doc) return fileHtml;
  const i = fileHtml.indexOf('<main id="main">'), j = fileHtml.lastIndexOf('</main>');
  if (i < 0 || j < 0) return fileHtml;
  const code = codeBlocks(fileHtml);
  const codeIds = code.map((b) => b.id);
  const byId = Object.fromEntries(code.map((b) => [b.id, b.html]));
  const blocks = doc.blocks || {};

  // Saved order first; code blocks added later go right after their code predecessor.
  const order = (doc.order || []).filter((id) => byId[id] !== undefined || blocks[id]?.html);
  for (const [k, id] of codeIds.entries()) {
    if (order.includes(id)) continue;
    const prev = codeIds.slice(0, k).reverse().find((p) => order.includes(p));
    order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, id);
  }

  const parts = [];
  for (const id of order) {
    const b = blocks[id] || {};
    if (b.deleted) continue;
    if (b.hidden && mode !== 'edit') continue;
    let html = b.html || byId[id];
    if (!html) continue;
    if (!/^<[^>]*\sdata-bf-block=/.test(html)) html = html.replace(/^<([a-zA-Z0-9-]+)/, `<$1 data-bf-block="${id}"`);
    if (b.hidden) html = html.replace(/^<([a-zA-Z0-9-]+)/, '<$1 data-bf-hidden=""');
    parts.push(html);
  }
  let out = fileHtml.slice(0, i + '<main id="main">'.length) + '\n' + parts.join('\n\n') + '\n' + fileHtml.slice(j);
  for (const r of ['header', 'footer', 'sticky']) if (doc.regions?.[r]?.html) out = replaceRegion(out, r, doc.regions[r].html);
  return out;
}
