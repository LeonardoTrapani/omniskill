#!/usr/bin/env python3
"""
Generate a 3D implied volatility surface from options chain data.

Usage:
    python vol_surface.py --ticker SPY
    python vol_surface.py --ticker AAPL --output vol_surface.html
"""

import argparse
import warnings

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf

warnings.filterwarnings("ignore")


def fetch_options_chain(ticker: str) -> pd.DataFrame:
    """Fetch full options chain and extract IV data."""
    tk = yf.Ticker(ticker)
    expirations = tk.options

    if not expirations:
        raise ValueError(f"No options data available for {ticker}")

    all_options = []
    spot = tk.info.get("regularMarketPrice") or tk.info.get("previousClose", 100)

    for exp in expirations[:8]:  # Limit to 8 nearest expirations
        try:
            chain = tk.option_chain(exp)
            for opt_type, df in [("call", chain.calls), ("put", chain.puts)]:
                if df.empty:
                    continue
                df = df.copy()
                df["expiration"] = exp
                df["type"] = opt_type
                df["spot"] = spot
                df["moneyness"] = df["strike"] / spot
                all_options.append(df[["strike", "expiration", "type", "impliedVolatility", "spot", "moneyness", "volume", "openInterest"]])
        except Exception:
            continue

    if not all_options:
        raise ValueError(f"Could not fetch options data for {ticker}")

    combined = pd.concat(all_options, ignore_index=True)
    combined["expiration"] = pd.to_datetime(combined["expiration"])
    combined["dte"] = (combined["expiration"] - pd.Timestamp.now()).dt.days
    combined = combined[combined["impliedVolatility"] > 0.01]
    combined = combined[(combined["moneyness"] > 0.7) & (combined["moneyness"] < 1.3)]
    return combined


def plot_vol_surface(options_df: pd.DataFrame, ticker: str) -> go.Figure:
    """Create 3D volatility surface plot."""
    # Use calls for the surface
    calls = options_df[options_df["type"] == "call"].copy()

    # Create pivot table: moneyness x DTE -> IV
    calls["moneyness_bucket"] = (calls["moneyness"] * 20).round() / 20
    calls["dte_bucket"] = calls["dte"]

    pivot = calls.pivot_table(
        values="impliedVolatility", index="moneyness_bucket", columns="dte_bucket", aggfunc="mean",
    ).dropna(how="all").dropna(axis=1, how="all")

    # Interpolate missing values
    pivot = pivot.interpolate(method="linear", axis=0).interpolate(method="linear", axis=1)

    fig = go.Figure(data=[go.Surface(
        x=pivot.columns.values,  # DTE
        y=pivot.index.values,  # Moneyness
        z=pivot.values * 100,  # IV in percent
        colorscale="Viridis",
        colorbar=dict(title="IV %"),
    )])

    fig.update_layout(
        title=f"{ticker} — Implied Volatility Surface",
        scene=dict(
            xaxis_title="Days to Expiration",
            yaxis_title="Moneyness (Strike/Spot)",
            zaxis_title="Implied Volatility (%)",
        ),
        template="plotly_dark",
        height=700,
    )
    return fig


def plot_vol_smile(options_df: pd.DataFrame, ticker: str) -> go.Figure:
    """Plot volatility smile for each expiration."""
    fig = go.Figure()
    colors = ["cyan", "orange", "lime", "magenta", "yellow", "red", "white", "pink"]
    calls = options_df[options_df["type"] == "call"]

    for i, (exp, group) in enumerate(calls.groupby("expiration")):
        group = group.sort_values("moneyness")
        dte = group["dte"].iloc[0]
        fig.add_trace(go.Scatter(
            x=group["moneyness"], y=group["impliedVolatility"] * 100,
            mode="lines+markers", name=f"{dte}d",
            line=dict(color=colors[i % len(colors)], width=2),
            marker=dict(size=4),
        ))

    fig.add_vline(x=1.0, line_dash="dash", line_color="gray")
    fig.update_layout(
        title=f"{ticker} — Volatility Smile by Expiration",
        xaxis_title="Moneyness (Strike / Spot)",
        yaxis_title="Implied Volatility (%)",
        template="plotly_dark", height=500,
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Volatility surface generator")
    parser.add_argument("--ticker", default="SPY", help="Ticker symbol")
    parser.add_argument("--output", default="vol_surface.html", help="Output HTML")
    args = parser.parse_args()

    print(f"Fetching options chain for {args.ticker}...")
    options_df = fetch_options_chain(args.ticker)
    print(f"  Found {len(options_df)} option contracts across {options_df['expiration'].nunique()} expirations")

    print("Generating volatility surface...")
    fig_surface = plot_vol_surface(options_df, args.ticker)
    fig_surface.write_html(args.output)
    print(f"  3D surface saved to {args.output}")

    smile_output = args.output.replace(".html", "_smile.html")
    fig_smile = plot_vol_smile(options_df, args.ticker)
    fig_smile.write_html(smile_output)
    print(f"  Volatility smile saved to {smile_output}")

    # Print summary
    print(f"\n=== VOL SURFACE SUMMARY for {args.ticker} ===")
    atm = options_df[(options_df["moneyness"] > 0.97) & (options_df["moneyness"] < 1.03) & (options_df["type"] == "call")]
    if not atm.empty:
        for dte, group in atm.groupby("dte"):
            iv = group["impliedVolatility"].mean() * 100
            print(f"  ATM IV @ {dte:3d} DTE: {iv:.1f}%")

    puts = options_df[(options_df["type"] == "put") & (options_df["moneyness"] > 0.85) & (options_df["moneyness"] < 0.95)]
    calls = options_df[(options_df["type"] == "call") & (options_df["moneyness"] > 1.05) & (options_df["moneyness"] < 1.15)]
    if not puts.empty and not calls.empty:
        skew = puts["impliedVolatility"].mean() - calls["impliedVolatility"].mean()
        print(f"  Skew (OTM Put IV - OTM Call IV): {skew * 100:.1f}% pts")
        print(f"  Interpretation: {'Negative skew (downside protection demand)' if skew > 0 else 'Positive skew (upside demand)'}")


if __name__ == "__main__":
    main()
