#!/usr/bin/env python3
"""
Exploratory Data Analysis for financial data.

Usage:
    python eda.py --input data.csv --ticker SPY
    python eda.py --ticker SPY --period 5y
"""

import argparse
import sys

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy import stats


def load_data(input_file: str | None, ticker: str, period: str = "5y") -> pd.Series:
    """Load price data from CSV or fetch directly."""
    if input_file:
        df = pd.read_csv(input_file, index_col="Date", parse_dates=True)
        if "Ticker" in df.columns:
            df = df[df["Ticker"] == ticker]
        return df["Close"]
    else:
        import yfinance as yf
        data = yf.download(ticker, period=period, progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        return data["Close"]


def compute_returns(prices: pd.Series) -> pd.Series:
    """Compute log returns."""
    return np.log(prices / prices.shift(1)).dropna()


def summary_statistics(returns: pd.Series) -> dict:
    """Compute summary statistics for returns."""
    ann_factor = 252
    return {
        "count": len(returns),
        "mean_daily": returns.mean(),
        "std_daily": returns.std(),
        "annualized_return": returns.mean() * ann_factor,
        "annualized_volatility": returns.std() * np.sqrt(ann_factor),
        "sharpe_ratio": (returns.mean() / returns.std()) * np.sqrt(ann_factor) if returns.std() > 0 else 0,
        "skewness": returns.skew(),
        "kurtosis": returns.kurtosis(),
        "min": returns.min(),
        "max": returns.max(),
        "pct_positive": (returns > 0).mean(),
        "worst_5pct": returns.quantile(0.05),
        "best_5pct": returns.quantile(0.95),
    }


def plot_return_distribution(returns: pd.Series, ticker: str) -> go.Figure:
    """Plot return distribution with normal overlay."""
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=returns, nbinsx=100, name="Actual Returns",
        histnorm="probability density", marker_color="steelblue", opacity=0.7,
    ))
    x_range = np.linspace(returns.min(), returns.max(), 200)
    normal_pdf = stats.norm.pdf(x_range, returns.mean(), returns.std())
    fig.add_trace(go.Scatter(
        x=x_range, y=normal_pdf, mode="lines",
        name="Normal Distribution", line=dict(color="red", width=2),
    ))
    fig.update_layout(
        title=f"{ticker} — Return Distribution vs Normal",
        xaxis_title="Daily Log Return", yaxis_title="Density",
        template="plotly_dark",
    )
    return fig


def plot_qq(returns: pd.Series, ticker: str) -> go.Figure:
    """QQ-plot against normal distribution."""
    sorted_returns = np.sort(returns.values)
    theoretical = stats.norm.ppf(np.linspace(0.001, 0.999, len(sorted_returns)))
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=theoretical, y=sorted_returns, mode="markers",
        marker=dict(size=2, color="steelblue"), name="Returns",
    ))
    min_val = min(theoretical.min(), sorted_returns.min())
    max_val = max(theoretical.max(), sorted_returns.max())
    fig.add_trace(go.Scatter(
        x=[min_val, max_val], y=[min_val, max_val],
        mode="lines", line=dict(color="red", dash="dash"), name="Normal Line",
    ))
    fig.update_layout(
        title=f"{ticker} — QQ Plot (vs Normal)",
        xaxis_title="Theoretical Quantiles", yaxis_title="Sample Quantiles",
        template="plotly_dark",
    )
    return fig


def plot_acf(returns: pd.Series, ticker: str, max_lag: int = 40) -> go.Figure:
    """Autocorrelation of returns and absolute returns."""
    fig = make_subplots(rows=2, cols=1, subplot_titles=["ACF of Returns", "ACF of |Returns|"])
    for lag in range(1, max_lag + 1):
        acf_val = returns.autocorr(lag=lag)
        fig.add_trace(go.Bar(x=[lag], y=[acf_val], marker_color="steelblue", showlegend=False), row=1, col=1)
    abs_ret = returns.abs()
    for lag in range(1, max_lag + 1):
        acf_val = abs_ret.autocorr(lag=lag)
        fig.add_trace(go.Bar(x=[lag], y=[acf_val], marker_color="coral", showlegend=False), row=2, col=1)
    ci = 1.96 / np.sqrt(len(returns))
    for row in [1, 2]:
        fig.add_hline(y=ci, line_dash="dash", line_color="gray", row=row, col=1)
        fig.add_hline(y=-ci, line_dash="dash", line_color="gray", row=row, col=1)
    fig.update_layout(title=f"{ticker} — Autocorrelation Analysis", template="plotly_dark", height=600)
    return fig


