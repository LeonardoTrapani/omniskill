#!/usr/bin/env python3
"""
Analyze signal decay: rolling Sharpe, autocorrelation decay, half-life estimation, breakpoint detection.

Usage:
    python decay_analyzer.py --signal-csv signal_returns.csv --window 252
    python decay_analyzer.py --ticker SPY --signal momentum --period 10y
"""

import argparse
import os

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy import stats


def generate_momentum_signal(ticker: str, period: str = "10y", lookback: int = 252) -> pd.Series:
    """Generate a simple momentum signal for demonstration."""
    import yfinance as yf
    data = yf.download(ticker, period=period, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
    close = data["Close"]
    returns = np.log(close / close.shift(1)).dropna()
    # Momentum signal: go long if past 12m return > 0, else flat
    signal = (close / close.shift(lookback) - 1).apply(lambda x: 1 if x > 0 else 0)
    strategy_returns = signal.shift(1) * returns  # Shift to avoid look-ahead
    return strategy_returns.dropna()


def rolling_sharpe(returns: pd.Series, window: int = 252) -> pd.Series:
    """Compute rolling annualized Sharpe ratio."""
    rolling_mean = returns.rolling(window).mean() * 252
    rolling_std = returns.rolling(window).std() * np.sqrt(252)
    return (rolling_mean / rolling_std).dropna()


def autocorrelation_decay(returns: pd.Series, max_lag: int = 20, window: int = 504) -> pd.DataFrame:
    """Compute rolling autocorrelation at lag 1 over time."""
    rolling_acf = returns.rolling(window).apply(lambda x: x.autocorr(lag=1), raw=False)
    return rolling_acf.dropna()


def estimate_half_life(series: pd.Series) -> float:
    """Estimate mean-reversion half-life using OLS on OU process."""
    lagged = series.shift(1).dropna()
    delta = series.diff().dropna()
    # Align
    common_idx = lagged.index.intersection(delta.index)
    lagged = lagged.loc[common_idx]
    delta = delta.loc[common_idx]

    if len(lagged) < 30:
        return float("nan")

    slope, intercept, r, p, se = stats.linregress(lagged.values, delta.values)
    if slope >= 0:
        return float("inf")  # No mean reversion
    half_life = -np.log(2) / slope
    return half_life


def detect_breakpoints(returns: pd.Series, window: int = 252, threshold: float = 2.0) -> list:
    """Simple CUSUM-based breakpoint detection."""
    cumsum = returns.cumsum()
    rolling_mean = cumsum.rolling(window).mean()
    rolling_std = cumsum.rolling(window).std()
    z_scores = ((cumsum - rolling_mean) / rolling_std).dropna()
    breakpoints = z_scores[z_scores.abs() > threshold].index.tolist()
    # Cluster nearby breakpoints
    if not breakpoints:
        return []
    clustered = [breakpoints[0]]
    for bp in breakpoints[1:]:
        if (bp - clustered[-1]).days > 60:
            clustered.append(bp)
    return clustered


def plot_decay_analysis(returns: pd.Series, window: int, name: str) -> go.Figure:
    """Create comprehensive signal decay analysis chart."""
    fig = make_subplots(
        rows=4, cols=1, shared_xaxes=True,
        subplot_titles=[
            "Cumulative Strategy Returns",
            f"Rolling {window}d Sharpe Ratio",
            f"Rolling {window * 2}d Autocorrelation (Lag-1)",
            "Drawdown",
        ],
        vertical_spacing=0.05, row_heights=[0.3, 0.25, 0.25, 0.2],
    )

    # Cumulative returns
    cum_returns = returns.cumsum()
    fig.add_trace(go.Scatter(
        x=cum_returns.index, y=cum_returns.values,
        line=dict(color="cyan", width=1.5), name="Cumulative Return",
    ), row=1, col=1)

    # Breakpoints
    bps = detect_breakpoints(returns, window)
    for bp in bps:
        fig.add_vline(x=bp, line_dash="dash", line_color="red", opacity=0.5)

    # Rolling Sharpe
    rs = rolling_sharpe(returns, window)
    fig.add_trace(go.Scatter(
        x=rs.index, y=rs.values,
        line=dict(color="orange", width=1.5), name="Rolling Sharpe",
    ), row=2, col=1)
    fig.add_hline(y=0, line_dash="dash", line_color="gray", row=2, col=1)
    fig.add_hline(y=1, line_dash="dot", line_color="green", row=2, col=1)

    # Trend line on Sharpe
    if len(rs.dropna()) > 100:
        x_num = np.arange(len(rs.dropna()))
        slope, intercept, _, _, _ = stats.linregress(x_num, rs.dropna().values)
        trend = intercept + slope * x_num
        fig.add_trace(go.Scatter(
            x=rs.dropna().index, y=trend,
            line=dict(color="red", width=2, dash="dot"), name=f"Sharpe Trend (slope={slope * 252:.4f}/yr)",
        ), row=2, col=1)

    # Rolling autocorrelation
    racf = autocorrelation_decay(returns, window=window * 2)
    fig.add_trace(go.Scatter(
        x=racf.index, y=racf.values,
        line=dict(color="lime", width=1.5), name="Rolling ACF(1)",
    ), row=3, col=1)
    fig.add_hline(y=0, line_dash="dash", line_color="gray", row=3, col=1)

    # Drawdown
    cum = (1 + returns).cumprod()
    running_max = cum.cummax()
    drawdown = (cum / running_max - 1) * 100
    fig.add_trace(go.Scatter(
        x=drawdown.index, y=drawdown.values,
        fill="tozeroy", fillcolor="rgba(255,0,0,0.2)",
        line=dict(color="red", width=1), name="Drawdown %",
    ), row=4, col=1)

    fig.update_layout(
        title=f"Signal Decay Analysis — {name}",
        template="plotly_dark", height=1000, showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Signal decay analyzer")
    parser.add_argument("--signal-csv", default=None, help="CSV with signal returns (Date, Return columns)")
    parser.add_argument("--ticker", default="SPY", help="Ticker for demo signal")
    parser.add_argument("--signal", default="momentum", help="Signal type for demo")
    parser.add_argument("--period", default="10y", help="Data period")
    parser.add_argument("--window", type=int, default=252, help="Rolling window size")
    parser.add_argument("--output", default="decay_analysis.html", help="Output HTML")
    args = parser.parse_args()

    if args.signal_csv:
        print(f"Loading signal returns from {args.signal_csv}...")
        df = pd.read_csv(args.signal_csv, index_col=0, parse_dates=True)
        returns = df.iloc[:, 0]
        name = args.signal_csv
    else:
        print(f"Generating {args.signal} signal for {args.ticker} ({args.period})...")
        returns = generate_momentum_signal(args.ticker, args.period)
        name = f"{args.ticker} {args.signal}"

    # Summary
    print(f"\n=== SIGNAL DECAY ANALYSIS: {name} ===")
    total_sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0
    print(f"  Full-sample Sharpe:    {total_sharpe:.3f}")
    print(f"  Annualized Return:     {returns.mean() * 252 * 100:.1f}%")
    print(f"  Annualized Vol:        {returns.std() * np.sqrt(252) * 100:.1f}%")

    # First half vs second half
    mid = len(returns) // 2
    first_half = returns.iloc[:mid]
    second_half = returns.iloc[mid:]
    sharpe_1 = (first_half.mean() / first_half.std()) * np.sqrt(252) if first_half.std() > 0 else 0
    sharpe_2 = (second_half.mean() / second_half.std()) * np.sqrt(252) if second_half.std() > 0 else 0
    print(f"\n  First-half Sharpe:     {sharpe_1:.3f}")
    print(f"  Second-half Sharpe:    {sharpe_2:.3f}")
    print(f"  Sharpe Change:         {sharpe_2 - sharpe_1:+.3f}")
    if sharpe_2 < sharpe_1 * 0.5:
        print(f"  WARNING: Signal shows significant decay (Sharpe dropped >50%)")
    elif sharpe_2 < sharpe_1:
        print(f"  NOTICE: Signal shows moderate decay")
    else:
        print(f"  OK: Signal appears stable or improving")

    # Half-life
    cum_returns = returns.cumsum()
    hl = estimate_half_life(cum_returns)
    print(f"\n  Estimated Half-Life:   {hl:.1f} days")
    if hl < 5:
        print(f"  Interpretation: Very fast mean-reversion (HFT territory)")
    elif hl < 60:
        print(f"  Interpretation: Short-term mean-reversion")
    elif hl < 252:
        print(f"  Interpretation: Medium-term signal")
    else:
        print(f"  Interpretation: Long-term trend / very slow mean-reversion")

    # Breakpoints
    bps = detect_breakpoints(returns, args.window)
    print(f"\n  Breakpoints Detected:  {len(bps)}")
    for bp in bps:
        print(f"    - {bp.strftime('%Y-%m-%d')}")

    # Max drawdown
    cum = (1 + returns).cumprod()
    max_dd = (cum / cum.cummax() - 1).min() * 100
    print(f"\n  Max Drawdown:          {max_dd:.1f}%")

    fig = plot_decay_analysis(returns, args.window, name)
    fig.write_html(args.output)
    print(f"\nChart saved to {args.output}")


if __name__ == "__main__":
    main()
