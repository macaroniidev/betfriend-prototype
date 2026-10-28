// Plans & Pricing: standalone OddsJam-style packages plus the All-Access membership.
const CSS = `
.pricing .hero { display:grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap:20px; background:var(--ink); color:#eaf3ee; border-radius:18px; padding:28px; margin-bottom:22px; }
.pricing .hero h2 { font-size:30px; color:#fff; }
.pricing .hero .price-big { font:600 46px var(--serif); color:var(--lime); line-height:1; }
.pricing .hero .price-big small { font:500 15px var(--sans); color:#b9d0c4; }
.pricing .hero ul { margin:14px 0 0; padding:0; list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:6px 16px; }
.pricing .hero li::before { content:"✓ "; color:var(--lime); font-weight:700; }
.pricing .hero .save { display:inline-block; background:var(--lime); color:var(--ink); font-weight:700; border-radius:999px; padding:4px 12px; margin:10px 0; }
.pricing .hero .strike { text-decoration:line-through; color:#9db8aa; margin-right:8px; }
.pricing .plans { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
.pricing .plan { display:flex; flex-direction:column; padding:18px; position:relative; }
.pricing .plan.popular { border:2px solid var(--ink); }
.pricing .plan .badge { position:absolute; top:-11px; right:16px; background:var(--ink); color:var(--lime); font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; }
.pricing .plan .amt { font:600 32px var(--serif); margin:8px 0 2px; }
.pricing .plan .amt small { font:500 13px var(--sans); color:var(--muted); }
.pricing .plan ul { padding-left:18px; margin:10px 0; }
.pricing .plan li { margin:4px 0; }
.pricing .bonus { border-top:1px dashed var(--line); margin-top:8px; padding-top:10px; }
.pricing .bonus h4 { margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
.pricing .bonus div { display:flex; justify-content:space-between; gap:8px; font-size:13px; margin:5px 0; }
.pricing .bonus b { color:var(--pos); white-space:nowrap; }
.pricing .plan .btn { margin-top:auto; }
.pricing .cmp td.y { color:var(--pos); font-weight:700; text-align:center; }
.pricing .cmp td.n { color:var(--muted); text-align:center; }
.pricing .cmp th:not(:first-child) { text-align:center; }
.pricing .sect { margin:28px 0 12px; }
@media (max-width:860px){ .pricing .hero { grid-template-columns:1fr; padding:20px; } .pricing .hero ul { grid-template-columns:1fr; } }
`;

// Competitor tiers for the comparison (from the OrcaVault research tier files, 27 Oct 2026).
const COMPETITORS = [
  ['OddsJam Live Arbitrage & EV', 499.99], ['OddsJam Sharp Money', 199.99], ['OddsJam Prediction Traders', 449.99],
  ['OddsJam Promo Arbitrage', 79.99], ['Rithmm Pro (AI picks)', 49.99], ['Outlier Pro + React Live', 79.99], ['BetQL All Access', 70],
];

