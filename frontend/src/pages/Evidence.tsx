import React, { useEffect, useState, useMemo, memo } from 'react'
import Shell from '../components/Shell'
import Icon from '../components/Icon'
import EvidenceDrawer from '../components/EvidenceDrawer'
import ErrorBanner from '../components/ErrorBanner'
import { SkeletonCard } from '../components/Skeleton'
import { ConfidenceBadge, StatusBadge, PlatformTag, normalizePlatform } from '../components/Badge'
import { listInfringements } from '../api/infringements'
import { listAssets } from '../api/assets'
import { exportToCsv } from '../utils/download'
import { useApp } from '../context/AppContext'
import type { Infringement } from '../types'

type SortKey = 'confidence' | 'date' | 'platform' | 'status'

const EvidenceCard = memo(function EvidenceCard({
  item,
  assetName,
  onClick,
}: {
  item: Infringement
  assetName?: string
  onClick: () => void
}) {
  const pct = Math.round(item.confidence_score * 100)
  const col = pct >= 90 ? 'var(--danger)' : pct >= 75 ? 'var(--warn)' : 'var(--info)'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--panel)',
        border: `1px solid ${hovered ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.1s, transform 0.1s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        position: 'relative',
      }}
    >
      {/* Thumbnail pair */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', aspectRatio: '2/1', overflow: 'hidden', position: 'relative' }}>
        {[{ col: 'var(--accent)', id: `orig-${item.id}` }, { col: 'var(--danger)', id: `match-${item.id}` }].map(side => (
          <div key={side.id} style={{ background: 'var(--elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--hairline)' }}>
            <svg width="100%" height="100%" viewBox="0 0 80 45">
              <defs>
                <linearGradient id={side.id} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={side.col} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={side.col} stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <rect width="80" height="45" fill={`url(#${side.id})`} />
              <circle cx="40" cy="22" r="10" fill="none" stroke={side.col} strokeWidth="0.8" strokeOpacity="0.5" />
            </svg>
          </div>
        ))}

        {/* Hover overlay */}
        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onClick() }}
              style={{ padding: '5px 12px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 10 }}
              className="mono upper"
            >
              View Evidence
            </button>
          </div>
        )}
      </div>

      {/* Confidence bar at top */}
      <div style={{ height: 2, background: 'var(--elevated-2)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col }} />
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={assetName}>
            {assetName ?? `asset:${item.asset_id.slice(0, 8)}`}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ConfidenceBadge score={item.confidence_score} />
          <PlatformTag platform={item.platform} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.source_url.replace(/^https?:\/\//, '')}
        </div>
      </div>
    </div>
  )
})

export default function Evidence() {
  const { refreshKey, setRowCount } = useApp()
  const [items, setItems] = useState<Infringement[]>([])
  const [assetNames, setAssetNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<Infringement | null>(null)
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [confFilter, setConfFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('confidence')

  async function load(silent = false) {
    try {
      const [data, assets] = await Promise.all([listInfringements(), listAssets()])
      setItems(data)
      setAssetNames(new Map(assets.map(a => [a.id, a.filename])))
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (refreshKey > 0) load(true) }, [refreshKey])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const platforms = useMemo(() => [...new Set(items.map(i => i.platform).filter(Boolean).map(p => normalizePlatform(p!)))], [items])

  const filtered = useMemo(() => {
    let out = items.filter(item => {
      if (search && !item.source_url.toLowerCase().includes(search.toLowerCase()) && !item.id.includes(search)) return false
      if (platformFilter && normalizePlatform(item.platform ?? '') !== platformFilter) return false
      if (statusFilter && item.status !== statusFilter) return false
      const pct = item.confidence_score * 100
      if (confFilter === 'high' && pct < 90) return false
      if (confFilter === 'med' && (pct < 75 || pct >= 90)) return false
      if (confFilter === 'low' && pct >= 75) return false
      return true
    })

    out = [...out].sort((a, b) => {
      if (sortKey === 'confidence') return b.confidence_score - a.confidence_score
      if (sortKey === 'date') return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      if (sortKey === 'platform') return (a.platform ?? '').localeCompare(b.platform ?? '')
      if (sortKey === 'status') return a.status.localeCompare(b.status)
      return 0
    })

    return out
  }, [items, search, platformFilter, statusFilter, confFilter, sortKey])

  useEffect(() => { setRowCount(filtered.length) }, [filtered.length, setRowCount])

  function handleExport() {
    const rows = filtered.map(i => ({
      ID: i.id,
      Asset: assetNames.get(i.asset_id) ?? i.asset_id,
      Platform: normalizePlatform(i.platform ?? 'Unknown'),
      'Source URL': i.source_url,
      'Confidence %': String(Math.round(i.confidence_score * 100)),
      Status: i.status,
      'Detected At': new Date(i.detected_at).toISOString(),
    }))
    exportToCsv(rows, 'sentry-evidence.csv')
  }

  if (loading) {
    return (
      <Shell>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell rowCount={filtered.length}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono upper" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
            Evidence Library
          </span>
          <span className="mono" style={{ fontSize: 10, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 10, padding: '1px 7px', color: 'var(--ink-4)' }}>
            {filtered.length} PACKAGES
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleExport}
            style={{ padding: '6px 12px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="download" size={12} />
            <span className="mono upper">Export All</span>
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 220, height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 9px' }}>
            <Icon name="search" size={11} color="var(--ink-4)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search evidence…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 11 }}
            />
          </div>
          {[
            { label: 'All Platforms', value: platformFilter, options: platforms, onChange: setPlatformFilter },
          ].map(({ label, value, options, onChange }) => (
            <select key={label} value={value} onChange={e => onChange(e.target.value)} style={{ height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', padding: '0 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }} className="mono">
              <option value="">{label}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <select value={confFilter} onChange={e => setConfFilter(e.target.value)} style={{ height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', padding: '0 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }} className="mono">
            <option value="">Any Confidence</option>
            <option value="high">High ≥90%</option>
            <option value="med">Med 75–89%</option>
            <option value="low">Low &lt;75%</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', padding: '0 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }} className="mono">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="valid">Valid</option>
            <option value="false_positive">False Positive</option>
            <option value="dmca_sent">DMCA Sent</option>
          </select>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-5)' }}>Sort:</span>
            {(['confidence', 'date', 'platform', 'status'] as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className="mono upper"
                style={{
                  padding: '3px 8px',
                  background: sortKey === k ? 'var(--accent-glow)' : 'var(--elevated)',
                  border: `1px solid ${sortKey === k ? 'var(--accent)' : 'var(--hairline)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: sortKey === k ? 'var(--accent)' : 'var(--ink-4)',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <span className="mono upper" style={{ color: 'var(--ink-5)', fontSize: 12 }}>No evidence packages</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {filtered.map(item => (
              <EvidenceCard key={item.id} item={item} assetName={assetNames.get(item.asset_id)} onClick={() => setDrawer(item)} />
            ))}
          </div>
        )}
      </div>

      {drawer && (
        <EvidenceDrawer
          item={drawer}
          onClose={() => setDrawer(null)}
          onUpdate={updated => {
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
            setDrawer(updated)
          }}
        />
      )}
    </Shell>
  )
}
