// Titan client-side authentication.
//
// Two distinct portals share nothing but the screen:
//   RETAIL        — email + password
//   PROFESSIONAL  — email + password + firm-issued desk access code
//
// "Remember me" keeps the session in localStorage (survives restarts);
// otherwise the session lives in sessionStorage (cleared on browser close).
// Passwords are salted + SHA-256 hashed via WebCrypto before storage.
// Google sign-in uses Google Identity Services when a client ID is configured
// (Settings → Integrations); without one the button explains what is needed.

const USERS_KEY = 'titan.users.v1'
const SESSION_KEY = 'titan.session.v1'
const DESK_CODE_KEY = 'titan.deskcode.v1'
export const DEFAULT_DESK_CODE = 'TITAN-PRO-2026'

const enc = new TextEncoder()

async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? []
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getDeskCode() {
  return localStorage.getItem(DESK_CODE_KEY) || DEFAULT_DESK_CODE
}

export function setDeskCode(code) {
  localStorage.setItem(DESK_CODE_KEY, code)
}

// seed demo accounts on first run
export async function ensureSeedUsers() {
  const users = loadUsers()
  if (users.length > 0) return
  const mk = async (email, name, pw, tier) => ({
    id: crypto.randomUUID(),
    email,
    name,
    tier, // 'retail' | 'professional'
    salt: crypto.randomUUID(),
    createdAt: Date.now(),
    provider: 'password',
    pwHash: '',
  })
  const retail = await mk('retail@titanmarkets.com', 'Jordan Reyes', 'titan123', 'retail')
  retail.pwHash = await hash(retail.salt + 'titan123')
  const pro = await mk('pro@titanmarkets.com', 'Alex Sterling', 'titan123', 'professional')
  pro.pwHash = await hash(pro.salt + 'titan123')
  pro.desk = 'Global Macro Desk 4'
  saveUsers([retail, pro])
}

export async function signIn({ email, password, tier, deskCode, remember }) {
  const users = loadUsers()
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) throw new Error('No account found for this email.')
  if (user.provider === 'google') throw new Error('This account uses Google sign-in.')
  const h = await hash(user.salt + password)
  if (h !== user.pwHash) throw new Error('Incorrect password.')
  if (tier === 'professional') {
    if (user.tier !== 'professional')
      throw new Error('This account is not provisioned for institutional access. Use the Retail portal.')
    if ((deskCode || '').trim().toUpperCase() !== getDeskCode().toUpperCase())
      throw new Error('Invalid desk access code. Contact your desk administrator.')
  }
  if (tier === 'retail' && user.tier === 'professional')
    throw new Error('Institutional accounts must sign in through the Professional portal.')
  return createSession(user, remember)
}

export async function signUp({ name, email, password, tier, deskCode, remember }) {
  const users = loadUsers()
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
    throw new Error('An account with this email already exists.')
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')
  if (tier === 'professional' && (deskCode || '').trim().toUpperCase() !== getDeskCode().toUpperCase())
    throw new Error('A valid firm-issued desk access code is required for institutional enrollment.')
  const salt = crypto.randomUUID()
  const user = {
    id: crypto.randomUUID(),
    email: email.trim(),
    name: name.trim() || email.split('@')[0],
    tier,
    salt,
    pwHash: await hash(salt + password),
    provider: 'password',
    createdAt: Date.now(),
  }
  users.push(user)
  saveUsers(users)
  return createSession(user, remember)
}

export function signInWithGoogleCredential(credential, tier, remember) {
  // decode the GIS JWT payload (verification happens on Google's side of the
  // redirect; a production deployment would verify server-side)
  const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const users = loadUsers()
  let user = users.find((u) => u.email.toLowerCase() === (payload.email || '').toLowerCase())
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email: payload.email,
      name: payload.name || payload.email,
      avatar: payload.picture,
      tier: tier === 'professional' ? 'retail' : tier, // Google enrollment is retail; pro requires desk code upgrade
      provider: 'google',
      createdAt: Date.now(),
    }
    users.push(user)
    saveUsers(users)
  }
  if (tier === 'professional' && user.tier !== 'professional')
    throw new Error('Google sign-in is available on the Retail portal. Institutional access requires a desk-code account.')
  return createSession(user, remember)
}

function createSession(user, remember) {
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
    desk: user.desk,
    avatar: user.avatar,
    provider: user.provider,
    issuedAt: Date.now(),
    remember: !!remember,
  }
  const raw = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, raw)
    localStorage.removeItem(SESSION_KEY)
  }
  return session
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_KEY)
}

// ── Google Identity Services loader ──
const GIS_SRC = 'https://accounts.google.com/gsi/client'
let gisPromise = null

export function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve(window.google)
    s.onerror = () => reject(new Error('Google Identity script failed to load'))
    document.head.appendChild(s)
  })
  return gisPromise
}

export function getGoogleClientId() {
  return localStorage.getItem('titan.googleClientId') || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

export function setGoogleClientId(id) {
  localStorage.setItem('titan.googleClientId', id)
}
