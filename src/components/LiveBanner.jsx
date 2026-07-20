// Live-feed status strip. Markets stream live by default (crypto via CoinGecko,
// everything else via Yahoo Finance through a CORS proxy). This surfaces how
// many instruments are currently live and offers the optional Finnhub upgrade
// for maximum US-equity reliability. Dismissible; hidden once a key is set.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import { getFeedStatus } from '../lib/marketData.js'

export default function LiveBanner() {
  const { settings, updateSettings, marketRev } = useStore()
  const navigate = useNavigate()
  void marketRev // re-render as the feed status changes
  if (settings.finnhubKey || settings.liveBannerDismissed) return null
  const feed = getFeedStatus()
  const connecting = feed.live === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-titan-gold/35 bg-titan-faint px-4 py-3"
    >
      <span
        className={`w-2 h-2 rounded-full animate-pulseDot shrink-0 ${connecting ? 'bg-accent-amber' : 'bg-market-up'}`}
      />
      <div className="flex-1 min-w-[240px]">
        <div className="text-sm text-ink font-medium">
          {connecting
            ? 'Connecting to live market feeds…'
            : `${feed.live} instruments streaming live from the market.`}{' '}
          Refreshing every {Math.round(feed.refreshMs / 1000)}s.
        </div>
        <div className="text-2xs text-ink-dim mt-0.5">
          Crypto is live via CoinGecko; indices, equities, FX, commodities &amp; futures via Yahoo Finance — no key required. For the
          highest US-equity reliability, add a free Finnhub key.
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => navigate('/app/settings')} className="btn-gold px-3.5 py-2 text-xs">
          Data settings
        </button>
        <button onClick={() => updateSettings({ liveBannerDismissed: true })} className="btn-ghost px-3 py-2 text-xs">
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
