// Seed trade blotter + open positions for first run. Every trade uses the
// canonical schema shared by the importer/exporter:
// { id, date, symbol, side, qty, entry, exit, fees, strategy, assetClass,
//   status: 'closed'|'open', notes, tags[] }

const S = ['long', 'short']

const SEED_TRADES = [
  ['2026-05-04', 'NVDA', 'long', 300, 148.2, 161.7, 6.0, 'Momentum Breakout', 'equity', 'Earnings drift continuation; scaled out in thirds.'],
  ['2026-05-06', 'EURUSD', 'short', 200000, 1.0921, 1.0868, 8.0, 'Global Macro', 'fx', 'ECB dovish repricing. Target hit pre-NFP.'],
  ['2026-05-08', 'AAPL', 'long', 400, 224.1, 219.8, 5.5, 'Mean Reversion', 'equity', 'Failed reclaim of 20-day. Cut at stop.'],
  ['2026-05-11', 'BTCUSD', 'long', 1.5, 103400, 111250, 22.0, 'Trend Following', 'crypto', 'Weekly breakout over prior ATH shelf.'],
  ['2026-05-13', 'ES', 'short', 4, 6289.5, 6252.25, 19.2, 'Index Fade', 'future', 'CPI pop faded into value area.'],
  ['2026-05-15', 'XAUUSD', 'long', 120, 3288.4, 3341.2, 9.0, 'Global Macro', 'commodity', 'Real-yield compression thesis.'],
  ['2026-05-18', 'META', 'long', 150, 688.9, 681.2, 4.8, 'Momentum Breakout', 'equity', ''],
  ['2026-05-20', 'USDJPY', 'long', 150000, 152.84, 154.36, 7.5, 'Carry Basket', 'fx', 'BoJ hold; carry re-engaged.'],
  ['2026-05-22', 'TSLA', 'short', 220, 334.6, 321.9, 5.9, 'Mean Reversion', 'equity', 'Fade extension over upper band.'],
  ['2026-05-26', 'SOLUSD', 'long', 420, 158.2, 149.6, 11.0, 'Trend Following', 'crypto', 'Stopped on cascade; thesis invalidated.'],
  ['2026-05-28', 'MSFT', 'long', 180, 494.7, 508.2, 4.2, 'Quant Signal Q-17', 'equity', 'Factor model long signal.'],
  ['2026-06-01', 'CL', 'long', 6, 63.18, 66.02, 14.4, 'Global Macro', 'future', 'OPEC+ cut headline momentum.'],
  ['2026-06-03', 'GBPUSD', 'short', 180000, 1.2842, 1.2887, 7.2, 'Global Macro', 'fx', ''],
  ['2026-06-05', 'AMZN', 'long', 260, 219.4, 226.9, 5.1, 'Momentum Breakout', 'equity', 'AWS re:Inforce catalyst.'],
  ['2026-06-09', 'NQ', 'long', 3, 22684.0, 22571.5, 17.1, 'Index Momentum', 'future', 'Gap-and-go continuation.'],
  ['2026-06-11', 'ETHUSD', 'short', 18, 3921.0, 3812.5, 16.0, 'Mean Reversion', 'crypto', 'Funding blowout fade.'],
  ['2026-06-12', 'GS', 'long', 60, 662.3, 655.1, 3.9, 'Financials Rotation', 'equity', ''],
  ['2026-06-16', 'XAGUSD', 'long', 2000, 36.84, 38.12, 10.0, 'Metals Momentum', 'commodity', 'Gold/silver ratio compression.'],
  ['2026-06-18', 'AMD', 'short', 350, 171.2, 174.6, 6.3, 'Pairs vs NVDA', 'equity', 'Leg moved against; closed pair.'],
  ['2026-06-22', 'SPX', 'long', 25, 6248.0, 6291.5, 12.5, 'Index Momentum', 'index', 'FOMC drift playbook.'],
  ['2026-06-24', 'AUDUSD', 'long', 250000, 0.6571, 0.6549, 8.8, 'Global Macro', 'fx', 'RBA hawkish surprise.'],
  ['2026-06-25', 'NFLX', 'long', 40, 1198.0, 1176.4, 3.5, 'Momentum Breakout', 'equity', ''],
  ['2026-06-29', 'BTCUSD', 'short', 1.1, 116800, 114950, 18.0, 'Mean Reversion', 'crypto', 'Weekend wick fade.'],
  ['2026-07-01', 'JPM', 'long', 120, 281.6, 289.9, 4.4, 'Financials Rotation', 'equity', 'Pre-earnings positioning.'],
  ['2026-07-02', 'WTI', 'short', 800, 68.42, 69.05, 9.6, 'Global Macro', 'commodity', 'Inventory build surprise.'],
  ['2026-07-07', 'GOOGL', 'long', 300, 186.2, 190.8, 5.0, 'Quant Signal Q-17', 'equity', ''],
  ['2026-07-08', 'USDCAD', 'short', 200000, 1.3768, 1.3722, 7.9, 'Global Macro', 'fx', 'BoC hold + oil bid.'],
  ['2026-07-09', 'RTY', 'long', 5, 2261.4, 2284.9, 15.5, 'Small-Cap Rotation', 'future', ''],
  ['2026-07-13', 'LLY', 'short', 45, 796.4, 783.1, 3.8, 'Mean Reversion', 'equity', 'Extended over 3σ; reverted.'],
  ['2026-07-14', 'GC', 'long', 3, 3329.0, 3312.5, 12.0, 'Metals Momentum', 'future', ''],
]

