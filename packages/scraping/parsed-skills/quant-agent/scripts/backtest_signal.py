#!/usr/bin/env python3
"""
Simple signal backtester with equity curve and drawdown analysis.

Usage:
    python backtest_signal.py --ticker SPY --signal sma_crossover --period 10y
    python backtest_signal.py --ticker QQQ --signal rsi_mean_reversion --period 5y
"""

import argparse

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from plotly.subplots import make_subplots
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator


SIGNALS = {
    "sma_crossover": "SMA 50/200 Crossover: Long when SMA50 > SMA200",
    "rsi_mean_reversion": "RSI Mean Reversion: Long when RSI < 30, exit when RSI > 70",
    "momentum": "12-month Momentum: Long when 252d return > 0",
    "buy_and_hold": "Buy and Hold benchmark",
}


def generate_signal(df: pd.DataFrame, signal_type: str) -> pd.Series:
    """Generate position signal (1 = long, 0 = flat, -1 = short)."""
    close = df["Close"]

    if signal_type == "sma_crossover":
        sma50 = SMAIndicator(close, window=50).sma_indicator()
        sma200 = SMAIndicator(close, window=200).sma_indicator()
        return (sma50 > sma200).astype(int)

    elif signal_type == "rsi_mean_reversion":
        rsi = RSIIndicator(close, window=14).rsi()
        position = pd.Series(0, index=df.index)
        in_position = False
        for i in range(len(rsi)):
            if not in_position and rsi.iloc[i] < 30:
                in_position = True
            elif in_position and rsi.iloc[i] > 70:
                in_position = False
            position.iloc[i] = 1 if in_position else 0
        return position

    elif signal_type == "momentum":
        mom = close / close.shift(252) - 1
        return (mom > 0).astype(int)

    elif signal_type == "buy_and_hold":
        return pd.Series(1, index=df.index)

    else:
        raise ValueError(f"Unknown signal: {signal_type}. Available: {list(SIGNALS.keys())}")


def backtest(df: pd.DataFrame, signal: pd.Series) -> pd.DataFrame:
    """Run backtest and compute performance metrics."""
    close = df["Close"]
    returns = np.log(close / close.shift(1))
    strategy_returns = signal.shift(1) * returns  # Avoid look-ahead

    result = pd.DataFrame({
        "returns": returns,
        "signal": signal,
        "strategy_returns": strategy_returns,
        "benchmark_cum": returns.cumsum(),
        "strategy_cum": strategy_returns.cumsum(),
    })

    # Equity curves (multiplicative)
    result["benchmark_equity"] = (1 + returns).cumprod()
    result["strategy_equity"] = (1 + strategy_returns).cumprod()

    # Drawdowns
    strat_eq = result["strategy_equity"]
    result["strategy_drawdown"] = strat_eq / strat_eq.cummax() - 1
    bench_eq = result["benchmark_equity"]
    result["benchmark_drawdown"] = bench_eq / bench_eq.cummax() - 1

    return result.dropna()


def compute_metrics(returns: pd.Series, name: str) -> dict:
    """Compute performance metrics."""
    ann_ret = returns.mean() * 252
    ann_vol = returns.std() * np.sqrt(252)
    sharpe = ann_ret / ann_vol if ann_vol > 0 else 0
    cum = (1 + returns).cumprod()
    max_dd = (cum / cum.cummax() - 1).min()
    calmar = ann_ret / abs(max_dd) if max_dd != 0 else 0
    win_rate = (returns > 0).mean()
    profit_factor = returns[returns > 0].sum() / abs(returns[returns < 0].sum()) if (returns < 0).any() else float("inf")

    return {
        "name": name,
        "ann_return": ann_ret,
        "ann_volatility": ann_vol,
        "sharpe": sharpe,
        "max_drawdown": max_dd,
        "calmar": calmar,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "total_return": cum.iloc[-1] - 1,
    }


