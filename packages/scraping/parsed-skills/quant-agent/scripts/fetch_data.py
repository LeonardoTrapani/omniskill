#!/usr/bin/env python3
"""
Fetch financial data from Yahoo Finance.

Usage:
    python fetch_data.py --tickers SPY,QQQ,TLT --period 5y --output data.csv
    python fetch_data.py --tickers AAPL --period 1y --interval 1h --output aapl_hourly.csv
"""

import argparse
import sys

import pandas as pd
import yfinance as yf


def fetch_data(
    tickers: list[str],
    period: str = "5y",
    interval: str = "1d",
) -> pd.DataFrame:
    """Download OHLCV data for given tickers."""
    frames = {}
    for ticker in tickers:
        print(f"Fetching {ticker}...")
        df = yf.download(ticker, period=period, interval=interval, progress=False)
        if df.empty:
            print(f"  WARNING: No data returned for {ticker}")
            continue
        # Flatten multi-level columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df["Ticker"] = ticker
        frames[ticker] = df
    if not frames:
        print("ERROR: No data fetched for any ticker.")
        sys.exit(1)
    combined = pd.concat(frames.values())
    combined.index.name = "Date"
    return combined


def main():
    parser = argparse.ArgumentParser(description="Fetch financial data from Yahoo Finance")
    parser.add_argument("--tickers", required=True, help="Comma-separated list of tickers")
    parser.add_argument("--period", default="5y", help="Data period (1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max)")
    parser.add_argument("--interval", default="1d", help="Data interval (1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo)")
    parser.add_argument("--output", default="data.csv", help="Output CSV file path")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",")]
    df = fetch_data(tickers, period=args.period, interval=args.interval)
    df.to_csv(args.output)
    print(f"\nSaved {len(df)} rows to {args.output}")
    print(f"Tickers: {df['Ticker'].unique().tolist()}")
    print(f"Date range: {df.index.min()} to {df.index.max()}")


if __name__ == "__main__":
    main()
