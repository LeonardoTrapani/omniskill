# Exploratory Data Analysis Checklist for Financial Data

## Step 1: Data Acquisition & Validation

- [ ] Source identified (Yahoo Finance, Bloomberg, etc.)
- [ ] Date range covers sufficient history (min 2 years for daily data)
- [ ] OHLCV columns all present
- [ ] No missing trading days (check against exchange calendar)
- [ ] Adjusted close accounts for splits and dividends
- [ ] Timezone consistency verified

## Step 2: Compute Returns

- [ ] Log returns: `r_t = ln(P_t / P_{t-1})`
- [ ] Verify no extreme outliers from data errors (> ±30% daily)
- [ ] Check for zero-return days (may indicate stale data)

## Step 3: Summary Statistics

| Statistic          | What to Look For                                 |
| ------------------ | ------------------------------------------------ |
| Mean (daily)       | Should be small (~0.02-0.05% for equities)       |
| Std Dev (daily)    | Typical: 0.5-2% for single stocks                |
| Skewness           | Negative for equities (big drops > big gains)    |
| Kurtosis           | > 3 (excess > 0) indicates fat tails             |
| Min/Max            | Check if extreme days correspond to known events |
| Autocorrelation(1) | Should be near zero for returns                  |

## Step 4: Distribution Analysis

- [ ] Histogram of returns with normal overlay
- [ ] QQ-plot: deviations in tails show non-normality
- [ ] Jarque-Bera test for normality (expect rejection)
- [ ] Kolmogorov-Smirnov test against normal

## Step 5: Time Series Properties

- [ ] ACF of returns (should be mostly insignificant)
- [ ] ACF of absolute returns (should show persistence = volatility clustering)
- [ ] Rolling mean (check for non-stationarity)
- [ ] Rolling volatility (visualize vol regimes)
- [ ] ADF test for stationarity on returns (should be stationary)

## Step 6: Cross-Asset Analysis (if multiple tickers)

- [ ] Correlation matrix
- [ ] Rolling correlation (is it stable?)
- [ ] PCA: how many factors explain most variance?
- [ ] Scatter plots of returns for key pairs

## Step 7: Outlier Investigation

- [ ] Flag days with |return| > 3 standard deviations
- [ ] Cross-reference with known events (earnings, macro, crashes)
- [ ] Decide: keep (real events) or flag (data errors)

## Step 8: Missing Data

- [ ] Count NaN/missing values per column
- [ ] Forward-fill for minor gaps (weekends, holidays)
- [ ] Do NOT interpolate returns — they should be NaN or real
- [ ] Document any adjustments made

## Red Flags to Watch For

- Kurtosis > 10: Extremely fat tails — standard risk metrics will fail
- Autocorrelation > 0.1 at lag 1: Potential data issue or microstructure effect
- Skewness < -1: Heavy left tail — downside risk is severe
- Volume = 0 on trading days: Liquidity issue or data error
- Price gaps > 10% without corporate action: Check for splits/errors
