// News & Calendar — market intelligence feed + weekly economic schedule.
// Distinct role: information flow; the Terminal squawk is the pro fast-tape.
import React, { useEffect, useMemo, useState } from 'react'
import Reveal from '../components/Reveal.jsx'
import { Panel, PanelHeader, Tag, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getNews, economicCalendar } from '../lib/news.js'
import { fmtAgo, fmtClock } from '../lib/format.js'

export default function News() {
  const { settings } = useStore()
  const [wire, setWire] = useState({ items: [], live: false })
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')
  const calendar = useMemo(() => economicCalendar(), [])
  const today = new Date().toISOString().slice(0, 10)

  const refresh = async (force = false) => {
    setLoading(true)
    try {
      setWire(await getNews({ finnhubKey: settings.finnhubKey, force }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    if (!settings.newsAutoRefresh) return
    const t = setInterval(() => refresh(true), 120_000)
    return () => clearInterval(t)
  }, [settings.finnhubKey, settings.newsAutoRefresh])

  const cats = useMemo(() => ['all', ...new Set(wire.items.map((n) => n.category))].slice(0, 8), [wire.items])
  const items = useMemo(() => (cat === 'all' ? wire.items : wire.items.filter((n) => n.category === cat)), [wire.items, cat])

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-titan-gold">Market Intelligence</div>
            <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">News & Calendar</h1>
            <p className="text-xs text-ink-dim mt-1">
              {wire.live ? 'Live wire connected' : 'Titan squawk fallback (add a Finnhub key in Settings for full live news)'} · auto-refresh every 2 min
            </p>
          </div>
          <button onClick={() => refresh(true)} className="btn-ghost px-3.5 py-2 text-xs" disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh wire'}
          </button>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="News Wire"
              hint={`${items.length} headlines`}
              right={
                <div className="flex gap-1 overflow-x-auto max-w-[300px]">
                  {cats.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={classNames(
                        'px-2 py-1 rounded-md text-3xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors',
                        cat === c ? 'bg-titan-faint text-titan-bright' : 'text-ink-dim hover:text-ink'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="divide-y divide-line-soft max-h-[640px] overflow-y-auto">
              {loading && items.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-4 py-4">
                      <div className="shimmer h-3.5 rounded w-3/4 mb-2" />
                      <div className="shimmer h-2.5 rounded w-1/3" />
                    </div>
                  ))
                : items.map((n) => (
                    <a
                      key={n.id}
                      href={n.url ?? '#'}
                      target={n.url ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={(e) => !n.url && e.preventDefault()}
                      className="block px-4 py-3.5 hover:bg-obsidian-750 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-ink leading-snug group-hover:text-titan-bright transition-colors">{n.headline}</div>
                          {n.summary ? <div className="text-2xs text-ink-dim mt-1 line-clamp-2 leading-relaxed">{n.summary}</div> : null}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-3xs font-mono text-titan-gold/80 uppercase">{n.source}</span>
                            <span className="text-3xs text-ink-faint">·</span>
                            <span className="text-3xs font-mono text-ink-faint">{fmtAgo(n.ts)}</span>
                            {!n.live && <Tag>SIM</Tag>}
                          </div>
                        </div>
                        <span className="text-ink-faint group-hover:text-titan-gold transition-colors mt-1">→</span>
                      </div>
                    </a>
                  ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.08}>
          <Panel>
            <PanelHeader title="Economic Calendar" hint="This week · Eastern Time · indicative schedule" />
            <div className="divide-y divide-line-soft max-h-[640px] overflow-y-auto">
              {calendar.map((e, i) => (
                <div key={i} className={classNames('px-4 py-3', e.date === today && 'bg-titan-faint/40')}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-ink-dim w-14 shrink-0">
                      {e.date.slice(5)} {e.time}
                    </span>
                    <span
                      className={classNames(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        e.impact === 'high' ? 'bg-market-down' : e.impact === 'medium' ? 'bg-accent-amber' : 'bg-ink-faint'
                      )}
                      title={`${e.impact} impact`}
                    />
                    <span className="text-xs text-ink flex-1 leading-snug">{e.event}</span>
                  </div>
                  <div className="flex gap-4 mt-1.5 ml-[72px] font-mono text-3xs text-ink-dim">
                    <span>Cons {e.consensus}</span>
                    <span>Prev {e.previous}</span>
                    <span className="text-ink-faint">{e.region}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}
