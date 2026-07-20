// Shared number/date formatting for all data surfaces.

export function fmtPrice(v, digits) {
  if (v == null || Number.isNaN(v)) return '—'
  const d = digits != null ? digits : v >= 1000 ? 2 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function fmtMoney(v, digits = 2) {
  if (v == null || Number.isNaN(v)) return '—'
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function fmtSignedMoney(v, digits = 2) {
  if (v == null || Number.isNaN(v)) return '—'
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function fmtPct(v, digits = 2, signed = true) {
  if (v == null || Number.isNaN(v)) return '—'
  const sign = signed && v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

export function fmtCompact(v) {
  if (v == null || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(Math.round(v))
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function fmtDateTime(ts) {
  return `${fmtDate(ts)} ${fmtClock(ts)}`
}

export function fmtAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export const upDownClass = (v) => (v > 0 ? 'text-market-up' : v < 0 ? 'text-market-down' : 'text-ink-soft')

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ')
}