def plot_rolling_stats(prices: pd.Series, returns: pd.Series, ticker: str) -> go.Figure:
    """Rolling mean return and volatility."""
    fig = make_subplots(rows=3, cols=1, subplot_titles=["Price", "Rolling 20d Annualized Return", "Rolling 20d Annualized Volatility"], shared_xaxes=True)
    fig.add_trace(go.Scatter(x=prices.index, y=prices.values, line=dict(color="white", width=1), name="Price"), row=1, col=1)
    rolling_ret = returns.rolling(20).mean() * 252
    fig.add_trace(go.Scatter(x=rolling_ret.index, y=rolling_ret.values, line=dict(color="steelblue", width=1), name="Rolling Return"), row=2, col=1)
    fig.add_hline(y=0, line_dash="dash", line_color="gray", row=2, col=1)
    rolling_vol = returns.rolling(20).std() * np.sqrt(252)
    fig.add_trace(go.Scatter(x=rolling_vol.index, y=rolling_vol.values, line=dict(color="coral", width=1), name="Rolling Volatility"), row=3, col=1)
    fig.update_layout(title=f"{ticker} — Rolling Statistics", template="plotly_dark", height=800, showlegend=False)
    return fig


def main():
    parser = argparse.ArgumentParser(description="Exploratory Data Analysis for financial data")
    parser.add_argument("--input", default=None, help="Input CSV file (from fetch_data.py)")
    parser.add_argument("--ticker", default="SPY", help="Ticker to analyze")
    parser.add_argument("--period", default="5y", help="Data period if fetching directly")
    parser.add_argument("--output-dir", default="eda_output", help="Output directory for charts")
    args = parser.parse_args()

    import os
    os.makedirs(args.output_dir, exist_ok=True)

    print(f"Loading data for {args.ticker}...")
    prices = load_data(args.input, args.ticker, args.period)
    returns = compute_returns(prices)

    print("\n=== SUMMARY STATISTICS ===")
    stats_dict = summary_statistics(returns)
    for k, v in stats_dict.items():
        if isinstance(v, float):
            print(f"  {k:30s}: {v:>12.6f}")
        else:
            print(f"  {k:30s}: {v:>12}")

    print(f"\n=== NORMALITY TESTS ===")
    jb_stat, jb_pval = stats.jarque_bera(returns)
    print(f"  Jarque-Bera statistic:          {jb_stat:.2f}")
    print(f"  Jarque-Bera p-value:            {jb_pval:.6f}")
    print(f"  Normal? (p > 0.05):             {'Yes' if jb_pval > 0.05 else 'No (reject normality)'}")

    shapiro_stat, shapiro_pval = stats.shapiro(returns.sample(min(5000, len(returns)), random_state=42))
    print(f"  Shapiro-Wilk statistic:         {shapiro_stat:.6f}")
    print(f"  Shapiro-Wilk p-value:           {shapiro_pval:.6f}")

    print("\nGenerating charts...")
    fig1 = plot_return_distribution(returns, args.ticker)
    fig1.write_html(os.path.join(args.output_dir, "return_distribution.html"))

    fig2 = plot_qq(returns, args.ticker)
    fig2.write_html(os.path.join(args.output_dir, "qq_plot.html"))

    fig3 = plot_acf(returns, args.ticker)
    fig3.write_html(os.path.join(args.output_dir, "acf.html"))

    fig4 = plot_rolling_stats(prices, returns, args.ticker)
    fig4.write_html(os.path.join(args.output_dir, "rolling_stats.html"))

    print(f"\nCharts saved to {args.output_dir}/")
    print("  - return_distribution.html")
    print("  - qq_plot.html")
    print("  - acf.html")
    print("  - rolling_stats.html")


if __name__ == "__main__":
    main()
