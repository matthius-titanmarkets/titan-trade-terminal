// TITAN TERMINAL — institutional workstation. Professional accounts only.
// Deliberately darker and denser than the retail surfaces: near-black base,
// mono typography, command line, L2 depth, time & sales, squawk, boards.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import { getQuote, getQuotes, getByClass, microTick, getOrderBook, getFeedStatus } from '../lib/marketData.js'
import { bySymbol } from '../lib/universe.js'
import { getNews, squawkFallback } from '../lib/news.js'
import { fmtPrice, fmtPct, fmtTime, fmtCompact, upDownClass, classNames } from '../lib/format.js'

const CLOCKS = [
  ['CHICAGO', 'America/Chicago'],
  ['NEW YORK', 'America/New_York'],
  ['LONDON', 'Europe/London'],
  ['TOKYO', 'Asia/Tokyo'],
]

export default function Terminal() {
  const { session, settings, marketRev } = useStore()
  const [focus, setFocus] = useState('ES')
  const [cmd, setCmd] = useState('')
  const [cmdError, setCmdError] = useState('')
  const [tape, setTape] = useState([])
  const [squawk, setSquawk] = useState(squawkFallback())
  const [, setClockTick] = useState(0)
  const inputRef = useRef(null)

  const q = getQuote(focus)
  const book = useMemo(() => getOrderBook(focus, 10), [focus, marketRev, tape.length])
  const futures = useMemo(() => getByClass('future'), [marketRev])
  const fx = useMemo(() => getByClass('fx'), [marketRev])
  const indices = useMemo(() => getQuotes(['SPX', 'NDX', 'DJI', 'RUT', 'VIX', 'DAX', 'FTSE', 'N225']), [marketRev])
  const feed = getFeedStatus()

  // micro-tick tape for the focus symbol (market microstructure texture)
  useEffect(() => {
    setTape([])
    const t = setInterval(() => {
      const upd = microTick(focus)
      if (!upd) return
      setTape((rows) =>
        [
          {
            ts: Date.now(),
            px: upd.price,
            size: Math.max(1, Math.floor(Math.abs(Math.sin(Date.now() / 700)) * (upd.cls === 'fx' ? 900 : 480)) * (upd.cls === 'future' ? 1 : 10)),
            side: upd.dir >= 0 ? 'B' : 'S',
          },
          ...rows,
        ].slice(0, 26)
      )
    }, 1800)
    return () => clearInterval(t)
  }, [focus])

  // clock re-render + squawk refresh
  useEffect(() => {
    const c = setInterval(() => setClockTick((x) => x + 1), 1000)
    const s = setInterval(async () => {
      const wire = await getNews({ finnhubKey: settings.finnhubKey })
      setSquawk(wire.items.slice(0, 18))
    }, 90_000)
    getNews({ finnhubKey: settings.finnhubKey }).then((w) => setSquawk(w.items.slice(0, 18)))
    return () => {
      clearInterval(c)
      clearInterval(s)
    }
  }, [settings.finnhubKey])

  const runCmd = (e) => {
    e.preventDefault()
    const raw = cmd.trim().toUpperCase().replace(/\s*<GO>$/, '').trim()
    if (!raw) return
    if (bySymbol[raw]) {
      setFocus(raw)
      setCmdError('')
      setCmd('')
    } else {
      setCmdError(`UNKNOWN SECURITY: ${raw}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="-m-3 md:-m-5 min-h-full bg-obsidian-950 grid-backdrop font-mono text-ink p-3 md:p-4 space-y-3"
    >
      {/* ── terminal masthead ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border border-titan-gold/25 bg-obsidian-900/80 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-market-up animate-pulseDot" />
          <span className="text-titan-bright font-semibold tracking-wide2 text-xs">TITAN TERMINAL</span>
          <span className="text-3xs text-ink-faint border border-line-strong rounded px-1.5 py-px">INSTITUTIONAL</span>
        </div>
        <div className="text-3xs text-ink-dim">
          {session?.desk?.toUpperCase() ?? 'DESK'} · {session?.name?.toUpperCase()}
        </div>
        <div className="flex-1" />
        <div className="hidden lg:flex items-center gap-4">
          {CLOCKS.map(([city, tz]) => (
            <div key={city} className="text-right leading-tight">
              <div className="text-3xs text-ink-faint">{city}</div>
              <div className="text-2xs text-ink tabular">
                {new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-3xs text-ink-dim tabular">
          FEED {feed.live > 0 ? <span className="text-market-up">{feed.live} LIVE</span> : <span className="text-accent-amber">REF</span>} ·{' '}
          {Math.round(feed.refreshMs / 1000)}S CYCLE
        </div>
      </div>

      {/* ── command line ── */}
      <form
        onSubmit={runCmd}
        className="flex items-center gap-3 bg-obsidian-900 border border-line-strong rounded-lg px-4 py-2.5 focus-within:border-titan-gold/60 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-titan-gold text-xs font-semibold">CMD&gt;</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={(e) => {
            setCmd(e.target.value)
            setCmdError('')
          }}
          placeholder={`enter security, e.g. NQ <GO>   ·   current: ${focus}`}
          className="flex-1 bg-transparent outline-none text-xs text-ink placeholder:text-ink-faint uppercase tracking-wider"
          spellCheck={false}
        />
        {cmdError ? <span className="text-3xs text-market-down">{cmdError}</span> : <span className="text-3xs text-ink-faint hidden sm:block">ENTER ⏎</span>}
      </form>

      {/* ── focus strip ── */}
      {q && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-obsidian-900 border border-line rounded-lg px-4 py-3">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-bold text-titan-bright tracking-wider">{q.symbol}</span>
              <span className={classNames('text-2xl font-semibold tabular', upDownClass(q.changePct))}>{fmtPrice(q.price, q.digits)}</span>
              <span className={classNames('text-sm tabular', upDownClass(q.changePct))}>
                {q.change >= 0 ? '+' : ''}{fmtPrice(q.change, q.digits)} ({fmtPct(q.changePct)})
              </span>
            </div>
            <div className="text-3xs text-ink-dim mt-0.5 tracking-wider uppercase">{q.name} · {q.exch ?? q.cls}</div>
          </div>
          <div className="flex gap-6 ml-auto text-2xs tabular">
            <TermStat l="OPEN" v={fmtPrice(q.open, q.digits)} />
            <TermStat l="HIGH" v={fmtPrice(q.dayHigh, q.digits)} up />
            <TermStat l="LOW" v={fmtPrice(q.dayLow, q.digits)} down />
            <TermStat l="VOL" v={fmtCompact(q.volume)} />
            <TermStat l="SRC" v={q.source.toUpperCase()} gold />
          </div>
        </div>
      )}

      {/* ── main grid: DOM · tape · squawk ── */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* L2 depth */}
        <TermPanel title={`LEVEL 2 · ${focus}`} sub={`SPREAD ${fmtPrice(book.spread, q?.digits)}`}>
          <div className="grid grid-cols-2 text-3xs text-ink-faint px-3 pt-2 pb-1 tracking-wider">
            <span>BID SIZE / PX</span>
            <span className="text-right">PX / ASK SIZE</span>
          </div>
          <div className="px-3 pb-3 space-y-px text-2xs tabular">
            {book.bids.map((b, i) => {
              const a = book.asks[i]
              const max = Math.max(...book.bids.map((x) => x.size), ...book.asks.map((x) => x.size))
              return (
                <div key={i} className="grid grid-cols-2 gap-1">
                  <div className="relative flex justify-between px-1.5 py-[3px] overflow-hidden rounded-sm">
                    <div className="absolute inset-y-0 right-0 bg-market-up/15" style={{ width: `${(b.size / max) * 100}%` }} />
                    <span className="text-ink-dim relative">{b.size.toLocaleString()}</span>
                    <span className="text-market-up relative">{fmtPrice(b.price, q?.digits)}</span>
                  </div>
                  <div className="relative flex justify-between px-1.5 py-[3px] overflow-hidden rounded-sm">
                    <div className="absolute inset-y-0 left-0 bg-market-down/15" style={{ width: `${(a.size / max) * 100}%` }} />
                    <span className="text-market-down relative">{fmtPrice(a.price, q?.digits)}</span>
                    <span className="text-ink-dim relative">{a.size.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </TermPanel>

        {/* time & sales */}
        <TermPanel title={`TIME & SALES · ${focus}`} sub="MICRO-PRINTS 1.8S">
          <div className="grid grid-cols-4 text-3xs text-ink-faint px-3 pt-2 pb-1 tracking-wider">
            <span>TIME</span>
            <span className="text-right">PRICE</span>
            <span className="text-right">SIZE</span>
            <span className="text-right">SIDE</span>
          </div>
          <div className="px-3 pb-3 space-y-px text-2xs tabular max-h-[340px] overflow-hidden">
            {tape.length === 0 && <div className="text-ink-faint py-6 text-center text-3xs">AWAITING PRINTS…</div>}
            {tape.map((r, i) => (
              <div key={r.ts + '-' + i} className={classNames('grid grid-cols-4 px-1 py-[3px] rounded-sm', i === 0 && (r.side === 'B' ? 'flash-up' : 'flash-down'))}>
                <span className="text-ink-faint">{fmtTime(r.ts)}</span>
                <span className={classNames('text-right', r.side === 'B' ? 'text-market-up' : 'text-market-down')}>{fmtPrice(r.px, q?.digits)}</span>
                <span className="text-right text-ink-dim">{r.size.toLocaleString()}</span>
                <span className={classNames('text-right font-semibold', r.side === 'B' ? 'text-market-up' : 'text-market-down')}>{r.side}</span>
              </div>
            ))}
          </div>
        </TermPanel>

        {/* squawk */}
        <TermPanel title="INSTITUTIONAL SQUAWK" sub="AUTO 90S">
          <div className="px-3 py-2 space-y-2.5 max-h-[380px] overflow-y-auto">
            {squawk.map((n) => (
              <a
                key={n.id}
                href={n.url ?? '#'}
                target={n.url ? '_blank' : undefined}
                rel="noreferrer"
                onClick={(e) => !n.url && e.preventDefault()}
                className="block group"
              >
                <div className="flex gap-2 items-start">
                  <span className="text-titan-gold text-3xs mt-0.5 shrink-0">▪</span>
                  <div className="min-w-0">
                    <div className="text-2xs text-ink leading-snug group-hover:text-titan-bright transition-colors line-clamp-2">{n.headline}</div>
                    <div className="text-3xs text-ink-faint mt-0.5 tracking-wider">
                      {n.source.toUpperCase()} · {fmtTime(n.ts)} {!n.live && '· SIM'}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </TermPanel>
      </div>

      {/* ── boards row ── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <Board title="GLOBAL INDICES" rows={indices} onFocus={setFocus} />
        <Board title="FUTURES BOARD" rows={futures} onFocus={setFocus} />
        <Board title="FX BOARD" rows={fx} onFocus={setFocus} className="md:col-span-2 xl:col-span-1" />
      </div>

      <div className="text-3xs text-ink-faint text-center pb-2 tracking-wider">
        TITAN MARKETS LLC · PROPRIETARY TERMINAL · DATA MIX: LIVE / REFERENCE / SIMULATED AS LABELED · NOT INVESTMENT ADVICE
      </div>
    </motion.div>
  )
}

function TermPanel({ title, sub, children }) {
  return (
    <div className="bg-obsidian-900/90 border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-soft bg-obsidian-850/80">
        <span className="text-3xs font-semibold tracking-wide2 text-titan-gold">{title}</span>
        {sub && <span className="text-3xs text-ink-faint tracking-wider">{sub}</span>}
      </div>
      {children}
    </div>
  )
}

function TermStat({ l, v, up, down, gold }) {
  return (
    <div className="text-right leading-tight">
      <div className="text-3xs text-ink-faint tracking-wider">{l}</div>
      <div className={classNames('font-medium', up ? 'text-market-up' : down ? 'text-market-down' : gold ? 'text-titan-bright' : 'text-ink')}>{v}</div>
    </div>
  )
}

function Board({ title, rows, onFocus, className = '' }) {
  return (
    <TermPanel title={title} sub={`${rows.length} INSTRUMENTS`}>
      <div className={classNames('divide-y divide-line-soft/60', className)}>
        {rows.map((r) => (
          <button
            key={r.symbol}
            onClick={() => {
              onFocus(r.symbol)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="w-full grid grid-cols-[70px_1fr_auto_auto] items-center gap-2 px-3 py-[7px] hover:bg-obsidian-800 transition-colors text-left"
          >
            <span className="text-2xs font-semibold text-ink">{r.symbol}</span>
            <span className="text-3xs text-ink-faint truncate hidden sm:block">{r.name.toUpperCase()}</span>
            <span className="text-2xs tabular text-ink text-right">{fmtPrice(r.price, r.digits)}</span>
            <span className={classNames('text-2xs tabular text-right w-[72px]', upDownClass(r.changePct))}>{fmtPct(r.changePct)}</span>
          </button>
        ))}
      </div>
    </TermPanel>
  )
}
