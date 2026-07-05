import React from 'react'

export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      {/* Title skeleton */}
      <div style={{ height: 28, width: 240, borderRadius: 6, background: 'var(--border)', marginBottom: 8, animation: 'pulse 1.5s infinite ease-in-out' }} />
      <div style={{ height: 16, width: 320, borderRadius: 4, background: 'var(--border)', marginBottom: 28, opacity: 0.7, animation: 'pulse 1.5s infinite ease-in-out' }} />

      {/* KPI Cards Grid Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              padding: '20px 24px',
              height: 140,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              position: 'relative',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--border)' }} />
            </div>
            <div>
              <div style={{ height: 24, width: '70%', borderRadius: 6, background: 'var(--border)', marginBottom: 6 }} />
              <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'var(--border)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <div style={{ height: 350, borderRadius: 20, background: 'var(--card)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ height: 350, borderRadius: 20, background: 'var(--card)', border: '1px solid var(--card-border)', animation: 'pulse 1.5s infinite ease-in-out' }} />
      </div>
    </div>
  )
}
