// Portfolio — the live book. Distinct role: open positions marked to market,
// exposure & concentration risk. History lives on Trades; stats on Analytics.
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import Reveal, { RevealStagger } from '../components/Reveal.jsx'
import { Panel, PanelHeader, Stat, Tag, EmptyState, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getQuote } from '../lib/marketData.js'
import { tradePnl, tradeReturnPct, tradeNotional } from '../lib/trades.js'
import { fmtMoney, fmtSignedMoney, fmtPrice, fmtPct, upDownClass } from '../lib/format.js'

export default function Portfolio() {
  const { trades, settings, marketRev, updateTrade } = useStore()
  const navigate = useNavigate()
  const open = useMemo(() => trades.filter((t) => t.status === 'open'), [trades])

  const book = useMemo(() => {
    return open.map((t) => {
      const q = getQuote(t.symbol)
      const mark = q?.price ?? t.entry
      const notional = tradeNotional(t, mark)
      return { ...t, mark, notional, pnl: tradePnl(t, mark), ret: tradeReturnPct(t, mark), digits: q?.digits ?? 2 }
    })
  }, [open, marketRev])

  const totals = useMemo(() => {
    const gross = book.reduce((a, p) => a + p.notional, 0)
    const net = book.reduce((a, p) => a + p.notional * (p.side === 'long' ? 1 : -1), 0)
    const pnl = book.reduce((a, p) => a + p.pnl, 0)
    const long = book.filter((p) => p.side === 'long').reduce((a, p) => a + p.notional, 0)
    const short = gross - long
    return { gross, net, pnl, long, short }
  }, [book])

  const equity = settings.accountEquity
  const closeAtMarket = (p) => updateTrade(p.id, { status: 'closed', exit: p.mark })

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-titan-gold">Live Book</div>
            <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Portfolio</h1>
            <p className="text-xs text-ink-dim mt-1">{book.length} open positions · marked to live feed each minute</p>
          </div>
          <button onClick={() => navigate('/app/trades')} className="btn-ghost px-3.5 py-2 text-xs">Open blotter →</button>
        </div>
      </Reveal>

      <RevealStagger className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Panel className="p-4"><Stat label="Unrealized P&L" value={fmtSignedMoney(totals.pnl, 0)} tone={totals.pnl >= 0 ? 'up' : 'down'} big /></Panel>
        <Panel className="p-4"><Stat label="Gross Exposure" value={fmtMoney(totals.gross, 0)} sub={`${((totals.gross / equity) * 100).toFixed(0)}% of equity`} /></Panel>
        <Panel className="p-4"><Stat label="Net Exposure" value={fmtSignedMoney(totals.net, 0)} sub={totals.net >= 0 ? 'Net long' : 'Net short'} /></Panel>
        <Panel className="p-4"><Stat label="Long Book" value={fmtMoney(totals.long, 0)} tone="up" /></Panel>
        <Panel className="p-4"><Stat label="Short Book" value={fmtMoney(totals.short, 0)} tone="down" /></Panel>
      </RevealStagger>

      <Reveal delay={0.05}>
        <Panel className="overflow-hidden">
          <PanelHeader title="Open Positions" hint="MKT column marks against the live feed" />
          {book.length === 0 ? (
            <EmptyState title="No open positions" hint="Log an open trade from the blotter to build the book" />
          ) : (
            <div className="mobile-scroll-x">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-line bg-obsidian-850/60">
                  <tr>
                    <th className="th-cell">Symbol</th>
                    <th className="th-cell">Side</th>
                    <th className="th-cell text-right">Qty</th>
                    <th className="th-cell text-right">Entry</th>
                    <th className="th-cell text-right">Mark</th>
                    <th className="th-cell text-right">Notional</th>
                    <th className="th-cell text-right">Unrealized</th>
                    <th className="th-cell text-right">Return</th>
                    <th className="th-cell text-right">Weight</th>
                    <th className="th-cell">Strategy</th>
                    <th className="th-cell text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {book.map((p) => (
                    <tr key={p.id} className="hover:bg-obsidian-750 transition-colors">
                      <td className="td-cell font-mono font-semibold text-ink cursor-pointer" onClick={() => navigate(`/app/charts?s=${p.symbol}`)}>
                        {p.symbol}
                      </td>
                      <td className="td-cell"><Tag tone={p.side === 'long' ? 'up' : 'down'}>{p.side.toUpperCase()}</Tag></td>
                      <td className="td-cell text-right font-mono tabular text-ink-soft">{p.qty.toLocaleString()}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-soft">{fmtPrice(p.entry, p.digits)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink">{fmtPrice(p.mark, p.digits)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-soft">{fmtMoney(p.notional, 0)}</td>
                      <td className={classNames('td-cell text-right font-mono tabular font-medium', upDownClass(p.pnl))}>{fmtSignedMoney(p.pnl, 0)}</td>
                      <td className={classNames('td-cell text-right font-mono tabular', upDownClass(p.ret))}>{fmtPct(p.ret, 1)}</td>
                      <td className="td-cell text-right font-mono tabular text-ink-dim">{((p.notional / (totals.gross || 1)) * 100).toFixed(1)}%</td>
                      <td className="td-cell text-ink-soft max-w-[140px] truncate" title={p.notes}>{p.strategy}</td>
                      <td className="td-cell text-right">
                        <button onClick={() => closeAtMarket(p)} className="text-2xs text-ink-dim hover:text-titan-bright transition-colors whitespace-nowrap">
                          Close @ mkt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel>
          <PanelHeader title="Position P&L Distribution" hint="Unrealized P&L per open position" />
          <div className="h-56 px-3 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={book} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <XAxis dataKey="symbol" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={(v) => fmtMoney(v, 0)} />
                <Tooltip formatter={(v) => fmtSignedMoney(v, 0)} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={0} stroke="#233049" />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {book.map((p) => (
                    <Cell key={p.id} fill={p.pnl >= 0 ? '#19C784' : '#EF4353'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Reveal>
    </div>
  )
}
