import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Shell from '../components/Shell'
import Icon from '../components/Icon'
import EvidenceDrawer from '../components/EvidenceDrawer'
import ErrorBanner from '../components/ErrorBanner'
import { SkeletonRow } from '../components/Skeleton'
import { ConfidenceBadge, StatusBadge, PlatformTag, normalizePlatform } from '../components/Badge'
import { listInfringements, getDmca, patchInfringement } from '../api/infringements'
import { getAnalyticsSummary } from '../api/analytics'
import { listAssets } from '../api/assets'
import { useApp } from '../context/AppContext'
import { exportToCsv, downloadBlob } from '../utils/download'
import type { Infringement, AnalyticsSummary } from '../types'

const TABS = ['All', 'Pending', 'Actionable', 'In Progress', 'Dismissed'] as const
type Tab = typeof TABS[number]

function tabFilter(tab: Tab, item: Infringement): boolean {
  if (tab === 'All') return true
  if (tab === 'Pending') return item.status === 'pending'
  if (tab === 'Actionable') return item.status === 'valid'
  if (tab === 'In Progress') return item.status === 'dmca_sent'
  if (tab === 'Dismissed') return item.status === 'false_positive'
  return true
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const KpiCard = memo(function KpiCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span className="mono tnum" style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {sub}
      </div>
    </div>
  )
})

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshKey, setRowCount, setPendingCount } = useApp()

  const [infringements, setInfringements] = useState<Infringement[]>([])
  const [assetNames, setAssetNames] = useState<Map<string, string>>(new Map())
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') ?? '')
  const [confFilter, setConfFilter] = useState(searchParams.get('conf') ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawer, setDrawer] = useState<Infringement | null>(null)
  const [page, setPage] = useState(0)
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number>(-1)
  const PAGE_SIZE = 15

  const debouncedSearch = useDebounce(search, 300)

  // Sync URL params when filters change
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.q = debouncedSearch
    if (platformFilter) params.platform = platformFilter
    if (confFilter) params.conf = confFilter
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, platformFilter, confFilter, setSearchParams])

  // Handle ?asset_id=xxx from Upload page and ?status= from outside
  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam === 'pending') setActiveTab('Pending')
    else if (statusParam === 'valid') setActiveTab('Actionable')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll(silent = false) {
    try {
      const [inf, sum, assets] = await Promise.all([listInfringements(), getAnalyticsSummary(), listAssets()])
      setInfringements(inf)
      setSummary(sum)
      setAssetNames(new Map(assets.map(a => [a.id, a.filename])))
      setLastSync(new Date())
      setPendingCount(sum.pending_count)
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Respond to global refresh trigger
  useEffect(() => {
    if (refreshKey > 0) fetchAll(true)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 10_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const assetIdParam = searchParams.get('asset_id')
  const filtered = useMemo(() => infringements.filter(item => {
    if (!tabFilter(activeTab, item)) return false
    if (assetIdParam && item.asset_id !== assetIdParam) return false
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      const match =
        item.source_url.toLowerCase().includes(q) ||
        item.id.includes(q) ||
        normalizePlatform(item.platform ?? '').toLowerCase().includes(q) ||
        item.status.includes(q) ||
        String(Math.round(item.confidence_score * 100)).includes(q)
      if (!match) return false
    }
    if (platformFilter && normalizePlatform(item.platform ?? '') !== platformFilter) return false
    const pct = item.confidence_score * 100
    if (confFilter === 'high' && pct < 90) return false
    if (confFilter === 'med' && (pct < 75 || pct >= 90)) return false
    if (confFilter === 'low' && pct >= 75) return false
    return true
  }), [infringements, activeTab, assetIdParam, debouncedSearch, platformFilter, confFilter])

  useEffect(() => { setRowCount(filtered.length) }, [filtered.length, setRowCount])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const platforms = useMemo(() => [...new Set(infringements.map(i => i.platform).filter(Boolean).map(p => normalizePlatform(p!)))], [infringements])

  const tabCounts = useMemo<Record<Tab, number>>(() => ({
    All: infringements.length,
    Pending: infringements.filter(i => i.status === 'pending').length,
    Actionable: infringements.filter(i => i.status === 'valid').length,
    'In Progress': infringements.filter(i => i.status === 'dmca_sent').length,
    Dismissed: infringements.filter(i => i.status === 'false_positive').length,
  }), [infringements])

  const handleUpdate = useCallback((updated: Infringement) => {
    setInfringements(prev => prev.map(i => i.id === updated.id ? updated : i))
    setDrawer(updated)
  }, [])

  async function handleBulkDmca() {
    setBulkLoading(true)
    try {
      for (const id of selected) {
        const blob = await getDmca(id)
        downloadBlob(blob, `dmca-${id}.pdf`)
        await new Promise(r => setTimeout(r, 350))
      }
    } finally {
      setBulkLoading(false)
      setSelected(new Set())
    }
  }

  async function handleBulkStatus(status: Infringement['status']) {
    setBulkLoading(true)
    try {
      const updates = await Promise.all([...selected].map(id => patchInfringement(id, { status })))
      setInfringements(prev => {
        const map = new Map(updates.map(u => [u.id, u]))
        return prev.map(i => map.get(i.id) ?? i)
      })
      setSelected(new Set())
    } finally {
      setBulkLoading(false)
    }
  }

  function handleExportCsv() {
    const rows = filtered.map(i => ({
      ID: i.id,
      Asset: assetNames.get(i.asset_id) ?? i.asset_id,
      Platform: normalizePlatform(i.platform ?? 'Unknown'),
      'Source URL': i.source_url,
      'Confidence %': String(Math.round(i.confidence_score * 100)),
      Status: i.status,
      'Detected At': new Date(i.detected_at).toISOString(),
    }))
    exportToCsv(rows, 'sentry-infringements.csv')
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const meta = e.metaKey || e.ctrlKey
      if (drawer) {
        if (e.key === 'Escape') { setDrawer(null); return }
        return
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx(i => Math.min(i + 1, paginated.length - 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx(i => Math.max(i - 1, 0))
      } else if (e.key === ' ' && focusIdx >= 0) {
        e.preventDefault()
        const item = paginated[focusIdx]
        if (item) {
          setSelected(prev => {
            const next = new Set(prev)
            if (next.has(item.id)) next.delete(item.id)
            else next.add(item.id)
            return next
          })
        }
      } else if (e.key === 'Enter' && focusIdx >= 0) {
        e.preventDefault()
        const item = paginated[focusIdx]
        if (item) setDrawer(item)
      } else if (meta && e.key === 'e') {
        e.preventDefault()
        handleExportCsv()
      } else if (meta && e.key === 'd' && selected.size > 0) {
        e.preventDefault()
        handleBulkDmca()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawer, focusIdx, paginated, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Shell>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: '14px 16px', height: 80 }}>
                <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 2, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--hairline)' }}>
              <div className="skeleton" style={{ width: 160, height: 12, borderRadius: 2 }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      </Shell>
    )
  }

  const resolutionRate = summary
    ? Math.round(((summary.valid_count + summary.false_positive_count) / Math.max(summary.total_infringements, 1)) * 100)
    : 0

  return (
    <Shell rowCount={filtered.length}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Asset filter banner */}
        {assetIdParam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: 'var(--accent-glow)', border: '1px solid var(--accent)40', borderRadius: 'var(--radius-sm)' }}>
            <Icon name="search" size={12} color="var(--accent)" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', flex: 1 }}>
              Filtered to asset: {assetIdParam.slice(0, 16)}…
            </span>
            <button onClick={() => setSearchParams({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
              <Icon name="close" size={12} />
            </button>
          </div>
        )}

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 10 }}>
          <KpiCard label="Assets Protected" value={summary?.total_assets ?? 0} color="var(--info)" />
          <KpiCard
            label="Active Matches"
            value={summary?.pending_count ?? 0}
            color="var(--danger)"
            sub={<span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)', alignSelf: 'center' }} />}
          />
          <KpiCard
            label="High Confidence ≥90%"
            value={infringements.filter(i => i.confidence_score >= 0.9).length}
            color="var(--danger)"
            sub={
              <div style={{ display: 'flex', gap: 2, alignSelf: 'flex-end', paddingBottom: 3 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: 4, height: 12 + i * 1.5, background: i >= 6 ? 'var(--danger)' : 'var(--hairline-strong)', borderRadius: 1 }} />
                ))}
              </div>
            }
          />
          <KpiCard label="Resolution Rate" value={`${resolutionRate}%`} color="var(--ok)" />
        </div>

        {/* Main table panel */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)' }}>
          {/* Panel header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono upper" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>Detected Infringements</span>
            <span style={{ fontSize: 10, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 10, padding: '1px 7px', color: 'var(--ink-4)' }} className="mono">
              {filtered.length}
            </span>
            <div style={{ flex: 1 }} />
            <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-5)' }}>
              LAST SYNC {lastSync.toLocaleTimeString()}
            </span>
            <button
              onClick={() => fetchAll(true)}
              style={{ padding: '5px 10px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
            >
              <Icon name="refresh" size={12} />
              <span className="mono upper">Resync</span>
            </button>
            <button
              onClick={handleExportCsv}
              style={{ padding: '5px 10px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
            >
              <Icon name="download" size={12} />
              <span className="mono upper">Export CSV</span>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 14px', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 2 }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(0) }}
                style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', color: activeTab === tab ? 'var(--ink)' : 'var(--ink-4)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}
                className="mono upper"
              >
                {tab}
                <span style={{ fontSize: 9, background: activeTab === tab ? 'var(--accent-glow)' : 'var(--elevated)', border: `1px solid ${activeTab === tab ? 'var(--accent)' : 'var(--hairline)'}`, borderRadius: 8, padding: '0 5px', color: activeTab === tab ? 'var(--accent)' : 'var(--ink-5)' }}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 260, height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 7, padding: '0 9px' }}>
              <Icon name="search" size={11} color="var(--ink-4)" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search matches…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 11 }}
              />
            </div>
            <select
              value={platformFilter}
              onChange={e => { setPlatformFilter(e.target.value); setPage(0) }}
              style={{ height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', padding: '0 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}
              className="mono"
            >
              <option value="">All Platforms</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={confFilter}
              onChange={e => { setConfFilter(e.target.value); setPage(0) }}
              style={{ height: 28, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', padding: '0 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}
              className="mono"
            >
              <option value="">Any Confidence</option>
              <option value="high">High ≥90%</option>
              <option value="med">Med 75–89%</option>
              <option value="low">Low &lt;75%</option>
            </select>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div style={{ padding: '6px 14px', background: 'var(--elevated)', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{selected.size} selected</span>
              <button onClick={handleBulkDmca} disabled={bulkLoading} style={{ padding: '4px 10px', background: 'var(--elevated-2)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: bulkLoading ? 'wait' : 'pointer', fontSize: 11, opacity: bulkLoading ? 0.6 : 1 }} className="mono upper">
                {bulkLoading ? 'Working…' : `Generate DMCA (${selected.size})`}
              </button>
              <button onClick={() => handleBulkStatus('valid')} disabled={bulkLoading} style={{ padding: '4px 10px', background: 'var(--elevated-2)', border: '1px solid rgba(255,77,94,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', cursor: bulkLoading ? 'wait' : 'pointer', fontSize: 11, opacity: bulkLoading ? 0.6 : 1 }} className="mono upper">
                Mark valid
              </button>
              <button onClick={() => handleBulkStatus('false_positive')} disabled={bulkLoading} style={{ padding: '4px 10px', background: 'var(--elevated-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', cursor: bulkLoading ? 'wait' : 'pointer', fontSize: 11, opacity: bulkLoading ? 0.6 : 1 }} className="mono upper">
                False positive
              </button>
              <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', padding: '4px 10px', background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 11 }} className="mono upper">
                Clear
              </button>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  {['', 'Match ID', 'Asset', 'Confidence', 'Platform', 'Source URL', 'Status', 'Detected', ''].map((h, i) => (
                    <th key={i} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, color: 'var(--ink-5)', letterSpacing: '0.08em', whiteSpace: 'nowrap', fontWeight: 500 }} className="mono upper">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center' }}>
                      <span className="mono upper" style={{ color: 'var(--ink-5)', fontSize: 11 }}>No matches under current filter</span>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item, idx) => {
                    const isFocused = idx === focusIdx
                    const isSelected = selected.has(item.id)
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setDrawer(item)}
                        style={{
                          borderBottom: '1px solid var(--hairline)',
                          cursor: 'pointer',
                          background: isFocused ? 'var(--elevated-2)' : isSelected ? 'var(--elevated)' : 'transparent',
                          outline: isFocused ? '1px solid var(--accent)30' : 'none',
                          transition: 'background 0.08s',
                        }}
                        onMouseEnter={e => { setFocusIdx(idx); (e.currentTarget as HTMLElement).style.background = 'var(--elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isFocused ? 'var(--elevated-2)' : isSelected ? 'var(--elevated)' : 'transparent' }}
                      >
                        <td style={{ padding: '7px 10px' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const next = new Set(selected)
                              if (e.target.checked) next.add(item.id)
                              else next.delete(item.id)
                              setSelected(next)
                            }}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>#{item.id.slice(0, 8)}</span>
                        </td>
                        <td style={{ padding: '7px 10px', maxWidth: 160 }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={assetNames.get(item.asset_id)}>
                            {assetNames.get(item.asset_id) ?? `${item.asset_id.slice(0, 10)}…`}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px' }}><ConfidenceBadge score={item.confidence_score} /></td>
                        <td style={{ padding: '7px 10px' }}><PlatformTag platform={item.platform} /></td>
                        <td style={{ padding: '7px 10px', maxWidth: 200 }}>
                          <a href={item.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: 'var(--info)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source_url.replace(/^https?:\/\//, '')}</span>
                            <Icon name="external" size={10} />
                          </a>
                        </td>
                        <td style={{ padding: '7px 10px' }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                          <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{new Date(item.detected_at).toLocaleDateString()}</span>
                        </td>
                        <td style={{ padding: '7px 10px' }}><Icon name="arrowRight" size={12} color="var(--ink-5)" /></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              Showing {Math.min(page * PAGE_SIZE + 1, filtered.length)}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ flex: 1 }} />
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 12px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: page === 0 ? 'var(--ink-5)' : 'var(--ink-3)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }} className="mono upper">
              Prev
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 12px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', color: page >= totalPages - 1 ? 'var(--ink-5)' : 'var(--ink-3)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }} className="mono upper">
              Next
            </button>
          </div>
        </div>
      </div>

      {drawer && (
        <EvidenceDrawer item={drawer} onClose={() => setDrawer(null)} onUpdate={handleUpdate} />
      )}
    </Shell>
  )
}
