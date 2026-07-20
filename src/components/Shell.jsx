// Authenticated workspace shell: sidebar (desktop), topbar, ticker tape,
// bottom tab bar (mobile) and animated page outlet.
import React, { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TickerTape from './TickerTape.jsx'
import { useStore } from '../lib/store.jsx'
import { getFeedStatus } from '../lib/marketData.js'
import { fmtClock, classNames } from '../lib/format.js'
import logoGold from '../assets/titan-logo-gold.png'

/* ── inline icon set (16×16 stroke) ── */
function icon(path) {
  return function Icon({ className = '' }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {path}
      </svg>
    )
  }
}
const IconGrid = icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>)
const IconGlobe = icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.7 2.6 4 5.7 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.7-4-9s1.3-6.4 4-9z" /></>)
const IconChart = icon(<><path d="M3 21h18" /><path d="M6 17V9M11 17V5M16 17v-6M21 17V8" /></>)
const IconLedger = icon(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>)
const IconBriefcase = icon(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>)
const IconGauge = icon(<><path d="M12 15l4.5-6.5" /><path d="M4 19a9 9 0 1 1 16 0" /></>)
const IconNews = icon(<><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M8 9h5M8 13h5" /></>)
const IconTools = icon(<><path d="M14.7 6.3a4 4 0 0 0-5.6 4.9L3 17.3V21h3.7l6.1-6.1a4 4 0 0 0 4.9-5.6l-2.8 2.8-2.1-2.1z" /></>)
const IconTerminal = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>)
const IconCog = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></>)
const IconMenu = icon(<path d="M4 6h16M4 12h16M4 18h16" />)

const NAV = [
  { to: '/app', label: 'Overview', icon: IconGrid, end: true },
  { to: '/app/markets', label: 'Markets', icon: IconGlobe },
  { to: '/app/charts', label: 'Charting', icon: IconChart },
  { to: '/app/trades', label: 'Trade Blotter', icon: IconLedger },
  { to: '/app/portfolio', label: 'Portfolio', icon: IconBriefcase },
  { to: '/app/analytics', label: 'Analytics', icon: IconGauge },
  { to: '/app/news', label: 'News & Calendar', icon: IconNews },
  { to: '/app/tools', label: 'Trader Tools', icon: IconTools },
  { to: '/app/terminal', label: 'Titan Terminal', icon: IconTerminal, pro: true },
  { to: '/app/settings', label: 'Settings', icon: IconCog },
]

const MOBILE_NAV = ['/app', '/app/markets', '/app/charts', '/app/trades', '/app/terminal']

