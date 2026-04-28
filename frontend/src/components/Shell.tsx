import React, { memo, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useApp } from '../context/AppContext'
import CommandPalette from './CommandPalette'
import { listInfringements } from '../api/infringements'
import type { Infringement } from '../types'

const NAV_ITEMS = [
  { key: '1', label: 'Infringements', icon: 'alert', path: '/dashboard' },
  { key: '2', label: 'Evidence', icon: 'eye', path: '/evidence' },
  { key: '3', label: 'Assets', icon: 'upload', path: '/upload' },
  { key: '4', label: 'Analytics', icon: 'chart', path: '/analytics' },
]

interface ShellProps {
  children: React.ReactNode
  rowCount?: number
}

// Crawler Status modal
function CrawlerModal({ onClose }: { onClose: () => void }) {
  const { latency, crawlerStatus } = useApp()
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--overlay-light)', zIndex: 'var(--z-modal)' }} />
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 360, background: 'var(--panel)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-lg)', zIndex: 'var(--z-drawer)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>Crawler Status</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="Close" className="btn-ghost"><Icon name="close" size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { k: 'STATUS', v: crawlerStatus, color: crawlerStatus === 'SCANNING' ? 'var(--accent)' : 'var(--ok)' },
            { k: 'API LATENCY', v: latency != null ? `${latency}ms` : 'timeout', color: latency != null && latency < 200 ? 'var(--ok)' : 'var(--warn)' },
            { k: 'MODE', v: 'LIVE', color: 'var(--ok)' },
            { k: 'LAST PING', v: new Date().toLocaleTimeString(), color: 'var(--ink-3)' },
          ].map(({ k, v, color }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--hairline)' }}>
              <span className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)' }}>{k}</span>
              <span className="mono upper" style={{ fontSize: 11, color }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// DMCA Queue drawer
function DmcaQueueDrawer({ onClose, infringements }: { onClose: () => void; infringements: Infringement[] }) {
  const queue = infringements.filter(i => i.status === 'valid')
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--overlay-light)', zIndex: 'var(--z-modal)' }} />
      <div style={{ position: 'fixed', top: 44, right: 0, bottom: 22, width: 380, background: 'var(--panel)', borderLeft: '1px solid var(--hairline-strong)', zIndex: 'var(--z-drawer)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono upper" style={{ fontSize: 11, color: 'var(--accent)' }}>DMCA Queue</span>
          <span className="mono" style={{ fontSize: 10, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 8, padding: '1px 6px', color: 'var(--ink-4)' }}>{queue.length}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="Close" className="btn-ghost"><Icon name="close" size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
              <span className="mono upper" style={{ fontSize: 11, color: 'var(--ink-5)' }}>No valid infringements</span>
            </div>
          ) : (
            queue.map(inf => (
              <div key={inf.id} style={{ background: 'var(--elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>#{inf.id.slice(0, 12)}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inf.source_url.replace(/^https?:\/\//, '')}</div>
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--warn)' }} className="mono upper">{Math.round(inf.confidence_score * 100)}% confidence</div>
              </div>
            ))
          )}
        </div>
        {queue.length > 0 && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--hairline)' }}>
            <button className="mono upper" style={{ width: '100%', padding: '8px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Generate All DMCA Notices ({queue.length})
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// Bell dropdown
function BellDropdown({ items, onClose }: { items: Infringement[]; onClose: () => void }) {
  const recent = items.slice(0, 10)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dropdown)' }} />
      <div style={{ position: 'absolute', top: 36, right: 0, width: 320, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-lg)', zIndex: 'var(--z-modal)', overflow: 'hidden', boxShadow: '0 8px 32px var(--overlay-heavy)' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Recent Detections</span>
        </div>
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          {recent.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center' }}>
              <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-5)' }}>No recent detections</span>
            </div>
          ) : (
            recent.map(inf => {
              const pct = Math.round(inf.confidence_score * 100)
              const col = pct >= 90 ? 'var(--danger)' : pct >= 75 ? 'var(--warn)' : 'var(--info)'
              return (
                <div key={inf.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inf.source_url.replace(/^https?:\/\//, '')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-5)', marginTop: 2 }} className="mono">
                      {new Date(inf.detected_at).toLocaleDateString()} · {pct}%
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

const Topbar = memo(function Topbar({
  collapsed,
  onToggle,
  onRefresh,
  isRefreshing,
  recentInfringements,
}: {
  collapsed: boolean
  onToggle: () => void
  onRefresh: () => void
  isRefreshing: boolean
  recentInfringements: Infringement[]
}) {
  const location = useLocation()
  const { openPalette } = useApp()
  const nav = NAV_ITEMS.find(n => n.path === location.pathname)
  const title = nav?.label ?? 'Settings'
  const [bellOpen, setBellOpen] = useState(false)

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--hairline)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        height: 44,
      }}
    >
      <button onClick={onToggle} aria-label="Toggle sidebar" className="btn-ghost">
        <Icon name="gear" size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 6v6c0 5 3.5 9 9 10 5.5-1 9-5 9-10V6z"/>
            <path d="M12 7v10M7 12h10"/>
            <circle cx="12" cy="12" r="2" fill="var(--accent)"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', color: 'var(--accent)' }} className="upper mono">
          SENTRY
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--hairline-strong)' }} />

      <span style={{ color: 'var(--ink-4)', fontSize: 11 }} className="mono">/app</span>
      <span style={{ color: 'var(--ink-5)', fontSize: 11 }} className="mono">›</span>
      <span style={{ color: 'var(--ink-2)', fontSize: 11 }} className="mono upper">{title}</span>

      <div style={{ flex: 1 }} />

      {/* Search bar → opens palette */}
      <button
        onClick={openPalette}
        style={{
          width: 320,
          height: 28,
          background: 'var(--elevated)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          color: 'var(--ink-4)',
          cursor: 'text',
        }}
      >
        <Icon name="search" size={12} />
        <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-4)', textAlign: 'left' }} className="mono">
          Search assets, matches…
        </span>
        <kbd style={{ fontSize: 10, background: 'var(--elevated-2)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', padding: '1px 5px', color: 'var(--ink-4)' }} className="mono">
          ⌘K
        </kbd>
      </button>

      {/* Refresh */}
      <button onClick={onRefresh} aria-label="Refresh data" className="btn-ghost">
        <span className={isRefreshing ? 'spin' : ''} style={{ display: 'flex' }}>
          <Icon name="refresh" size={14} />
        </span>
      </button>

      {/* Bell */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setBellOpen(v => !v)} aria-label="Notifications" className="btn-ghost">
          <Icon name="bell" size={14} />
        </button>
        {recentInfringements.length > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, background: 'var(--danger)', borderRadius: '50%', border: '1px solid var(--panel)' }} />
        )}
        {bellOpen && <BellDropdown items={recentInfringements} onClose={() => setBellOpen(false)} />}
      </div>

      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.02em' }}>
        SA
      </div>
    </div>
  )
})

const Sidebar = memo(function Sidebar({
  collapsed,
  onCrawlerStatus,
  onDmcaQueue,
}: {
  collapsed: boolean
  onCrawlerStatus: () => void
  onDmcaQueue: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const w = collapsed ? 52 : 220

  const TOOL_ITEMS = [
    { label: 'Crawler Status', icon: 'target', action: onCrawlerStatus },
    { label: 'DMCA Queue', icon: 'doc', action: onDmcaQueue },
    { label: 'Settings', icon: 'gear', action: () => navigate('/settings') },
  ]

  return (
    <div
      style={{
        width: w,
        background: 'var(--panel)',
        borderRight: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.15s ease',
        overflow: 'hidden',
        gridRow: '2 / 3',
      }}
    >
      <div style={{ flex: 1, padding: '8px 0' }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '9px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'var(--elevated)' : 'none',
                border: 'none',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 12,
                letterSpacing: '0.04em',
                transition: 'all 0.1s',
                marginBottom: 2,
              }}
            >
              <Icon name={item.icon} size={14} color={active ? 'var(--accent)' : undefined} />
              <span className="upper mono" style={{ fontSize: 11, overflow: 'hidden', maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1, transition: 'max-width 0.15s ease, opacity 0.15s ease', whiteSpace: 'nowrap' }}>
                {item.key}  {item.label}
              </span>
            </button>
          )
        })}

        <div style={{ margin: '12px 14px 6px', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.1em', textTransform: 'uppercase', overflow: 'hidden', maxWidth: collapsed ? 0 : 200, opacity: collapsed ? 0 : 1, transition: 'max-width 0.15s ease, opacity 0.15s ease', whiteSpace: 'nowrap' }} className="mono">
          Tools
        </div>

        {TOOL_ITEMS.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '9px 0' : '8px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'none',
              border: 'none',
              borderLeft: '2px solid transparent',
              cursor: 'pointer',
              color: 'var(--ink-4)',
              fontSize: 11,
              marginBottom: 1,
            }}
          >
            <Icon name={item.icon} size={13} />
            <span className="upper mono" style={{ fontSize: 10, overflow: 'hidden', maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1, transition: 'max-width 0.15s ease, opacity 0.15s ease', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: collapsed ? '10px 0' : '10px 14px', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 6px var(--ok)', flexShrink: 0 }} />
        <span className="mono upper" style={{ fontSize: 10, color: 'var(--ok)', overflow: 'hidden', maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1, transition: 'max-width 0.15s ease, opacity 0.15s ease', whiteSpace: 'nowrap' }}>CRAWLER/ONLINE</span>
      </div>
    </div>
  )
})

