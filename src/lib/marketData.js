// Titan market data engine.
//
// Sources, in order of preference per asset class:
//   crypto        → CoinGecko simple/price (no key, CORS) + Binance 24h fallback
//   everything    → Yahoo Finance v8 chart (no key) via a CORS-proxy chain —
//     else          real intraday price / open / high / low / volume + history
//                   for indices, equities, FX, commodities AND futures
//   equity/index  → Finnhub real-time quotes when the user adds a free API key
//                   (higher-reliability override for US equities + news)
//   fx            → open.er-api.com daily reference rates (baseline fallback)
//   anything not reachable → Titan reference simulation, anchored to the last
//                   known live price and clearly labelled SIM in the UI.
//
// Every symbol carries `source`: 'live' | 'ref' | 'sim' so the UI can label
// data provenance honestly. The engine ticks on a configurable interval
// (default 60 000 ms — once per minute) and micro-ticks the terminal tape.

import { UNIVERSE, bySymbol, CLASS_VOL } from './universe.js'

const HISTORY_LEN = 240 // intraday points kept per symbol

// ── Yahoo Finance symbol mapping (covers the full universe, no API key) ──
const YAHOO_OVERRIDE = {
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', RUT: '^RUT', VIX: '^VIX',
  FTSE: '^FTSE', DAX: '^GDAXI', N225: '^N225',
  'BRK.B': 'BRK-B',
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTI: 'CL=F', BRENT: 'BZ=F', NATGAS: 'NG=F', COPPER: 'HG=F',
  ES: 'ES=F', NQ: 'NQ=F', YM: 'YM=F', RTY: 'RTY=F', CL: 'CL=F', GC: 'GC=F', ZB: 'ZB=F', '6E': '6E=F',
}
function yahooSymbol(def) {
  if (YAHOO_OVERRIDE[def.symbol]) return YAHOO_OVERRIDE[def.symbol]
  if (def.cls === 'fx') return `${def.symbol}=X`
  if (def.cls === 'crypto') return `${def.symbol.replace('USD', '')}-USD`
  return def.symbol // equities map 1:1
}

// CORS proxies tried in order (browsers can't hit Yahoo directly — no CORS
// headers). A user-supplied proxy from Settings is tried first, then a direct
// attempt (works from some environments / extensions) as a last resort.
const CORS_PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
]
// Symbols always refreshed every tick (ticker tape + headline board); the rest
// rotate through a window so we stay polite to the public proxies.
const ALWAYS_PRIORITY = [
  'SPX', 'NDX', 'DJI', 'RUT', 'VIX', 'ES', 'NQ', 'AAPL', 'NVDA', 'MSFT', 'TSLA',
  'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'WTI', 'DAX', 'N225',
]

