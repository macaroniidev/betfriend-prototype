// User settings shared by every screen (state, books, bankroll, sizing). Persisted per browser.
const KEY = 'bf-proto-settings-v1';
const defaults = {
  state: 'NJ',
  books: ['dk', 'fd', 'mgm', 'czr', 'espn', 'fan', 'br', 'b365'],
  bankroll: 5000,
  kellyMult: 0.25,
  arbStake: 1000,
  unit: 50,
  plan: 'all-access',
  devigMethod: 'multiplicative',
  sharpRefs: ['circa', 'novig', 'px'],
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
