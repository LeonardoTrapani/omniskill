#!/usr/bin/env python3
"""
Compute and visualize correlation matrices, including regime-conditional correlations.

Usage:
    python correlation_matrix.py --tickers SPY,QQQ,TLT,GLD,USO,HYG --period 10y
"""

import argparse

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import yfinance as yf
from plotly.subplots import make_subplots


def fetch_multi_asset(tickers: list[str], period: str = "10y") -> pd.DataFrame:
    """Fetch close prices for multiple assets."""
    frames = {}
    for ticker in tickers:
        df = yf.download(ticker, period=period, progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        if not df.empty:
            frames[ticker] = df["Close"]
    return pd.DataFrame(frames).dropna()


def compute_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute log returns for all assets."""
    return np.log(prices / prices.shift(1)).dropna()


def classify_regimes(returns: pd.DataFrame, market_col: str = None) -> pd.Series:
    """Classify market regimes based on rolling volatility of the market proxy."""
    if market_col is None:
        market_col = returns.columns[0]
    market_ret = returns[market_col]
    rolling_vol = market_ret.rolling(20).std() * np.sqrt(252) * 100

    conditions = [
        rolling_vol < 12,
        (rolling_vol >= 12) & (rolling_vol < 22),
        rolling_vol >= 22,
    ]
    labels = ["Low Vol", "Normal", "High Vol"]
    return pd.Series(np.select(conditions, labels, default="Unknown"), index=returns.index)


def plot_correlation_heatmap(corr: pd.DataFrame, title: str) -> go.Figure:
    """Create a correlation heatmap."""
    # Mask upper triangle for cleaner look
    mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
    corr_masked = corr.copy()
    corr_masked.values[mask] = np.nan

    text = [[f"{val:.2f}" if not np.isnan(val) else "" for val in row] for row in corr_masked.values]

    fig = go.Figure(data=go.Heatmap(
        z=corr_masked.values,
        x=corr.columns.tolist(),
        y=corr.index.tolist(),
        text=text,
        texttemplate="%{text}",
        colorscale="RdBu_r",
        zmid=0, zmin=-1, zmax=1,
        colorbar=dict(title="Correlation"),
    ))
    fig.update_layout(
        title=title, template="plotly_dark",
        height=500, width=600,
        yaxis=dict(autorange="reversed"),
    )
    return fig


def plot_rolling_correlation(returns: pd.DataFrame, base: str, target: str, window: int = 60) -> go.Figure:
    """Plot rolling correlation between two assets."""
    rolling_corr = returns[base].rolling(window).corr(returns[target])

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=rolling_corr.index, y=rolling_corr.values,
        line=dict(color="cyan", width=1.5), name=f"{base} vs {target}",
    ))
    fig.add_hline(y=0, line_dash="dash", line_color="gray")
    fig.add_hline(y=rolling_corr.mean(), line_dash="dot", line_color="yellow")

    fig.update_layout(
        title=f"Rolling {window}d Correlation: {base} vs {target}",
        yaxis_title="Correlation", template="plotly_dark", height=400,
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Correlation and regime analysis")
    parser.add_argument("--tickers", default="SPY,QQQ,TLT,GLD,USO,HYG", help="Comma-separated tickers")
    parser.add_argument("--period", default="10y", help="Data period")
    parser.add_argument("--output", default="correlation_analysis.html", help="Output HTML")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    print(f"Fetching data for {tickers}...")
    prices = fetch_multi_asset(tickers, args.period)
    returns = compute_returns(prices)
    print(f"  {len(returns)} trading days, {len(tickers)} assets")

    # Full-sample correlation
    full_corr = returns.corr()
    print(f"\n=== FULL-SAMPLE CORRELATION MATRIX ===")
    print(full_corr.to_string(float_format="%.2f"))

    # Regime detection
    regimes = classify_regimes(returns, tickers[0])

    # Conditional correlations
    print(f"\n=== REGIME-CONDITIONAL CORRELATIONS ===")
    regime_corrs = {}
    for regime in ["Low Vol", "Normal", "High Vol"]:
        mask = regimes == regime
        if mask.sum() > 30:
            regime_returns = returns[mask]
            regime_corrs[regime] = regime_returns.corr()
            count = mask.sum()
            print(f"\n--- {regime} ({count} days, {count/len(returns)*100:.0f}% of sample) ---")
            print(regime_corrs[regime].to_string(float_format="%.2f"))

    # Build combined HTML output
    import plotly.io as pio

    html_parts = ["<html><head><title>Correlation Analysis</title></head><body style='background:#111;color:#eee;font-family:monospace;padding:20px;'>"]
    html_parts.append(f"<h1>Cross-Asset Correlation Analysis</h1>")
    html_parts.append(f"<p>Assets: {', '.join(tickers)} | Period: {args.period} | Days: {len(returns)}</p>")

    # Full correlation heatmap
    fig_full = plot_correlation_heatmap(full_corr, "Full Sample Correlation")
    html_parts.append(pio.to_html(fig_full, full_html=False))

    # Conditional heatmaps
    for regime, corr in regime_corrs.items():
        fig = plot_correlation_heatmap(corr, f"Correlation in {regime} Regime")
        html_parts.append(pio.to_html(fig, full_html=False))

    # Rolling correlations for key pairs
    if len(tickers) >= 2:
        fig_roll = plot_rolling_correlation(returns, tickers[0], tickers[1])
        html_parts.append(pio.to_html(fig_roll, full_html=False))

    # Stock-bond correlation if TLT present
    if "TLT" in tickers and tickers[0] != "TLT":
        fig_sb = plot_rolling_correlation(returns, tickers[0], "TLT")
        html_parts.append(pio.to_html(fig_sb, full_html=False))

    html_parts.append("</body></html>")

    with open(args.output, "w") as f:
        f.write("\n".join(html_parts))
    print(f"\nFull analysis saved to {args.output}")

    # Key insight
    if "TLT" in tickers and tickers[0] != "TLT":
        stock_bond_low = regime_corrs.get("Low Vol", pd.DataFrame()).loc[tickers[0], "TLT"] if "Low Vol" in regime_corrs else None
        stock_bond_high = regime_corrs.get("High Vol", pd.DataFrame()).loc[tickers[0], "TLT"] if "High Vol" in regime_corrs else None
        if stock_bond_low is not None and stock_bond_high is not None:
            print(f"\n=== KEY INSIGHT ===")
            print(f"  {tickers[0]}-TLT correlation in Low Vol:  {stock_bond_low:.2f}")
            print(f"  {tickers[0]}-TLT correlation in High Vol: {stock_bond_high:.2f}")
            print(f"  Change: {stock_bond_high - stock_bond_low:+.2f}")
            if stock_bond_high > stock_bond_low:
                print(f"  Interpretation: Stock-bond correlation INCREASES in crisis — diversification benefit erodes when needed most")
            else:
                print(f"  Interpretation: Stock-bond correlation DECREASES in crisis — bonds provide flight-to-quality hedge")


if __name__ == "__main__":
    main()
