#!/usr/bin/env python3
"""
Volatility analysis: realized vs implied, VIX comparison, risk premium.

Usage:
    python vol_analysis.py --ticker SPY --period 5y
"""

import argparse
import os

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from plotly.subplots import make_subplots


def compute_realized_vol(prices: pd.Series, windows: list[int] = [20, 60, 252]) -> pd.DataFrame:
    """Compute rolling realized volatility at multiple windows."""
    returns = np.log(prices / prices.shift(1)).dropna()
    vol_df = pd.DataFrame(index=returns.index)
    for w in windows:
        vol_df[f"RV_{w}d"] = returns.rolling(w).std() * np.sqrt(252) * 100
    return vol_df


def fetch_vix() -> pd.Series:
    """Fetch VIX index as proxy for implied volatility."""
    vix = yf.download("^VIX", period="max", progress=False)
    if isinstance(vix.columns, pd.MultiIndex):
        vix.columns = vix.columns.get_level_values(0)
    return vix["Close"]


def compute_vol_risk_premium(rv_20: pd.Series, vix: pd.Series) -> pd.Series:
    """Compute volatility risk premium = VIX - RV."""
    aligned = pd.DataFrame({"VIX": vix, "RV_20d": rv_20}).dropna()
    return aligned["VIX"] - aligned["RV_20d"]


def plot_vol_analysis(prices: pd.Series, vol_df: pd.DataFrame, vix: pd.Series, ticker: str) -> go.Figure:
    """Create comprehensive volatility analysis chart."""
    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        subplot_titles=[f"{ticker} Price", "Realized Vol vs VIX (Implied Vol)", "Volatility Risk Premium (VIX - RV20)"],
        row_heights=[0.3, 0.35, 0.35], vertical_spacing=0.05,
    )

    # Price
    fig.add_trace(go.Scatter(
        x=prices.index, y=prices.values, line=dict(color="white", width=1), name="Price",
    ), row=1, col=1)

    # Realized vol windows
    colors = {"RV_20d": "cyan", "RV_60d": "orange", "RV_252d": "magenta"}
    for col in vol_df.columns:
        fig.add_trace(go.Scatter(
            x=vol_df.index, y=vol_df[col], line=dict(color=colors.get(col, "gray"), width=1.2), name=col,
        ), row=2, col=1)

    # VIX overlay
    vix_aligned = vix.reindex(vol_df.index).dropna()
    fig.add_trace(go.Scatter(
        x=vix_aligned.index, y=vix_aligned.values,
        line=dict(color="yellow", width=1.5, dash="dash"), name="VIX (IV proxy)",
    ), row=2, col=1)

    # Volatility Risk Premium
    vrp = compute_vol_risk_premium(vol_df["RV_20d"], vix)
    fig.add_trace(go.Scatter(
        x=vrp.index, y=vrp.values, line=dict(color="lime", width=1), name="VRP",
    ), row=3, col=1)
    fig.add_hline(y=0, line_dash="dash", line_color="gray", row=3, col=1)
    fig.add_hline(y=vrp.mean(), line_dash="dot", line_color="yellow", row=3, col=1)

    # Color zones for VRP
    fig.add_hrect(y0=0, y1=vrp.max(), fillcolor="green", opacity=0.05, row=3, col=1)
    fig.add_hrect(y0=vrp.min(), y1=0, fillcolor="red", opacity=0.05, row=3, col=1)

    fig.update_layout(
        title=f"{ticker} — Volatility Analysis",
        template="plotly_dark", height=900, showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Volatility analysis")
    parser.add_argument("--ticker", default="SPY", help="Ticker symbol")
    parser.add_argument("--period", default="5y", help="Data period")
    parser.add_argument("--output", default="vol_analysis.html", help="Output HTML")
    args = parser.parse_args()

    print(f"Fetching {args.ticker} data...")
    data = yf.download(args.ticker, period=args.period, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
    prices = data["Close"]

    print("Computing realized volatility...")
    vol_df = compute_realized_vol(prices)

    print("Fetching VIX data...")
    vix = fetch_vix()

    # Summary stats
    print(f"\n=== VOLATILITY SUMMARY for {args.ticker} ===")
    for col in vol_df.columns:
        latest = vol_df[col].dropna().iloc[-1]
        mean = vol_df[col].mean()
        pctile = (vol_df[col] < latest).mean() * 100
        print(f"  {col}: Current={latest:.1f}%  Mean={mean:.1f}%  Percentile={pctile:.0f}th")

    vix_latest = vix.iloc[-1]
    rv20_latest = vol_df["RV_20d"].dropna().iloc[-1]
    vrp = vix_latest - rv20_latest
    print(f"\n  VIX (current):        {vix_latest:.1f}")
    print(f"  RV 20d (current):     {rv20_latest:.1f}")
    print(f"  Vol Risk Premium:     {vrp:.1f} pts")
    print(f"  VRP Interpretation:   {'IV > RV (normal, premium exists)' if vrp > 0 else 'RV > IV (unusual, market underpricing risk)'}")

    fig = plot_vol_analysis(prices, vol_df, vix, args.ticker)
    fig.write_html(args.output)
    print(f"\nChart saved to {args.output}")


if __name__ == "__main__":
    main()