function StatusBar({ rowCount }: { rowCount?: number }) {
  const location = useLocation()
  const { latency, crawlerStatus, pendingCount } = useApp()
  const [time, setTime] = useState(() => new Date().toUTCString().split(' ')[4])
  const buildHash = import.meta.env.VITE_BUILD_HASH ?? 'dev'

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toUTCString().split(' ')[4]), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: 'var(--elevated)',
        borderTop: '1px solid var(--hairline)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 14px',
        height: 22,
        fontSize: 10.5,
        color: 'var(--ink-4)',
        userSelect: 'none',
      }}
      className="mono upper"
    >
      <span style={{ color: crawlerStatus === 'SCANNING' ? 'var(--accent)' : 'var(--ok)' }}>
        ● CRAWLER/{crawlerStatus}
      </span>
      <span>·</span>
      <span>QUEUE {pendingCount}</span>
      <span>·</span>
      <span style={{ color: latency == null ? 'var(--danger)' : latency > 500 ? 'var(--warn)' : 'var(--ink-4)' }}>
        LATENCY {latency != null ? `${latency}ms` : 'n/a'}
      </span>
      <span>·</span>
      <span>ROUTE {location.pathname}</span>
      <span>·</span>
      {rowCount !== undefined && (
        <>
          <span>ROWS {rowCount}</span>
          <span>·</span>
        </>
      )}
      <span>UTC {time}</span>
      <span>·</span>
      <span>BUILD {buildHash}<span className="blink">_</span></span>
    </div>
  )
}

