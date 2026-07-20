// Markets — the full live universe. Distinct role: discovery, comparison,
// sorting, heatmap; charts live on Charting, portfolio on Portfolio.
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import LiveBanner from '../components/LiveBanner.jsx'
import { Panel, PanelHeader, Sparkline, SourceBadge, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getAllQuotes, getFeedStatus } from '../lib/marketData.js'
import { ASSET_CLASSES } from '../lib/universe.js'
import { fmtPrice, fmtPct, fmtCompact, fmtAgo, upDownClass } from '../lib/format.js'

const CLASS_TABS = [
  { key: 'all', label: 'All Markets' },
  { key: 'index', label: 'Indices' },
  { key: 'equity', label: 'Equities' },
  { key: 'fx', label: 'FX' },
  { key: 'crypto', label: 'Digital Assets' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'future', label: 'Futures' },
]

export default function Markets() {
  const { watchlist, toggleWatch, marketRev } = useStore()
  const navigate = useNavigate()
  const [cls, setCls] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'symbol', dir: 1 })
  const [view, setView] = useState('table') // table | heatmap

  const rows = useMemo(() => {
    let all = getAllQuotes()
    if (cls !== 'all') all = all.filter((q) => q.cls === cls)
    if (query) {
      const q = query.toLowerCase()
      all = all.filter((r) => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
    }
    const dir = sort.dir
    all.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string') return av.localeCompare(bv) * dir
      return (av - bv) * dir
    })
    return all
  }, [cls, query, sort, marketRev])

  const feed = getFeedStatus()

  const setSortKey = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'symbol' ? 1 : -1 }))

  return (
    <div className="space-y-4">
      <LiveBanner />
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-titan-gold">Global Coverage</div>
            <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Markets</h1>
            <p className="text-xs text-ink-dim mt-1">
              {rows.length} instruments · refresh {Math.round(feed.refreshMs / 1000)}s
              {feed.lastSync ? ` · last sync ${fmtAgo(feed.lastSync)}` : ''} · {feed.live} live / {feed.ref} reference / {feed.sim} simulated
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name…"
              className="input-dark !w-52 !py-2 text-xs"
            />
            <div className="flex rounded-lg border border-line-strong overflow-hidden">
              {['table', 'heatmap'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={classNames(
                    'px-3 py-2 text-xs font-medium capitalize transition-colors',
                    view === v ? 'bg-titan-faint text-titan-bright' : 'text-ink-dim hover:text-ink'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {CLASS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCls(t.key)}
              className={classNames(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border',
                cls === t.key
                  ? 'bg-titan-faint text-titan-bright border-titan-gold/30'
                  : 'text-ink-dim border-line hover:text-ink hover:border-line-strong'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      {view === 'table' ? (
        <Reveal delay={0.08}>
          <Panel className="overflow-hidden">
            <div className="mobile-scroll-x">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-line bg-obsidian-850/60">
                  <tr>
                    <th className="th-cell w-8"></th>
                    <Th label="Symbol" k="symbol" sort={sort} onSort={setSortKey} />
                    <th className="th-cell">Instrument</th>
                    <Th label="Last" k="price" sort={sort} onSort={setSortKey} right />
                    <Th label="Chg %" k="changePct" sort={sort} onSort={setSortKey} right />
                    <Th label="Day High" k="dayHigh" sort={sort} onSort={setSortKey} right />
                    <Th label="Day Low" k="dayLow" sort={sort} onSort={setSortKey} right />
                    <Th label="Volume" k="volume" sort={sort} onSort={setSortKey} right />
                    <th className="th-cell text-right">Intraday</th>
                    <th className="th-cell text-center">Feed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {rows.map((q) => (
                    <tr key={q.symbol} className="hover:bg-obsidian-750 transition-colors cursor-pointer" onClick={() => navigate(`/app/charts?s=${q.symbol}`)}>
                      <td className="td-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleWatch(q.symbol)
                          }}
                          className={classNames('text-base leading-none transition-colors', watchlist.includes(q.symbol) ? 'text-titan-gold' : 'text-ink-faint hover:text-ink-dim')}
                          aria-label="Toggle watchlist"
                        >
                          {watchlist.includes(q.symbol) ? '★' : '☆'}
                        </button>
                      </td>
                      <td className="td-cell font-mono font-semibold text-ink">{q.symbol}</td>
                      <td className="td-cell text-ink-soft max-w-[190px] truncate">
                        {q.name}
                        <span className="text-ink-faint text-2xs ml-1.5">{q.exch ?? ASSET_CLASSES[q.cls]}</span>
                      </td>
                      <td className="td-cell text-right font-mono tabular text-ink">{fmtPrice(q.price, q.digits)}</td>
                      <td className={classNames('td-cell text-right font-mono tabular font-medium', upDownClass(q.changePct))}>{fmtPct(q.changePct)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-soft">{fmtPrice(q.dayHigh, q.digits)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-soft">{fmtPrice(q.dayLow, q.digits)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-dim">{fmtCompact(q.volume)}</td>
                      <td className="td-cell">
                        <div className="flex justify-end">
                          <Sparkline data={q.history.slice(-48)} width={84} height={26} tone={q.changePct} />
                        </div>
                      </td>
                      <td className="td-cell text-center">
                        <SourceBadge source={q.source} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      ) : (
        <Reveal delay={0.08}>
          <Panel className="p-4">
            <PanelHeader title="Performance Heatmap" hint="Tile size ∝ |move| · tap to chart" className="!px-0 !pt-0" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 mt-3">
              {rows.map((q) => {
                const mag = Math.min(Math.abs(q.changePct) / 2.5, 1)
                const bg = q.changePct >= 0 ? `rgba(25,199,132,${0.10 + mag * 0.5})` : `rgba(239,67,83,${0.10 + mag * 0.5})`
                return (
                  <button
                    key={q.symbol}
                    onClick={() => navigate(`/app/charts?s=${q.symbol}`)}
                    className="rounded-lg border border-line p-3 text-left hover:border-titan-gold/40 transition-all duration-150"
                    style={{ background: bg }}
                  >
                    <div className="font-mono text-sm font-bold text-ink">{q.symbol}</div>
                    <div className="font-mono text-xs tabular text-ink/90 mt-1">{fmtPrice(q.price, q.digits)}</div>
                    <div className={classNames('font-mono text-2xs tabular font-semibold mt-0.5', q.changePct >= 0 ? 'text-market-up' : 'text-market-down')}>
                      {fmtPct(q.changePct)}
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </Reveal>
      )}
    </div>
  )
}

function Th({ label, k, sort, onSort, right }) {
  const active = sort.key === k
  return (
    <th className={classNames('th-cell cursor-pointer select-none hover:text-ink transition-colors', right && 'text-right')} onClick={() => onSort(k)}>
      {label} {active ? (sort.dir === 1 ? '↑' : '↓') : ''}
    </th>
  )
}
