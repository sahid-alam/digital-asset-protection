import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Evidence from './pages/Evidence'
import Upload from './pages/Upload'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 16 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 64, color: 'var(--hairline-strong)', fontWeight: 700 }}>404</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Page not found</span>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        ← Back to Home
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
