#!/usr/bin/env python3
"""
Scan multiple tickers for active technical signals.

Usage:
    python signal_scanner.py --tickers SPY,QQQ,AAPL,MSFT,NVDA,AMZN,GOOGL,META --period 6mo
"""

import argparse

import pandas as pd
import yfinance as yf
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator
from ta.volatility import BollingerBands


def scan_ticker(ticker: str, period: str = "6mo") -> dict | None:
    """Scan a single ticker for signals."""
    try:
        df = yf.download(ticker, period=period, progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        if len(df) < 200:
            return None

        close = df["Close"]
        last_close = close.iloc[-1]

        rsi = RSIIndicator(close, window=14).rsi().iloc[-1]
        macd_ind = MACD(close)
        macd_val = macd_ind.macd().iloc[-1]
        macd_sig = macd_ind.macd_signal().iloc[-1]
        sma_200 = SMAIndicator(close, window=200).sma_indicator().iloc[-1]
        sma_50 = SMAIndicator(close, window=50).sma_indicator().iloc[-1]
        bb = BollingerBands(close)
        bb_upper = bb.bollinger_hband().iloc[-1]
        bb_lower = bb.bollinger_lband().iloc[-1]

        alerts = []
        if rsi > 70:
            alerts.append("RSI_OVERBOUGHT")
        elif rsi < 30:
            alerts.append("RSI_OVERSOLD")
        if macd_val > macd_sig and MACD(close).macd().iloc[-2] <= MACD(close).macd_signal().iloc[-2]:
            alerts.append("MACD_BULLISH_CROSS")
        elif macd_val < macd_sig and MACD(close).macd().iloc[-2] >= MACD(close).macd_signal().iloc[-2]:
            alerts.append("MACD_BEARISH_CROSS")
        if last_close > bb_upper:
            alerts.append("ABOVE_BOLLINGER")
        elif last_close < bb_lower:
            alerts.append("BELOW_BOLLINGER")
        if sma_50 > sma_200:
            trend = "UPTREND"
        else:
            trend = "DOWNTREND"

        return {
            "ticker": ticker,
            "price": last_close,
            "rsi": rsi,
            "macd": macd_val,
            "trend": trend,
            "sma_50": sma_50,
            "sma_200": sma_200,
            "alerts": alerts,
        }
    except Exception as e:
        print(f"  Error scanning {ticker}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Scan tickers for active signals")
    parser.add_argument("--tickers", required=True, help="Comma-separated tickers")
    parser.add_argument("--period", default="6mo", help="Data period")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    results = []

    print(f"Scanning {len(tickers)} tickers...\n")
    for ticker in tickers:
        print(f"  Scanning {ticker}...", end=" ")
        result = scan_ticker(ticker, args.period)
        if result:
            alert_str = ", ".join(result["alerts"]) if result["alerts"] else "none"
            print(f"RSI={result['rsi']:.1f} | {result['trend']} | Alerts: {alert_str}")
            results.append(result)
        else:
            print("SKIPPED (insufficient data)")

    print("\n=== ACTIVE SIGNALS ===")
    active = [r for r in results if r["alerts"]]
    if active:
        for r in active:
            print(f"\n  {r['ticker']} (${r['price']:.2f}):")
            for alert in r["alerts"]:
                print(f"    - {alert}")
    else:
        print("  No active signals detected across scanned tickers.")

    print(f"\n=== MARKET OVERVIEW ===")
    uptrend = [r["ticker"] for r in results if r["trend"] == "UPTREND"]
    downtrend = [r["ticker"] for r in results if r["trend"] == "DOWNTREND"]
    print(f"  Uptrend (SMA50 > SMA200): {', '.join(uptrend) if uptrend else 'none'}")
    print(f"  Downtrend (SMA50 < SMA200): {', '.join(downtrend) if downtrend else 'none'}")

    avg_rsi = sum(r["rsi"] for r in results) / len(results) if results else 0
    print(f"  Average RSI: {avg_rsi:.1f}")


if __name__ == "__main__":
    main()
