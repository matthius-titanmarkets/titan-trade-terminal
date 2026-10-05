// Charting workstation — candlesticks (lightweight-charts), overlays,
// timeframes, session stats, depth preview. Distinct role: single-instrument
// technical study.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createChart, CrosshairMode } from 'lightweight-charts'
import Reveal from '../components/Reveal.jsx'
import { Panel, PanelHeader, Stat, SourceBadge, Select, Tag, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getQuote, getCandles, getLiveCandles, getOrderBook } from '../lib/marketData.js'
import { UNIVERSE } from '../lib/universe.js'
import { fmtPrice, fmtPct, fmtCompact, upDownClass } from '../lib/format.js'

const TIMEFRAMES = ['5m', '15m', '1H', '4H', '1D', '1W']
const OVERLAYS = [
  { key: 'sma20', label: 'SMA 20', color: '#4C7EF3' },
  { key: 'sma50', label: 'SMA 50', color: '#8B7CF6' },
  { key: 'ema21', label: 'EMA 21', color: '#F5B93F' },
  { key: 'bb', label: 'Bollinger 20·2σ', color: '#C9A43A' },
]

export default function Charting() {
  const { marketRev, watchlist, toggleWatch, settings } = useStore()
  const [params, setParams] = useSearchParams()
  const symbol = params.get('s') || settings.defaultSymbol || 'SPX'
  const [tf, setTf] = useState('1D')
  const [overlays, setOverlays] = useState({ sma20: true, sma50: false, ema21: false, bb: false })
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef({})

  const quote = getQuote(symbol)
  const [candles, setCandles] = useState(() => getCandles(symbol, tf))
  const [candleSrc, setCandleSrc] = useState('sim') // 'live' | 'sim'
  const book = useMemo(() => getOrderBook(symbol, 8), [symbol, marketRev])

  // on symbol / timeframe change: show synthetic instantly, then swap in live OHLC
  useEffect(() => {
    let cancelled = false
    setCandles(getCandles(symbol, tf))
    setCandleSrc('sim')
    getLiveCandles(symbol, tf)
      .then((live) => {
        if (!cancelled && live && live.length > 3) {
          setCandles(live)
          setCandleSrc('live')
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [symbol, tf])

  // once per market tick, quietly refresh live candles so the chart stays current
  useEffect(() => {
    if (candleSrc !== 'live') return
    let cancelled = false
    getLiveCandles(symbol, tf)
      .then((live) => {
        if (!cancelled && live && live.length > 3) setCandles(live)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketRev])

  // chart lifecycle
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#6B7689', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 },
      grid: { vertLines: { color: '#10162255' }, horzLines: { color: '#10162255' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#C9A43A55' }, horzLine: { color: '#C9A43A55' } },
      rightPriceScale: { borderColor: '#161E30' },
      timeScale: { borderColor: '#161E30', timeVisible: true, secondsVisible: false },
      autoSize: true,
    })
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#19C784',
      downColor: '#EF4353',
      wickUpColor: '#19C784',
      wickDownColor: '#EF4353',
      borderVisible: false,
    })
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    chartRef.current = chart
    seriesRef.current = { candleSeries, volSeries, lines: {} }
    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // data + overlays
  useEffect(() => {
    const s = seriesRef.current
    if (!s.candleSeries || !candles.length) return
    s.candleSeries.setData(candles)
    s.volSeries.setData(
      candles.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#19C78433' : '#EF435333' }))
    )
    // clear old overlay lines
    for (const line of Object.values(s.lines)) chartRef.current?.removeSeries(line)
    s.lines = {}
    const addLine = (key, data, color, width = 1.4) => {
      const ls = chartRef.current.addLineSeries({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
      ls.setData(data)
      s.lines[key] = ls
    }
    const closes = candles.map((c) => c.close)
    if (overlays.sma20) addLine('sma20', maSeries(candles, closes, 20), '#4C7EF3')
    if (overlays.sma50) addLine('sma50', maSeries(candles, closes, 50), '#8B7CF6')
    if (overlays.ema21) addLine('ema21', emaSeries(candles, closes, 21), '#F5B93F')
    if (overlays.bb) {
      const { upper, lower } = bollinger(candles, closes, 20, 2)
      addLine('bbU', upper, '#C9A43A88', 1)
      addLine('bbL', lower, '#C9A43A88', 1)
    }
    chartRef.current.timeScale().fitContent()
  }, [candles, overlays])

  const setSymbol = (s) => setParams({ s })
  const range = quote ? ((quote.price - quote.dayLow) / ((quote.dayHigh - quote.dayLow) || 1)) * 100 : 50

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <Select
              value={symbol}
              onChange={setSymbol}
              className="!text-sm !py-2 font-mono"
              options={UNIVERSE.map((u) => ({ value: u.symbol, label: `${u.symbol} — ${u.name}` }))}
            />
            <button
              onClick={() => toggleWatch(symbol)}
              className={classNames('text-xl transition-colors', watchlist.includes(symbol) ? 'text-titan-gold' : 'text-ink-faint hover:text-ink-dim')}
              aria-label="Toggle watchlist"
            >
              {watchlist.includes(symbol) ? '★' : '☆'}
            </button>
            {quote && (
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-xl md:text-2xl font-semibold tabular text-ink">{fmtPrice(quote.price, quote.digits)}</span>
                <span className={classNames('font-mono text-sm tabular font-medium', upDownClass(quote.changePct))}>
                  {fmtPct(quote.changePct)}
                </span>
                <SourceBadge source={quote.source} />
              </div>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-line-strong p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={classNames(
                  'px-2.5 py-1.5 rounded-md font-mono text-xs transition-all',
                  tf === t ? 'bg-titan-faint text-titan-bright' : 'text-ink-dim hover:text-ink'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-4 gap-4">
        <Reveal className="lg:col-span-3" delay={0.05}>
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line-soft">
              <span className="label-caps mr-1">Overlays</span>
              {OVERLAYS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setOverlays((ov) => ({ ...ov, [o.key]: !ov[o.key] }))}
                  className={classNames(
                    'px-2.5 py-1 rounded-md text-2xs font-mono border transition-all',
                    overlays[o.key] ? 'border-transparent text-obsidian-950 font-semibold' : 'border-line-strong text-ink-dim hover:text-ink'
                  )}
                  style={overlays[o.key] ? { background: o.color } : {}}
                >
                  {o.label}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-2 text-3xs text-ink-faint font-mono">
                <SourceBadge source={candleSrc} />
                {candles.length} bars · {tf}
              </span>
            </div>
            <div ref={containerRef} className="h-[380px] md:h-[480px] w-full" />
          </Panel>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.1}>
            <Panel>
              <PanelHeader title="Session Statistics" hint={quote?.name} />
              <div className="p-4 grid grid-cols-2 gap-x-3 gap-y-4">
                <Stat label="Open" value={fmtPrice(quote?.open, quote?.digits)} />
                <Stat label="Prev Close" value={fmtPrice(quote?.prevClose, quote?.digits)} />
                <Stat label="Day High" value={fmtPrice(quote?.dayHigh, quote?.digits)} tone="up" />
                <Stat label="Day Low" value={fmtPrice(quote?.dayLow, quote?.digits)} tone="down" />
                <Stat label="Volume" value={fmtCompact(quote?.volume)} />
                <Stat label="Range Position" value={`${range.toFixed(0)}%`} />
              </div>
              <div className="px-4 pb-4">
                <div className="h-1.5 rounded-full bg-obsidian-600 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-market-down via-accent-amber to-market-up transition-all duration-700" style={{ width: `${range}%` }} />
                </div>
                <div className="flex justify-between text-3xs font-mono text-ink-faint mt-1">
                  <span>LOW</span>
                  <span>HIGH</span>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel>
              <PanelHeader title="Depth Preview" hint="Synthesized book · full DOM in Terminal" right={<Tag tone="gold">L2</Tag>} />
              <div className="p-3 font-mono text-2xs tabular">
                {[...book.asks].reverse().map((a, i) => (
                  <DepthRow key={`a${i}`} side="ask" px={a.price} size={a.size} digits={quote?.digits} max={maxSize(book)} />
                ))}
                <div className="flex justify-between items-center py-1.5 px-2 my-1 rounded bg-obsidian-700 border border-line-soft">
                  <span className="text-titan-bright font-semibold">{fmtPrice(book.mid, quote?.digits)}</span>
                  <span className="text-ink-faint">spread {fmtPrice(book.spread, quote?.digits)}</span>
                </div>
                {book.bids.map((b, i) => (
                  <DepthRow key={`b${i}`} side="bid" px={b.price} size={b.size} digits={quote?.digits} max={maxSize(book)} />
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

const maxSize = (book) => Math.max(...book.bids.map((b) => b.size), ...book.asks.map((a) => a.size), 1)

function DepthRow({ side, px, size, digits, max }) {
  const w = Math.max(4, (size / max) * 100)
  return (
    <div className="relative flex justify-between items-center py-[3px] px-2 rounded-sm overflow-hidden">
      <div
        className={classNames('absolute inset-y-0 right-0 opacity-20', side === 'ask' ? 'bg-market-down' : 'bg-market-up')}
        style={{ width: `${w}%` }}
      />
      <span className={side === 'ask' ? 'text-market-down' : 'text-market-up'}>{fmtPrice(px, digits)}</span>
      <span className="text-ink-dim relative">{size.toLocaleString()}</span>
    </div>
  )
}

// ── indicator math ──
function maSeries(candles, closes, n) {
  const out = []
  for (let i = n - 1; i < closes.length; i++) {
    let s = 0
    for (let j = i - n + 1; j <= i; j++) s += closes[j]
    out.push({ time: candles[i].time, value: s / n })
  }
  return out
}

function emaSeries(candles, closes, n) {
  const k = 2 / (n + 1)
  let ema = closes[0]
  const out = []
  for (let i = 0; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    if (i >= n - 1) out.push({ time: candles[i].time, value: ema })
  }
  return out
}

function bollinger(candles, closes, n, mult) {
  const upper = []
  const lower = []
  for (let i = n - 1; i < closes.length; i++) {
    let s = 0
    for (let j = i - n + 1; j <= i; j++) s += closes[j]
    const mean = s / n
    let v = 0
    for (let j = i - n + 1; j <= i; j++) v += (closes[j] - mean) ** 2
    const sd = Math.sqrt(v / n)
    upper.push({ time: candles[i].time, value: mean + mult * sd })
    lower.push({ time: candles[i].time, value: mean - mult * sd })
  }
  return { upper, lower }
}
