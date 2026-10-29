// Regenerates the 12 app screenshots used on the landing page (public/landing/img/app-<route>.*).
// Each is the app's content area only (sidebar and top bar cropped out), 1192x947 CSS px, light theme,
// with the QA flags from cdp.mjs (All-Access plan, setup done) and animations switched off so every
// shot shows a settled sample state. Writes .png (1x), .webp (1x) and @2x.webp (2x); needs Python + Pillow.
//   node qa/landing-shots.mjs [route ...]
import { browser, appUrl, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../public/landing/img');
const W = 1192, H = 947;
const ALL = ['daily', 'arbitrage', 'positive-ev', 'promo-converter', 'sharp-money', 'prediction-traders', 'ai-picks',
  'live-ai', 'bettor-signals', 'parlay-builder', 'pm-markets', 'screen'];
const list = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const tmp = join(tmpdir(), 'bf-landing-shots'); mkdirSync(tmp, { recursive: true });

const b = await browser({ width: 1440, height: 1000, theme: 'light' });
// Measure the shell once, then size the window so the content column is exactly W wide.
await b.go(appUrl('daily'), 2500);
const shell = await b.run(() => {
  const m = document.getElementById('main').getBoundingClientRect();
  const t = document.querySelector('.topbar').getBoundingClientRect();
  return { mainLeft: m.left, mainWidth: m.width, top: t.bottom };
});
const vw = Math.round(1440 - shell.mainWidth + W);
const vh = Math.ceil(shell.top + H);
await b.send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2, mobile: false });
console.log(`shell: sidebar ${shell.mainLeft}px, top bar ${shell.top}px -> window ${vw}x${vh} @2x`);

for (const route of list) {
  await b.go(appUrl(route), 3500);
  // Keep the feed live (a paused status would show in the shot) but switch off animations and transitions,
  // so rows that just updated show their settled state rather than a half-faded flash.
  await b.eval(`(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(s); })()`);
  await b.eval(`document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)`);
  await sleep(1800);
  const r = await b.run(() => {
    const m = document.getElementById('main').getBoundingClientRect();
    const t = document.querySelector('.topbar').getBoundingClientRect();
    return { x: m.left, y: t.bottom, w: m.width };
  });
  if (Math.abs(r.w - W) > 1) console.warn(`${route}: content width ${r.w}, expected ${W}`);
  const s = await b.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: W, height: H, scale: 1 }, captureBeyondViewport: false });
  const raw = join(tmp, `${route}@2x.png`);
  writeFileSync(raw, Buffer.from(s.data, 'base64'));
  const base = join(OUT, `app-${route}`);
  execFileSync('python', ['-c', `
import sys
from PIL import Image
src, base, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB')
assert im.size == (w*2, h*2), im.size
im.save(base + '@2x.webp', 'WEBP', quality=80, method=6)
one = im.resize((w, h), Image.LANCZOS)
one.save(base + '.webp', 'WEBP', quality=82, method=6)
one.save(base + '.png', 'PNG', optimize=True)
`, raw, base, String(W), String(H)]);
  console.log(`${route}: ok${b.errors.length ? ` (page errors: ${b.errors.splice(0).join(' | ').slice(0, 200)})` : ''}`);
}
b.close();