// ── deterministic PRNG so the sim is stable across reloads on the same day ──
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const daySeed = () => {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

// ── engine state ──
const quotes = new Map() // symbol → quote object
const listeners = new Set()
let timer = null
let refreshMs = 60_000
let finnhubKey = ''
let corsProxy = '' // optional user CORS proxy template (contains {url})
let extraPriority = [] // watchlist symbols to also refresh every tick
let rotateOffset = 0 // rotates the non-priority live-fetch window each tick
let lastSync = null
let liveCounts = { live: 0, ref: 0, sim: 0 }

function seedQuote(def) {
  const rng = mulberry32(hashStr(def.symbol) ^ daySeed())
  const vol = CLASS_VOL[def.cls] ?? 0.0005
  // walk backwards to build an intraday history ending at an open anchor
  let p = def.base * (1 + (rng() - 0.5) * 8 * vol)
  const hist = [p]
  for (let i = 1; i < HISTORY_LEN; i++) {
    p = p * (1 + (rng() - 0.5) * 2 * vol)
    hist.push(p)
  }
  const price = hist[hist.length - 1]
  const open = hist[0]
  return {
    ...def,
    price,
    open,
    prevClose: open * (1 + (rng() - 0.5) * 2 * vol),
    dayHigh: Math.max(...hist),
    dayLow: Math.min(...hist),
    change: price - open,
    changePct: ((price - open) / open) * 100,
    volume: Math.floor((0.4 + rng()) * volumeScale(def)),
    history: hist,
    source: 'sim',
    dir: 0,
    ts: Date.now(),
    _rng: rng,
    _anchor: null, // live/reference anchor price when a source is reachable
  }
}

function volumeScale(def) {
  switch (def.cls) {
    case 'equity': return 38_000_000
    case 'index': return 2_400_000_000
    case 'crypto': return 22_000_000_000
    case 'fx': return 90_000_000_000
    case 'commodity': return 240_000
    case 'future': return 1_400_000
    default: return 1_000_000
  }
}

function pushPrice(q, price, source) {
  const prev = q.price
  q.dir = price > prev ? 1 : price < prev ? -1 : q.dir
  q.price = price
  q.dayHigh = Math.max(q.dayHigh, price)
  q.dayLow = Math.min(q.dayLow, price)
  q.change = price - q.open
  q.changePct = ((price - q.open) / q.open) * 100
  q.history.push(price)
  if (q.history.length > HISTORY_LEN) q.history.shift()
  if (source) q.source = source
  q.volume += Math.floor(q._rng() * volumeScale(q) * 0.004)
  q.ts = Date.now()
}

function simStep(q) {
  const vol = CLASS_VOL[q.cls] ?? 0.0005
  // gentle mean reversion toward the anchor (live ref or base) keeps sim honest
  const anchor = q._anchor ?? q.base
  const drift = ((anchor - q.price) / anchor) * 0.02
  const next = q.price * (1 + drift + (q._rng() - 0.5) * 2 * vol)
  pushPrice(q, next, q._anchor ? 'ref' : 'sim')
}

// ── live adapters ──
async function fetchJson(url, opts = {}, timeout = 9000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

async function pullCrypto() {
  const coins = UNIVERSE.filter((s) => s.cls === 'crypto')
  try {
    const ids = coins.map((c) => c.gecko).join(',')
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    )
    for (const c of coins) {
      const row = data[c.gecko]
      if (!row?.usd) continue
      const q = quotes.get(c.symbol)
      q._anchor = row.usd
      const pct = row.usd_24h_change ?? 0
      q.open = row.usd / (1 + pct / 100)
      if (row.usd_24h_vol) q.volume = Math.floor(row.usd_24h_vol)
      pushPrice(q, row.usd, 'live')
    }
    return true
  } catch {
    // fallback: Binance 24hr endpoint
    try {
      const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr')
      const map = new Map(data.map((r) => [r.symbol, r]))
      let hit = false
      for (const c of coins) {
        const row = map.get(c.binance)
        if (!row) continue
        const q = quotes.get(c.symbol)
        const price = parseFloat(row.lastPrice)
        q._anchor = price
        q.open = parseFloat(row.openPrice)
        q.dayHigh = parseFloat(row.highPrice)
        q.dayLow = parseFloat(row.lowPrice)
        q.volume = Math.floor(parseFloat(row.quoteVolume))
        pushPrice(q, price, 'live')
        hit = true
      }
      return hit
    } catch {
      return false
    }
  }
}

async function pullFx() {
  try {
    const data = await fetchJson('https://open.er-api.com/v6/latest/USD')
    if (!data?.rates) return false
    const r = data.rates
    const cross = {
      EURUSD: 1 / r.EUR,
      GBPUSD: 1 / r.GBP,
      USDJPY: r.JPY,
      AUDUSD: 1 / r.AUD,
      USDCAD: r.CAD,
      USDCHF: r.CHF,
      NZDUSD: 1 / r.NZD,
      EURGBP: r.GBP / r.EUR,
    }
    for (const [sym, px] of Object.entries(cross)) {
      const q = quotes.get(sym)
      if (!q || !isFinite(px)) continue
      q._anchor = px
      // daily reference rate: anchor the walk, keep intraday sim texture
      if (q.source === 'sim') pushPrice(q, px, 'ref')
      else q.source = 'ref'
    }
    return true
  } catch {
    return false
  }
}

// ── Yahoo Finance universal adapter ──
async function fetchYahoo(ysym) {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ysym
  )}?range=1d&interval=5m&includePrePost=false`
  const chain = []
  if (corsProxy) chain.push((u) => corsProxy.replace('{url}', encodeURIComponent(u)))
  chain.push(...CORS_PROXIES, (u) => u) // built-in proxies, then a direct attempt
  for (const wrap of chain) {
    try {
      const j = await fetchJson(wrap(target), {}, 8000)
      const r = j?.chart?.result?.[0]
      if (r?.meta?.regularMarketPrice != null) return r
    } catch {
      /* try next proxy */
    }
  }
  return null
}

function applyYahoo(q, r) {
  const m = r.meta
  const px = m.regularMarketPrice
  if (!(px > 0)) return
  q._anchor = px
  if (m.regularMarketDayHigh != null) q.dayHigh = m.regularMarketDayHigh
  if (m.regularMarketDayLow != null) q.dayLow = m.regularMarketDayLow
  if (m.chartPreviousClose != null) q.prevClose = m.chartPreviousClose
  if (m.regularMarketVolume != null) q.volume = m.regularMarketVolume
  const closes = (r.indicators?.quote?.[0]?.close || []).filter((x) => x != null)
  if (m.regularMarketOpen != null) q.open = m.regularMarketOpen
  else if (closes.length) q.open = closes[0]
  if (closes.length > 2) q.history = closes.slice(-HISTORY_LEN)
  pushPrice(q, px, 'live')
}

async function pullYahoo(defs) {
  let hit = false
  const CONC = 6
  for (let i = 0; i < defs.length; i += CONC) {
    const slice = defs.slice(i, i + CONC)
    const results = await Promise.all(
      slice.map(async (def) => {
        const r = await fetchYahoo(yahooSymbol(def))
        if (!r) return false
        applyYahoo(quotes.get(def.symbol), r)
        return true
      })
    )
    if (results.some(Boolean)) hit = true
  }
  return hit
}

async function pullFinnhub() {
  if (!finnhubKey) return false
  // full equity universe each tick: 20 quote calls/min, inside the free
  // 60 req/min limit even alongside the news pull
  const targets = UNIVERSE.filter((s) => s.cls === 'equity')
  let hit = false
  await Promise.all(
    targets.map(async (s) => {
      try {
        const d = await fetchJson(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s.symbol)}&token=${finnhubKey}`
        )
        if (!d?.c) return
        const q = quotes.get(s.symbol)
        q._anchor = d.c
        q.open = d.o || q.open
        q.dayHigh = d.h || q.dayHigh
        q.dayLow = d.l || q.dayLow
        q.prevClose = d.pc || q.prevClose
        pushPrice(q, d.c, 'live')
        hit = true
      } catch {
        /* per-symbol failure tolerated */
      }
    })
  )
  return hit
}

