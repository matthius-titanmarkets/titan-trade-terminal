// One-click path to full live coverage. Shown until a Finnhub key is saved
// (crypto and FX reference feeds are live out of the box; equities need the key).
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import { getFeedStatus } from '../lib/marketData.js'

export default function LiveBanner() {
  const { settings, updateSettings } = useStore()
  const navigate = useNavigate()
  if (settings.finnhubKey || settings.liveBannerDismissed) return null
  const feed = getFeedStatus()

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-titan-gold/35 bg-titan-faint px-4 py-3"
    >
      <span className="w-2 h-2 rounded-full bg-market-up animate-pulseDot shrink-0" />
      <div className="flex-1 min-w-[240px]">
        <div className="text-sm text-ink font-medium">
          {feed.live > 0 ? `${feed.live} instruments are streaming live.` : 'Live sources are connecting.'} Unlock the full live
          board — equities, indices &amp; the complete news wire.
        </div>
        <div className="text-2xs text-ink-dim mt-0.5">
          Crypto and FX are live/reference out of the box. Add a free Finnhub key (60 seconds to create) to take every US equity live at
          your {Math.round(feed.refreshMs / 1000)}s refresh.
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => navigate('/app/settings')} className="btn-gold px-3.5 py-2 text-xs">
          Go fully live
        </button>
        <button onClick={() => updateSettings({ liveBannerDismissed: true })} className="btn-ghost px-3 py-2 text-xs">
          Later
        </button>
      </div>
    </motion.div>
  )
}
