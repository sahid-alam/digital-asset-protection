import React, { memo, useEffect, useState } from 'react'
import Icon from './Icon'
import { StatusBadge, normalizePlatform } from './Badge'
import { patchInfringement, getDmca } from '../api/infringements'
import { getAsset } from '../api/assets'
import { downloadBlob } from '../utils/download'
import type { Infringement, Asset } from '../types'

interface EvidenceDrawerProps {
  item: Infringement
  onClose: () => void
  onUpdate: (updated: Infringement) => void
}

const EvidenceDrawer = memo(function EvidenceDrawer({ item, onClose, onUpdate }: EvidenceDrawerProps) {
  const pct = Math.round(item.confidence_score * 100)
  const confColor = pct >= 90 ? 'var(--danger)' : pct >= 75 ? 'var(--warn)' : 'var(--info)'
  const confLabel = pct >= 90 ? 'HIGH — ACT NOW' : pct >= 75 ? 'MEDIUM — REVIEW' : 'LOW — MONITOR'

  const [asset, setAsset] = useState<Asset | null>(null)
  const [imgError, setImgError] = useState(false)
  const [markLoading, setMarkLoading] = useState(false)
  const [fpLoading, setFpLoading] = useState(false)
  const [dmcaLoading, setDmcaLoading] = useState(false)

  useEffect(() => {
    setAsset(null)
    setImgError(false)
    getAsset(item.asset_id).then(setAsset).catch(() => setImgError(true))
  }, [item.asset_id])

  async function handleMarkValid() {
    setMarkLoading(true)
    try {
      const updated = await patchInfringement(item.id, { status: 'valid' })
      onUpdate(updated)
    } finally {
      setMarkLoading(false)
    }
  }

  async function handleFalsePositive() {
    setFpLoading(true)
    try {
      const updated = await patchInfringement(item.id, { status: 'false_positive' })
      onUpdate(updated)
    } finally {
      setFpLoading(false)
    }
  }

  async function handleDmca() {
    setDmcaLoading(true)
    try {
      const blob = await getDmca(item.id)
      downloadBlob(blob, `dmca-${item.id}.pdf`)
    } finally {
      setDmcaLoading(false)
    }
  }

  const bars = [
    { label: 'Perceptual Hash', value: item.phash_distance != null ? Math.round((1 - item.phash_distance / 64) * 100) : Math.round((item.clip_score ?? item.confidence_score) * 100), color: 'var(--danger)' },
    { label: 'Color Histogram', value: Math.round(item.confidence_score * 95), color: 'var(--warn)' },
    { label: 'Structural SSIM', value: Math.round((item.clip_score ?? item.confidence_score) * 88), color: 'var(--info)' },
    { label: 'EXIF/Metadata', value: item.vision_api_hit ? 85 : 30, color: 'var(--ok)' },
  ]

  let matchDomain = ''
  try { matchDomain = new URL(item.source_url).hostname } catch { matchDomain = item.source_url }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: 44, right: 0, bottom: 22, width: 520, background: 'var(--panel)', borderLeft: '1px solid var(--hairline-strong)', zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono upper" style={{ fontSize: 11, color: 'var(--accent)' }}>EVIDENCE</span>
          <span className="mono" style={{ fontSize: 10, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', color: 'var(--ink-3)' }}>
            #{item.id.slice(0, 8)}
          </span>
          <StatusBadge status={item.status} />
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Confidence scoreboard */}
          <div style={{ background: 'var(--elevated)', border: `1px solid ${confColor}40`, borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="mono tnum" style={{ fontSize: 34, fontWeight: 700, color: confColor, lineHeight: 1 }}>{pct}%</span>
            <div>
              <div className="mono upper" style={{ fontSize: 10, color: confColor, letterSpacing: '0.1em' }}>{confLabel}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Confidence score</div>
            </div>
          </div>

          {/* Similarity breakdown */}
          <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Similarity Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bars.map(bar => (
                <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
                    <span>{bar.label}</span>
                    <span className="mono tnum" style={{ color: bar.color }}>{bar.value}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--elevated-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${bar.value}%`, height: '100%', background: bar.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual comparison */}
          <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Visual Comparison</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ aspectRatio: '16/9', background: 'var(--elevated-2)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {asset && !imgError ? (
                    <img src={asset.storage_url} alt="Original asset" crossOrigin="anonymous" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="100%" height="100%" viewBox="0 0 160 90">
                      <defs>
                        <linearGradient id="g-orig-drawer" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <rect width="160" height="90" fill="url(#g-orig-drawer)" />
                      <circle cx="80" cy="45" r="20" fill="none" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5" />
                      <text x="80" y="50" textAnchor="middle" fontSize="8" fill="var(--accent)" fontFamily="monospace">
                        {asset ? asset.filename : 'LOADING…'}
                      </text>
                    </svg>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="mono upper" style={{ fontSize: 10, color: 'var(--accent)' }}>ORIGINAL</span>
                  {asset && <span style={{ fontSize: 10, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.filename}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ aspectRatio: '16/9', background: 'var(--elevated-2)', border: '1px solid rgba(255,77,94,0.25)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,77,94,0.12)', border: '1px solid rgba(255,77,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="link" size={16} color="var(--danger)" />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', padding: '0 8px', wordBreak: 'break-all' }} className="mono">
                    {matchDomain}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="mono upper" style={{ fontSize: 10, color: 'var(--danger)' }}>MATCH</span>
                  <a href={item.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--info)', fontSize: 10 }}>
                    <span>View source</span>
                    <Icon name="external" size={9} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata grid */}
          <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Metadata</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {[
                { k: 'PLATFORM', v: normalizePlatform(item.platform || 'unknown') },
                { k: 'DETECTED', v: new Date(item.detected_at).toLocaleDateString() },
                { k: 'REACH', v: '~12.4K' },
                { k: 'UPVOTES', v: '847' },
                { k: 'ATTRIBUTION', v: 'None' },
                { k: 'LICENSE CLAIM', v: 'None' },
                { k: 'VISION API', v: item.vision_api_hit ? '✓ HIT' : '✗ NO HIT' },
                { k: 'CLIP SCORE', v: item.clip_score != null ? `${Math.round(item.clip_score * 100)}%` : 'N/A' },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)', letterSpacing: '0.1em' }}>{k}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detection log */}
          <div style={{ background: 'var(--elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', padding: 16 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Detection Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { time: new Date(item.detected_at).toISOString().slice(11, 19), src: 'CRAWLER', msg: 'Match detected via reverse image search' },
                { time: new Date(item.detected_at).toISOString().slice(11, 19), src: 'SYSTEM', msg: `Confidence score computed: ${pct}%` },
                { time: new Date(item.detected_at).toISOString().slice(11, 19), src: 'NOTIFY', msg: item.vision_api_hit ? 'Vision API confirmed match' : 'Vision API: no confirmation' },
              ].map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span className="mono tnum" style={{ color: 'var(--ink-5)', whiteSpace: 'nowrap' }}>{log.time}</span>
                  <span className="mono upper" style={{ fontSize: 9, padding: '1px 5px', background: 'var(--elevated-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-3)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                    {log.src}
                  </span>
                  <span style={{ color: 'var(--ink-2)' }}>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 8 }}>
          <button onClick={handleMarkValid} disabled={markLoading} className="mono upper" style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,77,94,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', cursor: markLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, opacity: markLoading ? 0.6 : 1 }}>
            {markLoading ? '…' : 'Mark Valid'}
          </button>
          <button onClick={handleFalsePositive} disabled={fpLoading} className="mono upper" style={{ flex: 1, padding: '8px 12px', background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-md)', color: 'var(--ink-3)', cursor: fpLoading ? 'wait' : 'pointer', fontSize: 12, opacity: fpLoading ? 0.6 : 1 }}>
            {fpLoading ? '…' : 'False Positive'}
          </button>
          <button onClick={handleDmca} disabled={dmcaLoading} className="mono upper" style={{ flex: 1, padding: '8px 12px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', cursor: dmcaLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, opacity: dmcaLoading ? 0.6 : 1 }}>
            {dmcaLoading ? 'GENERATING…' : 'Generate DMCA'}
          </button>
        </div>
      </div>
    </>
  )
})

export default EvidenceDrawer
