---
name: quant-agent
displayName: Quantitative Finance Agent
description: "Comprehensive quantitative finance skill that teaches an AI agent to transform raw market data into actionable insights, predictions, and decisions. Covers exploratory data analysis, technical signals, volatility modeling, signal decay detection, correlation regime analysis, and financial data visualization."
version: 1.0.0
tags:
  [quantitative-finance, data-analysis, trading-signals, volatility, market-regimes, visualization]
metadata:
  category: quantitative-finance
  difficulty: intermediate
  data-sources:
    - yahoo-finance
    - alpha-vantage
---

# Quantitative Finance Agent

A complete skill set for transforming raw financial data into insight, prediction, and decision. This skill teaches an AI agent to perform professional-grade quantitative analysis — from fetching data, through statistical exploration, technical signal computation, volatility modeling, signal quality assessment, regime detection, and compelling visualization.

## Overview

Financial markets generate enormous volumes of raw data — prices, volumes, options chains, economic indicators. The challenge is not access to data, but turning that data into something actionable. This skill provides a structured pipeline:

1. **Fetch & Explore** — Acquire data and understand its statistical properties
2. **Compute Signals** — Generate technical indicators and trading signals
3. **Model Volatility** — Analyze implied vs realized volatility and risk premium
4. **Assess Signal Quality** — Detect signal decay, crowding, and regime dependency
5. **Detect Regimes** — Classify market environments and conditional correlations
6. **Visualize & Communicate** — Present findings in compelling, actionable formats

Each module includes executable Python scripts in `scripts/` and deep reference material in `references/`.

## When to Use This Skill

Use this skill when the agent needs to:

- Analyze financial datasets (stock prices, options data, economic series)
- Compute technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Assess volatility and risk (implied vs realized, volatility surfaces)
- Evaluate whether a trading signal is still profitable or decaying
- Detect market regime changes (risk-on, crisis, recovery)
- Build financial dashboards or data visualizations
- Answer questions about quantitative finance concepts

---

## Module 1: Exploratory Data Analysis

### Theory

Financial data has unique statistical properties that distinguish it from other domains:

**Non-normality of returns**: Stock returns exhibit fat tails (leptokurtosis) — extreme events occur far more frequently than a normal distribution predicts. The 2008 crash, March 2020 COVID crash, and daily flash crashes are not 6-sigma events under normality — they are features of the true return distribution.

**Key statistical properties to check**:

- **Mean and standard deviation**: Annualized return and volatility
- **Skewness**: Negative skew is typical for equities (large drops, small gains)
- **Kurtosis**: Excess kurtosis > 0 indicates fat tails (normal = 3)
- **Autocorrelation**: Returns show weak autocorrelation, but absolute returns show strong persistence (volatility clustering)
- **Stationarity**: Raw prices are non-stationary; returns are approximately stationary

**The EDA pipeline for financial data**:

1. Fetch raw price data (OHLCV)
2. Compute log returns: `r_t = ln(P_t / P_{t-1})`
3. Generate summary statistics (mean, std, skew, kurtosis, min, max)
4. Plot distribution of returns with normal overlay
5. QQ-plot to visualize tail behavior
6. Autocorrelation function (ACF) of returns and absolute returns
7. Rolling statistics (mean, volatility) to detect non-stationarity
8. Correlation matrix across multiple assets
9. Missing data analysis and handling

**Outlier detection** in financial data requires domain knowledge. A -10% daily move is not a "data error" — it is a real market event. Use robust statistics (median, IQR) rather than mean-based z-scores for identifying genuine anomalies.

### Implementation

Run `scripts/fetch_data.py` to download data from Yahoo Finance:

```bash
python scripts/fetch_data.py --tickers SPY,QQQ,IWM,TLT,GLD --period 5y --output data.csv
```

Run `scripts/eda.py` for full exploratory analysis:

```bash
python scripts/eda.py --input data.csv --ticker SPY
```

This produces:

- Summary statistics table
- Return distribution histogram with normal overlay
- QQ-plot
- ACF plot of returns and absolute returns
- Rolling mean and volatility chart
- Correlation heatmap (if multiple tickers)

### Interpreting Results

- **Skewness < -0.5**: Significant negative skew — downside risk is larger than upside
- **Kurtosis > 4**: Heavy tails — expect more extreme moves than normal model predicts
- **ACF significant at lag 1 for |returns|**: Volatility clustering present — use GARCH-type models
- **Correlation > 0.8**: Assets are highly co-moving — limited diversification benefit

---

## Module 2: Technical Signal Analysis

### Theory

Technical analysis computes indicators from price and volume data to identify trends, momentum, and reversal points. While controversial in academic finance (EMH), these indicators are widely used by practitioners and serve as building blocks for systematic strategies.

