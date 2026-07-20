// Trader Tools — quantitative desk calculators. Distinct role: pre-trade
// sizing & risk mathematics; post-trade stats live on Analytics.
import React, { useMemo, useState } from 'react'
import Reveal, { RevealStagger } from '../components/Reveal.jsx'
import { Panel, PanelHeader, Stat, GoldDivider, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getQuote, getQuotes } from '../lib/marketData.js'
import { correlation } from '../lib/calc.js'
import { fmtMoney, fmtPct } from '../lib/format.js'

export default function Tools() {
  const { settings } = useStore()
  return (
    <div className="space-y-4 md:space-y-5">
      <Reveal>
        <div>
          <div className="label-caps text-titan-gold">Quantitative Desk</div>
          <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Trader Tools</h1>
          <p className="text-xs text-ink-dim mt-1">Pre-trade sizing, risk mathematics and cross-asset diagnostics</p>
        </div>
      </Reveal>

      <RevealStagger className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <PositionSizer equity={settings.accountEquity} defaultRisk={settings.riskPerTradePct} />
        <RiskReward />
        <ValueAtRisk equity={settings.accountEquity} />
        <KellyCriterion />
        <Compounding equity={settings.accountEquity} />
        <MarginCalculator />
      </RevealStagger>

      <Reveal>
        <CorrelationMatrix />
      </Reveal>
    </div>
  )
}

/* ── shared field ── */
function F({ label, value, onChange, suffix, step = 'any' }) {
  return (
    <label className="block">
      <span className="label-caps mb-1 block">{label}</span>
      <div className="relative">
        <input type="number" step={step} className="input-dark font-mono !py-2 pr-10" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-ink-faint font-mono">{suffix}</span> : null}
      </div>
    </label>
  )
}

function Out({ label, value, tone }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-xs text-ink-dim">{label}</span>
      <span className={classNames('font-mono tabular text-sm font-semibold', tone === 'gold' ? 'text-titan-bright' : tone === 'up' ? 'text-market-up' : tone === 'down' ? 'text-market-down' : 'text-ink')}>
        {value}
      </span>
    </div>
  )
}