export default function render(root, { ui, plans, store, params }) {
  if (!document.getElementById('css-pricing')) document.head.insertAdjacentHTML('beforeend', `<style id="css-pricing">${CSS}</style>`);
  const { PLANS, ALL_ACCESS } = plans;
  let period = params.period === 'annual' ? 'annual' : 'monthly';

  const draw = () => {
    const paid = PLANS.filter((p) => p.id !== 'free');
    const sum = paid.reduce((a, p) => a + p[period], 0);
    const aa = ALL_ACCESS[period];
    const per = period === 'monthly' ? '/mo' : '/yr';
    const bonusValue = paid.reduce((a, p) => a + p.bonus.reduce((x, b) => x + b.value, 0), 0);
    const compSum = COMPETITORS.reduce((a, c) => a + c[1], 0);
    const allTools = [...new Set(paid.flatMap((p) => [...p.tools, ...p.bonus.map((b) => b.tool)]))];
    const toolLabel = (t) => document.querySelector(`[data-route="${t}"]`)?.textContent.trim().slice(1).trim() || t;

    root.innerHTML = `<div class="pricing">
      ${ui.header({ title: 'Plans & Pricing', subtitle: 'Pick one tool or get every tool in one membership. 7-day free trial on every paid plan. Proposed prices.', actions: ui.seg('period', [['monthly', 'Monthly'], ['annual', 'Annual · save up to 33%']], period) })}

      <section class="hero">
        <div>
          <span class="tag dark" style="background:var(--lime);color:var(--ink)">Best value</span>
          <h2 style="margin-top:10px">${ui.esc(ALL_ACCESS.name)}</h2>
          <p style="color:#c9dcd2;margin:6px 0 12px">${ui.esc(ALL_ACCESS.tagline)} Arbitrage, +EV, middles, low holds, promos, sharp money, pro bettor signals, AI picks, live AI and prediction markets.</p>
          <ul>
            <li>Pre-match &amp; live arbitrage</li><li>Pre-match &amp; live +EV</li><li>Middles &amp; low holds</li><li>Promo converter &amp; optimizer</li>
            <li>Sharp Money (Novig &amp; Prophet X)</li><li>Pro bettor signals</li><li>AI sports picks &amp; live AI</li><li>Prediction traders &amp; AI market picks</li>
            <li>Sportsbook Screen &amp; Parlay Builder</li><li>Daily Card across every tool</li>
          </ul>
        </div>
        <div>
          <div class="price-big">$${aa.toLocaleString('en-US')}<small>${per}</small></div>
          <div><span class="strike">$${sum.toFixed(2)}${per} if bought separately</span></div>
          <span class="save">Save $${(sum - aa).toFixed(2)}${per} · ${Math.round((1 - aa / sum) * 100)}% off</span>
          <p style="color:#c9dcd2;margin:6px 0 14px">Comparable competitor tools cost $${compSum.toFixed(2)}/mo combined.</p>
          <button class="btn lime block" data-trial="all-access">Start 7-day free trial</button>
          <button class="btn block" style="margin-top:8px;background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" data-pick="all-access">Set as my plan in this prototype</button>
        </div>
      </section>

      <h2 class="sect">Standalone plans</h2>
      <div class="plans">${PLANS.map((p) => `
        <article class="card plan${p.popular ? ' popular' : ''}">
          ${p.popular ? '<span class="badge">Most popular</span>' : ''}
          <h3>${ui.esc(p.name)}</h3>
          <p class="muted" style="margin:4px 0 0">${ui.esc(p.tagline)}</p>
          <div class="amt">$${p[period] ? p[period].toLocaleString('en-US') : '0'}<small>${p[period] ? per : ' forever'}</small></div>
          ${period === 'annual' && p.monthly ? `<small class="muted">$${(p.annual / 12).toFixed(2)}/mo billed yearly</small>` : ''}
          <ul>${p.bullets.map((b) => `<li>${ui.esc(b)}</li>`).join('')}</ul>
          ${p.bonus.length ? `<div class="bonus"><h4>Earn even more with these bonus tools</h4>${p.bonus.map((b) => `<div><span><a href="#/${b.tool}">${ui.esc(b.name)}</a><br><small class="muted">${ui.esc(b.desc)}</small></span><b>$${b.value} value</b></div>`).join('')}</div>` : ''}
          <button class="btn ${p.id === 'free' ? '' : 'primary'} block" data-trial="${p.id}">${p.id === 'free' ? 'Create free account' : 'Start free trial'}</button>
        </article>`).join('')}
      </div>

      <h2 class="sect">Compare plans</h2>
      <div class="card table-wrap"><table class="t cmp">
        <thead><tr><th>Tool</th>${PLANS.map((p) => `<th>${ui.esc(p.name)}</th>`).join('')}<th>All-Access</th></tr></thead>
        <tbody>${['daily', ...allTools.filter((t) => t !== 'daily')].map((t) => `<tr><td><a href="#/${t}">${ui.esc(toolLabel(t))}</a></td>${PLANS.map((p) => {
          const has = p.tools.includes(t) || p.bonus.some((b) => b.tool === t);
          return `<td class="${has ? 'y' : 'n'}">${has ? '✓' : '–'}</td>`;
        }).join('')}<td class="y">✓</td></tr>`).join('')}</tbody>
      </table></div>

      <h2 class="sect">What the same tools cost elsewhere</h2>
      <div class="grid g2">
        <div class="card table-wrap"><table class="t">
          <thead><tr><th>Competitor plan</th><th class="num">Monthly</th></tr></thead>
          <tbody>${COMPETITORS.map(([n, v]) => `<tr><td>${ui.esc(n)}</td><td class="num">$${v.toFixed(2)}</td></tr>`).join('')}
          <tr><td><strong>Total</strong></td><td class="num"><strong>$${compSum.toFixed(2)}</strong></td></tr>
          <tr><td><strong>BetFriend All-Access</strong></td><td class="num"><strong style="color:var(--pos)">$${ALL_ACCESS.monthly}</strong></td></tr></tbody>
        </table></div>
        <div class="card pad stack">
          <h3>One membership instead of seven subscriptions</h3>
          ${ui.stats([
            { label: 'You save vs competitors', value: `$${(compSum - ALL_ACCESS.monthly).toFixed(0)}/mo`, tone: 'pos' },
            { label: 'Bonus tool value included', value: `$${bonusValue.toLocaleString('en-US')}` },
          ])}
          <p class="muted" style="margin:0">Competitor prices are their published monthly plans. BetFriend prices are proposed for launch.</p>
        </div>
      </div>
    </div>`;

    ui.onSeg(root, 'period', (v) => { period = v; draw(); });
    root.querySelectorAll('[data-trial]').forEach((b) => b.addEventListener('click', () => ui.toast('Checkout opens here (Stripe) in production')));
    root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { store.set({ plan: b.dataset.pick }); ui.toast('Plan set to All-Access'); }));
  };
  draw();
}