**Core indicators**:

**Trend-following**:

- **SMA (Simple Moving Average)**: Average of last N prices. SMA(50) vs SMA(200) crossover is a classic trend signal.
- **EMA (Exponential Moving Average)**: Weighted average giving more importance to recent prices. Faster response than SMA.

**Momentum**:

- **RSI (Relative Strength Index)**: Measures speed and magnitude of price changes on 0-100 scale.
  - Formula: `RSI = 100 - 100 / (1 + RS)` where `RS = avg_gain / avg_loss` over N periods (typically 14)
  - RSI > 70: Overbought (potential reversal down)
  - RSI < 30: Oversold (potential reversal up)

- **MACD (Moving Average Convergence Divergence)**: Difference between fast EMA (12) and slow EMA (26), with a signal line (EMA 9 of MACD).
  - MACD crossing above signal: Bullish
  - MACD crossing below signal: Bearish
  - Histogram shows momentum strength

**Volatility-based**:

- **Bollinger Bands**: SMA(20) ± 2 standard deviations. Price touching upper band suggests overbought; lower band suggests oversold. Band width measures volatility.

**Volume**:

- **OBV (On-Balance Volume)**: Cumulative volume with direction based on price change. Rising OBV with rising price confirms trend.
- **VWAP (Volume Weighted Average Price)**: Average price weighted by volume. Institutional benchmark.

**Limitations**:

- All indicators are **lagging** — they describe what already happened
- In ranging/choppy markets, trend indicators generate many false signals
- Indicators work best when combined and confirmed across timeframes
- Overfitting to historical patterns is the biggest risk

### Implementation

Run `scripts/compute_signals.py` to calculate all indicators:

```bash
python scripts/compute_signals.py --ticker SPY --period 2y
```

Run `scripts/signal_scanner.py` to scan multiple tickers for active signals:

```bash
python scripts/signal_scanner.py --tickers SPY,QQQ,AAPL,MSFT,NVDA,AMZN,GOOGL,META --period 6mo
```

### Interpreting Results

A signal is strongest when multiple indicators agree:

- **Bullish confluence**: RSI recovering from <30, MACD crossover up, price above SMA(200), increasing volume
- **Bearish confluence**: RSI dropping from >70, MACD crossover down, price below SMA(200), decreasing volume
- **Divergence**: Price making new highs but RSI making lower highs — potential reversal

See `references/signal-reference.md` for a quick-reference card of all indicators.

---

## Module 3: Volatility Analysis

### Theory

Volatility is the core concept in options pricing and risk management. Understanding volatility is crucial for any quantitative analysis.

**Realized Volatility (RV)**: Historical volatility computed from actual returns.

- Formula: `RV = std(returns) * sqrt(252)` (annualized)
- Typically computed on rolling windows: 20-day (monthly), 60-day (quarterly), 252-day (annual)
- Close-to-close is simplest; Parkinson (high-low), Garman-Klass (OHLC), Yang-Zhang are more efficient estimators

**Implied Volatility (IV)**: The market's expectation of future volatility, extracted from options prices using Black-Scholes inversion.

- Higher IV → more expensive options → market expects bigger moves
- IV varies by strike (volatility smile/skew) and expiration (term structure)

**Volatility Risk Premium (VRP)**: The key insight — IV is systematically higher than subsequent RV.

- `VRP = IV - RV_realized` (typically positive)
- This premium exists because investors pay for downside protection
- Selling volatility (short options) captures this premium but carries tail risk
- The VRP is the core business model of many hedge funds and prop trading firms

**Volatility Surface**: A 3D surface of IV across strikes (moneyness) and expirations:

- **Smile**: IV is higher for OTM puts and OTM calls (U-shape in strike)
- **Skew**: IV is higher for OTM puts than OTM calls (demand for downside protection)
- **Term structure**: Typically upward sloping (more uncertainty over longer horizons), inverts in high-volatility regimes

**VIX**: The CBOE Volatility Index — a model-free measure of 30-day expected volatility of the S&P 500, computed from SPX option prices. Often called the "fear gauge."

- VIX < 15: Low volatility, complacency
- VIX 15-25: Normal range
- VIX 25-35: Elevated fear
- VIX > 35: Crisis mode (2008: 80+, COVID 2020: 82)

### Implementation

Run `scripts/vol_analysis.py` for realized vs implied volatility analysis:

```bash
python scripts/vol_analysis.py --ticker SPY --period 5y
```

Run `scripts/vol_surface.py` to generate a 3D volatility surface:

```bash
python scripts/vol_surface.py --ticker SPY
```

### Interpreting Results