export default function Shell() {
  const { session, signOut, isPro, marketRev } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const feed = useMemo(() => getFeedStatus(), [marketRev])

  return (
    <div className="h-full flex flex-col bg-obsidian-900">
      {/* ── topbar ── */}
      <header className="flex items-center gap-3 px-3 md:px-5 h-14 border-b border-line bg-obsidian-850/90 backdrop-blur z-40 shrink-0">
        <button
          className="md:hidden p-2 -ml-1 text-ink-soft hover:text-ink"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu className="w-5 h-5" />
        </button>
        <button onClick={() => navigate('/app')} className="flex items-center gap-2.5 group">
          <TitanMark className="w-7 h-7" />
          <div className="hidden sm:block text-left leading-none">
            <div className="font-brand font-semibold text-[15px] tracking-wide text-ink group-hover:text-titan-bright transition-colors">
              TITAN MARKETS
            </div>
            <div className="text-3xs tracking-wide2 uppercase text-titan-gold/80 mt-1">Trade Terminal</div>
          </div>
        </button>

        <div className="flex-1" />

        <FeedPill feed={feed} />
        <div className="hidden md:flex items-center gap-1.5 font-mono text-2xs text-ink-dim tabular">
          <span className="w-1.5 h-1.5 rounded-full bg-market-up animate-pulseDot" />
          {fmtClock(Date.now())} CT
        </div>

        {isPro && (
          <span className="hidden sm:inline-flex items-center rounded-md border border-titan-gold/40 bg-titan-faint px-2 py-1 text-3xs font-semibold tracking-caps text-titan-bright">
            INSTITUTIONAL
          </span>
        )}

        <div className="relative group">
          <button className="flex items-center gap-2 rounded-lg border border-line-strong px-2 py-1.5 hover:border-titan-gold/40 transition-colors">
            <span className="w-6 h-6 rounded-full bg-titan-faint border border-titan-gold/40 flex items-center justify-center text-3xs font-semibold text-titan-bright">
              {initials(session?.name)}
            </span>
            <span className="hidden lg:block text-xs text-ink-soft max-w-[120px] truncate">{session?.name}</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 w-52 panel-raised p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
            <div className="px-3 py-2 border-b border-line-soft mb-1">
              <div className="text-sm text-ink truncate">{session?.name}</div>
              <div className="text-2xs text-ink-dim truncate">{session?.email}</div>
              <div className="text-3xs mt-1 uppercase tracking-caps text-titan-gold">
                {isPro ? session?.desk || 'Institutional' : 'Retail Account'}
              </div>
            </div>
            <button
              onClick={() => navigate('/app/settings')}
              className="w-full text-left px-3 py-2 text-sm text-ink-soft hover:text-ink hover:bg-obsidian-600 rounded-md transition-colors"
            >
              Account settings
            </button>
            <button
              onClick={() => {
                signOut()
                navigate('/')
              }}
              className="w-full text-left px-3 py-2 text-sm text-market-down hover:bg-market-downDim rounded-md transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <TickerTape />

      <div className="flex flex-1 min-h-0">
        {/* ── sidebar (desktop) ── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-line bg-obsidian-850/60">
          <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
            {NAV.map((item) => (
              <SideLink key={item.to} item={item} isPro={isPro} />
            ))}
          </nav>
          <div className="p-3 border-t border-line-soft">
            <div className="text-3xs uppercase tracking-caps text-ink-faint leading-relaxed">
              Precision. Strategy.
              <br />
              Performance.
            </div>
            <div className="text-3xs text-ink-faint mt-2">© {new Date().getFullYear()} Titan Markets LLC</div>
          </div>
        </aside>

        {/* ── animated page outlet ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-6" id="page-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
              className="p-3 md:p-5 max-w-[1600px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-obsidian-950/95 backdrop-blur border-t border-line flex pb-safe">
        {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map((item) => {
          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
          const locked = item.pro && !isPro
          return (
            <button
              key={item.to}
              onClick={() => !locked && navigate(item.to)}
              className={classNames(
                'flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors',
                active ? 'text-titan-bright' : locked ? 'text-ink-faint' : 'text-ink-dim'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-3xs font-medium">{item.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </nav>

      {/* ── mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div className="fixed inset-0 z-[80] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute left-0 top-0 bottom-0 w-64 bg-obsidian-850 border-r border-line p-3 overflow-y-auto"
            >
              <div className="flex items-center gap-2.5 px-2 py-3 mb-2 border-b border-line-soft">
                <TitanMark className="w-7 h-7" />
                <div>
                  <div className="font-brand font-semibold text-sm text-ink">TITAN MARKETS</div>
                  <div className="text-3xs tracking-wide2 uppercase text-titan-gold/80">Trade Terminal</div>
                </div>
              </div>
              {NAV.map((item) => (
                <div key={item.to} onClick={() => setMenuOpen(false)}>
                  <SideLink item={item} isPro={isPro} />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SideLink({ item, isPro }) {
  const locked = item.pro && !isPro
  return (
    <NavLink
      to={locked ? '#' : item.to}
      end={item.end}
      onClick={(e) => locked && e.preventDefault()}
      className={({ isActive }) =>
        classNames(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 group',
          isActive && !locked
            ? 'bg-titan-faint text-titan-bright border border-titan-gold/25'
            : locked
              ? 'text-ink-faint cursor-not-allowed'
              : 'text-ink-soft hover:text-ink hover:bg-obsidian-700 border border-transparent'
        )
      }
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.pro && (
        <span className={classNames('text-3xs font-semibold tracking-wider', locked ? 'text-ink-faint' : 'text-titan-gold')}>
          {locked ? '🔒' : 'PRO'}
        </span>
      )}
    </NavLink>
  )
}

function FeedPill({ feed }) {
  const live = feed?.live ?? 0
  return (
    <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-line-strong px-2 py-1 font-mono text-3xs text-ink-dim">
      <span className={classNames('w-1.5 h-1.5 rounded-full animate-pulseDot', live > 0 ? 'bg-market-up' : 'bg-accent-amber')} />
      {live > 0 ? `${live} LIVE` : 'REF FEED'} · {Math.round((feed?.refreshMs ?? 60000) / 1000)}s
    </div>
  )
}

// Titan Markets LLC firm mark — warrior shield with rising bars
export function TitanMark({ className = '' }) {
  return <img src={logoGold} alt="Titan Markets LLC" className={classNames('object-contain select-none', className)} draggable={false} />
}

const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'TM'

