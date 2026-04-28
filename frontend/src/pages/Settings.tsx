import React, { useState } from 'react'
import Shell from '../components/Shell'
import Icon from '../components/Icon'

interface SettingRow {
  key: string
  label: string
  description: string
  type: 'toggle' | 'input' | 'select'
  options?: string[]
}

const SETTINGS: SettingRow[] = [
  { key: 'notifyEmail', label: 'Email notifications', description: 'Send email when new infringements are detected', type: 'toggle' },
  { key: 'autoScan', label: 'Auto-scan on upload', description: 'Automatically trigger crawler after asset fingerprinting', type: 'toggle' },
  { key: 'highConfOnly', label: 'High-confidence alerts only', description: 'Only alert for confidence ≥ 90%', type: 'toggle' },
  { key: 'dmcaTemplate', label: 'DMCA template', description: 'Template used for DMCA notices', type: 'select', options: ['Standard', 'DMCA Safe Harbor', 'Custom'] },
  { key: 'crawlFreq', label: 'Crawl frequency', description: 'How often the crawler checks for new matches', type: 'select', options: ['Real-time', 'Hourly', 'Daily', 'Weekly'] },
  { key: 'ownerName', label: 'Rights holder name', description: 'Name used in DMCA notices', type: 'input' },
  { key: 'ownerEmail', label: 'Contact email', description: 'Email included in DMCA notices', type: 'input' },
]

export default function Settings() {
  const [values, setValues] = useState<Record<string, string | boolean>>({
    notifyEmail: true,
    autoScan: true,
    highConfOnly: false,
    dmcaTemplate: 'Standard',
    crawlFreq: 'Real-time',
    ownerName: '',
    ownerEmail: '',
  })
  const [saved, setSaved] = useState(false)

  function set(key: string, val: string | boolean) {
    setValues(v => ({ ...v, [key]: val }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem('sentry_settings', JSON.stringify(values))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Shell>
      <div style={{ padding: 16, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Icon name="gear" size={16} color="var(--ink-2)" />
          <span className="mono upper" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
            Settings
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={save}
            style={{
              padding: '6px 16px',
              background: saved ? 'rgba(52,211,153,0.12)' : 'var(--accent-glow)',
              border: `1px solid ${saved ? 'var(--ok)' : 'var(--accent)'}`,
              borderRadius: 'var(--radius-md)',
              color: saved ? 'var(--ok)' : 'var(--accent)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
            className="mono upper"
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>

        {/* Settings panel */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {SETTINGS.map((row, idx) => (
            <div
              key={row.key}
              style={{
                padding: '14px 16px',
                borderBottom: idx < SETTINGS.length - 1 ? '1px solid var(--hairline)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{row.description}</div>
              </div>

              {row.type === 'toggle' && (
                <button
                  onClick={() => set(row.key, !values[row.key])}
                  style={{
                    width: 38,
                    height: 20,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: values[row.key] ? 'var(--accent)' : 'var(--elevated-2)',
                    position: 'relative',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: values[row.key] ? 20 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      transition: 'left 0.15s',
                    }}
                  />
                </button>
              )}

              {row.type === 'select' && (
                <select
                  value={values[row.key] as string}
                  onChange={e => set(row.key, e.target.value)}
                  style={{
                    height: 30,
                    background: 'var(--elevated)',
                    border: '1px solid var(--hairline-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-2)',
                    padding: '0 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  className="mono"
                >
                  {row.options?.map(o => <option key={o}>{o}</option>)}
                </select>
              )}

              {row.type === 'input' && (
                <input
                  value={values[row.key] as string}
                  onChange={e => set(row.key, e.target.value)}
                  placeholder="—"
                  style={{
                    width: 200,
                    height: 30,
                    background: 'var(--elevated)',
                    border: '1px solid var(--hairline-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    padding: '0 10px',
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* System info */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="mono upper" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 10 }}>System</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {[
              { k: 'VERSION', v: `BUILD ${import.meta.env.VITE_BUILD_HASH ?? 'dev'}` },
              { k: 'API', v: import.meta.env.VITE_API_URL ?? 'configured via VITE_API_URL' },
              { k: 'ENV', v: 'Production' },
              { k: 'FINGERPRINT', v: 'CLIP ViT-B/32 + pHash' },
            ].map(({ k, v }) => (
              <div key={k}>
                <div className="mono upper" style={{ fontSize: 9, color: 'var(--ink-5)', marginBottom: 2 }}>{k}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