- **IV > RV persistently**: Normal — the volatility risk premium is being priced
- **RV > IV (rare)**: Market underpriced risk — often happens right before or during a crash
- **Steep skew**: Market is pricing significant downside risk
- **Inverted term structure**: Short-term fear is high — market expects near-term event
- **VIX spike + contango collapse**: Classic crisis signature

See `references/volatility-primer.md` for a comprehensive guide to volatility concepts.

---

## Module 4: Signal Decay Detection

### Theory

Every trading signal has a lifecycle. Alpha (excess return) decays over time due to:

**Why signals die**:

1. **Crowding**: As more participants discover and trade a signal, its profitability decreases. The signal moves prices before you can trade it.
2. **Regime change**: A signal that works in low-volatility trending markets may fail in choppy, high-volatility regimes.
3. **Structural breaks**: Regulatory changes, market microstructure evolution, or macro regime shifts can permanently kill a signal.
4. **Data snooping**: The signal never existed — it was a statistical artifact of overfitting to historical data.

**Measuring signal decay**:

**Rolling Sharpe Ratio**: Compute Sharpe on rolling windows (e.g., 252-day). A declining trend indicates decay.

- Sharpe > 1.0: Strong signal
- Sharpe 0.5-1.0: Moderate
- Sharpe < 0.5: Weak — may not survive transaction costs
- Sharpe declining over time: Signal is decaying

**Autocorrelation analysis**: A profitable signal generates autocorrelated returns (winners keep winning). As the signal decays, autocorrelation drops.

- Compute ACF of strategy returns at various lags
- If lag-1 autocorrelation is declining over time, the signal is losing predictive power

**Half-life estimation**: Using the Ornstein-Uhlenbeck process, estimate how quickly signal deviations mean-revert:

- `dX = θ(μ - X)dt + σdW`
- Half-life = `ln(2) / θ`
- Short half-life (~days): Signal exploits fast mean-reversion
- Long half-life (~months): Signal captures slow trends
- Increasing half-life over time: Signal is becoming less responsive

**Breakpoint detection**: Use statistical change-point detection (CUSUM, Bai-Perron) to identify structural breaks in signal performance.

### Implementation

Run `scripts/decay_analyzer.py` to analyze signal decay:

```bash
python scripts/decay_analyzer.py --signal-csv signal_returns.csv --window 252
```

Run `scripts/backtest_signal.py` for a simple signal backtest:

```bash
python scripts/backtest_signal.py --ticker SPY --signal sma_crossover --period 10y
```

### Interpreting Results

- **Rolling Sharpe downtrend**: Signal is decaying — reduce allocation or stop trading
- **Autocorrelation dropping**: Predictive power is fading
- **Half-life lengthening**: Signal is getting slower — was it ever real, or was it a faster regime?
- **Breakpoint detected**: Investigate what changed (regulation, market structure, macro regime)
- **Equity curve flattening**: Even if Sharpe looks OK on full sample, the signal may have stopped working years ago

See `references/alpha-lifecycle.md` for a deep dive into signal lifecycle management.

---

## Module 5: Correlation Regime Analysis

### Theory

Asset correlations are not constant — they change dramatically across market regimes. This is one of the most important (and most often ignored) facts in portfolio construction.

**The correlation problem**: In normal times, stocks and bonds are weakly correlated or negatively correlated, providing diversification. In crisis, correlations spike — everything falls together except safe havens. This means portfolios are less diversified exactly when diversification matters most.

**Market regimes**:

- **Risk-On (Bull)**: Low volatility, positive returns, moderate correlations, risk assets outperform
- **Risk-Off (Correction)**: Rising volatility, negative returns, increasing correlations, flight to quality
- **Crisis**: Very high volatility, sharply negative returns, correlation spike to ~1 across risk assets, only true safe havens survive
- **Recovery**: Declining volatility, strong positive returns, correlations normalizing, mean reversion

**Regime detection methods**:

**Rolling volatility thresholds**: Simple but effective. Classify regimes based on rolling 20-day annualized volatility:

- < 10%: Low vol (risk-on)
- 10-20%: Normal
- 20-30%: Elevated (risk-off)
- > 30%: Crisis

**Hidden Markov Models (HMM)**: Model the market as having K hidden states, each with its own return distribution. The model infers which state the market is in at each time:

- Typically 2-3 states work well
- States often map naturally to bull/bear/crisis
- Transition probabilities reveal persistence of each regime

**Cross-asset signals**: Regime changes often appear first in volatility and credit markets:

- VIX term structure inversion: Short-term fear exceeds long-term
- Credit spreads widening: Risk-off signal
- Yield curve inversion: Recession signal
- Gold/USD rising while equities fall: Flight to quality

**Conditional correlations**: Compute correlation matrices separately for each regime:

