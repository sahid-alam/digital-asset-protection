import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { useApp } from '../context/AppContext'
import { listInfringements } from '../api/infringements'
import { listAssets } from '../api/assets'
import type { Infringement, Asset } from '../types'

interface PaletteItem {
  id: string
  group: string
  label: string
  sub?: string
  icon: string
  action: () => void
}

export default function CommandPalette() {
  const { closePalette, triggerRefresh } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PaletteItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Bug 2 fix: populate static items immediately so NAVIGATION/ACTIONS show without waiting for API
  useEffect(() => {
    const staticItems: PaletteItem[] = [
      { id: 'nav-1', group: 'NAVIGATION', label: 'Dashboard',  sub: 'Infringements overview',    icon: 'alert',   action: () => { navigate('/dashboard'); closePalette() } },
      { id: 'nav-2', group: 'NAVIGATION', label: 'Evidence',   sub: 'Browse evidence packages',  icon: 'eye',     action: () => { navigate('/evidence');   closePalette() } },
      { id: 'nav-3', group: 'NAVIGATION', label: 'Upload',     sub: 'Fingerprint new assets',    icon: 'upload',  action: () => { navigate('/upload');     closePalette() } },
      { id: 'nav-4', group: 'NAVIGATION', label: 'Analytics',  sub: 'Reports & trends',          icon: 'chart',   action: () => { navigate('/analytics'); closePalette() } },
      { id: 'nav-5', group: 'NAVIGATION', label: 'Settings',   sub: 'Configure SENTRY',          icon: 'gear',    action: () => { navigate('/settings');  closePalette() } },
      { id: 'act-1', group: 'ACTIONS',    label: 'Refresh data',  sub: 'Force reload all data',     icon: 'refresh', action: () => { triggerRefresh();       closePalette() } },
      { id: 'act-2', group: 'ACTIONS',    label: 'Export CSV',    sub: 'Download infringement list', icon: 'download',action: () => { navigate('/dashboard?export=1'); closePalette() } },
    ]

    // Show static items immediately
    setItems(staticItems)

    // Then enrich with API data when both calls resolve
    Promise.all([
      listInfringements().catch(() => [] as Infringement[]),
      listAssets().catch(() => [] as Asset[]),
    ]).then(([infringements, assets]) => {
      const assetMap = new Map(assets.map(a => [a.id, a.filename]))

      const infItems: PaletteItem[] = infringements.slice(0, 20).map(inf => ({
        id: `inf-${inf.id}`,
        group: 'INFRINGEMENTS',
        label: assetMap.get(inf.asset_id) ?? `asset:${inf.asset_id.slice(0, 8)}`,
        sub: `${Math.round(inf.confidence_score * 100)}% · ${inf.source_url.replace(/^https?:\/\//, '')}`,
        icon: 'alert',
        action: () => { navigate(`/dashboard?asset_id=${inf.asset_id}`); closePalette() },
      }))

      const assetItems: PaletteItem[] = assets.slice(0, 10).map(a => ({
        id: `asset-${a.id}`,
        group: 'ASSETS',
        label: a.filename,
        sub: `${a.asset_type} · ${new Date(a.created_at).toLocaleDateString()}`,
        icon: 'image',
        action: () => { navigate(`/dashboard?asset_id=${a.id}`); closePalette() },
      }))

      setItems([...staticItems, ...infItems, ...assetItems])
    })
  }, [navigate, closePalette, triggerRefresh])

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        (i.sub?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : items

  const grouped = filtered.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const flat = Object.values(grouped).flat()

  // Bug 1 fix: reset active index whenever query OR items change
  useEffect(() => { setActiveIdx(0) }, [query, items])

  // Bug 1 fix: scroll active row into view using data-idx instead of children[n]
  // (children includes group header divs which are not in flat)
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Bug 3 fix: attach keydown at window level so arrow keys work reliably
  // even when the input contains text (bypasses browser cursor-move behavior)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, flat.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        flat[activeIdx]?.action()
      } else if (e.key === 'Escape') {
        closePalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flat, activeIdx, closePalette])

  return ReactDOM.createPortal(
    <>
      <div
        onClick={closePalette}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90, backdropFilter: 'blur(2px)' }}
      />
      <div
        style={{
          position: 'fixed',
          top: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 640,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--panel)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--radius-md)',
          zIndex: 100,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '60vh',
        }}
      >
        {/* Search bar — onKeyDown removed; handled at window level (Bug 3) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--hairline)' }}>
          <Icon name="search" size={15} color="var(--ink-3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search assets, infringements, actions…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--font-mono)' }}
          />
          <kbd style={{ fontSize: 10, background: 'var(--elevated-2)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', color: 'var(--ink-5)' }} className="mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflow: 'auto', flex: 1 }}>
          {flat.length === 0 && query.trim() ? (
            <div style={{ padding: '20px 14px', textAlign: 'center' }}>
              <span className="mono upper" style={{ fontSize: 11, color: 'var(--ink-5)' }}>No results for "{query}"</span>
            </div>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group}>
                <div style={{ padding: '8px 14px 4px', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.1em' }} className="mono upper">
                  {group}
                </div>
                {groupItems.map(item => {
                  const idx = flat.indexOf(item)
                  const isActive = idx === activeIdx
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onClick={item.action}
                      onMouseEnter={() => setActiveIdx(idx)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 14px',
                        background: isActive ? 'var(--elevated)' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                      }}
                    >
                      <Icon name={item.icon} size={13} color={isActive ? 'var(--accent)' : 'var(--ink-4)'} />
                      <span style={{ fontSize: 13, color: isActive ? 'var(--ink)' : 'var(--ink-2)', flex: 1 }}>{item.label}</span>
                      {item.sub && (
                        <span style={{ fontSize: 11, color: 'var(--ink-5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} className="mono">
                          {item.sub}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 12, alignItems: 'center' }}>
          {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <kbd style={{ fontSize: 9, background: 'var(--elevated-2)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', padding: '1px 4px', color: 'var(--ink-4)' }} className="mono">{key}</kbd>
              <span style={{ fontSize: 10, color: 'var(--ink-5)' }}>{label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--ink-5)' }} className="mono upper">SENTRY COMMAND</span>
        </div>
      </div>
    </>,
    document.body
  )
}