def plot_backtest(result: pd.DataFrame, ticker: str, signal_name: str) -> go.Figure:
    """Create backtest visualization."""
    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        subplot_titles=["Equity Curve", "Position Signal", "Drawdown"],
        row_heights=[0.5, 0.2, 0.3], vertical_spacing=0.05,
    )

    # Equity curves
    fig.add_trace(go.Scatter(
        x=result.index, y=result["strategy_equity"],
        line=dict(color="cyan", width=2), name=f"Strategy ({signal_name})",
    ), row=1, col=1)
    fig.add_trace(go.Scatter(
        x=result.index, y=result["benchmark_equity"],
        line=dict(color="gray", width=1, dash="dash"), name="Buy & Hold",
    ), row=1, col=1)

    # Position
    fig.add_trace(go.Scatter(
        x=result.index, y=result["signal"],
        line=dict(color="yellow", width=1), fill="tozeroy",
        fillcolor="rgba(255,255,0,0.1)", name="Position",
    ), row=2, col=1)

    # Drawdowns
    fig.add_trace(go.Scatter(
        x=result.index, y=result["strategy_drawdown"] * 100,
        fill="tozeroy", fillcolor="rgba(255,0,0,0.2)",
        line=dict(color="red", width=1), name="Strategy DD",
    ), row=3, col=1)
    fig.add_trace(go.Scatter(
        x=result.index, y=result["benchmark_drawdown"] * 100,
        line=dict(color="gray", width=1, dash="dash"), name="Benchmark DD",
    ), row=3, col=1)

    fig.update_layout(
        title=f"Backtest: {signal_name} on {ticker}",
        template="plotly_dark", height=800, showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    fig.update_yaxes(title_text="Equity ($1 start)", row=1, col=1)
    fig.update_yaxes(title_text="Position", row=2, col=1)
    fig.update_yaxes(title_text="Drawdown %", row=3, col=1)
    return fig


def main():
    parser = argparse.ArgumentParser(description="Simple signal backtester")
    parser.add_argument("--ticker", default="SPY", help="Ticker symbol")
    parser.add_argument("--signal", default="sma_crossover", choices=list(SIGNALS.keys()), help="Signal type")
    parser.add_argument("--period", default="10y", help="Data period")
    parser.add_argument("--output", default="backtest.html", help="Output HTML")
    args = parser.parse_args()

    print(f"Fetching {args.ticker} ({args.period})...")
    df = yf.download(args.ticker, period=args.period, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    print(f"Generating signal: {args.signal} — {SIGNALS[args.signal]}")
    signal = generate_signal(df, args.signal)

    print("Running backtest...")
    result = backtest(df, signal)

    strat_metrics = compute_metrics(result["strategy_returns"], f"Strategy ({args.signal})")
    bench_metrics = compute_metrics(result["returns"], "Buy & Hold")

    print(f"\n=== BACKTEST RESULTS: {args.signal} on {args.ticker} ===")
    print(f"\n{'Metric':<25s} {'Strategy':>12s} {'Benchmark':>12s}")
    print("-" * 50)
    for key in ["ann_return", "ann_volatility", "sharpe", "max_drawdown", "calmar", "win_rate", "total_return"]:
        s = strat_metrics[key]
        b = bench_metrics[key]
        fmt = ".1%" if key in ["ann_return", "ann_volatility", "max_drawdown", "win_rate", "total_return"] else ".3f"
        print(f"  {key:<23s} {s:>12{fmt}} {b:>12{fmt}}")

    # Exposure
    exposure = signal.mean()
    print(f"\n  Avg Exposure (% in market): {exposure:.1%}")
    print(f"  Signal: {SIGNALS[args.signal]}")

    fig = plot_backtest(result, args.ticker, args.signal)
    fig.write_html(args.output)
    print(f"\nChart saved to {args.output}")


if __name__ == "__main__":
    main()
