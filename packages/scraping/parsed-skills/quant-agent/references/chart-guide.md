# Financial Data Visualization Guide

## Chart Selection Matrix

| Data Question                   | Chart Type                  | Library           | Notes                              |
| ------------------------------- | --------------------------- | ----------------- | ---------------------------------- |
| How did the price evolve?       | Candlestick + Volume        | Plotly            | Standard for OHLCV data            |
| What's the return distribution? | Histogram + KDE             | Plotly/Matplotlib | Overlay normal for comparison      |
| Are returns normal?             | QQ-Plot                     | Scipy + Plotly    | Deviations in tails = fat tails    |
| How do assets correlate?        | Heatmap                     | Plotly/Seaborn    | Use RdBu_r colorscale, center at 0 |
| How does correlation change?    | Rolling line chart          | Plotly            | 60-day window is typical           |
| What's the volatility surface?  | 3D Surface                  | Plotly            | Moneyness × DTE × IV               |
| Monthly returns pattern?        | Calendar heatmap            | Plotly            | Year × Month grid, RdYlGn scale    |
| How bad were drawdowns?         | Underwater chart            | Plotly            | Fill to zero, red color            |
| What regime are we in?          | Timeline with colored bands | Plotly            | vrect overlays on price chart      |
| Multi-asset comparison          | Normalized line (base 100)  | Plotly            | Equalizes starting point           |
| Return by period?               | Violin / Box plot           | Plotly            | Group by year or month             |
| Signal readings?                | Gauge / Bullet chart        | Plotly            | For dashboard KPIs                 |

---

## Color Conventions

### Standard Finance Colors

```
Green  (#00C853): Positive / Bullish / Gains
Red    (#FF1744): Negative / Bearish / Losses
Blue   (#2196F3): Neutral / Benchmark / Information
Orange (#FF9100): Warning / Elevated risk
Yellow (#FFD600): Caution / Highlight
Cyan   (#00E5FF): Primary indicator
Magenta(#E040FB): Secondary indicator
White  (#FFFFFF): Reference lines / Labels
Gray   (#757575): Grid / Background elements
```

### Colorscales for Heatmaps

- **Correlation**: `RdBu_r` (red = negative, blue = positive, centered at 0)
- **Returns**: `RdYlGn` (red = negative, green = positive, centered at 0)
- **Volatility**: `Viridis` or `Hot` (low = blue, high = yellow/red)
- **Volume**: `Blues` (higher = darker)

---

## Plotly Dark Theme Template

All financial charts should use `template="plotly_dark"` for:

- Professional appearance
- Reduced eye strain
- Better contrast for colored indicators
- Standard in trading terminals (Bloomberg, ThinkOrSwim)

### Recommended Layout Settings

```python
fig.update_layout(
    template="plotly_dark",
    height=600,  # Adjust per chart type
    margin=dict(l=50, r=20, t=40, b=30),
    font=dict(family="Courier New, monospace", size=12),
    xaxis_rangeslider_visible=False,  # For candlestick charts
    legend=dict(
        orientation="h",
        yanchor="bottom", y=1.02,
        xanchor="right", x=1,
    ),
)
```

---

## Dashboard Layout Best Practices

### Single-Asset Analysis Dashboard

```
┌─────────────────────────────────────────────┐
│  KPIs: Price | Change | RSI | Vol | Regime  │  <- Metrics row
├─────────────────────────────────────────────┤
│                                             │
│         Candlestick + BB + SMA              │  <- Main chart (45%)
│                                             │
├─────────────────────────────────────────────┤
│              Volume Bars                    │  <- Volume (15%)
├─────────────────────────────────────────────┤
│               RSI (14)                      │  <- Indicator 1 (20%)
├─────────────────────────────────────────────┤
│                MACD                         │  <- Indicator 2 (20%)
└─────────────────────────────────────────────┘
```

### Multi-Asset Analysis Dashboard

```
┌──────────────────────┬──────────────────────┐
│                      │   Correlation        │
│   Normalized Price   │   Heatmap            │
│   Comparison         │                      │
├──────────────────────┼──────────────────────┤
│                      │   Return             │
│   Rolling            │   Distribution       │
│   Correlation        │   (Violin)           │
├──────────────────────┴──────────────────────┤
│            Regime Timeline                  │
└─────────────────────────────────────────────┘
```

---

## Data Storytelling for Finance

### Structure: Situation → Complication → Resolution

**Example**: "SPY has been in a low-volatility regime for the past 3 months (situation). However, the VIX term structure has inverted and credit spreads are widening (complication). Historical analysis shows that this combination preceded 7 of the last 10 corrections, suggesting a risk-off regime shift is likely (resolution/insight)."

### Annotation Best Practices

1. **Highlight key events**: Use `fig.add_annotation()` for crashes, regime changes, signal triggers
2. **Reference lines**: Add horizontal lines for important levels (SMA, support/resistance, threshold values)
3. **Context numbers**: "VIX is 25 (80th percentile over 5 years)" is better than just "VIX is 25"
4. **Percentile framing**: Express current values as percentiles of historical distribution
5. **Time context**: "Last time this happened was March 2020" gives powerful context

### The "So What?" Test

Every chart must answer: "So what should I DO with this information?"

- Bad: "Here is a correlation matrix"
- Good: "Correlations between equities have risen to 0.85 — above the 95th percentile — suggesting that diversification within equities is currently ineffective. Consider adding non-equity exposures."

---

## Streamlit Dashboard Tips

### Performance

- Cache data fetching with `@st.cache_data`
- Use `@st.cache_resource` for model objects
- Limit date range for heavy computations
- Use Plotly for interactive charts (better than Matplotlib in Streamlit)

### Layout

- Use `st.columns()` for side-by-side metrics
- Use `st.expander()` for secondary information
- Use `st.tabs()` for different analysis views
- Use `st.sidebar` for input controls

### Interactivity

- `st.selectbox` for ticker selection
- `st.slider` for date ranges and parameters
- `st.button` for triggering analysis
- `st.download_button` for exporting results

---

## Common Visualization Mistakes

1. **Too many lines on one chart**: Maximum 5-7 series. Use subplots for more.
2. **Wrong y-axis scale**: Don't compare $500 stock with $50 stock — normalize first.
3. **Missing context**: A number without historical comparison is meaningless.
4. **Rainbow colors**: Use a consistent, limited color palette. Don't use random colors.
5. **3D charts for 2D data**: Only use 3D for genuinely 3D data (volatility surfaces).
6. **Logarithmic scale without labeling**: Always indicate when using log scale.
7. **Truncated y-axis**: Don't start at non-zero unless clearly labeled — it exaggerates moves.
8. **No date labels on time series**: Always show time axis clearly.
