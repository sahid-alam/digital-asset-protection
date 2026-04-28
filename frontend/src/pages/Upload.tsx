import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/Shell'
import Icon from '../components/Icon'
import { uploadAsset } from '../api/assets'
import { triggerScan, getScanStatus } from '../api/scan'
import { getAnalyticsSummary } from '../api/analytics'
import { useApp } from '../context/AppContext'
import type { Asset } from '../types'

type UploadStatus = 'queued' | 'uploading' | 'fingerprinting' | 'complete' | 'failed'
type ScanState = 'idle' | 'scanning' | 'complete' | 'failed'

interface QueueItem {
  file: File
  id: string
  status: UploadStatus
  progress: number
  asset?: Asset
  error?: string
  duration?: number
  startTime?: number
  scanState?: ScanState
  scanMatches?: number
  scanError?: string
}

const STATUS_COLORS: Record<UploadStatus, string> = {
  queued: 'var(--ink-4)',
  uploading: 'var(--info)',
  fingerprinting: 'var(--accent)',
  complete: 'var(--ok)',
  failed: 'var(--danger)',
}

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: 'QUEUED',
  uploading: 'UPLOADING',
  fingerprinting: 'FINGERPRINTING',
  complete: 'COMPLETE',
  failed: 'FAILED',
}

const PIPELINE_STEPS = ['UPLOAD', 'pHASH', 'SSIM', 'INDEX', 'CRAWL']

const SETTINGS_KEY = 'sentry_upload_settings'

function formatBytes(n: number) {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { autoCrawl: true, reverseImage: true, watermark: false, exifStamp: false, notifyHighConf: true }
}

