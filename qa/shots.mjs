// Brand QA: screenshot every app screen + the landing page at 390 and 1440, light and dark,
// and audit the rendered page against DESIGN.md's banned list plus a text-contrast check.
// Usage: node qa/shots.mjs [route ...]   (server on :4400 or BF_URL; writes qa/shots/<theme>-<width>-<route>.png)
//   env OUT=shots/<dir>  THEMES=light,dark  WIDTHS=390,1440  QA_FLAGS='{"onboarded":false}' (first-run shots)
// Each theme is set the way a user sets it (localStorage bf-theme) and via prefers-color-scheme, so dark shots
// are dark whichever one the app reads. Deterministic flags (plan, onboarded) come from qa/cdp.mjs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, routes as navRoutes, appUrl, CORE_ROUTES } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.OUT ? resolve(here, process.env.OUT) : join(here, 'shots'); mkdirSync(out, { recursive: true });
const all = await navRoutes();
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['landing', ...all];
if (!process.argv.slice(2).length) console.log(`${all.length} app routes found in nav.js (${CORE_ROUTES.length} core routes present)`);
const themes = (process.env.THEMES || 'light,dark').split(',');
const widths = (process.env.WIDTHS || '390,1440').split(',').map(Number);

// Runs in the page: list elements that break the brand rules, low-contrast text, and a theme sanity check.
function audit(theme) {
  const issues = [];
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const isRed = ([r, g, b, a = 1]) => a > .5 && r > 170 && g < 110 && b < 110;
  const isCream = ([r, g, b, a = 1]) => a > .5 && r >= 240 && g >= 235 && b >= 205 && b < 236 && r - b > 10;
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || '').trim().slice(0, 24) + '"';
  // Contrast helpers (WCAG 2.x relative luminance). Backgrounds are resolved by walking up and blending
  // semi-transparent layers; anything over a gradient or image is skipped (can't be judged from CSS).
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const blend = (top, under) => { const a = top[3] ?? 1; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)); };
  function bgOf(el) {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = rgb(cs.backgroundColor);
      if (c.length >= 3 && (c[3] ?? 1) > 0) { layers.push(c); if ((c[3] ?? 1) >= 1) break; }
    }
    let base = theme === 'dark' ? [0, 0, 0] : [255, 255, 255];
    for (const l of layers.reverse()) base = blend(l, base);
    return base;
  }
  const CONTRAST_SEL = '.callout, .callout *, .price.best, .price.best *, .btn, button.btn, a.btn, .seg button.on, .chip.on';
  // Lime is only allowed on green grounds (DESIGN.md §1): a lime-filled button on a light ground is a brand issue.
  const isLime = ([r, g, b, a = 1]) => a > .5 && r >= 170 && r <= 215 && g >= 225 && b <= 90;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const btnLike = el.matches('button, .btn, a.btn, .chip, .tag, .pill, .bf2-cta, [role=button], input[type=submit]');
    if (btnLike && parseFloat(cs.borderTopLeftRadius) >= Math.min(r.height / 2, 30) && r.height > 14 && !el.matches('.avatar, .sw *, [class*=dot], [class*=switch]')) issues.push('pill shape: ' + name(el));
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (/monospace|consolas|sf mono|menlo|courier/i.test(cs.fontFamily) && ownText) issues.push('monospace: ' + name(el));
    if (cs.fontStyle === 'italic' && /barlow/i.test(cs.fontFamily)) issues.push('italic Barlow: ' + name(el));
    if (btnLike && el.matches('button, .btn, .bf2-cta') && isRed(rgb(cs.backgroundColor))) issues.push('red button: ' + name(el));
    if (btnLike && el.matches('button, .btn, .bf2-cta') && isLime(rgb(cs.backgroundColor))) {
      const under = el.parentElement && bgOf(el.parentElement);
      if (under && lum(under) > 0.6) issues.push('lime button on a light ground: ' + name(el));
    }
    if (r.width > innerWidth * .6 && isCream(rgb(cs.backgroundColor))) issues.push('cream ground: ' + name(el));
    if (/^H[123]$/.test(el.tagName) && cs.textTransform === 'uppercase' && /BetFriend/.test(el.textContent) && !el.querySelector('.bf-name')) issues.push('BetFriend in uppercase heading: ' + name(el));
    if (ownText && el.matches(CONTRAST_SEL) && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.5) {
      const bg = bgOf(el), fg = rgb(cs.color);
      if (bg && fg.length >= 3) {
        const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
        const c = ratio(blend(fg, bg), bg);
        if (c < need && !el.matches(':disabled, [aria-disabled=true]')) issues.push(`low contrast ${c.toFixed(2)}:1 (needs ${need}): ` + name(el));
      }
    }
  }
  // Dark shots must actually be dark: the page ground behind #app / body.
  // The landing page is light-only by design, so this check covers the app.
  if (location.pathname.startsWith('/app')) {
    const ground = bgOf(document.querySelector('#view') || document.body) || [255, 255, 255];
    const isDark = lum(ground) < 0.2;
    if (theme === 'dark' && !isDark) issues.push('theme: dark shot has a light page ground');
    if (theme === 'light' && isDark) issues.push('theme: light shot has a dark page ground');
    // The theme toggle must be visible in the top bar at every width (item A5).
    const tg = document.getElementById('theme-toggle');
    const tr = tg && tg.getBoundingClientRect();
    if (!tr || !tr.width || tr.right > innerWidth || tr.left < 0) issues.push('theme toggle missing or off-screen');
    else if (tg.getAttribute('aria-pressed') !== String(theme === 'dark')) issues.push(`theme toggle aria-pressed=${tg.getAttribute('aria-pressed')} in ${theme}`);
  }
  const overflow = document.documentElement.scrollWidth - innerWidth;
  if (overflow > 0) issues.push('horizontal overflow ' + overflow + 'px');
  // Collapse repeats of the same problem on the same kind of element (e.g. every row's Bet button).
  const seen = new Map();
  for (const i of issues) { const k = i.replace(/ "[^"]*"$/, ''); seen.set(k, seen.has(k) ? seen.get(k).replace(/( ×\d+)?$/, (m) => ` ×${(parseInt(m.slice(2)) || 1) + 1}`) : i); }
  return [...seen.values()].slice(0, 14);
}

const report = [];
const b = await browser();
for (const theme of themes) {
  await b.prefs({ theme });
  for (const w of widths) {
    await b.size(w, w < 500 ? 844 : 1000, w < 500);
    for (const r of routes) {
      b.errors.length = 0;
      await b.go(appUrl(r), r === 'landing' ? 2200 : 1700);
      const v = (await b.run(audit, theme).catch((e) => [`audit failed: ${e.message.slice(0, 80)}`])) || [];
      await b.shot(join(out, `${theme}-${w}-${r}.png`));
      if (v.length || b.errors.length) report.push(`${theme} ${w} ${r}: ${[...v, ...b.errors.map((e) => 'JS error: ' + String(e).slice(0, 120))].join(' | ')}`);
    }
  }
}
b.close();
console.log(report.join('\n') || 'no brand issues found');
console.log(`${themes.length * widths.length * routes.length} screens checked; shots in ${relative(process.cwd(), out) || '.'}`);
process.exit(0);
