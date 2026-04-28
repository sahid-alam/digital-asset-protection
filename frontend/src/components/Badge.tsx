import React from 'react'
import type { Infringement } from '../types'

interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100)
  let color = 'var(--info)'
  if (pct >= 90) color = 'var(--danger)'
  else if (pct >= 75) color = 'var(--warn)'

  return (
    <span
      className="mono tnum upper"
      style={{
        color,
        fontSize: 11,
        padding: '2px 6px',
        border: `1px solid ${color}`,
        borderRadius: 'var(--radius-sm)',
        background: `${color}18`,
        letterSpacing: '0.04em',
      }}
    >
      {pct}%
    </span>
  )
}

interface StatusBadgeProps {
  status: Infringement['status']
}

const STATUS_MAP: Record<Infringement['status'], { label: string; color: string }> = {
  pending: { label: 'PENDING', color: 'var(--info)' },
  valid: { label: 'VALID', color: 'var(--danger)' },
  false_positive: { label: 'FALSE POS', color: 'var(--ink-4)' },
  dmca_sent: { label: 'DMCA SENT', color: 'var(--warn)' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = STATUS_MAP[status] ?? { label: status, color: 'var(--ink-4)' }
  return (
    <span
      className="mono upper"
      style={{
        color,
        fontSize: 10,
        padding: '2px 6px',
        border: `1px solid ${color}`,
        borderRadius: 'var(--radius-sm)',
        background: `${color}18`,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

interface PlatformTagProps {
  platform?: string
}

export const PLATFORM_COLORS: Record<string, string> = {
  Reddit: '#ff4500',
  Twitter: '#ffffff',
  'Twitter/X': '#ffffff',
  DeviantArt: '#05cc47',
  Deviantart: '#05cc47',
  Pinterest: '#e60023',
  Tumblr: '#36465d',
  Instagram: '#e1306c',
  Flickr: '#ff0084',
  Behance: '#1769ff',
  Dribbble: '#ea4c89',
  '500px': '#99cc00',
}

export function normalizePlatform(raw: string): string {
  if (!raw || raw === 'unknown') return raw
  const key = raw.toLowerCase()
  const canonical: Record<string, string> = {
    reddit: 'Reddit',
    twitter: 'Twitter',
    'twitter/x': 'Twitter/X',
    deviantart: 'DeviantArt',
    pinterest: 'Pinterest',
    tumblr: 'Tumblr',
    instagram: 'Instagram',
    flickr: 'Flickr',
    behance: 'Behance',
    dribbble: 'Dribbble',
    '500px': '500px',
  }
  return canonical[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1))
}

export function PlatformTag({ platform }: PlatformTagProps) {
  if (!platform || platform === 'unknown') return null
  const normalized = normalizePlatform(platform)
  const color = PLATFORM_COLORS[normalized] || 'var(--ink-3)'
  return (
    <span
      className="mono upper"
      style={{
        color,
        fontSize: 10,
        padding: '2px 6px',
        border: `1px solid ${color}40`,
        borderRadius: 'var(--radius-sm)',
        background: `${color}14`,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
      }}
    >
      {normalized}
    </span>
  )
}
