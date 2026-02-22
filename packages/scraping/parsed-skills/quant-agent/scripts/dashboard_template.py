#!/usr/bin/env python3
"""
Streamlit dashboard template for comprehensive financial analysis.

Usage:
    streamlit run dashboard_template.py -- --ticker SPY
"""

import argparse
import sys

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import yfinance as yf
from plotly.subplots import make_subplots
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator
from ta.volatility import BollingerBands

try:
    import streamlit as st
except ImportError:
    print("Streamlit not installed. Install with: pip install streamlit")
    print("Alternatively, this script can be run standalone for chart generation.")
    st = None


def load_data(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Load and compute indicators."""
    df = yf.download(ticker, period=period, progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df["Close"]
    df["Returns"] = np.log(close / close.shift(1))
    df["SMA_50"] = SMAIndicator(close, window=50).sma_indicator()
    df["SMA_200"] = SMAIndicator(close, window=200).sma_indicator()
    df["RSI"] = RSIIndicator(close, window=14).rsi()
    macd = MACD(close)
    df["MACD"] = macd.macd()
    df["MACD_Signal"] = macd.macd_signal()
    df["MACD_Hist"] = macd.macd_diff()
    bb = BollingerBands(close)
    df["BB_Upper"] = bb.bollinger_hband()
    df["BB_Lower"] = bb.bollinger_lband()
    df["RV_20"] = df["Returns"].rolling(20).std() * np.sqrt(252) * 100

    # Regime
    rv = df["RV_20"]
    df["Regime"] = np.where(rv < 12, "Low Vol", np.where(rv < 22, "Normal", "High Vol"))

    return df.dropna()


def build_main_chart(df: pd.DataFrame, ticker: str) -> go.Figure:
    """Build the main candlestick chart with overlays."""
    fig = make_subplots(
        rows=4, cols=1, shared_xaxes=True,
        row_heights=[0.45, 0.15, 0.2, 0.2],
        vertical_spacing=0.02,
    )

    # Candlestick
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"], name="OHLC",
    ), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Upper"], line=dict(color="rgba(173,216,230,0.3)", width=1), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Lower"], line=dict(color="rgba(173,216,230,0.3)", width=1), fill="tonexty", fillcolor="rgba(173,216,230,0.05)", showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA_50"], line=dict(color="orange", width=1.2), name="SMA 50"), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA_200"], line=dict(color="magenta", width=1.2), name="SMA 200"), row=1, col=1)

    # Regime coloring
    regime_colors = {"Low Vol": "rgba(0,255,0,0.08)", "Normal": "rgba(100,100,100,0.05)", "High Vol": "rgba(255,0,0,0.12)"}
    regime_changes = df["Regime"][df["Regime"] != df["Regime"].shift()]
    for i in range(len(regime_changes)):
        start = regime_changes.index[i]
        end = regime_changes.index[i + 1] if i + 1 < len(regime_changes) else df.index[-1]
        color = regime_colors.get(regime_changes.iloc[i], "rgba(128,128,128,0.05)")
        fig.add_vrect(x0=start, x1=end, fillcolor=color, opacity=1, layer="below", line_width=0, row=1, col=1)

    # Volume
    vol_colors = ["green" if c >= o else "red" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], marker_color=vol_colors, opacity=0.5, name="Volume"), row=2, col=1)

    # RSI
    fig.add_trace(go.Scatter(x=df.index, y=df["RSI"], line=dict(color="cyan", width=1.5), name="RSI"), row=3, col=1)
    fig.add_hline(y=70, line_dash="dash", line_color="red", row=3, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="green", row=3, col=1)

    # MACD
    macd_colors = ["green" if v >= 0 else "red" for v in df["MACD_Hist"]]
    fig.add_trace(go.Bar(x=df.index, y=df["MACD_Hist"], marker_color=macd_colors, name="MACD Hist"), row=4, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["MACD"], line=dict(color="cyan", width=1.2), name="MACD"), row=4, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["MACD_Signal"], line=dict(color="orange", width=1.2), name="Signal"), row=4, col=1)

    fig.update_layout(
        template="plotly_dark", height=900,
        xaxis_rangeslider_visible=False, showlegend=False,
        margin=dict(l=50, r=20, t=30, b=30),
    )
    return fig


def run_streamlit(default_ticker: str):
    """Run the Streamlit dashboard."""
    st.set_page_config(page_title="Quant Agent Dashboard", layout="wide")
    st.title("Quantitative Finance Dashboard")

    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        ticker = st.text_input("Ticker", value=default_ticker).upper()
    with col2:
        period = st.selectbox("Period", ["6mo", "1y", "2y", "5y", "10y"], index=2)
    with col3:
        st.write("")
        st.write("")
        run = st.button("Analyze", type="primary")

    if run or ticker:
        with st.spinner(f"Loading {ticker}..."):
            df = load_data(ticker, period)

        # Key metrics row
        last = df.iloc[-1]
        prev = df.iloc[-2]
        daily_change = (last["Close"] - prev["Close"]) / prev["Close"] * 100

        m1, m2, m3, m4, m5 = st.columns(5)
        m1.metric("Price", f"${last['Close']:.2f}", f"{daily_change:+.2f}%")
        m2.metric("RSI (14)", f"{last['RSI']:.1f}", "Overbought" if last["RSI"] > 70 else "Oversold" if last["RSI"] < 30 else "Neutral")
        m3.metric("Realized Vol (20d)", f"{last['RV_20']:.1f}%")
        m4.metric("Regime", last["Regime"])
        m5.metric("Trend", "Bullish" if last["Close"] > last["SMA_200"] else "Bearish")

        # Main chart
        st.plotly_chart(build_main_chart(df, ticker), use_container_width=True)

        # Stats
        with st.expander("Summary Statistics"):
            returns = df["Returns"].dropna()
            stats = {
                "Annualized Return": f"{returns.mean() * 252 * 100:.1f}%",
                "Annualized Volatility": f"{returns.std() * np.sqrt(252) * 100:.1f}%",
                "Sharpe Ratio": f"{(returns.mean() / returns.std()) * np.sqrt(252):.2f}",
                "Skewness": f"{returns.skew():.2f}",
                "Kurtosis": f"{returns.kurtosis():.2f}",
                "Max Drawdown": f"{((1 + returns).cumprod() / (1 + returns).cumprod().cummax() - 1).min() * 100:.1f}%",
            }
            for k, v in stats.items():
                st.write(f"**{k}**: {v}")


def run_standalone(ticker: str, period: str = "2y", output: str = "dashboard.html"):
    """Generate dashboard as static HTML."""
    print(f"Generating dashboard for {ticker}...")
    df = load_data(ticker, period)
    fig = build_main_chart(df, ticker)
    fig.write_html(output)
    print(f"Dashboard saved to {output}")


if __name__ == "__main__":
    # Parse args that come after "--" in streamlit run
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", default="SPY")
    parser.add_argument("--period", default="2y")
    parser.add_argument("--output", default="dashboard.html")

    # Handle both streamlit and standalone modes
    if st is not None and hasattr(st, "runtime"):
        try:
            # Try to get streamlit args (after --)
            args, _ = parser.parse_known_args()
            run_streamlit(args.ticker)
        except Exception:
            run_streamlit("SPY")
    else:
        args = parser.parse_args()
        run_standalone(args.ticker, args.period, args.output)
