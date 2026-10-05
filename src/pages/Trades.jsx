// Trade Blotter — the journal of record. Distinct role: CRUD + import/export.
// Aggregated performance lives on Analytics; live book on Portfolio.
import React, { useMemo, useRef, useState } from 'react'
import Reveal from '../components/Reveal.jsx'
import { Panel, Modal, Tag, Select, EmptyState, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getQuote } from '../lib/marketData.js'
import { tradePnl, tradeReturnPct } from '../lib/trades.js'
import { exportTradesCsv, exportWorkspaceJson, parseImportFile } from '../lib/csv.js'
import { fmtMoney, fmtSignedMoney, fmtPrice, fmtPct, upDownClass } from '../lib/format.js'

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  symbol: '',
  side: 'long',
  qty: '',
  entry: '',
  exit: '',
  fees: '0',
  strategy: '',
  assetClass: 'equity',
  status: 'closed',
  notes: '',
}

export default function Trades() {
  const { trades, addTrade, updateTrade, removeTrade, importTrades, settings, watchlist, marketRev } = useStore()
  const [filter, setFilter] = useState({ status: 'all', assetClass: 'all', query: '' })
  const [editing, setEditing] = useState(null) // null | 'new' | trade object
  const [form, setForm] = useState(EMPTY_FORM)
  const [importReport, setImportReport] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [closing, setClosing] = useState(null) // open trade being closed
  const [closePrice, setClosePrice] = useState('')
  const fileRef = useRef(null)

  const openClose = (t) => {
    const q = getQuote(t.symbol)
    const mkt = q?.price ?? t.entry
    const digits = q?.digits ?? 2
    setClosePrice(String(Number(mkt.toFixed(digits))))
    setClosing(t)
  }
  const confirmClose = () => {
    const exit = parseFloat(closePrice)
    if (!Number.isFinite(exit)) return
    updateTrade(closing.id, { status: 'closed', exit })
    setClosing(null)
  }

  const rows = useMemo(() => {
    let r = [...trades]
    if (filter.status !== 'all') r = r.filter((t) => t.status === filter.status)
    if (filter.assetClass !== 'all') r = r.filter((t) => t.assetClass === filter.assetClass)
    if (filter.query) {
      const q = filter.query.toLowerCase()
      r = r.filter((t) => t.symbol.toLowerCase().includes(q) || (t.strategy || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q))
    }
    return r.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
  }, [trades, filter, marketRev])

  const totals = useMemo(() => {
    let realized = 0
    let openPnl = 0
    for (const t of rows) {
      if (t.status === 'closed') realized += tradePnl(t)
      else openPnl += tradePnl(t, getQuote(t.symbol)?.price ?? t.entry)
    }
    return { realized, openPnl }
  }, [rows, marketRev])

  const openEditor = (t) => {
    if (t === 'new') {
      setForm(EMPTY_FORM)
      setEditing('new')
    } else {
      setForm({ ...t, qty: String(t.qty), entry: String(t.entry), exit: t.exit == null ? '' : String(t.exit), fees: String(t.fees ?? 0) })
      setEditing(t)
    }
  }

  const saveTrade = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      symbol: form.symbol.toUpperCase().trim(),
      qty: parseFloat(form.qty) || 0,
      entry: parseFloat(form.entry) || 0,
      exit: form.exit === '' ? null : parseFloat(form.exit),
      fees: parseFloat(form.fees) || 0,
      status: form.exit === '' ? 'open' : form.status,
      tags: form.tags ?? [],
    }
    if (!payload.symbol || !payload.qty || !payload.entry) return
    if (editing === 'new') addTrade(payload)
    else updateTrade(editing.id, payload)
    setEditing(null)
  }

  const onImportFile = async (file) => {
    if (!file) return
    try {
      const result = await parseImportFile(file)
      setImportReport({ ...result, mode: 'merge' })
    } catch (e) {
      setImportReport({ error: e.message })
    }
  }

  const applyImport = () => {
    importTrades(importReport.trades, importReport.mode)
    setImportReport(null)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-titan-gold">Journal of Record</div>
            <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Trade Blotter</h1>
            <p className="text-xs text-ink-dim mt-1">
              {rows.length} trades shown · realized {fmtSignedMoney(totals.realized, 0)} · open {fmtSignedMoney(totals.openPnl, 0)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                onImportFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost px-3.5 py-2 text-xs">⤒ Import CSV / JSON</button>
            <button onClick={() => exportTradesCsv(trades)} className="btn-ghost px-3.5 py-2 text-xs">⤓ Export CSV</button>
            <button
              onClick={() => exportWorkspaceJson({ trades, watchlist, settings: { ...settings, finnhubKey: undefined } })}
              className="btn-ghost px-3.5 py-2 text-xs"
            >
              ⤓ Backup JSON
            </button>
            <button onClick={() => openEditor('new')} className="btn-gold px-3.5 py-2 text-xs">+ Log Trade</button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filter.status}
            onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <Select
            value={filter.assetClass}
            onChange={(v) => setFilter((f) => ({ ...f, assetClass: v }))}
            options={[
              { value: 'all', label: 'All asset classes' },
              'equity', 'index', 'fx', 'crypto', 'commodity', 'future',
            ]}
          />
          <input
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder="Filter symbol, strategy, notes…"
            className="input-dark !w-60 !py-1.5 text-xs"
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState title="No trades match the current filters" hint="Log a trade or import a CSV to populate the blotter" />
          ) : (
            <div className="mobile-scroll-x">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-line bg-obsidian-850/60">
                  <tr>
                    <th className="th-cell">Date</th>
                    <th className="th-cell">Symbol</th>
                    <th className="th-cell">Side</th>
                    <th className="th-cell text-right">Qty</th>
                    <th className="th-cell text-right">Entry</th>
                    <th className="th-cell text-right">Exit / Mark</th>
                    <th className="th-cell text-right">P&L</th>
                    <th className="th-cell text-right">Return</th>
                    <th className="th-cell">Strategy</th>
                    <th className="th-cell">Status</th>
                    <th className="th-cell text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {rows.map((t) => {
                    const mark = t.status === 'open' ? getQuote(t.symbol)?.price ?? t.entry : t.exit
                    const pnl = tradePnl(t, mark)
                    const ret = tradeReturnPct(t, mark)
                    return (
                      <tr key={t.id} className="hover:bg-obsidian-750 transition-colors">
                        <td className="td-cell font-mono text-2xs text-ink-dim">{t.date}</td>
                        <td className="td-cell font-mono font-semibold text-ink">{t.symbol}</td>
                        <td className="td-cell">
                          <Tag tone={t.side === 'long' ? 'up' : 'down'}>{t.side.toUpperCase()}</Tag>
                        </td>
                        <td className="td-cell text-right font-mono tabular text-ink-soft">{t.qty.toLocaleString()}</td>
                        <td className="td-cell text-right font-mono tabular text-ink-soft">{fmtPrice(t.entry)}</td>
                        <td className="td-cell text-right font-mono tabular text-ink-soft">
                          {fmtPrice(mark)}
                          {t.status === 'open' && <span className="text-3xs text-accent-amber ml-1">MKT</span>}
                        </td>
                        <td className={classNames('td-cell text-right font-mono tabular font-medium', upDownClass(pnl))}>{fmtSignedMoney(pnl, 0)}</td>
                        <td className={classNames('td-cell text-right font-mono tabular', upDownClass(ret))}>{fmtPct(ret, 1)}</td>
                        <td className="td-cell text-ink-soft max-w-[150px] truncate" title={t.notes}>{t.strategy}</td>
                        <td className="td-cell">
                          <Tag tone={t.status === 'open' ? 'gold' : 'default'}>{t.status.toUpperCase()}</Tag>
                        </td>
                        <td className="td-cell text-right whitespace-nowrap">
                          {t.status === 'open' && (
                            <button onClick={() => openClose(t)} className="text-2xs text-titan-gold hover:text-titan-bright px-1.5 transition-colors font-medium">Close</button>
                          )}
                          <button onClick={() => openEditor(t)} className="text-2xs text-ink-dim hover:text-titan-bright px-1.5 transition-colors">Edit</button>
                          <button onClick={() => setConfirmDelete(t)} className="text-2xs text-ink-dim hover:text-market-down px-1.5 transition-colors">Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Reveal>

      {/* ── editor modal ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Log Trade' : `Edit ${editing?.symbol ?? ''}`}>
        <form onSubmit={saveTrade} className="grid grid-cols-2 gap-3.5">
          <L label="Date"><input type="date" className="input-dark" value={form.date} onChange={set('date')} required /></L>
          <L label="Symbol"><input className="input-dark font-mono uppercase" value={form.symbol} onChange={set('symbol')} placeholder="AAPL" required /></L>
          <L label="Side">
            <Select value={form.side} onChange={(v) => setForm((f) => ({ ...f, side: v }))} className="w-full !py-2.5 !text-sm" options={['long', 'short']} />
          </L>
          <L label="Asset class">
            <Select value={form.assetClass} onChange={(v) => setForm((f) => ({ ...f, assetClass: v }))} className="w-full !py-2.5 !text-sm" options={['equity', 'index', 'fx', 'crypto', 'commodity', 'future']} />
          </L>
          <L label="Quantity"><input type="number" step="any" className="input-dark font-mono" value={form.qty} onChange={set('qty')} required /></L>
          <L label="Fees"><input type="number" step="any" className="input-dark font-mono" value={form.fees} onChange={set('fees')} /></L>
          <L label="Entry price"><input type="number" step="any" className="input-dark font-mono" value={form.entry} onChange={set('entry')} required /></L>
          <L label="Exit price (blank = open)"><input type="number" step="any" className="input-dark font-mono" value={form.exit} onChange={set('exit')} /></L>
          <L label="Strategy" span><input className="input-dark" value={form.strategy} onChange={set('strategy')} placeholder="Momentum Breakout" /></L>
          <L label="Notes" span>
            <textarea className="input-dark min-h-[70px] resize-y" value={form.notes} onChange={set('notes')} placeholder="Thesis, execution notes, lessons…" />
          </L>
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="btn-gold px-5 py-2 text-sm">{editing === 'new' ? 'Add to blotter' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* ── import review modal ── */}
      <Modal open={!!importReport} onClose={() => setImportReport(null)} title="Import Review">
        {importReport?.error ? (
          <div className="rounded-lg border border-market-down/40 bg-market-downDim px-4 py-3 text-sm text-market-down">{importReport.error}</div>
        ) : importReport ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="panel p-3">
                <div className="font-mono text-xl text-market-up">{importReport.trades.length}</div>
                <div className="label-caps mt-1">Valid rows</div>
              </div>
              <div className="panel p-3">
                <div className="font-mono text-xl text-market-down">{importReport.skipped}</div>
                <div className="label-caps mt-1">Skipped</div>
              </div>
              <div className="panel p-3">
                <div className="font-mono text-xl text-ink">{importReport.kind.toUpperCase()}</div>
                <div className="label-caps mt-1">Format</div>
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-2xs font-mono">
                <tbody className="divide-y divide-line-soft">
                  {importReport.trades.slice(0, 12).map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-1.5 text-ink-dim">{t.date}</td>
                      <td className="px-3 py-1.5 font-semibold text-ink">{t.symbol}</td>
                      <td className="px-3 py-1.5">{t.side}</td>
                      <td className="px-3 py-1.5 text-right tabular">{t.qty}</td>
                      <td className="px-3 py-1.5 text-right tabular">{fmtPrice(t.entry)}</td>
                      <td className="px-3 py-1.5 text-right tabular">{t.exit != null ? fmtPrice(t.exit) : 'open'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4">
              {['merge', 'replace'].map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                  <input
                    type="radio"
                    checked={importReport.mode === m}
                    onChange={() => setImportReport((r) => ({ ...r, mode: m }))}
                    className="accent-[#C9A43A]"
                  />
                  <span className="capitalize">{m === 'merge' ? 'Merge with existing' : 'Replace all trades'}</span>
                </label>
              ))}
            </div>
            {importReport.mode === 'replace' && (
              <div className="text-2xs text-accent-amber">Replace removes every existing trade in the blotter. Export a backup first if unsure.</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportReport(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
              <button onClick={applyImport} className="btn-gold px-5 py-2 text-sm">
                Import {importReport.trades.length} trades
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── delete confirm ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete trade">
        <p className="text-sm text-ink-soft">
          Remove <span className="font-mono font-semibold text-ink">{confirmDelete?.symbol}</span> ({confirmDelete?.date}) from the blotter? This
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              removeTrade(confirmDelete.id)
              setConfirmDelete(null)
            }}
            className="rounded-lg bg-market-down/90 hover:bg-market-down text-white px-5 py-2 text-sm font-semibold transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* ── close position ── */}
      <Modal open={!!closing} onClose={() => setClosing(null)} title={`Close ${closing?.symbol ?? ''}`}>
        {closing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="panel p-3">
                <div className="label-caps">Side</div>
                <div className="mt-1"><Tag tone={closing.side === 'long' ? 'up' : 'down'}>{closing.side.toUpperCase()}</Tag></div>
              </div>
              <div className="panel p-3">
                <div className="label-caps">Qty</div>
                <div className="font-mono tabular text-ink mt-1">{closing.qty.toLocaleString()}</div>
              </div>
              <div className="panel p-3">
                <div className="label-caps">Entry</div>
                <div className="font-mono tabular text-ink mt-1">{fmtPrice(closing.entry)}</div>
              </div>
            </div>
            <label className="block">
              <span className="label-caps mb-1.5 block">Close price (defaults to live market)</span>
              <input
                type="number"
                step="any"
                autoFocus
                className="input-dark font-mono"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
              />
            </label>
            <div className="flex items-center justify-between rounded-lg border border-line-strong bg-obsidian-850 px-4 py-3">
              <span className="text-sm text-ink-soft">Realized P&L on close</span>
              <span
                className={classNames(
                  'font-mono tabular text-lg font-semibold',
                  upDownClass(tradePnl({ ...closing, status: 'closed', exit: parseFloat(closePrice) || closing.entry }))
                )}
              >
                {fmtSignedMoney(tradePnl({ ...closing, status: 'closed', exit: parseFloat(closePrice) || closing.entry }), 0)}
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setClosing(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
              <button onClick={confirmClose} className="btn-gold px-5 py-2 text-sm">Close position</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function L({ label, children, span }) {
  return (
    <label className={classNames('block', span && 'col-span-2')}>
      <span className="label-caps mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}
