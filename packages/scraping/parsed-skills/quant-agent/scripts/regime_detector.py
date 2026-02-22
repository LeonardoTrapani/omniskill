#!/usr/bin/env python3
"""
Market regime detection using rolling volatility and Hidden Markov Models.

Usage:
    python regime_detector.py --ticker SPY --period 10y
    python regime_detector.py --ticker SPY --period 10y --method hmm
"""

import argparse
import warnings

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from plotly.subplots import make_subplots
from scipy import stats

warnings.filterwarnings("ignore")


def detect_regimes_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    """Classify regimes based on rolling volatility thresholds."""
    rolling_vol = returns.rolling(window).std() * np.sqrt(252) * 100

    conditions = [
        rolling_vol < 10,
        (rolling_vol >= 10) & (rolling_vol < 20),
        (rolling_vol >= 20) & (rolling_vol < 30),
        rolling_vol >= 30,
    ]
    labels = ["Low Vol (Risk-On)", "Normal", "Elevated (Risk-Off)", "Crisis"]
    regime = np.select(conditions, labels, default="Unknown")
    return pd.Series(regime, index=returns.index)


def detect_regimes_hmm(returns: pd.Series, n_states: int = 3) -> pd.Series:
    """Classify regimes using Hidden Markov Model."""
    try:
        from hmmlearn.hmm import GaussianHMM
    except ImportError:
        print("  hmmlearn not installed, falling back to volatility-based detection")
        return detect_regimes_volatility(returns)

    clean = returns.dropna().values.reshape(-1, 1)
    model = GaussianHMM(n_components=n_states, covariance_type="full", n_iter=200, random_state=42)
    model.fit(clean)
    hidden_states = model.predict(clean)

    # Label states by mean return
    state_means = [clean[hidden_states == i].mean() for i in range(n_states)]
    sorted_states = np.argsort(state_means)
    label_map = {}
    if n_states == 2:
        label_map[sorted_states[0]] = "Bear"
        label_map[sorted_states[1]] = "Bull"
    elif n_states == 3:
        label_map[sorted_states[0]] = "Crisis"
        label_map[sorted_states[1]] = "Normal"
        label_map[sorted_states[2]] = "Bull"

    labels = [label_map.get(s, f"State {s}") for s in hidden_states]
    return pd.Series(labels, index=returns.dropna().index)


def compute_regime_stats(returns: pd.Series, regimes: pd.Series) -> pd.DataFrame:
    """Compute return statistics per regime."""
    aligned = pd.DataFrame({"returns": returns, "regime": regimes}).dropna()
    stats_list = []
    for regime in aligned["regime"].unique():
        r = aligned[aligned["regime"] == regime]["returns"]
        stats_list.append({
            "regime": regime,
            "count_days": len(r),
            "pct_time": len(r) / len(aligned) * 100,
            "ann_return": r.mean() * 252 * 100,
            "ann_vol": r.std() * np.sqrt(252) * 100,
            "sharpe": (r.mean() / r.std()) * np.sqrt(252) if r.std() > 0 else 0,
            "skewness": r.skew(),
            "worst_day": r.min() * 100,
            "best_day": r.max() * 100,
        })
    return pd.DataFrame(stats_list).sort_values("ann_vol")


def plot_regime_analysis(prices: pd.Series, returns: pd.Series, regimes: pd.Series, ticker: str) -> go.Figure:
    """Create regime analysis visualization."""
    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        subplot_titles=[f"{ticker} Price with Regime Coloring", "Rolling 20d Volatility", "Daily Returns"],
        row_heights=[0.45, 0.3, 0.25], vertical_spacing=0.05,
    )

    # Regime colors
    color_map = {
        "Low Vol (Risk-On)": "rgba(0,255,0,0.15)",
        "Normal": "rgba(100,100,100,0.1)",
        "Elevated (Risk-Off)": "rgba(255,165,0,0.15)",
        "Crisis": "rgba(255,0,0,0.25)",
        "Bull": "rgba(0,255,0,0.15)",
        "Bear": "rgba(255,165,0,0.15)",
    }

    # Price
    fig.add_trace(go.Scatter(
        x=prices.index, y=prices.values,
        line=dict(color="white", width=1.5), name="Price",
    ), row=1, col=1)

    # Add regime background coloring
    regime_changes = regimes[regimes != regimes.shift()]
    for i in range(len(regime_changes)):
        start = regime_changes.index[i]
        end = regime_changes.index[i + 1] if i + 1 < len(regime_changes) else regimes.index[-1]
        regime = regime_changes.iloc[i]
        color = color_map.get(regime, "rgba(128,128,128,0.1)")
        for row in [1, 2, 3]:
            fig.add_vrect(x0=start, x1=end, fillcolor=color, opacity=1, layer="below", line_width=0, row=row, col=1)

    # Volatility
    rolling_vol = returns.rolling(20).std() * np.sqrt(252) * 100
    fig.add_trace(go.Scatter(
        x=rolling_vol.index, y=rolling_vol.values,
        line=dict(color="coral", width=1.5), name="Rolling Vol",
    ), row=2, col=1)
    fig.add_hline(y=20, line_dash="dash", line_color="orange", row=2, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="red", row=2, col=1)

    # Returns
    ret_colors = ["green" if r >= 0 else "red" for r in returns]
    fig.add_trace(go.Bar(
        x=returns.index, y=returns.values * 100,
        marker_color=ret_colors, name="Returns %", opacity=0.6,
    ), row=3, col=1)

    fig.update_layout(
        title=f"{ticker} — Market Regime Analysis",
        template="plotly_dark", height=900, showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Market regime detector")
    parser.add_argument("--ticker", default="SPY", help="Ticker symbol")
    parser.add_argument("--period", default="10y", help="Data period")
    parser.add_argument("--method", default="volatility", choices=["volatility", "hmm"], help="Detection method")
    parser.add_argument("--output", default="regime_analysis.html", help="Output HTML")
    args = parser.parse_args()

    print(f"Fetching {args.ticker} ({args.period})...")
    data = yf.download(args.ticker, period=args.period, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
    prices = data["Close"]
    returns = np.log(prices / prices.shift(1)).dropna()

    print(f"Detecting regimes (method: {args.method})...")
    if args.method == "hmm":
        regimes = detect_regimes_hmm(returns)
    else:
        regimes = detect_regimes_volatility(returns)

    print(f"\n=== REGIME ANALYSIS for {args.ticker} ===")
    regime_stats = compute_regime_stats(returns, regimes)
    print(regime_stats.to_string(index=False, float_format="%.2f"))

    current_regime = regimes.iloc[-1]
    print(f"\n  Current Regime: {current_regime}")

    # Transition counts
    transitions = pd.crosstab(regimes.shift(1), regimes, normalize="index")
    print(f"\n=== REGIME TRANSITION PROBABILITIES ===")
    print(transitions.to_string(float_format="%.2f"))

    fig = plot_regime_analysis(prices, returns, regimes, args.ticker)
    fig.write_html(args.output)
    print(f"\nChart saved to {args.output}")


if __name__ == "__main__":
    main()
