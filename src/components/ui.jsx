// Shared UI kit — panels, stats, badges, modals, sparklines, controls.
import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { classNames, upDownClass, fmtPct } from '../lib/format.js'

export function Panel({ className = '', children, ...rest }) {
  return (
    <div className={classNames('panel', className)} {...rest}>
      {children}
    </div>
  )
}

export function PanelHeader({ title, hint, right, className = '' }) {
  return (
    <div className={classNames('flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5 border-b border-line-soft', className)}>
      <div className="min-w-0">
        <div className="label-caps">{title}</div>
        {hint ? <div className="text-2xs text-ink-faint mt-0.5 truncate">{hint}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2 shrink-0">{right}</div> : null}
    </div>
  )
}

export function Stat({ label, value, sub, tone, mono = true, big = false }) {
  return (
    <div className="min-w-0">
      <div className="label-caps">{label}</div>
      <div
        className={classNames(
          mono && 'font-mono tabular',
          big ? 'text-2xl md:text-[1.7rem] font-semibold mt-1' : 'text-lg font-medium mt-0.5',
          tone === 'up' ? 'text-market-up' : tone === 'down' ? 'text-market-down' : tone === 'gold' ? 'text-titan-gold' : 'text-ink'
        )}
      >
        {value}
      </div>
      {sub ? <div className="text-2xs text-ink-dim mt-0.5 truncate">{sub}</div> : null}
    </div>
  )
}

export function DeltaBadge({ value, className = '' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-2xs font-medium tabular',
        value > 0 ? 'bg-market-upDim text-market-up' : value < 0 ? 'bg-market-downDim text-market-down' : 'bg-obsidian-600 text-ink-soft',
        className
      )}
    >
      {value > 0 ? '▲' : value < 0 ? '▼' : '■'} {fmtPct(Math.abs(value), 2, false)}
    </span>
  )
}

export function SourceBadge({ source }) {
  const map = {
    live: { label: 'LIVE', cls: 'text-market-up border-market-up/40 bg-market-upDim' },
    ref: { label: 'REF', cls: 'text-accent-amber border-accent-amber/40 bg-accent-amber/10' },
    sim: { label: 'SIM', cls: 'text-ink-dim border-line-strong bg-obsidian-700' },
  }
  const m = map[source] ?? map.sim
  return (
    <span className={classNames('inline-flex items-center rounded px-1 py-px font-mono text-3xs font-semibold tracking-wider border', m.cls)}>
      {m.label}
    </span>
  )
}

export function Tag({ children, tone = 'default' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-2xs font-medium',
        tone === 'gold'
          ? 'bg-titan-faint text-titan-bright border border-titan-gold/25'
          : tone === 'up'
            ? 'bg-market-upDim text-market-up'
            : tone === 'down'
              ? 'bg-market-downDim text-market-down'
              : 'bg-obsidian-600 text-ink-soft'
      )}
    >
      {children}
    </span>
  )
}

export function Sparkline({ data, width = 110, height = 34, tone }) {
  const id = useRef(`sg${Math.random().toString(36).slice(2, 8)}`).current
  if (!data || data.length < 2) return <div style={{ width, height }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`)
  const up = tone != null ? tone > 0 : data[data.length - 1] >= data[0]
  const color = up ? '#19C784' : '#EF4353'
  return (
    <svg width={width} height={height} className="block shrink-0" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(' ')} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={classNames(
              'relative w-full panel-raised shadow-modal max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-xl',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line-soft sticky top-0 bg-obsidian-700/95 backdrop-blur z-10">
              <h3 className="font-brand text-lg text-ink">{title}</h3>
              <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors text-xl leading-none px-1" aria-label="Close">
                ×
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={classNames(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 border',
          checked ? 'bg-titan-gold/90 border-titan-gold' : 'bg-obsidian-600 border-line-strong'
        )}
      >
        <span
          className={classNames(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          )}
        />
      </span>
      {label ? <span className="text-sm text-ink-soft group-hover:text-ink transition-colors">{label}</span> : null}
    </button>
  )
}

export function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={classNames(
        'rounded-lg bg-obsidian-850 border border-line-strong px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-titan-gold/60 cursor-pointer',
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="py-12 text-center">
      <div className="text-ink-dim text-sm">{title}</div>
      {hint ? <div className="text-ink-faint text-xs mt-1">{hint}</div> : null}
    </div>
  )
}

export function GoldDivider({ className = '' }) {
  return <div className={classNames('gold-rule', className)} />
}

export function PriceCell({ value, dir, children, className = '' }) {
  const ref = useRef(null)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove('flash-up', 'flash-down')
      void ref.current.offsetWidth
      ref.current.classList.add(value > prev.current ? 'flash-up' : 'flash-down')
      prev.current = value
    }
  }, [value])
  return (
    <span ref={ref} className={classNames('rounded px-1 -mx-1 transition-colors', className)}>
      {children}
    </span>
  )
}

export { upDownClass, classNames }