- In risk-on: Stocks ~0.3-0.5 correlated, stock-bond ~0 to -0.3
- In crisis: Stocks ~0.7-0.9 correlated, stock-bond can flip to +0.5

### Implementation

Run `scripts/regime_detector.py` to classify market regimes:

```bash
python scripts/regime_detector.py --ticker SPY --period 10y
```

Run `scripts/correlation_matrix.py` to compute conditional correlation matrices:

```bash
python scripts/correlation_matrix.py --tickers SPY,QQQ,TLT,GLD,USO,HYG --period 10y
```

### Interpreting Results

- **Regime timeline**: Visual map of when the market was in each state — compare to known events (2008, 2020, 2022)
- **Transition matrix**: Probability of moving between regimes — crisis states are typically short but intense
- **Conditional correlations**: How different the world looks in each regime — this is the key insight for portfolio construction
- **Current regime**: What regime are we in now? This determines which strategies to run

See `references/regime-theory.md` for historical examples and deeper theory.

---

## Module 6: Financial Data Visualization

### Theory

The best analysis is worthless if you cannot communicate it effectively. Financial data visualization has specific conventions and best practices.

**Chart selection guide**:

| Data Type              | Best Chart             | When to Use                       |
| ---------------------- | ---------------------- | --------------------------------- |
| Price over time        | Candlestick / Line     | Time series of a single asset     |
| Returns distribution   | Histogram + KDE        | Understanding return properties   |
| Correlation            | Heatmap                | Cross-asset relationships         |
| Volatility surface     | 3D Surface             | Options analysis                  |
| Regime timeline        | Colored bar chart      | Market regime classification      |
| Portfolio composition  | Treemap / Stacked area | Allocation analysis               |
| Signal strength        | Gauge / Bar            | Current indicator readings        |
| Multi-asset comparison | Normalized line chart  | Comparing different-priced assets |

**Data storytelling principles** (adapted for finance):

1. **Start with the question**: "Is the market in a risk-off regime?" not "Here are 47 charts"
2. **Progressive disclosure**: Summary → detail → raw data
3. **Highlight the insight**: Use color, annotations, and callouts to draw attention to what matters
4. **Context is everything**: A number without context is meaningless. "VIX is 25" → "VIX is 25, which is in the 80th percentile of the last 5 years"
5. **Actionable conclusion**: Every visualization should end with "so what?" — what should the reader do?

**Color conventions in finance**:

- Green = positive / bullish / gains
- Red = negative / bearish / losses
- Blue = neutral / benchmark
- Yellow/Orange = warning / elevated risk
- Purple = crisis / extreme

**Dashboard layout for financial analysis**:

1. **Top row**: Key metrics (current price, daily change, VIX, regime indicator)
2. **Main chart**: Candlestick with volume bars and signal overlays
3. **Side panels**: Technical indicators (RSI, MACD)
4. **Bottom**: Correlation matrix or regime timeline

### Implementation

Run `scripts/dashboard_template.py` for a full Streamlit dashboard:

```bash
streamlit run scripts/dashboard_template.py -- --ticker SPY
```

Run `scripts/plotly_gallery.py` for a gallery of chart types:

```bash
python scripts/plotly_gallery.py --ticker SPY --output charts/
```

### Interpreting Results

The dashboard template provides a single-page view of an asset's analysis including candlestick chart with signal overlays, volume analysis, technical indicators, and regime classification. The Plotly gallery generates standalone interactive HTML charts that can be embedded in presentations or reports.

See `references/chart-guide.md` for the complete chart selection guide.

---

## Limits and Caveats

1. **Past performance does not predict future results**: Every analysis here is backward-looking. Markets are adaptive — patterns change.
2. **Data quality matters**: Yahoo Finance data has known issues (adjusted close recalculations, missing data for delisted securities). For production use, use a professional data provider.
3. **Transaction costs are real**: A signal with Sharpe 1.0 before costs may have Sharpe 0.3 after slippage, commissions, and market impact.
4. **Overfitting is the biggest enemy**: The more you look at data, the more patterns you find — most are noise. Out-of-sample testing is essential.
5. **Correlation is not causation**: Two assets moving together does not mean one causes the other. Factor models help disentangle this.
6. **Tail risk is underestimated**: Normal distribution-based risk metrics (VaR, Sharpe) systematically underestimate extreme event probability.
7. **These tools are for analysis and education**: They are not trading advice. Consult a financial professional before making investment decisions.

## Dependencies

Python packages required to run the scripts:

```
yfinance
pandas
numpy
scipy
scikit-learn
plotly
streamlit
matplotlib
ta
statsmodels
hmmlearn
```

Install with: `pip install yfinance pandas numpy scipy scikit-learn plotly streamlit matplotlib ta statsmodels hmmlearn`
