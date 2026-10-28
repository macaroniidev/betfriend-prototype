// Runs inside the site preview when it is opened by the editor (?bf_edit=1, owner only).
// Click text to edit it in place; hover a block for its toolbar (drag, move, duplicate, hide, delete);
// click an image to replace it. Every change is reported to the editor window (window.parent.BFEditor),
// which saves the draft.
(() => {
  let E;
  try { E = window.parent !== window && window.parent.BFEditor; } catch { E = null; }
  if (!E) return;
  const PAGE = (window.__BF_EDIT || {}).page;
  const isApp = PAGE === 'app';
  const C = () => window.BFContent; // app content layer (public/js/content.js)

  let interact = false;
  let editing = null;   // { el, before, nodes:[[node, orig]] }
  let hoverEl = null;
  let selEl = null;
  let dragKey = null;

  const DATA_SEL = 'table tbody, .price, .edge, .book, .stat strong, .live-dot, input, select, textarea, svg, .spark, .meter, .bar, .drawer-wrap, [data-bf-nodata]';
  const TEXT_SEL = 'h1,h2,h3,h4,h5,h6,p,li,a,button,span,strong,b,em,small,td,th,dt,dd,label,figcaption,summary,div,blockquote,i,u,mark,sup,sub,time,caption,legend,q,cite';
  const STRIP = ['contenteditable', 'spellcheck', 'data-bf-sel', 'data-bf-hover', 'data-bf-hidden', 'data-bf-deleted', 'data-bf-key', 'draggable'];
  const rid = () => 'c-' + Math.random().toString(36).slice(2, 9);
  const route = () => (isApp ? (C()?.route || location.hash.replace(/^#\/?/, '').split('?')[0] || 'daily') : null);
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const directText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
  const textNodes = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; for (let n; (n = w.nextNode());) if (n.nodeValue.trim()) out.push(n); return out; };

  function cleanClone(el) {
    const c = el.cloneNode(true);
    for (const x of [c, ...c.querySelectorAll('*')]) STRIP.forEach((a) => x.removeAttribute(a));
    return c;
  }

  // ---------------- toolbar + drop line ----------------
  const tb = document.createElement('div');
  tb.id = 'bf-tb';
  tb.innerHTML = `<span class="bf-tb-grip" draggable="true" title="Drag to move">⋮⋮</span><span class="bf-tb-name"></span>
    <button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button>
    <button data-a="dup" title="Duplicate">Duplicate</button><button data-a="hide" title="Hide or show">Hide</button><button data-a="del" title="Delete">✕</button>`;
  const drop = document.createElement('div');
  drop.id = 'bf-drop';
  document.body.append(tb, drop);
  tb.hidden = true; drop.hidden = true;

  // ---------------- blocks: landing ----------------
  const mainEl = () => document.getElementById('main');
  const L = {
    els: () => [...(mainEl()?.children || [])].filter((e) => e.dataset.bfBlock),
    el: (key) => L.els().find((e) => e.dataset.bfBlock === key),
    label(el) {
      const id = el.dataset.bfBlock;
      const saved = E.doc('landing').blocks?.[id]?.label;
      if (saved) return saved;
      if (!id.startsWith('c-')) return E.codeLabel(id);
      return txt(el.querySelector('h1,h2,h3')).slice(0, 60) || 'Added block';
    },
    commitOrder() { E.change('landing', (d) => { d.order = L.els().map((e) => e.dataset.bfBlock); }); },
    commitHtml(el) {
      const region = el.closest('[data-bf-region]');
      if (region) { const html = cleanClone(region).outerHTML; E.change('landing', (d) => { (d.regions ||= {})[region.dataset.bfRegion] = { html }; }); return; }
      const block = el.closest('[data-bf-block]');
      if (!block) return;
      const id = block.dataset.bfBlock, html = cleanClone(block).outerHTML;
      E.change('landing', (d) => { d.blocks ||= {}; d.blocks[id] = { ...(d.blocks[id] || {}), html }; if (!d.order?.length) d.order = L.els().map((e) => e.dataset.bfBlock); });
    },
  };

  // ---------------- blocks: app ----------------
  const A = {
    list: () => (C()?.blocks() || []).filter((b) => !b.el.hasAttribute('data-bf-deleted')),
    el: (key) => A.list().find((b) => b.key === key)?.el,
    info: (key) => A.list().find((b) => b.key === key),
    label(b) {
      if (b.el.dataset.bfCustom) { const c = (E.doc('app').custom?.[route()] || []).find((x) => x.id === b.el.dataset.bfCustom); return c?.label || 'Added block'; }
      if (b.group) { const n = A.list().filter((x) => x.parentKey === b.key).length; return `Group of ${n} panels`; }
      const h = b.el.matches('h1,h2,h3') ? b.el : b.el.querySelector('h1,h2,h3,header strong');
      const title = h ? txt(h).slice(0, 50) : '';
      if (title) return title;
      const cls = (typeof b.el.className === 'string' ? b.el.className : '').split(/\s+/);
      const NAMES = { 'page-head': 'Page title', stats: 'Stats row', toolbar: 'Filters', 'live-bar': 'Live status bar', chips: 'Filter chips', feed: 'Feed', callout: 'Message', 'table-wrap': 'Table', card: 'Panel', welcome: 'Welcome banner' };
      for (const c of cls) if (NAMES[c]) return NAMES[c];
      const first = txt(b.el).slice(0, 40);
      return first || 'Panel';
    },
    layout(d) { d.layout ||= {}; const r = route(); d.layout[r] ||= { order: {}, hidden: [], deleted: [] }; d.layout[r].order ||= {}; d.layout[r].hidden ||= []; d.layout[r].deleted ||= []; return d.layout[r]; },
    siblings: (parentKey) => (C()?.blocks() || []).filter((b) => b.parentKey === parentKey).map((b) => b.key),
    customOf: (el) => el.closest('[data-bf-custom]'),
    commitCustom(cel) {
      const id = cel.dataset.bfCustom, html = cleanClone(cel).outerHTML.replace(/\sdata-bf-custom="[^"]*"/, '');
      E.change('app', (d) => { const c = (d.custom?.[route()] || []).find((x) => x.id === id); if (c) c.html = html; });
    },
  };

  // ---------------- block operations (used by toolbar and editor panel) ----------------
  function keyOf(el) { return isApp ? el.dataset.bfKey : el.dataset.bfBlock; }
  function blockOf(t) {
    if (!t?.closest) return null;
    if (!isApp) return t.closest('[data-bf-block]');
    const list = A.list();
    let best = null;
    for (const b of list) if (b.el.contains(t) && (!best || best.el.contains(b.el))) best = b;
    return best?.el || null;
  }

  const ops = {
    listBlocks() {
      if (!isApp) return L.els().map((el) => ({ key: el.dataset.bfBlock, label: L.label(el), hidden: el.hasAttribute('data-bf-hidden'), custom: el.dataset.bfBlock.startsWith('c-'), depth: 0, parentKey: '', canDuplicate: true }));
      return A.list().map((b) => ({ key: b.key, label: A.label(b), hidden: b.el.hasAttribute('data-bf-hidden'), custom: !!b.el.dataset.bfCustom, depth: b.key.split('/').length - 2, parentKey: b.parentKey, canDuplicate: !!b.el.dataset.bfCustom }));
    },
    listDeleted() {
      if (!isApp) return Object.entries(E.doc('landing').blocks || {}).filter(([, b]) => b.deleted).map(([id]) => ({ key: id, label: E.codeLabel(id) }));
      const del = E.doc('app').layout?.[route()]?.deleted || [];
      return del.map((k) => ({ key: k, label: (k.split('/').pop().split('|')[1] || k.split('/').pop()).replace(/#\d+$/, '') }));
    },
    moveBlock(key, dir) {
      if (!isApp) {
        const el = L.el(key); if (!el) return;
        const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
        if (!sib?.dataset.bfBlock) return;
        dir < 0 ? sib.before(el) : sib.after(el);
        L.commitOrder(); flash(el); return;
      }
      const b = A.info(key); if (!b) return;
      const keys = A.siblings(b.parentKey); const i = keys.indexOf(key), j = i + dir;
      if (j < 0 || j >= keys.length) return;
      [keys[i], keys[j]] = [keys[j], keys[i]];
      E.change('app', (d) => { A.layout(d).order[b.parentKey] = keys; });
      setTimeout(() => flash(A.el(key)), 60);
    },
    moveBlockTo(key, targetKey, after) {
      if (key === targetKey) return;
      if (!isApp) {
        const el = L.el(key), t = L.el(targetKey); if (!el || !t) return;
        after ? t.after(el) : t.before(el);
        L.commitOrder(); flash(el); return;
      }
      const b = A.info(key), t = A.info(targetKey);
      if (!b || !t || b.parentKey !== t.parentKey) return E.toast('Panels can only move within the same area.', { error: true });
      const keys = A.siblings(b.parentKey).filter((k) => k !== key);
      keys.splice(keys.indexOf(targetKey) + (after ? 1 : 0), 0, key);
      E.change('app', (d) => { A.layout(d).order[b.parentKey] = keys; });
      setTimeout(() => flash(A.el(key)), 60);
    },
    toggleHidden(key) {
      if (!isApp) {
        const el = L.el(key); if (!el) return;
        const hide = !el.hasAttribute('data-bf-hidden');
        hide ? el.setAttribute('data-bf-hidden', '') : el.removeAttribute('data-bf-hidden');
        E.change('landing', (d) => { d.blocks ||= {}; d.blocks[key] = { ...(d.blocks[key] || {}), hidden: hide }; if (!hide) delete d.blocks[key].hidden; if (!d.order?.length) d.order = L.els().map((e) => e.dataset.bfBlock); });
        E.toast(hide ? 'Hidden: visitors won\'t see this block' : 'Visible again');
        return refreshSel();
      }
      E.change('app', (d) => { const l = A.layout(d); const i = l.hidden.indexOf(key); i < 0 ? l.hidden.push(key) : l.hidden.splice(i, 1); E.toast(i < 0 ? 'Hidden: visitors won\'t see this panel' : 'Visible again'); });
      setTimeout(refreshSel, 60);
    },
    deleteBlock(key) {
      hideToolbar();
      if (!isApp) {
        const el = L.el(key); if (!el) return;
        el.remove();
        E.change('landing', (d) => {
          d.blocks ||= {};
          if (key.startsWith('c-')) delete d.blocks[key]; else d.blocks[key] = { ...(d.blocks[key] || {}), deleted: true };
          d.order = L.els().map((e) => e.dataset.bfBlock);
        });
        E.select(null); E.toast(key.startsWith('c-') ? 'Block deleted' : 'Block deleted (you can restore it from the Blocks list)');
        return;
      }
      const b = A.info(key); if (!b) return;
      const cid = b.el.dataset.bfCustom;
      E.change('app', (d) => {
        if (cid) d.custom[route()] = (d.custom[route()] || []).filter((c) => c.id !== cid);
        else { const l = A.layout(d); if (!l.deleted.includes(key)) l.deleted.push(key); }
      });
      E.select(null); E.toast(cid ? 'Block deleted' : 'Panel deleted (you can restore it from the Blocks list)');
    },
    restoreBlock(key) {
      if (!isApp) { E.change('landing', (d) => { if (d.blocks?.[key]) delete d.blocks[key].deleted; }, { reload: true }); return; }
      E.change('app', (d) => { const l = A.layout(d); l.deleted = l.deleted.filter((k) => k !== key); });
    },
    duplicateBlock(key) {
      if (!isApp) {
        const el = L.el(key); if (!el) return;
        const c = cleanClone(el);
        for (const x of [c, ...c.querySelectorAll('[id],[aria-labelledby]')]) { x.removeAttribute('id'); x.removeAttribute('aria-labelledby'); }
        const id = rid(); c.dataset.bfBlock = id;
        el.after(c);
        const label = `${L.label(el)} (copy)`;
        E.change('landing', (d) => { d.blocks ||= {}; d.blocks[id] = { html: c.outerHTML, label }; d.order = L.els().map((e) => e.dataset.bfBlock); });
        flash(c); E.toast('Block duplicated'); return;
      }
      const b = A.info(key); const cid = b?.el.dataset.bfCustom; if (!cid) return;
      E.change('app', (d) => {
        const list = d.custom[route()] || []; const src = list.find((x) => x.id === cid); if (!src) return;
        list.splice(list.indexOf(src) + 1, 0, { ...src, id: rid(), after: key, label: `${src.label} (copy)` });
      });
      E.toast('Block duplicated');
    },
    insertBlock(html, label) {
      const tpl = document.createElement('template'); tpl.innerHTML = html.trim();
      const el = tpl.content.firstElementChild; if (!el) return;
      const id = rid();
      if (!isApp) {
        el.dataset.bfBlock = id;
        const anchor = selEl?.closest('[data-bf-block]') || L.el('signup')?.previousElementSibling || L.els().pop();
        anchor ? anchor.after(el) : mainEl().append(el);
        E.change('landing', (d) => { d.blocks ||= {}; d.blocks[id] = { html: cleanClone(el).outerHTML, label }; d.order = L.els().map((e) => e.dataset.bfBlock); });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el); return;
      }
      const anchor = selEl && A.list().find((b) => b.el === blockOf(selEl));
      const top = A.list().filter((b) => b.parentKey === '');
      const parent = anchor ? anchor.parentKey : '';
      const after = anchor ? anchor.key : top[top.length - 1]?.key || null;
      E.change('app', (d) => { d.custom ||= {}; (d.custom[route()] ||= []).push({ id, parent, after, html: el.outerHTML, label }); });
      setTimeout(() => { const n = document.querySelector(`[data-bf-custom="${id}"]`); n?.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(n); }, 120);
    },
    selectBlock(key) {
      const el = isApp ? A.el(key) : L.el(key);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      selectBlockEl(el);
    },
    setInteract(b) { interact = !!b; if (interact) { commitEdit(); hideToolbar(); clearSel(); } document.documentElement.classList.toggle('bf-interact', interact); },
    setAppDoc(doc) { if (isApp) C()?.setDoc(JSON.parse(JSON.stringify(doc))); },
  };

  function flash(el) { if (!el) return; el.classList.add('bf-flash'); setTimeout(() => el.classList.remove('bf-flash'), 900); }

  // ---------------- selection ----------------
  function clearSel() { if (selEl) selEl.removeAttribute('data-bf-sel'); selEl = null; }
  function setSel(el) { clearSel(); selEl = el; el?.setAttribute('data-bf-sel', ''); }
  function refreshSel() { if (selEl && document.contains(selEl)) { const b = blockOf(selEl); if (b === selEl) selectBlockEl(b); } }

  function selectBlockEl(el) {
    setSel(el);
    const key = keyOf(el);
    const label = isApp ? A.label(A.info(key) || { el }) : L.label(el);
    E.select({ kindLabel: `Block · ${label}`, blockKey: key, hidden: el.hasAttribute('data-bf-hidden'), canDuplicate: isApp ? !!el.dataset.bfCustom : true });
  }

  function selectImage(img) {
    setSel(img);
    const custom = isApp && A.customOf(img);
    const editableHtml = !isApp || custom;
    const commit = () => (isApp ? A.commitCustom(custom) : L.commitHtml(img));
    E.select({
      kindLabel: 'Image', image: img.currentSrc || img.src, alt: editableHtml ? img.getAttribute('alt') || '' : undefined,
      blockKey: blockOf(img) ? keyOf(blockOf(img)) : undefined, canDuplicate: !isApp,
      setImage(url) {
        if (editableHtml) {
          img.src = url; img.removeAttribute('srcset'); img.removeAttribute('sizes');
          if (img.parentElement?.tagName === 'PICTURE') img.parentElement.querySelectorAll('source').forEach((s) => s.remove());
          commit();
        } else {
          const from = C().origSrcOf(img);
          E.change('app', (d) => { d.images ||= {}; d.images[from] = url; });
        }
        E.toast('Image replaced');
      },
      setAlt(v) { img.setAttribute('alt', v); commit(); },
    });
  }

  // ---------------- inline text editing ----------------
  function editableTarget(t, ev) {
    let el = t;
    for (let i = 0; i < 4 && el && el !== document.body; i++, el = el.parentElement) {
      if (el.id === 'bf-tb') return null;
      if (el.matches(TEXT_SEL) && directText(el)) break;
    }
    if (!el || el === document.body || !el.matches?.(TEXT_SEL) || !directText(el)) return null;
    if (!isApp) return el.closest('[data-bf-block],[data-bf-region]') ? el : null;
    if (el.closest(DATA_SEL)) return null;
    if (!el.closest('#view, .side, .topbar')) return null;
    void ev;
    return el;
  }

  function startEdit(el, ev) {
    commitEdit();
    setSel(el);
    editing = { el, before: el.innerHTML, nodes: textNodes(el).map((n) => [n, isApp ? C().origOf(n) : n.nodeValue]) };
    window.__BF_EDITING = el;
    try { el.contentEditable = 'plaintext-only'; } catch { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
    el.focus({ preventScroll: true });
    const r = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
    if (r && el.contains(r.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const link = el.closest('a');
    const custom = isApp && A.customOf(el);
    const canHref = link && (!isApp || custom);
    const block = blockOf(el);
    E.select({
      kindLabel: link ? 'Link text' : el.matches('button,.btn,.bf2-cta') ? 'Button text' : el.matches('h1,h2,h3,h4') ? 'Heading' : 'Text',
      text: txt(el),
      href: canHref ? link.getAttribute('href') || '' : undefined,
      setHref(v) { link.setAttribute('href', v || '#'); isApp ? A.commitCustom(custom) : L.commitHtml(link); E.toast('Link updated'); },
      note: isApp && !custom ? (el.closest('.side, .topbar') ? 'This text is in the menu/top bar, so the change shows on every screen.' : 'The change applies wherever this exact text appears on this screen.') : undefined,
      blockKey: block ? keyOf(block) : undefined, hidden: block?.hasAttribute('data-bf-hidden'), canDuplicate: !isApp || !!block?.dataset.bfCustom,
    });
  }

  function commitEdit() {
    if (!editing) return;
    const { el, before, nodes } = editing;
    editing = null; window.__BF_EDITING = null;
    el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck');
    if (el.innerHTML === before) return;
    if (!isApp) { L.commitHtml(el); return; }
    const custom = A.customOf(el);
    if (custom) { A.commitCustom(custom); return; }
    const scope = el.closest('.side, .topbar') ? '_shell' : route();
    const now = textNodes(el);
    const pairs = [];
    if (now.length === nodes.length) nodes.forEach(([n, o], i) => pairs.push([o, now[i].nodeValue, now[i]]));
    else if (nodes.length === 1) pairs.push([nodes[0][1], el.textContent, null]);
    else if (!now.length && nodes.length) nodes.forEach(([, o]) => pairs.push([o, '', null]));
    else { E.toast('That edit mixed several pieces of text. Edit one line at a time.', { error: true }); el.innerHTML = before; return; }
    E.change('app', (d) => {
      d.text ||= {}; const map = (d.text[scope] ||= {});
      for (const [o, v, node] of pairs) {
        const from = o.trim(), to = v.trim();
        if (!from) continue;
        if (to === from) delete map[from]; else map[from] = to;
        if (node) C().setOrig(node, o);
      }
    });
  }

  function cancelEdit() {
    if (!editing) return;
    const { el, before } = editing;
    editing = null; window.__BF_EDITING = null;
    el.removeAttribute('contenteditable'); el.innerHTML = before;
  }

  // ---------------- events ----------------
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest?.('#bf-tb')) return;
    if (interact) {
      // "Use page" mode: everything works, but don't leave the page being edited.
      const a = t.closest?.('a[href]');
      if (a) { const u = new URL(a.href, location.href); if (u.pathname !== location.pathname || u.origin !== location.origin) { e.preventDefault(); E.toast('Links to other pages are off while editing. Use the page picker at the top.'); } }
      return;
    }
    if (editing && editing.el.contains(t)) return;
    e.preventDefault(); e.stopPropagation();
    commitEdit();
    if (t.tagName === 'IMG') return selectImage(t);
    if (isApp && route() === 'pricing' && t.closest?.('.pricing .plan, .pricing .hero, .pricing .price-big')) { setSel(t.closest('.plan, .hero')); return E.openPlans(); }
    const el = editableTarget(t, e);
    if (el) return startEdit(el, e);
    const b = blockOf(t);
    if (b) return selectBlockEl(b);
    clearSel(); E.select(null);
  }, true);
  // Keep app/page handlers from firing while editing (buttons, toggles, forms).
  for (const type of ['submit', 'change', 'input', 'mousedown', 'pointerdown', 'dblclick', 'auxclick']) {
    document.addEventListener(type, (e) => {
      if (interact || e.target.closest?.('#bf-tb')) return;
      if (editing && editing.el.contains(e.target)) return;
      if (type === 'submit') e.preventDefault();
      if (type !== 'mousedown' && type !== 'pointerdown') e.stopPropagation();
    }, true);
  }
  document.addEventListener('keydown', (e) => {
    if (!editing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const el = editing.el; commitEdit(); el.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    e.stopPropagation();
  }, true);
  document.addEventListener('focusout', (e) => { if (editing && e.target === editing.el) setTimeout(() => { if (editing && document.activeElement !== editing.el) commitEdit(); }, 0); }, true);
  document.addEventListener('paste', (e) => {
    if (!editing) return;
    e.preventDefault();
    const text = (e.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  }, true);

  // Hover toolbar
  function hideToolbar() { tb.hidden = true; if (hoverEl) hoverEl.removeAttribute('data-bf-hover'); hoverEl = null; }
  function placeToolbar(el) {
    const r = el.getBoundingClientRect();
    tb.style.top = `${Math.max(4, r.top + scrollY + 6)}px`;
    tb.style.left = `${Math.max(4, Math.min(r.right + scrollX - tb.offsetWidth - 6, document.documentElement.clientWidth - tb.offsetWidth - 4))}px`;
  }
  document.addEventListener('mousemove', (e) => {
    if (interact || dragKey) return;
    if (e.target.closest?.('#bf-tb')) return;
    const b = blockOf(e.target);
    if (b === hoverEl) return;
    if (hoverEl) hoverEl.removeAttribute('data-bf-hover');
    hoverEl = b;
    if (!b) { tb.hidden = true; return; }
    b.setAttribute('data-bf-hover', '');
    const key = keyOf(b);
    const custom = isApp ? !!b.dataset.bfCustom : true;
    tb.querySelector('.bf-tb-name').textContent = isApp ? A.label(A.info(key) || { el: b }) : L.label(b);
    tb.querySelector('[data-a=dup]').hidden = !custom;
    tb.querySelector('[data-a=hide]').textContent = b.hasAttribute('data-bf-hidden') ? 'Show' : 'Hide';
    tb.hidden = false;
    placeToolbar(b);
  }, { passive: true });
  addEventListener('scroll', () => { if (hoverEl && !tb.hidden) placeToolbar(hoverEl); }, { passive: true });
  tb.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a || !hoverEl) return;
    e.preventDefault(); e.stopPropagation();
    const key = keyOf(hoverEl);
    ({ up: () => ops.moveBlock(key, -1), down: () => ops.moveBlock(key, 1), dup: () => ops.duplicateBlock(key), hide: () => ops.toggleHidden(key), del: () => ops.deleteBlock(key) })[a]?.();
    setTimeout(() => { if (hoverEl && document.contains(hoverEl)) placeToolbar(hoverEl); else hideToolbar(); }, 80);
  });

  // On-page drag & drop (grip in the toolbar)
  const grip = tb.querySelector('.bf-tb-grip');
  grip.addEventListener('dragstart', (e) => {
    if (!hoverEl) return e.preventDefault();
    dragKey = keyOf(hoverEl);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragKey);
    try { e.dataTransfer.setDragImage(hoverEl, 20, 20); } catch { /* */ }
    hoverEl.classList.add('bf-dragging');
  });
  grip.addEventListener('dragend', () => { document.querySelectorAll('.bf-dragging').forEach((x) => x.classList.remove('bf-dragging')); dragKey = null; drop.hidden = true; });
  let dropTarget = null;
  document.addEventListener('dragover', (e) => {
    if (!dragKey) return;
    const src = isApp ? A.info(dragKey) : { parentKey: '' };
    let t = blockOf(e.target);
    // Climb to a sibling of the dragged block.
    if (isApp) { while (t && A.info(keyOf(t))?.parentKey !== src?.parentKey) t = t.parentElement && blockOf(t.parentElement); }
    if (!t || keyOf(t) === dragKey) { drop.hidden = true; dropTarget = null; return; }
    e.preventDefault();
    const r = t.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    dropTarget = { key: keyOf(t), after };
    drop.style.top = `${(after ? r.bottom : r.top) + scrollY - 2}px`;
    drop.style.left = `${r.left + scrollX}px`;
    drop.style.width = `${r.width}px`;
    drop.hidden = false;
  });
  document.addEventListener('drop', (e) => {
    if (!dragKey) return;
    e.preventDefault();
    if (dropTarget) ops.moveBlockTo(dragKey, dropTarget.key, dropTarget.after);
    drop.hidden = true; dragKey = null; dropTarget = null;
  });

  // App: tell the editor about screen changes and redraws.
  if (isApp) {
    let t;
    addEventListener('bf:applied', () => { clearTimeout(t); t = setTimeout(() => E.blocksChanged(), 400); });
    addEventListener('hashchange', () => { commitEdit(); hideToolbar(); clearSel(); E.select(null); setTimeout(() => E.routeChanged(route()), 50); });
  }

  E.frameReady(ops);
})();
