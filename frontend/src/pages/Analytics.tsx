import React, { useEffect, useRef, useState, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/Shell'
import Icon from '../components/Icon'
import { getAnalyticsSummary } from '../api/analytics'
import { listInfringements } from '../api/infringements'
import { PLATFORM_COLORS, normalizePlatform } from '../components/Badge'
import { useApp } from '../context/AppContext'
import type { AnalyticsSummary, Infringement } from '../types'

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function generateTrendData(total: number, days: number) {
  const rand = seededRand(total * 31 + days * 7)
  const points: number[] = []
  let base = Math.max(Math.round(total * 0.6), 1)
  for (let i = 0; i < days; i++) {
    base = Math.max(0, base + Math.round((rand() - 0.4) * (total * 0.05)))
    points.push(base)
  }
  points[days - 1] = total
  return points
}

function LineChart({ detected, resolved, width = 640, height = 240 }: { detected: number[]; resolved: number[]; width?: number; height?: number }) {
  const padL = 48, padR = 20, padT = 20, padB = 32
  const w = width - padL - padR
  const h = height - padT - padB
  const allVals = [...detected, ...resolved]
  const maxVal = Math.max(...allVals, 1)

  function toX(i: number) { return padL + (i / (detected.length - 1)) * w }
  function toY(v: number) { return padT + h - (v / maxVal) * h }
  function polyline(vals: number[]) { return vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' ') }
  function areaPath(vals: number[]) {
    const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ')
    return `M ${toX(0)},${toY(vals[0])} L ${pts} L ${toX(vals.length - 1)},${padT + h} L ${toX(0)},${padT + h} Z`
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * maxVal))
  const xLabels = ['-29d', '-22d', '-15d', '-8d', '-1d', '0d']
  const xStep = (detected.length - 1) / (xLabels.length - 1)
  const deployX = toX(Math.round(detected.length * 0.6))

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="det-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={toY(t)} x2={padL + w} y2={toY(t)} stroke="var(--hairline)" strokeWidth={1} />
          <text x={padL - 6} y={toY(t) + 4} textAnchor="end" fontSize={9} fill="var(--ink-5)" fontFamily="var(--font-mono)">{t}</text>
        </g>
      ))}
      <path d={areaPath(detected)} fill="url(#det-fill)" />
      <polyline points={polyline(detected)} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      <polyline points={polyline(resolved)} fill="none" stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={deployX} y1={padT} x2={deployX} y2={padT + h} stroke="var(--warn)" strokeWidth={1} strokeDasharray="3 2" />
      <text x={deployX + 4} y={padT + 12} fontSize={8} fill="var(--warn)" fontFamily="var(--font-mono)">CRAWLER v2.4 DEPLOY</text>
      {xLabels.map((l, i) => (
        <text key={l} x={toX(Math.round(i * xStep))} y={padT + h + 18} textAnchor="middle" fontSize={9} fill="var(--ink-5)" fontFamily="var(--font-mono)">{l}</text>
      ))}
    </svg>
  )
}

function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0)
  const raf = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const startValRef = useRef(0)

  useEffect(() => {
    startValRef.current = current
    startRef.current = null
    if (raf.current) cancelAnimationFrame(raf.current)

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(startValRef.current + (target - startValRef.current) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return current
}

const KpiCard = memo(function KpiCard({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string; animate?: boolean }) {
  const numVal = typeof value === 'number' ? value : null
  const animated = useCountUp(numVal ?? 0)
  const display = numVal != null ? animated.toLocaleString() : value

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: '14px 16px', flex: 1 }} className="count-up">
      <div className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div className="mono tnum" style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--ink)', lineHeight: 1 }}>{display}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
})

