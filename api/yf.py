# Titan market-data function — yfinance-backed (github.com/ranaroussi/yfinance).
#
# Runs server-side on Vercel (Python runtime), so it reaches Yahoo Finance
# without CORS issues and lets the `yfinance` library handle Yahoo's crumb /
# cookie / anti-scrape logic — far more robust than hand-rolled chart requests.
#
# Two modes (both return JSON):
#   • Batch quotes:  /api/yf?symbols=AAPL,^GSPC,GC=F,EURUSD=X,BTC-USD
#       -> { "quotes": { "<yahooSym>": {price, open, high, low, vol, closes[]} } }
#       One yfinance download for the whole board (cheap, one invocation/min).
#   • Single chart:  /api/yf?symbol=AAPL&range=5d&interval=5m
#       -> Yahoo v8-chart-shaped JSON (meta + timestamp + indicators.quote[0])
#       Used by the charting workstation for live OHLC candles.
#
# The frontend falls back to a Node proxy / public CORS proxies if this
# function is absent, so the app degrades gracefully without it.

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json


def _yf():
    import yfinance as yf
    import pandas as pd
    return yf, pd


def batch_quotes(symbols):
    yf, pd = _yf()
    tickers = [s for s in (symbols or []) if s]
    if not tickers:
        return {}
    # one threaded intraday download for the whole board
    df = yf.download(
        tickers=tickers, period="1d", interval="15m", group_by="ticker",
        threads=True, progress=False, prepost=False, auto_adjust=False,
    )
    multi = len(tickers) > 1
    out = {}
    for t in tickers:
        try:
            sub = df[t] if multi else df
            closes = [float(x) for x in sub["Close"].dropna().tolist()]
            if not closes:
                continue
            opens = [float(x) for x in sub["Open"].dropna().tolist()]
            highs = [float(x) for x in sub["High"].dropna().tolist()]
            lows = [float(x) for x in sub["Low"].dropna().tolist()]
            vols = [int(x) for x in sub["Volume"].dropna().tolist()]
            out[t] = {
                "price": closes[-1],
                "open": opens[0] if opens else closes[0],
                "high": max(highs) if highs else closes[-1],
                "low": min(lows) if lows else closes[-1],
                "vol": vols[-1] if vols else 0,
                "closes": closes[-80:],
            }
        except Exception:
            continue
    return out


def single_chart(symbol, period, interval):
    yf, pd = _yf()
    tk = yf.Ticker(symbol)
    df = tk.history(period=period, interval=interval, auto_adjust=False)
    if df is None or df.empty:
        return {"chart": {"result": None, "error": "no data"}}
    ts = [int(x.timestamp()) for x in df.index]

    def col(name):
        return [None if pd.isna(v) else float(v) for v in df[name].tolist()]

    o, h, l, c = col("Open"), col("High"), col("Low"), col("Close")
    vol = [0 if pd.isna(v) else int(v) for v in df["Volume"].tolist()]
    cc = [x for x in c if x is not None]
    oo = [x for x in o if x is not None]
    hh = [x for x in h if x is not None]
    ll = [x for x in l if x is not None]
    meta = {
        "symbol": symbol,
        "regularMarketPrice": cc[-1] if cc else None,
        "chartPreviousClose": None,
        "regularMarketOpen": oo[0] if oo else None,
        "regularMarketDayHigh": max(hh) if hh else None,
        "regularMarketDayLow": min(ll) if ll else None,
        "regularMarketVolume": next((v for v in reversed(vol) if v), None),
    }
    try:
        pc = tk.fast_info["previous_close"]
        if pc:
            meta["chartPreviousClose"] = float(pc)
    except Exception:
        pass
    return {
        "chart": {
            "result": [{
                "meta": meta,
                "timestamp": ts,
                "indicators": {"quote": [{"open": o, "high": h, "low": l, "close": c, "volume": vol}]},
            }],
            "error": None,
        }
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "s-maxage=20, stale-while-revalidate=40")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):  # noqa: N802
        q = parse_qs(urlparse(self.path).query)
        symbols = (q.get("symbols") or [""])[0]
        symbol = (q.get("symbol") or [""])[0]
        period = (q.get("range") or ["1d"])[0]
        interval = (q.get("interval") or ["5m"])[0]
        try:
            if symbols:
                self._send(200, {"quotes": batch_quotes(symbols.split(","))})
            elif symbol:
                self._send(200, single_chart(symbol, period, interval))
            else:
                self._send(400, {"error": "symbol or symbols required"})
        except Exception as e:  # noqa: BLE001
            self._send(502, {"error": str(e)})
