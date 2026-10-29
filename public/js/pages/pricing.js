// Plans & Pricing: standalone OddsJam-style packages plus the All-Access membership.
// Layout follows the landing page (DESIGN.md §6.5 hero band, §6.13 plan cards, §6.16 sticky bar):
//   green hero (All-Access, Coach Mate touchdown, lime CTA + terms) → standalone plan cards (carousel on
//   phones) → compare table (sticky tool column; a plan picker on phones) → competitor prices.
// Editor contract: `.pricing .hero`, `.pricing .plan` and the first `.pricing .price-big` (the All-Access
// price) open the owner's plan editor (admin/frame.js); headings are static; live figures sit in nodata.
import { NAV } from '../nav.js';

const CSS = `
/* ---------- hero: --hero-g band (white text 5.4:1), price on a pitch-deep tile (lime + light text reach AA there) ---------- */
.pricing .hero { position:relative; display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr); grid-template-areas:'copy price' 'list price'; gap:14px 36px; align-items:start;
  background:var(--hero-g); color:#FFFFFF; border-radius:18px; padding:28px 28px 30px; margin:4px 0 8px; }
.pricing .hero-copy { grid-area:copy; display:grid; gap:10px; justify-items:start; min-width:0; }
.pricing .hero-copy h2 { font-size:clamp(36px,4.2vw,56px); line-height:.92; color:#FFFFFF; max-width:14ch; }
.pricing .hero-lead { margin:0; font-size:17px; font-weight:600; line-height:1.45; color:#FFFFFF; max-width:52ch; }
.pricing .hero-list { grid-area:list; min-width:0; display:grid; gap:14px; }
.pricing .hero-list .bf2-checks { grid-template-columns:1fr 1fr; gap:8px 18px; font-size:16px; font-weight:700; color:#FFFFFF; }
.pricing .hero-tags { display:flex; gap:8px; flex-wrap:wrap; }
.pricing .hero-mate { position:absolute; right:22px; top:-34px; width:84px; height:84px; pointer-events:none; z-index:1; }
.pricing .nowrap { white-space:nowrap; }
.pricing .price-tile { grid-area:price; background:var(--pitch-deep); border-radius:16px; padding:20px; display:grid; gap:10px; align-content:start; color:var(--on-pitch-mute); box-shadow:6px 6px 0 var(--deep); }
.pricing .price-tile .pt-l { margin:0; font-size:14px; font-weight:800; color:var(--on-green-soft); }
.pricing .price-big { font:900 64px/.9 var(--f-head); color:var(--lime); letter-spacing:.005em; font-variant-numeric:tabular-nums; }
.pricing .price-big small { font:700 16px var(--f-body); color:var(--on-pitch-mute); margin-left:4px; letter-spacing:0; }
.pricing .strike { margin:0; font-size:14px; font-weight:600; color:var(--on-pitch-mute); }
.pricing .strike s { text-decoration-thickness:2px; }
.pricing .save { justify-self:start; background:var(--lime); color:var(--pitch-deep); font-weight:800; font-size:15px; border-radius:8px; padding:4px 10px; }
.pricing .comp-line { margin:0; font-size:14px; font-weight:600; color:var(--on-pitch-mute); }
.pricing .price-tile .cta { max-width:none; }
.pricing .price-tile .cta-terms { color:var(--on-pitch-mute); }
.pricing .price-tile .btn.lime { min-height:56px; font-size:22px; }
.pricing .pick-aa { background:transparent; color:#FFFFFF; border-color:rgba(255,255,255,.55); box-shadow:none; }
.pricing .pick-aa:hover { border-color:var(--lime); }
.pricing .bf2-tag.on-tile { background:var(--lime); color:var(--pitch-deep); }

/* ---------- standalone plan cards (landing .bf2-plan) ---------- */
.pricing .plans-sec { margin-top:28px; }
.pricing .bf2-plans { margin-top:0; }
.pricing .plan h3 { font-size:26px; }
.pricing .plan .plan-tags { order:-1; display:flex; gap:6px; flex-wrap:wrap; }
.pricing .plan .plan-tags:empty { display:none; }
.pricing .plan .bf2-price { font-variant-numeric:tabular-nums; }
.pricing .plan .per-mo { margin:-4px 0 0; font-size:13px; font-weight:600; color:var(--muted); }
.pricing .plan .bf2-checks { font-size:15px; gap:8px; }
.pricing .bonus { border-top:1px solid var(--line); padding-top:12px; display:grid; gap:8px; }
.pricing .bonus h4 { margin:0; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.pricing .bonus div { display:flex; justify-content:space-between; align-items:baseline; gap:10px; font-size:14px; }
.pricing .bonus small { display:block; color:var(--muted); font-size:13px; line-height:1.35; margin-top:2px; }
.pricing .bonus b { color:var(--pos); white-space:nowrap; font-variant-numeric:tabular-nums; }
.pricing .plan .cta { max-width:none; margin-top:auto; padding-top:6px; }
.pricing .plan .preview { justify-self:start; padding-inline:4px; }
.pricing .plan { position:relative; display:flex; flex-direction:column; gap:10px; } /* flex so the CTA sits at the bottom of every card */
.pricing .carousel-nav { display:none; }

/* ---------- compare table: sticky tool column; fits at 1440 without sideways scroll ---------- */
.pricing .cmp-pick { display:none; }
.pricing .cmp-wrap { overflow-x:auto; border:2px solid var(--line); border-radius:var(--r); }
.pricing .cmp { table-layout:fixed; min-width:880px; }
.pricing .cmp th { white-space:normal; line-height:1.2; vertical-align:bottom; font-size:11.5px; padding:10px 8px; }
.pricing .cmp th:first-child, .pricing .cmp td:first-child { position:sticky; left:0; z-index:1; width:200px; background:var(--paper); box-shadow:inset -2px 0 0 var(--line-2); }
.pricing .cmp thead th:first-child { background:var(--panel); z-index:2; }
.pricing .cmp td { padding:8px; }
.pricing .cmp th:not(:first-child) { text-align:center; }
.pricing .cmp td.y { color:var(--pos); font-weight:800; text-align:center; }
.pricing .cmp td.n { color:var(--muted); text-align:center; }
.pricing .cmp .aa { background:var(--soft); }
.pricing .cmp thead th.aa { background:var(--deep); color:#FFFFFF; }
.pricing .cmp thead th.cur { box-shadow:inset 0 -4px 0 var(--g); }
@media (min-width:1180px) {
  /* The table fits: no inner scroller, so the head can stick under the top bar. */
  .pricing .cmp-wrap { overflow:visible; }
  .pricing .cmp { min-width:0; }
  .pricing .cmp thead th { position:sticky; top:var(--topbar-h); z-index:var(--z-thead); }
  .pricing .cmp thead th:first-child { z-index:calc(var(--z-thead) + 1); }
}

/* ---------- competitors ---------- */
.pricing .comp-grid { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:20px; align-items:start; }
.pricing .comp-grid .aside { display:grid; gap:12px; }
.pricing .comp-grid .aside h3 { font-size:22px; }
.pricing .comp-grid .facts { margin:0; }
.pricing tr.total td { font-weight:800; border-top:2px solid var(--line); }
.pricing tr.ours td { background:var(--hl); font-weight:800; }

/* ---------- sticky CTA bar (phones only, §6.16): hidden while any in-page CTA is on screen ---------- */
.pricing .actionbar { display:none; }
.pricing .actionbar .cta { max-width:none; width:100%; gap:4px; }
.pricing .actionbar .btn { min-height:52px; }
.pricing .actionbar .cta-terms { text-align:center; font-size:12px; }

@media (max-width:1100px) {
  .pricing .hero { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
  .pricing .hero-list .bf2-checks { grid-template-columns:1fr; }
  .pricing .hero-mate { display:none; }
}
@media (max-width:979px) {
  .pricing .actionbar { display:flex; margin-inline:-16px; margin-bottom:-40px; }
}
@media (max-width:860px) {
  /* Phones: price, saving and CTA first, then what's included. */
  .pricing .hero { grid-template-columns:1fr; grid-template-areas:'copy' 'price' 'list'; padding:20px 16px 22px; margin-inline:-4px; gap:16px; }
  .pricing .hero-copy h2 { font-size:38px; }
  .pricing .lead-more { display:none; } /* the check list below says the same; keeps the CTA high */
  .pricing .price-tile { padding:16px; box-shadow:4px 4px 0 var(--deep); }
  .pricing .price-big { font-size:56px; }
  .pricing .cmp-pick { display:block; margin-bottom:10px; }
  .pricing .cmp-wrap { border:0; overflow:visible; }
  .pricing .cmp { min-width:0; }
  .pricing .cmp .off { display:none; }
  .pricing .cmp th:first-child, .pricing .cmp td:first-child { width:auto; position:static; box-shadow:none; }
  .pricing .cmp th:not(:first-child), .pricing .cmp td:not(:first-child) { width:96px; }
  .pricing .comp-grid { grid-template-columns:1fr; }
}
@media (max-width:699px) {
  /* Plan carousel: swipe sideways inside the row; the page itself never scrolls sideways. */
  .pricing .bf2-plans { grid-auto-flow:column; grid-auto-columns:86%; grid-template-columns:none; overflow-x:auto; scroll-snap-type:x mandatory;
    margin-inline:-16px; padding:4px 16px 14px; scroll-padding-inline:16px; scrollbar-width:none; overscroll-behavior-x:contain; }
  .pricing .bf2-plans::-webkit-scrollbar { display:none; }
  .pricing .bf2-plans { align-items:start; }
  .pricing .bf2-plans > .plan { scroll-snap-align:start; }
  .pricing .carousel-nav { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
  .pricing .carousel-nav p { margin:0; font-size:13px; font-weight:600; color:var(--muted); }
  .pricing .carousel-nav .icon-btn { width:44px; height:44px; display:inline-grid; place-items:center; }
}
@media (prefers-reduced-motion: reduce) { .pricing .bf2-plans { scroll-behavior:auto; } }
`;

