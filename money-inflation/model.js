// Town Bank model: quantity theory of money, M x V = P x Q with V fixed. Pure, no DOM/three.
// Units: money in dollars, goods in baskets per year, P in dollars per basket, growth rates in % per year, time in years.
export const M0 = 100000, V = 4, Q0 = 40000, P0 = M0 * V / Q0;          // P0 = $10 per basket
export const BASE = { bread: 3, milk: 2, bike: 200 };                    // tag prices at P0 (dollars)
export const SAVER = 100, YEARS = 20;

// Story "One town, one year": each step sets the sliders. adj = how far prices have caught up with the new money (0..1).
export const STORY = [
  null,
  { money: 10, goods: 0, years: 0, adj: 1 },     // 1 town at rest
  { money: 10, goods: 0, years: 1, adj: 0 },     // 2 bank lends new money, prices not moved yet
  { money: 10, goods: 0, years: 1, adj: .3 },    // 3 borrowers spend
  { money: 10, goods: 0, years: 1, adj: .7 },    // 4 bread sells out, baker raises price
  { money: 10, goods: 0, years: 1, adj: 1 },     // 5 prices settle
  { money: 10, goods: 0, years: 1, adj: 1 },     // 6 winners and losers
  { money: 10, goods: 10, years: 1, adj: 1 },    // 7 bakery grows too
];

export const inflationRate = (money, goods) => ((1 + money / 100) / (1 + goods / 100) - 1) * 100;
export const priceAt = (money, goods, y) => (M0 * (1 + money / 100) ** y) * V / (Q0 * (1 + goods / 100) ** y);

// s: { money (%/yr), goods (%/yr), years (0..20), story (0 = off, 1..7) }
export function model(s) {
  const step = Math.round(s.story) || 0, y = s.years;
  const M = M0 * (1 + s.money / 100) ** y, Q = Q0 * (1 + s.goods / 100) ** y, Pfull = M * V / Q;
  const adj = STORY[step] ? STORY[step].adj : 1, P = P0 + (Pfull - P0) * adj;   // story steps 2-4: prices still catching up
  const k = P / P0, bread = BASE.bread * k;
  const series = { years: [], M: [], Q: [], P: [] };                      // index, year 0 = 100
  for (let i = 0; i <= YEARS; i++) {
    series.years.push(i);
    series.M.push(100 * (1 + s.money / 100) ** i); series.Q.push(100 * (1 + s.goods / 100) ** i);
    series.P.push(100 * priceAt(s.money, s.goods, i) / P0);
  }
  return {
    step, M, Q, P, k, bread, milk: BASE.milk * k, bike: BASE.bike * k,
    inflation: inflationRate(s.money, s.goods),
    loaves: Math.floor(SAVER / bread + 1e-9), loaves0: Math.floor(SAVER / BASE.bread),
    worth: SAVER / k,                                                    // the saver's $100 in year-0 dollars
    Mi: 100 * M / M0, Qi: 100 * Q / Q0, Pi: 100 * k, series,
  };
}
