# Market Regime Theory: A Practical Guide

## What Are Market Regimes?

Financial markets alternate between distinct states — regimes — each characterized by different statistical properties (return, volatility, correlation). The same trading strategy can be highly profitable in one regime and catastrophic in another.

**Core insight**: Markets are NOT one continuous process. They are a mixture of multiple processes, and the active process changes over time.

---

## The Four Canonical Regimes

### 1. Risk-On (Bull Market)

- **Returns**: Positive, steady
- **Volatility**: Low (10-15% annualized)
- **Correlations**: Low-to-moderate within equities (~0.3-0.5)
- **Stock-Bond correlation**: Negative (diversification works)
- **Duration**: Longest regime (60-70% of the time)
- **Characteristic**: Complacency, low VIX, credit spreads tight
- **What works**: Momentum, carry, beta exposure

### 2. Risk-Off (Correction)

- **Returns**: Negative, moderate speed
- **Volatility**: Rising (15-25%)
- **Correlations**: Rising within equities (~0.5-0.7)
- **Stock-Bond correlation**: Shifts toward negative (flight to quality)
- **Duration**: Weeks to months
- **Characteristic**: Rising VIX, credit widening, sector rotation to defensives
- **What works**: Quality, low-vol, defensive sectors, bonds

### 3. Crisis

- **Returns**: Sharply negative
- **Volatility**: Very high (30%+)
- **Correlations**: Spike to ~0.8-0.9 ("all correlations go to 1")
- **Stock-Bond correlation**: Can become positive (everything sells in liquidity crisis) or deeply negative (pure flight to quality)
- **Duration**: Days to weeks for acute phase
- **Characteristic**: VIX > 35, credit spreads blow out, liquidity evaporates
- **What works**: Cash, treasuries, put options, volatility long

### 4. Recovery

- **Returns**: Strongly positive (mean reversion)
- **Volatility**: Declining from elevated levels
- **Correlations**: Normalizing
- **Stock-Bond correlation**: Returns to normal
- **Duration**: Weeks to months
- **Characteristic**: VIX declining, credit tightening, broad-based rally
- **What works**: Value, high-beta, beaten-down sectors

---

## Why Correlations Change in Crisis

### Theoretical Explanations

**Contagion theory**: Fear spreads across markets. A sell-off in one asset class triggers margin calls, forcing sales across all asset classes.

**Liquidity withdrawal**: In crisis, market makers widen spreads and reduce activity. Assets that normally have independent price dynamics become correlated through the liquidity channel.

**Forced selling**: Leveraged investors facing margin calls must sell their most liquid assets, regardless of fundamentals. This creates correlation where none existed.

**Information cascades**: In uncertainty, investors take cues from each other. Selling begets selling across markets.

### Practical Implications

- **Diversification fails when you need it most**: A portfolio that looks diversified in normal times may behave like a concentrated position in crisis
- **Risk models based on normal-time correlations underestimate crisis risk**
- **Stress testing must use crisis correlations, not average correlations**

---

## Detecting Regimes in Real-Time

### Method 1: Volatility Thresholds (Simple, Effective)

Use rolling 20-day annualized volatility of a market proxy (e.g., SPY):

| Rolling Vol | Regime              |
| ----------- | ------------------- |
| < 10%       | Low Vol / Risk-On   |
| 10-20%      | Normal              |
| 20-30%      | Elevated / Risk-Off |
| > 30%       | Crisis              |

**Pros**: Simple, transparent, no training required
**Cons**: Thresholds are somewhat arbitrary, slow to react

### Method 2: Hidden Markov Models (HMM)

Model the market as having K hidden states, each with its own return distribution:

- State k has mean μ_k and variance σ²_k
- Transition probabilities P(state_t+1 = j | state_t = i)
- The model infers the most likely state at each time step

**Typical setup**: 2-3 states

- 2 states: Bull / Bear
- 3 states: Bull / Normal / Crisis

**Pros**: Data-driven, captures non-obvious regime changes
**Cons**: Overfitting risk, states can be unstable, lookback bias if re-estimated

### Method 3: Cross-Market Signals

Multiple indicators together provide robust regime detection:

- **VIX level and term structure**: VIX > 25 + backwardation = crisis
- **Credit spreads**: HY OAS > 500bps = stress
- **Yield curve**: Inverted = recession risk
- **Equity breadth**: < 30% stocks above 200-day SMA = bearish
- **Momentum**: 12-month SPY return < 0 = bearish

**Composite score**: Assign points for each indicator, sum them. Higher score = worse regime.

---

## Historical Regime Examples

### Global Financial Crisis (2008-2009)

- **Onset**: Bear Stearns collapse (March 2008)
- **Acute crisis**: Lehman Brothers (September 15, 2008)
- **Peak VIX**: 80.86 (November 20, 2008)
- **SPY drawdown**: -56.8% peak-to-trough
- **Duration of crisis phase**: ~6 months (Sep 2008 - Mar 2009)
- **Key feature**: Equity correlations spiked to 0.9+. Even "diversified" portfolios lost 40%+. Credit markets froze completely.
- **Recovery**: Began March 9, 2009. V-shaped for equities, slower for credit.

### COVID Crash (2020)

- **Onset**: Global pandemic fears (late February 2020)
- **Peak VIX**: 82.69 (March 16, 2020)
- **SPY drawdown**: -33.9% in 23 trading days (fastest ever)
- **Duration of crisis phase**: ~4 weeks
- **Key feature**: Extreme speed. Everything sold simultaneously (stocks, bonds, gold, crypto). Massive fiscal/monetary response.
- **Recovery**: Fastest recovery in history. V-shaped. New highs by August 2020.

### Inflation/Rate Shock (2022)

- **Context**: Fed raising rates from 0% to 5%+ in fastest cycle since 1980s
- **SPY drawdown**: -25.4%
- **Key feature**: Bonds and stocks fell TOGETHER. 60/40 portfolio had worst year in decades. Traditional diversification broke.
- **VIX**: Elevated (25-35) but not extreme — this was a slow-burn drawdown, not a panic crash.
- **Duration**: All of 2022. Gradual recovery through 2023.

---

## Building Regime-Aware Strategies

### Approach 1: Regime as a Filter

- Run your strategy only in favorable regimes
- Example: Only trade momentum when VIX < 20 and market is above SMA(200)
- Avoid trading mean-reversion in crisis (correlations are too high, mean-reversion takes forever)

### Approach 2: Regime-Dependent Allocation

- Risk-On: Full equity exposure, alternative strategies
- Normal: Standard allocation
- Risk-Off: Reduce equity, increase quality/defensive
- Crisis: Maximum defensive positioning, option hedges

### Approach 3: Regime-Switching Models

- Estimate separate models for each regime
- Use HMM to determine current regime
- Apply the regime-appropriate model
- Rebalance as regime changes

---

## Key Takeaways

1. **Markets have multiple states**: Treating all periods the same is a mistake
2. **Correlations are NOT constant**: Any risk model assuming stable correlations will fail in crisis
3. **Regime detection is imprecise**: You often only know what regime you were in after the fact
4. **Simple methods work well**: Volatility thresholds are surprisingly effective
5. **Speed of regime change matters**: Some transitions are gradual (2022), others are instant (COVID)
6. **Survivorship of strategies depends on regime awareness**: The best quant teams adapt to regimes, the worst assume stationarity
