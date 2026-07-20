// Authentication gate — dual portals (Retail / Institutional), remember me,
// Google sign-in via Google Identity Services, demo credentials surfaced.
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  signIn, signUp, signInWithGoogleCredential,
  loadGis, getGoogleClientId, DEFAULT_DESK_CODE,
} from '../lib/auth.js'
import { useStore } from '../lib/store.jsx'
import { TitanMark } from '../components/Shell.jsx'
import { GoldDivider } from '../components/ui.jsx'
import { classNames } from '../lib/format.js'
import logoGold from '../assets/titan-logo-gold.png'

const ease = [0.22, 0.61, 0.36, 1]

export default function Login() {
  const { setSession } = useStore()
  const navigate = useNavigate()
  const [tier, setTier] = useState('retail') // 'retail' | 'professional'
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', deskCode: '' })
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [gisState, setGisState] = useState('idle') // idle | ready | unavailable
  const googleBtnRef = useRef(null)

  const pro = tier === 'professional'

  // Google Identity Services — renders the official button when a client ID exists
  useEffect(() => {
    let cancelled = false
    const clientId = getGoogleClientId()
    if (!clientId) {
      setGisState('unavailable')
      return
    }
    loadGis()
      .then((google) => {
        if (cancelled || !googleBtnRef.current) return
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            try {
              const session = signInWithGoogleCredential(resp.credential, tier, remember)
              setSession(session)
              navigate('/app')
            } catch (e) {
              setError(e.message)
            }
          },
        })
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'rectangular',
        })
        setGisState('ready')
      })
      .catch(() => setGisState('unavailable'))
    return () => {
      cancelled = true
    }
  }, [tier, remember, navigate, setSession])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const fn = mode === 'signin' ? signIn : signUp
      const session = await fn({ ...form, tier, remember })
      setSession(session)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-full auth-backdrop grid-backdrop flex flex-col lg:flex-row">
      {/* ── brand panel ── */}
      <div className="lg:w-[46%] xl:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-14 relative overflow-hidden">
        <motion.img
          src={logoGold}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ duration: 1.4, ease }}
          className="absolute -right-20 -bottom-24 w-[480px] max-w-none pointer-events-none select-none hidden lg:block"
        />
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
          <div className="flex items-center gap-3">
            <TitanMark className="w-10 h-10" />
            <div>
              <div className="font-brand font-bold text-xl tracking-wide text-ink">TITAN MARKETS LLC</div>
              <div className="text-3xs tracking-wide2 uppercase text-titan-gold mt-0.5">Chicago · Proprietary Trading</div>
            </div>
          </div>
        </motion.div>

        <div className="py-10 lg:py-0">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="font-brand text-4xl md:text-5xl xl:text-[3.4rem] leading-[1.08] text-ink"
          >
            Precision.
            <br />
            Strategy.
            <br />
            <span className="text-titan-gold">Performance.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft"
          >
            The Titan Trade Terminal delivers institutional-grade analytics, live multi-asset market data and
            disciplined risk tooling — for professional desks and serious retail traders alike.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-10 grid grid-cols-3 gap-4 max-w-md"
          >
            {[
              ['Long / Short Equity', 'Fundamental & factor-driven'],
              ['Global Macro', 'Rates, FX & commodities'],
              ['Quantitative', 'Systematic alpha signals'],
            ].map(([t, s]) => (
              <div key={t} className="border-l border-titan-gold/40 pl-3">
                <div className="text-xs font-semibold text-ink leading-snug">{t}</div>
                <div className="text-2xs text-ink-dim mt-1 leading-snug">{s}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="hidden lg:block">
          <GoldDivider className="mb-4 max-w-md" />
          <div className="flex gap-8 text-2xs text-ink-dim max-w-md">
            <span>1,000+ clients served</span>
            <span>Multi-asset coverage</span>
            <span>U.S. regulatory compliance</span>
          </div>
        </motion.div>
      </div>

      {/* ── auth card ── */}
      <div className="flex-1 flex items-center justify-center p-5 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className={classNames(
            'w-full max-w-[430px] rounded-2xl border bg-obsidian-800/90 backdrop-blur shadow-modal overflow-hidden',
            pro ? 'border-titan-gold/40 shadow-goldglow' : 'border-line-strong'
          )}
        >
          {/* portal switch */}
          <div className="grid grid-cols-2 border-b border-line-soft">
            {[
              ['retail', 'Retail Access', 'Individual trading account'],
              ['professional', 'Professional', 'Institutional desk portal'],
            ].map(([key, label, sub]) => (
              <button
                key={key}
                onClick={() => {
                  setTier(key)
                  setError('')
                }}
                className={classNames(
                  'relative px-4 py-3.5 text-left transition-colors duration-200',
                  tier === key ? 'bg-obsidian-700' : 'hover:bg-obsidian-750'
                )}
              >
                <div
                  className={classNames(
                    'text-[13px] font-semibold tracking-wide',
                    tier === key ? (key === 'professional' ? 'text-titan-bright' : 'text-ink') : 'text-ink-dim'
                  )}
                >
                  {label}
                </div>
                <div className="text-3xs text-ink-faint mt-0.5">{sub}</div>
                {tier === key && (
                  <motion.div layoutId="portal-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-titan-gold" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={tier + mode}
                initial={{ opacity: 0, x: tier === 'professional' ? 24 : -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tier === 'professional' ? -24 : 24 }}
                transition={{ duration: 0.28, ease }}
              >
                <h2 className="font-brand text-2xl text-ink">
                  {mode === 'signin'
                    ? pro ? 'Institutional Sign In' : 'Welcome back'
                    : pro ? 'Institutional Enrollment' : 'Create your account'}
                </h2>
                <p className="text-xs text-ink-dim mt-1.5 leading-relaxed">
                  {pro
                    ? 'Access to the Titan Terminal requires a firm-issued desk access code. Retail credentials will not authenticate here.'
                    : 'Sign in to your Titan Markets retail dashboard.'}
                </p>

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                  {mode === 'signup' && (
                    <Field label="Full name">
                      <input className="input-dark" value={form.name} onChange={set('name')} placeholder="Alex Sterling" autoComplete="name" />
                    </Field>
                  )}
                  <Field label={pro ? 'Firm email' : 'Email address'}>
                    <input
                      className="input-dark"
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                      placeholder={pro ? 'you@thetitanmarketsllc.com' : 'you@example.com'}
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      className="input-dark"
                      type="password"
                      required
                      value={form.password}
                      onChange={set('password')}
                      placeholder="••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    />
                  </Field>
                  <AnimatePresence>
                    {pro && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Field label="Desk access code" gold>
                          <input
                            className="input-dark font-mono tracking-widest border-titan-gold/40"
                            value={form.deskCode}
                            onChange={set('deskCode')}
                            placeholder="TITAN-••••-••••"
                            autoComplete="off"
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-line-strong bg-obsidian-850 accent-[#C9A43A] cursor-pointer"
                      />
                      <span className="text-xs text-ink-soft group-hover:text-ink transition-colors">Remember me</span>
                    </label>
                    <button type="button" className="text-xs text-ink-dim hover:text-titan-bright transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-market-down/40 bg-market-downDim px-3 py-2.5 text-xs text-market-down"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button type="submit" disabled={busy} className="btn-gold w-full py-2.5 text-sm">
                    {busy ? 'Authenticating…' : mode === 'signin' ? (pro ? 'Enter the Terminal' : 'Sign in to Dashboard') : 'Create account'}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-3xs uppercase tracking-caps text-ink-faint">or continue with</span>
                  <div className="flex-1 h-px bg-line" />
                </div>

                {/* Google sign-in */}
                {gisState === 'ready' ? (
                  <div ref={googleBtnRef} className="flex justify-center" />
                ) : (
                  <GoogleFallbackButton
                    disabled={pro}
                    onNeedsSetup={() =>
                      setError(
                        pro
                          ? 'Google sign-in is available on the Retail portal only.'
                          : 'Google sign-in requires a Google OAuth Client ID. Add one in Settings → Integrations (or VITE_GOOGLE_CLIENT_ID) and reload — see README for the 2-minute setup.'
                      )
                    }
                  />
                )}

                <div className="mt-5 text-center text-xs text-ink-dim">
                  {mode === 'signin' ? (
                    <>
                      New to Titan Markets?{' '}
                      <button onClick={() => { setMode('signup'); setError('') }} className="text-titan-bright hover:underline font-medium">
                        {pro ? 'Request enrollment' : 'Create an account'}
                      </button>
                    </>
                  ) : (
                    <>
                      Already have access?{' '}
                      <button onClick={() => { setMode('signin'); setError('') }} className="text-titan-bright hover:underline font-medium">
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* demo access strip */}
          <div className="px-6 py-3.5 bg-obsidian-850/80 border-t border-line-soft">
            <div className="text-3xs uppercase tracking-caps text-ink-faint mb-1.5">Demo access</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-3xs text-ink-dim leading-relaxed">
              <span>retail@titanmarkets.com · titan123</span>
              <span>
                pro@titanmarkets.com · titan123 · <span className="text-titan-gold/80">{DEFAULT_DESK_CODE}</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Field({ label, gold, children }) {
  return (
    <label className="block">
      <span className={classNames('label-caps mb-1.5 block', gold && 'text-titan-gold')}>{label}</span>
      {children}
    </label>
  )
}

function GoogleFallbackButton({ onNeedsSetup, disabled }) {
  return (
    <button
      type="button"
      onClick={onNeedsSetup}
      className={classNames('btn-ghost w-full py-2.5 text-sm', disabled && 'opacity-50')}
    >
      <GoogleG className="w-4 h-4" />
      Sign in with Google
    </button>
  )
}

function GoogleG({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.57-5.17 3.57-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z" />
    </svg>
  )
}
