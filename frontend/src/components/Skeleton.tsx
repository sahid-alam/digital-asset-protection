import React from 'react'

export function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
      {[40, 80, 120, 70, 80, 200, 70, 80, 20].map((w, i) => (
        <td key={i} style={{ padding: '10px 10px' }}>
          <div
            className="skeleton"
            style={{ width: w, height: 12, borderRadius: 2 }}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div className="skeleton" style={{ height: 90 }} />
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ width: 100, height: 10, borderRadius: 2 }} />
        <div className="skeleton" style={{ width: 140, height: 12, borderRadius: 2 }} />
        <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 2 }} />
      </div>
    </div>
  )
}
