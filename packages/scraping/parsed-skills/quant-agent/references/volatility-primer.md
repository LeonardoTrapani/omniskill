# Volatility Primer: A Comprehensive Guide

## What is Volatility?

Volatility measures the magnitude of price fluctuations. It is the single most important concept in derivatives pricing and risk management.

**Key distinction**: Volatility measures the SIZE of moves, not the DIRECTION. High volatility means big moves in either direction.

---

## Realized Volatility (Historical Volatility)

### Close-to-Close Volatility

The simplest and most common estimator:

```
σ_realized = std(log_returns) × √252
```

Where `log_returns = ln(P_t / P_{t-1})` and 252 is the number of trading days per year.

**Rolling windows**:

- **20-day**: Monthly vol — reactive, noisy
- **60-day**: Quarterly vol — smoother, still responsive
- **252-day**: Annual vol — very smooth, slow to react

### Better Estimators

**Parkinson (High-Low)**:

```
σ² = (1/4ln2) × mean[(ln(H/L))²]
```

Uses intraday range — more efficient than close-to-close (captures intraday movement).

**Garman-Klass (OHLC)**:

```
σ² = 0.5 × [ln(H/L)]² - (2ln2-1) × [ln(C/O)]²
```

Uses open, high, low, close — even more efficient.

**Yang-Zhang**:
Best estimator for assets with opening gaps. Combines overnight and intraday volatility.

---

## Implied Volatility

### What It Is

The volatility parameter that, when plugged into the Black-Scholes formula, produces the market price of an option.

`Market Price = BS(S, K, T, r, σ_implied)`

Solving for σ_implied gives you the market's **expectation** of future volatility.

### Why It Matters

- **Forward-looking**: Unlike realized vol, IV tells you what the market expects WILL happen
- **Priced by supply/demand**: High demand for protection → high IV
- **Key input for options trading**: Buy options when you think IV is too low; sell when too high

### How to Read IV

- IV of 20% means the market expects the stock to move ±20% over the next year (1 standard deviation)
- Daily expected move: `IV / √252` (for 20% IV → ±1.26% daily)
- Monthly expected move: `IV × √(21/252)` (for 20% IV → ±5.8% monthly)

---

## Volatility Smile and Skew

### The Smile

In theory (Black-Scholes), IV should be the same for all strikes. In practice, it's not:

```
IV
 |     \         /
 |      \       /
 |       \_____/
 |
 +-----|------|------|---
     OTM Put   ATM   OTM Call
```

**Why?** Because real returns have fat tails — extreme moves happen more often than Black-Scholes assumes. OTM options are more valuable than BS predicts.

### The Skew

For equities, OTM puts have MUCH higher IV than OTM calls:

```
IV
 |  \
 |   \
 |    \___________
 |
 +-----|------|------|---
     OTM Put   ATM   OTM Call
```

**Why?** Demand for downside protection. Investors buy puts for portfolio insurance, driving up their price (and IV).

**Skew metric**: `IV(25-delta put) - IV(25-delta call)` — typically positive for equities.

---

## Volatility Term Structure

IV varies by expiration:

- **Normal (contango)**: Longer-dated options have higher IV (more uncertainty over longer horizons)
- **Inverted (backwardation)**: Short-dated IV > long-dated IV — market expects near-term event

**Inversion is a fear signal**: It means the market is pricing in an imminent catalyst (earnings, FOMC, election, crisis).

---

## VIX — The Fear Gauge

### What It Is

The CBOE Volatility Index measures the market's expectation of 30-day S&P 500 volatility, derived from SPX option prices using a model-free approach.

### Reading VIX

| VIX Level | Market Mood          | Historical Context         |
| --------- | -------------------- | -------------------------- |
| < 12      | Extreme complacency  | Pre-2018 "volmageddon"     |
| 12 - 15   | Low volatility       | Typical bull market        |
| 15 - 20   | Normal               | Long-term average ≈ 19     |
| 20 - 25   | Elevated uncertainty | Minor corrections          |
| 25 - 35   | Fear                 | Significant selloffs       |
| 35 - 50   | Panic                | Bear markets               |
| > 50      | Extreme crisis       | 2008 (80), COVID 2020 (82) |

### VIX Futures Term Structure

- **Contango** (normal): VIX futures > spot VIX — calm markets
- **Backwardation**: VIX futures < spot VIX — fear/crisis, market expects volatility to decrease from current elevated levels

---

## Volatility Risk Premium (VRP)

### The Key Insight

Implied volatility is systematically HIGHER than subsequent realized volatility:

`VRP = E[IV] - E[RV] > 0`

This premium exists because:

1. **Insurance demand**: Investors pay a premium for downside protection
2. **Risk aversion**: Uncertainty is painful; investors pay to reduce it
3. **Skewness preference**: People overpay for protection against fat-tail events

### Size of the Premium

- **Average**: IV exceeds RV by ~3-5 volatility points (e.g., IV=20%, RV=16%)
- **Varies by regime**: Premium shrinks in high-vol environments, can go negative in crisis
- **Tradeable**: This is the basis for volatility selling strategies (short straddles, iron condors, variance swaps)

### Trading the VRP

- **Sell vol when VRP is high**: IV is expensive relative to expected RV
- **Don't sell vol when VRP is low or negative**: Market is underpricing risk
- **Measure**: `VRP = VIX - 20-day trailing RV` (simple version)

---

## Practical Applications

### Risk Management

- Use realized vol for position sizing: `Position Size = Risk Budget / (Vol × Price)`
- Use IV for forward-looking risk estimates
- Monitor VIX term structure for market regime

### Options Trading

- Buy options when IV is low relative to your vol forecast
- Sell options when IV is high relative to your vol forecast
- Watch the skew for directional views embedded in options prices

### Portfolio Construction

- Target a portfolio volatility level (e.g., 10% annualized)
- Adjust allocations as realized vol changes
- Use options for tail risk hedging when IV is cheap

---

## Common Misconceptions

1. **"High volatility = bad"**: Not necessarily. High vol creates opportunities. Many strategies profit from volatility.
2. **"VIX predicts direction"**: VIX only measures expected MAGNITUDE of moves, not direction. VIX can spike during rallies too.
3. **"IV overestimates vol because options are overpriced"**: The premium exists for a reason — insurance isn't free. On average, selling vol is profitable, but the tail losses can be catastrophic.
4. **"You can trade VIX directly"**: You can only trade VIX futures/options. Spot VIX is not tradeable. The futures term structure creates significant drag for VIX ETPs.