async function tick() {
  // 1) crypto — most reliable no-key live feed (CoinGecko → Binance)
  await pullCrypto().catch(() => {})
  // 2) FX daily reference as a baseline (Yahoo intraday overrides below)
  await pullFx().catch(() => {})
  // 3) Yahoo — real intraday for indices, equities, FX, commodities, futures.
  //    Priority symbols (tape + watchlist) every tick; the rest rotate.
  const prio = new Set([...ALWAYS_PRIORITY, ...extraPriority])
  const nonCrypto = UNIVERSE.filter((d) => d.cls !== 'crypto')
  const priorityDefs = nonCrypto.filter((d) => prio.has(d.symbol))
  const restDefs = nonCrypto.filter((d) => !prio.has(d.symbol))
  const WINDOW = 14
  const pages = Math.max(1, Math.ceil(restDefs.length / WINDOW))
  const start = (rotateOffset % pages) * WINDOW
  rotateOffset++
  const restSlice = restDefs.slice(start, start + WINDOW)
  await pullYahoo([...priorityDefs, ...restSlice]).catch(() => {})
  // 4) Finnhub override for US equities when a key is configured
  if (finnhubKey) await pullFinnhub().catch(() => {})

  // sim-step everything that did not just get a fresh print this tick
  const now = Date.now()
  for (const q of quotes.values()) {
    if (now - q.ts > 5000) simStep(q)
  }
  liveCounts = { live: 0, ref: 0, sim: 0 }
  for (const q of quotes.values()) liveCounts[q.source] = (liveCounts[q.source] ?? 0) + 1
  lastSync = now
  emit()
}

function emit() {
  for (const cb of listeners) cb()
}

// ── public API ──
export function startEngine(opts = {}) {
  if (quotes.size === 0) for (const def of UNIVERSE) quotes.set(def.symbol, seedQuote(def))
  configureEngine(opts)
  if (!timer) {
    tick()
    timer = setInterval(tick, refreshMs)
  }
}

export function configureEngine({ refresh, key, proxy } = {}) {
  if (key !== undefined) finnhubKey = key
  if (proxy !== undefined) corsProxy = proxy
  if (refresh && refresh !== refreshMs) {
    refreshMs = refresh
    if (timer) {
      clearInterval(timer)
      timer = setInterval(tick, refreshMs)
    }
  }
}

// symbols the UI wants refreshed every tick (e.g. the current watchlist)
export function setPriority(symbols) {
  extraPriority = Array.isArray(symbols) ? symbols : []
}

