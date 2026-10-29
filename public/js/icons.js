// Line icons for the app shell (sidebar, top bar). One family: 24×24 grid, drawn at 18px, 2px stroke,
// round caps/joins, `currentColor`, so they follow the text colour in both themes and on green grounds.
// Decorative only: every icon is aria-hidden and sits next to a visible label (or inside a labelled button).
//
// Usage: icon('arb') → '<svg …>'. Unknown keys fall back to a neutral dot so a typo never breaks the nav.
// nav.js refers to these by key (the third item of each [id, label, iconKey] tuple).

const P = {
  // ---- Today
  daily: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  // ---- Hedged profit
  arb: '<path d="M4 8h13"/><path d="m14 4 4 4-4 4"/><path d="M20 16H7"/><path d="m10 12-4 4 4 4"/>',
  middle: '<path d="M3 12h18"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="m10 9.5 2-2 2 2"/><path d="m10 14.5 2 2 2-2"/>',
  lowhold: '<path d="M4 9.5c2.5-2 5.5-2 8 0s5.5 2 8 0"/><path d="M4 15.5c2.5-2 5.5-2 8 0s5.5 2 8 0"/>',
  // ---- Bonuses
  promo: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z"/><path d="M14 6v2.5"/><path d="M14 11v2"/><path d="M14 15.5V18"/>',
  map: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  boost: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  deposit: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 14.5h2"/>',
  // ---- Edges
  ev: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  screen: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M3 14.5h18"/><path d="M9 4v16"/>',
  sharp: '<path d="M12 3 21 12l-9 9-9-9z"/><path d="M12 8v8"/><path d="m9 11 3-3 3 3"/>',
  bettors: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.5a3.2 3.2 0 0 1 0 6.4"/><path d="M18 14.5a6 6 0 0 1 3 5.5"/>',
  spark: '<path d="M12 3c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7z"/><path d="M19 15.5v4"/><path d="M17 17.5h4"/>',
  pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  // ---- Prediction markets
  traders: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/><circle cx="19.5" cy="6.5" r="2"/>',
  scale: '<path d="M12 4v16"/><path d="M8 20h8"/><path d="M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0z"/><path d="m19 7-3 6a3 3 0 0 0 6 0z"/>',
  book: '<path d="M4 6h7"/><path d="M4 10h5"/><path d="M4 14h8"/><path d="M4 18h4"/><path d="M14 6h6"/><path d="M16 10h4"/><path d="M13 14h7"/><path d="M17 18h3"/>',
  exit: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16 4 12l6-4"/><path d="M4 12h11"/>',
  // ---- Research & tools
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8"/><path d="M8 13.5h5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  sliders: '<path d="M5 4v16"/><path d="M12 4v16"/><path d="M19 4v16"/><circle cx="5" cy="15" r="2.2"/><circle cx="12" cy="8" r="2.2"/><circle cx="19" cy="13" r="2.2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7"/><path d="M8.5 11.5h.01"/><path d="M12 11.5h.01"/><path d="M15.5 11.5h.01"/><path d="M8.5 15h.01"/><path d="M12 15h.01"/><path d="M15.5 15v2.5"/><path d="M8.5 18h3.5"/>',
  // ---- Me
  tracker: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="m8.5 13 2 2 4.5-4.5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3"/><path d="M12 18.5v3"/><path d="m5.3 5.3 2.1 2.1"/><path d="m16.6 16.6 2.1 2.1"/><path d="M2.5 12h3"/><path d="M18.5 12h3"/><path d="m5.3 18.7 2.1-2.1"/><path d="m16.6 7.4 2.1-2.1"/>',
  glossary: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7.5h6"/>',
  // ---- Shell controls
  menu: '<path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/>',
  close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  // ---- UI kit (ui.js): locks, states, table tools
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m7 7 10 10"/><path d="M17 7 7 17"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  top: '<path d="M12 20V6"/><path d="m6 11 6-6 6 6"/><path d="M5 3.5h14"/>',
  pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
  play: '<path d="M7 5v14l11-7z"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/>',
  density: '<path d="M4 6h16"/><path d="M4 10h16"/><path d="M4 14h16"/><path d="M4 18h16"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
};

/** Inline SVG for `key`. `size` in px (default 18); `cls` adds classes next to "i". */
export function icon(key, { size = 18, cls = '' } = {}) {
  const body = P[key] || P.dot;
  return `<svg class="i${cls ? ` ${cls}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Keys that exist (QA uses this to check every nav tuple names a real icon). */
export const ICON_KEYS = Object.keys(P);