// Competitor tiers for the comparison (from the OrcaVault research tier files, 27 Oct 2026).
const COMPETITORS = [
  ['OddsJam Live Arbitrage & EV', 499.99], ['OddsJam Sharp Money', 199.99], ['OddsJam Prediction Traders', 449.99],
  ['OddsJam Promo Arbitrage', 79.99], ['Rithmm Pro (AI picks)', 49.99], ['Outlier Pro + React Live', 79.99], ['BetQL All Access', 70],
];

// What All-Access covers, in plain words (hero check list).
const AA_LIST = ['Pre-match &amp; live arbitrage', 'Pre-match &amp; live +EV', 'Middles &amp; low holds', 'Promo converter &amp; optimizer',
  'Sharp Money (Novig &amp; Prophet X)', 'Pro bettor signals', 'AI sports picks &amp; live AI', 'Prediction traders &amp; AI market picks',
  'Sportsbook Screen &amp; Parlay Builder', 'Daily Card across every tool'];

// Plan copy comes from plans.js (owner-editable). The app never promises an outcome (no "guaranteed" /
// "lock"), so the few legacy phrases are reworded at display time. Anything else passes through as written.
const SAFE_COPY = [
  [/pairs of bets that make guaranteed profit/i, 'Pairs of bets that pay out whichever side wins, if both legs fill'],
  [/lock in profit by betting on both sides/i, 'Bet both sides at two books'],
  [/guaranteed/gi, 'hedged'],
];
const safe = (s) => SAFE_COPY.reduce((t, [re, to]) => t.replace(re, to), String(s ?? ''));

