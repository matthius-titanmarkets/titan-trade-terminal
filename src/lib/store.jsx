// Global app store: session, settings, trades, watchlist + market engine glue.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getSession, signOut as authSignOut, ensureSeedUsers } from './auth.js'
import { seedTrades } from './trades.js'
import { DEFAULT_WATCHLIST } from './universe.js'
import { startEngine, configureEngine, subscribeMarket, forceTick } from './marketData.js'

const TRADES_KEY = 'titan.trades.v1'
const SETTINGS_KEY = 'titan.settings.v1'
const WATCHLIST_KEY = 'titan.watchlist.v1'

const DEFAULT_SETTINGS = {
  refreshSec: 60,
  finnhubKey: '',
  compactMode: false,
  soundAlerts: false,
  defaultSymbol: 'SPX',
  accountEquity: 250000,
  riskPerTradePct: 1.0,
  newsAutoRefresh: true,
}

const StoreCtx = createContext(null)

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [session, setSession] = useState(() => getSession())
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(SETTINGS_KEY, {}) }))
  const [trades, setTrades] = useState(() => load(TRADES_KEY, null) ?? seedTrades())
  const [watchlist, setWatchlist] = useState(() => load(WATCHLIST_KEY, DEFAULT_WATCHLIST))
  const [marketRev, setMarketRev] = useState(0) // bumps on every engine tick

  useEffect(() => {
    ensureSeedUsers()
  }, [])

  // market engine lifecycle — runs while authenticated
  useEffect(() => {
    if (!session) return
    startEngine({ refresh: settings.refreshSec * 1000, key: settings.finnhubKey })
    const un = subscribeMarket(() => setMarketRev((r) => r + 1))
    return un
  }, [session])

  useEffect(() => {
    configureEngine({ refresh: settings.refreshSec * 1000, key: settings.finnhubKey })
  }, [settings.refreshSec, settings.finnhubKey])

  useEffect(() => localStorage.setItem(TRADES_KEY, JSON.stringify(trades)), [trades])
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), [settings])
  useEffect(() => localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist)), [watchlist])

  const signOut = useCallback(() => {
    authSignOut()
    setSession(null)
  }, [])

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  const addTrade = useCallback((t) => setTrades((ts) => [{ ...t, id: t.id || `T-${crypto.randomUUID().slice(0, 8)}` }, ...ts]), [])
  const updateTrade = useCallback((id, patch) => setTrades((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))), [])
  const removeTrade = useCallback((id) => setTrades((ts) => ts.filter((t) => t.id !== id)), [])
  const importTrades = useCallback((incoming, mode = 'merge') => {
    setTrades((ts) => {
      if (mode === 'replace') return incoming
      const seen = new Set(ts.map((t) => t.id))
      return [...incoming.filter((t) => !seen.has(t.id)), ...ts]
    })
  }, [])

  const toggleWatch = useCallback(
    (sym) => setWatchlist((w) => (w.includes(sym) ? w.filter((s) => s !== sym) : [...w, sym])),
    []
  )

  const value = useMemo(
    () => ({
      session,
      setSession,
      signOut,
      settings,
      updateSettings,
      trades,
      addTrade,
      updateTrade,
      removeTrade,
      importTrades,
      setTrades,
      watchlist,
      toggleWatch,
      marketRev,
      refreshNow: forceTick,
      isPro: session?.tier === 'professional',
    }),
    [session, settings, trades, watchlist, marketRev, signOut, updateSettings, addTrade, updateTrade, removeTrade, importTrades, toggleWatch]
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
