#!/usr/bin/env python3
"""
Compute technical indicators for a given ticker.

Usage:
    python compute_signals.py --ticker SPY --period 2y
    python compute_signals.py --ticker AAPL --period 1y --output signals.html
"""

import argparse

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from plotly.subplots import make_subplots
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator, EMAIndicator
from ta.volatility import BollingerBands
from ta.volume import OnBalanceVolumeIndicator


def fetch_and_compute(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Fetch data and compute all technical indicators."""
    df = yf.download(ticker, period=period, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    # Moving Averages
    df["SMA_20"] = SMAIndicator(close, window=20).sma_indicator()
    df["SMA_50"] = SMAIndicator(close, window=50).sma_indicator()
    df["SMA_200"] = SMAIndicator(close, window=200).sma_indicator()
    df["EMA_12"] = EMAIndicator(close, window=12).ema_indicator()
    df["EMA_26"] = EMAIndicator(close, window=26).ema_indicator()

    # RSI
    rsi = RSIIndicator(close, window=14)
    df["RSI"] = rsi.rsi()

    # MACD
    macd = MACD(close, window_slow=26, window_fast=12, window_sign=9)
    df["MACD"] = macd.macd()
    df["MACD_Signal"] = macd.macd_signal()
    df["MACD_Hist"] = macd.macd_diff()

    # Bollinger Bands
    bb = BollingerBands(close, window=20, window_dev=2)
    df["BB_Upper"] = bb.bollinger_hband()
    df["BB_Middle"] = bb.bollinger_mavg()
    df["BB_Lower"] = bb.bollinger_lband()
    df["BB_Width"] = bb.bollinger_wband()

    # OBV
    obv = OnBalanceVolumeIndicator(close, volume)
    df["OBV"] = obv.on_balance_volume()

    return df


def generate_signal_summary(df: pd.DataFrame, ticker: str) -> dict:
    """Generate current signal readings."""
    last = df.iloc[-1]
    prev = df.iloc[-2]

    signals = {}

    # RSI
    rsi = last["RSI"]
    if rsi > 70:
        signals["RSI"] = {"value": rsi, "signal": "OVERBOUGHT", "action": "Bearish"}
    elif rsi < 30:
        signals["RSI"] = {"value": rsi, "signal": "OVERSOLD", "action": "Bullish"}
    else:
        signals["RSI"] = {"value": rsi, "signal": "NEUTRAL", "action": "Hold"}

    # MACD
    macd_cross = "BULLISH" if last["MACD"] > last["MACD_Signal"] and prev["MACD"] <= prev["MACD_Signal"] else \
                 "BEARISH" if last["MACD"] < last["MACD_Signal"] and prev["MACD"] >= prev["MACD_Signal"] else \
                 "ABOVE" if last["MACD"] > last["MACD_Signal"] else "BELOW"
    signals["MACD"] = {"value": last["MACD"], "signal": macd_cross, "action": "Bullish" if "BULL" in macd_cross or macd_cross == "ABOVE" else "Bearish"}

    # Bollinger Bands
    close = last["Close"]
    if close > last["BB_Upper"]:
        signals["Bollinger"] = {"value": close, "signal": "ABOVE UPPER", "action": "Bearish"}
    elif close < last["BB_Lower"]:
        signals["Bollinger"] = {"value": close, "signal": "BELOW LOWER", "action": "Bullish"}
    else:
        pct = (close - last["BB_Lower"]) / (last["BB_Upper"] - last["BB_Lower"])
        signals["Bollinger"] = {"value": close, "signal": f"IN BAND ({pct:.0%})", "action": "Neutral"}

    # Trend (SMA 200)
    if close > last["SMA_200"]:
        signals["Trend_200"] = {"value": last["SMA_200"], "signal": "ABOVE SMA200", "action": "Bullish"}
    else:
        signals["Trend_200"] = {"value": last["SMA_200"], "signal": "BELOW SMA200", "action": "Bearish"}

    # Golden/Death Cross
    if last["SMA_50"] > last["SMA_200"] and prev["SMA_50"] <= prev["SMA_200"]:
        signals["Cross_50_200"] = {"signal": "GOLDEN CROSS", "action": "Bullish"}
    elif last["SMA_50"] < last["SMA_200"] and prev["SMA_50"] >= prev["SMA_200"]:
        signals["Cross_50_200"] = {"signal": "DEATH CROSS", "action": "Bearish"}
    else:
        signals["Cross_50_200"] = {"signal": "SMA50 " + ("above" if last["SMA_50"] > last["SMA_200"] else "below") + " SMA200", "action": "Neutral"}

    return signals


def plot_technical_chart(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Create a comprehensive technical analysis chart."""
    fig = make_subplots(
        rows=4, cols=1, shared_xaxes=True,
        row_heights=[0.45, 0.15, 0.20, 0.20],
        subplot_titles=["Price & Bollinger Bands", "Volume & OBV", "RSI (14)", "MACD"],
        vertical_spacing=0.03,
    )

    # Candlestick + Bollinger
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"], name="OHLC",
    ), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Upper"], line=dict(color="rgba(173,216,230,0.4)", width=1), name="BB Upper"), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Lower"], line=dict(color="rgba(173,216,230,0.4)", width=1), fill="tonexty", fillcolor="rgba(173,216,230,0.1)", name="BB Lower"), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA_50"], line=dict(color="orange", width=1), name="SMA 50"), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA_200"], line=dict(color="magenta", width=1), name="SMA 200"), row=1, col=1)

    # Volume
    colors = ["green" if c >= o else "red" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], marker_color=colors, name="Volume", opacity=0.5), row=2, col=1)

    # RSI
    fig.add_trace(go.Scatter(x=df.index, y=df["RSI"], line=dict(color="cyan", width=1.5), name="RSI"), row=3, col=1)
    fig.add_hline(y=70, line_dash="dash", line_color="red", row=3, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="green", row=3, col=1)
    fig.add_hrect(y0=30, y1=70, fillcolor="gray", opacity=0.1, row=3, col=1)

    # MACD
    macd_colors = ["green" if v >= 0 else "red" for v in df["MACD_Hist"]]
    fig.add_trace(go.Bar(x=df.index, y=df["MACD_Hist"], marker_color=macd_colors, name="MACD Hist"), row=4, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["MACD"], line=dict(color="cyan", width=1.5), name="MACD"), row=4, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["MACD_Signal"], line=dict(color="orange", width=1.5), name="Signal"), row=4, col=1)

    fig.update_layout(
        title=f"{ticker} — Technical Analysis Dashboard",
        template="plotly_dark", height=1000, xaxis_rangeslider_visible=False,
        showlegend=True, legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    return fig


def main():
    parser = argparse.ArgumentParser(description="Compute technical signals")
    parser.add_argument("--ticker", default="SPY", help="Ticker symbol")
    parser.add_argument("--period", default="2y", help="Data period")
    parser.add_argument("--output", default="technical_analysis.html", help="Output HTML file")
    args = parser.parse_args()

    print(f"Fetching {args.ticker} data ({args.period})...")
    df = fetch_and_compute(args.ticker, args.period)

    print(f"\n=== SIGNAL SUMMARY for {args.ticker} ===")
    signals = generate_signal_summary(df, args.ticker)
    for name, info in signals.items():
        val = f"{info.get('value', ''):.2f}" if isinstance(info.get("value"), float) else ""
        print(f"  {name:15s}: {info['signal']:20s} -> {info['action']:10s} {val}")

    fig = plot_technical_chart(df, args.ticker)
    fig.write_html(args.output)
    print(f"\nChart saved to {args.output}")


if __name__ == "__main__":
    main()
