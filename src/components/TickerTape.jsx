// Live scrolling ticker tape pinned above the workspace.
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuotes } from '../lib/marketData.js'
import { useStore } from '../lib/store.jsx'
import { fmtPrice, fmtPct, upDownClass, classNames } from '../lib/format.js'

const TAPE_SYMBOLS = ['SPX', 'NDX', 'DJI', 'RUT', 'VIX', 'ES', 'NQ', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'WTI', 'DAX', 'N225']

export default function TickerTape() {
  const { marketRev } = useStore()
  const navigate = useNavigate()
  const quotes = useMemo(() => getQuotes(TAPE_SYMBOLS), [marketRev])
  if (!quotes.length) return null
  const items = [...quotes, ...quotes] // duplicated for seamless loop

  return (
    <div className="relative overflow-hidden border-b border-line-soft bg-obsidian-950/80 tape-mask select-none" aria-hidden>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] py-1.5">
        {items.map((q, i) => (
          <button
            key={`${q.symbol}-${i}`}
            onClick={() => navigate(`/app/charts?s=${q.symbol}`)}
            className="flex items-center gap-2 px-4 border-r border-line-soft/60 shrink-0 group"
          >
            <span className="font-mono text-2xs font-semibold text-ink-soft group-hover:text-titan-bright transition-colors">
              {q.symbol}
            </span>
            <span className="font-mono text-2xs tabular text-ink">{fmtPrice(q.price, q.digits)}</span>
            <span className={classNames('font-mono text-3xs tabular', upDownClass(q.changePct))}>
              {q.changePct > 0 ? '▲' : q.changePct < 0 ? '▼' : '■'} {fmtPct(q.changePct, 2, false)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
