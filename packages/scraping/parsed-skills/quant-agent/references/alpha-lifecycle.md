# The Lifecycle of an Alpha Signal

## Introduction

Every trading signal — every source of alpha — follows a lifecycle from discovery to death. Understanding this lifecycle is crucial for managing a quantitative portfolio.

---

## Phase 1: Discovery

A new signal is found through:

- **Academic research**: Published papers (the signal may already be crowded by publication)
- **Empirical observation**: Pattern noticed in data
- **Theoretical insight**: Economic rationale predicts a relationship
- **Alternative data**: New data source reveals previously invisible patterns

**Key question**: Is there an economic REASON this signal should work, or is it purely statistical?

Signals with economic rationale are more likely to persist. Purely statistical patterns are more likely to be noise.

---

## Phase 2: Validation

Before deploying capital, validate the signal rigorously:

### In-Sample Testing

- Compute basic metrics: Sharpe ratio, win rate, max drawdown
- Check for look-ahead bias (using future information)
- Check for survivorship bias (only analyzing stocks that still exist)

### Out-of-Sample Testing

- **Walk-forward analysis**: Train on year 1-5, test on year 6. Train on year 1-6, test on year 7. Etc.
- **Cross-validation**: Split data into K folds, test on each
- **Paper trading**: Run the signal live without real money

### Robustness Checks

- Does it work across different time periods?
- Does it work across different markets/geographies?
- Is it sensitive to parameter choice? (If small parameter changes kill it, it's fragile)
- Does it survive transaction costs?

### Red Flags

- Sharpe > 3 on daily data: Almost certainly overfitted
- Only works on one specific time period: Regime-specific or spurious
- No economic rationale: Higher risk of being noise
- Very high turnover: Transaction costs may destroy it

---

## Phase 3: Deployment

The signal passes validation and goes live:

### Sizing

- Start small (10-20% of target allocation)
- Scale up as live performance confirms backtests
- Use Kelly criterion or risk parity for position sizing

### Monitoring

- Track live Sharpe vs. backtest Sharpe
- Monitor signal autocorrelation
- Watch for correlation with other portfolio signals
- Set kill criteria before deployment (e.g., "shut down if rolling 6-month Sharpe < -0.5")

---

## Phase 4: Maturity

The signal is working as expected. This is the profitable phase.

**Characteristics**:

- Live Sharpe roughly matches backtest Sharpe
- Consistent alpha generation
- Manageable drawdowns
- Signal is part of a diversified portfolio of strategies

**Risks in this phase**:

- Complacency (stop monitoring)
- Over-leveraging (increasing size because "it works")
- Correlation creep (other signals in the portfolio becoming correlated with this one)

---

## Phase 5: Decay

All signals eventually decay. The question is when and how fast.

### Why Signals Decay

**Crowding**: The most common cause. As more participants discover and trade the signal:

- The signal moves prices before you can trade
- Expected returns decrease
- Transaction costs increase (more competition for the same trades)
- The signal effectively "arbitrages itself away"

**Regime change**: Market dynamics shift:

- Interest rate regime change (e.g., zero rates → rising rates)
- Monetary policy regime change (e.g., QE → QT)
- Market microstructure change (e.g., decimalization, HFT emergence)
- Regulatory change (e.g., short-selling bans, position limits)

**Structural breaks**: The economic reason for the signal disappears:

- An inefficiency is permanently corrected
- A data source becomes widely available
- Technology changes eliminate the edge

### How to Detect Decay

**Rolling Sharpe Ratio**:

```
sharpe_t = mean(returns[t-252:t]) / std(returns[t-252:t]) × √252
```

Declining trend = decaying signal.

**Autocorrelation of strategy returns**:
A profitable signal generates serially correlated returns (winning positions continue to win). Declining autocorrelation = losing predictive power.

**Half-life estimation**:
Model the signal's cumulative return as an Ornstein-Uhlenbeck process:

```
dX = θ(μ - X)dt + σdW
half_life = ln(2) / θ
```

If half-life is increasing over time, mean-reversion is slowing = signal weakening.

**Information ratio by period**:
Compare the signal's information ratio (alpha / tracking error) across different time windows. Declining IR in recent windows = decay.

---

## Phase 6: Death

The signal no longer generates positive risk-adjusted returns.

### When to Kill a Signal

- Rolling 12-month Sharpe < 0 for sustained period
- Drawdown exceeds predefined maximum (e.g., 3x backtest max)
- Economic rationale no longer holds
- Better replacement signals available

### What to Do

- **Reduce allocation** gradually (don't cut to zero overnight — the signal may have a temporary drawdown)
- **Investigate cause**: Is it temporary (regime-specific) or permanent (structural)?
- **Archive learnings**: What did this signal teach you about the market?
- **Redeploy capital** to other signals

---

## Practical Metrics for Signal Health

| Metric                   | Healthy  | Warning   | Critical |
| ------------------------ | -------- | --------- | -------- |
| Rolling 252d Sharpe      | > 0.5    | 0 - 0.5   | < 0      |
| Drawdown vs backtest max | < 1.5x   | 1.5x - 2x | > 2x     |
| Lag-1 autocorrelation    | > 0.05   | 0 - 0.05  | < 0      |
| Sharpe trend (slope)     | Positive | Flat      | Negative |
| Correlation with peers   | < 0.3    | 0.3 - 0.5 | > 0.5    |

---

## Case Studies

### Momentum (survived, adapted)

- Discovered academically in 1990s (Jegadeesh & Titman, 1993)
- Still works, but returns have compressed (crowding)
- Sharpe declined from ~0.8 to ~0.3-0.5
- Adaptation: shorter horizons, sector-neutral, risk-adjusted

### Pairs Trading (mostly dead)

- Classic stat-arb strategy: long underperformer, short outperformer
- Worked well in 1990s-2000s
- Killed by HFT competition and increased market efficiency
- Some residual alpha in less liquid markets

### Value (in question)

- Fama-French value factor (HML) underperformed dramatically 2010-2020
- Debate: is it dead, or is this a regime-specific drawdown?
- Partially recovered post-2020 rate increases

---

## Key Takeaways

1. **Every signal has an expiration date** — the question is when, not if
2. **Economic rationale matters** — signals with real reasons persist longer
3. **Monitor continuously** — don't wait for disaster to notice decay
4. **Diversify across signals** — don't depend on any single alpha source
5. **Set kill criteria in advance** — emotional decisions in drawdowns are the worst decisions
6. **The best signals are boring** — flashy backtests often don't survive out-of-sample
