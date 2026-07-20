// Titan Markets symbol universe.
// basePrice values are reference anchors for the simulated feed; live adapters
// overwrite them with real market prices whenever a source is reachable.

export const ASSET_CLASSES = {
  index: 'Indices',
  equity: 'Equities',
  fx: 'Foreign Exchange',
  crypto: 'Digital Assets',
  commodity: 'Commodities',
  future: 'Futures',
}

export const UNIVERSE = [
  // ── Indices ──
  { symbol: 'SPX', name: 'S&P 500', cls: 'index', base: 6318.4, digits: 2, exch: 'CBOE' },
  { symbol: 'NDX', name: 'Nasdaq 100', cls: 'index', base: 23074.8, digits: 2, exch: 'NASDAQ' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', cls: 'index', base: 44576.2, digits: 2, exch: 'NYSE' },
  { symbol: 'RUT', name: 'Russell 2000', cls: 'index', base: 2286.5, digits: 2, exch: 'CBOE' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', cls: 'index', base: 14.82, digits: 2, exch: 'CBOE' },
  { symbol: 'FTSE', name: 'FTSE 100', cls: 'index', base: 9042.1, digits: 2, exch: 'LSE' },
  { symbol: 'DAX', name: 'DAX 40', cls: 'index', base: 24289.6, digits: 2, exch: 'XETRA' },
  { symbol: 'N225', name: 'Nikkei 225', cls: 'index', base: 41045.3, digits: 2, exch: 'TSE' },

  // ── Equities ──
  { symbol: 'AAPL', name: 'Apple Inc.', cls: 'equity', base: 231.6, digits: 2, sector: 'Technology', exch: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', cls: 'equity', base: 511.9, digits: 2, sector: 'Technology', exch: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', cls: 'equity', base: 172.4, digits: 2, sector: 'Technology', exch: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', cls: 'equity', base: 227.8, digits: 2, sector: 'Consumer Disc.', exch: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. A', cls: 'equity', base: 191.7, digits: 2, sector: 'Communication', exch: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms', cls: 'equity', base: 716.3, digits: 2, sector: 'Communication', exch: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', cls: 'equity', base: 321.2, digits: 2, sector: 'Consumer Disc.', exch: 'NASDAQ' },
  { symbol: 'JPM', name: 'JPMorgan Chase', cls: 'equity', base: 291.4, digits: 2, sector: 'Financials', exch: 'NYSE' },
  { symbol: 'GS', name: 'Goldman Sachs', cls: 'equity', base: 684.9, digits: 2, sector: 'Financials', exch: 'NYSE' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway B', cls: 'equity', base: 494.2, digits: 2, sector: 'Financials', exch: 'NYSE' },
  { symbol: 'XOM', name: 'Exxon Mobil', cls: 'equity', base: 114.8, digits: 2, sector: 'Energy', exch: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group', cls: 'equity', base: 301.5, digits: 2, sector: 'Healthcare', exch: 'NYSE' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', cls: 'equity', base: 781.6, digits: 2, sector: 'Healthcare', exch: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', cls: 'equity', base: 286.1, digits: 2, sector: 'Financials', exch: 'NYSE' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', cls: 'equity', base: 276.2, digits: 2, sector: 'Technology', exch: 'NASDAQ' },
  { symbol: 'NFLX', name: 'Netflix Inc.', cls: 'equity', base: 1247.5, digits: 2, sector: 'Communication', exch: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', cls: 'equity', base: 164.9, digits: 2, sector: 'Technology', exch: 'NASDAQ' },
  { symbol: 'CRM', name: 'Salesforce Inc.', cls: 'equity', base: 259.3, digits: 2, sector: 'Technology', exch: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America', cls: 'equity', base: 47.1, digits: 2, sector: 'Financials', exch: 'NYSE' },
  { symbol: 'WMT', name: 'Walmart Inc.', cls: 'equity', base: 98.4, digits: 2, sector: 'Consumer Staples', exch: 'NYSE' },

  // ── Foreign Exchange ──
  { symbol: 'EURUSD', name: 'Euro / US Dollar', cls: 'fx', base: 1.0864, digits: 4 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', cls: 'fx', base: 1.2761, digits: 4 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', cls: 'fx', base: 154.21, digits: 2 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', cls: 'fx', base: 0.6624, digits: 4 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', cls: 'fx', base: 1.3718, digits: 4 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', cls: 'fx', base: 0.8852, digits: 4 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', cls: 'fx', base: 0.6052, digits: 4 },
  { symbol: 'EURGBP', name: 'Euro / British Pound', cls: 'fx', base: 0.8513, digits: 4 },

  // ── Digital Assets ──
  { symbol: 'BTCUSD', name: 'Bitcoin', cls: 'crypto', base: 118240, digits: 0, gecko: 'bitcoin', binance: 'BTCUSDT' },
  { symbol: 'ETHUSD', name: 'Ethereum', cls: 'crypto', base: 3846, digits: 1, gecko: 'ethereum', binance: 'ETHUSDT' },
  { symbol: 'SOLUSD', name: 'Solana', cls: 'crypto', base: 171.8, digits: 2, gecko: 'solana', binance: 'SOLUSDT' },
  { symbol: 'XRPUSD', name: 'XRP', cls: 'crypto', base: 2.21, digits: 4, gecko: 'ripple', binance: 'XRPUSDT' },
  { symbol: 'BNBUSD', name: 'BNB', cls: 'crypto', base: 689.4, digits: 2, gecko: 'binancecoin', binance: 'BNBUSDT' },
  { symbol: 'DOGEUSD', name: 'Dogecoin', cls: 'crypto', base: 0.2104, digits: 4, gecko: 'dogecoin', binance: 'DOGEUSDT' },
  { symbol: 'ADAUSD', name: 'Cardano', cls: 'crypto', base: 0.7216, digits: 4, gecko: 'cardano', binance: 'ADAUSDT' },
  { symbol: 'LINKUSD', name: 'Chainlink', cls: 'crypto', base: 16.48, digits: 2, gecko: 'chainlink', binance: 'LINKUSDT' },

  // ── Commodities ──
  { symbol: 'XAUUSD', name: 'Gold Spot', cls: 'commodity', base: 3352.6, digits: 2 },
  { symbol: 'XAGUSD', name: 'Silver Spot', cls: 'commodity', base: 38.42, digits: 3 },
  { symbol: 'WTI', name: 'WTI Crude Oil', cls: 'commodity', base: 66.48, digits: 2 },
  { symbol: 'BRENT', name: 'Brent Crude Oil', cls: 'commodity', base: 69.82, digits: 2 },
  { symbol: 'NATGAS', name: 'Natural Gas', cls: 'commodity', base: 3.147, digits: 3 },
  { symbol: 'COPPER', name: 'Copper', cls: 'commodity', base: 4.552, digits: 3 },

  // ── Futures (front month) ──
  { symbol: 'ES', name: 'E-mini S&P 500', cls: 'future', base: 6342.25, digits: 2, tick: 0.25, exch: 'CME' },
  { symbol: 'NQ', name: 'E-mini Nasdaq 100', cls: 'future', base: 23148.75, digits: 2, tick: 0.25, exch: 'CME' },
  { symbol: 'YM', name: 'E-mini Dow', cls: 'future', base: 44712, digits: 0, tick: 1, exch: 'CBOT' },
  { symbol: 'RTY', name: 'E-mini Russell 2000', cls: 'future', base: 2293.1, digits: 1, tick: 0.1, exch: 'CME' },
  { symbol: 'CL', name: 'Crude Oil Futures', cls: 'future', base: 66.71, digits: 2, tick: 0.01, exch: 'NYMEX' },
  { symbol: 'GC', name: 'Gold Futures', cls: 'future', base: 3368.9, digits: 1, tick: 0.1, exch: 'COMEX' },
  { symbol: 'ZB', name: '30-Yr T-Bond Futures', cls: 'future', base: 114.47, digits: 2, tick: 0.03125, exch: 'CBOT' },
  { symbol: '6E', name: 'Euro FX Futures', cls: 'future', base: 1.0891, digits: 4, tick: 0.00005, exch: 'CME' },
]

export const bySymbol = Object.fromEntries(UNIVERSE.map((s) => [s.symbol, s]))

// per-minute simulated volatility by asset class
export const CLASS_VOL = {
  index: 0.0004,
  equity: 0.0007,
  fx: 0.00018,
  crypto: 0.0013,
  commodity: 0.0006,
  future: 0.0005,
}

export const DEFAULT_WATCHLIST = ['SPX', 'NDX', 'AAPL', 'NVDA', 'TSLA', 'EURUSD', 'BTCUSD', 'XAUUSD']