export function subscribeMarket(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export const getQuote = (sym) => quotes.get(sym)
export const getQuotes = (syms) => syms.map((s) => quotes.get(s)).filter(Boolean)
export const getAllQuotes = () => [...quotes.values()]
export const getByClass = (cls) => [...quotes.values()].filter((q) => q.cls === cls)
export const getLastSync = () => lastSync
export const getFeedStatus = () => ({ ...liveCounts, lastSync, refreshMs })
export const forceTick = () => tick()

// micro-tick a single symbol (terminal tape texture between minute syncs)
export function microTick(sym) {
  const q = quotes.get(sym)
  if (!q) return null
  const vol = (CLASS_VOL[q.cls] ?? 0.0005) * 0.35
  const next = q.price * (1 + (q._rng() - 0.5) * 2 * vol)
  pushPrice(q, next)
  return q
}

// ── OHLC candle generation for the charting workstation ──
// Deterministic per symbol+timeframe; final bar converges to the current price.
const TF_MINUTES = { '1m': 1, '5m': 5, '15m': 15, '1H': 60, '4H': 240, '1D': 1440, '1W': 10080 }

export function getCandles(sym, tf = '1D', bars = 260) {
  const def = bySymbol[sym]
  const q = quotes.get(sym)
  if (!def) return []
  const rng = mulberry32(hashStr(sym + tf) ^ daySeed())
  const step = (TF_MINUTES[tf] ?? 1440) * 60
  const vol = (CLASS_VOL[def.cls] ?? 0.0005) * Math.sqrt(TF_MINUTES[tf] ?? 1440)
  const endPrice = q?.price ?? def.base
  const now = Math.floor(Date.now() / 1000)
  const t0 = now - bars * step

  // build a forward walk then scale so it terminates at endPrice
  let p = def.base * (1 + (rng() - 0.5) * 10 * vol)
  const closes = []
  for (let i = 0; i < bars; i++) {
    p = p * (1 + (rng() - 0.5) * 2 * vol + ((def.base - p) / def.base) * 0.01)
    closes.push(p)
  }
  const scale = endPrice / closes[closes.length - 1]
  const out = []
  let prevClose = closes[0] * scale
  for (let i = 0; i < bars; i++) {
    const close = closes[i] * scale
    const open = prevClose
    const wick = Math.abs(close - open) + close * vol * 0.6
    out.push({
      time: t0 + i * step,
      open: round(open, def.digits),
      high: round(Math.max(open, close) + wick * rng() * 0.6, def.digits),
      low: round(Math.min(open, close) - wick * rng() * 0.6, def.digits),
      close: round(close, def.digits),
      volume: Math.floor((0.3 + rng()) * volumeScale(def) * 0.01),
    })
    prevClose = close
  }
  return out
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d

// ── live OHLC candles from Yahoo (same proxy chain) for the chart workstation ──
const TF_YAHOO = {
  '5m': { range: '5d', interval: '5m' },
  '15m': { range: '1mo', interval: '15m' },
  '1H': { range: '3mo', interval: '60m' },
  '4H': { range: '1y', interval: '60m' }, // Yahoo has no 4h; hourly is the closest live grain
  '1D': { range: '2y', interval: '1d' },
  '1W': { range: '10y', interval: '1wk' },
}

export async function getLiveCandles(sym, tf = '1D') {
  const def = bySymbol[sym]
  if (!def) return null
  const { range, interval } = TF_YAHOO[tf] ?? TF_YAHOO['1D']
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol(def)
  )}?range=${range}&interval=${interval}`
  for (const url of yahooUrls(target)) {
    const isApi = url.startsWith('/api/yahoo')
    try {
      const j = await fetchJson(url, {}, 9000)
      const r = j?.chart?.result?.[0]
      if (!r?.timestamp?.length) continue
      const qd = r.indicators?.quote?.[0]
      if (!qd) continue
      const out = []
      for (let i = 0; i < r.timestamp.length; i++) {
        const o = qd.open?.[i], h = qd.high?.[i], l = qd.low?.[i], c = qd.close?.[i]
        if (o == null || c == null || h == null || l == null) continue
        out.push({
          time: r.timestamp[i],
          open: round(o, def.digits),
          high: round(h, def.digits),
          low: round(l, def.digits),
          close: round(c, def.digits),
          volume: Math.floor(qd.volume?.[i] || 0),
        })
      }
      if (out.length > 3) {
        if (isApi) apiProxyOk = true
        return out
      }
    } catch {
      if (isApi) apiProxyOk = false
    }
  }
  return null
}

// simple order-book synthesis around current price (terminal DOM)
export function getOrderBook(sym, levels = 12) {
  const q = quotes.get(sym)
  if (!q) return { bids: [], asks: [] }
  const spreadBp = q.cls === 'fx' ? 0.2 : q.cls === 'crypto' ? 0.8 : 1.2
  const mid = q.price
  const tickSz = mid * (spreadBp / 10000)
  const rng = mulberry32(hashStr(sym) ^ Math.floor(Date.now() / 3000))
  const mk = (side) =>
    Array.from({ length: levels }, (_, i) => {
      const px = side === 'bid' ? mid - tickSz * (i + 1) : mid + tickSz * (i + 1)
      const size = Math.floor((0.25 + rng()) * (q.cls === 'equity' ? 2600 : q.cls === 'fx' ? 8_000_000 : 42) * (1 + (levels - i) * 0.16))
      return { price: px, size }
    })
  return { bids: mk('bid'), asks: mk('ask'), mid, spread: tickSz * 2 }
}
