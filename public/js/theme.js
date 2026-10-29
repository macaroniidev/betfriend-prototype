// Theme: one place that reads, applies and announces the light/dark choice.
//
// The preference is stored in localStorage `bf-theme` as 'light' | 'dark' | 'auto'.
// Nothing stored means light (the app matches the landing page by default). The top-bar toggle
// switches light/dark; Settings also offers 'auto' (System), which follows prefers-color-scheme. The pre-paint script in app/index.html applies the same rule before
// first paint, so there is no flash of the wrong theme; this module takes over once the app loads.
//
// Applying a theme:
//   - 'light' / 'dark' set <html data-theme>, which app.css reads.
//   - 'auto' removes the attribute and app.css follows `prefers-color-scheme`.
//   - <meta name="theme-color"> follows the effective theme (mobile browser chrome).
//   - a `bf:theme` event ({ detail: { pref, theme } }) fires on window so the toggle and Settings stay in sync.
// Changes from another tab (storage event) and OS changes while on 'auto' are picked up too.

const KEY = 'bf-theme';
const PREFS = ['light', 'dark', 'auto'];
/** The preference used when nothing has been chosen yet: light, like the landing page. */
export const DEFAULT_PREF = 'light';
/** Browser-chrome colours: the top bar's ground in each theme (app.css --bg). */
const CHROME = { light: '#FFFFFF', dark: '#06140D' };

const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

/** Stored preference: 'light' | 'dark' | 'auto'. */
export function get() {
  try {
    const v = localStorage.getItem(KEY);
    return PREFS.includes(v) ? v : DEFAULT_PREF;
  } catch { return DEFAULT_PREF; }
}

/** The theme actually showing: 'light' | 'dark'. */
export function effective(pref = get()) {
  if (pref === 'light' || pref === 'dark') return pref;
  return mq?.matches ? 'dark' : 'light';
}

/** Save a preference and apply it everywhere. */
export function set(pref) {
  if (!PREFS.includes(pref)) return;
  try { localStorage.setItem(KEY, pref); } catch { /* storage unavailable: still apply for this page */ }
  apply(pref);
}

/** Flip between light and dark (the top-bar button). Always stores an explicit choice. */
export function toggle() { set(effective() === 'dark' ? 'light' : 'dark'); }

/** Apply a preference to the document without storing it, then announce it. */
export function apply(pref = get()) {
  const root = document.documentElement;
  if (pref === 'light' || pref === 'dark') root.setAttribute('data-theme', pref);
  else root.removeAttribute('data-theme');
  const theme = effective(pref);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', CHROME[theme]));
  window.dispatchEvent(new CustomEvent('bf:theme', { detail: { pref, theme } }));
}

/** Listen for theme changes. Returns an unsubscribe function. */
export function onChange(cb) {
  const h = (e) => cb(e.detail);
  window.addEventListener('bf:theme', h);
  return () => window.removeEventListener('bf:theme', h);
}

let started = false;
/** Wire the system and cross-tab listeners once (called by app.js). */
export function start() {
  if (started) return;
  started = true;
  apply();
  mq?.addEventListener?.('change', () => { if (get() === 'auto') apply('auto'); });
  window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply(); });
}

const SUN = '<svg class="ic-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>';
const MOON = '<svg class="ic-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M20 14.6A8.3 8.3 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6Z"/></svg>';

/**
 * Markup for the top-bar toggle. One button, "Dark theme" pressed or not: the sun shows in light,
 * the moon in dark (CSS swaps them by data-theme / system so the icon is right before JS runs).
 * frame.js lets clicks on #theme-toggle through in edit mode and never makes it editable.
 */
export function toggleHtml() {
  const dark = effective() === 'dark';
  return `<button type="button" class="icon-btn theme-toggle" id="theme-toggle" data-bf-theme-toggle data-bf-noedit
    aria-label="Dark theme" aria-pressed="${dark}" title="${dark ? 'Switch to light theme' : 'Switch to dark theme'}">${SUN}${MOON}</button>`;
}

/** Wire a toggle rendered with toggleHtml(): click flips the theme, and it stays in sync with Settings. */
export function wireToggle(btn) {
  if (!btn) return;
  const sync = () => {
    const dark = effective() === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  };
  btn.addEventListener('click', toggle);
  onChange(sync);
  sync();
}
