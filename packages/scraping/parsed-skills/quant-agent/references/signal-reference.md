# Technical Signal Quick Reference

## Trend Indicators

### Simple Moving Average (SMA)

- **Formula**: `SMA(N) = (P_1 + P_2 + ... + P_N) / N`
- **Common periods**: 20 (short-term), 50 (medium), 200 (long-term)
- **Signal**: Price above SMA = bullish; below = bearish
- **Classic strategy**: SMA(50) crosses above SMA(200) = "Golden Cross" (bullish); below = "Death Cross" (bearish)
- **Lag**: High (reacts slowly to price changes)

### Exponential Moving Average (EMA)

- **Formula**: `EMA_t = α × P_t + (1 - α) × EMA_{t-1}` where `α = 2/(N+1)`
- **Common periods**: 12, 26 (used in MACD)
- **Advantage over SMA**: More responsive to recent prices
- **Signal**: Same as SMA but faster

---

## Momentum Indicators

### RSI (Relative Strength Index)

- **Formula**: `RSI = 100 - 100/(1 + RS)` where `RS = AvgGain(N) / AvgLoss(N)`
- **Default period**: 14
- **Range**: 0 to 100
- **Signals**:
  - RSI > 70: Overbought (potential sell)
  - RSI < 30: Oversold (potential buy)
  - Divergence: Price makes new high but RSI doesn't = bearish divergence
- **Best in**: Range-bound markets
- **Fails in**: Strong trends (can stay overbought/oversold for extended periods)

### MACD (Moving Average Convergence Divergence)

- **Components**:
  - MACD Line: EMA(12) - EMA(26)
  - Signal Line: EMA(9) of MACD Line
  - Histogram: MACD Line - Signal Line
- **Signals**:
  - MACD crosses above Signal: Bullish
  - MACD crosses below Signal: Bearish
  - Histogram increasing: Momentum strengthening
  - Zero-line crossover: Trend change
- **Best in**: Trending markets
- **Fails in**: Choppy/sideways markets (many false signals)

### Stochastic Oscillator

- **Formula**: `%K = (Close - Low_N) / (High_N - Low_N) × 100`
- **Default period**: 14, with 3-period smoothing (%D)
- **Range**: 0 to 100
- **Signals**: Similar to RSI (>80 overbought, <20 oversold)

---

## Volatility Indicators

### Bollinger Bands

- **Components**:
  - Middle: SMA(20)
  - Upper: SMA(20) + 2 × StdDev(20)
  - Lower: SMA(20) - 2 × StdDev(20)
- **Signals**:
  - Price touches upper band: Overbought (in range market) or breakout (in trend)
  - Price touches lower band: Oversold or breakdown
  - Band squeeze (narrow width): Low volatility, expect breakout soon
  - Band expansion: Volatility increasing
- **Bandwidth**: `(Upper - Lower) / Middle × 100` — measures volatility

### ATR (Average True Range)

- **Formula**: Average of True Range over N periods
- **True Range**: `max(High-Low, |High-PrevClose|, |Low-PrevClose|)`
- **Default period**: 14
- **Use**: Position sizing, stop-loss placement (e.g., 2×ATR trailing stop)
- **NOT a directional signal** — purely measures volatility

---

## Volume Indicators

### OBV (On-Balance Volume)

- **Formula**: `OBV_t = OBV_{t-1} + (Volume if Close > PrevClose, -Volume if Close < PrevClose)`
- **Signal**: Rising OBV with rising price confirms trend; divergence warns of reversal
- **Use**: Confirm price trends with volume

### VWAP (Volume Weighted Average Price)

- **Formula**: `VWAP = Σ(Price × Volume) / Σ(Volume)` (intraday, resets daily)
- **Signal**: Institutional benchmark — price above VWAP = bullish intraday; below = bearish
- **Use**: Intraday trading, execution benchmarking

---

## Signal Combination Rules

### Bullish Confluence (High Confidence)

1. RSI recovering from below 30
2. MACD crossing above signal line
3. Price above SMA(200)
4. Volume increasing on up days
5. Bollinger Band squeeze resolving upward

### Bearish Confluence (High Confidence)

1. RSI dropping from above 70
2. MACD crossing below signal line
3. Price below SMA(200)
4. Volume increasing on down days
5. Bollinger Band squeeze resolving downward

### Divergence Signals (Reversal Warning)

- **Bullish divergence**: Price makes lower low, RSI/MACD makes higher low
- **Bearish divergence**: Price makes higher high, RSI/MACD makes lower high
- **Confirmation needed**: Wait for price to confirm the reversal before acting

---

## Common Mistakes

1. **Using indicators in isolation**: Always combine 2-3 indicators from different categories
2. **Ignoring the trend**: Counter-trend signals have lower win rates
3. **Over-optimizing parameters**: Default parameters (RSI 14, MACD 12/26/9) work fine for most cases
4. **Trading every signal**: Wait for confluence and only take high-conviction setups
5. **Forgetting transaction costs**: Frequent signals in choppy markets destroy returns after costs