/* ── 1. position sizer ── */
function PositionSizer({ equity, defaultRisk }) {
  const [f, setF] = useState({ equity: String(equity), riskPct: String(defaultRisk), entry: '100', stop: '97' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const riskAmt = (parseFloat(f.equity) || 0) * ((parseFloat(f.riskPct) || 0) / 100)
  const perUnit = Math.abs((parseFloat(f.entry) || 0) - (parseFloat(f.stop) || 0))
  const units = perUnit > 0 ? riskAmt / perUnit : 0
  const notional = units * (parseFloat(f.entry) || 0)
  return (
    <Panel>
      <PanelHeader title="Position Size" hint="Fixed-fractional risk model" />
      <div className="p-4 grid grid-cols-2 gap-3">
        <F label="Account equity" value={f.equity} onChange={s('equity')} suffix="$" />
        <F label="Risk per trade" value={f.riskPct} onChange={s('riskPct')} suffix="%" />
        <F label="Entry price" value={f.entry} onChange={s('entry')} />
        <F label="Stop price" value={f.stop} onChange={s('stop')} />
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label="Dollar risk" value={fmtMoney(riskAmt, 0)} tone="down" />
        <Out label="Risk per unit" value={fmtMoney(perUnit)} />
        <Out label="Position size" value={`${units.toFixed(units < 10 ? 2 : 0)} units`} tone="gold" />
        <Out label="Notional value" value={fmtMoney(notional, 0)} />
      </div>
    </Panel>
  )
}

/* ── 2. risk / reward ── */
function RiskReward() {
  const [f, setF] = useState({ entry: '100', stop: '96', target: '112', winRate: '45' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const risk = Math.abs((parseFloat(f.entry) || 0) - (parseFloat(f.stop) || 0))
  const reward = Math.abs((parseFloat(f.target) || 0) - (parseFloat(f.entry) || 0))
  const rr = risk > 0 ? reward / risk : 0
  const wr = (parseFloat(f.winRate) || 0) / 100
  const ev = wr * reward - (1 - wr) * risk
  const breakeven = risk + reward > 0 ? (risk / (risk + reward)) * 100 : 0
  return (
    <Panel>
      <PanelHeader title="Risk / Reward" hint="Expected value per unit traded" />
      <div className="p-4 grid grid-cols-2 gap-3">
        <F label="Entry" value={f.entry} onChange={s('entry')} />
        <F label="Stop" value={f.stop} onChange={s('stop')} />
        <F label="Target" value={f.target} onChange={s('target')} />
        <F label="Est. win rate" value={f.winRate} onChange={s('winRate')} suffix="%" />
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label="R multiple" value={`${rr.toFixed(2)} R`} tone="gold" />
        <Out label="Breakeven win rate" value={fmtPct(breakeven, 1, false)} />
        <Out label="EV per unit" value={fmtMoney(ev)} tone={ev >= 0 ? 'up' : 'down'} />
      </div>
    </Panel>
  )
}

/* ── 3. parametric VaR ── */
function ValueAtRisk({ equity }) {
  const [f, setF] = useState({ notional: String(Math.round(equity * 0.6)), volPct: '18', horizon: '1', conf: '95' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const z = { 90: 1.2816, 95: 1.6449, 99: 2.3263 }[f.conf] ?? 1.6449
  const dailyVol = ((parseFloat(f.volPct) || 0) / 100) / Math.sqrt(252)
  const var$ = (parseFloat(f.notional) || 0) * dailyVol * Math.sqrt(parseFloat(f.horizon) || 1) * z
  const es$ = var$ * 1.25 // normal-dist ES/VaR ratio ≈1.25 at 95%
  return (
    <Panel>
      <PanelHeader title="Value at Risk" hint="Parametric (normal) · annualized vol input" />
      <div className="p-4 grid grid-cols-2 gap-3">
        <F label="Portfolio notional" value={f.notional} onChange={s('notional')} suffix="$" />
        <F label="Annualized vol" value={f.volPct} onChange={s('volPct')} suffix="%" />
        <F label="Horizon (days)" value={f.horizon} onChange={s('horizon')} />
        <label className="block">
          <span className="label-caps mb-1 block">Confidence</span>
          <select className="input-dark !py-2 font-mono" value={f.conf} onChange={(e) => s('conf')(e.target.value)}>
            <option value="90">90%</option>
            <option value="95">95%</option>
            <option value="99">99%</option>
          </select>
        </label>
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label={`VaR (${f.conf}%)`} value={fmtMoney(var$, 0)} tone="down" />
        <Out label="Expected shortfall" value={fmtMoney(es$, 0)} tone="down" />
        <Out label="VaR as % of notional" value={fmtPct((var$ / (parseFloat(f.notional) || 1)) * 100, 2, false)} />
      </div>
    </Panel>
  )
}

/* ── 4. Kelly ── */
function KellyCriterion() {
  const [f, setF] = useState({ winRate: '52', payoff: '1.6' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const p = (parseFloat(f.winRate) || 0) / 100
  const b = parseFloat(f.payoff) || 0
  const kelly = b > 0 ? p - (1 - p) / b : 0
  return (
    <Panel>
      <PanelHeader title="Kelly Criterion" hint="Optimal fraction of equity per trade" />
      <div className="p-4 grid grid-cols-2 gap-3">
        <F label="Win rate" value={f.winRate} onChange={s('winRate')} suffix="%" />
        <F label="Payoff ratio (W/L)" value={f.payoff} onChange={s('payoff')} />
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label="Full Kelly" value={fmtPct(kelly * 100, 1, false)} tone={kelly > 0 ? 'gold' : 'down'} />
        <Out label="Half Kelly (recommended)" value={fmtPct(kelly * 50, 1, false)} />
        <Out label="Quarter Kelly (conservative)" value={fmtPct(kelly * 25, 1, false)} />
        {kelly <= 0 && <div className="text-2xs text-market-down mt-1">Negative edge — the system should not be traded at this win rate / payoff.</div>}
      </div>
    </Panel>
  )
}

/* ── 5. compounding ── */
function Compounding({ equity }) {
  const [f, setF] = useState({ start: String(equity), monthlyPct: '2.5', months: '24' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const start = parseFloat(f.start) || 0
  const r = (parseFloat(f.monthlyPct) || 0) / 100
  const n = parseInt(f.months) || 0
  const end = start * Math.pow(1 + r, n)
  return (
    <Panel>
      <PanelHeader title="Compounding Projection" hint="Geometric growth of equity" />
      <div className="p-4 grid grid-cols-3 gap-3">
        <F label="Starting equity" value={f.start} onChange={s('start')} suffix="$" />
        <F label="Monthly return" value={f.monthlyPct} onChange={s('monthlyPct')} suffix="%" />
        <F label="Months" value={f.months} onChange={s('months')} step="1" />
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label="Projected equity" value={fmtMoney(end, 0)} tone="gold" />
        <Out label="Total growth" value={fmtPct(((end - start) / (start || 1)) * 100, 1)} tone={end >= start ? 'up' : 'down'} />
        <Out label="CAGR equivalent" value={fmtPct((Math.pow(1 + r, 12) - 1) * 100, 1, false)} />
      </div>
    </Panel>
  )
}

/* ── 6. margin & leverage ── */
function MarginCalculator() {
  const [f, setF] = useState({ notional: '150000', leverage: '4', maintPct: '25' })
  const s = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const notional = parseFloat(f.notional) || 0
  const lev = parseFloat(f.leverage) || 1
  const initial = notional / lev
  const maint = notional * ((parseFloat(f.maintPct) || 0) / 100)
  const liqMovePct = lev > 0 ? (1 / lev) * (1 - (parseFloat(f.maintPct) || 0) / 100) * 100 : 0
  return (
    <Panel>
      <PanelHeader title="Margin & Leverage" hint="Initial margin and liquidation distance" />
      <div className="p-4 grid grid-cols-3 gap-3">
        <F label="Position notional" value={f.notional} onChange={s('notional')} suffix="$" />
        <F label="Leverage" value={f.leverage} onChange={s('leverage')} suffix="×" />
        <F label="Maint. margin" value={f.maintPct} onChange={s('maintPct')} suffix="%" />
      </div>
      <div className="px-4 pb-4">
        <GoldDivider className="mb-2" />
        <Out label="Initial margin required" value={fmtMoney(initial, 0)} tone="gold" />
        <Out label="Maintenance level" value={fmtMoney(maint, 0)} />
        <Out label="Adverse move to liquidation" value={fmtPct(liqMovePct, 2, false)} tone="down" />
      </div>
    </Panel>
  )
}

/* ── 7. correlation matrix over live histories ── */
const CORR_SET = ['SPX', 'NDX', 'RUT', 'VIX', 'EURUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'WTI']

function CorrelationMatrix() {
  const { marketRev } = useStore()
  const quotes = useMemo(() => getQuotes(CORR_SET), [marketRev])
  const matrix = useMemo(
    () => quotes.map((a) => quotes.map((b) => (a.symbol === b.symbol ? 1 : correlation(a.history, b.history)))),
    [quotes]
  )
  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Cross-Asset Correlation Matrix" hint="Pearson correlation of intraday return series (current session)" />
      <div className="mobile-scroll-x p-4">
        <table className="font-mono text-3xs tabular border-separate border-spacing-0.5 mx-auto">
          <thead>
            <tr>
              <th className="w-16" />
              {quotes.map((q) => (
                <th key={q.symbol} className="px-1 pb-1 text-ink-dim font-medium text-center min-w-[52px]">{q.symbol}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes.map((a, i) => (
              <tr key={a.symbol}>
                <td className="pr-2 text-right text-ink-dim font-medium">{a.symbol}</td>
                {quotes.map((b, j) => {
                  const c = matrix[i]?.[j] ?? 0
                  const bg =
                    c >= 0 ? `rgba(25,199,132,${Math.abs(c) * 0.55})` : `rgba(239,67,83,${Math.abs(c) * 0.55})`
                  return (
                    <td key={b.symbol} className="text-center rounded px-1.5 py-1.5 text-ink" style={{ background: i === j ? 'rgba(201,164,58,0.35)' : bg }}>
                      {c.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
