// Settings — account, data providers, workspace preferences, data management.
import React, { useState } from 'react'
import Reveal from '../components/Reveal.jsx'
import { Panel, PanelHeader, Toggle, Select, Modal, Tag, classNames } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'
import { getGoogleClientId, setGoogleClientId, getDeskCode, setDeskCode } from '../lib/auth.js'
import { exportWorkspaceJson } from '../lib/csv.js'
import { seedTrades } from '../lib/trades.js'

export default function Settings() {
  const { session, settings, updateSettings, trades, setTrades, watchlist, isPro, refreshNow } = useStore()
  const [googleId, setGoogleId] = useState(getGoogleClientId())
  const [deskCode, setDeskCodeState] = useState(isPro ? getDeskCode() : '')
  const [confirmReset, setConfirmReset] = useState(null) // 'reseed' | 'wipe'
  const [savedFlash, setSavedFlash] = useState('')

  const flash = (msg) => {
    setSavedFlash(msg)
    setTimeout(() => setSavedFlash(''), 2200)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Reveal>
        <div>
          <div className="label-caps text-titan-gold">Workspace Configuration</div>
          <h1 className="font-brand text-2xl md:text-[1.8rem] text-ink mt-1">Settings</h1>
          {savedFlash && <p className="text-xs text-market-up mt-1">{savedFlash}</p>}
        </div>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader title="Account" hint="Session and access profile" />
          <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Name" value={session?.name} />
            <Info label="Email" value={session?.email} />
            <Info label="Access tier" value={<Tag tone={isPro ? 'gold' : 'default'}>{isPro ? 'INSTITUTIONAL' : 'RETAIL'}</Tag>} />
            <Info label="Sign-in method" value={session?.provider === 'google' ? 'Google' : 'Email + password'} />
            {isPro && <Info label="Desk" value={session?.desk ?? '—'} />}
            <Info label="Session persistence" value={session?.remember ? 'Remembered (localStorage)' : 'This browser session only'} />
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader title="Market Data" hint="Feed cadence and live providers" />
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-ink">Refresh interval</div>
                <div className="text-2xs text-ink-dim mt-0.5">How often every ticker re-syncs with live sources</div>
              </div>
              <Select
                value={String(settings.refreshSec)}
                onChange={(v) => {
                  updateSettings({ refreshSec: parseInt(v) })
                  flash('Refresh cadence updated.')
                }}
                options={[
                  { value: '30', label: 'Every 30 seconds' },
                  { value: '60', label: 'Every 60 seconds (market standard)' },
                  { value: '120', label: 'Every 2 minutes' },
                  { value: '300', label: 'Every 5 minutes' },
                ]}
              />
            </div>
            <div>
              <div className="text-sm text-ink">Finnhub API key <span className="text-2xs text-ink-dim">(free tier — enables live equities & full news wire)</span></div>
              <div className="flex gap-2 mt-2">
                <input
                  className="input-dark font-mono text-xs"
                  placeholder="paste key from finnhub.io/register"
                  value={settings.finnhubKey}
                  onChange={(e) => updateSettings({ finnhubKey: e.target.value.trim() })}
                />
                <button
                  onClick={() => {
                    refreshNow()
                    flash('Feed re-synced with the new provider key.')
                  }}
                  className="btn-ghost px-4 text-xs shrink-0"
                >
                  Test & sync
                </button>
              </div>
              <p className="text-2xs text-ink-dim mt-1.5 leading-relaxed">
                Without a key: crypto is live via CoinGecko/Binance, FX uses daily reference rates, and equities/indices run on the labeled
                Titan reference simulation. With a free key, equities and news go fully live.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-ink">Auto-refresh news wire</div>
                <div className="text-2xs text-ink-dim mt-0.5">Re-pull headlines every 2 minutes</div>
              </div>
              <Toggle checked={settings.newsAutoRefresh} onChange={(v) => updateSettings({ newsAutoRefresh: v })} />
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader title="Trading Profile" hint="Used by the Overview equity model and Tools defaults" />
          <div className="p-4 grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="label-caps mb-1.5 block">Account base equity ($)</span>
              <input
                type="number"
                className="input-dark font-mono"
                value={settings.accountEquity}
                onChange={(e) => updateSettings({ accountEquity: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block">
              <span className="label-caps mb-1.5 block">Default risk per trade (%)</span>
              <input
                type="number"
                step="0.1"
                className="input-dark font-mono"
                value={settings.riskPerTradePct}
                onChange={(e) => updateSettings({ riskPerTradePct: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label-caps mb-1.5 block">Default charting symbol</span>
              <input
                className="input-dark font-mono uppercase"
                value={settings.defaultSymbol}
                onChange={(e) => updateSettings({ defaultSymbol: e.target.value.toUpperCase() })}
              />
            </label>
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader title="Integrations" hint="Google sign-in & institutional access control" />
          <div className="p-4 space-y-4">
            <div>
              <div className="text-sm text-ink">Google OAuth Client ID</div>
              <div className="flex gap-2 mt-2">
                <input
                  className="input-dark font-mono text-xs"
                  placeholder="xxxx.apps.googleusercontent.com"
                  value={googleId}
                  onChange={(e) => setGoogleId(e.target.value.trim())}
                />
                <button
                  onClick={() => {
                    setGoogleClientId(googleId)
                    flash('Google client ID saved — the official button renders on next sign-in.')
                  }}
                  className="btn-ghost px-4 text-xs shrink-0"
                >
                  Save
                </button>
              </div>
              <p className="text-2xs text-ink-dim mt-1.5">
                Create one at console.cloud.google.com → Credentials → OAuth client ID (Web), add this site's origin, paste the ID here.
              </p>
            </div>
            {isPro && (
              <div>
                <div className="text-sm text-ink">Desk access code <span className="text-2xs text-ink-dim">(required by the Professional portal)</span></div>
                <div className="flex gap-2 mt-2">
                  <input
                    className="input-dark font-mono text-xs tracking-widest"
                    value={deskCode}
                    onChange={(e) => setDeskCodeState(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      setDeskCode(deskCode)
                      flash('Desk access code rotated.')
                    }}
                    className="btn-ghost px-4 text-xs shrink-0"
                  >
                    Rotate
                  </button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </Reveal>

      <Reveal>
        <Panel>
          <PanelHeader title="Data Management" hint="Everything is stored locally in this browser" />
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={() => exportWorkspaceJson({ trades, watchlist, settings: { ...settings, finnhubKey: undefined } })}
              className="btn-ghost px-4 py-2 text-xs"
            >
              ⤓ Export full workspace (JSON)
            </button>
            <button onClick={() => setConfirmReset('reseed')} className="btn-ghost px-4 py-2 text-xs">
              ↺ Restore demo blotter
            </button>
            <button
              onClick={() => setConfirmReset('wipe')}
              className="rounded-lg border border-market-down/40 text-market-down px-4 py-2 text-xs hover:bg-market-downDim transition-colors"
            >
              ✕ Clear all trades
            </button>
          </div>
        </Panel>
      </Reveal>

      <Modal
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title={confirmReset === 'wipe' ? 'Clear all trades' : 'Restore demo blotter'}
      >
        <p className="text-sm text-ink-soft leading-relaxed">
          {confirmReset === 'wipe'
            ? 'This permanently deletes every trade in the blotter. Export a backup first if you need the records.'
            : 'This replaces the current blotter with the original Titan demo dataset. Current trades will be lost.'}
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setConfirmReset(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => {
              setTrades(confirmReset === 'wipe' ? [] : seedTrades())
              setConfirmReset(null)
              flash(confirmReset === 'wipe' ? 'Blotter cleared.' : 'Demo blotter restored.')
            }}
            className={classNames(
              'px-5 py-2 text-sm font-semibold rounded-lg transition-colors',
              confirmReset === 'wipe' ? 'bg-market-down/90 hover:bg-market-down text-white' : 'btn-gold'
            )}
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="text-ink mt-1">{value ?? '—'}</div>
    </div>
  )
}
