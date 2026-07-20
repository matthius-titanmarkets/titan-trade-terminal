// Institutional news wire.
// Live sources (no key): CryptoCompare market news (CORS-open).
// Live with key: Finnhub general + forex news.
// Fallback: Titan squawk generator — timestamped desk-style headlines that
// rotate deterministically, clearly labeled SIM in the UI.

let cache = { items: [], fetchedAt: 0, live: false }

async function fetchJson(url, timeout = 9000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

export async function getNews({ finnhubKey = '', force = false } = {}) {
  if (!force && cache.items.length && Date.now() - cache.fetchedAt < 60_000) return cache

  const items = []
  let live = false

  if (finnhubKey) {
    try {
      const d = await fetchJson(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`)
      for (const n of d.slice(0, 40)) {
        items.push({
          id: `fh-${n.id}`,
          ts: n.datetime * 1000,
          headline: n.headline,
          summary: n.summary,
          source: n.source || 'Finnhub',
          url: n.url,
          category: n.category || 'markets',
          live: true,
        })
      }
      live = true
    } catch { /* fall through */ }
  }

  try {
    const d = await fetchJson('https://min-api.cryptocompare.com/data/v2/news/?lang=EN')
    for (const n of (d?.Data ?? []).slice(0, 30)) {
      items.push({
        id: `cc-${n.id}`,
        ts: n.published_on * 1000,
        headline: n.title,
        summary: (n.body || '').slice(0, 220),
        source: n.source_info?.name || n.source || 'CryptoCompare',
        url: n.url,
        category: 'digital-assets',
        live: true,
      })
    }
    live = true
  } catch { /* fall through */ }

  if (items.length === 0) items.push(...squawkFallback())

  items.sort((a, b) => b.ts - a.ts)
  cache = { items, fetchedAt: Date.now(), live }
  return cache
}

// ── Titan squawk fallback ──
const SQUAWK = [
  ['MACRO', 'Treasury curve bear-steepens as long-end supply weighs; 10Y yield holds above 4.20%'],
  ['EQUITIES', 'Mega-cap technology extends leadership; semiconductor complex bid into the close'],
  ['FX', 'Dollar index consolidates below recent highs; EUR crosses heavy on ECB commentary'],
  ['ENERGY', 'WTI slips as inventory build offsets OPEC+ discipline headlines'],
  ['METALS', 'Gold holds bid on central-bank accumulation; silver outperforms on ratio compression'],
  ['DIGITAL', 'Bitcoin ranges near highs as spot ETF inflows stay constructive'],
  ['RATES', 'Fed funds futures price a patient path; front-end vol compresses ahead of CPI'],
  ['EQUITIES', 'Breadth improves as small-caps participate; advance/decline line prints new cycle high'],
  ['MACRO', 'Chicago PMI surprises to the upside; regional data firms the soft-landing base case'],
  ['CREDIT', 'IG spreads grind tighter; primary calendar heavy with financials issuance'],
  ['FX', 'Yen steadies after verbal intervention; carry unwind risk monitored at the desk'],
  ['VOL', 'Index volatility subdued; skew steepens as hedgers roll upside call overwrites'],
  ['ENERGY', 'Natural gas rallies on cooling-demand forecast revisions across the Midwest'],
  ['DIGITAL', 'Ethereum staking yields normalize; L2 activity prints fresh quarterly highs'],
  ['EQUITIES', 'Financials firm ahead of earnings; trading-revenue expectations revised higher'],
  ['MACRO', 'Global PMIs stay expansionary; freight and shipping rates confirm demand pulse'],
]

export function squawkFallback() {
  const now = Date.now()
  const seedIdx = Math.floor(now / 300_000) // rotate every 5 minutes
  return SQUAWK.map((s, i) => {
    const idx = (seedIdx + i) % SQUAWK.length
    return {
      id: `sq-${idx}-${seedIdx}`,
      ts: now - i * (4 + (idx % 7)) * 60_000,
      headline: SQUAWK[idx][1],
      summary: '',
      source: 'TITAN SQUAWK',
      url: null,
      category: SQUAWK[idx][0].toLowerCase(),
      live: false,
    }
  })
}

// Economic calendar — indicative weekly template (no free live source without
// a key); rendered with explicit "indicative schedule" labeling.
export function economicCalendar() {
  const base = new Date()
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  const day = (offset) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  return [
    { date: day(0), time: '09:45', region: 'US', event: 'S&P Global Manufacturing PMI (Flash)', impact: 'medium', consensus: '52.1', previous: '52.9' },
    { date: day(0), time: '10:00', region: 'US', event: 'Existing Home Sales', impact: 'low', consensus: '4.05M', previous: '4.01M' },
    { date: day(1), time: '08:30', region: 'US', event: 'Durable Goods Orders MoM', impact: 'medium', consensus: '0.6%', previous: '-1.1%' },
    { date: day(1), time: '10:00', region: 'US', event: 'CB Consumer Confidence', impact: 'high', consensus: '99.5', previous: '98.4' },
    { date: day(2), time: '08:30', region: 'US', event: 'GDP QoQ (Advance)', impact: 'high', consensus: '2.3%', previous: '2.1%' },
    { date: day(2), time: '10:30', region: 'US', event: 'EIA Crude Oil Inventories', impact: 'medium', consensus: '-1.2M', previous: '+3.0M' },
    { date: day(3), time: '08:30', region: 'US', event: 'Core PCE Price Index MoM', impact: 'high', consensus: '0.2%', previous: '0.2%' },
    { date: day(3), time: '08:30', region: 'US', event: 'Initial Jobless Claims', impact: 'medium', consensus: '224K', previous: '221K' },
    { date: day(3), time: '14:00', region: 'US', event: 'FOMC Rate Decision', impact: 'high', consensus: 'Hold', previous: 'Hold' },
    { date: day(4), time: '08:30', region: 'US', event: 'Nonfarm Payrolls', impact: 'high', consensus: '185K', previous: '206K' },
    { date: day(4), time: '08:30', region: 'US', event: 'Unemployment Rate', impact: 'high', consensus: '4.1%', previous: '4.1%' },
    { date: day(4), time: '10:00', region: 'US', event: 'ISM Manufacturing PMI', impact: 'high', consensus: '49.8', previous: '48.5' },
  ]
}
