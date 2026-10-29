// QA for the theme module and the branded controls (UX items A5 and A8).
// Usage: node qa/theme-check.mjs   (server on :4400 or BF_URL)
//   - light by default (nothing stored), even with the OS in dark; the choice is remembered and applied before
//     first paint; an explicit 'auto' (Settings → System) follows the OS
//   - top-bar toggle and Settings (Light / Dark / System) stay in sync; meta theme-color follows
//   - the toggle is visible at 1440 and 390 on every route
//   - touch: 16px text inputs, >=44px buttons / icon buttons; keyboard focus always shows a 3px ring
import { browser, routes as navRoutes, appUrl, sleep } from './cdp.mjs';

const fails = [];
let passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else fails.push(msg); };

const b = await browser();
// System dark, nothing stored: clear bf-theme before each load (flags only, no theme).
await b.prefs({});
await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
// Record the theme the document had before any module script ran (readyState 'interactive' fires first).
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('readystatechange', () => {
  if (document.readyState === 'interactive' && !window.__bfFirst) window.__bfFirst = { attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor };
});` });
const state = () => b.run(() => {
  const t = document.getElementById('theme-toggle');
  return {
    attr: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('bf-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    pressed: t?.getAttribute('aria-pressed'),
    meta: document.querySelector('meta[name=theme-color]')?.content,
    seg: [...document.querySelectorAll('[data-seg=theme] button')].filter((x) => x.classList.contains('on')).map((x) => x.dataset.v + ':' + x.getAttribute('aria-pressed')).join(),
    first: window.__bfFirst,
  };
});
const dark = (bg) => { const [r, g, bl] = bg.match(/\d+/g).map(Number); return r + g + bl < 120; };

await b.go(appUrl('daily'), 1500);
await b.eval("localStorage.removeItem('bf-theme')");
await b.go(appUrl('daily'), 1500);
let s = await state();
ok(s.stored === null && s.attr === 'light' && !dark(s.bg) && s.pressed === 'false' && s.meta === '#FFFFFF' && s.first?.attr === 'light' && !dark(s.first.bg), `system dark, nothing stored renders light before first paint: ${JSON.stringify(s)}`);

await b.eval("document.getElementById('theme-toggle').click()"); await sleep(400); // headless can take a frame or two to repaint
s = await state();
ok(s.attr === 'dark' && s.stored === 'dark' && dark(s.bg) && s.pressed === 'true' && s.meta === '#06140D', `toggle to dark: ${JSON.stringify(s)}`);

await b.go(appUrl('arbitrage'), 1500);
s = await state();
ok(s.attr === 'dark' && dark(s.bg) && s.first?.attr === 'dark' && dark(s.first.bg) && s.meta === '#06140D', `dark remembered and applied before first paint: ${JSON.stringify(s)}`);

await b.eval("document.getElementById('theme-toggle').click()"); await sleep(400);
await b.go(appUrl('account'), 1500);
s = await state();
ok(s.stored === 'light' && s.seg === 'light:true' && s.first?.attr === 'light' && !dark(s.first.bg), `toggle back to light remembered; Settings shows Light: ${JSON.stringify(s)}`);
await b.eval("document.querySelector('[data-seg=theme] [data-v=auto]').click()"); await sleep(400); // headless can take a frame or two to repaint
s = await state();
ok(s.stored === 'auto' && s.attr === null && dark(s.bg) && s.pressed === 'true' && s.seg === 'auto:true', `Settings → System follows OS dark: ${JSON.stringify(s)}`);
// Explicit 'auto' stored with the OS in dark: dark from first paint on reload.
await b.go(appUrl('account'), 1500);
s = await state();
ok(s.stored === 'auto' && s.attr === null && dark(s.bg) && s.first?.attr === null && dark(s.first.bg) && s.meta === '#06140D' && s.seg === 'auto:true', `stored auto + OS dark renders dark before first paint: ${JSON.stringify(s)}`);
await b.eval("document.getElementById('theme-toggle').click()"); await sleep(400); // headless can take a frame or two to repaint
s = await state();
ok(s.stored === 'light' && s.seg === 'light:true' && s.pressed === 'false', `toggle updates Settings seg: ${JSON.stringify(s)}`);
await b.eval("document.querySelector('[data-seg=theme] [data-v=dark]').click()"); await sleep(400); // headless can take a frame or two to repaint
s = await state();
ok(s.attr === 'dark' && s.pressed === 'true' && s.meta === '#06140D', `Settings → Dark updates toggle: ${JSON.stringify(s)}`);
// OS flips to light while an explicit dark choice is stored: stays dark.
await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await sleep(100);
s = await state();
ok(dark(s.bg), 'explicit dark survives an OS change');
const range = await b.run(() => document.querySelector('[data-kelly]')?.style.getPropertyValue('--fill'));
ok(/%$/.test(range || ''), `range fill synced (--fill=${range})`);

// Keyboard focus: tab through the top of Settings; every focused element shows a >=3px ring (or its .num box does).
await b.eval('document.activeElement?.blur(); document.body.focus()');
const rings = [];
for (let i = 0; i < 40; i++) {
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  rings.push(await b.run(() => {
    const el = document.activeElement; if (!el || el === document.body) return null;
    const host = el.closest('.num') || el;
    const cs = getComputedStyle(host);
    return { el: el.tagName + (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.'), w: parseFloat(cs.outlineWidth), style: cs.outlineStyle };
  }));
}
const noRing = rings.filter((r) => r && (r.style === 'none' || r.w < 3));
ok(rings.filter(Boolean).length > 10 && !noRing.length, `focus ring on every tab stop (${rings.filter(Boolean).length} stops); missing: ${noRing.map((r) => r.el).join(', ')}`);

// Every route: toggle visible at 1440 and 390 (390 = touch: 44px targets, 16px inputs).
// A button's tap target counts an absolutely positioned ::after hit area (dense rows use 36px buttons + 4px each side).
const all = await navRoutes();
for (const [w, h, mob] of [[1440, 1000, false], [390, 844, true]]) {
  await b.size(w, h, mob);
  // Phones: emulate touch so (pointer: coarse) matches, like a real phone.
  await b.send('Emulation.setTouchEmulationEnabled', mob ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await b.send('Emulation.setEmitTouchEventsForMouse', { enabled: mob }).catch(() => {});
  for (const r of all) {
    await b.go(appUrl(r), 600);
    for (let i = 0; i < 25 && !(await b.eval("!!document.getElementById('theme-toggle') && !document.querySelector('#view .loading')")); i++) await sleep(200);
    await sleep(300);
    const v = await b.run(() => {
      const t = document.getElementById('theme-toggle'); const tr = t?.getBoundingClientRect();
      const coarse = matchMedia('(pointer: coarse)').matches;
      const vis = (el) => { const q = el.getBoundingClientRect(); return q.width > 0 && q.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      const smallBtns = coarse ? [...document.querySelectorAll('#view .btn, .topbar .icon-btn')].filter(vis).filter((el) => { const h = el.getBoundingClientRect().height; const af = getComputedStyle(el, '::after'); const hit = af.content !== 'none' && af.position === 'absolute' ? -(parseFloat(af.top) || 0) - (parseFloat(af.bottom) || 0) : 0; return h + Math.max(0, hit) < 43.5; }).map((el) => el.textContent.trim().slice(0, 20)) : [];
      const smallInputs = coarse ? [...document.querySelectorAll('#view input:not([type=range]):not([type=checkbox]):not([type=radio]), #view select, #view textarea, .topbar select')].filter(vis).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.outerHTML.slice(0, 40)) : [];
      return { toggle: !!tr && tr.width >= 40 && tr.left >= 0 && tr.right <= innerWidth && tr.top >= 0 && tr.bottom <= 80, size: tr && Math.round(tr.width), coarse, smallBtns, smallInputs };
    });
    ok(v.toggle, `${w} ${r}: theme toggle not visible in the top bar`);
    if (mob) {
      ok(v.coarse && v.size >= 44, `${w} ${r}: coarse pointer / 44px toggle (${v.coarse}, ${v.size})`);
      ok(!v.smallBtns.length, `${w} ${r}: buttons under 44px on touch: ${v.smallBtns.slice(0, 4).join(' | ')}`);
      ok(!v.smallInputs.length, `${w} ${r}: inputs under 16px on touch: ${v.smallInputs.slice(0, 3).join(' | ')}`);
    }
  }
}
b.close();
console.log(fails.length ? fails.map((f) => 'FAIL ' + f).join('\n') : 'all theme/controls checks pass');
console.log(`${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
