import React, { useState } from 'react'
import Icon from './Icon'

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div
      style={{
        background: 'rgba(255,77,94,0.1)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 16px',
      }}
    >
      <Icon name="alert" size={13} color="var(--danger)" />
      <span className="mono" style={{ flex: 1, fontSize: 11, color: 'var(--danger)' }}>
        {message}
      </span>
      <button
        onClick={() => { setDismissed(true); onDismiss?.() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}