const usd = (x) => `$${Number(x).toLocaleString('en-US', { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const toolLabels = new Map(NAV.flatMap((g) => g.items.map(([id, label]) => [id, label])));

export default function render(root, { ui, plans, store, params }) {
  if (!document.getElementById('css-pricing')) document.head.insertAdjacentHTML('beforeend', `<style id="css-pricing">${CSS}</style>`);
  const { PLANS, ALL_ACCESS } = plans;
  let period = params.period === 'annual' ? 'annual' : 'monthly';
  // Phones: which standalone plan the compare table shows next to All-Access.
  let pick = (PLANS.find((p) => p.popular) || PLANS[1] || PLANS[0]).id;
  let offBar = () => {};

  const draw = () => {
    offBar();
    const paid = PLANS.filter((p) => p.id !== 'free');
    const sum = paid.reduce((a, p) => a + p[period], 0);
    const aa = ALL_ACCESS[period];
    const per = period === 'monthly' ? '/mo' : '/yr';
    const perLong = period === 'monthly' ? 'month' : 'year';
    const bonusValue = paid.reduce((a, p) => a + p.bonus.reduce((x, b) => x + b.value, 0), 0);
    const compSum = COMPETITORS.reduce((a, c) => a + c[1], 0);
    const allTools = [...new Set(paid.flatMap((p) => [...p.tools, ...p.bonus.map((b) => b.tool)]))];
    const cur = store.get().plan || 'all-access';
    const toolLabel = (t) => toolLabels.get(t) || t;
    const aaTerms = `7-day free trial, then ${usd(aa)}/${perLong} unless you cancel. Proposed price.`;

    const planCard = (p) => {
      const free = !p[period];
      const terms = free ? '$0 forever. Upgrade any time.' : `7-day free trial, then ${usd(p[period])}/${perLong} unless you cancel.`;
      return `<article class="plan bf2-plan${p.popular ? ' on' : ''}" data-plan-id="${ui.esc(p.id)}">
        <h3>${ui.headText(p.name)}</h3>
        <div class="plan-tags">${p.popular ? '<span class="bf2-tag dark">Most popular</span>' : ''}${cur === p.id ? '<span class="bf2-tag">Your plan</span>' : ''}</div>
        <p class="bf2-plan-for">${ui.esc(safe(p.tagline))}</p>
        <p class="bf2-price">${free ? '$0' : usd(p[period])}<small>${free ? 'forever' : per}</small></p>
        ${period === 'annual' && p.monthly ? `<p class="per-mo">${usd(+(p.annual / 12).toFixed(2))}/mo billed yearly</p>` : ''}
        ${ui.checks(p.bullets.map((b) => ui.esc(safe(b))))}
        ${p.bonus.length ? `<div class="bonus"><h4>Earn even more with these bonus tools</h4>${p.bonus.map((b) => `<div><span><a href="#/${ui.esc(b.tool)}">${ui.esc(b.name)}</a><small>${ui.esc(safe(b.desc))}</small></span><b>$${b.value} value</b></div>`).join('')}</div>` : ''}
        ${ui.cta(free ? 'Create free account' : 'Start free trial', terms, { tone: p.popular ? 'primary' : 'outline', block: true, attrs: `data-trial="${ui.esc(p.id)}" data-cta` })}
        <button type="button" class="btn sm ghost preview" data-pick="${ui.esc(p.id)}"${cur === p.id ? ' aria-pressed="true"' : ''}>Preview this plan in the app</button>
      </article>`;
    };

    const cmpRows = ['daily', ...allTools.filter((t) => t !== 'daily')].map((t) => `<tr><td><a href="#/${t}">${ui.esc(toolLabel(t))}</a></td>${PLANS.map((p) => {
      const has = p.tools.includes(t) || p.bonus.some((b) => b.tool === t);
      return `<td class="${has ? 'y' : 'n'}${p.id === pick ? '' : ' off'}" data-p="${ui.esc(p.id)}">${has ? '<span aria-label="Included">✓</span>' : '<span aria-label="Not included">–</span>'}</td>`;
    }).join('')}<td class="y aa" data-p="aa"><span aria-label="Included">✓</span></td></tr>`).join('');

    root.innerHTML = `<div class="pricing">
      ${ui.pageHead({ title: 'Plans & Pricing', subtitle: 'Pick one tool or get every tool in one membership. 7-day free trial on every paid plan. Proposed prices.',
        actions: ui.seg('period', [['monthly', 'Monthly'], ['annual', 'Annual · save up to 33%']], period) })}

      <section class="hero on-green" aria-labelledby="aa-h">
        <img class="hero-mate" src="../img/coach-mate-touchdown.svg" alt="" width="92" height="92">
        <div class="hero-copy">
          <div class="hero-tags"><span class="bf2-tag on-tile">Best value</span>${cur === 'all-access' ? '<span class="bf2-tag on-tile">Your plan</span>' : ''}</div>
          <h2 id="aa-h">${ui.headText(ALL_ACCESS.name).replace(/All-Access/g, '<span class="nowrap">All-Access</span>')}</h2>
          <p class="hero-lead">${ui.esc(safe(ALL_ACCESS.tagline))}<span class="lead-more"> Arbitrage, +EV, middles, low holds, promos, sharp money, pro bettor signals, AI picks, live AI and prediction markets.</span></p>
        </div>
        <div class="price-tile">
          <p class="pt-l">All-Access, every tool</p>
          <div class="price-big"><span data-bf-nodata>${usd(aa)}</span><small>${per}</small></div>
          <p class="strike"><s data-bf-nodata>${usd(+sum.toFixed(2))}${per}</s> if bought separately</p>
          <span class="save" data-bf-nodata>Save ${usd(+(sum - aa).toFixed(2))}${per} · ${Math.round((1 - aa / sum) * 100)}% off</span>
          <p class="comp-line">Comparable competitor tools cost <b data-bf-nodata>${usd(+compSum.toFixed(2))}/mo</b> combined.</p>
          ${ui.cta('Start 7-day free trial', aaTerms, { tone: 'lime', block: true, attrs: 'data-trial="all-access" data-cta id="aa-cta"' })}
          <button type="button" class="btn block pick-aa" data-pick="all-access"${cur === 'all-access' ? ' aria-pressed="true"' : ''}>Set as my plan in this prototype</button>
        </div>
        <div class="hero-list">${ui.checks(AA_LIST)}</div>
      </section>

      ${ui.sec('Standalone plans', `
        <div class="carousel-nav"><p>Swipe to see all ${PLANS.length} plans</p><span class="row">
          <button type="button" class="icon-btn" data-car="-1" aria-label="Previous plan">‹</button>
          <button type="button" class="icon-btn" data-car="1" aria-label="Next plan">›</button></span></div>
        <div class="bf2-plans plans" data-plans>${PLANS.map(planCard).join('')}</div>`, { cls: 'plans-sec' })}

      ${ui.sec('Compare plans', `
        <div class="cmp-pick">${ui.select('cmp', PLANS.map((p) => [p.id, p.name]), pick, 'Compare a plan with All-Access')}</div>
        <div class="cmp-wrap"><table class="t cmp">
          <caption class="sr-only">Which tools each plan includes</caption>
          <thead><tr><th scope="col">Tool</th>${PLANS.map((p) => `<th scope="col" class="${p.id === pick ? '' : 'off'}${cur === p.id ? ' cur' : ''}" data-p="${ui.esc(p.id)}">${ui.esc(p.name)}</th>`).join('')}<th scope="col" class="aa${cur === 'all-access' ? ' cur' : ''}" data-p="aa">All-Access</th></tr></thead>
          <tbody>${cmpRows}</tbody>
        </table></div>`)}

      ${ui.sec('What the same tools cost elsewhere', `<div class="comp-grid">
        <div class="table-wrap"><table class="t">
          <thead><tr><th scope="col">Competitor plan</th><th scope="col" class="num">Monthly</th></tr></thead>
          <tbody>${COMPETITORS.map(([nm, v]) => `<tr><td>${ui.esc(nm)}</td><td class="num">$${v.toFixed(2)}</td></tr>`).join('')}
          <tr class="total"><td>Total</td><td class="num">$${compSum.toFixed(2)}</td></tr>
          <tr class="ours"><td>BetFriend All-Access</td><td class="num">$${ALL_ACCESS.monthly}</td></tr></tbody>
        </table></div>
        <aside class="aside">
          <h3>One membership instead of seven subscriptions</h3>
          ${ui.facts([
            { label: 'You save vs competitors', value: `$${(compSum - ALL_ACCESS.monthly).toFixed(0)}/mo`, tone: 'pos' },
            { label: 'Bonus tool value included', value: `$${bonusValue.toLocaleString('en-US')}` },
          ])}
          <p class="muted" style="margin:0">Competitor prices are their published monthly plans. BetFriend prices are proposed for launch.</p>
        </aside></div>`)}

      ${ui.actionBar('<h2 class="sr-only">All-Access free trial</h2>' + ui.cta('Start 7-day free trial', `${usd(aa)}${per} after the trial. Cancel any time.`, { tone: 'primary', block: true, attrs: 'data-trial="all-access" data-bar-cta tabindex="-1"' }), { cls: 'is-hidden' })}
    </div>`;

    ui.onSeg(root, 'period', (v) => { period = v; ui.setQuery({ period: v === 'annual' ? 'annual' : null }); draw(); });
    ui.onSelect(root, 'cmp', (v) => {
      pick = v;
      root.querySelectorAll('.cmp [data-p]').forEach((c) => c.classList.toggle('off', c.dataset.p !== 'aa' && c.dataset.p !== pick));
    });
    root.querySelectorAll('[data-trial]').forEach((b) => b.addEventListener('click', () => ui.toast('Checkout opens here (Stripe) in production')));
    root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.pick;
      store.set({ plan: id });
      ui.toast(id === 'all-access' ? 'Plan set to All-Access' : `Plan set to ${ui.planName(id)}. Tools outside it now show a lock.`);
      draw();
    }));
    // Carousel arrows (phones): scroll one card.
    const track = root.querySelector('[data-plans]');
    root.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => {
      const card = track.querySelector('.plan');
      track.scrollBy({ left: (+b.dataset.car) * ((card?.offsetWidth || 300) + 16), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    offBar = wireStickyBar(root);
  };

  // §6.16: the bar shows only once the hero CTA has scrolled off and while no other CTA is on screen,
  // so two calls to action are never visible at once.
  function wireStickyBar(scope) {
    const bar = scope.querySelector('[data-actionbar]');
    const btn = bar?.querySelector('[data-bar-cta]');
    const hero = scope.querySelector('#aa-cta');
    if (!bar || !btn || !hero) return () => {};
    const others = [...scope.querySelectorAll('[data-cta]')];
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight - 110; };
    const update = () => {
      const show = hero.getBoundingClientRect().bottom < 0 && !others.some(vis);
      bar.classList.toggle('is-hidden', !show);
      bar.setAttribute('aria-hidden', String(!show));
      btn.tabIndex = show ? 0 : -1;
    };
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);
    update();
    return () => { window.removeEventListener('scroll', update, { capture: true }); window.removeEventListener('resize', update); };
  }

  draw();
  return () => offBar();
}
