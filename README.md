# Titan Trade Terminal

**Titan Markets LLC — Precision. Strategy. Performance.**

The official Titan Trade Terminal for the firm: an institutional-grade trading dashboard and terminal for both professional desks and retail traders, styled on the Titan Markets brand (obsidian dark, titan gold, Playfair Display / Inter / IBM Plex Mono).

## Quick start

```bash
npm install
npm run dev        # local development → http://localhost:5173
npm run build      # production build → dist/ (static, deploy anywhere)
npm run preview    # preview the production build
```

## Demo access

| Portal | Email | Password | Desk code |
|---|---|---|---|
| Retail | `retail@titanmarkets.com` | `titan123` | — |
| Professional | `pro@titanmarkets.com` | `titan123` | `TITAN-PRO-2026` |

The **Professional portal is a separate login**: it requires a firm-issued desk access code, retail credentials are rejected there, and only professional sessions can open the **Titan Terminal** (the darker institutional workstation with Level-2 depth, time & sales, squawk, futures/FX/index boards and a command line). The desk code can be rotated in Settings by a professional account.

“Remember me” keeps the session across browser restarts (localStorage); unchecked, the session ends when the browser closes.

## Live market data

Every instrument re-syncs on a fixed cadence (default **60 seconds**, configurable in Settings) and is honestly labeled by provenance:

- **LIVE** — real prints: digital assets via CoinGecko (Binance fallback), equities/news via Finnhub when a key is set
- **REF** — anchored to real reference data: FX from open.er-api.com daily rates
- **SIM** — Titan reference simulation (deterministic random walk around institutional price anchors), used when no live source is reachable

**To make equities, indices and the full news wire live:** create a free API key at [finnhub.io/register](https://finnhub.io/register) and paste it in **Settings → Market Data**. No rebuild needed.

## Google sign-in

The retail portal supports Google Identity Services:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Add your deployment origin (e.g. `https://yourdomain.com`) to *Authorized JavaScript origins*.
3. Paste the client ID in **Settings → Integrations** (or set `VITE_GOOGLE_CLIENT_ID` at build time).

The official Google button then renders on the login screen. Without a client ID the button explains what is needed.

## Import / export trades

- **Export CSV** — the full blotter in a clean canonical schema
- **Backup JSON** — trades + watchlist + settings in one workspace file
- **Import** — CSV (tolerant header mapping: `ticker/instrument`, `size/shares/lots`, `open price/entry`, …) or a Titan JSON backup, with a validation review (valid / skipped rows) and merge-or-replace choice before anything is written

## What's inside

| Page | Purpose (no overlap by design) |
|---|---|
| Overview | Equity, open/realized P&L, exposure mix, equity curve, watchlist, movers |
| Markets | Full 58-instrument universe — indices, equities, FX, crypto, commodities, futures — sortable table + heatmap |
| Charting | Candlestick workstation (lightweight-charts): 6 timeframes, SMA/EMA/Bollinger overlays, volume, session stats, depth preview |
| Trade Blotter | Journal of record: CRUD, filters, import/export |
| Portfolio | Live book marked to market: exposure, weights, close-at-market |
| Analytics | Win rate, profit factor, expectancy, Sharpe, drawdown, monthly P&L, strategy/asset/day attribution |
| News & Calendar | Live wire + weekly economic calendar |
| Trader Tools | Position sizing, R/R, VaR, Kelly, compounding, margin, live cross-asset correlation matrix |
| **Titan Terminal** (PRO) | Darker institutional surface: command line, L2 DOM, time & sales, squawk, world clocks, boards |
| Settings | Feed cadence, provider keys, Google client ID, desk code rotation, data management |

Page-to-page navigation animates through framer-motion transitions; sections reveal on scroll; the whole app is responsive with a mobile bottom tab bar.

## Notes

- All state (accounts, sessions, trades, settings) is stored in the browser (`localStorage`) — this is a front-end demo of the full product experience; a production deployment would back auth and storage with a server.
- Simulated data surfaces are always labeled SIM and the terminal footer carries a data-provenance disclaimer. Nothing here is investment advice.
