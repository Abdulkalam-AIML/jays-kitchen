import React from 'react'

export default function BillsLoading() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      {/* Title skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ height: 28, width: 140, borderRadius: 6, background: 'var(--border)', marginBottom: 6, animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: 14, width: 80, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ height: 40, width: 120, borderRadius: 10, background: 'var(--border)', animation: 'pulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Filter bar placeholder skeleton */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, height: 72, boxSizing: 'border-box', animation: 'pulse 1.5s infinite ease-in-out' }} />

      {/* Table skeleton */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '11px 14px', width: 40, textAlign: 'left' }}>
                <div style={{ height: 14, width: 14, borderRadius: 3, background: 'var(--border)' }} />
              </th>
              {['Bill #', 'Date', 'Vendor', 'Category', 'Payment', 'Amount', 'Payment Status', 'Pending Amount', 'Paid By', 'Status', 'Images', ''].map((h) => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left' }}>
                  <div style={{ height: 12, width: 50, borderRadius: 4, background: 'var(--border)' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px', width: 40 }}>
                  <div style={{ height: 14, width: 14, borderRadius: 3, background: 'var(--border)' }} />
                </td>
                {Array.from({ length: 12 }).map((_, j) => (
                  <td key={j} style={{ padding: '14px' }}>
                    <div style={{ height: 14, borderRadius: 6, width: j === 5 ? 60 : j === 0 ? 80 : '70%', background: 'var(--border)', animation: 'pulse 1.5s infinite ease-in-out' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
