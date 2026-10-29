// Trust checks on the sample data and opportunity engine (UX plan items A2 + A3). No browser needed:
//   node qa/trust-check.mjs
// - no arb, low hold or middle puts two legs on the same book
// - every arb has profit >= 0 at its own stakes
// - tracker arb groups: P&L of a settled group equals its locked profit; no arb group or tool total is negative
// - opportunity ids stay the same across 3 odds ticks for markets that are still listed
import { api } from '../public/js/data/adapter.js';
import { tick } from '../public/js/data/core.js';
import { arbStakes, toDecimal } from '../public/js/lib/odds.js';

const problems = [];
const fail = (msg) => problems.push(msg);
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

function checkOpps(label) {
  const sets = { arb: api.arbs(), lowhold: api.lowHolds({ maxHold: 0.03 }), middle: api.middles() };
  for (const [kind, list] of Object.entries(sets)) {
    const ids = new Set();
    for (const o of list) {
      const books = o.legs.map((l) => l.book);
      if (new Set(books).size !== books.length) fail(`${label}: ${kind} ${o.id} has duplicate books ${books.join(',')}`);
      if (ids.has(o.id)) fail(`${label}: duplicate id ${o.id}`);
      ids.add(o.id);
      if (kind === 'arb') {
        const r = arbStakes(o.legs.map((l) => l.price), 1000);
        if (!(r.profit >= 0) || !(o.edge >= 0)) fail(`${label}: arb ${o.id} profit ${r.profit.toFixed(2)} edge ${o.edge}`);
      }
    }
  }
  const evIds = api.ev({ minEdge: 0.005 }).map((o) => o.id);
  if (new Set(evIds).size !== evIds.length) fail(`${label}: duplicate +EV ids`);
  return sets;
}

// 1. Engine, now and across 3 ticks, with ids stable for every market still listed.
const snap = () => {
  const m = new Map();
  for (const o of [...api.arbs(), ...api.lowHolds({ maxHold: 0.03 }), ...api.middles(), ...api.ev({ minEdge: 0.01 })]) m.set(o.id, `${o.kind}|${o.lineId}`);
  return m;
};
const counts = checkOpps('t0');
console.log(`t0: ${counts.arb.length} arbs, ${counts.lowhold.length} low holds, ${counts.middle.length} middles`);
let prev = snap();
let kept = 0, total = 0;
for (let t = 1; t <= 3; t++) {
  tick();
  checkOpps(`tick ${t}`);
  const next = snap();
  // Same market => same id. Any market present in both snapshots must map to one id only.
  const byMarket = (m) => { const out = new Map(); for (const [id, key] of m) (out.get(key) || out.set(key, new Set()).get(key)).add(id); return out; };
  const a = byMarket(prev), b = byMarket(next);
  for (const [key, idsA] of a) {
    const idsB = b.get(key);
    if (!idsB || key.startsWith('ev|')) continue; // +EV ids name the book and side, which can legitimately change
    total++;
    if ([...idsA].some((id) => idsB.has(id))) kept++;
    else fail(`tick ${t}: ${key} changed id ${[...idsA]} -> ${[...idsB]}`);
  }
  prev = next;
}
console.log(`ids: ${kept}/${total} markets kept their id across ticks`);

// 2. Tracker sample: arb groups.
const bets = api.tracker.list();
const groups = new Map();
for (const b of bets) if (b.group) (groups.get(b.group) || groups.set(b.group, []).get(b.group)).push(b);
let arbGroups = 0;
for (const [g, legs] of groups) {
  if (legs[0].kind !== 'arb') continue;
  arbGroups++;
  if (new Set(legs.map((l) => l.book)).size !== legs.length) fail(`tracker ${g}: arb legs on the same book`);
  const total = legs.reduce((a, l) => a + l.stake, 0);
  const locked = Math.min(...legs.map((l) => l.stake * toDecimal(l.price))) - total;
  if (locked < -0.02) fail(`tracker ${g}: arb group is not an arb (locked ${locked.toFixed(2)})`);
  if (legs.every((l) => l.status !== 'open')) {
    const pnl = legs.reduce((a, l) => a + l.pnl, 0);
    if (!near(pnl, locked, 0.05)) fail(`tracker ${g}: P&L ${pnl.toFixed(2)} != locked ${locked.toFixed(2)}`);
    if (pnl < -0.01) fail(`tracker ${g}: negative arbitrage P&L ${pnl.toFixed(2)}`);
  }
}
const arbPnl = bets.filter((b) => b.kind === 'arb' && b.status !== 'open').reduce((a, b) => a + b.pnl, 0);
if (arbPnl < 0) fail(`tracker: arbitrage total P&L is negative (${arbPnl.toFixed(2)})`);
if (bets.some((b) => b.kind === 'arb' && !b.group)) fail('tracker: arb leg without a group');
console.log(`tracker: ${arbGroups} arb groups, arbitrage P&L ${arbPnl.toFixed(2)}`);

// 3. Settling one leg of an exclusive group settles the other, and the group still equals the locked profit.
const openArb = [...groups.values()].find((legs) => legs[0].kind === 'arb' && legs.every((l) => l.status === 'open'));
if (openArb) {
  api.tracker.settle(openArb[0].id, 'won');
  const after = api.tracker.list().filter((b) => b.group === openArb[0].group);
  const total = after.reduce((a, l) => a + l.stake, 0);
  const locked = Math.min(...after.map((l) => l.stake * toDecimal(l.price))) - total;
  const pnl = after.reduce((a, l) => a + l.pnl, 0);
  if (after.some((l) => l.status === 'open') || !near(pnl, locked, 0.05)) fail(`settle: open arb group did not settle to locked profit (${pnl.toFixed(2)} vs ${locked.toFixed(2)})`);
}

if (problems.length) { console.log(`\n${problems.length} problems:`); problems.slice(0, 40).forEach((p) => console.log(' - ' + p)); }
else console.log('\nAll trust checks passed.');
process.exit(problems.length ? 1 : 0);
