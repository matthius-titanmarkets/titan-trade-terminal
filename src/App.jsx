import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { StoreProvider, useStore } from './lib/store.jsx'
import Shell from './components/Shell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Markets from './pages/Markets.jsx'
import Charting from './pages/Charting.jsx'
import Trades from './pages/Trades.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Analytics from './pages/Analytics.jsx'
import News from './pages/News.jsx'
import Tools from './pages/Tools.jsx'
import Terminal from './pages/Terminal.jsx'
import Settings from './pages/Settings.jsx'

function RequireAuth({ children }) {
  const { session } = useStore()
  const location = useLocation()
  if (!session) return <Navigate to="/" state={{ from: location }} replace />
  return children
}

function RequirePro({ children }) {
  const { isPro } = useStore()
  if (!isPro) return <ProGate />
  return children
}

function ProGate() {
  return (
    <div className="max-w-md mx-auto mt-16 panel-raised p-8 text-center">
      <div className="text-3xl mb-3">🔒</div>
      <h2 className="font-brand text-xl text-ink">Institutional Access Required</h2>
      <p className="text-sm text-ink-dim mt-2 leading-relaxed">
        The Titan Terminal is reserved for professional accounts authenticated through the Professional portal with a
        firm-issued desk access code. Sign out and re-enter via Professional access to open the terminal.
      </p>
    </div>
  )
}

function LandingGate() {
  const { session } = useStore()
  if (session) return <Navigate to="/app" replace />
  return <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<LandingGate />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="markets" element={<Markets />} />
          <Route path="charts" element={<Charting />} />
          <Route path="trades" element={<Trades />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="news" element={<News />} />
          <Route path="tools" element={<Tools />} />
          <Route
            path="terminal"
            element={
              <RequirePro>
                <Terminal />
              </RequirePro>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SpeedInsights />
    </StoreProvider>
  )
}
