// Trade import / export.
// Export: CSV (blotter schema) and JSON (full workspace backup).
// Import: CSV with tolerant header mapping, or a Titan JSON backup.

import Papa from 'papaparse'

export const CSV_COLUMNS = [
  'id', 'date', 'symbol', 'side', 'qty', 'entry', 'exit', 'fees',
  'strategy', 'assetClass', 'status', 'notes', 'tags',
]

const HEADER_ALIASES = {
  id: ['id', 'trade id', 'trade_id', 'ref'],
  date: ['date', 'open date', 'opendate', 'entry date', 'time', 'datetime'],
  symbol: ['symbol', 'ticker', 'instrument', 'pair', 'market'],
  side: ['side', 'direction', 'type', 'position'],
  qty: ['qty', 'quantity', 'size', 'units', 'shares', 'contracts', 'volume', 'lots'],
  entry: ['entry', 'entry price', 'entryprice', 'open price', 'openprice', 'buy price', 'price in'],
  exit: ['exit', 'exit price', 'exitprice', 'close price', 'closeprice', 'sell price', 'price out'],
  fees: ['fees', 'fee', 'commission', 'commissions', 'cost'],
  strategy: ['strategy', 'setup', 'system', 'playbook'],
  assetClass: ['assetclass', 'asset class', 'asset', 'class', 'market type'],
  status: ['status', 'state'],
  notes: ['notes', 'note', 'comment', 'comments', 'journal'],
  tags: ['tags', 'labels'],
}

function normalizeHeader(h) {
  const k = h.trim().toLowerCase()
  for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(k)) return canon
  }
  return null
}

const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function exportTradesCsv(trades) {
  const rows = trades.map((t) => ({
    ...t,
    tags: (t.tags || []).join('|'),
  }))
  const csv = Papa.unparse(rows, { columns: CSV_COLUMNS })
  downloadBlob(csv, `titan-trades-${today()}.csv`, 'text/csv')
}

export function exportWorkspaceJson(payload) {
  const doc = {
    app: 'Titan Trade Terminal',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...payload,
  }
  downloadBlob(JSON.stringify(doc, null, 2), `titan-workspace-${today()}.json`, 'application/json')
}

export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.onload = () => {
      const text = String(reader.result)
      try {
        if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
          resolve(parseJsonBackup(text))
        } else {
          resolve(parseCsvTrades(text))
        }
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}

function parseJsonBackup(text) {
  const doc = JSON.parse(text)
  const trades = Array.isArray(doc) ? doc : doc.trades
  if (!Array.isArray(trades)) throw new Error('JSON file does not contain a trades array.')
  const { ok, skipped } = sanitizeTrades(trades)
  return { kind: 'json', trades: ok, skipped, settings: doc.settings, watchlist: doc.watchlist }
}

function parseCsvTrades(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (!parsed.data.length) throw new Error('No rows found in CSV.')
  const headerMap = {}
  for (const h of parsed.meta.fields ?? []) {
    const canon = normalizeHeader(h)
    if (canon && !(canon in headerMap)) headerMap[canon] = h
  }
  if (!headerMap.symbol || !headerMap.entry) {
    throw new Error('CSV must include at least Symbol and Entry price columns.')
  }
  const rows = parsed.data.map((r) => {
    const side = String(r[headerMap.side] ?? 'long').toLowerCase()
    return {
      id: r[headerMap.id] || `I-${crypto.randomUUID().slice(0, 8)}`,
      date: normalizeDate(r[headerMap.date]),
      symbol: String(r[headerMap.symbol] ?? '').toUpperCase().trim(),
      side: side.includes('short') || side.includes('sell') ? 'short' : 'long',
      qty: num(r[headerMap.qty]) ?? 1,
      entry: num(r[headerMap.entry]),
      exit: num(r[headerMap.exit]),
      fees: num(r[headerMap.fees]) ?? 0,
      strategy: r[headerMap.strategy] || 'Imported',
      assetClass: (r[headerMap.assetClass] || 'equity').toLowerCase(),
      status: r[headerMap.status]
        ? String(r[headerMap.status]).toLowerCase().includes('open') ? 'open' : 'closed'
        : num(r[headerMap.exit]) != null ? 'closed' : 'open',
      notes: r[headerMap.notes] || '',
      tags: r[headerMap.tags] ? String(r[headerMap.tags]).split(/[|,;]/).map((s) => s.trim()).filter(Boolean) : [],
    }
  })
  const { ok, skipped } = sanitizeTrades(rows)
  return { kind: 'csv', trades: ok, skipped }
}

function sanitizeTrades(rows) {
  const ok = []
  let skipped = 0
  for (const r of rows) {
    if (!r.symbol || r.entry == null || !Number.isFinite(Number(r.qty))) {
      skipped += 1
      continue
    }
    ok.push({
      id: String(r.id ?? `I-${crypto.randomUUID().slice(0, 8)}`),
      date: normalizeDate(r.date),
      symbol: String(r.symbol).toUpperCase(),
      side: r.side === 'short' ? 'short' : 'long',
      qty: Number(r.qty),
      entry: Number(r.entry),
      exit: r.exit == null || r.exit === '' ? null : Number(r.exit),
      fees: Number(r.fees ?? 0) || 0,
      strategy: String(r.strategy ?? 'Imported'),
      assetClass: String(r.assetClass ?? 'equity'),
      status: r.status === 'open' ? 'open' : 'closed',
      notes: String(r.notes ?? ''),
      tags: Array.isArray(r.tags) ? r.tags : [],
    })
  }
  return { ok, skipped }
}

function normalizeDate(v) {
  if (!v) return new Date().toISOString().slice(0, 10)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const today = () => new Date().toISOString().slice(0, 10)
