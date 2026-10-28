// Settings: state, sportsbooks, bankroll and sizing used by every tool.
export default function render(root, { ui, api, store, plans }) {
  const draw = () => {
    const s = store.get();
    const groups = [['Sportsbooks', api.books.filter((b) => b.type === 'sportsbook')], ['Fantasy apps', api.books.filter((b) => b.type === 'dfs')],
      ['Exchanges & prediction markets', api.books.filter((b) => b.type === 'exchange' || b.type === 'prediction')]];
    const theme = (() => { try { return localStorage.getItem('bf-theme') || 'auto'; } catch { return 'auto'; } })();
    root.innerHTML = `
      ${ui.header({ title: 'Settings', subtitle: 'Your state, books and bankroll drive every tool: arbs, +EV, promos, signals and prediction markets.' })}
      <div class="grid g2">
        <section class="card pad stack">
          <h3>Location & plan</h3>
          <div class="row">${ui.select('state', api.states.map((x) => [x.code, `${x.name} (${x.code})`]), s.state, 'State')}
          ${ui.select('plan', [...plans.PLANS.map((p) => [p.id, p.name]), ['all-access', 'All-Access']], s.plan, 'Plan')}
          ${ui.select('theme', [['auto', 'Match system'], ['light', 'Light'], ['dark', 'Dark']], theme, 'Theme')}</div>
          <h3 style="margin-top:18px">Bankroll & sizing</h3>
          <div class="row">
            ${ui.numberInput('bankroll', s.bankroll, 'Bankroll', { prefix: '$', step: 100 })}
            ${ui.numberInput('arbStake', s.arbStake, 'Default arb total stake', { prefix: '$', step: 50 })}
            ${ui.numberInput('unit', s.unit, 'Unit size', { prefix: '$', step: 5 })}
          </div>
          <label class="field"><span>Kelly multiplier: <strong id="km">${s.kellyMult}×</strong></span><input type="range" min="0.1" max="1" step="0.05" value="${s.kellyMult}" data-kelly></label>
          <button class="btn ghost sm" data-reset style="align-self:flex-start">Reset all settings</button>
        </section>
        <section class="card pad stack">
          <h3>My books</h3>
          <p class="muted" style="margin:0">Tools only show bets at books you select.</p>
          ${groups.map(([g, list]) => `<div><div class="muted" style="font-size:12px;margin-bottom:6px">${g}</div><div class="chips">${list.map((b) =>
            `<button class="chip ${s.books.includes(b.id) ? 'on' : ''}" data-book="${b.id}">${ui.esc(b.name)}</button>`).join('')}</div></div>`).join('')}
          <div class="callout">Data source: <strong>${api.source === 'sample' ? 'Sample data' : 'Live feeds'}</strong>. Real feeds connect in <code>public/js/data/adapter.js</code>.</div>
        </section>
      </div>`;
    ui.onSelect(root, 'state', (v) => store.set({ state: v }));
    ui.onSelect(root, 'plan', (v) => store.set({ plan: v }));
    ui.onSelect(root, 'theme', (v) => { try { localStorage.setItem('bf-theme', v); } catch { /* ignore */ } applyTheme(v); });
    ['bankroll', 'arbStake', 'unit'].forEach((k) => ui.onNumber(root, k, (v) => store.set({ [k]: v })));
    root.querySelector('[data-kelly]').addEventListener('input', (e) => { root.querySelector('#km').textContent = `${e.target.value}×`; store.set({ kellyMult: parseFloat(e.target.value) }); });
    root.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
      const cur = new Set(store.get().books);
      cur.has(b.dataset.book) ? cur.delete(b.dataset.book) : cur.add(b.dataset.book);
      store.set({ books: [...cur] });
      b.classList.toggle('on');
    }));
    root.querySelector('[data-reset]').addEventListener('click', () => { store.reset(); draw(); ui.toast('Settings reset'); });
  };
  draw();
}

export function applyTheme(v) {
  if (v === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', v);
}
