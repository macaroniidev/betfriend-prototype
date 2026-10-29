// User settings shared by every screen (state, books, bankroll, sizing). Persisted per browser.
const KEY = 'bf-proto-settings-v1';
const defaults = {
  state: 'NJ',
  books: ['dk', 'fd', 'mgm', 'czr', 'espn', 'fan', 'br', 'b365'],
  bankroll: 5000,
  kellyMult: 0.25,
  arbStake: 1000,
  stakeRound: 0, // round suggested stakes to $1 / $5 (0 = exact); default for the arb calculator
  unit: 50,
  plan: 'all-access',
  devigMethod: 'multiplicative',
  sharpRefs: ['circa', 'novig', 'px'],
  // How every price is shown (ui.fmtOdds / ui.price / ui.cents): 'american' | 'decimal' | 'implied' | 'cents'.
  oddsFormat: 'american',
  announceLive: false, // speak live-table updates to screen readers (ui.announce { live: true })
  // First-run setup (item B11). QA profiles set onboarded:true. The sizing defaults above stay as they are;
  // until setup is done, screens can say "Using sample settings" (ui.sampleSettingsLine).
  onboarded: false,
  goal: '',        // '' | 'beginner' | 'promos' | 'hedged' | 'edges' | 'pm'  (beginner expands the "How this makes money" explainers)
  riskPreset: '',  // '' | 'hedged' | 'balanced' | 'edges'
  setupDone: [],   // ids of first-run steps already confirmed: 'where', 'bankroll', 'risk', 'goal'
};
let state = { ...defaults };
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* storage unavailable */ }
const subs = new Set();

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
    subs.forEach((cb) => cb(state));
  },
  subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
  reset() { this.set({ ...defaults }); },
};
