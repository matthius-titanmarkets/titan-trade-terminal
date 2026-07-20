// Analytics — performance intelligence over closed trades. Distinct role:
// aggregated edge metrics; raw rows live on Trades, live book on Portfolio.
import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area,
} from 'recharts'
import Reveal, { RevealStagger } from '../components/Reveal.jsx'
import { Panel, PanelHeader, Stat, EmptyState, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { computeStats, monthlyPnl, byStrategy, byAssetClass, dayOfWeekPnl } from '../lib/calc.js'
import { fmtMoney, fmtSignedMoney, upDownClass } from '../lib/format.js'

export default function Analytics() {
  const { trades } = useStore()
  const stats = useMemo(() => computeStats(trades), [trades])
  const months = useMemo(() => monthlyPnl(trades), [trades])
  const strategies = useMemo(() => byStrategy(trades), [trades])
  const classes = useMemo(() => byAssetClass(trades), [trades])
  const dow = useMemo(() => dayOfWeekPnl(trades), [trades])

  // drawdown series from equity curve
  const ddSeries = useMemo(() => {
    let peak = -Infinity
    return stats.curve.map((p) => {
      peak = Math.max(peak, p.equity)
      return { date: p.date, dd: -(peak - p.equity) }
    })
  }, [stats])

  if (stats.count === 0) {
    return (
      <Panel>
        <EmptyState title="No closed trades yet" hint="Analytics activate once the blotter has closed trades" />
      </Panel>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <Reveal>
        <div>
          <div className="label-caps text-titan-gold">Performance Intelligence</div>
          <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Analytics</h1>
          <p className="text-xs text-ink-dim mt-1">{stats.count} closed trades analyzed · edge, distribution and risk diagnostics</p>
        </div>
      </Reveal>

      <RevealStagger className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <MetricCard label="Net P&L" value={fmtSignedMoney(stats.net, 0)} tone={stats.net >= 0 ? 'up' : 'down'} />
        <MetricCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
        <MetricCard label="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} tone="gold" />
        <MetricCard label="Expectancy" value={fmtSignedMoney(stats.expectancy, 0)} sub="per trade" />
        <MetricCard label="Sharpe (ann.)" value={stats.sharpe.toFixed(2)} />
        <MetricCard label="Max Drawdown" value={fmtMoney(stats.maxDrawdown, 0)} tone="down" />
        <MetricCard label="Avg Win / Loss" value={stats.payoff.toFixed(2)} sub={`${fmtMoney(stats.avgWin, 0)} / ${fmtMoney(stats.avgLoss, 0)}`} />
        <MetricCard label="Streaks" value={`${stats.bestStreak}W / ${stats.worstStreak}L`} sub="best / worst" />
      </RevealStagger>

      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal>
          <Panel>
            <PanelHeader title="Monthly P&L" hint="Realized, by close month" />
            <div className="h-56 px-3 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtMoney(v, 0)} />
                  <Tooltip formatter={(v) => fmtSignedMoney(v, 0)} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine y={0} stroke="#233049" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {months.map((m) => (
                      <Cell key={m.month} fill={m.pnl >= 0 ? '#19C784' : '#EF4353'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <PanelHeader title="Drawdown Profile" hint="Distance from equity high-water mark" />
            <div className="h-56 px-3 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ddSeries} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="ddRed" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#EF4353" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#EF4353" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={44} />
                  <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtMoney(v, 0)} />
                  <Tooltip formatter={(v) => fmtMoney(v, 0)} />
                  <Area type="monotone" dataKey="dd" stroke="#EF4353" strokeWidth={1.6} fill="url(#ddRed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal>
          <Panel>
            <PanelHeader title="Strategy Attribution" hint="Realized P&L per playbook" />
            <div className="p-4 space-y-3">
              {strategies.map((s) => {
                const maxAbs = Math.max(...strategies.map((x) => Math.abs(x.pnl)), 1)
                return (
                  <div key={s.strategy}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-soft truncate">{s.strategy}</span>
                      <span className={classNames('font-mono tabular font-medium', upDownClass(s.pnl))}>{fmtSignedMoney(s.pnl, 0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-obsidian-600 overflow-hidden">
                      <div
                        className={classNames('h-full rounded-full transition-all duration-700', s.pnl >= 0 ? 'bg-market-up' : 'bg-market-down')}
                        style={{ width: `${(Math.abs(s.pnl) / maxAbs) * 100}%` }}
                      />
                    </div>
                    <div className="text-3xs text-ink-faint mt-0.5 font-mono">
                      {s.count} trades · {((s.wins / s.count) * 100).toFixed(0)}% win
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <PanelHeader title="Asset Class Attribution" hint="Where the edge concentrates" />
            <div className="h-64 px-3 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classes} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 12 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, 0)} />
                  <YAxis type="category" dataKey="assetClass" tickLine={false} axisLine={false} width={78} />
                  <Tooltip formatter={(v) => fmtSignedMoney(v, 0)} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine x={0} stroke="#233049" />
                  <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                    {classes.map((c) => (
                      <Cell key={c.assetClass} fill={c.pnl >= 0 ? '#C9A43A' : '#EF4353'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.12}>
          <Panel>
            <PanelHeader title="Day-of-Week Bias" hint="Realized P&L by weekday" />
            <div className="h-64 px-3 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dow} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtMoney(v, 0)} />
                  <Tooltip formatter={(v) => fmtSignedMoney(v, 0)} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine y={0} stroke="#233049" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {dow.map((d) => (
                      <Cell key={d.day} fill={d.pnl >= 0 ? '#4C7EF3' : '#EF4353'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, tone }) {
  return (
    <Panel className="p-3.5">
      <Stat label={label} value={value} sub={sub} tone={tone} />
    </Panel>
  )
}
