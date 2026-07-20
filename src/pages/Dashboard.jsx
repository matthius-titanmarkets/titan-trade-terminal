// Overview — portfolio state at a glance. Distinct role: summary + jump-off
// point; deep detail lives on Portfolio/Analytics/Markets pages.
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Reveal, { RevealStagger } from '../components/Reveal.jsx'
import LiveBanner from '../components/LiveBanner.jsx'
import { Panel, PanelHeader, Stat, DeltaBadge, Sparkline, SourceBadge, Tag, GoldDivider } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getQuote, getQuotes, getAllQuotes, getLastSync } from '../lib/marketData.js'
import { computeStats } from '../lib/calc.js'
import { tradePnl, tradeNotional } from '../lib/trades.js'
import { fmtMoney, fmtSignedMoney, fmtPrice, fmtPct, fmtAgo, upDownClass, classNames } from '../lib/format.js'

const GOLD = '#C9A43A'
const PIE_COLORS = ['#C9A43A', '#4C7EF3', '#19C784', '#8B7CF6', '#F5B93F', '#EF4353']

export default function Dashboard() {
  const { session, trades, watchlist, settings, marketRev, isPro } = useStore()
  const navigate = useNavigate()

  const stats = useMemo(() => computeStats(trades), [trades])
  const open = useMemo(() => trades.filter((t) => t.status === 'open'), [trades])

  const { openPnl, exposure, alloc } = useMemo(() => {
    let pnl = 0
    let gross = 0
    const byClass = new Map()
    for (const t of open) {
      const q = getQuote(t.symbol)
      const mark = q?.price ?? t.entry
      pnl += tradePnl(t, mark)
      const notional = tradeNotional(t, mark)
      gross += notional
      byClass.set(t.assetClass, (byClass.get(t.assetClass) ?? 0) + notional)
    }
    const alloc = [...byClass.entries()].map(([name, value]) => ({ name, value }))
    return { openPnl: pnl, exposure: gross, alloc }
  }, [open, marketRev])

  const equity = settings.accountEquity + stats.net + openPnl
  const dayPnl = openPnl // marked-to-market on open book
  const watch = useMemo(() => getQuotes(watchlist), [watchlist, marketRev])
  const movers = useMemo(() => {
    const all = getAllQuotes().filter((q) => q.cls === 'equity' || q.cls === 'crypto')
    return [...all].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 6)
  }, [marketRev])

  const curveData = stats.curve.map((p) => ({ ...p, equity: settings.accountEquity + p.equity }))
  const lastSync = getLastSync()

  return (
    <div className="space-y-4 md:space-y-5">
      <LiveBanner />
      {/* ── heading ── */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-titan-gold">Portfolio Overview</div>
            <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">
              {greeting()}, {session?.name?.split(' ')[0]}
            </h1>
            <p className="text-xs text-ink-dim mt-1">
              {isPro ? `${session?.desk ?? 'Institutional desk'} · marked-to-market view` : 'Retail account · marked-to-market view'}
              {lastSync ? ` · data sync ${fmtAgo(lastSync)}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/app/trades')} className="btn-ghost px-3.5 py-2 text-xs">Log a trade</button>
            <button onClick={() => navigate('/app/markets')} className="btn-gold px-3.5 py-2 text-xs">Open Markets</button>
          </div>
        </div>
      </Reveal>

      {/* ── headline stats ── */}
      <RevealStagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Panel className="p-4">
          <Stat label="Account Equity" value={fmtMoney(equity, 0)} big tone="gold" sub={`Base ${fmtMoney(settings.accountEquity, 0)}`} />
        </Panel>
        <Panel className="p-4">
          <Stat
            label="Open P&L"
            value={fmtSignedMoney(dayPnl, 0)}
            big
            tone={dayPnl >= 0 ? 'up' : 'down'}
            sub={`${open.length} open position${open.length === 1 ? '' : 's'}`}
          />
        </Panel>
        <Panel className="p-4">
          <Stat
            label="Realized P&L"
            value={fmtSignedMoney(stats.net, 0)}
            big
            tone={stats.net >= 0 ? 'up' : 'down'}
            sub={`${stats.count} closed trades`}
          />
        </Panel>
        <Panel className="p-4">
          <Stat label="Gross Exposure" value={fmtMoney(exposure, 0)} big sub={`${((exposure / equity) * 100).toFixed(0)}% of equity`} />
        </Panel>
      </RevealStagger>

      {/* ── equity curve + allocation ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Equity Curve"
              hint="Realized P&L compounded on account base"
              right={<Tag tone="gold">{fmtPct(((equity - settings.accountEquity) / settings.accountEquity) * 100)}</Tag>}
            />
            <div className="h-56 md:h-64 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curveData} margin={{ top: 6, right: 12, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="eqGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tickLine={false} axisLine={false} width={58} domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmtMoney(v, 0)} labelStyle={{ color: '#8A93A6' }} />
                  <Area type="monotone" dataKey="equity" stroke={GOLD} strokeWidth={1.8} fill="url(#eqGold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel className="h-full flex flex-col">
            <PanelHeader title="Open Exposure Mix" hint="Gross notional by asset class" />
            <div className="flex-1 flex items-center px-4 py-3 gap-4">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alloc} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3} stroke="none">
                      {alloc.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {alloc.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="capitalize text-ink-soft flex-1 truncate">{a.name}</span>
                    <span className="font-mono tabular text-ink-dim">{((a.value / (exposure || 1)) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 pb-4">
              <GoldDivider className="mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Win rate" value={`${stats.winRate.toFixed(0)}%`} />
                <Stat label="Profit factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} />
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>

      {/* ── watchlist + movers + positions strip ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal>
          <Panel>
            <PanelHeader
              title="Watchlist"
              hint="Tap a row to open its chart"
              right={
                <button onClick={() => navigate('/app/markets')} className="text-2xs text-titan-gold hover:text-titan-bright transition-colors">
                  Manage →
                </button>
              }
            />
            <div className="divide-y divide-line-soft">
              {watch.map((q) => (
                <button
                  key={q.symbol}
                  onClick={() => navigate(`/app/charts?s=${q.symbol}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-obsidian-750 transition-colors"
                >
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-mono text-sm font-semibold text-ink flex items-center gap-1.5">
                      {q.symbol} <SourceBadge source={q.source} />
                    </div>
                    <div className="text-2xs text-ink-dim truncate">{q.name}</div>
                  </div>
                  <Sparkline data={q.history.slice(-40)} width={72} height={26} tone={q.changePct} />
                  <div className="text-right w-24">
                    <div className="font-mono text-sm tabular text-ink">{fmtPrice(q.price, q.digits)}</div>
                    <div className={classNames('font-mono text-2xs tabular', upDownClass(q.changePct))}>{fmtPct(q.changePct)}</div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <PanelHeader title="Top Movers" hint="Largest absolute moves today" />
            <div className="divide-y divide-line-soft">
              {movers.map((q) => (
                <button
                  key={q.symbol}
                  onClick={() => navigate(`/app/charts?s=${q.symbol}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-obsidian-750 transition-colors"
                >
                  <span className="font-mono text-sm font-semibold text-ink w-20 text-left">{q.symbol}</span>
                  <span className="text-2xs text-ink-dim flex-1 text-left truncate">{q.name}</span>
                  <DeltaBadge value={q.changePct} />
                </button>
              ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.12}>
          <Panel>
            <PanelHeader
              title="Open Positions"
              hint="Marked against live prices"
              right={
                <button onClick={() => navigate('/app/portfolio')} className="text-2xs text-titan-gold hover:text-titan-bright transition-colors">
                  Full book →
                </button>
              }
            />
            <div className="divide-y divide-line-soft">
              {open.slice(0, 6).map((t) => {
                const q = getQuote(t.symbol)
                const pnl = tradePnl(t, q?.price ?? t.entry)
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Tag tone={t.side === 'long' ? 'up' : 'down'}>{t.side.toUpperCase()}</Tag>
                    <span className="font-mono text-sm font-semibold text-ink flex-1">{t.symbol}</span>
                    <span className={classNames('font-mono text-sm tabular', upDownClass(pnl))}>{fmtSignedMoney(pnl, 0)}</span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
