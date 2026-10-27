// BetFriend landing page interactions. Vanilla, no dependencies.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n, cents = true) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

  /* ---------- Header: shadow on scroll, mobile menu, active link ---------- */
  const head = $('.bf2-head'), nav = $('#site-nav'), burger = $('.bf2-burger');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); } });
  document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !head.contains(e.target)) setMenu(false); });
  matchMedia('(min-width: 1100px)').addEventListener('change', () => setMenu(false));

  const navLinks = $$('.bf2-nav a[href^="#"]:not(.bf2-cta)');
  const navTargets = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

  /* ---------- Hero A/B angles (?h=) and ad source line (?src=ig / utm_source=instagram) ---------- */
  const q = new URLSearchParams(location.search);
  const ANGLES = {
    both: { h1: 'Bet both sides. Keep the gap.', sub: 'Two books priced the same bet differently. We give you the exact bet size for each, so you keep the difference either way.', proof: '$487 across two books: +$42 or +$44, whichever side hits.', cta: 'Find my first arb' },
    sharp: { h1: 'Bet where the pros put their money.', sub: 'Sharps bet big on Novig and ProphetX, where every bet is public. When a line spikes, we find you the best price on the same bet and tell you how much to bet.', proof: 'Exchange jumps to −125; Book A still at −105. Bet $45 at +8.5% edge.', cta: 'Show me the sharp money' },
    promo: { h1: 'Turn bonus bets into cash.', sub: 'We rank every promo in your state and give you the exact two-sided bets that turn each one into withdrawable dollars.', proof: '$200 bonus bet → +$110 cash, whichever team wins.', cta: 'Convert my bonus bets' },
    stack: { h1: '$1,350 of betting tools for $199.99.', sub: 'Arbitrage, +EV, sharp money, AI and prediction-market traders: the same tools pros pay $1,349.95 a month for, in one membership.', proof: 'Save $1,149.96 every month vs buying them separately.', cta: 'Get every tool' },
    traders: { h1: 'Copy the traders who keep winning.', sub: 'Algorithmically selected traders on Kalshi, Polymarket, ProphetX and Novig. Deep links to every trade, and exit alerts that tell you when to sell early.', proof: 'Buy YES at 54¢, sell at 66¢ on the exit alert: +$12 on $54.', cta: 'Follow the top traders' },
  };
  const angle = ANGLES[q.get('h')];
  if (angle) {
    $('#hero-h1').textContent = angle.h1;
    $('#hero-sub').textContent = angle.sub;
    $('#hero-proof').textContent = angle.proof;
    $('#hero-cta').textContent = angle.cta;
  }
  const src = (q.get('src') || q.get('utm_source') || '').toLowerCase();
  if (src === 'ig' || src === 'instagram') $('#hero-source').hidden = false;

  /* ---------- Hero arbitrage calculator ----------
     Over 0.5 at +183 (decimal 2.83) vs Under 0.5 at −130 (decimal 1 + 100/130).
     Split the total so both sides pay back about the same, rounded to whole dollars:
     $487 → $187 / $300 → pays $529.21 / $530.77 → keep $42.21 / $43.77. */
  const D1 = 2.83, D2 = 1 + 100 / 130;
  const calc = $('#calc');
  if (calc) {
    const num = $('#calc-stake'), range = $('.bf2-range', calc);
    const out = Object.fromEntries($$('[data-calc]', calc).map((el) => [el.dataset.calc, el]));
    const MIN = 100, MAX = 10000;
    const render = (total) => {
      const t = Math.round(total);
      const s1 = Math.round(t * (1 / D1) / (1 / D1 + 1 / D2));
      const s2 = t - s1;
      const p1 = Math.round(s1 * D1 * 100) / 100, p2 = Math.round(s2 * D2 * 100) / 100;
      const k1 = Math.round((p1 - t) * 100) / 100, k2 = Math.round((p2 - t) * 100) / 100;
      const lo = Math.min(k1, k2), hi = Math.max(k1, k2);
      const loR = Math.round(lo), hiR = Math.round(hi);
      out.s1.textContent = money(s1, false);
      out.s2.textContent = money(s2, false);
      out.result.textContent = loR === hiR
        ? `+${money(loR, false)} on ${money(t, false)}, whichever side hits`
        : `+${money(loR, false)} to +${money(hiR, false)} on ${money(t, false)}, whichever side hits`;
      out.math.textContent = `${money(s1, false)} at +183 pays back ${money(p1)}. ${money(s2, false)} at −130 pays back ${money(p2)}. You put in ${money(t, false)}, so you keep ${money(k1)} or ${money(k2)}.`;
      out.roi.textContent = `${(lo / t * 100).toFixed(1)}% to ${(hi / t * 100).toFixed(1)}%`;
    };
    const set = (v, from) => {
      let t = Number(v);
      if (!Number.isFinite(t)) return;
      t = Math.min(MAX, Math.max(MIN, Math.round(t)));
      if (from !== num) num.value = t;
      range.value = Math.min(Number(range.max), t);
      render(t);
    };
    num.addEventListener('input', () => { if (num.value !== '' && Number(num.value) >= MIN) set(num.value, num); });
    num.addEventListener('change', () => set(num.value || 487));
    range.addEventListener('input', () => set(range.value, range));
    $$('.bf2-step', calc).forEach((b) => b.addEventListener('click', () => set((Number(num.value) || 487) + Number(b.dataset.step))));
    render(487);
  }

  /* ---------- Screenshot tabs ---------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const panel = document.getElementById(tabs[0].getAttribute('aria-controls'));
    const img = $('img', panel), source = $('source', panel), label = $('.bf2-shot-bar span', panel);
    // warm the cache for the other screens once the section is near
    const warm = () => tabs.slice(1).forEach((t) => { const i = new Image(); i.src = `img/app-${t.dataset.shot}.webp`; });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { warm(); io.disconnect(); } }, { rootMargin: '400px' });
      io.observe(panel);
    }
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      const r = tab.dataset.shot;
      panel.setAttribute('aria-label', `${tab.dataset.label} screen`);
      label.textContent = tab.dataset.label;
      // a zoom lens belongs to one screen: hide it while another tab is showing
      $$('.bf2-lens[data-for]', list.parentElement).forEach((l) => { l.hidden = l.dataset.for !== r; });
      img.classList.add('swapping');
      const swap = () => {
        source.srcset = `img/app-${r}.webp 1x, img/app-${r}@2x.webp 2x`;
        img.src = `img/app-${r}.png`;
        img.alt = tab.dataset.alt;
        const done = () => img.classList.remove('swapping');
        if (img.complete) requestAnimationFrame(done); else img.addEventListener('load', done, { once: true });
      };
      matchMedia('(prefers-reduced-motion: reduce)').matches ? swap() : setTimeout(swap, 120);
      if (focus) tab.focus();
    };
    list.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });

  /* ---------- Plans: monthly / annual ---------- */
  const STANDALONE = $$('.bf2-plans .bf2-plan[data-monthly]');
  const sum = (key) => STANDALONE.reduce((a, el) => a + Number(el.dataset[key]), 0);
  const pct = (m, y) => Math.round((1 - y / (m * 12)) * 100);
  const setPeriod = (period) => {
    $$('.bf2-toggle button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.period === period));
    const annual = period === 'annual';
    $$('[data-monthly]').forEach((card) => {
      const m = Number(card.dataset.monthly), y = Number(card.dataset.annual);
      const perMo = Math.round(y / 12 * 100) / 100;
      const save = Math.round((m * 12 - y) * 100) / 100;
      $('[data-price]', card).textContent = money(annual ? perMo : m);
      $('[data-billed]', card).textContent = annual
        ? `Billed ${money(y)} a year · you save ${money(save)} (${pct(m, y)}%)`
        : `Billed monthly · or ${money(y)}/yr and save ${pct(m, y)}%`;
      $('[data-terms]', card).textContent = annual
        ? `7 days free, then ${money(y)}/yr unless you cancel.`
        : `7 days free, then ${money(m)}/mo unless you cancel.`;
    });
    const all = $('.bf2-all');
    const am = Number(all.dataset.monthly), ay = Number(all.dataset.annual);
    $('[data-value]', all).textContent = annual
      ? `Every standalone plan below adds up to ${money(sum('annual'))}/yr. All-Access saves you ${money(Math.round((sum('annual') - ay) * 100) / 100)} a year.`
      : `Every standalone plan below adds up to ${money(sum('monthly'))}/mo. All-Access saves you ${money(Math.round((sum('monthly') - am) * 100) / 100)} a month.`;
    if (!annual) $('[data-billed]', all).textContent = `Billed monthly · or ${money(ay)}/yr (${money(Math.round(ay / 12 * 100) / 100)}/mo, save ${pct(am, ay)}%)`;
    // upgrade nudge on each standalone card: the gap to All-Access in the same billing period
    STANDALONE.forEach((card) => {
      const n = $('[data-nudge]', card);
      if (!n) return;
      const gap = Math.round(((annual ? ay : am) - Number(card.dataset[annual ? 'annual' : 'monthly'])) * 100) / 100;
      n.innerHTML = `Only ${money(gap)}${annual ? '/yr' : '/mo'} more for <b>All-Access: all 25 tools</b> <span aria-hidden="true">→</span>`;
    });
  };
  $$('.bf2-toggle button').forEach((b) => b.addEventListener('click', () => setPeriod(b.dataset.period)));
  setPeriod('monthly');

  /* ---------- Plans: compact standalone cards on phones ---------- */
  const more = $('.bf2-plans-more'), grid = $('#plan-grid');
  if (more && grid) {
    more.addEventListener('click', () => {
      const open = grid.classList.toggle('is-compact') === false;
      more.setAttribute('aria-expanded', open);
      more.textContent = open ? 'Hide plan details' : "Show what's in each plan";
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.bf2-q button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !open);
      document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
    });
  });

  /* ---------- Sticky CTA bar ----------
     Shows once the hero CTA has scrolled away; hides over the plans section and the final CTA so two
     equivalent buttons are never on screen together. */
  const bar = $('.bf2-sticky'), barBtn = $('a', bar);
  const heroCta = $('#hero-cta'), plans = $('#plans'), end = $('#signup');
  const inView = (el, pad = 0) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight - pad; };
  let ticking = false;
  const update = () => {
    ticking = false;
    head.classList.toggle('scrolled', scrollY > 4);
    const show = heroCta.getBoundingClientRect().bottom < 0 && !inView(end) && !inView(plans, 120);
    if (bar.dataset.show !== String(show)) {
      bar.dataset.show = show; bar.setAttribute('aria-hidden', !show); barBtn.tabIndex = show ? 0 : -1;
    }
    const y = scrollY + innerHeight * 0.35;
    let cur = null;
    navTargets.forEach((t) => { if (t.offsetTop <= y) cur = t.id; });
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${cur}`));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
})();
