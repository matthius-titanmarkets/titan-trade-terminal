// Performance analytics over the trade blotter.
import { tradePnl } from './trades.js'

export function closedTrades(trades) {
  return trades.filter((t) => t.status === 'closed')
}

export function computeStats(trades) {
  const closed = closedTrades(trades)
  const pnls = closed.map((t) => tradePnl(t))
  const wins = pnls.filter((p) => p > 0)
  const losses = pnls.filter((p) => p <= 0)
  const grossWin = wins.reduce((a, b) => a + b, 0)
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0))
  const net = grossWin - grossLoss

  const avgWin = wins.length ? grossWin / wins.length : 0
  const avgLoss = losses.length ? grossLoss / losses.length : 0

  // daily equity curve for sharpe/drawdown
  const byDate = new Map()
  for (const t of closed) byDate.set(t.date, (byDate.get(t.date) ?? 0) + tradePnl(t))
  const dates = [...byDate.keys()].sort()
  let equity = 0
  const curve = dates.map((d) => {
    equity += byDate.get(d)
    return { date: d, pnl: byDate.get(d), equity }
  })

  // max drawdown on the curve
  let peak = -Infinity
  let maxDD = 0
  for (const p of curve) {
    peak = Math.max(peak, p.equity)
    maxDD = Math.max(maxDD, peak - p.equity)
  }

  // daily-return sharpe (annualized, 252d)
  const rets = curve.map((p) => p.pnl)
  const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0
  const sd = rets.length > 1 ? Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1)) : 0
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(252) : 0

  // streaks
  let curStreak = 0
  let bestStreak = 0
  let worstStreak = 0
  for (const p of pnls) {
    if (p > 0) curStreak = curStreak > 0 ? curStreak + 1 : 1
    else curStreak = curStreak < 0 ? curStreak - 1 : -1
    bestStreak = Math.max(bestStreak, curStreak)
    worstStreak = Math.min(worstStreak, curStreak)
  }

  const expectancy =
    closed.length > 0 ? (wins.length / closed.length) * avgWin - (losses.length / closed.length) * avgLoss : 0

  return {
    count: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    net,
    grossWin,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : wins.length ? Infinity : 0,
    avgWin,
    avgLoss,
    payoff: avgLoss > 0 ? avgWin / avgLoss : 0,
    expectancy,
    sharpe,
    maxDrawdown: maxDD,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    bestStreak,
    worstStreak: Math.abs(worstStreak),
    curve,
  }
}

export function monthlyPnl(trades) {
  const closed = closedTrades(trades)
  const byMonth = new Map()
  for (const t of closed) {
    const m = t.date.slice(0, 7)
    byMonth.set(m, (byMonth.get(m) ?? 0) + tradePnl(t))
  }
  return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, pnl]) => ({ month, pnl }))
}

export function byStrategy(trades) {
  const closed = closedTrades(trades)
  const m = new Map()
  for (const t of closed) {
    const row = m.get(t.strategy) ?? { strategy: t.strategy, count: 0, pnl: 0, wins: 0 }
    row.count += 1
    const p = tradePnl(t)
    row.pnl += p
    if (p > 0) row.wins += 1
    m.set(t.strategy, row)
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl)
}

export function byAssetClass(trades) {
  const closed = closedTrades(trades)
  const m = new Map()
  for (const t of closed) {
    const row = m.get(t.assetClass) ?? { assetClass: t.assetClass, count: 0, pnl: 0 }
    row.count += 1
    row.pnl += tradePnl(t)
    m.set(t.assetClass, row)
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl)
}

export function dayOfWeekPnl(trades) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const acc = Array.from({ length: 7 }, (_, i) => ({ day: names[i], pnl: 0, count: 0 }))
  for (const t of closedTrades(trades)) {
    const d = new Date(t.date + 'T12:00:00Z').getUTCDay()
    acc[d].pnl += tradePnl(t)
    acc[d].count += 1
  }
  return acc.filter((r) => r.day !== 'Sun' && r.day !== 'Sat')
}

// correlation matrix over symbol day-histories (Tools page)
export function correlation(seriesA, seriesB) {
  const n = Math.min(seriesA.length, seriesB.length)
  if (n < 3) return 0
  const a = seriesA.slice(-n)
  const b = seriesB.slice(-n)
  const ra = returns(a)
  const rb = returns(b)
  const ma = avg(ra)
  const mb = avg(rb)
  let cov = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb)
    va += (ra[i] - ma) ** 2
    vb += (rb[i] - mb) ** 2
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0
}

const returns = (xs) => xs.slice(1).map((v, i) => (v - xs[i]) / xs[i])
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