const OPEN_POSITIONS = [
  ['2026-07-15', 'NVDA', 'long', 400, 168.9, 'Momentum Breakout', 'equity', 'Core AI-capex thesis. Stop 158.'],
  ['2026-07-15', 'XAUUSD', 'long', 150, 3318.5, 'Global Macro', 'commodity', 'Real-yield compression, CB demand.'],
  ['2026-07-16', 'EURUSD', 'short', 250000, 1.0902, 'Global Macro', 'fx', 'Policy divergence. Stop 1.0965.'],
  ['2026-07-16', 'MSFT', 'long', 150, 505.4, 'Quant Signal Q-17', 'equity', ''],
  ['2026-07-17', 'BTCUSD', 'long', 1.2, 115600, 'Trend Following', 'crypto', 'Holding weekly trend line.'],
  ['2026-07-17', 'ES', 'long', 3, 6318.75, 'Index Momentum', 'future', 'OPEX drift long. Stop 6280.'],
  ['2026-07-17', 'TSLA', 'short', 180, 327.8, 'Mean Reversion', 'equity', 'Deliveries fade. Stop 338.'],
  ['2026-07-17', 'USDJPY', 'long', 180000, 153.72, 'Carry Basket', 'fx', ''],
]

export function seedTrades() {
  const closed = SEED_TRADES.map((t, i) => ({
    id: `T-${String(1001 + i)}`,
    date: t[0],
    symbol: t[1],
    side: S.includes(t[2]) ? t[2] : 'long',
    qty: t[3],
    entry: t[4],
    exit: t[5],
    fees: t[6],
    strategy: t[7],
    assetClass: t[8],
    status: 'closed',
    notes: t[9] || '',
    tags: [t[7].split(' ')[0].toLowerCase()],
  }))
  const open = OPEN_POSITIONS.map((t, i) => ({
    id: `P-${String(2001 + i)}`,
    date: t[0],
    symbol: t[1],
    side: t[2],
    qty: t[3],
    entry: t[4],
    exit: null,
    fees: 0,
    strategy: t[5],
    assetClass: t[6],
    status: 'open',
    notes: t[7] || '',
    tags: [],
  }))
  return [...closed, ...open]
}

// FX pairs quoted as quote-currency-per-USD settle in the quote currency;
// convert their P&L back to USD at the exit price.
const usdBaseFx = (t) => t.assetClass === 'fx' && t.symbol.startsWith('USD')

// P&L for one trade; open trades mark against `mark` (current price)
export function tradePnl(t, mark) {
  const exitPx = t.status === 'open' ? mark : t.exit
  if (exitPx == null) return 0
  let gross = (exitPx - t.entry) * t.qty * (t.side === 'short' ? -1 : 1)
  if (usdBaseFx(t) && exitPx > 0) gross = gross / exitPx
  return gross - (t.fees || 0)
}

// USD notional of a position at `mark`
export function tradeNotional(t, mark) {
  const px = mark ?? t.entry
  if (usdBaseFx(t)) return Math.abs(t.qty) // qty is units of USD
  return Math.abs(t.qty * px)
}

export function tradeReturnPct(t, mark) {
  const exitPx = t.status === 'open' ? mark : t.exit
  if (exitPx == null || !t.entry) return 0
  return ((exitPx - t.entry) / t.entry) * 100 * (t.side === 'short' ? -1 : 1)
}