export default function Shell({ children, rowCount }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [crawlerModal, setCrawlerModal] = useState(false)
  const [dmcaDrawer, setDmcaDrawer] = useState(false)
  const [recentInfringements, setRecentInfringements] = useState<Infringement[]>([])
  const navigate = useNavigate()
  const { triggerRefresh, isRefreshing, paletteOpen, openPalette, closePalette } = useApp()

  // Load recent infringements for bell
  useEffect(() => {
    listInfringements().then(inf => {
      setRecentInfringements(inf.slice(0, 10))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') { e.preventDefault(); openPalette(); return }
      if (meta && e.key === 'r') { e.preventDefault(); triggerRefresh(); return }
      if (paletteOpen) return
      if (e.key === '1') navigate('/dashboard')
      if (e.key === '2') navigate('/evidence')
      if (e.key === '3') navigate('/upload')
      if (e.key === '4') navigate('/analytics')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, openPalette, triggerRefresh, paletteOpen])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${collapsed ? 52 : 220}px 1fr`,
        gridTemplateRows: '44px 1fr 22px',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.15s ease',
      }}
    >
      <Topbar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        onRefresh={triggerRefresh}
        isRefreshing={isRefreshing}
        recentInfringements={recentInfringements}
      />
      <Sidebar
        collapsed={collapsed}
        onCrawlerStatus={() => setCrawlerModal(true)}
        onDmcaQueue={() => setDmcaDrawer(true)}
      />
      <main style={{ background: 'var(--bg)', overflow: 'auto', gridRow: '2 / 3' }} className="page-fade">
        {children}
      </main>
      <StatusBar rowCount={rowCount} />

      {paletteOpen && <CommandPalette />}
      {crawlerModal && <CrawlerModal onClose={() => setCrawlerModal(false)} />}
      {dmcaDrawer && <DmcaQueueDrawer onClose={() => setDmcaDrawer(false)} infringements={recentInfringements} />}
    </div>
  )
}
