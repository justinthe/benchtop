---
title: Town Bank
slug: money-inflation
type: explainer
tags: [economics, money, inflation, prices]
---

# Why prices go up (how money loses value)

**Scope of this page:** inflation as "more money chasing the same goods". Money supply, the amount of
goods a town makes, and the price level. Interest-rate policy, exchange rates, wages vs prices and real-world
CPI history are *not* on this page.

**Audience:** high school. Plain language first, then the number. Toy numbers only, one small town.

## The idea in a few sentences

A price is just how many dollars swap for one thing. If a town suddenly has more dollars but still bakes
the same amount of bread, people bid against each other with their extra dollars and the price of bread
goes up. Nothing about the bread changed; each dollar is worth less. If the town makes more goods as fast
as it makes more money, prices stay put. If goods grow faster than money, prices fall (deflation).

The rule behind it is **M × V = P × Q**: money in the town (M) times how many times each dollar gets spent
a year (V) equals the price level (P) times the goods made in a year (Q). Hold V fixed and the page is just:
**P = M × V / Q**.

I want people to **pump new money into the town's bank, see shoppers spend it, and watch price tags in the
shop window climb**, while a chart shows money, goods and prices side by side and a saver's $100 buys less
and less.

## Page type and scene

Explainer. A **small-town bank on a main street**, cutaway so we see inside and out:

- **Inside:** teller counter, a vault with stacks of bills (stack height tracks M), a loan officer's desk.
- **Diegetic screen (ledger board on the bank wall):** live chart (see below).
- **Across the street:** a bakery/shop with a window of price tags (bread, milk, bike). Tags update with P.
  Shelves fill up as Q grows.
- **People:** a few townsfolk walking between bank and shop carrying bills. More money, more traffic.
- **A saver's jar** on the counter labelled "$100": a little readout under it says how many loaves it buys.

## Starting numbers (use exactly these)

| Thing | Symbol | Start value |
|---|---|---|
| Money in town | M | $100,000 |
| Times each dollar spent per year | V | 4 (fixed, not a slider) |
| Goods made per year | Q | 40,000 baskets |
| Price level | P | $10 per basket |

Price tags at start: bread $3, milk $2, bike $200. All tags scale with P / $10.

Year by year: M grows by money growth `m`, Q grows by goods growth `g`, then P = M × 4 / Q.
Yearly inflation = (1 + m) / (1 + g) − 1. Checks: m = 10%, g = 0 gives 10%; m = g = 10% gives 0%;
m = 0, g = 5% gives about −4.8%.

## Interactions

1. **Money growth** slider: −5% to +50% per year (start 10%). Top end shows runaway inflation; label it
   "extreme".
2. **Goods growth** slider: −5% to +10% per year (start 0%).
3. **Years** slider: 0 to 20. Scrubbing moves the whole scene to that year.
4. **Step-through story** (Next / Back buttons, one caption per step), *One town, one year*:
   1. The town at rest: $100,000, bread $3. Saver's $100 buys 33 loaves.
   2. The bank makes new loans: vault grows by 10% (new dollars, not anyone's savings moved).
   3. Borrowers walk to the shop and spend. More dollars arrive, same bread on the shelf.
   4. Bread sells out early; the baker raises the price. Other shops follow.
   5. Prices settle 10% higher: bread $3.30. Each dollar buys less.
   6. Winners and losers: the saver's $100 now buys 30 loaves; the borrower repays with cheaper dollars.
   7. What if the bakery also grows 10%? Shelves fill, prices hold at $3. Money only causes inflation when it
      outruns goods.
   The story drives the sliders while it plays; touching a slider leaves story mode.

## Live chart (ledger board)

Over years 0 to 20, three lines indexed to 100 at year 0: Money (M), Goods (Q), Prices (P). Plus a big
readout: this year's inflation %, bread price, and loaves the saver's $100 buys. Negative inflation shown
in a different colour and labelled "deflation".