export default function Upload() {
  const navigate = useNavigate()
  const { refreshKey, setCrawlerStatus } = useApp()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [ownerEmail, setOwnerEmail] = useState('')
  const [dragging, setDragging] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [settings, setSettings] = useState(loadSettings)
  const [totalAssets, setTotalAssets] = useState<number | null>(null)
  const [matchBanner, setMatchBanner] = useState<{ assetId: string; count: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  // Load real asset count
  useEffect(() => {
    getAnalyticsSummary().then(s => setTotalAssets(s.total_assets)).catch(() => {})
  }, [refreshKey])

  const processFile = useCallback(async (file: File) => {
    const id = Math.random().toString(36).slice(2)
    const startTime = Date.now()

    setQueue(q => [...q, { file, id, status: 'queued', progress: 0, startTime }])
    setPipelineStep(0)

    await new Promise(r => setTimeout(r, 200))
    setQueue(q => q.map(item => item.id === id ? { ...item, status: 'uploading', progress: 10 } : item))
    setPipelineStep(1)

    let fakeProgress = 10
    const tick = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 15, 80)
      setQueue(q => q.map(item => item.id === id ? { ...item, progress: fakeProgress } : item))
    }, 300)

    try {
      const asset = await uploadAsset(file, ownerEmail || undefined)
      clearInterval(tick)
      setPipelineStep(3)
      setQueue(q => q.map(item => item.id === id ? { ...item, status: 'fingerprinting', progress: 85, asset } : item))

      await new Promise(r => setTimeout(r, 800))
      setPipelineStep(4)
      const duration = (Date.now() - startTime) / 1000
      setQueue(q => q.map(item => item.id === id ? { ...item, status: 'complete', progress: 100, asset, duration } : item))

      // Auto-crawl if enabled
      if (settings.autoCrawl) {
        await handleTriggerScan(id, asset.id)
      }
    } catch (e: unknown) {
      clearInterval(tick)
      const error = e instanceof Error ? e.message : 'Upload failed'
      setQueue(q => q.map(item => item.id === id ? { ...item, status: 'failed', progress: 0, error } : item))
    }
  }, [ownerEmail, settings.autoCrawl]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(processFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleTriggerScan(queueId: string, assetId: string) {
    setQueue(q => q.map(i => i.id === queueId ? { ...i, scanState: 'scanning' } : i))
    setCrawlerStatus('SCANNING')
    try {
      const job = await triggerScan(assetId)
      const pollId = setInterval(async () => {
        try {
          const s = await getScanStatus(job.job_id)
          if (s.status === 'completed') {
            clearInterval(pollId)
            setCrawlerStatus('IDLE')
            setQueue(q => q.map(i => i.id === queueId ? { ...i, scanState: 'complete', scanMatches: s.matches_found } : i))
            if (s.matches_found > 0) {
              setMatchBanner({ assetId, count: s.matches_found })
            }
            setTimeout(() => {
              navigate(`/dashboard?asset_id=${assetId}`)
            }, 1500)
          } else if (s.status === 'failed') {
            clearInterval(pollId)
            setCrawlerStatus('IDLE')
            setQueue(q => q.map(i => i.id === queueId ? { ...i, scanState: 'failed', scanError: 'Scan failed' } : i))
          }
        } catch {
          clearInterval(pollId)
          setCrawlerStatus('IDLE')
          setQueue(q => q.map(i => i.id === queueId ? { ...i, scanState: 'failed', scanError: 'Status check failed' } : i))
        }
      }, 2000)
      setTimeout(() => { clearInterval(pollId); setCrawlerStatus('IDLE') }, 180_000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Scan trigger failed'
      setCrawlerStatus('IDLE')
      setQueue(q => q.map(i => i.id === queueId ? { ...i, scanState: 'failed', scanError: msg } : i))
    }
  }

  const activeItem = queue.find(i => i.status === 'uploading' || i.status === 'fingerprinting')
  const PLAN_MAX = 2500
  const planUsed = totalAssets ?? 0
  const planPct = Math.min((planUsed / PLAN_MAX) * 100, 100)

  return (
    <Shell>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, height: '100%', overflow: 'hidden' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          {/* Matches banner */}
          {matchBanner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(246,178,74,0.1)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-sm)' }}>
              <Icon name="alert" size={13} color="var(--warn)" />
              <span className="mono" style={{ flex: 1, fontSize: 11, color: 'var(--warn)' }}>
                ⚠ {matchBanner.count} match{matchBanner.count !== 1 ? 'es' : ''} found — View in Dashboard
              </span>
              <button
                onClick={() => { navigate(`/dashboard?asset_id=${matchBanner.assetId}`); setMatchBanner(null) }}
                style={{ padding: '3px 10px', background: 'rgba(246,178,74,0.15)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-sm)', color: 'var(--warn)', cursor: 'pointer', fontSize: 10 }}
                className="mono upper"
              >
                View
              </button>
              <button onClick={() => setMatchBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warn)', padding: 2 }}>
                <Icon name="close" size={12} />
              </button>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              background: dragging ? 'var(--accent-glow)' : 'var(--panel)',
              border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--hairline-strong)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              transition: 'border-color 0.15s, background 0.15s',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="slash-bg"
          >
            <div style={{ width: 56, height: 56, border: '1.5px dashed var(--accent)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-glow)' }}>
              <Icon name="upload" size={24} color="var(--accent)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>Drop assets to fingerprint</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['JPG', 'PNG', 'WEBP', 'TIFF', 'PSD'].map(ext => (
                  <span key={ext} className="mono upper" style={{ fontSize: 10, color: 'var(--ink-5)', border: '1px solid var(--hairline)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{ext}</span>
                ))}
              </div>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 20px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} className="mono upper">
              Browse files
            </button>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['pHASH', 'SSIM STRUCTURAL', 'COLOR SIGNATURE', 'EXIF CAPTURE'].map(t => (
                <span key={t} className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)', letterSpacing: '0.08em' }}>· {t}</span>
              ))}
            </div>
          </div>

          {/* Email input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="bell" size={13} color="var(--ink-4)" />
            <input
              value={ownerEmail}
              onChange={e => setOwnerEmail(e.target.value)}
              placeholder="owner@email.com (optional — for notifications)"
              style={{ flex: 1, height: 32, background: 'var(--elevated)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-sm)', padding: '0 10px', color: 'var(--ink)', outline: 'none', fontSize: 12 }}
            />
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono upper" style={{ fontSize: 11, color: 'var(--ink-2)' }}>Intake Queue</span>
                <span className="mono" style={{ fontSize: 10, background: 'var(--elevated)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '1px 6px', color: 'var(--ink-4)' }}>{queue.length}</span>
              </div>
              {queue.map(item => {
                const col = STATUS_COLORS[item.status]
                return (
                  <div key={item.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="image" size={16} color="var(--ink-5)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.file.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-5)' }}>{formatBytes(item.file.size)}</span>
                        <span className="mono upper" style={{ fontSize: 9, color: col, border: `1px solid ${col}50`, borderRadius: 'var(--radius-sm)', padding: '1px 5px', background: `${col}10`, whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      {(item.status === 'uploading' || item.status === 'fingerprinting') && (
                        <div style={{ height: 3, background: 'var(--elevated)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      )}
                      {item.status === 'complete' && item.asset && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-5)' }}>FP: {item.asset.fingerprint_id?.slice(0, 16) ?? 'n/a'}…</span>
                          {item.duration && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-5)' }}>{item.duration.toFixed(1)}s</span>}
                          {(!item.scanState || item.scanState === 'idle') && !settings.autoCrawl && (
                            <button onClick={() => item.asset && handleTriggerScan(item.id, item.asset.id)} style={{ padding: '2px 8px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 10 }} className="mono upper">
                              Trigger Scan
                            </button>
                          )}
                          {item.scanState === 'scanning' && (
                            <span className="mono upper" style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span className="blink" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                              Scanning…
                            </span>
                          )}
                          {item.scanState === 'complete' && (
                            <span className="mono upper" style={{ fontSize: 10, color: 'var(--ok)' }}>
                              ✓ {item.scanMatches ?? 0} match{item.scanMatches !== 1 ? 'es' : ''} found
                            </span>
                          )}
                          {item.scanState === 'failed' && (
                            <span className="mono upper" style={{ fontSize: 10, color: 'var(--danger)' }}>✗ {item.scanError ?? 'Scan failed'}</span>
                          )}
                        </div>
                      )}
                      {item.status === 'failed' && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{item.error}</span>}
                    </div>
                    <button onClick={() => setQueue(q => q.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-5)', padding: 2, flexShrink: 0 }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          {/* Fingerprint Pipeline */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Fingerprint Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PIPELINE_STEPS.map((step, i) => {
                const done = pipelineStep > i + 1
                const active = Boolean(activeItem) && pipelineStep === i + 1
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--hairline-strong)'}`, background: done ? 'rgba(52,211,153,0.12)' : active ? 'var(--accent-glow)' : 'var(--elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done ? <Icon name="check" size={10} color="var(--ok)" /> : active ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} className="blink" /> : <span className="mono" style={{ fontSize: 9, color: 'var(--ink-5)' }}>{i + 1}</span>}
                    </div>
                    <span className="mono upper" style={{ fontSize: 10, color: done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--ink-5)' }}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Protection Settings */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 12 }}>Protection Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'autoCrawl' as const, label: 'Auto-crawl on upload' },
                { key: 'reverseImage' as const, label: 'Reverse image search' },
                { key: 'watermark' as const, label: 'Embed watermark' },
                { key: 'exifStamp' as const, label: 'EXIF stamp' },
                { key: 'notifyHighConf' as const, label: 'Notify if ≥85%' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{label}</span>
                  <button
                    onClick={() => setSettings((s: typeof settings) => ({ ...s, [key]: !s[key] }))}
                    style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', background: settings[key] ? 'var(--accent)' : 'var(--elevated-2)', position: 'relative', transition: 'background 0.15s' }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: settings[key] ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--ink)', transition: 'left 0.15s' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Usage */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 14 }}>
            <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 8 }}>Plan Usage</div>
            <div className="mono tnum" style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
              {planUsed.toLocaleString()} / {PLAN_MAX.toLocaleString()} assets
            </div>
            <div style={{ height: 4, background: 'var(--elevated-2)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${planPct}%`, height: '100%', background: planPct > 80 ? 'var(--warn)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            <button style={{ width: '100%', padding: '6px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }} className="mono upper">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