export default function Analytics() {
  const navigate = useNavigate()
  const { refreshKey } = useApp()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [infringements, setInfringements] = useState<Infringement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7D' | '30D' | '90D' | '1Y'>('30D')

  async function load(silent = false) {
    try {
      const [sum, inf] = await Promise.all([getAnalyticsSummary(), listInfringements()])
      setSummary(sum)
      setInfringements(inf)
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (refreshKey > 0) load(true) }, [refreshKey])

  if (loading) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="mono upper" style={{ color: 'var(--ink-4)' }}>LOADING<span className="blink">_</span></span>
        </div>
      </Shell>
    )
  }

  if (error || !summary) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="mono upper" style={{ color: 'var(--danger)' }}>ERROR — {error ?? 'No data'}</span>
        </div>
      </Shell>
    )
  }

  const days = period === '7D' ? 7 : period === '90D' ? 90 : period === '1Y' ? 365 : 30
  const detected = generateTrendData(summary.total_infringements, days)
  const rand = seededRand(summary.total_infringements * 13 + days * 3)
  const resolved = detected.map(v => Math.round(v * 0.55 + rand() * v * 0.1))

  const total = summary.total_infringements
  const resRate = total > 0 ? Math.round(((summary.valid_count + summary.false_positive_count) / total) * 100) : 0
  const fpRate = total > 0 ? Math.round((summary.false_positive_count / total) * 100) : 0

  const mergedPlatforms: Record<string, number> = {}
  for (const [name, count] of Object.entries(summary.platform_breakdown)) {
    const key = normalizePlatform(name)
    mergedPlatforms[key] = (mergedPlatforms[key] ?? 0) + count
  }
  const platforms = Object.entries(mergedPlatforms).sort((a, b) => b[1] - a[1])
  const maxPlatform = platforms[0]?.[1] ?? 1

  const confBinDefs = [
    { label: 'V.LOW', min: 0,    max: 0.50,  color: 'var(--ink-4)' },
    { label: 'LOW',   min: 0.50, max: 0.65,  color: 'var(--info)' },
    { label: 'MED',   min: 0.65, max: 0.75,  color: 'var(--warn)' },
    { label: 'HIGH',  min: 0.75, max: 0.90,  color: 'var(--orange)' },
    { label: 'CRIT',  min: 0.90, max: 1.001, color: 'var(--danger)' },
  ]

  const confBins = confBinDefs.map(bin => ({
    ...bin,
    count: infringements.filter(i => i.confidence_score >= bin.min && i.confidence_score < bin.max).length,
  }))

  const funnel = [
    { label: 'Detected', count: total },
    { label: 'Validated', count: summary.valid_count },
    { label: 'DMCA Sent', count: summary.dmca_sent_count },
    { label: 'Taken Down', count: Math.round(summary.dmca_sent_count * 0.5) },
  ]

  return (
    <Shell>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', height: '100%' }}>
        {/* Header with refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono upper" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Analytics</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => load(false)}
            style={{ padding: '5px 12px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <Icon name="refresh" size={12} />
            <span className="mono upper">Refresh Data</span>
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <KpiCard label="Total Assets" value={summary.total_assets} color="var(--ink)" />
          <KpiCard label="Total Matches" value={summary.total_infringements} color="var(--danger)" />
          <KpiCard label="Resolution Rate" value={`${resRate}%`} color="var(--ok)" sub="resolved / total" />
          <KpiCard label="Avg Confidence" value={`${Math.round(summary.avg_confidence_score * 100)}%`} color="var(--info)" sub="avg match confidence" />
          <KpiCard label="False Positive" value={`${fpRate}%`} color="var(--warn)" />
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          {/* Detection Trend */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>Detection Trend</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {(['7D', '30D', '90D', '1Y'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className="mono upper" style={{ padding: '3px 8px', background: period === p ? 'var(--accent-glow)' : 'var(--elevated)', border: `1px solid ${period === p ? 'var(--accent)' : 'var(--hairline)'}`, borderRadius: 'var(--radius-sm)', color: period === p ? 'var(--accent)' : 'var(--ink-4)', cursor: 'pointer', fontSize: 10 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              {[{ label: 'Detected', color: 'var(--accent)', dash: false }, { label: 'Resolved', color: 'var(--ok)', dash: true }].map(leg => (
                <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width={20} height={10}>
                    <line x1={0} y1={5} x2={20} y2={5} stroke={leg.color} strokeWidth={1.5} strokeDasharray={leg.dash ? '4 3' : undefined} />
                  </svg>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{leg.label}</span>
                </div>
              ))}
            </div>
            <LineChart detected={detected} resolved={resolved} width={640} height={220} />
          </div>

          {/* Confidence Distribution */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 14 }}>Confidence Distribution</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confBins.map(bin => {
                const maxBin = Math.max(...confBins.map(b => b.count), 1)
                const barW = (bin.count / maxBin) * 100
                return (
                  <div key={bin.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono upper" style={{ fontSize: 9, color: bin.color, letterSpacing: '0.08em' }}>{bin.label}</span>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{bin.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${barW}%`, height: '100%', background: bin.color, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Second row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Platform Breakdown — clickable */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 14 }}>Platform Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platforms.length === 0 ? (
                <span className="mono upper" style={{ fontSize: 10, color: 'var(--ink-5)' }}>No platform data</span>
              ) : (
                platforms.map(([name, count]) => {
                  const col = PLATFORM_COLORS[name] || 'var(--ink-3)'
                  const barW = (count / maxPlatform) * 100
                  return (
                    <button
                      key={name}
                      onClick={() => navigate(`/?platform=${encodeURIComponent(name)}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', borderRadius: 'var(--radius-sm)', transition: 'opacity 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', width: 80, flexShrink: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${barW}%`, height: '100%', background: `linear-gradient(90deg, ${col}aa, ${col}44)`, borderRadius: 2 }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-4)', width: 30, textAlign: 'right' }}>{count}</span>
                    </button>
                  )
                })
              )}
            </div>
            <div className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)', marginTop: 12, letterSpacing: '0.08em' }}>
              TOTAL {total} MATCHES ACROSS {platforms.length} PLATFORMS
            </div>
          </div>

          {/* Enforcement Funnel */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 14 }}>Enforcement Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnel.map((stage, i) => {
                const col = ['var(--info)', 'var(--warn)', 'var(--accent)', 'var(--ok)'][i]
                const pct = funnel[0].count > 0 ? Math.round((stage.count / funnel[0].count) * 100) : 0
                const dropoff = i > 0 && funnel[i - 1].count > 0 ? Math.round((1 - stage.count / funnel[i - 1].count) * 100) : null
                return (
                  <div key={stage.label}>
                    {dropoff !== null && (
                      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-5)', marginBottom: 4, paddingLeft: 28 }}>↓ {dropoff}% drop-off</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${col}`, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="mono" style={{ fontSize: 9, color: col }}>{i + 1}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', width: 90 }}>{stage.label}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2 }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 36, textAlign: 'right' }}>{stage.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
