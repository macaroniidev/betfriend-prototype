// Odds maths shared by every screen. All functions are pure.

export const toDecimal = (am) => (am > 0 ? 1 + am / 100 : 1 + 100 / -am);
export const toAmerican = (dec) => (dec >= 2 ? Math.round((dec - 1) * 100) : Math.round(-100 / (dec - 1)));
export const impliedProb = (am) => 1 / toDecimal(am);
export const probToAmerican = (p) => toAmerican(1 / p);
export const fmtAmerican = (am) => (am > 0 ? `+${am}` : `${am}`);

/** Remove the vig from a set of implied probabilities (multiplicative method). */
export function devig(probs) {
  const total = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / total);
}

/** Additional devig methods for the custom fair-odds builder. */
export function devigPower(probs) {
  let k = 1;
  for (let i = 0; i < 40; i++) {
    const s = probs.reduce((a, p) => a + p ** k, 0);
    k *= Math.log(s) > 0 ? 1.02 : 0.98;
    if (Math.abs(s - 1) < 1e-6) break;
  }
  const out = probs.map((p) => p ** k);
  const t = out.reduce((a, b) => a + b, 0);
  return out.map((p) => p / t);
}
export function devigAdditive(probs) {
  const over = (probs.reduce((a, b) => a + b, 0) - 1) / probs.length;
  return probs.map((p) => Math.max(0.001, p - over));
}

/** Hold (overround) of a market from its best prices, as a fraction. 0.02 = 2%. */
export const hold = (americans) => americans.reduce((a, am) => a + impliedProb(am), 0) - 1;

/** Expected value per $1 staked, given true probability and American price. */
export const ev = (trueProb, am) => trueProb * (toDecimal(am) - 1) - (1 - trueProb);

/** Kelly fraction of bankroll (can be scaled by a multiplier, e.g. 0.25). */
export function kelly(trueProb, am, multiplier = 1) {
  const b = toDecimal(am) - 1;
  const f = (b * trueProb - (1 - trueProb)) / b;
  return Math.max(0, f * multiplier);
}

/**
 * Stakes for an arbitrage across N outcomes so every outcome pays the same.
 * Returns { stakes, payout, profit, roi } for a total stake.
 */
export function arbStakes(americans, totalStake) {
  const decs = americans.map(toDecimal);
  const inv = decs.reduce((a, d) => a + 1 / d, 0);
  const stakes = decs.map((d) => (totalStake * (1 / d)) / inv);
  const payout = stakes[0] * decs[0];
  return { stakes, payout, profit: payout - totalStake, roi: (payout - totalStake) / totalStake };
}

/** Same as arbStakes but anchored on a fixed stake for the first leg (useful for book caps). */
export function arbStakesFromLeg(americans, firstStake) {
  const decs = americans.map(toDecimal);
  const payout = firstStake * decs[0];
  const stakes = decs.map((d) => payout / d);
  const total = stakes.reduce((a, b) => a + b, 0);
  return { stakes, payout, profit: payout - total, roi: (payout - total) / total, total };
}

/** Promo conversion: bonus bet (stake not returned) hedged with cash on the other side. */
export function convertBonusBet(bonusAmount, bonusAm, hedgeAm) {
  const bonusWin = bonusAmount * (toDecimal(bonusAm) - 1);
  const hedgeStake = bonusWin / toDecimal(hedgeAm);
  const kept = bonusWin - hedgeStake;
  return { hedgeStake, kept, rate: kept / bonusAmount };
}

/** Profit-boost conversion: boosted price on one side, hedge on the other. */
export function boostHedge(stake, boostedAm, hedgeAm) {
  const payout = stake * toDecimal(boostedAm);
  const hedgeStake = payout / toDecimal(hedgeAm);
  return { hedgeStake, profit: payout - stake - hedgeStake };
}

/** Parlay price from leg American prices (assumes independence). */
export function parlay(americans) {
  const dec = americans.reduce((a, am) => a * toDecimal(am), 1);
  return { decimal: dec, american: toAmerican(dec) };
}

export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
export const money = (x, d = 2) =>
  `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
