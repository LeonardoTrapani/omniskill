#!/usr/bin/env python3
"""
Gallery of Plotly chart types for financial data visualization.

Usage:
    python plotly_gallery.py --ticker SPY --output charts/
"""

import argparse
import os

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import yfinance as yf
from plotly.subplots import make_subplots


def fetch_data(ticker: str, period: str = "2y") -> pd.DataFrame:
    df = yf.download(ticker, period=period, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df["Returns"] = np.log(df["Close"] / df["Close"].shift(1))
    return df.dropna()


def chart_candlestick(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Professional candlestick chart with volume."""
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_heights=[0.75, 0.25], vertical_spacing=0.02)
    fig.add_trace(go.Candlestick(x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"], name="OHLC"), row=1, col=1)
    colors = ["green" if c >= o else "red" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], marker_color=colors, opacity=0.5, name="Volume"), row=2, col=1)
    fig.update_layout(title=f"{ticker} — Candlestick with Volume", template="plotly_dark", height=600, xaxis_rangeslider_visible=False)
    return fig


def chart_heatmap_monthly_returns(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Monthly returns heatmap (calendar-style)."""
    monthly = df["Returns"].resample("ME").sum() * 100
    pivot = pd.DataFrame({"year": monthly.index.year, "month": monthly.index.month, "return": monthly.values})
    pivot = pivot.pivot_table(index="year", columns="month", values="return", aggfunc="first")
    pivot.columns = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    fig = go.Figure(data=go.Heatmap(
        z=pivot.values, x=pivot.columns.tolist(), y=pivot.index.astype(str).tolist(),
        text=[[f"{v:.1f}%" if not np.isnan(v) else "" for v in row] for row in pivot.values],
        texttemplate="%{text}", colorscale="RdYlGn", zmid=0,
        colorbar=dict(title="Return %"),
    ))
    fig.update_layout(title=f"{ticker} — Monthly Returns Heatmap", template="plotly_dark", height=400, yaxis=dict(autorange="reversed"))
    return fig


def chart_drawdown(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Underwater / drawdown chart."""
    cum = (1 + df["Returns"]).cumprod()
    dd = (cum / cum.cummax() - 1) * 100

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dd.index, y=dd.values, fill="tozeroy",
        fillcolor="rgba(255,0,0,0.3)", line=dict(color="red", width=1), name="Drawdown",
    ))
    fig.update_layout(title=f"{ticker} — Drawdown Chart", yaxis_title="Drawdown %", template="plotly_dark", height=400)
    return fig


def chart_rolling_volatility(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Rolling volatility at multiple windows."""
    fig = go.Figure()
    for window, color in [(20, "cyan"), (60, "orange"), (252, "magenta")]:
        rv = df["Returns"].rolling(window).std() * np.sqrt(252) * 100
        fig.add_trace(go.Scatter(x=rv.index, y=rv.values, line=dict(color=color, width=1.5), name=f"RV {window}d"))
    fig.update_layout(title=f"{ticker} — Rolling Annualized Volatility", yaxis_title="Volatility %", template="plotly_dark", height=400)
    return fig


def chart_return_scatter(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Return vs volume scatter with date coloring."""
    fig = px.scatter(
        df.reset_index(), x="Returns", y="Volume",
        color=df.index.year.astype(str).tolist() if hasattr(df.index, 'year') else None,
        opacity=0.5, title=f"{ticker} — Return vs Volume Scatter",
        template="plotly_dark",
    )
    fig.update_layout(height=500)
    return fig


def chart_normalized_comparison(tickers: list[str], period: str = "2y") -> go.Figure:
    """Normalized price comparison (base 100)."""
    fig = go.Figure()
    colors = ["cyan", "orange", "lime", "magenta", "yellow", "red", "white"]
    for i, ticker in enumerate(tickers):
        data = yf.download(ticker, period=period, progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        if not data.empty:
            normalized = data["Close"] / data["Close"].iloc[0] * 100
            fig.add_trace(go.Scatter(
                x=normalized.index, y=normalized.values,
                line=dict(color=colors[i % len(colors)], width=2), name=ticker,
            ))
    fig.add_hline(y=100, line_dash="dash", line_color="gray")
    fig.update_layout(title="Normalized Price Comparison (Base 100)", yaxis_title="Indexed Value", template="plotly_dark", height=500)
    return fig


def chart_distribution_violin(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Return distribution by year (violin plot)."""
    df_plot = df.copy()
    df_plot["Year"] = df_plot.index.year.astype(str)
    fig = go.Figure()
    for year in sorted(df_plot["Year"].unique()):
        year_data = df_plot[df_plot["Year"] == year]["Returns"] * 100
        fig.add_trace(go.Violin(y=year_data, name=year, box_visible=True, meanline_visible=True))
    fig.update_layout(title=f"{ticker} — Return Distribution by Year", yaxis_title="Daily Return %", template="plotly_dark", height=500)
    return fig


def main():
    parser = argparse.ArgumentParser(description="Plotly chart gallery for financial data")
    parser.add_argument("--ticker", default="SPY", help="Primary ticker")
    parser.add_argument("--compare", default="SPY,QQQ,TLT,GLD", help="Tickers for comparison chart")
    parser.add_argument("--period", default="2y", help="Data period")
    parser.add_argument("--output", default="charts", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    print(f"Fetching {args.ticker} data...")
    df = fetch_data(args.ticker, args.period)

    charts = {
        "candlestick.html": chart_candlestick(df, args.ticker),
        "monthly_returns.html": chart_heatmap_monthly_returns(df, args.ticker),
        "drawdown.html": chart_drawdown(df, args.ticker),
        "rolling_volatility.html": chart_rolling_volatility(df, args.ticker),
        "return_scatter.html": chart_return_scatter(df, args.ticker),
        "distribution_violin.html": chart_distribution_violin(df, args.ticker),
    }

    compare_tickers = [t.strip().upper() for t in args.compare.split(",")]
    charts["normalized_comparison.html"] = chart_normalized_comparison(compare_tickers, args.period)

    for name, fig in charts.items():
        path = os.path.join(args.output, name)
        fig.write_html(path)
        print(f"  Saved {path}")

    print(f"\nGenerated {len(charts)} charts in {args.output}/")


if __name__ == "__main__":
    main()
